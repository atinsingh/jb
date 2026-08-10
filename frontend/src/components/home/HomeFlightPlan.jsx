'use client';

import { useState } from 'react';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';
import { Reveal, Stagger, StaggerItem, DrawPath, PopDot, motion } from '@/components/motion';

/**
 * Marketing homepage — the "Flight Plan" direction.
 *
 * Ported from the approved mocks (`Jobocate Landing.dc.html` desktop /
 * `Jobocate Landing Mobile.dc.html` at 390px). Section order, copy, spacing and
 * palette follow those files; see
 * docs/superpowers/specs/2026-07-31-flight-plan-dark-marketing-design.md.
 *
 * Two deliberate departures from the mock:
 *
 * 1. Header and footer come from PublicLayout/SiteNav/SiteFooter rather than
 *    being inlined here. Inlining the nav is what previously gave the homepage
 *    a different menu from every other page.
 *
 * 2. The flight manifest names fictional employers. The mock lists Netflix,
 *    Airbnb, Stripe and Spotify in their own brand colours beside invented fit
 *    scores and pipeline stages, which reads as a claim about real roles at
 *    real companies. Layout is unchanged.
 *
 * Responsive strategy matches the mobile mock: the hero route arc (an SVG built
 * for a 1184-wide canvas) is replaced below 760px by a vertical timeline, and
 * every grid collapses to one column.
 */

const R = {
  signup: appRoute('App Sign Up.dc.html'),
  jobs: appRoute('Browse Jobs.dc.html'),
  employers: appRoute('For Employers.dc.html'),
  postJob: appRoute('For Employers.dc.html'),
};

const TRUST = ['ELIGIBILITY-CHECKED MATCHES', 'YOU APPROVE EVERY APPLICATION', 'FREE TO START · CANCEL ANYTIME'];

const WAYPOINTS = [
  {
    eyebrow: 'WAYPOINT 01',
    num: 'i.',
    title: 'Real matches, not keyword luck',
    body: 'Ranked on skills, experience and availability — never a black box. Every match opens to show exactly why it fits.',
  },
  {
    eyebrow: 'WAYPOINT 02',
    num: 'ii.',
    title: 'You hold every boarding pass',
    body: 'Nothing is submitted without your approval. Auto-apply, if you turn it on, files only within the limits you set.',
  },
  {
    eyebrow: 'WAYPOINT 03',
    num: 'iii.',
    title: 'Written from your real experience',
    body: 'Each application is tailored to the role from what you’ve actually done. No invented qualifications, ever.',
  },
];

// Illustrative. Fictional employers — see the component note above.
const MANIFEST = [
  { role: 'Sr Product Designer', logo: 'M', logoBg: '#4C6EF5', employer: 'Meridian', fit: '92', status: 'INTERVIEW', pct: 60, bar: 'var(--jb-d-accent)' },
  { role: 'Design Lead', logo: 'J', logoBg: '#E8590C', employer: 'Juniper', fit: '89', status: 'OFFER', pct: 95, bar: 'var(--jb-d-amber)' },
  { role: 'Frontend Engineer', logo: 'C', logoBg: '#7048E8', employer: 'Cobalt Labs', fit: '86', status: 'SCREENING', pct: 35, bar: 'var(--jb-d-accent)' },
  { role: 'Product Designer', logo: 'A', logoBg: '#0CA678', employer: 'Aster Health', fit: '84', status: 'APPLIED', pct: 15, bar: 'rgba(242,236,219,.5)' },
];

const ROUTE_STOPS = [
  { label: 'APPLIED', sub: '4 applications filed — all approved by you', state: 'done' },
  { label: 'VIEWED', sub: 'Employer opened your pass', state: 'done' },
  { label: 'YOU ARE HERE · INTERVIEW', sub: 'Sr Product Designer at Meridian — fit 92', state: 'now' },
  { label: 'FINAL ROUND', sub: 'Next leg — prep pack ready', state: 'next' },
  { label: 'OFFER', sub: 'Destination', state: 'dest' },
];

