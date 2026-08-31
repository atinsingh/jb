// A bordered surface. Used sparingly now: the design carries structure with
// hairline rules, so the only true cards left are the Applications board cards
// and the résumé paper. Radius is 2px: v3 is rectilinear throughout — every
// panel, field and notice on the shipped v3 screens is 2px (AuthV3.module.css).
export default function Card({ variant = 'default', accentLeft, children, style, ...rest }) {
  const base = {
    default: {
      background: 'var(--jb-v3-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-v3-line)',
      borderRadius: 2,
      color: 'var(--jb-v3-fg)',
    },
    // A card waiting on the user's move: cobalt-tinted border, no fill change.
    attention: {
      background: 'var(--jb-v3-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-v3-accent-line)',
      borderRadius: 2,
      color: 'var(--jb-v3-fg)',
    },
    invert: {
      background: 'var(--jb-v3-invert)',
      borderWidth: 0,
      borderRadius: 2,
      color: 'var(--jb-v3-invert-ink)',
    },
    dashed: {
      background: 'var(--jb-v3-card)',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'var(--jb-v3-line-dashed)',
      borderRadius: 2,
      color: 'var(--jb-v3-fg)',
    },
    // The résumé sheet — the one place a shadow is allowed.
    paper: {
      background: 'var(--jb-v3-card)',
      borderWidth: 0,
      borderRadius: 0,
      boxShadow: 'var(--jb-v3-shadow-paper)',
      color: 'var(--jb-v3-fg)',
    },
  }[variant];

  const accentStyle = accentLeft ? { borderLeft: `4px solid ${accentLeft}` } : null;

  // accentStyle is spread LAST — it must always win on the left edge, even over
  // a caller's `style.border`/`style.borderColor` (both touch border-left-color
  // too; spread order is how the later one wins here).
  return (
    <div style={{ ...base, ...style, ...accentStyle }} {...rest}>
      {children}
    </div>
  );
}
