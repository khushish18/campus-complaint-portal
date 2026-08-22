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
  PlusCircle, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  BellRing,
  Sparkles,
  Eye,
  User,
  Star
} from 'lucide-react';

const NOTICES = [
  { id: 1, title: 'Power Shut Down Notice', date: 'Aug 22, 10 AM - 1 PM', body: 'Routine generator maintenance will affect Tagore Hall power grids.' },
  { id: 2, title: 'Wi-Fi Upgrade Phase-II', date: 'Aug 24, 02 AM - 05 AM', body: 'Tagore and Radhakrishnan Hostels core internet router replacement.' },
];

const StudentDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [raising, setRaising] = useState(false);

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await api.get('/complaints');
      setComplaints(response.complaints || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Stats calculators
  const totalTickets = complaints.length;
  const pendingTickets = complaints.filter(c => c.status === 'pending' || c.status === 'assigned' || c.status === 'in-progress').length;
  const resolvedTickets = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  const handleRaiseSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formTitle || !formDesc) {
      return toast.error('Please enter both title and description.');
    }

    setRaising(true);
    try {
      const response = await api.post('/complaints', {
        title: formTitle,
        description: formDesc
      });
      if (response.success) {
        toast.success(`AI Classifier: Ticket auto-assigned to [${response.complaint.category.toUpperCase()}] with [${response.complaint.urgency.toUpperCase()}] urgency!`);
        setFormTitle('');
        setFormDesc('');
        setIsModalOpen(false);
        await fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit complaint.');
    } finally {
      setRaising(false);
    }
  };

  const handleOpenDetailModal = async (complaintId) => {
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    setSelectedComplaint(null);
    try {
      const response = await api.get(`/complaints/${complaintId}`);
      setSelectedComplaint(response.complaint);
    } catch (err) {
      toast.error(err.message || 'Failed to load complaint details.');
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackRating) {
      return toast.error('Please select a rating.');
    }
    setSubmittingFeedback(true);
    try {
      const response = await api.patch(`/complaints/${selectedComplaint._id}/feedback`, {
        rating: Number(feedbackRating),
        comment: feedbackComment
      });
      if (response.success) {
        toast.success('Complaint closed and feedback recorded successfully!');
        setFeedbackComment('');
        setFeedbackRating(5);
        setIsDetailModalOpen(false);
        await fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const columns = [
    {
      header: 'Ticket Title',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {row._id}</span>
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
      header: 'Assigned To',
      key: 'assignedTo',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: row.assignedTo ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {row.assignedTo ? row.assignedTo.name : 'Unassigned'}
        </span>
      )
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

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{
        background: 'linear-gradient(135deg, var(--bg-sidebar-active) 0%, #111827 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Welcome Back, {user?.name}!</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Hostel: <strong style={{ color: 'var(--primary)' }}>{user?.hostelBlock || 'N/A'}</strong> | Room: <strong style={{ color: 'var(--primary)' }}>{user?.roomNo || 'N/A'}</strong>
          </p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={() => setIsModalOpen(true)}>
          Raise New Complaint
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <Card>
          <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Raised</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{totalTickets}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active / Pending</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{pendingTickets}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved Tickets</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>{resolvedTickets}</h4>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Left = Table, Right = Notices */}
      <div className="main-content-layout">
        
        {/* Table list */}
        <Card title="Recent Complaints History">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading complaints...</div>
          ) : (
            <Table 
              columns={columns} 
              data={complaints} 
              emptyMessage="You have not submitted any complaints yet."
            />
          )}
        </Card>

        {/* Notices Board */}
        <Card title="Announcements" extra={<BellRing size={18} style={{ color: 'var(--primary)' }} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            {NOTICES.map((n) => (
              <div key={n.id} style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--primary)'
              }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{n.title}</h5>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>{n.date}</span>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal Form for Raising Complaint */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !raising && setIsModalOpen(false)}
        title="Raise Maintenance Ticket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={raising}>Cancel</Button>
            <Button variant="primary" onClick={handleRaiseSubmit} loading={raising} disabled={raising}>
              Analyze & Submit
            </Button>
          </>
        }
      >
        <form onSubmit={handleRaiseSubmit}>
          <Input
            label="Complaint Summary / Title"
            name="title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Bathroom sink water faucet leaking"
            required
            disabled={raising}
          />
          <Input
            label="Detailed Description"
            type="textarea"
            name="description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Please detail where the issue is located, what happened, and any instructions for repair crews."
            required
            disabled={raising}
          />
          <div style={{ 
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--primary)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Sparkles size={16} />
            <span>AI will automatically analyze your issue to determine Category & Urgency.</span>
          </div>
        </form>
      </Modal>

      {/* Complaint Detail & Feedback Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Complaint Details"
      >
        {loadingDetail && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading details...</div>
        )}

        {!loadingDetail && selectedComplaint && (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {selectedComplaint.title}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket ID: {selectedComplaint._id}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Badge status={selectedComplaint.status}>{selectedComplaint.status}</Badge>
              <Badge status={selectedComplaint.urgency}>{selectedComplaint.urgency} Priority</Badge>
              <Badge status="other">{selectedComplaint.category}</Badge>
            </div>

            <div>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</h5>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4, backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                {selectedComplaint.description}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Assigned staff member</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {selectedComplaint.assignedTo ? selectedComplaint.assignedTo.name : 'Not assigned yet'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date created</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {/* Timeline history */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Update History Log</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedComplaint.history && selectedComplaint.history.map((h, i) => (
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

            {/* Student Feedback Form for Resolution closure */}
            {selectedComplaint.status === 'resolved' && (
              <form onSubmit={handleFeedbackSubmit} style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Star size={18} style={{ color: 'var(--warning)' }} />
                  Close Complaint & Submit Feedback
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Overall Rating (1 - 5 Stars)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: star <= feedbackRating ? 'var(--warning)' : 'var(--text-muted)',
                            padding: 0
                          }}
                        >
                          <Star size={24} fill={star <= feedbackRating ? 'var(--warning)' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Remarks / Feedback Comments"
                    type="textarea"
                    name="feedbackComment"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Let us know if you are satisfied with the service and resolution..."
                    disabled={submittingFeedback}
                  />

                  <Button
                    variant="primary"
                    type="submit"
                    loading={submittingFeedback}
                    disabled={submittingFeedback}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    Resolve & Close Ticket
                  </Button>
                </div>
              </form>
            )}

            {/* Closed Ticket Feedback Display */}
            {selectedComplaint.status === 'closed' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', backgroundColor: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  Resolved & Closed
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      color="var(--warning)"
                      fill={star <= selectedComplaint.feedbackRating ? 'var(--warning)' : 'none'}
                    />
                  ))}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                    Rating: {selectedComplaint.feedbackRating}/5
                  </span>
                </div>
                {selectedComplaint.feedbackComment && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                    "{selectedComplaint.feedbackComment}"
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

export default StudentDashboard;
