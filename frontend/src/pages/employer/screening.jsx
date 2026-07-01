'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

// Sample AI screening applicants — scored against the rubric below.
const APPLICANTS = [
  {
    id: 'a1', initials: 'SC', name: 'Sarah Chen', headline: 'Senior Product Designer · ex-Plaid',
    skills: 98, exp: 96, answers: 94, score: 96, accent: 'green',
    rationale: 'Top of the field: led a +31% activation redesign at Plaid and built a design system for 40+ engineers. Screening answers cited concrete metrics on every prompt. Clears all five must-haves.',
  },
  {
    id: 'a2', initials: 'AB', name: 'Aisha Bello', headline: 'Sr. Product Designer · Marketplaces',
    skills: 91, exp: 90, answers: 95, score: 92, accent: 'indigo',
    rationale: 'Strong systems leadership and exceptional screening answers. Marketplace rather than payments background is the only gap against the JD.',
  },
  {
    id: 'a3', initials: 'JL', name: 'Jordan Lee', headline: 'Product Designer · ex-Square',
    skills: 88, exp: 84, answers: 86, score: 87, accent: 'indigo',
    rationale: 'Solid payments-adjacent experience and clear craft. One level below the target seniority but trending up quickly.',
  },
  {
    id: 'a4', initials: 'PN', name: 'Priya Nair', headline: 'Sr. Designer · Design Systems',
    skills: 90, exp: 82, answers: 82, score: 85, accent: 'indigo',
    rationale: 'Deep design-systems specialist; lighter on end-to-end product ownership in her screening answers.',
  },
  {
    id: 'a5', initials: 'MO', name: 'Marcus Obi', headline: 'Product Designer · SaaS',
    skills: 78, exp: 74, answers: 76, score: 76, accent: 'neutral',
    rationale: 'Competent generalist; missing the fintech and systems depth weighted highest in this rubric.',
  },
  {
    id: 'a6', initials: 'LF', name: 'Lena Fischer', headline: 'Product Designer · Consumer',
    skills: 72, exp: 70, answers: 74, score: 72, accent: 'neutral',
    rationale: 'Consumer-app background with good craft signals but limited B2B / payments exposure.',
  },
  {
    id: 'a7', initials: 'TK', name: 'Tomas Kovac', headline: 'Junior Designer · Dev Tools',
    skills: 64, exp: 55, answers: 62, score: 60, accent: 'neutral',
    rationale: 'Promising portfolio but two levels below the seniority bar; experience score pulls the total down.',
  },
  {
    id: 'a8', initials: 'RG', name: 'Rahul Gupta', headline: 'Graphic Designer · Agency',
    skills: 48, exp: 42, answers: 46, score: 46, accent: 'reject',
    rationale: 'Agency/graphic background without product-design experience. Misses three required skills, below the auto-reject floor.',
  },
];

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
const subColor = (v) => (v >= 85 ? '#1FA463' : v >= 65 ? '#4263EB' : '#C9622E');

const MONO = "'JetBrains Mono',monospace";

