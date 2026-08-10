'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AgentSidebar from '@/components/agent/AgentSidebar';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  InlineError,
} from '@/components/employer/EmployerStates';
import { agentApi, APPLICATION_STATUSES } from '@/services/agentApi';

const ACCENT = '#7C5CFF';

/* --------------------------------------------------------------- helpers --- */
const idOf = (ref) => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return String(ref._id || ref.id || '');
};

const objOf = (ref) => (ref && typeof ref === 'object' ? ref : null);

const initials = (text = '') => {
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const jobTitle = (job) => job?.title || job?.role || 'Untitled role';
const jobCompany = (job) => job?.company || job?.companyName || 'Company';
const jobLocation = (job) =>
  job?.location || (job?.remote || job?.isRemote ? 'Remote' : '') || '—';

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted') return { color: '#157A49', bg: '#EAF6EE' };
  if (s === 'rejected') return { color: '#9B4A2F', bg: '#FBEDE4' };
  if (s === 'interviewed') return { color: '#4263EB', bg: '#EDF0FE' };
  if (s === 'reviewing') return { color: '#9A6A2E', bg: '#FBF1E2' };
  if (s === 'submitted') return { color: '#5B4BB8', bg: '#EEEAFB' };
  return { color: '#8A8378', bg: '#F2ECE0' };
};

const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18 };
const btnPrimary = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  color: '#FFFFFF',
  background: ACCENT,
  border: 'none',
  borderRadius: 9,
  padding: '9px 16px',
  cursor: 'pointer',
};
const btnGhost = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: '#1B1A16',
  background: '#fff',
  border: '1px solid #E4DED2',
  borderRadius: 9,
  padding: '9px 16px',
  cursor: 'pointer',
};

/* ------------------------------------------------- application row (write) --- */
function ApplicationRow({ app, onChanged }) {
  const appId = idOf(app);
  const job = objOf(app.jobId) || {};
  const [status, setStatus] = useState(app.status || 'submitted');
  const [notes, setNotes] = useState(app.agentNotes || '');
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState(null);
  const [savedFlash, setSavedFlash] = useState('');

  const tone = statusTone(status);
  const proof = Array.isArray(app.proofDocuments) ? app.proofDocuments : [];

  const flash = (msg) => {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(''), 2500);
  };

  const saveStatusNotes = async () => {
    setBusy(true);
    setRowError(null);
    try {
      await agentApi.updateApplication(appId, { status, agentNotes: notes });
      flash('Saved');
      onChanged && onChanged();
    } catch (err) {
      setRowError(err);
    } finally {
      setBusy(false);
    }
  };

  const uploadProof = async () => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setRowError(null);
    try {
      await agentApi.uploadProof(appId, files);
      setFiles(null);
      flash('Proof uploaded');
      onChanged && onChanged();
    } catch (err) {
      setRowError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '18px 22px', borderTop: '1px solid #F2ECE0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{jobTitle(job)}</div>
          <div style={{ fontSize: 12.5, color: '#8A8378' }}>
            {jobCompany(job)} · {jobLocation(job)}
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontFamily: 'var(--jb-font-mono)',
            fontSize: 11,
            fontWeight: 600,
            color: tone.color,
            background: tone.bg,
            padding: '5px 11px',
            borderRadius: 999,
            textTransform: 'capitalize',
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* STATUS */}
        <label style={{ fontSize: 12, color: '#5A544A' }}>
          <span style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              padding: '9px 12px',
              borderRadius: 9,
              border: '1px solid #E4DED2',
              background: '#fff',
              textTransform: 'capitalize',
            }}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* NOTES */}
        <label style={{ flex: 1, minWidth: 220, fontSize: 12, color: '#5A544A' }}>
          <span style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Agent notes</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note about this application…"
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 13,
              padding: '9px 12px',
              borderRadius: 9,
              border: '1px solid #E4DED2',
              background: '#fff',
            }}
          />
        </label>

        <button type="button" onClick={saveStatusNotes} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* PROOF */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #EEE7D9' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5A544A', marginBottom: 8 }}>
          Proof of application
        </div>
        {proof.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {proof.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: ACCENT,
                  background: '#F1EDFB',
                  border: '1px solid #DED4FA',
                  borderRadius: 8,
                  padding: '6px 11px',
                  textDecoration: 'none',
                }}
              >
                ↗ Document {i + 1}
              </a>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => setFiles(e.target.files)}
            style={{ fontSize: 12.5, color: '#5A544A' }}
          />
          <button
            type="button"
            onClick={uploadProof}
            disabled={busy || !files || files.length === 0}
            style={{ ...btnGhost, opacity: busy || !files || files.length === 0 ? 0.5 : 1 }}
          >
            Upload proof
          </button>
          <span style={{ fontSize: 11.5, color: '#A79E8F' }}>Up to 5 files (images / PDF)</span>
        </div>
      </div>

      {rowError && <InlineError error={rowError} />}
      {savedFlash && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#157A49' }}>
          ✓ {savedFlash}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------- match row (apply) --- */
function MatchRow({ match, hasApplication, onApplied }) {
  const matchId = idOf(match);
  const job = objOf(match.jobId) || {};
  const interested = String(match.interestStatus || '').toLowerCase() === 'interested';
  const applied = !!match.appliedAt || hasApplication;
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState(null);

  const apply = async () => {
    setBusy(true);
    setRowError(null);
    try {
      await agentApi.applyOnBehalf(matchId);
      onApplied && onApplied();
    } catch (err) {
      setRowError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '16px 22px', borderTop: '1px solid #F2ECE0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{jobTitle(job)}</div>
          <div style={{ fontSize: 12.5, color: '#8A8378' }}>
            {jobCompany(job)} · {jobLocation(job)}
            {typeof match.matchScore === 'number' ? ` · ${Math.round(match.matchScore)}% fit` : ''}
          </div>
        </div>

        {applied ? (
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: '#157A49',
              background: '#EAF6EE',
              padding: '5px 11px',
              borderRadius: 999,
            }}
          >
            ✓ Applied
          </span>
        ) : interested ? (
          <button type="button" onClick={apply} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1, flexShrink: 0 }}>
            {busy ? 'Applying…' : 'Apply on behalf'}
          </button>
        ) : (
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: '#8A8378',
              background: '#F2ECE0',
              padding: '5px 11px',
              borderRadius: 999,
              textTransform: 'capitalize',
            }}
          >
            {match.interestStatus || 'not confirmed'}
          </span>
        )}
      </div>
      {rowError && <InlineError error={rowError} />}
    </div>
  );
}

