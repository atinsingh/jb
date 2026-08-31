// Onboarding preference control (roles, locations). Louder than Chip on
// purpose: onboarding selections are the user's answer to a question, so the
// selected state fills solid, while Matches filters only tint — they are a
// lens over a list, not a commitment.
//
// Named "Pill" but no longer round: v3 is rectilinear, so the loudness now
// comes entirely from the solid fill and the larger 34px height. The name is
// kept because it is what every call site imports.
export default function Pill({ selected = false, children, style, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 34,
        padding: '0 14px',
        borderRadius: 2,
        fontFamily: 'inherit',
        fontSize: 14,
        cursor: 'pointer',
        fontWeight: selected ? 600 : 500,
        background: selected ? 'var(--jb-v3-accent)' : 'var(--jb-v3-card)',
        color: selected ? 'var(--jb-v3-accent-ink)' : 'var(--jb-v3-fg-2)',
        border: `1px solid ${selected ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line-2)'}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
