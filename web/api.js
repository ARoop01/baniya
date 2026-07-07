// AuraFinance API & Offline Sync Service
import { getRecord, putRecord, getLocalChanges, applyServerChanges } from './db.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Cache in-memory auth state
let authToken = null;
let currentUser = null;

// Initialize Auth State from LocalStorage/IndexedDB metadata
export const initAuth = async () => {
  try {
    const tokenRecord = await getRecord('metadata', 'token');
    const userRecord = await getRecord('metadata', 'user');
    
    if (tokenRecord) authToken = tokenRecord.value;
    if (userRecord) currentUser = userRecord.value;
  } catch (err) {
    console.error('Failed to initialize auth from storage', err);
  }
};

export const getAuthToken = () => authToken;
export const getCurrentUser = () => {
  if (currentUser) {
    currentUser.currencyPreference = 'INR';
  }
  return currentUser;
};
export const isOnline = () => navigator.onLine;

// Authenticated fetch helper
const authFetch = async (url, options = {}) => {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  return response.json();
};

// 1. Auth Calls
export const registerUser = async (name, email, password, currencyPreference) => {
  const data = await authFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, currencyPreference })
  });

  authToken = data.token;
  currentUser = data.user;

  // Save to local metadata store
  await putRecord('metadata', { key: 'token', value: authToken });
  await putRecord('metadata', { key: 'user', value: currentUser });
  await putRecord('metadata', { key: 'lastSyncTime', value: null }); // reset sync time for new user

  return data;
};

export const loginUser = async (email, password) => {
  const data = await authFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  authToken = data.token;
  currentUser = data.user;

  // Save to local metadata store
  await putRecord('metadata', { key: 'token', value: authToken });
  await putRecord('metadata', { key: 'user', value: currentUser });
  await putRecord('metadata', { key: 'lastSyncTime', value: null }); // trigger full sync

  return data;
};

export const logoutUser = () => {
  authToken = null;
  currentUser = null;
};

export const resetPassword = async (email) => {
  return authFetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const updateProfile = async (name, currencyPreference) => {
  const data = await authFetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    body: JSON.stringify({ name, currencyPreference })
  });

  currentUser = data.user;
  await putRecord('metadata', { key: 'user', value: currentUser });
  return data;
};

export const deleteAccount = async () => {
  await authFetch(`${API_BASE}/auth/profile`, {
    method: 'DELETE'
  });
  logoutUser();
};

// 2. Receipt Upload
export const uploadReceiptFile = async (file) => {
  if (!isOnline()) {
    throw new Error('You are currently offline. Receipts can only be uploaded when online.');
  }

  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch(`${API_BASE}/expenses/upload-receipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload receipt photo.');
  }

  const data = await response.json();
  return `${API_BASE.replace('/api', '')}${data.receiptUrl}`;
};

// 3. Main Sync Loop
export const syncWithServer = async () => {
  if (!isOnline() || !authToken) {
    return { success: false, reason: 'offline_or_unauthenticated' };
  }

  try {
    // Get last sync time
    const syncTimeRecord = await getRecord('metadata', 'lastSyncTime');
    const lastSyncTime = syncTimeRecord ? syncTimeRecord.value : null;

    // Retrieve local changes
    const changes = await getLocalChanges(lastSyncTime);

    // Call Sync endpoint
    const responseData = await authFetch(`${API_BASE}/sync`, {
      method: 'POST',
      body: JSON.stringify({ lastSyncTime, changes })
    });

    // Apply server changes to local IndexedDB
    await applyServerChanges(responseData.changes);

    // Update last sync time
    await putRecord('metadata', { key: 'lastSyncTime', value: responseData.syncTime });

    return { success: true, syncTime: responseData.syncTime };
  } catch (err) {
    console.error('Offline Sync failed:', err);
    return { success: false, reason: 'error', error: err.message };
  }
};
