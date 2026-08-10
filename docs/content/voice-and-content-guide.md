# Jobocate — Voice & Content Guide

The single source of truth for marketing/product copy. If a page reads like a
different writer wrote it, or like generic AI filler, it's wrong. Consistency +
specificity are what make this read as a real product instead of a vibe-coded one.

Canonical voice reference: the homepage (`src/components/home/HomeBoardingPass.jsx`).
Match its register everywhere.

---

## 1. Positioning

**One-liner:** Jobocate is the AI job-search platform where you stay in control —
matched to roles you're actually eligible for, applications tailored from your real
experience, and nothing sent without your say-so.

**The wedge:** competitors (AIApply, Jobright) optimize for *volume* — blast
applications everywhere. Jobocate optimizes for *landing* — the right roles, on your
terms, with the reasoning shown. Two-sided: verified employers meet candidates directly.

**Audiences:** candidates (primary) and employers. Never blur which one a page speaks to.

## 2. Voice principles

1. **Calm and precise.** Short, declarative sentences. State the benefit, then stop.
2. **Candidate-in-control.** Agency language: *you approve, you set the limits, you decide.*
3. **Show the reasoning.** We explain *why* a match fits; never a black box. Copy mirrors that.
4. **Honest over hype.** No superlatives we can't back. No fabricated numbers.
5. **Concrete over abstract.** "Apply to 5 roles that fit, not 50 that don't" beats "supercharge your search."
6. **Quietly confident.** Signature moments (hero, boarding-pass metaphor) can be expressive; everything else stays understated.

## 3. The "not vibe-coded" rules

**DO**
- Lead every section with a specific, testable claim.
- Use real, recognizable examples where illustrative (Netflix, Stripe, Airbnb, Spotify as sample destinations).
- Write real microcopy: purposeful button labels, honest empty states, helpful errors.
- Keep one voice across all pages — same rhythm, same vocabulary.
- Use the travel/boarding-pass metaphor *sparingly and only where it clarifies* (journey, route, board, gate). Don't force it on every page.

**DON'T**
- No fabricated stats, ratings, testimonials, or "trusted by 10,000 users." If we don't have the number, don't state it.
- No fake customer logos implying endorsement. Illustrative ≠ "our customers."
- No hype words (see banned list). No exclamation-mark energy. No emoji in body copy.
- No lorem/placeholder, no "Lorem ipsum," no "Feature 1 / Feature 2."
- No vague benefits ("powerful, seamless, cutting-edge, revolutionary").
- Don't invent legal terms — leave legal/policy pages (privacy, terms, cookies, gdpr) factual and untouched by creative rewrites.

## 4. Vocabulary

**Preferred:** roles / applications / matches / eligibility / tailored / approve / on your terms / verified employers / auto-apply (within your limits) / the reasoning shown.

**Banned (replace):** supercharge, revolutionize, unleash, seamless, cutting-edge,
game-changer, effortless(ly), 10x, next-gen, world-class, powerful (alone), leverage
(as verb), robust, synergy, "AI-powered" as a crutch, "in today's fast-paced world",
"whether you're X or Y", rhetorical-question openers ("Tired of…?").

## 5. Page-type structure

**Feature page** (`/features/*`): H1 = benefit + keyword. Sub = one-sentence promise.
Then: how it works (3 steps), what makes it different (2–4 points), an honest
comparison or example, a specific CTA. Never repeat the homepage verbatim.

**Pricing** (`/pricing`, `/employers/pricing`): plan names + who each is for, real
feature deltas, honest limits (Free forever tier, Pro $15, cancel anytime). No dark-pattern
urgency. State what's *not* included plainly.

**About** (`/about`): why the product exists (the control/trust thesis), what we
believe, what we don't do. No fabricated founder story or headcount.

**Employer marketing** (`/employers*`, `/enterprise`): speak to hiring outcomes —
ranked candidates on job-related criteria, reasoning shown, less sorting. Blue accent
(`#3E5A6B`) is the employer color; green is candidate.

**Job board** (`/jobs`): utilitarian, scannable. Real filters, clear result microcopy.

## 6. Microcopy

- **Buttons:** verb-led, specific. "Plan my route", "Post a job", "See how it works" — not "Learn more", "Click here", "Submit".
- **Empty states:** say what's here, why it's empty, and the one next action. Never blame the user.
- **Errors:** what happened + how to fix, in plain words.

## 7. SEO rules

- Exactly one `<H1>` per page, containing the primary keyword naturally.
- Logical `<H2>`/`<H3>` hierarchy — no skipped levels, no headings used for styling only.
- `<title>` ≤ ~60 chars, keyword-first-ish, brand included. `meta description` ~150–160 chars, benefit + keyword + soft CTA.
- Descriptive link text (not "here"). Alt/aria on meaningful visuals.
- Keyword targets: *AI job search, job matching, auto-apply, tailored applications,
  AI cover letter, interview prep, resume builder, hiring platform* — used naturally, never stuffed.

## 8. Type system (do not change fonts)

Headings = **Fraunces** (serif). Body/UI/buttons = **Hanken Grotesk**. Labels/eyebrows/data
= **JetBrains Mono**. Accent word = **Instrument Serif** italic. Rewrites change *words*, not fonts/layout/logic.

## 9. Rewrite constraints (for agents)

- Edit visible copy only (JSX text, aria-labels, `<title>`/meta). Do **not** change
  component structure, props, imports, styling, routes, or logic.
- Preserve all links/hrefs and dynamic expressions (`{var}`) exactly.
- Keep each page's length/rhythm similar; don't add sections or remove functionality.
- After editing, the page must still build (`next build`) and render.
