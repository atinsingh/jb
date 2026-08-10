'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi, employerCompanyApi } from '@/services/employerApi';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  InlineError,
} from '@/components/employer/EmployerStates';

/* ---------------------------------------------------------------- helpers --- */
const statusStyle = (s) =>
  s === 'refunded'
    ? { label: 'REFUNDED', color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' }
    : { label: 'PAID', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };

// Format a numeric amount the way the design rows are (e.g. "$2,868.00").
const fmtAmount = (v) =>
  typeof v === 'number'
    ? '$' +
      v.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : v ?? '—';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
};

const GRID_COLS = '1fr 2fr 1fr 0.9fr';

const COMPANY_FIELDS = [
  { key: 'name', label: 'Company' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'hq', label: 'Headquarters' },
  { key: 'size', label: 'Company size' },
];

/* ----------------------------------------------------------- component --- */
export default function EmployerBilling() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [plan, setPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [company, setCompany] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Fetch live billing data. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, invRes, plansRes, companyRes] = await Promise.all([
        employerBillingApi.subscription(),
        employerBillingApi.invoices(),
        employerBillingApi.plans(),
        employerCompanyApi.get(),
      ]);

      const sub = subRes?.subscription || {};
      const catalog = Array.isArray(plansRes?.plans) ? plansRes.plans : [];
      const catalogPlan = catalog.find((p) => p.key === sub.plan);
      const cycle = sub.billingCycle || 'monthly';
      const isFreePlan = sub.plan === 'free';
      const perMonth = catalogPlan
        ? cycle === 'annual'
          ? catalogPlan.annual
          : catalogPlan.monthly
        : null;
      const annualTotal =
        perMonth != null && perMonth > 0 ? perMonth * 12 : null;

      setPlan({
        planName: sub.plan ? `${cap(sub.plan)} plan` : '—',
        nextCharge: isFreePlan
          ? 'No charge'
          : cycle === 'annual'
          ? annualTotal != null
            ? fmtAmount(annualTotal)
            : 'Custom'
          : perMonth != null && perMonth > 0
          ? fmtAmount(perMonth)
          : 'Custom',
        // A free plan has no billing date; only show a renewal date when a paid plan actually renews.
        nextChargeOn: isFreePlan ? '' : sub.renewsAt ? `on ${fmtDate(sub.renewsAt)}` : '',
        billingLine: isFreePlan
          ? 'Free plan — no charge. Upgrade any time.'
          : perMonth != null && perMonth > 0
          ? cycle === 'annual'
            ? `Annual · $${perMonth}/mo billed yearly`
            : `Monthly · $${perMonth}/mo`
          : `${cap(cycle)} billing`,
        annualTotal: isFreePlan ? '$0.00' : annualTotal != null ? fmtAmount(annualTotal) : '—',
      });

      const rows = Array.isArray(invRes?.invoices) ? invRes.invoices : [];
      setInvoices(
        rows
          .slice()
          .reverse()
          .map((r) => ({
            date: fmtDate(r.date),
            desc: r.description || '—',
            amount: fmtAmount(r.amount),
            status: r.status || 'paid',
          })),
      );

      const co = companyRes?.company || {};
      setCompany(co);
      setForm({
        name: co.name || '',
        website: co.website || '',
        industry: co.industry || '',
        hq: co.hq || '',
        size: co.size || '',
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setSaveError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setSaveError(null);
    setForm({
      name: company?.name || '',
      website: company?.website || '',
      industry: company?.industry || '',
      hq: company?.hq || '',
      size: company?.size || '',
    });
    setEditing(false);
  };
  // Persist the company details to the backend, then reflect the response.
  const saveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await employerCompanyApi.update(form);
      const co = res?.company || form;
      setCompany(co);
      setForm({
        name: co.name || '',
        website: co.website || '',
        industry: co.industry || '',
        hq: co.hq || '',
        size: co.size || '',
      });
      setEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const onField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
    fontFamily: 'var(--jb-font-mono)',
    fontSize: 11,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#9A9286',
  };

  return (
    <>
      <Head>
        <title>Billing · Plan &amp; billing — Jobocate</title>
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
        #emapp .em-changeplan:hover {
          background: #364fc7 !important;
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
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
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 22px' }}>Billing</h1>

            {loading ? (
              <LoadingState label="Loading billing…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* SUMMARY */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: '24px 26px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <span style={{ fontSize: 19, fontWeight: 700 }}>{plan.planName}</span>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>ACTIVE</span>
                      </div>
                      <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 8 }}>Next charge</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 28, fontWeight: 600 }}>{plan.nextCharge}</span>
                        {plan.nextChargeOn && <span style={{ fontSize: 13, color: '#5A544A' }}>{plan.nextChargeOn}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#8A8378', marginTop: 4 }}>{plan.billingLine}</div>
                    </div>

                    {/* Payment method — no saved-payment integration exists, so we
                        show an honest empty state rather than a fabricated card. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 13, padding: '13px 16px' }}>
                      <span style={{ width: 34, height: 24, borderRadius: 5, background: '#EFE8DA', flexShrink: 0 }} />
                      <span>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>No payment method on file</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>Billing is not yet connected</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Annual total</span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 16, fontWeight: 600 }}>{plan.annualTotal}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 11, marginTop: 18 }}>
                    <Link
                      href={appRoute('Employer Plans.dc.html')}
                      className="em-changeplan"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', borderRadius: 999, padding: '10px 18px', textDecoration: 'none' }}
                    >
                      Change plan
                    </Link>
                  </div>
                </div>

                {/* INVOICES */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Invoices</h2>
                  </div>
                  {invoices.length === 0 ? (
                    <EmptyState icon="○" title="No invoices yet" hint="Invoices will appear here after your first plan change or charge." />
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, padding: '11px 24px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                        <span style={thStyle}>Date</span>
                        <span style={thStyle}>Description</span>
                        <span style={thStyle}>Amount</span>
                        <span style={thStyle}>Status</span>
                      </div>
                      {invoices.map((i, idx) => {
                        const ss = statusStyle(i.status);
                        const divider = idx < invoices.length - 1 ? '#F2ECE0' : 'transparent';
                        return (
                          <div
                            key={idx}
                            style={{ display: 'grid', gridTemplateColumns: GRID_COLS, alignItems: 'center', padding: '14px 24px', borderBottom: `1px solid ${divider}` }}
                          >
                            <span style={{ fontSize: 13, color: '#5A544A' }}>{i.date}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{i.desc}</span>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#1B1A16' }}>{i.amount}</span>
                            <span>
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: '3px 9px', borderRadius: 999 }}>{ss.label}</span>
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* COMPANY DETAILS */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: '24px 26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Company details</h2>
                    {!editing && (
                      <button onClick={startEdit} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                    )}
                  </div>

                  <InlineError error={saveError} />

                  {!editing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>
                      {COMPANY_FIELDS.map((d) => (
                        <div key={d.key}>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 4 }}>{d.label}</div>
                          <div style={{ fontSize: 14, color: company?.[d.key] ? '#1B1A16' : '#A79E8F' }}>{company?.[d.key] || 'Not set'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                      <input value={form.name} onChange={onField('name')} placeholder="Company name" style={{ ...inputStyle, gridColumn: 'span 2' }} />
                      <input value={form.website} onChange={onField('website')} placeholder="Website" style={inputStyle} />
                      <input value={form.industry} onChange={onField('industry')} placeholder="Industry" style={inputStyle} />
                      <input value={form.hq} onChange={onField('hq')} placeholder="Headquarters" style={inputStyle} />
                      <input value={form.size} onChange={onField('size')} placeholder="Company size" style={inputStyle} />
                      <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={saveEdit} disabled={saving} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                        <button onClick={cancelEdit} disabled={saving} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
