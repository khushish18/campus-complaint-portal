import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { ShieldCheck } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRoomNo, setRegRoomNo] = useState('');
  const [regHostelBlock, setRegHostelBlock] = useState('');

  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter email and password credentials.');
    }
    
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success(`Welcome back, ${loggedUser.name}!`);
      redirectUser(loggedUser.role);
    } catch (error) {
      toast.error(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      return toast.error('Please enter name, email, and password.');
    }

    if (!regHostelBlock || !regRoomNo) {
      return toast.error('Please select a hostel block and enter your room number.');
    }

    if (regPassword.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const loggedUser = await register(regName, regEmail, regPassword, regRoomNo, regHostelBlock);
      toast.success(`Registration successful! Welcome, ${loggedUser.name}`);
      redirectUser(loggedUser.role);
    } catch (error) {
      toast.error(error.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setLoading(true);
    try {
      const loggedUser = await login('', '', role);
      toast.success(`Logged in as ${loggedUser.name} [${role.toUpperCase()}]`);
      redirectUser(loggedUser.role);
    } catch (error) {
      toast.error(error.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const redirectUser = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'warden':
        navigate('/warden');
        break;
      case 'staff':
        navigate('/staff');
        break;
      case 'student':
      default:
        navigate('/student');
        break;
    }
  };

  return (
    <div className="landing-page-root">
      <div className="landing-card-wrapper">
        <div className="landing-brand-header">
          <div className="landing-brand-logo">
            <ShieldCheck size={40} className="logo-icon-accent" />
            <h1 className="landing-brand-title">SmartCampus</h1>
          </div>
          <p className="landing-brand-tagline">Hostel Complaint Management Portal</p>
        </div>

        {isLogin ? (
          /* Login Mode Form */
          <form onSubmit={handleLoginSubmit} className="landing-form-card">
            <h2 className="landing-form-title">Account Login</h2>
            
            <Input
              label="Campus Email Address"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@campus.edu"
              required
            />

            <Input
              label="Security Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              style={{ marginTop: '0.5rem' }}
            >
              Access Dashboard
            </Button>

            <div className="form-toggle-link">
              Don't have an account?{' '}
              <button type="button" onClick={() => setIsLogin(false)} disabled={loading}>
                Register as Student
              </button>
            </div>
          </form>
        ) : (
          /* Student Registration Mode Form */
          <form onSubmit={handleRegisterSubmit} className="landing-form-card">
            <h2 className="landing-form-title">Student Registration</h2>
            
            <Input
              label="Full Name"
              type="text"
              name="regName"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Khushi Sharma"
              required
            />

            <Input
              label="Campus Email Address"
              type="email"
              name="regEmail"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="e.g. student@campus.edu"
              required
            />

            <Input
              label="Password (min 6 characters)"
              type="password"
              name="regPassword"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div className="form-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Hostel Block"
                type="select"
                name="regHostelBlock"
                value={regHostelBlock}
                onChange={(e) => setRegHostelBlock(e.target.value)}
                placeholder="Select Hostel Block"
                options={[
                  { value: 'Tagore Hall', label: 'Tagore Hall' },
                  { value: 'Radhakrishnan Hall', label: 'Radhakrishnan Hall' },
                  { value: 'Nehru Hall', label: 'Nehru Hall' },
                  { value: 'Patel Hall', label: 'Patel Hall' }
                ]}
                required
              />

              <Input
                label="Room Number"
                type="text"
                name="regRoomNo"
                value={regRoomNo}
                onChange={(e) => setRegRoomNo(e.target.value)}
                placeholder="e.g. B-204"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              style={{ marginTop: '0.5rem' }}
            >
              Create Student Account
            </Button>

            <div className="form-toggle-link">
              Already have an account?{' '}
              <button type="button" onClick={() => setIsLogin(true)} disabled={loading}>
                Access Login
              </button>
            </div>
          </form>
        )}

        {/* Demo switcher panel */}
        <div className="landing-demo-panel">
          <p className="demo-panel-title">Developer Preview - Quick Selection</p>
          <div className="demo-btn-grid">
            <button className="demo-role-btn student" onClick={() => handleQuickLogin('student')} disabled={loading}>
              Student View
            </button>
            <button className="demo-role-btn warden" onClick={() => handleQuickLogin('warden')} disabled={loading}>
              Warden View
            </button>
            <button className="demo-role-btn staff" onClick={() => handleQuickLogin('staff')} disabled={loading}>
              Staff View
            </button>
            <button className="demo-role-btn admin" onClick={() => handleQuickLogin('admin')} disabled={loading}>
              Admin View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
