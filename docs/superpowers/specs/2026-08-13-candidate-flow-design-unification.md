# Candidate Flow Design Unification — Design

## Context

This is the second sub-project of the candidate-flow initiative (sub-project 1, the mock-interview AI feedback loop, shipped and merged). A prior audit found the candidate app split across at least four inconsistent visual languages: `dashboard.jsx`'s dark-ink/cream/Instrument-Serif system (built via a dedicated `--jb-a-*` token family in `frontend/src/styles/tokens.css`, the most "correct" of the four), `mock-interview.jsx`'s dark/monospace "Performance Console" (shipped one day prior to this spec, in sub-project 1), a Tailwind-arbitrary-hex cream palette used by `matches.jsx`/`tracker.jsx`, and a pure-inline-hardcoded-hex approach used by `apply.jsx`/`resume.jsx` — with the "same" green accent appearing as `#1FA463`, `#1fa463`, `#157A49`, `#157a49`, and `#5BD08C` across different files.

**Revision note:** a first version of this spec unified everything onto `dashboard.jsx`'s dark-ink/cream/Instrument-Serif/green system, and that foundation (token gaps closed, `Card`/`Badge`/`Button`/`PageHeader` primitives built, `dashboard.jsx` migrated as the reference implementation) shipped and merged. After seeing it live, the product owner asked for a different visual direction entirely — lighter, more confident, closer to Notion's current visual language — rather than a continuation of the dark/serif system. This revision **replaces** the Direction and Scope sections below with that new direction. The previously shipped token names and primitive component names stay (avoiding a second rename cost); their *values* change. Everything else in this document (screen list, non-goals, testing approach) still applies.

## Direction