const CONS = [
  'Spray applications at any job',
  'Auto-send without asking you',
  '“95% more likely” black-box promises',
  'Hidden auto-renewals and credit packs',
  'Candidate-only — employers never see the other side',
];

const PROS = [
  'Only roles you’re actually eligible for',
  'You approve every send',
  'Every match opens to show exactly why',
  'Free forever tier · cancel anytime',
  'Two-sided: verified employers meet you directly',
];

const ARRIVALS = [
  { name: 'Candidate · A.R.', role: 'Sr Product Designer', score: '44', badge: 'SHORTLISTED', bg: 'rgba(124,196,255,.16)', fg: '#7cc4ff' },
  { name: 'Candidate · M.K.', role: 'Product Designer', score: '41', badge: 'SCREENING', bg: 'rgba(242,236,219,.1)', fg: 'var(--jb-d-ink-65)' },
  { name: 'Candidate · J.T.', role: 'Design Lead', score: '42', badge: 'NEW', bg: 'rgba(143,214,163,.16)', fg: 'var(--jb-d-accent)' },
];

const FAQS = [
  ['Does Jobocate apply to jobs for me automatically?', 'Only if you turn on auto-apply — and only within the limits you set. Leave review mode on and nothing is ever submitted without your approval.'],
  ['What exactly gets verified?', 'Your work history, skills and availability — built from what you’ve actually done. We never invent a qualification you don’t have.'],
  ['Is it really free to start?', 'Yes. Matching, the tracker and one resume version are free forever. Upgrading adds auto-apply and higher limits, and you can cancel anytime.'],
  ['Do employers see everything about me?', 'No. Employers see only what’s relevant to the role they posted. You control your profile and every application it travels on.'],
];

