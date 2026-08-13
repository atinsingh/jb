# Candidate Flow Design Unification — Design

## Context

This is the second sub-project of the candidate-flow initiative (sub-project 1, the mock-interview AI feedback loop, shipped and merged). A prior audit found the candidate app split across at least four inconsistent visual languages: `dashboard.jsx`'s dark-ink/cream/Instrument-Serif system (built via a dedicated `--jb-a-*` token family in `frontend/src/styles/tokens.css`, the most "correct" of the four), `mock-interview.jsx`'s dark/monospace "Performance Console" (shipped one day prior to this spec, in sub-project 1), a Tailwind-arbitrary-hex cream palette used by `matches.jsx`/`tracker.jsx`, and a pure-inline-hardcoded-hex approach used by `apply.jsx`/`resume.jsx` — with the "same" green accent appearing as `#1FA463`, `#1fa463`, `#157A49`, `#157a49`, and `#5BD08C` across different files.

The user decided this needs a single unified pass, done **before** the two remaining functional sub-projects (messages backend, help/support backend), so that new work is built against a settled design language instead of inventing a fifth one.

## Direction

Extend `dashboard.jsx`'s existing system as the standard: dark ink stage, cream text, Instrument Serif display type, **green accent** (the real dashboard color — an earlier mockup incorrectly showed gold and was corrected before this spec was written). This is confirmed via `frontend/src/styles/tokens.css`'s `--jb-a-*` token family, which already exists and is purpose-built for this — `dashboard.jsx` is simply the only screen that currently uses it consistently.

## Scope: what gets built

### 1. Token system completion (`frontend/src/styles/tokens.css`)

The `--jb-a-*` family already covers stage/card/ink/accent/border/tint/layout. Gaps to close:
- Promote `dashboard.jsx`'s ~12 stray hardcoded hexes (status/pipeline-stage chip colors: warn, danger, and similar) to new named tokens (e.g. `--jb-a-status-warn`, `--jb-a-status-danger`, `--jb-a-status-info`) rather than literals.
- Establish `--jb-a-accent` (green, matching the real dashboard's `#5bd08c`/`#1fa463`) as the single canonical accent value that every migrated screen references — no screen keeps its own green hex.

### 2. Shared primitives (new — `frontend/src/components/app/ui/`)

No Card/Badge/Button/PageHeader component exists anywhere in this codebase today; every screen hand-rolls these via inline `<div style={{...}}>`. Build four reusable components, each consuming only `var(--jb-a-*)` tokens, never a literal hex:
- **`Card`** — the bordered/rounded container pattern repeated across every list/detail screen.
- **`Badge`** — covers match-%, status pills, category tags, difficulty indicators — everything currently a bespoke inline pill per file.
- **`Button`** — primary/secondary/ghost variants, replacing each screen's own `<button style={{...}}>`.
- **`PageHeader`** — title + subtitle + optional breadcrumb/action-row pattern repeated at the top of most screens.

### 3. Styling technique: keep each screen's existing mechanism, swap only the color/token source

`dashboard.jsx` (the reference) uses inline `style` objects reading `var(--jb-a-*)`, not Tailwind classNames, even though Tailwind v4 is wired up in this repo and some other screens (`matches.jsx`, `tracker.jsx`) use it. Migration does **not** additionally convert Tailwind-based screens to inline styles or vice versa — a screen using `className="bg-[#f4efe4]"` becomes `className="bg-jb-a-stage"` (the existing Tailwind `--color-jb-*` utility mirror, extended to cover `--jb-a-*` the same way), while a screen using `style={{background: '#F7F3EA'}}` becomes `style={{background: 'var(--jb-a-stage)'}}`. One less variable to change at once — this pass unifies *color*, not *styling paradigm*.

### 4. Full screen list (all migrate)

Every `/app/*` candidate page, plus the two interview screens (dropping mock-interview's separate Performance Console treatment, per explicit confirmation — a real, deliberate cost since it shipped one day before this spec, not a free change):

`dashboard` (verify/complete — already closest), `matches`, `job-profiles`, `preferences`, `resume`, `resume-generate`, `resume-library`, `cover-letter`, `apply`, `auto-apply`, `tracker`, `saved`, `offers`, `interview`, `mock-interview`, `live-interview`, `messages`, `notifications`, `settings`, `security`, `billing`, `payment-methods`, `subscription`, `upgrade`, `company`, `concierge`, `help`, `support`, `onboarding`, plus `/profile`, `/resumes`, `/applications`.

`resume-builder` (a 16-line stub that only redirects to `resume-library`, no visual content of its own) and `/app/states` (an internal component gallery, explicitly excluded from the product surface per the E2E suite's own route manifest) are out of scope — nothing to migrate.

`messages`/`help`/`support` are still functionally mock (sub-projects 3/4, not yet built) — this pass restyles their current shell UI using the new primitives now; the functional rebuild happens later and inherits the finished visual language instead of needing a second design pass.

Pre-auth screens (`login`, `signup`, `reset-password`, `verify-email`) are **not** in this pass — they're shared surface with less certain candidate-only ownership and weren't part of the original audit's candidate-flow scope; a separate call if/when needed.

## Error handling / non-goals

- No visual-regression tooling exists in this repo and none is being built now — out of scope.
- Verification relies on the existing Playwright smoke suite (`e2e/support/routes.ts`), which already asserts every `/app/*` route renders real content, has no horizontal overflow, and throws no console/API errors — silent breakage during migration fails this automatically. Supplemented by manual spot-checks per migrated batch, not full automated visual diffing.
- This pass does not change any screen's *functionality*, data, or component logic beyond what's needed to swap styling — a screen with a bug unrelated to color/typography is not this project's concern.

## Testing

- Run the existing Playwright smoke suite after each batch of migrated screens (not just once at the end) to catch breakage close to its cause.
- Manual browser spot-check of at least one screen per batch before moving to the next batch.
- No new automated tests are written specifically for visual output (see non-goals) — the smoke suite's existing render/console/overflow assertions are the safety net.
