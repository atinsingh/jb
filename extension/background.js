/**
 * Jobocate Autofill — background service worker (MV3).
 *
 * Holds the session token (picked up from the logged-in Jobocate app tab),
 * fetches the autofill payload from the backend, and answers the popup/content
 * scripts. It NEVER submits anything — the content script only fills.
 */

// Dev defaults. For a production build, point these at the deployed API.
const API_BASE = 'http://localhost:8000';

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jobocateToken'], (r) => resolve(r.jobocateToken || null));
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'SET_TOKEN') {
    // Sent by the content script running on the logged-in Jobocate app origin.
    if (msg.token) chrome.storage.local.set({ jobocateToken: msg.token });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove('jobocateToken', () => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'GET_STATE') {
    getToken().then((token) => sendResponse({ connected: !!token }));
    return true; // async
  }

  if (msg.type === 'FETCH_PAYLOAD') {
    getToken().then(async (token) => {
      if (!token) return sendResponse({ error: 'not_connected' });
      try {
        const res = await fetch(`${API_BASE}/api/users/autofill-payload`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          chrome.storage.local.remove('jobocateToken');
          return sendResponse({ error: 'not_connected' });
        }
        if (!res.ok) return sendResponse({ error: 'request_failed' });
        const data = await res.json();
        sendResponse({ payload: data.payload || null });
      } catch (e) {
        sendResponse({ error: 'network' });
      }
    });
    return true; // async
  }

  return false;
});
