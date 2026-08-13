# Candidate Design Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps in the `--jb-a-*` design-token system, build the four shared visual primitives (Card, Badge, Button, PageHeader) this codebase has never had, and migrate `dashboard.jsx` — the one screen already closest to correct — to use both fully, as the reference every subsequent screen-migration batch copies from.

**Architecture:** `frontend/src/styles/tokens.css` already has a complete `--jb-a-*` token family (dark by default, light via `[data-jb-theme='light']`) that `dashboard.jsx` mostly uses. This plan adds the ~7 missing tokens for the ~12 values dashboard.jsx still hardcodes, builds 4 new presentational components in `frontend/src/components/app/ui/` that consume only tokens (never literals), then rewrites dashboard.jsx to use both — leaving zero hardcoded hex values and demonstrating every primitive in real use.

**Tech Stack:** Next.js pages router, React (inline `style` objects + `styled-jsx`, matching this file's existing convention — not Tailwind, per the spec's explicit choice), CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-08-13-candidate-flow-design-unification.md`

## Global Constraints

- No new test framework: this repo has zero frontend unit/component test infrastructure (confirmed in a prior branch's final review and left as an explicit, still-open decision for the human — do not add jest/RTL here). Verification is lint + build + the existing Playwright E2E smoke suite (`e2e/support/routes.ts` already covers `/app/dashboard`).
- Every primitive and every migrated value in dashboard.jsx must resolve through a `var(--jb-a-*)` (or existing `--jb-font-*`) token — zero literal hex/rgb values remaining in dashboard.jsx once Task 6 is done.
- Tokens get **both** a dark (`:root`) and light (`html[data-jb-theme='light']`) value — this file's dark/light theming mechanism is load-bearing for the whole `/app/*` surface, not just this page.
- Follow the file's existing mixed rgba/hex convention: tint/background-style tokens use `rgba(...)`, ink/border tokens use flat hex, matching neighboring tokens exactly.

---

### Task 1: Complete the `--jb-a-*` token gaps

**Files:**
- Modify: `frontend/src/styles/tokens.css:112-121` (dark `:root` block, `--jb-a-*` section)
- Modify: `frontend/src/styles/tokens.css:208-217` (light `html[data-jb-theme='light']` block, `--jb-a-*` section)

**Interfaces:**
- Produces: 7 new CSS custom properties, each with a dark and light value — `--jb-a-chip-neutral-ink`, `--jb-a-chip-success-bg`, `--jb-a-accent-muted`, `--jb-a-status-warn`, `--jb-a-danger-bg`, `--jb-a-danger-line`, `--jb-a-danger-ink`. Task 6 consumes all 7.

- [ ] **Step 1: Add the 7 new tokens to the dark block**

In `frontend/src/styles/tokens.css`, find this line (currently line 120):

```css
  --jb-a-blue-line: rgba(157, 182, 196, 0.3);
```

Add immediately after it (still inside the same `:root { ... }` block, before the `/* Inverted accent card ... */` comment):

```css

  /* New tokens closing dashboard.jsx's stray-hex gaps — see
     docs/superpowers/specs/2026-08-13-candidate-flow-design-unification.md */
  --jb-a-chip-neutral-ink: #8a7c5a;
  --jb-a-chip-success-bg: rgba(91, 208, 140, 0.16);
  --jb-a-accent-muted: rgba(143, 214, 163, 0.75);
  --jb-a-status-warn: #c9622e;
  --jb-a-danger-bg: rgba(224, 120, 86, 0.14);
  --jb-a-danger-line: rgba(224, 120, 86, 0.32);
  --jb-a-danger-ink: #e0a89e;
```

- [ ] **Step 2: Add the 7 new tokens to the light block**

In the same file, find this line (currently line 215):

```css
  --jb-a-blue-line: #c7d6de;
