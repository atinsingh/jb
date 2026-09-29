'use client';

import { useAiOperation } from '@/hooks/useAiOperation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  compareResume,
  getResumeById,
  importResume,
  uploadCompareSource,
  getCompareSource,
  updateResume,
} from '@/services/resumeApi';
import { uploadResume } from '@/services/api';
import CompareDocumentPreview from './CompareDocumentPreview';

const colors = {
  red: { border: '#D9485F', bg: 'color-mix(in srgb, #D9485F 8%, transparent)', label: 'Fix first' },
  amber: { border: '#D99018', bg: 'color-mix(in srgb, #D99018 9%, transparent)', label: 'Improve' },
  blue: { border: '#4263EB', bg: 'color-mix(in srgb, #4263EB 7%, transparent)', label: 'Review' },
};

const input = {
  width: '100%',
  border: '1px solid var(--jb-v3-line)',
  borderRadius: 3,
  background: 'var(--jb-v3-panel)',
  color: 'var(--jb-v3-fg)',
  padding: '10px 12px',
  font: 'inherit',
};

const button = {
  border: 'none',
  borderRadius: 3,
  padding: '10px 15px',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  color: 'var(--jb-v3-accent-ink)',
  background: 'var(--jb-v3-accent)',
};

function parsedResume(parsed) {
  return {
    fullName: parsed.fullName || parsed.name || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    location: parsed.location || '',
    linkedin: parsed.linkedin || '',
    summary: parsed.summary || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: (Array.isArray(parsed.experience) ? parsed.experience : []).map((entry) => ({
      title: entry.title || entry.role || '',
      company: entry.company || '',
      location: entry.location || '',
      startDate: entry.startDate || entry.start || String(entry.duration || '').split(/\s+(?:-|–|—|to)\s+/i)[0] || '',
      endDate: entry.endDate || entry.end || String(entry.duration || '').split(/\s+(?:-|–|—|to)\s+/i)[1] || '',
      current: Boolean(entry.current),
      description: entry.description || '',
      achievements: Array.isArray(entry.achievements)
        ? entry.achievements
        : Array.isArray(entry.bullets) ? entry.bullets : [],
    })),
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
  };
}

function CompareUpload({ onOpen }) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (!file || (!jobDescription.trim() && !jobUrl.trim()) || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await uploadResume(file, { fastCompare: true });
      const parsed = result?.parsedData || result?.parsed || result || {};
      const created = await importResume({
        name: file.name.replace(/\.[^.]+$/, '') || 'Imported Resume',
        importMode: 'keep_format',
        template: 'modern',
        ...parsedResume(parsed),
        source: {
          originalFilename: file.name,
          fileExtension: (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase(),
          mimeType: file.type || '',
          fileSize: file.size,
          parseStatus: parsed._source === 'heuristic' ? 'partial' : 'parsed',
          parseConfidence: parsed._source === 'heuristic' ? 0.6 : 0.9,
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim(),
        },
      });
      const id = created.id || created._id;
      await uploadCompareSource(id, file);
      onOpen(id);
    } catch (cause) {
      setError(cause?.message || 'Could not import this resume.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="compare-resume-upload" style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 25, margin: '0 0 8px' }}>Compare Resume</h2>
      <p style={{ color: 'var(--jb-v3-fg-3)', lineHeight: 1.55 }}>
        Import a PDF or DOCX. It stays a manually editable résumé while ATS and
        directional AI-content signals point to areas worth improving.
      </p>
      <div style={{ border: '1px dashed var(--jb-v3-accent-line)', padding: 22, background: 'var(--jb-v3-panel)' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 9 }}>
          Existing resume
        </label>
        <input
          aria-label="Existing resume"
          type="file"
          accept=".pdf,.docx"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        {file && <div style={{ marginTop: 10, fontSize: 13 }}>{file.name}</div>}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 18 }}>
          Job URL
          <input type="url" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/jobs/role" style={{ ...input, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 12 }}>
          Job description
          <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={5} placeholder="Or paste the job description" style={{ ...input, marginTop: 6, resize: 'vertical' }} />
        </label>
        {error && <div role="alert" style={{ color: 'var(--jb-v3-danger)', marginTop: 10 }}>{error}</div>}
        <button type="button" onClick={start} disabled={!file || (!jobDescription.trim() && !jobUrl.trim()) || busy} style={{ ...button, marginTop: 16, opacity: !file || (!jobDescription.trim() && !jobUrl.trim()) || busy ? 0.5 : 1 }}>
          {busy ? 'Importing…' : 'Import and compare'}
        </button>
      </div>
    </section>
  );
}

