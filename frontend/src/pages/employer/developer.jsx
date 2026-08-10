'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerDeveloperApi } from '@/services/employerApi';

/* --------------------------------------------------------------- config --- */
const SCOPE_OPTS = ['jobs:read', 'jobs:write', 'candidates:read', 'candidates:write', 'interviews:read', 'webhooks:manage'];
const EVENT_OPTS = ['application.created', 'application.updated', 'interview.scheduled', 'offer.accepted', 'candidate.advanced'];
const BASE_URL = 'https://api.jobocate.com/v1';

const fmtDate = (v) => { try { return v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; } catch { return '—'; } };
const fmtTime = (v) => { try { return v ? new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'never'; } catch { return 'never'; } };
const codeColor = (c) => (String(c).startsWith('2') ? '#1FA463' : '#C9622E');

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' };
const ghostBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' };

function Chip({ on, children, onClick, mono = true }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: mono ? 'var(--jb-font-mono)' : 'inherit',
        fontSize: 11.5, fontWeight: 500,
        color: on ? '#1F2D6B' : '#5A544A',
        background: on ? '#EDF0FE' : '#F2ECE0',
        border: `1px solid ${on ? '#C7D2FB' : '#E6DECF'}`,
        padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
      }}
    >
      {on ? '✓ ' : ''}{children}
    </button>
  );
}

