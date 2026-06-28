'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  CheckCircleIcon,
  ChevronLeftIcon,
  EyeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Badge } from '@/components/catalyst/badge';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';

const templates = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary design perfect for tech and creative roles',
    preview: '/resume-templates/modern.png',
    color: 'blue',
    category: 'Modern',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional, formal layout ideal for corporate positions',
    preview: '/resume-templates/professional.png',
    color: 'green',
    category: 'Corporate',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold and artistic design for creative professionals',
    preview: '/resume-templates/creative.png',
    color: 'purple',
    category: 'Creative',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant with focus on content',
    preview: '/resume-templates/minimal.png',
    color: 'zinc',
    category: 'Minimal',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated design for senior-level positions',
    preview: '/resume-templates/executive.png',
    color: 'indigo',
    category: 'Executive',
  },
  {
    id: 'ats-friendly',
    name: 'ATS Friendly',
    description: 'Optimized for Applicant Tracking Systems',
    preview: '/resume-templates/ats-friendly.png',
    color: 'green',
    category: 'ATS',
  },
];

export default function TemplateSelection() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
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

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
  };

  const handleContinue = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (previousResumes.length >= 4) {
      toast.error('You have reached the maximum limit of 4 resumes. Please delete an existing resume to create a new one.');
      return;
    }

    // Store selected template in sessionStorage and navigate back to main page
    sessionStorage.setItem('selectedTemplate', selectedTemplate);
    sessionStorage.setItem('uploadMethod', 'new');
    // Navigate back to main resume builder which will handle creating new resume
    router.push('/candidate/resume-builder');
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
        <title>Choose Template - Jobocate</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="w-full px-6 py-12">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-zinc-950 mb-4">Choose Your Resume Template</h2>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
              Select a professional template to get started with your new resume
            </p>
            {selectedTemplate && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Template selected: <span className="capitalize">{selectedTemplate}</span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px] mx-auto mb-8">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden bg-white ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 hover:shadow-lg'
                }`}
              >
                {/* Template Preview Area */}
                <div 
                  className="relative h-[240px] sm:h-[280px] bg-gradient-to-br from-zinc-50 to-zinc-100 overflow-hidden"
                >
                  {/* Placeholder background */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                    <div className="text-center p-6">
                      <DocumentTextIcon className="h-20 w-20 text-zinc-400 mx-auto mb-4" />
                      <div className="space-y-2.5">
                        <div className="h-2.5 bg-zinc-300 rounded w-48 mx-auto"></div>
                        <div className="h-2.5 bg-zinc-300 rounded w-44 mx-auto"></div>
                        <div className="h-2.5 bg-zinc-300 rounded w-46 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Template image */}
                  {template.preview && (
                    <div className="relative w-full h-full">
                      <img
                        src={template.preview}
                        alt={`${template.name} template preview`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          const placeholder = e.target.parentElement?.previousElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Selected Badge */}
                  {selectedTemplate === template.id && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="bg-blue-500 rounded-full p-2 shadow-lg">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Template Info */}
                <div className="p-5 bg-white border-t border-zinc-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-zinc-950 mb-1.5 truncate">{template.name}</h3>
                      <p className="text-sm text-zinc-600 line-clamp-2 leading-snug">{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                    <Badge color={template.color} className="text-xs font-medium px-2.5 py-1">
                      {template.category}
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleTemplateSelect(template.id)}
                        color={selectedTemplate === template.id ? "blue" : "zinc"}
                        size="sm"
                        className="text-xs font-medium"
                      >
                        {selectedTemplate === template.id ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4" />
                            Selected
                          </>
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={() => router.push('/candidate/resume-builder/create')}
              outline
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              color="blue"
              disabled={!selectedTemplate}
            >
              Continue
              <ChevronLeftIcon className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

