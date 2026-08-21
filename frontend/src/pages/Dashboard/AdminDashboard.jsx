import React from 'react';
import Card from '../../components/common/Card/Card';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import { 
  Users, 
  ShieldCheck, 
  Terminal,
  Activity,
  FileText
} from 'lucide-react';

const AUDIT_LOGS = [
  { id: 1, action: 'User Session login', details: 'Warden warden@campus.edu successfully logged in.', time: '10 mins ago', type: 'info' },
  { id: 2, action: 'AI Auto-Classification', details: 'Complaint ID c-004 tagged as Category [PLUMBING] and urgency [HIGH].', time: '23 mins ago', type: 'success' },
  { id: 3, action: 'Staff Assigned Notification', details: 'Ticket c-002 assigned by Warden to Ramesh Kumar. Dispatch email queued.', time: '1 hour ago', type: 'success' },
  { id: 4, action: 'Database Migration', details: 'Connected pool verified successfully.', time: '3 hours ago', type: 'info' },
  { id: 5, action: 'Token Exception', details: 'Blocked unauthorized GET fetch from address 192.168.1.42.', time: '4 hours ago', type: 'danger' }
];

const USER_BREAKDOWNS = [
  { role: 'Student Users', count: 184, status: 'Active' },
  { role: 'Hostel Wardens', count: 8, status: 'Active' },
  { role: 'Maintenance Staff', count: 12, status: 'Active' },
  { role: 'Platform Admins', count: 2, status: 'Active' }
];

const AdminDashboard = () => {
  const columns = [
    {
      header: 'System Action / Event',
      key: 'action',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>{row.action}</span>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{row.details}</span>
        </div>
      )
    },
    {
      header: 'Timestamp',
      key: 'time',
      render: (row) => <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.time}</span>
    },
    {
      header: 'Event Code',
      key: 'type',
      render: (row) => <Badge status={row.type}>{row.type}</Badge>
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
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>206</h4>
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
              <h4 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.1rem', color: 'var(--text-primary)' }}>1,492</h4>
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
        
        {/* Audit Log list */}
        <Card title="Live System Event Stream" extra={<Terminal size={18} style={{ color: 'var(--text-muted)' }} />}>
          <Table 
            columns={columns} 
            data={AUDIT_LOGS} 
            emptyMessage="No audit logs recorded."
          />
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

    </div>
  );
};

export default AdminDashboard;
