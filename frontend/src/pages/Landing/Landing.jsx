import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
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

  const handleQuickLogin = async (role) => {
    setLoading(true);
    try {
      const loggedUser = await login('', '', role);
      toast.success(`Logged in as ${loggedUser.name} [${role.toUpperCase()}]`);
      redirectUser(loggedUser.role);
    } catch (error) {
      toast.error('Quick login failed.');
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
        </form>

        {/* Demo switcher panel */}
        <div className="landing-demo-panel">
          <p className="demo-panel-title">Developer Preview - Quick Selection</p>
          <div className="demo-btn-grid">
            <button className="demo-role-btn student" onClick={() => handleQuickLogin('student')}>
              Student View
            </button>
            <button className="demo-role-btn warden" onClick={() => handleQuickLogin('warden')}>
              Warden View
            </button>
            <button className="demo-role-btn staff" onClick={() => handleQuickLogin('staff')}>
              Staff View
            </button>
            <button className="demo-role-btn admin" onClick={() => handleQuickLogin('admin')}>
              Admin View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
