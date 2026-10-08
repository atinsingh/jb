'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { employerPipelineApi, employerBillingApi } from '@/services/employerApi';
import styles from './EmployerWorkspace.module.css';

export default function EmployerCredits() {
  const [budget, setBudget] = useState(null);
  const [planName, setPlanName] = useState(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    const [balance, catalog] = await Promise.allSettled([
      employerPipelineApi.assessmentBudget(), employerBillingApi.plans(),
    ]);
    const result = balance.status === 'fulfilled' ? balance.value : null;
    if (!['READY', 'BUDGET_EXHAUSTED'].includes(result?.status)
      || ![result?.limitCredits, result?.spentCredits, result?.remainingCredits].every(value => Number.isSafeInteger(value) && value >= 0)
      || result.remainingCredits !== Math.max(0, result.limitCredits - result.spentCredits)) {
      setBudget(null); setError(true);
    } else { setBudget(result); }
    setPlanName(catalog.status === 'fulfilled' ? catalog.value.plans?.find(plan => plan.key === catalog.value.currentPlan)?.name || null : null);
    setPaid(catalog.status === 'fulfilled' && catalog.value.currentPlan === 'paid');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const reset = budget?.resetAt && new Date(budget.resetAt);
  return <section aria-label="Employer AI credits" className={styles.panel}>
    <div className={styles.creditRow}>
      <div>
        <h2>Employer AI credits</h2>
        {loading ? <p className={styles.muted}>Loading credit balance…</p> : error ? <p role="status" className={styles.muted}>Credit balance unavailable</p> : <>
          <p className={styles.creditValue}>{budget.remainingCredits.toLocaleString()} credits remaining</p>
          <p className={styles.muted}>{planName ? planName + ' plan includes ' : 'Monthly employer allowance: '}{budget.limitCredits.toLocaleString()}{planName ? ' credits per month' : ' credits'} · {budget.spentCredits.toLocaleString()} used</p>
        </>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={load} disabled={loading}>{error ? 'Retry balance' : 'Refresh balance'}</button>
        <Link className={styles.button} href="/employer/settings#plan">{paid ? 'Manage subscription' : 'Upgrade plan'}</Link>
      </div>
    </div>
    {!loading && !error && <>
      <progress aria-label="Employer AI credits used" className={styles.creditProgress} value={Math.min(budget.spentCredits, budget.limitCredits)} max={budget.limitCredits || 1} />
      <p className={styles.muted}>{reset && Number.isFinite(reset.getTime()) ? 'Resets ' + reset.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) + ' (UTC)' : 'Reset date unavailable'} · Used for AI job descriptions and résumé reviews.</p>
    </>}
    <p className={styles.muted}>Candidate and employer credits are counted separately. One Paid membership upgrades both workspaces.</p>
  </section>;
}
