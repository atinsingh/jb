'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  getAssignedMatches,
  getMyMatches,
  getConciergeActivity,
} from '@/services/conciergeApi';

/* ------------------------------------------------- design sample data --- */
const DONE = { status: 'Done', statusColor: '#157A49', statusBg: '#EAF6EE' };
const PROG = { status: 'In progress', statusColor: '#C9622E', statusBg: '#FBEEE5' };

const SAMPLE_SERVICES = [
  { tag: 'RV', title: 'Resume review', desc: 'Line-by-line edits for each target role and ATS pass.', tint: '#EAF6EE', ink: '#157A49', bg: '#FBFDFB', border: '#CDE9D6', ...DONE },
  { tag: 'CU', title: 'Role curation', desc: 'Hand-picks roles worth a tailored, human application.', tint: '#F4EFE4', ink: '#1B1A16', bg: '#FFFEFB', border: '#E6DECF', ...DONE },
  { tag: 'AP', title: 'Personalized apply', desc: 'Writes and submits each application by hand, by name.', tint: '#F4EFE4', ink: '#1B1A16', bg: '#FFFEFB', border: '#E6DECF', ...PROG },
  { tag: 'FU', title: 'Follow-ups', desc: 'Nudges recruiters and chases responses on your behalf.', tint: '#F4EFE4', ink: '#1B1A16', bg: '#FFFEFB', border: '#E6DECF', ...DONE },
];

const SAMPLE_ACTIVITY = [
  { dot: '#1FA463', title: 'Submitted a tailored application', detail: 'to Airbnb — Staff Product Designer, with a custom cover note.', time: 'Today · 9:24 AM' },
  { dot: '#1FA463', title: 'Edited your resume', detail: '— tightened the Plaid bullet and added a metric to Brex.', time: 'Today · 8:40 AM' },
  { dot: '#C9622E', title: 'Followed up with Stripe', detail: 'recruiter ahead of your final round on Monday.', time: 'Yesterday · 4:12 PM' },
  { dot: '#1FA463', title: 'Curated 4 new roles', detail: 'matching your level and comp target — added below.', time: 'Yesterday · 1:30 PM' },
  { dot: '#8A8378', title: 'Left you a note', detail: 'after your weekly 1:1 — see the shared doc.', time: 'Mon · 11:50 AM' },
];

const COMPARE = [
  { label: 'Resume tailoring', ai: 'Template', human: 'By hand' },
  { label: 'Role selection', ai: 'Volume', human: 'Curated' },
  { label: 'Recruiter follow-up', ai: '—', human: 'Personal' },
  { label: 'Cover letters', ai: 'Generated', human: 'Written' },
  { label: 'Weekly strategy 1:1', ai: '—', human: 'Included' },
];

const SAMPLE_PICKS = [
  { logo: 'Ai', company: 'Airbnb', role: 'Staff Product Designer', location: 'Remote', salary: '$210–250k', bg: '#F4EFE4', fg: '#1B1A16', statusText: '✓ Applied by Marcus', stColor: '#157A49', stBg: '#EAF6EE', note: 'Their design org is investing in systems — your Plaid work is exactly the proof point they want.' },
  { logo: 'Sp', company: 'Spotify', role: 'Senior Design Manager', location: 'NYC · Hybrid', salary: '$220–260k', bg: '#F4EFE4', fg: '#1B1A16', statusText: 'Awaiting your OK', stColor: '#C9622E', stBg: '#FBEEE5', note: 'A stretch into management — I think you’re ready. Let’s prep the pitch on our Tuesday call.' },
  { logo: 'An', company: 'Anthropic', role: 'Product Designer, Growth', location: 'SF · Hybrid', salary: '$215–255k', bg: '#F4EFE4', fg: '#1B1A16', statusText: 'Drafting application', stColor: '#5A544A', stBg: '#F1ECE0', note: 'I know the hiring manager from my Stripe days — worth a tailored, personal note. Drafting now.' },
];

