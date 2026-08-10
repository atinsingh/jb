'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

/**
 * Marketing homepage body — implements the design system's `Jobocate Site.dc.html`.
 *
 * Palette: cream #EFF0EC, green #2F7D3A, dark #21251F, blue (employer) #3E5A6B.
 * Type: Hanken Grotesk (800 display) + JetBrains Mono for labels/data. Signature
 * moments are the boarding-pass ticket and the departures/arrivals boards;
 * everything else stays quiet. Motion is a gated scroll-reveal.
 *
 * This component renders SECTIONS ONLY. It used to carry its own inline header,
 * which is how the homepage ended up with a different menu from every other
 * page: its middle items were in-page anchors (#legs / #employer / #compare)
 * rather than routes, and it had no employer CTA at all. The header now comes
 * from the shared PublicLayout/SiteNav, and those ids survive purely as
 * in-page scroll targets for the CTAs on this page.
 */

const R = {
  find: appRoute('Browse Jobs.dc.html'),
  signup: appRoute('App Sign Up.dc.html'),
  empPost: appRoute('Employer Post Job.dc.html'),
  empTools: appRoute('For Employers.dc.html'),
};

const T = {
  bg: 'transparent', card: '#FFFFFF', ink: 'var(--jb-d-ink)', muted: 'var(--jb-d-ink-70)', muted2: '#6C7269',
  line: 'var(--jb-d-line-card)', line2: '#D6D9D2', strip: '#E8EAE6',
  green: '#2F7D3A', greenD: '#24632D', greenB: '#79ED91', greenTint: 'var(--jb-d-accent-tint)', greenTintLine: 'rgba(143,214,163,0.35)', greenInk: 'var(--jb-d-bg)',
  dark: '#21251F', darkLine: 'var(--jb-d-line-card)', dark2: '#2E332C', dark3: '#363C34', mono: 'var(--jb-font-mono)',
  blue: '#3E5A6B', blueTint: 'rgba(124,196,255,0.12)', blueB: '#9DB6C4', blueLine: 'rgba(124,196,255,0.3)', blueInk: 'var(--jb-d-ink)',
};

const LEGS = [
  { tag: 'Leg 01', title: 'Check in once', body: 'Build your pass from your real experience. We verify what’s real and never invent a skill you don’t have.' },
  { tag: 'Leg 02', title: 'Board the right flights', body: 'Get matches to roles you’ll actually clear. Every application waits for your approval — auto-apply stays inside the limits you set.' },
  { tag: 'Leg 03', title: 'Track to the gate', body: 'Follow each application from screen to offer, with the reasoning behind every match shown in plain terms.' },
];
/*
 * Illustrative board data.
 *
 * These rows previously named Netflix, Stripe, Airbnb and Spotify, rendered in
 * those companies' own brand colours, with invented match scores and pipeline
 * stages beside them — which reads as a claim about real roles at real
 * employers. The employers below are fictional placeholders, and the panel is
 * labelled as an example in the UI. Swap this for real anonymised matches from
 * the live job pool when the homepage is wired to data.
 */
