'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { getMyMatches, getConciergeActivity } from '@/services/conciergeApi';

/* ------------------------------------------------- static product content --- */
// What the concierge service does — fixed offering copy, not user data.
const SERVICES = [
  { tag: 'RV', title: 'Resume review', desc: 'Line-by-line edits for each target role and ATS pass.', tint: 'var(--jb-v3-accent-soft)', ink: 'var(--jb-v3-accent)', bg: 'var(--jb-v3-panel)', border: 'var(--jb-v3-accent-line)' },
  { tag: 'CU', title: 'Role curation', desc: 'Hand-picks roles worth a tailored, human application.', tint: 'var(--jb-v3-control)', ink: 'var(--jb-v3-fg)', bg: 'var(--jb-v3-panel)', border: 'var(--jb-v3-line)' },
  { tag: 'AP', title: 'Personalized apply', desc: 'Writes and submits each application by hand, by name.', tint: 'var(--jb-v3-control)', ink: 'var(--jb-v3-fg)', bg: 'var(--jb-v3-panel)', border: 'var(--jb-v3-line)' },
  { tag: 'FU', title: 'Follow-ups', desc: 'Nudges recruiters and chases responses on your behalf.', tint: 'var(--jb-v3-control)', ink: 'var(--jb-v3-fg)', bg: 'var(--jb-v3-panel)', border: 'var(--jb-v3-line)' },
];

