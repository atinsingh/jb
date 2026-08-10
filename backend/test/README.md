# End-to-end tests

These boot the **real** `AppModule` over a **real** MongoDB and drive the HTTP
surface with supertest. No mocks: if a route, guard, schema or bridge is broken,
these fail.

```bash
npm run test:e2e            # all suites
npm run test:e2e -- test/hiring-journey.e2e-spec.ts
```

**Requires** a MongoDB on `localhost:27017` (`E2E_MONGODB_URI` overrides). The
suite drops its database on every run, so `setup-e2e.ts` refuses any URI that
does not name an `e2e` database — that guard is what stops a stray `MONGODB_URI`
from wiping the dev data.

Everything else is pinned in `setup-e2e.ts`: queues, scraping and auto-apply off,
LLM forced to the deterministic Mock provider (E2E must pass offline), throttler
limits raised so a fast suite doesn't 429 itself.

## Suites

| Suite | Covers |
|---|---|
| `auth.e2e-spec.ts` | readiness endpoint, register/login/JWT, admin+agent self-registration blocks |
| `rbac.e2e-spec.ts` | admin console, employer surface, candidate surface and scraper triggers vs. each role |
| `hiring-journey.e2e-spec.ts` | employer posts → publish to search pool → candidate applies → tracker → **employer pipeline bridge** → tenant isolation |
| `candidate-core.e2e-spec.ts` | preferences round-trip, profile, matching, notification production, entitlement |

## Two config choices that are not obvious

**`moduleFileExtensions` puts `ts` before `js`.** `src/` still contains 16 dead
pre-Nest Express `.js` files, and `job-scraper/job-scraper.service.js` shadows
its `.ts` sibling under jest's default order. The import then resolves to a
module with no `JobScraperService` export, which Nest reports as a misleading
"circular dependency detected inside JobScraperModule". Deleting the dead files
would let this be removed.

**`transformIgnorePatterns` transforms a handful of node_modules.** Booting the
whole AppModule pulls in ESM-only packages (`uuid@13` via resume-builder,
`htmlparser2` via `sanitize-html`). Node's `require(esm)` handles them at
runtime, so production is unaffected, but jest 29's CJS runtime cannot.
