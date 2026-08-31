'use client';

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { ErrorState, InlineError, LoadingState } from '@/components/app/AppStates';
import {
  Screen,
  CellGrid,
  Cell,
  Label,
  Row,
  EndRule,
  MonoButton,
  MonoSwitch,
  mono,
  covInk,
} from '@/components/app/v3/kit';
import {
  getUserPreferences,
  updateUserPreferences,
  queueApplication,
  getMyApplications,
} from '@/services/autoApplyApi';

/* ---------------------------------------------------------------- utils --- */
const fmtSalary = (job = {}) => {
  const min = job.salaryMin ?? job.salary_min;
  const max = job.salaryMax ?? job.salary_max;
  const k = (v) => Math.round(Number(v) / 1000);
  if (min && max) return `${k(min)}–${k(max)}k`;
  if (min) return `${k(min)}k+`;
  return job.salary || '—';
};

const fmtMatch = (val) => {
  if (val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

function normalizePreferences(prefs) {
  if (!prefs) return null;
  const limit = prefs.dailyLimit ?? prefs.autoApplyDailyLimit ?? prefs.dailyApplyLimit;
  const minScore = prefs.minMatchScore ?? prefs.minScore ?? prefs.autoApplyMinScore;
  const roles = prefs.roles || prefs.targetRoles || prefs.jobTitles;
  const workType = prefs.workType || prefs.workTypes || prefs.workArrangement;
  const join = (v) => (Array.isArray(v) ? v.join(' · ') : v) || '—';
  return {
    rules: [
      { label: 'Daily limit', value: limit ? `${limit} / day` : '—' },
      { label: 'Min. coverage', value: minScore ? `${minScore} or higher` : '—' },
      { label: 'Roles', value: join(roles) },
      { label: 'Work type', value: join(workType) },
    ],
    autoApply: prefs.autoApply ?? prefs.autoApplyEnabled ?? false,
    dailyLimit: limit ?? null,
  };
}

function normalizeQueueItem(app) {
  const job = app.job || app.jobPosting || app;
  const company = job.company || job.companyName || app.company || '—';
  const role = job.title || job.role || job.jobTitle || app.role || 'Untitled role';
  return {
    id: app.id || app._id || app.jobId || job.id || role,
    jobId: app.jobId || job.id || job._id,
    company,
    role,
    salary: fmtSalary(job),
    score: fmtMatch(app.matchScore ?? app.score ?? job.matchScore),
    state: String(app.status || 'queued').replace(/_/g, ' '),
  };
}

const COLS = '34px 1fr 150px 170px 84px';

/* ----------------------------------------------------------------- page --- */
export default function AppAutoApply() {
  const [on, setOn] = useState(false);
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [dailyLimit, setDailyLimit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      let failures = 0;

      try {
        const res = await getUserPreferences();
        const prefs = normalizePreferences(res?.preferences || res);
        if (!cancelled) {
          setRules(prefs ? prefs.rules : []);
          setOn(!!prefs?.autoApply);
          setDailyLimit(prefs?.dailyLimit ?? null);
        }
      } catch {
        failures += 1;
      }

      try {
        const res = await getMyApplications({ limit: 50 });
        const apps = res?.applications || res || [];
        if (!cancelled) {
          const pendingStatuses = ['queued', 'pending', 'pending_review', 'draft', 'ready', 'awaiting_approval'];
          const status = (a) => String(a.status || '').toLowerCase();
          const list = Array.isArray(apps) ? apps : [];
          const pending = list.filter((a) => pendingStatuses.includes(status(a)));
          setQueue((pending.length ? pending : list).map(normalizeQueueItem));
        }
      } catch {
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

  const toggle = useCallback(async () => {
    const next = !on;
    setOn(next); // optimistic
    setActionError(null);
    try {
      await updateUserPreferences({ autoApply: next });
    } catch (e) {
      setOn(!next);
      setActionError(e || new Error('Could not change that setting'));
    }
  }, [on]);

  const approve = useCallback(async (item) => {
    setBusyId(item.id);
    setActionError(null);
    try {
      await queueApplication(item.jobId || item.id);
      setQueue((prev) => prev.filter((q) => q.id !== item.id));
    } catch (e) {
      setActionError(e || new Error('Could not approve that draft'));
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Auto-apply · Jobocate</title>
      </Head>

      <Screen>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            marginBottom: 30,
          }}
        >
          <div>
            <div style={{ ...mono(), marginBottom: 10 }}>
              Drafted · nothing sends without approval
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}
              >
                {queue.length}
              </span>
              {dailyLimit && (
                <span style={mono(11, '0')}>/ {dailyLimit} daily cap</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={mono(10, '0.12em', on ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)')}>
              {on ? 'On' : 'Off'}
            </span>
            <MonoSwitch checked={on} onChange={toggle} label="Auto-apply" />
          </div>
        </div>

        {actionError && <InlineError error={actionError} />}

        {rules.length > 0 && (
          <CellGrid cols={4} style={{ marginBottom: 34 }}>
            {rules.map((r) => (
              <Cell key={r.label} label={r.label} value={r.value} valueSize={17} />
            ))}
          </CellGrid>
        )}

        {loading && <LoadingState label="Loading your queue…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && (
          <>
            <Label>Queue</Label>
            {queue.map((q) => (
              <Row key={q.id} cols={COLS}>
                <span
                  style={{
                    fontFamily: 'var(--jb-v3-font-mono)',
                    fontSize: 14,
                    color: covInk(q.score),
                  }}
                >
                  {q.score ?? '—'}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{q.role}</span>
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{q.company}</span>
                <span style={mono(10, '0.1em')}>{q.state}</span>
                <MonoButton block onClick={() => approve(q)} disabled={busyId === q.id}>
                  {busyId === q.id ? '…' : 'Approve'}
                </MonoButton>
              </Row>
            ))}
            {queue.length === 0 && (
              <Row cols="1fr">
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>
                  Nothing drafted right now.
                </span>
              </Row>
            )}
            <EndRule />
          </>
        )}
      </Screen>
    </>
  );
}
