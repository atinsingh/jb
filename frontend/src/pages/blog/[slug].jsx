'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const BLOCKS = [
  {
    isP: true,
    text: 'Most résumés read like a job description: a list of responsibilities the person was assigned. Hiring managers don’t hire responsibilities — they hire outcomes. And the single most persuasive outcome you can show is a number you moved.',
  },
  { isH: true, text: 'Lead with the metric, not the task' },
  {
    isP: true,
    text: 'Compare two versions of the same line. The first: “Responsible for redesigning the onboarding flow.” The second: “Led the onboarding redesign that lifted activation 31% across 2M users.” Same work — but only one tells the reader you create value.',
  },
  { isQuote: true, text: 'A résumé is not a record of what you did. It’s an argument for what you’ll do next.' },
  {
    isP: true,
    text: 'The 31% isn’t magic. It’s specific, it’s attributable, and it implies a story: you found a problem, you shipped a fix, and you measured the result. That arc is what an interviewer wants to dig into — so you’re engineering your own best questions.',
  },
  { isH: true, text: 'Don’t have a clean number? Estimate honestly' },
  {
    isP: true,
    text: 'You rarely need a perfect figure. “Cut support tickets by roughly a quarter” is far stronger than “handled support tickets.” Bracket it, caveat it if you must — but reach for the impact every time.',
  },
  {
    isP: true,
    text: 'Go through your résumé line by line and ask one question of each bullet: so what? If the line doesn’t answer it, rewrite it until it does.',
  },
];

const RELATED = [
  { cat: 'RÉSUMÉS', catColor: 'var(--jb-d-amber)', title: '7 résumé lines that get auto-rejected by ATS', readTime: '6 min', imgBg: '#FBF1E2' },
  { cat: 'INTERVIEWS', catColor: '#7cc4ff', title: 'Answer “tell me about yourself” in 90 seconds', readTime: '5 min', imgBg: 'rgba(124,196,255,0.12)' },
  { cat: 'STRATEGY', catColor: 'var(--jb-d-accent)', title: 'The hidden job market is mostly a myth', readTime: '8 min', imgBg: 'transparent' },
];

