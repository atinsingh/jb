'use client';

import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';

/**
 * The shared chrome for every public (marketing / legal / logged-out) page.
 *
 * `_app.js` applies no layout, so before this every public page owned its own
 * header and footer — which is how the site ended up with three competing navs.
 * Put a public page on this and it gets the one nav, the one footer, and:
 *
 *   <main id="main">  — SiteNav renders a "Skip to content" link to #main as
 *   its first tab stop. That target existed on exactly one page, so the skip
 *   link was a dead anchor everywhere else, and none of those pages exposed a
 *   `main` landmark for screen-reader users to jump to either. Rendering the
 *   landmark here fixes both for every consumer at once.
 *
 *   The dark "Flight Plan" surface — the page gradient and cream ink live here,
 *   not on each page. Pages therefore declare no background of their own; a
 *   page that sets an opaque background will punch a hole in the gradient.
 *
 * Pages must NOT render their own <main> inside this.
 *
 * @param {'candidate'|'employer'} variant — passed to SiteNav; 'employer'
 *   promotes the hiring CTA on the employer funnel pages.
 */
export default function PublicLayout({ children, variant = 'candidate', surface = 'flightplan' }) {
  return (
    <div className={surface === 'v3' ? 'jb-dark jbv3-chrome' : 'jb-dark'}>
      <SiteNav variant={variant} />
      <main id="main">{children}</main>
      <SiteFooter />

      <style jsx>{`
        .jb-dark {
          min-height: 100vh;
          background: var(--jb-d-gradient);
          color: var(--jb-d-ink);
          font-family: var(--jb-font-sans);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <style jsx global>{`
        /* The gradient lives on .jb-dark, but overscroll and the area under a
           short page both reveal <body>. Painting the darkest stop there stops
           a white band flashing at either end of the scroll.

           html:not(.dark) body in globals.css sets background-color:#ffffff at
           specificity (0,1,2); a bare body selector loses to it, so this
           matches the same shape to win on source order. */
        html:not(.dark) body,
        html.dark body,
        body {
          background-color: var(--jb-d-bg);
        }

        /* ---------------------------------------------------------------
           Cream -> dark token remap, scoped to the marketing surface.

           SiteNav, SiteFooter and the site primitives are written against the
           cream --jb-* tokens (186 references). Rather than rewrite every
           rule, the marketing surface rebinds those names to their dark
           equivalents, so the shared chrome and any token-driven page follow
           the Flight Plan palette automatically.

           This is deliberately scoped to .jb-dark: /app/*, /employer/* and
           /admin/* still read the cream values from :root and are unaffected.
           --------------------------------------------------------------- */
        .jb-dark {
          --jb-ivory: var(--jb-d-bg);
          --jb-surface: var(--jb-d-panel);
          --jb-surface-alt: var(--jb-d-glass);
          --jb-surface-sunk: var(--jb-d-panel-solid);

          --jb-ink: var(--jb-d-ink);
          --jb-ink-body: var(--jb-d-ink-70);
          --jb-ink-muted: var(--jb-d-ink-65);
          --jb-ink-subtle: var(--jb-d-ink-55);
          --jb-on-dark: var(--jb-d-ink);
          --jb-on-dark-muted: var(--jb-d-ink-55);

          /* On dark, the accent no longer needs a darkened variant for text —
             #8fd6a3 is already 9.7:1 here, where the cream palette needed
             --jb-accent-text to reach AA. They collapse to one value. */
          --jb-accent: var(--jb-d-accent);
          --jb-accent-text: var(--jb-d-accent);
          --jb-accent-strong: var(--jb-d-accent-hi);
          --jb-accent-fill: var(--jb-d-accent);
          --jb-accent-on-dark: var(--jb-d-accent);
          --jb-tint-green: var(--jb-d-accent-tint);
          --jb-focus: var(--jb-d-focus);

          --jb-border: var(--jb-d-line-card);
          --jb-border-soft: var(--jb-d-line);
          --jb-border-strong: var(--jb-d-line-btn);
          --jb-dark: var(--jb-d-footer);
          --jb-dark-border: var(--jb-d-line);

          --jb-glass: var(--jb-d-panel);
          --jb-glass-edge: var(--jb-d-line-card);

          /* The employer funnel keeps a distinct hue, lifted for dark. */
          --jb-employer: #7cc4ff;
          --jb-employer-text: #7cc4ff;
          --jb-employer-tint: rgba(124, 196, 255, 0.12);

          --jb-warn-text: var(--jb-d-amber);
          --jb-warn-tint: rgba(255, 181, 46, 0.14);
        }

        /* The footer keeps its dark ground in BOTH themes, so its ink must stay
           on the dark scale. Without this it inherits light mode's near-black
           ink and renders dark-on-dark. */
        html[data-jb-theme='light'] .jb-dark .jbfoot {
          --jb-d-ink: #f2ecdb;
          --jb-d-ink-85: rgba(242, 236, 219, 0.85);
          --jb-d-ink-70: rgba(242, 236, 219, 0.7);
          --jb-d-ink-65: rgba(242, 236, 219, 0.65);
          --jb-d-ink-55: rgba(242, 236, 219, 0.55);
          --jb-d-ink-45: rgba(242, 236, 219, 0.45);
          --jb-d-accent: #8fd6a3;
          --jb-d-line: rgba(242, 236, 219, 0.12);
          --jb-d-line-card: rgba(242, 236, 219, 0.15);
          --jb-d-focus: #8fd6a3;
          --jb-ink: var(--jb-d-ink);
          --jb-ink-body: var(--jb-d-ink-70);
          --jb-ink-muted: var(--jb-d-ink-65);
          --jb-ink-subtle: var(--jb-d-ink-55);
          --jb-on-dark: var(--jb-d-ink);
          --jb-on-dark-muted: var(--jb-d-ink-55);
          --jb-accent: var(--jb-d-accent);
          --jb-accent-text: var(--jb-d-accent);
          --jb-border: var(--jb-d-line-card);
          --jb-border-soft: var(--jb-d-line);
        }

        .jb-dark h1,
        .jb-dark h2,
        .jb-dark h3 {
          font-family: var(--jb-font-display);
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        /* Display italics are the accent voice throughout the mocks:
           "…to <i>an offer.</i>", "Questions, <i>answered.</i>" */
        .jb-dark .jb-em {
          font-style: italic;
          color: var(--jb-d-accent);
        }

        .jb-dark ::selection {
          background: var(--jb-d-accent);
          color: var(--jb-d-bg);
        }

        /* The cream palette's blue focus ring is invisible on #0d2418. */
        .jb-dark a:focus-visible,
        .jb-dark button:focus-visible,
        .jb-dark input:focus-visible,
        .jb-dark select:focus-visible,
        .jb-dark textarea:focus-visible,
        .jb-dark [tabindex]:focus-visible {
          outline: 3px solid var(--jb-d-focus);
          outline-offset: 2px;
          border-radius: 4px;
        }

        .jb-dark input::placeholder,
        .jb-dark textarea::placeholder {
          color: var(--jb-d-ink-45);
        }

        @media (prefers-reduced-motion: reduce) {
          .jb-dark *,
          .jb-dark *::before,
          .jb-dark *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
