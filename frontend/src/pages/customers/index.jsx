'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const FILTER_DEFS = [
  { key: 'all', label: 'All stories' },
  { key: 'employer', label: 'For employers' },
  { key: 'candidate', label: 'For job seekers' },
];

const RAW_STORIES = [
  { type: 'employer', metric: '40%', metricLabel: 'faster time-to-hire', quote: '"Autopilot screens overnight and hands us a clean shortlist by morning."', name: 'Dana W.', role: 'Recruiter', initials: 'DW', authorAccent: 'indigo', logo: 'St', logoBg: '#EDF0FE', logoColor: '#4263EB', accent: '#4263EB' },
  { type: 'candidate', metric: '3 weeks', metricLabel: 'from sign-up to offer', quote: '"I set it up once and woke up to interview requests. Landed at Plaid in 21 days."', name: 'Sarah C.', role: 'Designer', initials: 'SC', authorAccent: 'green', logo: 'Pl', logoBg: '#EAF6EE', logoColor: '#157A49', accent: '#1FA463' },
  { type: 'employer', metric: '−52%', metricLabel: 'cost per hire', quote: '"We replaced an agency retainer with Jobocate and never looked back."', name: 'Raj M.', role: 'Talent Lead', initials: 'RM', authorAccent: 'indigo', logo: 'Lu', logoBg: '#F4EFE4', logoColor: '#1B1A16', accent: '#4263EB' },
  { type: 'candidate', metric: '5×', metricLabel: 'more interviews', quote: '"Auto-apply got me in front of teams I’d never have found on my own."', name: 'Jordan L.', role: 'Engineer', initials: 'JL', authorAccent: 'green', logo: 'Sq', logoBg: '#EAF6EE', logoColor: '#157A49', accent: '#1FA463' },
  { type: 'employer', metric: '2.5k', metricLabel: 'applicants auto-screened / mo', quote: '"Our team finally spends time on people, not on filtering résumés."', name: 'Elena C.', role: 'Hiring Manager', initials: 'EC', authorAccent: 'indigo', logo: 'Ve', logoBg: '#F4EFE4', logoColor: '#1B1A16', accent: '#4263EB' },
  { type: 'candidate', metric: '92%', metricLabel: 'match on her final offer', quote: '"The match score was spot on — the role fit better than anything I’d applied to manually."', name: 'Priya N.', role: 'PM', initials: 'PN', authorAccent: 'green', logo: 'No', logoBg: '#EAF6EE', logoColor: '#157A49', accent: '#1FA463' },
];

const avatar = (a) =>
  a === 'green'
    ? { bg: '#1FA463', color: '#0C2C1C' }
    : a === 'indigo'
    ? { bg: '#4263EB', color: '#fff' }
    : { bg: '#EDE7DA', color: '#5A544A' };

const tagStyle = (k) =>
  k === 'employer'
    ? { label: 'EMPLOYER', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' }
    : { label: 'JOB SEEKER', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };

export default function CustomerStories() {
  const [filter, setFilter] = useState('all');

  const storyHref = appRoute('Customer Story.dc.html');

  const filters = FILTER_DEFS.map((f) => {
    const on = filter === f.key;
    return {
      key: f.key,
      label: f.label,
      color: on ? '#fff' : '#46413A',
      bg: on ? '#4263EB' : '#FFFEFB',
      border: on ? '#4263EB' : '#E1D9C9',
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
        <title>Customer Stories — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #1fa463;
          color: #f7f3ea;
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16', background: '#F7F3EA' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HEADER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 32px 24px' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 14 }}>— Customer stories</div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.04, margin: '0 0 10px' }}>Real outcomes, on both sides of the table.</h1>
          <p style={{ fontSize: 16.5, color: '#5A544A', margin: '0 0 24px', maxWidth: 520 }}>From seekers who landed faster to teams who hired smarter — here’s what changed with Jobocate.</p>
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
          <Link href={storyHref} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: '#15140F', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(66,99,235,0.32), transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', padding: 44 }}>
              <span style={{ display: 'inline-block', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: '#8DA2F5', background: 'rgba(66,99,235,0.16)', border: '1px solid rgba(66,99,235,0.32)', padding: '3px 9px', borderRadius: 999, marginBottom: 18 }}>EMPLOYER · FEATURED</span>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 60, fontWeight: 600, color: '#5BD08C', lineHeight: 1 }}>40%</div>
              <div style={{ fontSize: 16, color: '#B8B1A4', margin: '6px 0 20px' }}>faster time-to-hire in the first quarter</div>
              <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, lineHeight: 1.3, color: '#F2EDE2', margin: '0 0 24px' }}>&quot;Autopilot does the screening we never had time for. We hired a full design team without adding a recruiter.&quot;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#4263EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>DW</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>Dana Whitfield</div>
                  <div style={{ fontSize: 12.5, color: '#9A9286' }}>Senior Recruiter, Stripe</div>
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', background: 'repeating-linear-gradient(135deg, #1E2436, #1E2436 18px, #232A40 18px, #232A40 36px)', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5B6A92' }}>customer photo</span>
            </div>
          </Link>
        </section>

        {/* GRID */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '20px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {visible.map((s, i) => (
              <Link
                key={`${s.name}-${i}`}
                href={storyHref}
                style={{ display: 'flex', flexDirection: 'column', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: s.logoBg, color: s.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{s.logo}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: s.tagColor, background: s.tagBg, border: `1px solid ${s.tagBorder}`, padding: '2px 8px', borderRadius: 999 }}>{s.tag}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 600, color: s.accent, lineHeight: 1 }}>{s.metric}</div>
                <div style={{ fontSize: 14, color: '#5A544A', margin: '6px 0 16px' }}>{s.metricLabel}</div>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: '#3A352C', margin: '0 0 16px', flex: 1 }}>{s.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: s.avatarBg, color: s.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>{s.initials}</span>
                  <span style={{ fontSize: 12.5, color: '#5A544A' }}>{s.name} · {s.role}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 24, padding: 48, textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1.06, margin: '0 0 12px' }}>Write your own story.</h2>
            <p style={{ fontSize: 16, color: '#3F4A7A', margin: '0 auto 26px', maxWidth: 440 }}>Whether you’re hiring or job-hunting, Jobocate gets you there faster.</p>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={appRoute('App Sign Up.dc.html')} style={{ background: '#1FA463', color: '#0C2C1C', fontSize: 15, fontWeight: 700, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}>Get started free</Link>
              <Link href={appRoute('Book Demo.dc.html')} style={{ background: '#FFFEFB', color: '#1B1A16', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid #C7D2FB' }}>Book a demo</Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
