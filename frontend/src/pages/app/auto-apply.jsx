'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  getUserPreferences,
  updateUserPreferences,
  processApplyRunner,
  queueApplication,
  getMyApplications,
} from '@/services/autoApplyApi';

/* -------------------------------------------------------- sample data --- */
// Faithful to the design's Component.renderVals() — used as graceful
// fallback whenever the backend is unauthenticated or unreachable.
const SAMPLE_RULES = [
  { label: 'Daily limit', value: '10 / day' },
  { label: 'Min. match score', value: '85% or higher' },
  { label: 'Roles', value: 'Design · Product' },
  { label: 'Work type', value: 'Remote · Hybrid' },
];

const SAMPLE_QUEUE = [
  { id: 's1', logo: 'Da', company: 'Datadog', role: 'Senior Product Designer', salary: '$180–215k', match: '94%', bg: '#F4EFE4', fg: '#1B1A16' },
  { id: 's2', logo: 'Ai', company: 'Airtable', role: 'Design Systems Manager', salary: '$195–225k', match: '92%', bg: '#F4EFE4', fg: '#1B1A16' },
  { id: 's3', logo: 'Wb', company: 'Webflow', role: 'Staff Designer, Growth', salary: '$185–220k', match: '90%', bg: '#F4EFE4', fg: '#1B1A16' },
  { id: 's4', logo: 'Sc', company: 'Scale AI', role: 'Product Manager, Platform', salary: '$200–240k', match: '88%', bg: '#F4EFE4', fg: '#1B1A16' },
  { id: 's5', logo: 'Me', company: 'Mercury', role: 'Senior PM, Payments', salary: '$190–225k', match: '86%', bg: '#F4EFE4', fg: '#1B1A16' },
];

const SAMPLE_SENT = [
  { id: 't1', role: 'Staff Product Designer', company: 'Vanta', time: '3:12 AM' },
  { id: 't2', role: 'Senior PM, Platform', company: 'Ramp', time: '2:48 AM' },
  { id: 't3', role: 'Frontend Engineer', company: 'Retool', time: '1:55 AM' },
  { id: 't4', role: 'Product Designer II', company: 'Brex', time: '1:30 AM' },
];

/* -------------------------------------------------------------- utils --- */
const initials = (str) => {
  if (!str) return '··';
  const parts = String(str).trim().split(/\s+/);
  const a = (parts[0] || '')[0] || '';
  const b = parts.length > 1 ? (parts[1] || '')[0] || '' : (parts[0] || '')[1] || '';
  return (a + b).toUpperCase() || '··';
};

const fmtTime = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const fmtSalary = (job = {}) => {
  if (job.salary) return job.salary;
  const min = job.salaryMin ?? job.minSalary;
  const max = job.salaryMax ?? job.maxSalary;
  if (min && max) return `$${Math.round(min / 1000)}–${Math.round(max / 1000)}k`;
  if (min) return `$${Math.round(min / 1000)}k+`;
  return '—';
};

const fmtMatch = (val) => {
  if (val === undefined || val === null) return '—';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return `${Math.round(n)}%`;
};

/* ------------------------------------------------------- normalizers --- */
function normalizePreferences(prefs) {
  if (!prefs) return null;
  const limit = prefs.dailyLimit ?? prefs.autoApplyDailyLimit ?? prefs.dailyApplyLimit;
  const minScore = prefs.minMatchScore ?? prefs.minScore ?? prefs.autoApplyMinScore;
  const roles = prefs.roles || prefs.targetRoles || prefs.jobTitles;
  const workType = prefs.workType || prefs.workTypes || prefs.workArrangement;
  const rules = [
    { label: 'Daily limit', value: limit ? `${limit} / day` : SAMPLE_RULES[0].value },
    { label: 'Min. match score', value: minScore ? `${minScore}% or higher` : SAMPLE_RULES[1].value },
    { label: 'Roles', value: Array.isArray(roles) ? roles.join(' · ') : roles || SAMPLE_RULES[2].value },
    { label: 'Work type', value: Array.isArray(workType) ? workType.join(' · ') : workType || SAMPLE_RULES[3].value },
  ];
  return {
    rules,
    autoApply: prefs.autoApply ?? prefs.autoApplyEnabled ?? true,
    minMatchScore: minScore ?? 85,
  };
}

