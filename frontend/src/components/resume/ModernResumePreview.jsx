/**
 * Modern Resume Preview Component
 * Pixel-perfect rendering for PDF generation with exact layout matching
 * Inspired by FlowCV's clean and professional design
 */

export default function ModernResumePreview({ resumeData, templateSettings = {} }) {
  if (!resumeData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400">No resume data available</p>
      </div>
    );
  }

  const {
    colorScheme = 'blue',
    fontFamily = 'inter',
    fontSize = 'medium',
    spacing = 'normal',
  } = templateSettings;

  // Color schemes
  const colorSchemes = {
    blue: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#60a5fa',
      dark: '#1e40af',
      light: '#eff6ff',
    },
    green: {
      primary: '#059669',
      secondary: '#10b981',
      accent: '#34d399',
      dark: '#047857',
      light: '#ecfdf5',
    },
    purple: {
      primary: '#7c3aed',
      secondary: '#8b5cf6',
      accent: '#a78bfa',
      dark: '#6d28d9',
      light: '#f5f3ff',
    },
    orange: {
      primary: '#ea580c',
      secondary: '#f97316',
      accent: '#fb923c',
      dark: '#c2410c',
      light: '#fff7ed',
    },
    red: {
      primary: '#dc2626',
      secondary: '#ef4444',
      accent: '#f87171',
      dark: '#b91c1c',
      light: '#fef2f2',
    },
    indigo: {
      primary: '#4f46e5',
      secondary: '#6366f1',
      accent: '#818cf8',
      dark: '#4338ca',
      light: '#eef2ff',
    },
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.blue;

  // Font sizes
  const fontSizes = {
    small: {
      name: '28px',
      sectionTitle: '14px',
      jobTitle: '12px',
      body: '9px',
      small: '8px',
    },
    medium: {
      name: '32px',
      sectionTitle: '16px',
      jobTitle: '13px',
      body: '10px',
      small: '9px',
    },
    large: {
      name: '36px',
      sectionTitle: '18px',
      jobTitle: '14px',
      body: '11px',
      small: '10px',
    },
  };

  const fonts = fontSizes[fontSize] || fontSizes.medium;

  // Spacing
  const spacingValues = {
    compact: {
      section: '12px',
      item: '8px',
      line: '1.4',
    },
    normal: {
      section: '16px',
      item: '12px',
      line: '1.6',
    },
    relaxed: {
      section: '20px',
      item: '16px',
      line: '1.8',
    },
  };

  const spacingStyle = spacingValues[spacing] || spacingValues.normal;

  // Font families
  const fontFamilyMap = {
    inter: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    roboto: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    playfair: '"Playfair Display", Georgia, serif',
    lato: '"Lato", -apple-system, BlinkMacSystemFont, sans-serif',
    montserrat: '"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif',
  };

  const selectedFont = fontFamilyMap[fontFamily] || fontFamilyMap.inter;

  return (
    <div
      className="w-full h-full bg-white"
      style={{
        fontFamily: selectedFont,
        lineHeight: spacingStyle.line,
        fontSize: fonts.body,
      }}
    >
      {/* A4 Page Container - 210mm x 297mm at 96dpi = 794px x 1123px */}
      <div className="w-[794px] min-h-[1123px] mx-auto bg-white shadow-xl" id="resume-pdf-content">
        {/* Header Section */}
        <div
          className="px-12 pt-10 pb-6"
          style={{
            borderBottom: `3px solid ${colors.primary}`,
            backgroundColor: colors.light,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1
                className="font-bold uppercase tracking-wide mb-1"
                style={{
                  fontSize: fonts.name,
                  color: colors.dark,
                  letterSpacing: '0.5px',
                }}
              >
                {resumeData.fullName || 'Your Name'}
              </h1>
              {resumeData.jobTitle && (
                <p
                  className="font-medium"
                  style={{
                    fontSize: fonts.jobTitle,
                    color: colors.primary,
                    marginBottom: '8px',
                  }}
                >
                  {resumeData.jobTitle}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: fonts.small, color: '#6b7280' }}>
                {resumeData.email && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {resumeData.email}
                  </span>
                )}
                {resumeData.phone && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {resumeData.phone}
                  </span>
                )}
                {resumeData.location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {resumeData.location}
                  </span>
                )}
                {resumeData.linkedin && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    {resumeData.linkedin}
                  </span>
                )}
              </div>
            </div>
            {resumeData.photo && (
              <img
                src={resumeData.photo}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-4"
                style={{ borderColor: colors.primary }}
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-12 py-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-4" style={{ gap: spacingStyle.section }}>
              {/* Profile Summary */}
              {(resumeData.summary || resumeData.profileSummary) && (
                <section>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2 pb-1"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                      borderBottom: `2px solid ${colors.primary}`,
                    }}
                  >
                    Professional Summary
                  </h2>
                  <div
                    className="text-gray-700"
                    style={{ fontSize: fonts.body, lineHeight: spacingStyle.line }}
                    dangerouslySetInnerHTML={{ __html: resumeData.summary || resumeData.profileSummary }}
                  />
                </section>
              )}

              {/* Professional Experience */}
              {resumeData.experience && resumeData.experience.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2 pb-1"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                      borderBottom: `2px solid ${colors.primary}`,
                    }}
                  >
                    Professional Experience
                  </h2>
                  <div className="space-y-3" style={{ gap: spacingStyle.item }}>
                    {resumeData.experience.map((exp, idx) => (
                      <div key={idx} className="relative pl-4">
                        <div
                          className="absolute left-0 top-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                        <h3
                          className="font-bold"
                          style={{
                            fontSize: fonts.jobTitle,
                            color: colors.dark,
                          }}
                        >
                          {exp.title}
                        </h3>
                        <p
                          className="font-medium"
                          style={{
                            fontSize: fonts.body,
                            color: colors.primary,
                          }}
                        >
                          {exp.company}
                          {exp.location && ` • ${exp.location}`}
                        </p>
                        <p
                          className="text-gray-500 mb-1"
                          style={{
                            fontSize: fonts.small,
                          }}
                        >
                          {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        </p>
                        {exp.responsibilities && (
                          <div
                            className="text-gray-700"
                            style={{ fontSize: fonts.body, lineHeight: spacingStyle.line }}
                            dangerouslySetInnerHTML={{ __html: exp.responsibilities }}
                          />
                        )}
                        {exp.description && !exp.responsibilities && (
                          <p
                            className="text-gray-700"
                            style={{ fontSize: fonts.body, lineHeight: spacingStyle.line }}
                          >
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects */}
              {resumeData.projects && resumeData.projects.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2 pb-1"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                      borderBottom: `2px solid ${colors.primary}`,
                    }}
                  >
                    Projects
                  </h2>
                  <div className="space-y-2" style={{ gap: spacingStyle.item }}>
                    {resumeData.projects.map((project, idx) => (
                      <div key={idx}>
                        <h3
                          className="font-bold"
                          style={{
                            fontSize: fonts.jobTitle,
                            color: colors.dark,
                          }}
                        >
                          {project.name}
                        </h3>
                        {project.description && (
                          <p
                            className="text-gray-700"
                            style={{ fontSize: fonts.body, lineHeight: spacingStyle.line }}
                          >
                            {project.description}
                          </p>
                        )}
                        {project.technologies && (
                          <p
                            className="text-gray-600 italic"
                            style={{ fontSize: fonts.small }}
                          >
                            Technologies: {project.technologies}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="col-span-1 space-y-4" style={{ gap: spacingStyle.section }}>
              {/* Skills */}
              {resumeData.skills && resumeData.skills.length > 0 && (
                <section>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                    }}
                  >
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-white font-medium"
                        style={{
                          backgroundColor: colors.primary,
                          fontSize: fonts.small,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {resumeData.education && resumeData.education.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                    }}
                  >
                    Education
                  </h2>
                  <div className="space-y-2" style={{ gap: spacingStyle.item }}>
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx}>
                        <h3
                          className="font-bold"
                          style={{
                            fontSize: fonts.body,
                            color: colors.dark,
                          }}
                        >
                          {edu.degree}
                        </h3>
                        <p
                          className="font-medium"
                          style={{
                            fontSize: fonts.small,
                            color: colors.primary,
                          }}
                        >
                          {edu.institution}
                        </p>
                        <p
                          className="text-gray-500"
                          style={{
                            fontSize: fonts.small,
                          }}
                        >
                          {edu.endDate}
                        </p>
                        {edu.gpa && (
                          <p
                            className="text-gray-600"
                            style={{
                              fontSize: fonts.small,
                            }}
                          >
                            GPA: {edu.gpa}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {resumeData.certifications && resumeData.certifications.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                    }}
                  >
                    Certifications
                  </h2>
                  <div className="space-y-2" style={{ gap: spacingStyle.item }}>
                    {resumeData.certifications.map((cert, idx) => (
                      <div key={idx}>
                        <h3
                          className="font-semibold"
                          style={{
                            fontSize: fonts.body,
                            color: colors.dark,
                          }}
                        >
                          {cert.name}
                        </h3>
                        <p
                          className="text-gray-600"
                          style={{
                            fontSize: fonts.small,
                          }}
                        >
                          {cert.issuer}
                        </p>
                        <p
                          className="text-gray-500"
                          style={{
                            fontSize: fonts.small,
                          }}
                        >
                          {cert.date}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Languages */}
              {resumeData.languages && resumeData.languages.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                    }}
                  >
                    Languages
                  </h2>
                  <div className="space-y-1">
                    {resumeData.languages.map((lang, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between"
                        style={{
                          fontSize: fonts.body,
                        }}
                      >
                        <span className="font-medium text-gray-700">{lang.language}</span>
                        <span className="text-gray-500">{lang.proficiency}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Interests */}
              {resumeData.interests && resumeData.interests.length > 0 && (
                <section style={{ marginTop: spacingStyle.section }}>
                  <h2
                    className="font-bold uppercase tracking-wide mb-2"
                    style={{
                      fontSize: fonts.sectionTitle,
                      color: colors.dark,
                    }}
                  >
                    Interests
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="text-gray-700"
                        style={{
                          fontSize: fonts.small,
                        }}
                      >
                        {interest}{idx < resumeData.interests.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
