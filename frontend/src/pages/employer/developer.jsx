'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ------------------------------------------------------------- sample data --- */
const INITIAL_KEYS = [
  {
    id: 'k1',
    name: 'Production key',
    env: 'LIVE',
    secret: 'STRIPE_KEY_PLACEHOLDER',
    scopes: ['jobs:read', 'candidates:write', 'interviews:read'],
    created: 'Mar 12, 2026',
    lastUsed: '4 min ago',
  },
];

const WEBHOOKS_RAW = [
  {
    id: 'wh1',
    url: 'https://ats.stripe.com/hooks/jobocate',
    status: 'ACTIVE',
    statusKey: 'ok',
    events: ['applicant.created', 'stage.changed', 'offer.accepted'],
    deliveries: [
      { event: 'offer.accepted', time: '2:41 PM', code: '200' },
      { event: 'stage.changed', time: '1:18 PM', code: '200' },
      { event: 'applicant.created', time: '11:02 AM', code: '200' },
    ],
  },
  {
    id: 'wh2',
    url: 'https://hooks.internal.stripe.com/talent',
    status: 'FAILING',
    statusKey: 'fail',
    events: ['applicant.created', 'stage.changed'],
    deliveries: [
      { event: 'stage.changed', time: '3:05 PM', code: '500' },
      { event: 'applicant.created', time: '2:55 PM', code: '500' },
      { event: 'applicant.created', time: '1:40 PM', code: '200' },
    ],
  },
];

const codeColor = (c) => (c.startsWith('2') ? '#1FA463' : '#C9622E');

