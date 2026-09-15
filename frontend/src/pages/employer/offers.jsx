'use client';

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { EmptyState, ErrorState, LoadingState } from '@/components/employer/EmployerStates';
import { employerJobsApi, employerOffersApi } from '@/services/employerApi';

const candidateName = (offer) => offer.candidate?.name || offer.candidateName || offer.applicant?.name || 'Candidate';
const recordId = (value) => String(value?._id || value || '');
const roleName = (offer, jobsById) =>
  offer.job?.title || offer.jobTitle || offer.role || jobsById[recordId(offer.jobId)]?.title || 'Role pending';

export default function EmployerOffersPage() {
  const [offers, setOffers] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offersResponse, jobsResponse] = await Promise.all([
        employerOffersApi.list(),
        employerJobsApi.list(),
      ]);
      setOffers(Array.isArray(offersResponse?.offers) ? offersResponse.offers : []);
      setJobsById(
        (jobsResponse?.jobs || []).reduce((result, job) => {
          result[recordId(job._id || job.id)] = job;
          return result;
        }, {}),
      );
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Head><title>Offers · Jobocate for Employers</title></Head>
      <div id="emapp" className="offers-page">
        <EmployerSidebar active="interviews" />
        <main>
          <div className="content">
            <div className="heading">
              <div><span>Hiring decisions</span><h1>Offers</h1></div>
              <strong>{offers.length} total</strong>
            </div>
            {loading && <LoadingState label="Loading offers…" tone="dark" />}
            {!loading && error && <ErrorState error={error} onRetry={load} tone="dark" />}
            {!loading && !error && offers.length === 0 && (
              <EmptyState title="No offers yet" hint="Offers created for finalists will appear here." tone="dark" />
            )}
            {!loading && !error && offers.length > 0 && (
              <section aria-label="Offers" className="offer-list">
                <div className="columns"><span>Candidate</span><span>Role</span><span>Status</span><span>Sent</span></div>
                {offers.map((offer) => (
                  <article key={offer._id || offer.id}>
                    <strong>{candidateName(offer)}</strong>
                    <span>{roleName(offer, jobsById)}</span>
                    <b>{offer.status || 'Draft'}</b>
                    <span>{offer.sentAt || offer.createdAt ? new Date(offer.sentAt || offer.createdAt).toLocaleDateString() : '—'}</span>
                  </article>
                ))}
              </section>
            )}
          </div>
        </main>
      </div>
      <style jsx>{`
        .offers-page { min-height: 100vh; display: flex; background: var(--jb-v3-bg); color: var(--jb-v3-fg); }
        main { flex: 1; min-width: 0; }
        .content { width: min(100%, 1160px); margin: 0 auto; padding: 44px 28px 80px; }
        .heading { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 32px; }
        .heading span, .heading > strong, .columns, .offer-list b { font-family: var(--jb-v3-font-mono); text-transform: uppercase; letter-spacing: .12em; }
        .heading span, .heading > strong { color: var(--jb-v3-fg-3); font-size: 10px; font-weight: 400; }
        h1 { margin: 7px 0 0; font-size: clamp(30px, 4vw, 44px); font-weight: 500; }
        .offer-list { border-top: 1px solid var(--jb-v3-line); }
        .columns, .offer-list article { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) 120px 110px; gap: 20px; align-items: center; }
        .columns { min-height: 38px; color: var(--jb-v3-fg-3); font-size: 9px; }
        .offer-list article { min-height: 62px; border-top: 1px solid var(--jb-v3-line); }
        .offer-list article strong { font-size: 14px; }
        .offer-list article span { color: var(--jb-v3-fg-2); font-size: 12px; }
        .offer-list b { color: var(--jb-v3-accent-faint); font-size: 9px; font-weight: 400; }
        @media (max-width: 700px) { .content { padding: 32px 18px 64px; } .columns { display: none; } .offer-list article { grid-template-columns: 1fr auto; padding: 15px 0; } .offer-list article span:last-child { display: none; } }
      `}</style>
    </>
  );
}
