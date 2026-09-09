# Jobocate — agent contract (Cursor)

Cursor loads this file. `CLAUDE.md` is the same product map (layout, env, modules). **This file is the working contract.** If another rule, skill, or user habit conflicts, follow this file.

Scope: **`backend/`** and **`frontend/`** only. Do not touch mobile, the browser extension, Catalyst demos, or other packages unless the user names them.

## How to work

1. **Smallest change that meets the asked goal.** Edit only files required for this task. No drive-by refactors, no “while I’m here” cleanups, no rewriting adjacent modules, no extra docs.
2. **Tests first, then implementation.** Write or extend a failing test that encodes the goal, watch it fail for the right reason, then implement until that test passes. Do not implement first and retrofit tests that cannot fail.
3. **Cover the goal, not every line.** One focused test (or a small suite) is enough. No per-function, per-branch, or snapshot bloat. Do not test framework wiring, getters, or CSS class names unless that *is* the bug.
4. **No migrations / backfills.** The product is not live. Change the current schema, DTOs, and UI. Do not add `db:migrate-*`, dual-read old+new fields, or compatibility layers unless the user asks.
5. **Graphify before a wide search.** See `.cursor/rules/graphify.mdc`. Query the graph, then open named files. Grep/Glob/Read of the whole tree is a fallback after a graph query, or when `graphify-out/graph.json` is missing.

## Verify without the browser-use skill

Do **not** use the browser-use skill, Browser Use CDP, or a click-through of the running app unless the user explicitly asks.

Prove the change with the same tests you wrote first (`backend` Jest / `test:e2e`, or the smallest Playwright spec under `e2e/` for a user-visible flow). Copy/layout-only UI with no coverage request does not need a new test and does not need a browser pass.

When the user explicitly requests browser verification of the résumé flow, follow `docs/verification-prompt.md` and consult `infra/litellm/MODELS.md` before choosing a model. Use Amazon Nova 2 Lite (`bedrock/nova-2-lite/low`) for the default browser smoke run. If the ticket names a different minimum model or excludes Nova, run that required model as well before sign-off. A model that only passes streaming/tool protocol is not acceptable for ticket sign-off until a multi-prompt résumé run also passes the factual and PDF-quality checks in that prompt.

For model, prompt, tool-call, compile, and content-guard checks that do not need UI behavior, run `cd backend && npm run harness:probe-opencode -- --alias <alias>`. It exercises the production OpenCode adapter in Docker and defaults to one pass; add `--passes 3` for a multi-prompt run. Use the browser only for the final user-facing workflow or when the ticket specifically requires browser evidence.

Agents are authorized to start, restart, and stop the local `backend/` and `frontend/` development servers, plus their required Docker Compose services, when implementation or verification needs them. Run long-lived servers in separate terminals. Stop only processes the agent started unless the user explicitly asks for broader cleanup. Never run `backend` build and watch commands concurrently: both rewrite `backend/dist`, so stop the watcher before `npm run build` and restart it afterward.

## Do not

- Schema dual-write, data backfills, or “support both old and new documents.”
- Expand into unrelated employer/candidate surfaces, infra, or new env flags unless the task needs them to compile/run.
- Mock away the thing under test so the new test cannot fail.
- Add Jest/RTL to `frontend/` “for completeness.”
- Invent Catalyst UI, new loggers, or shared `lib/` extracts unless the task is that work.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
