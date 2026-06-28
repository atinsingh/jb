import React from 'react';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  GlobeAltIcon, 
  MapPinIcon,
  LinkIcon
} from '@heroicons/react/24/solid';

const FinanceTemplatePreview = ({ data }) => {
  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Handle YYYY-MM format specifically to avoid timezone issues (treat as local date)
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateString.split('-').map(Number);
      // Create date in local timezone (month is 0-indexed)
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Map flat resumeData to the structure expected by the template
  const resume = data ? {
    ...data,
    jobTitle: data.experience?.[0]?.title || "Professional Title", // Fallback since jobTitle isn't in root
    experience: data.experience?.map(exp => ({
      title: exp.title,
      company: exp.company,
      date: `${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}`,
      desc: exp.responsibilities || exp.description // Handle both fields
    })) || [],
    education: data.education?.map(edu => ({
      degree: edu.degree,
      school: edu.institution,
      date: `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}`
    })) || [],
    // Merge skills and technicalSkills for display if needed, or keep separate
    skills: data.skills || [],
    technicalSkills: data.technicalSkills || [],
    // Ensure other arrays exist
    languages: data.languages || [],
    certifications: data.certifications || [],
    interests: data.interests || [],
    projects: data.projects || [],
    courses: data.courses || [],
    awards: data.awards || [],
    organizations: data.organizations || [],
    publications: data.publications || [],
    references: data.references || [],
    custom: data.custom || [],
  } : {
    // Fallback data for when no data is provided (e.g. initial load or error)
    fullName: "Alexander Sterling",
    jobTitle: "Senior Portfolio Manager",
    email: "a.sterling@capital.com",
    phone: "+1 (212) 555-0198",
    location: "New York, NY",
    website: "sterling-finance.com",
    profileSummary: "Strategic investment leader with 12+ years of experience in asset management and risk mitigation. Expert in quantitative analysis and portfolio optimization for high-net-worth clients.",
    experience: [{ title: "VP of Investments", company: "Global Equity Partners", date: "2018 - Present", desc: "Directed a $2B multi-asset fund." }],
    education: [{ degree: "MBA in Finance", school: "Wharton School", date: "2015 - 2015" }],
    skills: ["Quantitative Modeling", "Asset Allocation", "Risk Management"],
    technicalSkills: ["Bloomberg Terminal", "Python", "SQL", "Tableau"],
    languages: [{ language: "English", proficiency: "Native" }, { language: "Mandarin", proficiency: "Professional" }],
    certifications: [{ name: "CFA Charterholder", issuer: "CFA Institute" }],
    interests: ["Macroeconomics", "Sailing", "Philanthropy"],
    projects: [{ name: "Market Volatility Tracker", description: "Built a real-time risk dashboard using Python." }],
    courses: [{ name: "Advanced Derivatives", provider: "CME Group" }],
    awards: [{ title: "Top 40 Under 40", issuer: "Finance Weekly" }],
    organizations: [{ name: "Red Cross Volunteer", role: "Financial Advisor" }],
    publications: [{ title: "The Future of ESG Investing", publisher: "Journal of Finance" }],
    references: [{ name: "Robert J. Vance", title: "CEO", company: "Vance Holdings", phone: "555-0100" }],
    declaration: "I hereby declare that the information provided is true to the best of my knowledge.",
  };

  const SectionTitle = ({ children }) => (
    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-200 pb-1 mb-4">
      {children}
    </h3>
  );

  const SidebarTitle = ({ children }) => (
    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
      {children}
    </h3>
  );

  return (
    <div className="bg-white shadow-2xl mx-auto w-full max-w-[850px] min-h-[1100px] flex text-slate-800 font-sans border border-gray-200">
      
      {/* LEFT SIDEBAR - Deep Atlanian Blue */}
      <div className="w-[35%] bg-[#0f172a] text-white p-8 flex flex-col gap-9">
        
        {/* Contact Info */}
        <section>
          <SidebarTitle>Contact</SidebarTitle>
          <div className="space-y-3 text-[13px] opacity-90 font-light">
            {resume.email && <div className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4 text-blue-400 shrink-0"/> <span className="break-all">{resume.email}</span></div>}
            {resume.phone && <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-blue-400 shrink-0"/> {resume.phone}</div>}
            {resume.location && <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-blue-400 shrink-0"/> {resume.location}</div>}
            {resume.website && <div className="flex items-center gap-2"><GlobeAltIcon className="w-4 h-4 text-blue-400 shrink-0"/> <span className="break-all">{resume.website}</span></div>}
          </div>
        </section>

        {/* Skills Section */}
        {(resume.skills?.length > 0 || resume.technicalSkills?.length > 0) && (
          <section>
            <SidebarTitle>Skills</SidebarTitle>
            <ul className="space-y-2 text-[13px] opacity-90 list-none">
              {[...(resume.skills || []), ...(resume.technicalSkills || [])].map((skill, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Certificates Section */}
        {resume.certifications?.length > 0 && (
          <section>
            <SidebarTitle>Certificates</SidebarTitle>
            <div className="space-y-3">
              {resume.certifications.map((cert, i) => (
                <div key={i} className="text-[13px]">
                  <div className="font-bold text-blue-100">{cert.name}</div>
                  <div className="text-[11px] opacity-70 italic">{cert.issuer}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages Section */}
        {resume.languages?.length > 0 && (
          <section>
            <SidebarTitle>Languages</SidebarTitle>
            <div className="space-y-2 text-[13px]">
              {resume.languages.map((lang, i) => (
                <div key={i} className="flex justify-between border-b border-slate-700 pb-1">
                  <span>{lang.language}</span>
                  <span className="text-[11px] text-blue-400">{lang.proficiency}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interests Section */}
        {resume.interests?.length > 0 && (
          <section>
            <SidebarTitle>Interests</SidebarTitle>
            <div className="flex flex-wrap gap-2">
              {resume.interests.map((interest, i) => (
                <span key={i} className="text-[11px] bg-slate-800 px-2 py-1 rounded text-slate-300">
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div className="w-[68%] p-12 flex flex-col gap-10">
        
        {/* Header */}
        <header>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {resume.fullName || "Your Name"}
          </h1>
          <p className="text-xl font-medium text-blue-700 mt-2 uppercase tracking-widest border-l-4 border-blue-700 pl-4 ml-1">
            {resume.jobTitle || "Professional Title"}
          </p>
        </header>

        {/* Profile Summary */}
        {(resume.profileSummary || resume.summary) && (
          <section>
            <SectionTitle>Profile Summary</SectionTitle>
            <p className="text-[14px] leading-relaxed text-slate-600 italic">
              {resume.profileSummary || resume.summary}
            </p>
          </section>
        )}

        {/* Professional Experience */}
        {resume.experience?.length > 0 && (
          <section>
            <SectionTitle>Professional Experience</SectionTitle>
            <div className="space-y-6">
              {resume.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-slate-900 text-base">{exp.title}</h4>
                    <span className="text-xs font-bold text-slate-400 italic">{exp.date}</span>
                  </div>
                  <div className="text-sm font-semibold text-blue-800 mb-2">{exp.company}</div>
                  <div 
                    className="text-[13px] text-slate-600 leading-snug prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: exp.desc }} 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education?.length > 0 && (
          <section>
            <SectionTitle>Education</SectionTitle>
            <div className="space-y-4">
              {resume.education.map((edu, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-900">{edu.degree}</h4>
                    <p className="text-[13px] text-slate-600">{edu.school}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-medium shrink-0">{edu.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects Section */}
        {resume.projects?.length > 0 && (
          <section>
            <SectionTitle>Projects</SectionTitle>
            <div className="grid grid-cols-1 gap-4">
              {resume.projects.map((proj, i) => (
                <div key={i} className="border-l-2 border-slate-100 pl-4">
                  <h4 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                    {proj.name} {proj.url && <LinkIcon className="w-3 h-3 text-blue-500" />}
                  </h4>
                  <p className="text-[12px] text-slate-600 mt-1">{proj.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Awards & Organizations Row */}
        <div className="grid grid-cols-2 gap-8">
           {resume.awards?.length > 0 && (
             <section>
               <SectionTitle>Awards</SectionTitle>
               {resume.awards.map((award, i) => (
                 <div key={i} className="mb-2 text-[12px]">
                   <span className="font-bold block">{award.title}</span>
                   <span className="text-slate-500 italic">{award.issuer}</span>
                 </div>
               ))}
             </section>
           )}
           {resume.organizations?.length > 0 && (
             <section>
               <SectionTitle>Organizations</SectionTitle>
               {resume.organizations.map((org, i) => (
                 <div key={i} className="mb-2 text-[12px]">
                   <span className="font-bold block">{org.name}</span>
                   <span className="text-slate-500">{org.role}</span>
                 </div>
               ))}
             </section>
           )}
        </div>

        {/* Publications & Courses */}
        {resume.publications?.length > 0 && (
          <section>
            <SectionTitle>Publications</SectionTitle>
            {resume.publications.map((pub, i) => (
              <div key={i} className="mb-2 text-[13px]">
                <span className="font-bold italic">"{pub.title}"</span> — {pub.publisher} ({pub.date})
              </div>
            ))}
          </section>
        )}

        {/* References */}
        {resume.references?.length > 0 && (
          <section>
            <SectionTitle>References</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {resume.references.map((ref, i) => (
                <div key={i} className="text-[12px] p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="font-bold text-slate-900">{ref.name}</p>
                  <p className="text-slate-600">{ref.title}, {ref.company}</p>
                  <p className="text-blue-600 font-medium mt-1">{ref.email || ref.phone}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom / Declaration Footer */}
        <div className="mt-auto pt-8 border-t border-slate-200">
          {resume.custom?.map((item, i) => (
            <div key={i} className="mb-4">
              <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-[12px] text-slate-600">{item.content}</p>
            </div>
          ))}
          {resume.declaration && (
            <div className="text-center mt-6">
              <p className="text-[11px] text-slate-400 italic mb-4">{resume.declaration}</p>
              <div className="w-32 h-0.5 bg-slate-200 mx-auto"></div>
              <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest">Signature</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FinanceTemplatePreview;