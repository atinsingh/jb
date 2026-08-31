// The editorial page opener: mono eyebrow, display headline, deck, action row.
// Every designed screen starts with one and only one of these.
//
// `size` maps to the display steps in tokens.css. They are coarse by design —
// the headline is meant to be the only thing on the page at its size, so
// picking a step is a statement about which screen you are on, not a knob.
//
// The `lg` step is gone with the --jb-a-* set: it was labelled "employer" and
// no employer screen imports this component — the whole of components/app/ui
// is consumed only by /app/*, so `lg` had no caller to carry forward.
const SIZES = {
  hero: { fontSize: 'var(--jb-v3-display-hero)', maxWidth: '20ch' }, // dashboard
  md: { fontSize: 'var(--jb-v3-display-md)', maxWidth: '22ch' }, // matches
  sm: { fontSize: 'var(--jb-v3-display-sm)', maxWidth: 'none' }, // tracker, auth
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
            fontFamily: 'var(--jb-v3-font-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--jb-v3-accent)',
          }}
        >
          {eyebrow}
        </span>
      )}
      <Tag
        style={{
          margin: eyebrow ? '16px 0 0' : 0,
          fontFamily: 'var(--jb-v3-font-display)',
          // v3 display is Sora, loaded at 400/500/600 (pages/_app.js). The
          // shipped v3 headline is 600 with -0.05em tracking and 0.98 leading
          // (HomeV3.module.css .h1) — matched here so an app headline and a
          // marketing headline are the same object at different sizes.
          fontWeight: 600,
          fontSize: step.fontSize,
          lineHeight: 0.98,
          letterSpacing: '-0.05em',
          maxWidth: step.maxWidth,
          color: 'var(--jb-v3-fg)',
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
            color: 'var(--jb-v3-fg-2)',
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
