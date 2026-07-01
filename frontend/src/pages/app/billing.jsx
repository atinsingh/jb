'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getInvoices } from '@/services/billingApi';

// ---- status pill styling (ported from the design's statusStyle()) -----------
const statusStyle = (s) =>
  s === 'paid'
    ? { label: 'PAID', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' }
    : { label: 'REFUNDED', color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' };

// ---- the design's own sample invoices (graceful fallback) -------------------
const SAMPLE_INVOICES = [
  { date: 'Jul 28, 2025', desc: 'Premium · Annual', amount: '$468.00', status: 'paid' },
  { date: 'Jun 28, 2025', desc: 'Pro · Monthly', amount: '$29.00', status: 'paid' },
  { date: 'May 28, 2025', desc: 'Pro · Monthly', amount: '$29.00', status: 'paid' },
  { date: 'Apr 28, 2025', desc: 'Pro · Monthly', amount: '$29.00', status: 'paid' },
  { date: 'Mar 30, 2025', desc: 'Pro · Monthly (prorated refund)', amount: '$12.40', status: 'refunded' },
  { date: 'Mar 28, 2025', desc: 'Pro · Monthly', amount: '$29.00', status: 'paid' },
];

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
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: 10,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#9A9286',
};

const inputStyle = {
  fontFamily: 'inherit',
  fontSize: 14,
  color: '#1B1A16',
  background: '#FBF8F1',
  border: '1px solid #E1D9C9',
  borderRadius: 12,
  padding: '11px 14px',
};

export default function AppBilling() {
  const [editing, setEditing] = useState(false);
  const [invoices, setInvoices] = useState(() => buildInvoices(SAMPLE_INVOICES));

  // Attempt a real fetch; gracefully fall back to the design sample data on any
  // failure (no live endpoint, unauthenticated, etc.) so the page always renders.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getInvoices();
        const list = Array.isArray(data) ? data : data?.invoices;
        if (active && Array.isArray(list) && list.length > 0) {
          setInvoices(buildInvoices(list.map(normalizeApiInvoice)));
        }
      } catch {
        // keep sample fallback
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
          fontFamily: "'Hanken Grotesk',sans-serif",
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
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>
              Plan &amp; billing
            </span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 820, width: '100%', margin: '0 auto' }}>
            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 38,
                lineHeight: 1,
                margin: '0 0 22px',
              }}
            >
              Billing
            </h1>

            {/* SUMMARY */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                padding: '24px 26px',
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10.5,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#9A9286',
                      marginBottom: 8,
                    }}
                  >
                    Next charge
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 28,
                        fontWeight: 600,
                        color: '#1B1A16',
                      }}
                    >
                      $39.00
                    </span>
                    <span style={{ fontSize: 13.5, color: '#5A544A' }}>
                      /mo · annual renewal of <b style={{ color: '#1B1A16' }}>$468.00</b>
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8A8378', marginTop: 5 }}>
                    On Jul 28, 2026 · Premium plan
                  </div>
                </div>
                <Link
                  href={appRoute('App Payment Methods.dc.html')}
                  className="jb-pm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    background: '#FBF8F1',
                    border: '1px solid #E1D9C9',
                    borderRadius: 13,
                    padding: '13px 16px',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 24,
                      borderRadius: 5,
                      background: 'linear-gradient(135deg,#1FA463,#157A49)',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1B1A16',
                      }}
                    >
                      •••• 4242
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>
                      Visa · expires 09/27
                    </span>
                  </span>
                  <span style={{ color: '#A79E8F', fontSize: 14, marginLeft: 4 }}>→</span>
                </Link>
              </div>
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
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1B1A16' }}>
                    {i.amount}
                  </span>
                  <span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 9.5,
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
                      fontFamily: "'JetBrains Mono',monospace",
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
            </div>

            {/* BILLING ADDRESS */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                padding: '24px 26px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Billing address</h2>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#157A49',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editing && (
                <div style={{ fontSize: 14.5, lineHeight: 1.7, color: '#46413A' }}>
                  <div style={{ fontWeight: 600, color: '#1B1A16' }}>Sarah Chen</div>
                  <div>1100 Market Street, Suite 400</div>
                  <div>San Francisco, CA 94103</div>
                  <div>United States</div>
                </div>
              )}

              {editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input defaultValue="Sarah Chen" style={{ ...inputStyle, width: '100%' }} />
                  <input defaultValue="1100 Market Street, Suite 400" style={{ ...inputStyle, width: '100%' }} />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input defaultValue="San Francisco" style={{ ...inputStyle, flex: 1 }} />
                    <input defaultValue="CA" style={{ ...inputStyle, width: 80 }} />
                    <input defaultValue="94103" style={{ ...inputStyle, width: 110 }} />
                  </div>
                  <input defaultValue="United States" style={{ ...inputStyle, width: '100%' }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => setEditing(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#0C2C1C',
                        background: '#1FA463',
                        border: 'none',
                        borderRadius: 999,
                        padding: '10px 20px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#5A544A',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
