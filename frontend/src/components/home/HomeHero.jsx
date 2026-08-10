'use client';

import { Container, Display, Button, Pill } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';
import { CANDIDATE_PREVIEW, EMPLOYER_PREVIEW } from '@/lib/homePreviewData';

/**
 * Two-audience hero.
 *
 * The switcher swaps the supporting copy and the product preview in place — it
 * never navigates, so a visitor can compare both sides without losing the page.
 * Implemented as a real ARIA tablist so it is keyboard-operable (arrows + Home/
 * End) rather than a hover affordance.
 */

function Frame({ label, children }) {
  return (
    <div className="frame">
      <div className="frame__chrome" aria-hidden="true">
        <span className="frame__dot" />
        <span className="frame__dot" />
        <span className="frame__dot" />
        <span className="frame__url">{label}</span>
      </div>
      <div className="frame__body">{children}</div>

      <style jsx>{`
        .frame {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          box-shadow: var(--jb-shadow-lg);
          overflow: hidden;
        }
        .frame__chrome {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--jb-border-soft);
          background: var(--jb-surface);
        }
        .frame__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--jb-border-strong);
        }
        .frame__url {
          margin-left: 10px;
          flex: 1;
          background: var(--jb-surface-alt);
          border-radius: 6px;
          padding: 5px 12px;
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .frame__body {
          padding: var(--jb-space-4);
        }
      `}</style>
    </div>
  );
}

function Meter({ value, label }) {
  return (
    <div className="meter">
      <div className="meter__top">
        <span className="meter__label">{label}</span>
        <span className="meter__val">{value}%</span>
      </div>
      <div
        className="meter__track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="meter__fill" style={{ width: `${value}%` }} />
      </div>
      <style jsx>{`
        .meter__top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .meter__label {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-body);
        }
        .meter__val {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-accent-text);
        }
        .meter__track {
          height: 8px;
          border-radius: 999px;
          background: var(--jb-surface-alt);
          overflow: hidden;
        }
        .meter__fill {
          height: 100%;
          border-radius: 999px;
          background: var(--jb-accent);
        }
      `}</style>
    </div>
  );
}

function CandidatePreview() {
  const p = CANDIDATE_PREVIEW;
  return (
    <Frame label="app.jobocate.com/dashboard">
      <Meter value={p.profileComplete} label="Profile completeness" />
      <p className="hint">{p.profileNext}</p>

      <div className="row">
        <Pill tone="verified" icon="✓">
          Resume ready
        </Pill>
        <span className="rownote">{p.resumeNote}</span>
      </div>

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">Waiting for your approval</span>
          <Pill tone="warn" icon="●">
            {p.pendingApproval.length} to review
          </Pill>
        </div>
        {p.pendingApproval.map((a) => (
          <div key={a.role} className="appr">
            <span className="appr__text">
              <span className="appr__role">{a.role}</span>
              <span className="appr__emp">{a.employer}</span>
            </span>
            <span className="appr__match">{a.match}%</span>
          </div>
        ))}
        <p className="panel__foot">
          Auto-apply is on · review required · {p.autoApply.usedToday}/{p.autoApply.dailyCap} today ·{' '}
          {p.autoApply.threshold}%+ match only
        </p>
      </div>

      <div className="pipe">
        {p.pipeline.map((s) => (
          <div key={s.stage} className="pipe__cell">
            <span className="pipe__n">{s.count}</span>
            <span className="pipe__s">{s.stage}</span>
          </div>
        ))}
      </div>

      <div className="iv">
        <span className="iv__dot" aria-hidden="true" />
        <span>
          <strong>{p.interview.when}</strong> · {p.interview.round} · {p.interview.employer}
        </span>
      </div>

      <style jsx>{`
        .hint {
          margin: 8px 0 14px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .rownote {
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .panel {
          border: 1px solid var(--jb-border-soft);
          border-radius: var(--jb-radius);
          padding: 12px;
          margin-bottom: 14px;
        }
        .panel__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .panel__title {
          font-size: var(--jb-text-sm);
          font-weight: 700;
        }
        .appr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 0;
          border-top: 1px solid var(--jb-border-soft);
        }
        .appr__text {
          min-width: 0;
        }
        .appr__role {
          display: block;
          font-size: var(--jb-text-sm);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .appr__emp {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }
        .appr__match {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-accent-text);
          flex-shrink: 0;
        }
        .panel__foot {
          margin: 10px 0 0;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
          line-height: 1.5;
        }
        .pipe {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
          gap: 6px;
          margin-bottom: 12px;
        }
        .pipe__cell {
          background: var(--jb-surface-sunk);
          border-radius: 10px;
          padding: 9px;
          text-align: center;
        }
        .pipe__n {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: 18px;
          font-weight: 600;
        }
        .pipe__s {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }
        .iv {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-body);
          background: var(--jb-tint-green);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .iv__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--jb-accent-text);
          flex-shrink: 0;
        }
      `}</style>
    </Frame>
  );
}

