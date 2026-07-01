'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AppSidebar from '@/components/app/AppSidebar';
import { uploadResume } from '@/services/api';
import {
  getResumeData,
  listResumes,
  getResumeById,
  generateResumePdf,
  downloadResumePdf,
} from '@/services/resumeApi';

/* ----------------------------------------------------------- helpers --- */
const sec = (name, meta, active, done) => ({
  name,
  meta,
  bg: active ? '#EAF6EE' : '#FFFEFB',
  border: active ? '#CDE9D6' : '#E6DECF',
  color: active ? '#157A49' : '#1B1A16',
  metaColor: done ? '#157A49' : '#8A8378',
});

/* ----------------------------------------------- design sample data --- */
const SAMPLE = {
  identity: {
    name: 'Sarah Chen',
    title: 'Senior Product Designer',
    email: 'sarah.chen@gmail.com',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/sarahchen',
  },
  atsScore: 92,
  summary:
    'Senior product designer with 7 years shaping 0→1 fintech and B2B SaaS products. Led design systems used by 40+ engineers and shipped features driving 30%+ activation lifts.',
  suggestions: [
    { icon: '↑', text: 'Add a metric to your Plaid bullet — quantified impact ranks 2× higher.', action: 'Apply fix' },
    { icon: '+', text: 'Include "design tokens" — it appears in 8 of your target job descriptions.', action: 'Add keyword' },
    { icon: '✦', text: 'Tighten your summary to 2 lines for faster recruiter scanning.', action: 'Rewrite' },
  ],
  sections: [
    sec('Header', 'Complete', false, true),
    sec('Summary', 'AI-tuned', true, false),
    sec('Experience', '3 roles', false, true),
    sec('Skills', '12 tags', false, true),
    sec('Education', 'Complete', false, true),
  ],
  experience: [
    {
      role: 'Senior Product Designer',
      company: 'Plaid',
      dates: '2021 — Present',
      bullets: [
        'Led the design system adopted by 40+ engineers, cutting feature build time by 35%.',
        'Shipped a redesigned onboarding flow that lifted activation 31% across 2M users.',
      ],
    },
    {
      role: 'Product Designer',
      company: 'Brex',
      dates: '2019 — 2021',
      bullets: [
        'Designed the expense-approval experience now used by 20,000+ businesses.',
        'Ran a research program that reshaped the mobile roadmap for two quarters.',
      ],
    },
    {
      role: 'Product Designer',
      company: 'Earnest',
      dates: '2017 — 2019',
      bullets: ['Built the loan-application flow that reduced drop-off by 22%.'],
    },
  ],
  skills: [
    'Product design',
    'Design systems',
    'Figma',
    'Prototyping',
    'User research',
    'Design tokens',
    '0→1',
    'Fintech',
    'Accessibility',
    'Front-end (React)',
  ],
};

const initials = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'SC';

