'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

/* Static form options (product UI, not user data). */
const CATEGORIES = [
  'Billing & plans',
  'Auto-Apply',
  'Matches & applications',
  'Résumé & cover letters',
  'Account & login',
  'Something else',
];

const PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'High' },
];

/* dc statusStyle() */
function statusStyle(s) {
  if (s === 'open') return { label: 'OPEN', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (s === 'awaiting') return { label: 'AWAITING YOU', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
  return { label: 'RESOLVED', color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' };
}

export default function AppSupport() {
  /* ----- new-request form (client state) ----- */
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitted, setSubmitted] = useState(false);
  const [ticketNum, setTicketNum] = useState('#JB-4821');

  /* ----- requests + thread ----- */
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null); // null => list, id => thread
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState({}); // { [ticketId]: [{me,text,time}] }

  /* Fetch the user's real tickets when authenticated. No fabricated fallback:
   * empty stays empty and failures surface an error. */
  useEffect(() => {
    let cancelled = false;
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken') || localStorage.getItem('token')
        : null;
    if (!token) {
      setLoading(false);
      return; // unauthenticated → no requests to show
    }

    setLoading(true);
    setError(null);
    import('@/services/supportApi')
      .then((m) => m.getMyTickets())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.tickets;
        setTickets(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----- derived render values (dc renderVals) ----- */
  const showForm = !submitted;
  const showSuccess = submitted;
  const showList = !activeId;
  const showThread = !!activeId;

  const active = useMemo(() => tickets.find((t) => t.id === activeId) || null, [tickets, activeId]);

  const threadStatus = active ? statusStyle(active.status) : null;

  const threadMsgs = useMemo(() => {
    if (!active) return [];
    const base = (active.msgs || []).concat(sent[active.id] || []);
    return base.map((m) => ({
      text: m.text,
      time: m.time,
      author: m.author || '',
      showAuthor: !m.me && !!m.author,
      align: m.me ? 'flex-end' : 'flex-start',
      bubbleBg: m.me ? '#EAF6EE' : '#FFFEFB',
      bubbleBorder: m.me ? '#CDE9D6' : '#E6DECF',
      radius: m.me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    }));
  }, [active, sent]);

  const canSend = reply.trim().length > 0;

  /* ----- actions ----- */
  const submit = () => {
    setSubmitted(true);
    const n = '#JB-' + (4790 + Math.floor(Math.random() * 60)).toString();
    setTicketNum(n || '#JB-4821');
    // Best-effort persistence; failure is non-blocking (UI already advanced).
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken') || localStorage.getItem('token')
        : null;
    if (token) {
      import('@/services/supportApi')
        .then((m) => m.createTicket({ category, subject, message, priority }))
        .then((res) => {
          if (res?.id) setTicketNum(res.id);
        })
        .catch(() => {});
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubject('');
    setMessage('');
    setPriority('normal');
    setCategory(CATEGORIES[0]);
  };

  const openTicket = (id) => {
    setActiveId(id);
    setReply('');
  };
  const closeThread = () => {
    setActiveId(null);
    setReply('');
  };

  const sendReply = () => {
    const t = reply.trim();
    if (!t || !activeId) return;
    const id = activeId;
    setSent((prev) => ({
      ...prev,
      [id]: (prev[id] || []).concat({ me: true, text: t, time: 'Just now' }),
    }));
    setReply('');
  };

  const onReplyKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendReply();
    }
  };

  /* ----- shared styles ----- */
  const labelStyle = { fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' };
  const fieldStyle = {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#1B1A16',
    background: '#FBF8F1',
    border: '1px solid #E1D9C9',
    borderRadius: 12,
    padding: '12px 14px',
  };

  return (
    <>
      <Head>
        <title>Support — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus,
        #jbapp textarea:focus,
        #jbapp select:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbapp input::placeholder,
        #jbapp textarea::placeholder {
          color: #a79e8f;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <AppSidebar active="support" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Support</div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('App Help Center.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>Browse help center →</Link>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Support</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Open a request or pick up a conversation. <span style={{ color: '#157A49', fontWeight: 600 }}>Typical response: under 4 hours</span> on weekdays.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* ===== LEFT: NEW REQUEST ===== */}
              <div style={{ width: 420, flexShrink: 0, maxWidth: '100%' }}>
                {showForm && (
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 26 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>New request</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          style={{ ...fieldStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Subject</label>
                        <input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Briefly, what’s going on?"
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Message</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Share the details — steps you took, what you expected, what happened."
                          style={{ ...fieldStyle, minHeight: 130, lineHeight: 1.6, padding: '13px 14px', resize: 'vertical' }}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 8 }}>Priority</label>
                        <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                          {PRIORITIES.map((p) => {
                            const on = priority === p.key;
                            return (
                              <button
                                key={p.key}
                                onClick={() => setPriority(p.key)}
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: on ? '#1B1A16' : '#8A8378',
                                  background: on ? '#FFFEFB' : 'transparent',
                                  border: 'none',
                                  borderRadius: 999,
                                  padding: '7px 16px',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
                                }}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#5A544A', background: '#FBF8F1', border: '1px dashed #D2C9B7', borderRadius: 11, padding: '10px 15px', cursor: 'pointer' }}
                      >
                        + Attach a file
                      </button>
                    </div>
                    <button
                      onClick={submit}
                      style={{ width: '100%', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: 14, cursor: 'pointer', marginTop: 22 }}
                    >
                      Submit request
                    </button>
                  </div>
                )}

                {showSuccess && (
                  <div style={{ background: '#FFFEFB', border: '1px solid #CDE9D6', borderRadius: 18, padding: '36px 28px', textAlign: 'center', animation: 'rbpop 0.3s ease' }}>
                    <div style={{ width: 60, height: 60, margin: '0 auto 20px', borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
                    <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: '0 0 8px' }}>Request received</h2>
                    <p style={{ fontSize: 14.5, color: '#5A544A', margin: '0 auto 18px', maxWidth: 320 }}>
                      We’ve opened ticket <b style={{ fontFamily: 'var(--jb-font-mono)', color: '#157A49' }}>{ticketNum}</b> and emailed you a copy. Expect a reply within <b>4 hours</b>.
                    </p>
                    <button
                      onClick={resetForm}
                      style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '12px 22px', cursor: 'pointer' }}
                    >
                      Submit another
                    </button>
                  </div>
                )}
              </div>

              {/* ===== RIGHT: MY REQUESTS / THREAD ===== */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* LIST */}
                {showList && (
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>My requests</h2>
                    {loading ? (
                      <LoadingState label="Loading your requests…" />
                    ) : error ? (
                      <ErrorState error={error} />
                    ) : tickets.length === 0 ? (
                      <EmptyState
                        title="No requests yet"
                        hint="Open one on the left and we’ll get right back to you."
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {tickets.map((t) => {
                          const ss = statusStyle(t.status);
                          return (
                            <button
                              key={t.id}
                              onClick={() => openTicket(t.id)}
                              style={{ textAlign: 'left', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 15, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286' }}>{t.id}</span>
                                <span style={{ flex: 1 }} />
                                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: '3px 9px', borderRadius: 999 }}>{ss.label}</span>
                              </div>
                              <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16', marginBottom: 5 }}>{t.subject}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#8A8378' }}>
                                <span>{t.category}</span>
                                <span style={{ color: '#C9BFAC' }}>·</span>
                                <span>Updated {t.updated}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* THREAD */}
                {showThread && active && (
                  <div style={{ animation: 'rbpop 0.2s ease' }}>
                    <button
                      onClick={closeThread}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}
                    >
                      ← All requests
                    </button>

                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid #F2ECE0' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286' }}>{active.id}</span>
                            {threadStatus && (
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: threadStatus.color, background: threadStatus.bg, border: `1px solid ${threadStatus.border}`, padding: '3px 9px', borderRadius: 999 }}>{threadStatus.label}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{active.subject}</div>
                        </div>
                      </div>

                      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, background: '#F7F3EA' }}>
                        {threadMsgs.map((m, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.align }}>
                            {m.showAuthor && (
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286', marginBottom: 5 }}>{m.author}</span>
                            )}
                            <div style={{ maxWidth: '78%', fontSize: 14, lineHeight: 1.5, color: '#1B1A16', background: m.bubbleBg, border: `1px solid ${m.bubbleBorder}`, borderRadius: m.radius, padding: '11px 15px' }}>{m.text}</div>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', margin: '5px 3px 0' }}>{m.time}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: '14px 18px', borderTop: '1px solid #F2ECE0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 999, padding: '6px 6px 6px 16px' }}>
                          <input
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={onReplyKey}
                            placeholder="Write a reply…"
                            style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#1B1A16' }}
                          />
                          <button
                            onClick={sendReply}
                            title="Send"
                            style={{ width: 38, height: 38, flexShrink: 0, border: 'none', background: canSend ? '#1FA463' : '#CFE6D8', color: '#0C2C1C', borderRadius: '50%', cursor: canSend ? 'pointer' : 'default', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ↑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