/* ----------------------------------------------------------- component --- */
export default function EmployerDeveloper() {
  const [keys, setKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [reveal, setReveal] = useState({});
  const [copied, setCopied] = useState({});
  const [openLog, setOpenLog] = useState({});
  const copyTimer = useRef(null);

  // Inline create forms
  const [keyForm, setKeyForm] = useState({ open: false, name: '', env: 'test', scopes: ['jobs:read'], busy: false });
  const [hookForm, setHookForm] = useState({ open: false, url: '', events: [], busy: false });

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const mapKey = (k) => ({
    id: k._id, name: k.name, env: (k.env || '').toUpperCase(), secret: k.secret || '',
    keyPrefix: k.keyPrefix || (k.secret ? k.secret.slice(0, 12) : ''),
    scopes: k.scopes || [], created: fmtDate(k.createdAt),
    lastUsed: k.lastUsedAt ? fmtTime(k.lastUsedAt) : 'never', fresh: false,
  });
  const mapWebhook = (w) => ({
    id: w._id, url: w.url, status: (w.status || '').toUpperCase(),
    statusKey: w.status === 'active' || w.status === 'connected' ? 'ok' : (w.status === 'failing' ? 'fail' : 'idle'),
    events: w.events || [],
    deliveries: (w.deliveries || []).map((d) => ({ event: d.event, time: fmtTime(d.at), code: String(d.code) })),
  });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [keysRes, whRes] = await Promise.all([employerDeveloperApi.listKeys(), employerDeveloperApi.listWebhooks()]);
      setKeys(Array.isArray(keysRes?.keys) ? keysRes.keys.map(mapKey) : []);
      setWebhooks(Array.isArray(whRes?.webhooks) ? whRes.webhooks.map(mapWebhook) : []);
    } catch (err) { setError(err); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* --- key actions --- */
  const submitKey = async () => {
    setActionError(null);
    const name = keyForm.name.trim() || 'Untitled key';
    setKeyForm((f) => ({ ...f, busy: true }));
    try {
      const created = await employerDeveloperApi.createKey({ name, env: keyForm.env, scopes: keyForm.scopes });
      if (created?._id) {
        const mapped = { ...mapKey(created), fresh: true };
        setKeys((s) => [mapped, ...s]);
        setReveal((s) => ({ ...s, [mapped.id]: true })); // show the one-time secret
        setKeyForm({ open: false, name: '', env: 'test', scopes: ['jobs:read'], busy: false });
      }
    } catch (err) { setActionError(err); setKeyForm((f) => ({ ...f, busy: false })); }
  };
  const toggleReveal = (id) => setReveal((s) => ({ ...s, [id]: !s[id] }));
  const revoke = async (id) => {
    setActionError(null);
    try { await employerDeveloperApi.deleteKey(id); setKeys((s) => s.filter((x) => x.id !== id)); }
    catch (err) { setActionError(err); }
  };
  const toggleScope = (sc) => setKeyForm((f) => ({ ...f, scopes: f.scopes.includes(sc) ? f.scopes.filter((x) => x !== sc) : f.scopes.concat(sc) }));

  /* --- webhook actions --- */
  const submitHook = async () => {
    setActionError(null);
    const url = hookForm.url.trim();
    if (!/^https?:\/\/.+/i.test(url)) { setActionError(new Error('Enter a valid https:// endpoint URL.')); return; }
    setHookForm((f) => ({ ...f, busy: true }));
    try {
      const created = await employerDeveloperApi.createWebhook({ url, events: hookForm.events });
      if (created?._id) {
        setWebhooks((s) => [mapWebhook(created), ...s]);
        setHookForm({ open: false, url: '', events: [], busy: false });
      }
    } catch (err) { setActionError(err); setHookForm((f) => ({ ...f, busy: false })); }
  };
  const removeWebhook = async (id) => {
    setActionError(null);
    try { await employerDeveloperApi.deleteWebhook(id); setWebhooks((s) => s.filter((x) => x.id !== id)); }
    catch (err) { setActionError(err); }
  };
  const toggleHookEvent = (ev) => setHookForm((f) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : f.events.concat(ev) }));
  const toggleLog = (id) => setOpenLog((s) => ({ ...s, [id]: !s[id] }));

  const doCopy = async (id, text) => {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied((s) => ({ ...s, [id]: true }));
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied((s) => ({ ...s, [id]: false })), 1500);
    } catch { setActionError(new Error('Could not copy to clipboard')); }
  };

  return (
    <>
      <Head>
        <title>Developers · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp textarea:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-revoke-btn:hover { background: #fbede4 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        @keyframes emrise { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <span style={{ ...monoLabel, marginLeft: 4 }}>Settings · Developer</span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} /> API operational
            </span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Developers</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Build on Jobocate with the REST API and webhooks.</p>
            </div>

            {/* BASE URL */}
            <div style={{ background: '#15140F', border: '1px solid #2C2A22', borderRadius: 16, padding: '18px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B6456', marginBottom: 6 }}>Base URL</div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 14, color: '#5BD08C' }}>{BASE_URL}</div>
              </div>
              <button onClick={() => doCopy('baseurl', BASE_URL)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#EDE7DA', background: '#232019', border: '1px solid #3A3529', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>
                {copied.baseurl ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <InlineError error={actionError} />

            {loading ? (
              <LoadingState label="Loading developer settings…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* API KEYS */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>API keys</h2>
                  {!keyForm.open && (
                    <button onClick={() => setKeyForm((f) => ({ ...f, open: true }))} className="em-blue-btn" style={blueBtn}>＋ Create key</button>
                  )}
                </div>

                {/* Create-key form */}
                {keyForm.open && (
                  <div style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 16, padding: 18, marginBottom: 16, animation: 'emrise 0.2s ease' }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Key name</label>
                        <input autoFocus value={keyForm.name} onChange={(e) => setKeyForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Production server" style={fieldInput} />
                      </div>
                      <div>
                        <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Environment</label>
                        <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                          {['test', 'live'].map((e) => {
                            const on = keyForm.env === e;
                            return (
                              <button key={e} onClick={() => setKeyForm((f) => ({ ...f, env: e }))} style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none', fontFamily: 'inherit' }}>{e}</button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <label style={{ ...monoLabel, display: 'block', marginBottom: 8 }}>Scopes</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {SCOPE_OPTS.map((sc) => <Chip key={sc} on={keyForm.scopes.includes(sc)} onClick={() => toggleScope(sc)}>{sc}</Chip>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                      <button onClick={submitKey} disabled={keyForm.busy} className="em-blue-btn" style={{ ...blueBtn, opacity: keyForm.busy ? 0.6 : 1 }}>{keyForm.busy ? 'Creating…' : 'Create key'}</button>
                      <button onClick={() => setKeyForm({ open: false, name: '', env: 'test', scopes: ['jobs:read'], busy: false })} className="em-ghost" style={ghostBtn}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
                  {keys.map((k, i, arr) => {
                    const revealed = !!reveal[k.id];
                    const isCopied = !!copied[k.id];
                    const masked = `${k.keyPrefix || ''}••••••••••••••••`;
                    const isLive = k.env === 'LIVE';
                    const envColor = isLive ? '#C9622E' : '#4263EB';
                    const envBg = isLive ? '#FBEDE4' : '#EDF0FE';
                    const envBorder = isLive ? '#EAD0C4' : '#C7D2FB';
                    const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                    return (
                      <div key={k.id} style={{ padding: '18px 20px', borderBottom: `1px solid ${divider}`, background: k.fresh ? '#F7FBF8' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{k.name}</span>
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: envColor, background: envBg, border: `1px solid ${envBorder}`, padding: '3px 8px', borderRadius: 999 }}>{k.env}</span>
                              {k.fresh && <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>NEW · COPY NOW</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#5A544A', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 8, padding: '6px 11px', wordBreak: 'break-all' }}>{revealed ? k.secret : masked}</span>
                              {k.secret && <button onClick={() => toggleReveal(k.id)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>{revealed ? 'Hide' : 'Reveal'}</button>}
                              {k.secret && <button onClick={() => doCopy(k.id, k.secret)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}>{isCopied ? 'Copied ✓' : 'Copy'}</button>}
                            </div>
                          </div>
                          <button onClick={() => revoke(k.id)} className="em-revoke-btn" style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>Revoke</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          <span style={monoLabel}>Scopes</span>
                          {k.scopes.length === 0 && <span style={{ fontSize: 12, color: '#A79E8F' }}>none</span>}
                          {k.scopes.map((sc) => <span key={sc} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#46413A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 9px', borderRadius: 999 }}>{sc}</span>)}
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', marginLeft: 'auto' }}>Created {k.created} · last used {k.lastUsed}</span>
                        </div>
                      </div>
                    );
                  })}
                  {keys.length === 0 && !keyForm.open && (
                    <div style={{ padding: 32, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No API keys yet. Create one to start calling the API.</div>
                  )}
                </div>

                {/* WEBHOOKS */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Webhook endpoints</h2>
                  {!hookForm.open && (
                    <button onClick={() => setHookForm((f) => ({ ...f, open: true }))} className="em-blue-btn" style={blueBtn}>＋ Add endpoint</button>
                  )}
                </div>

                {/* Add-webhook form */}
                {hookForm.open && (
                  <div style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 16, padding: 18, marginBottom: 16, animation: 'emrise 0.2s ease' }}>
                    <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Endpoint URL</label>
                    <input autoFocus value={hookForm.url} onChange={(e) => setHookForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://api.yourapp.com/hooks/jobocate" style={{ ...fieldInput, fontFamily: 'var(--jb-font-mono)', fontSize: 13 }} />
                    <div style={{ marginTop: 14 }}>
                      <label style={{ ...monoLabel, display: 'block', marginBottom: 8 }}>Events <span style={{ textTransform: 'none', letterSpacing: 0, color: '#A79E8F' }}>· leave empty for all</span></label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {EVENT_OPTS.map((ev) => <Chip key={ev} on={hookForm.events.includes(ev)} onClick={() => toggleHookEvent(ev)}>{ev}</Chip>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                      <button onClick={submitHook} disabled={hookForm.busy} className="em-blue-btn" style={{ ...blueBtn, opacity: hookForm.busy ? 0.6 : 1 }}>{hookForm.busy ? 'Adding…' : 'Add endpoint'}</button>
                      <button onClick={() => setHookForm({ open: false, url: '', events: [], busy: false })} className="em-ghost" style={ghostBtn}>Cancel</button>
                    </div>
                  </div>
                )}

                {webhooks.length === 0 && !hookForm.open ? (
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 32, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No webhook endpoints yet. Add one to receive events.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {webhooks.map((w) => {
                      const ok = w.statusKey === 'ok';
                      const fail = w.statusKey === 'fail';
                      const statusDot = ok ? '#1FA463' : fail ? '#C9622E' : '#A79E8F';
                      const statusColor = ok ? '#157A49' : fail ? '#C9622E' : '#8A8378';
                      const statusBg = ok ? '#EAF6EE' : fail ? '#FBEDE4' : '#F2ECE0';
                      const statusBorder = ok ? '#CDE9D6' : fail ? '#EAD0C4' : '#E6DECF';
                      const open = !!openLog[w.id];
                      return (
                        <div key={w.id} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.url || '(no URL)'}</span>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, padding: '3px 8px', borderRadius: 999, flexShrink: 0 }}>{w.status || 'IDLE'}</span>
                            <button onClick={() => removeWebhook(w.id)} className="em-revoke-btn" style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>Delete</button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                            <span style={monoLabel}>Events</span>
                            {w.events.length === 0 ? <span style={{ fontSize: 12, color: '#A79E8F' }}>All events</span> : w.events.map((ev) => <span key={ev} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', padding: '3px 9px', borderRadius: 999 }}>{ev}</span>)}
                          </div>
                          <button onClick={() => toggleLog(w.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{open ? 'Hide delivery log' : 'View delivery log'}</button>
                          {open && (
                            <div style={{ marginTop: 13, border: '1px solid #E6DECF', borderRadius: 12, overflow: 'hidden', animation: 'emrise 0.2s ease' }}>
                              {w.deliveries.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#A79E8F' }}>No deliveries yet.</div>
                              ) : (
                                <>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr', gap: 10, padding: '9px 14px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                                    {['Event', 'Time', 'Code', 'Status'].map((h, hi) => <span key={h} style={{ ...monoLabel, fontSize: 11, letterSpacing: '0.05em', textAlign: hi === 3 ? 'right' : 'left' }}>{h}</span>)}
                                  </div>
                                  {w.deliveries.map((d, i, arr) => {
                                    const isOk = String(d.code).startsWith('2');
                                    const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                                    return (
                                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${divider}` }}>
                                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#3A352C' }}>{d.event}</span>
                                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>{d.time}</span>
                                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, fontWeight: 600, color: codeColor(d.code) }}>{d.code}</span>
                                        <span style={{ textAlign: 'right', fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: isOk ? '#1FA463' : '#C9622E' }}>{isOk ? '✓' : '✕'}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
