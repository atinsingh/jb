/**
 * Modern Resume Editor - FlowCV Inspired
 * Split-screen layout with live preview and inline editing
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Field, FieldGroup, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';
import { Textarea } from '@/components/catalyst/textarea';
import RichTextEditor from '@/components/resume/RichTextEditor';
import ModernResumePreview from '@/components/resume/ModernResumePreview';

export default function ModernResumeEditor({
  resumeData,
  onResumeDataChange,
  templateSettings,
  onTemplateSettingsChange,
  onSave,
  onGeneratePDF,
  onRegenerateSection,
  isGenerating = false,
}) {
  const [activeTab, setActiveTab] = useState('content'); // content, design
  const [editingSection, setEditingSection] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    summary: false,
    experience: true,
    education: true,
    skills: true,
    projects: false,
    certifications: false,
    languages: false,
    interests: false,
  });

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (resumeData && onSave) {
        onSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [resumeData]);

  const updateResumeData = useCallback(
    (updates) => {
      onResumeDataChange({ ...resumeData, ...updates });
    },
    [resumeData, onResumeDataChange]
  );

  const addExperience = (experience) => {
    const newExperience = [...(resumeData.experience || []), experience];
    updateResumeData({ experience: newExperience });
    setEditingSection(null);
    setEditingIndex(null);
  };

  const updateExperience = (index, experience) => {
    const newExperience = [...(resumeData.experience || [])];
    newExperience[index] = experience;
    updateResumeData({ experience: newExperience });
  };

  const deleteExperience = (index) => {
    const newExperience = (resumeData.experience || []).filter((_, i) => i !== index);
    updateResumeData({ experience: newExperience });
  };

  const addEducation = (education) => {
    const newEducation = [...(resumeData.education || []), education];
    updateResumeData({ education: newEducation });
    setEditingSection(null);
    setEditingIndex(null);
  };

  const updateEducation = (index, education) => {
    const newEducation = [...(resumeData.education || [])];
    newEducation[index] = education;
    updateResumeData({ education: newEducation });
  };

  const deleteEducation = (index) => {
    const newEducation = (resumeData.education || []).filter((_, i) => i !== index);
    updateResumeData({ education: newEducation });
  };

  const addSkill = (skill) => {
    if (!skill.trim()) return;
    const newSkills = [...(resumeData.skills || []), skill.trim()];
    updateResumeData({ skills: newSkills });
  };

  const deleteSkill = (index) => {
    const newSkills = (resumeData.skills || []).filter((_, i) => i !== index);
    updateResumeData({ skills: newSkills });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Design
          </button>
        </div>
        <div className="flex items-center gap-2 py-2">
          <Button onClick={onSave} disabled={isGenerating} outline size="sm">
            Save Changes
          </Button>
          <Button onClick={onGeneratePDF} disabled={isGenerating} color="blue" size="sm">
            <ArrowPathIcon className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="overflow-y-auto bg-zinc-50 border-r border-zinc-200">
          {activeTab === 'content' && (
            <div className="p-6 space-y-4">
              {/* Personal Information */}
              <SectionCard
                title="Personal Information"
                icon="user"
                isExpanded={expandedSections.personal}
                onToggle={() =>
                  setExpandedSections((prev) => ({ ...prev, personal: !prev.personal }))
                }
              >
                <FieldGroup>
                  <Field>
                    <Label>Full Name</Label>
                    <Input
                      value={resumeData.fullName || ''}
                      onChange={(e) => updateResumeData({ fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </Field>
                  <Field>
                    <Label>Job Title</Label>
                    <Input
                      value={resumeData.jobTitle || ''}
                      onChange={(e) => updateResumeData({ jobTitle: e.target.value })}
                      placeholder="Senior Software Engineer"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={resumeData.email || ''}
                        onChange={(e) => updateResumeData({ email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </Field>
                    <Field>
                      <Label>Phone</Label>
                      <Input
                        value={resumeData.phone || ''}
                        onChange={(e) => updateResumeData({ phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </Field>
                  </div>
                  <Field>
                    <Label>Location</Label>
                    <Input
                      value={resumeData.location || ''}
                      onChange={(e) => updateResumeData({ location: e.target.value })}
                      placeholder="San Francisco, CA"
                    />
                  </Field>
                  <Field>
                    <Label>LinkedIn</Label>
                    <Input
                      value={resumeData.linkedin || ''}
                      onChange={(e) => updateResumeData({ linkedin: e.target.value })}
                      placeholder="linkedin.com/in/johndoe"
                    />
                  </Field>
                </FieldGroup>
              </SectionCard>

              {/* Professional Summary */}
              <SectionCard
                title="Professional Summary"
                icon="document"
                isExpanded={expandedSections.summary}
                onToggle={() =>
                  setExpandedSections((prev) => ({ ...prev, summary: !prev.summary }))
                }
              >
                <div className="space-y-2">
                  <RichTextEditor
                    value={resumeData.summary || ''}
                    onChange={(value) => updateResumeData({ summary: value })}
                    placeholder="Write a compelling summary of your experience and skills..."
                  />
                  <Button
                    onClick={() => onRegenerateSection && onRegenerateSection('summary')}
                    disabled={isGenerating}
                    plain
                    size="sm"
                    className="text-xs"
                  >
                    <SparklesIcon className="h-3 w-3" />
                    {resumeData.summary ? 'Rewrite with AI' : 'Generate with AI'}
                  </Button>
                </div>
              </SectionCard>

              {/* Professional Experience */}
              <SectionCard
                title="Professional Experience"
                icon="briefcase"
                isExpanded={expandedSections.experience}
                onToggle={() =>
                  setExpandedSections((prev) => ({ ...prev, experience: !prev.experience }))
                }
                onAdd={() => {
                  setEditingSection('experience');
                  setEditingIndex(-1);
                }}
              >
                <div className="space-y-3">
                  {resumeData.experience &&
                    resumeData.experience.map((exp, idx) => (
                      <ExperienceItem
                        key={idx}
                        experience={exp}
                        isEditing={editingSection === 'experience' && editingIndex === idx}
                        onEdit={() => {
                          setEditingSection('experience');
                          setEditingIndex(idx);
                        }}
                        onSave={(updated) => {
                          updateExperience(idx, updated);
                          setEditingSection(null);
                          setEditingIndex(null);
                        }}
                        onDelete={() => deleteExperience(idx)}
                        onCancel={() => {
                          setEditingSection(null);
                          setEditingIndex(null);
                        }}
                      />
                    ))}

                  {editingSection === 'experience' && editingIndex === -1 && (
                    <ExperienceForm
                      onSave={addExperience}
                      onCancel={() => {
                        setEditingSection(null);
                        setEditingIndex(null);
                      }}
                    />
                  )}
                </div>
              </SectionCard>

              {/* Education */}
              <SectionCard
                title="Education"
                icon="academic"
                isExpanded={expandedSections.education}
                onToggle={() =>
                  setExpandedSections((prev) => ({ ...prev, education: !prev.education }))
                }
                onAdd={() => {
                  setEditingSection('education');
                  setEditingIndex(-1);
                }}
              >
                <div className="space-y-3">
                  {resumeData.education &&
                    resumeData.education.map((edu, idx) => (
                      <EducationItem
                        key={idx}
                        education={edu}
                        isEditing={editingSection === 'education' && editingIndex === idx}
                        onEdit={() => {
                          setEditingSection('education');
                          setEditingIndex(idx);
                        }}
                        onSave={(updated) => {
                          updateEducation(idx, updated);
                          setEditingSection(null);
                          setEditingIndex(null);
                        }}
                        onDelete={() => deleteEducation(idx)}
                        onCancel={() => {
                          setEditingSection(null);
                          setEditingIndex(null);
                        }}
                      />
                    ))}

                  {editingSection === 'education' && editingIndex === -1 && (
                    <EducationForm
                      onSave={addEducation}
                      onCancel={() => {
                        setEditingSection(null);
                        setEditingIndex(null);
                      }}
                    />
                  )}
                </div>
              </SectionCard>

              {/* Skills */}
              <SectionCard
                title="Skills"
                icon="lightbulb"
                isExpanded={expandedSections.skills}
                onToggle={() =>
                  setExpandedSections((prev) => ({ ...prev, skills: !prev.skills }))
                }
              >
                <SkillsEditor
                  skills={resumeData.skills || []}
                  onAdd={addSkill}
                  onDelete={deleteSkill}
                />
              </SectionCard>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="p-6 space-y-6">
              <DesignSettings
                settings={templateSettings}
                onChange={onTemplateSettingsChange}
              />
            </div>
          )}
        </div>

        {/* Right Panel - Live Preview */}
        <div className="overflow-y-auto bg-zinc-100">
          <div className="p-8">
            <div className="bg-white shadow-2xl">
              <ModernResumePreview
                resumeData={resumeData}
                templateSettings={templateSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Card Component
function SectionCard({ title, icon, isExpanded, onToggle, onAdd, children }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-zinc-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <PlusIcon className="h-4 w-4 text-blue-600" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-zinc-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-zinc-600" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-zinc-600" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
}

// Experience Item Component
function ExperienceItem({ experience, isEditing, onEdit, onSave, onDelete, onCancel }) {
  const [formData, setFormData] = useState(experience);

  if (isEditing) {
    return <ExperienceForm initialData={formData} onSave={onSave} onCancel={onCancel} />;
  }

  return (
    <div className="group p-3 bg-zinc-50 rounded-lg border border-zinc-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-zinc-950">{experience.title}</h4>
          <p className="text-sm text-zinc-600">{experience.company}</p>
          <p className="text-xs text-zinc-500">
            {experience.startDate} - {experience.current ? 'Present' : experience.endDate}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded bg-red-100 hover:bg-red-200 transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Experience Form Component
function ExperienceForm({ initialData = {}, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    company: initialData.company || '',
    location: initialData.location || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    current: initialData.current || false,
    responsibilities: initialData.responsibilities || '',
  });

  const handleSave = () => {
    if (!formData.title || !formData.company) return;
    onSave(formData);
  };

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-blue-300">
      <FieldGroup>
        <Field>
          <Label>Job Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Senior Software Engineer"
          />
        </Field>
        <Field>
          <Label>Company *</Label>
          <Input
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Tech Corp Inc."
          />
        </Field>
        <Field>
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="San Francisco, CA"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label>Start Date</Label>
            <Input
              type="month"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </Field>
          <Field>
            <Label>End Date</Label>
            <Input
              type="month"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              disabled={formData.current}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.current}
            onChange={(e) => setFormData({ ...formData, current: e.target.checked })}
            className="rounded"
          />
          I currently work here
        </label>
        <Field>
          <Label>Responsibilities</Label>
          <RichTextEditor
            value={formData.responsibilities}
            onChange={(value) => setFormData({ ...formData, responsibilities: value })}
            placeholder="Describe your key responsibilities and achievements..."
          />
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <Button onClick={handleSave} color="blue" size="sm">
          Save
        </Button>
        <Button onClick={onCancel} outline size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Education Item Component
function EducationItem({ education, isEditing, onEdit, onSave, onDelete, onCancel }) {
  if (isEditing) {
    return <EducationForm initialData={education} onSave={onSave} onCancel={onCancel} />;
  }

  return (
    <div className="group p-3 bg-zinc-50 rounded-lg border border-zinc-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-zinc-950">{education.degree}</h4>
          <p className="text-sm text-zinc-600">{education.institution}</p>
          <p className="text-xs text-zinc-500">{education.endDate}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded bg-red-100 hover:bg-red-200 transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Education Form Component
function EducationForm({ initialData = {}, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    degree: initialData.degree || '',
    institution: initialData.institution || '',
    location: initialData.location || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    gpa: initialData.gpa || '',
  });

  const handleSave = () => {
    if (!formData.degree || !formData.institution) return;
    onSave(formData);
  };

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-blue-300">
      <FieldGroup>
        <Field>
          <Label>Degree *</Label>
          <Input
            value={formData.degree}
            onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            placeholder="Bachelor of Science in Computer Science"
          />
        </Field>
        <Field>
          <Label>Institution *</Label>
          <Input
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            placeholder="University of California, Berkeley"
          />
        </Field>
        <Field>
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Berkeley, CA"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label>Start Date</Label>
            <Input
              type="month"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </Field>
          <Field>
            <Label>End Date</Label>
            <Input
              type="month"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </Field>
        </div>
        <Field>
          <Label>GPA (Optional)</Label>
          <Input
            value={formData.gpa}
            onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
            placeholder="3.8/4.0"
          />
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <Button onClick={handleSave} color="blue" size="sm">
          Save
        </Button>
        <Button onClick={onCancel} outline size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Skills Editor Component
function SkillsEditor({ skills, onAdd, onDelete }) {
  const [newSkill, setNewSkill] = useState('');

  const handleAdd = () => {
    if (newSkill.trim()) {
      onAdd(newSkill);
      setNewSkill('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, idx) => (
          <span
            key={idx}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
          >
            {skill}
            <button
              onClick={() => onDelete(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="h-3.5 w-3.5 hover:text-blue-900" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a skill (e.g., React, Python, AWS)"
          className="flex-1"
        />
        <Button onClick={handleAdd} color="blue" size="sm">
          <PlusIcon className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}

// Design Settings Component
function DesignSettings({ settings, onChange }) {
  const colorSchemes = [
    { id: 'blue', name: 'Blue', color: '#2563eb' },
    { id: 'green', name: 'Green', color: '#059669' },
    { id: 'purple', name: 'Purple', color: '#7c3aed' },
    { id: 'orange', name: 'Orange', color: '#ea580c' },
    { id: 'red', name: 'Red', color: '#dc2626' },
    { id: 'indigo', name: 'Indigo', color: '#4f46e5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-950 mb-3">Color Scheme</h3>
        <div className="grid grid-cols-3 gap-3">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => onChange({ ...settings, colorScheme: scheme.id })}
              className={`p-3 rounded-lg border-2 transition-all ${
                settings.colorScheme === scheme.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div
                className="w-full h-8 rounded mb-2"
                style={{ backgroundColor: scheme.color }}
              />
              <p className="text-xs font-medium text-zinc-700">{scheme.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-950 mb-3">Font Size</h3>
        <div className="grid grid-cols-3 gap-3">
          {['small', 'medium', 'large'].map((size) => (
            <button
              key={size}
              onClick={() => onChange({ ...settings, fontSize: size })}
              className={`p-3 rounded-lg border-2 transition-all ${
                settings.fontSize === size
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <p className="text-xs font-medium text-zinc-700 capitalize">{size}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-950 mb-3">Spacing</h3>
        <div className="grid grid-cols-3 gap-3">
          {['compact', 'normal', 'relaxed'].map((space) => (
            <button
              key={space}
              onClick={() => onChange({ ...settings, spacing: space })}
              className={`p-3 rounded-lg border-2 transition-all ${
                settings.spacing === space
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <p className="text-xs font-medium text-zinc-700 capitalize">{space}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
