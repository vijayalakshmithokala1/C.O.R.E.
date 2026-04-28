import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import API_BASE from '../utils/api';

const SEVERITY_COLOR = (score) => {
  if (score >= 8) return '#ef4444';
  if (score >= 5) return '#f59e0b';
  return '#22c55e';
};

const TYPE_EMOJI = {
  'Fire': '🔥',
  'Medical Emergency': '🏥',
  'Security Breach': '🚨',
  'Maintenance Issue': '🔧',
  'Other': '⚡',
};

export default function FirstResponderPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [blinking, setBlinking] = useState(false);
  const socketRef = useRef(null);

  const fetchFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incident/responder/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Invalid or expired link');
        return;
      }
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      triggerBlink();
    } catch {
      setError('Cannot reach server. Please check your connection.');
    }
  };

  const triggerBlink = () => {
    setBlinking(true);
    setTimeout(() => setBlinking(false), 800);
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000);

    const socket = io(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('new_incident', () => { fetchFeed(); });
    socket.on('incident_updated', () => { fetchFeed(); });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [token]);

  if (error) {
    return (
      <div style={styles.shell}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: '#94a3b8' }}>{error}</p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '1rem' }}>
            This link may have expired (valid for 4 hours). Request a new one from the facility administrator.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.shell}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Connecting to secure incident feed...</p>
        </div>
      </div>
    );
  }

  const critical = data.incidents.filter(i => i.severityScore >= 8);
  const moderate = data.incidents.filter(i => i.severityScore >= 5 && i.severityScore < 8);
  const low = data.incidents.filter(i => i.severityScore < 5);

  return (
    <div style={styles.shell}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.4rem' }}>C.O.R.E.</span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '0.5rem' }}>First Responder Feed</span>
          </div>
          <div style={styles.domainBadge}>{data.domain} FACILITY</div>
        </div>
        <div style={styles.headerRight}>
          <div style={{ ...styles.liveBadge, animation: blinking ? 'none' : undefined, opacity: blinking ? 0.5 : 1 }}>
            <span style={styles.liveDot} /> LIVE
          </div>
          <div style={styles.updateTime}>
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </div>
          <button style={styles.refreshBtn} onClick={fetchFeed}>↻ Refresh</button>
        </div>
      </header>

      {/* Summary Bar */}
      <div style={styles.summaryBar}>
        <SumCard label="TOTAL ACTIVE" value={data.incidents.length} color="#3b82f6" />
        <SumCard label="CRITICAL" value={critical.length} color="#ef4444" />
        <SumCard label="MODERATE" value={moderate.length} color="#f59e0b" />
        <SumCard label="LOW PRIORITY" value={low.length} color="#22c55e" />
      </div>

      {/* Incidents */}
      <div style={styles.feedWrapper}>
        {data.incidents.length === 0 ? (
          <div style={styles.allClear}>
            <span style={{ fontSize: '3rem' }}>✅</span>
            <h3 style={{ color: '#22c55e', margin: '0.5rem 0' }}>No Active Incidents</h3>
            <p style={{ color: '#64748b' }}>All clear at this facility. Feed auto-refreshes every 30 seconds.</p>
          </div>
        ) : (
          data.incidents.map(inc => <IncidentRow key={inc.id} incident={inc} />)
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        🔒 Secure read-only responder feed · Authorized personnel only · Auto-refreshes every 30s ·
        {' '}Generated for {data.domain} facility
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

function IncidentRow({ incident }) {
  const color = SEVERITY_COLOR(incident.severityScore);
  return (
    <div style={{ ...styles.incRow, borderLeft: `4px solid ${color}`, animation: 'fadeIn 0.3s ease' }}>
      <div style={styles.incTop}>
        <div style={styles.incMeta}>
          <span style={{ fontSize: '1.5rem' }}>{TYPE_EMOJI[incident.type] || '⚡'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{incident.type}</span>
              <span style={{ ...styles.statusTag, background: incident.status === 'Pending' ? '#ef444420' : '#3b82f620', color: incident.status === 'Pending' ? '#ef4444' : '#3b82f6', border: `1px solid ${incident.status === 'Pending' ? '#ef4444' : '#3b82f6'}40` }}>
                {incident.status}
              </span>
              <span style={{ ...styles.statusTag, background: `${color}20`, color, border: `1px solid ${color}40` }}>
                SEV {incident.severityScore}/10
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
              📍 {incident.floor || 'Location unknown'} · {new Date(incident.createdAt).toLocaleTimeString()} · #{incident.id}
              {incident.assignedToName && <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>→ {incident.assignedToName}</span>}
            </div>
          </div>
        </div>
      </div>

      <p style={styles.desc}>{incident.description}</p>

      {incident.aiTriageInstructions && (
        <div style={styles.aiBox}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem' }}>
            🤖 AI TRIAGE — FOR DISTRESSED INDIVIDUAL
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{incident.aiTriageInstructions}</p>
        </div>
      )}

      {incident.suggestedResponse && (
        <div style={{ ...styles.aiBox, background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>
            🚨 RECOMMENDED RESPONSE PROTOCOL
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{incident.suggestedResponse}</p>
        </div>
      )}
    </div>
  );
}

function SumCard({ label, value, color }) {
  return (
    <div style={{ ...styles.sumCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '2rem', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: '100vh',
    background: '#0a0f1e',
    fontFamily: "'Inter', sans-serif",
    color: '#f1f5f9',
  },
  header: {
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { display: 'flex', alignItems: 'baseline' },
  domainBadge: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#ef4444',
    padding: '0.3rem 0.7rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'opacity 0.3s',
  },
  liveDot: {
    width: 8,
    height: 8,
    background: '#ef4444',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse 1.5s infinite',
  },
  updateTime: { fontSize: '0.75rem', color: '#64748b' },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '0.3rem 0.8rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  summaryBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    padding: '1rem 2rem',
    background: '#0d1526',
    borderBottom: '1px solid #1e293b',
  },
  sumCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
  },
  feedWrapper: {
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  incRow: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1.25rem',
  },
  incTop: { marginBottom: '0.75rem' },
  incMeta: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  statusTag: {
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  desc: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 0.75rem 0',
    background: 'rgba(255,255,255,0.02)',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #1e293b',
  },
  aiBox: {
    background: 'rgba(59,130,246,0.05)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '6px',
    padding: '0.75rem',
    marginTop: '0.5rem',
  },
  allClear: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  footer: {
    padding: '1rem 2rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#334155',
    borderTop: '1px solid #1e293b',
    background: '#0a0f1e',
  },
  errorCard: {
    textAlign: 'center',
    padding: '4rem 2rem',
    maxWidth: '400px',
    margin: '10vh auto',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  loadingCard: {
    textAlign: 'center',
    padding: '4rem 2rem',
    maxWidth: '300px',
    margin: '10vh auto',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #1e293b',
    borderTop: '3px solid #ef4444',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
};
