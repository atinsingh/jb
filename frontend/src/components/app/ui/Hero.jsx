// The editorial page opener: mono eyebrow, Instrument Serif headline, deck,
// action row. Every designed screen starts with one and only one of these.
//
// `size` maps to the display steps in tokens.css. They are coarse by design —
// the headline is meant to be the only thing on the page at its size, so
// picking a step is a statement about which screen you are on, not a knob.
const SIZES = {
  hero: { fontSize: 'var(--jb-a-display-hero)', maxWidth: '20ch' }, // dashboard
  lg: { fontSize: 'var(--jb-a-display-lg)', maxWidth: '24ch' }, // employer
  md: { fontSize: 'var(--jb-a-display-md)', maxWidth: '22ch' }, // matches
  sm: { fontSize: 'var(--jb-a-display-sm)', maxWidth: 'none' }, // tracker, auth
};

export default function Hero({
  eyebrow,
  title,
  deck,
  actions,
  size = 'hero',
  level: Tag = 'h1',
  style,
}) {
  const step = SIZES[size] || SIZES.hero;
  return (
    <div style={style}>
      {eyebrow && (
        <span
          style={{
            fontFamily: 'var(--jb-font-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--jb-a-accent)',
          }}
        >
          {eyebrow}
        </span>
      )}
      <Tag
        style={{
          margin: eyebrow ? '16px 0 0' : 0,
          fontFamily: 'var(--jb-font-display)',
          // Instrument Serif ships weight 400 only; a heavier value would get a
          // smeared synthetic bold. Display type earns emphasis from size.
          fontWeight: 400,
          fontSize: step.fontSize,
          lineHeight: 1.03,
          letterSpacing: '-0.02em',
          maxWidth: step.maxWidth,
          color: 'var(--jb-a-ink)',
        }}
      >
        {title}
      </Tag>
      {deck && (
        <p
          style={{
            margin: '18px 0 0',
            fontSize: 17.5,
            lineHeight: 1.55,
            color: 'var(--jb-a-ink-2)',
            maxWidth: '58ch',
          }}
        >
          {deck}
        </p>
      )}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
