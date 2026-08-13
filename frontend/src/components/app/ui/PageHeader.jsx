export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontSize: 26, fontWeight: 400, color: 'var(--jb-a-ink)' }}>
        {title}
      </h2>
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