/* ---------------------------------------------------------- page --- */
export default function AgentCandidateDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await agentApi.candidateProfile(id);
      setProfile(res?.profile || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (router.isReady) load();
  }, [router.isReady, load]);

  const user = profile?.user || null;
  const jobProfiles = Array.isArray(profile?.profiles) ? profile.profiles : [];
  const matches = Array.isArray(profile?.matches) ? profile.matches : [];
  const applications = Array.isArray(profile?.applications) ? profile.applications : [];

  // Which job ids already have an application (so a match doesn't offer a
  // duplicate apply action the backend would reject).
  const appliedJobIds = new Set(applications.map((a) => idOf(a.jobId)));

  return (
    <>
      <Head>
        <title>{user ? `${user.name || 'Candidate'} — Concierge` : 'Candidate — Concierge'}</title>
      </Head>

      <style jsx global>{`
        #agapp ::-webkit-scrollbar {
          width: 8px;
        }
        #agapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
      `}</style>

      <div
        id="agapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AgentSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href="/agent/dashboard"
              style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}
            >
              ← My queue
            </Link>
            <div style={{ flex: 1 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                color: '#FFFFFF',
                background: ACCENT,
                borderRadius: 999,
                padding: '6px 12px',
              }}
            >
              ✦ AGENT
            </span>
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 1060, width: '100%', margin: '0 auto' }}>
            {loading ? (
              <LoadingState label="Loading candidate…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : !user ? (
              <EmptyState
                icon="○"
                title="Candidate not found"
                hint="This candidate may no longer be assigned to you."
              />
            ) : (
              <>
                {/* CANDIDATE HEADER */}
                <div style={{ ...card, padding: 26, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <span
                      style={{
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        borderRadius: 16,
                        background: '#241E3B',
                        color: '#B9A8FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 20,
                      }}
                    >
                      {initials(user.name || user.email)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h1
                        style={{
                          fontFamily: 'var(--jb-font-display)',
                          fontWeight: 400,
                          fontSize: 34,
                          lineHeight: 1.05,
                          margin: '0 0 4px',
                        }}
                      >
                        {user.name || 'Candidate'}
                      </h1>
                      <div style={{ fontSize: 13.5, color: '#8A8378' }}>
                        {user.email}
                        {user.location ? ` · ${user.location}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* JOB PROFILES / TARGETS */}
                  {jobProfiles.length > 0 && (
                    <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {jobProfiles.map((p) => (
                        <span
                          key={idOf(p)}
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: '#46413A',
                            background: '#F4EFE4',
                            border: '1px solid #E6DECF',
                            borderRadius: 999,
                            padding: '6px 12px',
                          }}
                        >
                          {p.title || p.name || p.targetRole || 'Job profile'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* INTERESTED MATCHES — APPLY ON BEHALF */}
                <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '20px 22px', borderBottom: matches.length ? '1px solid #EEE7D9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Matches to apply</h2>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>
                        {matches.length} assigned
                      </span>
                    </div>
                  </div>
                  {matches.length === 0 ? (
                    <EmptyState
                      icon="◇"
                      title="No matches assigned yet"
                      hint="Once roles are assigned to you for this candidate, you'll be able to apply on their behalf here."
                    />
                  ) : (
                    matches.map((m) => (
                      <MatchRow
                        key={idOf(m)}
                        match={m}
                        hasApplication={appliedJobIds.has(idOf(m.jobId))}
                        onApplied={load}
                      />
                    ))
                  )}
                </div>

                {/* APPLICATIONS — STATUS / NOTES / PROOF */}
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 22px', borderBottom: applications.length ? '1px solid #EEE7D9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Applications</h2>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>
                        {applications.length} submitted
                      </span>
                    </div>
                  </div>
                  {applications.length === 0 ? (
                    <EmptyState
                      icon="◷"
                      title="No applications yet"
                      hint="When you apply on this candidate's behalf, the application appears here so you can update its status and file proof."
                    />
                  ) : (
                    applications.map((a) => (
                      <ApplicationRow key={idOf(a)} app={a} onChanged={load} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
