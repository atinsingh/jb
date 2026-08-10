# ATS compatibility checker

**Date:** 2026-08-09 · **Status:** approved design, not yet built
**Related:** [auto-apply design](2026-08-09-auto-apply-real-submission-design.md)

---

## Title

Give candidates a real, actionable ATS compatibility score for their résumé — generic on the résumé itself, and relative to a specific job.

## User Story

As a **candidate**,
I want to **know whether my résumé will survive an applicant-tracking system, and how well it matches a specific job**,
so that **I stop being filtered out before a human ever reads it, and I know exactly what to change.**

## Business Context

Jobocate already advertises this capability and already renders it. `atsScore` exists on `Resume`, is returned by `resume-builder.controller.ts:77`, is drawn as a score ring on `frontend/src/pages/app/resume.jsx:579`, shown as an "ATS %" badge on `resume-library.jsx:585`, and the library offers sort-by-ATS.

**Nothing computes it.** A repository-wide search finds `atsScore` in six files; every one reads it. There is no producer. The ring is permanently empty, and sort-by-ATS is a no-op.

So this is not a new feature so much as a promise the product is already making and does not keep. It is also the cheapest of the three outstanding gaps to close honestly, because the majority of it needs no model at all.

Two distinct questions are being conflated by the single stored score, and the design separates them:

- **"Will a parser read my résumé at all?"** — a property of the document. Deterministic, always answerable, no job required.
- **"Does this résumé match this job?"** — a property of a pairing. Needs a JD, and the answer changes per application.

## Acceptance Criteria

1. **Given** a résumé with a clean single-column layout, a contact block, recognised section headings and consistent dates,
   **When** the candidate opens `/app/resume`,
   **Then** the score ring shows a number between 0 and 100 and the report lists zero critical findings.

2. **Given** a résumé laid out in two columns with its contact details inside a text box,
   **When** the ATS check runs,
   **Then** the score is reduced, and the report contains a `critical` finding naming multi-column layout with a concrete fix.

3. **Given** the same résumé content checked twice with no edits in between,
   **When** the ATS check runs both times,
   **Then** the two scores are identical — the generic check is deterministic and never invokes a model.

4. **Given** a candidate viewing a specific job,
   **When** they run the JD-relative check,
   **Then** they receive a coverage percentage plus the lists of matched and missing keywords, and the stored `atsScore` is unchanged.

5. **Given** a résumé that is a scanned image with no extractable text,
   **When** the ATS check runs,
   **Then** the score is 0 and the report's first finding states that no text could be extracted.

6. **Given** a candidate edits and saves their résumé,
   **When** the save completes,
   **Then** the score recomputes within 2 seconds without an explicit user action.

7. **Given** two résumés with scores of 82 and 47,
   **When** the candidate sorts the library by ATS,
   **Then** they are ordered 82 before 47.

8. **Given** a JD naming "TypeScript" and a résumé saying "TS",
   **When** the JD-relative check runs,
   **Then** the term counts as matched, via the existing skill taxonomy rather than literal string equality.

## Business Rules

- The generic score is **deterministic**. No LLM participates in producing it. A score that moves on an unchanged document destroys the candidate's ability to tell whether their edit helped.
- The generic score is **stored**; the JD-relative result is **ephemeral** and never overwrites it.
- Every finding must carry a **fix the candidate can act on**. "Poor formatting" is not a finding; "your dates mix `Jan 2020` and `01/2020` — pick one" is.
- Findings are severity-ranked (`critical` / `warning` / `info`) and the score weighting follows that ranking.
- The checker reports what parsers do; it **never edits the résumé automatically**. Suggested rewrites are opt-in and clearly attributed.
- Keyword matching uses the existing skill taxonomy so "TS" and "TypeScript" are one concept, consistent with how matching already scores jobs.
- A résumé with no extractable text scores 0, not "unknown". That is the single most important thing to tell a candidate.

## Technical Notes

**API / service impacted**
- New `AtsParseabilityService` — deterministic document analysis.
- New `AtsMatchService` — JD-relative coverage.
- `resume-builder.controller.ts` — add `POST /api/resume-builder/:id/ats-check` (persists) and `POST /api/resume-builder/:id/ats-match` (ephemeral, takes `{ jobId }` or `{ jobDescription }`).
- `resume-builder.service.ts` — recompute on `update` and `autosave`, debounced.
- Reuses `matching/skill-taxonomy.ts` (`normalizeSkills`) for keyword equivalence, and the normalisation approach in `answers/question-normalizer.ts`.

**Database changes**
- `Resume.atsScore` already exists (`schemas/resume.schema.ts:203`) — no migration needed.
- Add `Resume.atsReport`: `{ score, checkedAt, findings: [{ code, severity, message, fix }], extractedTextLength }`.
- No new collection. JD-relative results are computed per request and returned, not stored.

**External systems**
- Text extraction from PDF/DOCX. `resume-parser.service.ts` already exists — extend rather than introduce a second extraction path.
- No third-party ATS integration. The checks model documented ATS parser behaviour; they do not call any vendor.

**Security considerations**
- Résumé content is personal data. The report stores findings and a text **length**, never extracted text.
- Both endpoints are ownership-scoped — a candidate can only check their own résumés, enforced the same way the existing `resume-builder` routes do.
- The JD-relative endpoint accepts free-text `jobDescription`; bound its length to avoid a memory-exhaustion path.

**Performance considerations**
- Generic check target: **< 500ms** for a 2-page résumé, since it runs on every save.
- Debounce recomputation on autosave to at most once per 2 seconds per résumé.
- Text extraction dominates the cost; cache the extracted text against the résumé version so consecutive checks skip re-parsing.
- The JD-relative check is O(keywords × résumé terms) with normalised sets — fast enough to run inline on request.

## Dependencies

- `resume-parser.service.ts` for text extraction.
- `matching/skill-taxonomy.ts` for keyword equivalence.
- Existing résumé ownership guards in `resume-builder.controller.ts`.
- None on the auto-apply work; this ships independently.

## Out of Scope

- Automatically rewriting a résumé to raise its score.
- Vendor-specific emulation ("this is your Workday score") — the checks model general parser behaviour, and claiming per-vendor fidelity would be unfounded.
- Scoring résumés the candidate does not own (e.g. an employer-side screening score).
- Cover-letter analysis.
- Any LLM involvement in the generic score.

## Definition of Done

- Code completed and reviewed
- Unit/integration tests completed
- Acceptance criteria validated
- Security checks completed
- Documentation updated
- Deployed to required environment
