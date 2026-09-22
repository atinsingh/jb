'use client';

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
      const result = await uploadResume(file);
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
  const [resume, setResume] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [busy, setBusy] = useState(Boolean(resumeId));
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [sourceBlob, setSourceBlob] = useState(null);
  const [sourceError, setSourceError] = useState('');

  const runComparison = useCallback(async (id = resumeId, jd = jobDescription, url = jobUrl) => {
    if (!id) return;
    setBusy(true);
    setMessage('');
    try {
      const context = { jobDescription: jd.trim(), jobUrl: url.trim() };
      if (resume && (context.jobDescription !== (resume.source?.jobDescription || '') || context.jobUrl !== (resume.source?.jobUrl || ''))) {
        const updated = await updateResume(id, { source: { ...resume.source, ...context } });
        setResume(updated);
      }
      setAssessment(await compareResume(id, context));
    } catch (cause) {
      setMessage(cause?.message || 'Comparison is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }, [resumeId, jobDescription, jobUrl, resume]);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    setBusy(true);
    getResumeById(resumeId)
      .then((document) => {
        if (cancelled) return;
        setResume(document);
        setJobDescription(document.source?.jobDescription || '');
        setJobUrl(document.source?.jobUrl || '');
        return compareResume(resumeId, {});
      })
      .then((result) => !cancelled && result && setAssessment(result))
      .catch((cause) => !cancelled && setMessage(cause?.message || 'Could not open this resume.'))
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
  }, [resumeId]);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    getCompareSource(resumeId)
      .then((blob) => !cancelled && setSourceBlob(blob))
      .catch((cause) => !cancelled && setSourceError(cause?.message || 'Could not open the uploaded résumé.'));
    return () => { cancelled = true; };
  }, [resumeId]);

  const annotations = assessment?.annotations || [];
  const update = (patch) => setResume((current) => ({ ...current, ...patch }));
  const patchExperience = (index, patch) => update({
    experience: resume.experience.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
  const addExperience = () => update({
    experience: [...(resume.experience || []), { title: '', company: '', startDate: '', endDate: '', achievements: [] }],
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
        skills: resume.skills || [], experience: resume.experience || [], achievements: resume.achievements || [],
        certifications: resume.certifications || [],
      };
      setResume(await updateResume(resumeId, payload));
      setMessage('Resume details saved.');
      await runComparison(resumeId, jobDescription);
    } catch (cause) {
      setMessage(cause?.message || 'Could not save resume details.');
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
        </div>
        <button type="button" onClick={save} disabled={busy} style={{ ...button, opacity: busy ? 0.55 : 1 }}>
          Save Resume Details
        </button>
      </div>

      {message && <div role="status" style={{ marginBottom: 14, color: 'var(--jb-v3-fg-2)' }}>{message}</div>}
      {validationError && <div role="alert" style={{ marginBottom: 14, color: 'var(--jb-v3-danger)' }}>{validationError}</div>}
      <div className="compare-resume-layout">
        <div style={{ display: 'grid', gap: 12 }}>
          {sourceBlob ? (
            <CompareDocumentPreview blob={sourceBlob} filename={resume.source?.originalFilename || 'resume.pdf'} annotations={annotations} resume={resume} />
          ) : sourceError ? (
            <div role="status" style={{ padding: 12, border: '1px solid var(--jb-v3-line)' }}>{sourceError}</div>
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
        </div>

        <aside className="compare-resume-aside" style={{ position: 'sticky', top: 18, border: '1px solid var(--jb-v3-line)', borderRadius: 3, padding: 16, background: 'var(--jb-v3-panel)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
            <Score label="ATS" value={assessment?.ats?.score} testId="compare-ats-score" />
            <Score label="AI-content" value={assessment?.aiContent?.composite} testId="compare-ai-score" />
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 14 }}>
            <span style={{ color: colors.red.border }}>{summaryCounts.red} fix first</span>
            <span style={{ color: colors.amber.border }}>{summaryCounts.amber} improve</span>
            <span style={{ color: colors.blue.border }}>{summaryCounts.blue} review</span>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Job description
            <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={6} style={{ ...input, marginTop: 6, resize: 'vertical' }} />
          </label>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 10 }}>
            Job URL
            <input type="url" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} style={{ ...input, marginTop: 6 }} />
          </label>
          <button type="button" onClick={() => runComparison()} disabled={busy || (!jobDescription.trim() && !jobUrl.trim())} style={{ ...button, width: '100%', marginTop: 10, opacity: busy || (!jobDescription.trim() && !jobUrl.trim()) ? 0.55 : 1 }}>
            {busy ? 'Comparing…' : 'Refresh comparison'}
          </button>
          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--jb-v3-fg-3)', marginBottom: 0 }}>
            AI-content likelihood is directional evidence, not proof. Apply every suggestion manually and only when it remains truthful.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Score({ label, value, testId }) {
  return (
    <div style={{ border: '1px solid var(--jb-v3-line)', padding: 11 }}>
      <div style={{ fontSize: 10, color: 'var(--jb-v3-fg-3)', textTransform: 'uppercase' }}>{label}</div>
      <div data-testid={testId} style={{ fontSize: 23, fontWeight: 700 }}>{value ?? '—'}</div>
    </div>
  );
}
