'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getInvoices } from '@/services/billingApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

// ---- status pill styling (ported from the design's statusStyle()) -----------
const statusStyle = (s) =>
  s === 'paid'
    ? { label: 'PAID', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' }
    : { label: 'REFUNDED', color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' };

// Normalize a raw invoice list into render-ready rows (status pill + divider).
const buildInvoices = (raw) =>
  raw.map((i, idx, arr) => {
    const ss = statusStyle(i.status);
    return {
      ...i,
      statusLabel: ss.label,
      statusColor: ss.color,
      statusBg: ss.bg,
      statusBorder: ss.border,
      divider: idx < arr.length - 1 ? '#F2ECE0' : 'transparent',
    };
  });

// Best-effort mapping of an API invoice shape onto the design's row shape.
const normalizeApiInvoice = (i) => {
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
  const fmtAmount = (a) => {
    if (typeof a === 'number') return `$${a.toFixed(2)}`;
    return a != null ? String(a) : '$0.00';
  };
  const status = String(i.status || 'paid').toLowerCase() === 'refunded' ? 'refunded' : 'paid';
  return {
    date: i.date ? fmtDate(i.date) : i.dateLabel || '—',
    desc: i.description || i.desc || 'Subscription',
    amount: i.amountLabel || fmtAmount(i.amount),
    status,
  };
};

const headerCell = {
  fontFamily: 'var(--jb-font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#9A9286',
};

export default function AppBilling() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the user's real invoices. No sample fallback — an authenticated user
  // with no billing history sees a genuine empty state, not fabricated rows.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getInvoices();
        const list = Array.isArray(data) ? data : data?.invoices;
        const rows = Array.isArray(list) ? list.map(normalizeApiInvoice) : [];
        if (active) setInvoices(buildInvoices(rows));
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const gridCols = '1fr 1.6fr 0.8fr 0.9fr 0.8fr';

  return (
    <>
      <Head>
        <title>Billing · Plan &amp; billing — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbapp a.jb-pm:hover {
          border-color: #1fa463 !important;
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href={appRoute('App Settings.dc.html')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#5A544A',
                textDecoration: 'none',
              }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>
              Plan &amp; billing
            </span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 820, width: '100%', margin: '0 auto' }}>
            <h1
              style={{
                fontFamily: 'var(--jb-font-display)',
                fontWeight: 400,
                fontSize: 38,
                lineHeight: 1,
                margin: '0 0 22px',
              }}
            >
              Billing
            </h1>

            {/* SUMMARY — real subscription/payment summary is surfaced on the
                subscription & payment-method pages; no fabricated charge here. */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                padding: '8px 26px',
                marginBottom: 18,
              }}
            >
              <EmptyState
                icon="💳"
                title="No active subscription"
                hint="When you subscribe, your next charge and payment method appear here."
                action={
                  <Link
                    href={appRoute('App Payment Methods.dc.html')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      marginTop: 6,
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#0C2C1C',
                      background: '#1FA463',
                      borderRadius: 999,
                      padding: '10px 18px',
                      textDecoration: 'none',
                    }}
                  >
                    Manage payment methods →
                  </Link>
                }
              />
            </div>

            {/* INVOICES */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                overflow: 'hidden',
                marginBottom: 18,
              }}
            >
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2ECE0' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Invoices</h2>
              </div>

              {loading ? (
                <LoadingState label="Loading invoices…" />
              ) : error ? (
                <ErrorState error={error} onRetry={() => window.location.reload()} />
              ) : invoices.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No invoices yet"
                  hint="Your paid invoices and receipts will appear here once you have an active subscription."
                />
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridCols,
                      padding: '11px 24px',
                      background: '#FBF9F4',
                      borderBottom: '1px solid #F2ECE0',
                    }}
                  >
                    <span style={headerCell}>Date</span>
                    <span style={headerCell}>Description</span>
                    <span style={headerCell}>Amount</span>
                    <span style={headerCell}>Status</span>
                    <span style={{ ...headerCell, textAlign: 'right' }}>Receipt</span>
                  </div>
                  {invoices.map((i, idx) => (
                    <div
                      key={`${i.date}-${idx}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: gridCols,
                        alignItems: 'center',
                        padding: '15px 24px',
                        borderBottom: `1px solid ${i.divider}`,
                      }}
                    >
                      <span style={{ fontSize: 13.5, color: '#5A544A' }}>{i.date}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{i.desc}</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#1B1A16' }}>
                        {i.amount}
                      </span>
                      <span>
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            color: i.statusColor,
                            background: i.statusBg,
                            border: `1px solid ${i.statusBorder}`,
                            padding: '3px 9px',
                            borderRadius: 999,
                          }}
                        >
                          {i.statusLabel}
                        </span>
                      </span>
                      <a
                        href="#"
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#157A49',
                          textDecoration: 'none',
                          textAlign: 'right',
                        }}
                      >
                        PDF ↓
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
