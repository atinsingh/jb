'use client';

/**
 * Shared loading / empty / error states for employer pages.
 *
 * These replace the old anti-pattern of seeding pages with fabricated "sample"
 * data and silently keeping it on fetch failure. Every data-backed section
 * should render one of these while there is no real data to show.
 */

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 8,
  padding: '48px 24px',
  color: '#6B675E',
};

export function LoadingState({ label = 'Loading…', tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div style={{ ...wrap, color: dark ? 'var(--jb-v3-fg-2)' : wrap.color }} role="status" aria-live="polite">
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `2px solid ${dark ? 'var(--jb-v3-line-2)' : '#E4DED2'}`,
          borderTopColor: dark ? 'var(--jb-v3-accent)' : '#1B1A16',
          animation: 'employer-spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: 14 }}>{label}</span>
      <style>{`@keyframes employer-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function EmptyState({ icon = '○', title, hint, action = null, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div style={{ ...wrap, color: dark ? 'var(--jb-v3-fg-2)' : wrap.color }}>
      <span aria-hidden style={{ fontSize: 26, opacity: 0.5 }}>
        {icon}
      </span>
      {title && (
        <div style={{ fontSize: 15, fontWeight: 600, color: dark ? 'var(--jb-v3-fg)' : '#1B1A16' }}>
          {title}
        </div>
      )}
      {hint && <div style={{ fontSize: 13, maxWidth: 360 }}>{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, tone = 'light' }) {
  const dark = tone === 'dark';
  const message =
    (error && (error.message || String(error))) || 'Something went wrong.';
  return (
    <div style={{ ...wrap, color: dark ? 'var(--jb-v3-fg-2)' : wrap.color }}>
      <span aria-hidden style={{ fontSize: 24 }}>
        ⚠️
      </span>
      <div style={{ fontSize: 15, fontWeight: 600, color: dark ? 'var(--jb-v3-fg)' : '#1B1A16' }}>
        Couldn’t load this
      </div>
      <div style={{ fontSize: 13, maxWidth: 360, color: dark ? '#F2A38B' : '#9B4A2F' }}>
        {message}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${dark ? 'var(--jb-v3-line-2)' : '#E4DED2'}`,
            color: dark ? 'var(--jb-v3-fg)' : '#1B1A16',
            background: dark ? 'var(--jb-v3-panel)' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Small inline banner for surfacing write/action errors (save failed, etc.). */
export function InlineError({ error }) {
  if (!error) return null;
  const message = error.message || String(error);
  return (
    <div
      role="alert"
      style={{
        margin: '8px 0',
        padding: '10px 14px',
        borderRadius: 8,
        background: '#FBEDE4',
        border: '1px solid #F0C9B0',
        color: '#9B4A2F',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}
