'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  getInterviewSessions,
  getInterviewSession,
} from '@/services/interviewApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/* =========================================================================
   PAGE
   ========================================================================= */

export default function AppLiveInterview() {
  // --- live state machine ---
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  const [stepAcc, setStepAcc] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState('live'); // 'live' | 'summary'

  // --- backend-fed session data (empty until a real session loads) ---
  const [script] = useState([]);
  const [header, setHeader] = useState({
    company: '',
    tag: 'JB',
    role: 'Live interview copilot',
    sub: 'Start a session to go live',
  });
  const [context] = useState([]);
  const [strengths] = useState([]);
  const [improvements] = useState([]);
  const [scores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const scriptLenRef = useRef(0);
  scriptLenRef.current = script.length;

  // ---- attempt to load a real in-progress session ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getInterviewSessions('IN_PROGRESS').catch(() =>
          getInterviewSessions()
        );
        const sessions =
          res?.sessions || res?.data || (Array.isArray(res) ? res : []);
        const first = sessions?.[0];
        if (first?.id) {
          const full = await getInterviewSession(first.id).catch(() => null);
          const session = full?.session || full || first;
          if (alive && session) {
            setHeader((h) => ({
              ...h,
              company:
                session.company ||
                session.job?.company ||
                session.application?.company ||
                h.company,
              role:
                session.title ||
                session.job?.title ||
                session.application?.role ||
                h.role,
              sub: session.status
                ? `${session.status} · live copilot`
                : h.sub,
            }));
          }
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

  // ---- 1s tick driving the timer + auto-advancing question ----
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTick((t) => t + 1);
      setPaused((p) => {
        setView((v) => {
          if (!p && v === 'live') {
            setElapsed((e) => e + 1);
            setStepAcc((acc) => {
              const next = acc + 1;
              if (next >= 8) {
                setStep((s) => {
                  if (s < scriptLenRef.current - 1) return s + 1;
                  return s;
                });
                return 0;
              }
              return next;
            });
          }
          return v;
        });
        return p;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- derived render values ----
  const safeStep = Math.min(step, script.length - 1);
  const card = script[safeStep];
  const hasScript = script.length > 0 && card;
  const hasSummary = scores.length > 0 || strengths.length > 0 || improvements.length > 0;
  const avgScore = scores.length
    ? scores.reduce((a, s) => a + (Number(s.score) || 0), 0) / scores.length
    : 0;
  const scorePct = Math.max(0, Math.min(100, Math.round((avgScore / 10) * 100)));

  const transcript = useMemo(() => {
    if (!card) return [];
    const lines = [];
    for (let i = 0; i < safeStep; i++) {
      lines.push({
        speaker: 'Dana (Interviewer)',
        tag: 'DW',
        text: script[i].q,
        bg: '#2A2820',
        fg: '#C9C3B5',
        nameColor: '#9A9286',
        textColor: '#B8B1A4',
        isLive: false,
      });
      lines.push({
        speaker: 'You',
        tag: 'SC',
        text: script[i].you,
        bg: '#1FA463',
        fg: '#0C2C1C',
        nameColor: '#5BD08C',
        textColor: '#D8D2C4',
        isLive: false,
      });
    }
    lines.push({
      speaker: 'Dana (Interviewer)',
      tag: 'DW',
      text: card.q,
      bg: '#2A2820',
      fg: '#C9C3B5',
      nameColor: '#FBF8F1',
      textColor: '#FBF8F1',
      isLive: true,
    });
    return lines;
  }, [safeStep, script, card]);

  const meters = useMemo(() => {
    const pace = Math.round(140 + 9 * Math.sin(tick / 3));
    const conf = Math.round(87 + 4 * Math.sin(tick / 4 + 1));
    const fillers = 2 + (Math.sin(tick / 5) > 0.6 ? 1 : 0);
    return [
      {
        label: 'Speaking pace',
        value: `${pace} wpm`,
        pct: `${Math.min(100, Math.round((pace / 170) * 100))}%`,
        color: pace > 165 ? '#E1786A' : '#1FA463',
      },
      {
        label: 'Filler words',
        value: `${fillers} / min`,
        pct: `${fillers * 18}%`,
        color: fillers > 3 ? '#E1786A' : '#5BD08C',
      },
      { label: 'Confidence', value: `${conf}%`, pct: `${conf}%`, color: '#1FA463' },
    ];
  }, [tick]);

  const isLive = view === 'live';
  const isSummary = view === 'summary';
  const statusText = paused ? 'PAUSED' : 'LIVE · COPILOT ON';
  const pauseLabel = paused ? '▶ Resume' : '❚❚ Pause';
  const progressLabel = `Question ${safeStep + 1} of ${script.length}`;

  const togglePause = () => setPaused((p) => !p);
  const nextQuestion = () => {
    setStep((s) => Math.min(s + 1, script.length - 1));
    setStepAcc(0);
  };
  const endSession = () => setView('summary');

  /* ------------------------------------------------- shared style atoms --- */
  const cardBox = {
    background: '#1A1813',
    border: '1px solid #2C2A22',
    borderRadius: 18,
  };
  const tabBtn = (on) => ({
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: on ? '#FBF8F1' : '#8A8378',
    background: on ? '#2C2A22' : 'transparent',
    border: 'none',
    borderRadius: 999,
    padding: '7px 14px',
    cursor: 'pointer',
  });

  return (
    <>
      <Head>
        <title>Live Interview Copilot — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #34322a;
          border-radius: 8px;
        }
        #jbapp button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.3);
        }
        @keyframes jbliveblink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
        @keyframes jbeq {
          0%,
          100% {
            height: 6px;
          }
          50% {
            height: 16px;
          }
        }
        @keyframes jbfadeup {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#100F0B',
          fontFamily: 'var(--jb-font-sans)',
          color: '#E4DECF',
        }}
      >
        <AppSidebar active="live" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* TOPBAR */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '14px 28px',
              background: 'rgba(16,15,11,0.9)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #2C2A22',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                background: 'rgba(225,120,106,0.12)',
                border: '1px solid #4A332E',
                borderRadius: 999,
                padding: '7px 13px',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#E1786A',
                  animation: 'jbliveblink 1.2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: '#E89A8E',
                }}
              >
                {statusText}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Link
                href={appRoute('App Company.dc.html')}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: '#EAF6EE',
                  color: '#157A49',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                {header.tag}
              </Link>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>
                  {header.company} · {header.role}
                </div>
                <div style={{ fontSize: 12, color: '#8A8378' }}>{header.sub}</div>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <span
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 15,
                color: '#FBF8F1',
              }}
            >
              {fmt(elapsed)}
            </span>

            <div
              style={{
                display: 'flex',
                background: '#1E1C15',
                border: '1px solid #2C2A22',
                borderRadius: 999,
                padding: 3,
              }}
            >
              <button onClick={() => setView('live')} style={tabBtn(isLive)}>
                Live
              </button>
              <button onClick={() => setView('summary')} style={tabBtn(isSummary)}>
                Summary
              </button>
            </div>

            <button
              onClick={endSession}
              style={{
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: '#C0392B',
                border: 'none',
                borderRadius: 999,
                padding: '9px 16px',
                cursor: 'pointer',
              }}
            >
              End session
            </button>
          </header>

          {/* LIVE VIEW */}
          {isLive && loading && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <LoadingState label="Connecting to your session…" />
              </div>
            </div>
          )}
          {isLive && !loading && error && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <ErrorState error={error} />
              </div>
            </div>
          )}
          {isLive && !loading && !error && !hasScript && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <EmptyState
                  icon="◉"
                  title="No live session running"
                  hint="Launch a mock interview to start the copilot — your live transcript and coaching will appear here."
                  action={
                    <Link
                      href={appRoute('App Mock Interview.dc.html')}
                      style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0C2C1C',
                        background: '#1FA463',
                        borderRadius: 999,
                        padding: '11px 20px',
                        textDecoration: 'none',
                      }}
                    >
                      Start a mock interview →
                    </Link>
                  }
                />
              </div>
            </div>
          )}
          {isLive && !loading && !error && hasScript && (
            <div
              style={{
                padding: '24px 28px 40px',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
                gap: 18,
                alignItems: 'start',
              }}
            >
              {/* LEFT: TRANSCRIPT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
                <div style={{ ...cardBox, overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 20px',
                      borderBottom: '1px solid #2C2A22',
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#FBF8F1' }}>
                      Live transcript
                    </span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 18 }}>
                      {[0, 0.2, 0.4, 0.1].map((d, i) => (
                        <span
                          key={i}
                          style={{
                            width: 3,
                            background: '#1FA463',
                            borderRadius: 2,
                            animation: `jbeq 0.9s ease-in-out infinite ${d}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ flex: 1 }} />
                    {/* SELF VIDEO TILE */}
                    <div
                      style={{
                        position: 'relative',
                        width: 128,
                        height: 74,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid #34322A',
                        background:
                          'repeating-linear-gradient(135deg,#24221B,#24221B 8px,#1E1C15 8px,#1E1C15 16px)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          color: '#6B6456',
                        }}
                      >
                        camera
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          left: 6,
                          bottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          background: 'rgba(16,15,11,0.7)',
                          borderRadius: 6,
                          padding: '3px 7px',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            color: '#E4DECF',
                          }}
                        >
                          You
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      maxHeight: 440,
                      overflowY: 'auto',
                    }}
                  >
                    {transcript.map((line, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12 }}>
                        <span
                          style={{
                            flexShrink: 0,
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: line.bg,
                            color: line.fg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {line.tag}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: line.nameColor }}>
                              {line.speaker}
                            </span>
                            {line.isLive && (
                              <span
                                style={{
                                  fontFamily: 'var(--jb-font-mono)',
                                  fontSize: 11,
                                  color: '#E1786A',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                ● speaking
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: line.textColor }}>
                            {line.text}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        paddingLeft: 42,
                      }}
                    >
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span
                            key={i}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#5A544A',
                              animation: `jbliveblink 1s ease-in-out infinite ${d}s`,
                            }}
                          />
                        ))}
                      </span>
                      <span style={{ fontSize: 12.5, color: '#6B6456' }}>
                        You&apos;re answering — copilot is listening
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 20px',
                      borderTop: '1px solid #2C2A22',
                    }}
                  >
                    <button
                      onClick={togglePause}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#E4DECF',
                        background: '#24221B',
                        border: '1px solid #34322A',
                        borderRadius: 10,
                        padding: '9px 15px',
                        cursor: 'pointer',
                      }}
                    >
                      {pauseLabel}
                    </button>
                    <button
                      onClick={nextQuestion}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#100F0B',
                        background: '#1FA463',
                        border: 'none',
                        borderRadius: 10,
                        padding: '9px 15px',
                        cursor: 'pointer',
                      }}
                    >
                      Next question →
                    </button>
                    <div style={{ flex: 1 }} />
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 11,
                        color: '#6B6456',
                      }}
                    >
                      {progressLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: AI + COACHING + FACTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
                {/* AI ANSWER CARD */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#15140F',
                    border: '1px solid #1FA463',
                    borderRadius: 18,
                    padding: 22,
                    animation: 'jbfadeup 0.4s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(circle at 90% 0%, rgba(31,164,99,0.16), transparent 60%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#5BD08C',
                        }}
                      >
                        ✦ Suggested answer
                      </span>
                      <span style={{ display: 'inline-flex', gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span
                            key={i}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              background: '#1FA463',
                              animation: `jbliveblink 1s ease-in-out infinite ${d}s`,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.5,
                        fontWeight: 600,
                        color: '#FBF8F1',
                        margin: '0 0 16px',
                      }}
                    >
                      {card.direct}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                      {card.star.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10 }}>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: 'var(--jb-font-mono)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#0C2C1C',
                              background: '#5BD08C',
                              borderRadius: 5,
                              padding: '2px 6px',
                              height: 'fit-content',
                              marginTop: 1,
                            }}
                          >
                            {s.k}
                          </span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#D8D2C4' }}>
                            {s.t}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {card.facts.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            color: '#5BD08C',
                            background: 'rgba(31,164,99,0.1)',
                            border: '1px solid #2C4A38',
                            borderRadius: 7,
                            padding: '4px 9px',
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COACHING METER */}
                <div style={{ ...cardBox, padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1', marginBottom: 16 }}>
                    Delivery coaching
                  </div>
                  {meters.map((m, i) => (
                    <div key={i} style={{ marginBottom: 15 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 7,
                        }}
                      >
                        <span style={{ fontSize: 13, color: '#B8B1A4' }}>{m.label}</span>
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: m.color,
                          }}
                        >
                          {m.value}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          background: '#2C2A22',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: m.pct,
                            height: '100%',
                            background: m.color,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* RESUME FACTS CONTEXT */}
                <div style={{ ...cardBox, padding: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#8A8378',
                      marginBottom: 14,
                    }}
                  >
                    Pulled from your resume
                  </div>
                  {context.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '9px 0',
                        borderBottom: '1px solid #24221B',
                      }}
                    >
                      <span style={{ flexShrink: 0, color: '#5BD08C', fontSize: 13 }}>▪</span>
                      <span style={{ fontSize: 13, lineHeight: 1.45, color: '#C9C3B5' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY VIEW */}
          {isSummary && loading && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <LoadingState label="Loading session summary…" />
              </div>
            </div>
          )}
          {isSummary && !loading && error && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <ErrorState error={error} />
              </div>
            </div>
          )}
          {isSummary && !loading && !error && !hasSummary && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 18 }}>
                <EmptyState
                  icon="✓"
                  title="No completed session yet"
                  hint="Finish a live interview and your scored summary — strengths, areas to sharpen, and per-question grades — will appear here."
                  action={
                    <button
                      type="button"
                      onClick={() => setView('live')}
                      style={{
                        marginTop: 8,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0C2C1C',
                        background: '#1FA463',
                        border: 'none',
                        borderRadius: 999,
                        padding: '11px 20px',
                        cursor: 'pointer',
                      }}
                    >
                      ← Back to live
                    </button>
                  }
                />
              </div>
            </div>
          )}
          {isSummary && !loading && !error && hasSummary && (
            <div style={{ padding: 28, maxWidth: 980, width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  ...cardBox,
                  borderRadius: 20,
                  padding: '28px 30px',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 96,
                    height: 96,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: `conic-gradient(#1FA463 0% ${scorePct}%, #2C2A22 ${scorePct}% 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: '50%',
                      background: '#1A1813',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 26,
                        fontWeight: 600,
                        color: '#5BD08C',
                        lineHeight: 1,
                      }}
                    >
                      {avgScore.toFixed(1)}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 11,
                        color: '#8A8378',
                      }}
                    >
                      / 10
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#5BD08C',
                      marginBottom: 8,
                    }}
                  >
                    Session complete · {fmt(elapsed)}
                  </div>
                  <h1
                    style={{
                      fontFamily: 'var(--jb-font-display)',
                      fontWeight: 400,
                      fontSize: 34,
                      lineHeight: 1.05,
                      color: '#FBF8F1',
                      margin: '0 0 6px',
                    }}
                  >
                    Session complete.
                  </h1>
                  <p style={{ fontSize: 14.5, color: '#B8B1A4', margin: 0 }}>
                    You answered {scores.length} {scores.length === 1 ? 'question' : 'questions'} in
                    this session.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 18,
                  marginBottom: 18,
                }}
              >
                <div style={{ ...cardBox, padding: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#5BD08C', marginBottom: 14 }}>
                    What landed well
                  </div>
                  {strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
                      <span style={{ color: '#1FA463' }}>✓</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#D8D2C4' }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...cardBox, padding: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#E1786A', marginBottom: 14 }}>
                    Sharpen before the call
                  </div>
                  {improvements.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
                      <span style={{ color: '#E1786A' }}>→</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#D8D2C4' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...cardBox, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '18px 22px',
                    borderBottom: '1px solid #2C2A22',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#FBF8F1',
                  }}
                >
                  Per-question scores
                </div>
                {scores.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '15px 22px',
                      borderBottom: '1px solid #24221B',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 18,
                        fontWeight: 600,
                        color: q.color,
                        width: 34,
                      }}
                    >
                      {q.score}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: '#D8D2C4' }}>{q.q}</span>
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 11,
                        color: q.color,
                      }}
                    >
                      {q.label}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 11, marginTop: 22, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setView('live');
                    setStep(1);
                    setStepAcc(0);
                    setPaused(false);
                  }}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#100F0B',
                    background: '#1FA463',
                    border: 'none',
                    borderRadius: 999,
                    padding: '12px 22px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back to live
                </button>
                <Link
                  href={appRoute('App Interview.dc.html')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#E4DECF',
                    background: '#24221B',
                    border: '1px solid #34322A',
                    borderRadius: 999,
                    padding: '12px 22px',
                    textDecoration: 'none',
                  }}
                >
                  Interview prep
                </Link>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                position: 'fixed',
                bottom: 16,
                right: 18,
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11,
                color: '#6B6456',
              }}
            >
              connecting…
            </div>
          )}
        </main>
      </div>
    </>
  );
}
