'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { ErrorState } from '@/components/app/AppStates';
import {
  endHarnessSession,
  getHarnessOptions,
  startHarnessSession,
  streamHarnessTurn,
} from '@/services/resumeHarnessApi';

/**
 * The résumé surface. One screen: set up a session, then talk to it.
 *
 * Two halves, and the split is the whole design. Before a session exists the
 * screen is a short setup form. Once it exists it becomes a conversation with
 * the document beside it — because iterating on a résumé is a dialogue
 * ("shorten the summary", "lead with the Stripe work"), not a form resubmission.
 *
 * The screen asks for the target role, an optional job posting, and
 * instructions. Everything biographical — name, location, LinkedIn, work
 * authorisation, employment history — comes from Settings and Preferences and
 * is injected server-side. Re-asking here would create a second copy that
 * drifts from the account.
 *
 * Turns stream. A harness run takes tens of seconds, so the transcript shows
 * the agent's own narration and the phase it is in rather than a spinner that
 * cannot distinguish thinking from hung.
 *
 * Templates are JOB-99; session history is JOB-105.
 */

const T = {
  bg: 'var(--jb-v3-bg)',
  panel: 'var(--jb-v3-panel)',
  sunk: 'var(--jb-v3-sunk, var(--jb-v3-panel))',
  line: 'var(--jb-v3-line)',
  fg: 'var(--jb-v3-fg)',
  fg2: 'var(--jb-v3-fg-2)',
  fg3: 'var(--jb-v3-fg-3)',
  accent: 'var(--jb-v3-accent)',
  accentInk: 'var(--jb-v3-accent-ink)',
  accentLine: 'var(--jb-v3-accent-line)',
  mono: 'var(--jb-v3-font-mono)',
  display: 'var(--jb-v3-font-display)',
};

const label = {
  fontFamily: T.mono,
  fontSize: 10.5,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: T.fg3,
};

const primaryBtn = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: T.accentInk,
  background: T.accent,
  border: 'none',
  borderRadius: 3,
  padding: '11px 20px',
  cursor: 'pointer',
  transition: 'opacity .15s ease',
};

const ghostBtn = {
  ...primaryBtn,
  color: T.accent,
  background: 'transparent',
  border: `1px solid ${T.accentLine}`,
  padding: '8px 14px',
  fontSize: 12.5,
};

const field = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  color: T.fg,
  background: T.panel,
  border: `1px solid ${T.line}`,
  borderRadius: 3,
  padding: '11px 13px',
  transition: 'border-color .15s ease',
};

const FIELD_LABELS = {
  name: 'Full name',
  email: 'Email',
  linkedin: 'LinkedIn URL',
  location: 'Location',
  experience: 'Work experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  achievements: 'Achievements',
};

const PHASE_COPY = {
  writing: 'Writing the résumé…',
  compiling: 'Compiling LaTeX…',
  fixing: 'Build failed — fixing it…',
};

