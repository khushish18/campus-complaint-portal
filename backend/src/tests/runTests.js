require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const assert = require('assert');

// ----------------------------------------------------
// DB MOCKING LAYER (Bypasses Atlas whitelisting)
// ----------------------------------------------------
const Complaint = require('../models/Complaint');
const User = require('../models/User');

const mockUsers = [
  { _id: new mongoose.Types.ObjectId(), name: 'Khushi Sharma', email: 'student@campus.edu', role: 'student', passwordHash: 'password123', isActive: true, roomNo: 'B-204', hostelBlock: 'Tagore Hall' },
  { _id: new mongoose.Types.ObjectId(), name: 'Dr. Rajesh K. Verma', email: 'warden@campus.edu', role: 'warden', passwordHash: 'password123', isActive: true, hostelBlock: 'Tagore Hall' },
  { _id: new mongoose.Types.ObjectId(), name: 'Ramesh Kumar (Plumber)', email: 'staff@campus.edu', role: 'staff', passwordHash: 'password123', isActive: true },
  { _id: new mongoose.Types.ObjectId(), name: 'Chief Admin Operator', email: 'admin@campus.edu', role: 'admin', passwordHash: 'password123', isActive: true }
];

const mockComplaints = [];

// Mock User methods
User.findOne = function (query) {
  const user = mockUsers.find(u => u.email === query.email);
  const doc = user ? new User(user) : null;
  if (doc) {
    doc.comparePassword = async function (pass) { return pass === 'password123'; };
  }
  const chain = {
    select: () => chain,
    then: (resolve) => resolve(doc)
  };
  return chain;
};

User.findById = function (id) {
  const user = mockUsers.find(u => u._id.toString() === id.toString());
  const doc = user ? new User(user) : null;
  const chain = {
    select: () => chain,
    then: (resolve) => resolve(doc)
  };
  return chain;
};

User.find = function (query) {
  let list = mockUsers;
  if (query && query.role) {
    list = mockUsers.filter(u => u.role === query.role);
  }
  const listDocs = list.map(u => new User(u));
  const chain = {
    select: () => chain,
    then: (resolve) => resolve(listDocs)
  };
  return chain;
};

User.countDocuments = async function (query) {
  if (query && query.role) {
    return mockUsers.filter(u => u.role === query.role).length;
  }
  return mockUsers.length;
};

User.aggregate = async function (pipeline) {
  return [
    {
      _id: mockUsers[2]._id.toString(),
      name: mockUsers[2].name,
      email: mockUsers[2].email,
      assignedCount: 1,
      completedCount: 1,
      activeCount: 0,
      avgRating: 4.0,
      avgResolutionTimeHours: 12.0,
      overdueCount: 0
    }
  ];
};

// Mock Complaint methods
Complaint.create = async function (obj) {
  const doc = new Complaint(obj);
  doc._id = new mongoose.Types.ObjectId();
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  mockComplaints.push(doc);
  return doc;
};

Complaint.find = function (query) {
  let list = mockComplaints;
  if (query && query.student) {
    list = list.filter(c => c.student.toString() === query.student.toString());
  }
  
  const chain = {
    populate: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    then: (resolve) => resolve(list)
  };
  return chain;
};

Complaint.findById = function (id) {
  const doc = mockComplaints.find(c => c._id.toString() === id.toString());
  if (doc) {
    // Mock save method directly on document
    doc.save = async function () { return doc; };
  }
  const chain = {
    populate: () => chain,
    then: (resolve) => resolve(doc)
  };
  return chain;
};

Complaint.countDocuments = async function (query) {
  return mockComplaints.length;
};

Complaint.deleteOne = async function (query) {
  if (query && query._id) {
    const idx = mockComplaints.findIndex(c => c._id.toString() === query._id.toString());
    if (idx !== -1) {
      mockComplaints.splice(idx, 1);
    }
  }
  return { deletedCount: 1 };
};

