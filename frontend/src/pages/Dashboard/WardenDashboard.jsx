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
  ClipboardList, 
  Clock, 
  UserCheck, 
  UserX,
  Send,
  Building,
  Eye
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
      const formatted = (response.staff || []).map(s => ({
        value: s._id,
        label: `${s.name} (${s.email})`
      }));
      setStaffList(formatted);
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

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Banner */}
      <div className="welcome-banner" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
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
            <Building size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Warden Dashboard</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Hostel Wing Supervision: <strong style={{ color: 'var(--primary)' }}>{user?.hostelBlock || 'N/A'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total In Hostel</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{totalHostelComplaints}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger)' }}>
              <UserX size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unassigned Tickets</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{unassignedCount}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--info-light)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dispatched Active</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{inProgressCount}</h4>
            </div>
          </div>
        </Card>
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
          <Table
            columns={columns}
            data={complaints}
            emptyMessage="No complaints have been reported in your hostel wing."
          />
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
            options={staffList}
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
            </div>

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
