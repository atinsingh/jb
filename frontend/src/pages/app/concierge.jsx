'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { EmptyState, ErrorState } from '@/components/app/AppStates';
import { getConciergeCoaches, buyConciergeHours, getMyConciergeBookings, markConciergeBookingScheduled, cancelConciergeBooking, reportConciergeMissed, conciergeBookUrl, conciergeCad, conciergeDurationLabel, conciergeDurationPrice } from '@/services/conciergeApi';

const isCalendly = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') === 'calendly.com'; } catch { return false; }
};

const initials = (text = '') => {
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function AppConcierge() {
  const router = useRouter();
  const [coaches, setCoaches] = useState([]);
  const [feeRate, setFeeRate] = useState(0.2);
  const [coachError, setCoachError] = useState(null);
  const [payError, setPayError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [minutesByCoach, setMinutesByCoach] = useState({});
  const [buying, setBuying] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [bookings, setBookings] = useState([]);
  const confirmedIds = useRef(new Set());
  const returnHandled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getConciergeCoaches()
      .then((res) => {
        if (cancelled) return;
        setCoaches(res?.coaches || []);
        setFeeRate(res?.feeRate ?? 0.2);
      })
      .catch((err) => { if (!cancelled) setCoachError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    getMyConciergeBookings()
      .then((res) => {
        if (cancelled) return;
        setBookings(res?.bookings || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter((coach) => [coach.name, coach.headline, coach.bio, ...(coach.specialties || []), ...(coach.languages || []), coach.timezone]
      .filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [coaches, query]);

  const confirmBooked = async (id) => {
    if (confirmedIds.current.has(id)) return;
    confirmedIds.current.add(id);
    setConfirming(id);
    try {
      await markConciergeBookingScheduled(id);
      const res = await getMyConciergeBookings();
      setBookings(res?.bookings || []);
      return true;
    } catch (err) {
      confirmedIds.current.delete(id);
      setPayError({ id, message: err?.message || 'Could not confirm that booking' });
      return false;
    } finally {
      setConfirming(null);
    }
  };
  useEffect(() => {
    if (!router.isReady || returnHandled.current || router.query.scheduled !== '1') return;
    const coach = typeof router.query.coach === 'string' ? router.query.coach : '';
    const minutes = Number(router.query.minutes);
    const match = bookings.find((booking) => booking.counterpartId === coach && Number(booking.minutes) === minutes && !booking.scheduledAt);
    if (!match) return;
    returnHandled.current = true;
    confirmBooked(match.id).then((saved) => {
      if (saved) router.replace('/app/concierge', undefined, { shallow: true });
      else returnHandled.current = false;
    });
  }, [router.isReady, router.query.scheduled, router.query.coach, router.query.minutes, bookings]);

  const changeBooking = async (id, action) => {
    setConfirming(id);
    setPayError(null);
    try {
      await action(id);
      const res = await getMyConciergeBookings();
      setBookings(res?.bookings || []);
    } catch (err) {
      setPayError({ id, message: err?.message || 'Could not update that booking' });
    } finally {
      setConfirming(null);
    }
  };

  const buy = async (id, minutes) => {
    setBuying(id);
    setPayError(null);
    try {
      const result = await buyConciergeHours(id, Number(minutes));
      if (!result.url) throw new Error('Checkout is unavailable. Please try again.');
      window.location.assign(result.url);
    } catch (err) {
      const message = err?.message || 'Checkout failed';
      setPayError({
        id,
        message: /yourself/i.test(message)
          ? 'This concierge profile belongs to the account you are signed in with. Sign in as a different candidate to pay.'
          : message,
      });
      setBuying(null);
    }
  };

  const field = { background: 'var(--jb-v3-control)', color: 'var(--jb-v3-fg)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, font: 'inherit' };
  const action = { font: 'inherit', fontWeight: 700, borderRadius: 2, padding: '10px 14px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
  const primaryAction = { ...action, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none' };
  const quietAction = { ...action, color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-control)', border: '1px solid var(--jb-v3-line)' };

  return (
    <>
      <Head><title>Concierge · Find a coach — Jobocate</title></Head>
      <div id="jbapp" style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)', fontFamily: 'var(--jb-v3-font-display)' }}>
        <AppTopNav />
        <main style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
          <p style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', margin: '0 0 8px' }}>Concierge</p>
          <h1 style={{ fontSize: 36, fontWeight: 650, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--jb-v3-fg)' }}>Find a coach</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)', margin: '0 0 20px' }}>
            Pick one of the lengths this concierge offers. You pay their hourly rate for that length. Jobocate keeps {Math.round(feeRate * 100)}%, and the coach is paid monthly on the 2nd. After payment, book the time on their calendar link.
          </p>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span className="jb-skip">Search coaches</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, specialty, or language" aria-label="Search coaches" style={{ ...field, width: '100%', padding: '12px 14px', fontSize: 14 }} />
          </label>
          {router.query.paid && <p role="status">Payment received. Book the time on the calendar link below. Messages with that concierge are open.</p>}
          {router.query.canceled && <p>Checkout canceled. You have not been charged.</p>}
          {bookings.length > 0 && (
            <section aria-label="Your concierge bookings" style={{ margin: '0 0 20px', padding: 16, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Your bookings</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                {bookings.map((booking) => {
                  const length = Number.isFinite(Number(booking.minutes)) ? conciergeDurationLabel(booking.minutes) : 'Paid session';
                  return (
                    <li key={booking.id} style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid var(--jb-v3-line)', borderRadius: 2 }}>
                      <strong>{length} with {booking.counterpartName}</strong>
                      {booking.phase === 'returned' ? (
                        <p style={{ margin: 0, fontSize: 14 }}>Returned. This payment is not part of a payout.</p>
                      ) : booking.phase === 'paid' ? (
                        <p style={{ margin: 0, fontSize: 14 }}>Paid to the coach on the monthly payout.</p>
                      ) : booking.scheduledAt && !booking.startsAt ? (
                        <p style={{ margin: 0, fontSize: 14 }}>You confirmed this booking. It stays refundable until the calendar sends a start and end. A session with no end time is not in the monthly payout.</p>
                      ) : booking.startsAt ? (
                        <p style={{ margin: 0, fontSize: 14 }}>Scheduled for {new Date(booking.startsAt).toLocaleString()}. Reschedule or cancel from the calendar links. Opening the original link again would create a second meeting.</p>
                      ) : isCalendly(booking.durationUrl) ? (
                        <p style={{ margin: 0, fontSize: 14 }}>Book in Calendly with the same email as your Jobocate account. When Calendly confirms the invite, this session gets its start and end. The coach is not paid until the monthly payout.</p>
                      ) : booking.durationUrl ? (
                        <p style={{ margin: 0, fontSize: 14 }}>Google Calendar does not tell Jobocate the time. Book it, then confirm here. A session without an end time waits and is not in the monthly payout.</p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 14 }}>Paid. This session has no calendar link.</p>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!booking.scheduledAt && booking.durationUrl ? <a href={conciergeBookUrl(booking.durationUrl, booking.id)} style={primaryAction}>Book this time</a> : null}
                        {!booking.scheduledAt && booking.durationUrl && !isCalendly(booking.durationUrl) ? <button type="button" onClick={() => confirmBooked(booking.id)} disabled={confirming === booking.id} style={quietAction}>{confirming === booking.id ? 'Saving…' : 'I booked this time'}</button> : null}
                        {booking.rescheduleUrl ? <a href={booking.rescheduleUrl} style={quietAction}>Reschedule</a> : null}
                        {booking.canCancel && booking.cancelUrl ? <a href={booking.cancelUrl} style={quietAction}>Cancel in calendar</a> : null}
                        {booking.canCancel ? <button type="button" onClick={() => changeBooking(booking.id, cancelConciergeBooking)} style={quietAction}>Cancel and refund</button> : null}
                        {booking.canReportMissed ? <button type="button" onClick={() => changeBooking(booking.id, reportConciergeMissed)} style={quietAction}>This session did not happen</button> : null}
                        <Link href={`/app/messages?coach=${booking.counterpartId}`} style={quietAction}>Message</Link>
                      </div>
                      {payError?.id === booking.id && <p role="alert" style={{ margin: 0 }}>{payError.message}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {coachError && <ErrorState error={coachError} />}
          {loading ? <p role="status">Loading coaches…</p> : visible.length === 0 ? (
            <EmptyState icon="◇" title={coaches.length ? 'No coaches match that search' : 'No coaches are available yet'} hint={coaches.length ? 'Try another name, specialty, or language.' : 'When a concierge publishes a profile, they show up here.'} />
          ) : visible.map((coach) => {
            const selected = router.query.coach === coach.id;
            return (
              <article id={`coach-${coach.id}`} key={coach.id} style={{ display: 'grid', gap: 8, padding: 18, marginBottom: 12, background: 'var(--jb-v3-panel)', border: `1px solid ${selected ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line)'}`, borderRadius: 2 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--jb-v3-control)', color: 'var(--jb-v3-fg)', fontWeight: 700 }}>{initials(coach.name)}</span>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--jb-v3-fg)' }}>{coach.name}</strong>
                    <span style={{ color: 'var(--jb-v3-fg-2)', fontSize: 14 }}>{coach.headline}</span>
                  </div>
                </div>
                {coach.bio && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)' }}>{coach.bio}</p>}
                {bookings.some((booking) => booking.counterpartId === coach.id && booking.status === 'unscheduled') ? (
                  <p style={{ margin: 0, fontSize: 14 }}>Book the session you already paid for before buying another. One open booking at a time.</p>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Choose a length, pay, then book that time on their calendar.</p>
                )}
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>
                  CA${coach.hourlyRate}/hour
                  {coach.specialties?.length ? ` · ${coach.specialties.join(', ')}` : ''}
                  {coach.languages?.length ? ` · ${coach.languages.join(', ')}` : ''}
                  {coach.timezone ? ` · ${coach.timezone}` : ''}
                </span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {bookings.some((booking) => booking.counterpartId === coach.id && booking.status === 'unscheduled') ? null : (
                    <>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--jb-v3-fg-2)', fontSize: 13 }}>
                        Duration
                        <select aria-label={`Duration with ${coach.name}`} value={minutesByCoach[coach.id] || coach.durations?.[0] || ''} onChange={(event) => setMinutesByCoach((previous) => ({ ...previous, [coach.id]: Number(event.target.value) }))} style={{ ...field, padding: '8px 10px' }}>
                          {(coach.durations || []).map((minutes) => <option key={minutes} value={minutes}>{conciergeDurationLabel(minutes)} · CA${conciergeCad(conciergeDurationPrice(coach.hourlyRate, minutes))}</option>)}
                        </select>
                      </label>
                      <button type="button" onClick={() => buy(coach.id, minutesByCoach[coach.id] || coach.durations?.[0])} disabled={buying === coach.id || !(coach.durations || []).length} style={primaryAction}>{buying === coach.id ? 'Opening checkout…' : `Pay CA$${conciergeCad(conciergeDurationPrice(coach.hourlyRate, minutesByCoach[coach.id] || coach.durations?.[0] || 0))}`}</button>
                    </>
                  )}
                  <Link href={`/app/messages?coach=${coach.id}`} style={quietAction}>Message</Link>
                </div>
                {payError?.id === coach.id && <p role="alert" style={{ margin: 0, color: 'var(--jb-v3-fg)' }}>{payError.message}</p>}
              </article>
            );
          })}
        </main>
      </div>
    </>
  );
}
