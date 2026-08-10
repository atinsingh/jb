'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const CAT_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'resume', label: 'Résumés' },
  { key: 'interview', label: 'Interviews' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'ai', label: 'AI & tools' },
];

const catStyle = (k) => {
  if (k === 'STRATEGY') return { color: 'var(--jb-d-accent)', bg: 'var(--jb-d-accent-tint)', border: '#CDE9D6' };
  if (k === 'INTERVIEWS') return { color: '#7cc4ff', bg: 'rgba(124,196,255,0.12)', border: 'rgba(124,196,255,0.3)' };
  if (k === 'RÉSUMÉS') return { color: 'var(--jb-d-amber)', bg: '#FBF1E2', border: '#EAD9BE' };
  return { color: 'var(--jb-d-ink-70)', bg: '#F2ECE0', border: 'var(--jb-d-line-card)' };
};

const av = (a) =>
  a === 'green'
    ? { bg: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)' }
    : a === 'indigo'
    ? { bg: '#7cc4ff', color: 'var(--jb-d-panel)' }
    : { bg: 'var(--jb-d-glass)', color: 'var(--jb-d-ink-70)' };

const RAW_POSTS = [
  { catKey: 'resume', cat: 'RÉSUMÉS', title: '7 résumé lines that hurt your ATS score', excerpt: 'The wording that quietly lowers your ranking — and what to write instead.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'green', readTime: '6 min', imgBg: '#FBF1E2', imgInk: '#C8A06A' },
  { catKey: 'interview', cat: 'INTERVIEWS', title: 'How to answer “tell me about yourself” in 90 seconds', excerpt: 'A repeatable structure you can adapt to any role, with a worked example.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'indigo', readTime: '5 min', imgBg: 'rgba(124,196,255,0.12)', imgInk: '#7cc4ff' },
  { catKey: 'ai', cat: 'AI & TOOLS', title: 'Should you let AI apply to jobs for you?', excerpt: 'Where auto-apply helps, where it hurts, and how to stay in control of quality.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'indigo', readTime: '7 min', imgBg: 'var(--jb-d-accent-tint)', imgInk: 'var(--jb-d-accent)' },
  { catKey: 'strategy', cat: 'STRATEGY', title: 'The hidden job market is mostly a myth — do this instead', excerpt: 'What actually helps when you’re searching quietly, and what to skip.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'indigo', readTime: '8 min', imgBg: 'transparent', imgInk: '#B8AC95' },
  { catKey: 'resume', cat: 'RÉSUMÉS', title: 'One résumé, tailored 5 ways: a teardown', excerpt: 'How small, role-specific edits change the way a recruiter reads you.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'green', readTime: '6 min', imgBg: '#FBEDE4', imgInk: '#D49A78' },
  { catKey: 'interview', cat: 'INTERVIEWS', title: 'The follow-up email that actually gets replies', excerpt: 'Timing, tone, and the one line most people forget to include.', author: 'Jobocate team', authorInitials: 'JB', authorAccent: 'indigo', readTime: '4 min', imgBg: 'rgba(124,196,255,0.12)', imgInk: '#7cc4ff' },
];

const POSTS = RAW_POSTS.map((p) => {
  const cs = catStyle(p.cat);
  const a = av(p.authorAccent);
  return { ...p, catColor: cs.color, catBg: cs.bg, catBorder: cs.border, authorBg: a.bg, authorColor: a.color };
});

export default function JobocateBlog() {
  const [cat, setCat] = useState('all');

  const postHref = appRoute('Blog Post.dc.html');
  const visiblePosts = cat === 'all' ? POSTS : POSTS.filter((p) => p.catKey === cat);

  return (
    <>
      <Head>
        <title>Job-search blog — Jobocate</title>
        <meta name="description" content="Practical job-search advice on résumés, interviews, matching, and auto-apply — clear steps and real examples from the team building Jobocate. Read the latest." />
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
        #emkt .blog-card {
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        #emkt .blog-card:hover {
          border-color: var(--jb-d-accent) !important;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: 'var(--jb-font-sans)',
          color: 'var(--jb-d-ink)',
          background: 'transparent',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PublicLayout>

        {/* HEADER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 32px 22px' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 14 }}>— The Jobocate blog</div>
          <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.04, margin: '0 0 10px' }}>Job-search advice, specific enough to act on.</h1>
          <p style={{ fontSize: 16.5, color: 'var(--jb-d-ink-70)', margin: '0 0 24px', maxWidth: 520 }}>Clear notes on résumés, interviews, and matching — with real examples, from the team building Jobocate.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CAT_DEFS.map((c) => {
              const on = cat === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? 'var(--jb-d-bg)' : 'var(--jb-d-ink-85)',
                    background: on ? 'var(--jb-d-accent)' : 'var(--jb-d-panel)',
                    border: `1px solid ${on ? '#1FA463' : '#E1D9C9'}`,
                    borderRadius: 999,
                    padding: '8px 15px',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* FEATURED */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '14px 32px 8px' }}>
          <Link
            href={postHref}
            className="blog-card"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 0, background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ background: 'repeating-linear-gradient(135deg, rgba(124,196,255,0.12), rgba(124,196,255,0.12) 16px, #E4EAFD 16px, #E4EAFD 32px)', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7cc4ff' }}>featured image</span>
            </div>
            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ alignSelf: 'flex-start', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--jb-d-accent)', background: 'var(--jb-d-accent-tint)', border: '1px solid #CDE9D6', padding: '3px 9px', borderRadius: 999, marginBottom: 16 }}>FEATURED · STRATEGY</span>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.12, margin: '0 0 12px' }}>Why your onboarding wins belong on your résumé.</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: '0 0 20px' }}>Hiring managers skim for impact, not tasks. How to reframe your work around the result that moved — with before-and-after examples.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>MB</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Marcus Bell</div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-55)' }}>8 min read · Jun 24</div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* GRID */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 18 }}>
            {visiblePosts.map((p, i) => (
              <Link
                key={`${p.title}-${i}`}
                href={postHref}
                className="blog-card"
                style={{ display: 'flex', flexDirection: 'column', background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ background: p.imgBg, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: p.imgInk }}>image</span>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ alignSelf: 'flex-start', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: p.catColor, background: p.catBg, border: `1px solid ${p.catBorder}`, padding: '2px 8px', borderRadius: 999, marginBottom: 12 }}>{p.cat}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, margin: '0 0 8px', color: 'var(--jb-d-ink)' }}>{p.title}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: '0 0 16px', flex: 1 }}>{p.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: p.authorBg, color: p.authorColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{p.authorInitials}</span>
                    <span style={{ fontSize: 12, color: 'var(--jb-d-ink-70)' }}>{p.author}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-55)' }}>{p.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ background: 'var(--jb-d-footer)', borderRadius: 24, padding: 48, textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 10px' }}>One useful job-search email a week.</h2>
            <p style={{ fontSize: 15, color: 'var(--jb-d-ink-65)', margin: '0 auto 24px', maxWidth: 420 }}>One practical read each week — résumés, interviews, and matching. No spam, unsubscribe anytime.</p>
            <div style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto' }}>
              <input
                placeholder="you@email.com"
                style={{ flex: 1, minWidth: 0, background: '#0E0D09', border: '1px solid #2C2A22', borderRadius: 999, padding: '13px 18px', color: '#F2EDE2', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button style={{ background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', border: 'none', borderRadius: 999, padding: '0 24px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Subscribe</button>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
