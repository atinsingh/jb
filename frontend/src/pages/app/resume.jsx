'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { ErrorState } from '@/components/app/AppStates';
import {
  endHarnessSession,
  endHarnessSessionKeepalive,
  getHarnessPdf,
  getHarnessOptions,
  getHarnessSession,
  getResumeTemplates,
  restoreHarnessRevision,
  revertResumeLook,
  startHarnessSession,
  streamHarnessTurn,
  streamTemplateChange,
  streamVibeChange,
} from '@/services/resumeHarnessApi';
import {
  getLatestAtsSession,
  runAtsSession,
  startAtsSession,
} from '@/services/atsApi';

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
 * The look — template plus a handful of knobs — is chosen before the session
 * and changeable at any point during it. That asymmetry with the agent picker
 * is deliberate and is stated on both controls: changing the agent needs a new
 * sandbox, changing the look does not.
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
  relayout: 'Re-applying to the new look…',
};

const ACTIVE_SESSION_KEY = 'jobocate.resumeHarness.activeSessionId';

export default function AppResume() {
  const router = useRouter();
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(null);

  /** The seeded template catalogue, and the look the next session will use. */
  const [templates, setTemplates] = useState(null);
  const [templateKey, setTemplateKey] = useState('');
  const [vibe, setVibe] = useState({});

  const [harness, setHarness] = useState('opencode');
  const [alias, setAlias] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');

  const [session, setSession] = useState(null);
  const lifecycleEnded = useRef(new Set());
  const sessionRef = useRef(null);
  const pdfRequestRef = useRef(0);
  sessionRef.current = session;
  const [sessionRestoreDone, setSessionRestoreDone] = useState(false);
  const [carryFromSessionId, setCarryFromSessionId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [pdfBase64, setPdfBase64] = useState('');
  const [ats, setAts] = useState(null);
  const [atsBusy, setAtsBusy] = useState(false);
  const [atsWarning, setAtsWarning] = useState('');

  /** The conversation: what was asked, and what the agent did about it. */
  const [messages, setMessages] = useState([]);
  const [liveActivities, setLiveActivities] = useState([]);
  const [livePhase, setLivePhase] = useState(null);
  const transcriptRef = useRef(null);

  useEffect(() => {
    const release = (unmounting = false) => {
      const current = sessionRef.current;
      if (current?.status !== 'active' || lifecycleEnded.current.has(current.id)) return;
      lifecycleEnded.current.add(current.id);
      void endHarnessSessionKeepalive(current.id);
      if (!unmounting) setSession((value) => value?.id === current.id ? { ...value, status: 'ended' } : value);
    };
    const pagehide = () => release();
    const visibilitychange = () => {
      if (document.visibilityState === 'hidden') release();
    };
    window.addEventListener('pagehide', pagehide);
    document.addEventListener('visibilitychange', visibilitychange);
    return () => {
      window.removeEventListener('pagehide', pagehide);
      document.removeEventListener('visibilitychange', visibilitychange);
      pdfRequestRef.current += 1;
      release(true);
    };
  }, []);

  const acceptSession = useCallback((response) => {
    const current = lifecycleEnded.current.has(response.id)
      ? { ...response, status: 'ended' } : response;
    sessionRef.current = current;
    setSession(current);
    if (current.status !== 'active' && window.sessionStorage.getItem(ACTIVE_SESSION_KEY) === current.id) {
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    }
    return current;
  }, []);

  const selectSession = useCallback((response) => {
    pdfRequestRef.current += 1;
    const current = acceptSession(response);
    setHarness(current.harness);
    setAlias(current.alias);
    setTargetRole(current.targetRole || '');
    setJobDescription(current.jobDescription || '');
    setJobUrl(current.jobUrl || '');
    setTemplateKey(current.templateKey || '');
    setVibe(current.vibe || {});
    setMessages(sessionMessages(current));
    setInstruction('');
    setPdfBase64('');
    return current;
  }, [acceptSession]);

  const loadPdf = useCallback(async (current, cancelled = () => false) => {
    const request = ++pdfRequestRef.current;
    if (!current.hasCurrentPdf) return;
    const isCurrent = () => !cancelled()
      && request === pdfRequestRef.current
      && sessionRef.current?.id === current.id
      && sessionRef.current?.revision === current.revision;
    try {
      const pdf = await getHarnessPdf(current.id);
      if (isCurrent()) setPdfBase64(pdf?.pdfBase64 || '');
    } catch {
      if (isCurrent()) setPdfBase64('');
    }
  }, []);

  const loadOptions = useCallback(async () => {
    setOptionsError(null);
    try {
      const res = await getHarnessOptions();
      const models = offeredModels(res?.models);
      setOptions({ ...res, models });
      if (res?.harnesses?.length) {
        const preferred = res.harnesses.find((h) => h.id === 'opencode');
        setHarness((preferred || res.harnesses[0]).id);
      }
      if (models.length) setAlias(models[0].alias);
    } catch (e) {
      setOptionsError(e);
    }
  }, []);

  /**
   * The catalogue loads separately from `options`.
   *
   * A failure here must not take the screen down: a résumé without a chosen
   * template is still a résumé, and the backend falls back to the catalogue
   * default. So this sets an empty list and the picker says so, rather than
   * throwing the candidate to the error state.
   */
  const loadTemplates = useCallback(async () => {
    try {
      const list = await getResumeTemplates();
      setTemplates(list);
      if (list.length) {
        setTemplateKey((current) => current || list[0].key);
        setVibe((current) =>
          Object.keys(current).length ? current : defaultVibe(list[0]),
        );
      }
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadTemplates();
  }, [loadOptions, loadTemplates]);

  useEffect(() => {
    if (!router.isReady) return undefined;
    const requestedSessionId =
      typeof router.query.session === 'string' ? router.query.session : '';
    const sessionId =
      requestedSessionId || window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (!sessionId) {
      setSessionRestoreDone(true);
      return undefined;
    }

    setPhase('working');
    let cancelled = false;
    const restore = async () => {
      try {
        const current = await getHarnessSession(sessionId);
        if (cancelled) return;
        if (!requestedSessionId && current.status !== 'active') {
          window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
          return;
        }

        selectSession(current);
        if (current.status === 'active') {
          window.sessionStorage.setItem(ACTIVE_SESSION_KEY, current.id);
        }
        // A transient PDF failure must not discard the restored session ID.
        await loadPdf(current, () => cancelled);
      } catch (e) {
        if (!cancelled) {
          window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
          if (requestedSessionId) setError(e);
        }
      } finally {
        if (!cancelled) {
          setSessionRestoreDone(true);
          setPhase('ready');
        }
      }
    };
    restore();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.session, selectSession, loadPdf]);

  useEffect(() => {
    if (!session?.id || !session.revision) {
      setAts(null);
      setAtsWarning('');
      return undefined;
    }
    setAtsWarning('');
    let cancelled = false;
    getLatestAtsSession(session.id)
      .then((result) => {
        if (!cancelled) setAts(result);
      })
      .catch((error) => {
        if (!cancelled) {
          if (error?.status === 404) {
            // A new résumé revision normally has no ATS result yet. That is an
            // empty state, not an outage; the candidate can start the first
            // analysis with the button beside it.
            setAts(null);
          } else {
            setAtsWarning('ATS analysis is temporarily unavailable. Your résumé is still saved and editable.');
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.revision]);

  // Keep the newest line in view while the agent narrates.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, liveActivities, livePhase]);

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

  const start = async (requestedSourceSessionId) => {
    if (!sessionRestoreDone) return;
    const sourceSessionId = requestedSourceSessionId || carryFromSessionId;
    setError(null);
    setPhase('provisioning');
    try {
      const next = await startHarnessSession({
        harness,
        ...(alias ? { alias } : {}),
        ...(targetRole.trim() ? { targetRole: targetRole.trim() } : {}),
        ...(composedPastedJobDescription() ? { jobDescription: composedPastedJobDescription() } : {}),
        ...(jobUrl.trim() ? { jobUrl: jobUrl.trim() } : {}),
        ...(sourceSessionId ? { carryFromSessionId: sourceSessionId } : {}),
        // These are also sent while carrying. They begin as the source
        // session's look, and any visible setup change must be honoured.
        ...(templateKey ? { templateKey } : {}),
        ...(Object.keys(vibe).length ? { vibe } : {}),
      });
      sessionRef.current = next;
      setSession(next);
      setCarryFromSessionId('');
      window.sessionStorage.setItem(ACTIVE_SESSION_KEY, next.id);
      setTemplateKey(next.templateKey || '');
      setVibe(next.vibe || {});
      setJobUrl(next.jobUrl || jobUrl.trim());
      setPdfBase64('');
      setMessages([]);
      await loadPdf(next);
      setPhase('ready');
    } catch (e) {
      setError(e);
      setPhase('idle');
    }
  };

  const chooseOtherHarness = async () => {
    if (!session || busy) return;
    setError(null);
    setPhase('working');
    try {
      if (session.status === 'active') {
        lifecycleEnded.current.add(session.id);
        await endHarnessSession(session.id);
      }
      const alternative = options?.harnesses?.find(
        (item) => item.id !== session.harness,
      );
      if (alternative) setHarness(alternative.id);
      setCarryFromSessionId(session.id);
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      setSession(null);
      setPdfBase64('');
    } catch (e) {
      lifecycleEnded.current.delete(session.id);
      setError(e);
    } finally {
      setPhase('idle');
    }
  };

  /** Pasted text wins; the backend resolves jobUrl only when this is empty. */
  const composedPastedJobDescription = () => {
    const parts = [];
    if (jobDescription.trim()) parts.push(jobDescription.trim());
    if (jobDescription.trim() && companyUrl.trim()) {
      parts.push(`Company website: ${companyUrl.trim()}`);
    }
    return parts.join('\n\n');
  };

  const send = async () => {
    const text = instruction.trim();
    if (!session || sessionOver || !text || busy) return;

    setError(null);
    setPhase('working');
    setInstruction('');
    setLiveActivities([]);
    setLivePhase('writing');
    setMessages((m) => [...m, { role: 'you', text }]);

    try {
      await streamHarnessTurn(session.id, { instruction: text }, (event) => {
        if (event.type === 'phase') setLivePhase(event.phase);
        else if (event.type === 'activity') {
          setLiveActivities((current) => upsertActivity(current, event.activity));
        }
        else if (event.type === 'result') {
          const s = acceptSession(event.session);
          if (s.pdfBase64) setPdfBase64(s.pdfBase64);
          setMessages(sessionMessages(s));
        } else if (event.type === 'error') {
          const err = new Error(event.message);
          err.status = event.status;
          setError(err);
        }
      });
    } catch (e) {
      setError(e);
    } finally {
      setLiveActivities([]);
      setLivePhase(null);
      setPhase('ready');
    }
  };

  /**
   * Choose a template before the session exists.
   *
   * The knobs reset to the new template's defaults, keeping any choice the new
   * template still offers. Carrying a setting the new template never declared
   * would show a control that cannot do anything.
   */
  const pickTemplate = (key) => {
    const next = (templates || []).find((t) => t.key === key);
    if (!next) return;
    setTemplateKey(key);
    setVibe((current) => mergeVibe(next, current));
  };

  /**
   * Apply a look change to the live session.
   *
   * One streamed turn, exactly like an instruction: the backend rewrites the
   * context files, then asks the harness to re-apply the résumé to them. The
   * transcript records it as a message so the change is visible in the same
   * place every other change is.
   */
  const applyLook = async (next) => {
    if (!session || sessionOver || busy) return;
    const changingTemplate =
      next.templateKey && next.templateKey !== session.templateKey;

    setError(null);
    setPhase('working');
    setLiveActivities([]);
    setLivePhase('relayout');
    setMessages((m) => [
      ...m,
      {
        role: 'you',
        text: changingTemplate
          ? `Switch to the ${templateName(templates, next.templateKey)} template.`
          : `Change the look: ${describeVibe(templates, session.templateKey, next.vibe)}.`,
      },
    ]);

    const handle = (event) => {
      if (event.type === 'phase') setLivePhase(event.phase);
      else if (event.type === 'activity') {
        setLiveActivities((current) => upsertActivity(current, event.activity));
      }
      else if (event.type === 'result') {
        const s = acceptSession(event.session);
        setTemplateKey(s.templateKey || '');
        setVibe(s.vibe || {});
        if (s.pdfBase64) setPdfBase64(s.pdfBase64);
        setMessages((m) => [
          ...m,
          {
            role: 'agent',
            text: s.summary || 'Re-applied the résumé to the new look.',
            compiled: s.compiled,
            revision: s.revision,
          },
        ]);
      } else if (event.type === 'error') {
        const err = new Error(event.message);
        err.status = event.status;
        setError(err);
      }
    };

    try {
      if (changingTemplate) {
        await streamTemplateChange(
          session.id,
          { templateKey: next.templateKey, ...(next.vibe ? { vibe: next.vibe } : {}) },
          handle,
        );
      } else {
        await streamVibeChange(session.id, { vibe: next.vibe }, handle);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLiveActivities([]);
      setLivePhase(null);
      setPhase('ready');
    }
  };

  /** One step back. No model turn — the previous source is already good. */
  const revertLook = async () => {
    if (!session || sessionOver || busy) return;
    setError(null);
    setPhase('working');
    try {
      const s = acceptSession(await revertResumeLook(session.id));
      setTemplateKey(s.templateKey || '');
      setVibe(s.vibe || {});
      if (s.pdfBase64) setPdfBase64(s.pdfBase64);
      setMessages((m) => [
        ...m,
        { role: 'you', text: 'Go back to the previous look.' },
        {
          role: 'agent',
          text: s.summary || 'Restored the previous look.',
          compiled: s.compiled,
          revision: s.revision,
        },
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setPhase('ready');
    }
  };

  const end = async () => {
    if (!session || sessionOver || busy) return;
    setPhase('working');
    try {
      lifecycleEnded.current.add(session.id);
      acceptSession(await endHarnessSession(session.id));
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (e) {
      lifecycleEnded.current.delete(session.id);
      setError(e);
    } finally {
      setPhase('ready');
    }
  };

  const runAts = async () => {
    if (!session?.revision || sessionOver || atsBusy) return;
    const description = (session.jobDescription || jobDescription).trim();
    if (!description) return;
    setAtsBusy(true);
    setAtsWarning('');
    try {
      const logicalSession = ats || await startAtsSession({
        resumeSessionId: session.id,
        sourceRevision: session.revision,
        jobDescription: description,
      });
      setAts(logicalSession);
      const analysis = await runAtsSession(logicalSession.id);
      setAts(analysis);
      if (analysis.status === 'failed') {
        setAtsWarning(
          analysis.unavailableReason ||
            'ATS analysis is temporarily unavailable. Your résumé is still saved and editable.',
        );
      }
    } catch (e) {
      setAtsWarning(
        e?.message
          ? `ATS analysis is temporarily unavailable: ${e.message}`
          : 'ATS analysis is temporarily unavailable. Your résumé is still saved and editable.',
      );
    } finally {
      setAtsBusy(false);
    }
  };

  const restoreRevision = async (revision) => {
    if (!session || busy) return;
    setError(null);
    setPhase('working');
    try {
      await restoreHarnessRevision(session.id, revision);
      const current = selectSession(await getHarnessSession(session.id));
      await loadPdf(current);
    } catch (e) {
      setError(e);
    } finally {
      setPhase('ready');
    }
  };

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
        /*
         * Setup is two columns: what you type on the left, what it will look
         * like on the right. The form is a narrow reading column and does not
         * want the full 1240px, so the space beside it was simply empty.
         */
        .jbres-setup {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
          gap: 18px;
          align-items: start;
        }
        /* The picker follows you down a long form rather than scrolling away. */
        .jbres-aside {
          position: sticky;
          top: 20px;
        }
        @media (max-width: 1060px) {
          .jbres-setup {
            grid-template-columns: minmax(0, 1fr);
          }
          .jbres-aside {
            position: static;
          }
        }
        /*
         * Show the top of each page mock rather than the whole sheet. Five full
         * portrait previews stacked two-up make a panel taller than the screen,
         * and the part that distinguishes these templates from each other —
         * the header treatment and the first heading — is all at the top.
         */
        .jbres-preview {
          height: 92px;
          overflow: hidden;
        }
        .jbres-preview svg {
          display: block;
          width: 100%;
          height: auto;
        }
        /* Keep every card the same height whatever the description length. */
        .jbres-card-desc {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div id="jbres" style={{ padding: '28px 32px 64px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{ ...label, color: T.accent, marginBottom: 10 }}>Résumé</div>
          <h1 style={{ fontFamily: T.display, fontWeight: 600, letterSpacing: '-0.04em', fontSize: 38, lineHeight: 1.03, margin: '0 0 10px' }}>
            Write it with an agent.
          </h1>
          <p style={{ fontSize: 15.5, color: T.fg3, margin: '0 0 28px', lineHeight: 1.55 }}>
            Your details come straight from your account — you never retype them here.
            Give it a target, then shape the result in conversation.
          </p>
        </div>
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
              templates,
              templateKey,
              pickTemplate,
              vibe,
              setVibe,
              busy,
              phase,
              sessionRestoreDone,
              start,
            }}
          />
        ) : (
          <Workspace
            {...{
              session,
              sessionOver,
              messages,
              liveActivities,
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
              templates,
              applyLook,
              revertLook,
              chooseOtherHarness,
              restoreRevision,
              ats,
              atsBusy,
              atsWarning,
              runAts,
              atsJobDescription: session.jobDescription || jobDescription,
              atsJobUrl: session.jobUrl || jobUrl,
              jobContextWarning: session.jobContextWarning,
            }}
          />
        )}
      </div>
    </Shell>
  );
}

function sessionTime(value) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Time unavailable';
}

function sessionMessages(session) {
  if (session.conversation?.length) {
    return session.conversation.map((message) => {
      const turn = message.revision == null
        ? null
        : (session.turns || []).find((candidate) => candidate.revision === message.revision);
      return {
        role: message.role === 'user' ? 'you' : 'agent',
        text: message.text,
        revision: message.revision,
        compiled: turn?.compiled,
      };
    });
  }
  return (session.turns || []).flatMap((turn) => [
    {
      role: 'you',
      text:
        turn.instruction ||
        (turn.kind === 'restore'
          ? `Restore revision ${turn.restoredFromRevision}.`
          : 'Change the look.'),
    },
    {
      role: 'agent',
      text: turn.summary || 'Résumé updated.',
      compiled: turn.compiled,
      revision: turn.revision,
    },
  ]);
}

function upsertActivity(current, activity) {
  if (!activity?.label) return current;
  const id = activity.id || activity.label;
  const index = current.findIndex((item) => (item.id || item.label) === id);
  if (index === -1) return [...current, activity].slice(-12);
  const next = [...current];
  next[index] = { ...next[index], ...activity };
  return next;
}

/* ------------------------------------------------------------------ setup --- */

function Setup(p) {
  return (
    <div>
      <div style={{ maxWidth: 720 }}>
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
      </div>

      {!p.options ? (
        // Still asking the server whether generation is possible. Showing the
        // form here would be the fail-open bug in a different costume, and
        // showing the red gate would accuse a profile we have not read yet.
        <div
          data-testid="options-loading"
          style={{
            maxWidth: 720,
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
        // Kept to the reading column: a full-width red panel would shout, and
        // this is a short list of four fields.
        <div style={{ maxWidth: 720 }}>
          <RequiredGate profile={p.profile} />
        </div>
      ) : (
        /*
         * What you tell the agent on the left; what the result will look like
         * on the right. The form is a reading column and stops at ~720px, so
         * the rest of the width was empty — and the picker is the one control
         * here that is worth seeing while you fill the rest in.
         */
        <div className="jbres-setup">
          <div style={{ minWidth: 0 }}>
            <ProfileFacts profile={p.profile} />
            <SetupForm {...p} />
          </div>

          <aside className="jbres-aside">
            <Card testId="template-panel">
              <TemplatePicker
                templates={p.templates}
                templateKey={p.templateKey}
                pickTemplate={p.pickTemplate}
                vibe={p.vibe}
                setVibe={p.setVibe}
              />
            </Card>
          </aside>
        </div>
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
/** Llama is not served and cannot write a résumé; hide leftover catalogue rows. */
function offeredModels(models) {
  return (models || []).filter(
    (m) => !/llama/i.test(`${m.alias || ''} ${m.model || ''}`),
  );
}

/** One selectable family: same provider + model, effort is the other control. */
function modelFamily(m) {
  return `${m.provider || ''}/${m.model}`;
}

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

  // Distinct families in backend rank order. Keying on `model` alone would
  // collapse Bedrock Llama (or Bedrock Haiku) into another row that happens
  // to reuse the short id, so they would never appear in the list.
  const byModel = [];
  for (const m of models) {
    if (!byModel.some((x) => modelFamily(x) === modelFamily(m))) byModel.push(m);
  }

  // Efforts available for the chosen family — the set differs per model, so
  // this is recomputed rather than assumed.
  const efforts = models.filter((m) => modelFamily(m) === modelFamily(selected));

  const pickModel = (family) => {
    // Keep the current effort if the new model offers it; otherwise take that
    // model's first, so switching model never lands on an alias that does not
    // exist.
    const forModel = models.filter((m) => modelFamily(m) === family);
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
            value={modelFamily(selected)}
            onChange={(e) => pickModel(e.target.value)}
            style={field}
          >
            {byModel.map((m) => (
              <option key={modelFamily(m)} value={modelFamily(m)}>
                {m.label || m.model}
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
            disabled={
              !p.sessionRestoreDone ||
              p.busy ||
              p.platformDown ||
              !p.options?.models?.length
            }
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
        <Stat
          k="Template"
          v={templateName(p.templates, session.templateKey) || '—'}
          testId="session-template"
        />
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
          <button data-testid="end-session" onClick={p.end} disabled={p.busy} style={ghostBtn}>
            End session
          </button>
        )}
        <button
          data-testid="switch-harness"
          onClick={p.chooseOtherHarness}
          disabled={p.busy}
          style={ghostBtn}
        >
          New session, other agent
        </button>
      </div>

      {p.sessionOver && (
        <div style={{ marginBottom: 16 }}>
          <Notice data-testid="session-ended" text="This session has ended and its sandbox is released. Your document, PDFs and revisions are saved." />
          <button disabled={p.busy} onClick={() => p.start(session.id)} style={primaryBtn}>Continue from here</button>
        </div>
      )}
      {p.error && (
        <Notice tone="error" data-testid="harness-error" text={p.error.message} />
      )}

      {/*
        * A passing build is not a finished résumé.
        *
        * LaTeX compiles filler exactly as happily as a career, so a session can
        * report "build passing" twice and hand back a page of placeholders.
        * When the server can see that has happened, say so here rather than
        * letting the green build state speak for the document.
        */}
      {session.contentWarnings?.length > 0 && (
        <div
          data-testid="content-warning"
          style={{
            border: '1px solid #e0b970',
            background: 'color-mix(in srgb, #9a6a2e 6%, var(--jb-v3-panel))',
            borderRadius: 3,
            padding: '13px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#9a6a2e', marginBottom: 6 }}>
            This compiled, but it is not ready to publish
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.fg2, lineHeight: 1.6 }}>
            {session.contentWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p style={{ fontSize: 12.5, color: T.fg3, margin: '9px 0 0', lineHeight: 1.5 }}>
            {p.pdfBase64
              ? 'This preview is a working draft. Replace its placeholders with real career details before publishing.'
              : 'The preview is withheld until the document has real career content. Import a résumé or add the missing facts in Settings, then generate again.'}
          </p>
        </div>
      )}

      {!p.sessionOver && (
        <LookPanel
          templates={p.templates}
          session={session}
          busy={p.busy}
          applyLook={p.applyLook}
          revertLook={p.revertLook}
        />
      )}

      <AtsPanel
        session={session}
        result={p.ats}
        busy={p.atsBusy}
        warning={p.atsWarning}
        jobDescription={p.atsJobDescription}
        jobUrl={p.atsJobUrl}
        jobContextWarning={p.jobContextWarning}
        run={p.runAts}
      />

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
                {p.liveActivities?.length > 0 && (
                  <div
                    data-testid="activity-log"
                    style={{
                      margin: '8px 0 0',
                      padding: '9px 11px',
                      background: T.sunk,
                      border: `1px solid ${T.line}`,
                      borderRadius: 3,
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: T.fg3,
                      maxHeight: 220,
                      overflow: 'auto',
                    }}
                  >
                    {p.liveActivities.map((activity) => (
                      <div key={activity.id || activity.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span aria-hidden="true" style={{ color: activity.status === 'error' ? '#b45b4c' : T.accent }}>
                          {activity.status === 'completed' ? '✓' : activity.status === 'error' ? '×' : '·'}
                        </span>
                        <span>{activity.label}</span>
                      </div>
                    ))}
                  </div>
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

          <details data-testid="revision-history" style={{ borderTop: `1px solid ${T.line}` }}>
            <summary style={{ ...label, padding: '11px 18px', cursor: 'pointer' }}>Revision history ({session.revisionCount ?? session.turns?.length ?? 0})</summary>
            <div style={{ maxHeight: 220, overflow: 'auto', padding: '0 18px' }}>
              {!(session.turns || []).length && <p style={{ fontSize: 13, color: T.fg3 }}>Your revisions will appear after the first generation.</p>}
              {[...(session.turns || [])].reverse().map((turn) => (
                <div key={turn.revision} style={{ borderTop: `1px solid ${T.line}`, padding: '11px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                    <div style={{ color: T.fg }}>Revision {turn.revision}{turn.revision === session.revision ? ' · current' : ''}</div>
                    {turn.summary && <div style={{ color: T.fg2 }}>{turn.summary}</div>}
                    {turn.instruction && <div style={{ color: T.fg2 }}>Instruction: {turn.instruction}</div>}
                    {!turn.summary && !turn.instruction && <div style={{ color: T.fg2 }}>Résumé updated.</div>}
                    <div style={{ color: T.fg3 }}>{sessionTime(turn.createdAt)} · Build {turn.compiled ? 'passing' : 'failing'}</div>
                  </div>
                  <button aria-label={`Restore revision ${turn.revision}`} disabled={p.busy} onClick={() => p.restoreRevision(turn.revision)} style={ghostBtn}>Restore</button>
                </div>
              ))}
            </div>
          </details>

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

function AtsPanel({ session, result, busy, warning, jobDescription, jobUrl, jobContextWarning, run }) {
  const stale = Boolean(result && result.sourceRevision !== session.revision);
  const completed = result?.status === 'completed';
  const goodToSubmit = completed && result.semanticMatch > 70;
  const canRun = session.status === 'active'
    && session.revision > 0
    && Boolean(jobDescription?.trim())
    && !busy;
  const missingContext = session.revision > 0
    && !jobDescription?.trim()
    && !jobUrl?.trim();
  const visibleWarning = jobContextWarning || (missingContext
    ? 'Add a job description or job URL to run ATS matching. You can continue working on the résumé without it.'
    : warning);

  return (
    <section
      data-testid="ats-panel"
      style={{
        background: T.panel,
        border: `1px solid ${stale ? '#e0b970' : T.line}`,
        borderRadius: 3,
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ ...label, marginBottom: 7 }}>ATS match</div>
          <p style={{ margin: 0, color: T.fg2, fontSize: 13.5, lineHeight: 1.55 }}>
            Score this exact résumé revision against the job description in the same agent sandbox.
          </p>
          {!session.revision && (
            <p style={{ margin: '8px 0 0', color: T.fg3, fontSize: 12.5 }}>Generate the résumé before running an analysis.</p>
          )}
          {visibleWarning && (
            <p data-testid="ats-job-warning" style={{ margin: '8px 0 0', color: '#9a6a2e', fontSize: 12.5 }}>{visibleWarning}</p>
          )}
          {session.status !== 'active' && (
            <p style={{ margin: '8px 0 0', color: T.fg3, fontSize: 12.5 }}>Saved results remain available. Continue from here to run it again.</p>
          )}
          {stale && (
            <p data-testid="ats-stale" style={{ margin: '8px 0 0', color: '#9a6a2e', fontSize: 12.5, fontWeight: 600 }}>
              This result is for revision {result.sourceRevision}; the résumé is now revision {session.revision}.
            </p>
          )}
        </div>

        {completed && (
          <div style={{ textAlign: 'right', minWidth: 90 }}>
            <div data-testid="ats-score" style={{ fontFamily: T.display, lineHeight: 1, color: T.fg, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 42 }}>{Math.round(result.semanticMatch)}</span>
              <span style={{ fontSize: 15, color: T.fg3 }}>/100</span>
            </div>
            <div
              data-testid="ats-submit-guidance"
              style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600, color: goodToSubmit ? '#4f9b73' : '#9a6a2e' }}
            >
              {goodToSubmit ? 'Good to submit' : 'Improve before submitting'}
            </div>
            <div data-testid="ats-revision" style={{ ...label, marginTop: 5 }}>Revision {result.sourceRevision}</div>
          </div>
        )}
        <button
          data-testid="run-ats"
          onClick={run}
          disabled={!canRun}
          style={{ ...primaryBtn, opacity: canRun ? 1 : 0.45 }}
        >
          {busy ? 'Analyzing…' : completed ? 'Refresh ATS analysis' : 'Analyze ATS match'}
        </button>
      </div>

      {completed && (
        <div style={{ marginTop: 16, paddingTop: 15, borderTop: `1px solid ${T.line}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 18 }}>
          <div>
            <div style={{ ...label, marginBottom: 7 }}>Breakdown</div>
            <div style={{ fontSize: 12.5, color: T.fg2, lineHeight: 1.7 }}>
              <div>Keywords · {Math.round(result.subScores?.keywordMatch ?? 0)}</div>
              <div>Skills · {Math.round(result.subScores?.skillsCoverage ?? 0)}</div>
              <div>Sections · {Math.round(result.subScores?.sectionCompleteness ?? 0)}</div>
            </div>
          </div>
          <div data-testid="ats-gaps">
            <div style={{ ...label, marginBottom: 7 }}>Missing keywords</div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.fg2, lineHeight: 1.6 }}>
              {result.keywordGaps?.length ? result.keywordGaps.join(', ') : 'No material gaps found.'}
            </p>
          </div>
          <div data-testid="ats-suggestions">
            <div style={{ ...label, marginBottom: 7 }}>Recommendations</div>
            <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: T.fg2, lineHeight: 1.6 }}>
              {(result.suggestions || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ small pieces --- */

function Bubble({ message }) {
  const you = message.role === 'you';
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start' }}>
      <div
        // The agent's own account of what it changed. Tagged so a test can
        // assert the screen reported the change, not just that the LaTeX moved.
        data-testid={you ? undefined : 'turn-summary'}
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

/* ------------------------------------------------------ template and look --- */

/** Every knob at the value the template declares as its default. */
function defaultVibe(template) {
  const out = {};
  for (const knob of template?.knobs || []) out[knob.key] = knob.defaultValue;
  return out;
}

/**
 * The look for `template`, keeping what `current` chose where it still applies.
 *
 * Templates declare different knobs — an accent means nothing on a template
 * with no colour — so a value the new template does not offer is dropped rather
 * than carried as a setting that cannot take effect. The backend does the same
 * thing server-side; this keeps the control in step with it.
 */
function mergeVibe(template, current) {
  const out = defaultVibe(template);
  for (const knob of template?.knobs || []) {
    const chosen = current?.[knob.key];
    if (chosen && knob.options.some((o) => o.value === chosen)) {
      out[knob.key] = chosen;
    }
  }
  return out;
}

const templateName = (templates, key) =>
  (templates || []).find((t) => t.key === key)?.name || '';

/** "Density Compact, Accent Navy" — for the transcript line. */
function describeVibe(templates, templateKey, vibe) {
  const template = (templates || []).find((t) => t.key === templateKey);
  return Object.entries(vibe || {})
    .map(([key, value]) => {
      const knob = template?.knobs.find((k) => k.key === key);
      const option = knob?.options.find((o) => o.value === value);
      return knob && option ? `${knob.label} ${option.label}` : `${key} ${value}`;
    })
    .join(', ');
}

/**
 * Choosing the template before the session starts.
 *
 * Previews are drawn rather than compiled — JOB-98 does not persist compiled
 * output, so a real PDF thumbnail would mean a LaTeX build per card on every
 * page load. What the candidate is choosing between is the layout, and the
 * layout is what the drawing shows.
 */
function TemplatePicker({ templates, templateKey, pickTemplate, vibe, setVibe }) {
  if (templates === null) {
    return (
      <Field title="Template">
        <p data-testid="templates-loading" style={{ fontSize: 13.5, color: T.fg3, margin: 0 }}>
          Loading templates…
        </p>
      </Field>
    );
  }

  if (!templates.length) {
    // The backend still generates without one, so this is a note rather than a
    // blocker — saying "unavailable" and disabling Start would be a lie.
    return (
      <Field title="Template">
        <p data-testid="templates-empty" style={{ fontSize: 13.5, color: T.fg3, margin: 0 }}>
          No templates are installed, so the agent will use its own layout.
        </p>
      </Field>
    );
  }

  const selected = templates.find((t) => t.key === templateKey) || templates[0];

  return (
    <>
      <Field
        title="Template"
        hint="Changeable at any point once you start — your content comes with it."
      >
        <div
          data-testid="template-picker"
          style={{
            display: 'grid',
            // Two per row in the side column, more when the layout stacks and
            // the panel gets the full width back.
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {templates.map((t) => {
            const on = t.key === selected.key;
            return (
              <button
                key={t.key}
                data-testid={`template-card-${t.key}`}
                aria-pressed={on}
                onClick={() => pickTemplate(t.key)}
                title={t.description}
                style={{
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 0,
                  overflow: 'hidden',
                  background: T.panel,
                  border: `1px solid ${on ? T.accent : T.line}`,
                  boxShadow: on
                    ? `0 0 0 2px color-mix(in srgb, var(--jb-v3-accent) 18%, transparent)`
                    : 'none',
                  borderRadius: 3,
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                }}
              >
                <div
                  data-testid={`template-preview-${t.key}`}
                  className="jbres-preview"
                  aria-hidden="true"
                  style={{
                    background: T.sunk,
                    borderBottom: `1px solid ${T.line}`,
                    padding: '10px 14px 0',
                    color: T.fg,
                    lineHeight: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: t.previewSvg }}
                />
                <div style={{ padding: '9px 11px 11px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? T.accent : T.fg }}>
                    {t.name}
                  </div>
                  <div
                    className="jbres-card-desc"
                    style={{ fontSize: 11, color: T.fg3, lineHeight: 1.45, marginTop: 3 }}
                  >
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      <Field title="Look" hint="Presentation only. These never change what your résumé claims.">
        <KnobRow
          template={selected}
          vibe={vibe}
          onChange={(key, value) => setVibe((v) => ({ ...v, [key]: value }))}
          idPrefix="setup"
        />
      </Field>
    </>
  );
}

/** The knob selects for one template. Shared by setup and the live session. */
function KnobRow({ template, vibe, onChange, disabled, idPrefix }) {
  if (!template?.knobs?.length) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {template.knobs.map((knob) => (
        <div key={knob.key}>
          <span style={{ ...label, fontSize: 9.5, display: 'block', marginBottom: 6 }}>
            {knob.label}
          </span>
          <select
            data-testid={`${idPrefix}-knob-${knob.key}`}
            value={vibe?.[knob.key] ?? knob.defaultValue}
            disabled={disabled}
            onChange={(e) => onChange(knob.key, e.target.value)}
            style={{ ...field, opacity: disabled ? 0.55 : 1 }}
          >
            {knob.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/**
 * Changing the look of a live session.
 *
 * Draft-then-apply rather than apply-on-change: every application is a real
 * harness turn that costs money and takes tens of seconds, so nudging a select
 * must not start one. The button says how many things will change, and stays
 * disabled until something has.
 */
function LookPanel({ templates, session, busy, applyLook, revertLook }) {
  const current = (templates || []).find((t) => t.key === session.templateKey);
  const [draftTemplate, setDraftTemplate] = useState(session.templateKey || '');
  const [draftVibe, setDraftVibe] = useState(session.vibe || {});
  const [open, setOpen] = useState(false);

  // The session is the source of truth: a completed change, or a revert, resets
  // the draft to whatever actually landed.
  useEffect(() => {
    setDraftTemplate(session.templateKey || '');
    setDraftVibe(session.vibe || {});
  }, [session.templateKey, session.vibe, session.revision]);

  if (!templates?.length || !session.templateKey) return null;

  const draft = templates.find((t) => t.key === draftTemplate) || current;
  const templateChanged = draftTemplate !== session.templateKey;
  const changedKnobs = Object.keys(draftVibe).filter(
    (k) => draftVibe[k] !== session.vibe?.[k],
  );
  const dirty = templateChanged || changedKnobs.length > 0;

  const pick = (key) => {
    const next = templates.find((t) => t.key === key);
    if (!next) return;
    setDraftTemplate(key);
    setDraftVibe(mergeVibe(next, draftVibe));
  };

  return (
    <div
      data-testid="look-panel"
      style={{
        background: T.panel,
        border: `1px solid ${T.line}`,
        borderRadius: 3,
        marginBottom: 16,
      }}
    >
      <button
        data-testid="look-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          fontFamily: 'inherit',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: T.fg,
        }}
      >
        <span style={label}>Look</span>
        <span data-testid="look-current" style={{ fontSize: 13, color: T.fg2 }}>
          {current?.name || session.templateKey}
          {describeVibe(templates, session.templateKey, session.vibe)
            ? ` · ${describeVibe(templates, session.templateKey, session.vibe)}`
            : ''}
        </span>
        <span style={{ flex: 1 }} />
        {session.canRevert && (
          <span data-testid="look-revert-available" style={{ ...label, fontSize: 9.5, color: T.accent }}>
            1 step back available
          </span>
        )}
        <span aria-hidden="true" style={{ color: T.fg3, fontSize: 12 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span style={{ ...label, fontSize: 9.5, display: 'block', marginBottom: 8 }}>
              Template
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templates.map((t) => {
                const on = t.key === draftTemplate;
                return (
                  <button
                    key={t.key}
                    data-testid={`look-template-${t.key}`}
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => pick(t.key)}
                    style={{
                      ...ghostBtn,
                      fontSize: 12.5,
                      padding: '7px 13px',
                      color: on ? T.accentInk : T.fg2,
                      background: on ? T.accent : 'transparent',
                      borderColor: on ? T.accent : T.line,
                      opacity: busy ? 0.55 : 1,
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <KnobRow
            template={draft}
            vibe={draftVibe}
            disabled={busy}
            idPrefix="look"
            onChange={(key, value) => setDraftVibe((v) => ({ ...v, [key]: value }))}
          />

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              data-testid="apply-look"
              disabled={busy || !dirty}
              onClick={() =>
                applyLook(
                  templateChanged
                    ? { templateKey: draftTemplate, vibe: draftVibe }
                    : { vibe: draftVibe },
                )
              }
              style={{ ...primaryBtn, opacity: busy || !dirty ? 0.45 : 1 }}
            >
              {busy ? 'Re-applying…' : 'Apply look'}
            </button>

            <button
              data-testid="revert-look"
              disabled={busy || !session.canRevert}
              onClick={revertLook}
              style={{ ...ghostBtn, opacity: busy || !session.canRevert ? 0.45 : 1 }}
            >
              Back to previous look
            </button>

            <span data-testid="look-status" style={{ fontSize: 12.5, color: T.fg3 }}>
              {dirty
                ? templateChanged
                  ? `Switching to ${draft?.name}. Your content is re-applied, not rewritten.`
                  : `${changedKnobs.length} change${changedKnobs.length > 1 ? 's' : ''} to apply.`
                : 'Nothing to apply — this is the current look.'}
            </span>
          </div>
        </div>
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
