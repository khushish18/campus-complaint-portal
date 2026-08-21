import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import { 
  Wrench,
  Activity,
  CheckCircle,
  Play,
  Check
} from 'lucide-react';

const INITIAL_JOBS = [
  {
    _id: 'c-001',
    title: 'Water Leakage in Bathroom Tap',
    student: { name: 'Khushi Sharma', hostel: 'Tagore Hall', roomNumber: 'B-204' },
    category: 'plumbing',
    urgency: 'high',
    status: 'assigned',
    createdAt: '2026-08-20T10:30:00Z',
  },
  {
    _id: 'c-003',
    title: 'WiFi Connection Dropping Constantly',
    student: { name: 'Preeti Negi', hostel: 'Tagore Hall', roomNumber: 'A-108' },
    category: 'internet',
    urgency: 'medium',
    status: 'in-progress',
    createdAt: '2026-08-21T09:00:00Z',
  }
];

const StaffDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [updatingId, setUpdatingId] = useState(null);

  // Statistics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'assigned').length;
  const resolvedJobs = jobs.filter(j => j.status === 'resolved').length;

  const handleUpdateStatus = async (jobId, newStatus) => {
    setUpdatingId(jobId);
    await new Promise((resolve) => setTimeout(resolve, 800)); // Network delay

    setJobs(prev => prev.map(j => {
      if (j._id === jobId) {
        return { ...j, status: newStatus };
      }
      return j;
    }));

    toast.success(`Job status updated to [${newStatus.toUpperCase()}] successfully!`);
    setUpdatingId(null);
  };

  const columns = [
    {
      header: 'Job Title',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: {row.student.hostel} (Room {row.student.roomNumber})</span>
        </div>
      )
    },
    {
      header: 'Student Contact',
      key: 'student',
      render: (row) => <span style={{ fontSize: '0.9rem' }}>{row.student.name}</span>
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
      header: 'Lifecycle Actions',
      key: 'action',
      render: (row) => {
        const isLoading = updatingId === row._id;

        if (row.status === 'assigned') {
          return (
            <Button
              variant="outline"
              size="sm"
              icon={Play}
              loading={isLoading}
              onClick={() => handleUpdateStatus(row._id, 'in-progress')}
            >
              Start Work
            </Button>
          );
        }

        if (row.status === 'in-progress') {
          return (
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              loading={isLoading}
              style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => handleUpdateStatus(row._id, 'resolved')}
            >
              Resolve Job
            </Button>
          );
        }

        return <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>Job Resolved</span>;
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
        <Table
          columns={columns}
          data={jobs}
          emptyMessage="You have no assigned jobs in the queue."
        />
      </Card>

    </div>
  );
};

export default StaffDashboard;
