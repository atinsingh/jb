'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import { 
  SparklesIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Field, FieldGroup, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';
import { Textarea } from '@/components/catalyst/textarea';
import { Badge } from '@/components/catalyst/badge';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/catalyst/table';
import { toast } from 'react-toastify';

const WIZARD_STEPS = {
  TEMPLATE: 0,
  JOB_INFO: 1,
  REVIEW: 2,
  GENERATING: 3,
  COMPLETE: 4,
};

const templates = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional, formal tone suitable for corporate positions',
    icon: '💼',
    preview: 'Dear Hiring Manager,\n\nI am writing to express my strong interest...',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary and engaging, great for tech and creative roles',
    icon: '✨',
    preview: 'Hello Team,\n\nI\'m excited to apply for the...',
  },
  {
    id: 'concise',
    name: 'Concise',
    description: 'Short and impactful, perfect for busy recruiters',
    icon: '📝',
    preview: 'Dear Hiring Manager,\n\nI\'m writing to apply for...',
  },
  {
    id: 'enthusiastic',
    name: 'Enthusiastic',
    description: 'Energetic and passionate, ideal for startup culture',
    icon: '🚀',
    preview: 'Hi Team! 🚀\n\nI\'m thrilled to apply for...',
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Narrative-driven, connects your journey to the role',
    icon: '📖',
    preview: 'Dear Hiring Manager,\n\nThree years ago, I made...',
  },
];

const faqs = [
  {
    question: 'How does AI generate my cover letter?',
    answer: 'Our AI analyzes the job description, your profile information, and the selected template to create a personalized cover letter that highlights your relevant skills and experience.',
  },
  {
    question: 'Can I edit the generated cover letter?',
    answer: 'Yes! After generation, you can edit the cover letter directly in the editor before saving or downloading.',
  },
  {
    question: 'What templates are available?',
    answer: 'We offer 5 different templates: Professional, Modern, Concise, Enthusiastic, and Storytelling. Each has a unique tone and structure suited for different industries and company cultures.',
  },
  {
    question: 'How long does it take to generate?',
    answer: 'Typically, cover letter generation takes 10-30 seconds depending on the complexity of the job description and your profile information.',
  },
  {
    question: 'Can I download the cover letter as PDF?',
    answer: 'Yes! Once generated, you can download your cover letter as a professionally formatted PDF in your chosen template style.',
  },
  {
    question: 'Are my cover letters saved?',
    answer: 'Yes, all generated cover letters are saved to your account. You can view, edit, or delete them anytime from the previous letters section.',
  },
];

