// Onboarding preference pill (roles, locations). Louder than Chip on purpose:
// onboarding selections are the user's answer to a question, so the selected
// state fills solid, while Matches filters only tint — they are a lens over a
// list, not a commitment.
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
        borderRadius: 999,
        fontFamily: 'inherit',
        fontSize: 14,
        cursor: 'pointer',
        fontWeight: selected ? 600 : 500,
        background: selected ? 'var(--jb-a-accent)' : 'var(--jb-a-card)',
        color: selected ? 'var(--jb-a-accent-ink)' : 'var(--jb-a-ink-2)',
        border: `1px solid ${selected ? 'var(--jb-a-accent)' : 'var(--jb-a-line-strong)'}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
