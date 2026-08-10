'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  generateResume,
  regenerateGeneratedSection,
  saveGeneratedResume,
} from '@/services/resumeGenerateApi';
import { ErrorState, EmptyState } from '@/components/app/AppStates';

/* --------------------------------------------------------- static options ---
   The generated résumé content (summary / experience / skills / keywords) all
   comes from the backend. Only the input option lists below are static UI. */

const SOURCE_OPTS = [
  { key: 'profile', label: 'My profile' },
  { key: 'upload', label: 'Upload résumé' },
  { key: 'linkedin', label: 'LinkedIn' },
];
const TONE_OPTS = [
  { key: 'confident', label: 'Confident' },
  { key: 'warm', label: 'Warm' },
  { key: 'concise', label: 'Concise' },
];
const SENIORITY_OPTS = [
  { key: 'mid', label: 'Mid' },
  { key: 'senior', label: 'Senior' },
  { key: 'staff', label: 'Staff' },
];

const SHIMMER_ROWS = [
  { h: '14px', w: '100%' }, { h: '14px', w: '92%' }, { h: '14px', w: '78%' }, { h: '14px', w: '88%' },
];

export default function AppResumeGenerate() {
  // ---- inputs ----
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [source, setSource] = useState('profile');
  const [tone, setTone] = useState('confident');
  const [seniority, setSeniority] = useState('senior');

  // ---- phase: 'input' | 'drafting' | 'done' ----
  const [phase, setPhase] = useState('input');
  const [error, setError] = useState(null);

  // ---- live draft content (set from backend) ----
  const [draft, setDraft] = useState(null); // { summary, experience[], skills[], keywords[], coverage }

  // ---- acceptance state ----
  // Save-to-library outcome. Previously the save was fire-and-forget behind a
  // <Link>, so the candidate always saw "success" — including when it 400'd.
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });

  const [aSummary, setASummary] = useState(false);
  const [aExp, setAExp] = useState(false);
  const [aSkills, setASkills] = useState(false);

  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // ---- draft content (all sourced from the backend) ----
  const summaryText = draft?.summary || '';
  const expBullets = Array.isArray(draft?.experience) ? draft.experience : [];
  const skills = Array.isArray(draft?.skills) ? draft.skills : [];

  const keywordList = Array.isArray(draft?.keywords) ? draft.keywords : [];
  const matched = keywordList.filter((k) => k.on).length;
  const coverage =
    draft?.coverage != null
      ? draft.coverage
      : keywordList.length
      ? Math.round((matched / keywordList.length) * 100)
      : 0;

  const acceptedCount = (aSummary ? 1 : 0) + (aExp ? 1 : 0) + (aSkills ? 1 : 0);

  // ---------------------------------------------------------------- actions ---
  const draftThenDone = async () => {
    setError(null);
    setPhase('drafting');
    setASummary(false);
    setAExp(false);
    setASkills(false);
    clearTimeout(timer.current);

    let backendDraft = null;
    let failed = null;
    try {
      const res = await generateResume({
        role,
        jobDescription: jd,
        source,
        tone,
        seniority,
      });
      if (res) {
        backendDraft = {
          summary: res.summary || res.summaryText || null,
          experience: Array.isArray(res.experience)
            ? res.experience
            : Array.isArray(res.expBullets)
            ? res.expBullets
            : null,
          skills: Array.isArray(res.skills) ? res.skills : null,
          keywords: Array.isArray(res.keywords)
            ? res.keywords.map((k) =>
                typeof k === 'string' ? { label: k, on: true } : { label: k.label, on: !!k.on }
              )
            : null,
          coverage: typeof res.coverage === 'number' ? res.coverage : null,
        };
      }
    } catch (e) {
      failed = e;
    }

    // Keep the drafting animation timing (1.8s) before showing the result.
    timer.current = setTimeout(() => {
      if (failed) setError(failed);
      setDraft(backendDraft);
      setPhase('done');
    }, 1800);
  };

  const regenerateAll = () => draftThenDone();
  const editInputs = () => setPhase('input');

  // Regenerate a single section. Tries the backend; on failure rotates the
  // local sample versions so the section visibly changes either way.
  const regenSection = async (section) => {
    let content = null;
    try {
      const res = await regenerateGeneratedSection({
        section,
        role,
        jobDescription: jd,
        tone,
        seniority,
      });
      content = res?.content ?? null;
    } catch (e) {
      content = null;
    }

    if (section === 'summary') {
      if (typeof content === 'string' && content) {
        setDraft((d) => ({ ...(d || {}), summary: content }));
      }
      setASummary(false);
    } else if (section === 'experience') {
      if (Array.isArray(content) && content.length) {
        setDraft((d) => ({ ...(d || {}), experience: content }));
      }
      setAExp(false);
    } else if (section === 'skills') {
      if (Array.isArray(content) && content.length) {
        setDraft((d) => ({ ...(d || {}), skills: content }));
      }
      setASkills(false);
    }
  };

  /**
   * "Save to library".
   *
   * Two things were wrong here and both were invisible. The payload carried
   * fields the create DTO does not accept (role/jobDescription/tone/seniority)
   * and omitted the one it required, and the API runs with
   * `forbidNonWhitelisted`, so every save was a 400. The empty `.catch()` then
   * swallowed it, and the candidate was navigated away as though it had worked.
   *
   * Now: send exactly what the contract accepts, and surface the outcome.
   */
  const handleSave = async () => {
    setSaveState({ status: 'saving', message: '' });
    try {
      await saveGeneratedResume({
        name: role || 'Generated résumé',
        summary: summaryText,
        experience: expBullets,
        skills,
        targetRole: role || undefined,
        source: 'generated',
      });
      setSaveState({ status: 'saved', message: 'Saved to your library.' });
    } catch (e) {
      setSaveState({
        status: 'error',
        message: e?.message || 'Could not save this résumé. Nothing was lost — try again.',
      });
    }
  };

  const isInput = phase === 'input';
  const isDrafting = phase === 'drafting';
  const isDone = phase === 'done';

  const summaryBorder = aSummary ? '#1FA463' : '#E6DECF';
  const expBorder = aExp ? '#1FA463' : '#E6DECF';
  const skillsBorder = aSkills ? '#1FA463' : '#E6DECF';

  // ----------------------------------------------------------- subcomponents ---
  const AcceptedPill = () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#157A49' }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span>
      ACCEPTED
    </span>
  );

  const SectionActions = ({ accepted, onAccept, onRegen, onUndo }) => (
    <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
      {!accepted && (
        <>
          <button onClick={onAccept} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '8px 16px', cursor: 'pointer' }}>Accept</button>
          <button onClick={onRegen} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#157A49', background: '#FFFEFB', border: '1px solid #CDE9D6', borderRadius: 999, padding: '8px 16px', cursor: 'pointer' }}>↻ Regenerate</button>
        </>
      )}
      {accepted && (
        <button onClick={onUndo} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#A79E8F', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>Undo</button>
      )}
    </div>
  );

  const segBtn = (active, onClick, label, key) => (
    <button
      key={key}
      onClick={onClick}
      style={{
        fontSize: 12.5,
        fontWeight: 600,
        color: active ? '#1B1A16' : '#8A8378',
        background: active ? '#FFFEFB' : 'transparent',
        border: 'none',
        borderRadius: 999,
        padding: '6px 13px',
        cursor: 'pointer',
        boxShadow: active ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <Head>
        <title>Generate résumé · AI generator — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus,
        #jbapp textarea:focus,
        #jbapp select:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbapp input::placeholder,
        #jbapp textarea::placeholder {
          color: #a79e8f;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(7px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('App Resume.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to résumé</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>AI generator</span>
          </header>

          <div style={{ padding: '32px 32px 64px', maxWidth: 760, width: '100%', margin: '0 auto' }}>

            {/* ===== INPUT ===== */}
            {isInput && (
              <div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 8 }}>Generate from a role</div>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1.04, margin: '0 0 6px' }}>Draft a résumé in seconds.</h1>
                <p style={{ fontSize: 15, color: '#8A8378', margin: '0 0 26px' }}>Give us the target role and we’ll write a tailored draft from your experience — then you accept, tweak, or regenerate each section.</p>

                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 7, display: 'block' }}>Target role</label>
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Senior Product Designer"
                      style={{ width: '100%', fontFamily: 'inherit', fontSize: 15, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: '12px 15px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 7, display: 'block' }}>
                      Paste the job description <span style={{ color: '#A79E8F', fontWeight: 500 }}>— we’ll tailor keywords to it</span>
                    </label>
                    <textarea
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                      placeholder="Paste the JD here…"
                      style={{ width: '100%', minHeight: 120, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: 14, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 9, display: 'block' }}>Source</label>
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                      {SOURCE_OPTS.map((s) => {
                        const on = source === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => setSource(s.key)}
                            style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: on ? '#0C2C1C' : '#46413A', background: on ? '#1FA463' : '#FFFEFB', border: `1.5px solid ${on ? '#1FA463' : '#D9D0BE'}`, borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 9, display: 'block' }}>Tone</label>
                      <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                        {TONE_OPTS.map((t) => segBtn(tone === t.key, () => setTone(t.key), t.label, t.key))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 9, display: 'block' }}>Seniority</label>
                      <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                        {SENIORITY_OPTS.map((s) => segBtn(seniority === s.key, () => setSeniority(s.key), s.label, s.key))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={draftThenDone}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: 16, cursor: 'pointer', marginTop: 18 }}
                >
                  ✦ Generate résumé
                </button>
              </div>
            )}

            {/* ===== DRAFTING ===== */}
            {isDrafting && (
              <div style={{ padding: '60px 20px', textAlign: 'center', animation: 'rbpop 0.2s ease' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto 24px', borderRadius: '50%', border: '3px solid #E6DECF', borderTopColor: '#1FA463', animation: 'spin 0.8s linear infinite' }} />
                <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: '0 0 10px' }}>Drafting your résumé…</h2>
                <p style={{ fontSize: 14, color: '#8A8378', margin: '0 0 30px' }}>Reading the JD, matching your experience, and writing metric-driven bullets.</p>
                <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {SHIMMER_ROWS.map((r, i) => (
                    <div key={i} style={{ height: r.h, width: r.w, borderRadius: 7, background: 'linear-gradient(90deg, #EFE8DA 25%, #F7F3EA 50%, #EFE8DA 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.3s ease-in-out infinite' }} />
                  ))}
                </div>
              </div>
            )}

            {/* ===== DONE ===== */}
            {isDone && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49', marginBottom: 5 }}>Draft ready</div>
                    <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.05, margin: 0 }}>{role || 'Your résumé draft'}</h1>
                  </div>
                  <button onClick={regenerateAll} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>↻ Regenerate all</button>
                  <button onClick={editInputs} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#5A544A', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>Edit inputs</button>
                </div>

                {error ? (
                  <ErrorState error={error} />
                ) : !draft ? (
                  <EmptyState
                    title="No draft generated"
                    hint="We couldn't generate a résumé. Adjust your inputs and try again."
                  />
                ) : (
                <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* SUMMARY */}
                  <div style={{ background: '#FFFEFB', border: `1.5px solid ${summaryBorder}`, borderRadius: 16, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>Summary</span>
                      {aSummary && <AcceptedPill />}
                    </div>
                    <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#46413A', margin: 0 }}>{summaryText}</p>
                    <SectionActions accepted={aSummary} onAccept={() => setASummary(true)} onRegen={() => regenSection('summary')} onUndo={() => setASummary(false)} />
                  </div>

                  {/* EXPERIENCE */}
                  <div style={{ background: '#FFFEFB', border: `1.5px solid ${expBorder}`, borderRadius: 16, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>Experience</span>
                      {aExp && <AcceptedPill />}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8378', marginBottom: 14 }}>AI-rewritten bullets with quantified impact</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {expBullets.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: '50%', background: '#1FA463', marginTop: 8 }} />
                          <span style={{ fontSize: 14.5, lineHeight: 1.55, color: '#46413A' }}>{b}</span>
                        </div>
                      ))}
                    </div>
                    <SectionActions accepted={aExp} onAccept={() => setAExp(true)} onRegen={() => regenSection('experience')} onUndo={() => setAExp(false)} />
                  </div>

                  {/* SKILLS */}
                  <div style={{ background: '#FFFEFB', border: `1.5px solid ${skillsBorder}`, borderRadius: 16, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>Skills</span>
                      {aSkills && <AcceptedPill />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {skills.map((sk, i) => (
                        <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#1F4733', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '6px 13px' }}>{sk}</span>
                      ))}
                    </div>
                    <SectionActions accepted={aSkills} onAccept={() => setASkills(true)} onRegen={() => regenSection('skills')} onUndo={() => setASkills(false)} />
                  </div>

                  {/* KEYWORDS / COVERAGE */}
                  {keywordList.length > 0 && (
                  <div style={{ background: '#FBF9F2', border: '1px solid #E6DECF', borderRadius: 16, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>JD keyword coverage</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 18, fontWeight: 600, color: '#157A49' }}>{coverage}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ width: `${coverage}%`, height: '100%', background: '#1FA463' }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {keywordList.map((k, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: k.on ? '#1F4733' : '#7A4326', background: k.on ? '#EAF6EE' : '#FBEDE4', border: `1px solid ${k.on ? '#CDE9D6' : '#EAD0C4'}`, borderRadius: 999, padding: '5px 12px' }}>
                          <span>{k.on ? '✓' : '+'}</span>{k.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 14 }}>Add the {keywordList.length - matched} missing keyword{keywordList.length - matched === 1 ? '' : 's'} to push coverage toward 100% — flagged in clay.</div>
                  </div>
                  )}

                </div>

                {/* FOOTER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>{acceptedCount} / 3 sections accepted</span>
                  <div style={{ flex: 1 }} />

                  {/* A button, not a <Link>: navigating while the save is in
                      flight is what hid the failure for so long. */}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveState.status === 'saving'}
                    style={{
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#1B1A16',
                      background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999,
                      padding: '13px 20px',
                      cursor: saveState.status === 'saving' ? 'wait' : 'pointer',
                    }}
                  >
                    {saveState.status === 'saving' ? 'Saving…' : 'Save to library'}
                  </button>

                  <Link href={appRoute('App Resume.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', borderRadius: 999, padding: '13px 22px', textDecoration: 'none' }}>Open in editor →</Link>
                </div>

                {saveState.status !== 'idle' && saveState.status !== 'saving' && (
                  <div
                    role="status"
                    style={{
                      marginTop: 12,
                      padding: '10px 13px',
                      borderRadius: 10,
                      fontSize: 13,
                      background: saveState.status === 'saved' ? '#EAF6EE' : '#FDE4E0',
                      border: `1px solid ${saveState.status === 'saved' ? '#CDE9D6' : '#F0C4BB'}`,
                      color: saveState.status === 'saved' ? '#157A49' : '#B23A22',
                    }}
                  >
                    {saveState.message}
                    {saveState.status === 'saved' && (
                      <>
                        {' '}
                        <Link href={appRoute('App Resume Library.dc.html')} style={{ fontWeight: 700, color: '#157A49' }}>
                          Open your library →
                        </Link>
                      </>
                    )}
                  </div>
                )}
                </>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
