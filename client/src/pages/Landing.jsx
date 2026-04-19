import { useNavigate } from 'react-router-dom';
import { useDomain } from '../context/DomainContext';
import { Building2, PlusSquare } from 'lucide-react';

export default function Landing() {
  const { setDomain } = useDomain();
  const navigate = useNavigate();

  const handleSelectDomain = (domain) => {
    setDomain(domain);
    navigate('/login');
  };

  return (
    <div className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>C.O.R.E.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Crisis Operations & Response Ecosystem</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* Hospital Card */}
        <button 
          onClick={() => handleSelectDomain('HOSPITAL')}
          style={{
            background: 'var(--panel-bg)',
            border: '2px solid var(--panel-border)',
            borderRadius: '12px',
            padding: '3rem 2rem',
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'var(--text-main)'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <PlusSquare size={64} color="var(--accent-red)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Hospital Command</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Medical emergencies, patient tracking, and hospital staff coordination.
          </p>
        </button>

        {/* Hotel Card */}
        <button 
          onClick={() => handleSelectDomain('HOTEL')}
          style={{
            background: 'var(--panel-bg)',
            border: '2px solid var(--panel-border)',
            borderRadius: '12px',
            padding: '3rem 2rem',
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'var(--text-main)'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <Building2 size={64} color="var(--accent-amber)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Hotel Security</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Guest management, maintenance tracking, and hotel security response.
          </p>
        </button>

      </div>
    </div>
  );
}
