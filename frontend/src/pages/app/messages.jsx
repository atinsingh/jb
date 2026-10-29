'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { ErrorState } from '@/components/app/AppStates';
import ConciergeInbox from '@/components/app/ConciergeInbox';
import { getConciergeMessages, getMyConciergeBookings, sendConciergeMessage, conciergeDurationLabel } from '@/services/conciergeApi';

const threadsFrom = (bookings) => {
  const seen = new Map();
  bookings.forEach((booking) => {
    if (!booking.counterpartId) return;
    const current = seen.get(booking.counterpartId);
    const paid = { minutes: booking.minutes, durationUrl: booking.durationUrl || '' };
    if (!current) {
      seen.set(booking.counterpartId, { id: booking.counterpartId, name: booking.counterpartName || 'Coach', paid: [paid] });
      return;
    }
    current.paid.push(paid);
  });
  return [...seen.values()].map((thread) => ({ ...thread, hint: thread.paid.map((item) => conciergeDurationLabel(item.minutes)).join(', ') }));
};

export default function AppMessages() {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchMessages = useCallback((id) => getConciergeMessages(id), []);
  const postMessage = useCallback((id, body) => sendConciergeMessage(id, body), []);

  useEffect(() => {
    let cancelled = false;
    getMyConciergeBookings()
      .then((res) => {
        if (cancelled) return;
        setThreads(threadsFrom(res?.bookings || []));
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedId = useMemo(() => {
    const asked = typeof router.query.coach === 'string' ? router.query.coach : '';
    if (threads.some((thread) => thread.id === asked)) return asked;
    return threads[0]?.id || '';
  }, [router.query.coach, threads]);

  const unpaid = router.query.coach && !threads.some((thread) => thread.id === router.query.coach);
  const selected = threads.find((thread) => thread.id === selectedId) || null;

  return (
    <>
      <Head><title>Messages — Jobocate</title></Head>
      <div id="jbapp" style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)', fontFamily: 'var(--jb-v3-font-display)' }}>
        <AppTopNav />
        <main style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
          <p style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', margin: '0 0 8px' }}>Messages</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 36, fontWeight: 650, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--jb-v3-fg)' }}>Concierge messages</h1>
            <Link href="/app/concierge" style={{ color: 'var(--jb-v3-accent)', fontWeight: 700, fontSize: 14 }}>Find a coach</Link>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)', margin: '0 0 20px' }}>Messaging opens after you pay that concierge for a session. New messages arrive live.</p>
          {error && <ErrorState error={error} />}
          {unpaid && <p role="status" style={{ margin: '0 0 16px' }}>Pay for a session before messaging this concierge. <Link href={`/app/concierge?coach=${router.query.coach}`}>Choose a duration</Link></p>}
          {selected && (
            <p style={{ margin: '0 0 16px' }}>
              Paid with {selected.name}: {selected.paid.map((item) => conciergeDurationLabel(item.minutes)).join(', ')}. <Link href={`/app/concierge?coach=${selected.id}`}>Book or review on Find a coach</Link>
            </p>
          )}
          {loading ? <p role="status">Loading conversations…</p> : (
            <ConciergeInbox
              threads={threads}
              selectedId={selectedId}
              onSelect={(id) => router.replace({ pathname: '/app/messages', query: { coach: id } }, undefined, { shallow: true })}
              fetchMessages={fetchMessages}
              postMessage={postMessage}
              emptyTitle="No paid conversations yet"
              emptyHint="Pay for a session with a concierge and this inbox opens for that coach."
              emptyHref="/app/concierge"
              emptyLabel="Find a coach"
            />
          )}
        </main>
      </div>
    </>
  );
}
