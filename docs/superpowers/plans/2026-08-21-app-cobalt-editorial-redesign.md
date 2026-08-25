# Jobocate App — Cobalt Editorial Redesign Implementation Plan

**Source design:** `~/Downloads/Jobocate App.html` (a self-extracting Claude Design bundle;
decoded template kept at `scratchpad/design/design.dc.html`, 1076 lines, 7 artboards).

**Goal:** Re-value the `--jb-a-*` token family to the design's light/cobalt system, replace the
wide `AppSidebar` with the design's 70px icon rail, and migrate all seven designed screens —
Sign in, Onboarding, Dashboard, Matches, Applications, Résumé, Employer dashboard — onto it,
keeping every existing API call and data hook intact.

**Supersedes:** `2026-08-13-candidate-design-light-pivot.md`. That plan targeted accent `#3b5bff`
with a Space Grotesk display face and was never executed (`tokens.css` still holds the dark
`#101c14`/`#5bd08c` values). The new mockup lands on `#2B4ACC` and **keeps Instrument Serif**,
so the font swap in that plan is dropped and its palette is re-derived here.

---

## Direction

Editorial, typography-led, light. Three moves define it:

1. **The display face carries the page.** Instrument Serif at 46–64px opens every screen with a
   sentence, not a label — "Meridian wants to talk. Tuesday, 2pm.", "14 in flight. 3 need you."
   The headline is generated from data, so it is a component, not a string.
2. **Mono micro-labels replace chrome.** IBM Plex Mono, 11px, uppercase, `0.16em`–`0.22em`
   tracking, in `#5B6070`, is the only label style. It replaces today's badges-and-boxes.
3. **One blue, everything else is a hairline.** `#2B4ACC` marks exactly what needs attention
   (high fit, active nav, primary action, urgent card). Structure comes from 1px `#E5E3DD`
   rules on white, not from cards, shadows, or fills.

Amber `#A66A12` is reserved for offers. Green is retired from the app surface entirely.

## Global Constraints

- **Single palette, no dark mode for `/app/*`.** Delete the `--jb-a-*` block from the
  `[data-jb-theme='light']` override and put the new values directly on `:root`. Do not
  reintroduce a conditional `--jb-a-*` block.
- **`useMarketingTheme` is untouched.** The marketing surface keeps its own dark/light toggle.
- **Zero literal hex in page and component files.** Colour resolves through `var(--jb-a-*)`.
  Literals belong only in `tokens.css`.
- **Data stays real.** Every existing `services/*Api` call, loading/empty/error state and auth
  guard is preserved. The mockup's content ("Northwind", "$170–200k") is placeholder — each
  `sc-for` maps to the API array the page already fetches. Where the design shows something with
  no backing field, derive it from existing data and record the gap in "Data gaps" below.
- **No new test framework.** This repo has no frontend unit tests (an open decision left to the
  human). Verification is `pnpm lint` + `pnpm build` + the Playwright smoke suite + screenshots.

---

## Task 1 — Re-value `--jb-a-*` to the cobalt light system

**Files:** `frontend/src/styles/tokens.css`

Replace the dark APP STAGE `:root` block and delete the matching override block under
`[data-jb-theme='light']`. Token map, derived from the mockup's own values:

| Token | Value | Used for |
|---|---|---|
| `--jb-a-stage` | `#FFFFFF` | main content ground |
| `--jb-a-rail` | `#FBFAF8` | icon rail, filter rail, board columns |
| `--jb-a-stage-deep` | `#F4F3F0` | résumé workspace ground |
| `--jb-a-card` | `#FFFFFF` | cards, paper |
| `--jb-a-control` | `#F1F0EC` | neutral chip / stage badge fill |
| `--jb-a-ink` | `#14161C` | headlines, primary text |
| `--jb-a-ink-2` | `#4A4E58` | body copy, deck text |
| `--jb-a-ink-3` | `#5B6070` | mono micro-labels, secondary meta |
| `--jb-a-ink-soft` | `#6E727B` | company names, tertiary meta |
| `--jb-a-ink-warm` | `#6E6C66` | timestamps, "fit" caption |
| `--jb-a-ink-faint` | `#9A9790` | drag handles, inactive marks |
| `--jb-a-line` | `#E5E3DD` | primary hairline (headers, rails) |
| `--jb-a-line-soft` | `#ECEAE4` | row dividers |
| `--jb-a-line-strong` | `#DDDAD2` | inputs, secondary buttons |
| `--jb-a-line-btn` | `#D3D0C8` | large secondary pill border |
| `--jb-a-line-dashed` | `#C9C6BE` | résumé dropzone |
| `--jb-a-chip-line` | `#E0DDD5` | unselected filter chip border |
| `--jb-a-accent` | `#2B4ACC` | the one blue |
| `--jb-a-accent-hover` | `#1E38A8` | primary button hover |
| `--jb-a-accent-deep` | `#3F55B5` | funnel stage 2 |
| `--jb-a-accent-soft` | `#7C8FE0` | funnel stage 4 |
| `--jb-a-tint` | `#EEF1FD` | active nav, selected chip, callout |
| `--jb-a-tint-line` | `#C6D0F7` | selected chip border, urgent card border |
| `--jb-a-tint-wash` | `#FBFAFF` | expanded match row background |
| `--jb-a-tint-ink` | `#3A4560` | body text on a tint panel |
| `--jb-a-status-offer` | `#A66A12` | offer stat, offer column dot, warn dot |
| `--jb-a-offer-bg` | `#FBF2E2` | offer badge fill |
| `--jb-a-offer-ink` | `#8A5A12` | offer badge text |
| `--jb-a-chip-neutral-ink` | `#5B5E60` | neutral stage badge text |
| `--jb-a-dot-applied` | `#C8C6BF` | Applied column dot |
| `--jb-a-dot-review` | `#5B7186` | In-review column dot |
| `--jb-a-invert` | `#14161C` | sign-in quote panel, funnel stage 1 |
| `--jb-a-invert-ink` | `#FBFAF8` | text on invert |
| `--jb-a-invert-muted` | `rgba(251,250,248,.6)` | caption on invert |
| `--jb-a-shadow-paper` | `0 24px 48px -28px rgba(20,22,28,.22)` | résumé paper lift |

Display sizes the mockup introduces, added alongside the existing scale:
`--jb-a-display-hero: 4rem` (64px, dashboard) · `--jb-a-display-lg: 3.5rem` (56px, employer) ·
`--jb-a-display-md: 3.25rem` (52px, matches) · `--jb-a-display-sm: 2.875rem` (46px, tracker,
sign-in, onboarding) · `--jb-a-display-stat: 2.75rem` (44px, stat figures).

`--jb-font-display` stays Instrument Serif — no change to `_app.js`.

## Task 2 — Shared primitives

**Files:** `frontend/src/components/app/ui/*`

Rework the four existing primitives onto the new tokens and add the vocabulary the mockup
repeats across screens, so no screen re-implements it:

- `MonoLabel` — the 11px uppercase tracked label. Props: `tracking` (`normal` `0.16em` |
  `wide` `0.18em` | `hero` `0.22em`), `tone` (`muted` | `accent`).
- `FitScore` — mono numeral that turns cobalt at ≥88 and stays `--jb-a-ink-2` below. This
  threshold is the design's own rule (`fitInk` in the mockup's `renderVals`); it lives in one
  place so Dashboard, Matches and Applications cannot drift apart.
- `Chip` — the filter chip (selected: tint fill + `--jb-a-tint-line`; unselected: transparent +
  `--jb-a-chip-line`).
- `Pill` — the onboarding preference pill (selected: solid accent; unselected: white + border).
- `Toggle` — the 38×22 / 40×24 switch.
- `Hero` — mono eyebrow + Instrument Serif headline + deck + action row, with a `size` prop
  covering the four display steps.
- `RuleHeading` — the "label ——————— action →" divider used on Dashboard and Employer.
- `Button` — `primary` (solid cobalt pill), `secondary` (white pill, `--jb-a-line-btn`, border
  darkens to ink on hover), `quiet` (bare accent text), `square` (8–9px radius, résumé rail).
- `Card`, `Badge`, `PageHeader` — re-valued; `Badge` gains `tone="offer"` and `tone="neutral"`.

## Task 3 — App shell: the 70px icon rail

**Files:** `frontend/src/components/app/AppSidebar.jsx`

Replace the wide sidebar with the mockup's rail: 70px, `--jb-a-rail` ground,
`--jb-a-line` right border, logo mark at the top, a 9-item icon column (42×42, 11px radius,
active = `--jb-a-tint` fill + cobalt icon, idle = transparent + `--jb-a-ink-warm`), spacer,
and the avatar/sign-out button at the bottom. Labels move to `title` tooltips.