const BOARD = [
  { role: 'Sr Product Designer', employer: 'Meridian', mark: 'M', brand: '#4C6EF5', fit: '94', status: 'Interview', ink: '#7cc4ff', bg: '#223540' },
  { role: 'Frontend Engineer', employer: 'Cobalt Labs', mark: 'C', brand: '#7048E8', fit: '88', status: 'Screening', ink: 'var(--jb-d-ink-55)', bg: 'var(--jb-d-line-card)' },
  { role: 'Design Lead', employer: 'Juniper', mark: 'J', brand: '#E8590C', fit: '91', status: 'Offer', ink: 'var(--jb-d-bg)', bg: '#79ED91' },
  { role: 'Product Designer', employer: 'Aster Health', mark: 'A', brand: '#0CA678', fit: '86', status: 'Applied', ink: 'var(--jb-d-accent)', bg: '#123317' },
];
const WHY = [
  { num: '01', title: 'Real matches, not keyword luck', body: 'Ranked on skills, experience and availability — never a black box. Every match opens to show exactly why it fits.' },
  { num: '02', title: 'You hold every boarding pass', body: 'Nothing is submitted without your approval. Turn on auto-apply and it still files only within the limits you set.' },
  { num: '03', title: 'Written from your real experience', body: 'Each application is tailored to the role from what you’ve actually done. No invented qualifications, ever.' },
];
const COMPARE_BAD = [
  'Spray applications at any job',
  'Auto-send without asking you',
  '“95% more likely” black-box promises',
  'Hidden auto-renewals and credit packs',
  'Candidate-only — employers never see the other side',
];
const COMPARE_GOOD = [
  'Only roles you’re actually eligible for — right country, visa, availability',
  'You approve every send',
  'Every match opens to show exactly why',
  'Free forever tier · $15 Pro · cancel anytime',
  'Two-sided: verified employers meet you directly',
];
const ARRIVALS = [
  { name: 'Candidate · A.R.', role: 'Sr Product Designer', fit: '94', status: 'Shortlisted', ink: 'var(--jb-d-bg)', bg: '#9DB6C4' },
  { name: 'Candidate · M.K.', role: 'Product Designer', fit: '89', status: 'Screening', ink: 'var(--jb-d-ink-55)', bg: 'var(--jb-d-line-card)' },
  { name: 'Candidate · J.T.', role: 'Design Lead', fit: '91', status: 'New', ink: 'var(--jb-d-accent)', bg: '#123317' },
];
const FAQS = [
  ['Does Jobocate apply to jobs for me automatically?', 'Only if you turn on auto-apply — and only within the limits you set. Leave review mode on and nothing is ever submitted without your approval.'],
  ['What exactly gets verified?', 'Work history, dates, titles and the skills you claim. Anything we cannot verify is flagged rather than asserted, and applications that need an unverifiable answer wait for you.'],
  ['Is it really free to start?', 'Yes. Matching, the tracker and one resume version are free forever. Pro adds auto-apply, unlimited tailored applications and priority matching. Cancel anytime.'],
  ['Do employers see everything about me?', 'No. Employers see the application you approved and job-related criteria only. Your contact details stay hidden until you accept a conversation.'],
];
const HERO_YOU = { x: 120, y: 250 };
// Fictional destinations, for the same reason as BOARD above.
const HERO_DESTS = [
  { x: 250, y: 108, m: 'A', c: '#0CA678', name: 'Aster Health' },
  { x: 432, y: 92, m: 'M', c: '#4C6EF5', name: 'Meridian' },
  { x: 498, y: 226, m: 'C', c: '#7048E8', name: 'Cobalt Labs' },
  { x: 418, y: 356, m: 'J', c: '#E8590C', name: 'Juniper' },
];
const heroArc = (a, b) => `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 70} ${b.x} ${b.y}`;
const PASS_STEPS = [
  { label: 'Applied', mark: '✓', ink: 'var(--jb-d-accent)', bg: 'var(--jb-d-accent-tint)', border: 'rgba(143,214,163,0.35)' },
  { label: 'Viewed', mark: '✓', ink: 'var(--jb-d-accent)', bg: 'var(--jb-d-accent-tint)', border: 'rgba(143,214,163,0.35)' },
  { label: 'Interview', mark: '●', ink: '#7cc4ff', bg: 'rgba(124,196,255,0.12)', border: 'rgba(124,196,255,0.3)' },
  { label: 'Offer', mark: '–', ink: 'var(--jb-d-ink-55)', bg: 'var(--jb-d-glass)', border: 'var(--jb-d-line-card)' },
];
// (boarding-pass barcode retired with the hero ticket redesign)

