'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const FILTER_DEFS = [
  { key: 'all', label: 'All stories' },
  { key: 'employer', label: 'For employers' },
  { key: 'candidate', label: 'For job seekers' },
];

const RAW_STORIES = [
  { type: 'employer', metric: '40%', metricLabel: 'faster time-to-hire', quote: '"Autopilot screens overnight and hands us a clean shortlist by morning."', name: 'Dana W.', role: 'Recruiter', initials: 'DW', authorAccent: 'indigo', logo: 'St', logoBg: 'rgba(124,196,255,0.12)', logoColor: '#7cc4ff', accent: '#7cc4ff' },
  { type: 'candidate', metric: '3 weeks', metricLabel: 'from sign-up to offer', quote: '"I set it up once and woke up to interview requests. Landed at Plaid in 21 days."', name: 'Sarah C.', role: 'Designer', initials: 'SC', authorAccent: 'green', logo: 'Pl', logoBg: 'var(--jb-d-accent-tint)', logoColor: 'var(--jb-d-accent)', accent: 'var(--jb-d-accent)' },
  { type: 'employer', metric: '−52%', metricLabel: 'cost per hire', quote: '"We replaced an agency retainer with Jobocate and never looked back."', name: 'Raj M.', role: 'Talent Lead', initials: 'RM', authorAccent: 'indigo', logo: 'Lu', logoBg: 'transparent', logoColor: 'var(--jb-d-ink)', accent: '#7cc4ff' },
  { type: 'candidate', metric: '5×', metricLabel: 'more interviews', quote: '"Auto-apply got me in front of teams I’d never have found on my own."', name: 'Jordan L.', role: 'Engineer', initials: 'JL', authorAccent: 'green', logo: 'Sq', logoBg: 'var(--jb-d-accent-tint)', logoColor: 'var(--jb-d-accent)', accent: 'var(--jb-d-accent)' },
  { type: 'employer', metric: '2.5k', metricLabel: 'applicants auto-screened / mo', quote: '"Our team finally spends time on people, not on filtering résumés."', name: 'Elena C.', role: 'Hiring Manager', initials: 'EC', authorAccent: 'indigo', logo: 'Ve', logoBg: 'transparent', logoColor: 'var(--jb-d-ink)', accent: '#7cc4ff' },
  { type: 'candidate', metric: '92%', metricLabel: 'match on her final offer', quote: '"The match score was spot on — the role fit better than anything I’d applied to manually."', name: 'Priya N.', role: 'PM', initials: 'PN', authorAccent: 'green', logo: 'No', logoBg: 'var(--jb-d-accent-tint)', logoColor: 'var(--jb-d-accent)', accent: 'var(--jb-d-accent)' },
];

const avatar = (a) =>
  a === 'green'
    ? { bg: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)' }
    : a === 'indigo'
    ? { bg: '#7cc4ff', color: 'var(--jb-d-panel)' }
    : { bg: 'var(--jb-d-glass)', color: 'var(--jb-d-ink-70)' };

const tagStyle = (k) =>
  k === 'employer'
    ? { label: 'EMPLOYER', color: '#7cc4ff', bg: 'rgba(124,196,255,0.12)', border: 'rgba(124,196,255,0.3)' }
    : { label: 'JOB SEEKER', color: 'var(--jb-d-accent)', bg: 'var(--jb-d-accent-tint)', border: '#CDE9D6' };

