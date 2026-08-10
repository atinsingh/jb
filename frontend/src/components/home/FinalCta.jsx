'use client';

import { Container, Button } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';

/**
 * Split final CTA — one panel per audience.
 *
 * The old page ended in a single generic "Your next role is one click away /
 * Join 100,000+ professionals" block, which spoke only to candidates and
 * asserted a user count nothing supports. Microcopy here sticks to things that
 * are true: the controls exist, matching is explained, the free plan is real.
 */

export default function FinalCta() {
  return (
    <section className="fc" aria-labelledby="fc-h">
      <Container>
        <h2 id="fc-h" className="jb-sr">
          Get started with Jobocate
        </h2>

        <div className="fc__grid">
          <div className="fc__panel fc__panel--cand">
            <p className="fc__kicker">For candidates</p>
            <p className="fc__head">Your next opportunity could be closer than you think.</p>
            <p className="fc__body">
              Build a profile, see what actually fits, and apply on your own terms.
            </p>
            <Button href={appRoute('App Sign Up.dc.html')} variant="accent" size="lg">
              Create your free profile
            </Button>
            <ul className="fc__micro">
              <li>Free plan, no card required</li>
              <li>Review every application before it sends</li>
              <li>Pause or delete at any time</li>
            </ul>
          </div>

          <div className="fc__panel fc__panel--emp">
            <p className="fc__kicker">For employers</p>
            <p className="fc__head">Your next great hire may already be here.</p>
            <p className="fc__body">
              Publish a role and meet candidates ranked against what the job actually needs.
            </p>
            <Button href={appRoute('Employer Post Job.dc.html')} variant="employer" size="lg">
              Post a job
            </Button>
            <ul className="fc__micro">
              <li>Transparent, explained matching</li>
              <li>You make every hiring decision</li>
              <li>Pay per job or subscribe</li>
            </ul>
          </div>
        </div>
      </Container>

      <style jsx>{`
        .fc {
          background: var(--jb-ivory);
          padding-block: clamp(40px, 5vw, 64px) clamp(56px, 7vw, 88px);
        }
        .fc__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--jb-space-4);
        }
        .fc__panel {
          position: relative;
          overflow: hidden;
          border-radius: var(--jb-radius-xl);
          padding: clamp(32px, 4vw, 48px);
          background: var(--jb-dark-deep);
          color: var(--jb-on-dark);
        }
        .fc__panel--cand::before,
        .fc__panel--emp::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .fc__panel--cand::before {
          background: radial-gradient(circle at 20% 120%, rgba(31, 164, 99, 0.38), transparent 62%);
        }
        .fc__panel--emp::before {
          background: radial-gradient(circle at 80% 120%, rgba(43, 74, 204, 0.42), transparent 62%);
        }
        .fc__kicker,
        .fc__head,
        .fc__body,
        .fc__micro {
          position: relative;
        }
        .fc__kicker {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 var(--jb-space-4);
        }
        .fc__panel--cand .fc__kicker {
          color: var(--jb-accent-on-dark);
        }
        .fc__panel--emp .fc__kicker {
          color: var(--jb-employer-on-dark);
        }
        .fc__head {
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: clamp(1.75rem, 2.8vw, 2.375rem);
          line-height: 1.1;
          margin: 0 0 var(--jb-space-3);
          text-wrap: balance;
        }
        .fc__body {
          font-size: var(--jb-text-base);
          line-height: 1.6;
          color: var(--jb-on-dark-muted);
          margin: 0 0 var(--jb-space-6);
          max-width: 44ch;
        }
        .fc__micro {
          list-style: none;
          margin: var(--jb-space-6) 0 0;
          padding: 0;
          display: grid;
          gap: 6px;
        }
        .fc__micro li {
          font-size: var(--jb-text-base);
          color: var(--jb-on-dark-muted);
          padding-left: 18px;
          position: relative;
        }
        .fc__micro li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--jb-accent-on-dark);
          font-weight: 700;
        }
        .fc__panel--emp .fc__micro li::before {
          color: var(--jb-employer-on-dark);
        }

        @media (max-width: 900px) {
          .fc__grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 560px) {
          .fc__panel :global(.jb-btn) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
