'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/app/ui/Button';
import Pill from '@/components/app/ui/Pill';
import Toggle from '@/components/app/ui/Toggle';
import MonoLabel from '@/components/app/ui/MonoLabel';
import Logo from '@/components/brand/Logo';
import {
  uploadResume,
  getUserProfile,
  updateProfile,
  getUserPreferences,
  updateUserPreferences,
} from '@/services/onboardingApi';

/* ----------------------------------------------------------------- defaults --- */
// Empty initial wizard state. Real values come from the backend (profile +
// preferences) or from what the user uploads/enters — no fabricated seed data.
const DEFAULTS = {
  fileName: '',
  name: '',
  headline: '',
  location: '',
  skills: [],
  selRoles: [],
  selLocs: [],
  remote: false,
  salary: 120,
  autoApply: true,
};

const ALL_ROLES = ['Senior Product Designer', 'Staff Product Designer', 'Design Systems Lead', 'Product Designer', 'Design Engineer', 'Design Manager'];
const ALL_LOCS = ['San Francisco', 'New York', 'Remote (US)', 'Austin'];
const STEP_TITLES = ['Résumé', 'Profile', 'Preferences'];
const HEADS = [
  { h: 'Add your résumé', s: 'We’ll read it once and turn it into a profile, matches and tailored applications.' },
  { h: 'Confirm your profile', s: 'Here’s what we pulled. Fix anything that looks off.' },
  { h: 'What are you looking for?', s: 'This tunes your matches and what Auto-Apply will send.' },
];

