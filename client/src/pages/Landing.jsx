import { useNavigate } from 'react-router-dom';
import { useDomain } from '../context/DomainContext';
import { Building2, PlusSquare, Key } from 'lucide-react';

export default function Landing() {
  const { setDomain } = useDomain();
  const navigate = useNavigate();

  const handleSelectDomain = (domain) => {
    setDomain(domain);
    navigate('/login');
  };

  const demoAccounts = [
    { domain: 'Hospital', domainKey: 'HOSPITAL', user: 'hospadmin', pass: 'password123', role: 'Administrator', color: 'var(--accent-red)' },
    { domain: 'Hotel', domainKey: 'HOTEL', user: 'hoteladmin', pass: 'password123', role: 'Hotel Manager', color: 'var(--accent-amber)' },
    { domain: 'Airport', domainKey: 'AIRPORT', user: 'airadmin2', pass: 'password123', role: 'Duty Manager', color: 'var(--accent-blue)' },
    { domain: 'Mall', domainKey: 'MALL', user: 'malladmin1', pass: 'password123', role: 'Admin', color: 'var(--accent-purple)' },
  ];

  const handleDemoLogin = (acc) => {
    setDomain(acc.domainKey);
    navigate('/login', { state: { user: acc.user, pass: acc.pass, role: acc.role } });
  };

  return (
    <div className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>C.O.R.E.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Crisis Operations & Response Ecosystem</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
        
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

      {/* Evaluator Access Section */}
      <div style={{ 
        width: '100%', 
        maxWidth: '1000px', 
        padding: '2rem', 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: '16px', 
        border: '1px solid var(--panel-border)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <Key size={32} color="var(--accent-blue)" />
          <h2 style={{ fontSize: '1.8rem', letterSpacing: '1px' }}>Evaluator Access</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {demoAccounts.map((acc) => (
            <div 
              key={acc.domain} 
              onClick={() => handleDemoLogin(acc)}
              className="landing-card-small"
              style={{ 
                padding: '1.25rem', 
                background: 'var(--panel-bg)', 
                borderRadius: '12px', 
                border: `1px solid ${acc.color}44`,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = acc.color;
                e.currentTarget.style.boxShadow = `0 10px 20px -10px ${acc.color}66`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${acc.color}44`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: `${acc.color}22`, borderRadius: '0 0 0 100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: acc.color }}></div>
              </div>
              
              <h4 style={{ color: acc.color, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{acc.domain}</h4>
              
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                  <span style={{ fontWeight: 600 }}>{acc.role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>User:</span>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{acc.user}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pass:</span>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{acc.pass}</code>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.7rem', color: acc.color, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>
                Click to Quick-Login
              </div>
            </div>
          ))}
        </div>
        
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Select a sector card above, then use these credentials on the login page to access the administrative dashboards.
        </p>
      </div>
    </div>
  );
}
