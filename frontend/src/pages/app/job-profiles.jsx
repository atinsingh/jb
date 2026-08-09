'use client';

/**
 * Job Profiles — /app/job-profiles
 *
 * A job profile is one targeted search: a role, the countries it targets, its
 * own match threshold, its own résumé, and its own auto-apply switch. Running
 * several at once is the point — "Backend — Canada" and "Staff SWE — remote,
 * global" are different searches for the same person.
 *
 * The `job-profiles` backend has existed with full CRUD and no frontend caller
 * at all; this page is that caller. `targetCountries` set here drives the
 * Stage-1a geo pre-filter and gates auto-apply.
 */

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import CountryPicker, { countryLabel } from '@/components/app/CountryPicker';
import {
  listJobProfiles,
  createJobProfile,
  updateJobProfile,
  setJobProfileActive,
  deleteJobProfile,
  uploadJobProfileResume,
  getMatchPreviewForProfile,
} from '@/services/jobProfileApi';

const JOB_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const blank = () => ({
  profileName: '',
  role: '',
  level: '',
  jobType: 'remote',
  targetCountries: [],
  skills: [],
  salaryMin: '',
  minMatchScore: 75,
  autoApply: false,
});

/* ------------------------------------------------------------ styles --- */
const card = {
  background: '#FFFEFB',
  border: '1px solid #E6DECF',
  borderRadius: 18,
  padding: 22,
};
const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#1B1A16',
  marginBottom: 5,
};
const inputStyle = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  color: '#1B1A16',
  background: '#FFFEFB',
  border: '1px solid #D9D0BE',
  borderRadius: 10,
  padding: '10px 12px',
};
const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  color: '#0C2C1C',
  background: '#1FA463',
  border: 'none',
  borderRadius: 999,
  padding: '11px 20px',
  cursor: 'pointer',
};
const ghostBtn = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: '#6B655A',
  background: 'transparent',
  border: '1px solid #D9D0BE',
  borderRadius: 999,
  padding: '9px 16px',
  cursor: 'pointer',
};

/* ---------------------------------------------------------- normalize --- */
function normalizeProfiles(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.profiles || payload?.data || [];
  return list.map((p) => ({
    ...p,
    id: String(p._id || p.id),
    targetCountries: Array.isArray(p.targetCountries) ? p.targetCountries : [],
    skills: Array.isArray(p.skills) ? p.skills : [],
  }));
}

