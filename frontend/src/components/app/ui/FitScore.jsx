// The match-fit numeral. Cobalt at or above STRONG_FIT, neutral below.
//
// The threshold lives here and nowhere else. Dashboard, Matches and
// Applications all render a fit score, and if each one carried its own
// comparison they would drift the moment the ranking model changed — the same
// number would read "strong" on one screen and "ordinary" on the next.
export const STRONG_FIT = 88;

// Accepts 94, '94' or '94%' and returns a number, or null when there is no
// score to show. Callers must render an em dash rather than a fake 0.
export const fitValue = (fit) => {
  const n = Number(String(fit ?? '').replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
};

export const fitInk = (fit) => {
  const n = fitValue(fit);
  return n !== null && n >= STRONG_FIT ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-2)';
};

export default function FitScore({ fit, size = 22, caption, suffix = '', style, ...rest }) {
  const n = fitValue(fit);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', ...style }} {...rest}>
      <span
        style={{
          fontFamily: 'var(--jb-v3-font-mono)',
          fontSize: size,
          fontWeight: 600,
          lineHeight: 1.1,
          color: fitInk(fit),
        }}
      >
        {n === null ? '—' : `${n}${suffix}`}
      </span>
      {caption && (
        <span style={{ fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>{caption}</span>
      )}
    </span>
  );
}
