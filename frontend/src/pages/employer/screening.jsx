'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi, employerPipelineApi } from '@/services/employerApi';

const CRITERIA_DEFS = [
  { key: 'skills', label: 'Skills match' },
  { key: 'exp', label: 'Experience' },
  { key: 'answers', label: 'Screening answers' },
  { key: 'culture', label: 'Culture / signals' },
];

function flagFor(score) {
  if (score >= 85) return { label: 'STRONG FIT', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6', key: 'strong' };
  if (score >= 50) return { label: 'NEEDS REVIEW', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE', key: 'review' };
  return { label: 'AUTO-REJECTED', color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4', key: 'reject' };
}

function avatarStyle(a) {
  if (a === 'green') return { bg: '#1FA463', color: '#0C2C1C' };
  if (a === 'indigo') return { bg: '#4263EB', color: '#fff' };
  if (a === 'reject') return { bg: '#E8DCD3', color: '#9A6A2E' };
  return { bg: '#EDE7DA', color: '#5A544A' };
}

const scoreColor = (s) => (s >= 85 ? '#157A49' : s >= 50 ? '#1B1A16' : '#C9622E');

const MONO = 'var(--jb-font-mono)';
const GRID = '34px 2.4fr 1fr 84px';

// Derive a design-safe accent from a screening score.
function accentFor(score) {
  if (score >= 92) return 'green';
  if (score >= 85) return 'indigo';
  if (score >= 50) return 'neutral';
  return 'reject';
}

// Build initials from a candidate name for the avatar chip.
function initialsFor(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export default function EmployerScreening() {
  const [open, setOpen] = useState(null);
  const [weights, setWeights] = useState({ skills: 35, exp: 30, answers: 20, culture: 15 });
  const [lastRun, setLastRun] = useState(null);

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Fetch AI screening results for all applicants. No sample fallback.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiRecruiterApi.screen();
      const ranked = Array.isArray(res?.ranked) ? res.ranked : [];
      setApplicants(
        ranked.map((r, i) => {
          const score = Number(r.score) || 0;
          return {
            id: r.applicantId || `r${i}`,
            initials: initialsFor(r.name),
            name: r.name || 'Unknown candidate',
            headline: r.title || r.stage || '—',
            score,
            recommendation: r.recommendation || '',
            accent: accentFor(score),
            rationale: r.rationale || '',
          };
        }),
      );
      setLastRun(new Date());
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

  const weightTotal = weights.skills + weights.exp + weights.answers + weights.culture;
  const weightColor = weightTotal === 100 ? '#157A49' : '#C9622E';

  let strongCount = 0;
  let reviewCount = 0;
  let rejectCount = 0;
  applicants.forEach((a) => {
    const k = flagFor(a.score).key;
    if (k === 'strong') strongCount++;
    else if (k === 'review') reviewCount++;
    else rejectCount++;
  });

  // Move an applicant to a new stage, then refresh the ranked list.
  const moveStage = async (ids, stage) => {
    const real = ids.filter((id) => id && !/^r\d+$/.test(id));
    if (!real.length) return;
    setBusy(true);
    setActionError(null);
    try {
      await Promise.all(real.map((id) => employerPipelineApi.updateStage(id, stage)));
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  const advanceStrong = () =>
    moveStage(applicants.filter((a) => flagFor(a.score).key === 'strong').map((a) => a.id), 'screening');
  const rejectWeak = () =>
    moveStage(applicants.filter((a) => flagFor(a.score).key === 'reject').map((a) => a.id), 'rejected');

  const lastRunLabel = lastRun ? lastRun.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

  return (
    <>
      <Head>
        <title>AI Screening Results — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input[type='range'] {
          -webkit-appearance: none;
          appearance: none;
          height: 5px;
          border-radius: 999px;
          background: #e1d9c9;
        }
        #emapp input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4263eb;
          border: 2px solid #fffefb;
          box-shadow: 0 1px 3px rgba(27, 26, 22, 0.25);
          cursor: pointer;
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI screening</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={load}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '9px 17px', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              ↻ {loading ? 'Screening…' : 'Re-run screening'}
            </button>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1, margin: '0 0 6px' }}>Screening results</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                {applicants.length} applicant{applicants.length === 1 ? '' : 's'} scored against your rubric
                {lastRun && <> · <span style={{ fontFamily: MONO, color: '#8A8378' }}>last run {lastRunLabel}</span></>}
              </p>
            </div>

            {/* RUBRIC */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Scoring rubric</h2>
                <span style={{ fontFamily: MONO, fontSize: 11, color: weightColor }}>{weightTotal}% allocated</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#8A8378', margin: '0 0 16px' }}>Weights drawn from the job description and screening questions. Adjust to re-rank.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>
                {CRITERIA_DEFS.map((c) => (
                  <div key={c.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{c.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: '#4263EB' }}>{weights[c.key]}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={weights[c.key]}
                      onChange={(e) => setWeights((w) => ({ ...w, [c.key]: Number(e.target.value) }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 18, paddingTop: 16, borderTop: '1px solid #F2ECE0', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>Auto-actions</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#3A352C' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1FA463' }} />Advance ≥ 85%
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#3A352C' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9622E' }} />Auto-reject &lt; 50%
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#3A352C' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9A6A2E' }} />Flag 50–85% for review
                </span>
              </div>
            </div>

            {loading ? (
              <LoadingState label="Screening applicants…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : applicants.length === 0 ? (
              <EmptyState icon="○" title="No applicants to screen yet" hint="Once candidates apply to your open roles, their AI screening scores will appear here." />
            ) : (
              <>
                {/* BULK BAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#5A544A' }}>
                    <b style={{ color: '#1B1A16' }}>{strongCount}</b> strong · <b style={{ color: '#1B1A16' }}>{reviewCount}</b> needs review · <b style={{ color: '#1B1A16' }}>{rejectCount}</b> auto-rejected
                  </span>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={advanceStrong}
                    disabled={busy || strongCount === 0}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: busy || strongCount === 0 ? 'not-allowed' : 'pointer', opacity: busy || strongCount === 0 ? 0.5 : 1 }}
                  >
                    ↑ Advance strong ({strongCount})
                  </button>
                  <button
                    onClick={rejectWeak}
                    disabled={busy || rejectCount === 0}
                    style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '9px 16px', cursor: busy || rejectCount === 0 ? 'not-allowed' : 'pointer', opacity: busy || rejectCount === 0 ? 0.5 : 1 }}
                  >
                    Reject below 50% ({rejectCount})
                  </button>
                </div>

                <InlineError error={actionError} />

                {/* TABLE */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, alignItems: 'center', padding: '11px 18px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                    <span />
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Candidate</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Flag</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>Score</span>
                  </div>

                  {applicants.map((a, i, arr) => {
                    const flag = flagFor(a.score);
                    const av = avatarStyle(a.accent);
                    const isOpen = open === a.id;
                    const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                    const rowBg = isOpen ? '#FBF9F4' : a.accent === 'green' ? '#FBFDFB' : '#FFFEFB';
                    return (
                      <div key={a.id} style={{ borderBottom: `1px solid ${divider}` }}>
                        <div
                          onClick={() => setOpen((o) => (o === a.id ? null : a.id))}
                          style={{ display: 'grid', gridTemplateColumns: GRID, gap: 10, alignItems: 'center', padding: '13px 18px', cursor: 'pointer', background: rowBg }}
                        >
                          <span style={{ fontFamily: MONO, fontSize: 12, color: '#A79E8F', textAlign: 'center' }}>{i + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                            <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{a.initials}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                              <div style={{ fontSize: 11.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.headline}</div>
                            </div>
                          </div>
                          <span>
                            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: flag.color, background: flag.bg, border: `1px solid ${flag.border}`, padding: '3px 8px', borderRadius: 999 }}>{flag.label}</span>
                          </span>
                          <span style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: scoreColor(a.score) }}>{a.score}</span>
                            <span style={{ color: '#C9BFAC', fontSize: 11, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </span>
                        </div>

                        {/* EXPANDED REASONING */}
                        {isOpen && (
                          <div style={{ padding: '4px 18px 18px 63px', background: '#FBF9F4', animation: 'emrise 0.2s ease' }}>
                            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 12, padding: 16 }}>
                              {a.rationale && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.55, color: '#3A352C', marginBottom: 14 }}>
                                  <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
                                  <span>{a.rationale}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 9 }}>
                                <Link href={appRoute('Employer Candidates.dc.html')} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '8px 15px', textDecoration: 'none' }}>View profile →</Link>
                                <button
                                  onClick={() => moveStage([a.id], 'screening')}
                                  disabled={busy}
                                  style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '8px 15px', cursor: busy ? 'not-allowed' : 'pointer' }}
                                >
                                  Advance
                                </button>
                                <button
                                  onClick={() => moveStage([a.id], 'rejected')}
                                  disabled={busy}
                                  style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#8A8378', background: 'none', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', padding: '8px 8px' }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
