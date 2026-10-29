'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

const initials = (text = '') => {
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function ConciergeInbox({
  threads,
  selectedId,
  onSelect,
  fetchMessages,
  postMessage,
  emptyTitle,
  emptyHint,
  emptyHref,
  emptyLabel,
  payHref,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [threadError, setThreadError] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const selectedRef = useRef(selectedId);
  const scroller = useRef(null);
  selectedRef.current = selectedId;
  const selected = threads.find((thread) => thread.id === selectedId) || null;

  useEffect(() => {
    let socket;
    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled || !token) return;
      socket = io(`${API_URL}/concierge`, { auth: { token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => {
        if (selectedRef.current) socket.emit('join', { with: selectedRef.current });
      });
      socket.on('message', (message) => {
        const open = selectedRef.current;
        if (!open || (message.candidateId !== open && message.employerId !== open)) return;
        const row = { ...message, mine: message.senderId !== open };
        setMessages((previous) => previous.some((item) => item.id === row.id) ? previous : [...previous, row]);
      });
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    setThreadError('');
    setMessages([]);
    fetchMessages(selectedId)
      .then((result) => { if (!cancelled) setMessages(result?.messages || []); })
      .catch((err) => { if (!cancelled) setThreadError(err.message || 'Could not load messages'); });
    socketRef.current?.emit('join', { with: selectedId });
    return () => { cancelled = true; };
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId) return;
    setSending(true);
    setThreadError('');
    setDraft('');
    const socket = socketRef.current;
    const landed = (saved) => {
      if (!saved?.id) return;
      setMessages((previous) => previous.some((row) => row.id === saved.id) ? previous : [...previous, saved]);
    };
    try {
      if (socket?.connected) {
        const saved = await new Promise((resolve) => socket.timeout(4000).emit('send', { with: selectedId, body: text }, (err, response) => resolve(err ? null : response)));
        if (saved?.id) landed({ ...saved, mine: saved.senderId !== selectedId });
        else if (saved?.error) throw new Error(saved.error);
        else landed(await postMessage(selectedId, text));
      } else {
        landed(await postMessage(selectedId, text));
      }
    } catch (err) {
      setDraft(text);
      setThreadError(err.message || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  if (!threads.length) {
    return (
      <div style={{ padding: 24, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{emptyTitle}</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--jb-v3-fg-2)', lineHeight: 1.5 }}>{emptyHint}</p>
        <Link href={emptyHref} style={{ fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', textDecoration: 'none', borderRadius: 2, padding: '10px 14px' }}>{emptyLabel}</Link>
      </div>
    );
  }

  return (
    <div className="inbox">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, alignContent: 'start' }}>
        {threads.map((thread) => {
          const on = thread.id === selectedId;
          return (
            <li key={thread.id}>
              <button type="button" onClick={() => onSelect(thread.id)} aria-current={on ? 'true' : undefined} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 12, color: 'var(--jb-v3-fg)', background: on ? 'var(--jb-v3-control)' : 'var(--jb-v3-panel)', border: `1px solid ${on ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line)'}`, borderRadius: 2, cursor: 'pointer', font: 'inherit' }}>
                <span aria-hidden style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--jb-v3-bg)', fontWeight: 700 }}>{initials(thread.name)}</span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{thread.name}</strong>
                  <span style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>{thread.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 480, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2 }}>
        <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--jb-v3-line)' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{selected?.name || 'Conversation'}</h2>
          {selected?.hint && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>{selected.hint}</p>}
        </header>
        <div ref={scroller} role="log" aria-live="polite" aria-relevant="additions" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          {threadError && <p role="alert" style={{ margin: 0, color: 'var(--jb-v3-fg)' }}>{threadError}{payHref ? <> <Link href={payHref}>Choose a duration</Link></> : null}</p>}
          {!threadError && messages.length === 0 && <p style={{ margin: 0, color: 'var(--jb-v3-fg-3)' }}>No messages yet. Say hello.</p>}
          {messages.map((message) => (
            <p key={message.id} style={{ margin: 0, maxWidth: '78%', alignSelf: message.mine ? 'flex-end' : 'flex-start', padding: '8px 12px', borderRadius: 2, background: message.mine ? 'var(--jb-v3-accent)' : 'var(--jb-v3-control)', color: message.mine ? 'var(--jb-v3-accent-ink)' : 'var(--jb-v3-fg)', whiteSpace: 'pre-wrap' }}>{message.body}</p>
          ))}
        </div>
        <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--jb-v3-line)' }}>
          <label style={{ flex: 1, minWidth: 0 }}>
            <span className="jb-skip">Message</span>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a message" aria-label="Message" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-control)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, font: 'inherit' }} />
          </label>
          <button type="submit" disabled={sending || !draft.trim()} style={{ font: 'inherit', fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: '10px 14px', cursor: 'pointer' }}>{sending ? 'Sending…' : 'Send'}</button>
        </form>
      </section>
      <style jsx>{`
        .inbox { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 16px; }
        @media (max-width: 720px) { .inbox { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
