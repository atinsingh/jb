'use client';

import { useEffect } from 'react';

/*
 * Small shared primitives for the admin console pages. Purely presentational —
 * no data of their own. Slate/amber operator palette.
 */

export const COLORS = {
  ink: '#0F172A',
  sub: '#475569',
  muted: '#64748B',
  line: '#E2E8F0',
  card: '#FFFFFF',
  accent: '#B45309', // amber-700, readable on light
  accentBg: '#FEF3C7',
  accentBorder: '#FDE68A',
};

export function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right = null }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: COLORS.ink }}>{children}</h2>
      {right}
    </div>
  );
}

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  padding: '8px 14px',
  borderRadius: 9,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: 1.2,
};

export function Btn({ children, variant = 'default', disabled = false, style = {}, ...rest }) {
  const variants = {
    primary: { background: '#0F172A', color: '#fff', border: '1px solid #0F172A' },
    default: { background: '#fff', color: COLORS.ink, border: `1px solid ${COLORS.line}` },
    accent: { background: '#B45309', color: '#fff', border: '1px solid #B45309' },
    danger: { background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5' },
    ghost: { background: 'transparent', color: COLORS.sub, border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...btnBase,
        ...(variants[variant] || variants.default),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
    green: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    amber: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
    red: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
    blue: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    slate: { bg: '#0F172A', color: '#fff', border: '#0F172A' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--jb-font-mono)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: t.color,
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 999,
        padding: '2px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

const fieldBase = {
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: COLORS.ink,
  padding: '8px 11px',
  borderRadius: 9,
  border: `1px solid ${COLORS.line}`,
  background: '#fff',
  outline: 'none',
};

export function TextInput({ style = {}, ...rest }) {
  return <input style={{ ...fieldBase, ...style }} {...rest} />;
}

export function Select({ options = [], style = {}, ...rest }) {
  return (
    <select style={{ ...fieldBase, cursor: 'pointer', ...style }} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* Table helpers ----------------------------------------------------------- */
export function Table({ head, children }) {
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: COLORS.muted,
                  fontWeight: 600,
                  padding: '0 14px 10px',
                  borderBottom: `1px solid ${COLORS.line}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, style = {} }) {
  return (
    <td
      style={{
        padding: '13px 14px',
        borderBottom: `1px solid #F1F5F9`,
        fontSize: 13.5,
        color: COLORS.ink,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

/* Pagination -------------------------------------------------------------- */
export function Pagination({ page, limit, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total || 0);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 14,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12.5, color: COLORS.muted, fontFamily: 'var(--jb-font-mono)' }}>
        {from}–{to} of {total || 0}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </Btn>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 12.5,
            color: COLORS.sub,
            fontFamily: 'var(--jb-font-mono)',
          }}
        >
          {page} / {totalPages}
        </span>
        <Btn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next →
        </Btn>
      </div>
    </div>
  );
}

/* Confirm dialog ---------------------------------------------------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div
      onClick={() => !busy && onCancel()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(2,6,23,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(92vw,460px)',
          background: '#fff',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 16,
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.4)',
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: COLORS.ink }}>{title}</h3>
        {message && (
          <p style={{ fontSize: 14, lineHeight: 1.5, color: COLORS.sub, margin: '0 0 14px' }}>{message}</p>
        )}
        {children}
        {error && (
          <div
            role="alert"
            style={{
              margin: '4px 0 14px',
              padding: '10px 14px',
              borderRadius: 8,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: 13,
            }}
          >
            {error.message || String(error)}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Btn>
          <Btn variant={confirmVariant} disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