Move `--jb-a-*` from the dark-ink/cream/Instrument-Serif/green system to a light, white-first system: white/off-white surfaces, near-black ink, **Space Grotesk** for display/headline type (replacing Instrument Serif), **Hanken Grotesk** stays as the body face (already used everywhere, no reason to change what's already working), JetBrains Mono stays for the mono/eyebrow labels. Accent moves from single-hue green to a disciplined multi-hue system anchored on a confident blue, with green/amber reserved for semantic status (success/medium) rather than as the brand color. This direction was locked via mockup approval in this session (dashboard hero + card pattern, then a follow-up pass with the real fonts loaded).

**Concrete tokens (approved mockup values):**
- Stage/background: `#fcfcfa`; card surface: `#ffffff`; card border: `#edece7`
- Ink: `#0a0a0a` (primary), `#5c5c5c` (muted/secondary), `#9b9b9b` (faint/labels)
- Accent (primary, blue): `#3b5bff`; accent tint (badge/highlight backgrounds): `#dde8ff`
- Success/green: `#22c55e` (high-match score rings, positive stats)
- Medium/amber: `#f5a623` (medium-match score rings — semantic "caution/medium", not decorative)
- A small decorative rotation set for company-initial badges beyond blue: at minimum one warm pairing (`#ffe4d6` tint / `#c9622e` ink), seen in the approved mockup on a second badge — exact full rotation set (how many hues, which order) is an implementation detail for the plan, not enumerated here
- Dark inverted panel (e.g. the Auto-Apply card): `#0a0a0a` background, `#f5f5f3` ink — this is a **`Card` variant** (already exists as `invert` today), not a page-level dark theme; it renders on the light page like Notion's own dark product screenshots do
- Display font: Space Grotesk (700 weight for headlines, 500 for sub-headings); body: Hanken Grotesk (existing); mono: JetBrains Mono (existing, unchanged)
- Signature motifs from the approved mockup: soft radial gradient glows behind hero content (blue + coral, ~7-10% opacity, decorative only), radial SVG match-score rings (stroke color = success/medium/danger by score band) replacing bare percentage numbers, colorful initial-letter badges (2-letter company initials, tinted background + solid ink) replacing any generic icon/emoji for company identity, warm-tinted soft shadows on cards instead of the current flat/bordered-only treatment

**No dark mode.** The prior system supported a light/dark toggle (`[data-jb-theme='light']` override in `tokens.css`, driven by `dashboard.jsx`'s reuse of the marketing surface's `useMarketingTheme` hook). This new direction is light-only — confirmed explicitly, since the mockups only ever showed a light page. The theme-toggle button in `dashboard.jsx`'s header is removed as part of this migration; `useMarketingTheme` itself is untouched since the marketing surface (`SiteNav`, `PublicLayout`) still uses it independently for its own unrelated dark marketing theme. The `[data-jb-theme='light']` block in `tokens.css` for the `--jb-a-*` family is deleted along with the dark defaults it overrode — `--jb-a-*` becomes a single, non-conditional palette.

## Scope: what gets built

### 1. Token system re-values (`frontend/src/styles/tokens.css`)

The `--jb-a-*` family already exists (from the prior foundation) with the right *shape* — stage/card/ink/accent/border/tint/status tokens are all named and consumed by the primitives and `dashboard.jsx` already. This pass:
- Replaces every `--jb-a-*` value with the new light-system value (see Direction above for the concrete set).
- Removes the `[data-jb-theme='light']` override block for `--jb-a-*` — no longer needed once there's only one palette.
- Adds any new tokens the mockup introduces that don't yet exist under the old shape: a decorative badge-rotation set, radial-glow gradient stops, and the score-ring "medium" semantic color (`--jb-a-status-warn` already exists from the prior pass and maps cleanly to the new amber `#f5a623` — reuse it rather than adding a parallel token).
- Swaps `--jb-font-display` from Instrument Serif to Space Grotesk (`--jb-font-display: var(--jb-face-display), -apple-system, sans-serif;` — no serif fallback needed since Space Grotesk is a sans face). `--jb-font-sans` (Hanken Grotesk) and `--jb-font-mono` (JetBrains Mono) are unchanged.

### 2. Shared primitives (`frontend/src/components/app/ui/`) — visual rework, not a new build

`Card`, `Badge`, `Button`, `PageHeader` already exist from the prior foundation and already consume `var(--jb-a-*)` tokens exclusively (never a literal hex) — that architectural property doesn't change. What changes is each component's concrete look, driven by the new token values plus new visual affordances the old versions didn't need:
- **`Card`** — border-radius, shadow treatment (soft warm-tinted shadow instead of flat border-only), and its existing `invert` variant get new values; no new variant needed since the dark panel use case is already `invert`.
- **`Badge`** — gains the colorful initial-badge treatment (tinted background + ink pair, sized for 1-2 letter initials) as a variant, alongside its existing match-%/status-pill/tag uses.
- **`Button`** — primary/secondary/ghost variants get the new palette; shape/sizing changes only as needed to match the mockup (e.g. shadow on primary).
- **`PageHeader`** — typography swaps to Space Grotesk for its title; layout unchanged.
- **New: match-score ring** — the approved mockup's radial SVG ring (score-band-colored stroke, percentage in the center) replacing a bare number is a new small presentational component, not a rework of an existing one. Decide during planning whether this lives in `frontend/src/components/app/ui/` alongside the other four or is scoped closer to the screens that use it (dashboard, matches) — it's mockup-approved but not yet given a component name or file location.

### 3. Styling technique: unchanged from the prior pass

`dashboard.jsx` (the reference) uses inline `style` objects reading `var(--jb-a-*)`, not Tailwind classNames, even though Tailwind v4 is wired up in this repo and some other screens (`matches.jsx`, `tracker.jsx`) use it. Migration does **not** additionally convert Tailwind-based screens to inline styles or vice versa — a screen using `className="bg-[#f4efe4]"` becomes `className="bg-jb-a-stage"` (the existing Tailwind `--color-jb-*` utility mirror, extended to cover `--jb-a-*` the same way), while a screen using `style={{background: '#F7F3EA'}}` becomes `style={{background: 'var(--jb-a-stage)'}}`. One less variable to change at once — this pass unifies *color*, not *styling paradigm*. This point is unchanged from the original spec and still holds under the new direction.

### 4. `dashboard.jsx` re-migration (the reference implementation, again)

`dashboard.jsx` already migrated once, onto the old dark/serif system. This pass re-migrates it onto the new light system — token/primitive consumption stays structurally the same (it already reads everything through `var(--jb-a-*)` and the shared primitives), but every visual detail changes: greeting typography to Space Grotesk, score display to the radial ring component, company badges to colorful initials, Auto-Apply card confirmed as the `Card` `invert` variant, theme-toggle button removed. This is less work than the original migration (the plumbing exists) but is a real second pass, not a token-only swap — the ring and initial-badge treatments are new UI, not restyled existing UI.

### 5. Full screen list (all migrate) — unchanged from the original spec

Every `/app/*` candidate page, plus the two interview screens (dropping mock-interview's separate Performance Console treatment, per explicit confirmation — a real, deliberate cost since it shipped one day before the original spec, not a free change):

`dashboard` (re-verify/re-complete against the new direction), `matches`, `job-profiles`, `preferences`, `resume`, `resume-generate`, `resume-library`, `cover-letter`, `apply`, `auto-apply`, `tracker`, `saved`, `offers`, `interview`, `mock-interview`, `live-interview`, `messages`, `notifications`, `settings`, `security`, `billing`, `payment-methods`, `subscription`, `upgrade`, `company`, `concierge`, `help`, `support`, `onboarding`, plus `/profile`, `/resumes`, `/applications`.

`resume-builder` (a 16-line stub that only redirects to `resume-library`, no visual content of its own) and `/app/states` (an internal component gallery, explicitly excluded from the product surface per the E2E suite's own route manifest) are out of scope — nothing to migrate.

`messages`/`help`/`support` are still functionally mock (sub-projects 3/4, not yet built) — this pass restyles their current shell UI using the new primitives now; the functional rebuild happens later and inherits the finished visual language instead of needing a second design pass.

Pre-auth screens (`login`, `signup`, `reset-password`, `verify-email`) are **not** in this pass — they're shared surface with less certain candidate-only ownership and weren't part of the original audit's candidate-flow scope; a separate call if/when needed.

## Error handling / non-goals

- No visual-regression tooling exists in this repo and none is being built now — out of scope.
- Verification relies on the existing Playwright smoke suite (`e2e/support/routes.ts`), which already asserts every `/app/*` route renders real content, has no horizontal overflow, and throws no console/API errors — silent breakage during migration fails this automatically. Supplemented by manual spot-checks per migrated batch, not full automated visual diffing.
- This pass does not change any screen's *functionality*, data, or component logic beyond what's needed to swap styling — a screen with a bug unrelated to color/typography is not this project's concern.
- No dark mode variant is designed or built for this new direction (see Direction above) — this is an explicit scope decision, not an oversight.

## Testing

- Run the existing Playwright smoke suite after each batch of migrated screens (not just once at the end) to catch breakage close to its cause.
- Manual browser spot-check of at least one screen per batch before moving to the next batch.
- No new automated tests are written specifically for visual output (see non-goals) — the smoke suite's existing render/console/overflow assertions are the safety net.
