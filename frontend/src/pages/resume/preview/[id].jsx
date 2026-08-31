/**
 * Resume Preview Page for PDF Generation
 * This page is used by Puppeteer to generate pixel-perfect PDFs
 * It renders the resume without any UI chrome
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { API_URL } from '@/config/api';
import ModernResumePreview from '@/components/resume/ModernResumePreview';
import { getAccessToken } from '@/lib/apiClient';

export default function ResumePreviewPage() {
  const router = useRouter();
  const { id, token } = router.query;
  const [resumeData, setResumeData] = useState(null);
  const [templateSettings, setTemplateSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchResume = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
        };

        // Use token from query if provided (for Puppeteer), otherwise use localStorage
        const authToken = token || (await getAccessToken());
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}/api/resume-builder/${id}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch resume');
        }

        const data = await response.json();
        
        // Map backend data to frontend format
        setResumeData({
          fullName: data.fullName || '',
          jobTitle: data.jobTitle || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          website: data.website || '',
          photo: data.photo || '',
          summary: data.summary || data.profileSummary || '',
          profileSummary: data.profileSummary || '',
          skills: data.skills || [],
          experience: data.experience || [],
          education: data.education || [],
          certifications: data.certifications || [],
          projects: data.projects || [],
          languages: data.languages || [],
          interests: data.interests || [],
          courses: data.courses || [],
          awards: data.awards || [],
          organizations: data.organizations || [],
          publications: data.publications || [],
          declaration: data.declaration || '',
          custom: data.custom || [],
        });

        setTemplateSettings({
          colorScheme: data.theme?.colorScheme || data.theme?.color || 'blue',
          fontFamily: data.theme?.fontFamily || data.theme?.font || 'inter',
          fontSize: data.theme?.fontSize || 'medium',
          spacing: data.theme?.spacing || 'normal',
        });

        setLoading(false);
        
        // Signal to Puppeteer that the page is ready
        if (typeof window !== 'undefined') {
          window.resumeReady = true;
        }
      } catch (err) {
        console.error('Error fetching resume:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchResume();
  }, [id, token]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-100 p-8">
      {/* This wrapper ensures proper centering for PDF generation */}
      <div className="mx-auto">
        <ModernResumePreview 
          resumeData={resumeData} 
          templateSettings={templateSettings}
        />
      </div>
    </div>
  );
}
