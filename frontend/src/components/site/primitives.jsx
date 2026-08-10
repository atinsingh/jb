'use client';

import Link from 'next/link';

/**
 * Shared editorial primitives for the marketing surface.
 *
 * These wrap the --jb-* tokens so sections never hardcode a hex value. Styling
 * uses real CSS classes (see tokens.css + each section's styled-jsx) rather
 * than inline style objects, because inline styles cannot express media
 * queries — which is why the previous homepage had no responsive behaviour.
 */

/** Centered max-width column with responsive gutters. */
export function Container({ children, className = '', ...rest }) {
  return (
    <div className={`jb-container ${className}`} {...rest}>
      {children}
      <style jsx>{`
        .jb-container {
          max-width: var(--jb-maxw);
          margin: 0 auto;
          padding-left: var(--jb-gutter);
          padding-right: var(--jb-gutter);
          width: 100%;
        }
      `}</style>
    </div>
  );
}

/** Small uppercase mono label above a heading. Always AA-contrast green. */
export function Eyebrow({ children, tone = 'accent' }) {
  return (
    <p className={`jb-eyebrow jb-eyebrow--${tone}`}>
      {children}
      <style jsx>{`
        .jb-eyebrow {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 var(--jb-space-4);
        }
        .jb-eyebrow--accent {
          color: var(--jb-accent-text);
        }
        .jb-eyebrow--employer {
          color: var(--jb-employer-text);
        }
        .jb-eyebrow--on-dark {
          color: var(--jb-accent-on-dark);
        }
        .jb-eyebrow--muted {
          color: var(--jb-ink-muted);
        }
      `}</style>
    </p>
  );
}

/**
 * Serif display heading. `level` sets the semantic tag so heading order stays
 * correct independently of visual size.
 */
export function Display({ level = 2, size = 'lg', children, className = '', id }) {
  const Tag = `h${level}`;
  return (
    <>
      <Tag id={id} className={`jb-display jb-display--${size} ${className}`}>
        {children}
      </Tag>
      <style jsx>{`
        .jb-display {
          font-family: var(--jb-font-display);
          font-weight: 400;
          letter-spacing: -0.01em;
          color: inherit;
          margin: 0 0 var(--jb-space-4);
          text-wrap: balance;
        }
        .jb-display--xl {
          font-size: clamp(2.5rem, 6.2vw, 4.5rem);
          line-height: 1.02;
        }
        .jb-display--lg {
          font-size: clamp(2rem, 4.4vw, 3.125rem);
          line-height: 1.06;
        }
        .jb-display--md {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          line-height: 1.1;
        }
      `}</style>
    </>
  );
}

/** Body copy. Never smaller than 16px at any breakpoint. */
export function Lead({ children, tone = 'muted', className = '' }) {
  return (
    <p className={`jb-lead jb-lead--${tone} ${className}`}>
      {children}
      <style jsx>{`
        .jb-lead {
          font-size: var(--jb-text-lg);
          line-height: 1.6;
          margin: 0 0 var(--jb-space-6);
          max-width: 56ch;
        }
        .jb-lead--muted {
          color: var(--jb-ink-muted);
        }
        .jb-lead--on-dark {
          color: var(--jb-on-dark-muted);
        }
        @media (max-width: 768px) {
          .jb-lead {
            font-size: var(--jb-text-md);
          }
        }
      `}</style>
    </p>
  );
}

/**
 * Button / link with full interaction states: hover, focus-visible, active,
 * disabled and loading. Renders <Link> when `href` is set, else <button>.
 */
