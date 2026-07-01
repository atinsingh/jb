'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

/* ------------------------------------------------------------------ data --- */
// Static rule definitions (mirrors the dc Component.ruleMeta()).
const RULE_META = [
  {
    key: 'screen',
    icon: '⚖',
    iconBg: '#EDF0FE',
    iconColor: '#4263EB',
    title: 'Auto-screen & rank applicants',
    desc: 'Every new applicant is scored against the job’s must-haves and ranked by AI match.',
  },
  {
    key: 'advance',
    icon: '↑',
    iconBg: '#EDF0FE',
    iconColor: '#4263EB',
    title: 'Auto-advance strong matches',
    desc: 'Move high scorers straight into Screening without manual review.',
    control: { label: 'THRESHOLD', value: '≥ 85%', action: 'Adjust' },
  },
  {
    key: 'reject',
    icon: '↓',
    iconBg: '#FBEDE4',
    iconColor: '#C9622E',
    title: 'Auto-reject weak matches',
    desc: 'Decline applicants below the floor using a polite, role-specific template.',
    control: { label: 'THRESHOLD', value: '< 50%', action: 'Edit template' },
  },
  {
    key: 'outreach',
    icon: '✉',
    iconBg: '#EDF0FE',
    iconColor: '#4263EB',
    title: 'Send outreach to sourced candidates',
    desc: 'Reach out to matched talent-pool candidates with a personalized intro.',
    control: { label: 'DAILY CAP', value: '10 / day', action: 'Adjust' },
  },
  {
    key: 'schedule',
    icon: '◷',
    iconBg: '#EDF0FE',
    iconColor: '#4263EB',
    title: 'Auto-schedule interviews',
    desc: 'Book interviews from your interviewers’ live availability and send invites.',
    control: { label: 'REQS', value: '3 selected', action: 'Choose' },
  },
  {
    key: 'summary',
    icon: '✦',
    iconBg: '#EAF6EE',
    iconColor: '#157A49',
    title: 'Nightly summary',
    desc: 'A digest of everything Autopilot did, emailed to you at 7:00 AM.',
  },
];

const INITIAL_RULES = {
  screen: true,
  advance: true,
  reject: true,
  outreach: true,
  schedule: false,
  summary: true,
};

const INITIAL_QUEUE = [
  {
    id: 'q1',
    kind: 'advance',
    title: 'Advance Sarah Chen to Interview',
    match: '96% match',
    why: 'Ex-Plaid senior designer; cleared the screening rubric on all five must-haves and led a +31% activation redesign — well above your 85% auto-advance bar.',
    req: 'Senior Product Designer',
  },
  {
    id: 'q2',
    kind: 'reject',
    title: 'Reject 8 applicants below 50%',
    match: '',
    why: 'Eight applicants missed three or more required skills for the role. A polite, role-specific rejection template is ready to send.',
    req: 'Staff Frontend Engineer',
  },
  {
    id: 'q3',
    kind: 'outreach',
    title: 'Send 6 outreach messages',
    match: '',
    why: 'Six sourced candidates match the PM, Growth profile at 88%+ and are open to opportunities. Personalized intros drafted.',
    req: 'Product Manager, Growth',
  },
  {
    id: 'q4',
    kind: 'advance',
    title: 'Advance Priya Nair to Offer',
    match: '91% match',
    why: 'Completed all interview rounds with an average scorecard of 4.4/5 and a unanimous “strong hire” from the panel.',
    req: 'Staff Frontend Engineer',
  },
];

const LOG_RAW = [
  { text: 'Screened 37 new applicants across 3 open roles.', time: '3:12 AM', req: 'All reqs', t: 'indigo', undoable: false },
  { text: 'Advanced 6 applicants to Screening (≥85% match).', time: '3:12 AM', req: 'All reqs', t: 'indigo', undoable: true },
  { text: 'Rejected 12 applicants below 50% with the polite template.', time: '3:11 AM', req: 'Staff Frontend Eng', t: 'clay', undoable: true },
  { text: 'Sent 9 outreach messages to sourced candidates.', time: '3:09 AM', req: 'PM, Growth', t: 'indigo', undoable: true },
  { text: 'Scheduled 3 interviews from interviewer availability.', time: '3:06 AM', req: 'Senior Product Designer', t: 'green', undoable: true },
];

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

/* --------------------------------------------------------------- sample stats --- */
const INITIAL_HERO_STATS = [
  { value: '5', label: 'reqs covered', color: '#FBF8F1' },
  { value: '37', label: 'screened today', color: '#FBF8F1' },
  { value: '4', label: 'actions queued', color: '#5BD08C' },
  { value: '240/500', label: 'AI actions used', color: '#8DA2F5' },
];

