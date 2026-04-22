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
import API_BASE from '../utils/api';
import { useDomain } from '../context/DomainContext';
import { getTranslator } from '../utils/translations';

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

export default function PatientPortal() {
  const { sessionId } = useParams();
  const { domain: contextDomain, terms, DOMAINS } = useDomain();

  // Session & config
  const [session, setSession] = useState(undefined); // undefined = loading, null = invalid
  const [config, setConfig] = useState(null);

  // Location
  const [geoStatus, setGeoStatus] = useState('checking'); // 'checking' | 'ok' | 'outside' | 'denied' | 'bypass'
  const [geoMessage, setGeoMessage] = useState('');

  // Form
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [type, setType] = useState('Medical Emergency');
  const [locationDetails, setLocationDetails] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeIncident, setActiveIncident] = useState(null);
  const [timeSinceCreation, setTimeSinceCreation] = useState(0);
  const [language, setLanguage] = useState('en');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Video Triage
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef(null);

  // Translation helper
  const t = getTranslator(language);

  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'te', label: 'తెలుగు', flag: '🇮🇳' }
  ];

  const INCIDENT_TYPES_DYNAMIC = (session?.domain === 'HOTEL' || contextDomain === 'HOTEL') ? [
    { value: 'Maintenance Issue', emoji: '🔧', label: t('maintenance'), color: '#f59e0b', desc: t('reqMaintenance') },
    { value: 'Fire', emoji: '🔥', label: t('fireSmoke'), color: '#ef4444', desc: t('reqFire') },
    { value: 'Security Breach', emoji: '🚨', label: t('security'), color: '#dc2626', desc: t('reqSecurity') },
    { value: 'Medical Emergency', emoji: '🏥', label: t('medicalEmergency'), color: '#3b82f6', desc: t('medicalStaff') },
    { value: 'Other', emoji: '⚡', label: t('other'), color: '#8b5cf6', desc: t('reqOther') },
  ] : (session?.domain === 'AIRPORT' ? [
    { value: 'Medical Emergency', emoji: '🏥', label: t('medicalEmergency'), color: '#f59e0b', desc: t('passengerMedical') },
    { value: 'Fire', emoji: '🔥', label: t('fireSmoke'), color: '#ef4444', desc: t('terminalSmoke') },
    { value: 'Security Breach', emoji: '🚨', label: t('securityThreat'), color: '#dc2626', desc: t('unattendedBag') },
    { value: 'Other', emoji: '⚡', label: t('operationsAlert'), color: '#3b82f6', desc: t('otherTerminal') },
  ] : (session?.domain === 'MALL' ? [
    { value: 'Medical Emergency', emoji: '🏥', label: t('medicalEmergency'), color: '#f59e0b', desc: t('shopperMedical') },
    { value: 'Fire', emoji: '🔥', label: t('fireSmoke'), color: '#ef4444', desc: t('mallFire') },
    { value: 'Security Breach', emoji: '🚨', label: t('securityAlert'), color: '#dc2626', desc: t('mallSecurity') },
    { value: 'Maintenance Issue', emoji: '🔧', label: t('maintenance'), color: '#3b82f6', desc: t('mallMaintenance') },
  ] : [
    { value: 'Medical Emergency', emoji: '🏥', label: t('medicalEmergency'), color: '#f59e0b', desc: t('reqMedical') },
    { value: 'Fire', emoji: '🔥', label: t('fireSmoke'), color: '#ef4444', desc: t('reqFire') },
    { value: 'Other', emoji: '⚡', label: t('otherEmergency'), color: '#3b82f6', desc: t('reqOther') },
  ]));

  // Emergency alert from staff buzz
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Socket
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Video Stream Simulation ───────────────────────────────────
  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreaming(true);
      socketRef.current.emit('incident_video_start', { incidentId: activeIncident.id, sessionId, domain: contextDomain });
    } catch (err) {
      alert("Camera access required for Video Triage simulation.");
    }
  };

  const stopVideoStream = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
    socketRef.current.emit('incident_video_stop', { incidentId: activeIncident.id, domain: contextDomain });
  };

  // ─── Socket connection ──────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    // Unlock AudioContext on first user tap (mobile-friendly)
    const unlock = () => { unlockAudio(); document.removeEventListener('touchstart', unlock); document.removeEventListener('click', unlock); };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    socket.on('connect', () => {
      socket.emit('join_room', `patient_${sessionId}`);
    });

    socket.on('emergency_buzz', (data) => {
      setEmergencyAlert(data.message || 'CRITICAL EMERGENCY — Please follow staff instructions.');
      playEmergencyBuzzAlarm();
    });

    socket.on('session_discharged', () => {
      setSession(null);
    });

    socket.on('incident_updated', (updatedIncident) => {
       setActiveIncident(prev => {
          if (!prev || prev.id !== updatedIncident.id) return prev;
          return updatedIncident;
       });
    });

    return () => {
      socket.disconnect();
      stopEmergencyBuzzAlarm();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
      if (streaming) stopVideoStream();
    };
  }, [sessionId]);

  useEffect(() => {
    if (session && socketRef.current) {
      socketRef.current.emit('join_room', `patients_${session.domain}`);
      socketRef.current.emit('join_room', `patient_${sessionId}`);
    }
  }, [session]);

  // ─── 3 Minute Escalation Timer ─────────────────────────────────
  useEffect(() => {
    let interval;
    if (activeIncident && activeIncident.status !== 'Resolved') {
      interval = setInterval(() => {
         const diff = Date.now() - new Date(activeIncident.createdAt).getTime();
         setTimeSinceCreation(diff);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeIncident]);

  // ─── Load session + config ─────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/session/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSession(data);
        fetch(`${API_BASE}/api/session/config?domain=${data.domain}`)
          .then((r) => r.json())
          .then((cfg) => setConfig(cfg))
          .catch(() => setConfig({ geofenceLat: 0, geofenceLng: 0, geofenceRadius: 0 }));
      })
      .catch(() => setSession(null));
  }, [sessionId]);

  // ─── Geolocation check ─────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    if (config.geofenceLat === 0 && config.geofenceLng === 0) {
      setGeoStatus('bypass');
      return;
    }
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      setGeoMessage(t('geoNotSupported'));
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
            setGeoMessage(`You appear to be ${Math.round(dist)}m from the ${terms.label.toLowerCase()} center.`);
          }
        },
        () => {
          setGeoStatus('denied');
          setGeoMessage(t('allowLocation'));
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
    if (!description.trim()) { setFormError(t('provideDescription')); return; }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('type', type);
    fd.append('description', description.trim());
    fd.append('sessionId', sessionId);
    fd.append('floor', `Location: ${locationDetails}`.trim());
    if (file) fd.append('media', file);
    try {
      const res = await fetch(`${API_BASE}/api/incident`, { method: 'POST', body: fd });
      if (res.ok) {
        const createdData = await res.json();
        setActiveIncident(createdData);
        setStep('success');
      } else {
        const err = await res.json();
        setFormError(err.error || t('failedSubmit'));
      }
    } catch {
      setFormError(t('networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/incident/${activeIncident.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment })
      });
      if (res.ok) setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  if (session === undefined) return <div className="portal-shell"><div className="portal-loading"><div className="portal-spinner" /><p>{t('verifying')}</p></div></div>;
  if (session === null) return <div className="portal-shell"><div className="portal-invalid"><div className="portal-invalid-icon"><AlertTriangle size={40} /></div><h2>{t('sessionEnded')}</h2><p>{t('sessionExpired')}</p><p className="portal-invalid-sub">{t('thankYou')}</p></div></div>;

  const isResolved = activeIncident?.status === 'Resolved';

  return (
    <div className="portal-shell">
      {emergencyAlert && (
        <div className="portal-buzz-overlay">
          <div className="portal-buzz-card">
            <div className="portal-buzz-icon"><AlertCircle size={56} /></div>
            <h1>{t('emergencyAlert')}</h1>
            <p>{emergencyAlert}</p>
            <div className="portal-buzz-instruction">{t('followInstructions')}<br />{t('proceedExit')}</div>
            <button className="portal-buzz-dismiss" onClick={() => { setEmergencyAlert(null); stopEmergencyBuzzAlarm(); }}>{t('acknowledge')}</button>
          </div>
        </div>
      )}

      <header className="portal-header-bar">
        <div className="portal-logo"><span className="portal-logo-core">C.O.R.E.</span><span className="portal-logo-sub">{t('portalTitle')}</span></div>
        <div className="portal-patient-badge">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '0.2rem', fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-main)' }}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
          </div>
          <span className="portal-patient-code">{session.sessionCode}</span>
          <GeoIndicator status={geoStatus} />
        </div>
      </header>

      <main className="portal-body">
        {step === 'success' && activeIncident && (
          <div className="portal-success-card">
            <div className="portal-success-icon"><CheckCircle size={48} color={isResolved ? 'var(--success)' : 'var(--accent-amber)'} /></div>
            <h2>{isResolved ? t('situationResolved') : t('sosTransmitted')}</h2>
            
            {activeIncident.status === 'Pending' && <p style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>{t('alertBroadcasted')} {terms.label} {t('helpComing')}</p>}
            
            {(activeIncident.status === 'Reviewed' || activeIncident.status === 'In Progress') && (
               <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent-blue)' }}>{t('responderEnRoute')}</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>{t('assigned')}: <strong style={{ color: 'var(--text-main)' }}>{activeIncident.assignedToName || t('responseTeam')}</strong></p>
               </div>
            )}

            {/* Video Triage Section */}
            {!isResolved && activeIncident.status !== 'Pending' && (
              <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '1rem' }}>
                  📹 {t('videoTriage')}
                </div>
                {streaming ? (
                  <div style={{ position: 'relative' }}>
                    <video ref={videoRef} autoPlay playsInline muted className="live-camera-feed" style={{ width: '100%', borderRadius: '8px', background: '#000', minHeight: '200px' }} />
                    <div className="stream-badge">{t('liveFeed')}</div>
                    <button onClick={stopVideoStream} className="danger" style={{ width: '100%', marginTop: '0.75rem' }}>{t('disconnectVideo')}</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('enableVideo')} {terms.label} staff.</p>
                    <button onClick={startVideoStream} className="primary" style={{ width: '100%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      📹 {t('startVideo')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isResolved && (
               <div className="portal-feedback-section">
                  <p>{t('resolved')}</p>
                  {!feedbackSubmitted ? (
                    <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid var(--panel-border)' }}>
                       <p style={{ fontWeight: 'bold' }}>{t('rateResponse')}</p>
                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
                          {[1,2,3,4,5].map(num => <button key={num} type="button" onClick={() => setFeedbackRating(num)} style={{ padding: '0.5rem', background: feedbackRating >= num ? 'var(--accent-amber)' : 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '4px' }}>⭐</button>)}
                       </div>
                       <textarea placeholder={t('comments')} value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.5rem' }} />
                       <button onClick={handleFeedback} className="primary" style={{ width: '100%', padding: '0.5rem' }}>{t('submitFeedback')}</button>
                    </div>
                  ) : <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>{t('feedbackSent')}</p>}
               </div>
            )}

            {activeIncident.aiTriageInstructions && (
               <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', padding: '1rem', borderRadius: '8px', margin: '1rem 0', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', marginBottom: '0.5rem', fontWeight: 'bold' }}><AlertCircle size={18} /> {t('aiInstructions')}</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{activeIncident.aiTriageInstructions}</p>
               </div>
            )}

            <button className="portal-btn-outline" style={{ marginTop: '1rem' }} onClick={() => { setStep('form'); setDescription(''); setFile(null); setActiveIncident(null); setTimeSinceCreation(0); if (streaming) stopVideoStream(); }}>{t('reportAnother')}</button>
          </div>
        )}

        {step === 'form' && (geoStatus === 'outside' || geoStatus === 'denied') && (
          <div className="portal-geo-block">
            <div className="portal-geo-icon">{geoStatus === 'denied' ? <WifiOff size={40} /> : <MapPin size={40} />}</div>
            <h3>{geoStatus === 'denied' ? t('locationRequired') : t('outsidePerimeter')}</h3>
            <p>{geoMessage}</p>
          </div>
        )}

        {step === 'form' && geoStatus === 'checking' && <div className="portal-geo-checking"><Loader size={28} className="spin-icon" /><p>{t('verifyingLocation')}</p></div>}

        {step === 'form' && (geoStatus === 'ok' || geoStatus === 'bypass') && (
          <form className="portal-form" onSubmit={handleSubmit}>
            <div className="portal-section-label"><FileText size={14} /> {t('emergencyCategory')}</div>
            <div className="portal-type-grid">
              {INCIDENT_TYPES_DYNAMIC.map((tp) => (
                <button key={tp.value} type="button" className={`portal-type-pill ${type === tp.value ? 'active' : ''}`} style={{ '--pill-color': tp.color }} onClick={() => setType(tp.value)}>
                  <span className="pill-emoji">{tp.emoji}</span><span className="pill-label">{tp.label}</span><span className="pill-desc">{tp.desc}</span>
                </button>
              ))}
            </div>
            <div className="portal-section-label"><MapPin size={14} /> {t('locationDetails')}</div>
            <div className="portal-select-wrap">
              <select className="portal-select" value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} required>
                <option value="">{t('selectFloor')}</option>
                {DOMAINS[session.domain || contextDomain]?.floors?.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="Other / Outside">{t('otherOutside')}</option>
              </select>
              <ChevronDown className="portal-select-icon" size={18} />
            </div>

            <div className="portal-section-label"><AlertCircle size={14} /> {t('situationBriefing')}</div>
            <textarea 
              className="portal-textarea" 
              placeholder={t('describePlaceholder')} 
              rows={4} value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              required 
            />

            <div className="portal-section-label"><Camera size={14} /> {t('evidencePhoto')}</div>
            <label className="portal-file-label">
              <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} accept="image/*,video/*,audio/*" />
              {file ? (
                <>
                  <FileText size={18} /> <span style={{ flex: 1 }}>{file.name}</span>
                  <button type="button" className="portal-file-clear" onClick={(e) => { e.preventDefault(); setFile(null); fileInputRef.current.value = ''; }}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <><Camera size={18} /> {t('tapAttach')}</>
              )}
            </label>

            {formError && <div className="portal-form-error"><AlertTriangle size={16} /> {formError}</div>}

            <button type="submit" className="portal-submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader size={24} className="spin-icon" /> {t('transmitting')}
                </>
              ) : (
                <>
                  <AlertCircle size={24} /> {t('sendSOS')}
                </>
              )}
            </button>

            <p className="portal-disclaimer">
              {t('disclaimer')} {terms.label} {t('staffOnDuty')}
            </p>
          </form>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="portal-footer">
        <Clock size={12} />
        {t('sessionActive')} · {session.sessionCode}
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