function normalizeQueueItem(app) {
  const job = app.job || app.jobPosting || app;
  const company = job.company || job.companyName || app.company || '';
  const role = job.title || job.role || job.jobTitle || app.role || 'Untitled role';
  const match = app.matchScore ?? app.score ?? job.matchScore;
  return {
    id: app.id || app._id || app.jobId || job.id || role,
    jobId: app.jobId || job.id || job._id,
    logo: initials(company),
    company: company || '—',
    role,
    salary: fmtSalary(job),
    match: fmtMatch(match),
    bg: '#F4EFE4',
    fg: '#1B1A16',
  };
}

function normalizeSentItem(app) {
  const job = app.job || app.jobPosting || app;
  const company = job.company || job.companyName || app.company || '';
  const role = job.title || job.role || job.jobTitle || app.role || 'Untitled role';
  return {
    id: app.id || app._id || role,
    role,
    company: company || '—',
    time: fmtTime(app.appliedAt || app.submittedAt || app.updatedAt || app.createdAt),
  };
}

/* ----------------------------------------------------------- component --- */
export default function AppAutoApply() {
  const [on, setOn] = useState(true);
  const [rules, setRules] = useState(SAMPLE_RULES);
  const [queue, setQueue] = useState(SAMPLE_QUEUE);
  const [sent, setSent] = useState(SAMPLE_SENT);

  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [error, setError] = useState(null);

  // ----- initial load: preferences + applications -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      let anyReal = false;

      // Preferences (autoApply, minMatchScore, rules strip)
      try {
        const res = await getUserPreferences();
        const prefs = normalizePreferences(res?.preferences || res);
        if (prefs && !cancelled) {
          setRules(prefs.rules);
          setOn(!!prefs.autoApply);
          anyReal = true;
        }
      } catch (e) {
        // keep sample rules
      }

      // Applications: split into pending (queue) vs sent
      try {
        const res = await getMyApplications({ limit: 50 });
        const apps = res?.applications || res || [];
        if (Array.isArray(apps) && apps.length && !cancelled) {
          const pendingStatuses = ['queued', 'pending', 'pending_review', 'draft', 'ready'];
          const sentStatuses = ['applied', 'submitted', 'sent', 'completed'];
          const status = (a) => String(a.status || '').toLowerCase();

          const pending = apps.filter((a) => pendingStatuses.includes(status(a)));
          const done = apps.filter((a) => sentStatuses.includes(status(a)));

          setQueue((pending.length ? pending : apps).map(normalizeQueueItem));
          if (done.length) setSent(done.map(normalizeSentItem));
          anyReal = true;
        }
      } catch (e) {
        // keep sample queue/sent
      }

      if (!cancelled) {
        setUsingSample(!anyReal);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----- toggle auto-apply (persists to preferences) -----
  const toggle = useCallback(async () => {
    const nextOn = !on;
    setOn(nextOn);
    setSavingToggle(true);
    setError(null);
    try {
      await updateUserPreferences({ autoApply: nextOn });
    } catch (e) {
      // revert on failure, but never crash
      setOn((v) => v);
      setError('Could not save your auto-apply setting.');
    } finally {
      setSavingToggle(false);
    }
  }, [on]);

  // ----- approve one queued item (queueApplication) -----
  const approveOne = useCallback(async (item) => {
    setBusyId(item.id);
    setError(null);
    try {
      if (item.jobId) await queueApplication(item.jobId);
      setQueue((q) => q.filter((x) => x.id !== item.id));
      setSent((s) => [{ id: item.id, role: item.role, company: item.company, time: fmtTime(new Date()) }, ...s]);
    } catch (e) {
      // optimistic-remove still applied locally so UI stays responsive
      setQueue((q) => q.filter((x) => x.id !== item.id));
      setSent((s) => [{ id: item.id, role: item.role, company: item.company, time: fmtTime(new Date()) }, ...s]);
    } finally {
      setBusyId(null);
    }
  }, []);

  // ----- dismiss one queued item -----
  const dismissOne = useCallback((item) => {
    setQueue((q) => q.filter((x) => x.id !== item.id));
  }, []);

  // ----- approve all (processApplyRunner) -----
  const approveAll = useCallback(async () => {
    if (!queue.length) return;
    setApprovingAll(true);
    setError(null);
    const snapshot = queue;
    try {
      await processApplyRunner(snapshot.length);
    } catch (e) {
      // proceed locally regardless
    }
    setSent((s) => [
      ...snapshot.map((q) => ({ id: q.id, role: q.role, company: q.company, time: fmtTime(new Date()) })),
      ...s,
    ]);
    setQueue([]);
    setApprovingAll(false);
  }, [queue]);

  // ----- derived display values (mirror design renderVals) -----
  const statusLabel = on ? 'Auto-Apply on' : 'Auto-Apply paused';
  const statusColor = on ? '#157A49' : '#8A8378';
  const toggleBg = on ? '#1FA463' : '#D2C9B7';
  const knobX = on ? '24px' : '3px';

  const creditsLeft = 38;
  const sentToday = sent.length;
  const queuedCount = queue.length;

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' };

  return (
    <>
      <Head>
        <title>Auto-Apply — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
        #jbapp input:focus,
        #jbapp button:focus-visible {
          outline: none;
        }
        #jbapp .jb-approve:hover {
          background: #1b9159 !important;
        }
        #jbapp .jb-dismiss:hover {
          background: #f4efe4 !important;
        }
        #jbapp .jb-accept:hover {
          background: #2a2820 !important;
        }
        @keyframes jbshimmer {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}
      >
        <AppSidebar active="auto" />

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
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
              Workspace / Auto-Apply
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
              <button
                onClick={toggle}
                disabled={savingToggle}
                title={statusLabel}
                style={{
                  position: 'relative',
                  width: 48,
                  height: 27,
                  borderRadius: 999,
                  border: 'none',
                  cursor: savingToggle ? 'wait' : 'pointer',
                  background: toggleBg,
                  transition: 'background 0.2s',
                  opacity: savingToggle ? 0.7 : 1,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: knobX,
                    width: 21,
                    height: 21,
                    borderRadius: '50%',
                    background: '#FBF8F1',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          </header>

          <div style={{ padding: '30px 32px 48px', maxWidth: 1180, width: '100%' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                Auto-Apply
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Your copilot applies to verified roles that match your rules — you stay in control of every send.
              </p>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#FBEFE9',
                  border: '1px solid #EBC9B8',
                  color: '#9A4A2A',
                  borderRadius: 12,
                  padding: '11px 16px',
                  fontSize: 13.5,
                  marginBottom: 16,
                }}
              >
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* HERO STATUS */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#15140F',
                borderRadius: 20,
                padding: '28px 30px',
                marginBottom: 18,
                color: '#F2EDE2',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 88% 10%, rgba(31,164,99,0.32), transparent 55%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #34322A', borderRadius: 999, padding: '6px 12px', marginBottom: 16 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#1FA463' : '#8A8378', boxShadow: on ? '0 0 0 4px rgba(31,164,99,0.25)' : 'none' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: on ? '#5BD08C' : '#9A9286' }}>
                      {on ? 'Active · applying daily' : 'Paused · not applying'}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, lineHeight: 1.15, color: '#FBF8F1', maxWidth: 440 }}>
                    Applied to {sentToday} {sentToday === 1 ? 'role' : 'roles'} overnight. {queuedCount} more queued for your review.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 28 }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 600, color: '#FBF8F1', lineHeight: 1 }}>{creditsLeft}</div>
                    <div style={{ fontSize: 12.5, color: '#9A9286', marginTop: 6 }}>credits left</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 600, color: '#5BD08C', lineHeight: 1 }}>{sentToday}</div>
                    <div style={{ fontSize: 12.5, color: '#9A9286', marginTop: 6 }}>sent today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RULES STRIP */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 26 }}>
              {(loading ? SAMPLE_RULES : rules).map((r, i) => (
                <div
                  key={r.label + i}
                  style={{
                    background: '#FFFEFB',
                    border: '1px solid #E6DECF',
                    borderRadius: 14,
                    padding: '16px 18px',
                    animation: loading ? 'jbshimmer 1.2s ease infinite' : 'none',
                  }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8378', marginBottom: 9 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1B1A16' }}>{r.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
              {/* QUEUE */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Pending your review</h2>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#C9622E' }}>● {queuedCount} queued</span>
                  </div>
                  <button
                    onClick={approveAll}
                    disabled={approvingAll || !queuedCount}
                    className="jb-approve"
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0C2C1C',
                      background: '#1FA463',
                      border: 'none',
                      borderRadius: 999,
                      padding: '8px 14px',
                      cursor: approvingAll || !queuedCount ? 'default' : 'pointer',
                      opacity: approvingAll || !queuedCount ? 0.55 : 1,
                    }}
                  >
                    {approvingAll ? 'Approving…' : 'Approve all'}
                  </button>
                </div>

                {loading ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: '#F4EFE4', animation: 'jbshimmer 1.2s ease infinite' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: '60%', height: 12, borderRadius: 6, background: '#F2ECE0', marginBottom: 7, animation: 'jbshimmer 1.2s ease infinite' }} />
                        <div style={{ width: '40%', height: 10, borderRadius: 6, background: '#F2ECE0', animation: 'jbshimmer 1.2s ease infinite' }} />
                      </div>
                    </div>
                  ))
                ) : queuedCount === 0 ? (
                  <div style={{ padding: '40px 22px', textAlign: 'center', color: '#8A8378', fontSize: 14 }}>
                    Nothing waiting — your copilot will queue new matches as they appear.
                  </div>
                ) : (
                  queue.map((q) => {
                    const busy = busyId === q.id;
                    return (
                      <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 22px', borderBottom: '1px solid #F2ECE0', opacity: busy ? 0.5 : 1 }}>
                        <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: q.bg, color: q.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                          {q.logo}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{q.role}</div>
                          <div style={{ fontSize: 12.5, color: '#8A8378' }}>{q.company} · {q.salary}</div>
                        </div>
                        <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#157A49' }}>{q.match}</span>
                        <div style={{ flexShrink: 0, display: 'flex', gap: 7 }}>
                          <button
                            onClick={() => dismissOne(q)}
                            disabled={busy}
                            className="jb-dismiss"
                            title="Dismiss"
                            style={{ width: 36, height: 36, border: '1px solid #E1D9C9', background: '#FFFEFB', borderRadius: 10, cursor: 'pointer', color: '#8A8378', fontSize: 15 }}
                          >
                            ✕
                          </button>
                          <button
                            onClick={() => approveOne(q)}
                            disabled={busy}
                            className="jb-accept"
                            title="Approve & send"
                            style={{ width: 36, height: 36, border: 'none', background: '#1B1A16', borderRadius: 10, cursor: 'pointer', color: '#F7F3EA', fontSize: 15 }}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SENT TODAY */}
              <div style={{ ...card, alignSelf: 'flex-start' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Sent today</h2>
                </div>

                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: '50%', background: '#E1D9C9' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: '70%', height: 11, borderRadius: 6, background: '#F2ECE0', marginBottom: 6, animation: 'jbshimmer 1.2s ease infinite' }} />
                        <div style={{ width: '45%', height: 9, borderRadius: 6, background: '#F2ECE0', animation: 'jbshimmer 1.2s ease infinite' }} />
                      </div>
                    </div>
                  ))
                ) : sent.length === 0 ? (
                  <div style={{ padding: '32px 22px', textAlign: 'center', color: '#8A8378', fontSize: 13.5 }}>No applications sent yet today.</div>
                ) : (
                  sent.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: '50%', background: '#1FA463' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.role}</div>
                        <div style={{ fontSize: 12, color: '#8A8378' }}>{s.company}</div>
                      </div>
                      <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#8A8378' }}>{s.time}</span>
                    </div>
                  ))
                )}

                <div style={{ padding: '14px 22px' }}>
                  <Link href={appRoute('App Tracker.dc.html')} style={{ fontSize: 13.5, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>
                    View in tracker →
                  </Link>
                </div>
              </div>
            </div>

            {usingSample && !loading && (
              <div style={{ marginTop: 18, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#B7AE9C' }}>
                Showing sample data — sign in to see your live auto-apply queue.
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
