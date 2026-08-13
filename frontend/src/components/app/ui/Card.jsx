export default function Card({ variant = 'default', accentLeft, children, style, ...rest }) {
  const base = {
    default: {
      background: 'var(--jb-a-card)',
      border: '1px solid var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-ink)',
    },
    invert: {
      background: 'var(--jb-a-invert)',
      border: '1px solid var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-invert-ink)',
    },
    dashed: {
      background: 'var(--jb-a-card)',
      border: '1px dashed var(--jb-a-line-strong)',
      borderRadius: 16,
      color: 'var(--jb-a-ink)',
    },
  }[variant];

  const accentStyle = accentLeft ? { borderLeft: `4px solid ${accentLeft}` } : null;

  // accentStyle is spread LAST — it must always win on the left edge, even
  // over a caller's `style.border`/`style.borderColor` (both touch
  // border-left-color too; spread order is how the later one wins here).
  return (
    <div style={{ ...base, ...style, ...accentStyle }} {...rest}>
      {children}
    </div>
  );
}
