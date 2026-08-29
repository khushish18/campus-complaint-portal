const Complaint = require('../models/Complaint');
const User = require('../models/User');
const SLA_CONFIG = require('../config/slaConfig');

/**
 * Tokenize string and filter out common English stop words to perform Jaccard Similarity
 */
const getCleanTokens = (text = '') => {
  const stopWords = new Set([
    'the', 'a', 'is', 'in', 'and', 'my', 'to', 'not', 'working', 'broken', 
    'issue', 'repair', 'on', 'of', 'for', 'it', 'this', 'that', 'with', 'from'
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2 && !stopWords.has(token))
  );
};

/**
 * Calculate Jaccard Similarity between two token sets
 */
const calculateJaccardSimilarity = (setA, setB) => {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
};

/**
 * Compute similarity score (0-100) between a new complaint and a historical one
 */
const calculateSimilarity = (newC, oldC) => {
  // Weights: Category (25%), Location (25%), Time Proximity (20%), Text Similarity (30%)
  let score = 0;

  // 1. Category Match (25%)
  if (newC.category && oldC.category && newC.category === oldC.category) {
    score += 25;
  }

  // 2. Location Match (25%)
  const newHostel = newC.hostelBlock || (newC.student && newC.student.hostelBlock);
  const oldHostel = oldC.hostelBlock || (oldC.student && oldC.student.hostelBlock);
  const newRoom = newC.roomNo || (newC.student && newC.student.roomNo);
  const oldRoom = oldC.roomNo || (oldC.student && oldC.student.roomNo);

  if (newHostel && oldHostel && newHostel === oldHostel) {
    if (newRoom && oldRoom && newRoom === oldRoom) {
      score += 25; // Same wing + room
    } else {
      score += 15; // Same wing, different room
    }
  }

  // 3. Time Proximity (20%)
  const newTime = new Date(newC.createdAt || Date.now()).getTime();
  const oldTime = new Date(oldC.createdAt).getTime();
  const diffMs = Math.abs(newTime - oldTime);
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 24) {
    score += 20;
  } else if (diffHours <= 24 * 7) {
    score += 12;
  } else if (diffHours <= 24 * 30) {
    score += 5;
  }

  // 4. Text/Title Similarity (30%)
  const textANew = `${newC.title} ${newC.description || ''}`;
  const textAOld = `${oldC.title} ${oldC.description || ''}`;
  const tokensNew = getCleanTokens(textANew);
  const tokensOld = getCleanTokens(textAOld);
  const jaccard = calculateJaccardSimilarity(tokensNew, tokensOld);
  score += Math.round(jaccard * 30);

  // Classify Relation Type
  let relationType = 'no meaningful similarity';
  if (score >= 80) {
    relationType = 'probable duplicate';
  } else if (score >= 50) {
    relationType = 'related / recurring';
  }

  return { score, relationType };
};

/**
 * Scan database for similar complaints created in the last 30 days
 */
const detectSimilarComplaints = async (newComplaint) => {
  try {
    const newHostel = newComplaint.hostelBlock || (newComplaint.student && newComplaint.student.hostelBlock);
    if (!newHostel) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Bounded search: same hostelBlock, created in the last 30 days, excluding current complaint
    const query = {
      hostelBlock: newHostel,
      createdAt: { $gte: thirtyDaysAgo }
    };
    if (newComplaint._id) {
      query._id = { $ne: newComplaint._id };
    }

    const candidates = await Complaint.find(query).populate('student', 'name email hostelBlock roomNo');
    const results = [];

    for (const cand of candidates) {
      const { score, relationType } = calculateSimilarity(newComplaint, cand);
      if (score >= 50) {
        results.push({
          complaintId: cand._id,
          similarityScore: score,
          relationType,
          title: cand.title // temp placeholder for UI
        });
      }
    }

    // Sort descending by similarity
    return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 3);
  } catch (err) {
    console.error('Similarity detection error:', err.message);
    return [];
  }
};

/**
 * Calculate Priority Score (0-100) and compile explainable reasons
 */
