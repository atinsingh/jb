'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  getInterviewApplications,
  getInterviewSessions,
} from '@/services/interviewApi';

/* ------------------------------------------------ static product content --- */
// Practice categories are fixed product content (the question bank taxonomy),
// not user data — they link into the mock-interview builder.
const CATEGORIES = [
  { tag: 'BH', title: 'Behavioral', tint: '#EAF6EE', ink: '#157A49' },
  { tag: 'DC', title: 'Design critique', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'SY', title: 'Systems design', tint: '#F4EFE4', ink: '#1B1A16' },
  { tag: 'NG', title: 'Negotiation', tint: '#F4EFE4', ink: '#1B1A16' },
];

/* ------------------------------------------------ helpers --- */

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'JB';

// Best-effort mapping from an interview-buddy application object to the
// "next interview" hero card. Shape is defensive (backend not yet final).
const toNextInterview = (app) => {
  if (!app) return null;
  const role = app.jobTitle || app.role || app.title || app.position || app.job?.title;
  const company = app.companyName || app.company || app.job?.company || app.employer;
  if (!role && !company) return null;
  return {
    initials: initialsOf(company || role),
    role: role || 'Upcoming interview',
    meta: [company, app.stage || app.round, app.interviewDate || app.scheduledAt]
      .filter(Boolean)
      .join(' · '),
    eyebrow: 'Next interview',
    blurb:
      "We can build a tailored mock from this role's interview style. Run it now to walk in sharp.",
  };
};

