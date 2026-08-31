'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  BigCount,
  TableHead,
  Row,
  EndRule,
  MonoButton,
  mono,
  covInk,
} from '@/components/app/v3/kit';
import { getInterestedJobs, markJobAsInterested } from '@/services/savedApi';

/* ------------------------------------------------------------- normalize --- */
// Turn whatever the API returns into the shape the row renderer expects.
function normalizeApiJobs(payload) {
  let list = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.interested)) list = payload.interested;
  else if (Array.isArray(payload?.matches)) list = payload.matches;
  else if (Array.isArray(payload?.jobs)) list = payload.jobs;
  else if (Array.isArray(payload?.data)) list = payload.data;

  if (!list.length) return [];

  return list.map((raw, i) => {
    const job = raw.job || raw.jobId || raw; // matches often nest the job doc
    const id = String(raw._id || raw.id || job._id || job.id || `job-${i}`);
    const company = job.company || job.companyName || raw.company || 'Company';
    const role = job.title || job.role || raw.title || 'Role';
    const scoreRaw = raw.matchScore ?? raw.score ?? job.matchScore ?? job.match;
    const score =
      scoreRaw == null || !Number.isFinite(Number(scoreRaw))
        ? null
        : Math.round(Number(scoreRaw) <= 1 ? Number(scoreRaw) * 100 : Number(scoreRaw));

    const savedAt = raw.updatedAt || raw.savedAt || raw.createdAt || job.updatedAt;
    const savedTs = savedAt ? new Date(savedAt).getTime() : list.length - i;

    /*
     * v3's saved row ends in a "closes" column. The Job schema has no closing
     * date, so this shows how long the role has been saved instead — a real
     * fact, where a deadline would be invented. Swap it the moment a
     * closesAt lands on the job document.
     */
    const days = savedAt ? Math.floor((Date.now() - savedTs) / 86400000) : null;

    return {
      id,
      company,
      role,
      score,
      savedTs,
      age: days == null ? '—' : days <= 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`,
    };
  });
}

/* ------------------------------------------------------------- component --- */
export default function AppSaved() {
  const [jobs, setJobs] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInterestedJobs();
        if (cancelled) return;
        // Always reflect the real payload — empty array when the user has none.
        setJobs(normalizeApiJobs(data));
      } catch (err) {
        if (!cancelled) setError(err || new Error('Could not load your saved roles'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => jobs.filter((j) => !removed.includes(j.id)).sort((a, b) => b.savedTs - a.savedTs),
    [jobs, removed],
  );

  const remove = async (id) => {
    setRemoved((prev) => [...prev, id]); // optimistic
    try {
      await markJobAsInterested(id, false);
    } catch {
      setRemoved((prev) => prev.filter((x) => x !== id)); // put it back
    }
  };

  const COLS = '34px 1fr 140px 110px 78px 78px';

  return (
    <>
      <Head>
        <title>Saved · Jobocate</title>
      </Head>

      <Screen>
        <div style={{ marginBottom: 22 }}>
          <BigCount value={visible.length} caption="Saved roles · not yet applied" />
        </div>

        {loading && <LoadingState label="Loading your saved roles…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && visible.length > 0 && (
          <>
            <TableHead cols={COLS} labels={['Cov', 'Role', 'Company', 'Saved', '', '']} />
            {visible.map((j) => (
              <Row key={j.id} cols={COLS}>
                <span
                  style={{
                    fontFamily: 'var(--jb-v3-font-mono)',
                    fontSize: 14,
                    color: covInk(j.score),
                  }}
                >
                  {j.score ?? '—'}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{j.role}</span>
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{j.company}</span>
                <span style={mono(10, '0.1em')}>{j.age}</span>
                <MonoButton block href="/app/apply" filled>
                  Apply
                </MonoButton>
                <MonoButton block onClick={() => remove(j.id)}>
                  Remove
                </MonoButton>
              </Row>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            title="Nothing saved yet"
            hint="Save a role from Matches and it waits here until you are ready to apply."
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