Keep: `active` prop contract, `appRoute()` for every destination, the existing `Glyph` map
(extended with the mockup's `building`/`settings` paths), auth-derived initials, and the
premium/live affordances — collapsed into the tooltip rather than dropped.

Rail order (candidate, from the design): Dashboard · Matches · Applications · Saved · Offers ·
Auto-apply · Résumé · Interview prep · Concierge.
Employer rail: Hiring dashboard · Company · Candidates · Messages · Interviews · Pipeline ·
Offers · Settings.

## Task 4 — Dashboard (`/app/dashboard`)

The biggest IA change: today's stat-card grid becomes a single editorial answer to
"what should I do right now".

- **Hero** — mono eyebrow "One thing today", 64px headline, deck, primary + secondary actions.
  The headline is *derived*: pick the highest-priority item from data the page already loads —
  an upcoming interview, then an application needing a response, then the top new match — and
  render the fallback ("42 roles are waiting on you") when none exists.
- **Stat row** — four bare figures on a top rule: In flight, Interviewing, Offers (amber),
  Response rate (cobalt). No cards.
- **"Waiting on you"** — a `RuleHeading` and three borderless rows: fit, role, company, meta,
  Review action. Links to `/app/matches`.

## Task 5 — Matches (`/app/matches`)

268px filter rail (`--jb-a-rail`) + list. Filters: match-quality radio list, Seniority and
Role-family chip grids, salary-floor range input with mono readout, Remote-only toggle, Reset.
List: 52px headline generated from the result count, deck, then rows on a `1px solid ink` top
rule — fit + caption, role + company + optional cobalt flag chip, meta, save heart, CTA pill.
Expanding a row reveals the three-column reasoning strip (Skills / Seniority / Logistics) on
`--jb-a-tint-wash`, fed by the existing match-reasoning data.

## Task 6 — Applications (`/app/tracker`)

Header gains a Board/Table segmented control and "Log an application". Hero: 46px headline
generated from counts ("14 in flight. 3 need you."). Board: 4 columns in a 1px `--jb-a-line`
grid gap over `--jb-a-rail`, each with a status dot, title, mono count and white cards; a card
needing the user's move takes a `--jb-a-tint-line` border and a cobalt note dot. Table view: a
5-column grid on an ink top rule with stage badges. Keeps the existing status→column mapping.

## Task 7 — Résumé (`/app/resume`)

Three panes on `--jb-a-stage-deep`: 296px left rail (back link, ATS score as a 38px serif
numeral over a 4px cobalt progress bar, section list with amber warn dots, Download/Tailor
buttons), centre 660px paper with `--jb-a-shadow-paper`, and a 300px right rail (Suggestions,
Template picker). Wires to the existing résumé document + ATS scoring APIs.

## Task 8 — Onboarding (`/app/onboarding`)

White header with the three-step tracker (ring states: done ✓ filled cobalt, current cobalt
ring, upcoming grey), `--jb-a-rail` body, 720px column, 46px serif step title. Step 1 dropzone,
step 2 mono-labelled fields, step 3 role/location pills + salary slider + the tint Auto-Apply
consent panel. Sticky footer: Back · "Step n of 3" · primary CTA.

## Task 9 — Sign in (`/app/login`)

Split layout: form column (logo, 46px "Welcome back.", OAuth buttons, "or email" rule, email +
password fields with a cobalt focus border, Sign in, sign-up line) and a 300px `--jb-a-invert`
testimonial panel. Keeps the employer-branded variant (`?as=employer`) and the real auth flow.

## Task 10 — Employer dashboard (`/employer/dashboard`)

Same hero grammar ("Needs a decision" / 56px headline / two actions), then a horizontal funnel —
five flex-weighted bars, mono counts, conversion captions — and a two-column split of Open roles
and Today's interviews. Reconciles against `components/employer/ui/tokens.js`: that surface's
tokens are re-pointed at the shared `--jb-a-*` values rather than duplicated.

---

## Data gaps

Recorded as found, not invented. Anything the design shows that has no backing field is either
derived from existing data or rendered as an honest empty state — never faked.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Playwright smoke suite (`e2e/support/routes.ts`) still passes for every touched route.
- Screenshot each of the seven screens at 1440px and 390px against the mockup.
- Grep every touched file for literal hex — must return nothing outside `tokens.css`.
