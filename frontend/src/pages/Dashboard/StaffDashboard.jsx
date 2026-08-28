import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card/Card';
import KpiCard from '../../components/common/Card/KpiCard';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import api from '../../services/api';
import CommentsSection from '../../components/common/Comments/CommentsSection';
import { 
  Wrench,
  Activity,
  CheckCircle,
  Play,
  Check,
  Eye,
  MessageSquare
} from 'lucide-react';

const StaffDashboard = () => {
  const { user, socket } = useAuth();
  const toast = useToast();
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Status Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionJobId, setActionJobId] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Detail Modal State
  const [detailComplaint, setDetailComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [liveTimeRemainingMs, setLiveTimeRemainingMs] = useState(null);

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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/complaints');
      let sortedJobs = response.complaints || [];
      sortedJobs.sort((a, b) => {
        const aActive = ['assigned', 'in-progress'].includes(a.status);
        const bActive = ['assigned', 'in-progress'].includes(b.status);

        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        if (aActive && bActive) {
          const aTime = a.slaInfo?.timeRemainingMs ?? Infinity;
          const bTime = b.slaInfo?.timeRemainingMs ?? Infinity;
          return aTime - bTime;
        }

        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      setJobs(sortedJobs);
    } catch (err) {
      setError(err.message || 'Failed to fetch assigned jobs.');
      toast.error(err.message || 'Failed to fetch assigned jobs.');
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

  useEffect(() => {
    fetchJobs();

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
      fetchJobs();
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
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'assigned').length;
  const resolvedJobs = jobs.filter(j => j.status === 'resolved' || j.status === 'closed').length;

  const handleOpenActionModal = (jobId, status) => {
    setActionJobId(jobId);
    setActionStatus(status);
    setActionRemarks('');
    setIsActionModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const response = await api.patch(`/complaints/${actionJobId}/status`, {
        status: actionStatus,
        remarks: actionRemarks
      });
      if (response.success) {
        toast.success(`Job status updated to [${actionStatus.toUpperCase()}] successfully!`);
        setIsActionModalOpen(false);
        await fetchJobs();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update job status.');
    } finally {
      setSubmittingAction(false);
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
      header: 'Job Title',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Location: {row.student?.hostelBlock || 'N/A'} (Room {row.student?.roomNo || 'N/A'})
          </span>
        </div>
      )
    },
    {
      header: 'Student Contact',
      key: 'student',
      render: (row) => <span style={{ fontSize: '0.9rem' }}>{row.student?.name || 'N/A'}</span>
    },
    {
      header: 'Urgency',
      key: 'urgency',
      render: (row) => <Badge status={row.urgency}>{row.urgency}</Badge>
    },
    {
      header: 'SLA Deadline',
      key: 'slaDeadline',
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
            : `${hoursRemaining}h remaining`;

        return (
          <div>
            <Badge status={badgeType}>{sla.status}</Badge>
            {subtext && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{subtext}</span>}
          </div>
        );
      }
    },
    {
      header: 'Current Status',
      key: 'status',
      render: (row) => <Badge status={row.status}>{row.status}</Badge>
    },
    {
      header: 'Actions',
      key: 'action',
      render: (row) => {
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" icon={Eye} onClick={() => handleOpenDetailModal(row._id)}>
              View
            </Button>
            
            {row.status === 'assigned' && (
              <Button
                variant="outline"
                size="sm"
                icon={Play}
                onClick={() => handleOpenActionModal(row._id, 'in-progress')}
              >
                Start Work
              </Button>
            )}

            {row.status === 'in-progress' && (
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                onClick={() => handleOpenActionModal(row._id, 'resolved')}
              >
                Resolve Job
              </Button>
            )}
          </div>
        );
      }
    }
  ];

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
            <Wrench size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>My Work Dashboard</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Stay on top of your assigned work orders | Dispatch Operator: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <KpiCard
          icon={Wrench}
          title="Assigned Jobs"
          value={totalJobs}
          description="Allocated work orders"
          color="var(--primary)"
          colorLight="var(--primary-light)"
        />
        <KpiCard
          icon={Activity}
          title="Active Work Orders"
          value={activeJobs}
          description="Remediation in progress"
          color="var(--warning)"
          colorLight="var(--warning-light)"
        />
        <KpiCard
          icon={CheckCircle}
          title="Completed Jobs"
          value={resolvedJobs}
          description="Closed/solved jobs history"
          color="var(--success)"
          colorLight="var(--success-light)"
        />
      </div>

      {/* Kanban Work Management Board */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {['NEW', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'].map((columnKey) => {
            let colTitle = columnKey.replace('_', ' ');
            let colJobs = [];
            if (columnKey === 'NEW') colJobs = jobs.filter(j => j.status === 'assigned');
            else if (columnKey === 'IN_PROGRESS') colJobs = jobs.filter(j => j.status === 'in-progress');
            else if (columnKey === 'ON_HOLD') colJobs = jobs.filter(j => j.status === 'pending');
            else if (columnKey === 'COMPLETED') colJobs = jobs.filter(j => ['resolved', 'closed'].includes(j.status));

            const colColor = columnKey === 'NEW' ? 'var(--info)' : columnKey === 'IN_PROGRESS' ? 'var(--primary)' : columnKey === 'ON_HOLD' ? 'var(--warning)' : 'var(--success)';

            return (
              <div key={columnKey} style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${colColor}`, paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{colTitle}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>{colJobs.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
                  {colJobs.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      No tasks in this column.
                    </div>
                  ) : (
                    colJobs.map((job) => (
                      <div
                        key={job._id}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          border: '1px solid var(--border-color)',
                          borderTop: `4px solid ${job.urgency === 'high' ? 'var(--danger)' : job.urgency === 'medium' ? 'var(--warning)' : 'var(--success)'}`,
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => handleOpenDetailModal(job._id)}>
                            {job.title}
                          </strong>
                          <Badge status={job.urgency}>{job.urgency}</Badge>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Location: {job.student?.hostelBlock} · Room {job.student?.roomNo}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Student: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{job.student?.name || 'N/A'}</span>
                        </div>

                        {job.slaInfo && job.status !== 'resolved' && job.status !== 'closed' && (
                          <div style={{ fontSize: '0.75rem', color: job.slaInfo.status === 'OVERDUE' ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            SLA: {job.slaInfo.status === 'OVERDUE' ? 'Overdue' : `${Math.floor(job.slaInfo.timeRemainingMs / (60 * 60 * 1000))}h remaining`}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                          <Button variant="secondary" size="sm" onClick={() => handleOpenDetailModal(job._id)}>
                            View
                          </Button>
                          {job.status === 'assigned' && (
                            <Button variant="primary" size="sm" onClick={() => handleOpenActionModal(job._id, 'in-progress')}>
                              Start Work
                            </Button>
                          )}
                          {job.status === 'in-progress' && (
                            <Button variant="success" size="sm" onClick={() => handleOpenActionModal(job._id, 'resolved')} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: '#ffffff' }}>
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jobs Table */}
      <Card title="Active Work Orders Allocation">
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
            <Button variant="outline" size="sm" onClick={fetchJobs}>Retry Connection</Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={jobs}
            emptyMessage="You have no assigned jobs in the queue."
          />
        )}
      </Card>

      {/* Action remark Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => !submittingAction && setIsActionModalOpen(false)}
        title={actionStatus === 'in-progress' ? 'Start Work Order' : 'Resolve Work Order'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsActionModalOpen(false)} disabled={submittingAction}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleUpdateStatusSubmit} 
              loading={submittingAction} 
              disabled={submittingAction}
              style={actionStatus === 'resolved' ? { backgroundColor: 'var(--success)', borderColor: 'var(--success)' } : {}}
            >
              Confirm Update
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateStatusSubmit} style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Updating ticket to status: <strong style={{ color: actionStatus === 'resolved' ? 'var(--success)' : 'var(--primary)' }}>{actionStatus.toUpperCase()}</strong>
          </p>
          
          <Input
            label="Remarks / Comments"
            type="textarea"
            name="remarks"
            value={actionRemarks}
            onChange={(e) => setActionRemarks(e.target.value)}
            placeholder="Add comments on status change (e.g. Parts acquired, repairs done...)"
            required={actionStatus === 'resolved'} // Required for resolution
            disabled={submittingAction}
          />
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Job Order Details"
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
                  Room {detailComplaint.student?.roomNo} | {detailComplaint.student?.hostelBlock}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date created</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {new Date(detailComplaint.createdAt).toLocaleDateString()}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {new Date(detailComplaint.createdAt).toLocaleTimeString()}
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

            {detailComplaint.status === 'closed' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', backgroundColor: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)', marginBottom: '0.25rem' }}>
                  Student Feedback rating
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{ color: star <= detailComplaint.feedbackRating ? 'var(--warning)' : 'var(--text-muted)' }}>★</span>
                  ))}
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

export default StaffDashboard;
