import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientPortal from './pages/PatientPortal';
import Landing from './pages/Landing';
import FirstResponderPortal from './pages/FirstResponderPortal';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// A simple auth wrap
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global setup and routes
  return (
    <>
      {needRefresh && (
        <div style={{
          background: 'var(--accent-blue)',
          color: 'white',
          textAlign: 'center',
          padding: '0.75rem',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          position: 'sticky',
          top: 0,
          zIndex: 10000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <span>🔄 A new version of C.O.R.E. is available.</span>
          <button 
            onClick={() => updateServiceWorker(true)}
            style={{ background: 'white', color: 'var(--accent-blue)', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Update Now
          </button>
        </div>
      )}
      {isOffline && (
        <div style={{
          background: '#ef4444',
          color: 'white',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span>⚠️ OFFLINE MODE: Network connection lost. Viewing cached data. Reconnecting when possible...</span>
        </div>
      )}
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Staff Dashboard */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Public Patient Portal QR Access */}
          <Route path="/portal/:sessionId" element={<PatientPortal />} />

          {/* First Responder Live Feed (token-validated, no login required) */}
          <Route path="/responder/:token" element={<FirstResponderPortal />} />
          
          {/* Catch all - redirect home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
