import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  XMarkIcon, 
  DocumentArrowUpIcon, 
  PencilSquareIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CloudArrowUpIcon,
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  SparklesIcon,
  PhotoIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import { toast } from 'react-toastify';
import { getAccessToken } from '@/lib/apiClient';
import { LOGIN_ROUTE } from '@/lib/auth/routes';

const STEPS = {
  CHOOSE_METHOD: 0,
  UPLOAD_RESUME: 1,
  MANUAL_BASIC: 2,
  MANUAL_SKILLS: 3,
  MANUAL_EXPERIENCE: 4,
  MANUAL_EDUCATION: 5,
  REVIEW: 6,
  COMPLETE: 7,
};

export default function ProfileCompletionWizard({ isOpen, onClose, onComplete }) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.CHOOSE_METHOD);
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [resumeFile, setResumeFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    summary: user?.summary || '',
    skills: user?.skills || [],
    experience: user?.experience || [],
    education: user?.education || [],
  });
  
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentExperience, setCurrentExperience] = useState({
    title: '',
    company: '',
    duration: '',
    description: '',
  });
  const [currentEducation, setCurrentEducation] = useState({
    degree: '',
    institution: '',
    year: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        summary: user.summary || '',
        skills: user.skills || [],
        experience: user.experience || [],
        education: user.education || [],
      });
    }
  }, [isOpen, user]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or DOCX file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    setResumeFile(file);
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      toast.error('Please select a resume file');
      return;
    }

    setUploading(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('resume', resumeFile);

      const response = await fetch(`${API_URL}/api/resume/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse resume');
      }

      const data = await response.json();
      setParsedData(data.parsedData);
      
      if (data.parsedData) {
        setFormData(prev => ({
          ...prev,
          name: data.parsedData.name || prev.name,
          phone: data.parsedData.phone || prev.phone,
          summary: data.parsedData.summary || prev.summary,
          skills: data.parsedData.skills || prev.skills,
          experience: data.parsedData.experience || prev.experience,
          education: data.parsedData.education || prev.education,
        }));
      }

      toast.success('Resume parsed successfully!');
      setCurrentStep(STEPS.REVIEW);
    } catch (error) {
      toast.error(error.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      
      if (!token) {
        toast.error('Please log in to save your profile');
        router.push(LOGIN_ROUTE);
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        toast.error('Name is required');
        setCurrentStep(STEPS.MANUAL_BASIC);
        setLoading(false);
        return;
      }

      if (!formData.phone || !formData.phone.trim()) {
        toast.error('Phone number is required');
        setCurrentStep(STEPS.MANUAL_BASIC);
        setLoading(false);
        return;
      }

      if (!formData.location || !formData.location.trim()) {
        toast.error('Location is required');
        setCurrentStep(STEPS.MANUAL_BASIC);
        setLoading(false);
        return;
      }

      if (!formData.summary || !formData.summary.trim()) {
        toast.error('Professional summary is required');
        setCurrentStep(STEPS.MANUAL_BASIC);
        setLoading(false);
        return;
      }

      if (!formData.skills || formData.skills.length === 0) {
        toast.error('At least one skill is required');
        setCurrentStep(STEPS.MANUAL_SKILLS);
        setLoading(false);
        return;
      }

      if (!formData.experience || formData.experience.length === 0) {
        toast.error('At least one work experience is required');
        setCurrentStep(STEPS.MANUAL_EXPERIENCE);
        setLoading(false);
        return;
      }

      if (!formData.education || formData.education.length === 0) {
        toast.error('At least one education entry is required');
        setCurrentStep(STEPS.MANUAL_EDUCATION);
        setLoading(false);
        return;
      }

      // Prepare the data to send - ensure all fields are properly formatted
      const profileData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        summary: formData.summary.trim(),
        skills: formData.skills.map(skill => skill.trim()).filter(skill => skill.length > 0),
        experience: formData.experience.map(exp => ({
          title: exp.title?.trim() || '',
          company: exp.company?.trim() || '',
          duration: exp.duration?.trim() || '',
          description: exp.description?.trim() || '',
        })),
        education: formData.education.map(edu => ({
          degree: edu.degree?.trim() || '',
          institution: edu.institution?.trim() || '',
          year: edu.year?.trim() || '',
        })),
      };

      console.log('Saving profile data:', profileData);

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 400 && responseData.message) {
          const errorMessage = Array.isArray(responseData.message) 
            ? responseData.message.join(', ') 
            : responseData.message;
          throw new Error(errorMessage);
        }
        throw new Error(responseData.message || `Failed to save profile: ${response.status}`);
      }

      console.log('Profile saved successfully:', responseData);

      toast.success('Profile completed successfully!');
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      
      // Trigger profile update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profileUpdated'));
      }

      setCurrentStep(STEPS.COMPLETE);
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
        onClose();
        router.push('/candidate/profile');
      }, 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addExperience = () => {
    if (currentExperience.title && currentExperience.company) {
      setFormData(prev => ({
        ...prev,
        experience: [...prev.experience, { ...currentExperience }],
      }));
      setCurrentExperience({ title: '', company: '', duration: '', description: '' });
    }
  };

  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    if (currentEducation.degree && currentEducation.institution) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, { ...currentEducation }],
      }));
      setCurrentEducation({ degree: '', institution: '', year: '' });
    }
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.CHOOSE_METHOD:
        return 'Complete Your Profile';
      case STEPS.UPLOAD_RESUME:
        return 'Upload Your Resume';
      case STEPS.MANUAL_BASIC:
        return 'Basic Information';
      case STEPS.MANUAL_SKILLS:
        return 'Your Skills';
      case STEPS.MANUAL_EXPERIENCE:
        return 'Work Experience';
      case STEPS.MANUAL_EDUCATION:
        return 'Education';
      case STEPS.REVIEW:
        return 'Review Your Profile';
      case STEPS.COMPLETE:
        return 'Profile Complete!';
      default:
        return 'Complete Your Profile';
    }
  };

  const getProgress = () => {
    const totalSteps = method === 'upload' ? 3 : 6;
    const current = currentStep === STEPS.CHOOSE_METHOD ? 0 : 
                   currentStep === STEPS.REVIEW ? totalSteps - 1 :
                   currentStep === STEPS.COMPLETE ? totalSteps :
                   currentStep - (method === 'upload' ? 1 : 1);
    return Math.round((current / totalSteps) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{getStepTitle()}</h3>
                {currentStep !== STEPS.CHOOSE_METHOD && currentStep !== STEPS.COMPLETE && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary-100">Progress</span>
                      <span className="text-sm font-semibold text-white">{getProgress()}%</span>
                    </div>
                    <div className="w-full bg-primary-400/30 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getProgress()}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-4 rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {/* Step 0: Choose Method */}
            {currentStep === STEPS.CHOOSE_METHOD && (
              <div className="space-y-8">
                <div className="text-center">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Choose how you'd like to complete your profile
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setMethod('upload');
                      setCurrentStep(STEPS.UPLOAD_RESUME);
                    }}
                    className="group relative rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-left hover:border-primary-500 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 group-hover:scale-110 transition-transform duration-300">
                        <CloudArrowUpIcon className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upload Resume</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Upload your resume and we'll automatically extract your information using AI
                      </p>
                      <div className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700">
                        Get Started
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMethod('manual');
                      setCurrentStep(STEPS.MANUAL_BASIC);
                    }}
                    className="group relative rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-left hover:border-primary-500 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 group-hover:scale-110 transition-transform duration-300">
                        <PencilSquareIcon className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Complete Manually</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Fill out your profile step by step with our guided form
                      </p>
                      <div className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700">
                        Get Started
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Upload Resume */}
            {currentStep === STEPS.UPLOAD_RESUME && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">Upload your resume and we'll extract all the information automatically</p>
                </div>
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/30'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {resumeFile ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                          <DocumentArrowUpIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{resumeFile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setResumeFile(null)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                          <DocumentArrowUpIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Drag and drop your resume here
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">or</p>
                        <label className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                          <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                          Browse Files
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                          />
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Supports PDF and DOCX (Max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(STEPS.CHOOSE_METHOD)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleResumeUpload}
                    disabled={!resumeFile || uploading}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        Upload & Parse
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Manual - Basic Info */}
            {currentStep === STEPS.MANUAL_BASIC && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">Let's start with your basic information</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <UserIcon className="inline h-4 w-4 mr-1" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <PhoneIcon className="inline h-4 w-4 mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <MapPinIcon className="inline h-4 w-4 mr-1" />
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="San Francisco, CA"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Professional Summary *
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                      placeholder="Tell us about yourself, your experience, and what makes you unique..."
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formData.summary.length} characters</p>
                  </div>
                </div>
                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentStep(STEPS.CHOOSE_METHOD)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_SKILLS)}
                    disabled={!formData.name || !formData.phone || !formData.location || !formData.summary}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Manual - Skills */}
            {currentStep === STEPS.MANUAL_SKILLS && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">Add your skills and expertise</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Add Skills *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        placeholder="e.g., JavaScript, React, Node.js"
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                      <button
                        onClick={addSkill}
                        className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Press Enter or click Add to add a skill</p>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Your Skills ({formData.skills.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 text-primary-800 dark:text-primary-200 border border-primary-200 dark:border-primary-700"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(index)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_BASIC)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_EXPERIENCE)}
                    disabled={formData.skills.length === 0}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Manual - Experience */}
            {currentStep === STEPS.MANUAL_EXPERIENCE && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-gray-600">Add your work experience</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Title *</label>
                      <input
                        type="text"
                        value={currentExperience.title}
                        onChange={(e) => setCurrentExperience(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Senior Developer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company *</label>
                      <input
                        type="text"
                        value={currentExperience.company}
                        onChange={(e) => setCurrentExperience(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Tech Corp"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration</label>
                    <input
                      type="text"
                      value={currentExperience.duration}
                      onChange={(e) => setCurrentExperience(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., Jan 2020 - Present"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea
                      value={currentExperience.description}
                      onChange={(e) => setCurrentExperience(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                      placeholder="Describe your responsibilities and achievements..."
                    />
                  </div>
                  <button
                    onClick={addExperience}
                    disabled={!currentExperience.title || !currentExperience.company}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Experience
                  </button>
                </div>
                
                {formData.experience.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      Added Experience ({formData.experience.length})
                    </p>
                    {formData.experience.map((exp, index) => (
                      <div key={index} className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-between items-start hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{exp.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{exp.company}</p>
                          {exp.duration && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{exp.duration}</p>}
                          {exp.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{exp.description}</p>}
                        </div>
                        <button
                          onClick={() => removeExperience(index)}
                          className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_SKILLS)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_EDUCATION)}
                    disabled={formData.experience.length === 0}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Manual - Education */}
            {currentStep === STEPS.MANUAL_EDUCATION && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-gray-600">Add your educational background</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Degree *</label>
                      <input
                        type="text"
                        value={currentEducation.degree}
                        onChange={(e) => setCurrentEducation(prev => ({ ...prev, degree: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Bachelor of Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Institution *</label>
                      <input
                        type="text"
                        value={currentEducation.institution}
                        onChange={(e) => setCurrentEducation(prev => ({ ...prev, institution: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="University Name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Year</label>
                    <input
                      type="text"
                      value={currentEducation.year}
                      onChange={(e) => setCurrentEducation(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="e.g., 2020"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={addEducation}
                    disabled={!currentEducation.degree || !currentEducation.institution}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Education
                  </button>
                </div>
                
                {formData.education.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      Added Education ({formData.education.length})
                    </p>
                    {formData.education.map((edu, index) => (
                      <div key={index} className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-between items-start hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{edu.degree}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{edu.institution}</p>
                          {edu.year && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{edu.year}</p>}
                        </div>
                        <button
                          onClick={() => removeEducation(index)}
                          className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentStep(STEPS.MANUAL_EXPERIENCE)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(STEPS.REVIEW)}
                    disabled={formData.education.length === 0}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Review
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === STEPS.REVIEW && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400">Review your information before completing</p>
                </div>
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl p-6 border border-primary-200 dark:border-primary-800">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{formData.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{formData.phone}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{formData.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Summary</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{formData.summary}</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Skills ({formData.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded-lg text-sm font-medium border border-primary-200 dark:border-primary-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Experience ({formData.experience.length})
                    </h4>
                    <div className="space-y-4">
                      {formData.experience.map((exp, i) => (
                        <div key={i} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                          <h5 className="font-semibold text-gray-900 dark:text-gray-100">{exp.title}</h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{exp.company}</p>
                          {exp.duration && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{exp.duration}</p>}
                          {exp.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Education ({formData.education.length})
                    </h4>
                    <div className="space-y-4">
                      {formData.education.map((edu, i) => (
                        <div key={i} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                          <h5 className="font-semibold text-gray-900 dark:text-gray-100">{edu.degree}</h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{edu.institution}</p>
                          {edu.year && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{edu.year}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentStep(method === 'upload' ? STEPS.UPLOAD_RESUME : STEPS.MANUAL_EDUCATION)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Profile
                        <CheckCircleIcon className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 7: Complete */}
            {currentStep === STEPS.COMPLETE && (
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
                    <CheckCircleIcon className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">Profile Complete! 🎉</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Your profile has been successfully completed.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to your profile...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
