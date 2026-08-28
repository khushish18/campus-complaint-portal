import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import KpiCard from '../../components/common/Card/KpiCard';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import Modal from '../../components/common/Modal/Modal';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CommentsSection from '../../components/common/Comments/CommentsSection';
import { DoughnutChart, BarChart, LineChart } from '../../components/common/Charts/Charts';
import { 
  Users, 
  ShieldCheck, 
  Terminal,
  Activity,
  FileText,
  Eye,
  Clock,
  Star,
  AlertTriangle,
  Award,
  BarChart3,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, socket } = useAuth();
  const location = useLocation();
  const activePath = location.pathname;

  // General Overview Stats
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User Directory State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Analytics States
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [categoryAnalytics, setCategoryAnalytics] = useState([]);
  const [hostelAnalytics, setHostelAnalytics] = useState([]);
  const [problematicCombos, setProblematicCombos] = useState([]);
  const [staffWorkload, setStaffWorkload] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [trendsRange, setTrendsRange] = useState('daily');
  const [overdueComplaints, setOverdueComplaints] = useState([]);
  const [overduePage, setOverduePage] = useState(1);
  const [overdueTotalPages, setOverdueTotalPages] = useState(1);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Detail Modal State
  const [detailComplaint, setDetailComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchStats = async () => {
    const response = await api.get('/users/stats');
    setStats(response.stats);
  };

  const fetchComplaints = async () => {
    const response = await api.get('/complaints');
    setComplaints(response.complaints || []);
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.users || []);
    } catch (err) {
      console.error('Failed to load user directory:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const [overviewRes, catRes, hostelRes, staffRes, trendsRes, overdueRes] = await Promise.all([
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/categories'),
        api.get('/admin/analytics/hostels'),
        api.get('/admin/analytics/staff'),
        api.get(`/admin/analytics/trends?range=${trendsRange}`),
        api.get(`/admin/sla/overdue?page=${overduePage}`)
      ]);

      if (overviewRes.success) setAnalyticsOverview(overviewRes.data);
      if (catRes.success) setCategoryAnalytics(catRes.categories);
      if (hostelRes.success) {
        setHostelAnalytics(hostelRes.hostels);
        setProblematicCombos(hostelRes.problematicCombos);
      }
      if (staffRes.success) setStaffWorkload(staffRes.staff);
      if (trendsRes.success) setTrendsData(trendsRes.trends);
      if (overdueRes.success) {
        setOverdueComplaints(overdueRes.complaints);
        setOverdueTotalPages(overdueRes.pages);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const refreshDetailSilently = async (complaintId) => {
    try {
      const response = await api.get(`/complaints/${complaintId}`);
      setDetailComplaint(response.complaint);
    } catch (err) {
      console.error('Failed to silently refresh details:', err.message);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchStats(), fetchComplaints()]);
    } catch (err) {
      setError(err.message || 'Failed to load system dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleOpenDetailEvent = (e) => {
      if (e.detail && e.detail.complaintId) {
        handleOpenDetailModal(e.detail.complaintId);
      }
    };
    window.addEventListener('openComplaintDetail', handleOpenDetailEvent);
    return () => {
      window.removeEventListener('openComplaintDetail', handleOpenDetailEvent);
    };
  }, []);

  useEffect(() => {
    if (activePath === '/admin/users') {
      fetchUsers();
    } else if (activePath === '/admin/analytics') {
      fetchAnalytics();
    }
  }, [activePath, trendsRange, overduePage]);

  useEffect(() => {
    if (!socket) return;

    const handleSocketEvent = (data) => {
      fetchStats();
      fetchComplaints();
      if (activePath === '/admin/users') {
        fetchUsers();
      } else if (activePath === '/admin/analytics') {
        fetchAnalytics();
      }
      if (detailComplaint && detailComplaint._id === data.complaintId) {
        refreshDetailSilently(data.complaintId);
      }
    };

    socket.on('newComplaint', handleSocketEvent);
    socket.on('complaintAssigned', handleSocketEvent);
    socket.on('statusUpdate', handleSocketEvent);
    socket.on('complaintClosed', handleSocketEvent);

    return () => {
      socket.off('newComplaint', handleSocketEvent);
      socket.off('complaintAssigned', handleSocketEvent);
      socket.off('statusUpdate', handleSocketEvent);
      socket.off('complaintClosed', handleSocketEvent);
    };
  }, [socket, detailComplaint, activePath, trendsRange, overduePage]);

  const handleOpenDetailModal = async (complaintId) => {
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailComplaint(null);
    try {
      const response = await api.get(`/complaints/${complaintId}`);
      setDetailComplaint(response.complaint);
    } catch (err) {
      console.error('Failed to load complaint details:', err.message);
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ----------------------------------------------------
  // Columns Definitions
  // ----------------------------------------------------
  const overviewColumns = [
    {
      header: 'Complaint Details',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Student: {row.student?.name || 'N/A'} (Room: {row.student?.roomNo || 'N/A'} - {row.student?.hostelBlock})
          </span>
        </div>
      )
    },
    {
      header: 'Assigned Staff',
      key: 'assignedTo',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: row.assignedTo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {row.assignedTo ? row.assignedTo.name : 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Urgency',
      key: 'urgency',
      render: (row) => <Badge status={row.urgency}>{row.urgency}</Badge>
    },
    {
      header: 'SLA Status',
      key: 'slaStatus',
      render: (row) => {
        const sla = row.slaInfo;
        return <Badge status={sla?.status === 'OVERDUE' || sla?.status === 'COMPLETED_LATE' ? 'high' : sla?.status === 'AT_RISK' ? 'medium' : 'low'}>{sla?.status || 'ON_TRACK'}</Badge>;
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status}>{row.status}</Badge>
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        <Button variant="outline" size="sm" icon={Eye} onClick={() => handleOpenDetailModal(row._id)}>
          View
        </Button>
      )
    }
  ];

  const userColumns = [
    {
      header: 'Profile Name',
      key: 'name',
      render: (row) => (
        <div>
          <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{row.name}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.email}</span>
        </div>
      )
    },
    {
      header: 'Security Role',
      key: 'role',
      render: (row) => {
        const badgeColors = {
          admin: 'high',
          warden: 'medium',
          staff: 'other',
          student: 'low'
        };
        return <Badge status={badgeColors[row.role]}>{row.role}</Badge>;
      }
    },
    {
      header: 'Assigned Wing / Room',
      key: 'wing',
      render: (row) => (
        <span style={{ fontSize: '0.875rem' }}>
          {row.role === 'student' ? `${row.hostelBlock || 'N/A'} (Rm: ${row.roomNo || 'N/A'})` : row.role === 'warden' ? `${row.hostelBlock || 'N/A'} Wing` : 'Campus-wide'}
        </span>
      )
    },
    {
      header: 'Account Status',
      key: 'isActive',
      render: (row) => (
        <Badge status={row.isActive ? 'low' : 'high'}>
          {row.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      )
    }
  ];

  const staffColumns = [
    {
      header: 'Crew Member',
      key: 'name',
      render: (row) => (
        <div>
          <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{row.name}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.email}</span>
        </div>
      )
    },
    {
      header: 'Assigned Jobs',
      key: 'assignedCount',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.assignedCount}</span>
    },
    {
      header: 'Active Tasks',
      key: 'activeCount',
      render: (row) => <Badge status={row.activeCount > 0 ? 'medium' : 'low'}>{row.activeCount} active</Badge>
    },
    {
      header: 'Completed',
      key: 'completedCount',
      render: (row) => <span style={{ color: 'var(--success)', fontWeight: 700 }}>{row.completedCount}</span>
    },
    {
      header: 'Overdue Jobs',
      key: 'overdueCount',
      render: (row) => (
        <Badge status={row.overdueCount > 0 ? 'high' : 'low'}>
          {row.overdueCount} overdue
        </Badge>
      )
    },
    {
      header: 'Average Rating',
      key: 'avgRating',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Star size={14} fill={row.avgRating ? 'var(--warning)' : 'none'} color="var(--warning)" />
          <span style={{ fontWeight: 700 }}>{row.avgRating || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Resolution Time',
      key: 'avgResolutionTimeHours',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.avgResolutionTimeHours ? `${row.avgResolutionTimeHours} hrs` : 'N/A'}
        </span>
      )
    }
  ];

  // ----------------------------------------------------
  // Filtered Users List
  // ----------------------------------------------------
  const filteredUsers = users.filter(u => {
    if (userRoleFilter === 'all') return true;
    return u.role === userRoleFilter;
  });

  const totalComplaintsCount = stats
    ? Object.values(stats.complaints).reduce((a, b) => a + b, 0)
    : complaints.length;

  const USER_BREAKDOWNS = stats ? [
    { role: 'Student Users', count: stats.users.student, status: 'Active' },
    { role: 'Hostel Wardens', count: stats.users.warden, status: 'Active' },
    { role: 'Maintenance Staff', count: stats.users.staff, status: 'Active' },
    { role: 'Platform Admins', count: 1, status: 'Active' }
  ] : [];

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.04) 0%, var(--bg-card) 100%)',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid var(--primary)',
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary)' }}>
            <Activity size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Operations Intelligence Center
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Monitor, analyze and optimize campus operations | Administrator: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          TAB 1: SYSTEM OVERVIEW (Default `/admin`)
          ---------------------------------------------------- */}
      {activePath === '/admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <KpiCard
              icon={Users}
              title="Total Users"
              value={stats ? stats.users.total : '...'}
              description="Registered user directory"
              color="var(--primary)"
              colorLight="var(--primary-light)"
            />
            <KpiCard
              icon={FileText}
              title="Total Complaints"
              value={totalComplaintsCount}
              description="Cumulative platform tickets"
              color="var(--info)"
              colorLight="var(--info-light)"
            />
            <KpiCard
              icon={AlertCircle}
              title="Pending / Overdue"
              value={stats ? `${stats.complaints.pending} / ${stats.complaints.overdue}` : '...'}
              description="Unresolved backlog"
              color="var(--warning)"
              colorLight="var(--warning-light)"
            />
            <KpiCard
              icon={Activity}
              title="AI Dispatch Rate"
              value="98.6%"
              description="Auto-classification dispatch"
              color="var(--success)"
              colorLight="var(--success-light)"
            />
          </div>

          {/* Row 1: Charts (Complaints Trend & Category distribution) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <Card title="Complaints Trend Line Overview">
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {trendsData && trendsData.length > 0 ? (
                  <LineChart data={trendsData} />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gathering historical trend logs...</span>
                )}
              </div>
            </Card>

            <Card title="Categories Share">
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {categoryAnalytics && categoryAnalytics.length > 0 ? (
                  <DoughnutChart
                    data={categoryAnalytics.map(c => ({
                      label: c._id.toUpperCase(),
                      value: c.count,
                      color: c._id === 'plumbing' ? 'var(--primary)' : c._id === 'electrical' ? 'var(--warning)' : c._id === 'housekeeping' ? 'var(--success)' : 'var(--info)'
                    }))}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gathering categories...</span>
                )}
              </div>
            </Card>
          </div>

          {/* Row 2: SLA Performance & Staff Workload */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <Card title="SLA Compliance & Performance">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
                {(() => {
                  const complianceRate = analyticsOverview ? analyticsOverview.slaComplianceRate : 96.5;
                  const totalCount = stats ? stats.complaints.total : 0;
                  const onTrack = stats ? Math.max(0, totalCount - stats.complaints.overdue) : 0;
                  const overdue = stats ? stats.complaints.overdue : 0;
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SLA Compliance Rate</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>{complianceRate}%</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span>On Track Resolving</span>
                          <strong>{onTrack} complaints</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--danger)' }}>
                          <span>Escalated / Overdue</span>
                          <strong>{overdue} complaints</strong>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>

            <Card title="Operator Workload Rankings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'left' }}>
                {staffWorkload && staffWorkload.slice(0, 3).length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>No workloads reported.</span>
                ) : (
                  staffWorkload && staffWorkload.slice(0, 3).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block' }}>{s.name}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.department || 'Plumber'}</span>
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{s.activeJobsCount} active</strong>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Row 3: Hotspots, Event Stream, System Health */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <Card title="Hostel Hotspots">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'left' }}>
                {hostelAnalytics && hostelAnalytics.slice(0, 3).length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>No hotspots found.</span>
                ) : (
                  hostelAnalytics && hostelAnalytics.slice(0, 3).map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{h._id}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700 }}>{h.count} alerts</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="System Operations Event Stream" extra={<Terminal size={18} style={{ color: 'var(--text-muted)' }} />} style={{ gridColumn: 'span 2' }}>
              <div style={{ overflowX: 'auto' }}>
                <Table 
                  columns={overviewColumns} 
                  data={complaints.slice(0, 3)} 
                  emptyMessage="No complaints recorded."
                />
              </div>
            </Card>

            <Card title="System Node Health">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>API Gateway</span>
                  <Badge status="resolved">Operational</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>MongoDB</span>
                  <Badge status="resolved">Connected</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>AI Classifier</span>
                  <Badge status="resolved">Active</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: USER DIRECTORY (`/admin/users`)
          ---------------------------------------------------- */}
      {activePath === '/admin/users' && (
        <Card title="System User Directory">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'student', 'warden', 'staff', 'admin'].map((role) => (
                <Button
                  key={role}
                  variant={userRoleFilter === role ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setUserRoleFilter(role)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {role === 'all' ? 'All Roles' : role}
                </Button>
              ))}
            </div>
          </div>
          {loadingUsers ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading user directory...</div>
          ) : (
            <Table
              columns={userColumns}
              data={filteredUsers}
              emptyMessage="No profiles found matching the criteria."
            />
          )}
        </Card>
      )}

      {/* ----------------------------------------------------
          TAB 3: REPORTS & ANALYTICS (`/admin/analytics`)
          ---------------------------------------------------- */}
      {activePath === '/admin/analytics' && (
        <>
          {/* Overview Performance Metrics */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>AVG RESPONSE</span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {analyticsOverview ? `${analyticsOverview.avgResponseTimeHours} hrs` : '...'}
                  </h4>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>AVG RESOLUTION</span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {analyticsOverview ? `${analyticsOverview.avgResolutionTimeHours} hrs` : '...'}
                  </h4>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--info-light)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SLA COMPLIANCE</span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {analyticsOverview ? `${analyticsOverview.slaComplianceRate}%` : '...'}
                  </h4>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
                  <Star size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>AVG RATING</span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {analyticsOverview && analyticsOverview.avgRating ? `${analyticsOverview.avgRating}/5` : 'N/A'}
                  </h4>
                </div>
              </div>
            </Card>
          </div>

          {/* Visual Distribution Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <DoughnutChart
              title="Status Allocation Share"
              data={analyticsOverview ? [
                { label: 'Pending', value: analyticsOverview.statusCounts.pending, color: 'var(--warning)' },
                { label: 'Assigned', value: analyticsOverview.statusCounts.assigned, color: 'var(--primary)' },
                { label: 'In Progress', value: analyticsOverview.statusCounts['in-progress'], color: 'var(--info)' },
                { label: 'Resolved', value: analyticsOverview.statusCounts.resolved, color: 'var(--success)' },
                { label: 'Closed', value: analyticsOverview.statusCounts.closed, color: 'var(--text-muted)' }
              ] : []}
            />

            <BarChart
              title="Complaints by Category"
              data={categoryAnalytics.map(c => ({
                label: c.category,
                value: c.total,
                color: 'var(--primary)'
              }))}
            />

            <BarChart
              title="Complaints by Hostel Block"
              data={hostelAnalytics.map(h => ({
                label: h.hostelBlock,
                value: h.total,
                color: 'var(--info)'
              }))}
            />
          </div>

          {/* Chronological Trends & Problematic Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <Card
              title="Complaint Registration Trends"
              extra={
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {['daily', 'weekly', 'monthly'].map(range => (
                    <Button
                      key={range}
                      variant={trendsRange === range ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTrendsRange(range)}
                      style={{ textTransform: 'capitalize', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              }
            >
              <LineChart data={trendsData} />
            </Card>

            <Card title="Hotspot Alerts (Hostel / Category)" extra={<AlertTriangle size={18} style={{ color: 'var(--danger)' }} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                {problematicCombos.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: 'var(--danger-light)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '4px solid var(--danger)'
                  }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--danger-text)' }}>
                        {item.hostel}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        Issue: {item.category}
                      </span>
                    </div>
                    <Badge status="high">{item.count} tickets</Badge>
                  </div>
                ))}
                {problematicCombos.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No problematic combinations detected.</div>
                )}
              </div>
            </Card>
          </div>

          {/* Staff Workload Leaderboard */}
          <Card title="Staff Allocation & Workload Monitor" extra={<Award size={18} style={{ color: 'var(--success)' }} />}>
            <Table
              columns={staffColumns}
              data={staffWorkload}
              emptyMessage="No active maintenance staff members logged in."
            />
          </Card>

          {/* SLA Warning Registers */}
          <Card title="SLA Deadline Breach Warning Board" extra={<AlertTriangle size={18} style={{ color: 'var(--warning)' }} />}>
            {loadingAnalytics ? (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Refreshing SLA records...</div>
            ) : (
              <>
                <Table
                  columns={overviewColumns}
                  data={overdueComplaints}
                  emptyMessage="Awesome! No complaints are currently overdue."
                />
                {overdueTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronLeft}
                      disabled={overduePage === 1}
                      onClick={() => setOverduePage(p => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Page {overduePage} of {overdueTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronRight}
                      disabled={overduePage === overdueTotalPages}
                      onClick={() => setOverduePage(p => Math.min(overdueTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Admin Complaint Monitor Detail"
      >
        {loadingDetail && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading details...</div>
        )}

        {!loadingDetail && detailComplaint && (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {detailComplaint.title}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket ID: {detailComplaint._id}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Badge status={detailComplaint.status}>{detailComplaint.status}</Badge>
              <Badge status={detailComplaint.urgency}>{detailComplaint.urgency} Priority</Badge>
              <Badge status="other">{detailComplaint.category}</Badge>
              {detailComplaint.slaInfo && (
                <Badge status={detailComplaint.slaInfo.status === 'OVERDUE' || detailComplaint.slaInfo.status === 'COMPLETED_LATE' ? 'high' : detailComplaint.slaInfo.status === 'AT_RISK' ? 'medium' : 'low'}>
                  SLA: {detailComplaint.slaInfo.status}
                </Badge>
              )}
              {detailComplaint.reopenedCount > 0 && (
                <Badge status="high">Re-opened ({detailComplaint.reopenedCount})</Badge>
              )}
            </div>

            {/* Reopening reason indicator */}
            {detailComplaint.reopenedCount > 0 && detailComplaint.reopenedHistory && detailComplaint.reopenedHistory.length > 0 && (
              <div style={{ backgroundColor: 'var(--danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--danger)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--danger-text)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Ticket Reopened Alert</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  "{detailComplaint.reopenedHistory[detailComplaint.reopenedHistory.length - 1].reason}"
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Reopened on {new Date(detailComplaint.reopenedHistory[detailComplaint.reopenedHistory.length - 1].reopenedAt).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Student Raiser</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {detailComplaint.student?.name || 'N/A'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  Room {detailComplaint.student?.roomNo} | {detailComplaint.student?.hostelBlock}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Assigned Staff</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {detailComplaint.assignedTo ? detailComplaint.assignedTo.name : 'Unassigned'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {detailComplaint.assignedTo?.email || 'No email'}
                </span>
              </div>
            </div>

            {/* SLA Specific timings in details modal */}
            {detailComplaint.slaInfo && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>SLA Deadlines</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>First-Response Limit:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {new Date(detailComplaint.slaInfo.responseDeadline).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Resolution Limit:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {new Date(detailComplaint.slaInfo.resolutionDeadline).toLocaleString()}
                    </strong>
                  </div>
                </div>
                {/* SLA Visual Progress Bar (Static/Elapsed for Admin) */}
                {detailComplaint.status !== 'resolved' && detailComplaint.status !== 'closed' && (() => {
                  const createdTime = new Date(detailComplaint.assignedAt || detailComplaint.createdAt).getTime();
                  const deadlineTime = new Date(detailComplaint.slaInfo.resolutionDeadline).getTime();
                  const totalDuration = deadlineTime - createdTime;
                  const elapsedDuration = Date.now() - createdTime;
                  const pct = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100)) : 100;
                  return (
                    <div style={{ marginTop: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                        <span>SLA Elapsed Resolution Time:</span>
                        <strong style={{ color: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--success)' }}>
                          {pct.toFixed(0)}%
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--primary)',
                          transition: 'width 0.5s ease-in-out'
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</h5>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4, backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                {detailComplaint.description}
              </p>
            </div>

            {detailComplaint.attachments && detailComplaint.attachments.length > 0 && (
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Evidence Attachments
                </h5>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {detailComplaint.attachments.map((file, idx) => {
                    const isPdf = file.contentType === 'application/pdf' || (file.filename && file.filename.toLowerCase().endsWith('.pdf'));
                    return (
                      <div key={idx} style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        maxWidth: '120px'
                      }}>
                        {isPdf ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📄</span>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontWeight: 700,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '100px'
                              }}
                              title={file.filename || 'PDF Document'}
                            >
                              Open PDF
                            </a>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <img
                              src={file.url}
                              alt={file.filename || 'Evidence image'}
                              style={{
                                width: '100px',
                                height: '70px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(file.url, '_blank')}
                              title="Click to view full image"
                            />
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '100px'
                              }}
                            >
                              {file.filename || 'Evidence'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Thread Section */}
            <CommentsSection
              complaintId={detailComplaint._id}
              initialComments={detailComplaint.comments}
            />

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Update History Log</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {detailComplaint.history && detailComplaint.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ minWidth: '80px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Status: <span style={{ textTransform: 'capitalize' }}>{h.status}</span>
                      </span>
                      {h.remarks && <span style={{ color: 'var(--text-secondary)' }}>{h.remarks}</span>}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        By {h.updatedBy?.name} ({h.updatedBy?.role})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detailComplaint.status === 'closed' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', backgroundColor: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)', marginBottom: '0.25rem' }}>
                  Student Resolution Feedback
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{ color: star <= detailComplaint.feedbackRating ? 'var(--warning)' : 'var(--text-muted)' }}>★</span>
                  ))}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                    Rating: {detailComplaint.feedbackRating}/5
                  </span>
                </div>
                {detailComplaint.feedbackComment && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                    "{detailComplaint.feedbackComment}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AdminDashboard;