const calculatePriorityScore = async (complaint) => {
  let score = 0;
  const reasons = [];

  // 1. Urgency Field (Max 35 pts)
  const urgency = complaint.urgency || 'medium';
  let urgencyPts = 20;
  if (urgency === 'high') {
    urgencyPts = 35;
  } else if (urgency === 'low') {
    urgencyPts = 10;
  }
  score += urgencyPts;
  reasons.push({ signal: `Urgency Level (${urgency.toUpperCase()})`, value: urgencyPts });

  // 2. SLA Proximity (Max 30 pts)
  const now = Date.now();
  const createdAt = new Date(complaint.createdAt || now).getTime();
  const target = SLA_CONFIG.targets[urgency] || SLA_CONFIG.targets.medium;
  const resolutionDeadline = createdAt + target.resolutionHours * 60 * 60 * 1000;
  const timeRemaining = resolutionDeadline - now;

  let slaPts = 0;
  if (['resolved', 'closed'].includes(complaint.status)) {
    slaPts = 0; // Completed tickets don't need active priority
  } else if (timeRemaining < 0) {
    slaPts = 30; // Overdue gets maximum penalty
    reasons.push({ signal: 'SLA Deadline Breached (OVERDUE)', value: 30 });
  } else {
    const totalTime = target.resolutionHours * 60 * 60 * 1000;
    const remainingPct = timeRemaining / totalTime;
    if (remainingPct <= SLA_CONFIG.riskThresholdPercent / 100) {
      slaPts = 20;
      reasons.push({ signal: 'SLA Deadline Approaching (AT_RISK)', value: 20 });
    } else if (remainingPct <= 0.5) {
      slaPts = 10;
      reasons.push({ signal: 'Halfway through SLA Window', value: 10 });
    }
  }
  score += slaPts;

  // 3. Wing / Hostel Concentration Alerts (Max 15 pts)
  const hostel = complaint.hostelBlock;
  if (hostel) {
    // Count active complaints in same hostel block
    const activeInBlock = await Complaint.countDocuments({
      hostelBlock: hostel,
      status: { $in: ['pending', 'assigned', 'in-progress'] },
      _id: { $ne: complaint._id }
    });

    if (activeInBlock >= 3) {
      score += 15;
      reasons.push({ signal: `High concentration of unresolved issues in ${hostel} (${activeInBlock} active)`, value: 15 });
    } else if (activeInBlock > 0) {
      score += 5;
      reasons.push({ signal: `Active issues in same block (${activeInBlock} active)`, value: 5 });
    }
  }

  // 4. Reopen History (Max 20 pts)
  const reopenedCount = complaint.reopenedCount || 0;
  if (reopenedCount > 0) {
    const reopenPts = Math.min(20, reopenedCount * 10);
    score += reopenPts;
    reasons.push({ signal: `Complaint re-opened by student (${reopenedCount} times)`, value: reopenPts });
  }

  // Cap score at 100
  score = Math.min(100, score);

  return { score, reasons };
};

/**
 * Background worker task to recalculate priority scores for all active complaints
 */
const updateActivePriorityScores = async () => {
  console.log('Background Priority Worker: Syncing active priority scores...');
  try {
    const activeComplaints = await Complaint.find({
      status: { $in: ['pending', 'assigned', 'in-progress'] }
    });

    let count = 0;
    for (const c of activeComplaints) {
      // Ensure hostelBlock is cached
      if (!c.hostelBlock) {
        const populated = await Complaint.findById(c._id).populate('student', 'hostelBlock');
        if (populated && populated.student) {
          c.hostelBlock = populated.student.hostelBlock;
        }
      }

      const { score, reasons } = await calculatePriorityScore(c);
      c.priorityScore = score;
      c.priorityReasons = reasons;
      await c.save();
      count++;
    }
    console.log(`Background Priority Worker: Recalculated priorities for ${count} tickets.`);
  } catch (err) {
    console.error('Background Priority Worker Error:', err.message);
  }
};

/**
 * Recommend a staff member based on skills, availability, and historical ratings
 */
