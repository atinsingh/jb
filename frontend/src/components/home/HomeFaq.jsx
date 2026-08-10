'use client';

import { useState, useId } from 'react';
import { Container, Display, Eyebrow } from '@/components/site/primitives';

/**
 * Grouped FAQ — candidate and employer.
 *
 * Answers are scoped to what the product actually does. Notably the old FAQ
 * claimed "We are GDPR compliant" and "never sell your data" as legal
 * guarantees; those are replaced with descriptions of the controls that exist
 * (export, deletion, review-before-send), which is defensible today.
 */

const FAQ = {
  candidate: [
    {
      q: 'How does controlled auto-apply work?',
      a: 'You set a match threshold, a daily limit, and the roles, locations, and salary you care about. Jobocate prepares applications only for jobs that clear that bar. With review mode on — the default — each one waits for your approval before it is sent.',
    },
    {
      q: 'Can I approve applications before submission?',
      a: 'Yes, and that is the default. Review mode holds every prepared application in a queue where you can read the tailored resume and cover letter, edit them, send them, or skip the role entirely.',
    },
    {
      q: 'Does Jobocate change or invent my experience?',
      a: 'No. Tailoring re-orders and re-emphasises what is already on your profile so the most relevant experience is visible first. It does not add skills, employers, dates, or achievements you did not enter. If parsing misreads your resume, you correct it, and your correction is what gets used.',
    },
    {
      q: 'How is the job-match score calculated?',
      a: 'It compares the job’s structured requirements against your profile across factors like skills, experience, location, and your stated preferences. Every score can be expanded to show which factors were strong, partial, or weak — you never see a bare number.',
    },
    {
      q: 'How can I stop or pause applications?',
      a: 'There is a pause switch that stops all automation immediately and keeps your settings intact. You can also turn auto-apply off entirely and apply by hand.',
    },
    {
      q: 'How is my data protected?',
      a: 'Your profile and documents are used to power your matches and applications. You control what is on your profile, which employers are excluded, and whether automation runs at all.',
    },
    {
      q: 'Can I delete or export my data?',
      a: 'Yes. You can export your profile, documents, and application history, and you can request deletion of your account and its data.',
    },
    {
      q: 'Is Jobocate free?',
      a: 'There is a free plan that covers profile building, job search, matching, and a monthly allowance of auto-apply credits. Paid plans raise the limits and add cover letters, deeper personalisation, and interview prep. See the pricing page for current plans.',
    },
  ],
  employer: [
    {
      q: 'How do I post a job?',
      a: 'Create an employer profile, then use the job wizard to publish a structured role — requirements, workplace type, salary, and screening questions. Publishing a salary range measurably improves match quality, so we ask for one.',
    },
    {
      q: 'How are candidates ranked?',
      a: 'Against the structured requirements of your job: skills, experience, and availability. Each candidate carries a short explanation of why they ranked where they did. Protected characteristics are not inputs to ranking.',
    },
    {
      q: 'Does Jobocate replace employer decision-making?',
      a: 'No. Ranking orders a list so you can start with the closest fits. It does not reject candidates and it does not make offers — every hiring decision is yours.',
    },
    {
      q: 'Can my team collaborate?',
      a: 'Yes. Shortlists, pipeline stages, and candidate notes are shared, so your team works from the same view rather than a forwarded spreadsheet.',
    },
    {
      q: 'How are employers verified?',
      a: 'Employers can complete a verification step covering company details and domain ownership. Verified employers carry a label on their listings; unverified ones are labelled as such rather than hidden, so candidates can judge for themselves.',
    },
    {
      q: 'How are fraudulent listings handled?',
      a: 'Duplicate and expired listings are screened out of matching, and candidates can report a listing or an employer. Reports are reviewed and listings can be removed.',
    },
    {
      q: 'What does employer access cost?',
      a: 'Employers pay per job post or by subscription depending on how much you hire. See the employer pricing page for current options.',
    },
  ],
};

