import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import {
  AlertTriangle,
  MapPin,
  Camera,
  AlertCircle,
  Phone,
  X,
  CheckCircle,
  Wifi,
  WifiOff,
  Clock,
  FileText,
  ChevronDown,
  Send,
  Loader,
} from 'lucide-react';
import { playEmergencyBuzzAlarm, stopEmergencyBuzzAlarm, unlockAudio } from '../utils/alarm';

// Haversine formula — distance between two GPS points in metres
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const INCIDENT_TYPES = [
  { value: 'Medical Emergency', emoji: '🏥', label: 'Medical Emergency', color: '#f59e0b', desc: 'Requires immediate medical attention' },
  { value: 'Fire', emoji: '🔥', label: 'Fire / Smoke', color: '#ef4444', desc: 'Fire, smoke, or evacuation needed' },
  { value: 'Other', emoji: '⚡', label: 'Other Emergency', color: '#3b82f6', desc: 'Security, structural, or other threat' },
];

const FLOORS_HOSPITAL = ['Floor 1', 'Floor 2 — ICU', 'Floor 3 — General Ward', 'Floor 4 — Maternity', 'Ground Floor — Emergency'];
const FLOORS_HOTEL = ['Lobby', 'Floor 1', 'Floor 2', 'Floor 3', 'Roof', 'Parking / Basement'];

