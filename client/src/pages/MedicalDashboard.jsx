import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, FileAudio, MapPin, CheckCircle, Clock, RefreshCw, Wifi, ShieldAlert, Trash2, Video, Send, Loader, Activity } from 'lucide-react';
import { playIncidentAlarm, unlockAudio } from '../utils/alarm';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';
import EmergencyPlaybook from '../components/EmergencyPlaybook';

export default function MedicalDashboard({ socket, user }) {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hicsMode, setHicsMode] = useState(false);
  const [activeVideoFeed, setActiveVideoFeed] = useState(null);
  const [dispatching, setDispatching] = useState(null);
  const { isHotel, terms, domain } = useDomain();

  // Unlock AudioContext on first interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => { unlockAudio(); window.removeEventListener('click', unlock); };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  // ── Fetch incidents from REST ──────────────────────────────────
  const fetchIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/incident`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchIncidents();
    // Fetch resources
    fetch(`${API_BASE}/api/admin/resources`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
    .then(data => setResources(data))
    .catch(e => console.error('Resource fetch error:', e));
  }, [fetchIncidents]);

  // ── Socket listeners — re-attach whenever socket changes ──────
  useEffect(() => {
    if (!socket) return;

    const handleJoin = () => {
      socket.emit('join_room', `staff_all_${domain}`);
      console.log(`[Dashboard] Joining command room: staff_all_${domain}`);
    };

    handleJoin();
    // Re-join on reconnection
    socket.on('connect', handleJoin);

    const handleNew = (incident) => {
      setIncidents((prev) => {
        // Avoid duplicates
        if (prev.find((i) => i.id === incident.id)) return prev;
        return [incident, ...prev];
      });
      setLastUpdated(new Date());
      // 🔔 Play alert sound for incoming incident
      playIncidentAlarm();
    };

    const handleUpdate = (updated) => {
      setIncidents((prev) => {
        if (updated.removed) {
          return prev.filter((i) => i.id !== updated.id);
        }
        return prev.map((i) => (i.id === updated.id ? updated : i));
      });
      setLastUpdated(new Date());
    };

    socket.on('new_incident', handleNew);
    socket.on('incident_updated', handleUpdate);
    
    socket.on('incident_video_start', (data) => {
       setActiveVideoFeed(data.incidentId);
    });

    socket.on('incident_video_stop', () => {
       setActiveVideoFeed(null);
    });

    // When socket reconnects, re-fetch to catch anything missed
    socket.on('connect', () => fetchIncidents(true));

    return () => {
      socket.off('new_incident', handleNew);
      socket.off('incident_updated', handleUpdate);
      socket.off('incident_video_start');
      socket.off('incident_video_stop');
      socket.off('connect', handleJoin);
    };
  }, [socket, fetchIncidents]);

  // ── Update status ──────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE}/api/incident/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteIncident = async (id) => {
    if (!window.confirm('Are you sure you want to remove this incident from the feed? It will remain in the database records.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/incident/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        setIncidents((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────
  const typeColor = {
    'Medical Emergency': 'var(--accent-amber)',
    'Fire': 'var(--accent-red)',
    'Other': 'var(--accent-blue)',
    'Security Breach': 'var(--accent-red)',
    'Maintenance Issue': 'var(--accent-amber)'
  };

  const statusOrder = { Pending: 0, 'In Progress': 1, Reviewed: 2, Resolved: 3 };
  const sorted = [...incidents].sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading incident feed...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard-wrapper ${hicsMode ? 'hics-theme' : ''}`}>
      {/* ── Video Triage Modal ── */}
      {activeVideoFeed && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '600px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
                <Video size={20} /> <h3 style={{ margin: 0 }}>LIVE VIDEO TRIAGE</h3>
              </div>
              <button className="portal-buzz-dismiss" onClick={() => setActiveVideoFeed(null)}>Close</button>
            </div>
            
            <div style={{ background: '#000', borderRadius: '8px', position: 'relative', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="stream-badge" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>LIVE FEED: INCIDENT #{activeVideoFeed}</div>
               <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                  <Loader size={32} className="spin-icon" style={{ marginBottom: '1rem' }} />
                  <div>Syncing Encrypted Stream...</div>
               </div>
               {/* Mock Video Element */}
               <video autoPlay playsInline className="live-camera-feed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      )}

      <header className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon"><ShieldAlert size={28} /></div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{terms.medical} Command</h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{terms.label} Sector • Status: Operational</div>
            </div>
          </div>
          
          <button 
            className={`hics-toggle ${hicsMode ? 'active' : ''}`} 
            onClick={() => setHicsMode(!hicsMode)}
            style={{ 
              background: hicsMode ? 'var(--accent-red)' : 'transparent',
              color: hicsMode ? 'white' : 'var(--text-muted)',
              border: '1px solid ' + (hicsMode ? 'var(--accent-red)' : 'var(--panel-border)'),
              padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <ShieldAlert size={14} /> {hicsMode ? (domain === 'HOSPITAL' ? 'HICS MODE ACTIVE' : 'NIMS STRATEGIC ACTIVE') : (domain === 'HOSPITAL' ? 'ACTIVATE HICS' : 'ACTIVATE COMMAND')}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => fetchIncidents(true)} disabled={refreshing} className="outline-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> Refresh
          </button>
          <div className="staff-badge">
            <div className="user-icon"><ActivityIcon color="white" /></div>
            <div style={{ color: 'white' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{user.role}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats row */}
      {incidents.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['Pending', 'In Progress', 'Reviewed', 'Resolved'].map((s) => {
            const count = incidents.filter((i) => i.status === s).length;
            if (count === 0) return null;
            return (
              <span key={s} className={`tag status-${s.replace(' ', '')}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                {s}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {sorted.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ marginBottom: '1rem', color: 'var(--success)', opacity: 0.7 }} />
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>All Clear</h3>
            <p style={{ fontSize: '0.875rem' }}>No active incidents reported in this sector.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {sorted.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                resources={resources}
                onStatusChange={updateStatus}
                onDelete={deleteIncident}
                user={user}
                typeColor={typeColor}
                isHotel={isHotel}
                hicsMode={hicsMode}
                activeVideoFeed={activeVideoFeed}
                setActiveVideoFeed={setActiveVideoFeed}
                dispatching={dispatching === incident.id}
                setDispatching={(val) => setDispatching(val ? incident.id : null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incident Card ─────────────────────────────────────────────────
function IncidentCard({ 
  incident, resources, onStatusChange, onDelete, user, typeColor, isHotel, 
  hicsMode, activeVideoFeed, setActiveVideoFeed, dispatching, setDispatching 
}) {
  const color = typeColor[incident.type] || 'var(--accent-blue)';
  const isResolved = incident.status === 'Resolved';

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const res = await fetch(`${API_BASE}/api/incident/${incident.id}/dispatch`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: incident.domain })
      });
      // Simulate progress for UI
      setTimeout(() => setDispatching(false), 3000);
    } catch (err) {
      setDispatching(false);
    }
  };

  return (
    <div
      className={`panel incident-card-main ${hicsMode ? 'hics-card' : ''}`}
      style={{
        borderLeft: `4px solid ${color}`,
        opacity: isResolved ? 0.6 : 1,
        background: hicsMode ? 'rgba(255,255,255,0.02)' : 'var(--panel-bg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
          <div className={`incident-icon-box ${incident.status === 'Pending' ? 'pulse-border' : ''}`} style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
             {incident.type === 'Fire' && <AlertCircle size={22} color={color} />}
             {(incident.type === 'Medical Emergency' || incident.type === 'Maintenance Issue') && <ActivityIcon color={color} />}
             {incident.type === 'Security Breach' && <ShieldAlert size={22} color={color} />}
             {incident.type === 'Other' && <AlertCircle size={22} color={color} />}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span className="tag-solid" style={{ background: color }}>{incident.type.toUpperCase()}</span>
              <span className={`tag status-${incident.status.replace(' ', '')}`}>{incident.status}</span>
              {incident.severityScore >= 7 && <span className="tag-panic">CRITICAL SEVERITY</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {new Date(incident.createdAt).toLocaleTimeString()}</span>
               <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px' }}>{incident.session?.sessionCode || 'SYS-AUTO'}</span>
               {incident.assignedToName && <span style={{ color: 'var(--accent-blue)' }}>● {incident.assignedToName}</span>}
            </div>
          </div>
        </div>

        <select
          value={incident.status}
          onChange={(e) => onStatusChange(incident.id, e.target.value)}
          className="status-dropdown"
        >
          <option value="Pending">Pending</option>
          <option value="Reviewed">Claimed</option>
          <option value="In Progress">Responding</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {hicsMode && (
         <div className="hics-strat-row">
            <div className="hics-strat-item">
               <label>Objective</label>
               <span>Life Safety & Containment</span>
            </div>
            <div className="hics-strat-item">
               <label>Tactical Priority</label>
               <span style={{ color: 'var(--accent-red)' }}>Immediate Evacuation</span>
            </div>
         </div>
      )}

      <div className="incident-body-grid">
         <div className="incident-text-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 'bold' }}>
               <MapPin size={14} /> {incident.floor || 'Unknown Location'}
               {resources.length > 0 && (
                  <span style={{ color: 'var(--success)', fontWeight: 'normal', fontSize: '0.75rem' }}>
                     (Nearby: {resources.find(r => r.floor === incident.floor)?.name || 'Check Map'})
                  </span>
               )}
            </div>
            <p className="description-text">{incident.description}</p>
         </div>

         <div className="response-actions-stack">
            {activeVideoFeed === incident.id ? (
               <button className="tool-btn video-active" onClick={() => setActiveVideoFeed(incident.id)}>
                  <Video size={16} /> VIEW LIVE TRIAGE
               </button>
            ) : (
               <button className="tool-btn disabled" disabled>
                  <Video size={16} /> VIDEO UNAVAILABLE
               </button>
            )}

            <button 
              className={`tool-btn dispatch ${dispatching ? 'loading' : ''}`} 
              onClick={handleDispatch}
              disabled={dispatching || isResolved}
            >
               {dispatching ? <RefreshCw size={14} className="spin-icon" /> : <Send size={14} />}
               {dispatching ? 'DISPATCHING...' : 'ESCALATE TO EMS'}
            </button>
         </div>
      </div>

      {incident.aiTriageInstructions && (
         <div className="ai-brief-box">
            <div className="ai-header"><Activity size={14} /> SYSTEM DIRECTIVE — AI INSTRUCTIONS (FOR INDIVIDUAL)</div>
            <p>{incident.aiTriageInstructions}</p>
         </div>
      )}

      {incident.suggestedResponse && (
         <div className="ai-brief-box" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
            <div className="ai-header" style={{ color: 'var(--accent-red)' }}>
               🤖 AI PROTOCOL RECOMMENDATION (FOR STAFF)
            </div>
            <p>{incident.suggestedResponse}</p>
         </div>
      )}

      {incident.uploadedMediaUrl && (
        <a href={`${API_BASE}${incident.uploadedMediaUrl}`} target="_blank" rel="noreferrer" className="media-link">
          <FileAudio size={14} /> View External Intelligence Evidence
        </a>
      )}

      {/* PDF Export — admin only */}
      {(user?.role === 'Administrator' || user?.role === 'Hotel Manager' || user?.role === 'Duty Manager' || user?.role === 'Admin') && (
        <button
          className="tool-btn"
          style={{ marginTop: '0.5rem', background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '0.75rem' }}
          onClick={() => {
            const token = localStorage.getItem('token');
            window.open(`${API_BASE}/api/report/incident/${incident.id}?token=${token}`, '_blank');
          }}
        >
          📄 Export PDF Report
        </button>
      )}
    </div>
  );
}

function ActivityIcon({ color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
