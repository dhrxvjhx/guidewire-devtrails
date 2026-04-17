// src/api.js
// Central API client — every backend call goes through here.
// Uses the Firebase ID token on every request automatically.

import axios from 'axios';
import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';  // Vite proxy → http://localhost:3001

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL });

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Surface error messages cleanly
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  onboarding: (data) => api.post('/auth/onboarding', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ── Policy ──────────────────────────────────────────────────────────────────
export const policyApi = {
  create: (plan) => api.post('/policy/create', { plan }),
  getMine: () => api.get('/policy/mine'),
  history: () => api.get('/policy/history'),
  pause: () => api.put('/policy/pause'),
  cancel: () => api.put('/policy/cancel'),
  quote: (params) => api.get('/policy/quote', { params }),
};

// ── Premium ─────────────────────────────────────────────────────────────────
export const premiumApi = {
  calculate: (params) => api.get('/premium/calculate', { params }),
  zones: (city) => api.get('/premium/zones', { params: { city } }),
  plans: () => api.get('/premium/plans'),
  pincodes: (city) => api.get('/premium/pincodes', { params: { city } }),
};

// ── Wallet ──────────────────────────────────────────────────────────────────
export const walletApi = {
  balance: () => api.get('/wallet/balance'),
  transactions: (limit) => api.get('/wallet/transactions', { params: { limit } }),
  topup: (amount) => api.post('/wallet/topup', { amount }),
};

export default api;