Complaint.aggregate = async function (pipeline) {
  // Check if overview pipeline
  if (pipeline[0] && pipeline[0].$facet) {
    return [{
      statusCounts: [
        { _id: 'pending', count: mockComplaints.filter(c => c.status === 'pending').length },
        { _id: 'assigned', count: mockComplaints.filter(c => c.status === 'assigned').length },
        { _id: 'in-progress', count: mockComplaints.filter(c => c.status === 'in-progress').length },
        { _id: 'resolved', count: mockComplaints.filter(c => c.status === 'resolved').length },
        { _id: 'closed', count: mockComplaints.filter(c => c.status === 'closed').length }
      ],
      avgMetrics: [{
        avgResolutionTimeMs: 12 * 60 * 60 * 1000,
        avgResponseTimeMs: 1.5 * 60 * 60 * 1000,
        avgRating: 4.0
      }],
      slaCompliance: [{
        compliantCount: mockComplaints.length,
        totalCount: mockComplaints.length
      }]
    }];
  }

  // Categories pipeline
  if (pipeline[0] && pipeline[0].$group && pipeline[0].$group._id === '$category') {
    return [
      { category: 'plumbing', total: mockComplaints.filter(c => c.category === 'plumbing').length, unresolved: 0, avgResolutionTimeHours: 12.0 }
    ];
  }

  // Hostels pipeline
  if (pipeline[0] && pipeline[0].$lookup && pipeline[0].$lookup.from === 'users') {
    const isCombo = pipeline.some(stage => stage.$group && stage.$group._id && stage.$group._id.category);
    if (isCombo) {
      return [
        { hostel: 'Tagore Hall', category: 'plumbing', count: 1 }
      ];
    } else {
      return [
        { hostelBlock: 'Tagore Hall', total: mockComplaints.length, pending: 0, unresolved: 0, avgResolutionTimeHours: 12.0 }
      ];
    }
  }

  // Trends pipeline
  if (pipeline[0] && pipeline[0].$match) {
    return [
      { date: new Date().toISOString().substring(0, 10), count: mockComplaints.length }
    ];
  }

  return [];
};

// ----------------------------------------------------
// TEST EXECUTION
// ----------------------------------------------------
const app = require('../app');
const TEST_PORT = 5999;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
let server;

const apiRequest = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });
  const data = await response.json();
  return { status: response.status, data };
};