export default function HomeFlightPlan() {
  const [faq, setFaq] = useState(0);

  return (
    <div className="fp">
      {/* ---------------- HERO ---------------- */}
      <motion.section
        className="fp__hero"
        initial="hidden"
        animate="shown"
        variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.09 } } }}
      >
        <StaggerItem as="span" className="fp__eyebrow">FLIGHT PLAN · APPLY → INTERVIEW → OFFER</StaggerItem>
        <StaggerItem as="h1" className="fp__h1">
          The shortest flight path to <span className="jb-em">an offer.</span>
        </StaggerItem>
        <StaggerItem as="p" className="fp__lede">
          Jobocate charts your job search — where you are, what&rsquo;s next, and the roles most
          likely to take you all the way. Every waypoint explained, every send approved by you.
        </StaggerItem>
        <StaggerItem className="fp__ctas">
          <Link href={R.signup} className="fp__btn fp__btn--green">Chart my route</Link>
          <Link href={R.jobs} className="fp__btn fp__btn--ghost">Browse open roles</Link>
        </StaggerItem>
        <StaggerItem as="span" className="fp__micro">FREE TO START — NOTHING SENDS WITHOUT YOUR SAY-SO</StaggerItem>
      </motion.section>

      {/* ---------------- ROUTE ---------------- */}
      {/* Desktop: the arc. Mobile: the same five stops as a vertical timeline,
          because the 1184-wide viewBox cannot carry legible labels at 390px. */}
      <section className="fp__route" aria-label="A sample application journey">
        <svg className="fp__arc" viewBox="0 0 1184 300" fill="none" role="img" aria-label="Route from applied through interview to offer">
          <path d="M40 250 C 300 240, 420 150, 592 130 C 780 110, 980 70, 1144 50" stroke="var(--jb-d-ink-45)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
          <DrawPath d="M40 250 C 300 240, 420 150, 592 130" stroke="var(--jb-d-accent)" strokeWidth="2.5" strokeLinecap="round" />
          <PopDot delay={0.15} cx="40" cy="250" r="7" fill="var(--jb-d-accent)" />
          <PopDot delay={0.45} cx="349" cy="194" r="7" fill="var(--jb-d-accent)" />
          <PopDot delay={0.85} cx="592" cy="130" r="9" fill="var(--jb-d-ink)" />
          <circle cx="592" cy="130" r="16" stroke="var(--jb-d-ink)" strokeOpacity=".4" strokeWidth="1.5" />
          <PopDot delay={1.05} cx="877" cy="90" r="7" fill="none" stroke="var(--jb-d-ink-55)" strokeWidth="2" />
          <PopDot delay={1.25} cx="1144" cy="50" r="7" fill="none" stroke="var(--jb-d-amber)" strokeWidth="2.5" />
          <text x="40" y="284" fill="var(--jb-d-ink-65)" fontFamily="var(--jb-font-mono)" fontSize="11" letterSpacing="2" textAnchor="middle">APPLIED</text>
          <text x="349" y="228" fill="var(--jb-d-ink-65)" fontFamily="var(--jb-font-mono)" fontSize="11" letterSpacing="2" textAnchor="middle">VIEWED</text>
          <text x="592" y="96" fill="var(--jb-d-ink)" fontFamily="var(--jb-font-mono)" fontSize="12" letterSpacing="2" textAnchor="middle" fontWeight="600">YOU ARE HERE · INTERVIEW</text>
          <text x="877" y="124" fill="var(--jb-d-ink-65)" fontFamily="var(--jb-font-mono)" fontSize="11" letterSpacing="2" textAnchor="middle">FINAL ROUND</text>
          <text x="1144" y="84" fill="var(--jb-d-amber)" fontFamily="var(--jb-font-mono)" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="600">OFFER</text>
        </svg>

        <ol className="fp__timeline">
          {ROUTE_STOPS.map((s, i) => (
            <li key={s.label} className={`fp__stop fp__stop--${s.state}`}>
              <span className="fp__stopdot" aria-hidden="true" />
              {i < ROUTE_STOPS.length - 1 && <span className="fp__stopline" aria-hidden="true" />}
              <span className="fp__stoplabel">{s.label}</span>
              <span className="fp__stopsub">{s.sub}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- TRUST STRIP ---------------- */}
      <section className="fp__trust">
        {TRUST.map((t) => (
          <span key={t} className="fp__trustitem">{t}</span>
        ))}
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="fp__section" id="legs">
        <Reveal className="fp__sechead">
          <div>
            <span className="fp__eyebrow">HOW IT WORKS</span>
            <h2 className="fp__h2">Three waypoints. One offer.</h2>
          </div>
          <p className="fp__secnote">
            Job search is a sequence — so we built it like one. Check in once, board only the
            flights worth taking.
          </p>
        </Reveal>
        <Stagger className="fp__grid3">
          {WAYPOINTS.map((w) => (
            <StaggerItem as="article" key={w.eyebrow} className="fp__card">
              <div className="fp__cardtop">
                <span className="fp__cardkicker">{w.eyebrow}</span>
                <span className="fp__cardnum">{w.num}</span>
              </div>
              <h3 className="fp__cardtitle">{w.title}</h3>
              <p className="fp__cardbody">{w.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---------------- FLIGHT MANIFEST ---------------- */}
      <section className="fp__panelwrap" aria-labelledby="fp-manifest">
        <Reveal className="fp__panel">
          <header className="fp__panelhead">
            <div>
              <span className="fp__cardkicker" id="fp-manifest">FLIGHT MANIFEST — YOUR APPLICATIONS</span>
              <span className="fp__panelsub">Every application, live, in one place. Example shown.</span>
            </div>
            <span className="fp__live"><span className="fp__pulse" aria-hidden="true" />UPDATED JUST NOW</span>
          </header>
          {MANIFEST.map((m) => (
            <div key={m.role} className="fp__mrow">
              <span className="fp__mrole">{m.role}</span>
              <span className="fp__memployer">
                <span className="fp__mlogo" style={{ background: m.logoBg }} aria-hidden="true">{m.logo}</span>
                {m.employer}
              </span>
              <span className="fp__mfit">{m.fit}</span>
              <div className="fp__mprog">
                <div className="fp__mproglabel"><span>{m.status}</span><span>{m.pct}%</span></div>
                <div className="fp__mtrack"><div className="fp__mbar" style={{ width: `${m.pct}%`, background: m.bar }} /></div>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------------- COMPARISON ---------------- */}
      <section className="fp__section" id="compare">
        <Reveal className="fp__center">
          <h2 className="fp__h2">
            Apply to 5 roles that fit — <span className="jb-em">not 50 that don&rsquo;t.</span>
          </h2>
          <p className="fp__lede fp__lede--narrow">
            Most job bots optimise for volume: blast applications everywhere and hope. Jobocate
            optimises for landing — the right roles, on your terms, with the reasoning shown.
          </p>
        </Reveal>
        <Stagger className="fp__grid2">
          <StaggerItem className="fp__compare fp__compare--bad">
            <span className="fp__comparekicker fp__comparekicker--muted">STANDBY — TYPICAL AUTO-APPLIERS</span>
            {CONS.map((c) => (
              <span key={c} className="fp__compareitem"><span className="fp__x" aria-hidden="true">✕</span>{c}</span>
            ))}
          </StaggerItem>
          <StaggerItem className="fp__compare fp__compare--good">
            <span className="fp__comparekicker">DIRECT — JOBOCATE</span>
            {PROS.map((p) => (
              <span key={p} className="fp__compareitem fp__compareitem--good"><span className="fp__tick" aria-hidden="true">✓</span>{p}</span>
            ))}
          </StaggerItem>
        </Stagger>
      </section>

      {/* ---------------- EMPLOYERS ---------------- */}
      <section className="fp__panelwrap" id="employer">
        <Reveal className="fp__employer">
          <div>
            <span className="fp__eyebrow">FOR EMPLOYERS</span>
            <h2 className="fp__h3">Meet candidates cleared for arrival.</h2>
            <p className="fp__cardbody">
              Post a structured role and Jobocate ranks candidates on job-related criteria — with
              the reasoning shown. From posting to shortlist without the sorting.
            </p>
            <div className="fp__ctas fp__ctas--tight">
              <Link href={R.postJob} className="fp__btn fp__btn--cream">Post a job</Link>
              <Link href={R.employers} className="fp__btn fp__btn--ghost">Explore employer tools</Link>
            </div>
          </div>
          <div className="fp__arrivals">
            <header className="fp__panelhead fp__panelhead--tight">
              <span className="fp__cardkicker">ARRIVALS</span>
              <span className="fp__live">● 3 CLEARED FOR YOU</span>
            </header>
            {ARRIVALS.map((a) => (
              <div key={a.name} className="fp__arow">
                <span className="fp__aname">{a.name}</span>
                <span className="fp__arole">{a.role}</span>
                <span className="fp__ascore">{a.score}</span>
                <span className="fp__abadge" style={{ background: a.bg, color: a.fg }}>{a.badge}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="fp__faqwrap" id="responsible-ai">
        <h2 className="fp__h2 fp__h2--center">
          Questions, <span className="jb-em">answered.</span>
        </h2>
        <div className="fp__faqs">
          {FAQS.map(([q, a], i) => {
            const open = faq === i;
            return (
              <div key={q} className="fp__faq">
                <button
                  type="button"
                  className="fp__faqq"
                  aria-expanded={open}
                  aria-controls={`fp-faq-${i}`}
                  onClick={() => setFaq(open ? -1 : i)}
                >
                  <span>{q}</span>
                  <span className="fp__faqicon" aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && <p className="fp__faqa" id={`fp-faq-${i}`}>{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- FINAL CALL ---------------- */}
      <section className="fp__finalwrap">
        <Reveal className="fp__final">
          <span className="fp__eyebrow">FINAL CALL</span>
          <h2 className="fp__h2">
            Cleared for <span className="jb-em">takeoff.</span>
          </h2>
          <p className="fp__lede fp__lede--narrow">
            Build your pass in a few minutes and see the roles worth your time — free, and always
            under your control.
          </p>
          <Link href={R.signup} className="fp__btn fp__btn--amber">Chart my route →</Link>
          <span className="fp__micro">FREE FOREVER TIER · CANCEL ANYTIME</span>
        </Reveal>
      </section>

      <style jsx>{`
        .fp {
          --pad: 48px;
          --maxw: 1280px;
          font-family: var(--jb-font-sans);
        }
        .fp :global(*) { box-sizing: border-box; }

        /* ---- shared type ---- */
        .fp :global(.fp__eyebrow) {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.24em;
          color: var(--jb-d-accent);
        }
        .fp :global(.fp__h1) {
          margin: 0;
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: clamp(40px, 6.4vw, 80px);
          line-height: 1;
          max-width: 840px;
        }
        .fp :global(.fp__h2) {
          margin: 0;
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: clamp(30px, 3.6vw, 48px);
          line-height: 1.08;
        }
        .fp :global(.fp__h2--center) { text-align: center; }
        .fp :global(.fp__h3) {
          margin: 0;
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: clamp(26px, 2.8vw, 38px);
          line-height: 1.1;
        }
        .fp :global(.fp__lede) {
          margin: 0;
          font-size: 17px;
          line-height: 1.65;
          color: var(--jb-d-ink-70);
          max-width: 580px;
        }
        .fp :global(.fp__lede--narrow) { max-width: 540px; }
        .fp :global(.fp__micro) {
          font-family: var(--jb-font-mono);
          font-size: 12px;
          color: var(--jb-d-ink-45);
        }

        /* ---- buttons ---- */
        .fp :global(.fp__ctas) { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
        .fp :global(.fp__ctas--tight) { margin-top: 4px; }
        .fp :global(.fp__btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 15px 30px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          border: 1.5px solid transparent;
          transition: background-color 0.18s ease, border-color 0.18s ease;
        }
        :global(.fp__btn--green) { background: var(--jb-d-accent); color: var(--jb-d-bg); }
        :global(.fp__btn--green:hover) { background: var(--jb-d-accent-hi); }
        :global(.fp__btn--amber) { background: var(--jb-d-amber); color: var(--jb-d-bg); margin-top: 8px; }
        :global(.fp__btn--amber:hover) { background: var(--jb-d-amber-hi); }
        :global(.fp__btn--cream) { background: var(--jb-d-ink); color: var(--jb-d-bg); font-size: 13px; padding: 12px 22px; min-height: 44px; }
        :global(.fp__btn--ghost) { border-color: var(--jb-d-line-btn); color: var(--jb-d-ink); font-weight: 600; }
        :global(.fp__btn--ghost:hover) { border-color: var(--jb-d-accent); }

        /* ---- hero ---- */
        .fp :global(.fp__hero) {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 68px var(--pad) 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          text-align: center;
        }

        /* ---- route ---- */
        .fp :global(.fp__route) { max-width: var(--maxw); margin: 0 auto; padding: 8px var(--pad) 28px; }
        .fp :global(.fp__arc) { width: 100%; display: block; }
        .fp :global(.fp__timeline) { display: none; list-style: none; margin: 0; padding: 0; }

        /* ---- trust ---- */
        .fp :global(.fp__trust) {
          max-width: var(--maxw);
          margin: 0 auto;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          border-top: 1px solid var(--jb-d-line-card);
          border-bottom: 1px solid var(--jb-d-line-card);
        }
        .fp :global(.fp__trustitem) {
          font-family: var(--jb-font-mono);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          color: var(--jb-d-ink-65);
          padding: 14px 28px;
          border-right: 1px solid var(--jb-d-line);
        }
        .fp :global(.fp__trustitem:last-child) { border-right: none; }

        /* ---- generic section ---- */
        .fp :global(.fp__section) {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 72px var(--pad) 56px;
          display: flex;
          flex-direction: column;
          gap: 34px;
        }
        .fp :global(.fp__sechead) { display: flex; align-items: baseline; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        .fp :global(.fp__sechead > div) { display: flex; flex-direction: column; gap: 10px; }
        .fp :global(.fp__secnote) { margin: 0; font-size: 14px; line-height: 1.5; color: var(--jb-d-ink-55); max-width: 320px; }
        .fp :global(.fp__center) { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }

        .fp :global(.fp__grid3) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 18px; }
        .fp :global(.fp__grid2) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 18px; max-width: 960px; margin: 0 auto; width: 100%; }

        /* ---- glass cards ---- */
        .fp :global(.fp__card) {
          background: var(--jb-d-glass);
          border: 1px solid var(--jb-d-line-glass);
          border-radius: 12px;
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 11px;
          transition: border-color 0.18s ease;
        }
        .fp :global(.fp__card:hover) { border-color: var(--jb-d-accent); }
        .fp :global(.fp__cardtop) { display: flex; align-items: center; justify-content: space-between; }
        .fp :global(.fp__cardkicker) {
          font-family: var(--jb-font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: var(--jb-d-accent);
        }
        .fp :global(.fp__cardnum) { font-family: var(--jb-font-display); font-size: 22px; font-style: italic; color: var(--jb-d-ink-45); }
        .fp :global(.fp__cardtitle) { margin: 0; font-family: var(--jb-font-sans); font-size: 18px; font-weight: 700; letter-spacing: 0; }
        .fp :global(.fp__cardbody) { margin: 0; font-size: 14px; line-height: 1.6; color: var(--jb-d-ink-65); }

        /* ---- manifest ---- */
        .fp :global(.fp__panelwrap) { max-width: var(--maxw); margin: 0 auto; padding: 0 var(--pad); }
        .fp :global(.fp__panel) {
          background: var(--jb-d-panel);
          border: 1px solid var(--jb-d-line-card);
          border-radius: 14px;
          overflow: hidden;
        }
        .fp :global(.fp__panelhead) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 26px;
          border-bottom: 1px solid var(--jb-d-line);
          flex-wrap: wrap;
        }
        .fp :global(.fp__panelhead--tight) { padding: 13px 20px; }
        .fp :global(.fp__panelhead > div) { display: flex; flex-direction: column; gap: 4px; }
        .fp :global(.fp__panelsub) { font-size: 12px; color: var(--jb-d-ink-55); }
        .fp :global(.fp__live) {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--jb-font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--jb-d-ink-55);
        }
        .fp :global(.fp__pulse) { width: 7px; height: 7px; border-radius: 50%; background: var(--jb-d-accent); animation: fpPulse 1.6s infinite; }
        @keyframes fpPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

        .fp :global(.fp__mrow) {
          display: grid;
          grid-template-columns: 1.6fr 1fr 0.5fr 1.4fr;
          align-items: center;
          gap: 16px;
          padding: 16px 26px;
          border-bottom: 1px solid var(--jb-d-line);
        }
        .fp :global(.fp__mrow:last-child) { border-bottom: none; }
        .fp :global(.fp__mrole) { font-size: 15px; font-weight: 600; }
        .fp :global(.fp__memployer) { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--jb-d-ink-70); }
        .fp :global(.fp__mlogo) {
          width: 19px; height: 19px; flex: none;
          border-radius: 5px; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--jb-font-mono); font-size: 10px; font-weight: 700;
        }
        .fp :global(.fp__mfit) { font-family: var(--jb-font-display); font-size: 22px; color: var(--jb-d-accent); }
        .fp :global(.fp__mprog) { display: flex; flex-direction: column; gap: 6px; }
        .fp :global(.fp__mproglabel) {
          display: flex; justify-content: space-between;
          font-family: var(--jb-font-mono); font-size: 11px;
          letter-spacing: 0.1em; color: var(--jb-d-ink-55);
        }
        .fp :global(.fp__mtrack) { height: 4px; background: rgba(242, 236, 219, 0.15); border-radius: 2px; overflow: hidden; }
        .fp :global(.fp__mbar) { height: 100%; border-radius: 2px; }

        /* ---- comparison ---- */
        .fp :global(.fp__compare) { border-radius: 12px; padding: 26px; display: flex; flex-direction: column; gap: 14px; }
        .fp :global(.fp__compare--bad) { border: 1px dashed var(--jb-d-line-dashed); }
        .fp :global(.fp__compare--good) { background: var(--jb-d-accent-tint); border: 1px solid var(--jb-d-accent); }
        .fp :global(.fp__comparekicker) { font-family: var(--jb-font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: var(--jb-d-accent); }
        .fp :global(.fp__comparekicker--muted) { color: var(--jb-d-ink-55); }
        .fp :global(.fp__compareitem) { display: flex; gap: 10px; font-size: 14px; line-height: 1.5; color: var(--jb-d-ink-65); }
        .fp :global(.fp__compareitem--good) { color: var(--jb-d-ink-85); }
        .fp :global(.fp__x) { color: var(--jb-d-danger); font-weight: 700; }
        .fp :global(.fp__tick) { color: var(--jb-d-accent); font-weight: 700; }

        /* ---- employers ---- */
        .fp :global(.fp__employer) {
          background: var(--jb-d-glass-hi);
          border: 1px solid var(--jb-d-line-card);
          border-radius: 14px;
          padding: 44px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
          gap: 40px;
          align-items: center;
        }
        .fp :global(.fp__employer > div:first-child) { display: flex; flex-direction: column; gap: 14px; }
        .fp :global(.fp__arrivals) { background: var(--jb-d-panel-solid); border: 1px solid var(--jb-d-line-card); border-radius: 10px; overflow: hidden; }
        .fp :global(.fp__arow) {
          display: grid;
          grid-template-columns: 1fr 1.2fr 0.4fr auto;
          gap: 12px;
          align-items: center;
          padding: 13px 20px;
          border-bottom: 1px solid var(--jb-d-line);
          font-size: 12px;
          font-weight: 500;
        }
        .fp :global(.fp__arow:last-child) { border-bottom: none; }
        .fp :global(.fp__aname) { color: var(--jb-d-ink-85); }
        .fp :global(.fp__arole) { color: var(--jb-d-ink-65); }
        .fp :global(.fp__ascore) { font-family: var(--jb-font-display); font-size: 18px; color: var(--jb-d-accent); }
        .fp :global(.fp__abadge) {
          font-family: var(--jb-font-mono); font-size: 10px; font-weight: 600;
          letter-spacing: 0.12em; padding: 4px 9px; border-radius: 3px; white-space: nowrap;
        }

        /* ---- faq ---- */
        .fp :global(.fp__faqwrap) {
          max-width: 860px;
          margin: 0 auto;
          padding: 72px var(--pad);
          display: flex;
          flex-direction: column;
          gap: 30px;
          width: 100%;
        }
        .fp :global(.fp__faqs) { display: flex; flex-direction: column; gap: 12px; }
        .fp :global(.fp__faq) { background: var(--jb-d-glass-hi); border: 1px solid var(--jb-d-line-card); border-radius: 10px; overflow: hidden; }
        .fp :global(.fp__faqq) {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          min-height: 44px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--jb-d-ink);
        }
        .fp :global(.fp__faqq:hover) { background: rgba(242, 236, 219, 0.04); }
        .fp :global(.fp__faqicon) { font-family: var(--jb-font-display); font-size: 22px; color: var(--jb-d-accent); flex: none; }
        .fp :global(.fp__faqa) { margin: 0; padding: 0 24px 20px; font-size: 14px; line-height: 1.65; color: var(--jb-d-ink-65); max-width: 640px; }

        /* ---- final call ---- */
        .fp :global(.fp__finalwrap) { max-width: var(--maxw); margin: 0 auto; padding: 0 var(--pad) 64px; }
        .fp :global(.fp__final) {
          border: 1px solid var(--jb-d-line-strong);
          background: radial-gradient(ellipse at 50% 120%, rgba(143, 214, 163, 0.25), transparent 70%);
          border-radius: 16px;
          padding: 72px var(--pad);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }

        /* ---- mobile: match the 390px mock ---- */
        @media (max-width: 760px) {
          .fp { --pad: 20px; }
          .fp :global(.fp__hero) { padding: 40px var(--pad) 28px; gap: 16px; }
          .fp :global(.fp__ctas) { flex-direction: column; width: 100%; }
          :global(.fp__btn) { width: 100%; }
          .fp :global(.fp__arc) { display: none; }
          .fp :global(.fp__timeline) { display: flex; flex-direction: column; }
          .fp :global(.fp__route) { padding: 16px var(--pad) 36px; }
          .fp :global(.fp__stop) {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 0 0 18px 36px;
          }
          .fp :global(.fp__stopdot) {
            position: absolute; left: 0; top: 2px;
            width: 14px; height: 14px; border-radius: 50%;
            border: 2px solid var(--jb-d-accent); background: var(--jb-d-accent);
          }
          .fp :global(.fp__stop--next .fp__stopdot) { background: transparent; border-color: rgba(242, 236, 219, 0.5); }
          .fp :global(.fp__stop--dest .fp__stopdot) { background: transparent; border-color: var(--jb-d-amber); }
          .fp :global(.fp__stop--now .fp__stopdot) { background: var(--jb-d-ink); border-color: var(--jb-d-ink); }
          .fp :global(.fp__stopline) {
            position: absolute; left: 6px; top: 18px; bottom: 0;
            border-left: 2px dashed rgba(242, 236, 219, 0.35);
          }
          .fp :global(.fp__stop--done .fp__stopline) { border-left-color: var(--jb-d-accent); }
          .fp :global(.fp__stoplabel) { font-family: var(--jb-font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.16em; color: var(--jb-d-ink-65); }
          .fp :global(.fp__stop--now .fp__stoplabel) { color: var(--jb-d-ink); }
          .fp :global(.fp__stop--dest .fp__stoplabel) { color: var(--jb-d-amber); }
          .fp :global(.fp__stopsub) { font-size: 12.5px; color: var(--jb-d-ink-55); }

          .fp :global(.fp__trust) { border: none; gap: 8px; padding: 0 var(--pad) 36px; }
          .fp :global(.fp__trustitem) {
            border: 1px solid var(--jb-d-line-strong);
            border-radius: 999px;
            padding: 7px 13px;
            font-size: 11px;
            letter-spacing: 0.12em;
          }
          .fp :global(.fp__section) { padding: 36px var(--pad); gap: 22px; }
          .fp :global(.fp__secnote) { max-width: none; }
          .fp :global(.fp__employer) { padding: 24px; gap: 24px; }
          .fp :global(.fp__faqwrap) { padding: 8px var(--pad) 40px; }
          .fp :global(.fp__final) { padding: 40px 24px; }

          /* Manifest rows stack, matching the mobile mock's card treatment. */
          .fp :global(.fp__mrow) {
            grid-template-columns: 1fr auto;
            grid-template-areas: 'role fit' 'employer fit' 'prog prog';
            gap: 10px;
            padding: 15px 18px;
          }
          .fp :global(.fp__mrole) { grid-area: role; font-size: 14px; }
          .fp :global(.fp__memployer) { grid-area: employer; }
          .fp :global(.fp__mfit) { grid-area: fit; font-size: 24px; align-self: start; }
          .fp :global(.fp__mprog) { grid-area: prog; }
          .fp :global(.fp__panelhead) { padding: 15px 18px; }

          .fp :global(.fp__arow) { grid-template-columns: 1fr auto; grid-template-areas: 'name score' 'role badge'; }
          .fp :global(.fp__aname) { grid-area: name; }
          .fp :global(.fp__arole) { grid-area: role; }
          .fp :global(.fp__ascore) { grid-area: score; justify-self: end; }
          .fp :global(.fp__abadge) { grid-area: badge; justify-self: end; }
        }
      `}</style>
    </div>
  );
}