export default function PatientPortal() {
  const { sessionId } = useParams();

  // Session & config
  const [session, setSession] = useState(undefined); // undefined = loading, null = invalid
  const [config, setConfig] = useState(null);

  // Location
  const [geoStatus, setGeoStatus] = useState('checking'); // 'checking' | 'ok' | 'outside' | 'denied' | 'bypass'
  const [geoMessage, setGeoMessage] = useState('');

  // Form
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [type, setType] = useState('Medical Emergency');
  const [floor, setFloor] = useState('Floor 1');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isHotel = session?.domain === 'HOTEL';
  const terms = {
    patient: isHotel ? 'Guest' : 'Patient',
    medical: isHotel ? 'Maintenance Issue' : 'Medical Emergency',
    hospital: isHotel ? 'Hotel' : 'Hospital'
  };

  const INCIDENT_TYPES_DYNAMIC = isHotel ? [
    { value: 'Maintenance Issue', emoji: '🔧', label: 'Maintenance', color: '#f59e0b', desc: 'Plumbing, electrical, or structural issue' },
    { value: 'Fire', emoji: '🔥', label: 'Fire / Smoke', color: '#ef4444', desc: 'Fire, smoke, or evacuation needed' },
    { value: 'Security Breach', emoji: '🚨', label: 'Security', color: '#dc2626', desc: 'Security incident or intruder' },
    { value: 'Medical Emergency', emoji: '🏥', label: 'Medical Emergency', color: '#3b82f6', desc: 'Medical incident requiring staff' },
    { value: 'Other', emoji: '⚡', label: 'Other', color: '#8b5cf6', desc: 'Other assistance needed' },
  ] : [
    { value: 'Medical Emergency', emoji: '🏥', label: 'Medical Emergency', color: '#f59e0b', desc: 'Requires immediate medical attention' },
    { value: 'Fire', emoji: '🔥', label: 'Fire / Smoke', color: '#ef4444', desc: 'Fire, smoke, or evacuation needed' },
    { value: 'Other', emoji: '⚡', label: 'Other Emergency', color: '#3b82f6', desc: 'Security, structural, or other threat' },
  ];

  // Emergency alert from staff buzz
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Socket
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Socket connection ──────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;

    // Unlock AudioContext on first user tap (mobile-friendly)
    const unlock = () => { unlockAudio(); document.removeEventListener('touchstart', unlock); document.removeEventListener('click', unlock); };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    socket.on('connect', () => {
      // we only know session id. The domain comes later.
      // But we can join patient_${sessionId}
      socket.emit('join_room', `patient_${sessionId}`);
      // In a real app we'd wait for session load to join `patients_${session.domain}`
      // For now we will join it after session loads in a separate effect
    });

    socket.on('emergency_buzz', (data) => {
      setEmergencyAlert(data.message || 'CRITICAL EMERGENCY — Please follow staff instructions.');
      // 🔔 Play loud klaxon alarm
      playEmergencyBuzzAlarm();
    });

    socket.on('session_discharged', () => {
      setSession(null);
    });

    return () => {
      socket.disconnect();
      stopEmergencyBuzzAlarm(); // Stop alarm if leaving
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, [sessionId]);

  useEffect(() => {
    if (session && socketRef.current) {
      socketRef.current.emit('join_room', `patients_${session.domain}`);
    }
  }, [session]);

  // ─── Load session + config ─────────────────────────────────────
  useEffect(() => {
    fetch(`http://localhost:5000/api/session/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSession(data);
        // Also fetch config with correct domain
        fetch(`http://localhost:5000/api/session/config?domain=${data.domain}`)
          .then((r) => r.json())
          .then((cfg) => setConfig(cfg))
          .catch(() => setConfig({ geofenceLat: 0, geofenceLng: 0, geofenceRadius: 0 }));
      })
      .catch(() => setSession(null));
  }, [sessionId]);

  // ─── Geolocation check ─────────────────────────────────────────
  useEffect(() => {
    if (!config) return;

    // If geofence is not configured (all zeros), bypass the check
    if (config.geofenceLat === 0 && config.geofenceLng === 0) {
      setGeoStatus('bypass');
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus('denied');
      setGeoMessage('Geolocation is not supported by your browser.');
      return;
    }

    const check = () => {
      setGeoStatus('checking');
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const dist = getDistance(coords.latitude, coords.longitude, config.geofenceLat, config.geofenceLng);
          if (dist <= config.geofenceRadius) {
            setGeoStatus('ok');
          } else {
            setGeoStatus('outside');
            setGeoMessage(`You appear to be ${Math.round(dist)}m from the ${terms.hospital.toLowerCase()}.`);
          }
        },
        () => {
          setGeoStatus('denied');
          setGeoMessage('Please allow location access to use this portal.');
        },
        { maximumAge: 30000, timeout: 10000 }
      );
    };

    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [config]);

  // ─── Form submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const canSubmit = geoStatus === 'ok' || geoStatus === 'bypass';
    if (!canSubmit) return;
    if (!description.trim()) { setFormError('Please provide a description.'); return; }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('type', type);
    fd.append('description', description.trim());
    fd.append('sessionId', sessionId);
    if (type === 'Medical Emergency' || isHotel) fd.append('floor', floor);
    if (file) fd.append('media', file);

    try {
      const res = await fetch('http://localhost:5000/api/incident', { method: 'POST', body: fd });
      if (res.ok) {
        setStep('success');
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setFormError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = INCIDENT_TYPES_DYNAMIC.find((t) => t.value === type) || INCIDENT_TYPES_DYNAMIC[0];

  // ─── Render states ──────────────────────────────────────────────

  // Loading
  if (session === undefined) {
    return (
      <div className="portal-shell">
        <div className="portal-loading">
          <div className="portal-spinner" />
          <p>Verifying session...</p>
        </div>
      </div>
    );
  }

  // Invalid / discharged
  if (session === null) {
    return (
      <div className="portal-shell">
        <div className="portal-invalid">
          <div className="portal-invalid-icon">
            <AlertTriangle size={40} />
          </div>
          <h2>Session Ended</h2>
          <p>This QR code is no longer active. You have been discharged or the session expired.</p>
          <p className="portal-invalid-sub">Thank you for visiting. We wish you a speedy recovery.</p>
        </div>
      </div>
    );
  }

  // Main portal
  return (
    <div className="portal-shell">

      {/* ── Emergency Buzz Overlay ── */}
      {emergencyAlert && (
        <div className="portal-buzz-overlay">
          <div className="portal-buzz-card">
            <div className="portal-buzz-icon">
              <AlertCircle size={56} />
            </div>
            <h1>Emergency Alert</h1>
            <p>{emergencyAlert}</p>
            <div className="portal-buzz-instruction">
              Follow all staff instructions immediately.<br />
              Proceed to your nearest exit or muster point.
            </div>
            <button className="portal-buzz-dismiss" onClick={() => {
              setEmergencyAlert(null);
              stopEmergencyBuzzAlarm();
            }}>
              ✓ Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="portal-header-bar">
        <div className="portal-logo">
          <span className="portal-logo-core">C.O.R.E.</span>
          <span className="portal-logo-sub">{terms.patient} Portal</span>
        </div>
        <div className="portal-patient-badge">
          <span className="portal-patient-code">{session.sessionCode}</span>
          <GeoIndicator status={geoStatus} />
        </div>
      </header>

      {/* ── Body ── */}
      <main className="portal-body">

        {/* Success state */}
        {step === 'success' && (
          <div className="portal-success-card">
            <div className="portal-success-icon">
              <CheckCircle size={48} />
            </div>
            <h2>Report Received</h2>
            <p>{terms.hospital} staff have been alerted and are responding. Please remain calm and stay where you are unless instructed otherwise.</p>
            <button
              className="portal-btn-outline"
              onClick={() => { setStep('form'); setDescription(''); setFile(null); }}
            >
              Submit Another Report
            </button>
          </div>
        )}

        {/* Geofence block */}
        {step === 'form' && (geoStatus === 'outside' || geoStatus === 'denied') && (
          <div className="portal-geo-block">
            <div className="portal-geo-icon">
              {geoStatus === 'denied' ? <WifiOff size={40} /> : <MapPin size={40} />}
            </div>
            <h3>{geoStatus === 'denied' ? 'Location Access Required' : `Outside ${terms.hospital} Perimeter`}</h3>
            <p>{geoMessage}</p>
            {geoStatus === 'denied' && (
              <p className="portal-geo-hint">Enable location access in your browser settings, then refresh this page.</p>
            )}
          </div>
        )}

        {/* Checking */}
        {step === 'form' && geoStatus === 'checking' && (
          <div className="portal-geo-checking">
            <Loader size={28} className="spin-icon" />
            <p>Verifying your location...</p>
          </div>
        )}

        {/* Main form */}
        {step === 'form' && (geoStatus === 'ok' || geoStatus === 'bypass') && (
          <form className="portal-form" onSubmit={handleSubmit}>

            <div className="portal-section-label">
              <FileText size={14} /> Incident Type
            </div>

            {/* Type selector pills */}
            <div className="portal-type-grid">
              {INCIDENT_TYPES_DYNAMIC.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`portal-type-pill ${type === t.value ? 'active' : ''}`}
                  style={{ '--pill-color': t.color }}
                  onClick={() => setType(t.value)}
                >
                  <span className="pill-emoji">{t.emoji}</span>
                  <span className="pill-label">{t.label}</span>
                  <span className="pill-desc">{t.desc}</span>
                </button>
              ))}
            </div>

            {/* Floor selector — only for Medical in Hospital, or Always in Hotel */}
            {(type === 'Medical Emergency' || isHotel) && (
              <div className="portal-field">
                <label className="portal-section-label">
                  <MapPin size={14} /> Your Location / Floor
                </label>
                <div className="portal-select-wrap">
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    required
                    className="portal-select"
                  >
                    {(isHotel ? FLOORS_HOTEL : FLOORS_HOSPITAL).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="portal-select-icon" />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="portal-field">
              <label className="portal-section-label">
                <FileText size={14} /> Description
              </label>
              <textarea
                className="portal-textarea"
                rows={4}
                placeholder={
                  type === 'Medical Emergency'
                    ? 'Describe symptoms or the nature of the emergency...'
                    : type === 'Fire'
                    ? 'Describe what you see — smoke location, scale...'
                    : 'Describe the emergency situation...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* File upload */}
            <div className="portal-field">
              <label className="portal-section-label">
                <Camera size={14} /> Attach Photo / Video (Optional)
              </label>
              <label className="portal-file-label" onClick={() => fileInputRef.current?.click()}>
                <Camera size={20} />
                {file ? (
                  <span>{file.name}</span>
                ) : (
                  <span>Tap to attach evidence</span>
                )}
                {file && (
                  <button
                    type="button"
                    className="portal-file-clear"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            {formError && (
              <div className="portal-form-error">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}

            <button
              type="submit"
              className="portal-submit-btn"
              disabled={submitting}
              style={{ '--accent': selectedType.color }}
            >
              {submitting ? (
                <>
                  <Loader size={20} className="spin-icon" /> Sending Alert...
                </>
              ) : (
                <>
                  <Send size={20} /> Send Emergency Report
                </>
              )}
            </button>

            <p className="portal-disclaimer">
              This report will be sent immediately to the relevant {terms.hospital.toLowerCase()} staff on duty.
            </p>
          </form>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="portal-footer">
        <Clock size={12} />
        Session active · {session.sessionCode}
      </footer>
    </div>
  );
}

// ─── Geo status indicator chip ─────────────────────────────────────────────
function GeoIndicator({ status }) {
  const map = {
    ok: { icon: <Wifi size={11} />, label: 'In Range', cls: 'geo-ok' },
    bypass: { icon: <Wifi size={11} />, label: 'Unlocked', cls: 'geo-ok' },
    checking: { icon: <Loader size={11} className="spin-icon" />, label: 'Checking', cls: 'geo-checking' },
    outside: { icon: <MapPin size={11} />, label: 'Out of Range', cls: 'geo-outside' },
    denied: { icon: <WifiOff size={11} />, label: 'No Location', cls: 'geo-denied' },
  };
  const s = map[status] || map.checking;
  return (
    <span className={`portal-geo-chip ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
