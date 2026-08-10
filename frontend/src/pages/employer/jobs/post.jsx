'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { employerJobsApi } from '@/services/employerApi';

// Map the form's employment-type labels to the backend enum.
const TYPE_ENUM = {
  'Full Time': 'Full-time',
  'Part Time': 'Part-time',
  Contract: 'Contract',
  Temporary: 'Contract',
  Internship: 'Internship',
  Freelance: 'Contract',
};
const toTypeEnum = (t) => TYPE_ENUM[t] || 'Full-time';

/* --------------------------------------------------------------- config --- */
// Form sections for navigation
const formSections = [
  { id: 'job-info', title: 'Job Information' },
  { id: 'company', title: 'Company Details' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'preview', title: 'Preview & Submit' },
];

// Job types
const jobTypes = [
  { value: 'Full Time', label: 'Full Time' },
  { value: 'Part Time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Freelance', label: 'Freelance' },
];

// Experience levels
const experienceLevels = [
  { value: 'Entry Level', label: 'Entry Level' },
  { value: 'Mid Level', label: 'Mid Level' },
  { value: 'Senior Level', label: 'Senior Level' },
  { value: 'Executive', label: 'Executive' },
];

// Education levels
const educationLevels = [
  { value: 'High School', label: 'High School' },
  { value: 'Associate Degree', label: 'Associate Degree' },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'No Formal Education Required', label: 'No Formal Education Required' },
];

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', display: 'block', marginBottom: 7 };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const ghostBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '11px 12px', boxSizing: 'border-box' };
const selectStyle = {
  ...fieldInput, cursor: 'pointer', appearance: 'none', paddingRight: 34,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238A8378' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};
const cardStyle = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' };

/* ----------------------------------------------------------- ui helpers --- */
function Field({ label, required, children }) {
  return (
    <div>
      {label && (
        <label style={monoLabel}>
          {label}{required && <span style={{ color: '#C9622E' }}> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function Section({ title, description, visible, children }) {
  return (
    <div style={{ ...cardStyle, display: visible ? 'block' : 'none' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid #F2ECE0', background: '#FBF9F4' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1B1A16' }}>{title}</h3>
        {description && <p style={{ fontSize: 13, color: '#8A8378', margin: '4px 0 0' }}>{description}</p>}
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------- component --- */
function PostJob() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activeSection, setActiveSection] = useState('job-info');

  // Initialize form data with all required fields
  const [formData, setFormData] = useState({
    title: '',
    type: 'Full Time',
    location: '',
    companyName: '',
    companyLogo: '',
    category: 'Development',
    salaryMin: '',
    salaryMax: '',
    salaryType: 'year',
    salary: '',
    experience: '',
    description: '',
    responsibilities: [],
    requirements: [],
    benefits: [],
    skills: [],
    newResponsibility: '',
    newRequirement: '',
    newBenefit: '',
    educationLevel: "Bachelor's Degree",
    isRemote: false,
    applicationDeadline: '',
  });

  // Update salary string whenever min, max or type changes - client-side only
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const updateSalary = () => {
        if (formData.salaryMin && formData.salaryMax) {
          const min = Number(formData.salaryMin);
          const max = Number(formData.salaryMax);
          if (!isNaN(min) && !isNaN(max)) {
            const salaryStr = `$${min.toLocaleString()} - $${max.toLocaleString()}/${formData.salaryType}`;
            setFormData((prev) => ({
              ...prev,
              salary: salaryStr,
            }));
            return;
          }
        }
        setFormData((prev) => ({
          ...prev,
          salary: '',
        }));
      };

      updateSalary();
    }
  }, [formData.salaryMin, formData.salaryMax, formData.salaryType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addItem = (field, valueField) => {
    const value = formData[valueField].trim();
    if (value) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value],
        [valueField]: '',
      }));
    }
  };

  const removeItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const validateSalary = (min, max) => {
    if (min && max && Number(min) > Number(max)) {
      return 'Minimum salary cannot be greater than maximum salary';
    }
    return '';
  };

  // Build the employer-jobs DTO from the form fields for a given status.
  const buildDto = (status) => ({
    title: formData.title.trim(),
    type: toTypeEnum(formData.type),
    location: formData.location || '',
    isRemote: !!formData.isRemote,
    salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
    salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
    salaryPeriod: formData.salaryType === 'hour' ? 'hour' : 'year',
    description: formData.description || '',
    responsibilities: Array.isArray(formData.responsibilities) ? formData.responsibilities : [],
    requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
    benefits: Array.isArray(formData.benefits) ? formData.benefits : [],
    skills: Array.isArray(formData.skills) ? formData.skills : [],
    status,
    visibility: 'public',
  });

  // Persist the job with the given status ('active' to publish, 'draft' to save).
  const persist = async (status) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Basic required-field validation.
      if (!formData.title || !formData.title.trim()) {
        throw new Error('Job title is required.');
      }

      // Validate salary
      const salaryError = validateSalary(formData.salaryMin, formData.salaryMax);
      if (salaryError) {
        throw new Error(salaryError);
      }

      await employerJobsApi.create(buildDto(status));

      // Redirect to jobs list after a successful save.
      router.push('/employer/jobs');
    } catch (error) {
      console.error('Error saving job:', error);
      setSubmitError(error?.message || 'Failed to save job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    persist('active');
  };

  const handleSaveDraft = () => persist('draft');

  /* --- reusable add-list block (responsibilities / requirements / benefits) --- */
  const renderItemList = (title, field, valueField, placeholder) => (
    <div>
      <label style={monoLabel}>{title}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={formData[valueField]}
          onChange={(e) => setFormData((prev) => ({ ...prev, [valueField]: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(field, valueField))}
          style={{ ...fieldInput, flex: 1, minWidth: 0 }}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => addItem(field, valueField)} className="em-ghost" style={{ ...ghostBtn, flexShrink: 0, fontSize: 16, fontWeight: 400, padding: '8px 14px' }} aria-label={`Add ${title}`}>＋</button>
      </div>
      {formData[field].length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {formData[field].map((item, index) => (
            <li key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#FBF9F4', border: '1px solid #F2ECE0', borderRadius: 10, padding: '9px 12px' }}>
              <span style={{ fontSize: 13, color: '#3A352C' }}>{item}</span>
              <button type="button" onClick={() => removeItem(field, index)} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#F2ECE0', color: '#8A8378', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} aria-label="Remove">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const previewRow = (label, value) => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, padding: '14px 0', borderTop: '1px solid #F2ECE0' }}>
      <span style={monoLabel}>{label}</span>
      <div style={{ fontSize: 13.5, color: '#2A2820' }}>{value}</div>
    </div>
  );

  // Get current section index
  const currentSectionIndex = formSections.findIndex((section) => section.id === activeSection);
  const isLastSection = currentSectionIndex === formSections.length - 1;

  return (
    <>
      <Head>
        <title>Post a job · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp textarea:focus, #emapp select:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="jobs" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href="/employer/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to jobs</Link>
            <span style={{ ...monoLabel, marginBottom: 0, marginLeft: 4 }}>Hiring · Post a job</span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={handleSaveDraft} disabled={isSubmitting} className="em-ghost" style={{ ...ghostBtn, opacity: isSubmitting ? 0.6 : 1 }}>Save as draft</button>
            <button type="submit" form="jobPostForm" disabled={isSubmitting} className="em-blue-btn" style={{ ...blueBtn, opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? 'Publishing…' : 'Publish'}</button>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 820, width: '100%', margin: '0 auto' }}>
            {/* Title */}
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Post a job</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                Fill in the details below to post a new role. Fields marked with <span style={{ color: '#C9622E' }}>*</span> are required.
              </p>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {formSections.map((section, index) => {
                const on = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                      color: on ? '#1F2D6B' : '#8A8378', background: on ? '#EDF0FE' : '#FFFEFB',
                      border: `1px solid ${on ? '#C7D2FB' : '#E6DECF'}`, borderRadius: 999, padding: '8px 14px', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: on ? '#4263EB' : '#A79E8F' }}>{index + 1}</span>
                    {section.title}
                  </button>
                );
              })}
            </div>

            {submitError && (
              <div role="alert" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FBEDE4', border: '1px solid #F0C9B0', color: '#9B4A2F', fontSize: 13 }}>
                {submitError}
              </div>
            )}

            <form id="jobPostForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* JOB INFORMATION */}
              <Section title="Job Information" description="Basic information about the job position." visible={activeSection === 'job-info'}>
                <Field label="Job Title" required>
                  <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} placeholder="e.g. Senior Frontend Developer" required style={fieldInput} />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <Field label="Job Type">
                    <select id="type" name="type" value={formData.type} onChange={handleChange} style={selectStyle}>
                      {jobTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Location" required>
                    <input id="location" name="location" type="text" value={formData.location} onChange={handleChange} placeholder="e.g. New York, NY or Remote" required style={fieldInput} />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                  <Field label="Minimum Salary ($)">
                    <input id="salaryMin" name="salaryMin" type="number" min="0" step="1000" value={formData.salaryMin} onChange={handleChange} placeholder="e.g. 60000" style={fieldInput} />
                  </Field>
                  <Field label="Maximum Salary ($)">
                    <input id="salaryMax" name="salaryMax" type="number" min="0" step="1000" value={formData.salaryMax} onChange={handleChange} placeholder="e.g. 90000" style={fieldInput} />
                  </Field>
                  <Field label="Per">
                    <select id="salaryType" name="salaryType" value={formData.salaryType} onChange={handleChange} style={selectStyle}>
                      <option value="year">Year</option>
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                      <option value="hour">Hour</option>
                    </select>
                  </Field>
                </div>
                {formData.salary && (
                  <div style={{ fontSize: 12.5, color: '#8A8378' }}>Displayed as: <span style={{ fontWeight: 600, color: '#3A352C' }}>{formData.salary}</span></div>
                )}

                <label htmlFor="isRemote" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input id="isRemote" name="isRemote" type="checkbox" checked={formData.isRemote} onChange={handleChange} style={{ width: 16, height: 16, accentColor: '#4263EB', cursor: 'pointer' }} />
                  <span style={{ fontSize: 13.5, color: '#3A352C' }}>This is a remote position</span>
                </label>

                <Field label="Job Description" required>
                  <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Describe the job responsibilities, required skills, and other details…" rows={8} required style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.6 }} />
                </Field>
              </Section>

              {/* COMPANY DETAILS */}
              <Section title="Company Details" description="Information about your company." visible={activeSection === 'company'}>
                <Field label="Company Name" required>
                  <input id="companyName" name="companyName" type="text" value={formData.companyName} onChange={handleChange} placeholder="e.g. Acme Inc." required style={fieldInput} />
                </Field>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#FBF9F4', border: '2px dashed #E1D9C9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {formData.companyLogo ? (
                      <img src={formData.companyLogo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#A79E8F' }}>
                        <div style={{ fontSize: 24 }}>▦</div>
                        <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Logo</div>
                      </div>
                    )}
                  </div>
                </div>

                <Field label="Company Logo URL (Optional)">
                  <input id="companyLogo" name="companyLogo" type="url" value={formData.companyLogo} onChange={handleChange} placeholder="https://example.com/logo.png" style={fieldInput} />
                  <p style={{ fontSize: 11.5, color: '#A79E8F', margin: '7px 0 0' }}>Enter a direct URL to your company logo. We recommend a square image (at least 200×200px).</p>
                </Field>
              </Section>

              {/* REQUIREMENTS */}
              <Section title="Requirements & Benefits" description="List the requirements and benefits for this position." visible={activeSection === 'requirements'}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderItemList('Responsibilities', 'responsibilities', 'newResponsibility', 'Add a responsibility')}
                    {renderItemList('Requirements', 'requirements', 'newRequirement', 'Add a requirement')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderItemList('Benefits', 'benefits', 'newBenefit', 'Add a benefit')}
                    <Field label="Required Education Level">
                      <select id="educationLevel" name="educationLevel" value={formData.educationLevel} onChange={handleChange} style={selectStyle}>
                        {educationLevels.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Experience Level">
                      <select id="experience" name="experience" value={formData.experience} onChange={handleChange} style={selectStyle}>
                        <option value="">Select…</option>
                        {experienceLevels.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* PREVIEW */}
              <Section title="Preview & Submit" description="Review your job posting before submitting." visible={activeSection === 'preview'}>
                <div style={{ background: '#FBF9F4', border: '1px solid #F2ECE0', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 24, margin: '0 0 4px' }}>{formData.title || 'Job Title'}</h3>
                  <p style={{ fontSize: 13.5, color: '#8A8378', margin: 0 }}>
                    {formData.companyName || 'Company Name'} · {formData.location || 'Location'}{formData.isRemote && ' · Remote'}
                  </p>

                  <div style={{ marginTop: 10 }}>
                    {previewRow('Job Type', formData.type)}
                    {previewRow('Experience Level', formData.experience || 'Not specified')}
                    {previewRow('Education Level', formData.educationLevel)}
                    {previewRow('Job Description', <span style={{ whiteSpace: 'pre-line' }}>{formData.description || 'No description provided.'}</span>)}
                    {formData.responsibilities.length > 0 && previewRow('Responsibilities', (
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{formData.responsibilities.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    ))}
                    {formData.requirements.length > 0 && previewRow('Requirements', (
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{formData.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    ))}
                    {formData.benefits.length > 0 && previewRow('Benefits', (
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{formData.benefits.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Section navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (currentSectionIndex > 0) {
                      setActiveSection(formSections[currentSectionIndex - 1].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentSectionIndex === 0}
                  className="em-ghost"
                  style={{ ...ghostBtn, opacity: currentSectionIndex === 0 ? 0.5 : 1, cursor: currentSectionIndex === 0 ? 'not-allowed' : 'pointer' }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = formSections.findIndex((section) => section.id === activeSection);
                    if (currentIndex < formSections.length - 1) {
                      setActiveSection(formSections[currentIndex + 1].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      // Submit form if on last section
                      document.getElementById('jobPostForm').requestSubmit();
                    }
                  }}
                  className="em-blue-btn"
                  style={{ ...blueBtn, opacity: isSubmitting && isLastSection ? 0.6 : 1 }}
                >
                  {isLastSection ? (isSubmitting ? 'Publishing…' : 'Publish job') : 'Next →'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}

export default PostJob;