export default function AppInterview() {
  const [next, setNext] = useState(null);
  const [sessionCount, setSessionCount] = useState(null);
  const [readiness, setReadiness] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = CATEGORIES;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [appsRes, sessRes] = await Promise.allSettled([
          getInterviewApplications(),
          getInterviewSessions(),
        ]);

        if (!alive) return;

        if (appsRes.status === 'fulfilled') {
          const apps =
            appsRes.value?.applications ||
            (Array.isArray(appsRes.value) ? appsRes.value : []);
          // Always set — null when the candidate has no upcoming interview.
          setNext(toNextInterview(apps?.[0]));
        }

        if (sessRes.status === 'fulfilled') {
          const sessions =
            sessRes.value?.sessions ||
            (Array.isArray(sessRes.value) ? sessRes.value : sessRes.value?.data) ||
            [];
          if (Array.isArray(sessions)) setSessionCount(sessions.length);
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const headerStat =
    sessionCount != null
      ? `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} practiced`
      : '';

  const heroEyebrow = next?.eyebrow || 'Practice anytime';
  const heroInitials = next?.initials || 'JB';
  const heroRole = next?.role || 'Start a mock interview';
  const heroMeta = next?.meta || 'Tailored to your target role';
  const heroBlurb =
    next?.blurb ||
    'Run an AI mock tailored to your target role — get specific feedback, instantly.';

  return (
    <>
      <Head>
        <title>Interview prep — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.85;
          }
        }
        #jbapp .jb-cat:hover {
          border-color: #1fa463 !important;
          background: #fffefb !important;
        }
        #jbapp .jb-start:hover {
          background: #5bd08c !important;
        }
        @media (max-width: 640px) {
          #jbapp .jb-cat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="interview" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Toolkit / Interview Prep
            </div>
            <div style={{ flex: 1 }} />
            {headerStat && (
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#8A8378' }}>
                {headerStat}
              </span>
            )}
          </header>

          <div style={{ padding: '30px 32px 48px', width: '100%' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: '0 0 8px',
                }}
              >
                Interview prep
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Practice with AI mock interviews tailored to each role — get specific feedback, instantly.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
              {/* NEXT INTERVIEW + START MOCK */}
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#15140F',
                  borderRadius: 20,
                  padding: '28px 30px',
                  color: '#F2EDE2',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 85% 0%, rgba(31,164,99,0.3), transparent 58%)',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#5BD08C',
                      marginBottom: 16,
                    }}
                  >
                    {heroEyebrow}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                    <span
                      style={{
                        width: 50,
                        height: 50,
                        flexShrink: 0,
                        borderRadius: 13,
                        background: '#EAF6EE',
                        color: '#157A49',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 17,
                      }}
                    >
                      {heroInitials}
                    </span>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 700, color: '#FBF8F1' }}>{heroRole}</div>
                      <div style={{ fontSize: 13.5, color: '#9A9286' }}>{heroMeta}</div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: '#B8B1A4',
                      margin: '0 0 24px',
                      maxWidth: 440,
                    }}
                  >
                    {heroBlurb}
                  </p>
                  <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
                    <Link
                      href={appRoute('App Mock Interview.dc.html')}
                      className="jb-start"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        background: '#1FA463',
                        color: '#0C2C1C',
                        fontSize: 15,
                        fontWeight: 700,
                        padding: '14px 22px',
                        borderRadius: 999,
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: '#0C2C1C',
                          animation: 'pulse 1.6s ease-in-out infinite',
                        }}
                      />
                      Start mock interview
                    </Link>
                    <Link
                      href={appRoute('App Company.dc.html')}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#F2EDE2',
                        fontSize: 15,
                        fontWeight: 600,
                        padding: '14px 22px',
                        borderRadius: 999,
                        border: '1px solid #34322A',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      View company guide
                    </Link>
                  </div>
                </div>
              </div>

              {/* READINESS */}
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 20,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Readiness</h2>
                </div>
                {loading ? (
                  <LoadingState label="Loading readiness…" />
                ) : error ? (
                  <ErrorState error={error} />
                ) : readiness.length === 0 ? (
                  <EmptyState
                    icon="◎"
                    title="No readiness data yet"
                    hint="Complete a mock interview to see your readiness by skill."
                  />
                ) : (
                  readiness.map((r) => (
                    <div key={r.skill} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#46413A' }}>{r.skill}</span>
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: r.color,
                          }}
                        >
                          {r.score}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: '#F2ECE0', overflow: 'hidden' }}>
                        <div style={{ width: r.pct, height: '100%', background: r.color }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PRACTICE BY CATEGORY */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                padding: 24,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                }}
              >
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Practice by category</h2>
                <span style={{ fontSize: 13, color: '#8A8378' }}>Pick a set or let AI build one</span>
              </div>
              <div className="jb-cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {categories.map((c) => (
                  <Link
                    key={c.title}
                    href={appRoute('App Mock Interview.dc.html')}
                    className="jb-cat"
                    style={{
                      textAlign: 'left',
                      background: '#FBF8F1',
                      border: '1px solid #EEE7D9',
                      borderRadius: 14,
                      padding: 18,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: c.tint,
                        color: c.ink,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--jb-font-mono)',
                        fontWeight: 600,
                        fontSize: 12,
                        marginBottom: 14,
                      }}
                    >
                      {c.tag}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16', marginBottom: 4 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8378' }}>Start a set →</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* RECENT FEEDBACK */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 22px',
                  borderBottom: '1px solid #EEE7D9',
                }}
              >
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Recent session feedback</h2>
              </div>
              {loading ? (
                <LoadingState label="Loading sessions…" />
              ) : error ? (
                <ErrorState error={error} />
              ) : feedback.length === 0 ? (
                <EmptyState
                  icon="✎"
                  title="No sessions yet"
                  hint="Run a mock interview and your per-question feedback will appear here."
                />
              ) : (
                feedback.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 16,
                      padding: '18px 22px',
                      borderBottom: '1px solid #F2ECE0',
                    }}
                  >
                    <div style={{ flexShrink: 0, width: 46, textAlign: 'center' }}>
                      <div
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 19,
                          fontWeight: 600,
                          color: f.color,
                          lineHeight: 1,
                        }}
                      >
                        {f.score}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#A79E8F',
                          fontFamily: 'var(--jb-font-mono)',
                        }}
                      >
                        / 10
                      </div>
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid #EEE7D9', paddingLeft: 16 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 5 }}>{f.question}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5A544A' }}>
                        <span style={{ color: '#157A49', fontWeight: 600 }}>{f.tag} </span>
                        {f.note}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
