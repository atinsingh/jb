// The switch. role="switch" + aria-checked so the on/off state survives without
// colour; `label` is required because the visible text sits outside the control.
export default function Toggle({ checked = false, onChange, label, size = 'sm', style, ...rest }) {
  const track = size === 'lg' ? { w: 40, h: 24, knob: 20 } : { w: 38, h: 22, knob: 18 };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        width: track.w,
        height: track.h,
        flexShrink: 0,
        border: 0,
        borderRadius: 999,
        background: checked ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line-btn)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        padding: 2,
        cursor: 'pointer',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: track.knob,
          height: track.knob,
          borderRadius: '50%',
          background: 'var(--jb-v3-card)',
        }}
      />
    </button>
  );
}
