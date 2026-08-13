export default function Badge({ tone = 'neutral', children, style, ...rest }) {
  const toneStyle = {
    neutral: {
      background: 'var(--jb-a-control)',
      border: '1px solid var(--jb-a-line)',
      color: 'var(--jb-a-ink-2)',
    },
    success: {
      background: 'var(--jb-a-chip-success-bg)',
      border: '1px solid var(--jb-a-tint-line)',
      color: 'var(--jb-a-accent-2)',
    },
    warn: {
      background: 'var(--jb-a-tint)',
      border: '1px solid var(--jb-a-status-warn)',
      color: 'var(--jb-a-status-warn)',
    },
    danger: {
      background: 'var(--jb-a-danger-bg)',
      border: '1px solid var(--jb-a-danger-line)',
      color: 'var(--jb-a-danger-ink)',
    },
  }[tone];

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 999,
  };

  return (
    <span style={{ ...base, ...toneStyle, ...style }} {...rest}>
      {children}
    </span>
  );
}
