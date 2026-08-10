'use client';

/**
 * Jobocate logo — the single source of truth for the brand mark.
 *
 * The design system's mark: a bracketed "[J]" (the J-hook is the accent) next to
 * a lowercase `jobocate` JetBrains Mono wordmark. Use this everywhere instead of
 * hand-coding a wordmark, so the logo can never drift between pages again.
 *
 *   theme="light"  → marketing / cream surfaces (dark wordmark)
 *   theme="dark"   → app rail / dark surfaces (light wordmark)
 *   accent         → override the J-hook color (defaults to the brand green)
 *   mark           → render only the bracket mark (no wordmark)
 */
export default function Logo({
  theme = 'light',
  size = 24,
  accent,
  mark = false,
  className = '',
  style = {},
}) {
  const dark = theme === 'dark';
  // On the Flight Plan surface the bracket was #565D52 — a muted grey-green
  // that all but disappeared against #0d2418, leaving the mark looking like a
  // floating hook. Cream at 65% reads as a bracket without competing with the
  // wordmark, and the hook takes the accent green.
  const bracket = dark ? 'rgba(242, 236, 219, 0.65)' : '#B0A79A';
  const hook = accent || (dark ? '#8fd6a3' : '#1f7a4d');
  const word = dark ? '#f2ecdb' : '#221c15';

  return (
    <span
      className={className}
      role="img"
      aria-label="Jobocate"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, lineHeight: 1, ...style }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M10.5 5H6.5a1.5 1.5 0 0 0-1.5 1.5v19A1.5 1.5 0 0 0 6.5 27h4" stroke={bracket} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M21.5 5h4A1.5 1.5 0 0 1 27 6.5v19a1.5 1.5 0 0 1-1.5 1.5h-4" stroke={bracket} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M19 8v9.8a4.6 4.6 0 0 1-9.2 0" stroke={hook} strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      {!mark && (
        <span
          style={{
            // Sans, not mono. The mono wordmark read as a terminal string next
            // to the display serif headings and sat visually smaller than its
            // point size suggested.
            fontFamily: 'var(--jb-font-sans)',
            fontWeight: 600,
            fontSize: Math.round(size * 0.68),
            letterSpacing: '-0.02em',
            color: word,
          }}
        >
          jobocate
        </span>
      )}
    </span>
  );
}
