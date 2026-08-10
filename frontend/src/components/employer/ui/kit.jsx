'use client';

import { T } from './tokens';

/* Injects interaction styles (hover/focus/transitions) once per page. */
export function KitStyles() {
  return (
    <style jsx global>{`
      .emx * { box-sizing: border-box; }
      .emx ::-webkit-scrollbar { width: 10px; height: 10px; }
      .emx ::-webkit-scrollbar-thumb { background: #d9dde4; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
      .emx ::-webkit-scrollbar-thumb:hover { background: #c2c8d2; background-clip: padding-box; }
      .emx-btn { transition: background ${T.motion.fast}, box-shadow ${T.motion.fast}, border-color ${T.motion.fast}, transform ${T.motion.fast}; }
      .emx-btn:active { transform: translateY(0.5px); }
      .emx-btn-primary:hover { background: ${T.color.accentHover} !important; }
      .emx-btn-primary:active { background: ${T.color.accentPressed} !important; }
      .emx-btn-ghost:hover { background: ${T.color.surfaceSunken} !important; }
      .emx-btn-outline:hover { background: ${T.color.surfaceAlt} !important; border-color: ${T.color.borderStrong} !important; }
      .emx-btn-danger:hover { background: ${T.color.dangerSoft} !important; border-color: ${T.color.dangerBorder} !important; }
      .emx-input:focus { outline: none; border-color: ${T.color.accent} !important; box-shadow: ${T.shadow.focus}; }
      .emx-row { transition: background ${T.motion.fast}; }
      .emx-row:hover { background: ${T.color.surfaceAlt}; }
      .emx-card-hover { transition: box-shadow ${T.motion.base}, border-color ${T.motion.base}, transform ${T.motion.base}; }
      .emx-card-hover:hover { box-shadow: ${T.shadow.md}; border-color: ${T.color.borderStrong}; }
      .emx-spin { animation: emx-spin 0.7s linear infinite; }
      @keyframes emx-spin { to { transform: rotate(360deg); } }
      .emx-fade { animation: emx-fade 0.24s ease both; }
      @keyframes emx-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    `}</style>
  );
}

