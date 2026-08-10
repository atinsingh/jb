# Résumé generator — implement the missing endpoints

**Date:** 2026-08-09 · **Status:** approved design, not yet built
**Related:** [ATS compatibility checker](2026-08-09-ats-compatibility-checker-spec.md)

---

## Title

Make the résumé generator work: implement the two endpoints the frontend already calls, with grounding rules that stop tailoring becoming embellishment.

## User Story

As a **candidate**,
I want to **generate a résumé tailored to a specific role from the experience I already have on file**,
so that **each application leads with the parts of my history that matter for that job, without me rewriting it by hand every time.**

## Business Context

`/app/resume-generate` is a complete, wired 481-line page. It calls three endpoints:

| Called by the frontend | Exists on the backend |
|---|---|
| `POST /api/resume-builder/generate` | **No** |
| `POST /api/resume-builder/generate/section` | **No** |
| `POST /api/resume-builder` | Yes |

`resume-builder.controller.ts` exposes 17 routes. Neither `generate` nor `generate/section` is among them — the nearest is `POST /:id/regenerate-section`, which has a different path, a different shape, and requires an existing résumé id. So **every generate attempt on that page throws**, and it has presumably been doing so since the page shipped.

This is the cheapest gap of the three: a page, a service layer, prompt machinery and a DTO with `jobDescription` on it all already exist. What is missing is the two routes joining them up.

The design question is not the plumbing. It is what the generator is permitted to write. A résumé generator that invents a plausible employer or inflates a metric produces a document the candidate will be interviewed against — and cannot defend. The same rule the answer engine applies to attestations applies here.

## Acceptance Criteria

1. **Given** a candidate with a saved résumé containing three roles,
   **When** they `POST /api/resume-builder/generate` with a target role and job description,
   **Then** they receive `{ summary, experience[], skills[], keywords[], coverage }` and the response is 200, not 404.

2. **Given** the generated result,
   **When** every company name, job title and employment date in `experience[]` is compared against the source,
   **Then** each one appears in the source material — no employer, title or date is present that was not already there.

3. **Given** a source résumé containing no quantified metrics,
   **When** a résumé is generated,
   **Then** the output contains no invented figures (no "increased X by 40%" that has no origin).

4. **Given** a job description naming five requirements,
   **When** generation completes,
   **Then** `coverage` reports which of those five the generated résumé evidences and which it does not.

5. **Given** a candidate wants only the summary rewritten,
   **When** they `POST /api/resume-builder/generate/section` with `section: "summary"`,
   **Then** they receive `{ content }` for that section alone and no other section is altered.

6. **Given** the LLM provider is unavailable,
   **When** generation is attempted,
   **Then** the endpoint returns a clear error and the candidate's existing résumé is untouched — no partial write.

7. **Given** a generated résumé the candidate accepts,
   **When** they save it to their library,
   **Then** it is stored as a new résumé with `source` recording that it was generated and against which job.

8. **Given** a candidate with no source résumé and an empty profile,
   **When** they attempt generation,
   **Then** they receive a clear message telling them to add their experience first, rather than a fabricated résumé.

## Business Rules

- **The generator may reorganise, rephrase, re-order and re-emphasise facts that exist in the source. It may never introduce an employer, a job title, an employment date, a qualification, or a metric that is not already there.** This is the same line the answer engine draws around attestations, for the same reason: the candidate has to stand behind the document.
- Generation **never overwrites** an existing résumé. It returns a candidate result; saving is a separate, explicit act.
- `coverage` must report gaps honestly. A requirement the candidate genuinely does not meet is reported as uncovered, not papered over with adjacent-sounding language.
- Tone and seniority adjust **register**, never claims. "Senior" phrasing on a junior history is embellishment.
- Section regeneration touches exactly one section.
- The generated document records its provenance (`source`, target job) so it is auditable later.

## Technical Notes

**API / service impacted**
- `resume-builder.controller.ts` — add `POST generate` and `POST generate/section`. Note both are **collection-level** routes and must be declared before any `:id` route to avoid being swallowed by parameterised matching.
- `resume-builder.service.ts` — add `generate()` and `generateSection()`, reusing the prompt construction already used by `regenerateSection` (which already interpolates `jobDescription`).
- New DTOs `GenerateResumeDto` `{ role, jobDescription?, source?, tone?, seniority? }` and `GenerateSectionDto` `{ section, role?, jobDescription?, tone?, seniority? }`, validated the same way the existing résumé DTOs are.
- Routes through `LLMRoutingService` / `LLMQuotaService` exactly as the existing generation paths do.

**Database changes**
- None required for generation itself.
- On save, populate the existing `Resume.source` and `sourceResumeId` fields, which already exist and are already returned by the controller.

**External systems**
- LLM provider via the existing `llm/` stack. No new vendor.

**Security considerations**
- Ownership-scoped: generation reads only the requesting candidate's résumés and profile.
- `jobDescription` is untrusted free text going into a prompt. Bound its length and treat it as data — a JD instructing the model to ignore prior instructions must not be able to lift the grounding rule.
- Generated content inherits the existing résumé sanitisation on render; do not introduce a second, laxer path.

**Performance considerations**
- Generation is user-initiated and expected to take seconds; stream or show progress rather than blocking silently.
- Enforce LLM quota before the call, consistent with the other generation features.
- Section regeneration is materially cheaper than full generation — do not implement it as a full generate with the other sections discarded.

## Dependencies

- `llm/` routing and quota services.
- Existing `resume-builder.service.ts` prompt machinery.
- The candidate having source material (a résumé or a populated profile).

## Out of Scope

- Rewriting the `/app/resume-generate` page — it already works and expects this contract.
- PDF rendering of generated résumés (`:id/generate-pdf` already exists).
- Cover-letter generation (`cover-letters` already works and is genuinely LLM-backed).
- Automatically raising the ATS score — the checker reports, the generator writes; keeping them separate keeps both honest.

## Definition of Done

- Code completed and reviewed
- Unit/integration tests completed
- Acceptance criteria validated
- Security checks completed
- Documentation updated
- Deployed to required environment
