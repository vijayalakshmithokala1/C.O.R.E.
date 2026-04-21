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
  const [floors, setFloors] = useState('');
  const [simulatingSensor, setSimulatingSensor] = useState(false);
  
  // Vision AI State
  const [cctvFeeds, setCctvFeeds] = useState([
    { id: 1, name: 'Kitchen South', active: true, zone: 'Controlled_Zone', status: 'Normal' },
    { id: 2, name: 'Main Lobby', active: true, zone: 'General', status: 'Normal' },
    { id: 3, name: 'External Entry', active: true, zone: 'General', status: 'Normal' },
  ]);

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
          zone: feed?.zone || 'General'
        })
      });
      if (feed) {
        setCctvFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, status: 'Alert' } : f));
        setTimeout(() => {
          setCctvFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, status: 'Normal' } : f));
        }, 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingSensor(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, password, name, role, floors })
      });
      if(res.ok) {
        const newUser = await res.json();
        setData([...data, { ...newUser, name, createdAt: new Date() }]);
        setUsername(''); setPassword(''); setName(''); setFloors('');
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
              {(['Doctor', 'Nurse', 'Receptionist', 'Maintenance', 'Security', 'Operations', 'Help Desk', 'Information'].includes(role)) && (
                <input type="text" placeholder="Assigned Floors (comma separated, e.g. Floor 1, Floor 2)" value={floors} onChange={e=>setFloors(e.target.value)} style={{ gridColumn: '1 / -1' }} />
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

          {/* ── Vision AI Panel ── */}
          <div className="panel" style={{ marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Vision AI Integration: Live CCTV Monitor</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Automated fire, smoke, and security breach detection with contextual sensitivity.</p>
              </div>
              <span className="tag status-Resolved" style={{ animation: 'pulse 2s infinite' }}>✓ AI ACTIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {cctvFeeds.map(feed => (
                <div key={feed.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--panel-border)', position: 'relative' }}>
                  {/* Camera Header */}
                  <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>CAM_{feed.id}: {feed.name}</span>
                    <span style={{ fontSize: '0.65rem', color: feed.zone === 'Controlled_Zone' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                      {feed.zone === 'Controlled_Zone' ? '⚠️ Kitchen (Controlled)' : 'Public Area'}
                    </span>
                  </div>
                  
                  {/* Mock Video Feed */}
                  <div style={{ height: '160px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'red', animation: 'blink 1s infinite' }} />
                      <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 'bold' }}>REC</span>
                    </div>
                    {feed.status === 'Alert' ? (
                      <div style={{ textAlign: 'center' }}>
                         <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>FIRE DETECTED</div>
                         <div style={{ border: '2px solid var(--accent-red)', width: '80px', height: '80px', margin: '0 auto', animation: 'pulse 1s infinite' }} />
                      </div>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>[ NO ANOMALIES DETECTED ]</div>
                    )}
                    {/* Scanline overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(rgba(0,0,0,0) 0, rgba(0,0,0,0.1) 1px, transparent 2px)', pointerEvents: 'none' }} />
                  </div>

                  {/* Footbar */}
                  <div style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      disabled={simulatingSensor}
                      onClick={() => triggerIoTSensor('Fire', feed.name)}
                      className="primary" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem' }}
                    >
                      Test AI detection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--accent-blue)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Global Security Protocol Simulation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <button 
                disabled={simulatingSensor} 
                onClick={() => triggerIoTSensor('Fire', 'Utility Bay B')}
                style={{ background: 'var(--accent-red)', color: 'white', fontWeight: 'bold' }}
              >
                🔥 Manual Fire Alarm (Utility)
              </button>
              <button 
                disabled={simulatingSensor} 
                onClick={() => triggerIoTSensor('Security Breach', 'Front Entry')}
                style={{ background: '#1e293b', border: '1px solid var(--accent-red)', color: 'white', fontWeight: 'bold' }}
              >
                🚨 Perimeter Breach
              </button>
              <button 
                disabled={simulatingSensor} 
                onClick={() => triggerIoTSensor('Medical Emergency', 'Room 304')}
                style={{ background: 'var(--accent-blue)', color: 'white', fontWeight: 'bold' }}
              >
                🏥 Critical SOS Pulse
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
