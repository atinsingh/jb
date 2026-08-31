'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';

/* ------------------------------------------------------------- sample data ---
   Faithful port of the dc Component's convoData(). No dedicated backend
   endpoint exists for messaging, so these threads always seed the UI. */
const CONVO_DATA = [
  {
    id: 'marcus', name: 'Marcus Bell', sub: 'Your coach', company: 'Concierge',
    avBg: 'var(--jb-v3-ok)', avFg: 'var(--jb-v3-ok)', initials: 'MB', pinned: true, headerDot: true,
    time: '9:42 AM', unread: 0,
    headerSub: 'Your career coach · Active now',
    profileHref: 'App Concierge.dc.html', profileLabel: 'Concierge',
    groups: [
      { date: 'Mon, Jun 22', msgs: [
        { me: false, text: 'Morning Sarah — I pulled the Stripe and Figma roles into your shortlist. Both are strong fits for your systems background.', time: '8:30 AM' },
        { me: false, text: 'Want me to auto-apply to the Stripe Senior Product Designer role today?', time: '8:31 AM' },
        { me: true, text: 'Yes please — that one is my top choice.', time: '9:05 AM' },
      ] },
      { date: 'Today', msgs: [
        { me: false, text: 'Done. Stripe already moved you to the final round 🎉 Their recruiter Dana will reach out to schedule.', time: '9:40 AM' },
        { me: false, text: 'Let’s run a mock interview this week to prep. I’ll send a few times.', time: '9:42 AM' },
        { me: true, text: 'Perfect — thank you, Marcus!', time: '9:43 AM' },
      ] },
    ],
  },
  {
    id: 'stripe', name: 'Dana Whitfield', sub: 'Recruiter · Stripe', company: 'Stripe',
    avBg: 'var(--jb-v3-accent-soft)', avFg: 'var(--jb-v3-accent)', initials: 'DW', pinned: false, headerDot: false,
    time: '11:02 AM', unread: 2,
    headerSub: 'Recruiting · Stripe',
    profileHref: 'App Company.dc.html', profileLabel: 'Stripe',
    groups: [
      { date: 'Fri, Jun 26', msgs: [
        { me: false, text: 'Hi Sarah! Congratulations on reaching the final round for Senior Product Designer. I’d love to get you scheduled.', time: '3:12 PM' },
        { me: false, text: 'We’re looking at the week of June 30 — do you have a few windows that work?', time: '3:13 PM' },
      ] },
      { date: 'Today', msgs: [
        { me: true, text: 'Hi Dana — thrilled! I’m open Mon 6/30 morning or Wed 7/2 afternoon (PT).', time: '10:48 AM' },
        { me: false, text: 'Wed 7/2 at 1pm PT works great. It’ll be a 90-minute onsite loop: portfolio walkthrough + two craft sessions.', time: '11:01 AM' },
        { me: false, text: 'I’ll send the calendar invite shortly. Anything you need from us beforehand?', time: '11:02 AM' },
      ] },
    ],
  },
  {
    id: 'figma', name: 'Theo Marsh', sub: 'Talent · Figma', company: 'Figma',
    avBg: 'var(--jb-v3-control)', avFg: 'var(--jb-v3-fg)', initials: 'TM', pinned: false, headerDot: false,
    time: '10:30 AM', unread: 1,
    headerSub: 'Talent partner · Figma',
    profileHref: 'App Company.dc.html', profileLabel: 'Figma',
    groups: [
      { date: 'Wed, Jun 24', msgs: [
        { me: false, text: 'Hi Sarah, Theo from Figma Talent. Loved your design-systems work — open to chatting about our Design Systems role?', time: '2:05 PM' },
        { me: true, text: 'Hi Theo — yes, definitely interested.', time: '4:20 PM' },
      ] },
      { date: 'Today', msgs: [
        { me: false, text: 'Great! I’ll set up a 30-minute intro with the hiring manager. What’s your availability next week?', time: '10:30 AM' },
      ] },
    ],
  },
  {
    id: 'linear', name: 'Sam Okafor', sub: 'Recruiter · Linear', company: 'Linear',
    avBg: 'var(--jb-v3-control)', avFg: 'var(--jb-v3-fg)', initials: 'SO', pinned: false, headerDot: false,
    time: 'Jun 23', unread: 0,
    headerSub: 'Recruiting · Linear',
    profileHref: 'App Company.dc.html', profileLabel: 'Linear',
    groups: [
      { date: 'Tue, Jun 23', msgs: [
        { me: false, text: 'Hey Sarah — Sam from Linear. Your portfolio is fantastic. Would the Design Engineer role be interesting to you?', time: '1:15 PM' },
        { me: true, text: 'Thanks Sam! I’m weighing a few design-leaning roles — could we chat about scope?', time: '5:40 PM' },
        { me: false, text: 'Absolutely. It’s roughly 60% design / 40% front-end. Let’s find time this week.', time: '6:02 PM' },
      ] },
    ],
  },
];