export default function AICoverLetter() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, wizard
  const [previousLetters, setPreviousLetters] = useState([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(WIZARD_STEPS.TEMPLATE);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    jobTitle: '',
    companyName: '',
    jobDescription: '',
    additionalInfo: '',
  });
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchPreviousLetters();
  }, []);

  const fetchPreviousLetters = async () => {
    setLoadingLetters(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cover-letters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPreviousLetters(data);
      } else {
        setPreviousLetters([]);
      }
    } catch (error) {
      console.error('Error fetching previous letters:', error);
      setPreviousLetters([]);
    } finally {
      setLoadingLetters(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cover-letters/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setPreviousLetters(prev => prev.filter(letter => letter.id !== id));
        toast.success('Cover letter deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete cover letter');
      }
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      toast.error('Error deleting cover letter');
    }
  };

  const handleEdit = (letter) => {
    // Load letter data and start wizard
    setFormData({
      jobTitle: letter.role,
      companyName: letter.company,
      jobDescription: '',
      additionalInfo: '',
    });
    setSelectedTemplate(letter.template);
    setShowWizard(true);
    setWizardStep(WIZARD_STEPS.JOB_INFO);
  };

  const handleView = (letter) => {
    // Construct full URL - pdfUrl from backend is relative
    const pdfUrl = letter.pdfUrl?.startsWith('http') 
      ? letter.pdfUrl 
      : `${API_URL}${letter.pdfUrl || `/api/cover-letters/${letter.id}/pdf`}`;
    window.open(pdfUrl, '_blank');
  };

  const handleDownload = async (letter) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cover-letters/${letter.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover-letter-${letter.role}-${letter.company}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Cover letter downloaded successfully');
      } else {
        toast.error('Failed to download cover letter');
      }
    } catch (error) {
      console.error('Error downloading cover letter:', error);
      toast.error('Error downloading cover letter');
    }
  };

  const handleStartWizard = () => {
    setShowWizard(true);
    setWizardStep(WIZARD_STEPS.TEMPLATE);
    setSelectedTemplate(null);
    setFormData({
      jobTitle: '',
      companyName: '',
      jobDescription: '',
      additionalInfo: '',
    });
  };

  const handleNext = () => {
    if (wizardStep === WIZARD_STEPS.TEMPLATE && !selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (wizardStep === WIZARD_STEPS.JOB_INFO) {
      if (!formData.jobTitle || !formData.companyName || !formData.jobDescription) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setWizardStep(prev => prev + 1);
  };

  const handleBack = () => {
    setWizardStep(prev => prev - 1);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setWizardStep(WIZARD_STEPS.GENERATING);
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cover-letters/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          template: selectedTemplate,
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          additionalInfo: formData.additionalInfo || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedLetter({
          ...data,
          pdfUrl: data.pdfUrl || `${API_URL}/api/cover-letters/${data.id}/pdf`,
        });
        setWizardStep(WIZARD_STEPS.COMPLETE);
        toast.success('Cover letter generated successfully!');
        // Refresh previous letters
        if (showPreviousLetters) {
          fetchPreviousLetters();
        }
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to generate cover letter' }));
        toast.error(error.message || 'Failed to generate cover letter');
        setWizardStep(WIZARD_STEPS.REVIEW);
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast.error('Error generating cover letter. Please try again.');
      setWizardStep(WIZARD_STEPS.REVIEW);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setWizardStep(WIZARD_STEPS.TEMPLATE);
    setSelectedTemplate(null);
    setGeneratedLetter(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Head>
        <title>AI Cover Letter | Jobocate</title>
        <meta name="description" content="Generate personalized cover letters with AI" />
      </Head>
      <DashboardLayout>
        <div className="min-h-screen bg-zinc-50/50">
          {/* Modern Header */}
          <div className="bg-white border-b border-zinc-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-950 tracking-tight">Cover Letters</h1>
                  <p className="text-sm text-zinc-500 mt-1">Create personalized cover letters with AI</p>
                </div>
                <Button onClick={handleStartWizard} color="blue" className="shadow-lg">
                  <SparklesIcon data-slot="icon" className="h-5 w-5" />
                  New Cover Letter
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Cover Letters Grid */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-zinc-950 mb-6">My Cover Letters</h2>
              
              {loadingLetters ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-[3/4] bg-white rounded-xl border border-zinc-200 p-4 animate-pulse">
                      <div className="w-full h-3/4 bg-zinc-100 rounded-lg mb-4"></div>
                      <div className="h-4 bg-zinc-100 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-zinc-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Create New Card */}
                  <div
                    onClick={handleStartWizard}
                    className="group aspect-[3/4] border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300"
                  >
                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors mb-4">
                      <SparklesIcon className="w-8 h-8 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-600 group-hover:text-blue-700">Create New</h3>
                    <p className="text-sm text-zinc-400 mt-2">Generate with AI</p>
                  </div>

                  {/* Existing Letters */}
                  {previousLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className="group relative aspect-[3/4] bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                    >
                      <div className="flex-1 bg-zinc-50 relative overflow-hidden p-4 group-hover:bg-zinc-100 transition-colors">
                        {/* Letter Preview */}
                        <div className="w-full h-full bg-white shadow-sm border border-zinc-100 rounded flex flex-col p-3 scale-[0.9] origin-top group-hover:scale-100 transition-transform duration-500">
                          <div className="text-[8px] space-y-1 text-zinc-600">
                            <div className="font-semibold">{letter.company}</div>
                            <div className="text-zinc-400">{formatDate(letter.createdAt)}</div>
                            <div className="h-px bg-zinc-200 my-2"></div>
                            <div className="space-y-1">
                              <div className="h-1 bg-zinc-200 rounded w-full"></div>
                              <div className="h-1 bg-zinc-200 rounded w-full"></div>
                              <div className="h-1 bg-zinc-200 rounded w-5/6"></div>
                              <div className="h-1 bg-zinc-200 rounded w-full"></div>
                              <div className="h-1 bg-zinc-200 rounded w-4/6"></div>
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleView(letter); }}
                            className="p-2 bg-white rounded-full text-zinc-900 hover:text-blue-600 hover:scale-110 transition-all shadow-lg"
                            title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(letter); }}
                            className="p-2 bg-white rounded-full text-zinc-900 hover:text-green-600 hover:scale-110 transition-all shadow-lg"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(letter); }}
                            className="p-2 bg-white rounded-full text-zinc-900 hover:text-indigo-600 hover:scale-110 transition-all shadow-lg"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(letter.id); }}
                            className="p-2 bg-white rounded-full text-zinc-900 hover:text-red-600 hover:scale-110 transition-all shadow-lg"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 border-t border-zinc-100 bg-white relative z-10">
                        <h3 className="font-semibold text-zinc-900 truncate" title={letter.role}>{letter.role}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-zinc-500 truncate">{letter.company}</p>
                          <Badge color="zinc" className="text-[10px] px-1.5 py-0">
                            {templates.find(t => t.id === letter.template)?.name || letter.template}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {previousLetters.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
                      <h3 className="text-lg font-semibold text-zinc-900 mb-2">No cover letters yet</h3>
                      <p className="text-zinc-500 mb-6">Create your first cover letter with AI</p>
                      <Button onClick={handleStartWizard} color="blue">
                        <SparklesIcon data-slot="icon" className="h-4 w-4" />
                        Generate Your First Cover Letter
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="mb-8 rounded-lg border border-zinc-950/10 bg-white p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Tips for Best Results
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-950">Include Full Job Description</p>
                    <p className="text-sm text-zinc-500">The more details you provide, the better the AI can match your skills.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-950">Choose the Right Template</p>
                    <p className="text-sm text-zinc-500">Match the template tone to the company culture and role type.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-950">Add Personal Touches</p>
                    <p className="text-sm text-zinc-500">Use the additional info field to mention specific achievements or connections.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-950">Review Before Sending</p>
                    <p className="text-sm text-zinc-500">Always review and customize the generated letter to ensure it's perfect.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-4 flex items-center gap-2">
                <QuestionMarkCircleIcon className="h-5 w-5" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-zinc-200 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-zinc-950 mb-2">{faq.question}</h3>
                    <p className="text-sm text-zinc-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wizard Modal */}
          {showWizard && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                <div 
                  className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                  onClick={handleCloseWizard}
                />
                
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">
                          {wizardStep === WIZARD_STEPS.TEMPLATE && 'Choose Template'}
                          {wizardStep === WIZARD_STEPS.JOB_INFO && 'Job Information'}
                          {wizardStep === WIZARD_STEPS.REVIEW && 'Review & Generate'}
                          {wizardStep === WIZARD_STEPS.GENERATING && 'Generating...'}
                          {wizardStep === WIZARD_STEPS.COMPLETE && 'Complete!'}
                        </h3>
                        {wizardStep !== WIZARD_STEPS.GENERATING && wizardStep !== WIZARD_STEPS.COMPLETE && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-100">Progress</span>
                              <span className="text-sm font-semibold text-white">
                                {Math.round(((wizardStep + 1) / 3) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-blue-400/30 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-white h-full rounded-full transition-all duration-500"
                                style={{ width: `${((wizardStep + 1) / 3) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleCloseWizard}
                        className="ml-4 rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-8 py-8">
                    {/* Template Selection Step */}
                    {wizardStep === WIZARD_STEPS.TEMPLATE && (
                      <div className="space-y-6">
                        <p className="text-zinc-600 text-center mb-6">
                          Select a template that matches the tone and style you want for your cover letter
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setSelectedTemplate(template.id)}
                              className={`p-6 rounded-lg border-2 transition-all text-left ${
                                selectedTemplate === template.id
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="text-4xl">{template.icon}</div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-zinc-950 mb-1">{template.name}</h4>
                                  <p className="text-sm text-zinc-500 mb-3">{template.description}</p>
                                  <div className="text-xs text-zinc-400 font-mono bg-zinc-100 p-2 rounded">
                                    {template.preview.substring(0, 60)}...
                                  </div>
                                </div>
                                {selectedTemplate === template.id && (
                                  <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Information Step */}
                    {wizardStep === WIZARD_STEPS.JOB_INFO && (
                      <div className="space-y-6">
                        <FieldGroup>
                          <Field>
                            <Label htmlFor="jobTitle">Job Title *</Label>
                            <Input
                              id="jobTitle"
                              name="jobTitle"
                              type="text"
                              value={formData.jobTitle}
                              onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                              placeholder="e.g. Senior Software Engineer"
                            />
                          </Field>

                          <Field>
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input
                              id="companyName"
                              name="companyName"
                              type="text"
                              value={formData.companyName}
                              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                              placeholder="e.g. Tech Corp"
                            />
                          </Field>

                          <Field>
                            <Label htmlFor="jobDescription">Job Description *</Label>
                            <Textarea
                              id="jobDescription"
                              name="jobDescription"
                              value={formData.jobDescription}
                              onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
                              placeholder="Paste the job description, requirements, and key responsibilities here..."
                              rows={8}
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                              Include key requirements, responsibilities, and qualifications
                            </p>
                          </Field>

                          <Field>
                            <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                            <Textarea
                              id="additionalInfo"
                              name="additionalInfo"
                              value={formData.additionalInfo}
                              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                              placeholder="Any specific points you'd like to highlight or include..."
                              rows={4}
                            />
                          </Field>
                        </FieldGroup>
                      </div>
                    )}

                    {/* Review Step */}
                    {wizardStep === WIZARD_STEPS.REVIEW && (
                      <div className="space-y-6">
                        <div className="bg-zinc-50 rounded-lg p-6 space-y-4">
                          <div>
                            <span className="text-sm font-medium text-zinc-500">Template:</span>
                            <p className="text-zinc-950 font-semibold">
                              {templates.find(t => t.id === selectedTemplate)?.name}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-zinc-500">Job Title:</span>
                            <p className="text-zinc-950 font-semibold">{formData.jobTitle}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-zinc-500">Company:</span>
                            <p className="text-zinc-950 font-semibold">{formData.companyName}</p>
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Ready to generate?</strong> Click "Generate" to create your personalized cover letter using AI.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Generating Step */}
                    {wizardStep === WIZARD_STEPS.GENERATING && (
                      <div className="text-center py-12">
                        <ArrowPathIcon className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
                        <h4 className="text-xl font-semibold text-zinc-950 mb-2">Generating Your Cover Letter</h4>
                        <p className="text-zinc-500">Our AI is crafting a personalized cover letter for you...</p>
                      </div>
                    )}

                    {/* Complete Step */}
                    {wizardStep === WIZARD_STEPS.COMPLETE && generatedLetter && (
                      <div className="space-y-6">
                        <div className="text-center py-6">
                          <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
                          <h4 className="text-xl font-semibold text-zinc-950 mb-2">Cover Letter Generated!</h4>
                          <p className="text-zinc-500">Your cover letter has been generated and saved.</p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              const pdfUrl = generatedLetter.pdfUrl || `${API_URL}/api/cover-letters/${generatedLetter.id}/pdf`;
                              window.open(pdfUrl, '_blank');
                            }}
                            color="blue"
                            className="flex-1"
                          >
                            <EyeIcon data-slot="icon" className="h-4 w-4" />
                            View PDF
                          </Button>
                          <Button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                                const response = await fetch(`${API_URL}/api/cover-letters/${generatedLetter.id}/pdf`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                  },
                                });
                                
                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `cover-letter-${formData.jobTitle}-${formData.companyName}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  toast.success('Cover letter downloaded successfully');
                                } else {
                                  toast.error('Failed to download cover letter');
                                }
                              } catch (error) {
                                console.error('Error downloading:', error);
                                toast.error('Error downloading cover letter');
                              }
                            }}
                            outline
                            className="flex-1"
                          >
                            <ArrowDownTrayIcon data-slot="icon" className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {wizardStep !== WIZARD_STEPS.GENERATING && wizardStep !== WIZARD_STEPS.COMPLETE && (
                    <div className="border-t border-zinc-200 px-8 py-4 flex justify-between">
                      <Button
                        onClick={wizardStep === WIZARD_STEPS.TEMPLATE ? handleCloseWizard : handleBack}
                        outline
                      >
                        <ChevronLeftIcon data-slot="icon" className="h-4 w-4" />
                        {wizardStep === WIZARD_STEPS.TEMPLATE ? 'Cancel' : 'Back'}
                      </Button>
                      <Button
                        onClick={wizardStep === WIZARD_STEPS.REVIEW ? handleGenerate : handleNext}
                        color="blue"
                      >
                        {wizardStep === WIZARD_STEPS.REVIEW ? 'Generate' : 'Next'}
                        <ChevronRightIcon data-slot="icon" className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {wizardStep === WIZARD_STEPS.COMPLETE && (
                    <div className="border-t border-zinc-200 px-8 py-4 flex justify-end">
                      <Button onClick={handleCloseWizard} color="blue">
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="mb-8 rounded-lg border border-zinc-950/10 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-zinc-950 mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              Tips for Best Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-950">Include Full Job Description</p>
                  <p className="text-sm text-zinc-500">The more details you provide, the better the AI can match your skills.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-950">Choose the Right Template</p>
                  <p className="text-sm text-zinc-500">Match the template tone to the company culture and role type.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-950">Add Personal Touches</p>
                  <p className="text-sm text-zinc-500">Use the additional info field to mention specific achievements or connections.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-950">Review Before Sending</p>
                  <p className="text-sm text-zinc-500">Always review and customize the generated letter to ensure it's perfect.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="rounded-lg border border-zinc-950/10 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-zinc-950 mb-4 flex items-center gap-2">
              <QuestionMarkCircleIcon className="h-5 w-5" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-zinc-200 pb-4 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-zinc-950 mb-2">{faq.question}</h3>
                  <p className="text-sm text-zinc-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
