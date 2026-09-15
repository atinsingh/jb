import type { Page, Route } from "@playwright/test";
import {
  test,
  expect,
  storage,
  expectNoHorizontalOverflow,
} from "../../fixtures/test";

/**
 * Pick model and effort -> generate -> see output -> request a change -> see the changed
 * output.
 *
 * The `/api/resume-harness/*` responses are stubbed here on purpose. Running it
 * live would need Docker, the Agent Platform and metered provider keys, and it
 * would assert an LLM's prose rather than this screen's behaviour. The API
 * contract itself is covered end to end by `backend/test/resume-harness.e2e-spec.ts`,
 * once per harness; what is left to prove in a browser is that the screen picks
 * a harness, sends turns to the same session, and renders what comes back.
 */
test.use({ storageState: storage.candidate });
test.describe.configure({ mode: "serial" });

const OPTIONS = {
  tier: "PRO",
  models: [
    {
      model: "claude-sonnet-4-5",
      label: "Claude Sonnet 4.5",
      efforts: ["high", "low"],
    },
    {
      model: "gpt-5.6-luna",
      label: "GPT-5.6 Luna",
      efforts: ["low", "medium", "high", "xhigh", "max"],
    },
    // A different model offering only one effort.
    {
      model: "nova-micro",
      label: "Nova Micro",
      efforts: ["low"],
    },
    {
      model: "nova-lite",
      label: "Nova Lite",
      efforts: ["low"],
    },
  ],
  sandboxAvailable: true,
  // The screen gates on this rather than asking for the same facts again:
  // `missing` is required identity and blocks Start; `optionalGaps` only nudges.
  profile: {
    name: "Jordan Reyes",
    headline: "Senior Backend Engineer",
    roles: [],
    missing: [],
    optionalGaps: [],
    ready: true,
  },
};

const SESSION = {
  id: "sess-e2e-1",
  name: "Backend engineer résumé",
  targetRole: "Backend Engineer",
  jobDescription: "",
  sandboxId: "sbx-e2e-1",
  model: "claude-sonnet-4-5",
  effort: "high",
  modelLabel: OPTIONS.models[0].label,
  status: "active",
  latex: "",
  revision: 0,
  revisionCount: 0,
  turns: [] as any[],
  conversation: [] as any[],
  hasCurrentPdf: false,
  updatedAt: "2026-09-09T12:00:00.000Z",
  compiled: false,
};

/**
 * The seeded catalogue, trimmed to what the screen has to handle: templates
 * with different knob sets, so switching one has to drop a knob the other does
 * not declare.
 */
const TEMPLATES = [
  {
    key: "classic-serif",
    name: "Classic Serif",
    description: "Traditional, centred header.",
    previewSvg:
      '<svg viewBox="0 0 100 130"><rect width="100" height="130"/></svg>',
    constraints: ["Keep the centred header."],
    knobs: [
      {
        key: "density",
        label: "Density",
        defaultValue: "balanced",
        options: [
          { value: "compact", label: "Compact" },
          { value: "balanced", label: "Balanced" },
        ],
      },
      {
        key: "order",
        label: "Section order",
        defaultValue: "experience-first",
        options: [
          { value: "experience-first", label: "Experience first" },
          { value: "skills-first", label: "Skills first" },
        ],
      },
    ],
  },
  {
    key: "modern-sans",
    name: "Modern Sans",
    description: "Left-aligned header with a rule.",
    previewSvg:
      '<svg viewBox="0 0 100 130"><rect width="100" height="130"/></svg>',
    constraints: ["Keep the rule under the name."],
    knobs: [
      {
        key: "density",
        label: "Density",
        defaultValue: "balanced",
        options: [
          { value: "compact", label: "Compact" },
          { value: "balanced", label: "Balanced" },
        ],
      },
      // No `order` knob: switching here must drop it rather than show a control
      // this template cannot honour.
      {
        key: "accent",
        label: "Accent",
        defaultValue: "slate",
        options: [
          { value: "slate", label: "Slate" },
          { value: "navy", label: "Navy" },
        ],
      },
    ],
  },
];

const V1 =
  "\\documentclass{article}\n\\begin{document}\nJordan Reyes — Backend Engineer\n\\end{document}";
const V2 = `${V1.replace("\\end{document}", "")}\\section*{Kubernetes}\n\\end{document}`;

