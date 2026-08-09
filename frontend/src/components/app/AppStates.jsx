'use client';

/**
 * Shared loading / empty / error states for candidate /app/* pages.
 *
 * These replace the old anti-pattern of seeding pages with fabricated "sample"
 * data and silently keeping it on fetch failure. Every data-backed section
 * should render one of these while there is no real data to show.
 *
 * Mirrors components/employer/EmployerStates.jsx (same cream/green palette).
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

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div style={wrap} role="status" aria-live="polite">
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid #E4DED2',
          borderTopColor: '#1B1A16',
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
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1B1A16' }}>
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
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1B1A16' }}>
        Couldn’t load this
      </div>
      <div style={{ fontSize: 13, maxWidth: 360, color: '#9B4A2F' }}>
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
            border: '1px solid #E4DED2',
            background: '#fff',
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
