'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { AppShell } from '@/components/app/AppTopNav';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { ErrorState, LoadingState } from '@/components/employer/EmployerStates';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import { employerBillingApi } from '@/services/employerApi';
import { conciergeCad, conciergeDurationLabel } from '@/services/conciergeApi';

const phaseLabel = {
  unscheduled: 'Not booked yet',
  scheduled: 'Scheduled',
  pending: 'Pending this month',
  paid: 'Paid',
  returned: 'Returned',
};

export default function EmployerBookings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = () => employerBillingApi.conciergeBookings()
    .then((res) => setData(res))
    .catch((err) => setError(err));

  useEffect(() => {
    let cancelled = false;
    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const cancel = async (id) => {
    setBusy(id);
    try { await employerBillingApi.cancelConciergeBooking(id); await load(); }
    catch (err) { setError(err); }
    finally { setBusy(''); }
  };

  return (
    <>
      <Head><title>Bookings · Employer · Jobocate</title></Head>
      <div id="emapp" className={styles.workspace}>
        <EmployerSidebar />
        <AppShell>
          <main className={styles.main}>
            <header className={styles.heading}>
              <div>
                <p className={styles.eyebrow}>Concierge</p>
                <h1>Bookings</h1>
                <p className={styles.muted}>Payouts run on the 2nd, Toronto time, for sessions earned before this month. A session still inside its one-day dispute window is pending, not owed.</p>
              </div>
            </header>
            {loading ? <LoadingState label="Loading bookings…" tone="dark" /> : error ? <ErrorState error={error} tone="dark" /> : (
              <>
                <p>Owed on the next payout: CA${conciergeCad((data?.owedShareCents || 0) / 100)}. Pending this month: CA${conciergeCad((data?.pendingShareCents || 0) / 100)}.{data?.lastPayout ? ` Last payout CA$${conciergeCad(data.lastPayout.totalCents / 100)} on ${new Date(data.lastPayout.paidOutAt).toLocaleDateString()}.` : ''}</p>
                {(data?.bookings || []).length === 0 ? <p>No concierge bookings yet.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
                    {(data.bookings || []).map((booking) => (
                      <li key={booking.id} style={{ padding: 12, border: '1px solid var(--jb-v3-line)' }}>
                        <strong>{booking.counterpartName}</strong>
                        <p style={{ margin: '6px 0' }}>{Number.isFinite(Number(booking.minutes)) ? conciergeDurationLabel(booking.minutes) : 'Session'} · {phaseLabel[booking.phase] || booking.phase} · You receive CA${conciergeCad((booking.shareCents || 0) / 100)}</p>
                        {booking.startsAt ? <p style={{ margin: '6px 0' }}>{new Date(booking.startsAt).toLocaleString()} to {booking.endsAt ? new Date(booking.endsAt).toLocaleString() : 'an open end'}</p> : null}
                        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {booking.rescheduleUrl ? <a href={booking.rescheduleUrl}>Reschedule</a> : null}
                          {booking.canCancel && booking.cancelUrl ? <a href={booking.cancelUrl}>Cancel in calendar</a> : null}
                          {booking.canCancel ? <button type="button" onClick={() => cancel(booking.id)} disabled={busy === booking.id}>{busy === booking.id ? 'Canceling…' : 'Cancel and refund'}</button> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </main>
        </AppShell>
      </div>
    </>
  );
}
