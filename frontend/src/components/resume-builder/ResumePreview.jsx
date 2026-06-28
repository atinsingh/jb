export default function ResumePreview({ resume }) {
    if (!resume) return <div className="p-10 text-center text-gray-400">No resume data</div>;

    const { theme, template } = resume;
    const color = theme?.color || '#000000';

    // Basic Styles based on settings
    const containerStyle = {
        fontFamily: theme?.font === 'serif' ? 'Georgia, serif' : 'Inter, sans-serif',
        color: '#1f2937', // gray-800
        lineHeight: theme?.spacing === 'compact' ? 1.4 : 1.6,
    };

    const headerStyle = {
        color: color,
    };

    // Render different templates
    const renderTemplate = () => {
        switch (template) {
            case 'classic':
                return <ClassicTemplate resume={resume} styles={{ container: containerStyle, header: headerStyle, color }} />;
            case 'minimal':
                return <MinimalTemplate resume={resume} styles={{ container: containerStyle, header: headerStyle, color }} />;
            case 'executive':
                return <ExecutiveTemplate resume={resume} styles={{ container: containerStyle, header: headerStyle, color }} />;
            case 'creative':
                return <CreativeTemplate resume={resume} styles={{ container: containerStyle, header: headerStyle, color }} />;
            default: // modern
                return <ModernTemplate resume={resume} styles={{ container: containerStyle, header: headerStyle, color }} />;
        }
    };

    return (
        <div className="w-full h-full bg-white text-sm" style={containerStyle}>
            {renderTemplate()}
        </div>
    );
}

// Templates (Internal components for now, can extract later)

