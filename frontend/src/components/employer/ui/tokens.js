/**
 * Jobocate Employer — design tokens (Microsoft Fluent 2 language).
 *
 * Light, layered surfaces with acrylic/mica depth, Fluent brand blue, Segoe UI
 * typography, small radii and Fluent's directional+ambient elevation. A single
 * source of truth so the whole employer surface stays consistent.
 */
export const T = {
  color: {
    // Canvas & layered surfaces (Fluent neutral backgrounds)
    bg: '#FAF9F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F5F5',
    surfaceSunken: '#EDEBE9',

    // Acrylic (semi-transparent, pair with backdrop-filter: blur)
    acrylic: 'rgba(250,249,248,0.72)',

    // Text (Fluent neutral foregrounds)
    text: '#242424',
    text2: '#605E5C',
    text3: '#8A8886',
    textInverse: '#FFFFFF',

    // Borders / strokes
    border: '#E1DFDD',
    borderStrong: '#C8C6C4',

    // Accent — Fluent brand blue
    accent: '#0F6CBD',
    accentHover: '#115EA3',
    accentPressed: '#0E4775',
    accentSoft: '#EBF3FC',
    accentSoftBorder: '#B4D6FA',
    accentInk: '#0E4775',

    // Semantic (Fluent status)
    success: '#0E700E',
    successSoft: '#DFF6DD',
    successBorder: '#A7E3A5',
    warning: '#8A5700',
    warningSoft: '#FFF4CE',
    warningBorder: '#FDE295',
    danger: '#B10E1C',
    dangerSoft: '#FDE7E9',
    dangerBorder: '#F3C9CD',
    info: '#0F6CBD',
    infoSoft: '#EBF3FC',
    infoBorder: '#B4D6FA',

    // Sidebar (LIGHT Fluent NavView rail)
    railBg: '#F3F2F1',
    railSurface: '#FFFFFF',
    railBorder: '#E1DFDD',
    railText: '#242424',
    railTextDim: '#605E5C',
    railActiveBg: '#EBF3FC',
    railActiveInk: '#0F6CBD',
    railActiveBar: '#0F6CBD',
  },
  radius: { sm: 4, md: 6, lg: 8, xl: 12, pill: 999 },
  // Fluent directional + ambient elevation
  shadow: {
    xs: '0 0.3px 0.9px rgba(0,0,0,0.10), 0 1.6px 3.6px rgba(0,0,0,0.11)',
    sm: '0 0.3px 0.9px rgba(0,0,0,0.10), 0 1.6px 3.6px rgba(0,0,0,0.13)',
    md: '0 0.6px 1.8px rgba(0,0,0,0.10), 0 3.2px 7.2px rgba(0,0,0,0.13)',
    lg: '0 1.2px 3.6px rgba(0,0,0,0.11), 0 6.4px 14.4px rgba(0,0,0,0.13)',
    focus: '0 0 0 2px rgba(15,108,189,0.30)',
  },
  font: {
    sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
    mono: "'Cascadia Code', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  space: (n) => `${n * 4}px`,
  motion: { fast: '100ms cubic-bezier(0.33,0,0.67,1)', base: '200ms cubic-bezier(0.1,0.9,0.2,1)' },
};

export const SIDEBAR_W = 260;
export const SIDEBAR_W_COLLAPSED = 48;
