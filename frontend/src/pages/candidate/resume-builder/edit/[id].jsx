'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

// This route redirects to the main resume builder page with the resume ID
// The main page will load the resume and show the editor
export default function EditResume() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (router.isReady) {
      if (id && id !== 'new') {
        // Store the resume ID in sessionStorage so main page can load it
        sessionStorage.setItem('editResumeId', id);
        // Redirect to main resume builder page
        router.replace('/candidate/resume-builder');
      } else if (id === 'new') {
        // For new resume, check if template is selected
        const template = sessionStorage.getItem('selectedTemplate');
        if (template) {
          // Redirect to main page which will handle creation
          router.replace('/candidate/resume-builder');
        } else {
          // No template selected, go back to template selection
          router.replace('/candidate/resume-builder/create/template');
        }
      }
    }
  }, [router.isReady, id, router]);

  return (
    <DashboardLayout>
      <Head>
        <title>Loading Resume - Jobocate</title>
      </Head>
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600">Loading resume...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

