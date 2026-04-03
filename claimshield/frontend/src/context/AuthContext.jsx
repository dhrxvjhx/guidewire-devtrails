// src/context/AuthContext.jsx
// Global auth state — wraps the entire app.
// Provides: currentUser (Firebase), userProfile (Firestore), loading state.

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);   // Firebase user object
  const [userProfile, setUserProfile] = useState(null);   // Firestore profile
  const [loading, setLoading] = useState(true);

  // ── Sign up ────────────────────────────────────────────────────────────
  async function signup(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create Firestore doc immediately after Firebase account
    await authApi.register({ name, email });
    return cred;
  }

  // ── Sign in ────────────────────────────────────────────────────────────
  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // ── Sign out ───────────────────────────────────────────────────────────
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  // ── Refresh profile from Firestore ────────────────────────────────────
  async function refreshProfile() {
    try {
      const data = await authApi.getMe();
      setUserProfile(data.user);
      return data.user;
    } catch (err) {
      console.warn('[AuthContext] refreshProfile failed:', err.message);
      if (auth.currentUser) {
        const minimal = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Partner',
          onboardingComplete: false,
          walletBalance: 0,
        };
        setUserProfile(minimal);
        return minimal;
      }
      return null;
    }
  }

  // ── Listen for auth state changes ─────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        await refreshProfile();
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    refreshProfile,
    isOnboarded: userProfile?.onboardingComplete === true,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
