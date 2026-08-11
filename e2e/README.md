# Jobocate browser E2E suite

Playwright, driving the **real stack** — Next.js, NestJS and MongoDB together.

## Why this exists

Nearly every serious defect found on this project lived on a *layer boundary*:

- a DTO that rejected every field because it carried no validation decorators,
  making an entire API surface return 400;
- a service helper whose destructure silently dropped a query param, so a page
  sent a filter the server never saw;
- a publish step that set `workplaceType` but skipped `country`, which is the one
  combination the matcher's pre-filter drops — making every employer-posted job
  invisible to candidates;
- a job profile whose skills and match threshold were stored, displayed, and
  never read by the matcher.

Every one of those shipped with a **fully green unit suite**, because each layer's
own tests passed. Only crossing the boundary catches them. That is this suite's job.

## Running it

The suite needs the stack up. It will start it if it is not, and reuse it if it is.

```bash
pnpm --filter @jobocate/e2e install
pnpm --filter @jobocate/e2e install:browsers   # first run only

# with the stack already running:
cd e2e && E2E_NO_SERVER=1 npx playwright test
```

| Command | What it runs |
|---|---|
| `pnpm test` | everything |
| `pnpm test:smoke` | every route, both viewports |
| `pnpm test:journeys` | the deep flows only |
| `pnpm test:headed` | watch it drive the browser |
| `pnpm test:ui` | Playwright's interactive runner |
| `pnpm report` | open the last HTML report |

### Environment

| Variable | Default | Notes |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | Frontend origin |
| `E2E_API_URL` | `http://localhost:8000` | Backend origin |
| `E2E_NO_SERVER` | unset | Set to skip auto-starting the stack |

**If port 3000 is taken** by another project, run the frontend elsewhere and
point the suite at it:

```bash
cd frontend && npx next dev -p 3001
cd e2e && E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:3001 npx playwright test
```

The backend must allow that origin, or every browser API call fails CORS. Add it
to `CORS_EXTRA_ORIGINS` in `backend/.env` (already set to `http://localhost:3001`)
and restart the backend. `FRONTEND_URL` stays single-valued on purpose — a dozen
call sites build password-reset links, Stripe returns and OAuth redirects from it.

## How it is built

```
e2e/
  playwright.config.ts   projects, timeouts, webServer reuse
  support/
    api.ts               API client used to ARRANGE state
    global-setup.ts      provisions a candidate + employer, saves signed-in state
    routes.ts            the route manifest (and what is deliberately excluded)
  fixtures/
    test.ts              the base test — guards live here
  specs/
    smoke/               every route, shallow
    auth/                signup, login, refusal, gating
    candidate/           job profiles, empty states
    employer/            posting a job
    cross-surface/       employer job -> candidate matches
```

### Three layers

**1. Smoke** — every route in `support/routes.ts`, for the role that may see it.
Shallow and wide: it answers "does this page still work at all?" for pages nobody
has opened in months.

**2. Journeys** — the flows that carry business value, driven through the UI.

**3. Guards** — in `fixtures/test.ts`, applied automatically to every test:

- **failed API calls** — any `/api/*` response ≥ 400 fails the test, with the
  server's own message attached. This is what catches a DTO contract break
  without anyone writing a test for it.
- **console errors and uncaught exceptions** — an exception means React probably
  stopped rendering part of the tree.
- **horizontal overflow** (mobile project) — a prior audit found 29 pages
  scrolling sideways.

Opt out per test when a failure is the point:

```ts
test('rejects a bad password', async ({ page, guards }) => {
  guards.allowFailures('/api/auth/login');   // the 401 IS the assertion
  guards.allowConsoleErrors();               // if the page logs deliberately
});
```

## Test data

Every artifact is created fresh and tagged `e2e-auto`, so runs never collide and
the residue is identifiable:

```js
// anything matching this marker is safe to delete
db.users.deleteMany({ email: /e2e-auto/ })
db.employerjobs.deleteMany({ title: /e2e-auto/ })
db.jobs.deleteMany({ title: /e2e-auto/ })
db.jobprofiles.deleteMany({ profileName: /e2e-auto/ })
```

The suite does **not** clean up after itself. That is deliberate: when a test
fails, the state that produced it is still there to inspect. Sweep periodically
with the queries above.

## Adding a page

Add it to the right array in `support/routes.ts`. If you deliberately do not
cover it, add it to `EXCLUDED_ROUTES` **with a reason** — an unlisted page reads
as "covered and passing" when it is neither, which is how a dead page survives a
green suite.

## Writing a journey

- Arrange over the **API**, assert through the **UI**. A matches test should fail
  because matching broke, not because the signup form moved.
- Prefer `getByRole` with an accessible name over structural selectors. The login
  button is a `type="button"` with an `onClick`, so `button[type="submit"]` finds
  nothing — role and name is what a user goes by, and it survives refactors.
- Assert the thing the user cares about, and say so in the failure message. A
  failure should read like a bug report.
- Reload before trusting a save. A value living only in React state looks
  identical to a persisted one until you refresh.