function Item({ item, open, onToggle, id }) {
  return (
    <div className="fq">
      <h3 className="fq__h">
        <button
          type="button"
          className="fq__btn"
          aria-expanded={open}
          aria-controls={`${id}-p`}
          id={`${id}-b`}
          onClick={onToggle}
        >
          <span>{item.q}</span>
          <span className="fq__sign" aria-hidden="true">
            {open ? '–' : '+'}
          </span>
        </button>
      </h3>
      <div id={`${id}-p`} role="region" aria-labelledby={`${id}-b`} hidden={!open} className="fq__p">
        <p className="fq__a">{item.a}</p>
      </div>

      <style jsx>{`
        .fq {
          border-bottom: 1px solid var(--jb-border-strong);
        }
        .fq__h {
          margin: 0;
        }
        .fq__btn {
          width: 100%;
          appearance: none;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          padding: 20px 4px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-md);
          font-weight: 600;
          color: var(--jb-ink);
        }
        .fq__btn:hover {
          color: var(--jb-accent-text);
        }
        .fq__btn:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: -2px;
          border-radius: var(--jb-radius-sm);
        }
        .fq__sign {
          font-family: var(--jb-font-mono);
          font-size: 22px;
          line-height: 1;
          color: var(--jb-accent-text);
          flex-shrink: 0;
        }
        .fq__a {
          margin: 0;
          padding: 0 4px 22px;
          max-width: 74ch;
          font-size: var(--jb-text-base);
          line-height: 1.65;
          color: var(--jb-ink-muted);
        }
      `}</style>
    </div>
  );
}

export default function HomeFaq({ audience, onAudienceChange }) {
  const [tab, setTab] = useState(audience || 'candidate');
  const [open, setOpen] = useState(0);
  const uid = useId();

  const pick = (next) => {
    setTab(next);
    setOpen(0);
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
    <section className="faq" id="faq" aria-labelledby="faq-h">
      <Container>
        <div className="faq__head">
          <Eyebrow>FAQ</Eyebrow>
          <Display level={2} id="faq-h">
            Questions, answered
          </Display>
        </div>

        <div className="faq__tabs" role="tablist" aria-label="FAQ audience" onKeyDown={onKeyDown}>
          {['candidate', 'employer'].map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`faq-tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`faq-panel-${k}`}
              tabIndex={tab === k ? 0 : -1}
              className={`faq__tab ${tab === k ? 'is-on' : ''} ${k === 'employer' ? 'is-emp' : ''}`}
              onClick={() => pick(k)}
            >
              {k === 'candidate' ? 'For candidates' : 'For employers'}
            </button>
          ))}
        </div>

        <div id={`faq-panel-${tab}`} role="tabpanel" aria-labelledby={`faq-tab-${tab}`} className="faq__list">
          {FAQ[tab].map((item, i) => (
            <Item
              key={item.q}
              item={item}
              open={open === i}
              onToggle={() => setOpen((cur) => (cur === i ? -1 : i))}
              id={`${uid}-${tab}-${i}`}
            />
          ))}
        </div>
      </Container>

      <style jsx>{`
        .faq {
          background: var(--jb-ivory);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .faq__head {
          margin-bottom: var(--jb-space-6);
        }
        .faq__tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          background: var(--jb-surface-alt);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-pill);
          margin-bottom: var(--jb-space-6);
        }
        .faq__tab {
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
        }
        .faq__tab:hover {
          color: var(--jb-ink);
        }
        .faq__tab.is-on {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .faq__tab.is-on.is-emp {
          background: var(--jb-employer);
          color: #fff;
        }
        .faq__tab:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }
        .faq__list {
          border-top: 1px solid var(--jb-border-strong);
          max-width: 900px;
        }
        @media (max-width: 560px) {
          .faq__tabs {
            width: 100%;
          }
          .faq__tab {
            flex: 1;
            padding: 10px 8px;
          }
        }
      `}</style>
    </section>
  );
}