export default function BlogPost() {
  return (
    <>
      <Head>
        <title>The 31% rule: why onboarding is your résumé’s best story — Jobocate</title>
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
        #emkt .related-card:hover {
          border-color: var(--jb-d-accent) !important;
        }
        #emkt .cta-btn:hover {
          background: #1b9159 !important;
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: 'var(--jb-font-sans)', color: 'var(--jb-d-ink)', background: 'transparent' }}>
        <PublicLayout>

        {/* ARTICLE HEADER */}
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 0' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: 'var(--jb-d-ink-55)', marginBottom: 18 }}>
            <Link href={appRoute('Blog.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>Blog</Link>
            {' / '}
            <span style={{ color: 'var(--jb-d-accent)' }}>Strategy</span>
          </div>
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--jb-d-accent)',
              background: 'var(--jb-d-accent-tint)',
              border: '1px solid #CDE9D6',
              padding: '3px 9px',
              borderRadius: 999,
              marginBottom: 16,
            }}
          >
            STRATEGY
          </span>
          <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 46px)', lineHeight: 1.08, letterSpacing: '-0.01em', margin: '0 0 18px' }}>
            The 31% rule: why onboarding is your résumé’s best story.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 28, borderBottom: '1px solid var(--jb-d-line-card)' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>MB</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Marcus Bell</div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: 'var(--jb-d-ink-55)' }}>Career coach · 8 min read · Jun 24, 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <span style={{ width: 32, height: 32, border: '1px solid var(--jb-d-line-card)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--jb-d-ink-65)', fontWeight: 600 }}>X</span>
              <span style={{ width: 32, height: 32, border: '1px solid var(--jb-d-line-card)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--jb-d-ink-65)', fontWeight: 600 }}>in</span>
            </div>
          </div>
        </article>

        {/* HERO IMAGE */}
        <div style={{ maxWidth: 860, margin: '28px auto 0', padding: '0 32px' }}>
          <div
            style={{
              background: 'repeating-linear-gradient(135deg, rgba(124,196,255,0.12), rgba(124,196,255,0.12) 18px, #E4EAFD 18px, #E4EAFD 36px)',
              border: '1px solid var(--jb-d-line-card)',
              borderRadius: 18,
              height: 340,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7cc4ff' }}>hero image</span>
          </div>
        </div>

        {/* BODY */}
        <article style={{ maxWidth: 680, margin: '0 auto', padding: '36px 32px 0' }}>
          {BLOCKS.map((b, i) => {
            if (b.isH) {
              return (
                <h2 key={i} style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.15, margin: '34px 0 12px' }}>
                  {b.text}
                </h2>
              );
            }
            if (b.isQuote) {
              return (
                <blockquote key={i} style={{ margin: '24px 0', padding: '4px 0 4px 22px', borderLeft: '3px solid var(--jb-d-accent)', fontFamily: 'var(--jb-font-display)', fontSize: 24, lineHeight: 1.35, color: 'var(--jb-d-ink)' }}>
                  {b.text}
                </blockquote>
              );
            }
            return (
              <p key={i} style={{ fontSize: 17, lineHeight: 1.7, color: '#2A2820', margin: '0 0 20px' }}>
                {b.text}
              </p>
            );
          })}

          {/* INLINE CTA */}
          <div style={{ background: 'var(--jb-d-accent-tint)', border: '1px solid #CDE9D6', borderRadius: 16, padding: 24, margin: '32px 0', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F4733', marginBottom: 4 }}>Let your résumé write itself.</div>
              <div style={{ fontSize: 13.5, color: '#3F6B52' }}>Jobocate turns your experience into metric-driven bullets in seconds.</div>
            </div>
            <Link
              href={appRoute('App Sign Up.dc.html')}
              className="cta-btn"
              style={{ flexShrink: 0, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 14.5, fontWeight: 700, padding: '12px 22px', borderRadius: 999, textDecoration: 'none' }}
            >
              Try it free →
            </Link>
          </div>
        </article>

        {/*
          AUTHOR BIO — was "Marcus Bell, Career coach at Jobocate", who "has
          coached 2,000+ job seekers into roles at top companies". No such
          person and no such number. Bylines across the blog now read "Jobocate
          team"; restore a personal bio only for a real, named author.
        */}
        <div style={{ maxWidth: 680, margin: '24px auto 0', padding: '0 32px' }}>
          <div style={{ display: 'flex', gap: 16, background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 24 }}>
            <span style={{ width: 54, height: 54, flexShrink: 0, borderRadius: '50%', background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>JB</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Jobocate team</div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-55)', marginBottom: 9 }}>Written by the people building the product</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>
                We write about the parts of the job search nobody teaches you — what
                actually gets read, what gets filtered, and how to keep control of
                the process.
              </p>
            </div>
          </div>
        </div>

        {/* RELATED */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 24px' }}>
          <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: '0 0 18px' }}>Keep reading</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
            {RELATED.map((r, i) => (
              <Link
                key={i}
                href={appRoute('Blog Post.dc.html')}
                className="related-card"
                style={{ display: 'flex', flexDirection: 'column', background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, overflow: 'hidden', textDecoration: 'none' }}
              >
                <div style={{ background: r.imgBg, height: 120 }} />
                <div style={{ padding: 16 }}>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: r.catColor }}>{r.cat}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, margin: '7px 0 0', color: 'var(--jb-d-ink)' }}>{r.title}</h3>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-55)', marginTop: 9 }}>{r.readTime}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 32px 72px' }}>
          <div style={{ background: 'var(--jb-d-footer)', borderRadius: 24, padding: 44, textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 10px' }}>Get the next one in your inbox.</h2>
            <p style={{ fontSize: 14.5, color: 'var(--jb-d-ink-65)', margin: '0 auto 22px', maxWidth: 400 }}>One practical job-search email a week.</p>
            <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
              <input
                placeholder="you@email.com"
                style={{ flex: 1, minWidth: 0, background: '#0E0D09', border: '1px solid #2C2A22', borderRadius: 999, padding: '13px 18px', color: '#F2EDE2', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button
                style={{ background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', border: 'none', borderRadius: 999, padding: '0 24px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Join
              </button>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