function AnnotationMarker({ section, annotations }) {
  if (!annotations.length) return null;
  const priority = { red: 3, amber: 2, blue: 1 };
  const color = annotations.reduce(
    (current, item) => priority[item.color] > priority[current] ? item.color : current,
    'blue',
  );
  const tone = colors[color];
  return (
    <span
      className="comparison-annotation"
      data-testid={`annotation-${section}`}
      tabIndex={0}
      style={{ position: 'relative', color: tone.border, fontSize: 11, fontWeight: 800, cursor: 'help' }}
    >
      ● {tone.label}
      <span
        role="tooltip"
        className="comparison-tooltip"
        style={{
          position: 'absolute', zIndex: 5, top: 22, right: 0, width: 300,
          padding: 12, border: `1px solid ${tone.border}`, borderRadius: 3,
          background: 'var(--jb-v3-panel)', color: 'var(--jb-v3-fg)',
          boxShadow: '0 12px 34px color-mix(in srgb, var(--jb-v3-fg) 16%, transparent)',
          opacity: 0, visibility: 'hidden', pointerEvents: 'none', lineHeight: 1.45,
        }}
      >
        {annotations.map((item) => (
          <span key={item.id} style={{ display: 'block', marginBottom: 8 }}>
            {item.quote && <b>“{item.quote}” — </b>}{item.message} <b>{item.fix}</b>
          </span>
        ))}
      </span>
    </span>
  );
}

