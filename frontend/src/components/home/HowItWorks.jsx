'use client';

import { useState } from 'react';
import { Container, Display, Eyebrow, Button } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';

/**
 * How it works — separate candidate and employer journeys.
 *
 * The old page ran one generic three-step story ("Upload your resume → Get
 * matched → Land the interview") for every visitor, which described only the
 * candidate path. These are two distinct journeys behind a tablist, each step
 * carrying a UI preview rather than just a number and a paragraph.
 */

const JOURNEYS = {
  candidate: [
    {
      title: 'Create your profile',
      body: 'Upload a resume, then correct anything the AI misread. Your profile is the only source your applications draw from.',
      visual: (
        <ul className="mini">
          <li>
            <b>Resume parsed</b> <span>9 skills, 4 roles found</span>
          </li>
          <li>
            <b>You corrected</b> <span>2 job titles, 1 date</span>
          </li>
          <li>
            <b>Goals set</b> <span>Senior design, Berlin/Remote</span>
          </li>
        </ul>
      ),
    },
    {
      title: 'Set preferences and application controls',
      body: 'Choose your match threshold, daily limit, salary floor, and the employers you never want to hear from.',
      visual: (
        <ul className="mini">
          <li>
            <b>Threshold</b> <span>85%+ match only</span>
          </li>
          <li>
            <b>Daily cap</b> <span>5 applications</span>
          </li>
          <li>
            <b>Review mode</b> <span>On — you approve each</span>
          </li>
        </ul>
      ),
    },
    {
      title: 'Match, apply, track, and interview',
      body: 'Approve what goes out, follow every application through its stages, and practise before the interview.',
      visual: (
        <ul className="mini">
          <li>
            <b>2 waiting</b> <span>for your approval</span>
          </li>
          <li>
            <b>12 applied</b> <span>5 in review, 2 interviews</span>
          </li>
          <li>
            <b>Thu 14:00</b> <span>Portfolio review</span>
          </li>
        </ul>
      ),
    },
  ],
  employer: [
    {
      title: 'Verify your company',
      body: 'Build your employer profile and complete verification, so candidates can see the listing is real.',
      visual: (
        <ul className="mini">
          <li>
            <b>Profile</b> <span>Logo, size, locations</span>
          </li>
          <li>
            <b>Verification</b> <span>Domain + company details</span>
          </li>
          <li>
            <b>Result</b> <span>Verified label on every job</span>
          </li>
        </ul>
      ),
    },
    {
      title: 'Publish a structured job',
      body: 'Structured fields and screening questions, with AI suggestions to sharpen the description before it goes live.',
      visual: (
        <ul className="mini">
          <li>
            <b>Requirements</b> <span>9 skills, 5+ yrs</span>
          </li>
          <li>
            <b>Screening</b> <span>3 questions added</span>
          </li>
          <li>
            <b>Salary</b> <span>Published — improves matching</span>
          </li>
        </ul>
      ),
    },
    {
      title: 'Review matched candidates and manage hiring',
      body: 'Applicants arrive ranked against your requirements with the reasoning shown. Shortlist, schedule, and decide.',
      visual: (
        <ul className="mini">
          <li>
            <b>18 qualified</b> <span>ranked on your criteria</span>
          </li>
          <li>
            <b>Shortlist</b> <span>3 in 2.4 days</span>
          </li>
          <li>
            <b>Fri 10:30</b> <span>Team interview</span>
          </li>
        </ul>
      ),
    },
  ],
};

