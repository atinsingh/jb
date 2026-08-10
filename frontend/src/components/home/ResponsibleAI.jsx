'use client';

import { Container, Display, Eyebrow } from '@/components/site/primitives';

/**
 * Responsible AI & transparency.
 *
 * Language is deliberately non-absolute: this section describes what the
 * product does, and avoids guaranteeing fairness, legal compliance, or
 * certification. The old FAQ asserted "We are GDPR compliant" — a legal claim
 * nothing in the project substantiates — so it is not repeated here.
 *
 * Anchor id is referenced by SiteFooter ("Responsible AI").
 */

const ITEMS = [
  {
    title: 'How matches are generated',
    body: 'Jobocate compares the structured requirements of a job against the skills, experience, and preferences on your profile. Each factor contributes to the score, and the score is never shown without them.',
  },
  {
    title: 'You can inspect the reasoning',
    body: 'Open any match to see which factors were strong, partial, or weak. If the reasoning looks wrong, it usually means your profile needs a correction.',
  },
  {
    title: 'You can correct what AI extracted',
    body: 'Resume parsing is a starting point, not a verdict. Every extracted skill, title, and date is editable, and your edits are what applications draw from.',
  },
  {
    title: 'Employers decide who gets hired',
    body: 'Ranking orders a list. It does not screen people out, and it does not make offers. Hiring decisions stay with the employer.',
  },
  {
    title: 'Protected characteristics are not used for ranking',
    body: 'Candidate ranking uses job-related criteria — skills, experience, availability. Protected characteristics are not inputs to the ranking.',
  },
  {
    title: 'You can turn the automation off',
    body: 'Auto-apply can be paused or disabled entirely at any time, from any screen, without losing your settings.',
  },
  {
    title: 'Your data stays yours',
    body: 'You can export or request deletion of your profile, documents, and application history.',
  },
  {
    title: 'Review AI output before it goes out',
    body: 'Generated resumes and cover letters are drafts for you to check. We ask you to read them — that is why review mode is on by default.',
  },
];

export default function ResponsibleAI() {
  return (
    <section className="rai" id="responsible-ai" aria-labelledby="rai-h">
      <Container>
        <div className="rai__head">
          <Eyebrow>Responsible AI</Eyebrow>
          <Display level={2} id="rai-h">
            How the AI works, in plain terms
          </Display>
          <p className="rai__lead">
            AI here assists and orders. It does not decide, and it does not speak for you without your
            sign-off.
          </p>
        </div>

        <ul className="rai__grid">
          {ITEMS.map((it) => (
            <li key={it.title} className="rai__item">
              <h3 className="rai__title">{it.title}</h3>
              <p className="rai__body">{it.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      <style jsx>{`
        .rai {
          background: var(--jb-surface-alt);
          border-top: 1px solid var(--jb-border);
          border-bottom: 1px solid var(--jb-border);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .rai__head {
          max-width: 620px;
          margin-bottom: var(--jb-space-10);
        }
        .rai__lead {
          margin: 0;
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }
        .rai__grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
          gap: 1px;
          background: var(--jb-border);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          overflow: hidden;
        }
        .rai__item {
          background: var(--jb-surface);
          padding: var(--jb-space-5);
        }
        .rai__title {
          margin: 0 0 var(--jb-space-2);
          font-size: var(--jb-text-base);
          font-weight: 700;
          line-height: 1.35;
        }
        .rai__body {
          margin: 0;
          font-size: var(--jb-text-base);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }

        @media (max-width: 1024px) {
          .rai__grid {
            grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          }
        }
        @media (max-width: 560px) {
          .rai__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