/* ----------------------------------------------------------------- component --- */
export default function EmployerAutopilot() {
  const [master, setMaster] = useState(true);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [logRaw, setLogRaw] = useState(LOG_RAW);
  const [heroStats, setHeroStats] = useState(INITIAL_HERO_STATS);
  const [undone, setUndone] = useState([]);

  const on = master;

  // Fetch live autopilot data; on any failure keep the sample fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await aiRecruiterApi.autopilot();
        if (!alive || !res) return;

        if (typeof res.enabled === 'boolean') setMaster(res.enabled);

        if (res.stats) {
          const s = res.stats;
          setHeroStats([
            { value: String(s.reqsCovered ?? 0), label: 'reqs covered', color: '#FBF8F1' },
            { value: String(s.screenedToday ?? 0), label: 'screened today', color: '#FBF8F1' },
            { value: String(s.queued ?? 0), label: 'actions queued', color: '#5BD08C' },
            {
              value: `${s.actionsUsed ?? 0}/${s.actionsLimit ?? 0}`,
              label: 'AI actions used',
              color: '#8DA2F5',
            },
          ]);
        }

        if (Array.isArray(res.rules) && res.rules.length) {
          setRules((prev) => {
            const next = { ...prev };
            res.rules.forEach((r) => {
              if (r && r.id != null) next[r.id] = !!r.enabled;
            });
            return next;
          });
        }

        if (Array.isArray(res.queue) && res.queue.length) {
          setQueue(
            res.queue.map((q, i) => {
              const action = String(q.proposedAction || '').toLowerCase();
              const kind = action.includes('reject')
                ? 'reject'
                : action.includes('outreach') || action.includes('message')
                ? 'outreach'
                : 'advance';
              return {
                id: q.applicantId || `q${i}`,
                kind,
                title: `${q.proposedAction || 'Review'} ${q.name || ''}`.trim(),
                match: q.score != null ? `${q.score}% match` : '',
                why: q.rationale || '',
                req: q.currentStage || '',
              };
            }),
          );
        }

        if (Array.isArray(res.activity) && res.activity.length) {
          setLogRaw(
            res.activity.map((a) => {
              const event = String(a.event || '');
              const t = /reject/i.test(event)
                ? 'clay'
                : /schedul|interview|offer|hire/i.test(event)
                ? 'green'
                : 'indigo';
              return {
                text: `${a.name || 'Applicant'} — ${event.replace(/_/g, ' ')}`,
                time: a.at || '',
                req: a.currentStage || '',
                t,
                undoable: true,
              };
            }),
          );
        }
      } catch {
        // keep the sample fallback on any error
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleMaster = () => {
    const next = !master;
    setMaster(next);
    aiRecruiterApi.toggleAutopilot(next).catch(() => {});
  };

  const toggleRule = (key) => {
    if (on) setRules((s) => ({ ...s, [key]: !s[key] }));
  };

  const approve = (id) => setQueue((s) => s.filter((x) => x.id !== id));
  const dismiss = (id) => setQueue((s) => s.filter((x) => x.id !== id));
  const approveAll = () => setQueue([]);
  const undoLog = (i) => setUndone((s) => (s.includes(i) ? s : s.concat(i)));

  /* derived view-model — mirrors renderVals() */
  const total = RULE_META.length;
  const activeRules = useMemo(() => RULE_META.filter((m) => rules[m.key]).length, [rules]);

  const ruleVals = useMemo(
    () =>
      RULE_META.map((m, i, arr) => {
        const ron = on && rules[m.key];
        return {
          key: m.key,
          icon: m.icon,
          iconBg: ron ? m.iconBg : '#F2ECE0',
          iconColor: ron ? m.iconColor : '#A79E8F',
          title: m.title,
          desc: m.desc,
          divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
          hasControl: !!m.control && ron,
          controlLabel: m.control ? m.control.label : '',
          controlValue: m.control ? m.control.value : '',
          controlAction: m.control ? m.control.action : '',
          track: ron ? '#1FA463' : '#D2C9B7',
          knob: ron ? '20px' : '2px',
        };
      }),
    [on, rules]
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
    [queue]
  );

  const logVals = useMemo(
    () =>
      logRaw.map((l, i, arr) => {
        const isUndone = undone.includes(i);
        return {
          ...tone(l.t),
          text: l.text,
          time: l.time,
          req: l.req,
          connector: i < arr.length - 1,
          undoable: l.undoable,
          undoLabel: isUndone ? 'Undone' : 'Undo',
          undoColor: isUndone ? '#A79E8F' : '#4263EB',
          undoCursor: isUndone ? 'default' : 'pointer',
          isUndone,
          index: i,
        };
      }),
    [undone, logRaw]
  );

  /* hero view-model */
  const heroTitle = on ? 'Autopilot is ON' : 'Autopilot is paused';
  const heroSub = on
    ? 'Working across 5 reqs — screening, ranking and proposing actions for your approval.'
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

  const rulesOpacity = on ? 1 : 0.55;
  const activeRuleCount = on ? activeRules : 0;
  const hasQueue = queue.length > 0;
  const queueEmpty = queue.length === 0;
  const summaryLine =
    'Screened 37 applicants · advanced 6 · rejected 12 · sent 9 messages · scheduled 3 interviews.';

  return (
    <>
      <Head>
        <title>Autopilot · AI Hiring — Jobocate</title>
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
        #emapp .ap-approve:hover {
          background: #1b9159 !important;
        }
        #emapp .ap-edit:hover {
          background: #f4efe4 !important;
        }
        #emapp .ap-dismiss:hover {
          color: #c9622e !important;
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
                  fontFamily: "'JetBrains Mono',monospace",
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
                        fontFamily: "'Instrument Serif',serif",
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
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: masterBtnBg,
                    border: `1px solid ${masterBtnBorder}`,
                    borderRadius: 999,
                    padding: '9px 9px 9px 18px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
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
              {on && (
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
                          fontFamily: "'JetBrains Mono',monospace",
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

            {/* RULE STRIP */}
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
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>
                  {activeRuleCount} of {total} on
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 16px' }}>
                Each rule runs across your selected reqs. Tune thresholds and templates anytime.
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
                      {r.hasControl && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 9,
                            marginTop: 9,
                            background: '#FBF8F1',
                            border: '1px solid #E1D9C9',
                            borderRadius: 9,
                            padding: '6px 11px',
                          }}
                        >
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>
                            {r.controlLabel}
                          </span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#4263EB',
                            }}
                          >
                            {r.controlValue}
                          </span>
                          <span style={{ fontSize: 11, color: '#A79E8F' }}>·</span>
                          <button
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#157A49',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {r.controlAction}
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleRule(r.key)}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0' }}
                    >
                      <span
                        style={{
                          width: 42,
                          height: 24,
                          borderRadius: 999,
                          background: r.track,
                          position: 'relative',
                          display: 'block',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: r.knob,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            transition: 'left 0.2s',
                          }}
                        />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* REVIEW QUEUE */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 26,
                  }}
                >
                  Review queue
                </h2>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
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
                {hasQueue && (
                  <button
                    onClick={approveAll}
                    className="ap-approve"
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
                      padding: '9px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Approve all
                  </button>
                )}
              </div>

              {hasQueue && (
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
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16' }}>{q.title}</span>
                            {q.hasMatch && (
                              <span
                                style={{
                                  fontFamily: "'JetBrains Mono',monospace",
                                  fontSize: 10.5,
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
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 10.5,
                              color: '#A79E8F',
                              marginTop: 7,
                            }}
                          >
                            {q.req}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: '1px solid #F2ECE0',
                        }}
                      >
                        <button
                          onClick={() => approve(q.id)}
                          className="ap-approve"
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
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="ap-edit"
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1B1A16',
                            background: '#FFFEFB',
                            border: '1px solid #D9D0BE',
                            borderRadius: 999,
                            padding: '9px 15px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => dismiss(q.id)}
                          className="ap-dismiss"
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#8A8378',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '9px 8px',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {queueEmpty && (
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
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Overnight activity</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>
                  Last run · 3:12 AM
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: '#5A544A', margin: '0 0 18px' }}>{summaryLine}</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {logVals.map((l) => (
                  <div key={l.index} style={{ display: 'flex', gap: 13 }}>
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
                          fontSize: 9,
                          color: l.iconColor,
                        }}
                      >
                        {l.icon}
                      </span>
                      {l.connector && (
                        <span style={{ width: 2, flex: 1, minHeight: 18, background: '#EFE8DA' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#3A352C' }}>{l.text}</div>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 10.5,
                              color: '#A79E8F',
                              marginTop: 3,
                            }}
                          >
                            {l.time} · {l.req}
                          </div>
                        </div>
                        {l.undoable && (
                          <button
                            onClick={() => undoLog(l.index)}
                            style={{
                              flexShrink: 0,
                              fontFamily: 'inherit',
                              fontSize: 12,
                              fontWeight: 600,
                              color: l.undoColor,
                              background: 'none',
                              border: 'none',
                              cursor: l.undoCursor,
                              padding: 0,
                            }}
                          >
                            {l.undoLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
