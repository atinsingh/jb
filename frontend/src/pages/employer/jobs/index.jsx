'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { employerJobsApi } from '@/services/employerApi';

const STATUS_LABEL = (s) => ({ active: 'Active', draft: 'Draft', closed: 'Closed', paused: 'Paused' }[s] || 'Active');
const STATUS_STYLE = {
  Active: { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' },
  Draft: { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' },
  Paused: { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' },
  Closed: { color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' },
};

const fmtSalary = (min, max) => {
  if (min && max) return `$${Number(min).toLocaleString()}–$${Number(max).toLocaleString()}`;
  if (min) return `From $${Number(min).toLocaleString()}`;
  if (max) return `Up to $${Number(max).toLocaleString()}`;
  return '';
};

const adaptJob = (j) => ({
  id: j._id,
  title: j.title || 'Untitled role',
  status: STATUS_LABEL(j.status),
  applications: j.applicantsCount ?? 0,
  date: j.createdAt || '',
  posted: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
  type: j.type || 'Full-time',
  location: j.location || (j.isRemote ? 'Remote' : '—'),
  salary: fmtSalary(j.salaryMin, j.salaryMax),
  views: j.views ?? 0,
  skills: Array.isArray(j.skills) ? j.skills : [],
});

const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286' };
const GRID = '2fr 0.9fr 1.2fr 0.8fr 0.7fr 0.8fr 1.4fr';

const selectStyle = {
  fontFamily: 'var(--jb-font-sans)', fontSize: 13, color: '#3A352C', background: '#FFFEFB', border: '1px solid #D9D0BE',
  borderRadius: 999, padding: '9px 30px 9px 14px', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238A8378' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
};

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
      if (q && !job.title.toLowerCase().includes(q) && !job.skills.some((s) => s.toLowerCase().includes(q))) return false;
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

  const stats = [
    { label: 'Total jobs', value: total, hint: `${drafts} draft${drafts === 1 ? '' : 's'}` },
    { label: 'Active', value: active, hint: total ? `${Math.round((active / total) * 100)}% of roles` : '—' },
    { label: 'Applicants', value: totalApps, hint: 'across all jobs' },
    { label: 'Avg / job', value: total ? Math.round(totalApps / total) : 0, hint: 'applicants per role' },
  ];

  const postBtn = (
    <Link href="/employer/jobs/post" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '10px 18px', textDecoration: 'none' }}>
      <span style={{ fontSize: 15, fontWeight: 400 }}>＋</span> Post a job
    </Link>
  );

  return (
    <>
      <Head>
        <title>Jobs · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp select:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-post:hover { background: #364fc7 !important; }
        #emapp .em-row:hover { background: #FBF9F4; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        #emapp .em-blue:hover { background: #364fc7 !important; }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="jobs" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={monoLabel}>Hiring · Jobs</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>{loading ? '…' : `${active} active`}</span>
          </header>

          <div style={{ padding: '20px 16px 48px', maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Jobs</h1>
                <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                  {loading ? 'Loading your open roles…' : `${active} active · ${total} total · ${totalApps} applicant${totalApps === 1 ? '' : 's'}`}
                </p>
              </div>
              {postBtn}
            </div>

            {/* Stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 18 }}>
                  <div style={monoLabel}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 30, fontWeight: 600, color: '#1B1A16', margin: '10px 0 4px' }}>{s.value}</div>
                  <div style={{ fontSize: 12.5, color: '#A79E8F' }}>{s.hint}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', flex: 1, minWidth: 220, width: '100%' }}>
                <span style={{ color: '#A79E8F', fontSize: 13 }}>⌕</span>
                <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search by title or skill…" style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }} />
              </div>
              <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} style={selectStyle}>
                <option value="all">All statuses</option><option>Active</option><option>Draft</option><option>Paused</option><option>Closed</option>
              </select>
              <select value={filters.jobType} onChange={(e) => setFilter('jobType', e.target.value)} style={selectStyle}>
                <option value="all">All types</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
              </select>
              <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} style={selectStyle}>
                <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="applications">Most applicants</option><option value="views">Most views</option>
              </select>
            </div>

            <InlineError error={actionError} />

            {/* Table */}
            {loading ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}><LoadingState label="Loading jobs…" /></div>
            ) : error ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}><ErrorState error={error} onRetry={load} /></div>
            ) : rows.length === 0 ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 44, textAlign: 'center' }}>
                <div style={{ fontSize: 26, opacity: 0.5, marginBottom: 8 }}>▨</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{filtering ? 'No matching jobs' : 'No jobs yet'}</div>
                <div style={{ fontSize: 13.5, color: '#8A8378', marginBottom: 16 }}>{filtering ? 'Try adjusting your search or filters.' : 'Post your first role to start receiving applicants.'}</div>
                {filtering ? (
                  <button className="em-ghost" onClick={() => setFilters({ status: 'all', search: '', sort: 'newest', jobType: 'all' })} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>Clear filters</button>
                ) : postBtn}
              </div>
            ) : (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 20px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                  {['Role', 'Status', 'Location', 'Applicants', 'Views', 'Posted', ''].map((h, i) => (
                    <span key={i} style={{ ...monoLabel, fontSize: 11, textAlign: i >= 3 && i <= 4 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {rows.map((job, i) => {
                  const ss = STATUS_STYLE[job.status] || STATUS_STYLE.Closed;
                  const divider = i < rows.length - 1 ? '#F2ECE0' : 'transparent';
                  return (
                    <div key={job.id} className="em-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${divider}` }}>
                      {/* Role */}
                      <Link href={`/employer/jobs/${job.id}/applications`} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {job.skills.slice(0, 3).map((s, j) => (
                            <span key={j} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#46413A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '2px 7px', borderRadius: 999 }}>{s}</span>
                          ))}
                          {job.skills.length > 3 && <span style={{ fontSize: 11, color: '#A79E8F' }}>+{job.skills.length - 3}</span>}
                          {job.salary && <span style={{ fontSize: 11.5, color: '#A79E8F' }}>{job.salary}</span>}
                        </div>
                      </Link>
                      {/* Status */}
                      <span style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: '3px 10px', borderRadius: 999 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ss.color }} />{job.status}
                      </span>
                      {/* Location */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, color: '#3A352C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.location}</div>
                        <div style={{ fontSize: 11.5, color: '#A79E8F' }}>{job.type}</div>
                      </div>
                      {/* Applicants */}
                      <span style={{ textAlign: 'right', fontFamily: 'var(--jb-font-mono)', fontSize: 14, fontWeight: 600, color: '#1B1A16' }}>{job.applications}</span>
                      {/* Views */}
                      <span style={{ textAlign: 'right', fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#8A8378' }}>{job.views}</span>
                      {/* Posted */}
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#8A8378' }}>{job.posted}</span>
                      {/* Actions */}
                      <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Link href={`/employer/jobs/${job.id}/applications`} className="em-ghost" style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '7px 13px', textDecoration: 'none' }}>View</Link>
                        {job.status === 'Draft' ? (
                          <button className="em-blue" onClick={() => publishJob(job.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>Publish</button>
                        ) : (
                          <button className="em-ghost" onClick={() => router.push(`/employer/jobs/${job.id}/edit`)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#5A544A', background: 'none', border: '1px solid transparent', borderRadius: 999, padding: '7px 12px', cursor: 'pointer' }}>Manage</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
