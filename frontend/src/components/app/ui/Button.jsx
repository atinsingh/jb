'use client';

import { useState } from 'react';
import Link from 'next/link';

// Sizes lifted from the mockup. Each one has a job: lg opens a screen, md is a
// form's commit, sm is a row action, xs lives in a 64px header bar.
const SIZES = {
  xs: { height: 34, padding: '0 16px', fontSize: 13.5 },
  sm: { height: 38, padding: '0 20px', fontSize: 14 },
  md: { height: 46, padding: '0 26px', fontSize: 15 },
  lg: { height: 50, padding: '0 28px', fontSize: 15.5 },
};

// Hover is a state hook rather than CSS because this surface styles inline —
// see the header comment in tokens.css. The two hovers that matter are the
// only ones the design specifies: primary darkens, secondary's border goes ink.
const VARIANTS = {
  primary: {
    rest: { background: 'var(--jb-a-accent)', color: 'var(--jb-a-accent-ink)', border: '0' },
    hover: { background: 'var(--jb-a-accent-hover)' },
    fontWeight: 600,
  },
  secondary: {
    rest: {
      background: 'var(--jb-a-card)',
      color: 'var(--jb-a-ink)',
      border: '1.5px solid var(--jb-a-line-btn)',
    },
    hover: { borderColor: 'var(--jb-a-ink)' },
    fontWeight: 600,
  },
  // Bare accent text — "Reset", "All 42 matches →". No box at all.
  quiet: {
    rest: { background: 'none', border: '0', color: 'var(--jb-a-accent)', padding: 0, height: 'auto' },
    hover: { color: 'var(--jb-a-accent-hover)' },
    fontWeight: 600,
  },
  // 38x38 circle — the save heart on a match row.
  icon: {
    rest: {
      background: 'var(--jb-a-card)',
      border: '1px solid var(--jb-a-line-strong)',
      color: 'var(--jb-a-ink-soft)',
      width: 38,
      height: 38,
      padding: 0,
      borderRadius: 999,
    },
    hover: { borderColor: 'var(--jb-a-ink)' },
    fontWeight: 500,
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  shape = 'pill',
  href,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const dims = variant === 'quiet' || variant === 'icon' ? null : SIZES[size] || SIZES.md;

  const merged = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: shape === 'square' ? 8 : 999,
    fontFamily: 'inherit',
    fontWeight: v.fontWeight,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ...dims,
    ...v.rest,
    ...(hover ? v.hover : null),
    ...style,
  };

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };

  if (href) {
    return (
      <Link href={href} style={merged} {...handlers} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" style={merged} {...handlers} {...rest}>
      {children}
    </button>
  );
}
