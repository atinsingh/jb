'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
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
const BRAND_STEPS = ['Add your résumé', 'Confirm your profile', 'Set your preferences'];

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
  const progress = `${((step + 1) / 3) * 100}%`;
  const stepLabel = `Step ${step + 1} of 3`;

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

  // ---- shared styles -----------------------------------------------------
  const inputStyle = {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 15,
    color: '#1B1A16',
    background: '#FFFEFB',
    border: '1px solid #D9D0BE',
    borderRadius: 12,
    padding: '12px 14px',
  };
  const labelStyle = { fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' };

  const chip = (on) => ({
    fontFamily: 'inherit',
    fontSize: 13.5,
    fontWeight: 600,
    color: on ? '#0C2C1C' : '#46413A',
    background: on ? '#1FA463' : '#FFFEFB',
    border: `1px solid ${on ? '#1FA463' : '#D9D0BE'}`,
    borderRadius: 999,
    padding: '8px 15px',
    cursor: 'pointer',
  });

  return (
    <>
      <Head>
        <title>Set up your copilot — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbob * {
          box-sizing: border-box;
        }
        #jbob input::placeholder {
          color: #a79e8f;
        }
        #jbob input:focus,
        #jbob textarea:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbob input[type='range'] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: #e6decf;
        }
        #jbob input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #1fa463;
          border: 3px solid #fffefb;
          box-shadow: 0 1px 4px rgba(27, 26, 22, 0.25);
          cursor: pointer;
        }
        #jbob input[type='range']::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #1fa463;
          border: 3px solid #fffefb;
          box-shadow: 0 1px 4px rgba(27, 26, 22, 0.25);
          cursor: pointer;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (max-width: 900px) {
          #jbob {
            grid-template-columns: 1fr !important;
          }
          #jbob-brand {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="jbob"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        {/* ===== WIZARD SIDE ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '34px 56px 28px' }}>
          {/* top bar: logo + progress + step label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, letterSpacing: '-0.02em', fontSize: 23, color: '#1B1A16' }}>
                Jobocate<span style={{ color: '#1FA463' }}>.</span>
              </span>
            </Link>
            <div style={{ flex: 1, height: 3, borderRadius: 999, background: '#E6DECF', overflow: 'hidden' }}>
              <div style={{ width: progress, height: '100%', background: '#1FA463', transition: 'width 0.35s ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286' }}>{stepLabel}</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480, width: '100%', margin: '0 auto' }}>
            {/* STEPPER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 26 }}>
              {STEP_TITLES.map((t, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: cur ? '#0C2C1C' : done ? '#fff' : '#9A9286',
                        background: cur || done ? '#1FA463' : '#FFFEFB',
                        border: `1.5px solid ${cur || done ? '#1FA463' : '#D2C9B7'}`,
                      }}
                    >
                      {done ? '✓' : String(i + 1)}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: cur || done ? '#1B1A16' : '#9A9286' }}>{t}</span>
                    {i < STEP_TITLES.length - 1 && <span style={{ width: 30, height: 1.5, background: '#D2C9B7', margin: '0 12px' }} />}
                  </div>
                );
              })}
            </div>

            <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 38, lineHeight: 1.04, letterSpacing: '-0.01em', margin: '0 0 6px' }}>{HEADS[step].h}</h1>
            <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 26px' }}>{HEADS[step].s}</p>

            {/* hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files && e.target.files[0])}
            />

            {/* STEP 1: UPLOAD */}
            {isUpload && (
              <div style={{ animation: 'rbpop 0.25s ease' }}>
                {!uploaded ? (
                  <>
                    <button
                      onClick={onUploadClick}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 14,
                        background: '#FFFEFB',
                        border: '2px dashed #D2C9B7',
                        borderRadius: 18,
                        padding: '44px 24px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF6EE', color: '#1FA463', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>↑</span>
                      <span style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#1B1A16' }}>Drop your résumé here</span>
                        <span style={{ display: 'block', fontSize: 13.5, color: '#8A8378', marginTop: 3 }}>
                          PDF or DOCX, up to 10MB — or <span style={{ color: '#157A49', fontWeight: 600 }}>browse files</span>
                        </span>
                      </span>
                    </button>
                    <Link href={appRoute('App Resume Builder.dc.html')} style={{ display: 'block', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#157A49', textDecoration: 'none', marginTop: 16 }}>
                      Don’t have one? Skip — build one →
                    </Link>
                  </>
                ) : (
                  <div style={{ background: '#FFFEFB', border: '1px solid #CDE9D6', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 11, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontWeight: 600, fontSize: 11 }}>PDF</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{fileName}</div>
                        <div style={{ fontSize: 12.5, color: '#8A8378' }}>{fileSize} · {parsing ? 'reading…' : 'uploaded just now'}</div>
                      </div>
                      <button onClick={removeFile} title="Remove" style={{ flexShrink: 0, width: 32, height: 32, border: '1px solid #E1D9C9', background: '#FFFEFB', borderRadius: 9, cursor: 'pointer', color: '#A79E8F', fontSize: 14 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, paddingTop: 15, borderTop: '1px solid #F2ECE0' }}>
                      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: '#157A49', fontWeight: 600 }}>
                        {parsing ? 'Reading your experience, skills and education…' : 'We pulled your experience, skills and education.'}
                      </span>
                    </div>
                    {parseError && (
                      <div style={{ fontSize: 12.5, color: '#C9622E', marginTop: 10 }}>{parseError}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CONFIRM PROFILE */}
            {isProfile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'rbpop 0.25s ease' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Full name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Location</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Headline</label>
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>
                    Top skills <span style={{ color: '#A79E8F', fontWeight: 500 }}>— tap × to remove</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {skills.map((label, i) => (
                      <span key={`${label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 500, color: '#1F4733', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '7px 8px 7px 13px' }}>
                        {label}
                        <button onClick={() => removeSkill(i)} style={{ width: 18, height: 18, border: 'none', background: '#CDE9D6', color: '#157A49', borderRadius: '50%', cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </span>
                    ))}
                    <input
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={onSkillKey}
                      placeholder="+ add skill"
                      style={{ fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px dashed #D2C9B7', borderRadius: 999, padding: '7px 14px', width: 120 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PREFERENCES */}
            {isPrefs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, animation: 'rbpop 0.25s ease' }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>Target roles</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALL_ROLES.map((r) => (
                      <button key={r} onClick={() => toggleRole(r)} style={chip(selRoles.includes(r))}>{r}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A' }}>Locations</label>
                    <button
                      onClick={() => setRemote((v) => !v)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: remote ? '#157A49' : '#8A8378', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Open to remote
                      <span style={{ width: 40, height: 23, borderRadius: 999, background: remote ? '#1FA463' : '#D2C9B7', position: 'relative', transition: 'background 0.2s' }}>
                        <span style={{ position: 'absolute', top: 2, left: remote ? 19 : 2, width: 19, height: 19, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                      </span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALL_LOCS.map((l) => (
                      <button key={l} onClick={() => toggleLoc(l)} style={chip(selLocs.includes(l))}>{l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A' }}>Minimum base salary</label>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: '#157A49' }}>${salary}k+</span>
                  </div>
                  <input type="range" min="80" max="300" step="5" value={salary} onChange={(e) => setSalary(Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', marginTop: 6 }}>
                    <span>$80k</span>
                    <span>$300k+</span>
                  </div>
                </div>

                <button
                  onClick={() => setAutoApply((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    background: autoApply ? '#EAF6EE' : '#FFFEFB',
                    border: `1.5px solid ${autoApply ? '#1FA463' : '#E6DECF'}`,
                    borderRadius: 14,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, background: autoApply ? '#1FA463' : '#F2ECE0', color: autoApply ? '#0C2C1C' : '#A79E8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✦</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>Enable Auto-Apply</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: '#8A8378' }}>We’ll apply to your strongest matches automatically — you review everything.</span>
                  </span>
                  <span style={{ width: 44, height: 25, flexShrink: 0, borderRadius: 999, background: autoApply ? '#1FA463' : '#D2C9B7', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 2, left: autoApply ? 21 : 2, width: 21, height: 21, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </span>
                </button>
              </div>
            )}

            {/* FOOTER NAV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
              {step > 0 && (
                <button onClick={back} style={{ fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '13px 22px', cursor: 'pointer' }}>← Back</button>
              )}
              <div style={{ flex: 1 }} />
              {step < 2 ? (
                <button
                  onClick={next}
                  disabled={!canContinue}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 700,
                    color: canContinue ? '#0C2C1C' : '#8FB7A1',
                    background: canContinue ? '#1FA463' : '#CFE6D8',
                    border: 'none',
                    borderRadius: 999,
                    padding: '14px 26px',
                    cursor: canContinue ? 'pointer' : 'default',
                  }}
                >
                  Continue <span>→</span>
                </button>
              ) : (
                <button
                  onClick={finish}
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '14px 26px', cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Saving…' : 'Go to dashboard'} <span>→</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>© 2026 Jobocate</div>
        </div>

        {/* ===== BRAND SIDE ===== */}
        <div id="jbob-brand" style={{ position: 'relative', overflow: 'hidden', background: '#15140F', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 8%, rgba(31,164,99,0.34), transparent 55%), radial-gradient(circle at 5% 100%, rgba(31,164,99,0.18), transparent 50%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C' }}>— Setting up your copilot</div>

          <div style={{ position: 'relative' }}>
            <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 38, lineHeight: 1.08, color: '#F2EDE2', margin: '0 0 30px', maxWidth: 430 }}>3 steps to your first matches.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 34 }}>
              {BRAND_STEPS.map((label, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 17px', background: cur ? '#1E2D24' : '#1A1813', border: `1px solid ${cur ? '#2F5C42' : '#2C2A22'}`, borderRadius: 13 }}>
                    <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: done || cur ? '#1FA463' : '#15140F', border: `1.5px solid ${done || cur ? '#1FA463' : '#3A382E'}`, color: done || cur ? '#0C2C1C' : '#6B6456', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontWeight: 600, fontSize: 12 }}>
                      {done ? '✓' : String(i + 1)}
                    </span>
                    <span style={{ fontSize: 14.5, fontWeight: cur ? 700 : 500, color: cur ? '#FBF8F1' : done ? '#C7D8CC' : '#8A8378' }}>{label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 30, fontWeight: 600, color: '#5BD08C' }}>48h</span>
              <span style={{ fontSize: 14, lineHeight: 1.4, color: '#9A9286', maxWidth: 250 }}>Most members get their first interview request within two days of finishing setup.</span>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9A9286' }}>
            <span style={{ color: '#1FA463' }}>✓</span>
            Free to start · You approve every application
          </div>
        </div>
      </div>
    </>
  );
}