export default function CustomerStories() {
  const [filter, setFilter] = useState('all');

  const storyHref = appRoute('Customer Story.dc.html');

  const filters = FILTER_DEFS.map((f) => {
    const on = filter === f.key;
    return {
      key: f.key,
      label: f.label,
      color: on ? '#fff' : 'var(--jb-d-ink-85)',
      bg: on ? '#7cc4ff' : 'var(--jb-d-panel)',
      border: on ? '#7cc4ff' : 'var(--jb-d-line-card)',
    };
  });

  const visible = (filter === 'all' ? RAW_STORIES : RAW_STORIES.filter((s) => s.type === filter)).map((s) => {
    const ts = tagStyle(s.type);
    const a = avatar(s.authorAccent);
    return { ...s, tag: ts.label, tagColor: ts.color, tagBg: ts.bg, tagBorder: ts.border, avatarBg: a.bg, avatarColor: a.color };
  });

  return (
    <>
      <Head>
        <title>Customer stories — Jobocate hiring & job search</title>
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: 'var(--jb-font-sans)', color: 'var(--jb-d-ink)', background: 'transparent' }}>
        <PublicLayout>

        {/* HEADER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 32px 24px' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 14 }}>— Customer stories</div>
          <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.04, margin: '0 0 10px' }}>Real outcomes for hiring teams and job seekers.</h1>
          <p style={{ fontSize: 16.5, color: 'var(--jb-d-ink-70)', margin: '0 0 24px', maxWidth: 520 }}>Teams that hired without adding a recruiter, and candidates who landed roles that fit. Here’s what changed.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: f.color, background: f.bg, border: `1px solid ${f.border}`, borderRadius: 999, padding: '8px 16px', cursor: 'pointer' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* FEATURED */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '8px 32px 8px' }}>
          <Link href={storyHref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 0, background: 'var(--jb-d-footer)', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(66,99,235,0.32), transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', padding: 44 }}>
              <span style={{ display: 'inline-block', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#7cc4ff', background: 'rgba(66,99,235,0.16)', border: '1px solid rgba(66,99,235,0.32)', padding: '3px 9px', borderRadius: 999, marginBottom: 18 }}>EMPLOYER · FEATURED</span>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(28px, 6vw, 60px)', fontWeight: 600, color: 'var(--jb-d-accent)', lineHeight: 1 }}>40%</div>
              <div style={{ fontSize: 16, color: 'var(--jb-d-ink-65)', margin: '6px 0 20px' }}>faster time-to-hire in the first quarter</div>
              <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 24, lineHeight: 1.3, color: '#F2EDE2', margin: '0 0 24px' }}>&quot;Autopilot does the screening we never had time for. We hired a full design team without adding a recruiter.&quot;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#7cc4ff', color: 'var(--jb-d-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>DW</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>Dana Whitfield</div>
                  <div style={{ fontSize: 12.5, color: 'var(--jb-d-ink-55)' }}>Senior Recruiter, Stripe</div>
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', background: 'repeating-linear-gradient(135deg, #1E2436, #1E2436 18px, #232A40 18px, #232A40 36px)', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5B6A92' }}>customer photo</span>
            </div>
          </Link>
        </section>

        {/* GRID */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '20px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
            {visible.map((s, i) => (
              <Link
                key={`${s.name}-${i}`}
                href={storyHref}
                style={{ display: 'flex', flexDirection: 'column', background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 24, textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: s.logoBg, color: s.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: 'var(--jb-font-mono)' }}>{s.logo}</span>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: s.tagColor, background: s.tagBg, border: `1px solid ${s.tagBorder}`, padding: '2px 8px', borderRadius: 999 }}>{s.tag}</span>
                </div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 600, color: s.accent, lineHeight: 1 }}>{s.metric}</div>
                <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)', margin: '6px 0 16px' }}>{s.metricLabel}</div>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', margin: '0 0 16px', flex: 1 }}>{s.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: s.avatarBg, color: s.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{s.initials}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--jb-d-ink-70)' }}>{s.name} · {s.role}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ background: 'rgba(124,196,255,0.12)', border: '1px solid rgba(124,196,255,0.3)', borderRadius: 24, padding: 48, textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 36px)', lineHeight: 1.06, margin: '0 0 12px' }}>Write your own story.</h2>
            <p style={{ fontSize: 16, color: '#3F4A7A', margin: '0 auto 26px', maxWidth: 440 }}>Hiring or job-hunting, you stay in control — matched to roles that fit, with the reasoning shown.</p>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={appRoute('App Sign Up.dc.html')} style={{ background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 15, fontWeight: 700, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}>Get started free</Link>
              <Link href={appRoute('Book Demo.dc.html')} style={{ background: 'var(--jb-d-panel)', color: 'var(--jb-d-ink)', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(124,196,255,0.3)' }}>Book a demo</Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
