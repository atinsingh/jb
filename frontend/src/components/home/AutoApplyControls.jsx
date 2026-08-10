'use client';

import { useState, useId } from 'react';
import { Container, Display, Eyebrow, Button } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';

/**
 * Auto-apply safety & control.
 *
 * The single biggest objection to an auto-applier is loss of control, so this
 * section demonstrates the controls rather than describing them: the panel is
 * live, and toggling "Pause all activity" or "Review required" visibly changes
 * what the summary says will happen.
 *
 * The controls mirror the real settings on /app/auto-apply. Values here are
 * demonstration state only — nothing is persisted.
 */

function Toggle({ id, label, hint, checked, onChange, danger }) {
  return (
    <div className="tg">
      <div className="tg__text">
        <label htmlFor={id} className="tg__label">
          {label}
        </label>
        {hint && <p className="tg__hint">{hint}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`tg__sw ${checked ? 'is-on' : ''} ${danger && checked ? 'is-danger' : ''}`}
      >
        <span className="tg__knob" aria-hidden="true" />
        {/* State is spelled out, not just colour-coded. */}
        <span className="jb-sr">{checked ? 'On' : 'Off'}</span>
      </button>
      <span className={`tg__state ${danger && checked ? 'is-danger' : ''}`} aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>

      <style jsx>{`
        .tg {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .tg__label {
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink);
          cursor: pointer;
        }
        .tg__hint {
          margin: 3px 0 0;
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .tg__sw {
          appearance: none;
          width: 48px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid var(--jb-border-strong);
          background: var(--jb-surface-alt);
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color var(--jb-dur) var(--jb-ease), border-color var(--jb-dur) var(--jb-ease);
        }
        .tg__sw.is-on {
          background: var(--jb-accent);
          border-color: var(--jb-accent-strong);
        }
        .tg__sw.is-danger {
          background: var(--jb-warn-text);
          border-color: var(--jb-warn-text);
        }
        .tg__knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--jb-d-panel);
          transition: transform var(--jb-dur) var(--jb-ease);
        }
        .tg__sw.is-on .tg__knob {
          transform: translateX(20px);
        }
        .tg__sw:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }
        .tg__state {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          font-weight: 600;
          color: var(--jb-ink-muted);
          width: 26px;
          text-align: right;
        }
        .tg__state.is-danger {
          color: var(--jb-warn-text);
        }
      `}</style>
    </div>
  );
}

const GUARANTEES = [
  'You can review exactly what will be submitted before it goes.',
  'You can pause every automation instantly, from any screen.',
  'Jobocate does not fabricate credentials, dates, or employers.',
  'Duplicate, expired, and suspicious listings are screened out.',
  'You can report a listing or an employer at any time.',
];

