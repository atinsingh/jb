'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AgentSidebar from '@/components/agent/AgentSidebar';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/employer/EmployerStates';
import { agentApi } from '@/services/agentApi';

const ACCENT = '#7C5CFF';

/* --------------------------------------------------------------- helpers --- */
// A populated ref may be an object ({ _id }) or a raw id string.
const idOf = (ref) => {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return String(ref._id || ref.id || '');
};

const initials = (text = '') => {
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const jobOf = (m) => (m && typeof m.jobId === 'object' ? m.jobId : null) || {};
const jobTitle = (m) => jobOf(m).title || jobOf(m).role || 'Untitled role';
const jobCompany = (m) =>
  jobOf(m).company || jobOf(m).companyName || 'Company';

export default function AgentDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firstName, setFirstName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [candRes, matchRes] = await Promise.all([
        agentApi.assignedCandidates(),
        agentApi.assignedMatches(),
      ]);
      setCandidates(Array.isArray(candRes?.candidates) ? candRes.candidates : []);
      setMatches(Array.isArray(matchRes?.matches) ? matchRes.matches : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (stored?.name) setFirstName(String(stored.name).split(' ')[0]);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Matches grouped by candidate id.
  const matchesByCandidate = matches.reduce((acc, m) => {
    const cid = idOf(m.userId);
    if (!cid) return acc;
    (acc[cid] = acc[cid] || []).push(m);
    return acc;
  }, {});

  const totalMatches = matches.length;
  const appliedCount = matches.filter((m) => m.appliedAt).length;
  const awaitingCount = totalMatches - appliedCount;

  const stats = [
    { label: 'Assigned candidates', value: candidates.length },
    { label: 'Interested matches', value: totalMatches },
    { label: 'Awaiting apply', value: awaitingCount, color: '#C9622E' },
    { label: 'Applied for', value: appliedCount, color: '#157A49' },
  ];

  const card = {
    background: '#FFFEFB',
    border: '1px solid #E6DECF',
    borderRadius: 18,
  };

  return (
    <>
      <Head>
        <title>My queue — Jobocate Concierge</title>
      </Head>

      <style jsx global>{`
        #agapp ::-webkit-scrollbar {
          width: 8px;
        }
        #agapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #agapp a.ag-cand:hover {
          border-color: ${ACCENT};
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
        <AgentSidebar active="dashboard" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Concierge / My queue
            </div>
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

          <div style={{ padding: '30px 32px 56px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            {/* GREETING */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: '0 0 8px',
                }}
              >
                {firstName ? `Welcome back, ${firstName}.` : 'Your concierge queue.'}
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Candidates assigned to you and the roles they&rsquo;re interested in. Apply on their behalf, then file proof.
              </p>
            </div>

            {loading ? (
              <LoadingState label="Loading your queue…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* STAT CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
                  {stats.map((s) => (
                    <div key={s.label} style={{ ...card, borderRadius: 16, padding: 20 }}>
                      <div
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#9A9286',
                          marginBottom: 12,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 34,
                          fontWeight: 600,
                          lineHeight: 1,
                          color: s.color || '#1B1A16',
                        }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CANDIDATE QUEUE */}
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEE7D9' }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Assigned candidates</h2>
                  </div>

                  {candidates.length === 0 ? (
                    <EmptyState
                      icon="○"
                      title="No candidates assigned yet"
                      hint="When a candidate on a concierge plan is assigned to you, they'll appear here with the roles they want you to apply to."
                    />
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {candidates.map((c) => {
                        const cid = idOf(c);
                        const cMatches = matchesByCandidate[cid] || [];
                        const cApplied = cMatches.filter((m) => m.appliedAt).length;
                        const cAwaiting = cMatches.length - cApplied;
                        const preview = cMatches
                          .slice(0, 3)
                          .map((m) => `${jobTitle(m)} · ${jobCompany(m)}`)
                          .join('  •  ');
                        return (
                          <Link
                            key={cid}
                            href={`/agent/candidate/${cid}`}
                            className="ag-cand"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              margin: '4px 14px',
                              padding: '16px 16px',
                              background: '#FBF9F4',
                              border: '1px solid #E6DECF',
                              borderRadius: 14,
                              textDecoration: 'none',
                            }}
                          >
                            <span
                              style={{
                                width: 46,
                                height: 46,
                                flexShrink: 0,
                                borderRadius: 12,
                                background: '#241E3B',
                                color: '#B9A8FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              {initials(c.name || c.email)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>
                                {c.name || c.email || 'Candidate'}
                              </div>
                              <div style={{ fontSize: 12.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {cMatches.length > 0 ? preview : 'No interested roles yet'}
                              </div>
                            </div>
                            {cAwaiting > 0 && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontFamily: 'var(--jb-font-mono)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#FFFFFF',
                                  background: '#C9622E',
                                  borderRadius: 999,
                                  padding: '4px 10px',
                                }}
                              >
                                {cAwaiting} to apply
                              </span>
                            )}
                            {cApplied > 0 && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontFamily: 'var(--jb-font-mono)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#157A49',
                                  background: '#EAF6EE',
                                  borderRadius: 999,
                                  padding: '4px 10px',
                                }}
                              >
                                {cApplied} applied
                              </span>
                            )}
                            <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                          </Link>
                        );
                      })}
                    </div>
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