const recommendStaff = async (complaint) => {
  try {
    // 1. Fetch active staff members
    const staffMembers = await User.find({ role: 'staff', isActive: true });
    if (staffMembers.length === 0) return null;

    // 2. Fetch metrics for staff workload (active assigned jobs)
    const activeJobs = await Complaint.aggregate([
      { $match: { status: { $in: ['assigned', 'in-progress'] } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    const workloadMap = {};
    activeJobs.forEach(j => {
      if (j._id) workloadMap[j._id.toString()] = j.count;
    });

    // 3. Fetch staff historical ratings
    const staffRatings = await Complaint.aggregate([
      { $match: { status: 'closed', feedbackRating: { $ne: null } } },
      { $group: { _id: '$assignedTo', avgRating: { $avg: '$feedbackRating' } } }
    ]);

    const ratingMap = {};
    staffRatings.forEach(r => {
      if (r._id) ratingMap[r._id.toString()] = parseFloat(r.avgRating.toFixed(1));
    });

    const recommendations = [];

    for (const staff of staffMembers) {
      let score = 0;
      const explanation = [];

      // A. Department Expertise match (+50 pts)
      if (staff.department && complaint.category && staff.department === complaint.category) {
        score += 50;
        explanation.push(`Specializes in ${complaint.category}`);
      }

      // B. Workload Score (Max 30 pts)
      const currentWorkload = workloadMap[staff._id.toString()] || 0;
      let workloadPts = 0;
      if (currentWorkload === 0) {
        workloadPts = 30;
        explanation.push('Available immediately (0 active jobs)');
      } else if (currentWorkload === 1) {
        workloadPts = 20;
        explanation.push('Low active workload (1 active job)');
      } else if (currentWorkload === 2) {
        workloadPts = 10;
        explanation.push('Moderate workload (2 active jobs)');
      } else {
        explanation.push(`High active workload (${currentWorkload} jobs)`);
      }
      score += workloadPts;

      // C. Performance Score (Max 20 pts)
      const avgRating = ratingMap[staff._id.toString()] || 4.0; // default benchmark
      const ratingPts = Math.round(avgRating * 4); // rating of 5.0 -> 20 pts
      score += ratingPts;
      explanation.push(`Historical satisfaction rating: ${avgRating.toFixed(1)}/5`);

      recommendations.push({
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        score,
        explanation
      });
    }

    // Sort by recommendation score descending
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations[0]; // return top recommended candidate
  } catch (err) {
    console.error('Staff recommendation engine error:', err.message);
    return null;
  }
};

/**
 * Generate actionable dashboard insights for admins
 */
const generateOperationsInsights = async () => {
  try {
    const insights = [];

    // 1. Hotspots Analysis (Wing/Block alert concentration)
    const blockAggs = await Complaint.aggregate([
      { $match: { status: { $in: ['pending', 'assigned', 'in-progress'] } } },
      { $group: { _id: '$hostelBlock', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (blockAggs.length > 0 && blockAggs[0].count >= 4 && blockAggs[0]._id) {
      insights.push({
        type: 'danger',
        message: `${blockAggs[0]._id} currently has the highest active complaint density (${blockAggs[0].count} tickets).`,
        actionableStep: 'Deploy a dedicated roving team to inspect shared wing installations.'
      });
    }

    // 2. SLA Risk Alert
    const now = Date.now();
    const riskCount = await Complaint.aggregate([
      { $match: { status: { $in: ['pending', 'assigned', 'in-progress'] } } },
      {
        $project: {
          timeRemainingMs: {
            $subtract: [
              {
                $add: [
                  '$createdAt',
                  {
                    $switch: {
                      branches: [
                        { case: { $eq: ['$urgency', 'high'] }, then: 24 * 60 * 60 * 1000 },
                        { case: { $eq: ['$urgency', 'medium'] }, then: 48 * 60 * 60 * 1000 },
                        { case: { $eq: ['$urgency', 'low'] }, then: 72 * 60 * 60 * 1000 }
                      ],
                      default: 48 * 60 * 60 * 1000
                    }
                  }
                ]
              },
              now
            ]
          }
        }
      },
      { $match: { timeRemainingMs: { $lt: 0 } } }
    ]);

    if (riskCount.length > 0) {
      insights.push({
        type: 'warning',
        message: `${riskCount.length} active complaints are currently overdue and have breached SLA limits.`,
        actionableStep: 'Reassign overdue tickets to senior staff or dispatch emergency caretakers.'
      });
    }

    // 3. Category Trend hotspot (Utility breakdowns)
    const categoryAggs = await Complaint.aggregate([
      { $match: { status: { $in: ['pending', 'assigned', 'in-progress'] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (categoryAggs.length > 0 && categoryAggs[0].count >= 3 && categoryAggs[0]._id) {
      insights.push({
        type: 'info',
        message: `${categoryAggs[0]._id.toUpperCase()} complaints are currently the most reported category on campus.`,
        actionableStep: 'Review spare parts inventory for plumbing and electrical fixtures to avoid dispatch delays.'
      });
    }

    // 4. Staff Workload Balance check
    const activeStaffJobs = await Complaint.aggregate([
      { $match: { status: { $in: ['assigned', 'in-progress'] } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    const maxWorkload = activeStaffJobs.length > 0 ? Math.max(...activeStaffJobs.map(s => s.count)) : 0;
    if (maxWorkload >= 3) {
      insights.push({
        type: 'info',
        message: `Certain maintenance staff members are carrying uneven workloads (max ${maxWorkload} active jobs).`,
        actionableStep: 'Utilize the Warden dashboard recommended dispatch list to distribute tasks evenly.'
      });
    }

    if (insights.length === 0) {
      return [{
        type: 'success',
        message: 'Campus operations are running smoothly with normal load.',
        actionableStep: 'No corrective actions are currently required.'
      }];
    }

    return insights;
  } catch (err) {
    console.error('Error generating operational insights:', err.message);
    return [{
      type: 'warning',
      message: 'Not enough data for a reliable insight.',
      actionableStep: 'Gathering operations metrics...'
    }];
  }
};

module.exports = {
  calculateSimilarity,
  detectSimilarComplaints,
  calculatePriorityScore,
  updateActivePriorityScores,
  recommendStaff,
  generateOperationsInsights
};
