'use client';

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { employerCompanyApi, employerJobsApi, employerPipelineApi } from '@/services/employerApi';

const SIZE_OPTIONS = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1001-5000 employees',
  '5000+ employees',
];

const EMPTY_FORM = {
  name: '',
  industry: '',
  size: '',
  website: '',
  hq: '',
  description: '',
  logoUrl: '',
  coverUrl: '',
};

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' };
const ghostBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' };
const fieldLabel = { ...monoLabel, display: 'block', marginBottom: 6 };

const svgProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Icon = {
  building: <svg {...svgProps}><rect x="5" y="3" width="14" height="18" rx="1.5" /><rect x="8" y="7" width="2" height="2" rx="0.4" /><rect x="14" y="7" width="2" height="2" rx="0.4" /><rect x="8" y="11" width="2" height="2" rx="0.4" /><rect x="14" y="11" width="2" height="2" rx="0.4" /><rect x="10.5" y="16" width="3" height="5" rx="0.4" /></svg>,
  users: <svg {...svgProps}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19 a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="7.5" r="2.3" /><path d="M15 13 a4.6 4.6 0 0 1 5.5 4.4" /></svg>,
  globe: <svg {...svgProps}><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3 a15 15 0 0 1 0 18 a15 15 0 0 1 0 -18" /></svg>,
  pin: <svg {...svgProps}><path d="M12 21 s-6.5 -5.5 -6.5 -10.5 a6.5 6.5 0 0 1 13 0 C18.5 15.5 12 21 12 21 Z" /><circle cx="12" cy="10.5" r="2.3" /></svg>,
};

