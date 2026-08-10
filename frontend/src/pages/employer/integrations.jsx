'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerIntegrationsApi } from '@/services/employerApi';

/* ----------------------------------------------------- presentation --- */
// Category metadata — pure presentation config (labels + generic descriptions),
// not per-owner data. Connection state comes entirely from the backend.
const CAT_META = [
  { key: 'ats', label: 'ATS sync', desc: 'Two-way candidate & job sync' },
  { key: 'calendar', label: 'Calendar', desc: 'Interview scheduling & availability' },
  { key: 'email', label: 'Email', desc: 'Send & track candidate email' },
  { key: 'comms', label: 'Communication', desc: 'Hiring alerts & approvals in channel' },
  { key: 'distribution', label: 'Job distribution', desc: 'Post & promote your reqs' },
  { key: 'assessments', label: 'Assessments', desc: 'Send & score assessments' },
  { key: 'background', label: 'Background checks', desc: 'Background & reference checks' },
  { key: 'esign', label: 'E-signature', desc: 'E-sign offer letters' },
  { key: 'hris', label: 'HRIS handoff', desc: 'Onboard new hires to HRIS' },
];

const CAT_BY_KEY = Object.fromEntries(CAT_META.map((c) => [c.key, c]));

const LOGO_PALETTE = [
  { bg: '#EDF0FE', color: '#4263EB' },
  { bg: '#E6F4EA', color: '#1A7F4B' },
  { bg: '#FBF1E2', color: '#9A6A2E' },
  { bg: '#F3EAF9', color: '#7A2E9A' },
  { bg: '#FBEDE4', color: '#C9622E' },
  { bg: '#E6F0FE', color: '#2A6FDB' },
];

