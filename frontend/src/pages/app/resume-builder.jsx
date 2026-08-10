'use client';

// The standalone "resume builder" wizard produced no saved resume. The real
// building experience now lives in the Resume Workspace: the library
// (/app/resume-library) to manage resumes, and the editor (/app/resume) to
// build/edit one. This route redirects to the library so it isn't a dead end.
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AppResumeBuilderRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/resume-library');
  }, [router]);
  return null;
}
