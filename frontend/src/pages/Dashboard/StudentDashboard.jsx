import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CommentsSection from '../../components/common/Comments/CommentsSection';
import Card from '../../components/common/Card/Card';
import KpiCard from '../../components/common/Card/KpiCard';
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
  Star,
  Droplet,
  Zap,
  Wifi,
  FileText,
  MessageSquare
} from 'lucide-react';

const NOTICES = [
  { id: 1, title: 'Power Shut Down Notice', date: 'Aug 22, 10 AM - 1 PM', body: 'Routine generator maintenance will affect Tagore Hall power grids.' },
  { id: 2, title: 'Wi-Fi Upgrade Phase-II', date: 'Aug 24, 02 AM - 05 AM', body: 'Tagore and Radhakrishnan Hostels core internet router replacement.' },
];

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'plumbing':
      return <Droplet size={18} />;
    case 'electrical':
      return <Zap size={18} />;
    case 'housekeeping':
      return <Sparkles size={18} />;
    case 'internet':
      return <Wifi size={18} />;
    default:
      return <FileText size={18} />;
  }
};

const StudentDashboard = () => {
  const { user, socket } = useAuth();
  const toast = useToast();
  
  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };

  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [raising, setRaising] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [liveTimeRemainingMs, setLiveTimeRemainingMs] = useState(null);

  useEffect(() => {
    if (!isDetailModalOpen || !selectedComplaint || !selectedComplaint.slaInfo) {
      setLiveTimeRemainingMs(null);
      return;
    }

    const isActive = selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'closed';
    if (!isActive) {
      setLiveTimeRemainingMs(null);
      return;
    }

    const deadline = new Date(selectedComplaint.slaInfo.resolutionDeadline).getTime();
    
    const updateTimer = () => {
      const remaining = deadline - Date.now();
      setLiveTimeRemainingMs(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isDetailModalOpen, selectedComplaint]);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState('close');
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      return toast.error('Please state the reason for re-opening.');
    }

    setSubmittingReopen(true);
    try {
      const response = await api.patch(`/complaints/${selectedComplaint._id}/reopen`, {
        reason: reopenReason.trim()
      });
      if (response.success) {
        toast.success('Complaint re-opened successfully and returned to queue!');
        setReopenReason('');
        setFeedbackTab('close');
        setIsDetailModalOpen(false);
        await fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to re-open complaint.');
    } finally {
      setSubmittingReopen(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit.');
      toast.error('File size exceeds the 5MB limit.');
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = /jpeg|jpg|png|webp|pdf/;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.test(ext) && !allowedExtensions.test(file.type)) {
      setUploadError('Unsupported file format. Only JPEG, PNG, WEBP, and PDF files are allowed.');
      toast.error('Unsupported file format. Only JPEG, PNG, WEBP, and PDF files are allowed.');
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleOpenRaiseModal = () => {
    setFormTitle('');
    setFormDesc('');
    setSelectedFile(null);
    setUploadError(null);
    setIsModalOpen(true);
  };

  const closeRaiseModal = () => {
    setFormTitle('');
    setFormDesc('');
    setSelectedFile(null);
    setUploadError(null);
    setIsModalOpen(false);
  };

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
      setSelectedComplaint(response.complaint);
    } catch (err) {
      console.error('Failed to silently refresh details:', err.message);
    }
  };

  useEffect(() => {
    fetchComplaints();

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
      if (selectedComplaint && selectedComplaint._id === data.complaintId) {
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
  }, [socket, selectedComplaint]);

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
      let attachmentsList = [];
      if (selectedFile) {
        // Upload the file first
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
          const uploadRes = await api.post('/complaints/upload', formData);
          if (uploadRes.success) {
            attachmentsList.push({
              url: uploadRes.url,
              filename: uploadRes.filename,
              contentType: uploadRes.contentType,
              sizeBytes: uploadRes.sizeBytes
            });
          }
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
          const isCloudinaryDisabled = uploadErr.status === 503;
          if (isCloudinaryDisabled) {
            toast.warning('Evidence upload is disabled on the server. Creating complaint without attachment.');
          } else {
            toast.error('File upload failed: ' + uploadErr.message + '. Creating complaint without attachment.');
          }
        }
      }

      const response = await api.post('/complaints', {
        title: formTitle,
        description: formDesc,
        attachments: attachmentsList
      });

      if (response.success) {
        const providerName = response.complaint.aiAnalysis?.provider || 'local-heuristic';
        toast.success(`AI Classifier [${providerName.toUpperCase()}]: Auto-assigned to [${response.complaint.category.toUpperCase()}] with [${response.complaint.urgency.toUpperCase()}] urgency!`);
        closeRaiseModal();
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
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.04) 0%, var(--bg-card) 100%)',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid var(--primary)',
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', maxWidth: '70%' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome back, {user?.name}!
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Resident at <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.hostelBlock || 'N/A'}</span>, Room <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.roomNo || 'N/A'}</span>
          </p>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
            Report facility concerns or utility breakdowns. Our AI automatically tags and assigns dispatch crews to resolve your tickets within SLA deadlines.
          </p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={handleOpenRaiseModal} style={{ boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)' }}>
          Raise New Complaint
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <KpiCard
          icon={ClipboardList}
          title="Total Raised"
          value={totalTickets}
          description="Historical submission log"
          color="var(--primary)"
          colorLight="var(--primary-light)"
        />
        <KpiCard
          icon={Clock}
          title="Active / Pending"
          value={pendingTickets}
          description="Awaiting resolution progress"
          color="var(--warning)"
          colorLight="var(--warning-light)"
        />
        <KpiCard
          icon={CheckCircle}
          title="Resolved Tickets"
          value={resolvedTickets}
          description="Remediated issues archive"
          color="var(--success)"
          colorLight="var(--success-light)"
        />
      </div>

      {/* Main Grid: Left = Table, Right = Notices */}
      <div className="main-content-layout">
        
        {/* Table list */}
        <Card title="Recent Complaints History">
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
          ) : complaints.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>You have not submitted any complaints yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {complaints.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleOpenDetailModal(item._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: 'var(--shadow-sm)',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      padding: '0.6rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)'
                    }}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                          {item.title}
                        </span>
                        <Badge status={item.urgency}>{item.urgency}</Badge>
                        <Badge status={item.status}>{item.status}</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>ID: <code style={{ fontSize: '0.75rem', padding: '1px 4px' }}>{item._id.substring(item._id.length - 8)}</code></span>
                        <span>•</span>
                        <span>Raised: {formatDate(item.createdAt)}</span>
                        <span>•</span>
                        <span>Assigned to: <strong style={{ color: 'var(--text-secondary)' }}>{item.assignedTo ? item.assignedTo.name : 'Awaiting Dispatch'}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {item.slaInfo && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: item.slaInfo.status === 'OVERDUE' || item.slaInfo.status === 'COMPLETED_LATE' 
                            ? 'var(--danger)' 
                            : item.slaInfo.status === 'AT_RISK' 
                              ? 'var(--warning)' 
                              : 'var(--success)'
                        }}>
                          SLA: {item.slaInfo.status ? item.slaInfo.status.replace('_', ' ') : ''}
                        </span>
                        {item.status !== 'resolved' && item.status !== 'closed' && item.slaInfo.timeRemainingMs !== undefined && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            {item.slaInfo.timeRemainingMs <= 0 ? 'Overdue limit' : `${Math.floor(item.slaInfo.timeRemainingMs / (60 * 60 * 1000))}h left`}
                          </span>
                        )}
                      </div>
                    )}
                    <Button variant="outline" size="sm" icon={Eye} onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetailModal(item._id);
                    }}>
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notices Board */}
        <Card title="Announcements" extra={<BellRing size={18} style={{ color: 'var(--text-secondary)' }} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            {NOTICES.map((n) => (
              <div key={n.id} style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--text-secondary)'
              }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{n.title}</h5>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>{n.date}</span>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal Form for Raising Complaint */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !raising && closeRaiseModal()}
        title="Raise Maintenance Ticket"
        footer={
          <>
            <Button variant="secondary" onClick={closeRaiseModal} disabled={raising}>Cancel</Button>
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

          {/* Evidence Upload Section */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Attach Evidence / Image / PDF (Optional, max 5MB)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={raising}
                style={{ fontSize: '0.85rem' }}
              />
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={raising}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  Remove File
                </button>
              )}
            </div>
            {selectedFile && (
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
            {uploadError && (
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                {uploadError}
              </span>
            )}
          </div>

          <div style={{ 
            marginTop: '1.25rem',
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
              {selectedComplaint.status !== 'closed' && selectedComplaint.status !== 'resolved' && selectedComplaint.slaInfo && (
                <Badge status={selectedComplaint.slaInfo.status === 'OVERDUE' || selectedComplaint.slaInfo.status === 'AT_RISK' ? 'medium' : 'low'}>
                  {selectedComplaint.slaInfo.status === 'OVERDUE' || selectedComplaint.slaInfo.status === 'AT_RISK' ? 'Progress: Prioritized' : 'Progress: On Track'}
                </Badge>
              )}
              {selectedComplaint.reopenedCount > 0 && (
                <Badge status="high">Re-opened ({selectedComplaint.reopenedCount})</Badge>
              )}
            </div>

            {selectedComplaint.slaInfo && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary)', textAlign: 'left', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>SLA Deadlines</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>First-Response Limit:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {formatDateTime(selectedComplaint.slaInfo.responseDeadline)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Resolution Limit:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {formatDateTime(selectedComplaint.slaInfo.resolutionDeadline)}
                    </strong>
                  </div>
                </div>
                {/* Remaining time countdown */}
                {selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'closed' && liveTimeRemainingMs !== null && (
                  <>
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Time Remaining for Resolution:</span>
                      <strong style={{ 
                        fontSize: '0.9rem', 
                        color: liveTimeRemainingMs <= 0 ? 'var(--danger)' : (selectedComplaint.slaInfo.status === 'AT_RISK' || liveTimeRemainingMs < 0.15 * (new Date(selectedComplaint.slaInfo.resolutionDeadline).getTime() - new Date(selectedComplaint.createdAt).getTime()) ? 'var(--warning)' : 'var(--success)')
                      }}>
                        {liveTimeRemainingMs <= 0 
                          ? 'OVERDUE' 
                          : `${Math.floor(liveTimeRemainingMs / (60 * 60 * 1000))}h ${Math.floor((liveTimeRemainingMs % (60 * 60 * 1000)) / (60 * 1000))}m remaining`
                        }
                      </strong>
                    </div>
                    {(() => {
                      const createdTime = new Date(selectedComplaint.assignedAt || selectedComplaint.createdAt).getTime();
                      const deadlineTime = new Date(selectedComplaint.slaInfo.resolutionDeadline).getTime();
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

            <div>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</h5>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4, backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                {selectedComplaint.description}
              </p>
            </div>

            {/* Similar Complaint Alert */}
            {selectedComplaint.similarComplaints && selectedComplaint.similarComplaints.length > 0 && (
              <div style={{
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.25rem',
                color: 'var(--warning-text)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.825rem'
              }}>
                <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  ⚠️ Similar Issue Reported Nearby ({selectedComplaint.similarComplaints[0].similarityScore}% Match)
                </span>
                <span>
                  Another resident in your hostel block recently raised a similar concern. Our dispatch teams are coordinating maintenance efforts to resolve this efficiently.
                </span>
              </div>
            )}

            {/* AI Copilot Operations Analysis */}
            {selectedComplaint.aiAnalysis && (
              <div style={{
                backgroundColor: 'var(--primary-light)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <h5 style={{ margin: 0, fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} />
                  AI Copilot Operations Analysis
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {selectedComplaint.aiAnalysis.summary && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>1-Sentence Summary:</strong>
                      <span style={{ marginLeft: '0.35rem' }}>{selectedComplaint.aiAnalysis.summary}</span>
                    </div>
                  )}
                  {selectedComplaint.aiAnalysis.probableRootCause && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Probable Root Cause:</strong>
                      <span style={{ marginLeft: '0.35rem' }}>{selectedComplaint.aiAnalysis.probableRootCause}</span>
                    </div>
                  )}
                  {selectedComplaint.aiAnalysis.recommendedFirstAction && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Recommended First Action:</strong>
                      <span style={{ marginLeft: '0.35rem' }}>{selectedComplaint.aiAnalysis.recommendedFirstAction}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Evidence Attachments
                </h5>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {selectedComplaint.attachments.map((file, idx) => {
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
                  {formatDate(selectedComplaint.createdAt)}
                </strong>
              </div>
            </div>

            {/* Comments Thread Section */}
            <CommentsSection
              complaintId={selectedComplaint._id}
              initialComments={selectedComplaint.comments}
            />

            {/* Timeline history */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Update History Log</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedComplaint.history && selectedComplaint.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ minWidth: '80px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {formatTime(h.timestamp)}
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

            {/* Student Feedback or Reject Re-open Form */}
            {selectedComplaint.status === 'resolved' && (
              <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Button 
                    variant={feedbackTab === 'close' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => setFeedbackTab('close')}
                  >
                    Accept & Close
                  </Button>
                  <Button 
                    variant={feedbackTab === 'reopen' ? 'primary' : 'outline'} 
                    size="sm" 
                    style={feedbackTab === 'reopen' ? { backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' } : {}}
                    onClick={() => setFeedbackTab('reopen')}
                  >
                    Reject & Re-open
                  </Button>
                </div>

                {feedbackTab === 'close' ? (
                  <form onSubmit={handleFeedbackSubmit}>
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
                ) : (
                  <form onSubmit={handleReopenSubmit}>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      State Reopening Reason
                    </h4>
                    <Input
                      label="Why is the issue still unresolved? (Required)"
                      type="textarea"
                      name="reopenReason"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Please specify what work is incomplete or what parts are still faulty..."
                      required
                      disabled={submittingReopen}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      loading={submittingReopen}
                      disabled={submittingReopen || !reopenReason.trim()}
                      style={{ width: '100%', marginTop: '0.5rem', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Confirm Re-open Complaint
                    </Button>
                  </form>
                )}
              </div>
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
