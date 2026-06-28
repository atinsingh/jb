import { API_URL } from '@/config/api';

const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const interviewApi = {
  // Create a new interview session
  createSession: async (data) => {
    const res = await fetch(`${API_URL}/api/interview-sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create session' }));
      throw new Error(error.message || 'Failed to create session');
    }
    return res.json();
  },

  // Start a session
  startSession: async (sessionId) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to start session' }));
      throw new Error(error.message || 'Failed to start session');
    }
    return res.json();
  },

  // Get session with full timeline
  getSession: async (sessionId) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  // Add live note (question) in Live Notes mode
  addLiveNote: async (sessionId, questionText) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/live-notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ questionText }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to add live note' }));
      throw new Error(error.message || 'Failed to add live note');
    }
    return res.json();
  },

  // Score an answer turn
  scoreTurn: async (sessionId, turnId) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/turns/${turnId}/score`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to score answer' }));
      throw new Error(error.message || 'Failed to score answer');
    }
    return res.json();
  },

  // End a session
  endSession: async (sessionId) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/end`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to end session');
    return res.json();
  },

  // Delete a session
  deleteSession: async (sessionId) => {
    const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.ok;
  },
};

