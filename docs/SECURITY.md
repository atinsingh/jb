# Jobocate — Security

Security posture, the audit that hardened it, and what must be true to release.
Last reviewed: 2026-07-27.

## Security model (how auth & data protection work)

- **AuthN:** JWT bearer tokens (`Authorization: Bearer <jwt>`), signed with `JWT_SECRET`, 7-day default TTL. Google/LinkedIn OAuth issue the same JWTs.
- **AuthZ:** per-route `@UseGuards(JwtAuthGuard)`. There is **no** global auth guard — every controller method that returns user data must apply the guard itself (verify this when adding routes).
- **Tenant isolation:** employer data is `ownerId`-scoped; candidate data is keyed to the JWT user id. (See the `ownerId` gotcha in the Developer Guide — inconsistent representation silently leaks/hides nothing but breaks queries.)
- **Input validation:** a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` strips unknown fields (blocks mass-assignment) and coerces DTO types.
- **Transport headers:** `helmet()` sets HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, etc. (CSP intentionally disabled — the process serves a JSON API + Swagger, not first-party HTML).
- **Rate limiting:** global `ThrottlerModule` + `ThrottlerGuard` (`app.module.ts`).
- **CORS:** single origin from `FRONTEND_URL` (default `http://localhost:3000`), `credentials: true`. Never widen to `*`.
- **Secrets:** all from env; `.env*`, `*.pem`, `*.key` are gitignored and **none are committed** (verified). OAuth client secrets and LLM keys read from `process.env` only.
- **Browser extension** (`extension/`): MV3, host permissions scoped to Greenhouse/Lever + the app/api origins (no `<all_urls>`); it fills forms and **pauses** — it never submits, and it makes no outbound calls beyond the Jobocate API.

## Audit — 2026-07-27

### Fixed
| Was | Severity | Fix |
|---|---|---|
| `JWT_SECRET` fell back to a **public default** `'your-secret-key'` → forgeable tokens | 🔴 Critical | Fails fast in production if unset; consistent dev-only fallback in `auth.module.ts` + `jwt.strategy.ts` so tokens still validate locally. |
| No security response headers | 🟡 Medium | Added `helmet()` in `main.ts` (verified: HSTS / nosniff / frameguard present). |
| CORS fallback pointed at the backend's own port (`:8000`) | 🟡 Low | Corrected to the frontend origin (`:3000`). |
| Unused `@nestjs/platform-fastify` pulling in vulnerable `@fastify/middie`/`fastify` | 🟠 High | Removed (app runs on Express); cleared that vuln cluster. |
| `npm audit` criticals (`basic-ftp`, `handlebars`, `fast-xml-parser`, `tar`) | 🔴 Critical | Safe `npm audit fix` applied to both apps. |

### Result
| App | Before | After |
|---|---|---|
| Backend | 4 critical / 38 high (89 total) | **0 critical** / 43 high / 22 mod / 3 low |
| Frontend | 2 critical / 9 high (15 total) | **0 critical** / 3 high |

Both apps **build (exit 0) and run** after the fixes.

### Already-good (verified, no change needed)
Rate limiting wired · ValidationPipe hardened · no `$where`/`eval`/shell-exec/`child_process` in app code · no committed secrets · env gitignored · per-route JWT guards · OAuth secrets from env.

## Residual & remediation

- **Backend: 43 high / 22 moderate.** Almost entirely **transitive / build-tooling** deps with limited real-world exploitability given how the app uses them. Fixing the rest requires `npm audit fix --force` (major version bumps) **plus a full build + smoke-test pass** — do it deliberately, not blind, because it can break the currently-green build. Recommended before a hardened production release.
- **Frontend: 3 high** — same story (transitive tooling).
- **Known auth bug:** OAuth signups hardcode `ROLE_CANDIDATE` — a user can't become an employer via social login until the intended role is threaded through OAuth state. Not a vulnerability, but a correctness gap to close.

## Must be true to release (security)

1. `JWT_SECRET` set to a strong random value (backend refuses to boot in prod otherwise).
2. `FRONTEND_URL` = the real frontend origin (CORS).
3. All OAuth + LLM secrets provided via env, never committed.
4. Run `npm audit` in CI; block new **critical** findings. Schedule the `--force` remediation of the residual highs.
5. Keep the extension's host permissions scoped; never broaden to `<all_urls>`.

## Reporting

Security-relevant changes should update this file's "Last reviewed" date and the audit table.