function EmployerPreview() {
  const e = EMPLOYER_PREVIEW;
  return (
    <Frame label="app.jobocate.com/employer/candidates">
      <div className="stats">
        <div className="stat">
          <span className="stat__n">{e.activeJobs}</span>
          <span className="stat__l">Active jobs</span>
        </div>
        <div className="stat">
          <span className="stat__n">{e.qualified}</span>
          <span className="stat__l">Qualified candidates</span>
        </div>
        <div className="stat stat--hi">
          <span className="stat__n">{e.timeToShortlist}</span>
          <span className="stat__l">Time to shortlist</span>
        </div>
      </div>
      <p className="hint">{e.timeToShortlistNote}</p>

      <div className="panel">
        <span className="panel__title">Ranked candidates</span>
        {e.candidates.map((c) => (
          <div key={c.initials} className="cand">
            <span className="cand__av" aria-hidden="true">
              {c.initials}
            </span>
            <span className="cand__text">
              <span className="cand__name">{c.alias}</span>
              <span className="cand__why">{c.why}</span>
            </span>
            <span className="cand__right">
              <span className="cand__match">{c.match}%</span>
              <span className="cand__stage">{c.stage}</span>
            </span>
          </div>
        ))}
        <p className="panel__foot">
          Ranked on job-related criteria only — skills, experience, availability.
        </p>
      </div>

      <div className="pipe">
        {e.stages.map((s) => (
          <div key={s.stage} className="pipe__cell">
            <span className="pipe__n">{s.count}</span>
            <span className="pipe__s">{s.stage}</span>
          </div>
        ))}
      </div>

      <div className="iv">
        <span className="iv__dot" aria-hidden="true" />
        <span>
          <strong>{e.interview.when}</strong> · {e.interview.round} · {e.interview.who}
        </span>
      </div>

      <style jsx>{`
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: 6px;
          margin-bottom: 8px;
        }
        .stat {
          background: var(--jb-surface-sunk);
          border-radius: 10px;
          padding: 10px;
        }
        .stat--hi {
          background: var(--jb-employer-tint);
        }
        .stat__n {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: 19px;
          font-weight: 600;
        }
        .stat__l {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }
        .hint {
          margin: 0 0 14px;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
        }
        .panel {
          border: 1px solid var(--jb-border-soft);
          border-radius: var(--jb-radius);
          padding: 12px;
          margin-bottom: 14px;
        }
        .panel__title {
          display: block;
          font-size: var(--jb-text-sm);
          font-weight: 700;
          margin-bottom: 10px;
        }
        .cand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-top: 1px solid var(--jb-border-soft);
        }
        .cand__av {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--jb-employer-tint);
          color: var(--jb-employer-text);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--jb-text-xs);
          font-weight: 700;
          flex-shrink: 0;
        }
        .cand__text {
          flex: 1;
          min-width: 0;
        }
        .cand__name {
          display: block;
          font-size: var(--jb-text-sm);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cand__why {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cand__right {
          text-align: right;
          flex-shrink: 0;
        }
        .cand__match {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-employer-text);
        }
        .cand__stage {
          display: block;
          font-size: 11px;
          color: var(--jb-ink-subtle);
        }
        .panel__foot {
          margin: 10px 0 0;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
          line-height: 1.5;
        }
        .pipe {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
          gap: 6px;
          margin-bottom: 12px;
        }
        .pipe__cell {
          background: var(--jb-surface-sunk);
          border-radius: 10px;
          padding: 9px;
          text-align: center;
        }
        .pipe__n {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: 18px;
          font-weight: 600;
        }
        .pipe__s {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }
        .iv {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-body);
          background: var(--jb-employer-tint);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .iv__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--jb-employer-text);
          flex-shrink: 0;
        }
      `}</style>
    </Frame>
  );
}

