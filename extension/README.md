# Jobocate Autofill — browser extension (MVP)

One-click autofill for external job applications, from the candidate's Jobocate
profile. **It fills the form and stops** — nothing is submitted without the
candidate reviewing and submitting themselves. This is the deliberate opposite
of "spray-and-pray" auto-appliers.

## What works in this MVP
- **Greenhouse** (`boards.greenhouse.io`, `job-boards.greenhouse.io`) and **Lever** (`jobs.lever.co`) application forms.
- Fills: full name, first/last name, email, phone, location — only fields the user already provided (from `GET /api/users/autofill-payload`).
- Fills empty fields only (never overwrites what the user typed) and outlines each filled field in green.
- Auth is picked up automatically from a logged-in Jobocate tab (reads the app's own session token; stores nothing else).

## Not in the MVP (see `docs/product/parity-gaps-spec.md`)
- No auto-submit, no CAPTCHA solving, no scraping behind logins.
- Workday and résumé upload are next; the selector map will move server-side so we can patch drift without re-publishing.

## Load it locally (dev)
1. Run the backend (`:8000`) and frontend (`:3000`), and sign in to the app so a session token exists.
2. Chrome/Edge → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this `extension/` folder.
3. Open the Jobocate app tab once (so the extension picks up your token), then open any Greenhouse/Lever application.
4. Click the extension icon → **Autofill this application**. Review the filled fields, then submit on the site yourself.

## Files
| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; host permissions scoped to known ATS + the app/api origins only |
| `background.js` | service worker: holds the token, fetches the autofill payload, never submits |
| `content-app.js` | on the Jobocate app origin: hands the app's session token to the extension |
| `selectors.js` | per-ATS field selector map (Greenhouse/Lever) |
| `content-ats.js` | on ATS pages: fills matching empty fields, then pauses |
| `popup.html` / `popup.js` | connection state + the "Autofill this application" button |

## Production build
Change `API_BASE` in `background.js` and `APP_LOGIN` in `popup.js` to the deployed
origins, add the production host permissions to `manifest.json`, and supply icons.
