import { API_URL } from "@/config/api";
import { getAccessToken } from "@/lib/apiClient";

/**
 * LaTeX résumé generation through a server-routed agent runtime.
 */
const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || "Request failed");
    // The screen distinguishes these: 403 is a plan problem, 409 is a stale
    // session, 503 means the sandbox platform is down. Same copy for all three
    // would send the candidate to the wrong fix.
    error.status = response.status;
    throw error;
  }
  return response.json();
};

/**
 * GET /api/resume-harness/options
 * -> { tier, models: [{model,label,efforts[]}],
 *      sandboxAvailable,
 *      profile: { name, headline, roles, missing[], optionalGaps[], ready } }
 *
 * `profile.missing` is the required identity the résumé cannot be written
 * without — the screen blocks on it. `profile.optionalGaps` is history worth
 * adding; it never blocks, because a thinner résumé beats a refused one and
 * both beat an invented one.
 */
export const getHarnessOptions = () => apiCall("/api/resume-harness/options");

/**
 * GET /api/resume-harness/templates
 * -> [{ key, name, description, previewSvg, constraints[], knobs[] }]
 *
 * Not tier-filtered, and deliberately so: a template is a layout, not a
 * capability. What a plan buys is the model that writes the words, which
 * `getHarnessOptions` already reports.
 */
export const getResumeTemplates = () =>
  apiCall("/api/resume-harness/templates");

/**
 * POST /api/resume-harness/sessions
 * { model, effort, targetRole?, jobDescription?, jobUrl?, carryFromSessionId?,
 *   templateKey?, vibe? }
 *   -> session
 *
 * Only per-résumé inputs are sent. Name, location, LinkedIn, work
 * authorisation and employment history are read from the account server-side
 * and injected into the sandbox — never posted from this screen, so there is
 * only ever one copy of them.
 *
 * `carryFromSessionId` copies the résumé into a new server-routed session.
 */
export const startHarnessSession = (payload) =>
  apiCall("/api/resume-harness/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/** GET /api/resume-harness/sessions/:id -> session (LaTeX included) */
export const getHarnessSession = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}`);

export const listHarnessSessions = () =>
  apiCall("/api/resume-harness/sessions");

export const renameHarnessSession = (id, name) =>
  apiCall(`/api/resume-harness/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

export const restoreHarnessRevision = (id, revision) =>
  apiCall(`/api/resume-harness/sessions/${id}/revisions/${revision}/restore`, {
    method: "POST",
  });

/**
 * POST /api/resume-harness/sessions/:id/turns
 * { instruction } -> session + { summary, pdfBase64 }
 *
 * One call for both create and update — the harness creates resume.tex if it is
 * absent and edits it in place if it is not.
 */
export const runHarnessTurn = (id, payload) =>
  apiCall(`/api/resume-harness/sessions/${id}/turns`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * POST /api/resume-harness/sessions/:id/turns/stream
 *
 * Same turn as `runHarnessTurn`, delivered as Server-Sent Events so the screen
 * can show the harness working instead of a spinner. A turn runs for tens of
 * seconds; without progress there is no way to tell a model thinking from a
 * container that has hung.
 *
 * Events: `{type:'phase'}` (writing | compiling | fixing),
 * `{type:'token', text}`, `{type:'result', session}`, `{type:'error'}`.
 *
 * Uses fetch + a stream reader rather than EventSource, because EventSource
 * cannot POST a body or set an Authorization header.
 */
const streamPost = async (path, payload, onEvent) => {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.message || "Request failed");
    error.status = res.status;
    throw error;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (frame) => {
    const data = frame.split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; a partial frame stays in the
    // buffer until its terminator arrives.
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) dispatch(frame);
  }
  buffer += decoder.decode();
  if (buffer.trim()) dispatch(buffer);
};

export const streamHarnessTurn = (id, payload, onEvent) =>
  streamPost(
    `/api/resume-harness/sessions/${id}/turns/stream`,
    payload,
    onEvent,
  );

/**
 * POST /api/resume-harness/sessions/:id/template/stream
 * { templateKey, vibe? }
 *
 * Switching template is a re-apply of the résumé the session already holds, so
 * it streams like any other turn — the harness is doing the same amount of work
 * and the screen should show it.
 */
export const streamTemplateChange = (id, payload, onEvent) =>
  streamPost(
    `/api/resume-harness/sessions/${id}/template/stream`,
    payload,
    onEvent,
  );

/** POST /api/resume-harness/sessions/:id/vibe/stream — { vibe } */
export const streamVibeChange = (id, payload, onEvent) =>
  streamPost(
    `/api/resume-harness/sessions/${id}/vibe/stream`,
    payload,
    onEvent,
  );

/**
 * POST /api/resume-harness/sessions/:id/revert-look -> session
 *
 * Not streamed: this one does not run the model. The previous source is already
 * known-good, so it is written back and rebuilt — which is the point, because
 * this exists for the case where the model's last attempt went wrong.
 */
export const revertResumeLook = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}/revert-look`, { method: "POST" });

/** GET /api/resume-harness/sessions/:id/pdf -> { pdfBase64 } */
export const getHarnessPdf = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}/pdf`);

/** Release the sandbox while retaining the document and revision history. */
export const endHarnessSession = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}/end`, { method: "POST" });

/** Archive the generated résumé and its complete session history. */
export const archiveHarnessSession = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}/archive`, { method: "POST" });

/** Return an archived generated résumé and session to the active library. */
export const restoreArchivedHarnessSession = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}/restore`, { method: "POST" });

/** Permanently delete the session and its stored artifacts. */
export const deleteHarnessSession = (id) =>
  apiCall(`/api/resume-harness/sessions/${id}`, { method: "DELETE" });

/** Best effort during navigation or tab suspension; the server also reaps idle sandboxes. */
export const endHarnessSessionKeepalive = async (id) => {
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch(`${API_URL}/api/resume-harness/sessions/${id}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  } catch {
    // A closing page cannot guarantee delivery; history remains on the server.
  }
};