function ModernTemplate({ resume, styles }) {
    return (
        <div className="p-8 h-full">
            <header className="border-b-2 pb-6 mb-6" style={{ borderColor: styles.color }}>
                <h1 className="text-3xl font-bold uppercase tracking-wide mb-2" style={styles.header}>{resume.fullName}</h1>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600 font-medium">
                    {resume.email && <span>{resume.email}</span>}
                    {resume.phone && <span>• {resume.phone}</span>}
                    {resume.location && <span>• {resume.location}</span>}
                    {resume.linkedin && <span>• {resume.linkedin}</span>}
                </div>
            </header>

            {resume.summary && (
                <section className="mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Profile</h2>
                    <p className="text-gray-700">{resume.summary}</p>
                </section>
            )}

            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-6">
                    {resume.experience?.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b text-gray-900 border-gray-200">Experience</h2>
                            <div className="space-y-4">
                                {resume.experience.map((exp, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-gray-900">{exp.title}</h3>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                            </span>
                                        </div>
                                        <div className="text-xs font-medium text-gray-600 mb-2" style={{ color: styles.color }}>{exp.company}, {exp.location}</div>
                                        <p className="text-gray-700 whitespace-pre-line text-xs">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="col-span-1 space-y-6">
                    {resume.skills?.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b text-gray-900 border-gray-200">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {resume.skills.map((skill, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                    {resume.education?.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b text-gray-900 border-gray-200">Education</h2>
                            <div className="space-y-3">
                                {resume.education.map((edu, i) => (
                                    <div key={i}>
                                        <h3 className="font-bold text-gray-900">{edu.institution}</h3>
                                        <div className="text-xs text-gray-600">{edu.degree}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{edu.endDate}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function ClassicTemplate({ resume, styles }) {
    return (
        <div className="p-10 max-w-3xl mx-auto h-full text-center">
            <header className="mb-8">
                <h1 className="text-3xl font-serif font-bold mb-2 text-gray-900">{resume.fullName}</h1>
                <div className="text-sm text-gray-600 space-x-3">
                    {resume.email && <span>{resume.email}</span>}
                    {resume.phone && <span>| {resume.phone}</span>}
                    {resume.location && <span>| {resume.location}</span>}
                </div>
            </header>

            {resume.summary && (
                <section className="mb-8 text-left">
                    <h2 className="text-lg font-serif font-bold border-b-2 border-gray-800 mb-3 uppercase">Professional Profile</h2>
                    <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
                </section>
            )}

            {resume.experience?.length > 0 && (
                <section className="mb-8 text-left">
                    <h2 className="text-lg font-serif font-bold border-b-2 border-gray-800 mb-4 uppercase">Work History</h2>
                    <div className="space-y-5">
                        {resume.experience.map((exp, i) => (
                            <div key={i}>
                                <div className="flex justify-between font-bold text-gray-900 mb-1">
                                    <h3>{exp.title}</h3>
                                    <span className="text-sm">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                                </div>
                                <div className="italic text-gray-700 mb-2">{exp.company} | {exp.location}</div>
                                <p className="text-sm text-gray-700">{exp.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {resume.education?.length > 0 && (
                <section className="mb-8 text-left">
                    <h2 className="text-lg font-serif font-bold border-b-2 border-gray-800 mb-4 uppercase">Education</h2>
                    {resume.education.map((edu, i) => (
                        <div key={i} className="mb-3">
                            <div className="flex justify-between">
                                <h3 className="font-bold">{edu.institution}</h3>
                                <span>{edu.endDate}</span>
                            </div>
                            <div>{edu.degree}</div>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

function MinimalTemplate({ resume, styles }) {
    return (
        <div className="p-8 h-full flex">
            <div className="w-1/3 pr-6 border-r border-gray-200 text-right">
                <h1 className="text-2xl font-light mb-4 text-gray-900" style={{ color: styles.color }}>{resume.fullName?.split(' ')[0]}<br /><span className="font-bold">{resume.fullName?.split(' ').slice(1).join(' ')}</span></h1>

                <div className="text-xs text-gray-500 mb-8 space-y-1">
                    <div className="block">{resume.email}</div>
                    <div className="block">{resume.phone}</div>
                    <div className="block">{resume.location}</div>
                    <div className="block text-indigo-600">{resume.linkedin}</div>
                </div>

                {resume.skills?.length > 0 && (
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Skills</h3>
                        <div className="space-y-2">
                            {resume.skills.map(s => <div key={s} className="text-sm font-medium">{s}</div>)}
                        </div>
                    </div>
                )}

                {resume.education?.length > 0 && (
                    <div>
                        <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Education</h3>
                        {resume.education.map((edu, i) => (
                            <div key={i} className="mb-4">
                                <div className="font-bold text-sm">{edu.degree}</div>
                                <div className="text-xs text-gray-500">{edu.institution}</div>
                                <div className="text-xs text-gray-400">{edu.endDate}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-2/3 pl-6 pt-2">
                {resume.summary && (
                    <section className="mb-8">
                        <p className="text-gray-600 leading-relaxed text-sm">{resume.summary}</p>
                    </section>
                )}

                {resume.experience?.length > 0 && (
                    <section>
                        <h3 className="font-bold text-gray-400 text-xs uppercase mb-6 tracking-widest">Experience</h3>
                        <div className="space-y-8">
                            {resume.experience.map((exp, i) => (
                                <div key={i} className="relative pl-4 border-l-2 border-gray-100">
                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-200"></div>
                                    <h4 className="font-bold text-gray-900">{exp.title}</h4>
                                    <div className="text-xs font-bold uppercase text-gray-400 mb-2 mt-1">{exp.company}</div>
                                    <p className="text-sm text-gray-600">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function ExecutiveTemplate({ resume, styles }) {
    return (
        <div className="h-full flex text-sm">
            {/* Sidebar */}
            <div className="w-1/3 bg-gray-900 text-white p-8 space-y-8">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold tracking-wider uppercase leading-none">{resume.fullName}</h1>
                    <div className="w-10 h-1 bg-white/20"></div>
                    <div className="text-gray-300 text-xs space-y-1.5 font-light">
                        {resume.email && <div className="flex items-center gap-2">{resume.email}</div>}
                        {resume.phone && <div className="flex items-center gap-2">{resume.phone}</div>}
                        {resume.location && <div className="flex items-center gap-2">{resume.location}</div>}
                        {resume.linkedin && <div className="flex items-center gap-2">{resume.linkedin}</div>}
                    </div>
                </div>

                {resume.skills?.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-700 pb-1">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {resume.skills.map((skill, i) => (
                                <span key={i} className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {resume.education?.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-700 pb-1">Education</h2>
                        <div className="space-y-4">
                            {resume.education.map((edu, i) => (
                                <div key={i}>
                                    <h3 className="font-bold text-white">{edu.institution}</h3>
                                    <div className="text-xs text-gray-400">{edu.degree}</div>
                                    <div className="text-xs text-gray-500 mt-1">{edu.endDate}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="w-2/3 p-8 bg-white">
                {resume.summary && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-900 rounded-full"></span>
                            Profile
                        </h2>
                        <p className="text-gray-600 leading-relaxed text-sm">{resume.summary}</p>
                    </section>
                )}

                {resume.experience?.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-900 rounded-full"></span>
                            Experience
                        </h2>
                        <div className="space-y-8 pl-1">
                            {resume.experience.map((exp, i) => (
                                <div key={i} className="relative pl-6 border-l border-gray-200">
                                    <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 bg-white border-2 border-gray-900 rounded-full"></div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900 text-lg">{exp.title}</h3>
                                        <span className="text-xs font-bold text-gray-400">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <div className="text-xs font-bold uppercase text-gray-500 mb-3">{exp.company} | {exp.location}</div>
                                    <p className="text-gray-600 leading-relaxed text-sm">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function CreativeTemplate({ resume, styles }) {
    const primaryColor = styles.color || '#3b82f6';

    return (
        <div className="h-full bg-white">
            <header className="py-10 px-8 text-white relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold mb-3 tracking-tight">{resume.fullName}</h1>
                    <div className="flex flex-wrap gap-4 text-sm font-medium opacity-90">
                        {resume.email && <span>{resume.email}</span>}
                        {resume.phone && <span>{resume.phone}</span>}
                        {resume.location && <span>{resume.location}</span>}
                    </div>
                </div>
            </header>

            <div className="p-8 grid grid-cols-12 gap-8">
                {/* Left Column Skills/Contact */}
                <div className="col-span-4 space-y-8 border-r border-gray-100 pr-4">
                    {resume.skills?.length > 0 && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {resume.skills.map((skill, i) => (
                                    <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-100">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {resume.education?.length > 0 && (
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>Education</h2>
                            <div className="space-y-4">
                                {resume.education.map((edu, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-xl">
                                        <h3 className="font-bold text-gray-900">{edu.institution}</h3>
                                        <div className="text-xs text-gray-500 font-medium mb-1">{edu.degree}</div>
                                        <div className="text-xs text-gray-400">{edu.endDate}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column Experience */}
                <div className="col-span-8 space-y-8 pl-2">
                    {resume.summary && (
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-gray-900">About Me</h2>
                            <p className="text-gray-600 leading-relaxed">{resume.summary}</p>
                        </section>
                    )}

                    {resume.experience?.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold mb-6 text-gray-900">Experience</h2>
                            <div className="space-y-8">
                                {resume.experience.map((exp, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{exp.title}</h3>
                                                <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">{exp.company}</div>
                                            </div>
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-sm mt-3">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