/* ------------------------------------------------------------ helpers --- */
const initials = (text = '') => {
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).slice(0, 2);
};

const fmtSalary = (job) => {
  const min = job?.salaryMin ?? job?.salary_min;
  const max = job?.salaryMax ?? job?.salary_max;
  const k = (n) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max)}`;
  if (min) return `${k(min)}+`;
  if (job?.salary) return job.salary;
  return '—';
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today · ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short' })} · ${time}`;
};

// Map a backend match into the "hand-picked role" card shape.
const matchToPick = (m) => {
  const job = m?.job || m?.jobPosting || m || {};
  const company = job.company || job.companyName || m?.company || 'Company';
  const role = job.title || job.role || m?.title || 'Role';
  const location = job.location || (job.remote ? 'Remote' : '') || '—';
  const applied = ['APPLIED', 'SUBMITTED', 'INTERVIEW'].includes(
    String(m?.applicationStatus || m?.status || '').toUpperCase()
  );
  const score = m?.matchScore ?? m?.score;
  return {
    logo: initials(company),
    company,
    role,
    location,
    salary: fmtSalary(job),
    bg: '#F4EFE4',
    fg: '#1B1A16',
    statusText: applied ? '✓ Applied by Marcus' : 'Awaiting your OK',
    stColor: applied ? '#157A49' : '#C9622E',
    stBg: applied ? '#EAF6EE' : '#FBEEE5',
    note:
      m?.coachNote ||
      m?.matchReason ||
      m?.reason ||
      (score != null
        ? `Curated for you — a ${Math.round(score)}% fit with your level and comp target.`
        : 'Curated for you — worth a tailored, human application.'),
  };
};

// Map a backend application activity event into the timeline shape.
const eventToActivity = (e) => {
  const type = String(e?.type || e?.eventType || '').toUpperCase();
  const dot =
    type.includes('FOLLOW') || type.includes('REMIND')
      ? '#C9622E'
      : type.includes('NOTE') || type.includes('MESSAGE')
      ? '#8A8378'
      : '#1FA463';
  const company = e?.job?.company || e?.company || e?.companyName || '';
  return {
    dot,
    title: e?.title || e?.message || e?.summary || 'Coach update',
    detail: company ? `— ${company}` : e?.detail || '',
    time: fmtTime(e?.createdAt || e?.timestamp || e?.date),
  };
};

