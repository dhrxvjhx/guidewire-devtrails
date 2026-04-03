// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, OnboardingRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login      from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard  from './pages/Dashboard';
import Policy     from './pages/Policy';
import Wallet     from './pages/Wallet';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Onboarding — auth required but onboarding not yet complete */}
          <Route path="/onboarding" element={
            <OnboardingRoute><Onboarding /></OnboardingRoute>
          } />

          {/* Protected — auth + onboarding required */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/policy" element={
            <ProtectedRoute><Policy /></ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