export default function AppOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // ---- wizard state (mirrors DCLogic) ------------------------------------
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState(DEFAULTS.fileName);
  const [fileSize, setFileSize] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [name, setName] = useState(DEFAULTS.name);
  const [headline, setHeadline] = useState(DEFAULTS.headline);
  const [location, setLocation] = useState(DEFAULTS.location);
  const [skills, setSkills] = useState(DEFAULTS.skills);
  const [skillDraft, setSkillDraft] = useState('');

  const [selRoles, setSelRoles] = useState(DEFAULTS.selRoles);
  const [selLocs, setSelLocs] = useState(DEFAULTS.selLocs);
  const [remote, setRemote] = useState(DEFAULTS.remote);
  const [salary, setSalary] = useState(DEFAULTS.salary);
  const [autoApply, setAutoApply] = useState(DEFAULTS.autoApply);

  const [saving, setSaving] = useState(false);

  // ---- hydrate from backend with graceful fallback -----------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getUserProfile();
        const u = data?.user || data;
        if (!alive || !u) return;
        if (u.name) setName(u.name);
        if (u.headline || u.title) setHeadline(u.headline || u.title);
        if (u.location) setLocation(u.location);
        if (Array.isArray(u.skills) && u.skills.length) setSkills(u.skills);
      } catch (e) {
        // no profile yet (unauthenticated or new user) — leave fields empty
      }
      try {
        const prefs = await getUserPreferences();
        const p = prefs?.preferences || prefs;
        if (!alive || !p) return;
        if (Array.isArray(p.targetRoles) && p.targetRoles.length) setSelRoles(p.targetRoles);
        if (Array.isArray(p.locations) && p.locations.length) setSelLocs(p.locations);
        if (typeof p.openToRemote === 'boolean') setRemote(p.openToRemote);
        if (typeof p.minSalary === 'number') setSalary(Math.round(p.minSalary / 1000) || p.minSalary);
        if (typeof p.autoApply === 'boolean') setAutoApply(p.autoApply);
      } catch (e) {
        // no saved preferences yet — keep neutral defaults
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // seed name from auth user if available (and profile fetch didn't override)
  useEffect(() => {
    if (user?.name) setName((n) => (n === DEFAULTS.name ? user.name : n));
  }, [user]);

  // ---- derived -----------------------------------------------------------
  const isUpload = step === 0;
  const isProfile = step === 1;
  const isPrefs = step === 2;
  const canContinue = !(step === 0 && !uploaded);
  const stepLabel = `Step ${step + 1} of 3`;

  // Suggestion chips. Anything the résumé parse produced goes first — a static
  // list of design titles is useless to a backend engineer — and the generic
  // options follow so there is always something to click.
  const roleOptions = [...new Set([headline, ...ALL_ROLES].filter(Boolean))];
  const locOptions = [...new Set([location, ...ALL_LOCS].filter(Boolean))];

  // ---- handlers ----------------------------------------------------------
  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    const kb = file.size ? Math.max(1, Math.round(file.size / 1024)) : 248;
    setFileSize(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
    setParseError('');
    setParsing(true);
    setUploaded(true); // optimistic — design shows the parsed card immediately
    try {
      const res = await uploadResume(file);
      const p = res?.parsed || res?.data || res || {};
      if (p.name) setName(p.name);
      if (p.headline || p.title) setHeadline(p.headline || p.title);
      if (p.location) setLocation(p.location);
      if (Array.isArray(p.skills) && p.skills.length) setSkills(p.skills);
    } catch (e) {
      // graceful: leave the fields for the user to fill in, surface a soft note
      setParseError('Could not read your résumé automatically — you can fill in the details below.');
    } finally {
      setParsing(false);
    }
  };

  const onUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const removeFile = () => {
    setUploaded(false);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSkill = (i) => setSkills((s) => s.filter((_, j) => j !== i));
  const addSkill = () => {
    const v = skillDraft.trim();
    if (!v) return;
    setSkills((s) => s.concat(v));
    setSkillDraft('');
  };
  const onSkillKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const toggleRole = (r) =>
    setSelRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : s.concat(r)));
  const toggleLoc = (l) =>
    setSelLocs((s) => (s.includes(l) ? s.filter((x) => x !== l) : s.concat(l)));

  const next = async () => {
    if (step === 0 && !uploaded) return;
    if (step === 1) {
      // confirm profile → updateProfile (best-effort)
      try {
        await updateProfile({ name, headline, location, skills });
      } catch (e) {
        /* graceful — continue regardless */
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setSaving(true);
    try {
      await updateUserPreferences({
        targetRoles: selRoles,
        locations: selLocs,
        openToRemote: remote,
        minSalary: salary * 1000,
        autoApply,
      });
    } catch (e) {
      /* graceful — proceed to dashboard anyway */
    } finally {
      setSaving(false);
      router.push(appRoute('App Dashboard.dc.html'));
    }
  };

  return (
    <>
      <Head>
        <title>Get started · Jobocate</title>
      </Head>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: 'var(--jb-v3-rail)',
          color: 'var(--jb-v3-fg)',
          fontFamily: 'var(--jb-v3-font-display)',
        }}
      >
        {/* ── HEADER: logo + the three-step tracker ─────────────────────── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            rowGap: 10,
            minHeight: 64,
            padding: '12px clamp(16px, 4vw, 36px)',
            background: 'var(--jb-v3-card)',
            borderBottom: '1px solid var(--jb-v3-line)',
            flexShrink: 0,
          }}
        >
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'inherit' }}>
            <Logo size={21} accent="var(--jb-v3-accent)" />
          </Link>

          <span style={{ flex: 1 }} />

          <ol style={{ display: 'flex', alignItems: 'center', gap: 18, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
            {STEP_TITLES.map((label, i) => {
              const done = i < step;
              const here = i === step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    // Only completed steps are navigable. Jumping forward past
                    // an unfinished step would skip its save, so a future step
                    // is disabled rather than silently doing nothing.
                    disabled={i > step}
                    aria-current={here ? 'step' : undefined}
                    onClick={() => i <= step && setStep(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: 'none',
                      border: 0,
                      padding: 0,
                      fontFamily: 'inherit',
                      cursor: i <= step ? 'pointer' : 'default',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `1.5px solid ${done || here ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line-2)'}`,
                        background: done ? 'var(--jb-v3-accent)' : 'var(--jb-v3-card)',
                        color: done ? 'var(--jb-v3-accent-ink)' : here ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--jb-v3-font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: here ? 600 : 500, color: here ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-2)' }}>
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </header>

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'clamp(32px, 5vw, 52px) clamp(20px, 4vw, 44px) 40px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 30 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--jb-v3-font-display)',
                  fontWeight: 400,
                  fontSize: 'var(--jb-v3-display-sm)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                }}
              >
                {HEADS[step].h}
              </h1>
              <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)', maxWidth: '52ch' }}>
                {HEADS[step].s}
              </p>
            </div>

            {/* ---- STEP 1: résumé --------------------------------------- */}
            {isUpload && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />

                {!uploaded ? (
                  <button
                    type="button"
                    onClick={onUploadClick}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFile(e.dataTransfer.files?.[0]);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      height: 280,
                      width: '100%',
                      border: '1.5px dashed var(--jb-v3-line-dashed)',
                      borderRadius: 2,
                      background: 'var(--jb-v3-card)',
                      fontFamily: 'inherit',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 30 }}>
                      Drop your résumé here
                    </span>
                    <span style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-3)' }}>
                      PDF or DOCX, up to 10 MB. We read it once to fill your profile.
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 42,
                        padding: '0 22px',
                        borderRadius: 2,
                        background: 'var(--jb-v3-accent)',
                        color: 'var(--jb-v3-accent-ink)',
                        fontSize: 14.5,
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      Choose a file
                    </span>
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '18px 20px',
                      background: 'var(--jb-v3-card)',
                      border: '1px solid var(--jb-v3-line)',
                      borderRadius: 2,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName || 'Your résumé'}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-3)' }}>
                        {parsing ? 'Reading it now…' : parseError ? parseError : `${fileSize} · read and ready`}
                      </span>
                    </span>
                    <Button variant="secondary" size="sm" onClick={removeFile}>
                      Replace
                    </Button>
                  </div>
                )}

                <span style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-3)' }}>
                  No résumé yet?{' '}
                  <Link href="/app/resume" style={{ color: 'var(--jb-v3-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    Start from a blank one
                  </Link>{' '}
                  — the builder walks you through it.
                </span>
              </div>
            )}

            {/* ---- STEP 2: profile --------------------------------------- */}
            {isProfile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {[
                  { label: 'Full name', value: name, set: setName, placeholder: 'Your name' },
                  { label: 'Current title', value: headline, set: setHeadline, placeholder: 'e.g. Senior Product Designer' },
                  { label: 'Location', value: location, set: setLocation, placeholder: 'City, country' },
                ].map((f) => (
                  <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <MonoLabel>{f.label}</MonoLabel>
                    <input
                      type="text"
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) => f.set(e.target.value)}
                      style={{
                        height: 50,
                        padding: '0 14px',
                        border: '1px solid var(--jb-v3-line-2)',
                        borderRadius: 2,
                        background: 'var(--jb-v3-card)',
                        fontFamily: 'inherit',
                        fontSize: 15.5,
                        color: 'var(--jb-v3-fg)',
                      }}
                    />
                  </label>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <MonoLabel>Skills</MonoLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {skills.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          height: 34,
                          padding: '0 8px 0 13px',
                          borderRadius: 2,
                          fontSize: 14,
                          background: 'var(--jb-v3-accent-soft)',
                          color: 'var(--jb-v3-accent)',
                          border: '1px solid var(--jb-v3-accent-line)',
                        }}
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          aria-label={`Remove ${s}`}
                          style={{ border: 0, background: 'none', color: 'inherit', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 4px' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={onSkillKey}
                      onBlur={addSkill}
                      placeholder="Add a skill"
                      aria-label="Add a skill"
                      style={{
                        height: 34,
                        width: 130,
                        padding: '0 13px',
                        borderRadius: 2,
                        border: '1px dashed var(--jb-v3-line-2)',
                        background: 'var(--jb-v3-card)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        color: 'var(--jb-v3-fg)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 3: preferences ---------------------------------- */}
            {isPrefs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <MonoLabel>Roles</MonoLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {roleOptions.map((r) => (
                      <Pill key={r} selected={selRoles.includes(r)} onClick={() => toggleRole(r)}>
                        {r}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <MonoLabel>Locations</MonoLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {locOptions.map((l) => (
                      <Pill key={l} selected={selLocs.includes(l)} onClick={() => toggleLoc(l)}>
                        {l}
                      </Pill>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                    <Toggle checked={remote} label="Open to remote" onChange={() => setRemote((v) => !v)} />
                    <span style={{ fontSize: 14.5 }}>Open to remote</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <MonoLabel>Base salary floor</MonoLabel>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 20, fontWeight: 600 }}>${salary}k</span>
                  </span>
                  <input
                    type="range"
                    min={40}
                    max={300}
                    step={5}
                    value={salary}
                    aria-label="Minimum base salary in thousands"
                    onChange={(e) => setSalary(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--jb-v3-accent)' }}
                  />
                </div>

                {/* The consent panel. It is the one tinted block on the screen
                    because it is the one place the user is handing over a
                    standing permission — the emphasis is the point. */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', background: 'var(--jb-v3-accent-soft)', borderRadius: 2 }}>
                  <Toggle size="lg" checked={autoApply} label="Draft applications for my best matches" onChange={() => setAutoApply((v) => !v)} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Draft applications for my best matches</span>
                    <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--jb-v3-accent-soft-ink)' }}>
                      Nothing sends until you approve it. You can change the limits or switch this off any time.
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px clamp(20px, 4vw, 44px)',
            background: 'var(--jb-v3-card)',
            borderTop: '1px solid var(--jb-v3-line)',
            flexShrink: 0,
          }}
        >
          <Button variant="quiet" onClick={back} disabled={step === 0} style={{ color: step === 0 ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg-2)', fontSize: 14.5 }}>
            Back
          </Button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 14, color: 'var(--jb-v3-fg-3)' }}>{stepLabel}</span>
          <Button
            onClick={isPrefs ? finish : next}
            disabled={!canContinue || saving}
            style={!canContinue || saving ? { opacity: 0.55, cursor: 'not-allowed' } : null}
          >
            {saving ? 'Saving…' : isPrefs ? 'See my matches' : 'Continue'}
          </Button>
        </footer>
      </div>
    </>
  );
}
