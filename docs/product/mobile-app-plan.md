# Jobocate — Mobile App Plan

**Compiled:** 2026-07-30. Context: the backend is already a clean JWT REST API and `packages/contracts` holds shared Zod schemas — so a mobile app is a **new client**, not a rewrite. The web frontend is React/Next.

## Recommendation: React Native + Expo (candidate-first)

**Why Expo/RN over the alternatives:**
- **React reuse** — the team already writes React; the `services/*Api.js` clients are plain `fetch` and port almost verbatim; `@jobocate/contracts` (Zod) gives shared request/response types.
- **One codebase, iOS + Android**, managed native modules (secure storage, push, OAuth), OTA updates, fast iteration.
- Backend needs only **small additions** (push device-token registration + a push channel on the existing notifications producers).

| Option | Verdict |
|---|---|
| **Expo / React Native** | ✅ Recommended — best React reuse, native feel, app-store presence. |
| **PWA** (installable web) | ⚡ Zero-cost interim — add a manifest + service worker to the existing Next app; works today, but weak iOS push and no store presence. Good stopgap while the RN app is built. |
| Flutter | ❌ Great UI but Dart, no React reuse. |
| Native Swift/Kotlin | ❌ 2× cost, overkill now. |

## Architecture

- **Expo (React Native), TypeScript.**
- **Auth:** JWT in `expo-secure-store`; email login/register against `/api/auth/*` (login already works without email verification); OAuth (Google/LinkedIn) via `expo-auth-session` → same callback→JWT. Candidate is the primary mobile role (employers/admin stay web).
- **Data layer:** a thin API client mirroring `services/*Api.js` + **TanStack Query** for caching/offline; share types from `@jobocate/contracts`.
- **Navigation:** React Navigation — bottom tabs: **Home/Matches · Tracker · Notifications · Profile**.
- **Push:** Expo Notifications → register the device push token → **new backend endpoint** stores it; a **push channel** fires alongside the existing `NotificationsService` producers (we already emit on apply/status/interview/offer/message — mobile push is just another sink on those same events).
- **Design:** port the cream/green tokens to an RN theme; reuse the `Logo` mark.

## Backend work required (small, additive)

1. `POST /users/push-token` (+ schema field) to register Expo/APNs/FCM device tokens per user.
2. A `PushService` that the `NotificationsService.create(...)` path also calls (Expo Push API) — reuses the producers already wired in Wave 1.
3. Native OAuth redirect URIs added to the Google/LinkedIn apps.
4. (Optional) light API versioning header. Everything else (matching, résumé, cover letters, tracker, copilot, notifications) is already mobile-ready.

## Phasing (candidate app)

- **M0 — Foundation:** Expo app, auth (email + Google), API client + contracts, tab navigation, theme.
- **M1 — Core loop:** job feed/matches, job detail, apply (manual + "prepare"), application tracker, profile + résumé view. *(This is the first genuinely useful build.)*
- **M2 — Engagement:** push notifications (device-token endpoint + push channel), saved jobs, notifications inbox, interview prep.
- **M3 — AI:** cover-letter generation, the **Job-Search Copilot** (start a run + watch `AgentRun` steps — the `/copilot/*` API already exists), interview-coach chat.
- **M4 — Launch:** deep links, app icons/splash, TestFlight + Play internal testing, store listings.

**Rough effort:** M0+M1 (a usable candidate app) ≈ a few weeks with one RN dev; full M0–M4 ≈ 1.5–2.5 months. Reuses essentially all backend + contracts + design.

## Suggested immediate step

Two low-risk starts, either/both:
1. **PWA now** (hours) — add a web manifest + service worker to the existing Next frontend so it's installable on phones today, as an interim mobile experience.
2. **Scaffold the Expo app** — `M0` foundation (auth + API client + navigation) wired against the local backend, so the mobile client exists and can grow.
