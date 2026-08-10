# Jobocate — Alpha Go-Live Runbook (paid alpha)

**Scope:** a small set of invited real users, real data, real money. Single backend instance is fine at alpha volume. This runbook is the operator checklist to take the (code-complete, 346-test-green) build to a live paid alpha.

**Compiled:** 2026-07-29. Authoritative env reference: `backend/.env.example` + `frontend/.env.example`.

---

## 0. Alpha posture — what's ON vs deliberately OFF

| Flag | Alpha value | Why |
|---|---|---|
| `AUTO_APPLICATION_ENABLED` | **`false`** | Real headless-ATS submission (Greenhouse/Puppeteer) is unvalidated against a live form. Auto-apply still *prepares/queues* honestly. Turn on only after a live-form validation pass. |
| `QUEUE_ENABLED` | **`false`** | Single instance runs auto-apply/PDF/crons inline — no Redis needed at alpha volume. Flip to `true` (+ provision Redis) when you scale past one instance. |
| `STORAGE_DRIVER` | `local` (or `s3`) | Local disk is fine for one instance. Use `s3` (+ `@aws-sdk/client-s3` install, already guarded) only if multi-instance/containers that don't persist disk. |
| `LLM_ENFORCE_QUOTA` | **`false`** | Keep AI ungated in alpha (don't lock out users). Turn on when you productize credit limits. |

---

## 1. Provision (accounts only you can create)

- [ ] **MongoDB Atlas** cluster → `MONGODB_URI` (SRV string, IP-allowlist the host). Enable automated backups.
- [ ] **Host** — backend as a container (Fly.io / Railway / Render / a VM) and frontend on Vercel (Next.js) or the same host. Set a domain + TLS; note the public API origin and frontend origin.
- [ ] **Stripe** (paid alpha) — live keys `STRIPE_SECRET_KEY`; create products/prices and put their IDs on the `SubscriptionPlan` docs; register the webhook (§4) → `STRIPE_WEBHOOK_SECRET`.
- [ ] **SMTP** — a transactional provider (Postmark/SES/Resend via SMTP) → `SMTP_HOST/PORT/USER/PASSWORD/SECURE/FROM`. **Blocking:** verify-email, password reset, and org invites don't send without it.
- [ ] **AI key** — funded `ANTHROPIC_API_KEY` (default provider is `anthropic`/`claude-opus-4-8`). Without a funded key, all AI (features + recruiter + copilot) falls back to mock/deterministic. Optionally `OPENAI_API_KEY`.
- [ ] **OAuth** — Google + LinkedIn apps with redirect URIs `https://<api-origin>/api/auth/{google,linkedin}/callback` → `GOOGLE_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`.
- [ ] **Job boards** — pick real Greenhouse/Lever boards → `GREENHOUSE_BOARDS`, `LEVER_BOARDS` (comma-separated), else the marketplace starts empty.

## 2. Backend env (must-haves ⇒ `/health/readiness` `ready:true`)

Set on the host (never commit): `NODE_ENV=production`, `PORT`, `JWT_SECRET` (strong random — **not** the dev fallback; backend refuses to boot in prod without it), `MONGODB_URI`, `FRONTEND_URL=https://<frontend-origin>`, `SMTP_*`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plus OAuth + board vars from §1, plus the §0 flags. Frontend: `NEXT_PUBLIC_API_URL=https://<api-origin>`.

## 3. Build & deploy

> **Build-context gotcha (verified):** the two Dockerfiles use *different* contexts. The backend copies `packages/contracts` + `backend`, so its context is the **repo root**; the frontend copies its own dir, so its context is **`frontend/`**. Use exactly:

- [ ] Backend image (context = **repo root**): `docker build -f backend/Dockerfile -t jobocate-backend .` → run with the §2 env (entry `node dist/src/main.js`, port 8000, healthcheck on `/health`). ⚠️ `docker build ... backend` (context = the backend dir) **fails** with `"/backend": not found`.
- [ ] Frontend image (context = **`frontend/`**): `docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://<api-origin> -t jobocate-frontend frontend` → `yarn start` on port 3000. The API URL is baked at **build** time (build arg), not runtime. (Or deploy the frontend on Vercel with `NEXT_PUBLIC_API_URL` set.)
- [ ] Or `docker-compose.prod.yml` for a single-host bring-up (mongo optional if using Atlas — prefer Atlas).
- [ ] CI (`.github/workflows/ci.yml`) green on the release commit.
- [ ] `cd backend && npm run test:e2e` green (43 tests). Boots the real AppModule against a real Mongo and drives auth, RBAC, the employer→candidate→employer hiring journey and the candidate core surface. Needs a local MongoDB; it uses its own `jobocate_e2e` database. See `backend/test/README.md`.

## 3b. Stripe catalog

Products and prices live in Stripe; the app addresses them by **lookup key**, never by a hardcoded `price_...`, so the same code serves the test and live accounts.

- [ ] `npm run stripe:sync` (dry run) → `npm run stripe:sync -- --apply` creates any missing Jobocate products/prices and writes `stripePriceIdMonthly/Yearly` onto the candidate `SubscriptionPlan` docs. Safe to re-run; it never touches unrelated products. **It refuses to auto-create in a live account** — for live, create the objects in the dashboard using the same lookup keys (`jobocate_<plan>_<monthly|yearly>`, `jobocate_employer_<plan>_<monthly|annual>`), then run the dry run to confirm every key resolves.
- [ ] Candidate plans need `npm run db:seed` first — the sync reads their amounts from the seeded plan docs so Stripe can't disagree with `/pricing`.
- Employer plans store nothing: `EmployerBillingService` resolves the price by lookup key at checkout.

## 4. Stripe webhook

- [ ] Dashboard → Webhooks → add endpoint `https://<api-origin>/api/billing/webhook`, subscribe to `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*` → copy signing secret to `STRIPE_WEBHOOK_SECRET`.
- [ ] `main.ts` already enables `rawBody` (the fix that makes signature verification work). Send a test event → confirm a 2xx and that the subscription record updates.
- **One endpoint serves both audiences.** Employer checkout tags its objects with `metadata.audience = 'employer'`; `BillingService.handleStripeWebhook` routes on that to `EmployerBillingService`, so there is a single URL and a single signing secret to operate. Subscribe to `customer.subscription.*` for employer plan changes to apply.
- Locally: `stripe listen --forward-to localhost:8000/api/billing/webhook` and put its `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
- **An employer's paid tier is granted only here.** `POST /employer/billing/upgrade` returns a Checkout URL and changes nothing; the tier moves when the subscription webhook arrives, and drops back to free limits on any non-active status.

## 5. Post-deploy verification

- [ ] `GET https://<api-origin>/health/readiness` → **`ready: true`**, `missing: []`. (Booleans only; if false, `missing[]` names the gap.)
- [ ] Seed jobs: set board vars, then Admin console → Ingestion/Monitor → trigger a Greenhouse + Lever run; confirm jobs appear.
- [ ] **Smoke test (real browser, prod origin):**
  1. Register a candidate → receive + click the verification email → login.
  2. Set preferences + upload a résumé → `/app/dashboard` and `/app/matches` show real, ranked jobs.
  3. Apply to a job → it appears in `/app/tracker`.
  4. Register an employer (role=employer) → post a job → confirm it enters the candidate matching pool → the candidate's application shows in the employer pipeline (the bridge).
  5. Employer billing checkout with a Stripe **live** card (small amount) → webhook fires → plan updates.
  6. Promote a user to admin (`scripts/promote-admin.ts`) → `/admin/*` loads real metrics.
- [ ] Confirm `AUTO_APPLICATION_ENABLED=false` (auto-apply shows "prepares/queues", submits nothing).

## 6. Known limitations to disclose to alpha users (not blockers)

Real auto-apply submission is off (prepares only); the copilot is API-only (no UI yet); candidate in-app messages page is a placeholder; employer billing beyond checkout is basic; single-instance (no horizontal scale yet). None of these break the core loop.

## 7. Go / no-go

**GO when:** `/health/readiness` = `ready:true`, the §5 smoke test passes end-to-end on the prod origin, the Stripe test event succeeded, and the job pool is non-empty. **NO-GO** if email doesn't send, AI returns mock output (unfunded key), or Stripe webhook signature fails.
