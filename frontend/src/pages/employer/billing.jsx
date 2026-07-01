'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi } from '@/services/employerApi';

/* ---------------------------------------------------------------- data --- */
// Mirrors the dc Component.renderVals() sample data.
const LINE_ITEMS = [
  { label: 'Growth plan', detail: 'base subscription', amount: '$2,388.00' },
  { label: 'Additional seats', detail: '2 × $180/yr', amount: '$360.00' },
  { label: 'Extra job slot', detail: '1 × $120/yr', amount: '$120.00' },
];

const statusStyle = (s) =>
  s === 'paid'
    ? { label: 'PAID', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' }
    : { label: 'REFUNDED', color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' };

// Format a numeric amount the way the sample rows are (e.g. "$2,868.00").
const fmtAmount = (v) =>
  typeof v === 'number'
    ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v;

const RAW_INVOICES = [
  { date: 'Jul 28, 2025', desc: 'Growth · Annual', po: 'PO-2026-0142', amount: '$2,868.00', status: 'paid' },
  { date: 'Jul 28, 2024', desc: 'Growth · Annual', po: 'PO-2025-0098', amount: '$2,508.00', status: 'paid' },
  { date: 'Mar 12, 2025', desc: 'Extra job slot (prorated)', po: 'PO-2026-0142', amount: '$84.00', status: 'paid' },
  { date: 'Jan 04, 2025', desc: 'Seat removal credit', po: '—', amount: '$60.00', status: 'refunded' },
  { date: 'Jul 28, 2023', desc: 'Starter · Annual', po: 'PO-2024-0051', amount: '$948.00', status: 'paid' },
];

const buildInvoices = (rows) =>
  rows.map((i, idx, arr) => {
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

const INVOICES = buildInvoices(RAW_INVOICES);

const DETAILS = [
  { label: 'Company', value: 'Stripe, Inc.' },
  { label: 'Billing email', value: 'ap@stripe.com' },
  { label: 'Address', value: '354 Oyster Point Blvd, South San Francisco, CA 94080' },
  { label: 'Country / Tax ID', value: 'United States · EIN 27-1234567' },
  { label: 'PO number', value: 'PO-2026-0142' },
  { label: 'Payment terms', value: 'Net 30 · auto-charge' },
];

const GRID_COLS = '1fr 1.5fr 0.9fr 0.9fr 0.9fr 0.8fr';

// Plan summary sample (fallback when the employer backend is unavailable).
const PLAN_SAMPLE = {
  planName: 'Growth plan',
  nextCharge: '$2,868.00',
  nextChargeOn: 'on Jul 28, 2026',
  billingLine: 'Annual · $239/mo billed yearly',
  annualTotal: '$2,868.00',
};

/* ----------------------------------------------------------- component --- */
export default function EmployerBilling() {
  const [editing, setEditing] = useState(false);

  // Live data seeded with design samples; overridden on successful fetch.
  const [plan, setPlan] = useState(PLAN_SAMPLE);
  const [lineItems, setLineItems] = useState(LINE_ITEMS);
  const [invoices, setInvoices] = useState(INVOICES);

  // Fetch live billing data; on any failure keep the sample fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          employerBillingApi.subscription().catch(() => null),
          employerBillingApi.invoices().catch(() => null),
        ]);
        if (!alive) return;

        const sub = subRes?.subscription;
        if (sub) {
          const planLabel = sub.plan
            ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) + ' plan'
            : PLAN_SAMPLE.planName;
          const cycle = sub.billingCycle
            ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)
            : null;
          setPlan((prev) => ({
            ...prev,
            planName: planLabel,
            nextChargeOn: sub.renewsAt ? `on ${sub.renewsAt}` : prev.nextChargeOn,
            billingLine: cycle || prev.billingLine,
          }));
        }

        const rows = Array.isArray(invRes?.invoices)
          ? invRes.invoices
          : Array.isArray(sub?.invoices)
          ? sub.invoices
          : null;
        if (rows && rows.length) {
          setInvoices(
            buildInvoices(
              rows.map((r) => ({
                date: r.date,
                desc: r.description,
                po: r.po || '—',
                amount: fmtAmount(r.amount),
                status: r.status || 'paid',
              })),
            ),
          );
        }
      } catch {
        /* keep samples */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startEdit = () => setEditing(true);
  const saveEdit = () => setEditing(false);
  const cancelEdit = () => setEditing(false);

  const inputStyle = {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#1B1A16',
    background: '#FBF8F1',
    border: '1px solid #E1D9C9',
    borderRadius: 12,
    padding: '11px 14px',
  };

  const thStyle = {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 10,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#9A9286',
  };

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
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        #emapp .em-paymethod:hover {
          border-color: #4263eb !important;
        }
        #emapp .em-changeplan:hover {
          background: #364fc7 !important;
        }
        #emapp .em-cancel:hover {
          color: #c9622e !important;
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="settings" />

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
              href={appRoute('Employer Settings.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 22px' }}>Billing</h1>

            {/* SUMMARY */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: '24px 26px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                    <span style={{ fontSize: 19, fontWeight: 700 }}>{plan.planName}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>ACTIVE</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 8 }}>Next charge</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 600 }}>{plan.nextCharge}</span>
                    <span style={{ fontSize: 13, color: '#5A544A' }}>{plan.nextChargeOn}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8A8378', marginTop: 4 }}>{plan.billingLine}</div>
                </div>

                <Link
                  href={appRoute('Employer Payment Methods.dc.html')}
                  className="em-paymethod"
                  style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 13, padding: '13px 16px', textDecoration: 'none' }}
                >
                  <span style={{ width: 34, height: 24, borderRadius: 5, background: 'linear-gradient(135deg,#4263EB,#364FC7)', flexShrink: 0 }} />
                  <span>
                    <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>•••• 8841</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>Amex · expires 11/27</span>
                  </span>
                  <span style={{ color: '#A79E8F', fontSize: 14, marginLeft: 4 }}>→</span>
                </Link>
              </div>

              {/* LINE ITEMS */}
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #F2ECE0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lineItems.map((li) => (
                  <div key={li.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{li.label}</span>
                      <span style={{ fontSize: 12.5, color: '#8A8378' }}> · {li.detail}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1B1A16' }}>{li.amount}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F2ECE0' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Annual total</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600 }}>{plan.annualTotal}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 11, marginTop: 18 }}>
                <Link
                  href={appRoute('Employer Plans.dc.html')}
                  className="em-changeplan"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', borderRadius: 999, padding: '10px 18px', textDecoration: 'none' }}
                >
                  Change plan
                </Link>
                <Link
                  href={appRoute('Employer Settings.dc.html')}
                  className="em-cancel"
                  style={{ fontSize: 13.5, fontWeight: 600, color: '#8A8378', textDecoration: 'none', padding: '10px 8px' }}
                >
                  Cancel subscription
                </Link>
              </div>
            </div>

            {/* INVOICES */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Invoices</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>PO &amp; VAT shown on each PDF</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, padding: '11px 24px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span style={thStyle}>Date</span>
                <span style={thStyle}>Description</span>
                <span style={thStyle}>PO</span>
                <span style={thStyle}>Amount</span>
                <span style={thStyle}>Status</span>
                <span style={{ ...thStyle, textAlign: 'right' }}>Receipt</span>
              </div>
              {invoices.map((i, idx) => (
                <div
                  key={idx}
                  style={{ display: 'grid', gridTemplateColumns: GRID_COLS, alignItems: 'center', padding: '14px 24px', borderBottom: `1px solid ${i.divider}` }}
                >
                  <span style={{ fontSize: 13, color: '#5A544A' }}>{i.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{i.desc}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>{i.po}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1B1A16' }}>{i.amount}</span>
                  <span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: i.statusColor, background: i.statusBg, border: `1px solid ${i.statusBorder}`, padding: '3px 9px', borderRadius: 999 }}>{i.statusLabel}</span>
                  </span>
                  <a href="#" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, color: '#4263EB', textDecoration: 'none', textAlign: 'right' }}>PDF ↓</a>
                </div>
              ))}
            </div>

            {/* COMPANY / TAX DETAILS */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Billing contact &amp; tax details</h2>
                {!editing && (
                  <button onClick={startEdit} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                )}
              </div>

              {!editing && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>
                  {DETAILS.map((d) => (
                    <div key={d.label}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 4 }}>{d.label}</div>
                      <div style={{ fontSize: 14, color: '#1B1A16' }}>{d.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {editing && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                  <input defaultValue="Stripe, Inc." style={inputStyle} />
                  <input defaultValue="ap@stripe.com" style={inputStyle} />
                  <input defaultValue="354 Oyster Point Blvd, South SF, CA" style={{ ...inputStyle, gridColumn: 'span 2' }} />
                  <input defaultValue="US · EIN 27-1234567" style={inputStyle} />
                  <input defaultValue="PO-2026-0142" style={inputStyle} />
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={saveEdit} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}>Save</button>
                    <button onClick={cancelEdit} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
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
