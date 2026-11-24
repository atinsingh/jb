'use client';

import { useState } from 'react';
import Head from 'next/head';
import { AppShell } from '@/components/app/AppTopNav';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { ErrorState, LoadingState } from '@/components/employer/EmployerStates';
import { employerCandidateSearchApi } from '@/services/employerApi';

const DEFAULT_LIMIT = 20;
const MAX_SKILLS = 8;

export default function EmployerCandidateSearch() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [lastQuery, setLastQuery] = useState({ q: '', role: '' });
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);

  const load = async (filters, nextPage) => {
    setLoading(true);
    setError(null);
    try {
      const result = await employerCandidateSearchApi.list({ ...filters, page: nextPage });
      const list = Array.isArray(result.candidates) ? result.candidates : [];
      setCandidates(list);
      setPage(typeof result.page === 'number' ? result.page : nextPage);
      setLimit(typeof result.limit === 'number' ? result.limit : DEFAULT_LIMIT);
      setTotal(typeof result.total === 'number' ? result.total : list.length);
    } catch (err) {
      setCandidates([]);
      setTotal(0);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = q.trim();
    const targeted = role.trim();
    setSearched(true);
    if (!name && !targeted) {
      setCandidates([]);
      setTotal(0);
      setError(new Error('Enter a name or a role'));
      return;
    }
    const filters = { q: name, role: targeted };
    setLastQuery(filters);
    await load(filters, 1);
  };

  const goToPage = (nextPage) => load(lastQuery, nextPage);

  const shownTotal = total;
  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = rangeStart + candidates.length - 1;
  const hasPrevious = page > 1;
  const hasNext = page * limit < shownTotal;

  return <>
    <Head><title>Candidates · Jobocate for Employers</title></Head>
    <div id="emapp" className={styles.workspace}>
      <EmployerSidebar />
      <AppShell><main className={styles.main}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Your hiring workspace</p>
            <h1>Candidates</h1>
            <p className={styles.muted}>Search logged-in candidates by name, skill, or the roles their own résumés target. A résumé written for someone else is not included.</p>
          </div>
        </header>
        <form onSubmit={submit} className="cs-form">
          <input aria-label="Name or skill" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or skill" />
          <input aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Role" />
          <button className={styles.primary} type="submit">Search</button>
        </form>
        {loading ? <LoadingState label="Searching candidates…" tone="dark" /> : null}
        {!loading && error ? <ErrorState error={error} tone="dark" /> : null}
        {!loading && searched && !error && candidates.length === 0 ? (
          <section className={styles.panel}>
            <h2>No candidates</h2>
            <p className={styles.muted}>No identity-matched résumé targets that search.</p>
          </section>
        ) : null}
        {!loading && !error && candidates.length > 0 ? (
          <>
            <p className={styles.muted}>{`Showing ${rangeStart}–${rangeEnd} of ${shownTotal}`}</p>
            <ul aria-label="Search results" className="cs-results">
              {candidates.map((candidate) => {
                const matched = new Set(candidate.matchedRoles || []);
                return (
                  <li key={candidate.candidateId} className="cs-card">
                    <h2>{candidate.name}</h2>
                    {candidate.headline ? <p className={styles.muted}>{candidate.headline}</p> : null}
                    {candidate.location ? <p className={styles.muted}>{candidate.location}</p> : null}
                    {(candidate.targetRoles || []).length > 0 ? (
                      <div className="cs-row">
                        <span className="cs-label">Targeting</span>
                        {candidate.targetRoles.map((targetRole) => (
                          <span key={targetRole} className={matched.has(targetRole) ? 'cs-chip cs-chip-match' : 'cs-chip'}>{targetRole}</span>
                        ))}
                      </div>
                    ) : null}
                    {(candidate.skills || []).length > 0 ? (
                      <div className="cs-row">
                        <span className="cs-label">Skills</span>
                        {candidate.skills.slice(0, MAX_SKILLS).map((skill) => (
                          <span key={skill} className="cs-chip">{skill}</span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {shownTotal > limit ? (
              <div className="cs-row">
                <button className={styles.button} type="button" disabled={!hasPrevious || loading} onClick={() => goToPage(page - 1)}>Previous</button>
                <button className={styles.button} type="button" disabled={!hasNext || loading} onClick={() => goToPage(page + 1)}>Next</button>
              </div>
            ) : null}
          </>
        ) : null}
      </main></AppShell>
    </div>
    <style jsx>{`
      .cs-form { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 18px; }
      .cs-form input { flex: 1 1 220px; min-width: 0; padding: 10px 12px; border: 1px solid var(--jb-v3-line-2); border-radius: 8px; background: var(--jb-v3-panel); color: var(--jb-v3-fg); font: inherit; }
      .cs-results { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      .cs-card { border: 1px solid var(--jb-v3-line); border-radius: 12px; background: var(--jb-v3-panel); padding: 16px 18px; }
      .cs-card h2 { margin: 0 0 4px; }
      .cs-card p { margin: 0 0 4px; }
      .cs-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
      .cs-label { margin-right: 4px; font-size: 12px; color: var(--jb-v3-fg-3); }
      .cs-chip { display: inline-block; border: 1px solid var(--jb-v3-line-2); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: var(--jb-v3-fg-2); }
      .cs-chip-match { border-color: var(--jb-v3-accent); color: var(--jb-v3-fg); }
    `}</style>
  </>;
}
