const assert = require('assert');
const mongoose = require('mongoose');

// Mock User and Complaint models to bypass DB queries in unit tests
const Complaint = require('../models/Complaint');
const User = require('../models/User');

const {
  calculateSimilarity,
  calculatePriorityScore,
  recommendStaff,
  generateOperationsInsights
} = require('../services/intelligence.service');

const runIntelligenceTests = async () => {
  console.log('🧪 Starting intelligence engine unit tests...');

  try {
    // ----------------------------------------------------
    // TEST 1: Similarity calculations
    // ----------------------------------------------------
    console.log('1. Testing similarity scoring algorithm...');

    const compA = {
      title: 'Water pipe leaking under bathroom sink',
      description: 'The faucet adapter is dripping water onto the floor. Need help.',
      category: 'plumbing',
      hostelBlock: 'Tagore Hall',
      roomNo: '102',
      createdAt: new Date()
    };

    // Mismatch category (should score lower)
    const compB = {
      title: 'Fan speed controller broken in room 102',
      description: 'The ceiling fan speed controller is stuck at maximum speed.',
      category: 'electrical',
      hostelBlock: 'Tagore Hall',
      roomNo: '102',
      createdAt: new Date()
    };

    // Close match (same category, same room, similar text, close in time)
    const compC = {
      title: 'Bathroom sink leak and faucet dripping',
      description: 'Water faucet is leaking and making the bathroom floor wet.',
      category: 'plumbing',
      hostelBlock: 'Tagore Hall',
      roomNo: '102',
      createdAt: new Date()
    };

    const simAB = calculateSimilarity(compA, compB);
    const simAC = calculateSimilarity(compA, compC);

    console.log(`   - A vs B Similarity: ${simAB.score}% (Relation: ${simAB.relationType})`);
    console.log(`   - A vs C Similarity: ${simAC.score}% (Relation: ${simAC.relationType})`);

    // A vs B should not be a duplicate (similarity should be low)
    assert.ok(simAB.score < 50, 'A vs B similarity should be under 50%');
    assert.strictEqual(simAB.relationType, 'no meaningful similarity');

    // A vs C should be related or a probable duplicate (similarity should be high)
    assert.ok(simAC.score >= 50, 'A vs C similarity should be at least 50%');
    assert.ok(simAC.relationType === 'probable duplicate' || simAC.relationType === 'related / recurring');

    console.log('   ✅ Similarity calculations verified successfully.');

    // ----------------------------------------------------
    // TEST 2: Explainable Priority Scoring
    // ----------------------------------------------------
    console.log('2. Testing explainable priority scoring algorithm...');

    // Mock countDocuments for active complaints in same block
    const originalCount = Complaint.countDocuments;
    Complaint.countDocuments = async () => 0; // No other active complaints

    const highUrgencyC = {
      urgency: 'high',
      createdAt: new Date(),
      status: 'pending',
      reopenedCount: 0,
      hostelBlock: 'Tagore Hall'
    };

    const pHigh = await calculatePriorityScore(highUrgencyC);
    console.log(`   - High Urgency (Pending): Score ${pHigh.score}/100. Reasons:`, pHigh.reasons);
    assert.strictEqual(pHigh.score, 35, 'High urgency pending with no other complaints should score 35');

    // Test overdue penalty
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // 48 hours ago (breached SLA since high limit is 24h)
    
    const overdueC = {
      urgency: 'high',
      createdAt: twoDaysAgo,
      status: 'pending',
      reopenedCount: 0,
      hostelBlock: 'Tagore Hall'
    };

    const pOverdue = await calculatePriorityScore(overdueC);
    console.log(`   - Overdue High Urgency: Score ${pOverdue.score}/100. Reasons:`, pOverdue.reasons);
    assert.strictEqual(pOverdue.score, 65, 'Overdue high urgency should score 65 (35 + 30 penalty)');

    // Test cap at 100
    const extremeC = {
      urgency: 'high',
      createdAt: twoDaysAgo,
      status: 'pending',
      reopenedCount: 5,
      hostelBlock: 'Tagore Hall'
    };
    // Force active in block count to be high
    Complaint.countDocuments = async () => 10;
    const pExtreme = await calculatePriorityScore(extremeC);
    console.log(`   - Extreme Case: Score ${pExtreme.score}/100.`);
    assert.strictEqual(pExtreme.score, 100, 'Score should be capped at 100');

    // Restore Complaint.countDocuments
    Complaint.countDocuments = originalCount;

    console.log('   ✅ Priority scoring verified successfully.');

    // ----------------------------------------------------
    // TEST 3: Staff Recommendation Engine
    // ----------------------------------------------------
    console.log('3. Testing staff dispatch recommendation engine...');

    const originalFind = User.find;
    const originalAggregate = Complaint.aggregate;

    // Mock staff directory
    const mockStaff = [
      { _id: new mongoose.Types.ObjectId(), name: 'Plumber Bob', role: 'staff', department: 'plumbing', isActive: true },
      { _id: new mongoose.Types.ObjectId(), name: 'Electrician Alice', role: 'staff', department: 'electrical', isActive: true }
    ];

    User.find = function() {
      return {
        then: (resolve) => resolve(mockStaff)
      };
    };

    // Mock aggregates (0 active jobs, 5.0 average rating)
    Complaint.aggregate = async function(pipeline) {
      // If group by assignedTo for workloads
      if (pipeline[1] && pipeline[1].$group && pipeline[1].$group._id === '$assignedTo') {
        return []; // No workloads, all staff have 0 active jobs
      }
      // If group by assignedTo for ratings
      return [
        { _id: mockStaff[0]._id, avgRating: 5.0 },
        { _id: mockStaff[1]._id, avgRating: 4.0 }
      ];
    };

    const targetComplaint = { category: 'plumbing', urgency: 'medium' };
    const recommendation = await recommendStaff(targetComplaint);

    console.log('   - Recommended Staff Candidate:', recommendation);
    assert.ok(recommendation, 'Recommendation should be returned');
    assert.strictEqual(recommendation.name, 'Plumber Bob', 'Plumber Bob should be recommended for plumbing issue');
    assert.ok(recommendation.score > 80, 'Score should be high due to specialty match & zero workload');

    // Restore mocks
    User.find = originalFind;
    Complaint.aggregate = originalAggregate;

    console.log('   ✅ Staff recommendation engine verified successfully.');

    // ----------------------------------------------------
    // TEST 4: Operations Insights Generator
    // ----------------------------------------------------
    console.log('4. Testing operations insights generator...');
    
    const originalCompAggregate = Complaint.aggregate;
    // Mock database counts for insights
    Complaint.aggregate = async function(pipeline) {
      if (pipeline[1] && pipeline[1].$group && pipeline[1].$group._id === '$hostelBlock') {
        return [{ _id: 'Tagore Hall', count: 12 }]; // Hotspot detected
      }
      return [];
    };

    const insights = await generateOperationsInsights();
    console.log('   - Generated Insights:', insights);
    assert.ok(insights.length > 0, 'Insights list should not be empty');
    assert.ok(insights[0].message.includes('Tagore Hall'), 'Should highlight Tagore Hall as hotspot');

    // Restore Complaint.aggregate
    Complaint.aggregate = originalCompAggregate;

    console.log('   ✅ Operations insights verified successfully.');

    console.log('🎉 ALL INTELLIGENCE SERVICE UNIT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test suite failed with exception:', err);
    process.exit(1);
  }
};

runIntelligenceTests();