function logoFor(id, name) {
  const initials = String(name || id || '?')
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const s = String(id || name || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const pal = LOGO_PALETTE[h % LOGO_PALETTE.length];
  return { logo: initials, logoBg: pal.bg, logoColor: pal.color };
}

const fmtDate = (v) => {
  if (!v) return null;
  try {
    return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

const fmtRelSync = (v) => {
  if (!v) return 'never';
  try {
    return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'never';
  }
};

// Field-mapping documentation — describes what a two-way sync exchanges. Pure
// reference, not fabricated per-owner data.
function mappingFor(cat) {
  if (cat === 'ats') {
    return [
      { from: 'Candidate name', to: 'candidate.full_name' },
      { from: 'Email', to: 'candidate.email_address' },
      { from: 'Stage', to: 'application.stage' },
      { from: 'Job / Req', to: 'job.requisition_id' },
    ];
  }
  if (cat === 'comms') {
    return [
      { from: 'New applicant', to: '#hiring' },
      { from: 'Stage change', to: '#hiring' },
      { from: 'Offer accepted', to: '#hiring-wins' },
    ];
  }
  return [
    { from: 'Interview booked', to: 'calendar.event' },
    { from: 'Interviewer availability', to: 'calendar.freebusy' },
  ];
}

const FREQS = [
  { key: 'realtime', label: 'Real-time' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'daily', label: 'Daily' },
];

/* ----------------------------------------------------------- page --- */
export default function EmployerIntegrations() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [config, setConfig] = useState(null); // integration id of the open modal
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [freq, setFreq] = useState('realtime');

  const mapItem = (r) => ({
    id: r.integrationId,
    name: r.name,
    cat: r.category,
    desc: CAT_BY_KEY[r.category]?.desc || 'Connect this tool to Jobocate',
    connected: !!r.connected,
    syncStatus: r.syncStatus,
    authDate: r.authDate,
    lastSync: r.lastSync,
    syncCount: r.syncCount ?? 0,
    frequency: r.frequency || 'realtime',
    ...logoFor(r.integrationId, r.name),
  });

  // Fetch the live integration catalog with real connection state. The endpoint
  // may return a bare array or { integrations }. No sample fallback.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerIntegrationsApi.list();
      const list = Array.isArray(res) ? res : Array.isArray(res?.integrations) ? res.integrations : [];
      setItems(list.map(mapItem));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDoc = (id, doc) =>
    setItems((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              connected: doc?.connected ?? a.connected,
              syncStatus: doc?.syncStatus ?? a.syncStatus,
              authDate: doc?.authDate ?? a.authDate,
              lastSync: doc?.lastSync ?? a.lastSync,
              syncCount: doc?.syncCount ?? a.syncCount,
              frequency: doc?.frequency ?? a.frequency,
            }
          : a,
      ),
    );

  const apps = useMemo(() => items.map((a) => ({ ...a, available: !a.connected })), [items]);

  const connectedCount = apps.filter((a) => a.connected).length;

  const filterDefs = useMemo(
    () => [{ key: 'all', label: 'All' }].concat(CAT_META.map((c) => ({ key: c.key, label: c.label }))),
    [],
  );

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    let visible = apps;
    if (filter !== 'all') visible = visible.filter((a) => a.cat === filter);
    if (q) visible = visible.filter((a) => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

    return CAT_META.map((c) => ({
      label: c.label,
      apps: visible.filter((a) => a.cat === c.key),
    })).filter((s) => s.apps.length > 0);
  }, [apps, filter, query]);

  const empty = apps.length === 0;
  const noResults = !empty && sections.length === 0;

  const connect = async (app) => {
    setActionError(null);
    try {
      const doc = await employerIntegrationsApi.connect(app.id, { name: app.name, category: app.cat });
      applyDoc(app.id, doc);
    } catch (err) {
      setActionError(err);
    }
  };

  const openConfig = (app) => {
    setFreq(app.frequency || 'realtime');
    setConfig(app.id);
  };
  const closeConfig = () => setConfig(null);

  const disconnect = async () => {
    const id = config;
    if (!id) return;
    setActionError(null);
    try {
      const doc = await employerIntegrationsApi.disconnect(id);
      applyDoc(id, doc);
      setConfig(null);
    } catch (err) {
      setActionError(err);
    }
  };

  const changeFreq = async (key) => {
    if (!config) return;
    setActionError(null);
    const prev = freq;
    setFreq(key);
    try {
      const doc = await employerIntegrationsApi.update(config, { frequency: key });
      applyDoc(config, doc);
    } catch (err) {
      setFreq(prev);
      setActionError(err);
    }
  };

  const cfg = apps.find((a) => a.id === config && a.connected);
  const cfgMapping = cfg ? mappingFor(cfg.cat) : [];
  const cfgAuth = cfg ? fmtDate(cfg.authDate) : null;

  return (
    <>
      <Head>
        <title>Integrations — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        .em-int-connect:hover {
          background: #364fc7 !important;
        }
        .em-int-configure:hover {
          background: #f4efe4 !important;
        }
        @keyframes emfade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes empop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>{connectedCount} connected</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Integrations</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Connect Jobocate to the tools your team already runs hiring on.</p>
            </div>

            <InlineError error={actionError} />

            {/* SEARCH + FILTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', width: 240 }}>
                <span style={{ color: '#A79E8F', fontSize: 13 }}>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search integrations…"
                  style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {filterDefs.map((f) => {
                  const on = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: on ? '#fff' : '#46413A', background: on ? '#4263EB' : '#FFFEFB', border: `1px solid ${on ? '#4263EB' : '#E1D9C9'}`, borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <LoadingState label="Loading integrations…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : empty ? (
              <div style={{ background: '#FFFEFB', border: '1px dashed #D2C9B7', borderRadius: 16, padding: 44, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#8A8378', margin: 0 }}>No integrations are available yet.</p>
              </div>
            ) : (
              <>
                {/* CATEGORY SECTIONS */}
                {sections.map((sec) => (
                  <div key={sec.label} style={{ marginBottom: 30 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 13 }}>{sec.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13 }}>
                      {sec.apps.map((a) => (
                        <div key={a.id} style={{ background: '#FFFEFB', border: `1px solid ${a.connected ? '#CDE9D6' : '#E6DECF'}`, borderRadius: 15, padding: 18 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: a.logoBg, color: a.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, fontFamily: 'var(--jb-font-mono)' }}>{a.logo}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{a.name}</span>
                                {a.connected && (
                                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.4, color: '#8A8378', marginTop: 2 }}>{a.desc}</div>
                            </div>
                          </div>
                          {a.connected && (
                            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#157A49', marginBottom: 11 }}>● Connected</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {a.connected && (
                              <button
                                className="em-int-configure"
                                onClick={() => openConfig(a)}
                                style={{ flex: 1, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: 8, cursor: 'pointer' }}
                              >
                                Configure
                              </button>
                            )}
                            {a.available && (
                              <button
                                className="em-int-connect"
                                onClick={() => connect(a)}
                                style={{ flex: 1, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: 8, cursor: 'pointer' }}
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {noResults && (
                  <div style={{ background: '#FFFEFB', border: '1px dashed #D2C9B7', borderRadius: 16, padding: 44, textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: '#8A8378', margin: 0 }}>No integrations match “{query}”.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* CONFIGURE MODAL */}
        {cfg && (
          <div onClick={closeConfig} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,15,11,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'emfade 0.2s ease' }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 540, maxHeight: '88vh', overflowY: 'auto', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 22, boxShadow: '0 50px 100px -40px rgba(0,0,0,0.6)', padding: 28, animation: 'empop 0.26s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 12, background: cfg.logoBg, color: cfg.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, fontFamily: 'var(--jb-font-mono)' }}>{cfg.logo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{cfg.name}</span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>CONNECTED</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 2 }}>{cfgAuth ? `Authorized ${cfgAuth}` : 'Recently authorized'}</div>
                </div>
                <button onClick={closeConfig} style={{ flexShrink: 0, width: 30, height: 30, border: '1px solid #E6DECF', background: '#FFFEFB', borderRadius: 8, cursor: 'pointer', color: '#8A8378', fontSize: 13 }}>✕</button>
              </div>

              {/* SYNC DIRECTION */}
              <div style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 13, padding: 16, marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>Sync direction</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Jobocate</span>
                  <span style={{ color: '#4263EB', fontSize: 16 }}>⇄</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cfg.name}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#157A49' }}>Two-way</span>
                </div>
              </div>

              {/* FIELD MAPPING */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>Field mapping</div>
                <div style={{ border: '1px solid #E6DECF', borderRadius: 12, overflow: 'hidden' }}>
                  {cfgMapping.map((m, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${i < cfgMapping.length - 1 ? '#F2ECE0' : 'transparent'}` }}>
                      <span style={{ fontSize: 13, color: '#1B1A16' }}>{m.from}</span>
                      <span style={{ color: '#A79E8F', textAlign: 'center', fontSize: 13 }}>→</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#5A544A' }}>{m.to}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FREQUENCY */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Sync frequency</span>
                <div style={{ display: 'inline-flex', padding: 3, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                  {FREQS.map((f) => {
                    const on = freq === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => changeFreq(f.key)}
                        style={{ fontSize: 12, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#EDF0FE' : 'transparent', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(27,26,22,0.1)' : 'none', fontFamily: 'inherit' }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: '#5A544A', marginBottom: 20, padding: '0 2px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                Last sync {fmtRelSync(cfg.lastSync)} · {cfg.syncCount} record{cfg.syncCount === 1 ? '' : 's'} synced
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={closeConfig} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '11px 20px', cursor: 'pointer' }}>Done</button>
                <div style={{ flex: 1 }} />
                <button onClick={disconnect} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#C9622E', background: 'none', border: 'none', cursor: 'pointer' }}>Disconnect</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
