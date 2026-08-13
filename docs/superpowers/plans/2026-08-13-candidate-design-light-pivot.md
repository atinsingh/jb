# Candidate Design Light Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-value the `--jb-a-*` design-token system from the shipped dark-ink/cream/Instrument-Serif/green system to the newly approved light/white/black/blue-multi-hue system, rework the four existing shared primitives (`Card`, `Badge`, `Button`, `PageHeader`) and add one new one (`MatchScoreRing`) to match, and re-migrate `dashboard.jsx` — the reference screen — onto the new direction, with the theme toggle removed.

**Architecture:** `--jb-a-*` already exists as a complete token family and is already the single source every primitive and `dashboard.jsx` reads through — that plumbing does not change. This plan changes the *values* those tokens hold (light instead of dark, blue-primary instead of green-primary), deletes the now-unneeded `[data-jb-theme='light']` override block for this token family (single palette, no dark mode), swaps the display typeface, adds a small number of new tokens the mockup introduces that didn't exist before (shadows, glow tints, avatar-badge hues), and updates the primitives + `dashboard.jsx` to consume them. No primitive's public interface (prop names/shapes) changes except `Badge`, which gains a new `variant="avatar"` mode alongside its existing `tone` pill mode.

**Tech Stack:** Next.js pages router, React (inline `style` objects + `styled-jsx`, matching this file's existing convention — not Tailwind), CSS custom properties, `next/font/google` for self-hosted type.

**Spec:** `docs/superpowers/specs/2026-08-13-candidate-flow-design-unification.md` (see the "Revision note" at the top of its Context section, and the Direction section for the approved palette)

## Global Constraints

- **Single palette, no dark mode.** `--jb-a-*` currently has a `:root` default (dark) and a `html[data-jb-theme='light']` override (light). This plan deletes the override block for `--jb-a-*` entirely and puts the new light values directly in `:root` — do not reintroduce a conditional `--jb-a-*` block anywhere.
- **Zero literal hex/rgb in component and page files.** Every primitive and `dashboard.jsx` must resolve color through a `var(--jb-a-*)` or `var(--jb-font-*)` token. Literal hex values belong only in `tokens.css`.
- **`useMarketingTheme` is untouched.** It's shared with the marketing surface (`SiteNav`, `PublicLayout`), which keeps its own independent dark/light toggle. `dashboard.jsx` simply stops importing and calling it.
- **No new test framework.** This repo has zero frontend unit/component test infrastructure (an explicit, still-open decision left to the human — do not add Jest/RTL here). Verification is lint + build + the existing Playwright E2E smoke suite (`e2e/support/routes.ts` already covers `/app/dashboard`).
- **Correction to the spec's font names:** the spec's Direction section says the body/mono faces are "Hanken Grotesk" / "JetBrains Mono" — that's stale documentation. `frontend/src/pages/_app.js` (the single place fonts are loaded, per its own header comment) shows the actual faces are **Public Sans** (body) and **IBM Plex Mono** (mono). This plan swaps only the display face (Instrument Serif → Space Grotesk) and leaves Public Sans / IBM Plex Mono untouched, matching the spec's actual intent ("body stays on [the existing sans], no reason to change what's already working") even though the spec named the wrong sans face.

---

### Task 1: Re-value `--jb-a-*` tokens to the light system, delete the dark/light split, swap the display font

**Files:**
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/pages/_app.js`

**Interfaces:**
- Produces: every existing `--jb-a-*` custom property, re-valued, as a single non-conditional set on `:root`. New properties: `--jb-a-shadow-card`, `--jb-a-shadow-invert`, `--jb-a-shadow-accent`, `--jb-a-glow-accent`, `--jb-a-glow-warm`, `--jb-a-accent-2-ink`, `--jb-a-avatar-blue-bg`, `--jb-a-avatar-blue-ink`, `--jb-a-avatar-coral-bg`, `--jb-a-avatar-coral-ink`, `--jb-a-avatar-violet-bg`, `--jb-a-avatar-violet-ink`. `--jb-font-display` now resolves to Space Grotesk instead of Instrument Serif. Tasks 2-5 consume all of these.

- [ ] **Step 1: Replace the dark `:root` `--jb-a-*` block with the single light palette**

In `frontend/src/styles/tokens.css`, find this entire block (the "APP STAGE" section, from its header comment through the end of the invert-card tokens):

```css
  /* =========================================================================
     APP STAGE — the signed-in content area (/app/*)
     =========================================================================
     The app is a dark sidebar next to a content stage. The SIDEBAR stays dark
     in both themes on purpose — it is the product's spine and the design
     already treats it as a constant, the same call made for the marketing
     footer. Only the stage flips.

     Defaults here are the DARK stage, matching the marketing surface, and
     [data-jb-theme='light'] restores the cream stage that shipped before —
     so light mode is a pixel-for-pixel no-op against the current design.

     Contrast on --jb-a-stage (#101c14): ink 13.9:1, ink-muted 6.4:1.
     ------------------------------------------------------------------------- */
  --jb-a-stage: #101c14;
  --jb-a-header: #14261a;
  --jb-a-card: #16281c;
  --jb-a-card-alt: #1b2f21;
  --jb-a-control: #1b2f21;
  --jb-a-line: rgba(242, 236, 219, 0.14);
  --jb-a-line-strong: rgba(242, 236, 219, 0.22);
  --jb-a-ink: #eef1e9;
  --jb-a-ink-2: rgba(238, 241, 233, 0.82);
  --jb-a-ink-muted: rgba(238, 241, 233, 0.62);
  --jb-a-accent: #5bd08c;
  --jb-a-accent-ink: #0e2e12;
  --jb-a-accent-2: #8fd6a3;
  --jb-a-tint: rgba(91, 208, 140, 0.12);
  --jb-a-tint-line: rgba(91, 208, 140, 0.3);
  --jb-a-blue: #9db6c4;
  --jb-a-blue-tint: rgba(157, 182, 196, 0.14);
  --jb-a-blue-ink: #bcd4e0;
  --jb-a-blue-line: rgba(157, 182, 196, 0.3);

  /* New tokens closing dashboard.jsx's stray-hex gaps — see
     docs/superpowers/specs/2026-08-13-candidate-flow-design-unification.md */
  --jb-a-chip-neutral-ink: #c4b184;
  --jb-a-chip-success-bg: rgba(91, 208, 140, 0.16);
  --jb-a-accent-muted: rgba(143, 214, 163, 0.75);
  --jb-a-status-warn: #e08a52;
  --jb-a-danger-bg: rgba(224, 120, 86, 0.14);
  --jb-a-danger-line: rgba(224, 120, 86, 0.32);
  --jb-a-danger-ink: #e0a89e;
  --jb-a-warn-bg: rgba(201, 98, 46, 0.14);
  --jb-a-warn-line: rgba(201, 98, 46, 0.32);

  /* Inverted accent card — the dark panel that sits inside the stage (the
     Auto-Apply card, the funnel). On the light stage it is near-black for
     contrast; on the dark stage it lifts slightly instead, since going darker
     than the stage would make it disappear. */
  --jb-a-invert: #0b170f;
  --jb-a-invert-panel: #16281c;
  --jb-a-invert-ink: #eef1e9;
  --jb-a-invert-muted: rgba(238, 241, 233, 0.62);
```

Replace it with:

```css
  /* =========================================================================
     APP STAGE — the signed-in content area (/app/*)
     =========================================================================
     Light-only, single palette — no theme toggle for this surface (see
     docs/superpowers/specs/2026-08-13-candidate-flow-design-unification.md,
     "Revision note"). White/off-white surfaces, near-black ink, one confident
     blue as the brand accent, green/amber reserved for semantic status
     (success / medium) rather than used as the brand color.

     Contrast on --jb-a-stage (#fcfcfa): ink 19.8:1, ink-2 (muted) 7.0:1,
     ink-muted (faint) 2.7:1 — ink-muted is DECORATIVE/labels only, never body
     text, matching this file's existing convention for the lightest ink tier.
     ------------------------------------------------------------------------- */
  --jb-a-stage: #fcfcfa;
  --jb-a-header: #ffffff;
  --jb-a-card: #ffffff;
  --jb-a-card-alt: #fcfcfa;
  --jb-a-control: #f4f4f2;
  --jb-a-line: #edece7;
  --jb-a-line-strong: #dcdcd6;
  --jb-a-ink: #0a0a0a;
  --jb-a-ink-2: #5c5c5c;
  --jb-a-ink-muted: #9b9b9b;
  --jb-a-accent: #3b5bff;
  --jb-a-accent-ink: #ffffff;
  --jb-a-accent-2: #22c55e;
  --jb-a-accent-2-ink: #ffffff;
  --jb-a-tint: #eafaf0;
  --jb-a-tint-line: #b9ecc9;
  --jb-a-blue: #5b7fb5;
  --jb-a-blue-tint: #eaf0fa;
  --jb-a-blue-ink: #3d5a82;
  --jb-a-blue-line: #cddcee;

  /* Same names as before, re-valued for the light system. */
  --jb-a-chip-neutral-ink: #6b6b6b;
  --jb-a-chip-success-bg: #dcf5e3;
  --jb-a-accent-muted: #5fa06c;
  --jb-a-status-warn: #f5a623;
  --jb-a-danger-bg: #fdeee8;
  --jb-a-danger-line: #f3cdb8;
  --jb-a-danger-ink: #b8501f;
  --jb-a-warn-bg: #fff3e0;
  --jb-a-warn-line: #fadfab;

  /* Inverted accent card — the dark panel that sits inside the light stage
     (the Auto-Apply card, the "Recent activity" panel). Only one value now:
     there's no dark stage for it to lift against. */
  --jb-a-invert: #0a0a0a;
  --jb-a-invert-panel: #1a1a1a;
  --jb-a-invert-ink: #f5f5f3;
  --jb-a-invert-muted: #a3a3a3;

  /* Shadows — new for the light system; the dark system relied on borders
     alone and had no elevation model. */
  --jb-a-shadow-card: 0 12px 28px -18px rgba(10, 10, 10, 0.1);
  --jb-a-shadow-invert: 0 20px 40px -20px rgba(10, 10, 10, 0.35);
  --jb-a-shadow-accent: 0 8px 16px -6px rgba(59, 91, 255, 0.5);

  /* Decorative radial glows behind hero content — blue (brand) + coral
     (warm counterpoint), both low-opacity and never load-bearing for
     contrast/readability. */
  --jb-a-glow-accent: rgba(59, 91, 255, 0.1);
  --jb-a-glow-warm: rgba(255, 107, 87, 0.07);

  /* Colorful initial-badge rotation (company avatars). Three hues is enough
     variety without turning the badge set into its own design system —
     see frontend/src/components/app/ui/Badge.jsx's hueForLabel(). */
  --jb-a-avatar-blue-bg: #dde8ff;
  --jb-a-avatar-blue-ink: #3b5bff;
  --jb-a-avatar-coral-bg: #ffe4d6;
  --jb-a-avatar-coral-ink: #c9622e;
  --jb-a-avatar-violet-bg: #ece5ff;
  --jb-a-avatar-violet-ink: #6b46c1;
```

- [ ] **Step 2: Delete the light-theme `--jb-a-*` override block**

In the same file, inside the `html[data-jb-theme='light'] { ... }` block, find this entire block (it comes right after `--jb-surface-raised: #fffefb;`):

```css

  /* App stage, light — the exact values the dashboard shipped with, so
     switching to light is a no-op against the existing design. */
  --jb-a-stage: #eff0ec;
  --jb-a-header: #f5f5f5;
  --jb-a-card: #f5f5f5;
  --jb-a-card-alt: #fffefb;
  --jb-a-control: #ecede9;
  --jb-a-line: #dee0db;
  --jb-a-line-strong: #c9ccc6;
  --jb-a-ink: #2a2f28;
  --jb-a-ink-2: #3e443c;
  --jb-a-ink-muted: #5c625a;
  --jb-a-accent: #4dbe55;
  --jb-a-accent-ink: #0e2e12;
  --jb-a-accent-2: #2f7d3a;
  --jb-a-tint: #eef8ef;
  --jb-a-tint-line: #cbe8ce;
  --jb-a-blue: #9db6c4;
  --jb-a-blue-tint: #e8eef2;
  --jb-a-blue-ink: #3e5a6b;
  --jb-a-blue-line: #c7d6de;

  /* Light-theme companions to the dark block above — these are the exact
     hex values dashboard.jsx already hardcoded before this pass, since the
     light theme is meant to be a pixel-for-pixel no-op against the
     existing design. */
  --jb-a-chip-neutral-ink: #8a7c5a;
  --jb-a-chip-success-bg: #dcefe3;
  --jb-a-accent-muted: #5a8c6e;
  --jb-a-status-warn: #c9622e;
  --jb-a-danger-bg: #fbefe9;
  --jb-a-danger-line: #f0cdbd;
  --jb-a-danger-ink: #8a4a2e;
  --jb-a-warn-bg: #fbeee5;
  --jb-a-warn-line: #f0dcc8;

  --jb-a-invert: #2a2f28;
  --jb-a-invert-panel: #363c34;
  --jb-a-invert-ink: #e9eae5;
  --jb-a-invert-muted: #b4bab0;
```

Delete it entirely (including the leading blank line shown above), so the `html[data-jb-theme='light'] { ... }` block ends right after `--jb-surface-raised: #fffefb;` and the block's closing `}`. The remaining content of that block (the `--jb-d-*` marketing-theme overrides) is unrelated and must stay exactly as-is.

- [ ] **Step 3: Swap the display font token from Instrument Serif to Space Grotesk**

In the same file's Type section, find:

```css
  --jb-font-display: var(--jb-face-display), Georgia, 'Times New Roman', serif; /* Instrument Serif */
  --jb-font-sans: var(--jb-face-sans), system-ui, -apple-system, sans-serif; /* Hanken Grotesk */
  --jb-font-mono: var(--jb-face-mono), ui-monospace, SFMono-Regular, monospace; /* JetBrains Mono */
```

Replace with:

```css
  --jb-font-display: var(--jb-face-display), -apple-system, 'Helvetica Neue', sans-serif; /* Space Grotesk */
  --jb-font-sans: var(--jb-face-sans), system-ui, -apple-system, sans-serif; /* Public Sans */
  --jb-font-mono: var(--jb-face-mono), ui-monospace, SFMono-Regular, monospace; /* IBM Plex Mono */
```

(Only the display line's font and fallback stack change — Space Grotesk is a sans face, so the serif fallback chain is replaced with a sans one. The sans/mono lines are unchanged in behavior; only their trailing comments are corrected to name the faces `_app.js` actually loads.)

Two lines below, find:

```css
  /* Instrument Serif ships weight 400 only. Anything setting a heavier weight on
   * --jb-font-display gets a synthetic (smeared) bold from the browser, so
   * display type stays at 400 and earns emphasis from size, not weight. */
```

Replace with:

```css
  /* Space Grotesk ships 500 and 700. Display type uses 700 for headlines and
   * 500 for sub-headings — see frontend/src/pages/_app.js for the exact
   * weights loaded. */
```

- [ ] **Step 4: Swap the font loader in `_app.js`**

In `frontend/src/pages/_app.js`, find:

```js
import { Instrument_Serif, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
```

Replace with:

```js
import { Space_Grotesk, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
```

Find:

```js
// Display / headings. Instrument Serif ships weight 400 only (roman + italic).
const fontDisplay = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
```

Replace with:

```js
// Display / headings. Space Grotesk ships 500 (sub-headings) and 700 (headlines).
const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  fallback: ['-apple-system', 'Helvetica Neue', 'sans-serif'],
});
```

- [ ] **Step 5: Verify the app builds**

Run: `cd frontend && pnpm build`
Expected: exits 0, no CSS parse errors and no font-loader errors (`Space_Grotesk` is a valid `next/font/google` export; a typo here fails the build at compile time).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/styles/tokens.css frontend/src/pages/_app.js
git commit -m "feat(tokens): pivot --jb-a-* to the light/blue system, drop dark mode, swap display font to Space Grotesk"
```

---

### Task 2: Rework `Card` and `Button` — shadows and the new accent

**Files:**
- Modify: `frontend/src/components/app/ui/Card.jsx`
- Modify: `frontend/src/components/app/ui/Button.jsx`

**Interfaces:**
- Consumes: `--jb-a-shadow-card`, `--jb-a-shadow-invert`, `--jb-a-shadow-accent` from Task 1.
- No prop-shape changes — `Card`'s `variant`/`accentLeft` and `Button`'s `variant`/`href` stay exactly as they are. Task 5 consumes both unchanged.

- [ ] **Step 1: Add shadows to `Card`**

In `frontend/src/components/app/ui/Card.jsx`, find:

```jsx
    default: {
      background: 'var(--jb-a-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-ink)',
    },
    invert: {
      background: 'var(--jb-a-invert)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-invert-ink)',
    },
```

Replace with:

```jsx
    default: {
      background: 'var(--jb-a-card)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-line)',
      borderRadius: 16,
      boxShadow: 'var(--jb-a-shadow-card)',
      color: 'var(--jb-a-ink)',
    },
    invert: {
      background: 'var(--jb-a-invert)',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'var(--jb-a-line)',
      borderRadius: 16,
      boxShadow: 'var(--jb-a-shadow-invert)',
      color: 'var(--jb-a-invert-ink)',
    },
```

(`dashed` gets no shadow, deliberately — it's the empty-state variant and shouldn't visually compete via elevation with cards that hold real content.)

- [ ] **Step 2: Add a shadow to `Button`'s primary variant**

In `frontend/src/components/app/ui/Button.jsx`, find:

```jsx
    primary: {
      background: 'var(--jb-a-accent)',
      color: 'var(--jb-a-accent-ink)',
      border: 'none',
      fontWeight: 700,
    },
```

Replace with:

```jsx
    primary: {
      background: 'var(--jb-a-accent)',
      color: 'var(--jb-a-accent-ink)',
      border: 'none',
      fontWeight: 700,
      boxShadow: 'var(--jb-a-shadow-accent)',
    },
```

- [ ] **Step 3: Verify both files build and lint clean**

Run: `cd frontend && npx eslint src/components/app/ui/Card.jsx src/components/app/ui/Button.jsx && pnpm build`
Expected: no lint errors, build exits 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/app/ui/Card.jsx frontend/src/components/app/ui/Button.jsx
git commit -m "feat(app-ui): add elevation to Card and Button for the light system"
```

---

### Task 3: Rework `Badge` (add the avatar variant) and fix `PageHeader`'s type weight

**Files:**
- Modify: `frontend/src/components/app/ui/Badge.jsx`
- Modify: `frontend/src/components/app/ui/PageHeader.jsx`

**Interfaces:**
- Produces: `Badge` gains `export function hueForLabel(label)` — a pure function, deterministic per input string, returning one of `'blue' | 'coral' | 'violet'`. `Badge` gains a new prop `variant` (default `'pill'`, the existing pill behavior driven by `tone`; `'avatar'`, new — a fixed-size colored initial tile driven by a new `hue` prop, default `'blue'`). Task 5 imports both `Badge` (default) and `{ hueForLabel }` (named) from `@/components/app/ui/Badge`.
- Consumes: `--jb-a-avatar-blue-bg`/`-ink`, `--jb-a-avatar-coral-bg`/`-ink`, `--jb-a-avatar-violet-bg`/`-ink`, `--jb-font-display` from Task 1.

- [ ] **Step 1: Add the avatar variant and `hueForLabel` to `Badge`**

In `frontend/src/components/app/ui/Badge.jsx`, find:

```jsx
export default function Badge({ tone = 'neutral', children, style, ...rest }) {
  const toneStyle = {
```

Replace with:

```jsx
const AVATAR_HUES = ['blue', 'coral', 'violet'];

// Deterministic so the same company always gets the same badge color across
// renders and screens — a simple string hash, not cryptographic.
export function hueForLabel(label = '') {
  const str = String(label);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
}

const AVATAR_HUE_STYLE = {
  blue: { background: 'var(--jb-a-avatar-blue-bg)', color: 'var(--jb-a-avatar-blue-ink)' },
  coral: { background: 'var(--jb-a-avatar-coral-bg)', color: 'var(--jb-a-avatar-coral-ink)' },
  violet: { background: 'var(--jb-a-avatar-violet-bg)', color: 'var(--jb-a-avatar-violet-ink)' },
};

export default function Badge({ tone = 'neutral', variant = 'pill', hue = 'blue', children, style, ...rest }) {
  if (variant === 'avatar') {
    const avatarBase = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 46,
      height: 46,
      flexShrink: 0,
      borderRadius: 12,
      fontFamily: 'var(--jb-font-display)',
      fontSize: 14,
      fontWeight: 700,
    };
    return (
      <span style={{ ...avatarBase, ...AVATAR_HUE_STYLE[hue], ...style }} {...rest}>
        {children}
      </span>
    );
  }

  const toneStyle = {
```

- [ ] **Step 2: Verify the file still exports its existing default behavior unchanged**

Read the rest of `Badge.jsx` (the `toneStyle`/`base`/return for the pill path) and confirm it is untouched below the inserted block — the `tone`-driven pill rendering must be byte-identical to before this task except for the added `variant`/`hue` destructured params (which default to the pill path).

- [ ] **Step 3: Fix `PageHeader`'s hardcoded font weight**

In `frontend/src/components/app/ui/PageHeader.jsx`, find:

```jsx
      <Tag style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontSize: 26, fontWeight: 400, color: 'var(--jb-a-ink)' }}>
```

Replace with:

```jsx
      <Tag style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontSize: 26, fontWeight: 700, color: 'var(--jb-a-ink)' }}>
```

(`fontWeight: 400` was correct for Instrument Serif, which only ships weight 400. Space Grotesk ships 500/700, and headlines use 700 per Task 1's font-loader comment.)

- [ ] **Step 4: Verify both files build and lint clean**

Run: `cd frontend && npx eslint src/components/app/ui/Badge.jsx src/components/app/ui/PageHeader.jsx && pnpm build`
Expected: no lint errors, build exits 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/app/ui/Badge.jsx frontend/src/components/app/ui/PageHeader.jsx
git commit -m "feat(app-ui): add Badge avatar variant with hueForLabel, fix PageHeader weight for Space Grotesk"
```

---

### Task 4: Build the `MatchScoreRing` primitive

**Files:**
- Create: `frontend/src/components/app/ui/MatchScoreRing.jsx`

**Interfaces:**
- Produces: `export default function MatchScoreRing({ score, size = 36 })` — renders a radial SVG ring with the percentage centered. `score`: a number 0-100, or `null`/`undefined`/`NaN` for "no data," which renders a plain `—` instead of a ring (matching how the rest of `dashboard.jsx` already represents missing data). Stroke color bands by score: `>= 85` success green, `>= 60` amber ("medium"), below that danger. Task 5 consumes this with `score={j.fitScore}`.

- [ ] **Step 1: Write the component**

```jsx
const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function bandColor(score) {
  if (score >= 85) return 'var(--jb-a-accent-2)';
  if (score >= 60) return 'var(--jb-a-status-warn)';
  return 'var(--jb-a-danger-ink)';
}

export default function MatchScoreRing({ score, size = 36 }) {
  if (score == null || Number.isNaN(score)) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          fontSize: 13,
          color: 'var(--jb-a-ink-muted)',
        }}
      >
        —
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={`${clamped}% match`}>
      <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="var(--jb-a-line)" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={RADIUS}
        fill="none"
        stroke={bandColor(clamped)}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontFamily="var(--jb-font-display)"
        fontSize="10.5"
        fontWeight="700"
        fill="var(--jb-a-ink)"
      >
        {clamped}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Verify it builds and lints clean**

Run: `cd frontend && npx eslint src/components/app/ui/MatchScoreRing.jsx && pnpm build`
Expected: no lint errors, build exits 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/ui/MatchScoreRing.jsx
git commit -m "feat(app-ui): add MatchScoreRing primitive"
```

---

### Task 5: Re-migrate `dashboard.jsx` to the light direction

**Files:**
- Modify: `frontend/src/pages/app/dashboard.jsx` (targeted edits — the data-fetching logic, `useState`/`useEffect`, and formatting helpers stay exactly as they are; only the visual/JSX layer and the small `recJobs` derivation change)

**Interfaces:**
- Consumes: `Card`, `Button`, `PageHeader` unchanged from Tasks 2-3; `Badge` + `hueForLabel` from Task 3; `MatchScoreRing` from Task 4; the re-valued tokens from Task 1.

- [ ] **Step 1: Update imports — drop the theme hook, add the new primitives**

Find:

```jsx
import useMarketingTheme from '@/components/site/useMarketingTheme';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Card from '@/components/app/ui/Card';
import Badge from '@/components/app/ui/Badge';
import Button from '@/components/app/ui/Button';
import PageHeader from '@/components/app/ui/PageHeader';
```

Replace with:

```jsx
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Card from '@/components/app/ui/Card';
import Badge, { hueForLabel } from '@/components/app/ui/Badge';
import Button from '@/components/app/ui/Button';
import PageHeader from '@/components/app/ui/PageHeader';
import MatchScoreRing from '@/components/app/ui/MatchScoreRing';
```

- [ ] **Step 2: Add `fitScore` to the `recJobs` derivation**

Find:

```jsx
  const recJobs = (matches || []).slice(0, 3).map((m) => ({
    initial: (m.logo || (m.company || '?').slice(0, 2)).toString().toUpperCase(),
    role: m.role, company: m.company,
    meta: [m.location, m.salary].filter((x) => x && x !== '—').join('  ·  '),
    fit: m.match || '—',
    skills: m.skills && m.skills.length ? m.skills : [],
  }));
```

Replace with:

```jsx
  const recJobs = (matches || []).slice(0, 3).map((m) => {
    const parsedFit = parseInt(m.match, 10);
    return {
      initial: (m.logo || (m.company || '?').slice(0, 2)).toString().toUpperCase(),
      role: m.role, company: m.company,
      meta: [m.location, m.salary].filter((x) => x && x !== '—').join('  ·  '),
      fitScore: Number.isFinite(parsedFit) ? parsedFit : null,
      skills: m.skills && m.skills.length ? m.skills : [],
    };
  });
```

- [ ] **Step 3: Rename and re-map the local `T` token object for the new palette**

Find:

```jsx
  const { theme, toggle: toggleTheme } = useMarketingTheme();

  /* ---- design tokens (Jobocate App.dc.html) ---- */
  /* Every value resolves through --jb-a-* so the stage follows the product
     theme. Light mode restores the exact hexes this object used to hold, so
     the existing design is unchanged; dark mode is the new variant. */
  const T = {
    stage: 'var(--jb-a-stage)', card: 'var(--jb-a-card)',
    line: 'var(--jb-a-line)', line2: 'var(--jb-a-line-strong)',
    ink: 'var(--jb-a-ink)', ink2: 'var(--jb-a-ink-2)', muted: 'var(--jb-a-ink-muted)',
    dark: 'var(--jb-a-invert)', darkPanel: 'var(--jb-a-invert-panel)',
    darkLine: 'var(--jb-a-line)', darkText: 'var(--jb-a-invert-ink)', darkMuted: 'var(--jb-a-invert-muted)',
    green: 'var(--jb-a-accent)', greenInk: 'var(--jb-a-accent-ink)', green2: 'var(--jb-a-accent-2)',
    tint: 'var(--jb-a-tint)', tintLine: 'var(--jb-a-tint-line)',
    blue: 'var(--jb-a-blue)', blueTint: 'var(--jb-a-blue-tint)',
    blueInk: 'var(--jb-a-blue-ink)', blueLine: 'var(--jb-a-blue-line)',
    serif: 'var(--jb-font-display)', mono: 'var(--jb-font-mono)',
  };
```

Replace with:

```jsx
  /* ---- design tokens (light system — see the design-unification spec's
     Revision note) ---- */
  /* Every value resolves through --jb-a-*, a single non-conditional palette
     — there's no theme toggle on this surface anymore. `accent` is the brand
     blue (CTAs, identity chrome); `success` is the semantic green (done
     states, high-match scores) — they used to be the same green and are
     genuinely different colors now, hence the separate names. */
  const T = {
    stage: 'var(--jb-a-stage)', card: 'var(--jb-a-card)',
    line: 'var(--jb-a-line)', line2: 'var(--jb-a-line-strong)',
    ink: 'var(--jb-a-ink)', ink2: 'var(--jb-a-ink-2)', muted: 'var(--jb-a-ink-muted)',
    dark: 'var(--jb-a-invert)', darkPanel: 'var(--jb-a-invert-panel)',
    darkLine: 'var(--jb-a-line)', darkText: 'var(--jb-a-invert-ink)', darkMuted: 'var(--jb-a-invert-muted)',
    accent: 'var(--jb-a-accent)', accentInk: 'var(--jb-a-accent-ink)',
    success: 'var(--jb-a-accent-2)', successInk: 'var(--jb-a-accent-2-ink)',
    warn: 'var(--jb-a-status-warn)',
    tint: 'var(--jb-a-tint)', tintLine: 'var(--jb-a-tint-line)',
    blue: 'var(--jb-a-blue)', blueTint: 'var(--jb-a-blue-tint)',
    blueInk: 'var(--jb-a-blue-ink)', blueLine: 'var(--jb-a-blue-line)',
    glowAccent: 'var(--jb-a-glow-accent)', glowWarm: 'var(--jb-a-glow-warm)',
    display: 'var(--jb-font-display)', mono: 'var(--jb-font-mono)',
  };
```

- [ ] **Step 4: Remove the theme-toggle button**

Find:

```jsx
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 36, height: 36, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--jb-a-control)', border: `1px solid ${T.line}`,
                borderRadius: 10, cursor: 'pointer', color: T.muted, fontFamily: 'inherit',
              }}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.4v2.2M12 19.4v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.4 13.6A8.4 8.4 0 1 1 10.4 3.6a6.6 6.6 0 0 0 10 10Z" />
                </svg>
              )}
            </button>
            <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, color: 'var(--jb-a-ink-2)' }}>
              ◔<span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.green, color: T.greenInk, fontFamily: T.mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--jb-a-header)' }}>3</span>
            </div>
            <Link href="/app/settings" title="Account" style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '3px 11px 3px 3px', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 999 }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', background: T.green, color: T.greenInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials(userName) || '··'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{firstName || 'You'}</span>
            </Link>
