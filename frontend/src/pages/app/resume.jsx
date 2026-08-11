'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import AppSidebar from '@/components/app/AppSidebar';
import { uploadResume } from '@/services/api';
import {
  getResumeData,
  listResumes,
  getResumeById,
  generateResumePdf,
  downloadResumePdf,
  updateResume,
  createResume,
} from '@/services/resumeApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Link from 'next/link';
import AtsPanel from '@/components/app/AtsPanel';
import {
  TEMPLATES,
  ACCENTS,
  FONTS,
  DENSITIES,
  resolveTheme,
  getTemplate,
  DEFAULT_DESIGN,
} from '@/components/resume/resumeTemplates';

const DESIGN_KEY = 'jb_resume_design';

/* ------------------------------------------------------- empty model --- */
const EMPTY = {
  identity: { name: '', title: '', email: '', location: '', linkedin: '' },
  atsScore: 0,
  summary: '',
  suggestions: [],
  sections: [],
  experience: [],
  skills: [],
};

/* --------------------------------------------------------- component --- */
export default function AppResume() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState('just now');
  const [activeResumeId, setActiveResumeId] = useState(null);
  // Score from an ATS check run in this session. `data.atsScore` only refreshes
  // on reload, so without this the completeness ring lingers next to the ATS one.
  const [liveAtsScore, setLiveAtsScore] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  const dataRef = useRef(null);
  const activeIdRef = useRef(null);
  const saveTimer = useRef(null);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { activeIdRef.current = activeResumeId; }, [activeResumeId]);

  // Autosave the edited resume to the backend (debounced).
  const doSave = useCallback(async () => {
    const d = dataRef.current;
    if (!d) return;
    setSaveState('saving');
    try {
      let id = activeIdRef.current;
      const payload = buildPayload(d);
      if (!id) {
        const created = await createResume({ template: 'modern', name: d.identity.name || 'Untitled Resume' });
        id = created._id || created.id;
        setActiveResumeId(id);
        activeIdRef.current = id;
      }
      await updateResume(id, payload);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
    }
  }, []);

  const patchData = useCallback((updater) => {
    setData((prev) => (typeof updater === 'function' ? updater(prev || EMPTY) : { ...(prev || EMPTY), ...updater }));
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { doSave(); }, 800);
  }, [doSave]);

  // Warn before leaving with an in-flight save.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (saveState === 'saving') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  // Template / style the user picked — persisted locally so it survives reloads.
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [view, setView] = useState('edit'); // 'edit' | 'design'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DESIGN_KEY);
      if (raw) setDesign({ ...DEFAULT_DESIGN, ...JSON.parse(raw) });
    } catch (e) {
      /* ignore */
    }
  }, []);

  const updateDesign = useCallback((patch) => {
    setDesign((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(DESIGN_KEY, JSON.stringify(next));
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }, []);

  const theme = useMemo(() => resolveTheme(design), [design]);
  const Template = getTemplate(design.templateId).Component;

  // Fetch the user's real resume; show empty/error states when there is none.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      let next = { ...EMPTY };

      try {
        // 1) Basic resume contact data (name / email / phone). Non-fatal.
        try {
          const rd = await getResumeData();
          if (rd && (rd.name || rd.email || rd.phone)) {
            next = {
              ...next,
              identity: {
                ...next.identity,
                name: rd.name || '',
                email: rd.email || '',
                location: rd.phone || '',
              },
            };
          }
        } catch (e) {
          /* contact enrichment is optional — ignore */
        }

        // 2) Resume-builder document — prefer an explicit ?id, else the latest.
        const urlId =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('id')
            : null;
        let targetId = urlId;
        if (!targetId) {
          const list = await listResumes();
          const first = Array.isArray(list) ? list[0] : list?.resumes?.[0];
          targetId = first && first.id;
        }
        if (targetId) {
          if (!cancelled) setActiveResumeId(targetId);
          const full = await getResumeById(targetId);
          const doc = full?.resume || full;
          if (doc) next = mergeResumeDoc(next, doc);
        }

        if (!cancelled) {
          setData(next);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setData(next);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setNotice(null);
    try {
      if (activeResumeId) {
        try {
          const blob = await downloadResumePdf(activeResumeId);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } catch (e) {
          // Fall back to generating a PDF and using the returned URL.
          const res = await generateResumePdf(activeResumeId);
          if (res?.pdfUrl) window.open(res.pdfUrl, '_blank');
          else throw e;
        }
        setNotice({ kind: 'ok', text: 'PDF ready — opened in a new tab.' });
      } else {
        setNotice({ kind: 'warn', text: 'Connect a resume to export a PDF.' });
      }
    } catch (e) {
      setNotice({ kind: 'warn', text: 'Could not export PDF right now.' });
    } finally {
      setExporting(false);
      setSavedAt('just now');
    }
  }, [activeResumeId, exporting]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const res = await uploadResume(file);
      const parsed = res?.parsedData || res?.parsed || res;
      if (parsed) {
        setData((prev) => mergeParsed(prev || EMPTY, parsed));
        setNotice({ kind: 'ok', text: 'Resume parsed and applied.' });
        setSavedAt('just now');
      }
    } catch (e) {
      setNotice({ kind: 'warn', text: 'Could not parse that file. Sign in and try a PDF/DOCX.' });
    } finally {
      setUploading(false);
    }
  }, []);

  const id = (data && data.identity) || EMPTY.identity;
  const exp = (data && data.experience) || [];
  const skills = (data && data.skills) || [];
  const summaryText = (data && data.summary) || '';

  const hasResume = !!(
    data &&
    (data.identity.name || data.summary || exp.length || skills.length)
  );

  // Live completeness — real signal derived from the user's own resume.
  const checklist = useMemo(
    () => [
      { key: 'name', label: 'Name & contact', done: !!id.name },
      { key: 'summary', label: 'Professional summary', done: !!summaryText },
      { key: 'experience', label: 'Work experience', done: exp.length > 0 },
      { key: 'skills', label: 'Skills', done: skills.length > 0 },
    ],
    [id.name, summaryText, exp.length, skills.length]
  );
  const doneCount = checklist.filter((c) => c.done).length;
  const completeness = Math.round((doneCount / checklist.length) * 100);

  // Sections rail derived from the real resume (fills what used to be empty).
  const sections = useMemo(() => {
    const base = [
      {
        key: 'summary',
        name: 'Summary',
        filled: !!summaryText,
        meta: summaryText ? 'Written' : 'Empty',
      },
      {
        key: 'experience',
        name: 'Experience',
        filled: exp.length > 0,
        meta: exp.length ? `${exp.length} role${exp.length > 1 ? 's' : ''}` : 'Empty',
      },
      {
        key: 'skills',
        name: 'Skills',
        filled: skills.length > 0,
        meta: skills.length ? `${skills.length} skill${skills.length > 1 ? 's' : ''}` : 'Empty',
      },
    ];
    const custom = ((data && data.sections) || []).map((s) => ({
      key: s.key || s.name,
      name: s.name,
      filled: true,
      meta: s.meta || '',
    }));
    return [...base, ...custom];
  }, [summaryText, exp.length, skills.length, data]);

  /* ------------------------------------------------------------- ui --- */
  return (
    <>
      <Head>
        <title>Resume Builder — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus,
        #jbapp textarea:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbapp .jb-btn {
          transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease,
            box-shadow 0.16s ease;
        }
        #jbapp .jb-btn:hover {
          background: #f4efe4;
        }
        #jbapp .jb-btn:active {
          transform: translateY(1px);
        }
        #jbapp .jb-btn-green {
          transition: background 0.16s ease, transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 20px -10px rgba(31, 164, 99, 0.7);
        }
        #jbapp .jb-btn-green:hover {
          background: #1b9159;
          transform: translateY(-1px);
          box-shadow: 0 12px 26px -10px rgba(31, 164, 99, 0.8);
        }
        #jbapp .jb-sec {
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease,
            background 0.16s ease;
        }
        #jbapp .jb-sec:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -14px rgba(27, 26, 22, 0.4);
        }
        #jbapp .jb-add {
          transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
        }
        #jbapp .jb-add:hover {
          border-color: #1fa463;
          color: #157a49;
          background: rgba(31, 164, 99, 0.05);
        }
        #jbapp .jb-empty {
          transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
          cursor: pointer;
        }
        #jbapp .jb-empty:hover {
          border-color: #1fa463;
          background: rgba(31, 164, 99, 0.045);
          color: #157a49;
        }
        #jbapp .jb-page {
          transition: box-shadow 0.3s ease;
        }
        #jbapp .jb-page:hover {
          box-shadow: 0 40px 80px -40px rgba(27, 26, 22, 0.42),
            0 3px 10px -5px rgba(27, 26, 22, 0.12);
        }
        @keyframes jbskel {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.55;
          }
        }
        @media (max-width: 780px) {
          /* Editor controls + live preview stack instead of sitting side by
             side — the controls column has a 320px floor (minmax(320px,
             380px)) that alone exceeds a phone viewport. */
          #jbapp .rb-editor-grid {
            grid-template-columns: 1fr !important;
          }
          #jbapp .rb-editor-panel {
            border-right: none !important;
            border-bottom: 1px solid #e7e0d2 !important;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              rowGap: 10,
              gap: 16,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <a
              href="/app/resume-library"
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
                textDecoration: 'none',
              }}
              title="Back to My Resumes"
            >
              ‹ Toolkit / Resumes
            </a>
            {(id.name || id.title) && (
              <>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#C9BFAC' }}>·</span>
                <span style={{ fontSize: 13.5, color: '#5A544A' }}>
                  {[id.name, id.title].filter(Boolean).join(' — ')}
                </span>
              </>
            )}
            <div style={{ flex: 1 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 12,
                color: '#8A8378',
              }}
            >
              {/* `idle` used to fall through to "Saved · just now", so a résumé
                  that had never been written — including a brand-new one with
                  nothing in the database — displayed as saved. A save indicator
                  that reports success for a save that never happened is worse
                  than having none. Idle now says so plainly. */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    saveState === 'error'
                      ? '#B4472A'
                      : saveState === 'saving'
                        ? '#C9622E'
                        : saveState === 'saved'
                          ? '#1FA463'
                          : '#B8B0A0',
                  boxShadow:
                    saveState === 'saved' ? '0 0 0 3px rgba(31,164,99,0.18)' : 'none',
                }}
              />
              {saveState === 'saving'
                ? 'Saving…'
                : saveState === 'error'
                  ? 'Save failed — your changes are not stored'
                  : saveState === 'saved'
                    ? `Saved · ${savedAt}`
                    : 'Draft — not saved yet'}
            </span>

            {/* Upload (parse) — hidden file input behind a styled label */}
            <label
              className="jb-btn"
              style={{
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 600,
                color: '#1B1A16',
                background: '#FFFEFB',
                border: '1px solid #D9D0BE',
                borderRadius: 999,
                padding: '9px 16px',
                cursor: 'pointer',
              }}
            >
              {uploading ? 'Parsing…' : 'Import file'}
              <input
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="jb-btn"
              style={{
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 600,
                color: '#1B1A16',
                background: '#FFFEFB',
                border: '1px solid #D9D0BE',
                borderRadius: 999,
                padding: '9px 16px',
                cursor: exporting ? 'default' : 'pointer',
                opacity: exporting ? 0.65 : 1,
              }}
            >
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            {/* This was a <button> with no onClick — the loudest control on the
                résumé editor did nothing at all, while the AI generator it
                should open (/app/resume-generate) was reachable only by typing
                the URL. Now it goes there, carrying the résumé so the generator
                grounds itself in this document rather than starting blank. */}
            <Link
              href={`/app/resume-generate${activeResumeId ? `?source=${activeResumeId}` : ''}`}
              className="jb-btn-green"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#0C2C1C',
                background: '#1FA463',
                border: 'none',
                borderRadius: 999,
                padding: '9px 16px',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Tailor to a job ✦
            </Link>
          </header>

          {/* NOTICE */}
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                margin: '14px 32px 0',
                padding: '11px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                background: notice.kind === 'ok' ? '#EAF6EE' : '#FBF1E8',
                border: `1px solid ${notice.kind === 'ok' ? '#CDE9D6' : '#E9D8C2'}`,
                color: notice.kind === 'ok' ? '#157A49' : '#8A5A22',
              }}
            >
              {notice.text}
            </motion.div>
          )}

          {loading ? (
            <LoadingState label="Loading your résumé…" />
          ) : error ? (
            <ErrorState error={error} />
          ) : !hasResume ? (
            <EmptyState
              title="No résumé yet"
              hint="Import a PDF or DOCX above, or build one, to see it here."
            />
          ) : (
            <div
              className="rb-editor-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 380px) 1fr',
                gap: 0,
                flex: 1,
                alignItems: 'start',
              }}
            >
              {/* LEFT: EDITOR CONTROLS */}
              <motion.div
                className="rb-editor-panel"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ borderRight: '1px solid #E7E0D2', padding: '22px 24px', height: '100%' }}
              >
                <RailTabs view={view} setView={setView} />

                {view === 'design' ? (
                  <DesignPanel design={design} onChange={updateDesign} />
                ) : (
                  <>
                {/* ATS COMPATIBILITY — real score, real findings, real fixes.
                    Replaces a panel that read "Excellent · clears automated
                    screening for 9 of 10 roles" at every score, including bad
                    ones, and which nothing ever populated. */}
                {activeResumeId && (
                  <AtsPanel
                    resumeId={activeResumeId}
                    initialScore={typeof data.atsScore === 'number' ? data.atsScore : null}
                    initialReport={data.atsReport || null}
                    onScore={setLiveAtsScore}
                  />
                )}

                {/* COMPLETENESS — a section checklist, not a quality score. It
                    stands down once a real ATS score exists (persisted or from
                    a check run in this session) so the page never shows two
                    rings scored on different scales. */}
                {data.atsScore > 0 || liveAtsScore > 0 ? null : (
                  <div
                    style={{
                      background:
                        'linear-gradient(180deg,#FFFEFB 0%,#FCF8F0 100%)',
                      border: '1px solid #E6DECF',
                      borderRadius: 16,
                      padding: 20,
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                      <ScoreRing value={completeness} label="done" />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
                          {completeness === 100 ? 'Résumé complete' : 'Résumé strength'}
                        </div>
                        <div style={{ fontSize: 13, color: '#5A544A' }}>
                          {completeness === 100
                            ? 'Every core section is filled in.'
                            : `${doneCount} of ${checklist.length} core sections done.`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {checklist.map((c) => (
                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: c.done ? '#fff' : '#B7AE9C',
                              background: c.done ? '#1FA463' : 'transparent',
                              border: c.done ? 'none' : '1.5px solid #E0D8C7',
                            }}
                          >
                            {c.done ? '✓' : ''}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: c.done ? '#5A544A' : '#9A9286',
                              textDecoration: 'none',
                            }}
                          >
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI SUGGESTIONS */}
                {data.suggestions.length > 0 && (
                  <div
                    style={{
                      background: '#15140F',
                      borderRadius: 16,
                      padding: '18px 20px',
                      marginBottom: 22,
                      color: '#F2EDE2',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#5BD08C',
                        }}
                      >
                        ✦ AI suggestions
                      </span>
                    </div>
                    {data.suggestions.map((s, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', gap: 11, padding: '11px 0', borderBottom: '1px solid #2C2A22' }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: 'rgba(31,164,99,0.18)',
                            color: '#5BD08C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          {s.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#E4DECF', lineHeight: 1.45 }}>{s.text}</div>
                          <button
                            type="button"
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#5BD08C',
                              background: 'none',
                              border: 'none',
                              padding: '6px 0 0',
                              cursor: 'pointer',
                            }}
                          >
                            {s.action} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* EDITABLE CONTENT */}
                <ContentEditor data={data} onChange={patchData} />
                  </>
                )}
              </motion.div>

              {/* RIGHT: RESUME PREVIEW — sits on a soft "desk" backdrop */}
              <div
                style={{
                  padding: '44px 40px 64px',
                  display: 'flex',
                  justifyContent: 'center',
                  background:
                    'radial-gradient(130% 90% at 50% -10%, #FCFAF4 0%, #F3ECDE 55%, #EDE5D5 100%)',
                  minHeight: '100%',
                }}
              >
                <motion.div
                  key={design.templateId}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="jb-page"
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    background: '#FFFFFF',
                    border: '1px solid #EAE3D4',
                    borderRadius: 12,
                    boxShadow:
                      '0 30px 60px -35px rgba(27,26,22,0.35), 0 2px 8px -4px rgba(27,26,22,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <Template data={data} theme={theme} />
                </motion.div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ------------------------------------------------------- ui helpers --- */
const MONO = 'var(--jb-font-mono)';

function RailTabs({ view, setView }) {
  const tab = (key, label) => (
    <button
      type="button"
      onClick={() => setView(key)}
      style={{
        flex: 1,
        padding: '8px 0',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 8,
        transition: 'background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease',
        background: view === key ? '#FFFEFB' : 'transparent',
        color: view === key ? '#1B1A16' : '#8A8378',
        boxShadow: view === key ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: '#EFE9DD', borderRadius: 11, marginBottom: 18 }}>
      {tab('edit', '✎  Edit')}
      {tab('design', '◈  Design')}
    </div>
  );
}

function GroupLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#9A9286',
        margin: '4px 0 11px',
      }}
    >
      {children}
    </div>
  );
}

