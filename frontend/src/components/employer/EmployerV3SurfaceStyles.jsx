'use client';

export default function EmployerV3SurfaceStyles() {
  return (
    <style jsx global>{`
      div:has(> #employer-v3-shell[data-v3-page='true']) {
        position: relative;
        flex-direction: column !important;
        color: var(--jb-v3-fg) !important;
        background-color: var(--jb-v3-bg) !important;
        background-image: radial-gradient(circle, var(--jb-v3-dot) 0.8px, transparent 0.9px) !important;
        background-size: 26px 26px !important;
        font-family: var(--jb-v3-font-display) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) > main {
        width: 100%;
        color: var(--jb-v3-fg) !important;
        background: linear-gradient(to bottom, transparent, var(--jb-v3-bg) 640px) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) > main > header {
        top: 96px !important;
        color: var(--jb-v3-fg-2) !important;
        background: color-mix(in srgb, var(--jb-v3-bg) 90%, transparent) !important;
        border-color: var(--jb-v3-line) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main h1,
      div:has(> #employer-v3-shell[data-v3-page='true']) main h2,
      div:has(> #employer-v3-shell[data-v3-page='true']) main h3 {
        color: var(--jb-v3-fg) !important;
        font-family: var(--jb-v3-font-display) !important;
        letter-spacing: -0.03em;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main input,
      div:has(> #employer-v3-shell[data-v3-page='true']) main select,
      div:has(> #employer-v3-shell[data-v3-page='true']) main textarea {
        color: var(--jb-v3-fg) !important;
        background: var(--jb-v3-control) !important;
        border-color: var(--jb-v3-line-2) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main input::placeholder,
      div:has(> #employer-v3-shell[data-v3-page='true']) main textarea::placeholder {
        color: var(--jb-v3-fg-3) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='border-radius'] {
        border-radius: 2px !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: rgb(255, 254, 251)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: rgb(251, 248, 241)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: rgb(247, 243, 234)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: #FFFEFB'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: #FBF8F1'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='background: #F7F3EA'] {
        background: var(--jb-v3-panel) !important;
        border-color: var(--jb-v3-line) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: rgb(27, 26, 22)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: #1B1A16'] {
        color: var(--jb-v3-fg) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: rgb(90, 84, 74)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: #5A544A'] {
        color: var(--jb-v3-fg-2) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: rgb(138, 131, 120)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: rgb(167, 158, 143)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: #8A8378'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='color: #A79E8F'] {
        color: var(--jb-v3-fg-3) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='border: 1px solid rgb(230, 222, 207)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='border: 1px solid #E6DECF'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='border-bottom: 1px solid rgb(231, 224, 210)'],
      div:has(> #employer-v3-shell[data-v3-page='true']) main [style*='border-bottom: 1px solid #E7E0D2'] {
        border-color: var(--jb-v3-line) !important;
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main button,
      div:has(> #employer-v3-shell[data-v3-page='true']) main a {
        font-family: var(--jb-v3-font-display);
      }
      div:has(> #employer-v3-shell[data-v3-page='true']) main .em-card > div {
        flex-direction: row !important;
        align-items: center !important;
      }
      @media (max-width: 720px) {
        div:has(> #employer-v3-shell[data-v3-page='true']) > main > header {
          top: 132px !important;
        }
        div:has(> #employer-v3-shell[data-v3-page='true']) main .em-card > div {
          flex-direction: column !important;
          align-items: flex-start !important;
        }
      }
    `}</style>
  );
}
