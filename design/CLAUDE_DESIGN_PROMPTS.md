# Jobocate — Claude Design Prompt Pack

Complete, ordered set of prompts to design every remaining screen of the Jobocate two‑sided AI hiring marketplace in [claude.ai/design](https://claude.ai/design), project **"App design improvement project"** (`aba1d93a-f7cd-4364-b3ba-0aa246310b8d`).

## How to use
1. Open the project chat in Claude Design.
2. Paste the relevant **Preamble** once (Base for candidate/marketing; Employer + AI addendum before employer screens).
3. Paste each **brief** one at a time — each saves a new `.dc.html` in the project.
4. When a batch is generated, tell Claude Code and it will run the import→implement workflow (faithful port + backend wiring).

**Status legend:** ✅ already designed **and** implemented · 🆕 brief below (to generate).

---

# Part 0 — Preambles

### Base preamble (candidate + marketing) — paste once
```
You're adding screens to the existing Jobocate design system. Every new screen must match the existing .dc.html files EXACTLY.

TOKENS
- Canvas #F7F3EA, Surface #FFFEFB, Ink #1B1A16, muted #5A544A / #8A8378, hairlines #E6DECF / #E1D9C9.
- Brand green #1FA463 (primary buttons; text on green #0C2C1C), deep green #157A49 (links/labels), mint #5BD08C (positive/premium), clay #C9622E (warnings). Dark panels/sidebar #15140F / #1B1A16.
- Fonts via <helmet> Google Fonts: Instrument Serif (display + h1/h2, weight 400), Hanken Grotesk (UI/body), JetBrains Mono (labels/metrics/uppercase), Bricolage Grotesque 800 (wordmark only).
- Cards: bg #FFFEFB, 1px solid #E6DECF, radius 14–18, padding ~26. Buttons/pills radius 999. Inputs radius 12–13. Mono micro-labels 10–11px, uppercase, letter-spacing 0.08–0.14em, color #9A9286 or #1FA463.

FORMAT (copy the existing files)
- Standard dc doc: <x-dc> wrapper; <helmet> with the 4 fonts + a <style> block; a <script type="text/x-dc" data-dc-script> with `class Component extends DCLogic { state = {…}; renderVals() { return {…} } }`. Put interactive state in this.state with setState handlers, like App Apply.dc.html / App Auto-Apply.dc.html.
- Include a <template id="__bundler_thumbnail" data-bg-color="#F7F3EA"> with a simple SVG preview.
- Templating: {{ binding }}, <sc-for list="{{ items }}" as="x" hint-placeholder-count="N">, <sc-if value="{{ flag }}" hint-placeholder-val="{{ true }}">.
- APP shell (logged-in screens): flex root <div style="display:flex; min-height:100vh; background:#F7F3EA; font-family:'Hanken Grotesk',sans-serif; color:#1B1A16;"> + <dc-import name="AppSidebar" active="<KEY>" hint-size="250px,100vh" style="position:sticky; top:0; align-self:flex-start; flex-shrink:0;"></dc-import> + <main style="flex:1; min-width:0; display:flex; flex-direction:column;"> with a sticky translucent top bar (rgba(247,243,234,0.85) + backdrop-filter:blur(10px)).
- MARKETING shell: import SiteNav (sticky top) and SiteFooter; page sections between, cream background.
- Internal links use sibling filenames, e.g. href="App Matches.dc.html".

UNIVERSE: User Sarah Chen — Senior Product Designer, Premium, ex‑Plaid. Companies: Stripe (96% match, Remote US, $170–210k), Figma, Linear, Notion, Airbnb. Concierge coach Marcus Bell. Credits 38/50.
```

### Employer preamble — paste once before employer screens
```
Now designing the EMPLOYER / recruiter side — same design system, different shell + persona.
1) SHELL: import "EmployerSidebar" instead of AppSidebar (design EmployerSidebar.dc.html first).
2) ACCENT: keep green #1FA463 for positive/success; recruiter primary identity is INDIGO #4263EB (deep #364FC7, tint #EDF0FE) for active nav, primary CTAs, selected states; clay #C9622E for rejections.
UNIVERSE: Account = Stripe · People/Talent team. Recruiter = Dana Whitfield, Senior Recruiter. Open reqs: Senior Product Designer (28 applicants), Staff Frontend Engineer (61), Product Manager Growth (44). Star applicant on the Designer req = Sarah Chen (96%, ex‑Plaid). Other applicants: Jordan Lee, Priya Nair, Marcus Obi, Lena Fischer. Plan = Growth (5 job slots, 3 used; AI actions 240/500). Time‑to‑hire 24 days.
```

### AI addendum — paste once before employer AI screens
```
Employer AI features are AGENTIC — the AI DOES activity, not just analytics. Visual language: ✦ sparkle, green #1FA463 for AI. Every AI action is TRANSPARENT (shows a "why"), REVERSIBLE (undo), and GATED (review-first by default; full-auto opt-in per rule). Status states: idle / working / needs-approval.
```

---

# Part 1 — Candidate app (core) — ✅ already built
Login, Dashboard, Matches, Apply, Tracker, Auto‑Apply, Resume (editor), Interview Prep, Live Interview, Concierge, Settings, AppSidebar. *(No prompt needed.)*

---

# Part 2 — Candidate app (extras) 🆕

```
A — "App Resume Builder.dc.html" (active="resume"). Template-choice builder preceding the editor (→ App Resume.dc.html). Two columns: LEFT a 3-step configurator (App Apply stepper), RIGHT a sticky live A4 preview with Sarah Chen's data. Step 1 Choose template: 2-col grid of 6 mini résumé thumbnails (Classic, Modern two-col, Minimal, Technical, Executive, Creative) with tag chips (ATS-safe/1-page/Two-column/Photo), ATS estimate, selected ring + ✓, RECOMMENDED on the ATS-best. Step 2 Starting point: Use my profile / Upload / Start blank. Step 3 Style: accent swatches, font-pairing, density — all update the preview. Footer Back/Continue; final "Open in editor →". State: step, template, source, accent, fontPair, density.
```
```
B — "App Saved.dc.html" (active="saved"). Bookmarked roles. Collection chips (All / To review / Dream roles), sort, then saved job cards (App Matches card style) + saved date + note + Remove + "Apply →". Empty state. Data: 6 saved roles.
```
```
C — "App Offers.dc.html" (active="offers"). Compare offers. Offer cards (company, total comp big mono, base/equity/bonus, location, deadline countdown), highlight best total "BEST TOTAL"; comparison table with winning cell tinted mint; Accept/Negotiate/Decline; "Talk to Marcus" nudge. Data: 3 offers.
```
```
D — "App Messages.dc.html" (active="messages"). Two-pane inbox: conversation list (Marcus coach pinned, recruiters, unread dots) + thread (chat bubbles incoming #FFFEFB / outgoing #EAF6EE, date dividers, composer). State: selected conversation. Data: 4 threads.
```
```
E — "App Company.dc.html" (active="matches"). Company profile from a match (Stripe). "← Back to matches"; header (St tile, name, industry·size·HQ·rating, Follow); About; "Why it fits you" green callout; Open roles (match % + Apply →); culture/benefits chips; verified-careers trust note. Data: Stripe.
```
```
F — "App Mock Interview.dc.html" (active="interview"). In-session practice runner. Top bar: role + timer + End. Centered: progress "Q 3 of 8", large question card (Instrument Serif, category, difficulty), answer area (record/waveform/textarea), AI follow-up, Hint/Skip/Next. Coaching panel (Structure/Specificity/Pace meters, STAR reminder). End → scored summary. State: q index, timer, recording, ended. Data: 8-question set.
```
```
G — "App Application Detail.dc.html" (active="tracker"). One application's record. "← Back to tracker"; header (Stripe, title, stage pill); vertical status TIMELINE (Applied→In review→Interview→Offer/Closed with dates); submitted materials (links to résumé/cover letter); recruiter & next-step card ("Prep with AI →"); notes/activity. Actions Withdraw/Add note. Data: Stripe app, 5-event timeline.
```
```
H — "App Onboarding.dc.html" — STANDALONE (no sidebar). Post-signup wizard (App Apply stepper): 1 Upload résumé (drop-zone, parsed-success state, or "Skip — build one"); 2 Confirm profile (prefilled fields + skill chips); 3 What you're looking for (roles, locations/remote, salary slider, Enable Auto-Apply). Footer Back/Continue; final "Go to dashboard →". State: step, uploaded, fields.
```
```
I — "App Job.dc.html" (active="matches"). Full role page from a match (pre-apply). "← Back to matches" + Save + "Apply →". Header (company tile, title, company link → App Company, location·type·salary, big match %); "Why you're a 96% match" (matched mint chips, gap clay chips); full JD sections; comp card; sticky Apply bar. State: saved, expandable. Data: Stripe Designer role.
```
```
J — "App Cover Letter.dc.html" (active="resume"). Two-pane cover-letter manager + editor. LEFT list (per company, status chips, "✦ New from a role"); RIGHT editor (title + "✦ Regenerate with AI" + tone selector + length toggle + editable body prefilled Sarah→Stripe + AI suggestion chips). Footer Export PDF / Use in application / Saved. State: selected, tone, length. Data: 3 letters.
```
```
K — "App Notifications.dc.html" (no sidebar highlight). Full-page notifications. "Mark all read" + filter row (All/Applications/Matches/Auto-Apply/Messages); grouped Today/Earlier list (mono tag tile, message, timestamp, unread dot, contextual link). Reuse AppSidebar dropdown data, expanded. State: filter, read/unread. Data: ~8.
```
```
L — "App Upgrade.dc.html" (active="settings"). In-app plan upgrade/checkout. LEFT plan selector (Free/Pro/Premium, Pricing.dc.html tier styling, Monthly/Annual −33%, feature delta); RIGHT order summary + card form + "Confirm upgrade" + trust line. Success state ("You're on Premium" → App Concierge). State: plan, annual, success.
```

---

# Part 3 — Candidate account / support / system 🆕

```
M — "App Help Center.dc.html" (active=""). Knowledge base. Search field; 6 category tiles (Getting started, Matches & applications, Auto-Apply, Résumé & cover letters, Billing & plans, Account); Popular articles; "Contact support →". Inline article view (Instrument Serif title, prose, "Was this helpful?", related). State: category/article, query. Data: ~10 articles.
```
```
N — "App Support.dc.html" (active=""). Contact + tickets. LEFT new-request form (category, subject, message, attachment, priority → success w/ ticket #); RIGHT "My requests" list (status pills) → thread (agent/Sarah bubbles + reply). "Browse help center →". State: selected ticket, submitted. Data: 3 tickets.
```
```
O — "App Subscription.dc.html" (active="settings"). Manage plan. "← Back to settings"; current-plan hero (Premium · $39/mo annual · renews Jul 28, Active pill); usage panel (credits meter, Live Interview minutes, Concierge sessions); actions Change plan / switch cycle / Pause / Cancel (→ App Cancel); plan-includes checklist. Data: Premium.
```
```
P — "App Billing.dc.html" (active="settings"). Invoices & billing. Next-charge summary + payment method → App Payment Methods; invoices table (date, desc, amount, status, download); billing-address card + Edit. Data: ~6 invoices.
```
```
Q — "App Payment Methods.dc.html" (active="settings"). Cards on file. List (brand glyph, ••••last4, expiry, Default pill, Remove) + "Add payment method" form (number/expiry/CVC/name/country). Confirm-remove inline. State: cards, adding, default. Data: 2 cards.
```
```
R — "App Cancel.dc.html" (active="settings"). Retention + cancel flow, 3 steps: 1 Reason survey (radios + note); 2 Retention offer tailored to reason (50%/3mo or pause) Accept / Continue; 3 Confirm (what they lose in clay strike-list, access-until date, "Cancel membership" + "Keep Premium"). Success. State: step, reason, accepted.
```
```
U — "App Sign Up.dc.html" — STANDALONE. FIRST a role-select step: two cards "I'm looking for a job" (candidate) vs "I'm hiring" (employer); THEN form (name, work email, password + strength, Google/LinkedIn SSO). Candidate → App Onboarding; Employer → Employer Onboarding. Brand panel copy adapts to role. "Log in" link. State: role, fields.
```
```
V — "App Reset Password.dc.html" — STANDALONE. this.state.stage: (1) Forgot — email + "Send reset link" → sent confirmation; (2) Set new — new+confirm + strength + "Update password" → success → App Login. Reuse Login layout/brand panel.
```
```
W — "App Verify Email.dc.html" — STANDALONE. Centered card: "Verify your email", sent to sarah.chen@gmail.com, 6-digit code row, Resend (cooldown), Open email app, verified-success (✓ → App Dashboard). State: code, cooldown, verified.
```
```
X — "App Account Security.dc.html" (active="settings"). Change password; 2FA (toggle + authenticator setup); Connected accounts (Google ✓, LinkedIn connect); Active sessions/devices (sign out each / all); Data & privacy (Export my data; red Delete-account zone with type-to-confirm). State: 2FA, delete-confirm. Data: sessions, providers.
```
```
Y — "App States.dc.html" (no sidebar). Reference sheet rendering reusable states together: 404, generic error + retry, empty-list block, offline/maintenance banner, loading-skeleton — all in Jobocate style. One file to lift patterns from.
```

### Candidate app — second-tier 🆕
```
Z1 — "App Job Alerts.dc.html" (active="saved"). Saved searches & alerts. List of saved searches (query + filters summary, frequency Daily/Weekly, new-results count, toggle, edit/delete) + "Create alert" form (keywords, location, salary, frequency). Empty state. Data: 3 alerts.
```
```
Z2 — "App Schedule.dc.html" (active="tracker"). Candidate-side interview scheduling — accept a slot. Card for an upcoming interview (Stripe final round): interviewer(s), type, duration, a grid of offered time slots to pick, timezone selector, add-to-calendar, reschedule/decline. Confirmed state. Data: Stripe slots.
```
```
Z3 — "App Referrals.dc.html" (active=""). Invite & earn. Referral hero (reward copy), unique link + copy button, share buttons, a referrals table (invitee, status Joined/Pending, reward), progress to next reward. Data: 4 referrals.
```
```
Z4 — "Shared Resume.dc.html" — STANDALONE PUBLIC (no shell, minimal top bar w/ Jobocate wordmark). The view a recipient sees from a shared résumé link: clean A4 résumé render of Sarah Chen + a subtle "Built with Jobocate · Create yours" footer CTA. Read-only. Data: Sarah Chen résumé.
```

---

# Part 4 — Employer app (core) 🆕  *(Employer preamble first; design E0 first)*

```
E0 — "EmployerSidebar.dc.html". Employer shell, mirroring AppSidebar exactly (dark rail, collapse 250⇄74 persisted, mobile drawer, ⌘K palette, notifications, active indicator, profile chip) with EMPLOYER content: wordmark + mono "RECRUITER" tag; prominent indigo "＋ Post a job" button near top; groups — HIRING (Dashboard, Jobs, Candidates, Interviews, Offers), AI (Autopilot [badge 6 queued], Copilot, Sourcing Agent [dot when running]), ENGAGE (Talent Search, Messages, Analytics), COMPANY (Company Profile, Team, Settings); badges Candidates "12 new", Interviews "3 today"; footer "AI actions 240/500 this month" meter (indigo) + Upgrade; profile Dana Whitfield · Stripe · Growth. active keys: dashboard, jobs, candidates, interviews, offers, autopilot, copilot, sourcing, search, messages, analytics, company, team, settings. SVG line icons; this.state collapse/mobile/palette/notif; employer notifications.
```
```
E1 — "Employer Onboarding.dc.html" — STANDALONE. Setup wizard (App Apply stepper): 1 Company profile (name, logo, website, industry, size, HQ); 2 Your team (role + invite chips); 3 First job (title + "Post your first job →" → Employer Post Job, or Skip). Brand panel: "Hire 3× faster with AI-screened applicants." Data: Stripe.
```
```
E2 — "Employer Dashboard.dc.html" (active="dashboard"). Greeting (Dana); 4 stats (Active jobs 5, New applicants 37, Interviews this week 8, Avg time-to-hire 24d); a HIRING FUNNEL bar (Applicants→Screened→Interview→Offer→Hired); "Jobs needing attention"; "Today's interviews" agenda; an "Autopilot did overnight" activity strip + AI insight nudges; recent activity. CTA "＋ Post a job". Counts animate.
```
```
E3 — "Employer Jobs.dc.html" (active="jobs"). Manage reqs. "＋ Post a job"; tabs (Active/Draft/Paused/Closed) + search; table/cards (title, location·type, status pill, applicants w/ "12 new" indigo, views, posted, time-open; actions View pipeline/Edit/Pause/Close/Duplicate). Empty state. Data: 5 reqs.
```
```
E4 — "Employer Post Job.dc.html" (active="jobs"). Create/edit a job + live preview. Fields (schema-grounded): title, type, location+remote, salary min/max+period, description with "✦ Write with AI", responsibilities/requirements/benefits chip-lists, skills/tags, experience, education; SCREENING QUESTIONS builder; visibility (public/private link); comp-benchmark hint. Right rail: candidate-view preview. Footer Save draft / Publish. Data: Designer draft.
```
```
E5 — "Employer Job Detail.dc.html" (active="jobs"). Req overview. Header (title, status, comp, edit/pause/share); stat row (applicants, in-screening, interviewing, offers, views, apply rate); sections Description, Pipeline snapshot (mini funnel → Employer Candidates), Top applicants (AI match %, Sarah Chen 96%), Settings. Data: Designer req.
```
```
E6 — "Employer Candidates.dc.html" (active="candidates"). Applicant PIPELINE (kanban). Top: req selector + filters (match %, status, source) + Board/List toggle. Columns Applied·Screening·Interview·Offer·Hired (+ Rejected lane), counts + draggable cards (initials, name, AI match %, skills, applied date, rating, quick actions, "auto-screened" badge). Sarah Chen (96%) in Screening. Indigo active / green hired / clay rejected. State: board/list, drag. Data: ~12 applicants.
```
```
E7 — "Employer Candidate.dc.html" (active="candidates"). Applicant detail. Header (name, headline, location, AI match % big, stage pill, Advance ▾ / Schedule interview / Message / Reject). LEFT résumé preview + experience/skills + "Why 96% match" (matched/gap chips) + screening answers; RIGHT scorecard panel (interviewer ratings per competency, notes, internal comments thread, recommendation, "✦ AI draft message/offer/rejection"). Data: Sarah Chen + 2 scorecards.
```
```
E8 — "Employer Talent Search.dc.html" (active="search"). Sourcing. Search bar + filters (skills, title, location, experience, availability); result cards from the pool (AI fit %, Invite to apply / Save to shortlist); "AI-recommended for: Senior Product Designer" rail; shortlist sidebar. Data: ~8 candidates.
```
```
E9 — "Employer Interviews.dc.html" (active="interviews"). Schedule + run. Week calendar/agenda (candidate, req, interviewers, time, type); "Needs scheduling" list + scheduler panel (interviewers, slot, send invite); links to interview KIT + SCORECARD; tabs Upcoming/To schedule/Awaiting feedback/Past; "✦ AI-generated interview kit". Data: 8 interviews incl. Sarah Chen final round Mon Jun 29 2:00 PM.
```
```
E10 — "Employer Offers.dc.html" (active="offers"). Offer management. List by stage (Draft/Sent/Negotiating/Accepted/Declined) (candidate, req, comp summary, dates); composer/preview (base, equity, bonus, start, letter template, approval chain) + "✦ AI draft + accept-likelihood + comp benchmark"; tracking timeline. Data: 3 offers incl. Sarah Chen.
```
```
E11 — "Employer Messages.dc.html" (active="messages"). Recruiter↔candidate inbox (App Messages two-pane) with threads, message templates (Schedule a call / Rejection / Offer), per-thread candidate context (req, stage). Data: 4 threads incl. Sarah Chen.
```
```
E12 — "Employer Analytics.dc.html" (active="analytics"). Reports. KPI cards (time-to-hire, applicants/req, offer-accept rate, cost-per-hire); funnel conversion chart; source-effectiveness; per-req performance table; pipeline velocity; an "✦ AI insights" narrative band. Date-range selector. Charts via divs/SVG.
```
```
E13 — "Employer Company.dc.html" (active="company"). Public profile editor + live "how candidates see it" preview (logo, tagline, about, values, benefits, photos, locations, socials). Mirrors App Company. Data: Stripe.
```
```
E14 — "Employer Team.dc.html" (active="team"). Team & permissions. Members table (name, email, role, status, last active); invite-member form; role/permission matrix; pending invites; remove/role-change. Data: 5 members.
```
```
E15 — "Employer Settings.dc.html" (active="settings"). Tabs: Company account; Plan & billing (Growth: slots 3/5, seats, usage, upgrade); Integrations (quick view → Employer Integrations); Notifications; Hiring workflow defaults (pipeline stages, scorecard/email templates). Data: Stripe Growth.
```

---

# Part 5 — Employer AI (agentic) 🆕  *(AI addendum first)*

```
EA1 — "Employer Autopilot.dc.html" (active="autopilot"). The AI RECRUITER COCKPIT (mirrors App Auto-Apply). Master on/off + status hero ("Autopilot is ON — working across 5 reqs"); "What it does" rule strip w/ switches (auto-screen & rank · auto-advance ≥85% · auto-reject <50% w/ template · send outreach · auto-schedule from availability · nightly summary), each editable; REVIEW QUEUE of AI-proposed actions ("Advance Sarah Chen 96% to Interview", "Reject 8 <50%", "Send 6 outreach") with "why" + Approve/Edit/Dismiss + Approve-all; ACTIVITY LOG (overnight, itemized, undoable). State: master, rules, queue. Data: realistic actions, Sarah featured.
```
```
EA2 — "Employer Copilot.dc.html" (active="copilot"). Conversational recruiting AGENT that executes. Chat thread + suggestion chips ("Screen the PM applicants", "Find 5 designers like Sarah", "Draft rejections <60%", "Summarize today's interviews"). AI replies render ACTION CARDS (shortlist / drafted message / bulk-move preview) each Run/Edit/Undo + "why". Right rail: recent actions + "Always ask before acting" toggle. State: messages, pending action.
```
```
EA3 — "Employer Sourcing Agent.dc.html" (active="sourcing"). Autonomous sourcing + outreach. "Define ideal candidate" brief panel; live RESULTS stream of ranked pool candidates (AI fit % + rationale); per candidate an AI-DRAFTED personalized outreach (editable) Send / Save; OUTREACH QUEUE + campaign stats (sent/opened/replied/interested); Run/pause + "found 14 this week". Data: ~8 candidates w/ messages.
```
```
EA4 — "Employer Screening.dc.html" (active="candidates"). AI auto-screening for a req. Req selector + editable RUBRIC (weighted criteria from JD + screening answers) + auto-action rules; ranked applicant table (AI score, sub-scores, rationale, flags strong/review/auto-rejected) + bulk actions; "Re-run screening"; click a score to expand reasoning. Sarah Chen top. Data: 12 scored.
```
```
EA5 — "Employer AI Interview.dc.html" (active="interviews"). Tabs: (1) AI screening interview — configure async AI-conducted interview (role, question set, time limit), send link; results list (transcript + competency scores + recommendation); (2) AI scorecard — paste/import notes/transcript → AI generates structured scorecard (ratings, strengths/risks, follow-ups, hire rec) to confirm. State: tab, candidate. Data: 3 AI-screened (Sarah "Strong hire").
```

---

# Part 6 — Employer commercial / platform 🆕

```
EC1 — "Employer Plans.dc.html" (active="settings"). In-app pricing/upgrade. Tiers Starter/Growth(current)/Scale/Enterprise showing job slots, seats, AI actions, sourcing credits, integrations, SSO, support; Monthly/Annual toggle; Most-popular on Scale; Enterprise "Talk to sales"; current-plan highlight + unlock delta; CTA → Employer Checkout. Data: Stripe Growth.
```
```
EC2 — "Employer Usage.dc.html" (active="settings"). QUOTA dashboard. Meter cards w/ projected run-out: Active jobs 3/5, Seats 4/6, AI actions 240/500, Sourcing credits 60/100, Candidate exports; usage trends + Increase/Upgrade; warnings strip; per-req & per-seat breakdown table. Data: Growth usage.
```
```
EC3 — "Employer Quota Reached.dc.html" — reusable LIMIT/UPSELL state (modal-able). "You've used all 5 job slots", what's blocked, current-vs-next tier compare, "Upgrade to post more" / "Manage jobs" / "Close an old req". Encouraging tone. (Pair into Post Job / Sourcing / Autopilot at limits.)
```
```
EC4 — "Employer Billing.dc.html" (active="settings"). B2B invoices & payment. Next charge + plan summary; seats/slots line items; invoices table (download, PO/VAT); billing contact & tax details; payment methods; Manage/Cancel subscription. Data: Growth invoices.
```
```
EC5 — "Employer Integrations.dc.html" (active="settings"). INTEGRATIONS marketplace — category grid of connectable apps (logo, one-liner, Connect / Connected ✓ / Configure): ATS sync (Greenhouse, Lever, Workday, Ashby); Calendar (Google, Outlook); Email (Gmail, M365); Comms (Slack, Teams); Distribution (LinkedIn, Indeed, ZipRecruiter); Assessments (HackerRank, Codility); Background (Checkr); E-sign (DocuSign); HRIS (Rippling, BambooHR). Connected → CONFIGURE detail (auth status, sync direction, field-mapping rows, frequency, last-sync log, disconnect). Filter chips + search. Data: Greenhouse + Google Calendar + Slack connected.
```
```
EC6 — "Employer Developer.dc.html" (active="settings"). API & webhooks. API keys (create/reveal/revoke, scopes); webhook endpoints (URL, events applicant.created/stage.changed/offer.accepted, delivery log + retry); API-docs link. Data: 1 key, 2 webhooks.
```
```
EC7 — "Employer Distribution.dc.html" (active="jobs"). Multipost a req. For a selected req: toggles to careers page, LinkedIn, Indeed, ZipRecruiter, niche boards; per-board status (live/pending/expired); sponsored/spend options; performance table (views, applies, cost-per-applicant by source); Boost CTA. Data: Designer on 3 boards.
```
```
EC8 — "Employer Security.dc.html" (active="settings"). Org security & access. SSO/SAML setup (IdP metadata, Okta/Azure AD, enforce-SSO toggle); SCIM provisioning; ROLE/PERMISSION matrix (Admin/Recruiter/Hiring manager/Interviewer × capabilities); session policy; data retention. Data: SSO not enforced + matrix.
```
```
EC9 — "Employer Audit Log.dc.html" (active="settings"). Searchable audit: member, action, target, timestamp, IP — incl. Autopilot actions tagged "✦ AI". Filters (member/action/date), export CSV. Data: ~15 events (humans + AI).
```
```
EC10 — "Employer Compliance.dc.html" (active="settings"). Hiring compliance & candidate data. EEO/DEI anonymized funnel reporting; GDPR/CCPA candidate data-request queue (export/delete w/ status); consent & retention policy; audit-ready exports. Data: 2 requests + EEO snapshot.
```
```
EC11 — "Employer Talent Pool.dc.html" (active="candidates"). Candidate CRM beyond one req: saved candidates, silver-medalist pools, future-pipeline tags; searchable/segmented lists; add-to-req; "✦ re-engage for new role" suggestions. Data: ~10 pooled candidates.
```
```
EC12 — "Employer Req Approval.dc.html" (active="jobs"). Requisition approval workflow. New-req approval chain (requester→hiring manager→finance/HR) w/ status timeline, headcount/budget fields; approvals INBOX for approvers (Approve / Request changes / Reject w/ notes). Data: 2 reqs awaiting.
```
```
EC13 — "Employer Notifications.dc.html" (no sidebar highlight). Full-page employer notifications (mirror App Notifications): grouped applicant/interview/offer/Autopilot feed, filters, deep links; AI items tagged "✦". (Employer Help/Support → reuse App Help Center + App Support, re-skinned with recruiter categories.)
```

### Employer app — second-tier 🆕
```
ES1 — "Employer Career Site.dc.html" (active="company"). Hosted careers-page builder. Left controls (branding, hero copy, featured roles, sections, colors); right live preview of the public careers site / job board (lists the company's open reqs). Publish + custom-domain field. Data: Stripe careers site.
```
```
ES2 — "Employer Job Templates.dc.html" (active="jobs"). Reusable JD templates. Grid of templates (role, last used, "Use template" → Employer Post Job prefilled); create/edit template; "✦ Generate template with AI". Data: 5 templates.
```
```
ES3 — "Employer Availability.dc.html" (active="interviews"). Interviewer availability setup. Per-interviewer weekly availability grid, calendar-connect status, buffer/limits, interview types they cover; team availability heatmap used by the scheduler. Data: Dana + 3 interviewers.
```

---

# Part 7 — Marketing

### Already built ✅
Home (`/`), Pricing (`/pricing`), About (`/about`), Enterprise (`/enterprise`), feature pages `/features/{job-matching,auto-apply,cover-letters,interview-prep,resume-builder}`, SiteNav, SiteFooter. *(No prompt needed.)*

### Critical marketing 🆕
```
MK1 — "For Employers.dc.html" (route /employers). Employer marketing landing. Hero ("Hire 3× faster with an AI recruiter that does the work") + Start hiring (→ App Sign Up employer) / Book a demo; logo strip; agentic value props (Autopilot, AI sourcing, AI interviews) w/ Employer Dashboard/Autopilot mockups; ROI band (time-to-hire ↓, cost-per-hire ↓); recruiter testimonial; pricing teaser → Employer Pricing; final CTA. (Add "For employers" to SiteNav.)
```
```
MK2 — "Employer Pricing.dc.html" (route /employers/pricing). Public B2B pricing. Tiers Starter/Growth/Scale/Enterprise (job slots, seats, AI actions, sourcing, integrations, SSO, support); Monthly/Annual; Enterprise "Talk to sales"; comparison matrix; ROI-calculator teaser; FAQ. CTAs → App Sign Up (employer). Mirrors Pricing.dc.html.
```
```
MK3 — "Book Demo.dc.html" (route /demo). Demo/sales request. Left value recap + logo wall + testimonial; right form (name, work email, company, size, role, hiring volume, message) → success ("We'll reach out within 1 business day") with a "or pick a time now" slot grid.
```
```
MK4 — "Browse Jobs.dc.html" (route /jobs). PUBLIC job search (no auth). Search + filters (role, location, remote, salary, seniority); result cards (company, title, location/type/salary, "Sign in to see your match %"); pagination; each → Public Job; "Create a free account to auto-apply" banner.
```
```
MK5 — "Public Job.dc.html" (route /jobs/[id]). PUBLIC single-job SEO page. Company header; full JD (about/responsibilities/requirements/benefits); comp; location; gated "See your match & apply in 1 click" → App Sign Up (candidate); similar roles; company snippet. SEO-friendly.
```
```
MK6 — "Blog.dc.html" (route /blog) + "Blog Post.dc.html". Hub: featured post, category chips, post grid (image, title, excerpt, author, read-time). Post: Instrument Serif title, hero, prose, author bio, related, newsletter CTA.
```
```
MK7 — "Customer Stories.dc.html" (route /customers) + a story detail. Hub: outcome cards (logo, headline metric, quote) filterable candidate/employer; detail: challenge→solution→results w/ pull-quotes + metrics.
```
```
MK8 — "Security.dc.html" (route /security). Trust page: SOC 2 / GDPR / encryption badges; data handling & privacy; sub-processors; SSO/SAML; responsible-AI statement; "Request security docs" → Book Demo. Reuse Enterprise dark security band.
```
```
MK9 — "Legal.dc.html" (route /legal/[doc]). Reusable legal DOCUMENT template for Terms / Privacy / Cookies / DPA: sticky section-nav sidebar + long-form prose, last-updated date, jump links. Content swapped per doc.
```

### Marketing — second-tier 🆕
```
MS1 — "Careers.dc.html" (/careers). Jobocate's OWN careers page: mission, values, perks, open roles list, life-at-Jobocate photos, "View open roles" CTA. (Targets the About page's careers link.)
```
```
MS2 — "Integrations.dc.html" (/integrations). PUBLIC integrations directory: category grid of supported apps (ATS, calendar, comms, distribution, assessments, HRIS) each w/ logo + blurb + "Learn more"; "Build with our API" → Developer docs. Marketing-styled.
```
```
MS3 — "Help.dc.html" (/help). PUBLIC help/FAQ hub: search + category tiles + popular questions accordion + "Contact support" / "Status". (Public mirror of App Help Center.)
```
```
MS4 — "Changelog.dc.html" (/changelog). Product "What's new": reverse-chron entries (date, version tag, title, summary, NEW/IMPROVED/FIXED chips, optional image). Subscribe CTA.
```
```
MS5 — "Press.dc.html" (/press). Media kit: brand assets/logos download, boilerplate, press contact, recent coverage links, milestones.
```
```
MS6 — "Partners.dc.html" (/partners). Partner & affiliate program: benefits, tiers, how-it-works steps, apply form/CTA, partner logos.
```
```
MS7 — "Compare.dc.html" (/compare). Alternatives/comparison: Jobocate vs traditional job boards / generic ATS — a feature comparison matrix, "why Jobocate" highlights, CTA. (SEO.)
```
```
MS8 — "Status.dc.html" (/status). System status: overall banner (All systems operational), per-service status rows (App, API, Matching, AI, Auth) w/ uptime, incident history list. Light, minimal.
```
```
MS9 — "NotFound.dc.html" (marketing 404). Friendly 404 w/ Jobocate wordmark, "This page wandered off", search + popular links + "Back home". SiteNav/SiteFooter.
```

---

# Part 8 — Generation order (recommended)

1. **Candidate extras** (Base preamble): A → L
2. **Candidate account/support/system**: M → Y, then Z1–Z4
3. **Employer** (Employer preamble): **E0 first**, then E1 → E15
4. **Employer AI** (AI addendum): EA1 → EA5
5. **Employer commercial/platform**: EC1 → EC13, then ES1–ES3
6. **Marketing** (Base preamble): MK1 → MK9, then MS1 → MS9

After each group is generated in the project, hand back to Claude Code to import + implement + backend-wire.

## Backend modules still to build (employer/commercial)
job-postings (employer-owned), applicants/pipeline (per-job stages), interviews/scorecards, offers, org/teams + roles, billing/quota/entitlement, integrations (ATS/calendar/distribution), AI recruiter service (screening/ranking, outreach drafting, async AI interview, scorecard generation), reporting/analytics. Candidate-side resume-builder, cover-letters, interview-buddy, matching, applications already exist.