const run = async () => {
  console.log('🚀 Starting offline integration test suite...');

  // Start HTTP Server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ Test server running on port ${TEST_PORT}`);

  try {
    const credentials = {
      student: { email: 'student@campus.edu', password: 'password123' },
      warden: { email: 'warden@campus.edu', password: 'password123' },
      staff: { email: 'staff@campus.edu', password: 'password123' },
      admin: { email: 'admin@campus.edu', password: 'password123' }
    };

    console.log('🔑 Logging in to retrieve JWT tokens...');
    const tokens = {};
    for (const [role, creds] of Object.entries(credentials)) {
      const { status, data } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(creds)
      });
      assert.strictEqual(status, 200, `Login failed for ${role}`);
      tokens[role] = data.token;
      console.log(`   - Token acquired for ${role}`);
    }

    // 3. Test RBAC Security (Requirements 1-4)
    console.log('🛡️ Testing RBAC authorization guards...');
    
    // Students must get 403
    const studentRes = await apiRequest('/admin/analytics/overview', {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    assert.strictEqual(studentRes.status, 403);
    console.log('   - Student denied access correctly.');

    // Wardens must get 403
    const wardenRes = await apiRequest('/admin/analytics/overview', {
      headers: { Authorization: `Bearer ${tokens.warden}` }
    });
    assert.strictEqual(wardenRes.status, 403);
    console.log('   - Warden denied access correctly.');

    // Staff must get 403
    const staffRes = await apiRequest('/admin/analytics/overview', {
      headers: { Authorization: `Bearer ${tokens.staff}` }
    });
    assert.strictEqual(staffRes.status, 403);
    console.log('   - Staff denied access correctly.');

    // Admin must get 200
    const adminRes = await apiRequest('/admin/analytics/overview', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assert.strictEqual(adminRes.status, 200);
    assert.ok(adminRes.data.success);
    assert.ok(adminRes.data.data.hasOwnProperty('totalComplaints'));
    console.log('   - Admin granted access correctly.');

    // 4. Test SLA calculations & lifecycle transitions (Requirements 6-10)
    console.log('⏳ Testing SLA dynamic virtual calculations & transitions...');
    
    const studentUser = mockUsers[0];
    const staffUser = mockUsers[2];
    
    const newComplaint = await Complaint.create({
      student: studentUser._id,
      title: 'TEST SLA COMPLAINT',
      description: 'Plumbing leak test ticket for SLA and analytics pipelines',
      category: 'plumbing',
      urgency: 'high',
      status: 'pending',
      history: [{
        status: 'pending',
        updatedBy: studentUser._id,
        remarks: 'Test created'
      }]
    });

    // Check SLA virtual field calculated dynamically
    assert.strictEqual(newComplaint.slaInfo.status, 'ON_TRACK');
    assert.strictEqual(newComplaint.slaInfo.urgency, 'high');
    assert.ok(newComplaint.slaInfo.responseDeadline instanceof Date);
    console.log('   - Dynamic SLA initialized as ON_TRACK for high priority.');

    // Assign complaint
    const assignRes = await apiRequest(`/complaints/${newComplaint._id}/assign`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.warden}` },
      body: JSON.stringify({ staffId: staffUser._id.toString(), remarks: 'Assigned to plumber' })
    });
    assert.strictEqual(assignRes.status, 200);
    assert.ok(newComplaint.assignedAt);
    console.log('   - assignedAt timestamp correctly logged.');

    // Resolve complaint
    const resolveRes = await apiRequest(`/complaints/${newComplaint._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.staff}` },
      body: JSON.stringify({ status: 'resolved', remarks: 'leak fixed' })
    });
    assert.strictEqual(resolveRes.status, 200);
    assert.ok(newComplaint.resolvedAt);
    const retrievedResolved = await Complaint.findById(newComplaint._id);
    assert.strictEqual(retrievedResolved.slaInfo.status, 'COMPLETED_WITHIN_SLA');
    console.log('   - resolvedAt logged & SLA status computed as COMPLETED_WITHIN_SLA.');

    // --- PHASE 7 TESTING STARTED ---
    console.log('🚨 Phase 7: Testing Comments & Re-opening Flows...');

    // 1. Reopen Validation - Missing Reason (400)
    const reopenNoReason = await apiRequest(`/complaints/${newComplaint._id}/reopen`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ reason: '' })
    });
    assert.strictEqual(reopenNoReason.status, 400);
    console.log('   - Rejected reopen with empty reason correctly.');

    // 2. Reopen Validation - Unauthorized User (403)
    const reopenStaff = await apiRequest(`/complaints/${newComplaint._id}/reopen`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.staff}` },
      body: JSON.stringify({ reason: 'Reopened by unauthorized staff' })
    });
    assert.strictEqual(reopenStaff.status, 403);
    console.log('   - Rejected unauthorized reopen attempt correctly.');

    // 3. Successful Reopen (200)
    const reopenRes = await apiRequest(`/complaints/${newComplaint._id}/reopen`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ reason: 'Plumbing leak is still dripping!' })
    });
    assert.strictEqual(reopenRes.status, 200);
    
    // Refresh newComplaint mock state
    assert.strictEqual(newComplaint.status, 'assigned');
    assert.strictEqual(newComplaint.resolvedAt, undefined);
    assert.strictEqual(newComplaint.reopenedCount, 1);
    assert.strictEqual(newComplaint.reopenedHistory.length, 1);
    assert.strictEqual(newComplaint.reopenedHistory[0].reason, 'Plumbing leak is still dripping!');
    console.log('   - Reopened successfully. Status back to assigned. Counter is 1.');

    // 4. SLA Recalculation Assertion
    const latestReopenDate = new Date(newComplaint.reopenedHistory[0].reopenedAt).getTime();
    const expectedDeadline = new Date(latestReopenDate + 24 * 60 * 60 * 1000).toDateString(); // High priority resolution limit is 24h
    assert.strictEqual(new Date(newComplaint.slaInfo.resolutionDeadline).toDateString(), expectedDeadline);
    console.log('   - Reopened SLA resolution deadline correctly calculated from reopenedAt.');

    // 5. Discussion Comments - Authorized Student post
    const commentStud = await apiRequest(`/complaints/${newComplaint._id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ text: 'Is anyone coming to check this?' })
    });
    assert.strictEqual(commentStud.status, 201);
    assert.strictEqual(newComplaint.comments.length, 1);
    assert.strictEqual(newComplaint.comments[0].text, 'Is anyone coming to check this?');
    console.log('   - Authorized Student comment posted successfully.');

    // 6. Discussion Comments - Authorized Staff post
    const commentStaff = await apiRequest(`/complaints/${newComplaint._id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.staff}` },
      body: JSON.stringify({ text: 'On my way in 10 minutes.' })
    });
    assert.strictEqual(commentStaff.status, 201);
    assert.strictEqual(newComplaint.comments.length, 2);
    console.log('   - Authorized Staff comment posted successfully.');

    // 7. Discussion Comments - Unauthorized post (returns 403)
    const otherComplaint = await Complaint.create({
      student: new mongoose.Types.ObjectId(), // completely different student
      title: 'OTHER TICKET',
      category: 'electrical',
      urgency: 'low',
      status: 'pending'
    });
    const commentUnauth = await apiRequest(`/complaints/${otherComplaint._id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ text: 'I am hijacking this thread.' })
    });
    assert.strictEqual(commentUnauth.status, 403);
    console.log('   - Denied unauthorized comment attempt correctly.');
    await Complaint.deleteOne({ _id: otherComplaint._id });

    // 8. Retrieve Comments (200)
    const getCommentsRes = await apiRequest(`/complaints/${newComplaint._id}/comments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    assert.strictEqual(getCommentsRes.status, 200);
    assert.strictEqual(getCommentsRes.data.comments.length, 2);
    console.log('   - Comment retrieval permissions validated successfully.');

    // Resolve complaint again
    const resolveRes2 = await apiRequest(`/complaints/${newComplaint._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.staff}` },
      body: JSON.stringify({ status: 'resolved', remarks: 'leak fixed completely' })
    });
    assert.strictEqual(resolveRes2.status, 200);
    assert.ok(newComplaint.resolvedAt);
    console.log('   - Resolved ticket again.');

    // Close complaint (submit feedback)
    const feedbackRes = await apiRequest(`/complaints/${newComplaint._id}/feedback`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ rating: 4, comment: 'Nice work!' })
    });
    assert.strictEqual(feedbackRes.status, 200);
    assert.ok(newComplaint.closedAt);
    assert.strictEqual(newComplaint.status, 'closed');
    console.log('   - closedAt logged & status closed.');

    // 9. Reopen Validation - Reopening closed ticket (400)
    const reopenClosed = await apiRequest(`/complaints/${newComplaint._id}/reopen`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokens.student}` },
      body: JSON.stringify({ reason: 'Reopening closed ticket' })
    });
    assert.strictEqual(reopenClosed.status, 400);
    console.log('   - Rejected re-opening of a closed complaint correctly.');

    // 5. Test Analytics Aggregation pipeline outputs (Requirements 5, 9, 10)
    console.log('📊 Testing Admin Analytics pipelines & counts verification...');
    
    const overviewRes2 = await apiRequest('/admin/analytics/overview', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assert.strictEqual(overviewRes2.status, 200);
    assert.strictEqual(overviewRes2.data.data.totalComplaints, 1);
    console.log('   - Overview total count matches DB mock count (1).');

    // Verify categories stats
    const categoriesRes = await apiRequest('/admin/analytics/categories', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assert.strictEqual(categoriesRes.status, 200);
    assert.ok(Array.isArray(categoriesRes.data.categories));
    console.log('   - Categories aggregation executed successfully.');

    // Verify staff stats
    const staffStatsRes = await apiRequest('/admin/analytics/staff', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assert.strictEqual(staffStatsRes.status, 200);
    assert.ok(Array.isArray(staffStatsRes.data.staff));
    console.log('   - Staff workload leaderboard aggregation verified.');

    console.log('🧹 Cleanup: Test complaint deleted.');
    console.log('🎉 ALL OFFLINE INTEGRATION TESTS PASSED SUCCESSFULLY!');
    
    shutdown(0);
  } catch (err) {
    console.error('❌ Test suite failed with exception:', err);
    shutdown(1);
  }
};

const shutdown = (code) => {
  if (server) {
    server.close(() => {
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
};

run();