/* ---------------------------------------------------------------- Button --- */
const BTN_SIZES = {
  sm: { padding: '6px 12px', fontSize: 13, height: 32, radius: T.radius.md },
  md: { padding: '9px 16px', fontSize: 14, height: 40, radius: T.radius.md },
  lg: { padding: '11px 20px', fontSize: 15, height: 46, radius: T.radius.md },
};
export function Btn({ variant = 'primary', size = 'md', icon, children, style = {}, as, ...props }) {
  const s = BTN_SIZES[size] || BTN_SIZES.md;
  const variants = {
    primary: { background: T.color.accent, color: '#fff', border: '1px solid transparent', boxShadow: T.shadow.xs },
    outline: { background: T.color.surface, color: T.color.text, border: `1px solid ${T.color.border}` },
    ghost: { background: 'transparent', color: T.color.text2, border: '1px solid transparent' },
    danger: { background: T.color.surface, color: T.color.danger, border: `1px solid ${T.color.dangerBorder}` },
  };
  const Comp = as || 'button';
  return (
    <Comp
      className={`emx-btn emx-btn-${variant}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: T.font.sans, fontWeight: 600, fontSize: s.fontSize, lineHeight: 1,
        padding: s.padding, minHeight: s.height, borderRadius: s.radius, cursor: 'pointer',
        textDecoration: 'none', whiteSpace: 'nowrap', ...variants[variant], ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ Card --- */
export function Card({ children, hover = false, pad = 20, style = {}, ...props }) {
  return (
    <div
      className={hover ? 'emx-card-hover' : undefined}
      style={{ background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, boxShadow: T.shadow.sm, padding: pad, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge --- */
const TONES = {
  neutral: { bg: T.color.surfaceSunken, fg: T.color.text2, bd: T.color.border },
  accent: { bg: T.color.accentSoft, fg: T.color.accentInk, bd: T.color.accentSoftBorder },
  success: { bg: T.color.successSoft, fg: T.color.success, bd: T.color.successBorder },
  warning: { bg: T.color.warningSoft, fg: T.color.warning, bd: T.color.warningBorder },
  danger: { bg: T.color.dangerSoft, fg: T.color.danger, bd: T.color.dangerBorder },
  info: { bg: T.color.infoSoft, fg: T.color.info, bd: T.color.infoBorder },
};
export function Badge({ tone = 'neutral', dot = false, children, style = {} }) {
  const c = TONES[tone] || TONES.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: T.radius.pill, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg }} />}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Input --- */
export function TextInput({ icon, style = {}, wrapStyle = {}, ...props }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', ...wrapStyle }}>
      {icon && <span style={{ position: 'absolute', left: 12, display: 'flex', color: T.color.text3, pointerEvents: 'none' }}>{icon}</span>}
      <input
        className="emx-input"
        style={{ width: '100%', height: 40, padding: icon ? '0 12px 0 38px' : '0 12px', fontFamily: T.font.sans, fontSize: 14, color: T.color.text, background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, ...style }}
        {...props}
      />
    </div>
  );
}
export function SelectInput({ style = {}, children, ...props }) {
  return (
    <select
      className="emx-input"
      style={{ height: 40, padding: '0 34px 0 12px', fontFamily: T.font.sans, fontSize: 14, color: T.color.text, background: `${T.color.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A93A2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center`, border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, appearance: 'none', cursor: 'pointer', ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

/* ------------------------------------------------------------ PageHeader --- */
export function PageHeader({ title, subtitle, actions, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24, ...style }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: T.color.text }}>{title}</h1>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 14, color: T.color.text2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- StatTile --- */
export function StatTile({ label, value, delta, deltaTone = 'neutral', hint }) {
  const dc = TONES[deltaTone] || TONES.neutral;
  return (
    <Card pad={18}>
      <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', color: T.color.text3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: T.color.text, fontFamily: T.font.sans }}>{value}</span>
        {delta != null && <span style={{ fontSize: 12.5, fontWeight: 600, color: dc.fg }}>{delta}</span>}
      </div>
      {hint && <div style={{ marginTop: 4, fontSize: 12.5, color: T.color.text3 }}>{hint}</div>}
    </Card>
  );
}

/* ----------------------------------------------------------------- Table --- */
export function Table({ children, style = {} }) {
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, background: T.color.surface, boxShadow: T.shadow.sm, ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font.sans }}>{children}</table>
    </div>
  );
}
export function Th({ children, align = 'left', style = {} }) {
  return <th style={{ textAlign: align, padding: '12px 18px', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.color.text3, background: T.color.surfaceAlt, borderBottom: `1px solid ${T.color.border}`, whiteSpace: 'nowrap', ...style }}>{children}</th>;
}
export function Td({ children, align = 'left', style = {} }) {
  return <td style={{ textAlign: align, padding: '14px 18px', fontSize: 14, color: T.color.text, borderBottom: `1px solid ${T.color.border}`, verticalAlign: 'middle', ...style }}>{children}</td>;
}

/* ---------------------------------------------------------------- States --- */
export function Spinner({ size = 22 }) {
  return <span className="emx-spin" style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${T.color.border}`, borderTopColor: T.color.accent, display: 'inline-block' }} />;
}
const stateWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, padding: '56px 24px' };
export function Loading({ label = 'Loading…' }) {
  return <div style={stateWrap} role="status" aria-live="polite"><Spinner /><span style={{ fontSize: 14, color: T.color.text2 }}>{label}</span></div>;
}
export function Empty({ icon, title, hint, action }) {
  return (
    <div style={stateWrap} className="emx-fade">
      {icon && <div style={{ width: 48, height: 48, borderRadius: 12, background: T.color.surfaceSunken, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.text3 }}>{icon}</div>}
      {title && <div style={{ fontSize: 16, fontWeight: 600, color: T.color.text }}>{title}</div>}
      {hint && <div style={{ fontSize: 14, color: T.color.text2, maxWidth: 420 }}>{hint}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
export function ErrorPanel({ error, onRetry }) {
  const msg = (error && (error.message || String(error))) || 'Something went wrong.';
  return (
    <div style={stateWrap}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: T.color.dangerSoft, border: `1px solid ${T.color.dangerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.color.danger, fontSize: 22 }}>!</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.color.text }}>Couldn’t load this</div>
      <div style={{ fontSize: 13.5, color: T.color.danger, maxWidth: 420 }}>{msg}</div>
      {onRetry && <Btn variant="outline" size="sm" onClick={onRetry} style={{ marginTop: 6 }}>Try again</Btn>}
    </div>
  );
}
export function InlineError({ error }) {
  if (!error) return null;
  return (
    <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 14px', background: T.color.dangerSoft, border: `1px solid ${T.color.dangerBorder}`, borderRadius: T.radius.md, color: T.color.danger, fontSize: 13.5, marginBottom: 16 }}>
      <span style={{ fontWeight: 700 }}>!</span>
      <span>{error.message || String(error)}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- Avatar --- */
export function Avatar({ name = '', size = 36, style = {} }) {
  const initials = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U';
  return (
    <span style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: T.color.accentSoft, color: T.color.accentInk, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.36, ...style }}>{initials}</span>
  );
}
