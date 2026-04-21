import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Activity, Users, Settings, UserPlus, AlertTriangle, Shield, Moon, Sun, AlertCircle, Camera, BarChart2, CheckCircle, X, Phone } from 'lucide-react';
import io from 'socket.io-client';
import { playEmergencyBuzzAlarm, playIncidentAlarm, unlockAudio, stopEmergencyBuzzAlarm } from '../utils/alarm';
import API_BASE from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useDomain } from '../context/DomainContext';

import AdminDashboard from './AdminDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import MedicalDashboard from './MedicalDashboard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyAlertMsg, setEmergencyAlertMsg] = useState(null);
  const [claimedAlertMsg, setClaimedAlertMsg] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { terms, domain } = useDomain();

  const [simulatingCamera, setSimulatingCamera] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const newSocket = io(API_BASE);
    setSocket(newSocket);

    // Unlock audio on first user interaction
    const unlock = () => { unlockAudio(); window.removeEventListener('click', unlock); };
    window.addEventListener('click', unlock);

    // Join appropriate socket rooms based on role AND domain
    newSocket.on('connect', () => {
      newSocket.emit('join_room', `staff_all_${parsedUser.domain}`);
      newSocket.emit('join_room', `${parsedUser.role}_${parsedUser.domain}`);
      
      if (parsedUser.role === 'Doctor' || parsedUser.role === 'Nurse' || parsedUser.role === 'Security' || parsedUser.role === 'Maintenance') {
        const floors = parsedUser.floors ? parsedUser.floors.split(',') : [];
        floors.forEach(floor => {
          newSocket.emit('join_room', `floor_${floor.trim()}_${parsedUser.domain}`);
        });
      }
    });

    // Staff hear the emergency buzz alarm too
    newSocket.on('emergency_buzz', (data) => {
      setEmergencyAlertMsg(data?.message || 'SYSTEM WIDE EMERGENCY ACTIVATED');
      playEmergencyBuzzAlarm();
    });

    // Staff see when someone else claims an incident
    newSocket.on('incident_claimed', (data) => {
      setClaimedAlertMsg(data.message);
      setTimeout(() => setClaimedAlertMsg(null), 8000); // clear after 8 seconds
    });

    return () => {
      newSocket.close();
      stopEmergencyBuzzAlarm();
      window.removeEventListener('click', unlock);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const sendEmergencyBuzz = () => {
    if (window.confirm(`Send emergency buzz to ALL active users in the ${terms.label}? This cannot be undone.`)) {
      socket.emit('buzz_triggered', {
        message: 'CRITICAL EMERGENCY: Please follow staff instructions immediately.',
        issuerData: { name: user.name, role: user.role },
        domain: user.domain
      });
      alert('Emergency buzz broadcasted.');
    }
  }

  const triggerCameraAlert = async () => {
    setSimulatingCamera(true);
    try {
       await fetch(`${API_BASE}/api/incident/system-alert`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            domain: user.domain,
            cameraLocation: 'Lobby',
            eventType: 'Fire',
            confidence: 82
         })
       });
       alert('AI Camera detection triggered successfully.');
    } catch(e) {
       console.error(e);
    } finally {
       setSimulatingCamera(false);
    }
  };

  if (!user) return <div className="auth-wrapper"><h2 className="auth-title">Connecting...</h2></div>;

  return (
    <div className="dashboard-grid">
      {/* ── Emergency Buzz Overlay ── */}
      {emergencyAlertMsg && (
        <div className="portal-buzz-overlay">
          <div className="portal-buzz-card">
            <div className="portal-buzz-icon">
              <AlertCircle size={56} />
            </div>
            <h1>Emergency Alert</h1>
            <p>{emergencyAlertMsg}</p>
            <div className="portal-buzz-instruction">
              An emergency buzz was triggered. Please review incident feed immediately and coordinate response!
            </div>
            <button className="portal-buzz-dismiss" onClick={() => {
              setEmergencyAlertMsg(null);
              stopEmergencyBuzzAlarm();
            }}>
              ✓ Acknowledge & Mute
            </button>
          </div>
        </div>
      )}

      {/* ── Claimed Notification Toast ── */}
      {claimedAlertMsg && (
        <div style={{
           position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
           background: '#3b82f6', color: 'white', padding: '1rem 1.5rem',
           borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
           display: 'flex', alignItems: 'center', gap: '0.75rem',
           animation: 'slideIn 0.3s ease-out'
        }}>
           <CheckCircle size={20} />
           <div>{claimedAlertMsg}</div>
           <button onClick={() => setClaimedAlertMsg(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: '0.5rem' }}>
              <X size={16} />
           </button>
        </div>
      )}

      <aside className="sidebar">
        <h2>C.O.R.E.</h2>
        <div style={{ marginBottom: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{user.name}</div>
          <div>Role: {user.role}</div>
          {user.floors && <div>Floors: {user.floors}</div>}
        </div>
        
        <nav style={{ flex: 1 }}>
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <Activity size={18} /> Incidents
          </Link>
          
          {(user.role === 'Receptionist' || user.role === 'Administrator' || user.role === 'Front Desk' || user.role === 'Hotel Manager' || user.role === 'Help Desk' || user.role === 'Duty Manager' || user.role === 'Information' || user.role === 'Admin') ? (
            <Link to="/dashboard/patients" className={`nav-link ${location.pathname === '/dashboard/patients' ? 'active' : ''}`}>
              <Users size={18} /> {terms.patients}
            </Link>
          ) : null}

          {(user.role === 'Administrator' || user.role === 'Hotel Manager' || user.role === 'Duty Manager' || user.role === 'Admin') && (
            <>
              <Link to="/dashboard/staff" className={`nav-link ${location.pathname === '/dashboard/staff' ? 'active' : ''}`}>
                <UserPlus size={18} /> Manage Staff
              </Link>
              <Link to="/dashboard/settings" className={`nav-link ${location.pathname === '/dashboard/settings' ? 'active' : ''}`}>
                <Settings size={18} /> System Config
              </Link>
              <Link to="/dashboard/audit" className={`nav-link ${location.pathname === '/dashboard/audit' ? 'active' : ''}`}>
                <Shield size={18} /> Audit Logs
              </Link>
              <Link to="/dashboard/analytics" className={`nav-link ${location.pathname === '/dashboard/analytics' ? 'active' : ''}`}>
                <BarChart2 size={18} /> Analytics
              </Link>
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          {/* Help Line Button */}
          <a 
            href="tel:+18002673435" 
            style={{ 
              textDecoration: 'none',
              width: '100%', 
              marginBottom: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.6rem', 
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--accent-blue)',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            }}
          >
            <Phone size={18} /> Call Help Line
          </a>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {(user.role === 'Security' || user.role === 'Administrator' || user.role === 'Hotel Manager' || user.role === 'Duty Manager' || user.role === 'Admin') && (
            <button style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#3b82f6', color: 'white' }} onClick={triggerCameraAlert} disabled={simulatingCamera}>
              <Camera size={18} /> Simulate AI Camera
            </button>
          )}

          <button className="danger" style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={sendEmergencyBuzz}>
            <AlertTriangle size={18} /> 🚨 Send Emergency Alert
          </button>
          
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<MedicalDashboard socket={socket} user={user} />} />
          <Route path="/patients" element={<ReceptionDashboard socket={socket} user={user} />} />
          <Route path="/staff" element={<AdminDashboard section="staff" user={user} />} />
          <Route path="/settings" element={<AdminDashboard section="settings" user={user} />} />
          <Route path="/audit" element={<AdminDashboard section="audit" user={user} />} />
          <Route path="/analytics" element={<AdminDashboard section="analytics" user={user} />} />
        </Routes>
      </main>
    </div>
  );
}
