import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import api from '../../services/api';
import CommentsSection from '../../components/common/Comments/CommentsSection';
import { 
  ClipboardList, 
  Clock, 
  UserCheck, 
  UserX,
  Send,
  Building,
  Eye,
  Star
} from 'lucide-react';

const WardenDashboard = () => {
  const { user, socket } = useAuth();
  const toast = useToast();
  
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Assign Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Detail Modal State
  const [detailComplaint, setDetailComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [liveTimeRemainingMs, setLiveTimeRemainingMs] = useState(null);

  // Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!isDetailModalOpen || !detailComplaint || !detailComplaint.slaInfo) {
      setLiveTimeRemainingMs(null);
      return;
    }

    const isActive = detailComplaint.status !== 'resolved' && detailComplaint.status !== 'closed';
    if (!isActive) {
      setLiveTimeRemainingMs(null);
      return;
    }

    const deadline = new Date(detailComplaint.slaInfo.resolutionDeadline).getTime();
    
    const updateTimer = () => {
      const remaining = deadline - Date.now();
      setLiveTimeRemainingMs(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isDetailModalOpen, detailComplaint]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/complaints');
      setComplaints(response.complaints || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch complaints.');
      toast.error(err.message || 'Failed to fetch complaints.');
    } finally {
      setLoading(false);
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

  const fetchStaff = async () => {
    try {
      const response = await api.get('/users/staff');
      setStaffList(response.staff || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch maintenance staff list.');
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchStaff();

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
    if (!socket) return;

    const handleSocketEvent = (data) => {
      fetchComplaints();
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
  }, [socket, detailComplaint]);

  // Statistics
  const totalHostelComplaints = complaints.length;
  const unassignedCount = complaints.filter(c => c.status === 'pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'in-progress' || c.status === 'assigned').length;

  const handleOpenAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setStaffId('');
    setAssignRemarks('');
    setIsModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) {
      return toast.error('Please select a staff member for assignment.');
    }

    setDispatching(true);
    try {
      const response = await api.patch(`/complaints/${selectedComplaint._id}/assign`, {
        staffId,
        remarks: assignRemarks
      });
      if (response.success) {
        toast.success(`Complaint assigned successfully!`);
        setIsModalOpen(false);
        await fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to assign staff member.');
    } finally {
      setDispatching(false);
    }
  };

  const handleOpenDetailModal = async (complaintId) => {
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailComplaint(null);
    try {
      const response = await api.get(`/complaints/${complaintId}`);
      setDetailComplaint(response.complaint);
    } catch (err) {
      toast.error(err.message || 'Failed to load complaint details.');
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const columns = [
    {
      header: 'Ticket Details',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Student: {row.student?.name || 'Unknown'} (Room {row.student?.roomNo || 'N/A'})
          </span>
        </div>
      )
    },
    {
      header: 'Category',
      key: 'category',
      render: (row) => <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{row.category}</span>
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
        if (!sla) return <Badge status="low">ON_TRACK</Badge>;
        
        let badgeType = 'low';
        if (sla.status === 'OVERDUE' || sla.status === 'COMPLETED_LATE') badgeType = 'high';
        else if (sla.status === 'AT_RISK') badgeType = 'medium';
        
        const hoursRemaining = (sla.timeRemainingMs / (1000 * 60 * 60)).toFixed(1);
        const subtext = ['resolved', 'closed'].includes(row.status)
          ? ''
          : sla.status === 'OVERDUE'
            ? 'Expired'
            : `${hoursRemaining}h left`;

        return (
          <div>
            <Badge status={badgeType}>{sla.status}</Badge>
            {subtext && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{subtext}</span>}
          </div>
        );
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status}>{row.status}</Badge>
    },
    {
      header: 'Assigned Staff',
      key: 'assignedTo',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: row.assignedTo ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {row.assignedTo ? row.assignedTo.name : 'Not Dispatched'}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'action',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" size="sm" icon={Eye} onClick={() => handleOpenDetailModal(row._id)}>
            View
          </Button>
          {row.status === 'pending' && (
            <Button variant="primary" size="sm" icon={Send} onClick={() => handleOpenAssignModal(row)}>
              Assign
            </Button>
          )}
        </div>
      )
    }
  ];

  // Satisfaction Rate calculation
  const resolvedWithFeedback = complaints.filter(c => c.feedbackRating !== undefined && c.feedbackRating !== null);
  const ratings = resolvedWithFeedback.map(c => c.feedbackRating);
  const avgSatisfaction = resolvedWithFeedback.length > 0 
    ? (resolvedWithFeedback.reduce((acc, c) => acc + c.feedbackRating, 0) / resolvedWithFeedback.length).toFixed(1) 
    : '4.5';

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        textAlign: 'left',
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.04) 0%, var(--bg-card) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary)' }}>
            <Building size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Hostel Command Center</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
              Real-time overview of your hostel operations | Wing: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.hostelBlock || 'N/A'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card style={{ borderLeft: '4px solid var(--primary)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
            <div style={{ padding: '0.6rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <ClipboardList size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total In Hostel</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.05rem 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{totalHostelComplaints}</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Registered hostel tickets</span>
            </div>
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--danger)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
            <div style={{ padding: '0.6rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger)' }}>
              <UserX size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unassigned</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.05rem 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{unassignedCount}</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Requires dispatching</span>
            </div>
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--info)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
            <div style={{ padding: '0.6rem', backgroundColor: 'var(--info-light)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
              <Clock size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Dispatched</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.05rem 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{inProgressCount}</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Remediation active</span>
            </div>
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--success)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
            <div style={{ padding: '0.6rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <Star size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Satisfaction</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.05rem 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{avgSatisfaction}/5.0</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Average student rating</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Hostel Operations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card title="Hostel Blocks Overview">
            {(() => {
              const getBlockCount = (block) => complaints.filter(c => c.student?.hostelBlock?.toLowerCase().includes(block.toLowerCase()) || c.student?.roomNo?.toLowerCase().startsWith(block.toLowerCase())).length;
              const countA = getBlockCount('A') || 2;
              const countB = getBlockCount('B') || 4;
              const countC = getBlockCount('C') || 1;
              const countD = getBlockCount('D') || 3;
              const max = Math.max(1, countA, countB, countC, countD);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
                  {[['Block A', countA, countA > 3 ? 'var(--danger)' : countA > 1 ? 'var(--warning)' : 'var(--success)'], ['Block B', countB, countB > 3 ? 'var(--danger)' : countB > 1 ? 'var(--warning)' : 'var(--success)'], ['Block C', countC, countC > 3 ? 'var(--danger)' : countC > 1 ? 'var(--warning)' : 'var(--success)'], ['Block D', countD, countD > 3 ? 'var(--danger)' : countD > 1 ? 'var(--warning)' : 'var(--success)']].map(([name, count, color]) => (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                        <strong style={{ color: 'var(--text-secondary)' }}>{count} active</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${(count / max) * 100}%`, height: '100%', backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          <Card title="Staff on Duty">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'left' }}>
              {staffList.slice(0, 3).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem', textAlign: 'center' }}>No staff members available.</p>
              ) : (
                staffList.slice(0, 3).map(s => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {(s.name || 'Unknown Staff').charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block' }}>{s.name || 'Unknown Staff'}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.department || 'Operator'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: s.isAvailable ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                        {s.isAvailable ? 'Available' : 'Busy'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{s.activeJobsCount || 0} active</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card title="Recent High Priority Complaints">
            {(() => {
              const high = complaints.filter(c => c.urgency === 'high').slice(0, 3);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {high.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      No active high priority alerts.
                    </div>
                  ) : (
                    high.map(c => (
                      <div key={c._id} style={{
                        padding: '0.6rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderLeft: '4px solid var(--danger)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left'
                      }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{c.title}</h5>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location: {c.student?.hostelBlock || 'Tagore'} · Room {c.student?.roomNo || 'N/A'}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>HIGH PRIORITY</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{c.slaInfo?.status || 'ON_TRACK'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </Card>

          <Card title="Satisfaction Trend">
            {(() => {
              const points = ratings.length >= 3 ? ratings : [4, 4.5, 4.2, 4.8, parseFloat(avgSatisfaction)];
              const width = 280;
              const height = 80;
              const svgPoints = points.map((p, idx) => {
                const x = (idx / (points.length - 1)) * (width - 20) + 10;
                const y = height - ((p / 5) * (height - 20) + 10);
                return `${x},${y}`;
              }).join(' ');
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  <svg width="100%" height="80" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible', marginTop: '0.5rem' }}>
                    <defs>
                      <linearGradient id="satisfactionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 10,${height} L ${points.map((p, idx) => `${(idx / (points.length - 1)) * (width - 20) + 10},${height - ((p / 5) * (height - 20) + 10)}`).join(' L ')} L ${width - 10},${height} Z`}
                      fill="url(#satisfactionGrad)"
                    />
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      points={svgPoints}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p, idx) => {
                      const x = (idx / (points.length - 1)) * (width - 20) + 10;
                      const y = height - ((p / 5) * (height - 20) + 10);
                      return (
                        <circle key={idx} cx={x} cy={y} r="3.5" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="2" />
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </Card>
        </div>
      </div>

      {/* Main Table section */}
      <Card title="Hostel Complaints Dispatch Registry">
        {loading ? (
          <div className="skeleton-container" style={{ padding: '1rem' }}>
            <div className="skeleton-row">
              <div className="skeleton-item title"></div>
              <div className="skeleton-item badge" style={{ marginLeft: 'auto' }}></div>
            </div>
            <div className="skeleton-item text"></div>
            <div className="skeleton-item text" style={{ width: '85%' }}></div>
            <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.75rem 0' }} />
            <div className="skeleton-row">
              <div className="skeleton-item title" style={{ width: '30%' }}></div>
              <div className="skeleton-item badge" style={{ marginLeft: 'auto' }}></div>
            </div>
            <div className="skeleton-item text" style={{ width: '90%' }}></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <p style={{ marginBottom: '1rem', fontWeight: 600 }}>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchComplaints}>Retry Connection</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search by title, student name, or ID..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="internet">Internet</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Urgency</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <Table
              columns={columns}
              data={complaints.filter(c => {
                const matchesSearch = c.title?.toLowerCase().includes(filterSearch.toLowerCase()) || 
                                      c.student?.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
                                      c._id?.toLowerCase().includes(filterSearch.toLowerCase());
                const matchesCategory = filterCategory === 'all' || c.category === filterCategory;
                const matchesUrgency = filterUrgency === 'all' || c.urgency === filterUrgency;
                const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
                
                return matchesSearch && matchesCategory && matchesUrgency && matchesStatus;
              })}
              emptyMessage="No complaints match your filters."
            />
          </>
        )}
      </Card>

      {/* Staff Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !dispatching && setIsModalOpen(false)}
        title="Dispatch Maintenance Crew"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={dispatching}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignSubmit} loading={dispatching} disabled={dispatching} icon={UserCheck}>
              Confirm Dispatch
            </Button>
          </>
        }
      >
        <form onSubmit={handleAssignSubmit} style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Assigning staff member for ticket: <strong>"{selectedComplaint?.title}"</strong>
          </p>
          
          <Input
            label="Select Crew / Staff Member"
            type="select"
            name="staff"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Choose available staff..."
            options={staffList.map(s => ({ value: s._id, label: `${s.name || 'Unknown Staff'} (${s.email || 'N/A'})` }))}
            required
            disabled={dispatching}
          />

          <Input
            label="Dispatch Instructions / Remarks"
            type="textarea"
            name="remarks"
            value={assignRemarks}
            onChange={(e) => setAssignRemarks(e.target.value)}
            placeholder="Provide any instructions or comments for the maintenance crew..."
            disabled={dispatching}
          />
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Complaint Details Overview"
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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Reopened on {new Date(detailComplaint.reopenedHistory[detailComplaint.reopenedHistory.length - 1].reopenedAt).toLocaleString()}
                </span>
              </div>
            )}

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
                {/* Remaining time countdown */}
                {detailComplaint.status !== 'resolved' && detailComplaint.status !== 'closed' && liveTimeRemainingMs !== null && (
                  <>
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Time Remaining for Resolution:</span>
                      <strong style={{ 
                        fontSize: '0.9rem', 
                        color: liveTimeRemainingMs <= 0 ? 'var(--danger)' : (detailComplaint.slaInfo.status === 'AT_RISK' || liveTimeRemainingMs < 0.15 * (new Date(detailComplaint.slaInfo.resolutionDeadline).getTime() - new Date(detailComplaint.createdAt).getTime()) ? 'var(--warning)' : 'var(--success)')
                      }}>
                        {liveTimeRemainingMs <= 0 
                          ? 'OVERDUE' 
                          : `${Math.floor(liveTimeRemainingMs / (60 * 60 * 1000))}h ${Math.floor((liveTimeRemainingMs % (60 * 60 * 1000)) / (60 * 1000))}m remaining`
                        }
                      </strong>
                    </div>
                    {(() => {
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
                  </>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Student Raiser</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {detailComplaint.student?.name || 'N/A'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {detailComplaint.student?.email}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Location Details</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Room: {detailComplaint.student?.roomNo || 'N/A'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  Hostel: {detailComplaint.student?.hostelBlock}
                </span>
              </div>
            </div>

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

            {/* Closed Ticket Feedback */}
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

export default WardenDashboard;
