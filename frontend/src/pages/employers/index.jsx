'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

/**
 * For Employers — the "Arrivals" board.
 *
 * Ported from the approved `For Employers.dc.html` mock: arrivals-panel hero,
 * trust strip, three feature cards, three numbered steps, amber closing CTA.
 *
 * Deliberate departures from the mock, carried over from the brand audit:
 *
 * - No invented customer logo strip. The previous build ran "Northwind, Lumen,
 *   Vertex, Corewave, Quanta, Brightside" under the heading "Built for how
 *   modern talent teams hire"; none of them exist.
 * - No unsourced outcome metrics ("3× faster time-to-hire", "−45% cost per
 *   hire"). The trust strip states what the product does, which is verifiable.
 * - Candidate names in the arrivals panel stay initialled, as in the mock —
 *   that is also how the real pipeline surfaces them pre-shortlist.
 */

const R = {
  postJob: `${appRoute('App Sign Up.dc.html')}?as=employer`,
  demo: appRoute('Book Demo.dc.html'),
  pricing: appRoute('Employer Pricing.dc.html'),
};

const ARRIVALS = [
  { name: 'Candidate · A.R.', role: 'Sr Product Designer', score: '44', badge: 'SHORTLISTED', bg: 'rgba(124,196,255,.16)', fg: '#7cc4ff' },
  { name: 'Candidate · M.K.', role: 'Product Designer', score: '41', badge: 'SCREENING', bg: 'rgba(242,236,219,.1)', fg: 'var(--jb-d-ink-65)' },
  { name: 'Candidate · J.T.', role: 'Design Lead', score: '42', badge: 'NEW', bg: 'rgba(143,214,163,.16)', fg: 'var(--jb-d-accent)' },
];

const TRUST = ['RANKED ON JOB-RELATED CRITERIA', 'REASONING SHOWN ON EVERY SCORE', 'VERIFIED CANDIDATES ONLY'];

const FEATURES = [
  {
    eyebrow: 'STRUCTURED ROLES',
    title: 'Post once, rank everything',
    body: 'Define the role’s real requirements once. Every applicant is scored against them — not against keyword noise.',
  },
  {
    eyebrow: 'REASONED RANKING',
    title: 'Scores you can defend',
    body: 'Every rank opens to show why — job-related criteria in plain terms, ready for your hiring record.',
  },
  {
    eyebrow: 'TWO-SIDED TRUST',
    title: 'Verified people, both ways',
    body: 'Candidates arrive with verified experience; you arrive as a verified employer. No scam listings, no ghost applicants.',
  },
];

const STEPS = [
  { num: '01', title: 'Post a structured role', body: 'Requirements, must-haves and nice-to-haves — ten minutes, guided.' },
  { num: '02', title: 'Receive ranked arrivals', body: 'Cleared candidates land in your board with the reasoning attached.' },
  { num: '03', title: 'Shortlist and meet', body: 'Move the top of the board straight to interviews — no sorting stage.' },
];

