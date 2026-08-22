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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/complaints');
      setJobs(response.complaints || []);
    } catch (err) {
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
      
      {/* Banner */}
      <div className="welcome-banner" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #111827 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        flexWrap: 'wrap',
        gap: '1rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%' }}>
            <Wrench size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Staff Task Sheet</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Logged in as: <strong style={{ color: 'var(--primary)' }}>{user?.name}</strong></p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <Wrench size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Jobs</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{totalJobs}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <Activity size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Work Orders</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{activeJobs}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed Jobs</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{resolvedJobs}</h4>
            </div>
          </div>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card title="Active Work Orders Allocation">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading task sheet...</div>
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
            </div>

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
