'use client';

import { Container, Display, Eyebrow, Button } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';
import { EMPLOYER_PREVIEW } from '@/lib/homePreviewData';

/**
 * Employer section.
 *
 * Given a subtle dark treatment so the hiring side reads as a distinct
 * destination rather than more candidate marketing — this was the single
 * biggest gap on the old page, where employers appeared only as one
 * low-contrast nav link.
 *
 * Every capability listed maps to a route that exists under /employer/*.
 * Candidate match explanations are stated in job-related terms only; nothing
 * here ranks on protected characteristics.
 */

const CAPABILITIES = [
  { title: 'Employer profile & verification', body: 'Build a company profile and complete verification so candidates can trust the listing.', dc: 'Employer Company.dc.html' },
  { title: 'Job creation wizard', body: 'Publish a structured role with AI-assisted description improvements and screening questions.', dc: 'Employer Post Job.dc.html' },
  { title: 'Ranked candidates, explained', body: 'See who fits and exactly why — skills, experience, availability.', dc: 'Employer Candidates.dc.html' },
  { title: 'Candidate search & talent pools', body: 'Search your pool directly and build shortlists you can revisit.', dc: 'Employer Talent Pool.dc.html' },
  { title: 'Hiring pipeline & collaboration', body: 'Move candidates through stages with your team in the same view.', dc: 'Employer Candidates.dc.html' },
  { title: 'Messaging & interview scheduling', body: 'Talk to candidates and book interviews without leaving the pipeline.', dc: 'Employer Interviews.dc.html' },
  { title: 'Recruitment analytics', body: 'Track time-to-shortlist and where candidates drop out.', dc: 'Employer Dashboard.dc.html' },
  { title: 'Job promotion', body: 'Boost distribution for roles that need more reach.', dc: 'Employer Distribution.dc.html' },
];

const WORKFLOW = [
  { n: '1', title: 'Create and publish a job', body: 'Structured fields, screening questions, AI-assisted description.' },
  { n: '2', title: 'Receive and discover candidates', body: 'Applications arrive ranked; search your talent pool for more.' },
  { n: '3', title: 'Shortlist, interview, and hire', body: 'Collaborate, schedule, and track to offer.' },
];

