# Browser verification prompt (reusable)

Paste the block below when you want a ticket verified in a real browser.
Replace `JOB-NN` and the model/harness line when the ticket requires something
more specific; everything else stays.

The auth section is the important change: **do not put a password in the
prompt.** Claude cannot type passwords into login forms, and the run will stall
there. The minted-session route below is what actually worked, needs no
password, and authenticates as the real account.

---

## The prompt

> Run the chrome-devtools MCP verification for **JOB-NN**.
>
> **Auth — no password.** Authenticate as `harkit@pragra.io` by minting a
> session with the Supabase admin API and injecting it as a cookie:
> 1. `POST {SUPABASE_URL}/auth/v1/admin/generate_link` with
>    `{type:'magiclink', email:'harkit@pragra.io'}`, using
>    `SUPABASE_SERVICE_ROLE_KEY` as both `apikey` and bearer.
> 2. `POST {SUPABASE_URL}/auth/v1/verify` with
>    `{type:'magiclink', token_hash}` and the **anon** key as `apikey` →
>    returns `access_token` / `refresh_token`.
> 3. Build the cookie `sb-<project-ref>-auth-token` =
>    `base64-` + base64 of `{access_token, refresh_token, expires_at,
>    expires_in, token_type}`. **Drop the `user` object** — with it the cookie
>    is ~5.1 KB and exceeds the browser's 4096-byte limit; without it it is
>    ~2 KB and fits in one cookie.
> 4. Set it with `document.cookie` via `evaluate_script` while on the app
>    origin, then navigate to the screen under test.
>
> **Start everything first, and prove each piece is actually current** — see
> the pitfalls below. Then walk the ticket's verification steps.
>
> Before spending time in the browser, run the fast harness probe from
> `backend/`: `npm run harness:probe-opencode -- --alias <alias>`. It uses the
> production OpenCode adapter, context files, Docker sandbox, LiteLLM route,
> compiler and content guard without the UI. Use `--passes 3` when model or
> prompt quality across revisions is under test. A failing probe blocks the
> browser pass; a passing probe does not replace ticket-required UI evidence.
>
> Use **Amazon Nova 2 Lite** (`bedrock/nova-2-lite/low`) for the default browser
> smoke run. Ticket-specific model requirements take precedence. If a ticket
> requires a different minimum model or excludes Nova, run that model as well
> and use the required-model result for sign-off. Check
> `infra/litellm/MODELS.md` first: a protocol-only model is not a sign-off
> model.
>
> **Use at least three prompts in the same session.** Generate from
> `CANDIDATE.md`, ask for a factual audit/removal of empty sections, then ask
> for a presentation improvement that must preserve every supported fact.
> Compare every revision with `CANDIDATE.md`. Any invented employer, role,
> date, degree, skill, credential, metric, or professional characterization is
> a failure even when the PDF compiles. Send one explicit correction prompt;
> if the unsupported claim survives, classify the model as unsuitable for
> candidate documents.
>
> **Persist every artifact before teardown.** Compiled PDFs live only inside
> the session sandbox and are destroyed with it; `getPdf` returns `null` once
> the session ends. Before ending a session or removing any container, download
> the PDF through the product's export control and copy the LaTeX out to
> `docs/job-NN-verification/` (`docker cp`, or the API's base64 while the
> session is still active). Render every PDF page to an image and inspect it for
> legibility, clipping, overlap, placeholders, correct identity/contact details,
> and preserved career facts. Save a screenshot at each ticket step to the same
> folder. That directory is gitignored.
>
> Report honestly: what passed, what failed, and which failures are the
> product versus the harness/tooling.

---

## Pitfalls — hard-won, do not rediscover

**1. Restart the backend after changing any adapter, and verify it took.**
`npm run start:dev` watches; a bare `nest start` does not. A stale backend
silently emits an old config and the run fails in a way that looks like a model
problem. Prove it by reading the generated config *inside the live sandbox*
(`docker exec <sandbox> cat /workspace/opencode.json`) and checking it contains
your change — not by trusting that the process restarted.

**2. Confirm the old process actually died.** `taskkill //PID <pid> //F` relies
on Git Bash rewriting `//PID` → `/PID`. If `MSYS_NO_PATHCONV=1` is exported
that rewrite is off and the kill silently fails; the new process then cannot
bind the port, and `/health` still answers — from the *old* process. Re-check
the port is free before starting the replacement.

**3. `MSYS_NO_PATHCONV=1` is needed for `docker -w /workspace`** (Git Bash
otherwise rewrites it to `C:/Program Files/Git/workspace`). Set it per-command,
not for the whole shell, because of pitfall 2.

**4. React ignores synthetic value changes.** `fill`, and even the native
`HTMLInputElement.value` setter plus a bubbling `input` event, leave React
state empty — the Generate button stays disabled with text visibly in the box.
Focus the field, then use `type_text` (real keystrokes). Verify the button
became enabled before clicking.

**5. Don't name a variable `URL` in a Node script.** It shadows the global
`URL` class that `fetch` uses internally; every request fails with
"Failed to parse URL from …".

**6. Poll for state; don't check right after a click.** React updates are
async, so a disabled-check immediately after clicking returns the pre-click
value and you conclude the turn finished when it never started. Poll for the
*target* state (e.g. `session-revision === '2'`), with a timeout.

**7. End sessions before navigating away.** The screen has no unload handler,
so navigating off a live session leaks its sandbox until the TTL reaps it.
`DELETE /api/resume-harness/sessions/:id` first, then check
`docker ps --filter "label=surface=resume-harness"` is empty at the end.

**8. Long turns can exceed a dev proxy's timeout.** Over the HTTPS dev server
(`npm run dev:https`, which proxies `/api/*` same-origin) a ~30 s turn returned
"Request failed" in the UI while the backend completed it successfully. If the
UI shows a stale revision, query the API directly with the minted token before
concluding the feature is broken.

**9. Only the current revision is stored.** `session.latex` is overwritten each
turn and `turns[]` keeps no source, so a bad edit destroys the previous version
irrecoverably. Copy the LaTeX out after every turn you care about.

**10. Delete the minted session file when finished.** It holds a live
access token for a real account.
