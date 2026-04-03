// src/components/ProtectedRoute.jsx
// Guards routes that require auth + completed onboarding.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, requireOnboarding = true }) {
  const { currentUser, isOnboarded } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export function OnboardingRoute({ children }) {
  const { currentUser, isOnboarded } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (isOnboarded)  return <Navigate to="/dashboard" replace />;

  return children;
}
