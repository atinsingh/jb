'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  CellGrid,
  Label,
  EndRule,
  MonoButton,
  MonoSwitch,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import { getInvoices } from '@/services/billingApi';

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
 * Plans are product content, not user data. Prices are the two published
 * cycles; the yearly figure is the monthly-equivalent at the annual discount,
 * which is what the design's toggle switches between.
 */
const PLANS = [
  {
    name: 'Free',
    monthly: 0,
    yearly: 0,
    tag: '',
    lines: ['5 matches a day', 'Manual apply', 'One résumé'],
    cta: 'Current',
  },
  {
    name: 'Pro',
    monthly: 29,
    yearly: 23,
    tag: 'Popular',
    lines: ['Unlimited matches', 'Auto-apply drafts', 'Résumé tailoring', 'Interview drills'],
    cta: 'Choose Pro',
  },
  {
    name: 'Premium',
    monthly: 59,
    yearly: 47,
    tag: '',
    lines: ['Everything in Pro', 'Human concierge', 'Offer negotiation', 'Priority support'],
    cta: 'Choose Premium',
  },
];

const COLS = '110px 1fr 90px 70px';

export default function AppBilling() {
  const [invoices, setInvoices] = useState([]);
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getInvoices();
        if (!alive) return;
        const list = data?.invoices || (Array.isArray(data) ? data : []);
        setInvoices((Array.isArray(list) ? list : []).map(normalizeInvoice));
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

  const paidTotal = useMemo(
    () => invoices.filter((i) => i.status === 'paid').length,
    [invoices],
  );

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
            <div style={{ ...mono(), marginBottom: 10 }}>Invoices paid</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}
              >
                {paidTotal}
              </span>
              <span style={mono(11, '0')}>/ {invoices.length} total</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={mono(10, '0.12em', yearly ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg)')}>
              Monthly
            </span>
            <MonoSwitch checked={yearly} onChange={() => setYearly(!yearly)} label="Billing cycle" />
            <span style={mono(10, '0.12em', yearly ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)')}>
              Yearly −20%
            </span>
          </div>
        </div>

        <CellGrid cols={3} style={{ marginBottom: 34 }}>
          {PLANS.map((p) => (
            <div
              key={p.name}
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
                {p.tag && (
                  <span style={mono(9.5, '0.12em', 'var(--jb-v3-accent)')}>{p.tag}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 22 }}>
                <span
                  style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}
                >
                  ${yearly ? p.yearly : p.monthly}
                </span>
                <span style={mono(10, '0')}>/mo</span>
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
                {p.lines.map((l) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
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
              <MonoButton block filled={p.name === 'Pro'} href="/app/upgrade" style={{ padding: '8px 0' }}>
                {p.cta}
              </MonoButton>
            </div>
          ))}
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
                    <span style={{ ...mono(9.5, '0.12em', 'var(--jb-v3-warn)'), marginLeft: 10 }}>
                      Refunded
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11 }}>{i.amt}</span>
                {i.url ? (
                  <a
                    href={i.url}
                    style={{ ...mono(10, '0.1em', 'var(--jb-v3-accent)'), textAlign: 'right' }}
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

        {!loading && !error && invoices.length === 0 && (
          <EmptyState title="No invoices yet" hint="Charges appear here once you upgrade." />
        )}
      </Screen>
    </>
  );
}
