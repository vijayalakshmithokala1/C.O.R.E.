import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, UserCheck, UserMinus, Download, Printer, X, Clock, CheckCircle, Users } from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';

// Helper to generate portal URL — uses the same origin in production
const getPortalUrl = (sessionId) =>
  `${window.location.origin}/portal/${sessionId}`;

export default function ReceptionDashboard({ socket, user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const qrRef = useRef(null);
  const { terms, isHotel } = useDomain();

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Listen for real-time discharge events
  useEffect(() => {
    if (!socket) return;
    socket.on('session_discharged', () => fetchSessions());
    return () => socket.off('session_discharged');
  }, [socket]);

  const handleCheckIn = async () => {
    const name = window.prompt(`Enter ${terms.patient} Name:`);
    if (name === null) return; // Cancelled

    setCheckingIn(true);
    try {
      const res = await fetch(`${API_BASE}/api/session/checkin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setSessions((prev) => [data, ...prev]);
      setSelectedSession(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDischarge = async (id) => {
    if (!window.confirm(`${terms.discharge} this ${terms.patient.toLowerCase()}? Their QR code will immediately deactivate.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/session/discharge/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const updated = await res.json();
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSession?.id === id) setSelectedSession(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintQR = () => {
    const url = getPortalUrl(selectedSession.id);
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>${terms.patient} QR — ${selectedSession.sessionCode}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            .card { border: 2px solid #000; border-radius: 12px; padding: 2rem; text-align: center; max-width: 320px; }
            .logo { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.1em; color: ${isHotel ? '#f59e0b' : '#ef4444'}; margin-bottom: 0.25rem; }
            .subtitle { font-size: 0.75rem; color: #666; margin-bottom: 1.5rem; }
            .code { font-family: monospace; font-size: 1.25rem; font-weight: bold; margin: 1rem 0 0.5rem; }
            .url { font-size: 0.65rem; color: #888; word-break: break-all; margin-top: 0.5rem; }
            .instr { font-size: 0.75rem; color: #444; margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
            svg { margin: 0 auto; display: block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">C.O.R.E. ${terms.label}</div>
            <div class="subtitle">Crisis Operations & Response Ecosystem</div>
            <div>Scan to access your ${terms.patient} Portal</div>
            ${qrRef.current?.outerHTML ?? ''}
            <div class="code">${selectedSession.sessionCode}</div>
            <div class="url">${url}</div>
            <div class="instr">Keep this QR code with you. Scan it on your mobile device for real-time emergency alerts and to report any incident during your stay at the ${terms.label}.</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const activeSessions = sessions.filter((s) => s.active);
  const dischargedCount = sessions.filter((s) => !s.active).length;

  if (loading)
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading {terms.patient.toLowerCase()} data...</p>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{terms.patient} Registration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage ${terms.patient.toLowerCase()} check-ins and generate QR access codes</p>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className="primary"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem' }}
        >
          <UserCheck size={18} />
          {checkingIn ? 'Generating...' : 'New Check-In'}
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Sessions', value: sessions.length, icon: <Users size={20} />, color: 'var(--accent-blue)' },
          { label: `Active ${terms.patients}`, value: activeSessions.length, icon: <CheckCircle size={20} />, color: 'var(--success)' },
          { label: 'Discharged Today', value: dischargedCount, icon: <Clock size={20} />, color: 'var(--text-muted)' },
        ].map((stat) => (
          <div key={stat.label} className="panel" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: stat.color }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* QR Modal */}
      {selectedSession && (
        <div className="qr-modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="qr-modal-close"
              onClick={() => setSelectedSession(null)}
              title="Close"
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ color: terms.label === 'Hospital' ? 'var(--accent-red)' : 'var(--accent-amber)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.1em' }}>
                C.O.R.E.
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{terms.patient} Portal Access Code</p>
            </div>

            {/* QR Code */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.25rem' }}>
              {selectedSession.active ? (
                <QRCodeSVG
                  ref={qrRef}
                  value={getPortalUrl(selectedSession.id)}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '', // optionally add a logo
                    excavate: false,
                  }}
                />
              ) : (
                <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  Session Discharged —<br />QR Deactivated
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                {selectedSession.sessionCode}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all', padding: '0 1rem' }}>
                {getPortalUrl(selectedSession.id)}
              </div>
            </div>

            {selectedSession.active && (
              <>
                <div className="qr-instruction-box">
                  <p>📱 Hand this to the {terms.patient.toLowerCase()} or their family. Scanning this code on a mobile device grants access to the emergency alert portal for this visit.</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    onClick={handlePrintQR}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Printer size={16} /> Print QR
                  </button>
                  <button
                    className="warning"
                    onClick={() => handleDischarge(selectedSession.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <UserMinus size={16} /> {terms.discharge}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{terms.patient} Sessions</span>
        </div>
        <table>
          <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
            <tr>
              <th>{terms.patient} Name</th>
              <th>Status</th>
              <th>Checked In</th>
              <th>{terms.discharge}d</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} style={{ opacity: s.active ? 1 : 0.55 }}>
                <td className="mono" style={{ fontWeight: 600 }}>
                  {s.name && <div style={{ color: 'var(--text-main)' }}>{s.name}</div>}
                  {!s.name && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending Name</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sessionCode}</div>
                </td>
                <td>
                  {s.active ? (
                    <span className="tag status-Resolved">● Active</span>
                  ) : (
                    <span className="tag status-Pending">{terms.discharge}d</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {s.dischargedAt ? new Date(s.dischargedAt).toLocaleString() : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedSession(s)}
                      title="View QR"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      <QrCode size={14} /> View QR
                    </button>
                    {s.active && (
                      <button
                        className="warning"
                        onClick={() => handleDischarge(s.id)}
                        title={terms.discharge}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                      >
                        <UserMinus size={14} /> {terms.discharge}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                  <br />
                  No {terms.patients.toLowerCase()} checked in yet. Click <strong>New Check-In</strong> to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
