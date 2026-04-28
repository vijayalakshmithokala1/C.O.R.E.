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
          className="landing-card"
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <PlusSquare size={48} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
          <h3>Hospital Command</h3>
          <p>Medical emergencies, patient tracking, and staff coordination.</p>
        </button>

        {/* Hotel Card */}
        <button 
          onClick={() => handleSelectDomain('HOTEL')}
          className="landing-card"
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <Building2 size={48} color="var(--accent-amber)" style={{ marginBottom: '1rem' }} />
          <h3>Hotel Security</h3>
          <p>Guest safety, maintenance tracking, and security response.</p>
        </button>

        {/* Airport Card */}
        <button 
          onClick={() => handleSelectDomain('AIRPORT')}
          className="landing-card"
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <Building2 size={48} color="var(--accent-blue)" style={{ marginBottom: '1rem' }} />
          <h3>Airport Operations</h3>
          <p>Terminal safety, baggage security, and flow management.</p>
        </button>

        {/* Mall Card */}
        <button 
          onClick={() => handleSelectDomain('MALL')}
          className="landing-card"
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <Building2 size={48} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
          <h3>Shopping Mall</h3>
          <p>Crowd control, tenant safety, and lost & found coordination.</p>
        </button>

      </div>
    </div>
  );
}