```

Replace with:

```jsx
            <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, color: 'var(--jb-a-ink-2)' }}>
              ◔<span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.accent, color: T.accentInk, fontFamily: T.mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--jb-a-header)' }}>3</span>
            </div>
            <Link href="/app/settings" title="Account" style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '3px 11px 3px 3px', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 999 }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', background: T.accent, color: T.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials(userName) || '··'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{firstName || 'You'}</span>
            </Link>
```

- [ ] **Step 5: Hero heading — Space Grotesk weight, add the radial glow decoration**

Find:

```jsx
          {/* ░░ STAGE ░░ */}
          <div id="jpstage" style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: T.stage }}>
            <div style={{ width: '100%', padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 26 }}>
```

Replace with:

```jsx
          {/* ░░ STAGE ░░ */}
          <div id="jpstage" style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: T.stage, position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', top: -120, right: -80, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${T.glowAccent} 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', top: 180, left: -100, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${T.glowWarm} 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', width: '100%', padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 26 }}>
```

(`T.glowAccent`/`T.glowWarm` were added to the `T` object in Step 3.)

Now, in the hero markup, find:

```jsx
                      <h1 style={{ margin: 0, fontFamily: T.serif, fontSize: 42, lineHeight: 1.08, fontWeight: 400 }}>{greeting}</h1>