/** One-page PDF with hand-checked dark text, so a white canvas cannot pass. */
const PDF =
  "JVBERi0xLjcKJYGBgYEKCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxNzYKPj4Kc3RyZWFtCnicdc69CgIxDADgPU/RWRDTXH5aEMHzThxchL6AiIqiw4n4/KaHi6CkCaUJzTdAWwBDjccZZpvj7XV8Xg77qWFOnNBSDjGFcgLiULYQx9EYjPxgKHeY81LXRsoatScUUrHs2RBSR8iNrrwvyn4X7dU0exWfoEUoVygT6AvsYPgnycakiURTiPRTovkjiWJS96Jw/d9VUXXUdfWVW3dUH1WB8UfpRs609spfojcS1z2/CmVuZHN0cmVhbQplbmRvYmoKCjcgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL1R5cGUgL09ialN0bQovTiA1Ci9GaXJzdCAyNgovTGVuZ3RoIDM3NAo+PgpzdHJlYW0KeJzVUlFLwzAQfs+vuEd9kFzTLmlkDOa2KshQNkFRfKhtGBVJpM1k/nvv2s3hg/gs5Uju7rvLd70vAQQFWQYpmBwyGKUKRmBSC+OxkHef7w7kbblxnZDXTd3BE2EQVvAs5CxsfYRETCbiiJ2VsXwLGzEUQcLgA+K2DfW2ci2Mi0VRIBpE1BmZRlRzOmdklkyRTzmV053MZHujmEkR0ynlisG0GWo432NH+/oFnYTVjJkP2Cwf/O93+a3F0EP9xcdOhFyGel5GByfzc4VKo00wyVOL6vGUfkfryhj+73A9/yb4Xyf8sWdeLy+5dayBfsty5bqwbStaO+OKQBm+XLm3DxebqjwzaHPiaXJLGutLjjlrMqVzNdL5PkfPyYebl1dX9W3YXezi5ToyvyHAsaWrm/Ii7EiZSJ9OFBirWJ9T70NkxfZa9ZGYsqf3+v0xDpMVcr19ib3LwUTIi7Jz/RhHnkTCV6Fu/AbkfeOnvmsOAe74Bbw+zSsKZW5kc3RyZWFtCmVuZG9iagoKOCAwIG9iago8PAovU2l6ZSA5Ci9Sb290IDIgMCBSCi9JbmZvIDMgMCBSCi9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9UeXBlIC9YUmVmCi9MZW5ndGggNDEKL1cgWyAxIDIgMiBdCi9JbmRleCBbIDAgOSBdCj4+CnN0cmVhbQp4nBXEwQ0AIAwDsUuKhPix/37M0RI/DHSbDUnJqdISF6Tz84MBXKIDOgplbmRzdHJlYW0KZW5kb2JqCgpzdGFydHhyZWYKNzQxCiUlRU9G";

/** Serialises a turn as the SSE frames the screen actually consumes. */
const sse = (session: unknown): string =>
  [
    `data: ${JSON.stringify({ type: "phase", phase: "writing" })}\n\n`,
    `data: ${JSON.stringify({ type: "phase", phase: "compiling" })}\n\n`,
    `data: ${JSON.stringify({ type: "result", session })}\n\n`,
  ].join("");

