'use client';

/**
 * Shared loading / empty / error states for candidate /app/* pages.
 *
 * These replace the old anti-pattern of seeding pages with fabricated "sample"
 * data and silently keeping it on fetch failure. Every data-backed section
 * should render one of these while there is no real data to show.
 *
 * The employer surface has its own EmployerStates.jsx; it is deliberately NOT
 * shared, because this one now speaks v3 and that one still speaks the cream
 * palette. Do not re-unify them until the employer surface moves too.
 */

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 8,
  padding: '48px 24px',
  color: 'var(--jb-v3-fg-2)',
};

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div style={wrap} role="status" aria-live="polite">
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid var(--jb-v3-line-2)',
          borderTopColor: 'var(--jb-v3-fg)',
          animation: 'app-spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: 14 }}>{label}</span>
      <style>{`@keyframes app-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function EmptyState({ icon = '○', title, hint, action = null }) {
  return (
    <div style={wrap}>
      <span aria-hidden style={{ fontSize: 26, opacity: 0.5 }}>
        {icon}
      </span>
      {title && (
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>
          {title}
        </div>
      )}
      {hint && <div style={{ fontSize: 13, maxWidth: 360 }}>{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const message =
    (error && (error.message || String(error))) || 'Something went wrong.';
  return (
    <div style={wrap}>
      <span aria-hidden style={{ fontSize: 24 }}>
        ⚠️
      </span>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>
        Couldn’t load this
      </div>
      <div style={{ fontSize: 13, maxWidth: 360, color: 'var(--jb-v3-danger)' }}>
        {message}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 2,
            border: '1px solid var(--jb-v3-line-2)',
            // Was a hardcoded #fff, which is a white chip on the dark theme.
            background: 'transparent',
            color: 'var(--jb-v3-fg)',
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
        borderRadius: 2,
        background: 'var(--jb-v3-danger-soft)',
        border: '1px solid var(--jb-v3-danger-line)',
        color: 'var(--jb-v3-danger)',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}