const COPY = {
  candidate: {
    lead: 'Jobocate matches you to roles that actually fit, tailors every application from your real experience, and never sends anything you have not approved.',
  },
  employer: {
    lead: 'Publish a structured role, get candidates ranked on job-related criteria with the reasoning shown, and move from posting to shortlist without the sorting.',
  },
};

export default function HomeHero({ audience, onAudienceChange }) {
  const isEmployer = audience === 'employer';

  const onKeyDown = (e) => {
    const order = ['candidate', 'employer'];
    const i = order.indexOf(audience);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onAudienceChange(order[(i + 1) % order.length]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onAudienceChange(order[(i + order.length - 1) % order.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onAudienceChange(order[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onAudienceChange(order[order.length - 1]);
    }
  };

  return (
    <section className="hero" aria-labelledby="hero-h">
      <Container>
        <div className="hero__inner">
          <div className="hero__copy">
          <p className="hero__eyebrow">
            <span className="hero__pulse" aria-hidden="true" />
            AI career and hiring platform
          </p>

          <Display level={1} size="xl" id="hero-h" className="hero__title">
            Find the right opportunity.{' '}
            <span className="hero__mark">Hire the right person.</span>
          </Display>

          <p className="hero__lead">{isEmployer ? COPY.employer.lead : COPY.candidate.lead}</p>

          {/* Audience switcher — swaps copy + preview, never navigates. */}
          <div
            className="switch"
            role="tablist"
            aria-label="Choose your audience"
            onKeyDown={onKeyDown}
          >
            <button
              type="button"
              role="tab"
              id="tab-candidate"
              aria-selected={!isEmployer}
              aria-controls="panel-candidate"
              tabIndex={isEmployer ? -1 : 0}
              className={`switch__btn ${!isEmployer ? 'is-on' : ''}`}
              onClick={() => onAudienceChange('candidate')}
            >
              I&apos;m looking for a job
            </button>
            <button
              type="button"
              role="tab"
              id="tab-employer"
              aria-selected={isEmployer}
              aria-controls="panel-employer"
              tabIndex={isEmployer ? 0 : -1}
              className={`switch__btn ${isEmployer ? 'is-on is-employer' : ''}`}
              onClick={() => onAudienceChange('employer')}
            >
              I&apos;m hiring
            </button>
          </div>

          <div className="hero__ctas">
            {isEmployer ? (
              <>
                <Button href={appRoute('Employer Post Job.dc.html')} variant="employer" size="lg">
                  Post a job
                </Button>
                <Button href={appRoute('For Employers.dc.html')} variant="secondary" size="lg">
                  Explore employer tools
                </Button>
              </>
            ) : (
              <>
                <Button href={appRoute('Browse Jobs.dc.html')} variant="accent" size="lg">
                  Find jobs and apply
                </Button>
                <Button href="#how-it-works" variant="secondary" size="lg">
                  See how Jobocate works
                </Button>
              </>
            )}
          </div>

          <p className="hero__cross">
            {isEmployer ? (
              <>
                Looking for a job instead?{' '}
                <button type="button" className="hero__link" onClick={() => onAudienceChange('candidate')}>
                  See the candidate side
                </button>
              </>
            ) : (
              <>
                Hiring instead?{' '}
                <button type="button" className="hero__link" onClick={() => onAudienceChange('employer')}>
                  See the employer side
                </button>
              </>
            )}
          </p>
          </div>

          <div className="hero__collage">
            {/* Flat solid color shapes (no gradients) — the frosted frame
                refracts them into soft tints; toned down, mostly behind glass. */}
            <span className="collage-shape collage-shape--g" aria-hidden="true" />
            <span className="collage-shape collage-shape--c" aria-hidden="true" />
            <div className="hero__preview">
              <div
                id="panel-candidate"
                role="tabpanel"
                aria-labelledby="tab-candidate"
                hidden={isEmployer}
              >
                {!isEmployer && <CandidatePreview />}
              </div>
              <div
                id="panel-employer"
                role="tabpanel"
                aria-labelledby="tab-employer"
                hidden={!isEmployer}
              >
                {isEmployer && <EmployerPreview />}
              </div>
            </div>

            {/* Floating stat chips — decorative depth cues, Gusto-style collage. */}
            {isEmployer ? (
              <>
                <div className="float float--tl" aria-hidden="true">
                  <span className="float__dot float__dot--g" />
                  <span className="float__txt">
                    <strong>96% match</strong>
                    <em>Top-ranked candidate</em>
                  </span>
                </div>
                <div className="float float--br" aria-hidden="true">
                  <span className="float__dot float__dot--b" />
                  <span className="float__txt">
                    <strong>Shortlisted</strong>
                    <em>3 moved to interview</em>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="float float--tl" aria-hidden="true">
                  <span className="float__dot float__dot--g" />
                  <span className="float__txt">
                    <strong>94% match</strong>
                    <em>Senior Product Designer</em>
                  </span>
                </div>
                <div className="float float--br" aria-hidden="true">
                  <span className="float__dot float__dot--c" />
                  <span className="float__txt">
                    <strong>Auto-applied</strong>
                    <em>You approved · 2 today</em>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>

      <style jsx>{`
        .hero {
          position: relative;
          background: var(--jb-ivory);
          color: var(--jb-ink);
          padding-block: clamp(48px, 6vw, 88px) clamp(40px, 5vw, 72px);
          isolation: isolate;
        }
        .hero__inner {
          position: relative;
          display: grid;
          grid-template-columns: 1.02fr 0.98fr;
          gap: clamp(32px, 4vw, 56px);
          align-items: center;
        }
        .hero__inner :global(.hero__title) {
          max-width: 15ch;
        }
        .hero__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: var(--jb-glass);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border: 1px solid var(--jb-glass-edge);
          box-shadow: var(--jb-glass-shadow-sm);
          border-radius: var(--jb-radius-pill);
          padding: 8px 15px;
          margin: 0 0 var(--jb-space-6);
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--jb-ink-body);
        }
        .hero__pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--jb-accent);
          box-shadow: 0 0 0 4px rgba(31, 164, 106, 0.18);
        }
        /* Match the mockup: the phrase is solid green text (no highlight slab,
           no gradient) — the "Hire the right person." emphasis. */
        .hero__mark {
          color: var(--jb-accent-text);
        }

        .switch {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          background: var(--jb-glass);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border: 1px solid var(--jb-glass-edge);
          box-shadow: var(--jb-glass-shadow-sm);
          border-radius: var(--jb-radius-pill);
          margin-bottom: var(--jb-space-5);
        }
        .switch__btn {
          appearance: none;
          border: none;
          background: transparent;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
          padding: 10px 16px;
          min-height: 44px;
          border-radius: var(--jb-radius-pill);
          cursor: pointer;
          transition: background-color var(--jb-dur) var(--jb-ease), color var(--jb-dur) var(--jb-ease);
        }
        .switch__btn:hover {
          color: var(--jb-ink);
        }
        .switch__btn.is-on {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .switch__btn.is-on.is-employer {
          background: var(--jb-employer);
          color: #fff;
        }
        .switch__btn:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }

        .hero__lead {
          font-size: var(--jb-text-lg);
          line-height: 1.6;
          color: var(--jb-ink-body);
          max-width: 46ch;
          margin: var(--jb-space-5) 0 var(--jb-space-6);
        }
        .hero__ctas {
          display: flex;
          gap: var(--jb-space-3);
          flex-wrap: wrap;
          justify-content: flex-start;
          margin-bottom: var(--jb-space-4);
        }
        .hero__cross {
          margin: 0 0 var(--jb-space-12);
          font-size: var(--jb-text-base);
          color: var(--jb-ink-muted);
        }
        .hero__link {
          appearance: none;
          background: none;
          border: none;
          padding: 4px 2px;
          font: inherit;
          font-weight: 700;
          color: var(--jb-accent-text);
          text-decoration: underline;
          cursor: pointer;
        }
        .hero__link:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }

        /* Centered product collage — the Frame is the centerpiece; floating stat
           chips add Gusto-style layered depth. Chips are aria-hidden decoration. */
        .hero__collage {
          position: relative;
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }
        .hero__preview {
          position: relative;
          z-index: 1;
          animation: rise var(--jb-dur-slow) var(--jb-ease) both;
        }
        /* Frost the product frame so the flat shapes behind read as soft tint. */
        .hero__collage :global(.frame) {
          background: var(--jb-glass);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border-color: var(--jb-glass-edge);
          box-shadow: var(--jb-glass-shadow);
        }
        .hero__collage :global(.frame__chrome) {
          background: transparent;
          border-bottom-color: rgba(255, 255, 255, 0.5);
        }
        /* Flat solid color circles — no gradients; ~60% tucked behind the frame. */
        .collage-shape {
          position: absolute;
          z-index: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .collage-shape--g {
          width: 380px;
          height: 380px;
          background: var(--jb-shape-green);
          top: -80px;
          right: -90px;
        }
        .collage-shape--c {
          width: 320px;
          height: 320px;
          background: var(--jb-shape-coral);
          bottom: -110px;
          left: -70px;
        }
        /* Hero secondary CTA becomes a glass button (primary stays solid green). */
        .hero__ctas :global(.jb-btn--secondary) {
          background: var(--jb-glass);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border-color: var(--jb-glass-edge);
          box-shadow: var(--jb-glass-shadow-sm);
        }
        .float {
          position: absolute;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: var(--jb-glass);
          -webkit-backdrop-filter: var(--jb-glass-blur);
          backdrop-filter: var(--jb-glass-blur);
          border: 1px solid var(--jb-glass-edge);
          border-radius: var(--jb-radius);
          box-shadow: var(--jb-glass-shadow);
          padding: 10px 14px;
          text-align: left;
          animation: floatIn var(--jb-dur-slow) var(--jb-ease) both;
        }
        .float--tl {
          top: 2%;
          left: -9%;
          animation-delay: 120ms;
        }
        .float--br {
          bottom: 10%;
          right: -8%;
          animation-delay: 220ms;
        }
        .float__dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .float__dot--g {
          background: var(--jb-accent);
        }
        .float__dot--c {
          background: var(--jb-coral);
        }
        .float__dot--b {
          background: var(--jb-employer);
        }
        .float__txt {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }
        .float__txt strong {
          font-size: var(--jb-text-sm);
          font-weight: 700;
          color: var(--jb-ink);
        }
        .float__txt em {
          font-style: normal;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 1024px) {
          .hero__inner {
            grid-template-columns: 1fr;
            gap: clamp(36px, 6vw, 56px);
          }
          .hero__collage {
            margin-top: var(--jb-space-2);
          }
          .float--tl {
            left: -2%;
          }
          .float--br {
            right: -1%;
          }
        }
        @media (max-width: 680px) {
          /* Chips would overflow narrow screens — drop the decorative layer. */
          .float {
            display: none;
          }
        }
        @media (max-width: 560px) {
          .switch {
            width: 100%;
          }
          .switch__btn {
            flex: 1;
            padding: 10px 8px;
          }
          .hero__ctas :global(.jb-btn) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