/** One stubbed backend, shared by the whole file. */
async function stubHarnessApi(page: Page) {
  let turns = 0;
  let exists = false;
  let ats: any = null;
  // The stub holds session state because the screen's whole job here is to keep
  // one session moving — a stub that answered every call identically could not
  // tell a template switch from a no-op.
  let state = {
    ...SESSION,
    templateKey: "classic-serif",
    vibe: { density: "balanced", order: "experience-first" },
    canRevert: false,
  };
  let snapshot: typeof state | null = null;

  // Keep this UI-contract stub independent from a locally running Nest app;
  // AuthContext loads the candidate envelope on every protected page.
  await page.route("**/api/auth/me", (route: Route) =>
    route.fulfill({
      json: { user: { id: "candidate-e2e-1", role: "ROLE_CANDIDATE" } },
    }),
  );

  const turn = (patch: Record<string, unknown>) => {
    turns += 1;
    state = {
      ...state,
      ...patch,
      revision: turns,
      revisionCount: turns,
      compiled: true,
      hasCurrentPdf: true,
    } as typeof state;
    state.turns = [
      ...state.turns,
      {
        ...patch,
        revision: turns,
        latex: state.latex,
        compiled: true,
        hasPdf: true,
        kind: "instruction",
        createdAt: SESSION.updatedAt,
      },
    ];
    state.conversation = [
      ...state.conversation,
      {
        role: "user",
        text: String(patch.instruction || ""),
        createdAt: SESSION.updatedAt,
      },
      {
        role: "assistant",
        text: String(patch.summary || "Résumé updated."),
        revision: turns,
        createdAt: SESSION.updatedAt,
      },
    ];
    return { ...state, pdfBase64: PDF };
  };

  await page.route("**/api/resume-harness/options", (route: Route) =>
    route.fulfill({ json: OPTIONS }),
  );

  await page.route("**/api/resume-harness/templates", (route: Route) =>
    route.fulfill({ json: TEMPLATES }),
  );

  await page.route("**/api/resume-harness/sessions", async (route: Route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: exists ? [state] : [] });
    const body = route.request().postDataJSON() || {};
    exists = true;
    state = {
      ...state,
      status: "active",
      jobUrl: body.jobUrl || "",
      jobDescription:
        body.jobDescription ||
        (body.jobUrl
          ? "Extracted Platform Engineer role requiring Kubernetes and Terraform."
          : ""),
      jobContextWarning: undefined,
      templateKey: body.templateKey || "classic-serif",
      vibe: body.vibe || state.vibe,
      canRevert: false,
    };
    await route.fulfill({ status: 201, json: state });
  });

  await page.route(
    "**/api/resume-harness/sessions/*/turns/stream",
    (route: Route) => {
      const instruction = route.request().postDataJSON().instruction;
      if (/what else can you do/i.test(instruction)) {
        state = {
          ...state,
          conversation: [
            ...state.conversation,
            { role: "user", text: instruction, createdAt: SESSION.updatedAt },
            {
              role: "assistant",
              text: "I can tailor your summary, prioritize factual experience, and tighten the layout. Tell me which role or accomplishment you want to emphasize.",
              createdAt: SESSION.updatedAt,
            },
          ],
        };
        return route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: sse({
            ...state,
            summary: state.conversation.at(-1).text,
            documentChanged: false,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse(
          turn({
            instruction,
            latex: turns === 0 ? V1 : V2,
            summary:
              turns === 0
                ? "Created resume.tex."
                : "Added a Kubernetes section.",
          }),
        ),
      });
    },
  );

  await page.route(
    "**/api/resume-harness/sessions/*/template/stream",
    (route: Route) => {
      const { templateKey, vibe } = route.request().postDataJSON();
      snapshot = { ...state };
      const template = TEMPLATES.find((t) => t.key === templateKey)!;
      // The server drops knobs the new template does not declare; the stub has
      // to as well, or the screen's own merge would never be exercised.
      const kept: Record<string, string> = {};
      for (const knob of template.knobs) {
        const chosen = (vibe || state.vibe)[knob.key];
        kept[knob.key] = knob.options.some((o) => o.value === chosen)
          ? chosen
          : knob.defaultValue;
      }
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse(
          turn({
            templateKey,
            vibe: kept,
            canRevert: true,
            latex: `${V2}\n% ${template.name}`,
            summary: `Re-applied to ${template.name}.`,
          }),
        ),
      });
    },
  );

  await page.route(
    "**/api/resume-harness/sessions/*/vibe/stream",
    (route: Route) => {
      const { vibe } = route.request().postDataJSON();
      snapshot = { ...state };
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse(
          turn({
            vibe: { ...state.vibe, ...vibe },
            canRevert: true,
            latex: `${V2}\n% relaid out`,
            summary: "Re-applied the résumé to the new look.",
          }),
        ),
      });
    },
  );

  await page.route(
    "**/api/resume-harness/sessions/*/revert-look",
    (route: Route) => {
      if (!snapshot) {
        return route.fulfill({
          status: 409,
          json: { message: "Nothing to revert" },
        });
      }
      turns += 1;
      state = { ...snapshot, revision: turns, canRevert: false };
      snapshot = null;
      route.fulfill({
        status: 201,
        json: {
          ...state,
          summary: "Restored the previous look.",
          pdfBase64: PDF,
        },
      });
    },
  );

  await page.route("**/api/resume-harness/sessions/*/pdf", (route: Route) =>
    route.fulfill({ json: { pdfBase64: state.compiled ? PDF : null } }),
  );

  await page.route("**/api/resume-harness/sessions/*", (route: Route) => {
    if (route.request().method() === "DELETE") {
      exists = false;
    }
    if (route.request().method() === "PATCH") {
      state = { ...state, name: route.request().postDataJSON().name };
    }
    return route.fulfill({ json: state });
  });

  await page.route("**/api/resume-harness/sessions/*/end", (route: Route) => {
    state = { ...state, status: "ended" };
    return route.fulfill({ json: state });
  });

  await page.route(
    "**/api/resume-harness/sessions/*/archive",
    (route: Route) => {
      state = {
        ...state,
        status: "ended",
        archivedAt: "2026-09-09T13:00:00.000Z",
      } as typeof state;
      return route.fulfill({ json: state });
    },
  );

  await page.route(
    "**/api/resume-harness/sessions/*/restore",
    (route: Route) => {
      state = { ...state, archivedAt: undefined } as typeof state;
      return route.fulfill({ json: state });
    },
  );

  await page.route(
    "**/api/resume-harness/sessions/*/revisions/*/restore",
    (route: Route) => {
      const revision = Number(route.request().url().split("/").at(-2));
      const source = state.turns.find((entry) => entry.revision === revision);
      return route.fulfill({
        json: turn({
          ...source,
          kind: "restore",
          restoredFromRevision: revision,
          summary: `Restored revision ${revision}.`,
        }),
      });
    },
  );

  await page.route("**/api/ats/resume-sessions/*/latest", (route: Route) =>
    route.fulfill({ json: ats }),
  );

  await page.route("**/api/ats/sessions", (route: Route) => {
    const body = route.request().postDataJSON();
    ats = {
      id: "ats-e2e-1",
      resumeSessionId: state.id,
      sourceRevision: body.sourceRevision,
      currentRevision: state.revision,
      stale: false,
      status: "ready",
      model: state.model,
      effort: state.effort,
    };
    return route.fulfill({ status: 201, json: ats });
  });

  await page.route("**/api/ats/sessions/*/run", (route: Route) => {
    ats = {
      ...ats,
      sourceRevision: state.revision,
      currentRevision: state.revision,
      stale: false,
      status: "completed",
      semanticMatch: 78.5,
      subScores: {
        keywordMatch: 72.5,
        skillsCoverage: 81,
        sectionCompleteness: 90,
      },
      keywordGaps: ["Kubernetes", "Terraform"],
      injectableKeywords: ["Kubernetes"],
      suggestions: ["Add Kubernetes to a factual project bullet."],
      analyzedAt: "2026-09-09T12:30:00.000Z",
    };
    return route.fulfill({ json: ats });
  });
}

test.describe("résumé session operation integrity", () => {
  test.describe.configure({ mode: "default" });

  test("revision history shows the original instruction alongside its summary", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page
      .getByTestId("instruction")
      .fill("Lead with my backend engineering work.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");
    const history = page.getByTestId("revision-history");
    await history.locator("summary").click();
    await expect(history).toContainText("Created resume.tex.");
    await expect(history).toContainText(
      "Lead with my backend engineering work.",
    );
  });
});

