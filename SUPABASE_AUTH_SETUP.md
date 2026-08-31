# Supabase Auth setup

Replaces the old `OAUTH_SETUP_INSTRUCTIONS.md`, which documented registering
Google/LinkedIn OAuth apps against **our own** `/api/auth/*/callback` endpoints.
Those endpoints no longer exist — Supabase Auth owns identity now, and the
provider credentials live in the Supabase dashboard rather than in our `.env`.

Tracked as JOB-38. The dashboard steps below cannot be scripted from this repo;
someone with access to the Supabase org has to do them.

## 1. Projects

Create **two** projects — `jobocate-dev` and `jobocate-prod`. A Supabase project
is the unit of isolation; do not share one across environments.

## 2. Providers

Enable all three sign-in paths the app had before:

| Provider | Notes |
|---|---|
| Email + password | Covers today's `provider: 'local'` accounts. |
| Google | Reuse the existing OAuth app. Its redirect URI changes to Supabase's callback, `https://<project-ref>.supabase.co/auth/v1/callback`. |
| LinkedIn (OIDC) | Supabase's `linkedin_oidc` provider replaces the hand-rolled flow. **OIDC scopes differ from the older LinkedIn v2 API scopes**, so the app config likely needs updating, not just copying. |

**Leave "Confirm email" OFF for now.** Today `emailVerified` is written but never
checked, and `backend/test/auth.e2e-spec.ts` asserts that login works without it
("alpha posture"). Turning confirmation on during the migration would change
product behaviour under cover of an infra change — do it as its own ticket.

There is a second, more practical reason. With confirmation ON, Supabase sends
the mail through its **built-in sender, which is for testing only**: a handful of
messages per hour, and often nothing arrives at all. Signup then dead-ends on a
'check your inbox' screen for a mail that never comes. Keeping it OFF avoids
depending on a sender we have not configured.

Turning it on later means configuring **custom SMTP** first, under
Authentication -> Emails -> SMTP Settings. Note there are two mail paths: this
one for auth mail, and the backend's own nodemailer (`SMTP_*` in
`backend/env.example`) for password-reset and notifications, which currently
no-ops and logs the token because those vars are unset. One provider can serve
both.

Toggling it off does **not** retroactively confirm accounts already created
while it was on. Confirm those in Authentication -> Users, or delete and
re-create them.

### Google, step by step

1. **console.cloud.google.com** -> select or create a project.
2. **APIs & Services -> OAuth consent screen** (do this FIRST; you cannot create
   credentials without it). User type *External*, fill app name, support email and
   developer contact. Add scopes `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile` - all non-sensitive, so no Google review needed.
3. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID**,
   application type **Web application**.
4. Under **Authorized redirect URIs** add exactly:

   ```
   https://dllybuqsbglhcxmftkcv.supabase.co/auth/v1/callback
   ```

5. Copy the **Client ID** and **Client secret** into Supabase ->
   Authentication -> Providers -> Google, enable, save.

**The gotcha, and it is Google's version of LinkedIn's Products gate:** the
consent screen has a **Publishing status**. While it is `Testing`, only accounts
listed under **Test users** can sign in and everyone else is refused with
`access_denied`. Either add the accounts you test with, or **Publish app** -
these scopes need no verification review.

**Authorized JavaScript origins is not needed.** Supabase performs the code
exchange server-side, so only the redirect URI above matters. Adding
`http://localhost:3000` there is harmless but fixes nothing.

### The provider callback (LinkedIn/Google side)

There are **two** redirect legs and they are easy to confuse:

| Leg | URL | Registered where |
|---|---|---|
| Provider to Supabase | `https://<project-ref>.supabase.co/auth/v1/callback` | Google Cloud Console / LinkedIn Developer Portal |
| Supabase to our app | `http://localhost:3000/auth/success` | Supabase, section 3 below |

The provider never sees our app URL. `redirect_uri does not match the registered
value` is always the **first** leg.

For the dev project that string is exactly:

```
https://dllybuqsbglhcxmftkcv.supabase.co/auth/v1/callback
```

LinkedIn compares it as an exact string, so a trailing slash is a different URL.
Add it under **Auth -> Authorized redirect URLs for your app**, on the same
LinkedIn app whose Client ID went into Supabase. Any leftover
`http://localhost:8000/api/auth/linkedin/callback` entry is from the flow this
migration deleted and can go.

## 3. Redirect URLs

Add every origin to the allow-list — local, staging, production. Supabase rejects
any callback not on it, and this is the most common setup failure:

```
http://localhost:3000/**
https://<staging-domain>/**
https://<production-domain>/**
```

## 4. Access token TTL

Set it explicitly to **30 minutes**.

This is a real trade-off, not a default worth ignoring. The old system bumped
`tokenVersion` on logout and every outstanding JWT died instantly. Supabase has
no equivalent — `signOut` revokes the refresh token, but the current access token
stays valid until it expires. A shorter TTL bounds that window.

(Admin suspension does not depend on the TTL: `JwtAuthGuard` resolves the Mongo
user on every request and rejects `isActive: false` immediately.)

## 5. Keys

| Key | Where it goes |
|---|---|
| Project URL | `SUPABASE_URL` (backend), `NEXT_PUBLIC_SUPABASE_URL` (frontend) |
| `anon` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public by design, safe in the browser |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` — **backend only** |

The service-role key **bypasses all authorisation**. It must never get a
`NEXT_PUBLIC_` prefix. Verify after the first deploy:

```bash
cd frontend && pnpm build
grep -r "<service-role-key>" .next/    # must return nothing
```

See `backend/env.example` and `frontend/env.example` for the full templates.

## 6. Verification

Sign in via all three methods against the dev project, then confirm a protected
API call succeeds — that proves the backend is verifying the token against the
project's JWKS (`backend/src/auth/supabase-token.service.ts`).

## Local `.env` files

`backend/.env`, `.env.local` and `.env.docker` are untracked and may still carry
`GOOGLE_*`, `LINKEDIN_*` and `JWT_SECRET` entries. Nothing reads them any more —
they are safe to delete when convenient, and `.env.docker` needs the `SUPABASE_*`
values added for the Docker path to work.
