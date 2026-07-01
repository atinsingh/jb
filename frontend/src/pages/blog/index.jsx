'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const CAT_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'resume', label: 'Résumés' },
  { key: 'interview', label: 'Interviews' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'ai', label: 'AI & tools' },
];

const catStyle = (k) => {
  if (k === 'STRATEGY') return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (k === 'INTERVIEWS') return { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
  if (k === 'RÉSUMÉS') return { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
  return { color: '#5A544A', bg: '#F2ECE0', border: '#E6DECF' };
};

const av = (a) =>
  a === 'green'
    ? { bg: '#1FA463', color: '#0C2C1C' }
    : a === 'indigo'
    ? { bg: '#4263EB', color: '#fff' }
    : { bg: '#EDE7DA', color: '#5A544A' };

const RAW_POSTS = [
  { catKey: 'resume', cat: 'RÉSUMÉS', title: '7 résumé lines that get auto-rejected by ATS', excerpt: 'The phrasing that quietly tanks your score — and what to write instead.', author: 'Sarah Chen', authorInitials: 'SC', authorAccent: 'green', readTime: '6 min', imgBg: '#FBF1E2', imgInk: '#C8A06A' },
  { catKey: 'interview', cat: 'INTERVIEWS', title: 'How to answer “tell me about yourself” in 90 seconds', excerpt: 'A repeatable structure that lands every time, with a worked example.', author: 'Marcus Bell', authorInitials: 'MB', authorAccent: 'indigo', readTime: '5 min', imgBg: '#EDF0FE', imgInk: '#8DA2F5' },
  { catKey: 'ai', cat: 'AI & TOOLS', title: 'Should you let AI apply to jobs for you?', excerpt: 'Where automation helps, where it hurts, and how to keep quality high.', author: 'Dana Whitfield', authorInitials: 'DW', authorAccent: 'indigo', readTime: '7 min', imgBg: '#EAF6EE', imgInk: '#7FBF9A' },
  { catKey: 'strategy', cat: 'STRATEGY', title: 'The hidden job market is mostly a myth — do this instead', excerpt: 'What actually moves the needle when you’re searching quietly.', author: 'Marcus Bell', authorInitials: 'MB', authorAccent: 'indigo', readTime: '8 min', imgBg: '#F4EFE4', imgInk: '#B8AC95' },
  { catKey: 'resume', cat: 'RÉSUMÉS', title: 'One résumé, tailored 5 ways: a teardown', excerpt: 'How small, role-specific edits change everything for the reader.', author: 'Sarah Chen', authorInitials: 'SC', authorAccent: 'green', readTime: '6 min', imgBg: '#FBEDE4', imgInk: '#D49A78' },
  { catKey: 'interview', cat: 'INTERVIEWS', title: 'The follow-up email that actually gets replies', excerpt: 'Timing, tone and the one line most people forget to include.', author: 'Dana Whitfield', authorInitials: 'DW', authorAccent: 'indigo', readTime: '4 min', imgBg: '#EDF0FE', imgInk: '#8DA2F5' },
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
        <title>Blog — Jobocate</title>
        <meta name="description" content="Job-search playbooks, minus the fluff. Data-backed advice on résumés, interviews, and landing the offer." />
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
        #emkt .blog-card {
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        #emkt .blog-card:hover {
          border-color: #1fa463 !important;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: '#1B1A16',
          background: '#F7F3EA',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HEADER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 32px 22px' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 14 }}>— The Jobocate blog</div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.04, margin: '0 0 10px' }}>Job-search playbooks, minus the fluff.</h1>
          <p style={{ fontSize: 16.5, color: '#5A544A', margin: '0 0 24px', maxWidth: 520 }}>Data-backed advice on résumés, interviews, and landing the offer — from the team building the AI copilot.</p>
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
                    color: on ? '#0C2C1C' : '#46413A',
                    background: on ? '#1FA463' : '#FFFEFB',
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
            style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 22, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ background: 'repeating-linear-gradient(135deg, #EDF0FE, #EDF0FE 16px, #E4EAFD 16px, #E4EAFD 32px)', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8DA2F5' }}>featured image</span>
            </div>
            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ alignSelf: 'flex-start', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 9px', borderRadius: 999, marginBottom: 16 }}>FEATURED · STRATEGY</span>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 30, lineHeight: 1.12, margin: '0 0 12px' }}>The 31% rule: why onboarding is your résumé’s best story.</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: '0 0 20px' }}>Hiring managers skim for impact, not tasks. Here’s how to reframe your work around the metric that moved — with real before/after examples.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>MB</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Marcus Bell</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>8 min read · Jun 24</div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* GRID */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {visiblePosts.map((p, i) => (
              <Link
                key={`${p.title}-${i}`}
                href={postHref}
                className="blog-card"
                style={{ display: 'flex', flexDirection: 'column', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ background: p.imgBg, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: p.imgInk }}>image</span>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ alignSelf: 'flex-start', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: p.catColor, background: p.catBg, border: `1px solid ${p.catBorder}`, padding: '2px 8px', borderRadius: 999, marginBottom: 12 }}>{p.cat}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, margin: '0 0 8px', color: '#1B1A16' }}>{p.title}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#8A8378', margin: '0 0 16px', flex: 1 }}>{p.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: p.authorBg, color: p.authorColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>{p.authorInitials}</span>
                    <span style={{ fontSize: 12, color: '#5A544A' }}>{p.author}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#A79E8F' }}>{p.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 72px' }}>
          <div style={{ background: '#15140F', borderRadius: 24, padding: 48, textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 10px' }}>The weekly job-search edge.</h2>
            <p style={{ fontSize: 15, color: '#B8B1A4', margin: '0 auto 24px', maxWidth: 420 }}>One sharp, practical email a week. No spam, unsubscribe anytime.</p>
            <div style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto' }}>
              <input
                placeholder="you@email.com"
                style={{ flex: 1, minWidth: 0, background: '#0E0D09', border: '1px solid #2C2A22', borderRadius: 999, padding: '13px 18px', color: '#F2EDE2', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button style={{ background: '#1FA463', color: '#0C2C1C', border: 'none', borderRadius: 999, padding: '0 24px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Join</button>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