export default function AppResume() {
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(null);

  const [harness, setHarness] = useState('opencode');
  const [alias, setAlias] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');

  const [session, setSession] = useState(null);
  const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [pdfBase64, setPdfBase64] = useState('');

  /** The conversation: what was asked, and what the agent did about it. */
  const [messages, setMessages] = useState([]);
  const [liveText, setLiveText] = useState('');
  const [livePhase, setLivePhase] = useState(null);
  const transcriptRef = useRef(null);

  const loadOptions = useCallback(async () => {
    setOptionsError(null);
    try {
      const res = await getHarnessOptions();
      setOptions(res);
      if (res?.harnesses?.length) {
        const preferred = res.harnesses.find((h) => h.id === 'opencode');
        setHarness((preferred || res.harnesses[0]).id);
      }
      if (res?.models?.length) setAlias(res.models[0].alias);
    } catch (e) {
      setOptionsError(e);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Keep the newest line in view while the agent narrates.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, liveText, livePhase]);

  const profile = options?.profile;

  /**
   * Fail closed.
   *
   * `ready` is the server's verdict on whether a résumé can be written at all,
   * and only an explicit `true` opens the form. Absent, undefined, still
   * loading, or a response shape we did not expect all count as "not ready" —
   * a stale backend that predates the `profile` block once left this screen
   * fully open on an empty profile, and the candidate would only have found out
   * as a 403 after committing to a session.
   */
  const blocked = profile?.ready !== true;
  const busy = phase === 'provisioning' || phase === 'working';
  const platformDown = options && options.sandboxAvailable === false;
  const sessionOver = session && session.status !== 'active';

  const start = async (carryFromSessionId) => {
    setError(null);
    setPhase('provisioning');
    try {
      const next = await startHarnessSession({
        harness,
        ...(alias ? { alias } : {}),
        ...(targetRole.trim() ? { targetRole: targetRole.trim() } : {}),
        ...(composedJobContext() ? { jobDescription: composedJobContext() } : {}),
        ...(carryFromSessionId ? { carryFromSessionId } : {}),
      });
      setSession(next);
      setPdfBase64('');
      setMessages([]);
      setPhase('ready');
    } catch (e) {
      setError(e);
      setPhase('idle');
    }
  };

  /**
   * The job context sent to the harness.
   *
   * The URLs are labelled rather than fetched: nothing in this system reads
   * them, and pretending otherwise would be worse than saying so. They give the
   * model the company's name and the posting's identity, which is usually
   * enough to pitch tone; the pasted text is what actually carries detail.
   */
  const composedJobContext = () => {
    const parts = [];
    if (jobUrl.trim()) parts.push(`Job posting URL: ${jobUrl.trim()}`);
    if (companyUrl.trim()) parts.push(`Company website: ${companyUrl.trim()}`);
    if (jobDescription.trim()) parts.push(jobDescription.trim());
    return parts.join('\n\n');
  };

  const send = async () => {
    const text = instruction.trim();
    if (!session || !text || busy) return;

    setError(null);
    setPhase('working');
    setInstruction('');
    setLiveText('');
    setLivePhase('writing');
    setMessages((m) => [...m, { role: 'you', text }]);

    try {
      await streamHarnessTurn(session.id, { instruction: text }, (event) => {
        if (event.type === 'phase') setLivePhase(event.phase);
        else if (event.type === 'token') setLiveText((t) => (t + event.text).slice(-4000));
        else if (event.type === 'result') {
          const s = event.session;
          setSession(s);
          if (s.pdfBase64) setPdfBase64(s.pdfBase64);
          setMessages((m) => [
            ...m,
            {
              role: 'agent',
              text: s.summary || 'Done.',
              compiled: s.compiled,
              revision: s.revision,
            },
          ]);
        } else if (event.type === 'error') {
          const err = new Error(event.message);
          err.status = event.status;
          setError(err);
        }
      });
    } catch (e) {
      setError(e);
    } finally {
      setLiveText('');
      setLivePhase(null);
      setPhase('ready');
    }
  };

  const end = async () => {
    if (!session) return;
    try {
      setSession(await endHarnessSession(session.id));
    } catch (e) {
      setError(e);
    }
  };

  /**
   * The compiled file lives only inside the session sandbox and dies with it,
   * so downloading is the only durable copy until JOB-105 persists artifacts.
   */
  const downloadPdf = () => {
    if (!pdfBase64) return;
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(targetRole || 'resume').replace(/[^\w-]+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (optionsError) {
    return (
      <Shell>
        <ErrorState error={optionsError} onRetry={loadOptions} />
      </Shell>
    );
  }

  return (
    <Shell>
      <style jsx global>{`
        @keyframes jbPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes jbRise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        #jbres input:focus,
        #jbres textarea:focus,
        #jbres select:focus {
          outline: none;
          border-color: var(--jb-v3-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 14%, transparent);
        }
      `}</style>

      <div id="jbres" style={{ padding: '28px 32px 64px', maxWidth: 1240, margin: '0 auto' }}>
        {!session ? (
          <Setup
            {...{
              options,
              profile,
              blocked,
              platformDown,
              error,
              harness,
              setHarness,
              alias,
              setAlias,
              targetRole,
              setTargetRole,
              jobDescription,
              setJobDescription,
              jobUrl,
              setJobUrl,
              companyUrl,
              setCompanyUrl,
              busy,
              phase,
              start,
            }}
          />
        ) : (
          <Workspace
            {...{
              session,
              sessionOver,
              messages,
              liveText,
              livePhase,
              transcriptRef,
              instruction,
              setInstruction,
              send,
              busy,
              phase,
              error,
              pdfBase64,
              downloadPdf,
              end,
              start,
            }}
          />
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ setup --- */

function Setup(p) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ ...label, color: T.accent, marginBottom: 10 }}>Résumé</div>
      <h1
        style={{
          fontFamily: T.display,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          fontSize: 38,
          lineHeight: 1.03,
          margin: '0 0 10px',
        }}
      >
        Write it with an agent.
      </h1>
      <p style={{ fontSize: 15.5, color: T.fg3, margin: '0 0 28px', lineHeight: 1.55 }}>
        Your details come straight from your account — you never retype them here.
        Give it a target, then shape the result in conversation.
      </p>

      {p.platformDown && (
        <Notice
          data-testid="platform-unavailable"
          text="The sandbox platform is unreachable, so new sessions cannot start right now."
        />
      )}
      {p.error && (
        <Notice
          tone="error"
          data-testid="harness-error"
          text={
            p.error.status === 403
              ? `${p.error.message} Upgrade your plan to use a stronger model.`
              : p.error.message
          }
        />
      )}

      {!p.options ? (
        // Still asking the server whether generation is possible. Showing the
        // form here would be the fail-open bug in a different costume, and
        // showing the red gate would accuse a profile we have not read yet.
        <div
          data-testid="options-loading"
          style={{
            border: `1px solid ${T.line}`,
            background: T.panel,
            borderRadius: 3,
            padding: '22px 24px',
            fontSize: 13.5,
            color: T.fg3,
          }}
        >
          Checking your profile…
        </div>
      ) : p.blocked ? (
        <RequiredGate profile={p.profile} />
      ) : (
        <>
          <ProfileFacts profile={p.profile} />
          <SetupForm {...p} />
        </>
      )}
    </div>
  );
}

/**
 * The hard stop when required identity is missing.
 *
 * This replaces the setup form rather than greying it out. A disabled form
 * invites the candidate to fill it in and only reveals the real problem at the
 * last click; removing it makes the one available action unambiguous. The
 * fields live in Settings, so that is where the single call to action goes.
 */
function RequiredGate({ profile }) {
  const missing = profile?.missing || [];
  // The server said "not ready" but did not say which fields. Naming nothing is
  // better than naming the wrong thing, so fall back to what is always
  // required and say plainly that we could not read the profile.
  const unknown = missing.length === 0;

  return (
    <div
      data-testid="required-gate"
      style={{
        border: '1px solid #e6b8ba',
        background: 'color-mix(in srgb, #b4232a 4%, var(--jb-v3-panel))',
        borderRadius: 3,
        padding: '26px 28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#b4232a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          !
        </span>
        <h2
          style={{
            fontFamily: T.display,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: 0,
            color: '#b4232a',
          }}
        >
          Finish your profile before generating
        </h2>
      </div>

      <p style={{ fontSize: 14, color: T.fg2, margin: '0 0 18px', lineHeight: 1.6, maxWidth: 560 }}>
        {unknown
          ? 'We could not confirm your profile is complete, so generation is held back. Check that these are filled in — a résumé is written from your account, not from this page.'
          : 'A résumé is written from your account, not from this page — so these details have to exist before an agent can write one. Without them it would have to invent your name or leave an employer no way to reach you.'}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px' }}>
        {(unknown ? ['name', 'email', 'linkedin', 'location'] : missing).map((f) => (
          <li
            key={f}
            data-testid={`gate-field-${f}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 0',
              borderBottom: `1px solid ${T.line}`,
              fontSize: 14,
              color: T.fg,
            }}
          >
            <span aria-hidden="true" style={{ color: '#b4232a', fontWeight: 700 }}>
              *
            </span>
            {FIELD_LABELS[f] || f}
            <span style={{ flex: 1 }} />
            <span style={{ ...label, fontSize: 10, color: '#b4232a' }}>
              {unknown ? 'Required' : 'Missing'}
            </span>
          </li>
        ))}
      </ul>

      <Link
        data-testid="gate-cta"
        href="/app/settings"
        style={{
          ...primaryBtn,
          display: 'inline-block',
          textDecoration: 'none',
          background: '#b4232a',
          color: '#fff',
        }}
      >
        Add these in Settings →
      </Link>
    </div>
  );
}

/**
 * Model and effort as two controls over one alias list.
 *
 * The backend namespaces aliases as provider+model+effort and hands over only
 * the ones the caller's tier permits, so both dropdowns are derived from that
 * list rather than from any table in this file — there is no hardcoded model
 * name or effort ladder here, and a new alias appears without a frontend change.
 *
 * Effort is its own control because it is the dial a candidate actually reaches
 * for: same model, more care, more cost. Folded into a single "Sonnet · thorough"
 * line it reads as a different model, and the choice disappears.
 */
function ModelAndEffort({ models, alias, setAlias, tier }) {
  if (!models.length) {
    return (
      <Field title="Model and effort">
        <p style={{ fontSize: 13.5, color: T.fg3, margin: 0 }}>
          No model is enabled on your plan yet.{' '}
          <Link href="/app/upgrade" style={{ color: T.accent }}>
            See plans →
          </Link>
        </p>
      </Field>
    );
  }

  const selected = models.find((m) => m.alias === alias) || models[0];

  // Distinct models, in the order the backend ranked them.
  const byModel = [];
  for (const m of models) {
    if (!byModel.some((x) => x.model === m.model)) byModel.push(m);
  }

  // Efforts available for the chosen model — the set differs per model, so
  // this is recomputed rather than assumed.
  const efforts = models.filter((m) => m.model === selected.model);

  const pickModel = (model) => {
    // Keep the current effort if the new model offers it; otherwise take that
    // model's first, so switching model never lands on an alias that does not
    // exist.
    const forModel = models.filter((m) => m.model === model);
    const sameEffort = forModel.find((m) => m.effort === selected.effort);
    setAlias((sameEffort || forModel[0]).alias);
  };

  return (
    <Field title="Model and effort">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520 }}>
        <div>
          <span style={{ ...label, fontSize: 9.5, display: 'block', marginBottom: 6 }}>
            Model
          </span>
          <select
            data-testid="model-select"
            value={selected.model}
            onChange={(e) => pickModel(e.target.value)}
            style={field}
          >
            {byModel.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span style={{ ...label, fontSize: 9.5, display: 'block', marginBottom: 6 }}>
            Effort
          </span>
          <select
            data-testid="effort-select"
            value={selected.effort}
            onChange={(e) => {
              const next = efforts.find((m) => m.effort === e.target.value);
              if (next) setAlias(next.alias);
            }}
            disabled={efforts.length < 2}
            style={{ ...field, opacity: efforts.length < 2 ? 0.6 : 1 }}
          >
            {efforts.map((m) => (
              <option key={m.alias} value={m.effort}>
                {m.effort}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The resolved alias, so what actually gets billed is never a guess. */}
      <p data-testid="resolved-alias" style={{ ...label, fontSize: 10, marginTop: 10 }}>
        {selected.alias}
      </p>

      <Hint>
        {efforts.length < 2
          ? `This model runs at a single effort level. Available on your ${tier || 'current'} plan.`
          : `Higher effort means more careful work and more cost. Available on your ${tier || 'current'} plan.`}
      </Hint>
    </Field>
  );
}

function SetupForm(p) {
  return (
    <>
      <Card testId="harness-picker">
        <Field title="Target role">
          <input
            data-testid="target-role"
            value={p.targetRole}
            onChange={(e) => p.setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            style={field}
          />
        </Field>

        <Field
          title="The job you're applying to"
          hint="All optional. Pasted text carries the most detail — the links mainly tell the agent who you're writing for."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              data-testid="job-url"
              value={p.jobUrl}
              onChange={(e) => p.setJobUrl(e.target.value)}
              placeholder="Job posting URL"
              style={field}
            />
            <input
              data-testid="company-url"
              value={p.companyUrl}
              onChange={(e) => p.setCompanyUrl(e.target.value)}
              placeholder="Company website"
              style={field}
            />
            <textarea
              data-testid="job-description"
              value={p.jobDescription}
              onChange={(e) => p.setJobDescription(e.target.value)}
              rows={5}
              placeholder="Paste the job description. It shapes emphasis and wording — it never adds experience you don't have."
              style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>
        </Field>

        <Field title="Agent">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(p.options?.harnesses || []).map((h) => {
              const on = p.harness === h.id;
              return (
                <button
                  key={h.id}
                  data-testid={`harness-${h.id}`}
                  aria-pressed={on}
                  onClick={() => p.setHarness(h.id)}
                  style={{
                    ...ghostBtn,
                    fontSize: 13,
                    padding: '9px 16px',
                    color: on ? T.accentInk : T.fg2,
                    background: on ? T.accent : 'transparent',
                    borderColor: on ? T.accent : T.line,
                  }}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
          <Hint>
            Fixed for the life of the session. To change it, start a new one —
            your résumé comes with you.
          </Hint>
        </Field>

        <ModelAndEffort
          models={p.options?.models || []}
          alias={p.alias}
          setAlias={p.setAlias}
          tier={p.options?.tier}
        />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            data-testid="start-session"
            onClick={() => p.start()}
            disabled={p.busy || p.platformDown || !p.options?.models?.length}
            style={{
              ...primaryBtn,
              opacity: p.busy || p.platformDown ? 0.45 : 1,
            }}
          >
            {p.phase === 'provisioning' ? 'Provisioning sandbox…' : 'Start session'}
          </button>
        </div>
      </Card>
    </>
  );
}

/* -------------------------------------------------------------- workspace --- */

function Workspace(p) {
  const { session } = p;
  return (
    <>
      <div
        data-testid="session-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          flexWrap: 'wrap',
          background: T.panel,
          border: `1px solid ${T.line}`,
          borderRadius: 3,
          padding: '12px 18px',
          marginBottom: 16,
        }}
      >
        <Stat k="Agent" v={session.harnessLabel} testId="session-harness" />
        <Stat k="Model" v={session.model} testId="session-model" />
        <Stat k="Effort" v={session.effort} testId="session-effort" />
        <Stat k="Revision" v={String(session.revision)} testId="session-revision" />
        <Stat
          k="Build"
          v={session.compiled ? 'passing' : session.revision ? 'failing' : '—'}
          testId="session-build"
          tone={session.revision && !session.compiled ? 'bad' : 'ok'}
        />
        <div style={{ flex: 1 }} />
        {p.pdfBase64 && (
          <button data-testid="download-pdf" onClick={p.downloadPdf} style={ghostBtn}>
            Download PDF
          </button>
        )}
        {!p.sessionOver && (
          <button data-testid="end-session" onClick={p.end} style={ghostBtn}>
            End session
          </button>
        )}
        <button
          data-testid="switch-harness"
          onClick={() => p.start(session.id)}
          disabled={p.busy}
          style={ghostBtn}
        >
          New session, other agent
        </button>
      </div>

      {p.sessionOver && (
        <Notice
          data-testid="session-ended"
          text="This session has ended and its sandbox is released. Download the PDF before leaving — it is not kept after teardown."
        />
      )}
      {p.error && (
        <Notice tone="error" data-testid="harness-error" text={p.error.message} />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 5fr) minmax(0, 7fr)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* ---- conversation ---- */}
        <section
          style={{
            background: T.panel,
            border: `1px solid ${T.line}`,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            height: 640,
          }}
        >
          <div style={{ ...label, padding: '12px 18px', borderBottom: `1px solid ${T.line}` }}>
            Conversation
          </div>

          <div
            ref={p.transcriptRef}
            data-testid="transcript"
            style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {!p.messages.length && !p.livePhase && (
              <p style={{ fontSize: 13.5, color: T.fg3, margin: 0, lineHeight: 1.6 }}>
                Describe the résumé you want. Then keep going — “shorten the
                summary”, “lead with the payments work”, “make it one page”.
              </p>
            )}

            {p.messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}

            {p.livePhase && (
              <div data-testid="live-status" style={{ animation: 'jbRise .2s ease' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: T.accent,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: T.accent,
                      animation: 'jbPulse 1.1s ease-in-out infinite',
                    }}
                  />
                  {PHASE_COPY[p.livePhase] || 'Working…'}
                </div>
                {p.liveText && (
                  <pre
                    data-testid="live-tokens"
                    style={{
                      margin: '8px 0 0',
                      padding: 12,
                      background: T.sunk,
                      border: `1px solid ${T.line}`,
                      borderRadius: 3,
                      fontFamily: T.mono,
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: T.fg3,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 220,
                      overflow: 'auto',
                    }}
                  >
                    {p.liveText}
                  </pre>
                )}
              </div>
            )}
          </div>

          {!p.sessionOver && (
            <div style={{ borderTop: `1px solid ${T.line}`, padding: 14, display: 'flex', gap: 10 }}>
              <input
                data-testid="instruction"
                value={p.instruction}
                onChange={(e) => p.setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && p.send()}
                disabled={p.busy}
                placeholder={
                  session.revision
                    ? 'What should change?'
                    : 'Build my résumé from my profile'
                }
                style={{ ...field, flex: 1 }}
              />
              <button
                data-testid="send-instruction"
                onClick={p.send}
                disabled={p.busy || !p.instruction.trim()}
                style={{
                  ...primaryBtn,
                  opacity: p.busy || !p.instruction.trim() ? 0.45 : 1,
                }}
              >
                {p.busy ? 'Working…' : session.revision ? 'Update' : 'Generate'}
              </button>
            </div>
          )}
        </section>

        {/* ---- the document ---- */}
        <section
          style={{
            background: T.panel,
            border: `1px solid ${T.line}`,
            borderRadius: 3,
            overflow: 'hidden',
            height: 640,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              ...label,
              padding: '12px 18px',
              borderBottom: `1px solid ${T.line}`,
              display: 'flex',
              gap: 14,
            }}
          >
            <span>Rendered</span>
            <div style={{ flex: 1 }} />
            {p.busy && <span style={{ color: T.accent }}>updating…</span>}
          </div>

          {p.pdfBase64 ? (
            <iframe
              data-testid="pdf-preview"
              title="Rendered résumé"
              src={`data:application/pdf;base64,${p.pdfBase64}`}
              style={{ flex: 1, width: '100%', border: 'none', opacity: p.busy ? 0.55 : 1, transition: 'opacity .2s ease' }}
            />
          ) : (
            <div
              data-testid="pdf-empty"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                textAlign: 'center',
                fontSize: 13.5,
                color: T.fg3,
              }}
            >
              {p.busy
                ? 'Compiling your résumé…'
                : 'Your résumé appears here once it compiles.'}
            </div>
          )}

          <details style={{ borderTop: `1px solid ${T.line}` }}>
            <summary style={{ ...label, padding: '11px 18px', cursor: 'pointer' }}>
              resume.tex
            </summary>
            <pre
              data-testid="latex-source"
              style={{
                margin: 0,
                padding: 18,
                fontFamily: T.mono,
                fontSize: 11.5,
                lineHeight: 1.6,
                color: T.fg2,
                overflow: 'auto',
                maxHeight: 260,
                whiteSpace: 'pre-wrap',
                borderTop: `1px solid ${T.line}`,
              }}
            >
              {session.latex || 'Nothing yet.'}
            </pre>
          </details>
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ small pieces --- */

function Bubble({ message }) {
  const you = message.role === 'you';
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '86%',
          background: you ? T.accent : T.sunk,
          color: you ? T.accentInk : T.fg2,
          border: you ? 'none' : `1px solid ${T.line}`,
          borderRadius: 3,
          padding: '10px 13px',
          fontSize: 13.5,
          lineHeight: 1.55,
          animation: 'jbRise .2s ease',
        }}
      >
        {message.text}
        {!you && message.revision != null && (
          <div style={{ ...label, fontSize: 10, marginTop: 7, color: message.compiled ? T.fg3 : '#b4232a' }}>
            revision {message.revision} · build {message.compiled ? 'passing' : 'failing'}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileFacts({ profile }) {
  if (!profile) return null;
  const missing = profile.missing || [];
  const gaps = profile.optionalGaps || [];

  return (
    <div
      data-testid="profile-facts"
      style={{
        background: T.panel,
        border: `1px solid ${missing.length ? '#e6b8ba' : T.line}`,
        borderRadius: 3,
        padding: '15px 18px',
        marginBottom: 18,
      }}
    >
      <div style={{ ...label, marginBottom: 9 }}>Written from your account</div>
      {profile.name && (
        <p style={{ fontSize: 14, margin: '0 0 2px' }}>
          <strong>{profile.name}</strong>
          {profile.headline ? ` · ${profile.headline}` : ''}
        </p>
      )}
      {missing.length > 0 && (
        <p data-testid="profile-missing" style={{ fontSize: 13, color: '#b4232a', margin: '8px 0 0', lineHeight: 1.5 }}>
          Required before generating: {missing.map((f) => FIELD_LABELS[f] || f).join(', ')}.{' '}
          <Link href="/app/settings" style={{ color: T.accent, fontWeight: 600 }}>
            Add in Settings →
          </Link>
        </p>
      )}
      {gaps.length > 0 && (
        <p data-testid="profile-gaps" style={{ fontSize: 12.5, color: T.fg3, margin: '8px 0 0', lineHeight: 1.5 }}>
          Optional, and your résumé will be stronger with them:{' '}
          {gaps.map((f) => FIELD_LABELS[f] || f).join(', ')}.{' '}
          <Link href="/app/settings" style={{ color: T.accent }}>
            Add in Settings →
          </Link>
        </p>
      )}
      {!missing.length && !gaps.length && (
        <p style={{ fontSize: 12.5, color: T.fg3, margin: '8px 0 0' }}>
          Your profile is complete — nothing else needed here.
        </p>
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <>
      <Head>
        <title>Résumé · Jobocate</title>
      </Head>
      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.display, color: T.fg }}>
        <AppTopNav />
        <main>{children}</main>
      </div>
    </>
  );
}

function Card({ children, testId }) {
  return (
    <div
      data-testid={testId}
      style={{
        background: T.panel,
        border: `1px solid ${T.line}`,
        borderRadius: 3,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {children}
    </div>
  );
}

function Field({ title, hint, children }) {
  return (
    <div>
      <div style={{ ...label, marginBottom: hint ? 5 : 10 }}>{title}</div>
      {hint && <Hint style={{ marginBottom: 11 }}>{hint}</Hint>}
      {children}
    </div>
  );
}

function Hint({ children, style }) {
  return (
    <p style={{ fontSize: 12.5, color: T.fg3, margin: '9px 0 0', lineHeight: 1.5, ...style }}>
      {children}
    </p>
  );
}

function Stat({ k, v, testId, tone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ ...label, fontSize: 9.5 }}>{k}</span>
      <span
        data-testid={testId}
        style={{ fontSize: 13.5, fontWeight: 600, color: tone === 'bad' ? '#b4232a' : T.fg }}
      >
        {v}
      </span>
    </div>
  );
}

function Notice({ tone, text, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        border: `1px solid ${tone === 'error' ? '#e6b8ba' : T.line}`,
        background: T.panel,
        borderRadius: 3,
        padding: '12px 16px',
        fontSize: 13.5,
        color: tone === 'error' ? '#b4232a' : T.fg2,
        marginBottom: 16,
      }}
    >
      {text}
    </div>
  );
}