export default function JobProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | profileId
  const [draft, setDraft] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfiles(normalizeProfiles(await listJobProfiles()));
    } catch (e) {
      setError(e.message || 'Could not load your job profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setDraft(blank());
    setFormError('');
    setPreview(null);
    setEditing('new');
  };

  const startEdit = (p) => {
    setDraft({
      profileName: p.profileName || '',
      role: p.role || '',
      level: p.level || '',
      jobType: p.jobType || 'remote',
      targetCountries: p.targetCountries,
      skills: p.skills,
      salaryMin: p.salaryMin ?? '',
      minMatchScore: p.minMatchScore ?? 75,
      autoApply: !!p.autoApply,
    });
    setFormError('');
    setPreview(null);
    setEditing(p.id);
  };

  const payloadFromDraft = () => {
    const body = {
      profileName: draft.profileName.trim(),
      role: draft.role.trim(),
      jobType: draft.jobType,
      targetCountries: draft.targetCountries,
      skills: draft.skills,
      minMatchScore: Number(draft.minMatchScore) || 75,
      autoApply: !!draft.autoApply,
    };
    if (draft.level.trim()) body.level = draft.level.trim();
    if (draft.salaryMin !== '' && !Number.isNaN(Number(draft.salaryMin))) {
      body.salaryMin = Number(draft.salaryMin);
    }
    return body;
  };

  const save = async () => {
    if (!draft.profileName.trim()) {
      setFormError('Give this profile a name so you can tell your searches apart.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') await createJobProfile(payloadFromDraft());
      else await updateJobProfile(editing, payloadFromDraft());
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e.message || 'Could not save this profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await setJobProfileActive(p.id, !p.active);
      await load();
    } catch (e) {
      setError(e.message || 'Could not change this profile.');
    }
  };

  const remove = async (p) => {
    try {
      await deleteJobProfile(p.id);
      await load();
    } catch (e) {
      setError(e.message || 'Could not delete this profile.');
    }
  };

  const attachResume = async (p, file) => {
    if (!file) return;
    try {
      await uploadJobProfileResume(p.id, file);
      await load();
    } catch (e) {
      setError(e.message || 'Could not attach that résumé.');
    }
  };

  // Real counts explaining what this profile does to the pool.
  const checkImpact = async (profileId) => {
    try {
      setPreview(await getMatchPreviewForProfile(profileId));
    } catch {
      setPreview(null);
    }
  };

  return (
    <>
      <Head>
        <title>Job profiles · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA' }}>
        <AppSidebar active="job-profiles" />

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
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1B1A16', margin: 0 }}>
              Job profiles
            </h1>
            {editing === null && (
              <button type="button" onClick={startNew} style={primaryBtn}>
                + New profile
              </button>
            )}
          </header>

          <div style={{ padding: '30px 32px 56px', width: '100%', maxWidth: 880 }}>
            <p style={{ fontSize: 14, color: '#6B655A', margin: '0 0 22px', lineHeight: 1.55 }}>
              Each profile is a separate search. The countries you target here decide which jobs
              you see — and auto-apply never runs outside them.
            </p>

            {error && <ErrorState error={error} onRetry={load} />}

            {editing !== null && (
              <section style={{ ...card, marginBottom: 22 }}>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16', margin: '0 0 16px' }}>
                  {editing === 'new' ? 'New profile' : 'Edit profile'}
                </h2>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label htmlFor="jp-name" style={labelStyle}>
                      Profile name
                    </label>
                    <input
                      id="jp-name"
                      style={inputStyle}
                      value={draft.profileName}
                      onChange={(e) => setDraft({ ...draft, profileName: e.target.value })}
                      placeholder="Backend — Canada"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label htmlFor="jp-role" style={labelStyle}>
                        Role
                      </label>
                      <input
                        id="jp-role"
                        style={inputStyle}
                        value={draft.role}
                        onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                        placeholder="Senior Backend Engineer"
                      />
                    </div>
                    <div>
                      <label htmlFor="jp-level" style={labelStyle}>
                        Level
                      </label>
                      <input
                        id="jp-level"
                        style={inputStyle}
                        value={draft.level}
                        onChange={(e) => setDraft({ ...draft, level: e.target.value })}
                        placeholder="senior"
                      />
                    </div>
                  </div>

                  <CountryPicker
                    id="jp-countries"
                    value={draft.targetCountries}
                    onChange={(targetCountries) => setDraft({ ...draft, targetCountries })}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label htmlFor="jp-type" style={labelStyle}>
                        Workplace
                      </label>
                      <select
                        id="jp-type"
                        style={inputStyle}
                        value={draft.jobType}
                        onChange={(e) => setDraft({ ...draft, jobType: e.target.value })}
                      >
                        {JOB_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="jp-salary" style={labelStyle}>
                        Minimum salary
                      </label>
                      <input
                        id="jp-salary"
                        type="number"
                        min="0"
                        style={inputStyle}
                        value={draft.salaryMin}
                        onChange={(e) => setDraft({ ...draft, salaryMin: e.target.value })}
                        placeholder="120000"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="jp-skills" style={labelStyle}>
                      Skills
                    </label>
                    <input
                      id="jp-skills"
                      style={inputStyle}
                      value={draft.skills.join(', ')}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          skills: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="typescript, postgres, kubernetes"
                    />
                    <p style={{ fontSize: 12, color: '#8A8375', margin: '5px 0 0' }}>
                      Comma-separated.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="jp-threshold" style={labelStyle}>
                      Minimum match score — {draft.minMatchScore}%
                    </label>
                    <input
                      id="jp-threshold"
                      type="range"
                      min="50"
                      max="99"
                      value={draft.minMatchScore}
                      onChange={(e) => setDraft({ ...draft, minMatchScore: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <label
                    htmlFor="jp-autoapply"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}
                  >
                    <input
                      id="jp-autoapply"
                      type="checkbox"
                      checked={draft.autoApply}
                      onChange={(e) => setDraft({ ...draft, autoApply: e.target.checked })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1B1A16' }}>
                        Prepare applications automatically
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: '#6B655A', marginTop: 2 }}>
                        Jobocate fills applications for matches above your threshold and holds them
                        for your approval. Nothing is ever submitted without you.
                      </span>
                    </span>
                  </label>

                  {formError && (
                    <p style={{ fontSize: 13, color: '#B23A22', margin: 0 }} role="alert">
                      {formError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button type="button" onClick={save} disabled={saving} style={primaryBtn}>
                      {saving ? 'Saving…' : 'Save profile'}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} style={ghostBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              </section>
            )}

            {loading ? (
              <LoadingState label="Loading your profiles…" />
            ) : profiles.length === 0 && editing === null ? (
              <EmptyState
                icon="◎"
                title="No job profiles yet"
                hint="Create one to tell Jobocate what you're looking for and which countries you're targeting."
                action={
                  <button type="button" onClick={startNew} style={primaryBtn}>
                    Create your first profile
                  </button>
                }
              />
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {profiles.map((p) => (
                  <article key={p.id} style={card}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16', margin: 0 }}>
                          {p.profileName}
                          {p.active && (
                            <span
                              style={{
                                marginLeft: 9,
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#157A49',
                                background: '#EAF6EE',
                                border: '1px solid #CDE9D6',
                                borderRadius: 999,
                                padding: '2px 8px',
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                          {p.autoApply && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#8A6100',
                                background: '#FFF3D9',
                                border: '1px solid #F0DDAE',
                                borderRadius: 999,
                                padding: '2px 8px',
                              }}
                            >
                              AUTO-PREPARE
                            </span>
                          )}
                        </h3>
                        <p style={{ fontSize: 13, color: '#6B655A', margin: '5px 0 0' }}>
                          {[p.role, p.level, p.jobType].filter(Boolean).join(' · ') || 'No role set'}
                          {' · '}
                          match ≥ {p.minMatchScore ?? 75}%
                        </p>
                        <p style={{ fontSize: 13, color: '#3D3930', margin: '7px 0 0' }}>
                          {p.targetCountries.length ? (
                            <>
                              Targeting{' '}
                              <strong>{p.targetCountries.map(countryLabel).join(', ')}</strong>
                            </>
                          ) : (
                            <span style={{ color: '#8A8375' }}>
                              No target countries — falls back to your preferences
                            </span>
                          )}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                        <button type="button" onClick={() => startEdit(p)} style={ghostBtn}>
                          Edit
                        </button>
                        <button type="button" onClick={() => toggleActive(p)} style={ghostBtn}>
                          {p.active ? 'Pause' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                        marginTop: 15,
                        paddingTop: 13,
                        borderTop: '1px dashed #E6DECF',
                      }}
                    >
                      <label style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center' }}>
                        {p.resumePath ? 'Replace résumé' : 'Attach résumé'}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => attachResume(p, e.target.files?.[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button type="button" onClick={() => checkImpact(p.id)} style={ghostBtn}>
                        Check impact
                      </button>
                      <Link
                        href={`${appRoute('App Matches.dc.html')}?profileId=${p.id}`}
                        style={{ ...ghostBtn, textDecoration: 'none' }}
                      >
                        View matches →
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        style={{ ...ghostBtn, color: '#B23A22', borderColor: '#EFD3CC' }}
                      >
                        Delete
                      </button>
                    </div>

                    {preview && (
                      <p style={{ fontSize: 12.5, color: '#6B655A', margin: '12px 0 0' }}>
                        {preview.poolSize} jobs in the pool · {preview.eligible} eligible ·{' '}
                        {preview.excludedByGeography} excluded by geography ·{' '}
                        {preview.recommended} recommended
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
