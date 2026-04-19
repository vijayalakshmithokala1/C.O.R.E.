import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, FileAudio, MapPin, CheckCircle, Clock, RefreshCw, Wifi, ShieldAlert, Trash2 } from 'lucide-react';
import { playIncidentAlarm, unlockAudio } from '../utils/alarm';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';

export default function MedicalDashboard({ socket, user }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { isHotel } = useDomain();

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
  }, [fetchIncidents]);

  // ── Socket listeners — re-attach whenever socket changes ──────
  useEffect(() => {
    if (!socket) return;

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

    // When socket reconnects, re-fetch to catch anything missed
    socket.on('connect', () => fetchIncidents(true));

    return () => {
      socket.off('new_incident', handleNew);
      socket.off('incident_updated', handleUpdate);
      socket.off('connect');
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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{isHotel ? 'Security & Maintenance Feed' : 'Live Incident Feed'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Wifi size={12} style={{ color: socket?.connected ? 'var(--success)' : 'var(--accent-red)' }} />
            {socket?.connected ? 'Live' : 'Disconnected'}
            {lastUpdated && (
              <span>· Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchIncidents(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

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

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <CheckCircle size={48} style={{ marginBottom: '1rem', color: 'var(--success)', opacity: 0.7 }} />
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>All Clear</h3>
          <p style={{ fontSize: '0.875rem' }}>
            No incidents reported yet.{' '}
            {user?.floors
              ? `You are monitoring: ${user.floors}`
              : 'You are monitoring all areas.'}
          </p>
          <button
            onClick={() => fetchIncidents(true)}
            style={{ marginTop: '1.5rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} /> Check for updates
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sorted.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onStatusChange={updateStatus}
              onDelete={deleteIncident}
              user={user}
              typeColor={typeColor}
              isHotel={isHotel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Incident Card ─────────────────────────────────────────────────
function IncidentCard({ incident, onStatusChange, onDelete, user, typeColor, isHotel }) {
  const color = typeColor[incident.type] || 'var(--accent-blue)';
  const isResolved = incident.status === 'Resolved';

  return (
    <div
      className="panel"
      style={{
        borderLeft: `3px solid ${color}`,
        opacity: isResolved ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: '8px',
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {incident.type === 'Fire' && <AlertCircle size={20} color={color} />}
            {incident.type === 'Medical Emergency' && <ActivityIcon color={color} />}
            {incident.type === 'Security Breach' && <ShieldAlert size={20} color={color} />}
            {incident.type === 'Maintenance Issue' && <ActivityIcon color={color} />}
            {incident.type === 'Other' && <AlertCircle size={20} color={color} />}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <span className={`tag ${incident.type.split(' ')[0]}`}>{incident.type}</span>
              <span className={`tag status-${incident.status.replace(' ', '')}`}>{incident.status}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={11} /> {new Date(incident.createdAt).toLocaleTimeString()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {incident.session?.name ? `${incident.session.name} (${incident.session.sessionCode})` : (incident.session?.sessionCode || 'UNKNOWN')}
              </span>
              {incident.assignedToName && (
                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                  Assigned: {incident.assignedToName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status changer */}
        <select
          value={incident.status}
          onChange={(e) => onStatusChange(incident.id, e.target.value)}
          style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.8rem', minWidth: 120, flexShrink: 0 }}
        >
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        
        {/* Delete/Archive button (Admins Only) */}
        {(user?.role === 'Administrator' || user?.role === 'Hotel Manager') && incident.status === 'Resolved' && (
          <button 
            onClick={() => onDelete(incident.id)}
            className="danger"
            style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Archive Incident"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Floor */}
      {incident.floor && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 600,
          background: 'rgba(245,158,11,0.1)', padding: '0.3rem 0.75rem',
          borderRadius: '20px', marginBottom: '0.75rem',
        }}>
          <MapPin size={13} /> {incident.floor}
        </div>
      )}

      {/* Description */}
      <p style={{
        background: 'var(--bg-color)',
        padding: '0.875rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--panel-border)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {incident.description}
      </p>

      {/* Media attachment */}
      {incident.uploadedMediaUrl && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--panel-border)' }}>
          <a
            href={`${API_BASE}${incident.uploadedMediaUrl}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-blue)' }}
          >
            <FileAudio size={14} /> View Attached Evidence
          </a>
        </div>
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
