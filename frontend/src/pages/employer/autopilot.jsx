'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

/* ----------------------------------------------------------------- style helpers --- */
const kindStyle = (k) => {
  if (k === 'reject') return { iconBg: '#FBEDE4', iconColor: '#C9622E', icon: '↓' };
  if (k === 'outreach') return { iconBg: '#EDF0FE', iconColor: '#4263EB', icon: '✉' };
  return { iconBg: '#EDF0FE', iconColor: '#4263EB', icon: '↑' };
};

const matchStyle = (m) => {
  const pct = parseInt(m, 10);
  if (pct >= 90) return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  return { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
};

const tone = (t) => {
  if (t === 'green') return { dotBg: '#EAF6EE', dotBorder: '#CDE9D6', icon: '✓', iconColor: '#157A49' };
  if (t === 'clay') return { dotBg: '#FBEDE4', dotBorder: '#EAD0C4', icon: '↓', iconColor: '#C9622E' };
  return { dotBg: '#EDF0FE', dotBorder: '#C7D2FB', icon: '•', iconColor: '#4263EB' };
};

// Derive an icon treatment for a backend autopilot rule from its id/name.
const ruleIcon = (id = '') => {
  if (/reject|stale|flag/.test(id)) return { icon: '↓', bg: '#FBEDE4', color: '#C9622E' };
  if (/schedule/.test(id)) return { icon: '◷', bg: '#EDF0FE', color: '#4263EB' };
  if (/screen/.test(id)) return { icon: '⚖', bg: '#EDF0FE', color: '#4263EB' };
  if (/summary|digest/.test(id)) return { icon: '✦', bg: '#EAF6EE', color: '#157A49' };
  return { icon: '↑', bg: '#EDF0FE', color: '#4263EB' };
};

// Format an ISO timestamp into a short time-of-day / relative label.
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/* ----------------------------------------------------------------- component --- */
export default function EmployerAutopilot() {
  const [master, setMaster] = useState(false);
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [deciding, setDeciding] = useState({}); // { [proposalId]: boolean }
  const [runningNow, setRunningNow] = useState(false);

  // Fetch live autopilot data. No sample fallback — surface real state only.
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await aiRecruiterApi.autopilot();

      setMaster(Boolean(res?.enabled));

      setStats(
        res?.stats
          ? {
              reqsCovered: res.stats.reqsCovered ?? 0,
              screenedToday: res.stats.screenedToday ?? 0,
              queued: res.stats.queued ?? 0,
              actionsUsed: res.stats.actionsUsed ?? 0,
              actionsLimit: res.stats.actionsLimit ?? 0,
            }
          : null,
      );

      setRules(
        Array.isArray(res?.rules)
          ? res.rules.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              enabled: Boolean(r.enabled),
            }))
          : [],
      );

      setQueue(
        Array.isArray(res?.queue)
          ? res.queue.map((q, i) => {
              const action = String(q.proposedAction || '').toLowerCase();
              const kind = action.includes('reject')
                ? 'reject'
                : action.includes('outreach') || action.includes('message')
                ? 'outreach'
                : 'advance';
              return {
                id: q.applicantId || `q${i}`,
                kind,
                title: `${(q.proposedAction || 'review').replace(/_/g, ' ')} · ${q.name || 'Candidate'}`,
                match: q.score != null ? `${q.score}% match` : '',
                why: q.rationale || '',
                req: q.currentStage || '',
                proposalId: q.proposalId || null,
              };
            })
          : [],
      );

      setActivity(
        Array.isArray(res?.activity)
          ? res.activity.map((a, i) => {
              const event = String(a.event || '');
              const t = /reject/i.test(event)
                ? 'clay'
                : /schedul|interview|offer|hire/i.test(event)
                ? 'green'
                : 'indigo';
              return {
                id: a.applicantId || `a${i}`,
                text: `${a.name || 'Candidate'} — ${event.replace(/_/g, ' ')}`,
                time: fmtTime(a.at),
                req: a.currentStage || '',
                t,
              };
            })
          : [],
      );
    } catch (err) {
      setError(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMaster = async () => {
    const next = !master;
    setToggling(true);
    setToggleError(null);
    setMaster(next); // optimistic
    try {
      const res = await aiRecruiterApi.toggleAutopilot(next);
      if (typeof res?.enabled === 'boolean') setMaster(res.enabled);
    } catch (err) {
      setMaster(!next); // revert
      setToggleError(err);
    } finally {
      setToggling(false);
    }
  };

  const decide = async (proposalId, decision) => {
    setDeciding((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await aiRecruiterApi.decideProposedAction(proposalId, decision);
      await load({ silent: true }); // re-fetch — the queue and activity log both change
    } catch (err) {
      console.error('Error deciding proposed action:', err);
    } finally {
      setDeciding((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const runNow = async () => {
    setRunningNow(true);
    try {
      await aiRecruiterApi.runAutopilotNow();
      await load({ silent: true });
    } catch (err) {
      console.error('Error running autopilot sweep:', err);
    } finally {
      setRunningNow(false);
    }
  };

  const on = master;

  /* derived view-models */
  const total = rules.length;
  const activeRules = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  const ruleVals = useMemo(
    () =>
      rules.map((r, i, arr) => {
        const ic = ruleIcon(r.id);
        const ron = on && r.enabled;
        return {
          key: r.id,
          icon: ic.icon,
          iconBg: ron ? ic.bg : '#F2ECE0',
          iconColor: ron ? ic.color : '#A79E8F',
          title: r.name,
          desc: r.description,
          divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
          statusLabel: r.enabled ? 'ON' : 'OFF',
          statusColor: ron ? '#157A49' : '#A79E8F',
          statusBg: ron ? '#EAF6EE' : '#F2ECE0',
          statusBorder: ron ? '#CDE9D6' : '#E1D9C9',
        };
      }),
    [on, rules],
  );

  const queueVals = useMemo(
    () =>
      queue.map((q) => {
        const ks = kindStyle(q.kind);
        const ms = q.match ? matchStyle(q.match) : null;
        return {
          ...q,
          icon: ks.icon,
          iconBg: ks.iconBg,
          iconColor: ks.iconColor,
          hasMatch: !!q.match,
          matchColor: ms ? ms.color : '',
          matchBg: ms ? ms.bg : '',
          matchBorder: ms ? ms.border : '',
        };
      }),
    [queue],
  );

  const logVals = useMemo(
    () =>
      activity.map((l, i, arr) => ({
        ...tone(l.t),
        id: l.id,
        text: l.text,
        time: l.time,
        req: l.req,
        connector: i < arr.length - 1,
      })),
    [activity],
  );

  /* hero view-model */
  const heroTitle = on ? 'Autopilot is ON' : 'Autopilot is paused';
  const heroSub = on
    ? `Working across ${stats?.reqsCovered ?? 0} reqs — screening, ranking and proposing actions for your approval.`
    : 'Resume to let AI screen applicants and queue actions across your open reqs.';
  const heroGlow = on ? 'rgba(31,164,99,0.32)' : 'rgba(122,115,103,0.18)';
  const heroIconBg = on ? '#1E2D24' : '#2C2A22';
  const heroIconColor = on ? '#5BD08C' : '#8A8378';
  const heroIconAnim = on ? 'empulse 2.4s ease-in-out infinite' : 'none';
  const masterText = on ? 'ON' : 'OFF';
  const masterTextColor = on ? '#5BD08C' : '#8A8378';
  const masterBtnBg = on ? 'rgba(31,164,99,0.12)' : '#1E1C15';
  const masterBtnBorder = on ? '#2F5C42' : '#2C2A22';
  const masterTrack = on ? '#1FA463' : '#3A382E';
  const masterKnob = on ? '22px' : '2px';

  const heroStats = stats
    ? [
        { value: String(stats.reqsCovered), label: 'reqs covered', color: '#FBF8F1' },
        { value: String(stats.screenedToday), label: 'screened today', color: '#FBF8F1' },
        { value: String(stats.queued), label: 'actions queued', color: '#5BD08C' },
        { value: `${stats.actionsUsed}/${stats.actionsLimit}`, label: 'AI actions used', color: '#8DA2F5' },
      ]
    : [];

  const rulesOpacity = on ? 1 : 0.55;
  const activeRuleCount = on ? activeRules : 0;
  const hasQueue = queue.length > 0;
  const lastRun = activity.find((a) => a.time)?.time || '';
  const summaryLine = stats
    ? `Screened ${stats.screenedToday} today · ${stats.queued} queued across ${stats.reqsCovered} reqs.`
    : '';

  return (
    <>
      <Head>
        <title>Autopilot · AI Hiring — Jobocate</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        @keyframes empulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }
        @keyframes emslide {
          from {
            opacity: 0;
            transform: translateX(-6px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="autopilot" />

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: '#1FA463' }}>✦</span>
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#9A9286',
                }}
              >
                AI / Autopilot
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <Link
              href={appRoute('Employer Copilot.dc.html')}
              style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}
            >
              Open Copilot →
            </Link>
          </header>

          <div style={{ padding: '28px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            {loading ? (
              <LoadingState label="Loading autopilot…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* STATUS HERO */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#15140F',
                    border: '1px solid #2C2A22',
                    borderRadius: 22,
                    padding: '28px 30px',
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(circle at 88% 12%, ${heroGlow}, transparent 58%)`,
                      pointerEvents: 'none',
                      transition: 'background 0.4s',
                    }}
                  />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        flexShrink: 0,
                        borderRadius: 15,
                        background: heroIconBg,
                        color: heroIconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        animation: heroIconAnim,
                      }}
                    >
                      ✦
                    </div>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h1
                          style={{
                            fontFamily: 'var(--jb-font-display)',
                            fontWeight: 400,
                            fontSize: 30,
                            lineHeight: 1.05,
                            color: '#FBF8F1',
                            margin: 0,
                          }}
                        >
                          {heroTitle}
                        </h1>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.5, color: '#B8B1A4', margin: 0 }}>{heroSub}</p>
                    </div>
                    <button
                      onClick={toggleMaster}
                      disabled={toggling}
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        background: masterBtnBg,
                        border: `1px solid ${masterBtnBorder}`,
                        borderRadius: 999,
                        padding: '9px 9px 9px 18px',
                        cursor: toggling ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: toggling ? 0.7 : 1,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: masterTextColor }}>{masterText}</span>
                      <span
                        style={{
                          width: 46,
                          height: 26,
                          borderRadius: 999,
                          background: masterTrack,
                          position: 'relative',
                          display: 'block',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: masterKnob,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            transition: 'left 0.2s',
                          }}
                        />
                      </span>
                    </button>
                  </div>
                  {on && heroStats.length > 0 && (
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        gap: 26,
                        marginTop: 22,
                        paddingTop: 20,
                        borderTop: '1px solid #2C2A22',
                        flexWrap: 'wrap',
                      }}
                    >
                      {heroStats.map((h) => (
                        <div key={h.label}>
                          <div
                            style={{
                              fontFamily: 'var(--jb-font-mono)',
                              fontSize: 22,
                              fontWeight: 600,
                              color: h.color,
                            }}
                          >
                            {h.value}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#8A8378', marginTop: 2 }}>{h.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <InlineError error={toggleError} />

                {/* RULE STRIP */}
                {rules.length > 0 && (
                  <div
                    style={{
                      background: '#FFFEFB',
                      border: '1px solid #E6DECF',
                      borderRadius: 18,
                      padding: 22,
                      marginBottom: 18,
                      opacity: rulesOpacity,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>What Autopilot does</h2>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>
                        {activeRuleCount} of {total} on
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 16px' }}>
                      Each rule runs across your open reqs while Autopilot is on.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {ruleVals.map((r) => (
                        <div
                          key={r.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 15,
                            padding: '15px 0',
                            borderBottom: `1px solid ${r.divider}`,
                          }}
                        >
                          <span
                            style={{
                              width: 38,
                              height: 38,
                              flexShrink: 0,
                              borderRadius: 10,
                              background: r.iconBg,
                              color: r.iconColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            {r.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16', marginBottom: 2 }}>{r.title}</div>
                            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#8A8378' }}>{r.desc}</div>
                          </div>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: 'var(--jb-font-mono)',
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              color: r.statusColor,
                              background: r.statusBg,
                              border: `1px solid ${r.statusBorder}`,
                              padding: '4px 10px',
                              borderRadius: 999,
                              marginTop: 4,
                            }}
                          >
                            {r.statusLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REVIEW QUEUE */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: 'var(--jb-font-display)',
                        fontWeight: 400,
                        fontSize: 26,
                      }}
                    >
                      Review queue
                    </h2>
                    <span
                      style={{
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#0C2C1C',
                        background: '#5BD08C',
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      {queue.length} PENDING
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={runNow}
                      disabled={runningNow}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0C2C1C',
                        background: '#1FA463',
                        border: 'none',
                        borderRadius: 999,
                        padding: '9px 16px',
                        cursor: runningNow ? 'wait' : 'pointer',
                        opacity: runningNow ? 0.6 : 1,
                      }}
                    >
                      ↻ {runningNow ? 'Running…' : 'Run now'}
                    </button>
                  </div>

                  {hasQueue ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {queueVals.map((q) => (
                        <div
                          key={q.id}
                          style={{
                            background: '#FFFEFB',
                            border: '1px solid #E6DECF',
                            borderRadius: 16,
                            padding: '18px 20px',
                            animation: 'emslide 0.25s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                            <span
                              style={{
                                width: 42,
                                height: 42,
                                flexShrink: 0,
                                borderRadius: 11,
                                background: q.iconBg,
                                color: q.iconColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 17,
                              }}
                            >
                              {q.icon}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 9,
                                  marginBottom: 4,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16', textTransform: 'capitalize' }}>{q.title}</span>
                                {q.hasMatch && (
                                  <span
                                    style={{
                                      fontFamily: 'var(--jb-font-mono)',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: q.matchColor,
                                      background: q.matchBg,
                                      border: `1px solid ${q.matchBorder}`,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                    }}
                                  >
                                    {q.match}
                                  </span>
                                )}
                              </div>
                              {q.why && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 7,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: '#5A544A',
                                  }}
                                >
                                  <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
                                  <span>{q.why}</span>
                                </div>
                              )}
                              {q.req && (
                                <div
                                  style={{
                                    fontFamily: 'var(--jb-font-mono)',
                                    fontSize: 11,
                                    color: '#A79E8F',
                                    marginTop: 7,
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {q.req}
                                </div>
                              )}
                            </div>
                          </div>

                          {q.proposalId ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2ECE0' }}>
                              <button
                                onClick={() => decide(q.proposalId, 'approve')}
                                disabled={deciding[q.proposalId]}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#0C2C1C',
                                  background: '#1FA463',
                                  border: 'none',
                                  borderRadius: 999,
                                  padding: '9px 17px',
                                  cursor: deciding[q.proposalId] ? 'wait' : 'pointer',
                                  opacity: deciding[q.proposalId] ? 0.6 : 1,
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => decide(q.proposalId, 'reject')}
                                disabled={deciding[q.proposalId]}
                                style={{
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#C9622E',
                                  background: 'none',
                                  border: 'none',
                                  cursor: deciding[q.proposalId] ? 'wait' : 'pointer',
                                  padding: '9px 8px',
                                  opacity: deciding[q.proposalId] ? 0.6 : 1,
                                }}
                              >
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 11.5, color: '#A79E8F', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2ECE0' }}>
                              No pending proposal for this item yet.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#FFFEFB',
                        border: '1px dashed #D2C9B7',
                        borderRadius: 16,
                        padding: 40,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          margin: '0 auto 14px',
                          borderRadius: '50%',
                          background: '#EAF6EE',
                          color: '#157A49',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        ✓
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16', marginBottom: 4 }}>Queue clear.</div>
                      <p style={{ fontSize: 13.5, color: '#8A8378', margin: 0 }}>
                        Autopilot will surface new proposed actions here as applicants arrive.
                      </p>
                    </div>
                  )}
                </div>

                {/* ACTIVITY LOG */}
                {activity.length > 0 && (
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Recent activity</h2>
                      {lastRun && (
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>
                          Last run · {lastRun}
                        </span>
                      )}
                    </div>
                    {summaryLine && <p style={{ fontSize: 13.5, color: '#5A544A', margin: '0 0 18px' }}>{summaryLine}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {logVals.map((l) => (
                        <div key={l.id} style={{ display: 'flex', gap: 13 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: l.dotBg,
                                border: `1.5px solid ${l.dotBorder}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                color: l.iconColor,
                              }}
                            >
                              {l.icon}
                            </span>
                            {l.connector && <span style={{ width: 2, flex: 1, minHeight: 18, background: '#EFE8DA' }} />}
                          </div>
                          <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#3A352C', textTransform: 'capitalize' }}>{l.text}</div>
                            <div
                              style={{
                                fontFamily: 'var(--jb-font-mono)',
                                fontSize: 11,
                                color: '#A79E8F',
                                marginTop: 3,
                                textTransform: 'capitalize',
                              }}
                            >
                              {[l.time, l.req].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