export default function HowItWorks({ audience, onAudienceChange }) {
  const [tab, setTab] = useState(audience || 'candidate');
  const active = JOURNEYS[tab];

  const pick = (next) => {
    setTab(next);
    onAudienceChange?.(next);
  };

  const onKeyDown = (e) => {
    const order = ['candidate', 'employer'];
    const i = order.indexOf(tab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      pick(order[(i + 1) % order.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      pick(order[(i + order.length - 1) % order.length]);
    }
  };

  return (
    <section className="hiw" id="how-it-works" aria-labelledby="hiw-h">
      <Container>
        <div className="hiw__head">
          <Eyebrow>How it works</Eyebrow>
          <Display level={2} id="hiw-h">
            Two sides, two journeys
          </Display>
        </div>

        <div className="hiw__tabs" role="tablist" aria-label="Choose a journey" onKeyDown={onKeyDown}>
          {['candidate', 'employer'].map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`hiw-tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`hiw-panel-${k}`}
              tabIndex={tab === k ? 0 : -1}
              className={`hiw__tab ${tab === k ? 'is-on' : ''} ${k === 'employer' ? 'is-emp' : ''}`}
              onClick={() => pick(k)}
            >
              {k === 'candidate' ? 'For candidates' : 'For employers'}
            </button>
          ))}
        </div>

        <div id={`hiw-panel-${tab}`} role="tabpanel" aria-labelledby={`hiw-tab-${tab}`} className="hiw__panel">
          <ol className="hiw__steps">
            {active.map((s, i) => (
              <li key={s.title} className="hs">
                <div className="hs__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="hs__title">{s.title}</h3>
                <p className="hs__body">{s.body}</p>
                <div className="hs__visual">{s.visual}</div>
              </li>
            ))}
          </ol>

          <div className="hiw__cta">
            {tab === 'candidate' ? (
              <Button href={appRoute('App Sign Up.dc.html')} variant="primary" size="lg">
                Create your free profile
              </Button>
            ) : (
              <Button href={appRoute('Employer Post Job.dc.html')} variant="employer" size="lg">
                Post a job
              </Button>
            )}
          </div>
        </div>
      </Container>

      <style jsx>{`
        .hiw {
          background: var(--jb-ivory);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .hiw__head {
          max-width: 620px;
          margin-bottom: var(--jb-space-6);
        }
        .hiw__tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          background: var(--jb-surface-alt);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-pill);
          margin-bottom: var(--jb-space-10);
        }
        .hiw__tab {
          appearance: none;
          border: none;
          background: transparent;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink-muted);
          padding: 10px 20px;
          min-height: 44px;
          border-radius: var(--jb-radius-pill);
          cursor: pointer;
          transition: background-color var(--jb-dur) var(--jb-ease), color var(--jb-dur) var(--jb-ease);
        }
        .hiw__tab:hover {
          color: var(--jb-ink);
        }
        .hiw__tab.is-on {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .hiw__tab.is-on.is-emp {
          background: var(--jb-employer);
          color: #fff;
        }
        .hiw__tab:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }
        .hiw__steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: var(--jb-space-6);
        }
        .hs {
          border-top: 2px solid var(--jb-ink);
          padding-top: var(--jb-space-5);
        }
        .hs__num {
          font-family: var(--jb-font-display);
          font-size: clamp(26px, 5vw, 48px);
          line-height: 1;
          color: var(--jb-accent);
          margin-bottom: var(--jb-space-3);
        }
        .hs__title {
          margin: 0 0 var(--jb-space-2);
          font-size: var(--jb-text-lg);
          font-weight: 700;
        }
        .hs__body {
          margin: 0 0 var(--jb-space-4);
          font-size: var(--jb-text-base);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }
        .hs__visual :global(.mini) {
          list-style: none;
          margin: 0;
          padding: var(--jb-space-4);
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius);
          display: grid;
          gap: 8px;
        }
        .hs__visual :global(.mini li) {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: var(--jb-text-sm);
        }
        .hs__visual :global(.mini b) {
          color: var(--jb-ink);
        }
        .hs__visual :global(.mini span) {
          color: var(--jb-ink-muted);
          text-align: right;
        }
        .hiw__cta {
          margin-top: var(--jb-space-10);
        }

        @media (max-width: 900px) {
          .hiw__steps {
            grid-template-columns: 1fr;
            gap: var(--jb-space-8);
          }
        }
        @media (max-width: 560px) {
          .hiw__tabs {
            width: 100%;
          }
          .hiw__tab {
            flex: 1;
            padding: 10px 8px;
          }
          .hiw__cta :global(.jb-btn) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
