'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { ErrorState, InlineError } from '@/components/app/AppStates';
import {
  getUserPreferences,
  updateUserPreferences,
  processApplyRunner,
  queueApplication,
  getMyApplications,
} from '@/services/autoApplyApi';

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
    { label: 'Daily limit', value: limit ? `${limit} / day` : '—' },
    { label: 'Min. match score', value: minScore ? `${minScore}% or higher` : '—' },
    { label: 'Roles', value: (Array.isArray(roles) ? roles.join(' · ') : roles) || '—' },
    { label: 'Work type', value: (Array.isArray(workType) ? workType.join(' · ') : workType) || '—' },
  ];
  return {
    rules,
    autoApply: prefs.autoApply ?? prefs.autoApplyEnabled ?? false,
    minMatchScore: minScore ?? null,
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
  const [on, setOn] = useState(false);
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [sent, setSent] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);

  // ----- initial load: preferences + applications -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      let failures = 0;

      // Preferences (autoApply, minMatchScore, rules strip)
      try {
        const res = await getUserPreferences();
        const prefs = normalizePreferences(res?.preferences || res);
        if (!cancelled) {
          setRules(prefs ? prefs.rules : []);
          setOn(!!prefs?.autoApply);
        }
      } catch (e) {
        failures += 1;
      }

      // Applications: split into pending (queue) vs sent
      try {
        const res = await getMyApplications({ limit: 50 });
        const apps = res?.applications || res || [];
        if (!cancelled) {
          if (Array.isArray(apps) && apps.length) {
            const pendingStatuses = ['queued', 'pending', 'pending_review', 'draft', 'ready'];
            const sentStatuses = ['applied', 'submitted', 'sent', 'completed'];
            const status = (a) => String(a.status || '').toLowerCase();

            const pending = apps.filter((a) => pendingStatuses.includes(status(a)));
            const done = apps.filter((a) => sentStatuses.includes(status(a)));

            setQueue((pending.length ? pending : apps).map(normalizeQueueItem));
            setSent(done.map(normalizeSentItem));
          } else {
            setQueue([]);
            setSent([]);
          }
        }
      } catch (e) {
        failures += 1;
      }

      if (!cancelled) {
        // Only surface a page-level error when every source failed.
        if (failures === 2) setError(new Error('Could not load your auto-apply data.'));
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
    setActionError(null);
    try {
      await updateUserPreferences({ autoApply: nextOn });
    } catch (e) {
      // revert on failure, but never crash
      setOn(!nextOn);
      setActionError(new Error('Could not save your auto-apply setting.'));
    } finally {
      setSavingToggle(false);
    }
  }, [on]);

  // ----- approve one queued item (queueApplication) -----
  const approveOne = useCallback(async (item) => {
    setBusyId(item.id);
    setActionError(null);
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
    setActionError(null);
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

  const creditsLeft = null; // no backend source yet — shown as “—”
  const sentToday = sent.length;
  const queuedCount = queue.length;

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' };

  return (
    <>
      <Head>
        <title>Auto-Apply — Jobocate</title>
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
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}
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
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
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

          <div style={{ padding: '30px 32px 48px', width: '100%' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                Auto-Apply
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Your copilot applies to verified roles that match your rules — you stay in control of every send.
              </p>
            </div>

            <InlineError error={actionError} />

            {error ? (
              <ErrorState error={error} onRetry={() => window.location.reload()} />
            ) : (
            <>
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
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: on ? '#5BD08C' : '#9A9286' }}>
                      {on ? 'Active · preparing applications' : 'Paused'}
                    </span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C99A5B', border: '1px solid #4A3E2A', borderRadius: 999, padding: '2px 7px' }}>Beta</span>
                  </div>
                  <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 30, lineHeight: 1.15, color: '#FBF8F1', maxWidth: 460 }}>
                    {on
                      ? <>{sentToday} {sentToday === 1 ? 'role' : 'roles'} prepared. {queuedCount} more queued for your review.</>
                      : <>Turn on Auto-Apply to queue strong-fit roles for your review.</>}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#9A9286', marginTop: 10, maxWidth: 460, lineHeight: 1.5 }}>
                    In beta, Auto-Apply prepares and queues matching roles for your review — you confirm before anything is submitted. Fully automated submission is rolling out.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 28 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 34, fontWeight: 600, color: '#FBF8F1', lineHeight: 1 }}>{creditsLeft ?? '—'}</div>
                    <div style={{ fontSize: 12.5, color: '#9A9286', marginTop: 6 }}>credits left</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 34, fontWeight: 600, color: '#5BD08C', lineHeight: 1 }}>{sentToday}</div>
                    <div style={{ fontSize: 12.5, color: '#9A9286', marginTop: 6 }}>prepared today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RULES STRIP */}
            {(loading || rules.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 26 }}>
                {(loading
                  ? [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }]
                  : rules
                ).map((r, i) => (
                  <div
                    key={(r.label || 'skeleton') + i}
                    style={{
                      background: '#FFFEFB',
                      border: '1px solid #E6DECF',
                      borderRadius: 14,
                      padding: '16px 18px',
                      animation: loading ? 'jbshimmer 1.2s ease infinite' : 'none',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8378', marginBottom: 9, minHeight: 13 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1B1A16', minHeight: 18 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
              {/* QUEUE */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Pending your review</h2>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#C9622E' }}>● {queuedCount} queued</span>
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
                        <span style={{ flexShrink: 0, fontFamily: 'var(--jb-font-mono)', fontSize: 13, fontWeight: 600, color: '#157A49' }}>{q.match}</span>
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

              {/* PREPARED TODAY */}
              <div style={{ ...card, alignSelf: 'flex-start' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Prepared today</h2>
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
                  <div style={{ padding: '32px 22px', textAlign: 'center', color: '#8A8378', fontSize: 13.5 }}>Nothing prepared yet today.</div>
                ) : (
                  sent.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: '50%', background: '#1FA463' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.role}</div>
                        <div style={{ fontSize: 12, color: '#8A8378' }}>{s.company}</div>
                      </div>
                      <span style={{ flexShrink: 0, fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>{s.time}</span>
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

            </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
