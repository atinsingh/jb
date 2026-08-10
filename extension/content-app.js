/**
 * Runs on the logged-in Jobocate app origin. Reads the session token the app
 * already stored in localStorage and hands it to the extension so the popup can
 * autofill on external ATS sites. Read-only; sends nothing anywhere else.
 */
(function () {
  function sync() {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) chrome.runtime.sendMessage({ type: 'SET_TOKEN', token });
    } catch (e) {
      /* localStorage may be blocked; ignore */
    }
  }
  sync();
  // Re-sync if the user logs in/out while the tab is open.
  window.addEventListener('storage', (e) => {
    if (e.key === 'authToken' || e.key === 'token') sync();
  });
})();
