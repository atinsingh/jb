'use client';

/**
 * Live interview copilot — /app/live-interview
 *
 * Replaces a 1,156-line replay view that had no microphone, no WebSocket and no
 * streaming transcription: its "live transcript" was a useMemo over turns
 * fetched by REST, presented as if it were live.
 *
 * The flow is deliberately gated: set up → consent → capture. Consent is a real
 * step because live capture records the INTERVIEWER's voice, which in
 * two-party-consent jurisdictions engages wiretap law. The server refuses to
 * open a microphone until it has been acknowledged, so this screen cannot
 * shortcut it even if it wanted to.
 *
 * All capture machinery lives in useLiveInterview(); this file is presentation.
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { useLiveInterview, captureSupportProblem } from '@/hooks/useLiveInterview';
import {
  createLiveSession,
  acknowledgeConsent,
  startLiveSession,
  completeLiveSession,
} from '@/services/liveInterviewApi';

const MONO = 'var(--jb-font-mono, ui-monospace, monospace)';

const card = {
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line)',
  borderRadius: 2,
  padding: 20,
  marginBottom: 14,
};
const primaryBtn = {
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--jb-v3-accent-ink)',
  background: 'var(--jb-v3-accent)',
  border: 'none',
  borderRadius: 2,
  padding: '12px 22px',
  cursor: 'pointer',
};
const ghostBtn = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--jb-v3-fg-2)',
  background: 'transparent',
  border: '1px solid var(--jb-v3-line-2)',
  borderRadius: 2,
  padding: '10px 17px',
  cursor: 'pointer',
};
const input = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  border: '1px solid var(--jb-v3-line-2)',
  borderRadius: 2,
  padding: '10px 12px',
  background: 'var(--jb-v3-panel)',
};

/**
 * Non-dismissable while capture is live.
 *
 * Not decoration: an always-visible indicator is part of the consent posture.
 * The candidate must never be able to forget that the other party is being
 * transcribed.
 */
function RecordingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--jb-v3-danger-soft)',
        border: '1px solid var(--jb-v3-danger-line)',
        color: 'var(--jb-v3-danger)',
        borderRadius: 2,
        padding: '6px 13px',
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: 'var(--jb-v3-danger)',
          animation: 'jbPulse 1.4s ease-in-out infinite',
        }}
      />
      TRANSCRIBING THIS CONVERSATION
      <style jsx>{`
        @keyframes jbPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

function Notice({ notice }) {
  if (!notice) return null;
  const isError = notice.level === 'error';
  const isWarn = notice.level === 'warn';
  return (
    <div
      role="status"
      style={{
        padding: '10px 13px',
        borderRadius: 2,
        fontSize: 13,
        marginBottom: 14,
        background: isError ? 'var(--jb-v3-danger-soft)' : isWarn ? 'var(--jb-v3-warn-soft)' : 'var(--jb-v3-accent-soft)',
        border: `1px solid ${isError ? 'var(--jb-v3-danger-line)' : isWarn ? 'var(--jb-v3-warn-line)' : 'var(--jb-v3-accent-line)'}`,
        color: isError ? 'var(--jb-v3-danger)' : isWarn ? 'var(--jb-v3-warn)' : 'var(--jb-v3-accent)',
      }}
    >
      {notice.message}
    </div>
  );
}

export default function LiveInterviewPage() {
  const [phase, setPhase] = useState('setup'); // setup | consent | live | ended
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [retain, setRetain] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [manual, setManual] = useState('');
  const [summary, setSummary] = useState(null);

  const { status, notice, transcript, coaching, start, stop, askManually } =
    useLiveInterview(sessionId);

  const supportProblem = captureSupportProblem();

  const handleCreate = async () => {
    if (!role.trim()) return;
    setBusy(true);
    setPageError('');
    try {
      const session = await createLiveSession({
        mode: 'CONSENT',
        roleTitle: role.trim(),
        companyName: company.trim() || undefined,
      });
      setSessionId(session.id);
      setPhase('consent');
    } catch (e) {
      setPageError(e.message || 'Could not create the session.');
    } finally {
      setBusy(false);
    }
  };

  const handleConsent = async () => {
    setBusy(true);
    setPageError('');
    try {
      await acknowledgeConsent(sessionId, { acknowledged: true, retainTranscript: retain });
      await startLiveSession(sessionId);
      const ok = await start({ includeMicrophone: true });
      if (ok) setPhase('live');
    } catch (e) {
      setPageError(e.message || 'Could not start capture.');
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async () => {
    stop();
    setBusy(true);
    try {
      setSummary(await completeLiveSession(sessionId));
    } catch {
      setSummary(null);
    } finally {
      setBusy(false);
      setPhase('ended');
    }
  };

  return (
    <>
      <Head>
        <title>Live copilot · Jobocate</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)' }}>
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'relative',
              
              
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '15px 32px',
              background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--jb-v3-line)',
            }}
          >
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--jb-v3-fg)', margin: 0 }}>
              Live copilot
            </h1>
            {status === 'live' && <RecordingIndicator />}
          </header>

          <div style={{ padding: '26px 32px 56px', width: '100%', maxWidth: 1080 }}>
            <Notice notice={notice} />
            {pageError && <Notice notice={{ level: 'error', message: pageError }} />}

            {/* ---------------------------------------------------- setup --- */}
            {phase === 'setup' && (
              <div style={{ maxWidth: 560 }}>
                <p style={{ fontSize: 14, color: 'var(--jb-v3-fg-2)', lineHeight: 1.6, margin: '0 0 18px' }}>
                  We listen to the interview through a shared browser tab, and put talking points
                  from your own experience on screen as questions are asked. Nothing is scripted for
                  you, and no audio is ever stored.
                </p>

                {supportProblem && (
                  <Notice notice={{ level: 'error', message: supportProblem }} />
                )}

                <div style={card}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                    Role you are interviewing for
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Senior Backend Engineer"
                      style={{ ...input, marginTop: 6 }}
                    />
                  </label>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, margin: '14px 0 0' }}>
                    Company <span style={{ fontWeight: 500, color: 'var(--jb-v3-fg-3)' }}>(optional)</span>
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      style={{ ...input, marginTop: 6 }}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy || !role.trim() || !!supportProblem}
                  style={{ ...primaryBtn, opacity: !role.trim() || supportProblem ? 0.5 : 1 }}
                >
                  {busy ? 'Setting up…' : 'Continue →'}
                </button>
              </div>
            )}

            {/* -------------------------------------------------- consent --- */}
            {phase === 'consent' && (
              <div style={{ maxWidth: 620 }}>
                <div style={card}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>
                    Before we listen
                  </h2>
                  <p style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-2)', lineHeight: 1.65, margin: '0 0 12px' }}>
                    This transcribes the <strong>other person&rsquo;s voice</strong> as well as your
                    own. In some places — including California, Illinois, Washington, Pennsylvania
                    and Florida — recording a conversation without everyone&rsquo;s consent is
                    unlawful. Please make sure you have permission.
                  </p>

                  <div
                    style={{
                      background: 'var(--jb-v3-bg)',
                      border: '1px solid var(--jb-v3-line)',
                      borderRadius: 2,
                      padding: 12,
                      fontSize: 13,
                      color: 'var(--jb-v3-fg-2)',
                      marginBottom: 14,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 4 }}>Something you can say:</strong>
                    &ldquo;Before we start — I use a tool that transcribes our conversation to help me
                    take notes. Is that alright with you?&rdquo;
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-2)', margin: '0 0 14px' }}>
                    Audio is transcribed as it arrives and never stored — there is no recording to
                    keep or leak.
                  </p>

                  <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span>I have permission to transcribe this conversation.</span>
                  </label>

                  <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5 }}>
                    <input
                      type="checkbox"
                      checked={retain}
                      onChange={(e) => setRetain(e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      Keep the transcript afterwards.
                      <span style={{ color: 'var(--jb-v3-fg-3)' }}> Off by default — we delete it when the session ends.</span>
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleConsent}
                  disabled={busy || !acknowledged}
                  style={{ ...primaryBtn, opacity: acknowledged ? 1 : 0.5 }}
                >
                  {busy ? 'Starting…' : 'Share tab audio and start'}
                </button>
                <p style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)', marginTop: 10 }}>
                  Pick the meeting tab and tick <strong>&ldquo;Also share tab audio&rdquo;</strong>.
                </p>
              </div>
            )}

            {/* ----------------------------------------------------- live --- */}
            {phase === 'live' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                <section>
                  <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--jb-v3-fg-2)', letterSpacing: '0.05em', margin: '0 0 9px' }}>
                    TRANSCRIPT
                  </h2>
                  <div style={{ ...card, minHeight: 320, maxHeight: 460, overflowY: 'auto' }}>
                    {transcript.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Listening…</p>
                    ) : (
                      transcript.map((line) => (
                        <p
                          key={line.id}
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.6,
                            margin: '0 0 9px',
                            color: line.isFinal ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)',
                          }}
                        >
                          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: line.source === 'CANDIDATE' ? 'var(--jb-v3-accent)' : 'var(--jb-v3-warn)' }}>
                            {line.source === 'CANDIDATE' ? 'YOU' : 'THEM'}{' '}
                          </span>
                          {line.text}
                        </p>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          askManually(manual);
                          setManual('');
                        }
                      }}
                      placeholder="Type a question you were asked…"
                      aria-label="Type a question manually"
                      style={input}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        askManually(manual);
                        setManual('');
                      }}
                      style={ghostBtn}
                    >
                      Ask
                    </button>
                  </div>
                </section>

                <section>
                  <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--jb-v3-fg-2)', letterSpacing: '0.05em', margin: '0 0 9px' }}>
                    TALKING POINTS
                  </h2>
                  <div style={{ minHeight: 320, maxHeight: 460, overflowY: 'auto' }}>
                    {coaching.length === 0 ? (
                      <div style={card}>
                        <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)', margin: 0 }}>
                          When a question is asked, evidence from your own experience appears here.
                        </p>
                      </div>
                    ) : (
                      [...coaching].reverse().map((c, i) => (
                        <div key={`${c.question}-${i}`} style={card}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--jb-v3-fg)', margin: '0 0 8px' }}>
                            {c.question}
                          </p>
                          {c.pending ? (
                            <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)', margin: 0 }}>Thinking…</p>
                          ) : (
                            <div style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-2)', lineHeight: 1.6 }}>
                              {(c.output?.talkingPoints || c.output?.points || []).map((p, j) => (
                                <p key={j} style={{ margin: '0 0 6px' }}>• {typeof p === 'string' ? p : p?.text}</p>
                              ))}
                              {c.output?.summary && <p style={{ margin: '6px 0 0' }}>{c.output.summary}</p>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <div style={{ gridColumn: '1 / -1' }}>
                  <button type="button" onClick={handleEnd} disabled={busy} style={ghostBtn}>
                    {busy ? 'Ending…' : 'End session'}
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- ended --- */}
            {phase === 'ended' && (
              <div style={{ maxWidth: 560 }}>
                <div style={card}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Session ended</h2>
                  <p style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-2)', margin: 0 }}>
                    {summary?.transcriptRetained
                      ? 'Your transcript has been kept, as you asked.'
                      : `Transcript discarded${
                          summary?.discardedTurns ? ` (${summary.discardedTurns} turns)` : ''
                        }. No audio was ever stored.`}
                  </p>
                </div>
                <Link href={appRoute('App Interview.dc.html')} style={{ ...primaryBtn, textDecoration: 'none', display: 'inline-block' }}>
                  Back to interview prep →
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
