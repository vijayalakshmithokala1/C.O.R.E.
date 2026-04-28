import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, HelpCircle, Activity, RefreshCw } from 'lucide-react';
import API_BASE from '../utils/api';

const STATUS_CONFIG = {
  Safe:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  icon: '✅', label: 'Safe' },
  Evacuated:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '🏃', label: 'Evacuated' },
  Unaccounted: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  icon: '⚠️', label: 'Unaccounted' },
  Unknown:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',border: 'rgba(148,163,184,0.2)',icon: '❓', label: 'Unknown' },
};

export default function EvacuationDashboard({ socket }) {
  const [evData, setEvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/evacuation`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      setEvData(json);
    } catch (err) {
      console.error('Evacuation fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ sessionId, evacuationStatus }) => {
      setEvData(prev => {
        if (!prev) return prev;
        const sessions = prev.sessions.map(s =>
          s.id === sessionId ? { ...s, evacuationStatus } : s
        );
        const counts = {
          total: sessions.length,
          safe: sessions.filter(s => s.evacuationStatus === 'Safe').length,
          evacuated: sessions.filter(s => s.evacuationStatus === 'Evacuated').length,
          unaccounted: sessions.filter(s => s.evacuationStatus === 'Unaccounted').length,
          unknown: sessions.filter(s => s.evacuationStatus === 'Unknown').length,
        };
        return { ...prev, sessions, counts };
      });
    };
    socket.on('evacuation_updated', handler);
    return () => socket.off('evacuation_updated', handler);
  }, [socket]);

  const updateStatus = async (sessionId, evacuationStatus) => {
    setUpdating(sessionId);
    try {
      await fetch(`${API_BASE}/api/evacuation/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ evacuationStatus })
      });
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="loading-spinner" />
      <p style={{ color: 'var(--text-muted)' }}>Loading evacuation data...</p>
    </div>
  );

  const sessions = (evData?.sessions || []).filter(s =>
    filter === 'all' || s.evacuationStatus === filter
  );

  const accountedCount = (evData?.counts.safe || 0) + (evData?.counts.evacuated || 0);
  const total = evData?.counts.total || 0;
  const pct = total > 0 ? Math.round((accountedCount / total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>🗺️ Evacuation Command</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Real-time guest accountability during emergencies
          </p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)' }}>
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> Refresh
        </button>
      </div>

      {/* Progress Bar */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 700 }}>Accountability Progress</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? 'var(--success)' : pct > 70 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
            {accountedCount}/{total} accounted ({pct}%)
          </span>
        </div>
        <div style={{ height: 12, background: 'var(--bg-main)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct === 100 ? 'var(--success)' : pct > 70 ? 'var(--accent-amber)' : 'var(--accent-red)',
            borderRadius: 6,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Count Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            style={{
              background: filter === key ? cfg.bg : 'var(--panel-bg)',
              border: `1px solid ${filter === key ? cfg.color : 'var(--panel-border)'}`,
              borderRadius: '10px',
              padding: '1rem',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{cfg.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: cfg.color }}>
              {evData?.counts[key.toLowerCase()] ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{cfg.label}</div>
          </button>
        ))}
      </div>

      {/* Floor Summary */}
      {evData?.floorSummary?.length > 0 && (
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>🏢 Active Incident Floors</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {evData.floorSummary.map(f => (
              <div key={f.floor} style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                background: f.maxSeverity >= 8 ? 'rgba(239,68,68,0.1)' : f.maxSeverity >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${f.maxSeverity >= 8 ? '#ef4444' : f.maxSeverity >= 5 ? '#f59e0b' : '#22c55e'}40`,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: f.maxSeverity >= 8 ? '#ef4444' : f.maxSeverity >= 5 ? '#f59e0b' : '#22c55e',
              }}>
                {f.floor} — {f.activeIncidents} incident{f.activeIncidents !== 1 ? 's' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest List */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>
            <Users size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {filter === 'all' ? 'All Active Guests / Patients' : `Filtered: ${filter}`}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({sessions.length})</span>
          </h3>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} style={{ background: 'transparent', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
              Clear Filter
            </button>
          )}
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No guests matching this filter.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-main)' }}>
              <tr>
                {['Code', 'Name', 'Active Incidents', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const cfg = STATUS_CONFIG[s.evacuationStatus] || STATUS_CONFIG.Unknown;
                const isUpdating = updating === s.id;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--panel-border)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-blue)' }}>{s.sessionCode}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{s.name || 'Anonymous'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {s.incidents?.length > 0
                        ? <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{s.incidents.length} active</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: '0.8rem', fontWeight: 600 }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== s.evacuationStatus).map(([key, c]) => (
                          <button
                            key={key}
                            disabled={isUpdating}
                            onClick={() => updateStatus(s.id, key)}
                            style={{
                              padding: '0.2rem 0.5rem',
                              background: c.bg,
                              border: `1px solid ${c.border}`,
                              borderRadius: '4px',
                              color: c.color,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              opacity: isUpdating ? 0.5 : 1,
                            }}
                          >
                            {isUpdating ? '...' : `${c.icon} ${key}`}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
