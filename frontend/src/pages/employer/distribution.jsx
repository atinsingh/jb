'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerDistributionApi } from '@/services/employerApi';

/* ------------------------------------------------------ presentation --- */
// Deterministic logo/colour derivation — pure presentation, no seeded data.
const LOGO_PALETTE = [
  { bg: '#EDF0FE', color: '#4263EB' },
  { bg: '#E6F4EA', color: '#1A7F4B' },
  { bg: '#FBF1E2', color: '#9A6A2E' },
  { bg: '#F3EAF9', color: '#7A2E9A' },
  { bg: '#FBEDE4', color: '#C9622E' },
  { bg: '#E6F0FE', color: '#2A6FDB' },
];

function logoFor(key, name) {
  const initials = String(name || key || '?')
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const s = String(key || name || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const pal = LOGO_PALETTE[h % LOGO_PALETTE.length];
  return { logo: initials, logoBg: pal.bg, logoColor: pal.color };
}

function statusStyle(k) {
  if (k === 'live') return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6', dot: '#1FA463' };
  if (k === 'paused' || k === 'pending') return { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE', dot: '#D89A3E' };
  return { color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4', dot: '#C9622E' };
}

const spendLabel = (spend) => (Number(spend) > 0 ? `Sponsored · $${Number(spend)}` : 'Free');

/* ----------------------------------------------------------- component --- */
export default function EmployerDistribution() {
  const [channels, setChannels] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Fetch live distribution data. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerDistributionApi.get();
      setChannels(Array.isArray(res?.channels) ? res.channels : []);
      setPerformance(Array.isArray(res?.performance) ? res.performance : []);
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

  // Merge a channel update returned by the API back into local state.
  const applyChannel = (key, updated, optimistic) =>
    setChannels((s) =>
      s.map((c) =>
        c.key === key
          ? {
              ...c,
              enabled: updated?.enabled ?? optimistic.enabled ?? c.enabled,
              spend: updated?.spend ?? optimistic.spend ?? c.spend,
              status: updated?.status ?? optimistic.status ?? c.status,
            }
          : c,
      ),
    );

  const toggle = async (ch) => {
    setActionError(null);
    try {
      const updated = await employerDistributionApi.updateChannel(ch.key, { enabled: !ch.enabled });
      applyChannel(ch.key, updated, { enabled: !ch.enabled });
    } catch (err) {
      setActionError(err);
    }
  };

  const editBudget = async (ch) => {
    const input = typeof window !== 'undefined' ? window.prompt('Monthly sponsorship budget (USD)', ch.spend ? String(ch.spend) : '') : null;
    if (input == null) return;
    const spend = Number(input);
    if (Number.isNaN(spend) || spend < 0) {
      setActionError(new Error('Enter a valid budget amount.'));
      return;
    }
    setActionError(null);
    try {
      const updated = await employerDistributionApi.updateChannel(ch.key, { spend });
      applyChannel(ch.key, updated, { spend });
    } catch (err) {
      setActionError(err);
    }
  };

  const boards = useMemo(
    () =>
      channels.map((c) => {
        const isOn = !!c.enabled;
        const statusKey = (c.status || 'off').toLowerCase();
        const ss = statusStyle(statusKey);
        return {
          key: c.key,
          name: c.name,
          tagline: c.tagline,
          sponsorable: !!c.sponsorable,
          status: (c.status || 'off').toUpperCase(),
          statusKey,
          spend: spendLabel(c.spend),
          on: isOn,
          cardBorder: isOn ? '#E6DECF' : '#ECE6DA',
          track: isOn ? '#1FA463' : '#D2C9B7',
          knob: isOn ? '20px' : '2px',
          statusColor: ss.color,
          statusBg: ss.bg,
          statusBorder: ss.border,
          statusDot: ss.dot,
          ...logoFor(c.key, c.name),
        };
      }),
    [channels],
  );

  const liveCount = boards.filter((b) => b.on && b.statusKey === 'live').length;

  const perf = useMemo(
    () =>
      performance.map((p, i, arr) => {
        const cpa = String(p.cpa ?? '');
        return {
          source: p.source,
          views: String(p.views ?? ''),
          applies: String(p.applies ?? ''),
          cost: String(p.cost ?? ''),
          cpa,
          cpaColor: cpa === '$0.00' ? '#157A49' : parseFloat(cpa.replace('$', '')) <= 12 ? '#1B1A16' : '#C9622E',
          divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
        };
      }),
    [performance],
  );

  const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' };
  const grid = '1.4fr 0.8fr 0.8fr 0.9fr 1fr';

  return (
    <>
      <Head>
        <title>Distribution — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp .em-sponsor:hover {
          background: #364fc7 !important;
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="jobs" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Jobs.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to jobs</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>Distribution</span>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1000, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Distribution</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Choose where your open roles get published and sponsored.</p>
            </div>

            <InlineError error={actionError} />

            {loading ? (
              <LoadingState label="Loading distribution channels…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* OVERVIEW */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: '20px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 5 }}>Channels</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Where your jobs get posted</h2>
                    <div style={{ fontSize: 13, color: '#8A8378', marginTop: 2 }}>Toggle channels on to publish, and set a budget to sponsor.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600, color: '#1B1A16' }}>{liveCount}</div>
                      <div style={{ fontSize: 11.5, color: '#8A8378' }}>boards live</div>
                    </div>
                  </div>
                </div>

                {/* BOARDS */}
                {boards.length === 0 ? (
                  <div style={{ background: '#FFFEFB', border: '1px dashed #D2C9B7', borderRadius: 16, padding: 44, textAlign: 'center', marginBottom: 24 }}>
                    <p style={{ fontSize: 14, color: '#8A8378', margin: 0 }}>No distribution channels are available yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 24 }}>
                    {boards.map((b) => (
                      <div key={b.key} style={{ background: '#FFFEFB', border: `1px solid ${b.cardBorder}`, borderRadius: 15, padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: b.logoBg, color: b.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: 'var(--jb-font-mono)' }}>{b.logo}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{b.name}</div>
                            <div style={{ fontSize: 12, color: '#8A8378' }}>{b.tagline}</div>
                          </div>
                          <button onClick={() => toggle(channels.find((c) => c.key === b.key))} aria-label={`Toggle ${b.name}`} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0' }}>
                            <span style={{ width: 42, height: 24, borderRadius: 999, background: b.track, position: 'relative', display: 'block', transition: 'background 0.2s' }}>
                              <span style={{ position: 'absolute', top: 2, left: b.knob, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                            </span>
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 13, paddingTop: 13, borderTop: '1px solid #F2ECE0' }}>
                          {b.on ? (
                            <>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: b.statusColor, background: b.statusBg, border: `1px solid ${b.statusBorder}`, padding: '3px 9px', borderRadius: 999 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.statusDot }} />
                                {b.status}
                              </span>
                              <span style={{ fontSize: 12, color: '#8A8378' }}>{b.spend}</span>
                              <div style={{ flex: 1 }} />
                              {b.sponsorable && (
                                <button onClick={() => editBudget(channels.find((c) => c.key === b.key))} className="em-sponsor" style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>Edit budget</button>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: 12.5, color: '#A79E8F' }}>Not published</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PERFORMANCE TABLE */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Performance by source</h2>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>Last 14 days</span>
                  </div>
                  {perf.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No performance data yet. Metrics appear once your sponsored posts start collecting views and applies.</div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '11px 22px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                        <span style={monoLabel}>Source</span>
                        <span style={{ ...monoLabel, textAlign: 'right' }}>Views</span>
                        <span style={{ ...monoLabel, textAlign: 'right' }}>Applies</span>
                        <span style={{ ...monoLabel, textAlign: 'right' }}>Cost</span>
                        <span style={{ ...monoLabel, textAlign: 'right' }}>Cost / applicant</span>
                      </div>
                      {perf.map((p) => (
                        <div key={p.source} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${p.divider}` }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{p.source}</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.views}</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.applies}</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.cost}</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, fontWeight: 600, color: p.cpaColor, textAlign: 'right' }}>{p.cpa}</span>
                        </div>
                      ))}
                    </>
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
