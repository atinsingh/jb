# Competitive parity gaps — product spec

_Context: to place Jobocate above AIApply and Jobright, the homepage/positioning work (control · eligibility-aware · transparent · two-sided · honest pricing) is done. This spec covers the **two genuine product gaps** where competitors currently beat us, plus the proof-and-trust gap. Everything here must be built the Jobocate way: **candidate-in-control, transparent, no fabrication.**_

Competitor snapshot (July 2026):
- **AIApply** — volume/speed auto-apply; documented failures: applies to wrong country/language, à-la-carte auto-apply credits, 1-star reviews.
- **Jobright** — matching + **Chrome-extension autofill** + **insider referrals** + "Orion" copilot; documented failures: billing dark patterns, generic AI output.

---

## Gap 1 — Chrome-extension 1-click autofill

**Why:** Jobright's hook is a browser extension that autofills application forms on any ATS (Greenhouse, Lever, Workday, etc.). We can already tailor + submit through our own pipeline, but candidates still hit external ATS forms manually. This is table-stakes for the category.

**Goal:** Let a signed-in candidate autofill (and optionally auto-tailor) any external job application from their Jobocate profile, in one click, **with a review step before anything submits.**

**MVP scope**
1. **Manifest V3 Chrome extension** (Edge/Brave share the engine; Firefox later).
2. Auth: OAuth/device-code handshake to the existing backend; store a short-lived token, never the password.
3. **Field mapping**: detect the ATS on the active tab (start with Greenhouse + Lever + Workday — the boards our monitors already ingest), map known fields (name, email, phone, work auth, links, résumé upload) from the candidate profile via a `GET /api/profile/autofill-payload`.
4. **Fill, don't submit**: populate fields and stop. The candidate reviews and clicks the site's own submit. (This is the control differentiator — the extension never silently submits.)
5. **Résumé attach**: offer the role-tailored résumé (reuse resume-builder) as the upload.
6. **Log**: record the assisted application back to the tracker (`POST /api/applications` with `source: 'extension'`) so the departures board stays accurate.

**Explicitly out of scope for MVP:** silent auto-submit, CAPTCHA solving, scraping behind logins.

**Key decisions / risks**
- ATS DOM changes break selectors → keep a versioned selector map served from the backend (`GET /api/extension/selectors`) so we patch without shipping a new extension build.
- Privacy: the extension reads form fields on job sites only (host permissions scoped to known ATS domains, not `<all_urls>`) — state this plainly in the store listing; it reinforces the trust position.
- Store review latency (Chrome Web Store) — budget 1–2 weeks.

**On-brand guardrail:** the extension **fills and pauses for approval**; it is the anti-AIApply (which submits to the wrong jobs). Market it as "autofill you still control."

---

## Gap 2 — Insider referrals / warm intros

**Why:** Jobright surfaces "insider connections" at target companies — a real differentiator and a genuine conversion lever (referred candidates interview far more often). We have none.

**Goal:** For a matched role, show the candidate a credible, privacy-respecting path to a warm intro — without fabricating relationships.

**MVP scope (build trust-first, smallest honest version)**
1. **Verified-employer intros (leverage our two-sided moat):** because Jobocate has real employers on the platform, a candidate's strong-fit application to a verified employer can be routed to a real person there (the employer's recruiter/hiring manager already in `employer-org`). This is a *real* warm path competitors can't replicate — surface it as "A recruiter at {company} is on Jobocate → request an intro."
2. **Opt-in candidate alumni graph:** let candidates optionally share company/school history; match a job's company against other consenting Jobocate users who worked there → "2 people who worked at {company} are open to a quick chat." Double opt-in; no contact details exposed until both accept.
3. **No fabrication:** never invent a connection or scrape LinkedIn. If there's no real path, show the honest fallback: a tailored outreach message the candidate can send themselves.

**Explicitly out of scope for MVP:** buying third-party contact data, cold-email automation, scraping.

**Data / API sketch**
- `GET /api/roles/:id/intro-paths` → `{ verifiedEmployerContact?: {...}, alumni: [{alias, tenure, willingness}], outreachTemplate }`.
- Consent model on `user-preferences` (`shareAlumniGraph: boolean`, default **false**).

**Key risk:** thin at cold start (few consenting users). Mitigation: lead with path #1 (verified employers) which works from day one because employers are already on-platform; grow #2 as the base grows.

---

## Gap 3 — Proof & trust (marketing, not code)

We have **no social proof** vs their "2M+ users." Do **not** fabricate it (that would destroy our core differentiator).
- Show only true, specific numbers as they become real (roles ingested this week, matches surfaced, avg factors shown per match).
- Replace generic "trusted by" logos with **capability proof** (done on the homepage: eligibility-checked · you approve · free/cancel).
- Pursue real third-party reviews (G2/Trustpilot) deliberately once retention is healthy.

---

## Suggested sequence
1. **Extension MVP** (Greenhouse + Lever first — same boards our monitors already handle). Highest competitive parity impact.
2. **Verified-employer intros** (path #1) — small, leans on the moat we already have.
3. **Alumni graph** (path #2) — after user base grows.
4. **Real proof** accrues in parallel; never faked.