```

Add immediately after it (still inside the `html[data-jb-theme='light'] { ... }` block, before the `--jb-a-invert:` line):

```css

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
```

- [ ] **Step 3: Verify the file is still valid CSS**

Run: `cd frontend && pnpm build`
Expected: exits 0, no CSS parse errors (a malformed custom-property block would surface as a build failure, since Next.js processes global CSS at build time).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/tokens.css
git commit -m "feat(tokens): add 7 --jb-a-* tokens closing dashboard.jsx's stray-hex gaps"
```

---

### Task 2: Build the `Card` primitive

**Files:**
- Create: `frontend/src/components/app/ui/Card.jsx`

**Interfaces:**
- Produces: `export default function Card({ variant, accentLeft, children, style, ...rest })` — a `<div>` wrapper. `variant`: `'default'` (card bg/border, default), `'invert'` (dark inverted panel — the auto-apply/recent-activity treatment), `'dashed'` (dashed border, for empty states). `accentLeft`: optional CSS color string — renders a 4px left border in that color (the "Get set up" step-card pattern), and this always wins on the left edge even if `style` also sets a `border`/`borderColor` (merge order: `style` overrides `variant`'s base, but `accentLeft` is applied last so it always governs the left edge — otherwise a caller setting both a full-border color and an accent stripe would have the stripe silently overridden, since `border-left-color` is a shared sub-property of both). All other props (`onClick`, `className`, etc.) pass through to the underlying `<div>`.

- [ ] **Step 1: Write the component**

```jsx
export default function Card({ variant = 'default', accentLeft, children, style, ...rest }) {
  const base = {
    default: {
      background: 'var(--jb-a-card)',
      border: '1px solid var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-ink)',
    },
    invert: {
      background: 'var(--jb-a-invert)',
      border: '1px solid var(--jb-a-line)',
      borderRadius: 16,
      color: 'var(--jb-a-invert-ink)',
    },
    dashed: {
      background: 'var(--jb-a-card)',
      border: '1px dashed var(--jb-a-line-strong)',
      borderRadius: 16,
      color: 'var(--jb-a-ink)',
    },
  }[variant];

  const accentStyle = accentLeft ? { borderLeft: `4px solid ${accentLeft}` } : null;

  // accentStyle is spread LAST — it must always win on the left edge, even
  // over a caller's `style.border`/`style.borderColor` (both touch
  // border-left-color too; spread order is how the later one wins here).
  return (
    <div style={{ ...base, ...style, ...accentStyle }} {...rest}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npx eslint src/components/app/ui/Card.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/ui/Card.jsx
git commit -m "feat(app-ui): add Card primitive"
```

---

### Task 3: Build the `Badge` primitive

**Files:**
- Create: `frontend/src/components/app/ui/Badge.jsx`

**Interfaces:**
- Produces: `export default function Badge({ tone, children, style, ...rest })` — a `<span>` pill. `tone`: `'neutral'` (default — skill tags, chip labels), `'success'` (green — match %, "done" indicators), `'warn'` (amber/rust — in-progress status), `'danger'` (red/coral — error states).

- [ ] **Step 1: Write the component**

```jsx
export default function Badge({ tone = 'neutral', children, style, ...rest }) {
  const toneStyle = {
    neutral: {
      background: 'var(--jb-a-control)',
      border: '1px solid var(--jb-a-line)',
      color: 'var(--jb-a-ink-2)',
    },
    success: {
      background: 'var(--jb-a-chip-success-bg)',
      border: '1px solid var(--jb-a-tint-line)',
      color: 'var(--jb-a-accent-2)',
    },
    warn: {
      background: 'var(--jb-a-tint)',
      border: '1px solid var(--jb-a-status-warn)',
      color: 'var(--jb-a-status-warn)',
    },
    danger: {
      background: 'var(--jb-a-danger-bg)',
      border: '1px solid var(--jb-a-danger-line)',
      color: 'var(--jb-a-danger-ink)',
    },
  }[tone];

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 999,
  };

  return (
    <span style={{ ...base, ...toneStyle, ...style }} {...rest}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npx eslint src/components/app/ui/Badge.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/ui/Badge.jsx
git commit -m "feat(app-ui): add Badge primitive"
```

---

### Task 4: Build the `Button` primitive

**Files:**
- Create: `frontend/src/components/app/ui/Button.jsx`

**Interfaces:**
- Produces: `export default function Button({ variant, href, children, style, ...rest })` — renders a Next.js `<Link>` when `href` is given, otherwise a `<button type="button">`. `variant`: `'primary'` (solid green, default), `'secondary'` (outlined), `'ghost'` (icon-only square, transparent/bordered).

- [ ] **Step 1: Write the component**

```jsx
import Link from 'next/link';

export default function Button({ variant = 'primary', href, children, style, ...rest }) {
  const variantStyle = {
    primary: {
      background: 'var(--jb-a-accent)',
      color: 'var(--jb-a-accent-ink)',
      border: 'none',
      fontWeight: 700,
    },
    secondary: {
      background: 'var(--jb-a-card)',
      color: 'var(--jb-a-ink)',
      border: '1px solid var(--jb-a-line-strong)',
      fontWeight: 600,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--jb-a-ink-2)',
      border: '1px solid var(--jb-a-line-strong)',
      fontWeight: 600,
      width: 38,
      height: 38,
      padding: 0,
    },
  }[variant];

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: variant === 'ghost' ? undefined : 40,
    padding: variant === 'ghost' ? undefined : '0 18px',
    borderRadius: variant === 'ghost' ? 9 : 10,
    fontSize: 14,
    fontFamily: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  const mergedStyle = { ...base, ...variantStyle, ...style };

  if (href) {
    return (
      <Link href={href} style={mergedStyle} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" style={mergedStyle} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npx eslint src/components/app/ui/Button.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/ui/Button.jsx
git commit -m "feat(app-ui): add Button primitive"
```

---

### Task 5: Build the `PageHeader` primitive

**Files:**
- Create: `frontend/src/components/app/ui/PageHeader.jsx`

**Interfaces:**
- Produces: `export default function PageHeader({ title, subtitle, action })` — renders the repeated in-content `<h2>{title}</h2> <span>{subtitle}</span>` row pattern (e.g. "Get set up" / "3 of 4 done — finish these to unlock better matches"), with an optional right-aligned `action` node (e.g. a Button).

- [ ] **Step 1: Write the component**

```jsx
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontSize: 26, fontWeight: 400, color: 'var(--jb-a-ink)' }}>
        {title}
      </h2>
      {subtitle && (
        <span style={{ fontSize: 14, color: 'var(--jb-a-ink-muted)' }}>{subtitle}</span>
      )}
      {action && (
        <>
          <div style={{ flex: 1 }} />
          {action}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npx eslint src/components/app/ui/PageHeader.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/ui/PageHeader.jsx
git commit -m "feat(app-ui): add PageHeader primitive"
```

---

### Task 6: Migrate `dashboard.jsx` to the completed tokens + new primitives

**Files:**
- Modify: `frontend/src/pages/app/dashboard.jsx` (targeted edits, not a full rewrite — the data-fetching logic, all `useState`/`useEffect`/formatting helpers stay exactly as they are; only the visual/JSX layer changes)

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `PageHeader` from Task 2-5 (`@/components/app/ui/Card` etc.); the 7 tokens from Task 1.

- [ ] **Step 1: Add the new imports**

At the top of `frontend/src/pages/app/dashboard.jsx`, after the existing `import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';` line, add:

```js
import Card from '@/components/app/ui/Card';
import Badge from '@/components/app/ui/Badge';
import Button from '@/components/app/ui/Button';
import PageHeader from '@/components/app/ui/PageHeader';
```

- [ ] **Step 2: Replace `STAT_META`'s stray hexes with tokens**

Replace the `STAT_META` array (lines 21-26) with:

```js
const STAT_META = [
  { label: 'Applied', icon: '↗', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
  { label: 'Interviews', icon: '◷', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
  { label: 'Avg. match', icon: '◎', chipBg: 'var(--jb-a-chip-success-bg)', chipInk: 'var(--jb-a-accent-2)', bg: 'var(--jb-a-tint)', border: 'var(--jb-a-tint-line)', labelColor: 'var(--jb-a-accent-2)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-accent-2)', subColor: 'var(--jb-a-accent-muted)' },
  { label: 'Response rate', icon: '⤴', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-status-warn)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
];
```

(Every hex literal replaced 1:1 with the token that carries the identical color, per Task 1's mapping: `#8A7C5A`→`--jb-a-chip-neutral-ink`, `#DCEFE3`→`--jb-a-chip-success-bg`, `#1FA463`→`--jb-a-accent-2`, `#5A8C6E`→`--jb-a-accent-muted`, `#CDE9D6`→`--jb-a-tint-line`, `#C9622E`→`--jb-a-status-warn`.)

- [ ] **Step 3: Replace `PIPE_META`'s stray hexes with tokens**

Replace the `PIPE_META` array (lines 30-35) with:

```js
const PIPE_META = [
  { stage: 'Applied', color: 'var(--jb-a-ink)' },
  { stage: 'In review', color: 'var(--jb-a-status-warn)' },
  { stage: 'Interviewing', color: 'var(--jb-a-accent-2)' },
  { stage: 'Offers', color: 'var(--jb-a-accent)' },
];
```

- [ ] **Step 4: Replace the breadcrumb separator's stray hex**

Find (currently line 368):

```jsx
              <span aria-hidden style={{ color: '#BEBEBE' }}>/</span>
```

Replace with:

```jsx
              <span aria-hidden style={{ color: 'var(--jb-a-ink-muted)' }}>/</span>
```

- [ ] **Step 5: Replace the notification badge's stray hex**

Find (currently line 400):

```jsx
              ◔<span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.green, color: T.greenInk, fontFamily: T.mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #F5F5F5' }}>3</span>
```

Replace with:

```jsx
              ◔<span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.green, color: T.greenInk, fontFamily: T.mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--jb-a-header)' }}>3</span>
```

- [ ] **Step 6: Replace the error banner's stray hexes and adopt Card + Badge**

Find (currently lines 413-417):

```jsx
                  {error && (
                    <div style={{ padding: '12px 16px', background: '#FBEFE9', border: '1px solid #F0CDBD', borderRadius: 12, fontSize: 13.5, color: '#8A4A2E' }}>
                      We couldn’t reach your live data just now.{' '}
                      <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 4, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>Retry</button>
                    </div>
                  )}
```

Replace with:

```jsx
                  {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--jb-a-danger-bg)', border: '1px solid var(--jb-a-danger-line)', borderRadius: 12, fontSize: 13.5, color: 'var(--jb-a-danger-ink)' }}>
                      We couldn’t reach your live data just now.{' '}
                      <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 4, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>Retry</button>
                    </div>
                  )}
```

- [ ] **Step 7: Replace the styled-jsx global block's stray hexes**

Find (currently lines 346-347, inside the `<style jsx global>` template string):

```js
        #jbapp ::-webkit-scrollbar-thumb { background: #c9ccc6; border-radius: 10px; }
        #jbapp button:focus-visible { outline: 2px solid #2f7d3a; outline-offset: 2px; }
```

Replace with:

```js
        #jbapp ::-webkit-scrollbar-thumb { background: var(--jb-a-line-strong); border-radius: 10px; }
        #jbapp button:focus-visible { outline: 2px solid var(--jb-a-accent-2); outline-offset: 2px; }
```

- [ ] **Step 8: Replace the "Recommended for you" section header with `PageHeader`**

Find (currently lines 496-499):

```jsx
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                        <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 26, fontWeight: 400 }}>Recommended for you</h2>
                        <span style={{ fontSize: 14, color: T.muted }}>Estimated fit is a signal, not a guarantee.</span>
                      </div>
```

Replace with:

```jsx
                      <PageHeader title="Recommended for you" subtitle="Estimated fit is a signal, not a guarantee." />
```

- [ ] **Step 9: Replace the "Get set up" section header with `PageHeader`**

Find (currently lines 449-452):

```jsx
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                        <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 26, fontWeight: 400 }}>Get set up</h2>
                        <span style={{ fontSize: 14, color: T.muted }}>{stepsDone} of {steps.length} done — finish these to unlock better matches.</span>
                      </div>
```

Replace with:

```jsx
                      <PageHeader title="Get set up" subtitle={`${stepsDone} of ${steps.length} done — finish these to unlock better matches.`} />
```

- [ ] **Step 10: Adopt `Card` for the "Get set up" step cards**

Find (currently lines 455-467, the step-card `<div>` inside the `steps.map(...)` block):

```jsx
                          <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 22px', background: T.card, border: `1px solid ${s.done ? T.tintLine : T.line2}`, borderLeft: `4px solid ${s.done ? T.green : T.line2}`, borderRadius: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.done ? T.green : 'var(--jb-a-control)', color: s.done ? T.greenInk : T.muted, border: `1px solid ${s.done ? T.green : T.line2}` }}>{s.done ? '✓' : i + 1}</span>
                              <span style={{ fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                            </div>
                            <div style={{ fontSize: 14, color: T.ink2 }}>{s.hint}</div>
                            <div style={{ flex: 1 }} />
                            {s.done ? (
                              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.green2 }}>Done</span>
                            ) : (
                              <Link href={s.href} style={{ alignSelf: 'flex-start', height: 38, padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: 9, background: T.green, color: T.greenInk, fontSize: 14, fontWeight: 700 }}>Start</Link>
                            )}
                          </div>
```

Replace with:

```jsx
                          <Card key={s.key} accentLeft={s.done ? 'var(--jb-a-accent)' : 'var(--jb-a-line-strong)'} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 22px', borderColor: s.done ? 'var(--jb-a-tint-line)' : 'var(--jb-a-line-strong)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.done ? T.green : 'var(--jb-a-control)', color: s.done ? T.greenInk : T.muted, border: `1px solid ${s.done ? T.green : T.line2}` }}>{s.done ? '✓' : i + 1}</span>
                              <span style={{ fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                            </div>
                            <div style={{ fontSize: 14, color: T.ink2 }}>{s.hint}</div>
                            <div style={{ flex: 1 }} />
                            {s.done ? (
                              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.green2 }}>Done</span>
                            ) : (
                              <Button href={s.href} style={{ alignSelf: 'flex-start', height: 38, padding: '0 16px', fontSize: 14 }}>Start</Button>
                            )}
                          </Card>
```

(This card keeps its own inline color logic for the checkmark badge, since that's a 3-way conditional too specific to generalize into `Card`/`Badge` right now — YAGNI. `Card` handles the container/border/accent, `Button` handles "Start".)

- [ ] **Step 11: Adopt `Button` for the primary/secondary CTAs**

Replace each of these 5 occurrences (search for the exact `style={{...}}` object to locate each — they're not adjacent):

1. Currently line 440 — Auto-Apply CTA:
```jsx
<Link href={appRoute('App Auto-Apply.dc.html')} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: T.green, color: T.greenInk, fontSize: 14, fontWeight: 700 }}>Set up Auto-Apply</Link>
```
becomes:
```jsx
<Button href={appRoute('App Auto-Apply.dc.html')} style={{ flex: 1 }}>Set up Auto-Apply</Button>
```

2. Currently line 441 — Preferences secondary CTA:
```jsx
<Link href="/app/settings" style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', border: `1px solid var(--jb-a-ink-muted)`, borderRadius: 10, color: T.darkText, fontSize: 14, fontWeight: 600 }}>Preferences</Link>
```
becomes:
```jsx
<Button variant="secondary" href="/app/settings" style={{ borderColor: 'var(--jb-a-ink-muted)', background: 'transparent', color: T.darkText }}>Preferences</Button>
```

3. Currently line 504 — "Set preferences" empty-state CTA:
```jsx
<Link href="/app/settings" style={{ marginTop: 4, height: 40, padding: '0 18px', display: 'flex', alignItems: 'center', borderRadius: 10, background: T.green, color: T.greenInk, fontSize: 14, fontWeight: 700 }}>Set preferences</Link>
```
becomes:
```jsx
<Button href="/app/settings" style={{ marginTop: 4 }}>Set preferences</Button>
```

4. Currently line 529 — per-job "Apply" CTA:
```jsx
<Link href={appRoute('App Matches.dc.html')} style={{ height: 38, padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: 9, background: T.green, color: T.greenInk, fontSize: 14, fontWeight: 700 }}>Apply</Link>
```
becomes:
```jsx
<Button href={appRoute('App Matches.dc.html')} style={{ height: 38, padding: '0 16px' }}>Apply</Button>
```

5. Currently line 539 — "See all matches" secondary CTA:
```jsx
<Link href={appRoute('App Matches.dc.html')} style={{ alignSelf: 'flex-start', height: 42, padding: '0 18px', display: 'flex', alignItems: 'center', border: `1px solid ${T.line2}`, borderRadius: 10, background: T.card, fontSize: 14.5, fontWeight: 600 }}>See all matches</Link>
```
becomes:
```jsx
<Button variant="secondary" href={appRoute('App Matches.dc.html')} style={{ alignSelf: 'flex-start', height: 42, padding: '0 18px', fontSize: 14.5 }}>See all matches</Button>
```

(Leave the "♡" save icon-button, the theme toggle button, and "View pipeline"/"Open full activity log" links as-is for this task — they already reference only tokens, no stray hexes, and converting every single button to the primitive is a larger follow-up than this task's scope; Task 1's constraint is "zero hardcoded hex," not "zero raw `<button>`/`<Link>` tags." Note this explicitly as a deliberate boundary, not an oversight.)

- [ ] **Step 12: Adopt `Badge` for the match-% and skill-tag pills**

Find (currently lines 524-527, inside the `recJobs.map(...)` block):

```jsx
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 600, color: T.green2 }}>{j.fit}</div>
                                <div style={{ fontSize: 12, color: T.muted }}>estimated fit</div>
                              </div>
```

Leave this one as-is (it's a large numeric display, not a pill — not a Badge use case).

Find (currently lines 518-520, the skill-tag pills):

```jsx
                                {j.skills.map((s) => (
                                  <span key={s} style={{ fontSize: 12.5, padding: '3px 9px', borderRadius: 999, background: 'var(--jb-a-control)', color: T.ink2, border: `1px solid ${T.line}` }}>{s}</span>
                                ))}
```

Replace with:

```jsx
                                {j.skills.map((s) => (
                                  <Badge key={s} tone="neutral">{s}</Badge>
                                ))}
```

- [ ] **Step 13: Run the build**

Run: `cd frontend && pnpm build`
Expected: exits 0, no compile errors, `dashboard` listed in the build output's page list.

- [ ] **Step 14: Run lint**

Run: `cd frontend && npx eslint src/pages/app/dashboard.jsx src/components/app/ui/*.jsx`
Expected: no errors.

- [ ] **Step 15: Grep for any remaining stray hex literals**

Run: `grep -oE "#[0-9A-Fa-f]{3,8}" frontend/src/pages/app/dashboard.jsx`
Expected: no output (empty) — confirms every hex literal from the original file was replaced by a token reference in one of Steps 2-7. (`var(--jb-a-*)` strings don't match this pattern, so a clean grep proves the migration is complete.)

- [ ] **Step 16: Run the E2E smoke check for this one route**

Ensure the live stack is available (Mongo/backend/frontend — same setup as prior E2E runs; Playwright's `webServer` config boots backend/frontend itself if not already running).

Run: `cd e2e && npx playwright test specs/smoke --grep dashboard --reporter=list`
Expected: PASS — the dashboard route renders real content, has no horizontal overflow, and throws no console/API errors.

- [ ] **Step 17: Commit**

```bash
git add frontend/src/pages/app/dashboard.jsx
git commit -m "feat(dashboard): migrate to completed tokens and shared app-ui primitives"
```
