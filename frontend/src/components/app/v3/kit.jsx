'use client';

import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';

/**
 * The v3 candidate vocabulary, lifted from "Jobocate Candidate v3.dc.html".
 *
 * Every logged-in screen in that file is built from the same six parts, so
 * they live here once instead of being retyped per page. Sizes and spacings
 * are the artboard's exact values — where a number looks oddly specific
 * (9.5px, 14.5px, .045em) it is because the design says so.
 *
 * The shape of a v3 screen, in one sentence: a mono micro-label names a
 * section, hairline rules separate rows, and numbers carry the emphasis.
 * There are no cards, no pills, no shadows, and no filled surfaces except
 * the 1px-gap cell grids.
 */

export const HAIR = '1px solid var(--jb-v3-line)';

/** The mono micro-label. Default is the 9.5/.16em section label. */
export const mono = (size = 9.5, tracking = '0.16em', color = 'var(--jb-v3-fg-3)') => ({
  fontFamily: 'var(--jb-v3-font-mono)',
  fontSize: size,
  letterSpacing: tracking,
  textTransform: 'uppercase',
  color,
});

/** Page container. `width` matches the artboard per screen — not every screen
 *  is 1360: Offers is 1000, Billing 1060, Buddy/Profile 860, Import 620. */
export function Screen({ width = 1360, pad = '34px 28px 80px', children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)' }}>
      <AppTopNav />
      <div style={{ maxWidth: width, margin: '0 auto', padding: pad }}>{children}</div>
    </div>
  );
}

/** "40  OPEN ROLES" — the count that opens most screens. */
export function BigCount({ value, caption, size = 40 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={mono(10.5, '0.14em')}>{caption}</span>
    </div>
  );
}

/**
 * The 1px-gap cell grid. Cells sit on a --line ground so the gaps read as
 * rules rather than as gutters — this is how v3 draws a group of figures.
 */
export function CellGrid({ cols, children, style }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 1,
        background: 'var(--jb-v3-line)',
        border: HAIR,
        borderRadius: 2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** One cell of a CellGrid: mono label over a figure. */
export function Cell({ label, value, valueSize = 26, href, children }) {
  const body = (
    <>
      <div style={{ ...mono(9.5, '0.14em'), marginBottom: 10 }}>{label}</div>
      {children ?? (
        <div style={{ fontSize: valueSize, fontWeight: 600, letterSpacing: '-0.04em' }}>{value}</div>
      )}
    </>
  );
  const style = {
    background: 'var(--jb-v3-panel)',
    padding: '16px 18px',
    textAlign: 'left',
    display: 'block',
  };
  return href ? (
    <Link href={href} style={style}>
      {body}
    </Link>
  ) : (
    <div style={style}>{body}</div>
  );
}

/**
 * The table. v3 tables have no <table>, no zebra, no outer border: a mono
 * header row, then rows separated by top hairlines, then one closing hairline
 * so the last row is bounded like the others.
 *
 * `cols` is a grid-template-columns string straight from the artboard.
 */
export function TableHead({ cols, labels }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        gap: 16,
        padding: '0 4px 8px',
        ...mono(9.5, '0.14em'),
      }}
    >
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

export function Row({ cols, children, style }) {
  return (
    <div
      style={{
        borderTop: HAIR,
        display: 'grid',
        gridTemplateColumns: cols,
        gap: 16,
        alignItems: 'center',
        padding: '15px 4px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Closes a run of rows. Without it the last row has no bottom edge. */
export function EndRule({ style }) {
  return <div style={{ borderTop: HAIR, ...style }} />;
}

/** Section micro-label, optionally with something on the right. */
export function Label({ children, action, style }) {
  if (!action) return <div style={{ ...mono(), marginBottom: 4, ...style }}>{children}</div>;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 4,
        ...style,
      }}
    >
      <span style={mono()}>{children}</span>
      {action}
    </div>
  );
}

/**
 * The only button in v3: mono, uppercase, 2px, either outlined or accent-
 * filled. `block` makes it fill its grid cell, which is how the row-end
 * actions ("Tailor", "Apply", "Review") are drawn.
 */
export function MonoButton({
  children,
  href,
  onClick,
  filled = false,
  block = false,
  style,
  ...rest
}) {
  const base = {
    ...mono(10, '0.1em', filled ? '#fff' : 'var(--jb-v3-fg-2)'),
    display: block ? 'block' : 'inline-block',
    width: block ? '100%' : undefined,
    textAlign: 'center',
    border: filled ? 0 : '1px solid var(--jb-v3-line-2)',
    background: filled ? 'var(--jb-v3-accent)' : 'none',
    borderRadius: 2,
    padding: block ? '6px 0' : '5px 12px',
    cursor: 'pointer',
    transition: 'border-color .18s ease, color .18s ease',
    ...style,
  };
  if (href) {
    return (
      <Link href={href} style={base} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} style={base} {...rest}>
      {children}
    </button>
  );
}

/**
 * The bar meter. v3 uses this everywhere a proportion is shown — coverage,
 * quota, completion — instead of a progress bar or a ring.
 *
 * `pct` null means there is no denominator to measure against: every bar stays
 * off, which reads as "nothing yet" rather than as a fabricated zero.
 */
export function Ticks({ pct, n = 16, height = 11, grow = false }) {
  const filled = pct == null ? 0 : Math.round(n * Math.min(Math.max(pct, 0), 1));
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            flex: grow ? 1 : 'none',
            width: grow ? undefined : 3,
            height,
            display: 'block',
            background: i < filled ? 'var(--jb-v3-tick-on)' : 'var(--jb-v3-tick-off)',
            transition: 'background .5s ease',
          }}
        />
      ))}
    </div>
  );
}

/** The filter / option chip: outlined when off, accent-tinted when on. */
export function MonoChip({ on, children, onClick, style }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        ...mono(10, '0.1em', on ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-2)'),
        border: `1px solid ${on ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-line-2)'}`,
        background: on ? 'var(--jb-v3-accent-soft)' : 'none',
        borderRadius: 2,
        padding: '5px 11px',
        cursor: 'pointer',
        transition: 'all .18s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/**
 * The switch. v3's is a 38x20 rectangle with a 14px square knob — not a pill,
 * and not the rounded toggle from the previous direction.
 */
export function MonoSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        flex: 'none',
        width: 38,
        height: 20,
        border: '1px solid var(--jb-v3-line-2)',
        borderRadius: 2,
        background: 'none',
        padding: 0,
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 14,
          height: 14,
          background: checked ? 'var(--jb-v3-accent)' : 'var(--jb-v3-tick-off)',
          transform: `translateX(${checked ? 18 : 0}px)`,
          transition: 'transform .22s ease, background .22s ease',
        }}
      />
    </button>
  );
}

/**
 * Coverage ink. v3 colours a score by band rather than printing it plain:
 * at/above the strong threshold it is accent, mid is default ink, low is dim.
 * The threshold is the design's own 88.
 */
export const STRONG = 88;
export const covInk = (n) =>
  n == null
    ? 'var(--jb-v3-fg-3)'
    : n >= STRONG
      ? 'var(--jb-v3-accent)'
      : n >= 80
        ? 'var(--jb-v3-fg)'
        : 'var(--jb-v3-fg-3)';
