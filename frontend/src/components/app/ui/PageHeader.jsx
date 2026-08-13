export default function PageHeader({ title, subtitle, action, level = 'h2' }) {
  const Tag = level;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <Tag style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontSize: 26, fontWeight: 400, color: 'var(--jb-a-ink)' }}>
        {title}
      </Tag>
      {subtitle && (
        <span style={{ fontSize: 14, color: 'var(--jb-a-ink-muted)' }}>{subtitle}</span>
      )}
      {action && (
        <>
          <div style={{ flex: 1 }} />
          {action}
        </>
      )}
    </div>
  );
}
