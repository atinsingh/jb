import { Badge } from '@/components/catalyst/badge';

// Default Preview Component - FlowCV Style - Full Width with Template Customization
const DefaultPreview = ({ resumeData, templateSettings = { colorScheme: 'blue', fontFamily: 'inter' }, currentResume, selectedTemplate }) => {
  // Color scheme mapping
  const colorSchemes = {
    blue: { primary: 'text-primary-600', border: 'border-primary-600', bg: 'bg-primary-50' },
    green: { primary: 'text-green-600', border: 'border-green-600', bg: 'bg-green-50' },
    purple: { primary: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50' },
    orange: { primary: 'text-orange-600', border: 'border-orange-600', bg: 'bg-orange-50' },
    red: { primary: 'text-red-600', border: 'border-red-600', bg: 'bg-red-50' },
    indigo: { primary: 'text-indigo-600', border: 'border-indigo-600', bg: 'bg-indigo-50' },
  };

  // Font family mapping
  const fontFamilies = {
    inter: 'font-sans',
    roboto: 'font-sans',
    playfair: 'font-serif',
    lato: 'font-sans',
    montserrat: 'font-sans',
  };

  const colors = colorSchemes[templateSettings.colorScheme] || colorSchemes.blue;
  const fontClass = fontFamilies[templateSettings.fontFamily] || fontFamilies.inter;

  // Format date and timestamp
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`h-full w-full  bg-white dark:bg-zinc-900 overflow-y-auto ${fontClass}`}>
      <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 z-10 w-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Live Preview</h3>
            {currentResume && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{resumeData.name || currentResume.name || 'My Resume'}</p>
                {currentResume.createdAt && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(currentResume.createdAt)}</p>
                )}
              </div>
            )}
          </div>
          <Badge color="zinc" className="text-xs capitalize">{selectedTemplate || 'modern'}</Badge>
        </div>
      </div>
      <div className="h-full w-full overflow-y-auto">
        {/* Resume Preview Content - Full Width of Panel, No Padding Constraints */}
        <div className="w-full px-8 py-8 space-y-6">
          {/* Header */}
          <div className={`border-b ${colors.border} pb-4 w-full`}>
            {resumeData.photo && (
              <div className="mb-4">
                <img src={resumeData.photo} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              </div>
            )}
            <h1 className={`text-2xl font-bold ${colors.primary} mb-2 text-left`}>
              {resumeData.fullName || 'Your Name'}
            </h1>
            <div className="flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400 text-left">
              {resumeData.email && <span>• {resumeData.email}</span>}
              {resumeData.phone && <span>• {resumeData.phone}</span>}
              {resumeData.location && <span>• {resumeData.location}</span>}
              {resumeData.website && <span>• {resumeData.website}</span>}
              {resumeData.linkedin && <span>• LinkedIn</span>}
              {resumeData.github && <span>• GitHub</span>}
            </div>
          </div>

          {/* Summary */}
          {resumeData.summary && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-2`}>Professional Summary</h2>
              <div
                className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: resumeData.summary }}
              />
            </div>
          )}

          {/* Profile Summary */}
          {resumeData.profileSummary && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-2`}>Profile Summary</h2>
              <div
                className="text-sm text-zinc-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: resumeData.profileSummary }}
              />
            </div>
          )}

          {/* Skills */}
          {resumeData.skills && resumeData.skills.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-2`}>Skills</h2>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, idx) => (
                  <Badge key={idx} color="zinc" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Technical Skills */}
          {resumeData.technicalSkills && resumeData.technicalSkills.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-2`}>Technical Skills</h2>
              <div className="flex flex-wrap gap-2">
                {resumeData.technicalSkills.map((skill, idx) => (
                  <Badge key={idx} color="green" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resumeData.certifications && resumeData.certifications.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-3`}>Certifications</h2>
              <div className="space-y-2">
                {resumeData.certifications.map((cert, idx) => (
                  <div key={idx}>
                    <p className="font-semibold text-zinc-950 dark:text-white">{cert.name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{cert.issuer}</p>
                    {cert.date && <p className="text-xs text-zinc-500 dark:text-zinc-500">{cert.date}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Professional References */}
          {resumeData.references && resumeData.references.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-3`}>Professional References</h2>
              <div className="space-y-2">
                {resumeData.references.map((ref, idx) => (
                  <div key={idx}>
                    <p className="font-semibold text-zinc-950 dark:text-white">{ref.name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{ref.title} at {ref.company}</p>
                    {ref.email && <p className="text-xs text-zinc-500 dark:text-zinc-500">{ref.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Professional Experience */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-3`}>Professional Experience</h2>
              <div className="space-y-4">
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-semibold text-zinc-950 dark:text-white">{exp.title}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{exp.company}</p>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate || 'Present'}
                      </span>
                    </div>
                    {exp.responsibilities && (
                      <div
                        className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: exp.responsibilities }}
                      />
                    )}
                    {exp.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resumeData.education && resumeData.education.length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold ${colors.primary} mb-3`}>Education</h2>
              <div className="space-y-2">
                {resumeData.education.map((edu, idx) => (
                  <div key={idx}>
                    <p className="font-semibold text-zinc-950 dark:text-white">{edu.degree}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{edu.institution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefaultPreview;