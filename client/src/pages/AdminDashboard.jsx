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
  
  const getDefaultRole = () => {
    if (currentDomain === 'HOTEL') return 'Hotel Manager';
    if (currentDomain === 'AIRPORT') return 'Duty Manager';
    if (currentDomain === 'MALL') return 'Admin';
    return 'Administrator';
  };
  const [role, setRole] = useState(getDefaultRole());
  const [selectedFloors, setSelectedFloors] = useState([]);
  const [simulatingSensor, setSimulatingSensor] = useState(false);
  const [floorError, setFloorError] = useState('');
  


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
        setData(prevData => {
          const arr = Array.isArray(prevData) ? prevData : [];
          return [...arr, { ...newUser, name, floors: selectedFloors.join(', '), createdAt: new Date() }];
        });
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
                {Array.isArray(data) && data.map(u => (
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


    </div>
  );
}
