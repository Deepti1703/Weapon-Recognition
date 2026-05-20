import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = ({ children }) => {
 const { user, loading } = useAuth();

 if (loading) {
 return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-gray-500">Loading...</p></div>;
 }

 if (!user) {
 return <Navigate to="/login" />;
 }

 // If user hasn't completed profile, force them to the setup page
 if (!user.is_profile_complete && window.location.pathname !== '/setup') {
 return <Navigate to="/setup" />;
 }

 // If user has completed profile but tries to go to setup, send to dashboard
 if (user.is_profile_complete && window.location.pathname === '/setup') {
 return <Navigate to="/" />;
 }

 return children;
};

function App() {
 return (
 <ToastProvider>
 <AuthProvider>
 <Router>
 <Routes>
 <Route path="/login" element={<Login />} />
 <Route path="/register" element={<Navigate to="/login" replace />} />
 <Route
 path="/setup"
 element={
 <ProtectedRoute>
 <ProfileSetup />
 </ProtectedRoute>
 }
 />
 <Route
 path="/"
 element={
 <ProtectedRoute>
 <Dashboard />
 </ProtectedRoute>
 }
 />
 </Routes>
 </Router>
 </AuthProvider>
 </ToastProvider>
 );
}

export default App;
