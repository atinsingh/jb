'use client';

/**
 * Approval queue — /app/apply
 *
 * Applications are filled in completely by the server, then parked here. This
 * screen is the moment a human sees exactly what will be sent in their name.
 *
 * Two rules the layout exists to serve:
 *   - Every answer shows WHERE IT CAME FROM. Facts the candidate stated, answers
 *     we remembered, and prose a model drafted are visually distinct.
 *   - AI-drafted prose renders INLINE rather than behind a click. If reading a
 *     draft required a detour, bulk approval would be unusable — nearly every
 *     form asks "why us?" — and drafts would go out unread.
 *
 * Replaces the previous static mockup, which made no API calls at all and
 * carried a hardcoded sample cover letter.
 */

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  getApprovalQueue,
  answerBlocker,
  approveApplication,
  approveAllClean,
  declineApplication,
} from '@/services/applyQueueApi';

/* ---------------------------------------------------------------- style --- */
const MONO = 'var(--jb-font-mono, ui-monospace, monospace)';

const card = {
  background: '#FFFEFB',
  border: '1px solid #E6DECF',
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
};
const chip = (bg, fg, bd) => ({
  display: 'inline-block',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.02em',
  padding: '2px 8px',
  borderRadius: 999,
  background: bg,
  color: fg,
  border: `1px solid ${bd}`,
});
const OK = chip('#E3F5EA', '#157A49', '#B7E2CA');
const AI = chip('#FFF3D9', '#8A6100', '#F0DDAE');
const NEED = chip('#FDE4E0', '#B23A22', '#F0C4BB');

const primaryBtn = {
  fontFamily: 'inherit',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#0C2C1C',
  background: '#1FA463',
  border: 'none',
  borderRadius: 999,
  padding: '9px 18px',
  cursor: 'pointer',
};
const ghostBtn = {
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#6B655A',
  background: 'transparent',
  border: '1px solid #D9D0BE',
  borderRadius: 999,
  padding: '8px 15px',
  cursor: 'pointer',
};

/** Where an answer came from, so provenance is never ambiguous. */
function SourceTag({ source }) {
  if (source === 'ai_draft') return <span style={AI}>AI DRAFT · READ IT</span>;
  if (source === 'candidate') return <span style={OK}>YOU ANSWERED</span>;
  if (source === 'bank') return <span style={OK}>REMEMBERED</span>;
  return <span style={OK}>YOUR PROFILE</span>;
}

function AnswerRow({ answer }) {
  const [open, setOpen] = useState(false);
  const value = answer.value === null || answer.value === undefined ? '' : String(answer.value);
  const isLong = value.length > 180;
  const shown = open || !isLong ? value : `${value.slice(0, 180)}…`;

  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: '#6B655A' }}>{answer.label}</span>
        <SourceTag source={answer.source} />
      </div>
      <div style={{ fontSize: 13, color: '#1B1A16', marginTop: 2, whiteSpace: 'pre-wrap' }}>
        {shown}
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              marginLeft: 6,
              border: 'none',
              background: 'transparent',
              color: '#157A49',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {open ? 'less' : 'more'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A question only the candidate can answer, answered in place: buttons for a
 * short option list, a select for a long one, free text otherwise.
 */
function BlockerRow({ blocker, onAnswer, busy }) {
  const [text, setText] = useState('');
  const options = blocker.options || [];

  const send = (value) => {
    if (value === undefined || value === null || value === '') return;
    onAnswer(blocker, value);
  };

  return (
    <div
      style={{
        background: '#FDF6F4',
        border: '1px solid #F0C4BB',
        borderRadius: 11,
        padding: 13,
        marginBottom: 9,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1B1A16' }}>{blocker.label}</span>
        <span style={NEED}>NEEDS YOU</span>
      </div>
      <p style={{ fontSize: 12, color: '#8A6A61', margin: '4px 0 9px' }}>{blocker.reason}</p>

      {options.length > 0 && options.length <= 3 ? (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {options.map((o) => (
            <button key={o.value} type="button" disabled={busy} onClick={() => send(o.value)} style={ghostBtn}>
              {o.label}
            </button>
          ))}
        </div>
      ) : options.length > 3 ? (
        <select
          disabled={busy}
          defaultValue=""
          onChange={(e) => send(e.target.value)}
          style={{
            fontFamily: 'inherit',
            fontSize: 13,
            border: '1px solid #D9D0BE',
            borderRadius: 9,
            padding: '8px 10px',
            background: '#FFFEFB',
            maxWidth: '100%',
          }}
        >
          <option value="" disabled>
            Choose an answer…
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ display: 'flex', gap: 7 }}>
          <input
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your answer"
            aria-label={blocker.label}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontSize: 13,
              border: '1px solid #D9D0BE',
              borderRadius: 9,
              padding: '8px 10px',
              background: '#FFFEFB',
            }}
          />
          <button type="button" disabled={busy} onClick={() => send(text)} style={primaryBtn}>
            Save
          </button>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: '#6B655A', margin: '8px 0 0' }}>
        Saved for every future application — you only answer this once.
      </p>
    </div>
  );
}

