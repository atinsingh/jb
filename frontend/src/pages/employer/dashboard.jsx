'use client';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AppShell } from '@/components/app/AppTopNav';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState } from '@/components/employer/EmployerStates';
import { employerJobsApi } from '@/services/employerApi';
import styles from '@/components/employer/EmployerWorkspace.module.css';

export default function EmployerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { const result = await employerJobsApi.list(); setJobs(result.jobs || []); }
    catch (err) { setError(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const active = jobs.filter(job => job.status === 'active');
  const metrics = [
    ['Total jobs', jobs.length], ['Active roles', active.length],
    ['Drafts', jobs.filter(job => job.status === 'draft').length],
    ['Applicants', jobs.reduce((sum, job) => sum + (job.applicantCount || 0), 0)],
  ];
  return <>
    <Head><title>Employer dashboard · Jobocate</title></Head>
    <div id="emapp" className={styles.workspace}>
      <EmployerSidebar />
      <AppShell><main className={styles.main}>
        <header className={styles.heading}>
          <div><p className={styles.eyebrow}>Your dashboard</p><h1>Employer dashboard</h1><p className={styles.muted}>A clear view of your hiring across companies.</p></div>
          <Link href="/employer/jobs/post" className={styles.primary}>Post a job</Link>
        </header>
        {loading ? <LoadingState label="Loading jobs…" tone="dark" /> : error ? <ErrorState error={error} onRetry={load} tone="dark" /> : <>
          <section aria-label="Hiring metrics" className={styles.stats}>{metrics.map(([label, value]) => <section key={label} role="group" aria-label={label} className={styles.stat}><h2>{label}</h2><p>{value}</p></section>)}</section>
          <section aria-label="Active roles" className={styles.panel}>
            <div className={styles.panelHeading}><h2>Active roles</h2><Link href="/employer/jobs">All jobs →</Link></div>
            {active.length ? active.slice(0, 5).map(job => <Link className={styles.role} key={job._id} href={'/employer/jobs/' + job._id + '/applications'}>
              <div><strong>{job.title}</strong><span>{job.companyName || 'Company not specified'}</span></div>
              <span>{job.location || (job.isRemote ? 'Remote' : 'Location not specified')}</span><span>{job.applicantCount || 0} applied</span>
            </Link>) : <div><p className={styles.muted}>Your next hire starts here. Create a role to start receiving applications.</p><Link href="/employer/jobs/post" className={styles.button}>Post your first job</Link></div>}
          </section>
        </>}
      </main></AppShell>
    </div>
  </>;
}
