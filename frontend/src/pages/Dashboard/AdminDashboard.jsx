import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import Modal from '../../components/common/Modal/Modal';
import Button from '../../components/common/Button/Button';
import api from '../../services/api';
import { 
  Users, 
  ShieldCheck, 
  Terminal,
  Activity,
  FileText,
  Eye
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [detailComplaint, setDetailComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to fetch statistics:', err.message);
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await api.get('/complaints');
      setComplaints(response.complaints || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchComplaints()]);
      setLoading(false);
    };
    loadData();
  }, []);

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

  // Calculate sum of complaints
  const totalComplaintsCount = stats
    ? Object.values(stats.complaints).reduce((a, b) => a + b, 0)
    : complaints.length;

  const USER_BREAKDOWNS = stats ? [
    { role: 'Student Users', count: stats.users.student, status: 'Active' },
    { role: 'Hostel Wardens', count: stats.users.warden, status: 'Active' },
    { role: 'Maintenance Staff', count: stats.users.staff, status: 'Active' },
    { role: 'Platform Admins', count: 1, status: 'Active' }
  ] : [
    { role: 'Student Users', count: 0, status: 'Active' },
    { role: 'Hostel Wardens', count: 0, status: 'Active' },
    { role: 'Maintenance Staff', count: 0, status: 'Active' },
    { role: 'Platform Admins', count: 1, status: 'Active' }
  ];

  const columns = [
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

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Banner */}
      <div className="welcome-banner" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #030712 100%)',
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
            <ShieldCheck size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Operations Console</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>System Metrics & Platform Configuration</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>
                {stats ? stats.users.total : '...'}
              </h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <FileText size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Complaints</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>
                {totalComplaintsCount}
              </h4>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--info-light)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
              <Activity size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Dispatch Rate</span>
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>98.6%</h4>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid split layout */}
      <div className="main-content-layout">
        
        {/* Live Complaint Monitoring Stream */}
        <Card title="Live Complaint System Event Stream" extra={<Terminal size={18} style={{ color: 'var(--text-muted)' }} />}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading system feed...</div>
          ) : (
            <Table 
              columns={columns} 
              data={complaints} 
              emptyMessage="No complaints recorded in the system."
            />
          )}
        </Card>

        {/* User Breakdown statistics card */}
        <Card title="User Database Directory">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            {USER_BREAKDOWNS.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.role}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success)' }}>● {item.status}</span>
                </div>
                <h5 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{item.count}</h5>
              </div>
            ))}
          </div>
        </Card>

      </div>

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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Assigned Staff</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {detailComplaint.assignedTo ? detailComplaint.assignedTo.name : 'Unassigned'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {detailComplaint.assignedTo?.email || 'No email'}
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
