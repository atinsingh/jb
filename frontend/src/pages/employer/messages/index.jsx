'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/app/AppTopNav';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { ErrorState, LoadingState } from '@/components/employer/EmployerStates';
import ConciergeInbox from '@/components/app/ConciergeInbox';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import { employerBillingApi } from '@/services/employerApi';
import { conciergeDurationLabel } from '@/services/conciergeApi';

const threadsFrom = (bookings) => {
  const seen = new Map();
  bookings.forEach((booking) => {
    if (!booking.counterpartId) return;
    const label = conciergeDurationLabel(booking.minutes);
    const current = seen.get(booking.counterpartId);
    if (!current) seen.set(booking.counterpartId, { id: booking.counterpartId, name: booking.counterpartName || 'Candidate', hint: label });
    else current.hint = `${current.hint}, ${label}`;
  });
  return [...seen.values()];
};

export default function EmployerMessages() {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchMessages = useCallback((id) => employerBillingApi.conciergeMessages(id), []);
  const postMessage = useCallback((id, body) => employerBillingApi.sendConciergeMessage(id, body), []);

  useEffect(() => {
    let cancelled = false;
    employerBillingApi.conciergeBookings()
      .then((res) => { if (!cancelled) setThreads(threadsFrom(res?.bookings || [])); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedId = useMemo(() => {
    const asked = typeof router.query.candidate === 'string' ? router.query.candidate : '';
    if (threads.some((thread) => thread.id === asked)) return asked;
    return threads[0]?.id || '';
  }, [router.query.candidate, threads]);

  return (
    <>
      <Head><title>Messages · Employer · Jobocate</title></Head>
      <div id="emapp" className={styles.workspace}>
        <EmployerSidebar />
        <AppShell>
          <main className={styles.main}>
            <header className={styles.heading}>
              <div>
                <p className={styles.eyebrow}>Concierge</p>
                <h1>Messages</h1>
                <p className={styles.muted}>Candidates who have paid you can message here. Replies show up live.</p>
              </div>
            </header>
            {loading ? <LoadingState label="Loading conversations…" tone="dark" /> : error ? <ErrorState error={error} tone="dark" /> : (
              <ConciergeInbox
                threads={threads}
                selectedId={selectedId}
                onSelect={(id) => router.replace({ pathname: '/employer/messages', query: { candidate: id } }, undefined, { shallow: true })}
                fetchMessages={fetchMessages}
                postMessage={postMessage}
                emptyTitle="No paid conversations yet"
                emptyHint="When a candidate pays for a session, their conversation shows up here."
                emptyHref="/employer/settings"
                emptyLabel="Set up your profile"
              />
            )}
          </main>
        </AppShell>
      </div>
    </>
  );
}
