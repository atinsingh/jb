'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { Screen, CellGrid, Label, EndRule, MonoButton, MonoSwitch, mono, HAIR } from '@/components/app/v3/kit';
import { createCheckout, createPortal, getAiBudget, getInvoices, getPlans, getSubscription } from '@/services/billingApi';

// Best-effort mapping of an API invoice shape onto the v3 row.
const normalizeInvoice = (i) => {
  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };
  const fmtAmount = (a) => (typeof a === 'number' ? `$${a.toFixed(2)}` : a != null ? String(a) : '—');
  return {
    id: i.id || i._id || `${i.date}-${i.amount}`,
    date: i.date ? fmtDate(i.date) : i.dateLabel || '—',
    label: i.description || i.desc || 'Subscription',
    amt: i.amountLabel || fmtAmount(i.amount),
    status: String(i.status || 'paid').toLowerCase() === 'refunded' ? 'refunded' : 'paid',
    url: i.invoiceUrl || i.url || null,
  };
};

/*
 * Plans are live product data. Monthly and yearly values are the actual Stripe
 * billing amounts returned by the candidate catalogue.
 */
const COLS = '110px 1fr 90px 70px';
const formatPlanPrice = (amount, currency = 'usd') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency).toUpperCase(),
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0,
  }).format(Number(amount) || 0);

export default function AppBilling() {
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [budget, setBudget] = useState(null);
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [invoiceData, planData, subscriptionData] = await Promise.all([getInvoices(), getPlans(), getSubscription()]);
        // Subscription read reconciles Stripe after missed webhooks; fetch the
        // AI budget only after it has applied the resulting tier.
        const budgetData = await getAiBudget().catch(() => ({ status: 'unavailable' }));
        if (!alive) return;
        const list = invoiceData?.invoices || (Array.isArray(invoiceData) ? invoiceData : []);
        setInvoices((Array.isArray(list) ? list : []).map(normalizeInvoice));
        setPlans(Array.isArray(planData?.plans) ? planData.plans : []);
        setSubscription(subscriptionData?.subscription || null);
        setCurrentPlan(subscriptionData?.currentPlan === 'PRO' ? 'PRO' : 'FREE');
        setBudget(budgetData || null);
      } catch (e) {
        if (alive) setError(e || new Error('Could not load your invoices'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const checkout = async (plan) => {
    setError(null);
    try {
      const result = await createCheckout(plan._id, yearly ? 'yearly' : 'monthly');
      if (!result?.url) throw new Error('Stripe checkout did not return a URL');
      window.location.assign(result.url);
    } catch (e) {
      setError(e);
    }
  };

  const paidTotal = useMemo(() => invoices.filter((i) => i.status === 'paid').length, [invoices]);

  const managePlan = async () => {
    setError(null);
    try {
      const result = await createPortal();
      if (!result?.url) throw new Error('Billing portal did not return a URL');
      window.location.assign(result.url);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <>
      <Head>
        <title>Billing · Jobocate</title>
      </Head>

      <Screen width={1060} pad="40px 28px 80px">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            marginBottom: 34,
          }}
        >
          <div>
            <div data-testid="candidate-current-plan" style={{ ...mono(11, '0'), marginBottom: 12 }}>
              Current plan: {currentPlan === 'PRO' ? 'Paid' : 'Free'}
              {currentPlan === 'PRO' && subscription?.billingCycle ? ` · ${subscription.billingCycle}` : ''}
            </div>
            <div style={{ ...mono(), marginBottom: 10 }}>Invoices paid</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 600,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                }}
              >
                {paidTotal}
              </span>
              <span style={mono(11, '0')}>/ {invoices.length} total</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={mono(10, '0.12em', yearly ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg)')}>Monthly</span>
            <MonoSwitch checked={yearly} onChange={() => setYearly(!yearly)} label="Billing cycle" />
            <span style={mono(10, '0.12em', yearly ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)')}>Yearly</span>
          </div>
        </div>

        {budget && (
          <div data-testid="billing-budget" style={{ ...mono(11, '0'), marginBottom: 18 }}>
            {budget.status === 'unavailable' ? 'AI credits unavailable · model-running actions are paused' : `AI credits: ${Number(budget.remaining || 0)} of ${Number(budget.limit || 0)} remaining · ${budget.status} · renews monthly`}
          </div>
        )}

        {currentPlan === 'PRO' && <MonoButton onClick={managePlan} style={{ marginBottom: 18 }}>Manage subscription</MonoButton>}

        <CellGrid cols={Math.max(plans.length, 1)} style={{ marginBottom: 34 }}>
          {plans.map((p) => {
            const current = currentPlan === p.type;
            const amount = yearly ? p.priceYearly : p.priceMonthly;
            return (
              <div
                key={p.name}
                data-testid={`billing-plan-${p.type}`}
                style={{
                  background: 'var(--jb-v3-panel)',
                  padding: '24px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  {p.type === 'PRO' && <span style={mono(9.5, '0.12em', 'var(--jb-v3-accent)')}>Paid</span>}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 5,
                    marginBottom: 22,
                  }}
                >
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 600,
                      letterSpacing: '-0.045em',
                      lineHeight: 1,
                    }}
                  >
                    {formatPlanPrice(amount, p.currency)}
                  </span>
                  <span style={mono(10, '0')}>{yearly ? '/year' : '/month'}</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    marginBottom: 22,
                  }}
                >
                  {(p.features || []).map((l) => (
                    <div
                      key={l}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 9,
                      }}
                    >
                      <span
                        style={{
                          width: 3,
                          height: 10,
                          display: 'block',
                          flex: 'none',
                          background: 'var(--jb-v3-accent)',
                        }}
                      />
                      <span style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-2)' }}>{l}</span>
                    </div>
                  ))}
                </div>
                <MonoButton
                  block
                  filled={p.type === 'PRO'}
                  disabled={p.type === 'FREE' || current}
                  data-testid={`billing-checkout-${p.type}`}
                  onClick={() => checkout(p)}
                  style={{
                    padding: '8px 0',
                    opacity: p.type === 'FREE' || current ? 0.55 : 1,
                  }}
                >
                  {current ? 'Current' : p.type === 'FREE' ? 'Free' : 'Choose Paid'}
                </MonoButton>
              </div>
            );
          })}
        </CellGrid>

        {loading && <LoadingState label="Loading your invoices…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && invoices.length > 0 && (
          <>
            <Label>Invoices</Label>
            {invoices.map((i) => (
              <div
                key={i.id}
                style={{
                  borderTop: HAIR,
                  padding: '13px 4px',
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  gap: 20,
                  alignItems: 'baseline',
                }}
              >
                <span style={mono(10.5, '0')}>{i.date}</span>
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>
                  {i.label}
                  {i.status === 'refunded' && (
                    <span
                      style={{
                        ...mono(9.5, '0.12em', 'var(--jb-v3-warn)'),
                        marginLeft: 10,
                      }}
                    >
                      Refunded
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11 }}>{i.amt}</span>
                {i.url ? (
                  <a
                    href={i.url}
                    style={{
                      ...mono(10, '0.1em', 'var(--jb-v3-accent)'),
                      textAlign: 'right',
                    }}
                  >
                    PDF
                  </a>
                ) : (
                  <span style={{ ...mono(10, '0.1em'), textAlign: 'right' }}>—</span>
                )}
              </div>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && invoices.length === 0 && <EmptyState title="No invoices yet" hint="Charges appear here once you upgrade." />}
      </Screen>
    </>
  );
}