export function Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  full = false,
  ...rest
}) {
  const cls = [
    'jb-btn',
    `jb-btn--${variant}`,
    `jb-btn--${size}`,
    full ? 'jb-btn--full' : '',
    loading ? 'jb-btn--loading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Link when navigating, <button> otherwise. Resolved into a single return
  // below: styled-jsx only attaches its scoping class when the <style jsx>
  // block is a direct child of the returned JSX, so it must not be hoisted
  // into a variable or duplicated across two return branches.
  const El = href && !disabled ? Link : 'button';
  const elProps = href && !disabled ? { href } : { type: 'button', disabled: disabled || loading };

  return (
    <>
      <El className={cls} {...elProps} {...rest}>
        {loading && <span className="jb-btn__spin" aria-hidden="true" />}
        <span className="jb-btn__label">{children}</span>
        {loading && <span className="jb-sr">Loading</span>}
      </El>

      <style jsx>{`
      .jb-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--jb-space-2);
        font-family: var(--jb-font-sans);
        font-weight: 600;
        border-radius: var(--jb-radius-pill);
        border: 1px solid transparent;
        text-decoration: none;
        cursor: pointer;
        min-height: 44px;
        transition: transform var(--jb-dur) var(--jb-ease),
          background-color var(--jb-dur) var(--jb-ease),
          border-color var(--jb-dur) var(--jb-ease), opacity var(--jb-dur) var(--jb-ease);
      }
      .jb-btn--md {
        font-size: var(--jb-text-base);
        padding: 13px 24px;
      }
      .jb-btn--lg {
        font-size: var(--jb-text-md);
        padding: 16px 30px;
      }
      .jb-btn--sm {
        font-size: var(--jb-text-sm);
        padding: 10px 18px;
      }
      .jb-btn--full {
        width: 100%;
      }

      .jb-btn--primary {
        background: var(--jb-ink);
        color: var(--jb-ivory);
      }
      .jb-btn--primary:hover:not(:disabled) {
        background: #000;
      }
      .jb-btn--employer {
        background: var(--jb-employer);
        color: #fff;
      }
      .jb-btn--employer:hover:not(:disabled) {
        background: var(--jb-employer-text);
      }
      .jb-btn--accent {
        background: var(--jb-accent-fill);
        color: #fff;
      }
      .jb-btn--accent:hover:not(:disabled) {
        background: var(--jb-accent-strong);
        color: #fff;
      }
      .jb-btn--secondary {
        background: transparent;
        color: var(--jb-ink);
        border-color: var(--jb-border-strong);
      }
      .jb-btn--secondary:hover:not(:disabled) {
        border-color: var(--jb-ink);
        background: rgba(27, 26, 22, 0.04);
      }
      .jb-btn--ghost-dark {
        background: transparent;
        color: var(--jb-on-dark);
        border-color: rgba(251, 248, 241, 0.32);
      }
      .jb-btn--ghost-dark:hover:not(:disabled) {
        border-color: var(--jb-on-dark);
        background: rgba(251, 248, 241, 0.08);
      }

      .jb-btn:active:not(:disabled) {
        transform: translateY(1px);
      }
      .jb-btn:focus-visible {
        outline: 3px solid var(--jb-accent-strong);
        outline-offset: 2px;
      }
      .jb-btn:disabled,
      .jb-btn[aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .jb-btn--loading .jb-btn__label {
        opacity: 0.7;
      }
      .jb-btn__spin {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid currentColor;
        border-top-color: transparent;
        animation: jbspin 0.7s linear infinite;
      }
      @keyframes jbspin {
        to {
          transform: rotate(360deg);
        }
      }
        @media (prefers-reduced-motion: reduce) {
          .jb-btn__spin {
            animation-duration: 1.5s;
          }
        }
      `}</style>
    </>
  );
}

/** Bordered surface card. */
export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`jb-card ${className}`} {...rest}>
      {children}
      <style jsx>{`
        .jb-card {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
        }
      `}</style>
    </Tag>
  );
}

/**
 * Section wrapper with consistent vertical rhythm and optional tone.
 * `labelledBy` wires aria-labelledby to the section's heading id.
 */
export function Section({ children, tone = 'ivory', id, labelledBy, className = '' }) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`jb-section jb-section--${tone} ${className}`}
    >
      {children}
      <style jsx>{`
        .jb-section {
          padding-block: clamp(56px, 7vw, 88px);
        }
        .jb-section--ivory {
          background: var(--jb-ivory);
          color: var(--jb-ink);
        }
        .jb-section--alt {
          background: var(--jb-surface-alt);
          color: var(--jb-ink);
          border-top: 1px solid var(--jb-border);
          border-bottom: 1px solid var(--jb-border);
        }
        .jb-section--dark {
          background: var(--jb-dark);
          color: var(--jb-on-dark);
        }
        .jb-section--flush {
          padding-block: 0;
        }
      `}</style>
    </section>
  );
}

/** Small status/meta pill. Never conveys state through colour alone. */
export function Pill({ children, tone = 'neutral', icon }) {
  return (
    <span className={`jb-pill jb-pill--${tone}`}>
      {icon && (
        <span className="jb-pill__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      <style jsx>{`
        .jb-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-xs);
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--jb-radius-pill);
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .jb-pill--neutral {
          background: var(--jb-surface-sunk);
          color: var(--jb-ink-muted);
          border-color: var(--jb-border);
        }
        .jb-pill--verified {
          background: var(--jb-tint-green);
          color: var(--jb-accent-text);
          border-color: rgba(21, 122, 73, 0.28);
        }
        .jb-pill--employer {
          background: var(--jb-employer-tint);
          color: var(--jb-employer-text);
          border-color: rgba(35, 64, 158, 0.24);
        }
        .jb-pill--warn {
          background: var(--jb-warn-tint);
          color: var(--jb-warn-text);
          border-color: rgba(138, 90, 18, 0.24);
        }
        .jb-pill__icon {
          font-size: 11px;
          line-height: 1;
        }
      `}</style>
    </span>
  );
}
