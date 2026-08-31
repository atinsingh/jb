// The 11px uppercase mono micro-label. It is the ONLY label style on the app
// surface — the design replaced badges-and-boxes with tracked mono type, so
// anywhere you would reach for a small caps heading, reach for this instead.
//
// Tracking steps come from the mockup and are not interchangeable:
//   normal (0.16em) — the workhorse: filter groups, form fields, table heads
//   wide   (0.18em) — section rules that span the page ("Waiting on you")
//   hero   (0.22em) — the eyebrow above a display headline, once per screen
const TRACKING = { normal: '0.16em', wide: '0.18em', hero: '0.22em' };

export default function MonoLabel({
  tracking = 'normal',
  tone = 'muted',
  as: Tag = 'span',
  children,
  style,
  ...rest
}) {
  return (
    <Tag
      style={{
        fontFamily: 'var(--jb-v3-font-mono)',
        fontSize: 11,
        lineHeight: 1.4,
        letterSpacing: TRACKING[tracking] || TRACKING.normal,
        textTransform: 'uppercase',
        color: tone === 'accent' ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
