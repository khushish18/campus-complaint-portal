const Complaint = require('../models/Complaint');
const User = require('../models/User');
const SLA_CONFIG = require('../config/slaConfig');
const { generateOperationsInsights } = require('../services/intelligence.service');

// Helper to convert MS to Hours
const msToHours = (ms) => {
  if (!ms) return 0;
  return parseFloat((ms / (1000 * 60 * 60)).toFixed(1));
};

// @desc    Get system-wide analytics overview
// @route   GET /api/admin/analytics/overview
// @access  Private (Admin)
exports.getOverview = async (req, res, next) => {
  try {
    const overview = await Complaint.aggregate([
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          avgMetrics: [
            {
              $group: {
                _id: null,
                avgResolutionTimeMs: {
                  $avg: {
                    $cond: [
                      { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                      { $subtract: ['$resolvedAt', '$createdAt'] },
                      '$$REMOVE'
                    ]
                  }
                },
                avgResponseTimeMs: {
                  $avg: {
                    $cond: [
                      { $and: [{ $ne: ['$assignedAt', null] }, { $ne: ['$createdAt', null] }] },
                      { $subtract: ['$assignedAt', '$createdAt'] },
                      '$$REMOVE'
                    ]
                  }
                },
                avgRating: {
                  $avg: {
                    $cond: [
                      { $ne: ['$feedbackRating', null] },
                      '$feedbackRating',
                      '$$REMOVE'
                    ]
                  }
                }
              }
            }
          ],
          slaCompliance: [
            {
              $project: {
                isCompliant: {
                  $let: {
                    vars: {
                      deadlineMs: {
                        $add: [
                          '$createdAt',
                          {
                            $switch: {
                              branches: [
                                { case: { $eq: ['$urgency', 'high'] }, then: SLA_CONFIG.targets.high.resolutionHours * 60 * 60 * 1000 },
                                { case: { $eq: ['$urgency', 'medium'] }, then: SLA_CONFIG.targets.medium.resolutionHours * 60 * 60 * 1000 },
                                { case: { $eq: ['$urgency', 'low'] }, then: SLA_CONFIG.targets.low.resolutionHours * 60 * 60 * 1000 }
                              ],
                              default: SLA_CONFIG.targets.medium.resolutionHours * 60 * 60 * 1000
                            }
                          }
                        ]
                      }
                    },
                    in: {
                      $cond: [
                        { $in: ['$status', ['resolved', 'closed']] },
                        {
                          $cond: [
                            { $and: [{ $ne: ['$resolvedAt', null] }, { $lte: ['$resolvedAt', '$$deadlineMs'] }] },
                            1,
                            0
                          ]
                        },
                        {
                          $cond: [
                            { $lte: [new Date(), '$$deadlineMs'] },
                            1,
                            0
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                compliantCount: { $sum: '$isCompliant' },
                totalCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Format output
    const data = overview[0];
    const statusCounts = {
      pending: 0,
      assigned: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0
    };
    
    let totalComplaints = 0;
    if (data.statusCounts) {
      data.statusCounts.forEach(item => {
        statusCounts[item._id] = item.count;
        totalComplaints += item.count;
      });
    }

    const averages = data.avgMetrics && data.avgMetrics[0] ? data.avgMetrics[0] : {};
    const sla = data.slaCompliance && data.slaCompliance[0] ? data.slaCompliance[0] : { compliantCount: 0, totalCount: 0 };
    
    const complianceRate = sla.totalCount > 0 
      ? parseFloat(((sla.compliantCount / sla.totalCount) * 100).toFixed(1)) 
      : 100;

    const resolutionRate = totalComplaints > 0
      ? parseFloat((((statusCounts.resolved + statusCounts.closed) / totalComplaints) * 100).toFixed(1))
      : 100;

    res.json({
      success: true,
      data: {
        totalComplaints,
        statusCounts,
        avgResolutionTimeHours: msToHours(averages.avgResolutionTimeMs),
        avgResponseTimeHours: msToHours(averages.avgResponseTimeMs),
        avgRating: averages.avgRating ? parseFloat(averages.avgRating.toFixed(1)) : null,
        slaComplianceRate: complianceRate,
        resolutionRate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category based analytics
// @route   GET /api/admin/analytics/categories
// @access  Private (Admin)
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          unresolved: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'assigned', 'in-progress']] }, 1, 0]
            }
          },
          avgResolutionTimeMs: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                '$$REMOVE'
              ]
            }
          }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          unresolved: 1,
          avgResolutionTimeHours: {
            $cond: [
              { $ne: ['$avgResolutionTimeMs', null] },
              { $round: [{ $divide: ['$avgResolutionTimeMs', 1000 * 60 * 60] }, 1] },
              null
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get hostel based analytics
// @route   GET /api/admin/analytics/hostels
// @access  Private (Admin)
exports.getHostels = async (req, res, next) => {
  try {
    const hostels = await Complaint.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: {
          path: '$studentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$studentInfo.hostelBlock', 'Unknown'] },
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          unresolved: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'assigned', 'in-progress']] }, 1, 0]
            }
          },
          avgResolutionTimeMs: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                '$$REMOVE'
              ]
            }
          }
        }
      },
      {
        $project: {
          hostelBlock: '$_id',
          total: 1,
          pending: 1,
          unresolved: 1,
          avgResolutionTimeHours: {
            $cond: [
              { $ne: ['$avgResolutionTimeMs', null] },
              { $round: [{ $divide: ['$avgResolutionTimeMs', 1000 * 60 * 60] }, 1] },
              null
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const problematicCombos = await Complaint.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: {
          path: '$studentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            hostel: { $ifNull: ['$studentInfo.hostelBlock', 'Unknown'] },
            category: '$category'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          hostel: '$_id.hostel',
          category: '$_id.category',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      hostels,
      problematicCombos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get staff performance & workload analytics
// @route   GET /api/admin/analytics/staff
// @access  Private (Admin)
exports.getStaffWorkload = async (req, res, next) => {
  try {
    const staff = await User.aggregate([
      {
        $match: {
          role: 'staff',
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'complaints'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          assignedCount: { $size: '$complaints' },
          completedCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['resolved', 'closed']] }
              }
            }
          },
          activeCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['assigned', 'in-progress']] }
              }
            }
          },
          avgRating: {
            $avg: '$complaints.feedbackRating'
          },
          avgResolutionTimeMs: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$complaints',
                    as: 'c',
                    cond: { $and: [{ $ne: ['$$c.resolvedAt', null] }, { $ne: ['$$c.createdAt', null] }] }
                  }
                },
                as: 'c',
                in: { $subtract: ['$$c.resolvedAt', '$$c.createdAt'] }
              }
            }
          },
          overdueCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: {
                  $and: [
                    { $not: { $in: ['$$c.status', ['resolved', 'closed']] } },
                    {
                      $gt: [
                        { $subtract: [new Date(), '$$c.createdAt'] },
                        {
                          $switch: {
                            branches: [
                              { case: { $eq: ['$$c.urgency', 'high'] }, then: SLA_CONFIG.targets.high.resolutionHours * 60 * 60 * 1000 },
                              { case: { $eq: ['$$c.urgency', 'medium'] }, then: SLA_CONFIG.targets.medium.resolutionHours * 60 * 60 * 1000 },
                              { case: { $eq: ['$$c.urgency', 'low'] }, then: SLA_CONFIG.targets.low.resolutionHours * 60 * 60 * 1000 }
                            ],
                            default: SLA_CONFIG.targets.medium.resolutionHours * 60 * 60 * 1000
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          assignedCount: 1,
          completedCount: 1,
          activeCount: 1,
          avgRating: {
            $cond: [
              { $ne: ['$avgRating', null] },
              { $round: ['$avgRating', 1] },
              null
            ]
          },
          avgResolutionTimeHours: {
            $cond: [
              { $ne: ['$avgResolutionTimeMs', null] },
              { $round: [{ $divide: ['$avgResolutionTimeMs', 1000 * 60 * 60] }, 1] },
              null
            ]
          },
          overdueCount: 1
        }
      },
      { $sort: { activeCount: -1 } }
    ]);

    res.json({
      success: true,
      staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chronological trends for complaints
// @route   GET /api/admin/analytics/trends
// @access  Private (Admin)
exports.getTrends = async (req, res, next) => {
  try {
    const { range = 'daily' } = req.query;
    let groupBy = {};
    let matchDate = new Date();

    if (range === 'daily') {
      matchDate.setDate(matchDate.getDate() - 30);
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
    } else if (range === 'weekly') {
      matchDate.setDate(matchDate.getDate() - 90);
      groupBy = {
        $concat: [
          { $dateToString: { format: "%Y", date: "$createdAt" } },
          "-W",
          { $toString: { $week: "$createdAt" } }
        ]
      };
    } else {
      // monthly
      matchDate.setMonth(matchDate.getMonth() - 6);
      groupBy = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
    }

    const trends = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: matchDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active overdue complaints with pagination
// @route   GET /api/admin/sla/overdue
// @access  Private (Admin)
exports.getOverdue = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    
    // SLA Resolution Breach calculations
    const overdueQuery = {
      status: { $nin: ['resolved', 'closed'] },
      $or: [
        { urgency: 'high', createdAt: { $lt: new Date(now.getTime() - SLA_CONFIG.targets.high.resolutionHours * 60 * 60 * 1000) } },
        { urgency: 'medium', createdAt: { $lt: new Date(now.getTime() - SLA_CONFIG.targets.medium.resolutionHours * 60 * 60 * 1000) } },
        { urgency: 'low', createdAt: { $lt: new Date(now.getTime() - SLA_CONFIG.targets.low.resolutionHours * 60 * 60 * 1000) } }
      ]
    };

    const total = await Complaint.countDocuments(overdueQuery);
    const complaints = await Complaint.find(overdueQuery)
      .populate('student', 'name email roomNo hostelBlock')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      complaints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI/Operations insights (Admin only)
// @route   GET /api/admin/analytics/insights
// @access  Private (Admin)
exports.getOperationsInsights = async (req, res, next) => {
  try {
    const insights = await generateOperationsInsights();
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    next(error);
  }
};
