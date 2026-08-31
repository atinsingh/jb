'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  CellGrid,
  Cell,
  TableHead,
  EndRule,
  MonoButton,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import { getMyApplications } from '@/services/trackerApi';

/* -------------------------------------------------------------------------- */
/* Status buckets mirror backend/src/schemas/application.schema.ts, plus the   */
/* upper/legacy spellings some ATS sources push.                              */
/* -------------------------------------------------------------------------- */
const STAGES = [
  {
    key: 'applied',
    title: 'Applied',
    ink: 'var(--jb-v3-fg-3)',
    statuses: [
      'pending', 'submitted', 'queued', 'applying', 'applied', 'auto_applied',
      // Pre-send states of the same application: a draft the runner filled in
      // and parked, one that needs a human to finish, or one mid-flight.
      'preparing', 'awaiting_approval', 'needs_human', 'failed',
    ],
  },
  {
    key: 'review',
    title: 'In review',
    ink: 'var(--jb-v3-viz-2)',
    statuses: ['reviewing', 'in_review', 'viewed', 'screening', 'recruiter_screen', 'under_review'],
  },
  {
    key: 'interviewing',
    title: 'Interviewing',
    ink: 'var(--jb-v3-accent)',
    statuses: ['interviewed', 'interview', 'interviewing', 'final_round', 'tech_screen', 'phone_screen', 'onsite'],
  },
  {
    key: 'offers',
    title: 'Offers',
    ink: 'var(--jb-v3-ok)',
    statuses: ['accepted', 'offer', 'offered', 'hired'],
  },
  {
    key: 'closed',
    title: 'Closed',
    ink: 'var(--jb-v3-fg-3)',
    statuses: ['rejected', 'declined', 'expired'],
  },
];

const stageFor = (status) => {
  const s = String(status || '').toLowerCase();
  for (const st of STAGES) if (st.statuses.includes(s)) return st;
  return STAGES[0];
};

/* The states that are the CANDIDATE's move, not the employer's. */
const NEEDS_YOU = {
  awaiting_approval: 'Draft waiting for your approval',
  needs_human: 'Needs you to finish the form',
  failed: 'Submission failed — retry when you can',
};

const prettyStatus = (status) => {
  const s = String(status || '').replace(/_/g, ' ').toLowerCase();
  if (!s) return 'Applied';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Short relative stamp, matching the design's "2m / 3h / 1d" column.
const shortWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const dateOnly = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const scoreOf = (a) => {
  const raw = a?.matchScore ?? a?.score ?? a?.job?.matchScore;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const toRow = (app) => {
  const status = String(app?.status || '').toLowerCase();
  const stage = stageFor(status);
  const stamp = app.appliedAt || app.submittedAt || app.createdAt;
  return {
    id: app.id || app._id || `${app.companyName || 'x'}-${app.role || app.title || 'y'}`,
    company: app.companyName || app.company || app.job?.company || app.job?.companyName || 'Company',
    role: app.role || app.title || app.job?.title || app.job?.role || 'Application',
    status,
    stageKey: stage.key,
    stageLabel: prettyStatus(app.status),
    stageInk: stage.ink,
    note: NEEDS_YOU[status] || (status === 'preparing' ? 'Being prepared now' : ''),
    urgent: !!NEEDS_YOU[status],
    fit: scoreOf(app),
    sent: dateOnly(stamp),
    age: shortWhen(app.updatedAt || stamp),
    source: app.source || app.job?.source || '—',
    location: app.job?.location || app.location || '—',
  };
};

const COLS = '62px 1fr 130px 130px 90px';

/* ----------------------------------------------------------------- the page */
export default function AppTracker() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null); // id of the expanded row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications({ limit: 200 });
      const list = res?.applications || (Array.isArray(res) ? res : []);
      setRows((Array.isArray(list) ? list : []).map(toRow));
    } catch (err) {
      setError(err || new Error('Could not load your applications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(STAGES.map((s) => [s.key, 0]));
    for (const r of rows) out[r.stageKey] += 1;
    return out;
  }, [rows]);

  return (
    <>
      <Head>
        <title>Applications · Jobocate</title>
      </Head>

      <Screen>
        <CellGrid cols={5} style={{ marginBottom: 30 }}>
          {STAGES.map((s) => (
            <Cell key={s.key} label={s.title} value={counts[s.key] ?? 0} />
          ))}
        </CellGrid>

        {loading && <LoadingState label="Loading your applications…" />}
        {!loading && error && <ErrorState error={error} onRetry={load} />}

        {!loading && !error && rows.length > 0 && (
          <>
            <TableHead cols={COLS} labels={['Sent', 'Role', 'Company', 'Stage', 'Age']} />
            {rows.map((r) => (
              <div key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  aria-expanded={open === r.id}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 0,
                    borderTop: HAIR,
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    gap: 16,
                    alignItems: 'center',
                    padding: '15px 4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <span style={{ ...mono(10.5, '0') }}>{r.sent}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>
                    {r.role}
                    {r.urgent && (
                      <span style={{ ...mono(9.5, '0.12em', 'var(--jb-v3-accent)'), marginLeft: 10 }}>
                        Needs you
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{r.company}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 13, display: 'block', background: r.stageInk }} />
                    <span style={mono(10, '0.1em', 'var(--jb-v3-fg-2)')}>{r.stageLabel}</span>
                  </span>
                  <span style={mono(10.5, '0')}>{r.age}</span>
                </button>

                {open === r.id && (
                  <div
                    style={{
                      padding: '4px 4px 20px 78px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, auto)',
                      gap: 30,
                      justifyContent: 'start',
                    }}
                  >
                    {[
                      { k: 'Coverage', v: r.fit == null ? '—' : `${r.fit}` },
                      { k: 'Location', v: r.location },
                      { k: 'Source', v: r.source },
                      { k: 'State', v: r.note || r.stageLabel },
                    ].map((d) => (
                      <div key={d.k}>
                        <div style={{ ...mono(9.5, '0.14em'), marginBottom: 5 }}>{d.k}</div>
                        <div style={{ fontSize: 13 }}>{d.v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && rows.length === 0 && (
          <EmptyState
            title="No applications yet"
            hint="Approve a draft from Auto-apply, or apply from a match, and it is tracked here."
            action={
              <MonoButton href="/app/matches" style={{ marginTop: 8 }}>
                Browse matches
              </MonoButton>
            }
          />
        )}
      </Screen>
    </>
  );
}
