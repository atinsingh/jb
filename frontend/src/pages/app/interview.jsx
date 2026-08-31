'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { LoadingState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  Label,
  EndRule,
  MonoButton,
  Ticks,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import { getInterviewApplications, getInterviewSessions } from '@/services/interviewApi';

/*
 * Practice banks are fixed product content — the question-bank taxonomy — not
 * user data. v3 lists them as "Banks" with a coverage meter each.
 */
const BANKS = [
  { id: 'behavioral', topic: 'Behavioral' },
  { id: 'design-critique', topic: 'Design critique' },
  { id: 'systems-design', topic: 'Systems design' },
  { id: 'negotiation', topic: 'Negotiation' },
];

export default function AppInterview() {
  const [next, setNext] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            appsRes.value?.applications || (Array.isArray(appsRes.value) ? appsRes.value : []);
          const app = apps?.[0];
          const role = app?.jobTitle || app?.role || app?.title || app?.job?.title;
          const company = app?.companyName || app?.company || app?.job?.company;
          setNext(role || company ? { role: role || 'Upcoming interview', company } : null);
        }

        if (sessRes.status === 'fulfilled') {
          const list =
            sessRes.value?.sessions ||
            (Array.isArray(sessRes.value) ? sessRes.value : sessRes.value?.data) ||
            [];
          if (Array.isArray(list)) setSessions(list);
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

  /*
   * Per-bank coverage: how many of this candidate's sessions drilled that
   * bank. Real counts only — a bank never shows progress it has not earned.
   */
  const drilled = (id) =>
    sessions.filter((s) => {
      const tag = String(s.category || s.topic || s.bank || '').toLowerCase();
      return tag.includes(id.split('-')[0]);
    }).length;

  const mostDrilled = Math.max(1, ...BANKS.map((b) => drilled(b.id)));

  return (
    <>
      <Head>
        <title>Interview prep · Jobocate</title>
      </Head>

      <Screen>
        {loading && <LoadingState label="Loading your prep…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 44, alignItems: 'start' }}>
            <div>
              <Label>Banks</Label>
              {BANKS.map((b) => {
                const n = drilled(b.id);
                return (
                  <div
                    key={b.id}
                    style={{
                      borderTop: HAIR,
                      padding: '17px 4px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 170px 70px 80px',
                      gap: 20,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{b.topic}</span>
                    <Ticks pct={n / mostDrilled} n={12} height={10} grow />
                    <span style={mono(10.5, '0')}>{n}</span>
                    <MonoButton block href={`/app/mock-interview?bank=${b.id}`}>
                      Drill
                    </MonoButton>
                  </div>
                );
              })}
              <EndRule />
            </div>

            <div>
              <div style={{ ...mono(), marginBottom: 14 }}>Answers pack</div>
              <div style={{ border: HAIR, borderRadius: 2, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span
                    style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}
                  >
                    {sessions.length}
                  </span>
                  <span style={mono(10, '0')}>
                    {sessions.length === 1 ? 'session run' : 'sessions run'}
                  </span>
                </div>
                {next && (
                  <div style={{ ...mono(10, '0.1em'), marginBottom: 14 }}>
                    Next · {[next.company, next.role].filter(Boolean).join(' · ')}
                  </div>
                )}
                <MonoButton block filled href="/app/mock-interview" style={{ padding: '9px 0' }}>
                  Start session
                </MonoButton>
              </div>
            </div>
          </div>
        )}
      </Screen>
    </>
  );
}
