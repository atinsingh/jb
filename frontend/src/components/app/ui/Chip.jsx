// Multi-select filter chip (Matches: Seniority, Role family).
//
// It is a <button> with aria-pressed rather than a styled div: the mockup's
// selected state is carried entirely by colour, which a screen reader cannot
// see, so the pressed state has to be announced.
export default function Chip({ selected = false, children, style, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 28,
        padding: '0 11px',
        borderRadius: 6,
        fontFamily: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
        fontWeight: selected ? 600 : 500,
        background: selected ? 'var(--jb-a-tint)' : 'transparent',
        color: selected ? 'var(--jb-a-accent)' : 'var(--jb-a-ink-2)',
        border: `1px solid ${selected ? 'var(--jb-a-tint-line)' : 'var(--jb-a-chip-line)'}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
