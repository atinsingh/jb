'use client';

import { Container, Display, Eyebrow, Button, Pill } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';

/**
 * Candidate story — four alternating outcome sections.
 *
 * Replaces the previous six identical text-only feature boxes (01–06). Each
 * step pairs copy with a small, concrete UI demonstration so the product is
 * shown rather than listed. Emphasis is on application quality and control,
 * not volume.
 */

function ProfileVisual() {
  return (
    <div className="v">
      <div className="v__row">
        <span className="v__k">Resume</span>
        <Pill tone="verified" icon="✓">
          Parsed
        </Pill>
      </div>
      <div className="v__row">
        <span className="v__k">Target roles</span>
        <span className="v__v">Product Designer, UX Engineer</span>
      </div>
      <div className="v__row">
        <span className="v__k">Locations</span>
        <span className="v__v">Berlin · Remote (EU)</span>
      </div>
      <div className="v__row">
        <span className="v__k">Minimum salary</span>
        <span className="v__v">€70,000</span>
      </div>
      <div className="v__row">
        <span className="v__k">Work authorization</span>
        <span className="v__v">EU citizen</span>
      </div>
      <div className="v__row">
        <span className="v__k">Excluded employers</span>
        <span className="v__v">2 companies hidden</span>
      </div>
      <div className="v__foot">
        <span className="v__bar">
          <span className="v__fill" style={{ width: '82%' }} />
        </span>
        <span className="v__pct">82% complete · add 2 portfolio links</span>
      </div>
      <style jsx>{`
        .v {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
          box-shadow: var(--jb-shadow);
        }
        .v__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .v__k {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
        }
        .v__v {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink);
          text-align: right;
        }
        .v__foot {
          padding-top: var(--jb-space-4);
        }
        .v__bar {
          display: block;
          height: 8px;
          border-radius: 999px;
          background: var(--jb-surface-alt);
          overflow: hidden;
          margin-bottom: 8px;
        }
        .v__fill {
          display: block;
          height: 100%;
          background: var(--jb-accent);
          border-radius: 999px;
        }
        .v__pct {
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
      `}</style>
    </div>
  );
}

