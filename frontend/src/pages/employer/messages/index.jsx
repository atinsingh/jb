'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';
import { employerMessagesApi } from '@/services/employerApi';

const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.round((now - d) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString();
};

// Custom hook for auto-scrolling to bottom of chat
const useAutoScroll = (deps = []) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { messagesEndRef, scrollToBottom };
};

const monoLabel = {
  fontFamily: 'var(--jb-font-mono)',
  fontSize: 11.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#9A9286',
};

export default function EmployerMessages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null); // { conversation, messages }
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const { messagesEndRef, scrollToBottom } = useAutoScroll([activeId, thread?.messages?.length]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerMessagesApi.listConversations();
      const list = Array.isArray(res?.conversations) ? res.conversations : [];
      setConversations(list);
      setActiveId((prev) => prev ?? (list[0]?._id || null));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadThread = useCallback(async (id) => {
    if (!id) {
      setThread(null);
      return;
    }
    setThreadLoading(true);
    setThreadError(null);
    setSendError(null);
    try {
      const res = await employerMessagesApi.getMessages(id);
      setThread({
        conversation: res?.conversation || null,
        messages: Array.isArray(res?.messages) ? res.messages : [],
      });
      // Opening a thread clears its unread badge on the server; reflect locally.
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, unread: 0 } : c)),
      );
    } catch (err) {
      setThreadError(err);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThread(activeId);
  }, [activeId, loadThread]);

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    return (
      (conv.candidateName || '').toLowerCase().includes(q) ||
      (conv.role || '').toLowerCase().includes(q) ||
      (conv.lastMessage || '').toLowerCase().includes(q)
    );
  });

  const handleSendMessage = async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await employerMessagesApi.sendMessage(activeId, body);
      const message = res?.message;
      if (message) {
        setThread((prev) =>
          prev ? { ...prev, messages: [...prev.messages, message] } : prev,
        );
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeId
              ? { ...c, lastMessage: message.body, lastMessageAt: message.createdAt }
              : c,
          ),
        );
      }
      setDraft('');
      scrollToBottom();
    } catch (err) {
      setSendError(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentConversation = thread?.conversation || conversations.find((c) => c._id === activeId) || null;
  const canSend = !!(draft.trim() && !sending);

  return (
    <>
      <Head>
        <title>Messages · Jobocate for Employers</title>
        <meta name="description" content="Manage your candidate conversations" />
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp textarea:focus,
        #emapp input:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        #emapp .em-conv:hover {
          background: #f4efe4;
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
        @media (max-width: 780px) {
          #emapp .msg-split {
            flex-direction: column !important;
          }
          #emapp .msg-list-panel {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #e7e0d2 !important;
            max-height: 40vh !important;
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="messages" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#4263EB' }}>✉</span>
            <span style={monoLabel}>Engage · Messages</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, color: '#8A8378' }}>
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </span>
          </header>

          <div className="msg-split" style={{ display: 'flex', gap: 0, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            {/* ===== LEFT: CONVERSATION LIST ===== */}
            <div className="msg-list-panel" style={{ width: 340, flexShrink: 0, borderRight: '1px solid #E7E0D2', background: '#FBF8F1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '20px 20px 14px' }}>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.05, margin: '0 0 12px' }}>Inbox</h1>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span aria-hidden style={{ position: 'absolute', left: 12, fontSize: 13, color: '#A79E8F' }}>⌕</span>
                  <input
                    type="text"
                    placeholder="Search candidates or messages…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '9px 14px 9px 32px' }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 16px' }}>
                {loading ? (
                  <LoadingState label="Loading conversations…" />
                ) : error ? (
                  <ErrorState error={error} onRetry={load} />
                ) : conversations.length === 0 ? (
                  <EmptyState icon="✉" title="No conversations yet" hint="Messages with candidates will show up here." />
                ) : filteredConversations.length === 0 ? (
                  <EmptyState icon="⌕" title="No matches found" hint="Try adjusting your search to find what you're looking for." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredConversations.map((conv) => {
                      const on = activeId === conv._id;
                      return (
                        <button
                          key={conv._id}
                          type="button"
                          className="em-conv"
                          onClick={() => setActiveId(conv._id)}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', width: '100%', fontFamily: 'inherit', background: on ? '#EDF0FE' : '#FFFEFB', border: `1px solid ${on ? '#C7D2FB' : '#E6DECF'}`, borderRadius: 14, padding: 12, cursor: 'pointer' }}
                        >
                          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: on ? '#4263EB' : '#EDE7DA', color: on ? '#fff' : '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13.5 }}>
                            {initialsOf(conv.candidateName)}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.candidateName}</span>
                              <span style={{ fontSize: 11, color: '#A79E8F', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatTime(conv.lastMessageAt)}</span>
                            </div>
                            {conv.role && (
                              <div style={{ fontSize: 12, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{conv.role}</div>
                            )}
                            <div style={{ fontSize: 12.5, color: '#5A544A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>
                              {conv.lastMessage || 'No messages yet'}
                            </div>
                            {conv.unread > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#fff', background: '#4263EB', borderRadius: 999, padding: '2px 8px' }}>
                                {conv.unread} new
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ===== RIGHT: THREAD + COMPOSER ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {currentConversation ? (
                <>
                  {/* Thread header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 28px', borderBottom: '1px solid #E7E0D2', background: '#F7F3EA' }}>
                    <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: '#EDF0FE', color: '#1F2D6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                      {initialsOf(currentConversation.candidateName)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>{currentConversation.candidateName}</div>
                      {currentConversation.role && (
                        <div style={{ fontSize: 12.5, color: '#8A8378' }}>{currentConversation.role}</div>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {threadLoading ? (
                        <LoadingState label="Loading messages…" />
                      ) : threadError ? (
                        <ErrorState error={threadError} onRetry={() => loadThread(activeId)} />
                      ) : thread && thread.messages.length === 0 ? (
                        <EmptyState icon="✉" title="No messages yet" hint="Send the first message below to start the conversation." />
                      ) : (
                        thread?.messages.map((msg) => {
                          const mine = msg.sender === 'employer';
                          return (
                            <div key={msg._id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', animation: 'emrise 0.25s ease' }}>
                              <div style={{ maxWidth: '78%', borderRadius: 16, padding: '10px 14px', background: mine ? '#EDF0FE' : '#FBF8F1', border: `1px solid ${mine ? '#C7D2FB' : '#E6DECF'}`, color: mine ? '#1F2D6B' : '#2A2820' }}>
                                <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{msg.body}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4, fontSize: 11, color: mine ? '#6B79C9' : '#A79E8F' }}>
                                  <span>{formatTime(msg.createdAt)}</span>
                                  {mine && msg.read && <span aria-hidden>✓</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Composer */}
                  <div style={{ borderTop: '1px solid #E7E0D2', background: '#FBF8F1', padding: '16px 28px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>
                      {sendError && <InlineError error={sendError} />}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                        <textarea
                          rows={1}
                          placeholder="Type a message…"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={handleKeyDown}
                          style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.5, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 14, padding: '12px 14px', resize: 'none', minHeight: 46, maxHeight: 140 }}
                        />
                        <button
                          type="button"
                          onClick={handleSendMessage}
                          disabled={!canSend}
                          aria-label="Send message"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '12px 20px', cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.5 }}
                        >
                          Send <span aria-hidden>➤</span>
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: '#A79E8F' }}>
                        <span>Enter to send · Shift+Enter for a new line</span>
                        <span>{draft.length}/1000</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <EmptyState icon="✉" title="No conversation selected" hint="Select a conversation from the list to begin messaging." />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
