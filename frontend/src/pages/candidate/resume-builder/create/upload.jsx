'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import { 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { toast } from 'react-toastify';

export default function UploadResume() {
  const { user } = useAuth();
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [resumeNameInput, setResumeNameInput] = useState('');
  const [previousResumes, setPreviousResumes] = useState([]);

  useEffect(() => {
    fetchPreviousResumes();
  }, []);

  const fetchPreviousResumes = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPreviousResumes(data);
      }
    } catch (error) {
      console.error('Error fetching previous resumes:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!resumeFile) {
      toast.error('Please select a file');
      return;
    }

    // Check if user has reached the limit of 4 resumes
    if (previousResumes.length >= 4) {
      toast.error('You have reached the maximum limit of 4 resumes. Please delete an existing resume to create a new one.');
      return;
    }

    // Ensure resume name is provided
    if (!resumeNameInput.trim()) {
      toast.error('Please enter a resume name');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('template', 'modern'); // Use default template
      formData.append('name', resumeNameInput.trim() || 'My Resume');

      const response = await fetch(`${API_URL}/api/resume-builder/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Resume uploaded and parsed successfully!');
        // Clear sessionStorage
        sessionStorage.removeItem('uploadMethod');
        // Navigate to editor - store resume ID in sessionStorage
        const resumeId = data._id || data.id;
        sessionStorage.setItem('editResumeId', resumeId);
        router.push('/candidate/resume-builder');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Error uploading resume');
    } finally {
      setUploading(false);
    }
  };

  // Check if user has reached the limit
  if (previousResumes.length >= 4) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-950 mb-4">Limit Reached</h2>
            <p className="text-zinc-600 mb-6">You have reached the maximum limit of 4 resumes.</p>
            <Button onClick={() => router.push('/candidate/resume-builder')} color="blue">
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Resumes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Upload Resume - Jobocate</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="w-full px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-950 mb-2">Upload Your Resume</h3>
                <p className="text-sm text-zinc-500">Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
                <p className="text-sm text-zinc-400 mt-2">We'll extract your information and create a resume automatically</p>
              </div>

              {/* Resume Name Input */}
              {resumeFile && (
                <div className="mb-6">
                  <label htmlFor="resume-name" className="block text-sm font-medium text-zinc-950 mb-2">
                    Resume Name
                  </label>
                  <input
                    type="text"
                    id="resume-name"
                    value={resumeNameInput}
                    onChange={(e) => setResumeNameInput(e.target.value)}
                    placeholder="e.g., Software Engineer Resume"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && resumeNameInput.trim() && !uploading) {
                        handleFileUpload();
                      }
                    }}
                  />
                </div>
              )}
              
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    // Validate file type
                    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                    const validExtensions = ['.pdf', '.doc', '.docx'];
                    const fileName = file.name.toLowerCase();
                    const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));
                    
                    if (!isValidType) {
                      toast.error('Please upload a PDF, DOC, or DOCX file');
                      return;
                    }
                    
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('File size must be less than 5MB');
                      return;
                    }
                    
                    setResumeFile(file);
                  }
                }}
                className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : resumeFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-zinc-300 bg-zinc-50'
                }`}
              >
                {resumeFile ? (
                  <div className="space-y-3">
                    <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500" />
                    <div>
                      <p className="font-semibold text-zinc-950">{resumeFile.name}</p>
                      <p className="text-sm text-zinc-500">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      onClick={() => setResumeFile(null)}
                      outline
                      size="sm"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CloudArrowUpIcon className="h-12 w-12 mx-auto text-zinc-400" />
                    <div>
                      <p className="font-semibold text-zinc-950">
                        Drag and drop your resume here
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">
                        or click to browse (PDF, DOC, or DOCX files)
                      </p>
                    </div>
                    <input
                      type="file"
                      id="resume-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('File size must be less than 5MB');
                            return;
                          }
                          setResumeFile(file);
                        }
                      }}
                    />
                    <label htmlFor="resume-upload">
                      <Button as="span" color="blue" size="sm">
                        <CloudArrowUpIcon className="h-4 w-4" />
                        Select File
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => router.push('/candidate/resume-builder/create')}
                  outline
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleFileUpload}
                  color="blue"
                  disabled={!resumeFile || !resumeNameInput.trim() || uploading || previousResumes.length >= 4}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Upload & Continue
                      <ChevronRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