export default function EmployerDeveloper() {
  const [keys, setKeys] = useState(INITIAL_KEYS);
  const [reveal, setReveal] = useState({});
  const [copied, setCopied] = useState({});
  const [openLog, setOpenLog] = useState({ wh1: true });
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const createKey = () =>
    setKeys((s) =>
      s.concat({
        id: 'k' + Date.now(),
        name: 'New key',
        env: 'TEST',
        secret: 'sk_test_' + Math.random().toString(36).slice(2, 14) + 'Xy',
        scopes: ['jobs:read'],
        created: 'just now',
        lastUsed: 'never',
      })
    );

  const toggleReveal = (id) => setReveal((s) => ({ ...s, [id]: !s[id] }));
  const revoke = (id) => setKeys((s) => s.filter((x) => x.id !== id));
  const doCopy = (id) => {
    setCopied((s) => ({ ...s, [id]: true }));
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied((s) => ({ ...s, [id]: false })), 1500);
  };
  const toggleLog = (id) => setOpenLog((s) => ({ ...s, [id]: !s[id] }));

  const keysEmpty = keys.length === 0;

  const blueBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    background: '#4263EB',
    border: 'none',
    borderRadius: 999,
    padding: '9px 16px',
    cursor: 'pointer',
  };

  return (
    <>
      <Head>
        <title>Developers — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
        #emapp .em-blue-btn:hover {
          background: #364fc7 !important;
        }
        #emapp .em-revoke-btn:hover {
          background: #fbede4 !important;
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(-3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href={appRoute('Employer Settings.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <a
              href="#"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}
            >
              API docs ↗
            </a>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Developers</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                Build on Jobocate with the REST API and webhooks.{' '}
                <a href="#" style={{ color: '#4263EB', fontWeight: 600, textDecoration: 'none' }}>
                  Read the docs →
                </a>
              </p>
            </div>

            {/* BASE URL */}
            <div
              style={{
                background: '#15140F',
                border: '1px solid #2C2A22',
                borderRadius: 16,
                padding: '18px 22px',
                marginBottom: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B6456', marginBottom: 6 }}>
                  Base URL
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: '#5BD08C' }}>https://api.jobocate.com/v1</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>Stripe · Growth · 2,400 req/hr</div>
            </div>

            {/* API KEYS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>API keys</h2>
              <button onClick={createKey} className="em-blue-btn" style={blueBtn}>
                ＋ Create key
              </button>
            </div>
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
              {keys.map((k, i, arr) => {
                const revealed = !!reveal[k.id];
                const isCopied = !!copied[k.id];
                const masked = k.secret.slice(0, 8) + '••••••••••••••••';
                const isLive = k.env === 'LIVE';
                const envColor = isLive ? '#C9622E' : '#4263EB';
                const envBg = isLive ? '#FBEDE4' : '#EDF0FE';
                const envBorder = isLive ? '#EAD0C4' : '#C7D2FB';
                const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                return (
                  <div key={k.id} style={{ padding: '18px 20px', borderBottom: `1px solid ${divider}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{k.name}</span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 9,
                              fontWeight: 600,
                              letterSpacing: '0.03em',
                              color: envColor,
                              background: envBg,
                              border: `1px solid ${envBorder}`,
                              padding: '3px 8px',
                              borderRadius: 999,
                            }}
                          >
                            {k.env}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5A544A', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 8, padding: '6px 11px' }}>
                            {revealed ? k.secret : masked}
                          </span>
                          <button
                            onClick={() => toggleReveal(k.id)}
                            style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {revealed ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            onClick={() => doCopy(k.id)}
                            style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {isCopied ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => revoke(k.id)}
                        className="em-revoke-btn"
                        style={{
                          flexShrink: 0,
                          fontFamily: 'inherit',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: '#C9622E',
                          background: '#FFFEFB',
                          border: '1px solid #EAD0C4',
                          borderRadius: 999,
                          padding: '8px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286' }}>Scopes</span>
                      {k.scopes.map((sc) => (
                        <span
                          key={sc}
                          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#46413A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 9px', borderRadius: 999 }}
                        >
                          {sc}
                        </span>
                      ))}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#A79E8F', marginLeft: 'auto' }}>
                        Created {k.created} · last used {k.lastUsed}
                      </span>
                    </div>
                  </div>
                );
              })}
              {keysEmpty && (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No active keys. Create one to start calling the API.</div>
              )}
            </div>

            {/* WEBHOOKS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Webhook endpoints</h2>
              <button className="em-blue-btn" style={blueBtn}>
                ＋ Add endpoint
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {WEBHOOKS_RAW.map((w) => {
                const ok = w.statusKey === 'ok';
                const statusDot = ok ? '#1FA463' : '#C9622E';
                const statusColor = ok ? '#157A49' : '#C9622E';
                const statusBg = ok ? '#EAF6EE' : '#FBEDE4';
                const statusBorder = ok ? '#CDE9D6' : '#EAD0C4';
                const open = !!openLog[w.id];
                return (
                  <div key={w.id} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 13,
                          color: '#1B1A16',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {w.url}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: '0.03em',
                          color: statusColor,
                          background: statusBg,
                          border: `1px solid ${statusBorder}`,
                          padding: '3px 8px',
                          borderRadius: 999,
                          flexShrink: 0,
                        }}
                      >
                        {w.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286' }}>Events</span>
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', padding: '3px 9px', borderRadius: 999 }}
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => toggleLog(w.id)}
                      style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {open ? 'Hide delivery log' : 'View delivery log'}
                    </button>
                    {open && (
                      <div style={{ marginTop: 13, border: '1px solid #E6DECF', borderRadius: 12, overflow: 'hidden', animation: 'emrise 0.2s ease' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr',
                            gap: 10,
                            padding: '9px 14px',
                            background: '#FBF9F4',
                            borderBottom: '1px solid #F2ECE0',
                          }}
                        >
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Event</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Time</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Code</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>
                            Action
                          </span>
                        </div>
                        {w.deliveries.map((d, i, arr) => {
                          const isOk = d.code.startsWith('2');
                          const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr',
                                gap: 10,
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderBottom: `1px solid ${divider}`,
                              }}
                            >
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#3A352C' }}>{d.event}</span>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>{d.time}</span>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, color: codeColor(d.code) }}>{d.code}</span>
                              <span style={{ textAlign: 'right' }}>
                                {isOk ? (
                                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#1FA463' }}>✓</span>
                                ) : (
                                  <button style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