```

Replace with:

```jsx
                      <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 42, lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.02em' }}>{greeting}</h1>
```

- [ ] **Step 6: "Get set up" checklist — success color for the done state**

Find:

```jsx
                              <span aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.done ? T.green : 'var(--jb-a-control)', color: s.done ? T.greenInk : T.muted, border: `1px solid ${s.done ? T.green : T.line2}` }}>{s.done ? '✓' : i + 1}</span>
```

Replace with:

```jsx
                              <span aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.done ? T.success : 'var(--jb-a-control)', color: s.done ? T.successInk : T.muted, border: `1px solid ${s.done ? T.success : T.line2}` }}>{s.done ? '✓' : i + 1}</span>
```

Find:

```jsx
                              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.green2 }}>Done</span>
```

Replace with:

```jsx
                              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.success }}>Done</span>
```

- [ ] **Step 7: Weekly outcomes strip — success color for the response-rate value**

Find:

```jsx
                        <span style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 600, color: T.green2 }}>{responseRate}</span>
```

Replace with:

```jsx
                        <span style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 600, color: T.success }}>{responseRate}</span>
```

- [ ] **Step 8: Recommended-jobs card — colorful avatar badge, match-score ring, shadow**

Find:

```jsx
                      {recJobs.map((j, i) => (
                        <div key={i} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: 16, padding: '20px 22px' }}>
                            <span aria-hidden style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: 'var(--jb-a-tint)', color: T.green2, border: `1px solid var(--jb-a-tint-line)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{j.initial}</span>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 18, fontWeight: 700 }}>{j.role}</span>
                                <span style={{ fontSize: 15, color: T.ink2 }}>{j.company}</span>
                              </div>
                              <div style={{ fontSize: 14, color: T.ink2 }}>{j.meta}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {j.skills.map((s) => (
                                  <Badge key={s} tone="neutral">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 600, color: T.green2 }}>{j.fit}</div>
                                <div style={{ fontSize: 12, color: T.muted }}>estimated fit</div>
                              </div>
                              <div style={{ display: 'flex', gap: 7 }}>
                                <Button href={appRoute('App Matches.dc.html')} style={{ height: 38, padding: '0 16px' }}>Apply</Button>
                                <button type="button" title="Save" style={{ width: 38, height: 38, border: `1px solid ${T.line2}`, borderRadius: 9, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>♡</button>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderTop: `1px solid var(--jb-a-control)`, background: T.stage, fontSize: 13.5, fontWeight: 600, color: T.ink2 }}>
                            <span aria-hidden>›</span><span>Why this matches</span><span style={{ flex: 1 }} /><span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>Skills + seniority + location all align</span>
                          </div>
                        </div>
                      ))}
```

Replace with:

```jsx
                      {recJobs.map((j, i) => (
                        <div key={i} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--jb-a-shadow-card)' }}>
                          <div style={{ display: 'flex', gap: 16, padding: '20px 22px' }}>
                            <Badge variant="avatar" hue={hueForLabel(j.company)}>{j.initial}</Badge>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 18, fontWeight: 700 }}>{j.role}</span>
                                <span style={{ fontSize: 15, color: T.ink2 }}>{j.company}</span>
                              </div>
                              <div style={{ fontSize: 14, color: T.ink2 }}>{j.meta}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {j.skills.map((s) => (
                                  <Badge key={s} tone="neutral">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                              <MatchScoreRing score={j.fitScore} />
                              <div style={{ display: 'flex', gap: 7 }}>
                                <Button href={appRoute('App Matches.dc.html')} style={{ height: 38, padding: '0 16px' }}>Apply</Button>
                                <button type="button" title="Save" style={{ width: 38, height: 38, border: `1px solid ${T.line2}`, borderRadius: 9, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>♡</button>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderTop: `1px solid var(--jb-a-control)`, background: T.stage, fontSize: 13.5, fontWeight: 600, color: T.ink2 }}>
                            <span aria-hidden>›</span><span>Why this matches</span><span style={{ flex: 1 }} /><span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>Skills + seniority + location all align</span>
                          </div>
                        </div>
                      ))}
```

- [ ] **Step 9: Application funnel — multi-hue stage colors, activity checkmark**

Find:

```jsx
  const overnight = (activity || []).map((a) => ({ glyph: '✓', accent: T.green, line: `Applied to ${a.role} at ${a.company}` }));

  const funnelRows = pipeline.map((p, i) => ({
    label: p.stage, count: p.count || '0', width: p.pct || '0%', color: [T.ink, T.blue, T.green, T.green2][i] || T.green,
  }));
```

Replace with:

```jsx
  const overnight = (activity || []).map((a) => ({ glyph: '✓', accent: T.success, line: `Applied to ${a.role} at ${a.company}` }));

  // Applied (neutral) -> In review (informational blue) -> Interviewing (amber,
  // "getting close") -> Offers (success green, the best outcome).
  const funnelRows = pipeline.map((p, i) => ({
    label: p.stage, count: p.count || '0', width: p.pct || '0%', color: [T.ink, T.blue, T.warn, T.success][i] || T.success,
  }));
```

- [ ] **Step 10: "Recent activity" panel header — fix the text-on-dark color**

Find:

```jsx
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--jb-a-header)' }}>Recent activity</h3></div>
```

Replace with:

```jsx
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.darkText }}>Recent activity</h3></div>
```

(This card renders on the dark `invert` background — `var(--jb-a-header)` happened to be readable there by coincidence in the old system's specific default theme, but it's the wrong token semantically. `T.darkText` — `var(--jb-a-invert-ink)` — is what every other piece of text in this same card already correctly uses.)

- [ ] **Step 11: Run the build**

Run: `cd frontend && pnpm build`
Expected: exits 0, no compile errors, `dashboard` listed in the build output's page list.

- [ ] **Step 12: Run lint**

Run: `cd frontend && npx eslint src/pages/app/dashboard.jsx src/components/app/ui/*.jsx`
Expected: no errors.

- [ ] **Step 13: Grep for any remaining stray hex literals**

Run: `grep -oE "#[0-9A-Fa-f]{3,8}" frontend/src/pages/app/dashboard.jsx`
Expected: no output (empty) — every color in this file resolves through a `T.*`/`var(--jb-a-*)` reference.

- [ ] **Step 14: Grep to confirm the theme hook is fully gone**

Run: `grep -n "useMarketingTheme\|toggleTheme\|theme ===" frontend/src/pages/app/dashboard.jsx`
Expected: no output (empty).

- [ ] **Step 15: Run the E2E smoke check for this one route**

Ensure the live stack is available (Mongo/backend/frontend — Playwright's `webServer` config in `e2e/playwright.config.ts` boots backend/frontend itself if not already running).

Run: `cd e2e && npx playwright test specs/smoke --grep dashboard --reporter=list`
Expected: PASS — the dashboard route renders real content, has no horizontal overflow, and throws no console/API errors.

- [ ] **Step 16: Manual spot-check**

Start the stack (`pnpm dev` from the repo root, or the individual `dev:backend`/`dev:frontend` scripts) and open `/app/dashboard` signed in as a candidate. Confirm: no theme-toggle button in the header; hero greeting renders in Space Grotesk bold with the two soft radial glows visible behind it; the Auto-Apply card is a near-black panel with a shadow; each recommended-job row shows a colored initial badge (not all the same color if the companies differ) and a radial score ring instead of a bare percentage; the "Get set up" checklist's done-state circles and label are green, not blue.

- [ ] **Step 17: Commit**

```bash
git add frontend/src/pages/app/dashboard.jsx
git commit -m "feat(dashboard): re-migrate to the light/blue direction — Space Grotesk, score rings, colorful badges, no theme toggle"
```
