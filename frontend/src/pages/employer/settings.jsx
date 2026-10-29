'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { AppShell } from '@/components/app/AppTopNav';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import { employerProfileApi, employerBillingApi } from '@/services/employerApi';
import { CONCIERGE_DURATION_MINUTES, conciergeCad, conciergeDurationLabel, conciergeDurationLinkOk, conciergeDurationPrice } from '@/services/conciergeApi';

const fields = [['name', 'Full name', 'text'], ['phone', 'Phone', 'tel'], ['location', 'Location', 'text']];
const splitList = (text) => text.split(',').map((item) => item.trim()).filter(Boolean);
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
const timezoneOptions = (current) => (current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES);
const isCalendly = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') === 'calendly.com'; } catch { return false; }
};
const calendlyReturnUrl = (coachId, minutes) => {
  const url = new URL('/app/concierge', window.location.origin);
  url.searchParams.set('scheduled', '1');
  url.searchParams.set('coach', coachId);
  url.searchParams.set('minutes', String(minutes));
  return url.toString();
};
const emptyDraft = { minutes: 30, url: '' };
const emptyConcierge = { published: false, headline: '', bio: '', specialties: '', yearsExperience: '', hourlyRate: '', languages: '', timezone: '', durations: [] };

export default function EmployerSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', location: '' });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [cycle, setCycle] = useState('monthly');
  const [choosing, setChoosing] = useState(null);
  const [concierge, setConcierge] = useState(emptyConcierge);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [conciergeSaved, setConciergeSaved] = useState(false);
  const [conciergeSaving, setConciergeSaving] = useState(false);
  const [conciergeError, setConciergeError] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [payoutError, setPayoutError] = useState(null);
  const [payoutsBusy, setPayoutsBusy] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [feePercent, setFeePercent] = useState(20);

  const loadAccount = async () => {
    setError(null);
    try {
      const { user } = await employerProfileApi.get();
      setProfile(user);
      setForm(Object.fromEntries(fields.map(([key]) => [key, user[key] || ''])));
      const current = user.conciergeProfile || {};
      setConcierge({
        published: !!current.published,
        headline: current.headline || '',
        bio: current.bio || '',
        specialties: (current.specialties || []).join(', '),
        yearsExperience: current.yearsExperience ?? '',
        hourlyRate: current.hourlyRate ?? '',
        languages: (current.languages || []).join(', '),
        timezone: current.timezone || browserTimezone(),
        durations: (current.durations || []).map((row) => ({ minutes: Number(row.minutes), url: row.url || '' })),
      });
    } catch (err) { setError(err); }
  };
  const loadPlan = async () => {
    setPlanError(null);
    const [plans, current] = await Promise.allSettled([employerBillingApi.plans(), employerBillingApi.subscription()]);
    setCatalog(plans.status === 'fulfilled' ? plans.value : null);
    setSubscription(current.status === 'fulfilled' ? current.value.subscription : null);
    if (current.status === 'fulfilled') setCycle(current.value.subscription?.billingCycle || 'monthly');
    setPlanError(current.status === 'rejected' ? current.reason : plans.status === 'rejected' ? plans.reason : null);
  };
  const loadPayouts = async () => {
    try {
      setPayouts(await employerBillingApi.connect());
      setPayoutError(null);
    } catch (err) { setPayoutError(err); }
    try {
      const result = await employerBillingApi.conciergeBookings();
      setBookings(result.bookings || []);
      if (result.feeRate != null) setFeePercent(Math.round(result.feeRate * 100));
    } catch { setBookings([]); }
  };
  const startPayouts = async () => {
    setPayoutsBusy(true); setPayoutError(null);
    try {
      const result = await employerBillingApi.connectOnboard();
      if (!result.url) throw new Error('Payout setup is unavailable. Please try again.');
      window.location.assign(result.url);
    } catch (err) { setPayoutError(err); setPayoutsBusy(false); }
  };
  useEffect(() => { loadAccount(); loadPlan(); loadPayouts(); }, []);
  useEffect(() => {
    if (router.isReady && router.query.connect === 'refresh') startPayouts();
  }, [router.isReady, router.query.connect]);
  useEffect(() => {
    if (!router.isReady || router.query.connect !== 'return') return;
    const timer = setTimeout(() => { loadPayouts(); }, 2000);
    return () => clearTimeout(timer);
  }, [router.isReady, router.query.connect]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setSaved(false); setSaveError(null);
    try {
      const { user } = await employerProfileApi.update(form);
      setProfile(user);
      setSaved(true);
    } catch (err) { setSaveError(err); }
    finally { setSaving(false); }
  };
  const editConcierge = (key) => (event) => {
    setConciergeSaved(false);
    setConcierge((previous) => ({ ...previous, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  };
  const usedMinutes = (rows, except) => new Set(rows.filter((_, index) => index !== except).map((row) => Number(row.minutes)));
  const nextMinutes = (rows) => CONCIERGE_DURATION_MINUTES.find((minutes) => !usedMinutes(rows).has(minutes)) || 30;
  const addDuration = () => {
    if (!conciergeDurationLinkOk(draft.url) || usedMinutes(concierge.durations).has(Number(draft.minutes))) return;
    setConciergeSaved(false);
    setEditing(null);
    setConcierge((previous) => ({ ...previous, durations: [...previous.durations, { minutes: Number(draft.minutes), url: draft.url.trim() }] }));
    setDraft({ minutes: nextMinutes([...concierge.durations, draft]), url: '' });
  };
  const removeDuration = (index) => {
    setConciergeSaved(false);
    setEditing((current) => (current === index ? null : current > index ? current - 1 : current));
    setConcierge((previous) => ({ ...previous, durations: previous.durations.filter((_, rowIndex) => rowIndex !== index) }));
  };
  const changeDuration = (index, key, value) => {
    setConciergeSaved(false);
    setConcierge((previous) => ({ ...previous, durations: previous.durations.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row) }));
  };
  const updateDuration = (index) => {
    const row = concierge.durations[index];
    const url = row?.url?.trim() || '';
    if (!row || !conciergeDurationLinkOk(url) || usedMinutes(concierge.durations, index).has(Number(row.minutes))) return;
    setConciergeSaved(false);
    setConcierge((previous) => ({ ...previous, durations: previous.durations.map((item, rowIndex) => rowIndex === index ? { minutes: Number(item.minutes), url } : item) }));
    setEditing(null);
  };
  const saveConcierge = async (event) => {
    event.preventDefault();
    if (!conciergeReady) return;
    setConciergeSaving(true); setConciergeSaved(false); setConciergeError(null);
    try {
      const { user } = await employerProfileApi.update({ conciergeProfile: {
        published: conciergeReady && concierge.published,
        headline: concierge.headline.trim(),
        bio: concierge.bio.trim(),
        specialties: splitList(concierge.specialties),
        yearsExperience: concierge.yearsExperience === '' ? undefined : Number(concierge.yearsExperience),
        hourlyRate: concierge.hourlyRate === '' ? undefined : Number(concierge.hourlyRate),
        languages: splitList(concierge.languages),
        timezone: concierge.timezone.trim() || browserTimezone(),
        durations: concierge.durations.map((row) => ({ minutes: Number(row.minutes), url: row.url.trim() })),
      } });
      setProfile(user);
      setConciergeSaved(true);
    } catch (err) { setConciergeError(err); }
    finally { setConciergeSaving(false); }
  };
  const upgrade = async (plan) => {
    setChoosing(plan); setPlanError(null);
    try {
      const result = await employerBillingApi.upgrade({ plan, billingCycle: cycle });
      if (!result.checkoutUrl) throw new Error('Checkout is unavailable. Please try again.');
      window.location.assign(result.checkoutUrl);
    } catch (err) { setPlanError(err); }
    finally { setChoosing(null); }
  };
  const portal = async () => {
    setChoosing('portal'); setPlanError(null);
    try {
      const result = await employerBillingApi.portal();
      if (!result.url) throw new Error('Billing portal is unavailable. Please try again.');
      window.location.assign(result.url);
    } catch (err) { setPlanError(err); }
    finally { setChoosing(null); }
  };
  const currentName = subscription && (catalog?.plans?.find((plan) => plan.key === subscription.plan)?.name || (subscription.plan === 'paid' ? 'Paid' : 'Free'));
  const hasSubscription = subscription?.stripeSubscriptionId && !['canceled', 'incomplete_expired'].includes(subscription.status);
  const periodEnd = subscription?.renewsAt && new Date(subscription.renewsAt);
  const periodEndLabel = periodEnd && !Number.isNaN(periodEnd.getTime()) && periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  const rate = Number(concierge.hourlyRate);
  const checklist = [
    ['Headline', concierge.headline.trim().length > 0],
    ['Bio of at least 80 characters', concierge.bio.trim().length >= 80],
    ['At least one specialty', splitList(concierge.specialties).length > 0],
    ['Hourly rate between CA$10 and CA$1,000', Number.isInteger(rate) && rate >= 10 && rate <= 1000],
    ['A Calendly or Google link for each duration', concierge.durations.length > 0 && concierge.durations.every((row) => conciergeDurationLinkOk(row.url)) && new Set(concierge.durations.map((row) => Number(row.minutes))).size === concierge.durations.length],
    ['Payouts enabled', !!payouts?.payoutsEnabled],
  ];
  const conciergeReady = checklist.every(([, done]) => done);

  return (
    <>
      <Head><title>Employer settings · Jobocate</title></Head>
      <div id="emapp" className={styles.workspace}>
        <EmployerSidebar active="settings" />
        <AppShell><main className={styles.main}>
          <header className={styles.heading}><div><p className={styles.eyebrow}>Your account</p><h1>Settings</h1><p className={styles.muted}>Your account details and hiring plan.</p></div></header>
          <section aria-label="Account details" className={styles.panel}>
            <h2>Account details</h2>
            {error ? <ErrorState error={error} onRetry={loadAccount} tone="dark" /> : !profile ? <LoadingState tone="dark" /> : (
              <form onSubmit={save}>
                {fields.map(([key, label, type]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input type={type} name={key} value={form[key]} required={key === 'name'} onChange={(event) => { setSaved(false); setForm((previous) => ({ ...previous, [key]: event.target.value })); }} />
                  </label>
                ))}
                <label><span>Email</span><input type="email" value={profile.email || ''} readOnly /></label>
                <InlineError error={saveError} />
                {saved && <p role="status">Account details saved.</p>}
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
              </form>
            )}
          </section>
          <section aria-label="Concierge profile" className={`${styles.panel} concierge`}>
            <h2>Concierge profile</h2>
            <p className="lead">This is what candidates see when they book you. Payouts go to a Canadian Stripe account, and Jobocate keeps {feePercent}% of each booking.</p>
            {error ? <ErrorState error={error} onRetry={loadAccount} tone="dark" /> : !profile ? <LoadingState tone="dark" /> : (
              <form onSubmit={saveConcierge}>
                <label className="wide"><span>Headline</span><input type="text" maxLength={120} value={concierge.headline} onChange={editConcierge('headline')} /></label>
                <label className="wide"><span>Bio</span>
                  <textarea rows={4} maxLength={2000} value={concierge.bio} aria-describedby="concierge-bio-count" onChange={editConcierge('bio')} />
                  <small id="concierge-bio-count">{concierge.bio.trim().length}/80 characters minimum</small>
                </label>
                <label><span>Specialties</span><input type="text" placeholder="Resume reviews, Interview prep" value={concierge.specialties} onChange={editConcierge('specialties')} /></label>
                <label><span>Languages</span><input type="text" placeholder="English, French" value={concierge.languages} onChange={editConcierge('languages')} /></label>
                <label><span>Years of experience</span><input type="number" min={0} max={60} step={1} value={concierge.yearsExperience} onChange={editConcierge('yearsExperience')} /></label>
                <label><span>Hourly rate (CAD)</span><input type="number" min={10} max={1000} step={1} value={concierge.hourlyRate} onChange={editConcierge('hourlyRate')} /></label>
                <label className="wide"><span>Timezone</span>
                  <select value={concierge.timezone} onChange={editConcierge('timezone')}>
                    {timezoneOptions(concierge.timezone).map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
                <div className="wide durations">
                  <p>Add each length you will take, from 15 minutes up to 8 hours. Each one needs its own Calendly or Google link. Candidates pay your hourly rate for that length, then book that link.</p>
                  {concierge.durations.length > 0 && (
                    <ul aria-label="Added durations">
                      {concierge.durations.map((row, index) => (
                        <li key={index}>
                          {editing === index ? (
                            <div className="duration">
                              <label>
                                <span>Duration</span>
                                <select aria-label={`Duration ${index + 1}`} value={row.minutes} onChange={(event) => changeDuration(index, 'minutes', Number(event.target.value))}>
                                  {CONCIERGE_DURATION_MINUTES.map((minutes) => <option key={minutes} value={minutes} disabled={usedMinutes(concierge.durations, index).has(minutes)}>{conciergeDurationLabel(minutes)}</option>)}
                                </select>
                              </label>
                              <label>
                                <span>Calendar link</span>
                                <input type="url" aria-label={`Calendar link ${index + 1}`} value={row.url} onChange={(event) => changeDuration(index, 'url', event.target.value)} />
                              </label>
                            </div>
                          ) : (
                            <span>
                              {conciergeDurationLabel(row.minutes)}{Number.isInteger(rate) ? ` · CA$${conciergeCad(conciergeDurationPrice(rate, row.minutes))}` : ''} · {row.url}
                              {isCalendly(row.url) && (profile?.id || profile?._id) ? (
                                <small>Calendly → this event → More options → Confirmation page → Redirect to an external site. Paste this, turn on Pass event details, and save. <input readOnly aria-label={`Calendly redirect for ${conciergeDurationLabel(row.minutes)}`} value={calendlyReturnUrl(profile.id || profile._id, row.minutes)} onFocus={(event) => event.target.select()} /></small>
                              ) : null}
                            </span>
                          )}
                          <span className="rowActions">
                            <button type="button" className={styles.button} onClick={() => (editing === index ? updateDuration(index) : setEditing(index))}>Update</button>
                            <button type="button" className={styles.button} onClick={() => removeDuration(index)}>Delete</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="duration">
                    <label>
                      <span>Duration</span>
                      <select aria-label="Duration" value={draft.minutes} onChange={(event) => setDraft((previous) => ({ ...previous, minutes: Number(event.target.value) }))}>
                        {CONCIERGE_DURATION_MINUTES.map((minutes) => <option key={minutes} value={minutes} disabled={usedMinutes(concierge.durations).has(minutes)}>{conciergeDurationLabel(minutes)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Calendar link</span>
                      <input type="url" aria-label="Calendar link" placeholder="https://calendly.com/your-name/30min" value={draft.url} onChange={(event) => setDraft((previous) => ({ ...previous, url: event.target.value }))} />
                    </label>
                    {Number.isInteger(rate) && draft.minutes ? <small>{conciergeDurationLabel(draft.minutes)} is CA${conciergeCad(conciergeDurationPrice(rate, draft.minutes))}</small> : null}
                    <button type="button" className={styles.button} onClick={addDuration} disabled={!conciergeDurationLinkOk(draft.url) || usedMinutes(concierge.durations).has(Number(draft.minutes))}>Add a duration</button>
                  </div>
                </div>
                <div className="payout">
                  <p>{router.query.connect === 'return' ? 'Back from Stripe. ' : ''}{payouts?.payoutsEnabled ? 'Payouts enabled.' : payouts?.detailsSubmitted ? 'Stripe has your details. Payouts can take a moment to turn on.' : 'Payouts are not set up.'}</p>
                  <button type="button" className={styles.primary} onClick={startPayouts} disabled={payoutsBusy}>{payoutsBusy ? 'Opening Stripe…' : payouts?.detailsSubmitted ? 'Update payouts' : 'Set up payouts'}</button>
                </div>
                <InlineError error={payoutError} />
                <ul aria-label="Profile checklist" className="reqs">
                  {checklist.map(([label, done]) => <li key={label} data-done={done ? 'true' : 'false'}>{done ? 'Done' : 'Needed'}: {label}</li>)}
                </ul>
                <label className="check"><input type="checkbox" checked={concierge.published} onChange={editConcierge('published')} /><span>Publish profile</span></label>
                <p className="wide hint">Shows this profile to candidates. It does not replace the details above.</p>
                <div className="actions">
                  <button type="submit" className={styles.primary} disabled={conciergeSaving || !conciergeReady}>{conciergeSaving ? 'Saving…' : 'Save concierge profile'}</button>
                </div>
                <InlineError error={conciergeError} />
                {conciergeSaved && <p className="wide" role="status">Concierge profile saved.</p>}
              </form>
            )}
            <div className="bookings">
              <h3>Bookings</h3>
              {bookings.length === 0 ? <p>No concierge bookings yet.</p> : (
                <ul aria-label="Concierge bookings">
                  {bookings.map((booking) => <li key={booking.id}>{booking.counterpartName} paid for {Number.isFinite(Number(booking.minutes)) ? conciergeDurationLabel(booking.minutes) : 'a session'}. You receive CA${conciergeCad((booking.amountCents - booking.feeCents) / 100)} on the monthly payout. {booking.phase === 'paid' ? 'Paid.' : booking.phase === 'returned' ? 'Returned.' : booking.phase === 'pending' ? 'Pending this month.' : booking.scheduledAt ? 'Scheduled.' : 'Not booked yet.'}</li>)}
                  <p><a href="/employer/bookings">Open bookings</a></p>
                </ul>
              )}
            </div>
          </section>
          <section id="plan" aria-label="Plan" className={`${styles.panel} plan`}>
            <div className="planHead">
              <div>
                <h2>Plan</h2>
                <p>One Paid membership covers candidate and employer workspaces. Canceling it applies to both.</p>
              </div>
              {subscription?.stripeCustomerId && <button type="button" className={styles.button} onClick={portal} disabled={!!choosing}>Manage subscription</button>}
            </div>
            {router.query.success && <p role="status">Checkout completed. Your plan updates once payment is confirmed.</p>}
            {router.query.canceled && <p>Checkout canceled. Your plan has not changed.</p>}
            {currentName && <p className="planStatus">Current plan: {currentName}{subscription?.status ? ` · ${subscription.status.replaceAll('_', ' ')}` : ''}{subscription?.billingCycle ? ` · ${subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}` : ''}{periodEndLabel ? ` · ${subscription.cancelAtPeriodEnd ? 'Paid access ends' : subscription.plan === 'paid' ? 'Renews' : 'Billing period ends'} ${periodEndLabel}` : ''}</p>}
            <InlineError error={planError} />
            {!catalog ? planError ? <button type="button" className={styles.button} onClick={loadPlan}>Retry plans</button> : <LoadingState label="Loading plans…" tone="dark" /> : (
              <>
                <label className="cycle"><span>Billing cycle</span><select aria-label="Billing cycle" value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
                <div className="plans">
                  {catalog.plans.map((plan) => (
                    <article key={plan.key}>
                      <h3>{plan.name}</h3>
                      <p className="price">{new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(cycle === 'annual' ? plan.priceYearly : plan.priceMonthly)}<span> / {cycle === 'annual' ? 'year' : 'month'}</span></p>
                      <p>{plan.tagline}</p>
                      <dl>{plan.levers.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                      {subscription?.plan === plan.key ? <span className="current">Current plan</span> : plan.selfServe && subscription && (hasSubscription ? <button type="button" className={styles.button} onClick={portal} disabled={!!choosing}>Manage plan</button> : <button type="button" className={styles.primary} onClick={() => upgrade(plan.key)} disabled={!!choosing}>{choosing === plan.key ? 'Opening checkout…' : `Upgrade to ${plan.name}`}</button>)}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </main></AppShell>
      </div>
      <style jsx>{`
        section p { color: var(--jb-v3-fg-2); font-size: 13px; }
        section { scroll-margin-top: 110px; }
        h2 { margin-bottom: 22px !important; }
        label { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 20px; padding: 14px 0; font-size: 13px; border-bottom: 1px solid var(--jb-v3-line); }
        input, select, textarea { width: 100%; border: 1px solid var(--jb-v3-line-2); border-radius: 8px; background: var(--jb-v3-control); color: var(--jb-v3-fg); padding: 9px 11px; font: inherit; font-size: 13px; }
        input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--jb-v3-accent); outline-offset: 2px; }
        input[readonly] { color: var(--jb-v3-fg-3); }
        form :global(button) { margin-top: 18px; }
        .cycle { max-width: 400px; border: 0; }
        small { display: block; margin-top: 6px; color: var(--jb-v3-fg-3); font-size: 12px; }
        .concierge h2 { margin-bottom: 8px !important; }
        .concierge .lead { margin: 0 0 18px; max-width: 62ch; }
        .concierge form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
        .concierge form label { display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 0; border: 0; font-size: 12px; color: var(--jb-v3-fg-2); }
        .concierge form label.wide, .concierge form .wide, .concierge .reqs, .concierge .actions, .concierge form label.check { grid-column: 1 / -1; }
        .concierge .durations { display: grid; gap: 12px; }
        .concierge .durations ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
        .concierge .durations li { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px; border: 1px solid var(--jb-v3-line); border-radius: 8px; color: var(--jb-v3-fg); font-size: 13px; }
        .concierge .durations li small { flex: 1 1 100%; }
        .concierge .rowActions { display: flex; gap: 8px; }
        .concierge .duration { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 12px; align-items: end; }
        .concierge .duration small, .concierge .duration :global(button) { grid-column: 1 / -1; justify-self: start; }
        .concierge form label.check { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 10px; width: fit-content; margin: 0; padding: 2px 0; border: 0; color: var(--jb-v3-fg); font-size: 14px; }
        .concierge form label.check input { width: 16px; height: 16px; min-width: 16px; margin: 0; padding: 0; flex: 0 0 16px; border: 0; border-radius: 3px; background: transparent; accent-color: var(--jb-v3-accent); }
        .concierge .reqs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
        .concierge .reqs li { padding: 6px 8px; border-radius: 6px; background: var(--jb-v3-control); color: var(--jb-v3-fg-3); font-size: 12px; }
        .concierge .reqs li[data-done='true'] { color: var(--jb-v3-fg); }
        .concierge .hint { margin: -6px 0 0; }
        .concierge form :global(button) { margin-top: 0; }
        .concierge .payout, .concierge .bookings { margin-top: 8px; }
        .concierge .payout { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; grid-column: 1 / -1; padding-bottom: 14px; border-bottom: 1px solid var(--jb-v3-line); }
        .concierge .bookings { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--jb-v3-line); }
        .concierge .payout p, .concierge .bookings p { margin: 0; }
        .concierge .bookings h3 { margin: 0 0 8px; font-size: 14px; font-weight: 500; }
        .concierge .bookings ul { margin: 0; padding: 0; list-style: none; }
        .concierge .bookings li { padding: 10px 0; border-top: 1px solid var(--jb-v3-line); font-size: 13px; color: var(--jb-v3-fg-2); }
        .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; align-items: stretch; }
        .plan h2 { margin-bottom: 6px !important; }
        .plan .planHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
        .plan .planHead p, .plan .planStatus { margin: 0; max-width: 62ch; }
        .plan .planStatus { margin-bottom: 16px; color: var(--jb-v3-fg); }
        .plan .cycle { display: flex; flex-direction: column; align-items: stretch; gap: 6px; max-width: 220px; margin: 0 0 16px; padding: 0; border: 0; }
        .plan article { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: var(--jb-v3-bg); border: 1px solid var(--jb-v3-line); border-radius: 12px; }
        .plan article p { margin: 0; }
        .plan article :global(button), .plan .current { margin-top: auto; align-self: flex-start; }
        .plan .current { display: inline-block; padding: 8px 10px; border-radius: 8px; background: var(--jb-v3-accent-soft); color: var(--jb-v3-accent-faint); font-size: 13px; }
        article { padding: 24px; background: var(--jb-v3-bg); border: 1px solid var(--jb-v3-line); border-radius: 12px; }
        h3 { margin: 0; font-size: 19px; font-weight: 500; }
        .price { font-size: 28px; color: var(--jb-v3-fg); }
        .price span { font-size: 12px; color: var(--jb-v3-fg-3); }
        dl { margin: 24px 0; font-size: 12px; }
        dl div { display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid var(--jb-v3-line); gap: 12px; }
        dd { margin: 0; }
        @media (max-width: 600px) { label { grid-template-columns: 1fr; gap: 8px; } .concierge form { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