/* --------------------------------------------------------- component --- */
export default function AppResume() {
  const [data, setData] = useState(SAMPLE);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState('just now');
  const [activeResumeId, setActiveResumeId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Fetch real data, fall back gracefully to the design's sample data.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let next = { ...SAMPLE };
      let touched = false;

      // 1) Basic resume contact data (name / email / phone).
      try {
        const rd = await getResumeData();
        if (rd && (rd.name || rd.email || rd.phone)) {
          next = {
            ...next,
            identity: {
              ...next.identity,
              name: rd.name || next.identity.name,
              email: rd.email || next.identity.email,
              location: rd.phone || next.identity.location,
            },
          };
          touched = true;
        }
      } catch (e) {
        /* not authed / no backend — keep sample */
      }

      // 2) Resume-builder document (full structured resume).
      try {
        const list = await listResumes();
        const first = Array.isArray(list) ? list[0] : list?.resumes?.[0];
        if (first && first.id) {
          if (!cancelled) setActiveResumeId(first.id);
          const full = await getResumeById(first.id);
          const doc = full?.resume || full;
          if (doc) {
            next = mergeResumeDoc(next, doc);
            touched = true;
          }
        }
      } catch (e) {
        /* not authed / no backend — keep sample */
      }

      if (!cancelled) {
        if (touched) setData(next);
        setLoading(false);
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
        setData((prev) => mergeParsed(prev, parsed));
        setNotice({ kind: 'ok', text: 'Resume parsed and applied.' });
        setSavedAt('just now');
      }
    } catch (e) {
      setNotice({ kind: 'warn', text: 'Could not parse that file. Sign in and try a PDF/DOCX.' });
    } finally {
      setUploading(false);
    }
  }, []);

  const id = data.identity;

  /* ------------------------------------------------------------- ui --- */
  return (
    <>
      <Head>
        <title>Resume Builder — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
        #jbapp .jb-btn:hover {
          background: #f4efe4;
        }
        #jbapp .jb-btn-green:hover {
          background: #1b9159;
        }
        #jbapp .jb-add:hover {
          border-color: #1fa463;
          color: #157a49;
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
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
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
              gap: 16,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Toolkit / Resume
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#C9BFAC' }}>·</span>
            <span style={{ fontSize: 13.5, color: '#5A544A' }}>
              {id.name} — {id.title}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>
              Saved · {savedAt}
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
                accept=".pdf,.doc,.docx"
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
            <button
              type="button"
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
              }}
            >
              Tailor to a job ✦
            </button>
          </header>

          {/* NOTICE */}
          {notice && (
            <div
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
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, flex: 1, alignItems: 'start' }}>
            {/* LEFT: EDITOR CONTROLS */}
            <div style={{ borderRight: '1px solid #E7E0D2', padding: '26px 24px', height: '100%' }}>
              {/* ATS SCORE */}
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: `conic-gradient(#1FA463 0% ${data.atsScore}%, #EDE6D8 ${data.atsScore}% 100%)`,
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
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#157A49',
                      }}
                    >
                      {data.atsScore}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>ATS score: Excellent</div>
                    <div style={{ fontSize: 13, color: '#5A544A' }}>Clears automated screening for 9 of 10 roles.</div>
                  </div>
                </div>
              </div>

              {/* AI SUGGESTIONS */}
              <div style={{ background: '#15140F', borderRadius: 16, padding: '18px 20px', marginBottom: 22, color: '#F2EDE2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
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

              {/* SECTIONS LIST */}
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#9A9286',
                  marginBottom: 12,
                }}
              >
                Sections
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.sections.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '12px 14px',
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: '#C9BFAC', fontSize: 14, cursor: 'grab' }}>⠿</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: s.color }}>{s.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: s.metaColor }}>
                      {s.meta}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  className="jb-add"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '12px 14px',
                    background: 'none',
                    border: '1px dashed #D2C9B7',
                    borderRadius: 11,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#8A8378',
                  }}
                >
                  + Add section
                </button>
              </div>
            </div>

            {/* RIGHT: RESUME PREVIEW */}
            <div style={{ padding: '30px 40px', display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: 680,
                  background: '#FFFFFF',
                  border: '1px solid #E6DECF',
                  borderRadius: 6,
                  boxShadow: '0 24px 50px -30px rgba(27,26,22,0.3)',
                  padding: '52px 56px',
                  opacity: loading ? 0.6 : 1,
                  animation: loading ? 'jbskel 1.2s ease-in-out infinite' : 'none',
                }}
              >
                {/* HEADER */}
                <div style={{ borderBottom: '2px solid #1B1A16', paddingBottom: 18, marginBottom: 22 }}>
                  <h2
                    style={{
                      fontFamily: "'Instrument Serif',serif",
                      fontWeight: 400,
                      fontSize: 36,
                      lineHeight: 1,
                      margin: '0 0 8px',
                      color: '#1B1A16',
                    }}
                  >
                    {id.name}
                  </h2>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#157A49', marginBottom: 10 }}>{id.title}</div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11.5,
                      color: '#5A544A',
                    }}
                  >
                    <span>{id.email}</span>
                    <span>·</span>
                    <span>{id.location}</span>
                    <span>·</span>
                    <span>{id.linkedin}</span>
                  </div>
                </div>

                {/* SUMMARY */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#1FA463',
                      marginBottom: 9,
                    }}
                  >
                    Summary
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#2A2820', margin: 0 }}>{data.summary}</p>
                </div>

                {/* EXPERIENCE */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#1FA463',
                      marginBottom: 12,
                    }}
                  >
                    Experience
                  </div>
                  {data.experience.map((e, i) => (
                    <div key={i} style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{e.role}</span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 11,
                            color: '#8A8378',
                            flexShrink: 0,
                          }}
                        >
                          {e.dates}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#157A49', marginBottom: 7 }}>{e.company}</div>
                      {(e.bullets || []).map((b, j) => (
                        <div key={j} style={{ display: 'flex', gap: 9, marginBottom: 5 }}>
                          <span style={{ color: '#1FA463', flexShrink: 0, fontSize: 13 }}>▪</span>
                          <span style={{ fontSize: 13, lineHeight: 1.5, color: '#2A2820' }}>{b}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* SKILLS */}
                <div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#1FA463',
                      marginBottom: 10,
                    }}
                  >
                    Skills
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {data.skills.map((sk, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#2A2820',
                          background: '#F4EFE4',
                          borderRadius: 6,
                          padding: '5px 11px',
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ------------------------------------------------------ data mappers --- */
// Merge a resume-builder document into the view model, keeping sample
// fields for anything the backend doesn't provide.
function mergeResumeDoc(base, doc) {
  const content = doc.content || doc.data || doc;
  const next = { ...base };

  const name = doc.name || content.fullName || content.name;
  const title = content.title || content.headline || doc.title;
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

  if (content.summary || content.profile) next.summary = content.summary || content.profile;

  const exp = content.experience || content.experiences || content.workExperience;
  if (Array.isArray(exp) && exp.length) {
    next.experience = exp.map((e) => ({
      role: e.role || e.title || e.position || '',
      company: e.company || e.employer || e.organization || '',
      dates:
        e.dates ||
        [e.startDate || e.start, e.endDate || e.end || (e.current ? 'Present' : '')]
          .filter(Boolean)
          .join(' — '),
      bullets: Array.isArray(e.bullets)
        ? e.bullets
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