function Section({ section, title, annotations, children }) {
  const own = annotations.filter((item) => item.section === section);
  const priority = { red: 3, amber: 2, blue: 1 };
  const color = own.reduce(
    (current, item) => priority[item.color] > priority[current] ? item.color : current,
    'blue',
  );
  const tone = own.length ? colors[color] : null;
  return (
    <section style={{ border: `1px solid ${tone?.border || 'var(--jb-v3-line)'}`, background: tone?.bg || 'var(--jb-v3-panel)', borderRadius: 3, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>{title}</h3>
        <AnnotationMarker section={section} annotations={own} />
      </div>
      {children}
    </section>
  );
}

const lines = (value) => String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

const sectionLabels = {
  personal: 'Contact details',
  summary: 'Summary',
  experience: 'Work experience',
  skills: 'Skills',
  education: 'Education',
  projects: 'Projects',
  achievements: 'Achievements',
  certifications: 'Certifications',
  languages: 'Languages',
};

const aiSignalLabels = {
  sentenceLengthVariance: 'Sentence variation',
  vocabularyDiversity: 'Vocabulary diversity',
  repetitiveSentenceOpeners: 'Repeated sentence openings',
  stockPhrases: 'Stock phrases',
  punctuationBulletSectionRegularity: 'Formatting regularity',
  readability: 'Readability pattern',
};

function AiPatternBreakdown({ result }) {
  const signals = Object.entries(result?.signals || {}).filter(([, signal]) =>
    Number.isFinite(signal?.likelihood),
  );
  if (!signals.length) return null;

  return (
    <details data-testid="ai-pattern-breakdown" style={{ margin: '-3px 0 12px', fontSize: 11.5 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Why {result.composite}%?</summary>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {signals.map(([key, signal]) => (
          <div key={key} style={{ borderLeft: '2px solid var(--jb-v3-line)', paddingLeft: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{aiSignalLabels[key] || key}</span>
              <strong>{signal.likelihood}%</strong>
            </div>
            {signal.explanation && (
              <div style={{ color: 'var(--jb-v3-fg-3)', lineHeight: 1.4, marginTop: 2 }}>{signal.explanation}</div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

function withoutDuplicatedExperienceText(document) {
  if (!Array.isArray(document?.experience)) return document;
  return {
    ...document,
    experience: document.experience.map((entry) => {
      const bullets = Array.isArray(entry.achievements) ? entry.achievements.join(' ') : '';
      const normalized = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return bullets && normalized(entry.description) === normalized(bullets)
        ? { ...entry, description: '' }
        : entry;
    }),
  };
}

function SuggestionList({ annotations }) {
  const priority = { red: 3, amber: 2, blue: 1 };
  const ordered = [...annotations].sort((left, right) =>
    (priority[right.color] || 0) - (priority[left.color] || 0),
  );

  return (
    <section data-testid="comparison-suggestions" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <h4 style={{ margin: 0, fontSize: 13 }}>Review suggestions</h4>
        <span style={{ fontSize: 11, color: 'var(--jb-v3-fg-3)' }}>{annotations.length} total</span>
      </div>
      <p style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--jb-v3-fg-3)', margin: '6px 0 9px' }}>
        Highlights mark text that already exists. Missing requirements have nothing to highlight, so every suggestion is also listed here.
      </p>
      {ordered.length ? (
        <div style={{ display: 'grid', gap: 7, maxHeight: 330, overflowY: 'auto', paddingRight: 3 }}>
          {ordered.map((item, index) => {
            const tone = colors[item.color] || colors.blue;
            return (
              <article
                key={item.id}
                data-testid="comparison-suggestion"
                style={{ borderLeft: `3px solid ${tone.border}`, background: tone.bg, padding: '9px 10px' }}
              >
                <div style={{ fontSize: 10, color: 'var(--jb-v3-fg-3)', marginBottom: 4, textTransform: 'uppercase' }}>
                  {index + 1}. {sectionLabels[item.section] || item.section} · {tone.label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{item.message}</div>
                <div style={{ fontSize: 11.5, lineHeight: 1.45, marginTop: 3 }}>{item.fix}</div>
                {item.quote && (
                  <div style={{ fontSize: 10.5, color: 'var(--jb-v3-fg-3)', marginTop: 4 }}>
                    Source text: “{item.quote}”
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>No fixes were found.</div>
      )}
    </section>
  );
}

function ComparisonLoading({ scores = false }) {
  return (
    <div
      data-testid={scores ? 'comparison-score-loading' : 'comparison-fields-loading'}
      aria-hidden="true"
      style={{ display: 'grid', gap: 12 }}
    >
      {scores ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {[0, 1, 2].map((index) => (
              <div key={index} className="compare-loading-panel" style={{ gridColumn: index === 2 ? '1 / -1' : undefined, height: 70 }}>
                <span className="compare-loading-line" style={{ width: '52%' }} />
                <span className="compare-loading-line" style={{ width: '35%', height: 22 }} />
              </div>
            ))}
          </div>
          <div className="compare-loading-panel" style={{ height: 130 }}>
            <span className="compare-loading-line" style={{ width: '48%' }} />
            <span className="compare-loading-line" style={{ width: '94%' }} />
            <span className="compare-loading-line" style={{ width: '78%' }} />
            <span className="compare-loading-line" style={{ width: '86%' }} />
          </div>
        </>
      ) : (
        <>
          <div className="compare-loading-panel" style={{ minHeight: 330 }}>
            <span className="compare-loading-line" style={{ width: '42%', height: 20 }} />
            {[88, 94, 75, 90, 67, 83, 91, 72].map((width, index) => (
              <span key={index} className="compare-loading-line" style={{ width: `${width}%` }} />
            ))}
          </div>
          {['Contact details', 'Summary', 'Work experience', 'Skills'].map((title) => (
            <div key={title} className="compare-loading-panel" style={{ minHeight: 90 }}>
              <span className="compare-loading-line" style={{ width: 120 }} />
              <span className="compare-loading-line" style={{ width: '93%' }} />
              <span className="compare-loading-line" style={{ width: '68%' }} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function validateDetails(resume) {
  const invalidExperience = (resume.experience || []).findIndex((entry) =>
    !String(entry.title || '').trim() || !String(entry.company || '').trim(),
  );
  if (invalidExperience >= 0) {
    return `Job title and company are required for work experience ${invalidExperience + 1}.`;
  }
  const invalidCertification = (resume.certifications || []).findIndex((item) =>
    !String(item.name || '').trim() || !String(item.issuer || '').trim(),
  );
  if (invalidCertification >= 0) {
    return `Certification name and issuer are required for certification ${invalidCertification + 1}.`;
  }
  return '';
}

export default function CompareResumeWorkspace({ resumeId, onOpen }) {
  const operation = useAiOperation();
  const runOperation = operation.run;
  const [resume, setResume] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [busy, setBusy] = useState(Boolean(resumeId));
  const [comparing, setComparing] = useState(Boolean(resumeId));
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [sourceBlob, setSourceBlob] = useState(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceBusy, setSourceBusy] = useState(false);

  const runComparison = useCallback(async (id = resumeId, jd = jobDescription, url = jobUrl) => {
    if (!id) return;
    setBusy(true);
    setComparing(true);
    setAssessment(null);
    setMessage('');
    try {
      const context = { jobDescription: jd.trim(), jobUrl: url.trim() };
      if (resume && (context.jobDescription !== (resume.source?.jobDescription || '') || context.jobUrl !== (resume.source?.jobUrl || ''))) {
        const updated = await updateResume(id, { source: { ...resume.source, ...context } });
        setResume(withoutDuplicatedExperienceText(updated));
      }
      const result = await runOperation(headers => compareResume(id, { ...context, forceRefresh: true }, headers));
      if (Object.keys(result.details || {}).length) setResume((current) => withoutDuplicatedExperienceText({ ...current, ...result.details }));
      setAssessment(result);
    } catch (cause) {
      setMessage(cause?.message || 'Comparison is temporarily unavailable.');
    } finally {
      setComparing(false);
      setBusy(false);
    }
  }, [resumeId, jobDescription, jobUrl, resume]);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    setBusy(true);
    setComparing(true);
    setAssessment(null);
    setMessage('');
    getResumeById(resumeId)
      .then((document) => {
        if (cancelled) return;
        setResume(withoutDuplicatedExperienceText(document));
        setJobDescription(document.source?.jobDescription || '');
        setJobUrl(document.source?.jobUrl || '');
        if (!document.source?.jobDescription?.trim() && !document.source?.jobUrl?.trim()) {
          setComparing(false);
          return null;
        }
        return runOperation(headers => compareResume(resumeId, {}, headers));
      })
      .then((result) => {
        if (cancelled || !result) return;
        if (Object.keys(result.details || {}).length) setResume((current) => withoutDuplicatedExperienceText({ ...current, ...result.details }));
        setAssessment(result);
      })
      .catch((cause) => !cancelled && setMessage(cause?.message || 'Could not open this resume.'))
      .finally(() => {
        if (!cancelled) {
          setComparing(false);
          setBusy(false);
        }
      });
    return () => { cancelled = true; };
  }, [resumeId, runOperation]);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    setSourceBlob(null);
    setSourceError('');
    getCompareSource(resumeId)
      .then((blob) => !cancelled && setSourceBlob(blob))
      .catch((cause) => !cancelled && setSourceError(cause?.message || 'Could not open the uploaded résumé.'));
    return () => { cancelled = true; };
  }, [resumeId]);

  const reattachSource = async (file) => {
    if (!file) return;
    setSourceBusy(true);
    setSourceError('');
    try {
      await uploadCompareSource(resumeId, file);
      const [document, blob] = await Promise.all([getResumeById(resumeId), getCompareSource(resumeId)]);
      setResume(withoutDuplicatedExperienceText(document));
      setSourceBlob(blob);
    } catch (cause) {
      setSourceError(cause?.message || 'Could not attach the original résumé.');
    } finally {
      setSourceBusy(false);
    }
  };

  const annotations = assessment?.annotations || [];
  const update = (patch) => setResume((current) => ({ ...current, ...patch }));
  const patchExperience = (index, patch) => update({
    experience: resume.experience.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
  const addExperience = () => update({
    experience: [...(resume.experience || []), { title: '', company: '', startDate: '', endDate: '', achievements: [] }],
  });
  const patchEducation = (index, patch) => update({
    education: (resume.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
  const addEducation = () => update({
    education: [...(resume.education || []), { degree: '', institution: '', startDate: '', endDate: '' }],
  });
  const addCertification = () => update({
    certifications: [...(resume.certifications || []), { name: '', issuer: '', date: '' }],
  });
  const summaryCounts = useMemo(() => ({
    red: annotations.filter((item) => item.color === 'red').length,
    amber: annotations.filter((item) => item.color === 'amber').length,
    blue: annotations.filter((item) => item.color === 'blue').length,
  }), [annotations]);

  const save = async () => {
    const invalid = validateDetails(resume);
    setValidationError(invalid);
    if (invalid) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        fullName: resume.fullName || '', email: resume.email || '', phone: resume.phone || '',
        location: resume.location || '', linkedin: resume.linkedin || '', summary: resume.summary || '',
        skills: resume.skills || [],
        experience: (resume.experience || []).map(({ title, company, location, startDate, endDate, current, description, achievements }) => ({
          title, company, location, startDate, endDate, current, description, achievements,
        })),
        education: (resume.education || []).map(({ degree, institution, location, startDate, endDate, gpa, description }) => ({
          degree, institution, location, startDate, endDate, gpa, description,
        })),
        achievements: resume.achievements || [],
        certifications: (resume.certifications || []).map(({ name, issuer, date, expiryDate, credentialId, credentialUrl }) => ({
          name, issuer, date, expiryDate, credentialId, credentialUrl,
        })),
      };
      setResume(withoutDuplicatedExperienceText(await updateResume(resumeId, payload)));
      setMessage('Resume details saved. The review still reflects the uploaded file; Refresh comparison runs separately.');
    } catch (cause) {
      setMessage(cause?.message || 'Could not save resume details.');
    } finally {
      setBusy(false);
    }
  };

  if (!resumeId) return <CompareUpload onOpen={onOpen} />;
  if (!resume) return <div>{busy ? 'Opening imported resume…' : message}</div>;

  return (
    <div>
      <style jsx global>{`
        .comparison-annotation:hover .comparison-tooltip,
        .comparison-annotation:focus .comparison-tooltip,
        .comparison-annotation:focus-within .comparison-tooltip { opacity: 1 !important; visibility: visible !important; }
        .compare-loading-panel { display: grid; align-content: start; gap: 11px; padding: 16px; border: 1px solid var(--jb-v3-line); background: var(--jb-v3-panel); border-radius: 3px; }
        .compare-loading-line { display: block; height: 11px; border-radius: 3px; background: linear-gradient(100deg, var(--jb-v3-line) 15%, color-mix(in srgb, var(--jb-v3-line) 35%, var(--jb-v3-panel)) 48%, var(--jb-v3-line) 80%); background-size: 220% 100%; animation: compare-loading-sweep 1.5s ease-in-out infinite; }
        .compare-loading-track { height: 3px; overflow: hidden; background: var(--jb-v3-line); margin-top: 11px; }
        .compare-loading-track::after { content: ''; display: block; width: 38%; height: 100%; background: var(--jb-v3-accent); animation: compare-loading-travel 1.5s ease-in-out infinite; }
        @keyframes compare-loading-sweep { from { background-position: 110% 0; } to { background-position: -110% 0; } }
        @keyframes compare-loading-travel { from { transform: translateX(-100%); } to { transform: translateX(270%); } }
        @media (prefers-reduced-motion: reduce) { .compare-loading-line, .compare-loading-track::after { animation: none; } }
        .compare-resume-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 340px); gap: 18px; align-items: start; }
        @media (max-width: 900px) {
          .compare-resume-layout { grid-template-columns: minmax(0, 1fr); }
          .compare-resume-aside { position: static !important; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 26, margin: '0 0 5px' }}>Compare Resume</h2>
          <div style={{ color: 'var(--jb-v3-fg-3)', fontSize: 13 }}>{resume.name}</div>
          {!comparing && <div style={{ color: 'var(--jb-v3-fg-3)', fontSize: 11, marginTop: 4 }}>Imported résumé details · editable</div>}
        </div>
        <button type="button" onClick={save} disabled={busy} style={{ ...button, opacity: busy ? 0.55 : 1 }}>
          {busy && !comparing ? 'Saving…' : 'Save Resume Details'}
        </button>
      </div>

      {operation.cancelError && <div role="alert">{operation.cancelError}</div>}
      {message && <div role="alert" style={{ marginBottom: 14, color: message.startsWith('Resume details saved.') ? 'var(--jb-v3-fg-2)' : 'var(--jb-v3-danger)' }}>{message}</div>}
      {comparing && (
        <div role="status" aria-live="polite" data-testid="comparison-pending" style={{ marginBottom: 14, padding: '13px 15px', border: '1px solid var(--jb-v3-accent-line)', background: 'var(--jb-v3-panel)' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Comparing your résumé with the job…</div>
          <div style={{ fontSize: 11.5, color: 'var(--jb-v3-fg-3)', marginTop: 4 }}>The agent is reviewing the original file. Scores, comments, and highlights will appear together when it finishes.</div>
          {operation.active && <button type="button" onClick={operation.cancel} disabled={operation.cancelling} style={{ ...button, marginTop: 10 }}>{operation.cancelling ? 'Stopping and reconciling usage…' : 'Cancel comparison'}</button>}
          <div className="compare-loading-track" aria-hidden="true" />
        </div>
      )}
      {!comparing && !assessment && !jobDescription.trim() && !jobUrl.trim() && (
        <div role="status" style={{ marginBottom: 14, color: 'var(--jb-v3-fg-2)' }}>
          Add a job description or job URL to compare this résumé.
        </div>
      )}
      {validationError && <div role="alert" style={{ marginBottom: 14, color: 'var(--jb-v3-danger)' }}>{validationError}</div>}
      <div className="compare-resume-layout" aria-busy={comparing}>
        <div style={{ display: 'grid', gap: 12 }}>
          {comparing ? <ComparisonLoading /> : <>
          {assessment && sourceBlob ? (
            <CompareDocumentPreview blob={sourceBlob} filename={resume.source?.originalFilename || 'resume.pdf'} annotations={annotations} resume={resume} />
          ) : sourceError ? (
            <div role="status" style={{ padding: 12, border: '1px solid var(--jb-v3-line)' }}>
              <div>{sourceError} Re-upload the original PDF or DOCX to preview it here.</div>
              <label style={{ display: 'block', marginTop: 10, fontSize: 13 }}>
                Re-upload original résumé
                <input type="file" accept=".pdf,.doc,.docx" disabled={sourceBusy} onChange={(event) => reattachSource(event.target.files?.[0])} style={{ display: 'block', marginTop: 6 }} />
              </label>
            </div>
          ) : !assessment && !message ? (
            <div role="status" style={{ padding: 12, border: '1px solid var(--jb-v3-line)' }}>Run the comparison to see the highlighted original document.</div>
          ) : null}
          <Section section="personal" title="Contact details" annotations={annotations}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['fullName', 'email', 'phone', 'location', 'linkedin'].map((key) => (
                <label key={key} style={{ fontSize: 12, color: 'var(--jb-v3-fg-2)' }}>
                  {key === 'fullName' ? 'Full name' : key.charAt(0).toUpperCase() + key.slice(1)}
                  <input value={resume[key] || ''} onChange={(event) => update({ [key]: event.target.value })} style={{ ...input, marginTop: 5 }} />
                </label>
              ))}
            </div>
          </Section>
          <Section section="summary" title="Summary" annotations={annotations}>
            <textarea aria-label="Summary" rows={5} value={resume.summary || ''} onChange={(event) => update({ summary: event.target.value })} style={{ ...input, resize: 'vertical' }} />
          </Section>
          <Section section="experience" title="Work experience" annotations={annotations}>
            <div style={{ display: 'grid', gap: 10 }}>
              {(resume.experience || []).map((entry, index) => (
                <div key={index} style={{ border: '1px solid var(--jb-v3-line)', padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input aria-label={`Job title ${index + 1}`} value={entry.title || ''} onChange={(event) => patchExperience(index, { title: event.target.value })} placeholder="Job title" style={input} />
                    <input aria-label={`Company ${index + 1}`} value={entry.company || ''} onChange={(event) => patchExperience(index, { company: event.target.value })} placeholder="Company" style={input} />
                    <input aria-label={`Start date ${index + 1}`} value={entry.startDate || ''} onChange={(event) => patchExperience(index, { startDate: event.target.value })} placeholder="Start date" style={input} />
                    <input aria-label={`End date ${index + 1}`} value={entry.endDate || ''} onChange={(event) => patchExperience(index, { endDate: event.target.value })} placeholder="End date" style={input} />
                  </div>
                  <textarea aria-label={`Role description ${index + 1}`} rows={3} value={entry.description || ''} onChange={(event) => patchExperience(index, { description: event.target.value })} placeholder="Role description" style={{ ...input, marginTop: 8 }} />
                  <textarea aria-label={`Role achievements ${index + 1}`} rows={3} value={(entry.achievements || []).join('\n')} onChange={(event) => patchExperience(index, { achievements: lines(event.target.value) })} placeholder="One achievement per line" style={{ ...input, marginTop: 8 }} />
                </div>
              ))}
              <button type="button" onClick={addExperience} style={{ ...button, color: 'var(--jb-v3-accent)', background: 'transparent', border: '1px dashed var(--jb-v3-accent-line)' }}>+ Add work experience</button>
            </div>
          </Section>
          <Section section="skills" title="Skills" annotations={annotations}>
            <textarea aria-label="Skills" rows={3} value={(resume.skills || []).join('\n')} onChange={(event) => update({ skills: lines(event.target.value) })} placeholder="One skill per line" style={input} />
          </Section>
          <Section section="achievements" title="Achievements" annotations={annotations}>
            <textarea aria-label="Achievements" rows={3} value={(resume.achievements || []).join('\n')} onChange={(event) => update({ achievements: lines(event.target.value) })} placeholder="One standalone achievement per line" style={input} />
          </Section>
          <Section section="certifications" title="Certifications" annotations={annotations}>
            <div style={{ display: 'grid', gap: 9 }}>
              {(resume.certifications || []).map((certificate, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr .7fr', gap: 8 }}>
                  {['name', 'issuer', 'date'].map((key) => (
                    <input key={key} aria-label={`${key} ${index + 1}`} value={certificate[key] || ''} onChange={(event) => update({ certifications: resume.certifications.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item) })} placeholder={key} style={input} />
                  ))}
                </div>
              ))}
              <button type="button" onClick={addCertification} style={{ ...button, color: 'var(--jb-v3-accent)', background: 'transparent', border: '1px dashed var(--jb-v3-accent-line)' }}>+ Add certification</button>
            </div>
          </Section>
          <Section section="education" title="Education" annotations={annotations}>
            <div style={{ display: 'grid', gap: 10 }}>
              {(resume.education || []).map((entry, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input aria-label={`Degree ${index + 1}`} value={entry.degree || ''} onChange={(event) => patchEducation(index, { degree: event.target.value })} placeholder="Degree" style={input} />
                  <input aria-label={`Institution ${index + 1}`} value={entry.institution || ''} onChange={(event) => patchEducation(index, { institution: event.target.value })} placeholder="Institution" style={input} />
                  <input aria-label={`Education start date ${index + 1}`} value={entry.startDate || ''} onChange={(event) => patchEducation(index, { startDate: event.target.value })} placeholder="Start date" style={input} />
                  <input aria-label={`Education end date ${index + 1}`} value={entry.endDate || ''} onChange={(event) => patchEducation(index, { endDate: event.target.value })} placeholder="End date" style={input} />
                </div>
              ))}
              <button type="button" onClick={addEducation} style={{ ...button, color: 'var(--jb-v3-accent)', background: 'transparent', border: '1px dashed var(--jb-v3-accent-line)' }}>+ Add education</button>
            </div>
          </Section>
          </>}
        </div>

        <aside className="compare-resume-aside" style={{ position: 'sticky', top: 18, border: '1px solid var(--jb-v3-line)', borderRadius: 3, padding: 16, background: 'var(--jb-v3-panel)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Comparison</h3>
          {comparing ? <ComparisonLoading scores /> : <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
            <Score label="ATS readability" value={assessment?.ats?.score} testId="compare-ats-score" cardTestId="compare-ats-card" caption="Higher is better" />
            <Score label="Job match" value={assessment?.match?.coverage} testId="compare-match-score" cardTestId="compare-match-card" caption="Higher is better" />
            <Score label="AI-pattern likelihood" value={assessment?.aiContent?.composite} suffix="%" testId="compare-ai-score" cardTestId="compare-ai-card" caption="Lower is better" wide />
          </div>
          <p data-testid="comparison-score-explanation" style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--jb-v3-fg-3)', margin: '-5px 0 11px' }}>
            ATS readability and Job match are independently reviewed by the résumé agent. AI-pattern likelihood is a separate local heuristic that flags writing patterns—not authorship. Similar numbers are coincidental.
          </p>
          {assessment?.review?.source === 'agent-session' && (
            <div data-testid="comparison-review-source" style={{ fontSize: 10.5, color: 'var(--jb-v3-fg-3)', margin: '-5px 0 10px' }}>
              Agent session · {assessment.review.harness || 'configured harness'} · {assessment.review.modelAlias || 'configured model'}
            </div>
          )}
          {(assessment?.ats?.explanation || assessment?.match?.explanation) && (
            <details data-testid="comparison-score-reasons" style={{ fontSize: 11.5, margin: '0 0 12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Why these two scores?</summary>
              {assessment?.ats?.explanation && <p><b>ATS:</b> {assessment.ats.explanation}</p>}
              {assessment?.match?.explanation && <p><b>Job match:</b> {assessment.match.explanation}</p>}
            </details>
          )}
          <AiPatternBreakdown result={assessment?.aiContent} />
          {!!assessment?.ats?.missingSections?.length && (
            <section data-testid="comparison-missing-sections" style={{ marginBottom: 14, padding: 10, borderLeft: `3px solid ${colors.amber.border}`, background: colors.amber.bg }}>
              <strong style={{ fontSize: 12 }}>Missing résumé sections</strong>
              <p style={{ fontSize: 11.5, lineHeight: 1.45, margin: '5px 0 0' }}>
                {assessment.ats.missingSections.map((section) => sectionLabels[section] || section).join(', ')}. Add truthful details where available; absent sections cannot be highlighted in the original file.
              </p>
            </section>
          )}
          <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 14 }}>
            <span style={{ color: colors.red.border }}>{summaryCounts.red} fix first</span>
            <span style={{ color: colors.amber.border }}>{summaryCounts.amber} improve</span>
            <span style={{ color: colors.blue.border }}>{summaryCounts.blue} review</span>
          </div>
          <SuggestionList annotations={annotations} />
          </>}
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Job description
            <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} disabled={comparing} rows={6} style={{ ...input, marginTop: 6, resize: 'vertical', opacity: comparing ? 0.6 : 1 }} />
          </label>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 10 }}>
            Job URL
            <input type="url" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} disabled={comparing} style={{ ...input, marginTop: 6, opacity: comparing ? 0.6 : 1 }} />
          </label>
          <button type="button" onClick={() => runComparison()} disabled={busy || (!jobDescription.trim() && !jobUrl.trim())} style={{ ...button, width: '100%', marginTop: 10, opacity: busy || (!jobDescription.trim() && !jobUrl.trim()) ? 0.55 : 1 }}>
            {comparing ? 'Comparing…' : 'Refresh comparison'}
          </button>
          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--jb-v3-fg-3)', marginBottom: 0 }}>
            Agent comparisons use measured model credits (1 credit per cent of usage). AI-content likelihood is a local heuristic and uses no credit; it is directional evidence, not proof. Apply every suggestion manually and only when it remains truthful.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Score({ label, value, suffix = '', testId, cardTestId, caption, wide = false }) {
  return (
    <div data-testid={cardTestId} style={{ border: '1px solid var(--jb-v3-line)', padding: 11, gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 10, color: 'var(--jb-v3-fg-3)', textTransform: 'uppercase' }}>{label}</div>
      <div data-testid={testId} style={{ fontSize: 23, fontWeight: 700 }}>{value == null ? '—' : `${value}${suffix}`}</div>
      <div style={{ fontSize: 10, color: 'var(--jb-v3-fg-3)' }}>{caption}</div>
    </div>
  );
}
