'use client';

import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

// Standalone reusable limit/upsell state. Static sample data ported from the
// design's DCLogic Component class (renderVals).
const BLOCKED = [
  'New job postings are paused until a slot frees up',
  'Autopilot can’t open pipelines for new reqs',
  'Sourcing campaigns for new roles are on hold',
];

const GROWTH = [
  { label: 'Job slots', value: '5' },
  { label: 'AI actions', value: '500' },
  { label: 'Sourcing', value: '150' },
];

const SCALE = [
  { label: 'Job slots', value: '20' },
  { label: 'AI actions', value: '2,500' },
  { label: 'Sourcing', value: '750' },
];

export default function EmployerQuota() {
  return (
    <>
      <Head>
        <title>Job slots reached — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbquota * {
          box-sizing: border-box;
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
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        #jbquota a.qbtn-primary:hover {
          background: #364fc7 !important;
        }
        #jbquota a.qbtn-ghost:hover {
          background: #f4efe4 !important;
        }
      `}</style>

      {/* dimmed app backdrop */}
      <div
        id="jbquota"
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
          overflow: 'hidden',
        }}
      >
        {/* faux app shell behind */}
        <div style={{ display: 'flex', minHeight: '100vh', filter: 'blur(2px)', opacity: 0.5, pointerEvents: 'none' }}>
          <div style={{ width: 250, flexShrink: 0, background: '#15140F' }} />
          <div style={{ flex: 1, padding: 32 }}>
            <div style={{ height: 40, width: 280, background: '#EFE8DA', borderRadius: 10, marginBottom: 24 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
            </div>
          </div>
        </div>

        {/* scrim */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(16,15,11,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'emfade 0.2s ease',
          }}
        >
          {/* DIALOG */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 520,
              background: '#FFFEFB',
              border: '1px solid #E6DECF',
              borderRadius: 24,
              boxShadow: '0 50px 100px -40px rgba(0,0,0,0.6)',
              padding: 36,
              animation: 'empop 0.28s ease',
            }}
          >
            <Link
              href={appRoute('Employer Dashboard.dc.html')}
              title="Close"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #E6DECF',
                borderRadius: 9,
                color: '#8A8378',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              ✕
            </Link>

            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: '#EDF0FE',
                color: '#4263EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                marginBottom: 20,
              }}
            >
              ◓
            </div>

            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#4263EB',
                marginBottom: 10,
              }}
            >
              Job slots · 5 of 5 used
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 30, lineHeight: 1.08, margin: '0 0 10px' }}>
              You&rsquo;ve filled every job slot — nice problem to have.
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A544A', margin: '0 0 22px' }}>
              Your Growth plan includes 5 active reqs and all 5 are live. To post{' '}
              <b style={{ color: '#1B1A16' }}>Senior Data Scientist</b>, free up a slot or move up to Scale.
            </p>

            {/* WHAT'S BLOCKED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
              {BLOCKED.map((b) => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: '#5A544A' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: '#FBEDE4',
                      color: '#C9622E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                  >
                    ○
                  </span>
                  {b}
                </div>
              ))}
            </div>

            {/* TIER COMPARE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>Growth</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: '#157A49',
                      background: '#EAF6EE',
                      border: '1px solid #CDE9D6',
                      padding: '2px 6px',
                      borderRadius: 999,
                    }}
                  >
                    CURRENT
                  </span>
                </div>
                {GROWTH.map((g) => (
                  <div
                    key={g.label}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: '#5A544A', marginBottom: 7 }}
                  >
                    <span>{g.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#1B1A16' }}>{g.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#15140F', border: '1px solid #4263EB', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>Scale</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: '#fff',
                      background: '#4263EB',
                      padding: '2px 6px',
                      borderRadius: 999,
                    }}
                  >
                    UPGRADE
                  </span>
                </div>
                {SCALE.map((s) => (
                  <div
                    key={s.label}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: '#9A9286', marginBottom: 7 }}
                  >
                    <span>{s.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#5BD08C' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <Link
              href={appRoute('Employer Plans.dc.html')}
              className="qbtn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#4263EB',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                padding: 14,
                borderRadius: 999,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Upgrade to post more →
            </Link>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href={appRoute('Employer Dashboard.dc.html')}
                className="qbtn-ghost"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#FFFEFB',
                  color: '#1B1A16',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: 12,
                  borderRadius: 999,
                  textDecoration: 'none',
                  border: '1px solid #D9D0BE',
                }}
              >
                Manage jobs
              </Link>
              <Link
                href={appRoute('Employer Dashboard.dc.html')}
                className="qbtn-ghost"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  background: '#FFFEFB',
                  color: '#1B1A16',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: 12,
                  borderRadius: 999,
                  textDecoration: 'none',
                  border: '1px solid #D9D0BE',
                }}
              >
                Close an old req
              </Link>
            </div>

            <p style={{ fontSize: 12, color: '#A79E8F', textAlign: 'center', margin: '16px 0 0' }}>
              Closing a req keeps all its candidates and data — it just frees the slot.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