function MatchVisual() {
  return (
    <div className="v">
      <div className="v__job">
        <span className="v__logo" aria-hidden="true">
          NS
        </span>
        <span className="v__jt">
          <span className="v__title">Senior Product Designer</span>
          <span className="v__emp">Northwind Studio · Berlin · Hybrid</span>
        </span>
        <span className="v__match">94%</span>
      </div>
      <ul className="v__f">
        <li>
          <span className="v__dot v__dot--s" aria-hidden="true" />
          <b>Skills</b> 8 of 9 matched <em>Strong</em>
        </li>
        <li>
          <span className="v__dot v__dot--s" aria-hidden="true" />
          <b>Experience</b> 6 yrs vs 5+ <em>Strong</em>
        </li>
        <li>
          <span className="v__dot v__dot--m" aria-hidden="true" />
          <b>Location</b> Matches Berlin + hybrid <em>Partial</em>
        </li>
      </ul>
      <div className="v__tags">
        <Pill tone="verified" icon="✓">
          Verified employer
        </Pill>
        <Pill tone="neutral">Posted 2 days ago</Pill>
        <Pill tone="neutral">Not a duplicate</Pill>
      </div>
      <style jsx>{`
        .v {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
          box-shadow: var(--jb-shadow);
        }
        .v__job {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: var(--jb-space-4);
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .v__logo {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--jb-surface-alt);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }
        .v__jt {
          flex: 1;
          min-width: 0;
        }
        .v__title {
          display: block;
          font-weight: 700;
          font-size: var(--jb-text-base);
        }
        .v__emp {
          display: block;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .v__match {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-lg);
          font-weight: 600;
          color: var(--jb-accent-text);
        }
        .v__f {
          list-style: none;
          margin: var(--jb-space-4) 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .v__f li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .v__f b {
          color: var(--jb-ink);
          min-width: 72px;
        }
        .v__f em {
          margin-left: auto;
          font-style: normal;
          font-weight: 700;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
        }
        .v__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .v__dot--s {
          background: var(--jb-accent-text);
        }
        .v__dot--m {
          background: var(--jb-warn-text);
        }
        .v__tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

function ApplyVisual() {
  return (
    <div className="v">
      <p className="v__h">Ready to send — your approval required</p>
      <div className="v__doc">
        <span className="v__doclabel">Tailored resume</span>
        <p className="v__docline">
          Led design system work across 4 product teams — <mark>emphasised for this role</mark>
        </p>
        <p className="v__note">Drawn from your profile. Nothing added that you did not write.</p>
      </div>
      <div className="v__doc">
        <span className="v__doclabel">Cover letter</span>
        <p className="v__docline">Opens on your Berlin relocation and design-systems background.</p>
      </div>
      <div className="v__actions">
        <span className="v__approve">Approve &amp; send</span>
        <span className="v__edit">Edit</span>
        <span className="v__skip">Skip this one</span>
      </div>
      <style jsx>{`
        .v {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
          box-shadow: var(--jb-shadow);
        }
        .v__h {
          margin: 0 0 var(--jb-space-4);
          font-size: var(--jb-text-sm);
          font-weight: 700;
          color: var(--jb-ink);
        }
        .v__doc {
          border: 1px solid var(--jb-border-soft);
          border-radius: var(--jb-radius);
          padding: 12px;
          margin-bottom: 10px;
        }
        .v__doclabel {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--jb-ink-subtle);
        }
        .v__docline {
          margin: 6px 0 0;
          font-size: var(--jb-text-sm);
          line-height: 1.5;
          color: var(--jb-ink-body);
        }
        .v__docline mark {
          background: rgba(31, 164, 99, 0.22);
          color: inherit;
          padding: 0 2px;
        }
        .v__note {
          margin: 8px 0 0;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
        }
        .v__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: var(--jb-space-4);
        }
        .v__approve {
          background: var(--jb-ink);
          color: var(--jb-ivory);
          font-size: var(--jb-text-sm);
          font-weight: 700;
          padding: 10px 16px;
          border-radius: var(--jb-radius-pill);
        }
        .v__edit,
        .v__skip {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
          padding: 10px 14px;
          border: 1px solid var(--jb-border-strong);
          border-radius: var(--jb-radius-pill);
        }
      `}</style>
    </div>
  );
}

function TrackVisual() {
  return (
    <div className="v">
      <ol className="v__steps">
        {[
          { s: 'Applied', d: 'Mar 4 · resume v3', on: true },
          { s: 'In review', d: 'Mar 6 · viewed by employer', on: true },
          { s: 'Interview', d: 'Thu 14:00 · portfolio review', on: true },
          { s: 'Offer', d: 'Not yet', on: false },
        ].map((x) => (
          <li key={x.s} className={x.on ? 'is-on' : ''}>
            <span className="v__mark" aria-hidden="true" />
            <span className="v__st">
              <b>{x.s}</b>
              <em>{x.d}</em>
            </span>
          </li>
        ))}
      </ol>
      <div className="v__rem">
        <span aria-hidden="true">🔔</span> Reminder: follow up with Harbour Analytics in 2 days
      </div>
      <div className="v__prep">
        <b>Interview practice</b>
        <span>3 questions drilled · feedback on specificity</span>
      </div>
      <style jsx>{`
        .v {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
          box-shadow: var(--jb-shadow);
        }
        .v__steps {
          list-style: none;
          margin: 0 0 var(--jb-space-4);
          padding: 0;
          display: grid;
          gap: 2px;
        }
        .v__steps li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px 0;
          position: relative;
        }
        .v__mark {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--jb-border-strong);
          background: var(--jb-surface);
          flex-shrink: 0;
          margin-top: 3px;
        }
        .v__steps li.is-on .v__mark {
          background: var(--jb-accent);
          border-color: var(--jb-accent);
        }
        .v__steps li:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 22px;
          bottom: -2px;
          width: 2px;
          background: var(--jb-border);
        }
        .v__st b {
          display: block;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink);
        }
        .v__st em {
          display: block;
          font-style: normal;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-muted);
        }
        .v__rem {
          background: var(--jb-surface-sunk);
          border-radius: var(--jb-radius);
          padding: 10px 12px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-body);
          margin-bottom: 10px;
        }
        .v__prep {
          background: var(--jb-tint-green);
          border-radius: var(--jb-radius);
          padding: 10px 12px;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-body);
        }
        .v__prep b {
          display: block;
        }
      `}</style>
    </div>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Build your career profile',
    body: 'Upload a resume and Jobocate extracts your skills and experience — then you correct anything it got wrong. Set target roles, locations, salary floor, work authorization, and any employers you never want to see.',
    points: ['Resume upload & parsing', 'You correct what AI extracted', 'Preferences and exclusions', 'Completeness guidance'],
    cta: { label: 'Build your profile', dc: 'Resume Builder.dc.html' },
    Visual: ProfileVisual,
  },
  {
    n: '02',
    title: 'Discover better-matched jobs',
    body: 'Every match opens to show its reasoning — skills, experience, location, preferences. Duplicate and expired listings are screened out, and unverified employers are labelled rather than hidden.',
    points: ['Explainable match factors', 'Saved searches & alerts', 'Duplicate + expired detection', 'Verified employer labels'],
    cta: { label: 'See job matching', dc: 'Job Matching.dc.html' },
    Visual: MatchVisual,
  },
  {
    n: '03',
    title: 'Apply with control',
    body: 'Apply by hand, or let auto-apply queue applications for your review. Documents are tailored from your real experience — Jobocate never invents a skill, a date, or an employer you did not have.',
    points: ['Review before submit', 'Match threshold + daily cap', 'Company & title exclusions', 'Pause everything, any time'],
    cta: { label: 'How auto-apply works', dc: 'Auto-Apply.dc.html' },
    Visual: ApplyVisual,
  },
  {
    n: '04',
    title: 'Track and prepare',
    body: 'Every application, stage, and reply in one view — with follow-up reminders, interview scheduling, and AI practice that gives you specific feedback rather than a score.',
    points: ['Stage tracking', 'Follow-up reminders', 'Interview practice + feedback', 'Outcome analytics'],
    cta: { label: 'See interview prep', dc: 'Interview Prep.dc.html' },
    Visual: TrackVisual,
  },
];

export default function CandidateJourney() {
  return (
    <section className="cj" id="for-candidates" aria-labelledby="cj-h">
      <Container>
        <div className="cj__head">
          <Eyebrow>For candidates</Eyebrow>
          <Display level={2} id="cj-h">
            Fewer, better applications — each one yours
          </Display>
          <p className="cj__lead">
            Jobocate is built around application quality, not volume. You decide what goes out, and every
            document is drawn from experience you approved.
          </p>
        </div>

        <div className="cj__steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`step ${i % 2 === 1 ? 'step--flip' : ''}`}>
              <div className="step__copy">
                <span className="step__n">{s.n}</span>
                <h3 className="step__title">{s.title}</h3>
                <p className="step__body">{s.body}</p>
                <ul className="step__points">
                  {s.points.map((p) => (
                    <li key={p}>
                      <span className="step__tick" aria-hidden="true">
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Button href={appRoute(s.cta.dc)} variant="secondary" size="md">
                  {s.cta.label}
                </Button>
              </div>
              <div className="step__visual">
                <s.Visual />
              </div>
            </div>
          ))}
        </div>
      </Container>

      <style jsx>{`
        .cj {
          background: var(--jb-ivory);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .cj__head {
          max-width: 620px;
          margin-bottom: var(--jb-space-12);
        }
        .cj__lead {
          margin: 0;
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }
        .cj__steps {
          display: grid;
          gap: clamp(48px, 6vw, 80px);
        }
        .step {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(28px, 4vw, 56px);
          align-items: center;
        }
        .step--flip .step__copy {
          order: 2;
        }
        .step--flip .step__visual {
          order: 1;
        }
        .step__n {
          display: inline-block;
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 700;
          color: var(--jb-accent-text);
          margin-bottom: var(--jb-space-3);
        }
        .step__title {
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: clamp(1.6rem, 2.6vw, 2rem);
          line-height: 1.15;
          margin: 0 0 var(--jb-space-3);
        }
        .step__body {
          font-size: var(--jb-text-base);
          line-height: 1.65;
          color: var(--jb-ink-muted);
          margin: 0 0 var(--jb-space-5);
          max-width: 50ch;
        }
        .step__points {
          list-style: none;
          margin: 0 0 var(--jb-space-6);
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
        }
        .step__points li {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink-body);
        }
        .step__tick {
          color: var(--jb-accent-text);
          flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .step {
            grid-template-columns: 1fr;
            gap: var(--jb-space-8);
          }
          .step--flip .step__copy {
            order: 1;
          }
          .step--flip .step__visual {
            order: 2;
          }
        }
        @media (max-width: 480px) {
          .step__points {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