const COMPARE = [
  { label: 'Resume tailoring', ai: 'Template', human: 'By hand' },
  { label: 'Role selection', ai: 'Volume', human: 'Curated' },
  { label: 'Recruiter follow-up', ai: '—', human: 'Personal' },
  { label: 'Cover letters', ai: 'Generated', human: 'Written' },
  { label: 'Weekly strategy 1:1', ai: '—', human: 'Included' },
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
    bg: 'var(--jb-v3-control)',
    fg: 'var(--jb-v3-fg)',
    statusText: applied ? '✓ Applied for you' : 'Awaiting your OK',
    stColor: applied ? 'var(--jb-v3-accent)' : 'var(--jb-v3-danger)',
    stBg: applied ? 'var(--jb-v3-accent-soft)' : 'var(--jb-v3-warn-soft)',
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
      ? 'var(--jb-v3-danger)'
      : type.includes('NOTE') || type.includes('MESSAGE')
      ? 'var(--jb-v3-fg-3)'
      : 'var(--jb-v3-accent)';
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
  const [picks, setPicks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Curated roles: the candidate's own high-fit matches. (Agent-assigned
      // matches live behind ROLE_AGENT-only endpoints that a candidate token
      // can't call — see services/conciergeApi.js.) Returns [] when none.
      const loadPicks = async () => {
        const res = await getMyMatches(80);
        const list = res?.matches || [];
        return list.slice(0, 4).map(matchToPick);
      };

      // Coach activity from the application activity feed.
      const loadActivity = async () => {
        const res = await getConciergeActivity({ limit: 6 });
        const list = res?.events || [];
        return list.slice(0, 6).map(eventToActivity);
      };

      const [picksRes, actRes] = await Promise.allSettled([
        loadPicks(),
        loadActivity(),
      ]);
      if (cancelled) return;

      // Always reflect what the backend returned — empty when there is none.
      if (picksRes.status === 'fulfilled') setPicks(picksRes.value || []);
      if (actRes.status === 'fulfilled') setActivity(actRes.value || []);
      if (picksRes.status === 'rejected' && actRes.status === 'rejected') {
        setError(picksRes.reason || actRes.reason);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = { background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2 };

  return (
    <>
      <Head>
        <title>Concierge · Your career coach — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp button:focus,
        #jbapp a:focus {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 15%, transparent);
        }
        .jb-coach-btn:hover {
          background: var(--jb-v3-ok) !important;
        }
        @media (max-width: 640px) {
          #jbapp .cc-agent-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 780px) {
          #jbapp .cc-split-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', fontFamily: 'var(--jb-v3-font-display)', color: 'var(--jb-v3-fg)' }}
      >
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{ position: 'relative',   display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--jb-v3-line)' }}
          >
            <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)' }}>
              Premium / Concierge
            </div>
            <div style={{ flex: 1 }} />
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-ok)', borderRadius: 2, padding: '6px 12px' }}
            >
              ✦ CONCIERGE
            </span>
          </header>

          <div style={{ padding: '30px 32px 48px', width: '100%' }}>
            {/* HERO: COACH */}
            <div
              style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-v3-invert)', borderRadius: 2, padding: 32, marginBottom: 16, color: 'var(--jb-v3-invert-ink)' }}
            >
              <div
                style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--jb-v3-accent) 30%, transparent), transparent 52%)', pointerEvents: 'none' }}
              />
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 36, flexWrap: 'wrap' }}
              >
                <div style={{ maxWidth: 520 }}>
                  <div
                    style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--jb-v3-ok)', marginBottom: 16 }}
                  >
                    — Human applications, with precision
                  </div>
                  <h1
                    style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 46, lineHeight: 1.02, letterSpacing: '-0.01em', color: 'var(--jb-v3-panel)', margin: '0 0 14px' }}
                  >
                    A real career coach, working your search.
                  </h1>
                  <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--jb-v3-fg-3)', margin: 0 }}>
                    Where Auto-Apply moves fast, your coach moves with precision — hand-reviewing your resume, curating roles, personalizing every application, and following up by name.
                  </p>
                </div>
                {/* COACH CARD — populated once a coach is assigned */}
                <div
                  style={{ flexShrink: 0, width: 280, background: 'var(--jb-v3-invert)', border: '1px solid var(--jb-v3-fg)', borderRadius: 2, padding: 22 }}
                >
                  <div
                    style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', marginBottom: 12 }}
                  >
                    Your coach
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-v3-fg-3)', marginBottom: 18 }}>
                    A dedicated career coach will be introduced here once your concierge plan is active.
                  </div>
                  <Link
                    href={appRoute('App Messages.dc.html')}
                    className="jb-coach-btn"
                    style={{ display: 'block', textAlign: 'center', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: 11, cursor: 'pointer', textDecoration: 'none' }}
                  >
                    Message concierge
                  </Link>
                </div>
              </div>
            </div>

            {/* WHAT YOUR CONCIERGE DOES */}
            <div style={{ ...card, padding: 26, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>What your concierge handles</h2>
              </div>
              <div className="cc-agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                {SERVICES.map((s) => (
                  <div key={s.tag} style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: 2, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                      <span
                        style={{ width: 34, height: 34, borderRadius: 2, background: s.tint, color: s.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-v3-font-mono)', fontWeight: 600, fontSize: 12 }}
                      >
                        {s.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)' }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cc-split-grid" style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* COACH ACTIVITY */}
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--jb-v3-line)' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Coach activity</h2>
                </div>
                <div style={{ padding: '8px 22px 16px' }}>
                  {loading ? (
                    <LoadingState label="Loading activity…" />
                  ) : error ? (
                    <ErrorState error={error} />
                  ) : activity.length === 0 ? (
                    <EmptyState
                      icon="◷"
                      title="No coach activity yet"
                      hint="Once your coach starts working your search, every review, application, and follow-up will show up here."
                    />
                  ) : (
                    activity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 0' }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span
                            style={{ width: 11, height: 11, borderRadius: '50%', background: a.dot, border: '2px solid var(--jb-v3-panel)', boxShadow: `0 0 0 1px ${a.dot}` }}
                          />
                          {i < activity.length - 1 && (
                            <span style={{ flex: 1, width: 2, background: 'var(--jb-v3-line)', marginTop: 4 }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 4 }}>
                          <div style={{ fontSize: 14, color: 'var(--jb-v3-fg)', lineHeight: 1.5 }}>
                            <b>{a.title}</b> {a.detail}
                          </div>
                          <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)', marginTop: 3 }}>{a.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PRECISION COMPARISON */}
              <div style={{ ...card, padding: 22 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>Why human precision wins</h2>
                <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)', margin: '0 0 18px' }}>Auto-Apply for reach. Concierge for the roles that matter.</p>
                {COMPARE.map((c) => (
                  <div
                    key={c.label}
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--jb-v3-control)' }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{c.label}</span>
                    <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)', width: 64, textAlign: 'right' }}>{c.ai}</span>
                    <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--jb-v3-accent)', width: 64, textAlign: 'right' }}>{c.human}</span>
                  </div>
                ))}
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--jb-v3-line)' }}
                >
                  <span />
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--jb-v3-fg-3)', width: 64, textAlign: 'right' }}>AI</span>
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--jb-v3-accent)', width: 64, textAlign: 'right' }}>Coach</span>
                </div>
              </div>
            </div>

            {/* HAND-PICKED ROLES */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--jb-v3-line)' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Hand-picked for you</h2>
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-danger)' }}>● curated, not algorithmic</span>
                </div>
              </div>

              {loading ? (
                <LoadingState label="Loading curated roles…" />
              ) : error ? (
                <ErrorState error={error} />
              ) : picks.length === 0 ? (
                <EmptyState
                  icon="◇"
                  title="No curated roles yet"
                  hint="Your coach is reviewing your profile — hand-picked roles will appear here as they're curated."
                />
              ) : (
                picks.map((p, i) => (
                  <div key={`${p.company}-${i}`} style={{ padding: '18px 22px', borderBottom: '1px solid var(--jb-v3-control)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                      <span
                        style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, background: p.bg, color: p.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}
                      >
                        {p.logo}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p.role}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)' }}>
                          {p.company} · {p.location} · {p.salary}
                        </div>
                      </div>
                      <span
                        style={{ flexShrink: 0, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, color: p.stColor, background: p.stBg, padding: '5px 11px', borderRadius: 2 }}
                      >
                        {p.statusText}
                      </span>
                    </div>
                    <div
                      style={{ display: 'flex', gap: 11, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '13px 15px' }}
                    >
                      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)' }}>
                        <b style={{ color: 'var(--jb-v3-fg)' }}>Coach’s note —</b> {p.note}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