export default function HomeBoardingPass() {
  const rootRef = useRef(null);
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.classList.add('jbs--js');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Count numeric badges (fit scores) up from 0 the first time they reveal.
    const runCounts = (scope) => {
      if (!scope) return;
      scope.querySelectorAll('[data-count]').forEach((el) => {
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        const to = parseInt(el.dataset.count, 10);
        if (Number.isNaN(to)) return;
        if (reduce) { el.textContent = String(to); return; }
        const dur = 950;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    };
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); runCounts(e.target); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    root.querySelectorAll('.rv').forEach((el) => io.observe(el));
    requestAnimationFrame(() => {
      root.querySelectorAll('.hero .rv').forEach((el) => el.classList.add('in'));
      runCounts(root.querySelector('.hero'));
    });
    return () => io.disconnect();
  }, []);

  const kick = (color) => ({ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color });
  const h2 = { margin: 0, fontFamily: 'var(--jb-font-display)', fontWeight: 400, letterSpacing: '-0.02em' };

  return (
    <div className="jbs" ref={rootRef} style={{ background: T.bg, fontFamily: 'var(--jb-font-sans)', color: T.ink }}>
      <style jsx>{`
        .jbs :global(a), .jbs :global(a:hover) { color: inherit; text-decoration: none; }
        .jbs :global(button:focus-visible), .jbs :global(a:focus-visible) { outline: 2px solid ${T.green}; outline-offset: 3px; }
        .jbs--js .rv { opacity: 0; transform: translateY(20px); transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1); }
        .jbs--js .rv.in { opacity: 1; transform: none; }
        .jbs--js .stagger > * { opacity: 0; transform: translateY(16px); transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); }
        .jbs--js .stagger.in > * { opacity: 1; transform: none; }
        .jbs--js .stagger.in > *:nth-child(1) { transition-delay: .04s }
        .jbs--js .stagger.in > *:nth-child(2) { transition-delay: .10s }
        .jbs--js .stagger.in > *:nth-child(3) { transition-delay: .16s }
        .jbs--js .stagger.in > *:nth-child(4) { transition-delay: .22s }
        .jbs--js .stagger.in > *:nth-child(5) { transition-delay: .28s }
        .jbs--js .stagger.in > *:nth-child(6) { transition-delay: .34s }
        .jbs .pass { animation: jbFloat 7s ease-in-out infinite; will-change: transform; }
        @keyframes jbFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .jbs .route { animation: jbDash .7s linear infinite; }
        @keyframes jbDash { to { background-position: 8px 0 } }
        .jbs .plane { display: inline-block; animation: jbBob 2.6s ease-in-out infinite; }
        @keyframes jbBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
        .jbs .pulse { animation: jbPulse 1.8s ease-in-out infinite; }
        @keyframes jbPulse { 0%,100% { opacity: .4; transform: scale(.8) } 50% { opacity: 1; transform: scale(1) } }
        .jbs .uline { position: absolute; left: 0; right: 0; bottom: -0.16em; width: 100%; height: 0.5em; overflow: visible; pointer-events: none; }
        .jbs .uline path { fill: none; stroke-linecap: round; stroke-dasharray: 300; stroke-dashoffset: 300; animation: jbDraw 1s cubic-bezier(.22,1,.36,1) .5s forwards; }
        @keyframes jbDraw { to { stroke-dashoffset: 0 } }
        .jbs .arc { stroke-dasharray: 6 9; animation: jbFlow 1.1s linear infinite; }
        @keyframes jbFlow { to { stroke-dashoffset: -15 } }
        .jbs .nodepulse { transform-box: fill-box; transform-origin: center; animation: jbRing 2.8s ease-out infinite; }
        @keyframes jbRing { 0% { transform: scale(.55); opacity: .5 } 100% { transform: scale(1.9); opacity: 0 } }
        .jbs .floaty { animation: jbFloat 8s ease-in-out infinite; }
        .jbs .floaty2 { animation: jbFloat 9s ease-in-out infinite; animation-delay: -4s; }
        @media (prefers-reduced-motion: reduce) {
          .jbs--js .rv, .jbs--js .stagger > * { opacity: 1 !important; transform: none !important; transition: none !important; }
          .jbs .pass, .jbs .route, .jbs .plane, .jbs .pulse, .jbs .arc, .jbs .nodepulse, .jbs .floaty, .jbs .floaty2 { animation: none !important; }
          .jbs .uline path { stroke-dashoffset: 0 !important; animation: none !important; }
        }
        @media (max-width: 560px) { .jbs .mapcard { display: none !important; } }
      `}</style>

    {/* HERO */}
      <section className="hero" style={{ padding: '78px 32px 68px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(360px,100%),1fr))', gap: 52, alignItems: 'center' }}>
          <div className="rv stagger" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 999, background: 'var(--jb-d-panel)', border: `1px solid ${T.line}`, ...kick(T.green), letterSpacing: '0.14em', fontSize: 11 }}>Apply → Interview → Offer</span>
            <h1 style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontWeight: 400, maxWidth: '15ch', fontSize: 'clamp(28px, 6vw, 60px)', lineHeight: 1.06, letterSpacing: '-0.02em', color: T.ink }}>
              Your shortest{' '}
              <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>route
                <svg className="uline" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true"><path d="M4 9 C 34 4, 92 4, 116 8" stroke={T.green} strokeOpacity="0.4" strokeWidth="6" /></svg>
              </span>{' '}
              from apply to{' '}
              <span style={{ position: 'relative', whiteSpace: 'nowrap', fontFamily: 'var(--jb-font-display)', fontStyle: 'italic', fontWeight: 400, color: T.green }}>offer.
                <svg className="uline" viewBox="0 0 120 16" preserveAspectRatio="none" aria-hidden="true"><path d="M4 11 C 24 16, 44 5, 66 9 C 90 14, 104 6, 116 8" stroke={T.green} strokeWidth="3.5" /></svg>
              </span>
            </h1>
            <p style={{ margin: 0, maxWidth: '50ch', fontSize: 19, lineHeight: 1.6, color: T.muted }}>Jobocate maps your job search like a trip — where you are, what’s next, and the roles most likely to take you all the way to an offer.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Link href={R.signup} style={{ height: 52, padding: '0 26px', display: 'flex', alignItems: 'center', borderRadius: 999, background: T.green, color: '#fff', fontSize: 16, fontWeight: 700 }}>Plan my route</Link>
              <a href="#legs" style={{ height: 52, padding: '0 24px', display: 'flex', alignItems: 'center', border: `1px solid ${T.line2}`, borderRadius: 999, fontSize: 16, fontWeight: 600 }}>See how it works</a>
            </div>
            <span style={{ fontSize: 14.5, color: T.muted }}>Free to start — nothing sends without your say-so.</span>
          </div>

          {/* GLOBAL FLIGHT ROUTES */}
          <div className="rv" style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto', minWidth: 0 }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(33,37,31,0.06) 1px, transparent 1.6px)', backgroundSize: '20px 20px', WebkitMaskImage: 'radial-gradient(ellipse 72% 68% at 50% 46%, #000 52%, transparent 100%)', maskImage: 'radial-gradient(ellipse 72% 68% at 50% 46%, #000 52%, transparent 100%)' }} />
            <svg viewBox="0 0 560 460" width="100%" style={{ display: 'block', position: 'relative' }} role="img" aria-label="Flight routes from you to companies hiring on Jobocate">
              {HERO_DESTS.map((d) => (
                <path key={`arc-${d.name}`} className="arc" d={heroArc(HERO_YOU, d)} fill="none" stroke={T.green} strokeOpacity="0.5" strokeWidth="1.6" />
              ))}
              {HERO_DESTS.map((d, i) => (
                <g key={d.name} transform={`translate(${d.x} ${d.y})`}>
                  <circle className="nodepulse" r="17" fill={d.c} style={{ animationDelay: `${i * 0.55}s` }} />
                  <rect x="-17" y="-17" width="34" height="34" rx="10" fill={d.c} />
                  <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fill="#fff" style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700 }}>{d.m}</text>
                  <text x="0" y="34" textAnchor="middle" fill="#6C7269" style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.04em' }}>{d.name}</text>
                </g>
              ))}
              <g transform={`translate(${HERO_YOU.x} ${HERO_YOU.y})`}>
                <circle className="nodepulse" r="24" fill={T.green} />
                <circle r="23" fill={T.green} />
                <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fill="#fff" style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>YOU</text>
              </g>
            </svg>
            {/* floating match card */}
            <div className="mapcard floaty" style={{ position: 'absolute', top: '3%', right: '1%', background: 'var(--jb-d-panel)', border: `1px solid ${T.line}`, borderRadius: 14, padding: '12px 14px', minWidth: 208, boxShadow: '0 22px 44px -26px rgba(39,45,37,0.5)', fontFamily: 'var(--jb-font-sans)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#4C6EF5', color: 'var(--jb-d-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 13, fontWeight: 700 }}>M</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' }}>Sr Product Designer</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>Meridian · Remote</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 11 }}>
                <span style={{ padding: '3px 9px', borderRadius: 6, background: T.greenTint, border: `1px solid ${T.greenTintLine}`, fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.green }}>94 fit</span>
                <span style={{ padding: '3px 9px', borderRadius: 6, background: T.blueTint, border: `1px solid ${T.blueLine}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.blue }}>Interview</span>
              </div>
            </div>
            {/* floating mini boarding pass */}
            <div className="mapcard floaty2" style={{ position: 'absolute', bottom: '3%', left: '1%', background: T.dark, color: '#F5F5F5', borderRadius: 12, padding: '12px 14px', minWidth: 196, boxShadow: '0 22px 44px -26px rgba(39,45,37,0.55)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.greenB }}>Boarding pass</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', color: 'var(--jb-d-ink-55)' }}>JBC-247</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 10px' }}>
                <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>YOU</span>
                <span aria-hidden="true" className="route" style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#4A5147 0 4px,transparent 4px 8px)' }} />
                <span className="plane" style={{ fontSize: 12, color: T.greenB }}>✈</span>
                <span aria-hidden="true" className="route" style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#4A5147 0 4px,transparent 4px 8px)' }} />
                <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: T.greenB }}>OFR</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
                {PASS_STEPS.map((s) => (
                  <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span aria-hidden="true" style={{ width: 15, height: 15, flexShrink: 0, borderRadius: '50%', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: s.ink }}>{s.mark}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>{s.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ padding: '18px 32px', background: T.strip, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 38, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted2 }}>
          <span>Eligibility-checked matches</span><span>You approve every application</span><span>Free to start · cancel anytime</span>
        </div>
      </section>

      {/* THREE LEGS */}
      <section id="legs" style={{ padding: '88px 32px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div className="rv" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <span style={kick(T.greenD)}>How it works</span>
            <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 40px)' }}>Three legs. One offer.</h2>
            <p style={{ margin: 0, maxWidth: '58ch', fontSize: 17, lineHeight: 1.6, color: T.muted }}>Job search really is a sequence — so we built it like one. Check in once, board only the flights worth taking, and track every leg to the gate.</p>
          </div>
          <div className="rv stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18 }}>
            {LEGS.map((l) => (
              <div key={l.tag} style={{ padding: '28px 28px 30px', background: 'var(--jb-d-panel)', border: `1px solid ${T.line}`, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
                <span style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 6, background: T.greenTint, border: `1px solid ${T.greenTintLine}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.green }}>{l.tag}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 21, fontWeight: 700 }}>{l.title}</h3>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: T.muted }}>{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTURES BOARD (dark) */}
      <section style={{ padding: '84px 32px', background: T.dark, color: '#F5F5F5' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div className="rv" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={kick(T.greenB)}>Your departures board</span>
              <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 38px)', color: '#fff' }}>Every application, live, in one place.</h2>
            </div>
            <span style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, ...kick(T.greenB), letterSpacing: '0.1em' }}><span className="pulse" aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: T.greenB }} />Updated just now</span>
          </div>
          <div className="rv stagger" style={{ border: `1px solid ${T.darkLine}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr) 70px 130px', gap: 12, padding: '13px 22px', background: T.dark2, borderBottom: `1px solid ${T.darkLine}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B4BAB0' }}>
              <span>Role</span><span>Employer</span><span>Fit</span><span>Status</span>
            </div>
            {BOARD.map((d) => (
              <div key={d.role} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr) 70px 130px', gap: 12, alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${T.dark3}` }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5' }}>{d.role}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, background: d.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>{d.mark}</span>
                  <span style={{ fontSize: 14.5, color: 'var(--jb-d-ink-55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.employer}</span>
                </span>
                <span data-count={d.fit} style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: T.greenB }}>{d.fit}</span>
                <span style={{ justifySelf: 'start', padding: '4px 10px', borderRadius: 6, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: d.ink, background: d.bg }}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY (strip bg) */}
      <section style={{ padding: '88px 32px', background: T.strip }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="rv" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={kick(T.greenD)}>Why fly with Jobocate</span>
            <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 38px)' }}>Fewer applications. Better landings.</h2>
          </div>
          <div className="rv stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18 }}>
            {WHY.map((w) => (
              <div key={w.num} style={{ padding: '26px 28px 30px', background: 'var(--jb-d-panel)', border: `1px solid ${T.line}`, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: T.greenTint, border: `1px solid ${T.greenTintLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.green }}>{w.num}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 700 }}>{w.title}</h3>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: T.muted }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section id="compare" style={{ padding: '88px 32px' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="rv" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <span style={kick(T.greenD)}>Why Jobocate</span>
            <h2 style={{ ...h2, maxWidth: '22ch', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.14 }}>Apply to 5 roles that fit — not 50 that don’t.</h2>
            <p style={{ margin: 0, maxWidth: '60ch', fontSize: 16.5, lineHeight: 1.6, color: T.muted }}>Most job bots optimise for volume: blast applications everywhere and hope. Jobocate optimises for landing — the right roles, on your terms, with the reasoning shown.</p>
          </div>
          <div className="rv" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, alignItems: 'start' }}>
            <div style={{ padding: '26px 28px', background: 'var(--jb-d-glass)', border: `1px solid ${T.line2}`, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted2 }}>Typical auto-appliers</span>
              {COMPARE_BAD.map((c) => (<span key={c} style={{ display: 'flex', gap: 11, fontSize: 15.5, lineHeight: 1.5, color: T.muted2 }}><span aria-hidden="true" style={{ color: T.greenD }}>✕</span>{c}</span>))}
            </div>
            <div style={{ padding: '26px 28px', background: 'var(--jb-d-panel)', border: `1px solid ${T.greenTintLine}`, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 13, boxShadow: '0 24px 56px -38px rgba(39,45,37,0.45)' }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.green }}>Jobocate</span>
              {COMPARE_GOOD.map((c) => (<span key={c} style={{ display: 'flex', gap: 11, fontSize: 15.5, lineHeight: 1.5 }}><span aria-hidden="true" style={{ color: T.green }}>✓</span>{c}</span>))}
            </div>
          </div>
        </div>
      </section>

      {/* EMPLOYER (blue) */}
      <section id="employer" style={{ padding: '84px 32px', background: T.blueTint, borderTop: `1px solid ${T.blueLine}`, borderBottom: `1px solid ${T.blueLine}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 40, alignItems: 'center' }}>
          <div className="rv" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span style={kick(T.blue)}>For employers</span>
            <h2 style={{ ...h2, maxWidth: '18ch', fontSize: 'clamp(26px, 5vw, 36px)', lineHeight: 1.12 }}>Meet candidates cleared for arrival.</h2>
            <p style={{ margin: 0, maxWidth: '48ch', fontSize: 16.5, lineHeight: 1.6, color: T.blueInk }}>Post a structured role and Jobocate ranks candidates on job-related criteria — with the reasoning shown. You move from posting to shortlist without the sorting.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Link href={R.empPost} style={{ height: 46, padding: '0 22px', display: 'flex', alignItems: 'center', borderRadius: 999, background: T.blue, color: '#fff', fontSize: 15, fontWeight: 700 }}>Post a job</Link>
              <Link href={R.empTools} style={{ height: 46, padding: '0 20px', display: 'flex', alignItems: 'center', border: `1px solid ${T.blueB}`, borderRadius: 999, fontSize: 15, fontWeight: 600 }}>Explore employer tools</Link>
            </div>
          </div>
          <div className="rv" style={{ background: T.dark, border: `1px solid ${T.darkLine}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', borderBottom: `1px solid ${T.darkLine}` }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#F5F5F5' }}>Arrivals</span><span style={{ flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.blueB }}><span className="pulse" aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: T.blueB }} />3 cleared for you</span>
            </div>
            {ARRIVALS.map((v) => (
              <div key={v.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) 56px 108px', gap: 10, alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${T.dark3}` }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#F5F5F5' }}>{v.name}</span>
                <span style={{ fontSize: 13.5, color: 'var(--jb-d-ink-55)' }}>{v.role}</span>
                <span data-count={v.fit} style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.blueB }}>{v.fit}</span>
                <span style={{ justifySelf: 'start', padding: '3px 9px', borderRadius: 6, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: v.ink, background: v.bg }}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — also the /#responsible-ai target the footer links to: these
          four answers are the responsible-AI disclosure (consent before any
          application is sent, what gets verified, what employers can see). */}
      <section id="responsible-ai" style={{ padding: '88px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div className="rv" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <span style={kick(T.greenD)}>Before you board</span>
            <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 36px)' }}>Questions, answered.</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map(([q, a], i) => {
              const open = faq === i;
              return (
                <div key={q} style={{ background: 'var(--jb-d-panel)', border: `1px solid ${open ? T.greenTintLine : T.line}`, borderRadius: 14, overflow: 'hidden' }}>
                  <button type="button" onClick={() => setFaq(open ? -1 : i)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 22px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                    <span style={{ flex: 1, fontSize: 16.5, fontWeight: 600 }}>{q}</span>
                    <span aria-hidden="true" style={{ fontSize: 19, color: T.muted2 }}>{open ? '–' : '+'}</span>
                  </button>
                  {open && <p style={{ margin: 0, padding: '0 22px 20px', maxWidth: '70ch', fontSize: 15.5, lineHeight: 1.7, color: T.muted }}>{a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '0 32px 88px' }}>
        <div className="rv" style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '64px 40px', background: T.green, borderRadius: 24, textAlign: 'center' }}>
          <h2 style={{ ...h2, fontSize: 'clamp(26px, 5vw, 40px)', color: '#fff' }}>Ready for takeoff?</h2>
          <p style={{ margin: 0, maxWidth: '52ch', fontSize: 17, lineHeight: 1.6, color: T.greenTint }}>Build your pass in a few minutes and see the roles worth your time — free, and always under your control.</p>
          <Link href={R.signup} style={{ height: 52, padding: '0 28px', marginTop: 8, display: 'flex', alignItems: 'center', borderRadius: 999, background: 'var(--jb-d-panel)', color: T.greenInk, fontSize: 16, fontWeight: 700 }}>Plan my route</Link>
        </div>
      </section>
    </div>
  );
}
