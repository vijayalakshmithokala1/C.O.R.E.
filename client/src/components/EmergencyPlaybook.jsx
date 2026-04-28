import { useState } from 'react';
import { CheckCircle, Circle, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const PLAYBOOKS = {
  'Fire': [
    { id: 1, text: 'Confirm specific coordinates of smoke/fire source.', role: 'Security' },
    { id: 2, text: 'Initiate Floor Evacuation protocol for the affected zone.', role: 'All' },
    { id: 3, text: 'Isolate HVAC and gas lines for the floor.', role: 'Maintenance' },
    { id: 4, text: 'Verify all patients/guests in the floor are accounted for.', role: 'Nursing/Staff' },
    { id: 5, text: 'Clear path for Fire Department arrival.', role: 'Security' },
  ],
  'Medical Emergency': [
    { id: 1, text: 'Confirm patient/guest identity and medical history.', role: 'Doctor/Nurse' },
    { id: 2, text: 'Bring nearest crash cart or AED to the location.', role: 'All' },
    { id: 3, text: 'Stabilize patient and prepare for internal transport.', role: 'Doctor/Nurse' },
    { id: 4, text: 'Notify next of kin or emergency contact.', role: 'Receptionist' },
  ],
  'Security Breach': [
    { id: 1, text: 'Visual confirmation via CCTV if possible.', role: 'Security' },
    { id: 2, text: 'Initiate lockdown for the specific area/wing.', role: 'Security' },
    { id: 3, text: 'Move patients/guests to "Safe Rooms".', role: 'All' },
    { id: 4, text: 'Contact Law Enforcement with suspect descriptions.', role: 'Manager' },
  ],
  'Maintenance Issue': [
    { id: 1, text: 'Determine if electrical/water isolation is required.', role: 'Maintenance' },
    { id: 2, text: 'Mark area with hazard signs.', role: 'Maintenance' },
    { id: 3, text: 'Assess downtime and notify management.', role: 'Maintenance' },
  ],
  'Other': [
    { id: 1, text: 'Assess situation severity on-site.', role: 'Staff' },
    { id: 2, text: 'Notify relevant department manager.', role: 'Staff' },
    { id: 3, text: 'Document findings with photos/video.', role: 'Staff' },
  ]
};

export default function EmergencyPlaybook({ incidentType, onComplete }) {
  const tasks = PLAYBOOKS[incidentType] || PLAYBOOKS['Other'];
  const [completedTasks, setCompletedTasks] = useState([]);

  const toggleTask = (id) => {
    const newCompleted = completedTasks.includes(id)
      ? completedTasks.filter(tid => tid !== id)
      : [...completedTasks, id];
    
    setCompletedTasks(newCompleted);
    
    if (newCompleted.length === tasks.length && onComplete) {
      onComplete();
    }
  };

  const progress = Math.round((completedTasks.length / tasks.length) * 100);

  return (
    <div className="playbook-container" style={{ 
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid var(--panel-border)',
      borderRadius: '12px',
      padding: '1rem',
      marginTop: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="var(--success)" /> {incidentType} Playbook
        </h4>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {progress}% Complete
        </div>
      </div>

      <div style={{ height: '4px', background: 'var(--bg-main)', borderRadius: '2px', marginBottom: '1rem' }}>
        <div style={{ 
          height: '100%', 
          width: `${progress}%`, 
          background: 'var(--success)', 
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {tasks.map(task => (
          <div 
            key={task.id} 
            onClick={() => toggleTask(task.id)}
            style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              background: completedTasks.includes(task.id) ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            {completedTasks.includes(task.id) 
              ? <CheckCircle size={18} color="var(--success)" />
              : <Circle size={18} color="var(--text-muted)" />
            }
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '0.85rem', 
                textDecoration: completedTasks.includes(task.id) ? 'line-through' : 'none',
                color: completedTasks.includes(task.id) ? 'var(--text-muted)' : 'var(--text-main)'
              }}>
                {task.text}
              </div>
              <span style={{ 
                fontSize: '0.7rem', 
                background: 'rgba(59, 130, 246, 0.1)', 
                color: 'var(--accent-blue)', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '4px',
                marginTop: '0.2rem',
                display: 'inline-block'
              }}>
                {task.role}
              </span>
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: 'rgba(16, 185, 129, 0.1)', 
          color: 'var(--success)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}>
          <Zap size={16} /> All safety protocols completed.
        </div>
      )}
    </div>
  );
}
