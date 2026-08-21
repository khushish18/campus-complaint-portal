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
  ClipboardList, 
  Clock, 
  UserCheck, 
  UserX,
  Send,
  Building
} from 'lucide-react';

const INITIAL_COMPLAINTS = [
  {
    _id: 'c-001',
    title: 'Water Leakage in Bathroom Tap',
    student: { name: 'Khushi Sharma', roomNumber: 'B-204' },
    category: 'plumbing',
    urgency: 'high',
    status: 'pending',
    createdAt: '2026-08-20T10:30:00Z',
    assignedTo: null
  },
  {
    _id: 'c-002',
    title: 'Ceiling Fan Speed Regulator Broken',
    student: { name: 'Aryan Goel', roomNumber: 'C-312' },
    category: 'electrical',
    urgency: 'low',
    status: 'assigned',
    createdAt: '2026-08-18T14:15:00Z',
    assignedTo: { name: 'Sohan Lal (Electrician)' }
  },
  {
    _id: 'c-003',
    title: 'WiFi Connection Dropping Constantly',
    student: { name: 'Preeti Negi', roomNumber: 'A-108' },
    category: 'internet',
    urgency: 'medium',
    status: 'in-progress',
    createdAt: '2026-08-21T09:00:00Z',
    assignedTo: { name: 'Ramesh Kumar (Plumber)' }
  }
];

const MOCK_STAFF = [
  { value: 'staff-1', label: 'Ramesh Kumar (Plumbing Dept)' },
  { value: 'staff-2', label: 'Sohan Lal (Electrician)' },
  { value: 'staff-3', label: 'Mohammad Ali (Housekeeping Supervisor)' },
];

const WardenDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [complaints, setComplaints] = useState(INITIAL_COMPLAINTS);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Statistics
  const totalHostelComplaints = complaints.length;
  const unassignedCount = complaints.filter(c => c.status === 'pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'in-progress' || c.status === 'assigned').length;

  const handleOpenAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setStaffId('');
    setIsModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) {
      return toast.error('Please select a staff member for assignment.');
    }

    setDispatching(true);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Network delay

    const selectedStaffName = MOCK_STAFF.find(s => s.value === staffId)?.label || 'Assigned Crew';

    setComplaints(prev => prev.map(c => {
      if (c._id === selectedComplaint._id) {
        return {
          ...c,
          status: 'assigned',
          assignedTo: { name: selectedStaffName }
        };
      }
      return c;
    }));

    toast.success(`Complaint ${selectedComplaint._id} assigned to ${selectedStaffName}!`);
    setDispatching(false);
    setIsModalOpen(false);
  };

  const columns = [
    {
      header: 'Ticket Details',
      key: 'title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{row.title}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student: {row.student.name} (Room {row.student.roomNumber})</span>
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
      header: 'Dispatch Action',
      key: 'action',
      render: (row) => {
        if (row.status === 'pending') {
          return (
            <Button variant="outline" size="sm" icon={Send} onClick={() => handleOpenAssignModal(row)}>
              Assign
            </Button>
          );
        }
        return <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Dispatched</span>;
      }
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
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Hostel Wing Supervision: <strong style={{ color: 'var(--primary)' }}>{user?.hostel}</strong></p>
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
        <Table
          columns={columns}
          data={complaints}
          emptyMessage="No complaints have been reported in your hostel wing."
        />
      </Card>

      {/* Staff Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Dispatch Maintenance Crew"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignSubmit} loading={dispatching} icon={UserCheck}>
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
            options={MOCK_STAFF}
            required
            disabled={dispatching}
          />
        </form>
      </Modal>

    </div>
  );
};

export default WardenDashboard;
