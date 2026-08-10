# Flight Plan — dark marketing surface

Design spec for converting the whole public marketing surface from the cream/emerald
"Boarding Pass" treatment to the dark forest-green "Flight Plan" direction.

Source of truth: the `.dc.html` mocks supplied 2026-07-31 — `Jobocate Landing`,
`Jobocate Landing Mobile`, `Find Jobs`, `For Employers`, `Pricing`, `Get Started`,
plus the `Jobocate Redesign` exploration doc (direction `1c` → built out as `2a`
desktop / `3a` mobile).

## Decisions taken

| Question | Decision |
|---|---|
| How far does dark reach? | **All ~25 public marketing pages, one pass.** 5 have mocks; the rest extrapolate the same system. |
| Pricing tiers | **Keep live pricing.** Restyle only — $0 / $29 Pro / $59 Premium + enterprise band. The mock's $0/$15 two-tier structure is NOT adopted; backend plan entitlements stay untouched. |
| Real company names in mocks | **Not adopted.** See "Constraints carried forward". |
| Auth screens | Restyle existing `/app/login` + `/app/signup`. Do not rebuild auth from the `Get Started` mock. |

## Design tokens

Extracted verbatim from the mocks. These become the dark layer in `tokens.css`.

### Surfaces
| Token | Value | Use |
|---|---|---|
| page gradient | `linear-gradient(178deg,#0d2418 0%,#123424 40%,#17452e 100%)` | body / page wrapper, `min-height:100vh` |
| `--jb-d-bg` | `#0d2418` | flat fallback, `<body>` |
| `--jb-d-footer` | `#091a11` | footer only |
| `--jb-d-panel` | `rgba(9,26,17,.55)` | manifest, job cards, plan cards |
| `--jb-d-panel-solid` | `rgba(9,26,17,.6)` | arrivals panel, form card |
| `--jb-d-glass` | `rgba(242,236,219,.07)` | waypoint / feature cards |
| `--jb-d-glass-hi` | `rgba(242,236,219,.06)` | FAQ rows, employer band |

### Ink
| Token | Value | Notes |
|---|---|---|
| `--jb-d-ink` | `#f2ecdb` | primary; 13.6:1 on `#0d2418` |
| `--jb-d-ink-80` | `rgba(242,236,219,.85)` | pro-list body |
| `--jb-d-ink-70` | `rgba(242,236,219,.7)` | nav links, hero sub |
| `--jb-d-ink-65` | `rgba(242,236,219,.65)` | card body |
| `--jb-d-ink-55` | `rgba(242,236,219,.55)` | meta, timestamps |
| `--jb-d-ink-45` | `rgba(242,236,219,.45)` | microcopy under CTAs |

`.4` and below appear in the mocks for the footer legal line. That lands near
4.5:1 and is used only for non-essential text; anything a user must read stays
at `.55` or above.

### Accent
| Token | Value | Use |
|---|---|---|
| `--jb-d-accent` | `#8fd6a3` | primary green: CTA fill, italic display spans, eyebrows, active nav |
| `--jb-d-accent-hi` | `#a9e4b8` | hover |
| `--jb-d-amber` | `#ffb52e` | reserved: the OFFER waypoint + final-call CTA only |
| `--jb-d-amber-hi` | `#ffc75c` | hover |
| `--jb-d-danger` | `#e07856` | the ✕ marks in the comparison block |

Green fills always carry `#0d2418` text, never white — contrast on `#8fd6a3`
is 1.9:1 against white and 10.4:1 against the dark ink.

### Borders
`rgba(242,236,219,.12)` hairline · `.15` card · `.18` glass card · `.2` emphasis ·
`.25` input · `.3` dashed compare · `.35`/`.4` outline button.

### Radius
`999px` pills · `16px` CTA panel · `14px` manifest · `12px` cards · `10px` FAQ ·
`8px` inputs · `5px`/`4px`/`3px` badges.

