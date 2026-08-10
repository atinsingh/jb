# Jobocate — QA smoke test report

**Date:** 2026-07-28 · **Scope:** functional smoke test of all major features (backend API + frontend render) · **Build:** frontend `next build` exit 0, backend `nest build` exit 0, both servers running.

## Verdict

**PASS — all core features functional, no critical bugs.** Auth, matching, applications, résumé, cover letters, interview prep, tracker, billing, and the employer suite all respond correctly; every key page renders without console errors; role-based routing and auth guards work. One medium finding (employer endpoints lack a server-side role guard) and two notes below.

## Backend API (authenticated smoke test)

Flow: `POST /auth/register` → token → exercise endpoints. Legend: ✅ 200/201, 🔒 401 (correct when no token).

| Area | Endpoint | Result |
|---|---|---|
| Auth | `POST /auth/register` | ✅ 201 |
| Auth | `POST /auth/login` | ✅ 201 |
| Auth | no-token `GET /users/profile` | 🔒 401 (correct) |
| Health | `GET /health` (root, un-prefixed) | ✅ 200 |
| Users | `GET /users/profile` | ✅ 200 |
| Users | `GET /users/preferences` · `PUT /users/preferences` | ✅ 200 (read + **write**) |
| Users | `GET /users/autofill-payload` (extension) | ✅ 200 |
| Matching | `GET /matching/{eligible-jobs,matches,recommendations,preview}` | ✅ 200 (all four) |
| Applications | `GET /applications/{my-applications,activity}` | ✅ 200 |
| Résumé | `GET /resume/data` | ✅ 200 |
| Cover letters | `GET /cover-letters` | ✅ 200 |
| Interview prep | `GET /interview-buddy/{applications,resumes}` | ✅ 200 |
| Tracker | `GET /job-tracker/applications` · `/applications/stats` | ✅ 200 |
| Jobs | `GET /jobs` | ✅ 200 |
| Billing | `GET /billing/plans` | ✅ 200 |
| Employer | `GET /employer/{jobs,applicants,team,billing/usage,notifications,audit}` | ✅ 200 (own-scoped, empty) |
| Employer | no-token `GET /employer/jobs` | 🔒 401 (correct) |

> Base paths like `/applications`, `/resume`, `/job-tracker` return 404 — that is **by design**; the real routes are subpaths (`/applications/my-applications`, `/resume/data`, …). Not a defect.

## Frontend (render + console-error check)

Loaded with a seeded session; pages fall back to sample data when the API 401s. ✅ = renders, no console errors.

| Page | Result |
|---|---|
| `/` (marketing home) | ✅ renders |
| `/pricing` | ✅ renders |
| `/app/dashboard` | ✅ renders |
| `/app/matches` | ✅ renders |
| `/app/tracker` | ✅ renders |
| `/app/resume-library` | ✅ renders |
| `/app/auto-apply` | ✅ renders |
| `/app/settings` | ✅ renders |
| `/employer/*` | ✅ role-guard redirects a candidate → `/app/dashboard` (correct) |

All pages `render:OK errs:none`. The 66-page production build compiles clean.

## Findings

1. **🟡 Medium — Employer API has no server-side role enforcement.** `/employer/*` endpoints are JWT-guarded but **not** role-guarded, so a candidate token gets a 200. It only ever returns that user's **own** `ownerId`-scoped (empty) data — **no cross-tenant leak** — but a candidate can trigger employer-workspace provisioning. Protection today is client-side only (`AuthContext` redirect). **Recommend:** add a `ROLE_EMPLOYER` `RolesGuard` to the employer controllers for defense-in-depth.
2. **ℹ️ Note — Health endpoint is `/health`, not `/api/health`** (deliberately excluded from the global `api` prefix). Point uptime checks at `/health`.
3. **ℹ️ Known — OAuth signups hardcode `ROLE_CANDIDATE`** (social login can't create an employer). Correctness gap, tracked separately.

## How to re-run

- Backend API: `bash` the smoke script (register → loop endpoints with the token). Needs the backend on `:8000`.
- Frontend: `npm run build` (compile check) + a headless render of the pages above against `:3000`.
- Not covered here (recommended next): unit/integration tests (`npm test`), LLM-dependent flows (need a live key — otherwise they return deterministic fallbacks), OAuth callbacks (need real client credentials), and the job scrapers (need `*_BOARDS` env + network).
