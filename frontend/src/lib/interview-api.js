import { API_URL } from '@/config/api';

// Real REST engine lives under the job-tracker interview-prep controller.
// (Historic paths of /api/interview-sessions/* had no backend and 404'd.)
const BASE = `${API_URL}/api/job-tracker/interview-sessions`;

const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Live-audio coaching (start / live-notes / per-turn scoring / delete) has no
// production backend yet — the audio WebSocket gateway exists but the session
// turn/score REST engine does not. Fail fast with an honest message instead of
// POSTing to a route that 404s. (Backlog: build the live session/turn engine.)
const comingSoon = (feature) => {
  throw new Error(`${feature} is coming soon — this part of live interview coaching isn't available yet.`);
};

export const interviewApi = {
  // Create a new interview session
  createSession: async (data) => {
    const res = await fetch(BASE, {
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

  // Get session with full timeline
  getSession: async (sessionId) => {
    const res = await fetch(`${BASE}/${sessionId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  // End a session (maps to the engine's "complete" transition)
  endSession: async (sessionId) => {
    const res = await fetch(`${BASE}/${sessionId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to end session');
    return res.json();
  },

  // ---- No backend equivalent yet — gated (see comingSoon note above) ----

  // Start a session
  startSession: async () => comingSoon('Starting a live session'),

  // Add live note (question) in Live Notes mode
  addLiveNote: async () => comingSoon('Live Notes coaching'),

  // Score an answer turn
  scoreTurn: async () => comingSoon('Answer scoring'),

  // Delete a session
  deleteSession: async () => comingSoon('Deleting a session'),
};
