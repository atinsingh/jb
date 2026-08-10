/* Popup controller: shows connection state and triggers autofill on the active tab. */

// Dev default. Point at the deployed app for a production build.
const APP_LOGIN = 'http://localhost:3000/app/login';
const SUPPORTED = ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'];

const dot = document.getElementById('dot');
const stateText = document.getElementById('stateText');
const msg = document.getElementById('msg');
const action = document.getElementById('action');
const disconnect = document.getElementById('disconnect');

function activeTab() {
  return new Promise((resolve) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0])),
  );
}

async function render() {
  const state = await new Promise((r) => chrome.runtime.sendMessage({ type: 'GET_STATE' }, r));
  const connected = !!(state && state.connected);
  const tab = await activeTab();
  const host = tab && tab.url ? new URL(tab.url).hostname : '';
  const onAts = SUPPORTED.some((h) => host.includes(h.split('.').slice(-3).join('.')) || host === h || host.endsWith(h));

  dot.classList.toggle('on', connected);
  disconnect.style.display = connected ? 'block' : 'none';

  if (!connected) {
    stateText.textContent = 'Not connected';
    msg.textContent = 'Sign in to Jobocate to autofill applications from your profile.';
    action.textContent = 'Connect to Jobocate';
    action.disabled = false;
    action.onclick = () => chrome.tabs.create({ url: APP_LOGIN });
    return;
  }

  stateText.textContent = 'Connected to Jobocate';
  if (!onAts) {
    msg.textContent = 'Open a job application on Greenhouse or Lever, then autofill it here.';
    action.textContent = 'Autofill this application';
    action.disabled = true;
    return;
  }
  msg.textContent = 'Ready. We’ll fill what we can and pause for you to review.';
  action.textContent = 'Autofill this application';
  action.disabled = false;
  action.onclick = () => {
    chrome.tabs.sendMessage(tab.id, { type: 'AUTOFILL' }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        msg.textContent = 'Could not reach this page. Reload the application and try again.';
        return;
      }
      if (resp.ok) {
        msg.textContent = resp.filled
          ? `Filled ${resp.filled} field${resp.filled === 1 ? '' : 's'}. Review, then submit yourself.`
          : 'No matching fields found on this form yet.';
      }
    });
  };
}

disconnect.onclick = () =>
  chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' }, () => render());

render();
