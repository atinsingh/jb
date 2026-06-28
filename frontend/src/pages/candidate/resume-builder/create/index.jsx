'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  SparklesIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Badge } from '@/components/catalyst/badge';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';

export default function CreateResumeChoice() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadMethod, setUploadMethod] = useState(null);
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

  const handleMethodSelect = (method) => {
    setUploadMethod(method);
    if (method === 'new') {
      // Navigate to template selection
      router.push('/candidate/resume-builder/create/template');
    } else if (method === 'upload') {
      // Navigate to upload step
      router.push('/candidate/resume-builder/create/upload');
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
        <title>Create New Resume - Jobocate</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="w-full px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-bold text-zinc-950 mb-4">How would you like to start?</h2>
              <p className="text-xl text-zinc-600">Choose the option that works best for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Upload Option */}
              <div
                onClick={() => handleMethodSelect('upload')}
                className={`group relative cursor-pointer rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                  uploadMethod === 'upload'
                    ? 'border-blue-500 bg-blue-50 shadow-2xl ring-4 ring-blue-100 scale-[1.02]'
                    : 'border-zinc-200 hover:border-blue-400 hover:shadow-xl bg-white'
                }`}
              >
                <div className="p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-5 rounded-2xl mb-6 transition-all duration-300 ${
                      uploadMethod === 'upload' ? 'bg-blue-100 scale-110' : 'bg-zinc-100 group-hover:bg-blue-50 group-hover:scale-105'
                    }`}>
                      <CloudArrowUpIcon className={`h-14 w-14 ${
                        uploadMethod === 'upload' ? 'text-blue-600' : 'text-zinc-600 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-950 mb-3">Upload Existing Resume</h3>
                    <p className="text-base text-zinc-600 mb-6 leading-relaxed">We'll extract and enhance your information automatically using AI</p>
                    {uploadMethod === 'upload' && (
                      <Badge color="blue" className="text-sm font-semibold px-4 py-1.5">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Fresh Option */}
              <div
                onClick={() => handleMethodSelect('new')}
                className={`group relative cursor-pointer rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                  uploadMethod === 'new'
                    ? 'border-blue-500 bg-blue-50 shadow-2xl ring-4 ring-blue-100 scale-[1.02]'
                    : 'border-zinc-200 hover:border-blue-400 hover:shadow-xl bg-white'
                }`}
              >
                <div className="p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-5 rounded-2xl mb-6 transition-all duration-300 ${
                      uploadMethod === 'new' ? 'bg-blue-100 scale-110' : 'bg-zinc-100 group-hover:bg-blue-50 group-hover:scale-105'
                    }`}>
                      <SparklesIcon className={`h-14 w-14 ${
                        uploadMethod === 'new' ? 'text-blue-600' : 'text-zinc-600 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-950 mb-3">Start Fresh</h3>
                    <p className="text-base text-zinc-600 mb-6 leading-relaxed">Build from scratch with AI-powered suggestions</p>
                    {uploadMethod === 'new' && (
                      <Badge color="blue" className="text-sm font-semibold px-4 py-1.5">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/candidate/resume-builder')}
                outline
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

