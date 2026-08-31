'use client';

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState, InlineError } from '@/components/app/AppStates';
import CountryPicker from '@/components/app/CountryPicker';
import {
  Screen,
  BigCount,
  EndRule,
  MonoButton,
  MonoChip,
  MonoSwitch,
  Ticks,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import {
  listJobProfiles,
  createJobProfile,
  updateJobProfile,
  setJobProfileActive,
  deleteJobProfile,
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

function normalizeProfiles(payload) {
  const list = Array.isArray(payload) ? payload : payload?.profiles || payload?.data || [];
  return list.map((p) => ({
    ...p,
    id: String(p._id || p.id),
    targetCountries: Array.isArray(p.targetCountries) ? p.targetCountries : [],
    skills: Array.isArray(p.skills) ? p.skills : [],
  }));
}

/* v3 form parts — 2px fields, mono labels, no cards. */
const field = {
  width: '100%',
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line-2)',
  borderRadius: 2,
  padding: '9px 11px',
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: 'var(--jb-v3-fg)',
};

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ ...mono(10, '0.12em'), display: 'block', marginBottom: 7 }}>{label}</span>
      {children}
    </label>
  );
}

const COLS = '1fr 200px 190px 90px 80px';

export default function JobProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | profileId
  const [draft, setDraft] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(normalizeProfiles(await listJobProfiles()));
    } catch (e) {
      setError(e || new Error('Could not load your job profiles.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setDraft(blank());
    setFormError(null);
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
    setFormError(null);
    setEditing(p.id);
  };

  const save = async () => {
    if (!draft.profileName.trim()) {
      setFormError(new Error('Give this profile a name.'));
      return;
    }
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

    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') await createJobProfile(body);
      else await updateJobProfile(editing, body);
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e || new Error('Could not save this profile.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await setJobProfileActive(p.id, !p.isActive);
      await load();
    } catch (e) {
      setError(e);
    }
  };

  const remove = async (p) => {
    try {
      await deleteJobProfile(p.id);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <>
      <Head>
        <title>Job profiles · Jobocate</title>
      </Head>

      <Screen>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <BigCount value={profiles.length} caption="Target profiles" />
          <MonoButton onClick={startNew} style={{ padding: '7px 14px' }}>
            New
          </MonoButton>
        </div>

        {editing && (
          <div style={{ borderTop: HAIR, padding: '24px 4px 28px' }}>
            <div style={{ ...mono(), marginBottom: 18 }}>
              {editing === 'new' ? 'New profile' : 'Edit profile'}
            </div>
            {formError && <InlineError error={formError} />}

            <div style={{ display: 'grid', gap: 18, maxWidth: 720 }}>
              <Field label="Profile name">
                <input
                  style={field}
                  value={draft.profileName}
                  onChange={(e) => setDraft({ ...draft, profileName: e.target.value })}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Field label="Role">
                  <input
                    style={field}
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  />
                </Field>
                <Field label="Level">
                  <input
                    style={field}
                    value={draft.level}
                    onChange={(e) => setDraft({ ...draft, level: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Target countries">
                <CountryPicker
                  value={draft.targetCountries}
                  onChange={(targetCountries) => setDraft({ ...draft, targetCountries })}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Field label="Work type">
                  <div style={{ display: 'flex', gap: 4 }}>
                    {JOB_TYPES.map((t) => (
                      <MonoChip
                        key={t.value}
                        on={draft.jobType === t.value}
                        onClick={() => setDraft({ ...draft, jobType: t.value })}
                      >
                        {t.label}
                      </MonoChip>
                    ))}
                  </div>
                </Field>
                <Field label="Salary floor">
                  <input
                    style={field}
                    inputMode="numeric"
                    value={draft.salaryMin}
                    onChange={(e) => setDraft({ ...draft, salaryMin: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Skills — comma separated">
                <input
                  style={field}
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
                />
              </Field>

              <Field label={`Minimum coverage — ${draft.minMatchScore}`}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  style={{ width: '100%', accentColor: 'var(--jb-v3-accent)' }}
                  value={draft.minMatchScore}
                  onChange={(e) => setDraft({ ...draft, minMatchScore: e.target.value })}
                />
              </Field>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <MonoSwitch
                  checked={draft.autoApply}
                  onChange={() => setDraft({ ...draft, autoApply: !draft.autoApply })}
                  label="Auto-apply for this profile"
                />
                <span style={{ fontSize: 13.5 }}>Auto-apply for this profile</span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <MonoButton filled onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </MonoButton>
                <MonoButton onClick={() => setEditing(null)}>Cancel</MonoButton>
                <span style={{ flex: 1 }} />
                {/* Delete lives here rather than in the row: v3's profile row
                    has no destructive action, and a one-click delete sitting
                    beside "Edit" in a list is how profiles get lost. */}
                {editing !== 'new' && (
                  <MonoButton
                    onClick={() => remove({ id: editing })}
                    style={{ borderColor: 'var(--jb-v3-danger-line)', color: 'var(--jb-v3-danger)' }}
                  >
                    Delete profile
                  </MonoButton>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && <LoadingState label="Loading your profiles…" />}
        {!loading && error && <ErrorState error={error} onRetry={load} />}

        {!loading && !error && profiles.length > 0 && (
          <>
            {profiles.map((p) => (
              <div
                key={p.id}
                style={{
                  borderTop: HAIR,
                  padding: '20px 4px',
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  gap: 24,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                    {p.profileName || p.role || 'Untitled profile'}
                  </div>
                  <div style={mono(10, '0')}>
                    {[p.role, p.level, p.jobType].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {/* The bar shows this profile's coverage floor — the one number
                    that decides how much it will surface. */}
                <Ticks pct={(p.minMatchScore ?? 0) / 100} n={16} height={12} grow />
                <div style={mono(10.5, '0', 'var(--jb-v3-fg-2)')}>
                  {p.isActive ? 'Active' : 'Paused'}
                </div>
                <MonoButton block onClick={() => startEdit(p)}>
                  Edit
                </MonoButton>
                <MonoButton block onClick={() => toggleActive(p)}>
                  {p.isActive ? 'Pause' : 'Resume'}
                </MonoButton>
              </div>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && profiles.length === 0 && !editing && (
          <EmptyState
            title="No profiles yet"
            hint="A profile is a target: role, level, where you can work, and the coverage floor you care about."
            action={
              <MonoButton onClick={startNew} style={{ marginTop: 8 }}>
                Create one
              </MonoButton>
            }
          />
        )}
      </Screen>
    </>
  );
}
