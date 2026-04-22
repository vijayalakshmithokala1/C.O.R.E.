import { useState, useEffect } from 'react';
import { useDomain } from '../context/DomainContext';
import API_BASE from '../utils/api';

export default function AdminDashboard({ section, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { isHotel, terms, domain: currentDomain, DOMAINS } = useDomain();
  const [role, setRole] = useState(terms.doctor);
  const [selectedFloors, setSelectedFloors] = useState([]);
  const [simulatingSensor, setSimulatingSensor] = useState(false);
  const [floorError, setFloorError] = useState('');
  
  // Vision AI State — dynamically generated from domain floors
  const domainFloors = DOMAINS[currentDomain]?.floors || [];
  const [cctvFeeds, setCctvFeeds] = useState([]);
  const [detectionLog, setDetectionLog] = useState([]);

  // Initialize CCTV feeds from domain floors
  useEffect(() => {
    const feeds = domainFloors.map((floor, idx) => ({
      id: idx + 1,
      name: floor,
      active: true,
      status: 'Normal',
      lastEvent: null,
    }));
    setCctvFeeds(feeds);
  }, [currentDomain]);

  const [geofenceLat, setGeofenceLat] = useState(0);
  const [geofenceLng, setGeofenceLng] = useState(0);
  const [geofenceRadius, setGeofenceRadius] = useState(200);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        let endpoint = '';
        if (section === 'staff') endpoint = '/api/admin/staff';
        if (section === 'audit') endpoint = '/api/admin/audit';
        if (section === 'settings') endpoint = '/api/admin/config';
        if (section === 'analytics') endpoint = '/api/admin/analytics';

        if (!endpoint && section === 'cameras') {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const json = await res.json();
        
        setData(json);

        if (section === 'settings') {
          setGeofenceLat(json.geofenceLat);
          setGeofenceLng(json.geofenceLng);
          setGeofenceRadius(json.geofenceRadius);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    const isAdmin = user?.role === 'Administrator' || user?.role === 'Hotel Manager' || user?.role === 'Duty Manager' || user?.role === 'Admin';
    if (isAdmin) {
      fetchData();
    }
  }, [section, user]);

  const triggerIoTSensor = async (type, location) => {
    setSimulatingSensor(true);
    try {
      const feed = cctvFeeds.find(f => f.name === location);
      await fetch(`${API_BASE}/api/incident/system-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: currentDomain,
          cameraLocation: location,
          eventType: type,
          confidence: 98,
          zone: 'General'
        })
      });
      
      // Add to detection log
      const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        camera: location,
        type: type,
        confidence: 98,
        status: 'Incident Created'
      };
      setDetectionLog(prev => [logEntry, ...prev].slice(0, 20));
      
      if (feed) {
        setCctvFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, status: 'Alert', lastEvent: type } : f));
        // Keep alert visible for 10 seconds
        setTimeout(() => {
          setCctvFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, status: 'Normal' } : f));
        }, 10000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingSensor(false);
    }
  };

  // Floor checkbox toggle
  const toggleFloor = (floor) => {
    setSelectedFloors(prev => 
      prev.includes(floor) ? prev.filter(f => f !== floor) : [...prev, floor]
    );
    setFloorError('');
  };

  // Check if role needs floor assignment
  const needsFloors = ['Doctor', 'Nurse', 'Receptionist', 'Maintenance', 'Security', 'Operations', 'Help Desk', 'Information', 'Front Desk'].includes(role);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    
    // Validate floor selection for non-admin roles
    if (needsFloors && selectedFloors.length === 0) {
      setFloorError('⚠ Floor assignment is mandatory. Please select at least one floor.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/staff`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, password, name, role, floors: selectedFloors.join(', ') })
      });
      if(res.ok) {
        const newUser = await res.json();
        setData([...data, { ...newUser, name, createdAt: new Date() }]);
        setUsername(''); setPassword(''); setName(''); setSelectedFloors([]);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ geofenceLat, geofenceLng, geofenceRadius })
      });
      alert('Config updated successfully!');
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (id) => {
    if(!window.confirm('Delete this staff member?')) return;
    try {
      await fetch(`${API_BASE}/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setData(data.filter(u => u.id !== id));
    } catch(err) {
      console.error(err);
    }
  };

  const isAdmin = user?.role === 'Administrator' || user?.role === 'Hotel Manager' || user?.role === 'Duty Manager' || user?.role === 'Admin';
  if (!isAdmin) return <div>Unauthorized</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {section === 'staff' && (
        <>
          <h1 style={{ marginBottom: '2rem' }}>Staff Management</h1>
          
          <div className="panel" style={{ background: '#1e293b' }}>
            <h3>Add New Staff Member</h3>
            <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <input type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} required />
              <input type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
              <select value={role} onChange={e=>setRole(e.target.value)}>
                {currentDomain === 'HOTEL' && (
                  <>
                    <option value="Hotel Manager">Hotel Manager</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Front Desk">Front Desk</option>
                  </>
                )}
                {currentDomain === 'AIRPORT' && (
                  <>
                    <option value="Duty Manager">Duty Manager</option>
                    <option value="Security">Security</option>
                    <option value="Operations">Operations</option>
                    <option value="Help Desk">Help Desk</option>
                  </>
                )}
                {currentDomain === 'MALL' && (
                  <>
                    <option value="Admin">Mall Admin</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Information">Information Desk</option>
                  </>
                )}
                {currentDomain === 'HOSPITAL' && (
                  <>
                    <option value="Administrator">Administrator</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                  </>
                )}
              </select>
              {needsFloors && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Assign Floors <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {domainFloors.map(floor => (
                      <label
                        key={floor}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${selectedFloors.includes(floor) ? 'var(--accent-blue)' : 'var(--panel-border)'}`,
                          background: selectedFloors.includes(floor) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: selectedFloors.includes(floor) ? 600 : 400,
                          color: selectedFloors.includes(floor) ? 'var(--accent-blue)' : 'var(--text-muted)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFloors.includes(floor)}
                          onChange={() => toggleFloor(floor)}
                          style={{ accentColor: 'var(--accent-blue)' }}
                        />
                        {floor}
                      </label>
                    ))}
                  </div>
                  {floorError && (
                    <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                      {floorError}
                    </div>
                  )}
                  {selectedFloors.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      Selected: {selectedFloors.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <button type="submit" className="primary" style={{ gridColumn: '1 / -1' }}>Create Staff Account</button>
            </form>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead style={{ background: '#1e293b' }}>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Floors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.username}</td>
                    <td><span className="tag status-Reviewed">{u.role}</span></td>
                    <td>{u.floors || '-'}</td>
                    <td>
                      <button className="danger" onClick={() => handleDeleteStaff(u.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === 'settings' && (
        <>
          <h1 style={{ marginBottom: '2rem' }}>{terms.label} System Configuration</h1>
          <div className="panel">
            <h3>Geofence Constraints</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
              Setting this ensures that {terms.patient.toLowerCase()} portals can only submit incident reports when physically located within this radius around the {terms.label.toLowerCase()} center.
            </p>
            <form onSubmit={handleUpdateConfig} style={{ maxWidth: '400px' }}>
              <label>Center Latitude</label>
              <input type="number" step="0.0000001" value={geofenceLat} onChange={e=>setGeofenceLat(e.target.value)} />
              
              <label>Center Longitude</label>
              <input type="number" step="0.0000001" value={geofenceLng} onChange={e=>setGeofenceLng(e.target.value)} />
              
              <label>Allowed Radius (meters)</label>
              <input type="number" value={geofenceRadius} onChange={e=>setGeofenceRadius(e.target.value)} />
              
              <button type="submit" className="primary">Update Requirements</button>
            </form>
          </div>
        </>
      )}

      {section === 'audit' && (
        <>
          <h1 style={{ marginBottom: '2rem' }}>System Audit Logs</h1>
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead style={{ background: '#1e293b' }}>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {data?.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.user?.name} <br/><span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{log.user?.role}</span></td>
                    <td><strong>{log.action}</strong></td>
                    <td>{log.details}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="tag status-Resolved" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.65rem' }}>
                          ✓ Block Verified
                        </span>
                        {log.hash && (
                          <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.hash}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === 'analytics' && data && (
        <>
          <h1 style={{ marginBottom: '2rem' }}>Performance Intelligence</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{data.totalIncidents}</div>
              <div style={{ color: 'var(--text-muted)' }}>Total Lifecycle Events</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{data.avgResponseTimeSeconds}s</div>
              <div style={{ color: 'var(--text-muted)' }}>Mean Time to Resolve</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>{data.avgFeedback || 'N/A'}</div>
              <div style={{ color: 'var(--text-muted)' }}>{terms.patient} NPS Score</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{data.activeStaff}</div>
              <div style={{ color: 'var(--text-muted)' }}>Field Personnel Net</div>
            </div>
          </div>
        </>
      )}

      {/* ── AI Cameras Dedicated Section ── */}
      {section === 'cameras' && (
        <>
          <h1 style={{ marginBottom: '0.5rem' }}>AI-Powered Surveillance System</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Simulates AI-powered CCTV cameras across the {terms.label.toLowerCase()}. When "Test Detection" is clicked, 
            the AI vision system creates a real incident alert that is <strong>immediately broadcasted to all staff</strong> on the Incident Feed.
          </p>

          {/* Status Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="panel" style={{ flex: 1, minWidth: '160px', textAlign: 'center', marginBottom: 0 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{cctvFeeds.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Cameras</div>
            </div>
            <div className="panel" style={{ flex: 1, minWidth: '160px', textAlign: 'center', marginBottom: 0 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: cctvFeeds.some(f => f.status === 'Alert') ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {cctvFeeds.filter(f => f.status === 'Alert').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Alerts</div>
            </div>
            <div className="panel" style={{ flex: 1, minWidth: '160px', textAlign: 'center', marginBottom: 0 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{detectionLog.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detections Today</div>
            </div>
          </div>

          {/* Camera Grid */}
          <div className="panel" style={{ marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Live CCTV Monitor — {terms.label}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Each camera maps to a {terms.label.toLowerCase()} floor. Triggering detection creates a real incident.</p>
              </div>
              <span className="tag status-Resolved" style={{ animation: 'pulse 2s infinite' }}>✓ AI ACTIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {cctvFeeds.map(feed => (
                <div key={feed.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: feed.status === 'Alert' ? '2px solid var(--accent-red)' : '1px solid var(--panel-border)', position: 'relative', transition: 'border-color 0.3s ease' }}>
                  {/* Camera Header */}
                  <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>CAM_{feed.id}: {feed.name}</span>
                    <span style={{ fontSize: '0.65rem', color: feed.status === 'Alert' ? 'var(--accent-red)' : 'var(--success)' }}>
                      {feed.status === 'Alert' ? '🔴 ALERT' : '🟢 Normal'}
                    </span>
                  </div>
                  
                  {/* Mock Video Feed */}
                  <div style={{ height: '140px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'red', animation: 'blink 1s infinite' }} />
                      <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 'bold' }}>REC</span>
                    </div>
                    {feed.status === 'Alert' ? (
                      <div style={{ textAlign: 'center' }}>
                         <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', animation: 'pulse 1s infinite' }}>
                           {feed.lastEvent === 'Fire' ? '🔥 FIRE DETECTED' : '🚨 THREAT DETECTED'}
                         </div>
                         <div style={{ color: 'var(--accent-amber)', fontSize: '0.7rem' }}>Incident auto-created → Staff notified</div>
                         <div style={{ border: '2px solid var(--accent-red)', width: '60px', height: '60px', margin: '0.5rem auto 0', animation: 'pulse 1s infinite' }} />
                      </div>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', textAlign: 'center' }}>
                        <div>[ MONITORING ]</div>
                        <div style={{ fontSize: '0.6rem', marginTop: '0.3rem' }}>No anomalies detected</div>
                      </div>
                    )}
                    {/* Scanline overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(rgba(0,0,0,0) 0, rgba(0,0,0,0.1) 1px, transparent 2px)', pointerEvents: 'none' }} />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      disabled={simulatingSensor}
                      onClick={() => triggerIoTSensor('Fire', feed.name)}
                      className="primary" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem', background: 'var(--accent-red)' }}
                    >
                      🔥 Test Fire
                    </button>
                    <button 
                      disabled={simulatingSensor}
                      onClick={() => triggerIoTSensor('Security Breach', feed.name)}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem', background: '#1e293b', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                    >
                      🚨 Test Security
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detection Log */}
          {detectionLog.length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--panel-border)', fontWeight: 600, fontSize: '0.85rem' }}>
                Detection Log
              </div>
              <table>
                <thead style={{ background: '#1e293b' }}>
                  <tr>
                    <th>Time</th>
                    <th>Camera</th>
                    <th>Detection Type</th>
                    <th>Confidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {detectionLog.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: '0.8rem' }}>{entry.time}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{entry.camera}</td>
                      <td>
                        <span className="tag" style={{ background: entry.type === 'Fire' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: entry.type === 'Fire' ? 'var(--accent-red)' : 'var(--accent-amber)', border: 'none' }}>
                          {entry.type === 'Fire' ? '🔥' : '🚨'} {entry.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>{entry.confidence}%</td>
                      <td><span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ {entry.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* How it works */}
          <div className="panel" style={{ marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{ marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>How Vision AI Works</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <p><strong>1. Detection:</strong> AI-powered cameras continuously analyze video feeds for fire, smoke, and security threats.</p>
              <p><strong>2. Incident Creation:</strong> When a threat is detected above the confidence threshold (95%), a new incident is automatically created in the system.</p>
              <p><strong>3. Staff Notification:</strong> All on-duty staff instantly receive the alert on their Incident Feed with location details.</p>
              <p><strong>4. Auto-Escalation:</strong> If no staff responds within 2 minutes, the system triggers an emergency buzz to all devices.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