test.describe("résumé session history", () => {
  test("shows one create action and manages an AI resume as its linked session", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-builder", (route: Route) =>
      route.fulfill({
        json: [
          {
            id: "imported-1",
            name: "Imported profile",
            template: "modern",
            status: "ready",
            creationMethod: "ai_rewrite",
            source: {
              originalFilename: "profile.pdf",
              importedAt: SESSION.updatedAt,
            },
            createdAt: SESSION.updatedAt,
            updatedAt: SESSION.updatedAt,
            version: 1,
          },
        ],
      }),
    );

    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("past-sessions")).toHaveCount(0);
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await page.getByTestId("end-session").click();

    await page.goto("/app/resume-library", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: "Create Resume", exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "New agent résumé" }),
    ).toHaveCount(0);
    await expect(page.getByText("Job-tailored", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText("Draft", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Ready", { exact: true })).toHaveCount(0);

    let generated = page.getByTestId(`resume-session-${SESSION.id}`);
    await expect(generated).toContainText("Backend engineer résumé");
    await expect(generated).toContainText("AI-generated");
    await expect(generated).toContainText("1 revision");
    await expect(generated).not.toContainText("Codex");
    await expect(generated).not.toContainText("anthropic/");
    await expect(page.getByTestId("resume-imported-1")).toContainText(
      "Imported",
    );

    const downloaded = page.waitForEvent("download");
    await generated.getByRole("button", { name: "More actions" }).click();
    await generated.getByRole("button", { name: "Download PDF" }).click();
    expect((await downloaded).suggestedFilename()).toBe(
      "Backend engineer résumé.pdf",
    );

    await generated.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Rename" }).click();
    await page
      .getByRole("textbox", { name: "Resume name" })
      .fill("Platform résumé");
    await page.getByRole("button", { name: "Save" }).click();
    generated = page.getByTestId(`resume-session-${SESSION.id}`);
    await expect(generated).toContainText("Platform résumé");

    await generated.getByRole("button", { name: "More actions" }).click();
    await generated
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await expect(generated).toHaveCount(0);
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    generated = page.getByTestId(`resume-session-${SESSION.id}`);
    await expect(generated).toBeVisible();
    await generated.getByRole("button", { name: "More actions" }).click();
    await generated
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await page.getByRole("button", { name: "All", exact: true }).click();

    generated = page.getByTestId(`resume-session-${SESSION.id}`);
    await generated.getByRole("button", { name: "Open resume" }).click();
    await expect(page).toHaveURL(/\/app\/resume\?session=sess-e2e-1$/);
    await expect(page.getByTestId("pdf-preview")).toBeVisible();

    await page.goto("/app/resume-library", { waitUntil: "domcontentloaded" });
    generated = page.getByTestId(`resume-session-${SESSION.id}`);
    await generated.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete resume & session" }).click();
    await expect(generated).toHaveCount(0);
  });

  test("reopens a persisted PDF, restores in place, and continues from it", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");
    await page.getByTestId("instruction").fill("Add Kubernetes.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("2");
    await page.getByTestId("end-session").click();
    await page.goto(`/app/resume?session=${SESSION.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
    await expect(
      page.locator('iframe[data-testid="pdf-preview"]'),
    ).toBeVisible();
    await expect(page.getByTestId("instruction")).toHaveCount(0);
    await expect(page.getByTestId("look-toggle")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue from here" }),
    ).toBeVisible();
    await page.getByTestId("revision-history").locator("summary").click();
    await page
      .getByRole("button", { name: "Restore revision 1", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app\/resume\?session=sess-e2e-1$/);
    await expect(page.getByTestId("session-revision")).toHaveText("3");
    await expect(page.getByTestId("latex-source")).not.toContainText(
      "Kubernetes",
    );
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
    await expect(page.getByTestId("revision-history")).toContainText(
      "Restored revision 1.",
    );
    const continuing = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith("/resume-harness/sessions"),
    );
    await page.getByRole("button", { name: "Continue from here" }).click();
    expect((await continuing).postDataJSON().carryFromSessionId).toBe(
      SESSION.id,
    );
    await expect(page.getByTestId("instruction")).toBeVisible();
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
  });

  test("list failure leaves generation usable", async ({ page, guards }) => {
    guards.allowFailures(/\/api\/resume-harness\/sessions$/);
    guards.allowConsoleErrors();
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/sessions", (route: Route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 503,
            json: { message: "History unavailable" },
          })
        : route.fallback(),
    );
    await page.route("**/api/resume-builder", (route: Route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/app/resume-library", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "temporarily unavailable",
    );
    await page
      .getByRole("button", { name: "Create Resume", exact: true })
      .click();
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
  });

  test("resume-builder failure does not hide AI-generated resumes", async ({
    page,
    guards,
  }) => {
    guards.allowFailures(/\/api\/resume-builder$/);
    guards.allowConsoleErrors();
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await page.getByTestId("end-session").click();
    await page.route("**/api/resume-builder", (route: Route) =>
      route.fulfill({ status: 503, json: { message: "Imports unavailable" } }),
    );

    await page.goto("/app/resume-library", { waitUntil: "domcontentloaded" });

    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Imported résumés are temporarily unavailable",
    );
    await expect(
      page.getByTestId(`resume-session-${SESSION.id}`),
    ).toContainText("AI-generated");
  });

  test("hidden and pagehide send one authenticated lifecycle end and never delete", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-builder", (route: Route) =>
      route.fulfill({ json: [] }),
    );
    const ends: any[] = [];
    const deletes: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(`/${SESSION.id}/end`)) ends.push(request);
      if (request.method() === "DELETE") deletes.push(request.url());
    });
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await expect(page.getByTestId("session-bar")).toBeVisible();
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    await expect.poll(() => ends.length).toBe(1);
    expect(ends[0].method()).toBe("POST");
    expect(ends[0].headers().authorization).toMatch(/^Bearer /);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.goto("/app/resume-library", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId(`resume-session-${SESSION.id}`),
    ).toBeVisible();
    expect(ends).toHaveLength(1);
    expect(deletes).toHaveLength(0);
  });
});

test.describe("LaTeX résumé — agent harness", () => {
  test("selects a model, generates, then changes the same résumé", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    // Runtime/provider routing is server-owned and never shown to candidates.
    await expect(page.getByTestId("harness-picker")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Agent", { exact: true })).toHaveCount(0);
    await expect(page.locator('button[data-testid^="harness-"]')).toHaveCount(
      0,
    );
    await expect(page.getByTestId("resolved-alias")).toHaveCount(0);

    await page.getByTestId("start-session").click();

    await expect(page.getByTestId("session-harness")).toHaveCount(0);
    await expect(page.getByTestId("session-model")).toHaveText(
      "claude-sonnet-4-5",
    );
    await expect(page.getByTestId("session-effort")).toHaveText("high");

    // ---- generate ----
    await page
      .getByTestId("instruction")
      .fill("Build a résumé for a backend engineer.");
    await page.getByTestId("send-instruction").click();

    await expect(page.getByTestId("latex-source")).toContainText(
      "\\documentclass",
    );
    await expect(page.getByTestId("latex-source")).toContainText(
      "Jordan Reyes",
    );
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    // ---- request a change, see the changed output ----
    await page.getByTestId("instruction").fill("Add a Kubernetes section.");
    await page.getByTestId("send-instruction").click();

    await expect(page.getByTestId("latex-source")).toContainText("Kubernetes");
    // The original document survived — this is an edit, not a regeneration.
    await expect(page.getByTestId("latex-source")).toContainText(
      "Jordan Reyes",
    );
    await expect(page.getByTestId("session-revision")).toHaveText("2");
    // `.last()` because the transcript keeps every turn; the newest one is the
    // reply to the change just requested.
    await expect(page.getByTestId("turn-summary").last()).toContainText(
      "Kubernetes",
    );

    await expectNoHorizontalOverflow(page, "resume");
  });

  test("scores the current revision in the same workspace and marks it stale after an edit", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page
      .getByTestId("job-description")
      .fill("Backend engineer with Kubernetes and Terraform experience.");
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    await page.getByTestId("send-instruction").click();

    await page.getByTestId("run-ats").click();
    await expect(page.getByTestId("ats-score")).toHaveText("79");
    await expect(page.getByTestId("ats-gaps")).toContainText("Kubernetes");
    await expect(page.getByTestId("ats-suggestions")).toContainText(
      "Add Kubernetes to a factual project bullet.",
    );

    await page.getByTestId("instruction").fill("Make the summary shorter.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("ats-stale")).toBeVisible();

    await page.getByTestId("run-ats").click();
    await expect(page.getByTestId("ats-stale")).toHaveCount(0);
    await expect(page.getByTestId("ats-revision")).toHaveText("Revision 2");
  });

  test("treats an empty successful latest ATS response as not yet analyzed, not an outage", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/ats/resume-sessions/*/latest", (route: Route) =>
      route.fulfill({ status: 200, body: "" }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page
      .getByTestId("job-description")
      .fill("Backend engineer with Kubernetes experience.");
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    const latest = page.waitForResponse((response) =>
      /\/api\/ats\/resume-sessions\/.*\/latest/.test(response.url()),
    );
    await page.getByTestId("send-instruction").click();
    await latest;

    await expect(page.getByTestId("ats-job-warning")).toHaveCount(0, {
      timeout: 2_000,
    });
    await expect(page.getByTestId("run-ats")).toHaveText("Analyze ATS match");
  });

  test("uses a job URL when pasted text is absent and does not show the missing-context warning", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    let startBody: any;
    await page.route("**/api/resume-harness/sessions", async (route: Route) => {
      if (route.request().method() === "POST")
        startBody = route.request().postDataJSON();
      await route.fallback();
    });
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page
      .getByTestId("job-url")
      .fill("https://jobs.example.com/platform-engineer");
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    await page.getByTestId("send-instruction").click();

    expect(startBody).toMatchObject({
      jobUrl: "https://jobs.example.com/platform-engineer",
    });
    expect(startBody.jobDescription).toBeUndefined();
    await expect(page.getByTestId("ats-job-warning")).toHaveCount(0);
    await expect(page.getByTestId("run-ats")).toBeEnabled();
  });

  test("shows one non-fatal warning and no error when job context and ATS history are unavailable", async ({
    page,
    guards,
  }) => {
    await stubHarnessApi(page);
    guards.allowFailures(/\/api\/ats\/resume-sessions\/.*\/latest/);
    guards.allowConsoleErrors();
    await page.route("**/api/ats/resume-sessions/*/latest", (route: Route) =>
      route.fulfill({
        status: 503,
        json: { message: "ATS service unavailable" },
      }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    await page.getByTestId("send-instruction").click();

    await expect(page.getByTestId("ats-job-warning")).toHaveCount(1);
    await expect(page.getByTestId("ats-job-warning")).toContainText(
      /job description or job URL/i,
    );
    await expect(page.getByTestId("ats-error")).toHaveCount(0);
    await expect(page.getByTestId("harness-error")).toHaveCount(0);
  });

  test("keeps questions conversational and creates revisions only for document changes", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    await page.getByTestId("instruction").fill("What else can you do?");
    await page.getByTestId("send-instruction").click();

    const reply = page.getByTestId("turn-summary").last();
    await expect(reply).toContainText("I can tailor your summary");
    await expect(reply).not.toContainText(/revision 1/i);
    await expect(page.getByTestId("session-revision")).toHaveText("1");
    await expect(page.getByTestId("revision-history")).toContainText(
      "Revision history (1)",
    );
  });

  test("uses the native PDF viewer instead of rasterizing revision canvases", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build the résumé.");
    await page.getByTestId("send-instruction").click();

    const preview = page.locator('iframe[data-testid="pdf-preview"]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute(
      "src",
      /^data:application\/pdf;base64,/,
    );
    await expect(page.locator('[data-testid^="pdf-page-"]')).toHaveCount(0);
    await expect(
      page.locator('[data-testid="pdf-preview"] canvas'),
    ).toHaveCount(0);

    await page.getByTestId("instruction").fill("Tighten the summary.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("2");
    await expect(preview).toBeVisible();
    await expect(page.locator('[data-testid^="pdf-page-"]')).toHaveCount(0);
  });

  test("offers a new session instead of a harness switch, and degrades when the platform is down", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page.getByTestId("start-session").click();
    await expect(page.getByTestId("session-bar")).toBeVisible();

    // There is no control that switches harness on a live session, because
    // there is no such operation — only "start a new one".
    await expect(page.getByTestId("new-session")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^switch harness$/i }),
    ).toHaveCount(0);

    // Finish the session before checking the setup-screen outage state. Active
    // sessions now intentionally survive reloads, so leaving it open would
    // restore the workspace instead of returning to setup.
    await page.getByTestId("end-session").click();

    // Platform unreachable: the screen says so rather than offering a start
    // button that cannot work.
    await page.route("**/api/resume-harness/options", (route: Route) =>
      route.fulfill({ json: { ...OPTIONS, sandboxAvailable: false } }),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("platform-unavailable")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("start-session")).toBeDisabled();
  });
});

/**
 * The screen must never re-ask for something the account already answers.
 *
 * Identity is required and blocks generation; history is optional and only
 * nudges. Both are reported by the API from the candidate's own profile, so a
 * regression that reintroduced a "your name" input on this page would show up
 * here as a field that should not exist.
 */
test.describe("résumé — profile-sourced facts", () => {
  test("blocks hard on missing identity: no form, no start, clear route out", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/options", (route: Route) =>
      route.fulfill({
        json: {
          ...OPTIONS,
          profile: {
            ...OPTIONS.profile,
            missing: ["name", "linkedin", "location"],
            ready: false,
          },
        },
      }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    // The blocker is the page, not a footnote under it.
    const gate = page.getByTestId("required-gate");
    await expect(gate).toBeVisible();
    await expect(gate).toContainText(/full name/i);
    await expect(gate).toContainText(/linkedin/i);
    await expect(gate).toContainText(/location/i);

    // Each missing field is its own row, so it is obvious how many remain.
    await expect(page.getByTestId("gate-field-name")).toBeVisible();
    await expect(page.getByTestId("gate-field-linkedin")).toBeVisible();
    await expect(page.getByTestId("gate-field-location")).toBeVisible();

    // Filled ones are not listed as outstanding.
    await expect(page.getByTestId("gate-field-email")).toHaveCount(0);

    await expect(page.getByTestId("gate-cta")).toHaveAttribute(
      "href",
      "/app/settings",
    );

    // The setup form is not merely disabled — it is not offered at all, so
    // there is nothing to fill in that would not work.
    await expect(page.getByTestId("harness-picker")).toHaveCount(0);
    await expect(page.getByTestId("start-session")).toHaveCount(0);
  });

  test("generates anyway when only the optional history is absent", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/options", (route: Route) =>
      route.fulfill({
        json: {
          ...OPTIONS,
          profile: {
            ...OPTIONS.profile,
            optionalGaps: ["experience", "certifications"],
            ready: true,
          },
        },
      }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    // A thin résumé beats a blocked one — the gap is a nudge, not a gate.
    await expect(page.getByTestId("profile-gaps")).toContainText(
      /work experience/i,
    );
    await expect(page.getByTestId("start-session")).toBeEnabled();
  });

  test("asks only for per-résumé inputs, never for profile facts", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("target-role")).toBeVisible();
    await expect(page.getByTestId("job-description")).toBeVisible();

    // These live in Settings. An input for any of them here would mean a second
    // copy that drifts from the account.
    for (const gone of [/your name/i, /work authorisation/i, /seniority/i]) {
      await expect(page.getByLabel(gone)).toHaveCount(0);
    }
  });
});

/**
 * Model and effort are separate choices.
 *
 * The backend returns model capability metadata, so both dropdowns are derived
 * from the tier-permitted model list. Effort is its own control
 * because it is the dial a candidate reaches for — same model, more care, more
 * cost — and folded into one label it stops reading as a choice at all.
 */
test.describe("résumé — model and effort selection", () => {
  test("offers only capability-declared effort levels, including Luna", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("model-select")).toHaveValue(
      "claude-sonnet-4-5",
    );
    await expect(page.getByTestId("effort-select")).toHaveValue("high");

    // Changing effort alone keeps the selected model.
    await page.getByTestId("effort-select").selectOption("low");

    await page.getByTestId("model-select").selectOption("gpt-5.6-luna");
    await expect(
      page.getByTestId("effort-select").locator("option"),
    ).toHaveText(["low", "medium", "high", "xhigh", "max"]);
    await page.getByTestId("effort-select").selectOption("max");
    await expect(page.getByTestId("effort-select")).toHaveValue("max");

    // A model with a single effort disables the control rather than pretending
    // there is a choice.
    await page.getByTestId("model-select").selectOption("nova-micro");
    await expect(page.getByTestId("effort-select")).toBeDisabled();

    await expect(
      page
        .getByTestId("model-select")
        .locator("option", { hasText: /Nova Lite/ }),
    ).toHaveCount(1);
    await page.getByTestId("model-select").selectOption("nova-lite");
  });

  test("starts with the selected Luna effort and no client-chosen runtime", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    let sent: any = null;
    await page.route("**/api/resume-harness/sessions", async (route: Route) => {
      if (route.request().method() === "GET") return route.fallback();
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: SESSION });
    });

    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("model-select").selectOption("gpt-5.6-luna");
    await page.getByTestId("effort-select").selectOption("xhigh");
    await page.getByTestId("start-session").click();
    await expect(page.getByTestId("session-bar")).toBeVisible();

    expect(sent).toMatchObject({ model: "gpt-5.6-luna", effort: "xhigh" });
    expect(sent).not.toHaveProperty("alias");
    expect(sent).not.toHaveProperty("harness");
  });
});

/**
 * The gate must fail closed.
 *
 * `ready` is the server's verdict on whether a résumé can be written at all.
 * Treating "absent" or "unknown" as permission is the wrong default: a stale
 * backend, a trimmed response or a partial failure would silently re-enable
 * generation for a profile that cannot support it, and the candidate would
 * discover it as a 403 after committing to a session. Only an explicit
 * `ready: true` opens the form.
 *
 * This is a regression test for exactly that bug — a deployed backend that
 * predated the `profile` block left Start fully enabled on an empty profile.
 */
test.describe("résumé — the required-field gate fails closed", () => {
  const withOptions = async (page: Page, json: unknown) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/options", (route: Route) =>
      route.fulfill({ json }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
  };

  test("blocks when the response carries no profile block at all", async ({
    page,
  }) => {
    const { profile, ...noProfile } = OPTIONS;
    await withOptions(page, noProfile);

    await expect(page.getByTestId("required-gate")).toBeVisible();
    await expect(page.getByTestId("start-session")).toHaveCount(0);
  });

  test("blocks when ready is missing from the profile", async ({ page }) => {
    await withOptions(page, {
      ...OPTIONS,
      profile: {
        name: "Jordan Reyes",
        roles: [],
        missing: [],
        optionalGaps: [],
      },
    });

    await expect(page.getByTestId("required-gate")).toBeVisible();
    await expect(page.getByTestId("start-session")).toHaveCount(0);
  });

  test("blocks while options are still loading", async ({ page }) => {
    await stubHarnessApi(page);
    // Never resolves: the pre-response state must not be an open form.
    await page.route("**/api/resume-harness/options", () => {});
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("start-session")).toHaveCount(0);
  });

  test("opens only on an explicit ready:true", async ({ page }) => {
    await withOptions(page, OPTIONS);
    await expect(page.getByTestId("required-gate")).toHaveCount(0);
    await expect(page.getByTestId("start-session")).toBeEnabled();
  });
});

/**
 * Templates and the in-session vibe change.
 *
 * The behaviour worth protecting is that a look change is a *change to a live
 * session*, not a restart: the same session id, the same content, one more
 * revision. And that applying one is deliberate — nudging a select must not
 * start a turn that costs money and takes half a minute.
 */
test.describe("résumé — templates and vibe", () => {
  test("picks a template before starting and sends it with the session", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    let sent: any = null;
    await page.route("**/api/resume-harness/sessions", async (route: Route) => {
      if (route.request().method() === "GET") return route.fallback();
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          ...SESSION,
          templateKey: sent.templateKey,
          vibe: sent.vibe,
          canRevert: false,
        },
      });
    });

    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("template-picker")).toBeVisible({
      timeout: 20_000,
    });
    // Every seeded template is offered, with a preview to choose between.
    await expect(page.getByTestId("template-card-classic-serif")).toBeVisible();
    await expect(page.getByTestId("template-card-modern-sans")).toBeVisible();
    await expect(
      page.getByTestId("template-preview-modern-sans").locator("svg"),
    ).toBeVisible();

    await page.getByTestId("template-card-modern-sans").click();
    // The knobs follow the template: modern-sans declares an accent, classic
    // declares a section order, and the picker must not offer the wrong one.
    await expect(page.getByTestId("setup-knob-accent")).toBeVisible();
    await expect(page.getByTestId("setup-knob-order")).toHaveCount(0);

    await page.getByTestId("setup-knob-accent").selectOption("navy");
    await page.getByTestId("start-session").click();
    await expect(page.getByTestId("session-bar")).toBeVisible();

    expect(sent.templateKey).toBe("modern-sans");
    expect(sent.vibe.accent).toBe("navy");
    await expect(page.getByTestId("session-template")).toHaveText(
      "Modern Sans",
    );
  });

  test("restores the active template, vibe and render after a reload", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    // Best-effort teardown may be lost; recover a sandbox still marked active.
    await page.route("**/api/resume-harness/sessions/*/end", (route) =>
      route.fulfill({ json: SESSION }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page.getByTestId("template-card-modern-sans").click();
    await page.getByTestId("setup-knob-accent").selectOption("navy");
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("session-bar")).toBeVisible();
    await expect(page.getByTestId("session-template")).toHaveText(
      "Modern Sans",
    );
    await expect(page.getByTestId("session-revision")).toHaveText("1");
    await expect(page.getByTestId("pdf-preview")).toBeVisible();
    await page.getByTestId("look-toggle").click();
    await expect(page.getByTestId("look-knob-accent")).toHaveValue("navy");
  });

  test("blocks a replacement start while an active session is still restoring", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/sessions/*/end", (route) =>
      route.fulfill({ json: SESSION }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();

    let releaseRestore!: () => void;
    const restoreReleased = new Promise<void>((resolve) => {
      releaseRestore = resolve;
    });
    await page.route(
      "**/api/resume-harness/sessions/*",
      async (route: Route) => {
        if (route.request().method() !== "GET") return route.fallback();
        await restoreReleased;
        return route.fulfill({ json: SESSION });
      },
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("start-session")).toBeDisabled();
    releaseRestore();
    await expect(page.getByTestId("session-bar")).toBeVisible();
  });

  test("keeps the active session across reloads when PDF restoration is temporarily down", async ({
    page,
    guards,
  }) => {
    guards.allowFailures(/\/api\/resume-harness\/sessions\/.*\/pdf/);
    guards.allowConsoleErrors();
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/sessions/*/end", (route) =>
      route.fulfill({ json: SESSION }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    await page.route("**/api/resume-harness/sessions/*/pdf", (route: Route) =>
      route.fulfill({
        status: 503,
        json: { message: "PDF temporarily unavailable" },
      }),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("session-bar")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("session-bar")).toBeVisible();
  });

  test("carries the résumé into a new server-routed session", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    const starts: any[] = [];
    await page.route("**/api/resume-harness/sessions", async (route: Route) => {
      if (route.request().method() === "GET") return route.fallback();
      const body = route.request().postDataJSON();
      starts.push(body);
      await route.fulfill({
        status: 201,
        json: {
          ...SESSION,
          model: body.model,
          effort: body.effort,
          templateKey: "classic-serif",
          vibe: { density: "balanced", order: "experience-first" },
          canRevert: false,
        },
      });
    });

    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });
    await page.getByTestId("start-session").click();
    const ending = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith(`/${SESSION.id}/end`),
    );
    await page.getByTestId("new-session").click();
    await ending;

    await page.getByTestId("template-card-modern-sans").click();
    await page.getByTestId("start-session").click();

    expect(starts).toHaveLength(2);
    expect(starts[1]).toMatchObject({
      model: "claude-sonnet-4-5",
      effort: "high",
      carryFromSessionId: SESSION.id,
      templateKey: "modern-sans",
    });
    expect(starts[1]).not.toHaveProperty("harness");
    await expect(page.getByTestId("session-harness")).toHaveCount(0);
  });

  test("changes the look mid-session, keeping the same session and the content", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page.getByTestId("start-session").click();
    await page
      .getByTestId("instruction")
      .fill("Build a résumé for a backend engineer.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    await page.getByTestId("look-toggle").click();

    // Nothing has moved yet, so there is nothing to apply — a turn costs money.
    await expect(page.getByTestId("apply-look")).toBeDisabled();
    await expect(page.getByTestId("look-status")).toContainText(
      /current look/i,
    );

    await page.getByTestId("look-knob-density").selectOption("compact");
    await expect(page.getByTestId("apply-look")).toBeEnabled();
    await page.getByTestId("apply-look").click();

    // Same session, one more revision — this is a change, not a restart.
    await expect(page.getByTestId("session-revision")).toHaveText("2");
    await expect(page.getByTestId("latex-source")).toContainText(
      "Jordan Reyes",
    );
    await expect(page.getByTestId("turn-summary").last()).toContainText(
      /new look/i,
    );
    await expect(page.getByTestId("look-current")).toContainText("Compact");

    await expectNoHorizontalOverflow(page, "resume-look");
  });

  test("switches template mid-session and steps back to the previous look", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    await page.getByTestId("start-session").click();
    await page.getByTestId("instruction").fill("Build my résumé.");
    await page.getByTestId("send-instruction").click();
    await expect(page.getByTestId("session-revision")).toHaveText("1");

    await page.getByTestId("look-toggle").click();
    // Nothing to go back to until something has changed.
    await expect(page.getByTestId("revert-look")).toBeDisabled();

    await page.getByTestId("look-template-modern-sans").click();
    await expect(page.getByTestId("look-status")).toContainText(
      /re-applied, not rewritten/i,
    );
    await page.getByTestId("apply-look").click();

    await expect(page.getByTestId("session-template")).toHaveText(
      "Modern Sans",
    );
    await expect(page.getByTestId("session-revision")).toHaveText("2");
    // Content carried across the switch rather than being regenerated.
    await expect(page.getByTestId("latex-source")).toContainText(
      "Jordan Reyes",
    );

    // One step back is now offered, and taking it restores the earlier look.
    await expect(page.getByTestId("look-revert-available")).toBeVisible();
    await page.getByTestId("revert-look").click();

    await expect(page.getByTestId("session-template")).toHaveText(
      "Classic Serif",
    );
    await expect(page.getByTestId("revert-look")).toBeDisabled();
  });

  test("offers no look controls when the catalogue is empty, and still generates", async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.route("**/api/resume-harness/templates", (route: Route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/app/resume", { waitUntil: "domcontentloaded" });

    // A missing catalogue is a note, not a blocker: the agent has its own
    // layout, and refusing to write a résumé over typography would be absurd.
    await expect(page.getByTestId("templates-empty")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("template-picker")).toHaveCount(0);
    await expect(page.getByTestId("start-session")).toBeEnabled();
  });
});
