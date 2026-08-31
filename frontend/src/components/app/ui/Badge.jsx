// Small status pill. On this surface a Badge is a rare thing — the design
// replaced most badges with mono labels — so it is reserved for genuine state:
// an application's stage, a flag on a match row, an offer.
//
// Radius is 2px, the v3 radius: badges read as data cells in a table row.
export default function Badge({ tone = 'neutral', children, style, ...rest }) {
  const toneStyle = {
    neutral: { background: 'var(--jb-v3-control)', color: 'var(--jb-v3-chip-ink)' },
    accent: { background: 'var(--jb-v3-accent-soft)', color: 'var(--jb-v3-accent)' },
    offer: { background: 'var(--jb-v3-warn-soft)', color: 'var(--jb-v3-warn)' },
    warn: { background: 'var(--jb-v3-warn-soft)', color: 'var(--jb-v3-warn)' },
    danger: { background: 'var(--jb-v3-danger-soft)', color: 'var(--jb-v3-danger)' },
    // The mono uppercase flag ("DRAFT READY") that sits beside a role title.
    flag: {
      background: 'var(--jb-v3-accent-soft)',
      color: 'var(--jb-v3-accent)',
      fontFamily: 'var(--jb-v3-font-mono)',
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
        borderRadius: 2,
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