export default function ForEmployers() {
  return (
    <>
      <Head>
        <title>AI Recruiter for Employers — Hiring Platform | Jobocate</title>
        <meta
          name="description"
          content="Post a structured role and Jobocate ranks candidates on job-related criteria, with the reasoning shown. From posting to shortlist without the sorting."
        />
      </Head>

      <PublicLayout variant="employer">
        <div className="em">
          {/* ---------- HERO ---------- */}
          <section className="em__hero">
            <div className="em__herotext">
              <span className="em__eyebrow">FOR EMPLOYERS · ARRIVALS</span>
              <h1 className="em__h1">
                Meet candidates cleared <span className="jb-em">for arrival.</span>
              </h1>
              <p className="em__lede">
                Post a structured role and Jobocate ranks candidates on job-related criteria — with
                the reasoning shown. Move from posting to shortlist without the sorting.
              </p>
              <div className="em__ctas">
                <Link href={R.postJob} className="em__btn em__btn--green">Post a job</Link>
                <Link href={R.demo} className="em__btn em__btn--ghost">Book a demo</Link>
              </div>
              <span className="em__micro">FIRST ROLE FREE · NO CARD REQUIRED</span>
            </div>

            <div className="em__panel">
              <header className="em__panelhead">
                <span className="em__panelkicker">ARRIVALS — SR PRODUCT DESIGNER</span>
                <span className="em__live"><span className="em__pulse" aria-hidden="true" />3 CLEARED FOR YOU</span>
              </header>
              {ARRIVALS.map((a) => (
                <div key={a.name} className="em__arow">
                  <span className="em__aname">{a.name}</span>
                  <span className="em__arole">{a.role}</span>
                  <span className="em__ascore">{a.score}</span>
                  <span className="em__abadge" style={{ background: a.bg, color: a.fg }}>{a.badge}</span>
                </div>
              ))}
              <p className="em__panelfoot">
                Each score opens to show the reasoning — job-related criteria only.
              </p>
            </div>
          </section>

          {/* ---------- TRUST STRIP ---------- */}
          <section className="em__trust">
            {TRUST.map((t) => (
              <span key={t} className="em__trustitem">{t}</span>
            ))}
          </section>

          {/* ---------- FEATURES ---------- */}
          <section className="em__section">
            <div className="em__sechead">
              <span className="em__eyebrow">WHY JOBOCATE</span>
              <h2 className="em__h2">From posting to shortlist, without the sorting.</h2>
            </div>
            <div className="em__grid3">
              {FEATURES.map((f) => (
                <article key={f.eyebrow} className="em__card">
                  <span className="em__cardkicker">{f.eyebrow}</span>
                  <h3 className="em__cardtitle">{f.title}</h3>
                  <p className="em__cardbody">{f.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- HOW ---------- */}
          <section className="em__howwrap">
            <div className="em__how">
              {STEPS.map((s) => (
                <div key={s.num} className="em__step">
                  <span className="em__stepnum">{s.num}</span>
                  <h3 className="em__cardtitle">{s.title}</h3>
                  <p className="em__cardbody">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- PRICING TEASER ---------- */}
          <section className="em__section em__section--tight">
            <div className="em__pricing">
              <div>
                <span className="em__eyebrow">SIMPLE PRICING</span>
                <h2 className="em__h3">Plans that scale with your hiring.</h2>
                <p className="em__cardbody">
                  From your first hire to high-volume recruiting. Job slots, seats and AI actions
                  included on every tier.
                </p>
              </div>
              <div className="em__ctas">
                <Link href={R.pricing} className="em__btn em__btn--green">See pricing →</Link>
                <Link href={R.demo} className="em__btn em__btn--ghost">Talk to sales</Link>
              </div>
            </div>
          </section>

          {/* ---------- FINAL CTA ---------- */}
          <section className="em__finalwrap">
            <div className="em__final">
              <h2 className="em__h2">
                Your next hire is <span className="jb-em">already en route.</span>
              </h2>
              <p className="em__lede em__lede--narrow">
                Post your first structured role free and see a ranked, reasoned shortlist — with the
                criteria behind every score.
              </p>
              <Link href={R.postJob} className="em__btn em__btn--amber">Post a job →</Link>
            </div>
          </section>
        </div>

        <style jsx>{`
          .em { --pad: 48px; max-width: 1280px; margin: 0 auto; font-family: var(--jb-font-sans); }
          .em :global(*) { box-sizing: border-box; }

          .em__eyebrow {
            display: block; font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500;
            letter-spacing: 0.24em; color: var(--jb-d-accent);
          }
          .em__h1 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(36px, 5vw, 62px); line-height: 1.02;
          }
          .em__h2 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(30px, 3.6vw, 46px); line-height: 1.08;
          }
          .em__h3 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(24px, 2.6vw, 32px); line-height: 1.1;
          }
          .em__lede { margin: 0; max-width: 460px; font-size: 16px; line-height: 1.65; color: var(--jb-d-ink-70); }
          .em__lede--narrow { max-width: 440px; }
          .em__micro { font-family: var(--jb-font-mono); font-size: 12px; color: var(--jb-d-ink-45); }

          .em__ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
          :global(.em__btn) {
            display: inline-flex; align-items: center; justify-content: center;
            min-height: 48px; padding: 15px 30px; border-radius: 999px;
            font-family: var(--jb-font-sans); font-size: 15px; font-weight: 700;
            text-decoration: none; border: 1.5px solid transparent;
            transition: background-color 0.18s ease, border-color 0.18s ease;
          }
          :global(.em__btn--green) { background: var(--jb-d-accent); color: var(--jb-d-bg); }
          :global(.em__btn--green:hover) { background: var(--jb-d-accent-hi); }
          :global(.em__btn--ghost) { border-color: var(--jb-d-line-btn); color: var(--jb-d-ink); font-weight: 600; }
          :global(.em__btn--ghost:hover) { border-color: var(--jb-d-accent); }
          :global(.em__btn--amber) { background: var(--jb-d-amber); color: var(--jb-d-bg); margin-top: 6px; }
          :global(.em__btn--amber:hover) { background: var(--jb-d-amber-hi); }

          /* ---- hero ---- */
          .em__hero {
            padding: 64px var(--pad) 48px;
            display: grid; grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
            gap: 48px; align-items: center;
          }
          .em__herotext { display: flex; flex-direction: column; gap: 20px; }

          .em__panel {
            background: var(--jb-d-panel-solid); border: 1px solid var(--jb-d-line-card);
            border-radius: 14px; overflow: hidden;
          }
          .em__panelhead {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
            padding: 15px 22px; border-bottom: 1px solid var(--jb-d-line); flex-wrap: wrap;
          }
          .em__panelkicker {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.18em; color: var(--jb-d-accent);
          }
          .em__live {
            display: flex; align-items: center; gap: 7px;
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500; color: var(--jb-d-ink-55);
          }
          .em__pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--jb-d-accent); animation: emPulse 1.6s infinite; }
          @keyframes emPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

          .em__arow {
            display: grid; grid-template-columns: 1fr 1.2fr 0.4fr auto; gap: 12px; align-items: center;
            padding: 15px 22px; border-bottom: 1px solid var(--jb-d-line);
            font-size: 13px; font-weight: 500;
          }
          .em__aname { color: var(--jb-d-ink-85); }
          .em__arole { color: var(--jb-d-ink-65); }
          .em__ascore { font-family: var(--jb-font-display); font-size: 20px; color: var(--jb-d-accent); }
          .em__abadge {
            font-family: var(--jb-font-mono); font-size: 10px; font-weight: 600;
            letter-spacing: 0.12em; padding: 4px 9px; border-radius: 3px; white-space: nowrap;
          }
          .em__panelfoot { margin: 0; padding: 14px 22px; font-size: 12px; color: var(--jb-d-ink-55); }

          /* ---- trust ---- */
          .em__trust {
            margin: 0 var(--pad); display: flex; justify-content: center; flex-wrap: wrap;
            border-top: 1px solid var(--jb-d-line-card); border-bottom: 1px solid var(--jb-d-line-card);
          }
          .em__trustitem {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500;
            letter-spacing: 0.16em; color: var(--jb-d-ink-65);
            padding: 14px 28px; border-right: 1px solid var(--jb-d-line);
          }
          .em__trustitem:last-child { border-right: none; }

          /* ---- features ---- */
          .em__section { padding: 64px var(--pad); display: flex; flex-direction: column; gap: 32px; }
          .em__section--tight { padding-top: 0; }
          .em__sechead { display: flex; flex-direction: column; gap: 10px; }
          .em__grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 18px; }
          .em__card {
            background: var(--jb-d-glass); border: 1px solid var(--jb-d-line-glass);
            border-radius: 12px; padding: 26px;
            display: flex; flex-direction: column; gap: 11px;
            transition: border-color 0.18s ease;
          }
          .em__card:hover { border-color: var(--jb-d-accent); }
          .em__cardkicker {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.18em; color: var(--jb-d-accent);
          }
          .em__cardtitle { margin: 0; font-family: var(--jb-font-sans); font-size: 18px; font-weight: 700; letter-spacing: 0; }
          .em__cardbody { margin: 0; font-size: 14px; line-height: 1.6; color: var(--jb-d-ink-65); }

          /* ---- how ---- */
          .em__howwrap { padding: 0 var(--pad); }
          .em__how {
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-card);
            border-radius: 14px; padding: 40px;
            display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 28px;
          }
          .em__step { display: flex; flex-direction: column; gap: 10px; }
          .em__stepnum { font-family: var(--jb-font-display); font-size: 30px; font-style: italic; color: var(--jb-d-accent); }

          /* ---- pricing teaser ---- */
          .em__pricing {
            background: var(--jb-d-glass-hi); border: 1px solid var(--jb-d-line-card);
            border-radius: 16px; padding: 40px;
            display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
          }
          .em__pricing > div:first-child { display: flex; flex-direction: column; gap: 10px; max-width: 560px; }

          /* ---- final ---- */
          .em__finalwrap { padding: 0 var(--pad) 64px; }
          .em__final {
            border: 1px solid var(--jb-d-line-strong);
            background: radial-gradient(ellipse at 50% 120%, rgba(143, 214, 163, 0.25), transparent 70%);
            border-radius: 16px; padding: 56px var(--pad);
            display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
          }

          @media (max-width: 760px) {
            .em { --pad: 20px; }
            .em__hero { padding: 36px var(--pad) 32px; gap: 28px; }
            .em__ctas { flex-direction: column; width: 100%; }
            :global(.em__btn) { width: 100%; }
            .em__trust { border: none; gap: 8px; margin: 0; padding: 0 var(--pad); justify-content: flex-start; }
            .em__trustitem {
              border: 1px solid var(--jb-d-line-strong); border-radius: 999px;
              padding: 7px 13px; font-size: 11px; letter-spacing: 0.12em;
            }
            .em__section { padding: 36px var(--pad); }
            .em__how { padding: 24px; }
            .em__pricing { padding: 24px; }
            .em__final { padding: 36px 24px; }
            .em__arow {
              grid-template-columns: 1fr auto;
              grid-template-areas: 'name score' 'role badge';
            }
            .em__aname { grid-area: name; }
            .em__arole { grid-area: role; }
            .em__ascore { grid-area: score; justify-self: end; }
            .em__abadge { grid-area: badge; justify-self: end; }
          }
        `}</style>
      </PublicLayout>
    </>
  );
}
