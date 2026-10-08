'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/app/AppTopNav';
import styles from '@/components/employer/EmployerWorkspace.module.css';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import EmployerCredits from '@/components/employer/EmployerCredits';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { employerJobsApi } from '@/services/employerApi';

const STATUS_LABEL = (s) => ({ active: 'Active', draft: 'Draft', closed: 'Closed', paused: 'Paused' }[s] || 'Active');

const fmtSalary = (min, max) => {
  if (min && max) return `$${Number(min).toLocaleString()}–$${Number(max).toLocaleString()}`;
  if (min) return `From $${Number(min).toLocaleString()}`;
  if (max) return `Up to $${Number(max).toLocaleString()}`;
  return '';
};

const adaptJob = (j) => ({
  id: j._id,
  title: j.title || 'Untitled role',
  company: j.companyName || 'Company not specified',
  status: STATUS_LABEL(j.status),
  applications: j.applicantCount ?? 0,
  date: j.createdAt || '',
  posted: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
  type: j.type || 'Full-time',
  location: j.location || (j.isRemote ? 'Remote' : '—'),
  salary: fmtSalary(j.salaryMin, j.salaryMax),
  views: j.views ?? 0,
  skills: Array.isArray(j.skills) ? j.skills : [],
});

export default function EmployerJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', search: '', sort: 'newest', jobType: 'all' });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await employerJobsApi.list();
      const arr = Array.isArray(res?.jobs) ? res.jobs : [];
      setJobs(arr.map(adaptJob));
    } catch (err) { setError(err); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const publishJob = async (id) => {
    setActionError(null);
    try {
      const res = await employerJobsApi.setStatus(id, 'active');
      const updated = res?.job;
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: updated ? STATUS_LABEL(updated.status) : 'Active' } : j)));
    } catch (err) { setActionError(err); }
  };

  const setFilter = (name, value) => setFilters((p) => ({ ...p, [name]: value }));

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = jobs.filter((job) => {
      if (filters.status !== 'all' && job.status !== filters.status) return false;
      if (filters.jobType !== 'all' && job.type !== filters.jobType) return false;
      if (q && !job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q) && !job.skills.some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (filters.sort === 'newest') return new Date(b.date) - new Date(a.date);
      if (filters.sort === 'oldest') return new Date(a.date) - new Date(b.date);
      if (filters.sort === 'applications') return b.applications - a.applications;
      if (filters.sort === 'views') return b.views - a.views;
      return 0;
    });
  }, [jobs, filters]);

  const total = jobs.length;
  const active = jobs.filter((j) => j.status === 'Active').length;
  const drafts = jobs.filter((j) => j.status === 'Draft').length;
  const totalApps = jobs.reduce((s, j) => s + j.applications, 0);
  const filtering = filters.search || filters.status !== 'all' || filters.jobType !== 'all';

  return <>
    <Head><title>Jobs · Jobocate for Employers</title></Head>
    <div id="emapp" className={styles.workspace}>
      <EmployerSidebar />
      <AppShell><main className={styles.main}>
        <header className={styles.heading}>
          <div><p className={styles.eyebrow}>Your hiring workspace</p><h1>Jobs</h1><p className={styles.muted}>Create roles for any company and manage your applications.</p></div>
          <Link className={styles.primary} href="/employer/jobs/post">Post a job</Link>
        </header>
        <EmployerCredits />
        <section className={styles.stats} aria-label="Job totals">
          {[['Total jobs', total], ['Active', active], ['Drafts', drafts], ['Applicants', totalApps]].map(([label, value]) => <section key={label} role="group" aria-label={label} className={styles.stat}><h2>{label}</h2><p>{loading ? '…' : error ? '—' : value}</p></section>)}
        </section>
        <div className={styles.toolbar}>
          <input aria-label="Search jobs" value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Search by title, company or skill…" />
          <select aria-label="Status" value={filters.status} onChange={event => setFilter('status', event.target.value)}><option value="all">All statuses</option><option>Active</option><option>Draft</option><option>Paused</option><option>Closed</option></select>
          <select aria-label="Job type" value={filters.jobType} onChange={event => setFilter('jobType', event.target.value)}><option value="all">All types</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select>
          <select aria-label="Sort jobs" value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="applications">Most applicants</option><option value="views">Most views</option></select>
        </div>
        <InlineError error={actionError} />
        {loading ? <LoadingState label="Loading jobs…" tone="dark" /> : error ? <ErrorState error={error} onRetry={load} tone="dark" /> : !rows.length ? <section className={styles.panel}>
          <h2>{filtering ? 'No matching jobs' : 'No jobs yet'}</h2>
          <p className={styles.muted}>{filtering ? 'Try adjusting your search or filters.' : 'Post your first role to start receiving applicants.'}</p>
          {filtering ? <button className={styles.button} onClick={() => setFilters({ status: 'all', search: '', sort: 'newest', jobType: 'all' })}>Clear filters</button> : <Link className={styles.button} href="/employer/jobs/post">Post your first job</Link>}
        </section> : <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Your jobs">
            <thead><tr>{['Role', 'Status', 'Location', 'Applicants', 'Views', 'Posted', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{rows.map(job => <tr key={job.id}>
              <td><Link className={styles.title} href={'/employer/jobs/' + job.id + '/applications'}>{job.title}</Link><small>{job.company}</small>{job.skills.length > 0 && <small>{job.skills.slice(0, 3).join(' · ')}</small>}{job.salary && <small>{job.salary}</small>}</td>
              <td><span className={styles.badge + (job.status === 'Active' ? ' ' + styles.active : '')}>{job.status}</span></td>
              <td>{job.location}<small>{job.type}</small></td><td>{job.applications}</td><td>{job.views}</td><td>{job.posted}</td>
              <td><div className={styles.actions}><Link className={styles.button} href={'/employer/jobs/' + job.id + '/applications'}>View</Link>
                {job.status === 'Draft' ? <button className={styles.primary} onClick={() => publishJob(job.id)}>Publish</button> : <button className={styles.button} onClick={() => router.push('/employer/jobs/post?jobId=' + job.id)}>Manage</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </main></AppShell>
    </div>
  </>;
}
