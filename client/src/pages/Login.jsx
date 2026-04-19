import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { domain, isHotel } = useDomain();
  const [role, setRole] = useState(isHotel ? 'Hotel Manager' : 'Administrator');
  const [error, setError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Quick switch to setup mode if needed (Demo purposes: if login fails normally on fresh install, user can create admin)
    if (isSetupMode) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/setup-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, name: isHotel ? 'Hotel Admin' : 'System Admin', domain })
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: isHotel ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
          <ShieldAlert size={48} />
        </div>
        <h1 className="auth-title">C.O.R.E. <span>{isHotel ? 'Hotel' : 'Hospital'}</span></h1>
        
        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          {!isSetupMode && (
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {isHotel ? (
                <>
                  <option value="Hotel Manager">Hotel Manager</option>
                  <option value="Security">Security</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Front Desk">Front Desk</option>
                </>
              ) : (
                <>
                  <option value="Administrator">Administrator</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Receptionist">Receptionist</option>
                </>
              )}
            </select>
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
            {isSetupMode ? 'Initialize System Admin' : 'Secure Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)' }}>
            <ArrowLeft size={12} /> Change Domain
          </Link>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSetupMode(!isSetupMode)}>
            {isSetupMode ? 'Back to Login' : 'First Time Setup?'}
          </span>
        </div>
      </div>
    </div>
  );
}
