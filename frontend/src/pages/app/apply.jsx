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
import AppTopNav from '@/components/app/AppTopNav';
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
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line)',
  borderRadius: 2,
  padding: 20,
  marginBottom: 12,
};
const chip = (bg, fg, bd) => ({
  display: 'inline-block',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.02em',
  padding: '2px 8px',
  borderRadius: 2,
  background: bg,
  color: fg,
  border: `1px solid ${bd}`,
});
const OK = chip('var(--jb-v3-ok-soft)', 'var(--jb-v3-accent)', 'var(--jb-v3-ok-line)');
const AI = chip('var(--jb-v3-warn-soft)', 'var(--jb-v3-warn)', 'var(--jb-v3-warn-line)');
const NEED = chip('var(--jb-v3-danger-soft)', 'var(--jb-v3-danger)', 'var(--jb-v3-danger-line)');

const primaryBtn = {
  fontFamily: 'inherit',
  fontSize: 13.5,
  fontWeight: 700,
  color: 'var(--jb-v3-accent-ink)',
  background: 'var(--jb-v3-accent)',
  border: 'none',
  borderRadius: 2,
  padding: '9px 18px',
  cursor: 'pointer',
};
const ghostBtn = {
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--jb-v3-fg-2)',
  background: 'transparent',
  border: '1px solid var(--jb-v3-line-2)',
  borderRadius: 2,
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
        <span style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-2)' }}>{answer.label}</span>
        <SourceTag source={answer.source} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--jb-v3-fg)', marginTop: 2, whiteSpace: 'pre-wrap' }}>
        {shown}
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              marginLeft: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--jb-v3-accent)',
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
        background: 'var(--jb-v3-danger-soft)',
        border: '1px solid var(--jb-v3-danger-line)',
        borderRadius: 2,
        padding: 13,
        marginBottom: 9,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--jb-v3-fg)' }}>{blocker.label}</span>
        <span style={NEED}>NEEDS YOU</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--jb-v3-fg-2)', margin: '4px 0 9px' }}>{blocker.reason}</p>

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
            border: '1px solid var(--jb-v3-line-2)',
            borderRadius: 2,
            padding: '8px 10px',
            background: 'var(--jb-v3-panel)',
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
              border: '1px solid var(--jb-v3-line-2)',
              borderRadius: 2,
              padding: '8px 10px',
              background: 'var(--jb-v3-panel)',
            }}
          />
          <button type="button" disabled={busy} onClick={() => send(text)} style={primaryBtn}>
            Save
          </button>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--jb-v3-fg-2)', margin: '8px 0 0' }}>
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
    <article style={{ ...card, borderColor: item.blockers.length ? 'var(--jb-v3-danger-line)' : 'var(--jb-v3-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--jb-v3-fg)', margin: 0 }}>
            {item.job.title} · {item.job.company}
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-2)', margin: '4px 0 0', fontFamily: MONO }}>
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
        <p style={{ fontSize: 12.5, color: 'var(--jb-v3-danger)', margin: '11px 0 0' }}>
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
        <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px dashed var(--jb-v3-line)' }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--jb-v3-fg-2)',
              letterSpacing: '0.04em',
              margin: '0 0 10px',
            }}
          >
            WHAT WILL BE SUBMITTED
          </p>
          {item.answers.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Nothing resolved yet.</p>
          ) : (
            item.answers.map((a, i) => <AnswerRow key={`${a.fieldName}-${i}`} answer={a} />)
          )}

          {item.screenshotUrl && (
            <a
              href={item.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--jb-v3-accent)' }}
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
            <div key={`draft-${i}`} style={{ marginTop: 13, paddingTop: 12, borderTop: '1px dashed var(--jb-v3-line)' }}>
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

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)' }}>
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'relative',
              
              
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              padding: '15px 32px',
              background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--jb-v3-line)',
            }}
          >
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--jb-v3-fg)', margin: 0 }}>Ready to send</h1>
            {data.clean > 0 && (
              <button type="button" disabled={busyId === 'bulk'} onClick={handleApproveClean} style={primaryBtn}>
                {busyId === 'bulk' ? 'Approving…' : `Approve ${data.clean} ready`}
              </button>
            )}
          </header>

          <div style={{ padding: '26px 32px 56px', width: '100%', maxWidth: 840 }}>
            <p style={{ fontSize: 14, color: 'var(--jb-v3-fg-2)', margin: '0 0 6px', lineHeight: 1.55 }}>
              We filled these in for you. Nothing is submitted until you approve it.
            </p>
            {data.total > 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)', margin: '0 0 20px', fontFamily: MONO }}>
                {data.total} prepared · {data.clean} ready · {data.needsYou} need you
              </p>
            )}

            {notice && (
              <div
                role="status"
                style={{
                  background: 'var(--jb-v3-accent-soft)',
                  border: '1px solid var(--jb-v3-accent-line)',
                  borderRadius: 2,
                  padding: '10px 13px',
                  fontSize: 13,
                  color: 'var(--jb-v3-accent)',
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