export default function CompanyProfile() {
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, jobsRes, statsRes] = await Promise.all([
        employerCompanyApi.get(),
        employerJobsApi.list().catch(() => null),
        employerPipelineApi.stats().catch(() => null),
      ]);
      const c = companyRes?.company || {};
      setCompany(c);
      setFormData({ ...EMPTY_FORM, ...c });
      const openPositions = jobsRes
        ? Array.isArray(jobsRes.jobs)
          ? jobsRes.jobs.filter((j) => (j.status || 'active') === 'active').length
          : jobsRes.total || 0
        : null;
      setStats(
        statsRes || openPositions != null
          ? {
              openPositions,
              totalApplicants: statsRes?.total ?? null,
              interviewing: statsRes?.interview ?? null,
              hired: statsRes?.hired ?? null,
            }
          : null,
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await employerCompanyApi.update({
        name: formData.name,
        industry: formData.industry,
        size: formData.size,
        website: formData.website,
        hq: formData.hq,
        description: formData.description,
        logoUrl: formData.logoUrl,
        coverUrl: formData.coverUrl,
      });
      const c = res?.company || formData;
      setCompany(c);
      setFormData({ ...EMPTY_FORM, ...c });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...EMPTY_FORM, ...company });
    setSaveError(null);
    setIsEditing(false);
  };

  const statTiles = stats
    ? [
        { name: 'Open Positions', value: stats.openPositions },
        { name: 'Total Applicants', value: stats.totalApplicants },
        { name: 'Interviewing', value: stats.interviewing },
        { name: 'Hired', value: stats.hired },
      ].filter((s) => s.value != null)
    : [];

  return (
    <>
      <Head>
        <title>Company Profile · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp textarea:focus, #emapp select:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        @keyframes emrise { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="company" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Company · Profile</span>
            <div style={{ flex: 1 }} />
            {!loading && !error && (
              !isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)} className="em-blue-btn" style={blueBtn}>✎ Edit profile</button>
              ) : (
                <div style={{ display: 'flex', gap: 9 }}>
                  <button type="button" onClick={handleCancel} disabled={saving} className="em-ghost" style={{ ...ghostBtn, opacity: saving ? 0.5 : 1 }}>Cancel</button>
                  <button type="button" onClick={handleSubmit} disabled={saving} className="em-blue-btn" style={{ ...blueBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              )
            )}
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Company profile</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Manage the public profile candidates see on your careers page.</p>
            </div>

            {loading ? (
              <LoadingState label="Loading company profile…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {saveError && <div style={{ marginBottom: 16 }}><InlineError error={saveError} /></div>}

                {/* COVER + LOGO */}
                <div style={{ position: 'relative', marginBottom: 56 }}>
                  <div style={{ height: 176, borderRadius: 16, overflow: 'hidden', border: '1px solid #E6DECF', background: formData.coverUrl ? '#EDE7DA' : 'linear-gradient(120deg, #EDF0FE, #EAF6EE)' }}>
                    {formData.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8DA2F5' }}>
                        <span style={{ opacity: 0.6 }}>{Icon.building}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'absolute', left: 24, bottom: -36, width: 88, height: 88, borderRadius: 18, background: '#FFFEFB', border: '3px solid #FFFEFB', boxShadow: '0 8px 24px -12px rgba(27,26,22,0.35)', overflow: 'hidden' }}>
                    {formData.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.logoUrl} alt={formData.name || 'Company logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A79E8F' }}>{Icon.building}</div>
                    )}
                  </div>
                </div>

                {/* MAIN CARD */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 24 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'emrise 0.2s ease' }}>
                      <div>
                        <label htmlFor="name" style={fieldLabel}>Company name</label>
                        <input type="text" name="name" id="name" style={fieldInput} value={formData.name} onChange={handleInputChange} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                          <label htmlFor="industry" style={fieldLabel}>Industry</label>
                          <input type="text" name="industry" id="industry" style={fieldInput} value={formData.industry} onChange={handleInputChange} />
                        </div>
                        <div>
                          <label htmlFor="size" style={fieldLabel}>Company size</label>
                          <select id="size" name="size" style={{ ...fieldInput, appearance: 'none', cursor: 'pointer' }} value={formData.size} onChange={handleInputChange}>
                            <option value="">Select size…</option>
                            {SIZE_OPTIONS.map((s) => (<option key={s}>{s}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="website" style={fieldLabel}>Website</label>
                        <input type="text" name="website" id="website" placeholder="https://example.com" style={fieldInput} value={formData.website} onChange={handleInputChange} />
                      </div>
                      <div>
                        <label htmlFor="hq" style={fieldLabel}>Headquarters</label>
                        <input type="text" name="hq" id="hq" style={fieldInput} value={formData.hq} onChange={handleInputChange} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                          <label htmlFor="logoUrl" style={fieldLabel}>Logo URL</label>
                          <input type="text" name="logoUrl" id="logoUrl" placeholder="https://…" style={fieldInput} value={formData.logoUrl} onChange={handleInputChange} />
                        </div>
                        <div>
                          <label htmlFor="coverUrl" style={fieldLabel}>Cover image URL</label>
                          <input type="text" name="coverUrl" id="coverUrl" placeholder="https://…" style={fieldInput} value={formData.coverUrl} onChange={handleInputChange} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="description" style={fieldLabel}>About us</label>
                        <textarea id="description" name="description" rows={5} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.6 }} value={formData.description} onChange={handleInputChange} />
                        <p style={{ fontSize: 12, color: '#8A8378', margin: '8px 0 0' }}>Brief description about your company for candidates.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px', color: '#1B1A16' }}>{company.name || 'Your company'}</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginBottom: 20 }}>
                        {company.industry && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#5A544A' }}><span style={{ color: '#A79E8F' }}>{Icon.building}</span>{company.industry}</span>
                        )}
                        {company.size && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#5A544A' }}><span style={{ color: '#A79E8F' }}>{Icon.users}</span>{company.size}</span>
                        )}
                        {company.website && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#5A544A' }}>
                            <span style={{ color: '#A79E8F' }}>{Icon.globe}</span>
                            <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: '#4263EB', textDecoration: 'none', fontWeight: 600 }}>{company.website.replace(/^https?:\/\//, '')}</a>
                          </span>
                        )}
                        {company.hq && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#5A544A' }}><span style={{ color: '#A79E8F' }}>{Icon.pin}</span>{company.hq}</span>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid #F2ECE0', paddingTop: 18 }}>
                        <div style={{ ...monoLabel, marginBottom: 8 }}>About us</div>
                        <p style={{ fontSize: 14, lineHeight: 1.65, color: '#3A352C', margin: 0, whiteSpace: 'pre-line' }}>{company.description || 'No description added yet.'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* STATS */}
                {statTiles.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <div style={{ ...monoLabel, marginBottom: 13 }}>Company statistics</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                      {statTiles.map((stat) => (
                        <div key={stat.name} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: '18px 20px' }}>
                          <div style={{ fontSize: 13, color: '#8A8378', marginBottom: 6 }}>{stat.name}</div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 28, fontWeight: 600, color: '#1B1A16', lineHeight: 1 }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