function lastPreview(c) {
  const g = c.groups[c.groups.length - 1];
  const m = g.msgs[g.msgs.length - 1];
  return (m.me ? 'You: ' : '') + m.text;
}

export default function AppMessages() {
  const [selected, setSelected] = useState('marcus');
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState({});
  const msgRef = useRef(null);

  // Keep the thread scrolled to the bottom on mount and on every update
  // (mirrors componentDidMount/componentDidUpdate -> scrollBottom).
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [selected, sent]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const id = selected;
    setSent((s) => ({
      ...s,
      [id]: (s[id] || []).concat({ me: true, text, time: 'Now' }),
    }));
    setDraft('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ---- renderVals() port ---- */
  const sel = selected;

  const list = CONVO_DATA.map((c) => {
    const on = c.id === sel;
    const appended = sent[c.id] || [];
    const preview = appended.length ? 'You: ' + appended[appended.length - 1].text : lastPreview(c);
    const unread = on ? 0 : c.unread;
    const hasUnread = unread > 0;
    return {
      ...c,
      bg: on ? 'var(--jb-v3-control)' : 'transparent',
      bar: on ? 'var(--jb-v3-accent)' : 'transparent',
      nameWeight: hasUnread ? 700 : 600,
      timeColor: hasUnread ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)',
      subColor: c.pinned ? 'var(--jb-v3-ok)' : 'var(--jb-v3-fg-3)',
      previewColor: hasUnread ? 'var(--jb-v3-fg-2)' : 'var(--jb-v3-fg-3)',
      preview, hasUnread, unread,
    };
  });

  const active = CONVO_DATA.find((c) => c.id === sel);
  const groups = active.groups.map((g) => ({ date: g.date, msgs: g.msgs.slice() }));
  (sent[sel] || []).forEach((m) => groups[groups.length - 1].msgs.push(m));
  const groupsView = groups.map((g) => ({
    date: g.date,
    msgs: g.msgs.map((m) => ({
      text: m.text, time: m.time,
      align: m.me ? 'flex-end' : 'flex-start',
      bubbleBg: m.me ? 'var(--jb-v3-accent-soft)' : 'var(--jb-v3-panel)',
      bubbleBorder: m.me ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-line)',
      color: 'var(--jb-v3-fg)',
      radius: m.me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    })),
  }));

  const canSend = draft.trim().length > 0;
  const unreadTotal = CONVO_DATA.reduce((n, c) => n + (c.id === sel ? 0 : c.unread), 0);
  const placeholder = 'Message ' + active.name.split(' ')[0] + '…';
  const sendBg = canSend ? 'var(--jb-v3-accent)' : 'var(--jb-v3-ok-line)';
  const sendCursor = canSend ? 'pointer' : 'default';

  return (
    <>
      <Head>
        <title>Messages — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp input:focus,
        #jbapp textarea:focus {
          outline: none;
        }
        #jbapp .jb-convo:hover {
          background: var(--jb-v3-control) !important;
        }
        #jbapp .jb-icon-btn:hover {
          background: var(--jb-v3-control);
          color: var(--jb-v3-fg-2);
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

      <div
        id="jbapp"
        style={{ height: '100vh', overflow: 'hidden', background: 'var(--jb-v3-bg)', fontFamily: 'var(--jb-v3-font-display)', color: 'var(--jb-v3-fg)' }}
      >
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 28px', background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--jb-v3-line)' }}>
            <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)' }}>Workspace / Messages</div>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-accent)' }}>{unreadTotal} unread</span>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* ===== LEFT: CONVERSATION LIST ===== */}
            <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--jb-v3-line)', background: 'var(--jb-v3-panel)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flexShrink: 0, padding: '16px 16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '9px 14px' }}>
                  <span style={{ color: 'var(--jb-v3-fg-3)', fontSize: 13 }}>⌕</span>
                  <input placeholder="Search messages…" style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: 'var(--jb-v3-fg)' }} />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px' }}>
                {list.map((c) => (
                  <button
                    key={c.id}
                    className="jb-convo"
                    onClick={() => { setSelected(c.id); setDraft(''); }}
                    style={{ position: 'relative', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 12px', marginBottom: 3, border: 'none', background: c.bg, borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <span style={{ position: 'absolute', left: -10, top: 14, bottom: 14, width: 3, borderRadius: '0 3px 3px 0', background: c.bar }} />
                    <span style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, borderRadius: '50%', background: c.avBg, color: c.avFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                      {c.initials}
                      {c.headerDot && (
                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: 'var(--jb-v3-ok)', border: '2px solid var(--jb-v3-panel)' }} />
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {c.pinned && (
                          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--jb-v3-accent)', background: 'var(--jb-v3-accent-soft)', border: '1px solid var(--jb-v3-accent-line)', padding: '2px 6px', borderRadius: 2, flexShrink: 0 }}>PINNED</span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: c.nameWeight, color: 'var(--jb-v3-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: c.timeColor, flexShrink: 0 }}>{c.time}</span>
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: c.subColor, margin: '1px 0 3px' }}>{c.sub}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: c.previewColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview}</span>
                        {c.hasUnread && (
                          <span style={{ flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 2, background: 'var(--jb-v3-accent)', color: 'var(--jb-v3-accent-ink)', fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.unread}</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== RIGHT: THREAD ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--jb-v3-bg)' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 13, padding: '14px 26px', background: 'var(--jb-v3-panel)', borderBottom: '1px solid var(--jb-v3-line)' }}>
                <span style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, borderRadius: '50%', background: active.avBg, color: active.avFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {active.initials}
                  {active.headerDot && (
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: 'var(--jb-v3-ok)', border: '2px solid var(--jb-v3-panel)' }} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>{active.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)' }}>{active.headerSub}</div>
                </div>
                <Link href={appRoute(active.profileHref)} style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--jb-v3-accent)', textDecoration: 'none', border: '1px solid var(--jb-v3-accent-line)', background: 'var(--jb-v3-accent-soft)', padding: '7px 13px', borderRadius: 2 }}>{active.profileLabel}</Link>
              </div>

              <div ref={msgRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {groupsView.map((g, gi) => (
                  <div key={gi} style={{ display: 'contents' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                      <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', background: 'var(--jb-v3-line)', padding: '4px 12px', borderRadius: 2 }}>{g.date}</span>
                    </div>
                    {g.msgs.map((m, mi) => (
                      <div key={mi} style={{ display: 'flex', flexDirection: 'column', alignItems: m.align, animation: 'rbpop 0.2s ease' }}>
                        <div style={{ maxWidth: '74%', fontSize: 14, lineHeight: 1.5, color: m.color, background: m.bubbleBg, border: `1px solid ${m.bubbleBorder}`, borderRadius: m.radius, padding: '11px 15px' }}>{m.text}</div>
                        <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)', margin: '5px 3px 0' }}>{m.time}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ flexShrink: 0, padding: '14px 26px 18px', background: 'var(--jb-v3-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '7px 7px 7px 8px' }}>
                  <button title="Attach" className="jb-icon-btn" style={{ width: 38, height: 38, flexShrink: 0, border: 'none', background: 'none', borderRadius: '50%', cursor: 'pointer', color: 'var(--jb-v3-fg-3)', fontSize: 22, lineHeight: 1, fontWeight: 300 }}>+</button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={placeholder}
                    style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--jb-v3-fg)' }}
                  />
                  <button onClick={send} title="Send" style={{ width: 40, height: 40, flexShrink: 0, border: 'none', background: sendBg, color: 'var(--jb-v3-accent-ink)', borderRadius: '50%', cursor: sendCursor, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