export default function EmployerSection() {
  const e = EMPLOYER_PREVIEW;

  return (
    <section className="emp" id="for-employers" aria-labelledby="emp-h">
      <Container>
        <div className="emp__top">
          <div className="emp__copy">
            <Eyebrow tone="on-dark">For employers</Eyebrow>
            <Display level={2} id="emp-h">
              Spend less time sorting. Meet better-matched candidates.
            </Display>
            <p className="emp__lead">
              Publish a structured role and get applicants ranked against it, with the reasoning shown. You
              keep every hiring decision — Jobocate just clears the pile.
            </p>
            <div className="emp__ctas">
              <Button href={appRoute('Employer Post Job.dc.html')} variant="accent" size="lg">
                Post your first job
              </Button>
              <Button href={appRoute('For Employers.dc.html')} variant="ghost-dark" size="lg">
                Explore employer tools
              </Button>
            </div>
          </div>

          <div className="emp__dash">
            <div className="dash">
              <div className="dash__head">
                <span className="dash__title">Senior Product Designer</span>
                <span className="dash__meta">
                  {e.qualified} qualified · shortlist in {e.timeToShortlist}
                </span>
              </div>

              <ul className="dash__list">
                {e.candidates.map((c) => (
                  <li key={c.initials} className="dc">
                    <span className="dc__av" aria-hidden="true">
                      {c.initials}
                    </span>
                    <span className="dc__t">
                      <span className="dc__n">{c.alias}</span>
                      <span className="dc__w">{c.why}</span>
                    </span>
                    <span className="dc__r">
                      <span className="dc__m">{c.match}%</span>
                      <span className="dc__s">{c.stage}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="dash__stages">
                {e.stages.map((s) => (
                  <span key={s.stage} className="dash__stage">
                    <b>{s.count}</b> {s.stage}
                  </span>
                ))}
              </div>

              <p className="dash__note">
                Ranked on job-related criteria only. Protected characteristics are never used.
              </p>
            </div>
          </div>
        </div>

        <ol className="flow">
          {WORKFLOW.map((w) => (
            <li key={w.n} className="flow__step">
              <span className="flow__n" aria-hidden="true">
                {w.n}
              </span>
              <span className="flow__t">
                <b>{w.title}</b>
                <span>{w.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <ul className="caps">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="cap">
              <a href={appRoute(c.dc)} className="cap__link">
                <span className="cap__title">{c.title}</span>
                <span className="cap__body">{c.body}</span>
              </a>
            </li>
          ))}
        </ul>
      </Container>

      <style jsx>{`
        .emp {
          background: var(--jb-dark);
          color: var(--jb-on-dark);
          padding-block: clamp(56px, 7vw, 96px);
        }
        .emp__top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px, 4vw, 56px);
          align-items: center;
          margin-bottom: clamp(40px, 5vw, 64px);
        }
        .emp__lead {
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-on-dark-muted);
          margin: 0 0 var(--jb-space-8);
          max-width: 52ch;
        }
        .emp__ctas {
          display: flex;
          gap: var(--jb-space-3);
          flex-wrap: wrap;
        }

        .dash {
          background: var(--jb-dark-card);
          border: 1px solid var(--jb-dark-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
        }
        .dash__head {
          padding-bottom: var(--jb-space-4);
          border-bottom: 1px solid var(--jb-dark-border);
        }
        .dash__title {
          display: block;
          font-size: var(--jb-text-md);
          font-weight: 700;
          color: var(--jb-on-dark);
        }
        .dash__meta {
          display: block;
          font-size: var(--jb-text-sm);
          color: var(--jb-on-dark-muted);
          margin-top: 2px;
        }
        .dash__list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .dc {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--jb-dark-border);
        }
        .dc__av {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: rgba(147, 170, 255, 0.16);
          color: var(--jb-employer-on-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--jb-text-xs);
          font-weight: 700;
          flex-shrink: 0;
        }
        .dc__t {
          flex: 1;
          min-width: 0;
        }
        .dc__n {
          display: block;
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-on-dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dc__w {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-on-dark-muted);
        }
        .dc__r {
          text-align: right;
          flex-shrink: 0;
        }
        .dc__m {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-accent-on-dark);
        }
        .dc__s {
          display: block;
          font-size: 11px;
          color: var(--jb-on-dark-muted);
        }
        .dash__stages {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: var(--jb-space-4) 0 var(--jb-space-3);
        }
        .dash__stage {
          font-size: var(--jb-text-xs);
          color: var(--jb-on-dark-muted);
          background: rgba(251, 248, 241, 0.06);
          border-radius: var(--jb-radius-pill);
          padding: 5px 10px;
        }
        .dash__stage b {
          color: var(--jb-on-dark);
        }
        .dash__note {
          margin: 0;
          font-size: var(--jb-text-xs);
          color: var(--jb-on-dark-muted);
        }

        .flow {
          list-style: none;
          margin: 0 0 clamp(40px, 5vw, 64px);
          padding: var(--jb-space-8) 0;
          border-top: 1px solid var(--jb-dark-border);
          border-bottom: 1px solid var(--jb-dark-border);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: var(--jb-space-8);
          counter-reset: flow;
        }
        .flow__step {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .flow__n {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--jb-accent-on-dark);
          color: var(--jb-accent-on-dark);
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .flow__t b {
          display: block;
          font-size: var(--jb-text-base);
          color: var(--jb-on-dark);
          margin-bottom: 4px;
        }
        .flow__t span {
          display: block;
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-on-dark-muted);
        }

        .caps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
          gap: var(--jb-space-3);
        }
        .cap__link {
          display: block;
          height: 100%;
          padding: var(--jb-space-5);
          background: var(--jb-dark-card);
          border: 1px solid var(--jb-dark-border);
          border-radius: var(--jb-radius);
          text-decoration: none;
          transition: border-color var(--jb-dur) var(--jb-ease), transform var(--jb-dur) var(--jb-ease);
        }
        .cap__link:hover {
          border-color: var(--jb-accent-on-dark);
          transform: translateY(-2px);
        }
        .cap__link:focus-visible {
          outline: 3px solid var(--jb-accent-on-dark);
          outline-offset: 2px;
        }
        .cap__title {
          display: block;
          font-size: var(--jb-text-base);
          font-weight: 700;
          color: var(--jb-on-dark);
          margin-bottom: 6px;
        }
        .cap__body {
          display: block;
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-on-dark-muted);
        }

        @media (max-width: 1024px) {
          .caps {
            grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          }
        }
        @media (max-width: 900px) {
          .emp__top {
            grid-template-columns: 1fr;
          }
          .flow {
            grid-template-columns: 1fr;
            gap: var(--jb-space-5);
          }
        }
        @media (max-width: 560px) {
          .caps {
            grid-template-columns: 1fr;
          }
          .emp__ctas :global(.jb-btn) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
