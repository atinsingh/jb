'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { AppShell } from '@/components/app/AppTopNav';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import { employerProfileApi, employerBillingApi } from '@/services/employerApi';

const fields = [['name', 'Full name', 'text'], ['phone', 'Phone', 'tel'], ['location', 'Location', 'text']];

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

  const loadAccount = async () => {
    setError(null);
    try {
      const { user } = await employerProfileApi.get();
      setProfile(user);
      setForm(Object.fromEntries(fields.map(([key]) => [key, user[key] || ''])));
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
  useEffect(() => { loadAccount(); loadPlan(); }, []);

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
          <section id="plan" aria-label="Plan" className={styles.panel}>
            <h2>Plan</h2>
            <p>One Paid membership covers candidate and employer workspaces.</p>
            {router.query.success && <p role="status">Checkout completed. Your plan updates once payment is confirmed.</p>}
            {router.query.canceled && <p>Checkout canceled. Your plan has not changed.</p>}
            {currentName && <p>Current plan: {currentName}</p>}
            {subscription?.stripeSubscriptionId && <>
              <p>Status: {subscription.status.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}</p>
              <p>Billing cycle: {subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</p>
              {periodEndLabel && <p>{subscription.cancelAtPeriodEnd ? 'Paid access ends' : subscription.plan === 'paid' ? 'Renews' : 'Billing period ends'}: {periodEndLabel}</p>}
            </>}
            <p>Canceling the shared subscription applies to both workspaces.</p>
            {subscription?.stripeCustomerId && <button type="button" className={styles.button} onClick={portal} disabled={!!choosing}>Manage subscription</button>}
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
                      {subscription?.plan === plan.key ? <span>Current plan</span> : plan.selfServe && subscription && (hasSubscription ? <button type="button" className={styles.button} onClick={portal} disabled={!!choosing}>Manage plan</button> : <button type="button" className={styles.primary} onClick={() => upgrade(plan.key)} disabled={!!choosing}>{choosing === plan.key ? 'Opening checkout…' : `Upgrade to ${plan.name}`}</button>)}
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
        input, select { width: 100%; border: 1px solid var(--jb-v3-line-2); border-radius: 8px; background: var(--jb-v3-control); color: var(--jb-v3-fg); padding: 9px 11px; font: inherit; font-size: 13px; }
        input:focus-visible, select:focus-visible { outline: 2px solid var(--jb-v3-accent); outline-offset: 2px; }
        input[readonly] { color: var(--jb-v3-fg-3); }
        form :global(button) { margin-top: 18px; }
        .cycle { max-width: 400px; border: 0; }
        .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
        article { padding: 24px; background: var(--jb-v3-bg); border: 1px solid var(--jb-v3-line); border-radius: 12px; }
        h3 { margin: 0; font-size: 19px; font-weight: 500; }
        .price { font-size: 28px; color: var(--jb-v3-fg); }
        .price span { font-size: 12px; color: var(--jb-v3-fg-3); }
        dl { margin: 24px 0; font-size: 12px; }
        dl div { display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid var(--jb-v3-line); gap: 12px; }
        dd { margin: 0; }
        @media (max-width: 600px) { label { grid-template-columns: 1fr; gap: 8px; } }
      `}</style>
    </>
  );
}
