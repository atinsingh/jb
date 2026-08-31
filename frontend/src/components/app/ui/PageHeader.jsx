// The 64px bar at the top of a screen: title on the left, controls on the right.
// It is chrome, not content — the page's real heading is the <Hero> below it,
// which is why the title here is a plain 15px sans span and defaults to h2.
export default function PageHeader({ title, subtitle, action, level = 'h2', style }) {
  const Tag = level;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 64,
        padding: '0 44px',
        borderBottom: '1px solid var(--jb-v3-line)',
        flexShrink: 0,
        background: 'var(--jb-v3-panel)',
        ...style,
      }}
    >
      <Tag style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>
        {title}
      </Tag>
      {subtitle && <span style={{ fontSize: 14, color: 'var(--jb-v3-fg-3)' }}>{subtitle}</span>}
      <span style={{ flex: 1 }} />
      {action}
    </div>
  );
}