function QueueCard({ item, onAnswer, onApprove, onDecline, busyId }) {
  const [expanded, setExpanded] = useState(false);
  const busy = busyId === item.id;
  const fromYou = item.answers.filter((a) => a.source !== 'ai_draft').length;

  return (
    <article style={{ ...card, borderColor: item.blockers.length ? '#E8A08D' : '#E6DECF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16', margin: 0 }}>
            {item.job.title} · {item.job.company}
          </h3>
          <p style={{ fontSize: 12.5, color: '#6B655A', margin: '4px 0 0', fontFamily: MONO }}>
            {item.matchScore}% match
            {item.job.country ? ` · ${item.job.country} ✓` : ''}
            {item.atsType ? ` · ${item.atsType}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={OK}>{fromYou} FROM YOU</span>
            {item.aiDraftCount > 0 && <span style={AI}>{item.aiDraftCount} AI DRAFT</span>}
            {item.blockers.length > 0 && <span style={NEED}>{item.blockers.length} NEEDS YOU</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
          <button
            type="button"
            disabled={busy || !item.isClean}
            onClick={() => onApprove(item)}
            title={item.isClean ? 'Approve for submission' : 'Answer the outstanding questions first'}
            style={{
              ...primaryBtn,
              opacity: item.isClean ? 1 : 0.45,
              cursor: item.isClean ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Working…' : 'Approve'}
          </button>
          <button type="button" onClick={() => setExpanded((e) => !e)} style={ghostBtn}>
            {expanded ? 'Hide' : 'Review'}
          </button>
          <button type="button" disabled={busy} onClick={() => onDecline(item)} style={ghostBtn}>
            Skip
          </button>
        </div>
      </div>

      {item.isExpired && (
        <p style={{ fontSize: 12.5, color: '#B23A22', margin: '11px 0 0' }}>
          This preparation has expired — the form may have changed since. It needs preparing again.
        </p>
      )}

      {/* Blockers always show: they are the only thing between the candidate and
          a finished application. */}
      {item.blockers.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {item.blockers.map((b) => (
            <BlockerRow
              key={b.questionKey}
              blocker={b}
              busy={busy}
              onAnswer={(bl, v) => onAnswer(item, bl, v)}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px dashed #E6DECF' }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#6B655A',
              letterSpacing: '0.04em',
              margin: '0 0 10px',
            }}
          >
            WHAT WILL BE SUBMITTED
          </p>
          {item.answers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8375' }}>Nothing resolved yet.</p>
          ) : (
            item.answers.map((a, i) => <AnswerRow key={`${a.fieldName}-${i}`} answer={a} />)
          )}

          {item.screenshotUrl && (
            <a
              href={item.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12.5, fontWeight: 600, color: '#157A49' }}
            >
              View the filled form →
            </a>
          )}
        </div>
      )}

      {/* AI drafts stay visible even when collapsed — reading them must be the
          default, not a detour. */}
      {!expanded &&
        item.answers
          .filter((a) => a.source === 'ai_draft')
          .map((a, i) => (
            <div key={`draft-${i}`} style={{ marginTop: 13, paddingTop: 12, borderTop: '1px dashed #E6DECF' }}>
              <AnswerRow answer={a} />
            </div>
          ))}
    </article>
  );
}

export default function ApplyQueuePage() {
  const [data, setData] = useState({ items: [], total: 0, clean: 0, needsYou: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getApprovalQueue());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnswer = async (item, blocker, value) => {
    setBusyId(item.id);
    setNotice('');
    try {
      await answerBlocker(item.id, {
        questionKey: blocker.questionKey,
        value,
        profileField: blocker.profileField,
        country: item.job.country,
      });
      await load();
    } catch (e) {
      setNotice(e.message || 'Could not save that answer.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (item) => {
    setBusyId(item.id);
    setNotice('');
    try {
      const res = await approveApplication(item.id);
      setNotice(res.message || 'Approved.');
      await load();
    } catch (e) {
      setNotice(e.message || 'Could not approve this application.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (item) => {
    setBusyId(item.id);
    try {
      await declineApplication(item.id);
      await load();
    } catch (e) {
      setNotice(e.message || 'Could not skip this application.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveClean = async () => {
    setBusyId('bulk');
    setNotice('');
    try {
      const res = await approveAllClean();
      setNotice(`Approved ${res.approved} of ${res.total} ready applications.`);
      await load();
    } catch (e) {
      setNotice(e.message || 'Could not approve.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Ready to send · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA' }}>
        <AppSidebar active="auto" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1B1A16', margin: 0 }}>Ready to send</h1>
            {data.clean > 0 && (
              <button type="button" disabled={busyId === 'bulk'} onClick={handleApproveClean} style={primaryBtn}>
                {busyId === 'bulk' ? 'Approving…' : `Approve ${data.clean} ready`}
              </button>
            )}
          </header>

          <div style={{ padding: '26px 32px 56px', width: '100%', maxWidth: 840 }}>
            <p style={{ fontSize: 14, color: '#6B655A', margin: '0 0 6px', lineHeight: 1.55 }}>
              We filled these in for you. Nothing is submitted until you approve it.
            </p>
            {data.total > 0 && (
              <p style={{ fontSize: 12.5, color: '#8A8375', margin: '0 0 20px', fontFamily: MONO }}>
                {data.total} prepared · {data.clean} ready · {data.needsYou} need you
              </p>
            )}

            {notice && (
              <div
                role="status"
                style={{
                  background: '#EAF6EE',
                  border: '1px solid #CDE9D6',
                  borderRadius: 11,
                  padding: '10px 13px',
                  fontSize: 13,
                  color: '#157A49',
                  marginBottom: 16,
                }}
              >
                {notice}
              </div>
            )}

            {loading ? (
              <LoadingState label="Loading your prepared applications…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : data.items.length === 0 ? (
              <EmptyState
                icon="◎"
                title="Nothing waiting on you"
                hint="Turn on auto-prepare for a job profile and we'll fill applications for your strongest matches, then hold them here for your approval."
                action={
                  <Link
                    href={appRoute('App Job Profiles.dc.html')}
                    style={{ ...primaryBtn, textDecoration: 'none', display: 'inline-block' }}
                  >
                    Set up a job profile →
                  </Link>
                }
              />
            ) : (
              data.items.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  busyId={busyId}
                  onAnswer={handleAnswer}
                  onApprove={handleApprove}
                  onDecline={handleDecline}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}
