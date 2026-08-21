import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Table from '../../components/common/Table/Table';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import { 
  PlusCircle, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  BellRing,
  Wrench,
  Sparkles
} from 'lucide-react';

const INITIAL_COMPLAINTS = [
  {
    _id: 'c-001',
    title: 'Water Leakage in Bathroom Tap',
    description: 'The tap in room bathroom is constantly dripping water, creating wet floor issues.',
    category: 'plumbing',
    urgency: 'high',
    status: 'assigned',
    createdAt: '2026-08-20T10:30:00Z',
    assignedTo: { name: 'Ramesh Kumar (Plumbing Dept)' }
  },
  {
    _id: 'c-002',
    title: 'Ceiling Fan Speed Regulator Broken',
    description: 'The fan in B-204 only runs at maximum speed. Regulator switch knob does not affect it.',
    category: 'electrical',
    urgency: 'low',
    status: 'resolved',
    createdAt: '2026-08-18T14:15:00Z',
    assignedTo: { name: 'Sohan Lal (Electrician)' }
  },
  {
    _id: 'c-003',
    title: 'Extremely Slow Wi-Fi Connectivity',
    description: 'Wi-Fi download speeds are below 512Kbps and ping is above 300ms in the evening.',
    category: 'internet',
    urgency: 'medium',
    status: 'pending',
    createdAt: '2026-08-21T09:00:00Z',
    assignedTo: null
  }
];

const NOTICES = [
  { id: 1, title: 'Power Shut Down Notice', date: 'Aug 22, 10 AM - 1 PM', body: 'Routine generator maintenance will affect Tagore Hall power grids.' },
  { id: 2, title: 'Wi-Fi Upgrade Phase-II', date: 'Aug 24, 02 AM - 05 AM', body: 'Tagore and Radhakrishnan Hostels core internet router replacement.' },
];

const StudentDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [complaints, setComplaints] = useState(INITIAL_COMPLAINTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [raising, setRaising] = useState(false);

  // Stats calculators
  const totalTickets = complaints.length;
  const pendingTickets = complaints.filter(c => c.status === 'pending' || c.status === 'assigned' || c.status === 'in-progress').length;
  const resolvedTickets = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle || !formDesc) {
      return toast.error('Please enter both title and description.');
    }

    setRaising(true);
    
    // Simulate AI model categorization and dispatch latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulated local AI classification
    const descLower = `${formTitle.toLowerCase()} ${formDesc.toLowerCase()}`;
    let category = 'other';
    let urgency = 'low';

    if (descLower.includes('leak') || descLower.includes('water') || descLower.includes('tap') || descLower.includes('drain')) {
      category = 'plumbing';
    } else if (descLower.includes('light') || descLower.includes('fan') || descLower.includes('switch') || descLower.includes('power')) {
      category = 'electrical';
    } else if (descLower.includes('wifi') || descLower.includes('internet') || descLower.includes('router') || descLower.includes('lan')) {
      category = 'internet';
    } else if (descLower.includes('clean') || descLower.includes('dust') || descLower.includes('garbage') || descLower.includes('sweep')) {
      category = 'housekeeping';
    }

    if (descLower.includes('shock') || descLower.includes('flood') || descLower.includes('emergency') || descLower.includes('danger') || descLower.includes('burst')) {
      urgency = 'high';
    } else if (descLower.includes('broken') || descLower.includes('stuck') || descLower.includes('no work')) {
      urgency = 'medium';
    }

    const newTicket = {
      _id: `c-${Date.now().toString().slice(-4)}`,
      title: formTitle,
      description: formDesc,
      category,
      urgency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      assignedTo: null
    };

    setComplaints([newTicket, ...complaints]);
    toast.success(`AI Classifier: Ticket auto-assigned to [${category.toUpperCase()}] with [${urgency.toUpperCase()}] priority!`);
    
    // Reset Form
    setFormTitle('');
    setFormDesc('');
    setRaising(false);
    setIsModalOpen(false);
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
            Hostel: <strong style={{ color: 'var(--primary)' }}>{user?.hostel}</strong> | Room: <strong style={{ color: 'var(--primary)' }}>{user?.roomNumber}</strong>
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
          <Table 
            columns={columns} 
            data={complaints} 
            emptyMessage="You have not submitted any complaints yet."
          />
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
        onClose={() => setIsModalOpen(false)}
        title="Raise Maintenance Ticket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRaiseSubmit} loading={raising}>
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

    </div>
  );
};

export default StudentDashboard;
