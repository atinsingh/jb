'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { employerTalentApi, employerJobsApi, employerPipelineApi } from '@/services/employerApi';

function avatarStyle(a) {
  if (a === 'green') return { bg: '#1FA463', color: '#0C2C1C' };
  if (a === 'indigo') return { bg: '#4263EB', color: '#fff' };
  return { bg: '#EDE7DA', color: '#5A544A' };
}

function tagStyle(seg) {
  if (seg === 'saved') return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (seg === 'silver') return { color: '#5A544A', bg: '#F2ECE0', border: '#E1D9C9' };
  return { color: '#364FC7', bg: '#EDF0FE', border: '#C7D2FB' };
}

const SEG_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'saved', label: 'Saved' },
  { key: 'silver', label: 'Silver medalists' },
  { key: 'future', label: 'Future pipeline' },
];

function toCard(c) {
  const seg = c.segment || 'saved';
  return {
    id: c._id,
    initials: c.initials || (c.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    name: c.name,
    headline: c.headline || '',
    skills: Array.isArray(c.skills) ? c.skills : [],
    seg,
    tag: c.tag || (seg === 'saved' ? 'SAVED' : seg === 'silver' ? 'SILVER MEDALIST' : 'FUTURE'),
    source: c.source || '',
    added: '',
    accent: seg === 'saved' ? 'green' : 'indigo',
  };
}

export default function EmployerTalentPool() {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('all');
  const [added, setAdded] = useState({});
  const [pool, setPool] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Fetch the live talent pool. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerTalentApi.list({ segment: 'all', search: '' });
      const candidates = Array.isArray(res?.candidates) ? res.candidates : [];
      setPool(candidates.map(toCard));
      // Load the employer's jobs so candidates can be added to a real requisition.
      try {
        const jobsRes = await employerJobsApi.list();
        setJobs(Array.isArray(jobsRes?.jobs) ? jobsRes.jobs : []);
      } catch {
        setJobs([]);
      }
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

  const counts = useMemo(
    () => ({
      all: pool.length,
      saved: pool.filter((p) => p.seg === 'saved').length,
      silver: pool.filter((p) => p.seg === 'silver').length,
      future: pool.filter((p) => p.seg === 'future').length,
    }),
    [pool]
  );

  const segments = SEG_DEFS.map((s) => {
    const on = segment === s.key;
    return {
      key: s.key,
      label: s.label,
      count: counts[s.key],
      color: on ? '#fff' : '#46413A',
      bg: on ? '#4263EB' : '#FFFEFB',
      border: on ? '#4263EB' : '#E1D9C9',
      countColor: on ? 'rgba(255,255,255,0.7)' : '#A79E8F',
    };
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pool;
    if (segment !== 'all') list = list.filter((p) => p.seg === segment);
    if (q) {
      list = list.filter((p) =>
        (p.name + ' ' + p.headline + ' ' + p.skills.join(' ')).toLowerCase().includes(q)
      );
    }
    return list.map((p, i, arr) => {
      const av = avatarStyle(p.accent);
      const ts = tagStyle(p.seg);
      const isAdded = !!added[p.id];
      return {
        ...p,
        avatarBg: av.bg,
        avatarColor: av.color,
        tagColor: ts.color,
        tagBg: ts.bg,
        tagBorder: ts.border,
        divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
        addLabel: isAdded ? '✓ Added' : '+ Add to req',
        addColor: isAdded ? '#157A49' : '#4263EB',
        addBg: isAdded ? '#EAF6EE' : '#FFFEFB',
        addBorder: isAdded ? '#CDE9D6' : '#C7D2FB',
      };
    });
  }, [query, segment, added, pool]);

  const empty = rows.length === 0;

  // Add a candidate to the talent pool; persist and update from the response.
  const addCandidate = async () => {
    const name = typeof window !== 'undefined' ? window.prompt('Candidate name?') : null;
    if (!name || !name.trim()) return;
    setActionError(null);
    const draft = { name: name.trim(), headline: '', skills: [], segment: 'saved', source: 'Added manually' };
    try {
      const created = await employerTalentApi.create(draft);
      if (created && created._id) setPool((p) => [toCard(created), ...p]);
    } catch (err) {
      setActionError(err);
    }
  };

  // Add a talent-pool candidate to a real job's applicant pipeline.
  const addToReq = async (card) => {
    setActionError(null);
    if (!jobs.length) {
      setActionError(new Error('Create a job posting first to add candidates to a requisition.'));
      return;
    }
    let job = jobs[0];
    if (jobs.length > 1 && typeof window !== 'undefined') {
      const menu = jobs.map((j, i) => `${i + 1}. ${j.title || 'Untitled role'}`).join('\n');
      const pick = window.prompt(`Add "${card.name}" to which job?\n\n${menu}\n\nEnter a number:`, '1');
      if (pick == null) return;
      const idx = Number(pick) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= jobs.length) {
        setActionError(new Error('Invalid job selection.'));
        return;
      }
      job = jobs[idx];
    }
    try {
      await employerPipelineApi.create({
        jobId: job._id,
        candidateName: card.name,
        candidateHeadline: card.headline || '',
        skills: Array.isArray(card.skills) ? card.skills : [],
        source: 'Talent pool',
      });
      setAdded((s) => ({ ...s, [card.id]: true }));
    } catch (err) {
      setActionError(err);
    }
  };

  // Remove a candidate from the talent pool, then drop it from the list.
  const removeCandidate = async (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Remove this candidate from your talent pool?')) return;
    setActionError(null);
    try {
      await employerTalentApi.remove(id);
      setPool((p) => p.filter((c) => c.id !== id));
    } catch (err) {
      setActionError(err);
    }
  };

  return (
    <>
      <Head>
        <title>Talent pool — Jobocate for Employers</title>
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
        #emapp .emrow:hover {
          background: #fbf9f4;
        }
        #emapp .emaddbtn:hover {
          background: #364fc7 !important;
        }
      `}</style>

      <div
        id="emapp"
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}
      >
        <EmployerSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
              Candidates / Talent pool
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="emaddbtn"
              onClick={addCandidate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}
            >
              ＋ Add candidate
            </button>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Talent pool</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Your CRM of saved, silver-medalist and future-pipeline candidates.</p>
            </div>

            {/* SEARCH + SEGMENTS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', flex: 1, minWidth: 200 }}>
                <span style={{ color: '#A79E8F', fontSize: 13 }}>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, skill, role…"
                  style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {segments.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSegment(s.key)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}
                  >
                    {s.label}
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: s.countColor }}>{s.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* LIST */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="emrow"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: `1px solid ${r.divider}` }}
                >
                  <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', background: r.avatarBg, color: r.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                    {r.initials}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{r.name}</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: r.tagColor, background: r.tagBg, border: `1px solid ${r.tagBorder}`, padding: '2px 8px', borderRadius: 999 }}>
                        {r.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8378' }}>{r.headline}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {r.skills.map((sk) => (
                        <span key={sk} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#5A544A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '2px 7px', borderRadius: 999 }}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 6 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>{r.source}</div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#C9BFAC' }}>{r.added}</div>
                  </div>
                  <button
                    onClick={() => toggleAdd(r.id)}
                    style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: r.addColor, background: r.addBg, border: `1px solid ${r.addBorder}`, borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}
                  >
                    {r.addLabel}
                  </button>
                  <Link href={appRoute('Employer Talent Pool.dc.html')} style={{ flexShrink: 0, color: '#C9BFAC', fontSize: 15, textDecoration: 'none' }}>
                    →
                  </Link>
                </div>
              ))}
              {empty && (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No candidates in this segment.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
