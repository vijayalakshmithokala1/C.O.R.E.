import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientPortal from './pages/PatientPortal';
import Landing from './pages/Landing';
import { useEffect, useState } from 'react';

// A simple auth wrap
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  // Global setup and routes
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* Staff Dashboard */}
        <Route path="/dashboard/*" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Public Patient Portal QR Access */}
        <Route path="/portal/:sessionId" element={<PatientPortal />} />
      </Routes>
    </Router>
  );
}

export default App;
