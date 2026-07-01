'use client';

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

// ---- Sample CRM pool (ported from the dc Component class) ----
const POOL = [
  { id: 'p1', initials: 'SC', name: 'Sarah Chen', headline: 'Senior Product Designer · ex-Plaid', skills: ['Design systems', 'Fintech', '0→1'], seg: 'saved', tag: 'SAVED', source: 'Applied · Sr. Designer', added: 'Jun 28', accent: 'green' },
  { id: 'p2', initials: 'RT', name: 'Rosa Tan', headline: 'PM · Experimentation · ex-Dropbox', skills: ['Growth', 'A/B testing'], seg: 'silver', tag: 'SILVER MEDALIST', source: 'PM, Growth · final round', added: 'May 2024', accent: 'indigo' },
  { id: 'p3', initials: 'DR', name: 'Diego Ramos', headline: 'Senior Designer · B2B SaaS', skills: ['Design systems', 'Prototyping'], seg: 'saved', tag: 'SAVED', source: 'Sourced', added: 'Jun 20', accent: 'indigo' },
  { id: 'p4', initials: 'KW', name: 'Kayla Wright', headline: 'Staff Frontend Engineer · ex-Vercel', skills: ['React', 'TypeScript', 'Perf'], seg: 'silver', tag: 'SILVER MEDALIST', source: 'Staff FE · offer declined', added: 'Apr 2024', accent: 'indigo' },
  { id: 'p5', initials: 'MO', name: 'Marcus Obi', headline: 'Senior PM · Marketplaces', skills: ['Marketplaces', 'Pricing'], seg: 'future', tag: 'FUTURE: PM LEAD', source: 'Applied · PM Growth', added: 'Jun 10', accent: 'indigo' },
  { id: 'p6', initials: 'LF', name: 'Lena Fischer', headline: 'PM · Growth & Activation', skills: ['Activation', 'Funnels'], seg: 'saved', tag: 'SAVED', source: 'Applied · PM Growth', added: 'Jun 18', accent: 'indigo' },
  { id: 'p7', initials: 'AB', name: 'Aisha Bello', headline: 'Sr. Product Designer · Marketplaces', skills: ['Design systems', 'Research'], seg: 'silver', tag: 'SILVER MEDALIST', source: 'Sr. Designer · final round', added: 'Jun 2024', accent: 'indigo' },
  { id: 'p8', initials: 'TK', name: 'Tomas Kovac', headline: 'Staff Designer · Developer Tools', skills: ['Motion', 'Systems'], seg: 'future', tag: 'FUTURE: DESIGN', source: 'Sourced', added: 'May 30', accent: 'indigo' },
  { id: 'p9', initials: 'JL', name: 'Jordan Lee', headline: 'Product Designer · ex-Square', skills: ['Payments', 'Craft'], seg: 'saved', tag: 'SAVED', source: 'Applied · Sr. Designer', added: 'Jun 25', accent: 'indigo' },
  { id: 'p10', initials: 'EN', name: 'Elena Novak', headline: 'Frontend Engineer · Fintech', skills: ['React', 'Design eng'], seg: 'future', tag: 'FUTURE: FE', source: 'Sourced', added: 'Jun 5', accent: 'indigo' },
];

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

const SUGGESTIONS = [
  { initials: 'RT', name: 'Rosa Tan', reason: 'Silver medalist for PM Growth — matches your new PM, Lead req at 89%.', accent: 'indigo' },
  { initials: 'KW', name: 'Kayla Wright', reason: 'Declined Staff FE last year — strong fit for the reopened role.', accent: 'indigo' },
].map((s) => {
  const a = avatarStyle(s.accent);
  return { ...s, avatarBg: a.bg, avatarColor: a.color };
});

export default function EmployerTalentPool() {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('all');
  const [added, setAdded] = useState({});

  const counts = useMemo(
    () => ({
      all: POOL.length,
      saved: POOL.filter((p) => p.seg === 'saved').length,
      silver: POOL.filter((p) => p.seg === 'silver').length,
      future: POOL.filter((p) => p.seg === 'future').length,
    }),
    []
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
    let list = POOL;
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
  }, [query, segment, added]);

  const empty = rows.length === 0;

  const toggleAdd = (id) => setAdded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <>
      <Head>
        <title>Talent pool — Jobocate for Employers</title>
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
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}
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
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
              Candidates / Talent pool
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="emaddbtn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}
            >
              ＋ Add candidate
            </button>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Talent pool</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Your CRM of saved, silver-medalist and future-pipeline candidates.</p>
            </div>

            {/* AI RE-ENGAGE */}
            <div style={{ background: '#15140F', border: '1px solid #2C2A22', borderRadius: 16, padding: '18px 22px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ color: '#5BD08C', fontSize: 15 }}>✦</span>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#FBF8F1' }}>Re-engage for new roles</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378' }}>AI suggestions</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((s) => (
                  <div
                    key={s.name}
                    style={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'center', gap: 13, background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 13, padding: 14 }}
                  >
                    <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: s.avatarBg, color: s.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {s.initials}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FBF8F1' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.4, color: '#9A9286' }}>{s.reason}</div>
                    </div>
                    <button style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' }}>
                      Invite
                    </button>
                  </div>
                ))}
              </div>
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
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: s.countColor }}>{s.count}</span>
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
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: r.tagColor, background: r.tagBg, border: `1px solid ${r.tagBorder}`, padding: '2px 8px', borderRadius: 999 }}>
                        {r.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8378' }}>{r.headline}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {r.skills.map((sk) => (
                        <span key={sk} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: '#5A544A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '2px 7px', borderRadius: 999 }}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 6 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>{r.source}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#C9BFAC' }}>{r.added}</div>
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