### Layout
Max width `1280px`, page padding `48px` desktop / `20px` mobile. Mobile mock is
authored at 390px.

## Typography change

| Role | Now | Becomes |
|---|---|---|
| Display | Instrument Serif | **Instrument Serif** (unchanged) |
| Body / UI | Hanken Grotesk | **Public Sans** 400/500/600/700 |
| Mono | JetBrains Mono | **IBM Plex Mono** 400/500/600 |

All three load via `next/font/google` in `_app.js` and are exposed as
`--jb-face-*`. Because the faces are named in exactly one place, this is a
three-line change; no page-level edits are required for the swap itself.

Display type stays at weight 400 — Instrument Serif ships 400 only, and heavier
values render as synthetic bold.

## Constraints carried forward

These are non-negotiable and override the mocks where they conflict.

1. **No real company names as customers, employers or job data.** The mocks
   reintroduce Netflix / Airbnb / Stripe / Spotify in the flight manifest (in
   their real brand colours) and Stripe / Figma / Linear / Notion / Airbnb in
   Find Jobs. These were removed on 2026-07-31 as a trademark and
   false-advertising exposure. Illustrative data uses the fictional set:
   **Meridian, Cobalt Labs, Juniper, Aster Health, Vantage**. Layout is
   unaffected. The one legitimate exception already in the codebase is Stripe
   named as a payment sub-processor on `/security`.

2. **No fabricated counts or outcome metrics.** The Find Jobs mock hardcodes
   "1,284 open roles"; the real figure is live in Mongo (~1,693) and must be
   read from the API. No "trusted by N" claims return.

3. **Forms must reach the server.** `/demo` and `/contact` POST to
   `/api/leads/*`. Restyling must not regress them to local state.

4. **SSR must keep working.** `AuthProvider` gates only protected routes; public
   pages render server-side with their `<Head>` intact. Do not reintroduce a
   global loading gate.

5. **Accessibility floor.** Body text ≥13px, mono labels ≥11px, touch targets
   ≥44px, `<main id="main">` present via `PublicLayout`, `aria-current` on the
   active nav item, focus rings visible on dark surfaces.

## Architecture

Three layers, built in order.

### 1. Dark theme layer
`tokens.css` gains the `--jb-d-*` set above. `PublicLayout` applies the page
gradient and dark ink, so every consumer inherits the surface without per-page
background declarations.

### 2. Shared chrome
- `SiteNav` — dark treatment, cream `Get started` pill, outlined `Post a job`,
  green underline on the active item. Keeps the existing flyouts, auth-aware CTA,
  Escape handling, focus restore and mobile drawer. The mocks show flat links;
  our dropdowns are a superset and stay.
- `SiteFooter` — `#091a11`, four link columns, green mono column heads.

### 3. Pages
- **`/` landing** — rebuilt from the mock: hero → SVG route arc → trust strip →
  three waypoints → flight manifest → comparison → employer band → FAQ → final
  call. Mobile (≤430px) swaps the SVG arc for the vertical timeline from the
  mobile mock.
- **`/jobs`** — dark, wired to the real job pool and real count.
- **`/employers`**, **`/pricing`** — dark, per mock; pricing keeps live tiers.
- **Remaining ~20 pages** — converted by mapping the cream palette onto the dark
  one, then reviewed page by page at 1440px and 390px.

## Verification

- `next build` clean; SSR still emits `<h1>`, `<title>` and OG tags on every page.
- Screenshot every marketing route at 1440px and 390px; diff against the mocks.
- Horizontal overflow at 390px must be zero — the existing dark mocks are
  single-column and must not reintroduce the 14 overflowing pages found in the
  brand audit.
- Contrast spot-check: ink on gradient at both gradient endpoints (`#0d2418`
  and `#17452e`), accent-on-dark, and dark-on-accent for filled buttons.
- Confirm no real company names, fabricated counts, or dead forms survive.