function DesignPanel({ design, onChange }) {
  const t = resolveTheme(design);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      {/* TEMPLATES */}
      <GroupLabel>Template</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {TEMPLATES.map((tpl) => {
          const sel = design.templateId === tpl.id;
          const Thumb = tpl.Thumb;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange({ templateId: tpl.id })}
              style={{ textAlign: 'left', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#fff',
                  border: `2px solid ${sel ? t.accent : '#E6DECF'}`,
                  boxShadow: sel ? `0 0 0 3px ${t.accentSoft}, 0 8px 18px -12px rgba(27,26,22,0.4)` : '0 4px 10px -8px rgba(27,26,22,0.3)',
                  transition: 'border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease',
                  transform: sel ? 'translateY(-1px)' : 'none',
                }}
              >
                <Thumb theme={t} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: sel ? '#1B1A16' : '#5A544A' }}>{tpl.name}</span>
                {sel && <span style={{ color: t.accent, fontSize: 12 }}>✓</span>}
              </div>
              <div style={{ fontSize: 11, color: '#9A9286', lineHeight: 1.3 }}>{tpl.blurb}</div>
            </button>
          );
        })}
      </div>

      {/* ACCENT */}
      <GroupLabel>Accent colour</GroupLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
        {ACCENTS.map((a) => {
          const sel = design.accentId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              title={a.name}
              onClick={() => onChange({ accentId: a.id })}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: a.color,
                cursor: 'pointer',
                border: '2px solid #FFFEFB',
                boxShadow: sel ? `0 0 0 2px ${a.color}` : '0 0 0 1px #E0D8C7',
                transition: 'transform 0.14s ease, box-shadow 0.14s ease',
                transform: sel ? 'scale(1.12)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* FONT */}
      <GroupLabel>Font pairing</GroupLabel>
      <div style={{ marginBottom: 24 }}>
        {FONTS.map((f) => {
          const sel = design.fontId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ fontId: f.id })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 13px',
                marginBottom: 7,
                borderRadius: 10,
                cursor: 'pointer',
                background: sel ? '#FFFEFB' : 'transparent',
                border: `1px solid ${sel ? t.accent : '#E6DECF'}`,
                boxShadow: sel ? `0 0 0 2px ${t.accentSoft}` : 'none',
                transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
              }}
            >
              <span style={{ fontFamily: f.heading, fontSize: 17, fontWeight: 500, color: '#1B1A16' }}>{f.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: '#9A9286' }}>{f.tag}</span>
            </button>
          );
        })}
      </div>

      {/* DENSITY */}
      <GroupLabel>Density</GroupLabel>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#EFE9DD', borderRadius: 10 }}>
        {DENSITIES.map((d) => {
          const sel = design.densityId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange({ densityId: d.id })}
              style={{
                flex: 1,
                padding: '7px 0',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                background: sel ? '#FFFEFB' : 'transparent',
                color: sel ? '#1B1A16' : '#8A8378',
                boxShadow: sel ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
                transition: 'background 0.16s ease, color 0.16s ease',
              }}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function ScoreRing({ value, label }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      style={{
        position: 'relative',
        width: 72,
        height: 72,
        flexShrink: 0,
        borderRadius: '50%',
        background: `conic-gradient(#1FA463 0% ${v}%, #EDE6D8 ${v}% 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: '#FFFEFB',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--jb-font-mono)',
          fontWeight: 600,
          color: '#157A49',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 19 }}>{v}{label ? '' : ''}</span>
        {label && (
          <span style={{ fontSize: 11, color: '#9A9286', marginTop: 2, letterSpacing: '0.06em' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------- content editor --- */
// Map the editor view-model back onto the backend Resume schema for autosave.
function buildPayload(d) {
  const id = d.identity || {};
  return {
    fullName: id.name || '',
    headline: id.title || '',
    email: id.email || '',
    location: id.location || '',
    linkedin: id.linkedin || '',
    summary: d.summary || '',
    skills: d.skills || [],
    experience: (d.experience || []).map((e) => ({
      title: e.role || '',
      company: e.company || '',
      startDate: e.dates || '',
      endDate: '',
      achievements: e.bullets || [],
    })),
  };
}

function ContentEditor({ data, onChange }) {
  const id = data.identity || {};
  const setId = (k, v) => onChange((d) => ({ ...d, identity: { ...d.identity, [k]: v } }));
  const setField = (k, v) => onChange((d) => ({ ...d, [k]: v }));
  const addSkill = (v) => { const s = v.trim(); if (!s) return; onChange((d) => ({ ...d, skills: [...(d.skills || []), s] })); };
  const removeSkill = (i) => onChange((d) => ({ ...d, skills: (d.skills || []).filter((_, j) => j !== i) }));
  const addRole = () => onChange((d) => ({ ...d, experience: [...(d.experience || []), { role: '', company: '', dates: '', bullets: [] }] }));
  const setExp = (i, k, v) => onChange((d) => ({ ...d, experience: (d.experience || []).map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  const removeExp = (i) => onChange((d) => ({ ...d, experience: (d.experience || []).filter((_, j) => j !== i) }));
  const addBullet = (i) => onChange((d) => ({ ...d, experience: (d.experience || []).map((e, j) => (j === i ? { ...e, bullets: [...(e.bullets || []), ''] } : e)) }));
  const setBullet = (i, bi, v) => onChange((d) => ({ ...d, experience: (d.experience || []).map((e, j) => (j === i ? { ...e, bullets: (e.bullets || []).map((b, k) => (k === bi ? v : b)) } : e)) }));
  const removeBullet = (i, bi) => onChange((d) => ({ ...d, experience: (d.experience || []).map((e, j) => (j === i ? { ...e, bullets: (e.bullets || []).filter((_, k) => k !== bi) } : e)) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <EditGroup label="Basics">
        <EInput label="Full name" value={id.name} onChange={(v) => setId('name', v)} />
        <EInput label="Headline" value={id.title} onChange={(v) => setId('title', v)} placeholder="e.g. Senior Product Engineer" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <EInput label="Email" value={id.email} onChange={(v) => setId('email', v)} />
          <EInput label="Location" value={id.location} onChange={(v) => setId('location', v)} />
        </div>
        <EInput label="LinkedIn" value={id.linkedin} onChange={(v) => setId('linkedin', v)} placeholder="linkedin.com/in/…" />
      </EditGroup>

      <EditGroup label="Summary">
        <ETextarea value={data.summary} onChange={(v) => setField('summary', v)} placeholder="A 2–3 line professional summary…" />
      </EditGroup>

      <EditGroup label="Skills">
        <SkillsInput skills={data.skills || []} onAdd={addSkill} onRemove={removeSkill} />
      </EditGroup>

      <EditGroup label="Experience" action={<button type="button" onClick={addRole} style={addBtn}>+ Add role</button>}>
        {(data.experience || []).length === 0 && (
          <div style={{ fontSize: 12.5, color: '#B7AE9C' }}>No roles yet — add your work experience.</div>
        )}
        {(data.experience || []).map((e, i) => (
          <div key={i} style={expCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <input value={e.role || ''} onChange={(ev) => setExp(i, 'role', ev.target.value)} placeholder="Role / title" style={{ ...eInp, fontWeight: 700 }} />
              <button type="button" onClick={() => removeExp(i)} title="Remove role" style={iconBtn}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <input value={e.company || ''} onChange={(ev) => setExp(i, 'company', ev.target.value)} placeholder="Company" style={eInp} />
              <input value={e.dates || ''} onChange={(ev) => setExp(i, 'dates', ev.target.value)} placeholder="2022 — Present" style={eInp} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(e.bullets || []).map((b, bi) => (
                <div key={bi} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#1FA463', marginTop: 9 }}>▪</span>
                  <textarea value={b} onChange={(ev) => setBullet(i, bi, ev.target.value)} rows={1} placeholder="Achievement / impact" style={{ ...eInp, resize: 'vertical', minHeight: 34 }} />
                  <button type="button" onClick={() => removeBullet(i, bi)} style={iconBtn}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addBullet(i)} style={{ ...addBtn, alignSelf: 'flex-start' }}>+ Add bullet</button>
            </div>
          </div>
        ))}
      </EditGroup>
    </div>
  );
}

function EditGroup({ label, action, children }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>{label}</span>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function EInput({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#8A8378', marginBottom: 4 }}>{label}</span>}
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={eInp} />
    </label>
  );
}

function ETextarea({ value, onChange, placeholder }) {
  return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ ...eInp, resize: 'vertical', minHeight: 82, lineHeight: 1.5 }} />;
}

function SkillsInput({ skills, onAdd, onRemove }) {
  const [v, setV] = useState('');
  return (
    <div>
      {skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {skills.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, background: '#F4EFE4', borderRadius: 6, padding: '4px 8px' }}>
              {s}
              <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${s}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8A8378', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAdd(v); setV(''); } }}
        placeholder="Type a skill, press Enter"
        style={eInp}
      />
    </div>
  );
}

const eInp = { width: '100%', padding: '8px 10px', borderRadius: 9, border: '1px solid #E0D8C7', background: '#FFFEFB', fontFamily: 'inherit', fontSize: 13, color: '#1B1A16', boxSizing: 'border-box' };
const addBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: 'none', border: 'none', cursor: 'pointer', padding: 0 };
const iconBtn = { border: '1px solid #E0D8C7', background: '#FFFEFB', borderRadius: 7, cursor: 'pointer', color: '#8A8378', width: 26, height: 26, flexShrink: 0, fontSize: 15, lineHeight: 1 };
const expCard = { border: '1px solid #E7E0D2', borderRadius: 12, padding: 12, background: '#FFFEFB' };

/* ------------------------------------------------------ data mappers --- */
// Merge a resume-builder document into the view model, keeping sample
// fields for anything the backend doesn't provide.
function mergeResumeDoc(base, doc) {
  const content = doc.content || doc.data || doc;
  const next = { ...base };

  // NOTE: `doc.name` is the resume's FILE TITLE (defaults to "Untitled Resume"),
  // NOT the person's name — the person's name lives in `fullName`. Only trust a
  // `name` field when it comes from a genuine nested content object.
  const hasNested = !!(doc.content || doc.data);
  const name = content.fullName || doc.fullName || (hasNested ? content.name : '');
  const title = content.title || content.headline || doc.headline;
  const email = content.email;
  const location = content.location || content.city;
  const linkedin = content.linkedin || content.linkedIn;

  next.identity = {
    name: name || base.identity.name,
    title: title || base.identity.title,
    email: email || base.identity.email,
    location: location || base.identity.location,
    linkedin: linkedin || base.identity.linkedin,
  };

  if (typeof doc.atsScore === 'number') next.atsScore = doc.atsScore;
  else if (typeof content.atsScore === 'number') next.atsScore = content.atsScore;

  // Carry the findings through so the panel can show them without forcing a
  // re-check on every page load — the score is recomputed server-side on save.
  if (doc.atsReport) next.atsReport = doc.atsReport;
  else if (content.atsReport) next.atsReport = content.atsReport;

  if (content.summary || content.profile || content.profileSummary)
    next.summary = content.summary || content.profile || content.profileSummary;

  const exp = content.experience || content.experiences || content.workExperience;
  if (Array.isArray(exp) && exp.length) {
    next.experience = exp.map((e) => ({
      role: e.role || e.title || e.position || '',
      company: e.company || e.employer || e.organization || '',
      dates:
        e.dates ||
        [e.startDate || e.start, e.current ? 'Present' : e.endDate || e.end]
          .filter(Boolean)
          .join(' — '),
      bullets: Array.isArray(e.bullets)
        ? e.bullets
        : Array.isArray(e.achievements)
        ? e.achievements
        : Array.isArray(e.highlights)
        ? e.highlights
        : e.description
        ? [e.description]
        : [],
    }));
  }

  const skills = content.skills;
  if (Array.isArray(skills) && skills.length) {
    next.skills = skills.map((s) => (typeof s === 'string' ? s : s.name || s.label)).filter(Boolean);
  }

  // No dedicated headline field in the schema — fall back to the latest role.
  if (!next.identity.title && next.experience.length) {
    next.identity.title = next.experience[0].role || '';
  }

  return next;
}

// Merge the resume-parser response (parsedData) into the view model.
function mergeParsed(base, parsed) {
  const next = { ...base };
  next.identity = {
    ...base.identity,
    name: parsed.name || parsed.fullName || base.identity.name,
    title: parsed.title || parsed.headline || base.identity.title,
    email: parsed.email || base.identity.email,
    location: parsed.location || parsed.phone || base.identity.location,
    linkedin: parsed.linkedin || base.identity.linkedin,
  };
  if (parsed.summary) next.summary = parsed.summary;

  const exp = parsed.experience || parsed.workExperience;
  if (Array.isArray(exp) && exp.length) {
    next.experience = exp.map((e) => ({
      role: e.role || e.title || e.position || '',
      company: e.company || e.employer || '',
      dates: e.dates || [e.startDate, e.endDate].filter(Boolean).join(' — '),
      bullets: Array.isArray(e.bullets)
        ? e.bullets
        : Array.isArray(e.achievements)
        ? e.achievements
        : Array.isArray(e.highlights)
        ? e.highlights
        : e.description
        ? [e.description]
        : [],
    }));
  }

  if (Array.isArray(parsed.skills) && parsed.skills.length) {
    next.skills = parsed.skills.map((s) => (typeof s === 'string' ? s : s.name || s.label)).filter(Boolean);
  }
  return next;
}
