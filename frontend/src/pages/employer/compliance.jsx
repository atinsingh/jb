'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, EmptyState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerComplianceApi } from '@/services/employerApi';

/* ----------------------------------------------------------- requests --- */
const typeStyle = (t) =>
  t === 'Delete'
    ? { color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4', icon: '⌫', iconBg: '#FBEDE4', iconColor: '#C9622E', actBg: '#C9622E' }
    : { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB', icon: '↧', iconBg: '#EDF0FE', iconColor: '#4263EB', actBg: '#4263EB' };

const statusStyle = (k) => {
  if (k === 'done') return { label: 'COMPLETED', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (k === 'progress') return { label: 'IN PROGRESS', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
  return { label: 'PENDING', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
};

const fmtDate = (d) => {
  const t = d ? new Date(d) : null;
  if (!t || isNaN(t.getTime())) return '';
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const mapReq = (r) => {
  const type = r.type === 'Delete' || /delete|eras/i.test(r.type || '') ? 'Delete' : 'Export';
  return {
    id: r._id || r.id,
    name: r.name,
    type,
    detail: r.detail,
    requested: r.requested || fmtDate(r.requestedAt),
    statusKey:
      r.status === 'done' || r.status === 'fulfilled'
        ? 'done'
        : r.status === 'rejected'
        ? 'done'
        : r.status === 'progress'
        ? 'progress'
        : r.statusKey || 'pending',
  };
};

export default function EmployerCompliance() {
  const [handled, setHandled] = useState({});
  const [reqRaw, setReqRaw] = useState([]);
  const [consents, setConsents] = useState([]);
  const [retention, setRetention] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Fetch live compliance data. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employerComplianceApi.get();
      setReqRaw(Array.isArray(data?.requests) ? data.requests.map(mapReq) : []);
      setConsents(Array.isArray(data?.consents) ? data.consents : []);
      setRetention(Array.isArray(data?.retention) ? data.retention : []);
      setHandled({});
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

  const handle = async (id, type) => {
    setActionError(null);
    try {
      await employerComplianceApi.updateRequest(id, type === 'Delete' ? 'rejected' : 'fulfilled');
      setHandled((s) => ({ ...s, [id]: true }));
    } catch (err) {
      setActionError(err);
    }
  };

  const logRequest = async () => {
    const name = typeof window !== 'undefined' ? window.prompt('Candidate name') : null;
    if (!name) return;
    const type =
      typeof window !== 'undefined' && window.confirm('Deletion request? (Cancel for Export)')
        ? 'Delete'
        : 'Export';
    const detail =
      (typeof window !== 'undefined' &&
        window.prompt('Detail', type === 'Delete' ? 'Right to erasure (GDPR Art. 17)' : 'Data access request')) ||
      '';
    setActionError(null);
    try {
      const res = await employerComplianceApi.createRequest({ name, type, detail });
      const created = res && (res._id || res.id) ? mapReq(res) : null;
      if (created) {
        setReqRaw((s) => [created, ...s]);
        return;
      }
      await load();
    } catch (err) {
      setActionError(err);
    }
  };

  // Export the real requests as a CSV download.
  const exportCsv = () => {
    if (!reqRaw.length) return;
    const header = ['Name', 'Type', 'Detail', 'Requested', 'Status'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = reqRaw.map((r) =>
      [r.name, r.type, r.detail, r.requested, handled[r.id] ? 'done' : r.statusKey].map(esc).join(','),
    );
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance-requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const requests = reqRaw.map((r, i, arr) => {
    const ts = typeStyle(r.type);
    const isDone = r.statusKey === 'done' || handled[r.id];
    const ss = statusStyle(handled[r.id] ? 'done' : r.statusKey);
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      detail: r.detail,
      requested: r.requested,
      icon: ts.icon,
      iconBg: ts.iconBg,
      iconColor: ts.iconColor,
      typeColor: ts.color,
      typeBg: ts.bg,
      typeBorder: ts.border,
      status: ss.label,
      statusColor: ss.color,
      statusBg: ss.bg,
      statusBorder: ss.border,
      actionable: !isDone,
      done: isDone,
      doneLabel: r.type === 'Delete' ? 'Deleted' : 'Exported',
      actLabel: r.type === 'Delete' ? 'Delete data' : 'Fulfill export',
      actBg: ts.actBg,
      divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
    };
  });
  const openRequests = requests.filter((r) => r.actionable).length;

  return (
    <>
      <Head>
        <title>Compliance — Jobocate</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp .em-export:hover {
          background: #f4efe4 !important;
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <button onClick={exportCsv} disabled={!reqRaw.length} className="em-export" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '8px 15px', cursor: reqRaw.length ? 'pointer' : 'not-allowed', opacity: reqRaw.length ? 1 : 0.5 }}>↧ Audit-ready export</button>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Compliance</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Anonymized hiring reporting and candidate data-rights tooling.</p>
            </div>

            {loading ? (
              <LoadingState label="Loading compliance data…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
            <>
            <InlineError error={actionError} />

            {/* DATA REQUESTS */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>GDPR / CCPA requests</h2>
                  <p style={{ fontSize: 12.5, color: '#8A8378', margin: '3px 0 0' }}>{openRequests} open · SLA 30 days</p>
                </div>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286' }}>Candidate data rights</span>
              </div>
              {requests.length === 0 && (
                <div style={{ padding: '28px 22px', textAlign: 'center', fontSize: 13, color: '#8A8378' }}>
                  No data-rights requests logged yet.
                </div>
              )}
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: `1px solid ${r.divider}` }}>
                  <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: r.iconBg, color: r.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{r.name}</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: r.typeColor, background: r.typeBg, border: `1px solid ${r.typeBorder}`, padding: '2px 8px', borderRadius: 999 }}>{r.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8378' }}>{r.detail} · requested {r.requested}</div>
                  </div>
                  <span style={{ flexShrink: 0, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: r.statusColor, background: r.statusBg, border: `1px solid ${r.statusBorder}`, padding: '4px 10px', borderRadius: 999 }}>{r.status}</span>
                  {r.actionable && (
                    <button onClick={() => handle(r.id, r.type)} style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: r.actBg, border: 'none', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>{r.actLabel}</button>
                  )}
                  {r.done && (
                    <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: '#157A49' }}>✓ {r.doneLabel}</span>
                  )}
                </div>
              ))}
              <div style={{ padding: '13px 22px', background: '#FBF9F4' }}>
                <button onClick={logRequest} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>＋ Log a new request</button>
              </div>
            </div>

            {/* CONSENT + RETENTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Consent &amp; policy</h2>
                {consents.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#8A8378' }}>No consent policies configured yet.</div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {consents.map((c) => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{c.label}</div>
                        <div style={{ fontSize: 11.5, color: '#8A8378' }}>{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Retention windows</h2>
                {retention.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#8A8378' }}>No retention windows configured yet.</div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {retention.map((r) => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>{r.label}</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12.5, fontWeight: 600, color: '#1B1A16' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                )}
                <Link href={appRoute('Employer Security.dc.html')} style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 600, color: '#4263EB', textDecoration: 'none', marginTop: 14 }}>Edit in Security →</Link>
              </div>
            </div>
            </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
