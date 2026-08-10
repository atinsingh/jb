'use client';

/**
 * GlassShapes — the flat solid-color backdrop for the glassmorphism system.
 *
 * Renders decorative, aria-hidden solid circles (NO gradients) that frosted
 * glass panels sit over and refract into soft tints. Drop it as the FIRST child
 * of any section/card container that is `position: relative; isolation: isolate;
 * overflow: clip`, and give the real content `position: relative; z-index: 1` so
 * it paints above the shapes. The glass panels' `backdrop-filter` then blurs the
 * shapes behind them.
 *
 * Colors come from the `--jb-shape-*` tokens (green / coral / yellow / lilac).
 * Positions/sizes are passed per-use so each surface can compose its own layout;
 * a few presets cover the common cases.
 *
 * Usage:
 *   <section style={{ position:'relative', isolation:'isolate', overflowX:'clip' }}>
 *     <GlassShapes preset="duo" />
 *     <div style={{ position:'relative', zIndex:1 }}> ...glass cards... </div>
 *   </section>
 */

const COLOR = {
  green: 'var(--jb-shape-green)',
  coral: 'var(--jb-shape-coral)',
  yellow: 'var(--jb-shape-yellow)',
  lilac: 'var(--jb-shape-lilac)',
};

// Preset shape layouts. Each entry: { c: color, s: diameter px, ...position }.
const PRESETS = {
  // Two bold circles — hero / compact sections.
  duo: [
    { c: 'green', s: 360, top: -90, right: -70 },
    { c: 'coral', s: 300, bottom: -110, left: -60 },
  ],
  // Four-color band — wide card rows (feature tiles).
  band: [
    { c: 'yellow', s: 360, bottom: -150, left: '3%' },
    { c: 'green', s: 330, bottom: -120, left: '32%' },
    { c: 'coral', s: 300, top: -130, right: '33%' },
    { c: 'lilac', s: 360, bottom: -150, right: '3%' },
  ],
  // Soft single accent — text-heavy or narrow sections.
  solo: [{ c: 'green', s: 320, top: -110, right: -80 }],
  // Warm pair — CTA / footer.
  warm: [
    { c: 'coral', s: 340, bottom: -140, left: '8%' },
    { c: 'yellow', s: 300, top: -120, right: '10%' },
  ],
};

export default function GlassShapes({ preset = 'duo', shapes }) {
  const list = shapes || PRESETS[preset] || PRESETS.duo;
  return (
    <div aria-hidden="true" className="jb-shapes">
      {list.map((sh, i) => {
        const { c, s, ...pos } = sh;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: s,
              height: s,
              borderRadius: '50%',
              background: COLOR[c] || COLOR.green,
              pointerEvents: 'none',
              ...pos,
            }}
          />
        );
      })}
      <style jsx>{`
        .jb-shapes {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: clip;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