/* ---------------------------------------------------------- component --- */
export default function AppConcierge() {
  const [picks, setPicks] = useState(SAMPLE_PICKS);
  const [activity, setActivity] = useState(SAMPLE_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [usingLive, setUsingLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Curated roles: prefer agent-assigned matches, fall back to the
      // candidate's own high-fit matches, then to the design sample.
      const loadPicks = async () => {
        try {
          const res = await getAssignedMatches();
          const list = res?.matches || [];
          if (list.length) return list.slice(0, 4).map(matchToPick);
        } catch (_) {
          /* fall through */
        }
        try {
          const res = await getMyMatches(80);
          const list = res?.matches || [];
          if (list.length) return list.slice(0, 4).map(matchToPick);
        } catch (_) {
          /* fall through */
        }
        return null;
      };

      // Coach activity from the application activity feed.
      const loadActivity = async () => {
        try {
          const res = await getConciergeActivity({ limit: 6 });
          const list = res?.events || [];
          if (list.length) return list.slice(0, 6).map(eventToActivity);
        } catch (_) {
          /* fall through */
        }
        return null;
      };

      const [livePicks, liveActivity] = await Promise.all([loadPicks(), loadActivity()]);
      if (cancelled) return;

      let live = false;
      if (livePicks) {
        setPicks(livePicks);
        live = true;
      }
      if (liveActivity) {
        setActivity(liveActivity);
        live = true;
      }
      setUsingLive(live);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18 };

  return (
    <>
      <Head>
        <title>Concierge · Your career coach — Jobocate</title>
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
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp button:focus,
        #jbapp a:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        .jb-coach-btn:hover {
          background: #5bd08c !important;
        }
        @keyframes jbskel {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}
      >
        <AppSidebar active="concierge" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}
          >
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
              Premium / Concierge
            </div>
            <div style={{ flex: 1 }} />
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: '#0C2C1C', background: '#5BD08C', borderRadius: 999, padding: '6px 12px' }}
            >
              ✦ PREMIUM ACTIVE
            </span>
          </header>

          <div style={{ padding: '30px 32px 48px', maxWidth: 1180, width: '100%' }}>
            {/* HERO: COACH ASSIGNED */}
            <div
              style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 22, padding: 32, marginBottom: 16, color: '#F2EDE2' }}
            >
              <div
                style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 88% 8%, rgba(31,164,99,0.3), transparent 52%)', pointerEvents: 'none' }}
              />
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 36, flexWrap: 'wrap' }}
              >
                <div style={{ maxWidth: 520 }}>
                  <div
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 16 }}
                  >
                    — Human applications, with precision
                  </div>
                  <h1
                    style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 46, lineHeight: 1.02, letterSpacing: '-0.01em', color: '#FBF8F1', margin: '0 0 14px' }}
                  >
                    A real career coach, working your search.
                  </h1>
                  <p style={{ fontSize: 16, lineHeight: 1.55, color: '#B8B1A4', margin: 0 }}>
                    Where Auto-Apply moves fast, your coach moves with precision — hand-reviewing your resume, curating roles, personalizing every application, and following up by name.
                  </p>
                </div>
                {/* COACH CARD */}
                <div
                  style={{ flexShrink: 0, width: 280, background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 18, padding: 22 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                    <span
                      style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', background: '#C9622E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17 }}
                    >
                      MB
                    </span>
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#FBF8F1' }}>Marcus Bell</div>
                      <div style={{ fontSize: 12.5, color: '#9A9286' }}>Your career coach</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: '#B8B1A4', marginBottom: 16 }}>
                    Ex-Google &amp; Stripe recruiter · 9 yrs placing senior design &amp; product talent.
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '9px 12px', background: '#15140F', borderRadius: 10 }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                    <span style={{ fontSize: 12.5, color: '#D8D2C4' }}>Next 1:1 — Tue Jun 30, 11:00 AM</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link
                      href={appRoute('App Messages.dc.html')}
                      className="jb-coach-btn"
                      style={{ flex: 1, textAlign: 'center', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 10, padding: 11, cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Message
                    </Link>
                    <button
                      style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#F2EDE2', background: 'rgba(255,255,255,0.06)', border: '1px solid #34322A', borderRadius: 10, padding: 11, cursor: 'pointer' }}
                    >
                      Book call
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* WHAT YOUR COACH DOES */}
            <div style={{ ...card, padding: 26, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>What Marcus is handling for you</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#157A49' }}>This week</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                {SAMPLE_SERVICES.map((s) => (
                  <div key={s.tag} style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span
                        style={{ width: 34, height: 34, borderRadius: 9, background: s.tint, color: s.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 12 }}
                      >
                        {s.tag}
                      </span>
                      <span
                        style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: s.statusColor, background: s.statusBg, padding: '3px 8px', borderRadius: 999 }}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5A544A' }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* COACH ACTIVITY */}
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Coach activity</h2>
                </div>
                <div style={{ padding: '8px 22px 16px' }}>
                  {loading
                    ? [0, 1, 2, 3, 4].map((i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 0' }}>
                          <span style={{ width: 11, height: 11, flexShrink: 0, borderRadius: '50%', background: '#E1D9C9', animation: 'jbskel 1.4s ease infinite' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ height: 12, borderRadius: 6, background: '#EEE7D9', width: '85%', animation: 'jbskel 1.4s ease infinite' }} />
                            <div style={{ height: 9, borderRadius: 6, background: '#F2ECE0', width: '40%', marginTop: 8, animation: 'jbskel 1.4s ease infinite' }} />
                          </div>
                        </div>
                      ))
                    : activity.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 0' }}>
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span
                              style={{ width: 11, height: 11, borderRadius: '50%', background: a.dot, border: '2px solid #FFFEFB', boxShadow: `0 0 0 1px ${a.dot}` }}
                            />
                            {i < activity.length - 1 && (
                              <span style={{ flex: 1, width: 2, background: '#EEE7D9', marginTop: 4 }} />
                            )}
                          </div>
                          <div style={{ flex: 1, paddingBottom: 4 }}>
                            <div style={{ fontSize: 14, color: '#1B1A16', lineHeight: 1.5 }}>
                              <b>{a.title}</b> {a.detail}
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F', marginTop: 3 }}>{a.time}</div>
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              {/* PRECISION COMPARISON */}
              <div style={{ ...card, padding: 22 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>Why human precision wins</h2>
                <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 18px' }}>Auto-Apply for reach. Concierge for the roles that matter.</p>
                {COMPARE.map((c) => (
                  <div
                    key={c.label}
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '11px 0', borderTop: '1px solid #F2ECE0' }}
                  >
                    <span style={{ fontSize: 13, color: '#46413A' }}>{c.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#A79E8F', width: 64, textAlign: 'right' }}>{c.ai}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, color: '#157A49', width: 64, textAlign: 'right' }}>{c.human}</span>
                  </div>
                ))}
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #E1D9C9' }}
                >
                  <span />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A79E8F', width: 64, textAlign: 'right' }}>AI</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#157A49', width: 64, textAlign: 'right' }}>Coach</span>
                </div>
              </div>
            </div>

            {/* HAND-PICKED ROLES */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid #EEE7D9' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Hand-picked by Marcus</h2>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#C9622E' }}>● curated, not algorithmic</span>
                </div>
              </div>

              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 11, background: '#F2ECE0', animation: 'jbskel 1.4s ease infinite' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 13, borderRadius: 6, background: '#EEE7D9', width: '50%', animation: 'jbskel 1.4s ease infinite' }} />
                          <div style={{ height: 10, borderRadius: 6, background: '#F2ECE0', width: '70%', marginTop: 8, animation: 'jbskel 1.4s ease infinite' }} />
                        </div>
                      </div>
                      <div style={{ height: 44, borderRadius: 12, background: '#FBF8F1', border: '1px solid #EEE7D9', animation: 'jbskel 1.4s ease infinite' }} />
                    </div>
                  ))
                : picks.map((p, i) => (
                    <div key={`${p.company}-${i}`} style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <span
                          style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 11, background: p.bg, color: p.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}
                        >
                          {p.logo}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p.role}</div>
                          <div style={{ fontSize: 12.5, color: '#8A8378' }}>
                            {p.company} · {p.location} · {p.salary}
                          </div>
                        </div>
                        <span
                          style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: p.stColor, background: p.stBg, padding: '5px 11px', borderRadius: 999 }}
                        >
                          {p.statusText}
                        </span>
                      </div>
                      <div
                        style={{ display: 'flex', gap: 11, background: '#FBF8F1', border: '1px solid #EEE7D9', borderRadius: 12, padding: '13px 15px' }}
                      >
                        <span
                          style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: '#C9622E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}
                        >
                          MB
                        </span>
                        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#46413A' }}>
                          <b style={{ color: '#1B1A16' }}>Marcus’s note —</b> {p.note}
                        </div>
                      </div>
                    </div>
                  ))}

              {!loading && picks.length === 0 && (
                <div style={{ padding: '40px 22px', textAlign: 'center', fontSize: 14, color: '#8A8378' }}>
                  No curated roles yet — Marcus is reviewing your profile.
                </div>
              )}
            </div>

            {usingLive && (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#A79E8F', textAlign: 'right', marginTop: 14 }}>
                Live data · synced with your coach
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