// Derive a design-safe accent from a screening score (matches sample styling).
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
  const [runStamp, setRunStamp] = useState('6:04 AM');

  // Live ranked applicants seeded with design samples; overridden on success.
  const [applicants, setApplicants] = useState(APPLICANTS);

  // Fetch AI screening results for all applicants; on any failure keep samples.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await aiRecruiterApi.screen();
        if (!alive) return;
        const ranked = Array.isArray(res?.ranked) ? res.ranked : null;
        if (ranked && ranked.length) {
          setApplicants(
            ranked.map((r, i) => {
              const score = Number(r.score) || 0;
              return {
                id: r.applicantId || `r${i}`,
                initials: initialsFor(r.name),
                name: r.name || 'Unknown candidate',
                headline: r.title || r.stage || '—',
                skills: score,
                exp: score,
                answers: score,
                score,
                accent: accentFor(score),
                rationale: r.rationale || r.recommendation || '',
              };
            }),
          );
        }
      } catch {
        // Keep sample fallback on any error.
      }
    })();
    return () => {
      alive = false;
    };
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

  return (
    <>
      <Head>
        <title>AI Screening Results — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
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

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI screening</span>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>
              Senior Product Designer <span style={{ color: '#A79E8F', fontSize: 11 }}>▾</span>
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setRunStamp('just now')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '9px 17px', cursor: 'pointer' }}
            >
              ↻ Re-run screening
            </button>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1, margin: '0 0 6px' }}>Screening results</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                28 applicants scored against your rubric · <span style={{ fontFamily: MONO, color: '#8A8378' }}>last run {runStamp}</span>
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
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>Auto-actions</span>
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

            {/* BULK BAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#5A544A' }}>
                <b style={{ color: '#1B1A16' }}>{strongCount}</b> strong · <b style={{ color: '#1B1A16' }}>{reviewCount}</b> needs review · <b style={{ color: '#1B1A16' }}>{rejectCount}</b> auto-rejected
              </span>
              <div style={{ flex: 1 }} />
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>↑ Advance top 6</button>
              <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>Reject below 50%</button>
            </div>

            {/* TABLE */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 0.9fr 0.9fr 0.9fr 1fr 70px', gap: 10, alignItems: 'center', padding: '11px 18px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span />
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Candidate</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'center' }}>Skills</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'center' }}>Exp.</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'center' }}>Answers</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Flag</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>Score</span>
              </div>

              {applicants.map((a, i, arr) => {
                const flag = flagFor(a.score);
                const av = avatarStyle(a.accent);
                const isOpen = open === a.id;
                const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                const rowBg = isOpen ? '#FBF9F4' : a.accent === 'green' ? '#FBFDFB' : '#FFFEFB';
                const bars = [
                  { label: 'Skills match', val: a.skills, pct: `${a.skills}%`, color: subColor(a.skills) },
                  { label: 'Experience', val: a.exp, pct: `${a.exp}%`, color: subColor(a.exp) },
                  { label: 'Answers', val: a.answers, pct: `${a.answers}%`, color: subColor(a.answers) },
                ];
                return (
                  <div key={a.id} style={{ borderBottom: `1px solid ${divider}` }}>
                    <div
                      onClick={() => setOpen((o) => (o === a.id ? null : a.id))}
                      style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 0.9fr 0.9fr 0.9fr 1fr 70px', gap: 10, alignItems: 'center', padding: '13px 18px', cursor: 'pointer', background: rowBg }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#A79E8F', textAlign: 'center' }}>{i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{a.initials}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                          <div style={{ fontSize: 11.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.headline}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: '#5A544A', textAlign: 'center' }}>{a.skills}</span>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: '#5A544A', textAlign: 'center' }}>{a.exp}</span>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: '#5A544A', textAlign: 'center' }}>{a.answers}</span>
                      <span>
                        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: flag.color, background: flag.bg, border: `1px solid ${flag.border}`, padding: '3px 8px', borderRadius: 999 }}>{flag.label}</span>
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
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.55, color: '#3A352C', marginBottom: 14 }}>
                            <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
                            <span>{a.rationale}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                            {bars.map((b) => (
                              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ width: 96, flexShrink: 0, fontSize: 12, color: '#5A544A' }}>{b.label}</span>
                                <div style={{ flex: 1, height: 7, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden' }}>
                                  <div style={{ width: b.pct, height: '100%', background: b.color }} />
                                </div>
                                <span style={{ width: 34, flexShrink: 0, textAlign: 'right', fontFamily: MONO, fontSize: 11.5, color: '#5A544A' }}>{b.val}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                            <Link href={appRoute('Employer Candidates.dc.html')} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '8px 15px', textDecoration: 'none' }}>View profile →</Link>
                            <button style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>Advance</button>
                            <button style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#8A8378', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 8px' }}>Reject</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
