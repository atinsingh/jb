// A bordered surface. Used sparingly now: the design carries structure with
// hairline rules, so the only true cards left are the Applications board cards
// and the résumé paper. Radius is 10px to match the mockup's board cards.
export default function Card({ variant = 'default', accentLeft, children, style, ...rest }) {
  const base = {
    default: {
      background: 'var(--jb-a-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-line)',
      borderRadius: 10,
      color: 'var(--jb-a-ink)',
    },
    // A card waiting on the user's move: cobalt-tinted border, no fill change.
    attention: {
      background: 'var(--jb-a-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-tint-line)',
      borderRadius: 10,
      color: 'var(--jb-a-ink)',
    },
    invert: {
      background: 'var(--jb-a-invert)',
      borderWidth: 0,
      borderRadius: 10,
      color: 'var(--jb-a-invert-ink)',
    },
    dashed: {
      background: 'var(--jb-a-card)',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'var(--jb-a-line-dashed)',
      borderRadius: 14,
      color: 'var(--jb-a-ink)',
    },
    // The résumé sheet — the one place a shadow is allowed.
    paper: {
      background: 'var(--jb-a-card)',
      borderWidth: 0,
      borderRadius: 0,
      boxShadow: 'var(--jb-a-shadow-paper)',
      color: 'var(--jb-a-ink)',
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
