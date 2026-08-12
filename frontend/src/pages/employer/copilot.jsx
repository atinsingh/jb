'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

/* ------------------------------------------------------- prompt starters --- */
const STARTERS = [
  'Screen my applicants',
  'Source senior engineers',
  'Draft rejection emails for low-fit applicants',
  "Summarize today's interviews",
];

/* ------------------------------------------------------- sub views --- */
function AiMessage({ m, onAction }) {
  return (
    <div style={{ display: 'flex', gap: 12, animation: 'emrise 0.3s ease' }}>
      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {m.text && <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#2A2820' }}>{m.text}</div>}

        {Array.isArray(m.actions) && m.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {m.actions.map((a, i) => (
              <button
                key={(a.type || 'act') + i}
                onClick={() => onAction(a)}
                className="em-cp-chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3A352C', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}
              >
                <span style={{ color: '#1FA463' }}>{a.proposedActionId ? '✓' : '✦'}</span>
                {a.label || a.type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- page --- */
export default function EmployerCopilot() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);

  const threadRef = useRef(null);

  const scrollThread = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollThread();
  }, [messages, thinking, scrollThread]);

  const pushUserAndReply = useCallback(async (text) => {
    const t = (text || '').trim();
    if (!t || thinking) return;
    const userMsg = { id: 'u' + Date.now(), role: 'user', text: t };
    setMessages((prev) => prev.concat(userMsg));
    setDraft('');
    setThinking(true);
    setError(null);
    try {
      const res = await aiRecruiterApi.copilot(t);
      setMessages((prev) =>
        prev.concat({
          id: 'r' + Date.now(),
          role: 'ai',
          text: res?.reply || '',
          actions: Array.isArray(res?.actions) ? res.actions : [],
        }),
      );
    } catch (err) {
      // Surface the error — never fabricate a reply.
      setError(err);
    } finally {
      setThinking(false);
    }
  }, [thinking]);

  const onAction = useCallback(
    (a) => {
      if (a.proposedActionId) {
        // The action already happened server-side as a pending proposal by the
        // time this reply rendered — link to where it can be reviewed instead
        // of pretending to "do" anything client-side.
        // NOTE: /employer/approvals reads the unrelated EmployerApproval model,
        // never AiProposedAction — it could never show this proposal. The
        // Autopilot review queue is the only surface that renders real
        // AiProposedAction rows today. It is still a partial destination: its
        // queue only covers applicants at stage applied/screening and is
        // sliced to 10, so a proposal outside that window is not listed there.
        router.push('/employer/autopilot');
        return;
      }
      // No proposedActionId means this action chip didn't create a real
      // proposal (e.g. an informational suggestion) — fall back to the
      // existing behavior of resending it as a message.
      pushUserAndReply(a.label || a.type);
    },
    [router, pushUserAndReply],
  );

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      pushUserAndReply(draft);
    }
  };

  const canSend = draft.trim().length > 0;
  const showChips = messages.length === 0;

  return (
    <>
      <Head>
        <title>Copilot · Recruiting — Jobocate</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp textarea:focus {
          outline: none;
        }
        #emapp .em-cp-chip:hover {
          border-color: #4263eb !important;
          color: #364fc7 !important;
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes emblink {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="copilot" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✦</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Recruiting Copilot</div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>Screen · source · draft · summarize</div>
            </div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('Employer Autopilot.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>Autopilot →</Link>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* ===== CHAT ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div ref={threadRef} id="emthread" style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {messages.length === 0 && !thinking && (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8A8378' }}>
                      <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 13, background: '#15140F', color: '#5BD08C', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>✦</span>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1B1A16', marginBottom: 4 }}>Ask Copilot to get started</div>
                      <div style={{ fontSize: 13.5, maxWidth: 380, margin: '0 auto' }}>
                        Screen applicants, source candidates, draft outreach or rejections, and summarize interviews.
                      </div>
                    </div>
                  )}

                  {messages.map((m) =>
                    m.role === 'user' ? (
                      <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#4263EB', color: '#fff', fontSize: 14.5, lineHeight: 1.5, padding: '12px 16px', borderRadius: '16px 16px 4px 16px' }}>{m.text}</div>
                    ) : (
                      <AiMessage key={m.id} m={m} onAction={onAction} />
                    )
                  )}

                  {/* TYPING */}
                  {thinking && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 0' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.2s infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.4s infinite' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COMPOSER */}
              <div style={{ flexShrink: 0, padding: '14px 28px 20px', background: 'linear-gradient(transparent, #F7F3EA 30%)' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  <InlineError error={error} />
                  {showChips && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {STARTERS.map((label) => (
                        <button key={label} onClick={() => pushUserAndReply(label)} className="em-cp-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3A352C', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>
                          <span style={{ color: '#1FA463' }}>✦</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 22, padding: '8px 8px 8px 18px', boxShadow: '0 6px 20px -12px rgba(27,26,22,0.25)' }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKey}
                      rows={1}
                      placeholder="Ask Copilot to screen, source, draft, or move candidates…"
                      style={{ flex: 1, border: 'none', background: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.5, color: '#1B1A16', padding: '8px 0', maxHeight: 120 }}
                    />
                    <button
                      onClick={() => pushUserAndReply(draft)}
                      title="Send"
                      style={{ width: 40, height: 40, flexShrink: 0, border: 'none', borderRadius: '50%', background: canSend ? '#1FA463' : '#CFE6D8', color: '#fff', cursor: canSend ? 'pointer' : 'default', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >↑</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
