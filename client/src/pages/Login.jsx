import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { domain, setDomain, terms, DOMAINS } = useDomain();
  const [role, setRole] = useState(terms.doctor);
  const [error, setError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.user) setUsername(location.state.user);
      if (location.state.pass) setPassword(location.state.pass);
      if (location.state.role) setRole(location.state.role);
    }
  }, [location.state]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Quick switch to setup mode if needed (Demo purposes: if login fails normally on fresh install, user can create admin)
    if (isSetupMode) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/setup-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, name: `${terms.label} Admin`, domain })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        setIsSetupMode(false);
        setError('Admin created. Please log in.');
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, domain })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--accent-red)' }}>
          <ShieldAlert size={48} />
        </div>
        <h1 className="auth-title">C.O.R.E. <span>{terms.label}</span></h1>

        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          {!isSetupMode && (
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: 0 }}>Active Sector</label>
                  <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{terms.label} Command</div>
                </div>
                <Link to="/" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>Change</Link>
              </div>

              <label className="label" style={{ fontSize: '0.7rem' }}>Operational Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 0 }} required>
                <option value="" disabled>Select your role...</option>
                {domain === 'HOSPITAL' && (
                  <>
                    <option value="Administrator">Administrator</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                  </>
                )}
                {domain === 'HOTEL' && (
                  <>
                    <option value="Hotel Manager">Hotel Manager</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Front Desk">Front Desk</option>
                  </>
                )}
                {domain === 'AIRPORT' && (
                  <>
                    <option value="Duty Manager">Duty Manager</option>
                    <option value="Security">Security</option>
                    <option value="Operations">Operations</option>
                    <option value="Help Desk">Help Desk</option>
                  </>
                )}
                {domain === 'MALL' && (
                  <>
                    <option value="Admin">Mall Admin</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Information">Information Desk</option>
                  </>
                )}
              </select>
            </div>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="primary" style={{ width: '100%' }}>
            {isSetupMode ? 'Initialize Sector Admin' : 'Secure Access'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)' }}>
            <ArrowLeft size={12} /> Exit Portal
          </Link>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSetupMode(!isSetupMode)}>
            {isSetupMode ? 'Back to Login' : 'First Time Setup?'}
          </span>
        </div>
      </div>
    </div>
  );
}
