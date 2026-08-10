/**
 * Runs on supported ATS application pages (Greenhouse, Lever). On request from
 * the popup it fetches the candidate's autofill payload and fills matching form
 * fields — then STOPS. It never clicks submit; the candidate reviews and submits
 * themselves. This "fill, then pause" behaviour is the whole point.
 */
(function () {
  // React/Angular-controlled inputs ignore a plain `.value =` assignment, so use
  // the native setter and dispatch the events frameworks listen for.
  function setNativeValue(el, value) {
    const proto =
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findEmpty(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.value) return el;
    }
    return null;
  }

  function fill(payload) {
    const map = window.JOBOCATE_FIELD_SELECTORS || JOBOCATE_FIELD_SELECTORS;
    let count = 0;
    for (const field of Object.keys(map)) {
      const value = payload[field];
      if (!value) continue;
      const el = findEmpty(map[field]);
      if (el) {
        setNativeValue(el, value);
        el.style.outline = '2px solid #1f7a4d';
        el.style.outlineOffset = '1px';
        count += 1;
      }
    }
    return count;
  }

  function toast(message, tone) {
    const t = document.createElement('div');
    t.textContent = message;
    Object.assign(t.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: 2147483647,
      background: tone === 'error' ? '#8a2f22' : '#1f7a4d',
      color: '#fff',
      font: '600 14px/1.4 system-ui, sans-serif',
      padding: '12px 16px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,.25)',
      maxWidth: '320px',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'AUTOFILL') return false;
    chrome.runtime.sendMessage({ type: 'FETCH_PAYLOAD' }, (resp) => {
      if (!resp || resp.error) {
        const why =
          resp && resp.error === 'not_connected'
            ? 'Open Jobocate and sign in, then try again.'
            : 'Could not reach Jobocate. Check your connection.';
        toast(`Autofill unavailable — ${why}`, 'error');
        sendResponse({ ok: false, error: resp && resp.error });
        return;
      }
      const count = fill(resp.payload || {});
      toast(
        count
          ? `Filled ${count} field${count === 1 ? '' : 's'} — review everything, then submit yourself.`
          : 'Nothing to fill here yet — this form may use fields we don’t recognise.',
      );
      sendResponse({ ok: true, filled: count });
    });
    return true; // async
  });
})();
