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
  const { isHotel, terms } = useDomain();
  const [role, setRole] = useState(isHotel ? 'Maintenance' : 'Doctor');
  const [floors, setFloors] = useState('');

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
    
    if (user?.role === 'Administrator' || user?.role === 'Hotel Manager') {
      fetchData();
    }
  }, [section, user]);

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

  if (user?.role !== 'Administrator' && user?.role !== 'Hotel Manager') return <div>Unauthorized</div>;
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
                {isHotel ? (
                  <>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Hotel Manager">Hotel Manager</option>
                  </>
                ) : (
                  <>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Administrator">Administrator</option>
                  </>
                )}
              </select>
              {(role === 'Doctor' || role === 'Nurse' || role === 'Receptionist' || role === 'Maintenance' || role === 'Security') && (
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
          <h1 style={{ marginBottom: '2rem' }}>{terms.hospital} System Configuration</h1>
          <div className="panel">
            <h3>Geofence Constraints</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
              Setting this ensures that {terms.patient.toLowerCase()} portals can only submit incident reports when physically located within this radius around the {terms.hospital.toLowerCase()} center.
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
                </tr>
              </thead>
              <tbody>
                {data?.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.user?.name} <br/><span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{log.user?.role}</span></td>
                    <td><strong>{log.action}</strong></td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === 'analytics' && data && (
        <>
          <h1 style={{ marginBottom: '2rem' }}>Performance Analytics</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{data.totalIncidents}</div>
              <div style={{ color: 'var(--text-muted)' }}>Total Incidents</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{data.avgResponseTimeSeconds}s</div>
              <div style={{ color: 'var(--text-muted)' }}>Avg. Response Time</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>{data.activeStaff}</div>
              <div style={{ color: 'var(--text-muted)' }}>Active Staff Load</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
             <div className="panel">
                <h3>Incidents by Type</h3>
                <div style={{ marginTop: '1rem' }}>
                  {data.incidentsByType?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
             </div>
             
             <div className="panel">
                <h3>Incidents by Status</h3>
                <div style={{ marginTop: '1rem' }}>
                  {data.incidentsByStatus?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
                      <span>{item.name}</span>
                      <span className={`tag status-${item.name.replace(' ', '')}`}>{item.count}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
