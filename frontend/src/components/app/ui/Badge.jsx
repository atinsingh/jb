// Small status pill. On this surface a Badge is a rare thing — the design
// replaced most badges with mono labels — so it is reserved for genuine state:
// an application's stage, a flag on a match row, an offer.
//
// Radius is 5px, not 999px: the mockup's badges are rectangular so they read as
// data cells in a table row, while the round pills are all actions.
export default function Badge({ tone = 'neutral', children, style, ...rest }) {
  const toneStyle = {
    neutral: { background: 'var(--jb-a-control)', color: 'var(--jb-a-chip-neutral-ink)' },
    accent: { background: 'var(--jb-a-tint)', color: 'var(--jb-a-accent)' },
    offer: { background: 'var(--jb-a-offer-bg)', color: 'var(--jb-a-offer-ink)' },
    warn: { background: 'var(--jb-a-warn-bg)', color: 'var(--jb-a-offer-ink)' },
    danger: { background: 'var(--jb-a-danger-bg)', color: 'var(--jb-a-danger-ink)' },
    // The mono uppercase flag ("DRAFT READY") that sits beside a role title.
    flag: {
      background: 'var(--jb-a-tint)',
      color: 'var(--jb-a-accent)',
      fontFamily: 'var(--jb-font-mono)',
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      height: 22,
    },
  }[tone] || {};

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 5,
        fontSize: 12.5,
        fontWeight: 600,
        ...toneStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