export default function AutoApplyControls() {
  const uid = useId();
  const [on, setOn] = useState(true);
  const [review, setReview] = useState(true);
  const [paused, setPaused] = useState(false);
  const [threshold, setThreshold] = useState(85);
  const [cap, setCap] = useState(5);

  const summary = paused
    ? 'Everything is paused. Nothing will be submitted until you resume.'
    : !on
      ? 'Auto-apply is off. You are applying manually — nothing is sent for you.'
      : review
        ? `Up to ${cap} application${cap === 1 ? '' : 's'} a day will be prepared for roles matching ${threshold}%+. Each one waits for your approval before it is sent.`
        : `Up to ${cap} application${cap === 1 ? '' : 's'} a day will be submitted automatically for roles matching ${threshold}%+, using documents drawn from your approved profile.`;

  return (
    <section className="aa" id="auto-apply" aria-labelledby="aa-h">
      <Container>
        <div className="aa__grid">
          <div className="aa__copy">
            <Eyebrow>Auto-apply, on your terms</Eyebrow>
            <Display level={2} id="aa-h">
              Automation you can switch off mid-sentence
            </Display>
            <p className="aa__lead">
              Auto-apply is configurable, transparent, and reversible. Set the bar, set the pace, and keep
              the final say — or turn it off entirely and apply by hand.
            </p>

            <ul className="aa__g">
              {GUARANTEES.map((g) => (
                <li key={g}>
                  <span className="aa__tick" aria-hidden="true">
                    ✓
                  </span>
                  {g}
                </li>
              ))}
            </ul>

            <Button href={appRoute('Auto-Apply.dc.html')} variant="primary" size="lg">
              See auto-apply in detail
            </Button>
          </div>

          <div className="aa__panel">
            <div className="aa__panelhead">
              <h3 className="aa__paneltitle">Auto-apply controls</h3>
              <span className="aa__demo">Try it — this panel is live</span>
            </div>

            <Toggle
              id={`${uid}-on`}
              label="Auto-apply"
              hint="Queue applications for roles that clear your bar."
              checked={on}
              onChange={setOn}
            />
            <Toggle
              id={`${uid}-review`}
              label="Review required"
              hint="Nothing sends until you approve it."
              checked={review}
              onChange={setReview}
            />

            <div className="sl">
              <label htmlFor={`${uid}-th`} className="sl__label">
                Minimum match threshold
                <span className="sl__val">{threshold}%</span>
              </label>
              <input
                id={`${uid}-th`}
                type="range"
                min="50"
                max="100"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="sl__input"
              />
            </div>

            <div className="sl">
              <label htmlFor={`${uid}-cap`} className="sl__label">
                Maximum applications per day
                <span className="sl__val">{cap}</span>
              </label>
              <input
                id={`${uid}-cap`}
                type="range"
                min="1"
                max="20"
                step="1"
                value={cap}
                onChange={(e) => setCap(Number(e.target.value))}
                className="sl__input"
              />
            </div>

            <div className="chips">
              <span className="chips__label">Also applied</span>
              <span className="chip">Titles: Product Designer, UX Engineer</span>
              <span className="chip">Locations: Berlin · Remote (EU)</span>
              <span className="chip">Min salary: €70,000</span>
              <span className="chip">Excluded: 2 employers</span>
              <span className="chip">Excluded keywords: “unpaid”</span>
              <span className="chip">Requires: EU work authorization</span>
            </div>

            <Toggle
              id={`${uid}-pause`}
              label="Pause all activity"
              hint="Stops everything immediately, keeps your settings."
              checked={paused}
              onChange={setPaused}
              danger
            />

            <p className="aa__summary" role="status">
              {summary}
            </p>

            <p className="aa__audit">
              Every submission is written to your application history, with the documents that were sent.
            </p>
          </div>
        </div>
      </Container>

      <style jsx>{`
        .aa {
          background: var(--jb-surface-alt);
          border-top: 1px solid var(--jb-border);
          border-bottom: 1px solid var(--jb-border);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .aa__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px, 4vw, 64px);
          align-items: start;
        }
        .aa__lead {
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-ink-muted);
          margin: 0 0 var(--jb-space-6);
          max-width: 52ch;
        }
        .aa__g {
          list-style: none;
          margin: 0 0 var(--jb-space-8);
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .aa__g li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-ink-body);
        }
        .aa__tick {
          color: var(--jb-accent-text);
          font-weight: 700;
          flex-shrink: 0;
        }
        .aa__panel {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-6);
          box-shadow: var(--jb-shadow);
        }
        .aa__panelhead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: var(--jb-space-2);
        }
        .aa__paneltitle {
          margin: 0;
          font-size: var(--jb-text-md);
          font-weight: 700;
        }
        .aa__demo {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          color: var(--jb-accent-text);
        }
        .sl {
          padding: 14px 0;
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .sl__label {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: var(--jb-text-base);
          font-weight: 600;
          color: var(--jb-ink);
          margin-bottom: 10px;
        }
        .sl__val {
          font-family: var(--jb-font-mono);
          font-weight: 600;
          color: var(--jb-accent-text);
        }
        .sl__input {
          width: 100%;
          accent-color: var(--jb-accent-strong);
          height: 24px;
        }
        .sl__input:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 4px;
          border-radius: 4px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 14px 0;
          border-bottom: 1px solid var(--jb-border-soft);
        }
        .chips__label {
          width: 100%;
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
          margin-bottom: 4px;
        }
        .chip {
          font-size: var(--jb-text-xs);
          font-weight: 600;
          color: var(--jb-ink-body);
          background: var(--jb-surface-sunk);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-pill);
          padding: 5px 10px;
        }
        .aa__summary {
          margin: var(--jb-space-5) 0 0;
          padding: 12px 14px;
          background: var(--jb-tint-green);
          border-radius: var(--jb-radius);
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-ink-body);
          font-weight: 600;
        }
        .aa__audit {
          margin: 10px 0 0;
          font-size: var(--jb-text-base);
          color: var(--jb-ink-subtle);
        }

        @media (max-width: 900px) {
          .aa__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
