'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import {
  SparklesIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/catalyst/button';
import { Field, FieldGroup, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';
import { Textarea } from '@/components/catalyst/textarea';
import { Badge } from '@/components/catalyst/badge';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/catalyst/table';
import { Checkbox, CheckboxField } from '@/components/catalyst/checkbox';
import { toast } from 'react-toastify';
import RichTextEditor from '@/components/resume/RichTextEditor';
import ResumeStepper from '@/components/resume/ResumeStepper';
import TemplateSettings from '@/components/resume/TemplateSettings';
import ModernResumeEditor from '@/components/resume/ModernResumeEditor';
import ModernResumePreview from '@/components/resume/ModernResumePreview';
import {
  PhotoIcon,
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  TrophyIcon,
  UserGroupIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  LightBulbIcon,
  FolderIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  HeartIcon,
  CheckBadgeIcon,
  SwatchIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import DefaultPreview from '@/components/resume-builder/templates/DefaultPreview';
import FinanceTemplatePreview from '@/components/resume-builder/templates/FinanceTemplatePreview';

// Import template images - these will be used once images are added to the assets folder
// For now, we'll use a fallback system that shows placeholders if images don't exist
// To add images: Extract images from PDF and save them as:
// - frontend/public/resume-templates/modern.png
// - frontend/public/resume-templates/professional.png
// - frontend/public/resume-templates/creative.png
// - frontend/public/resume-templates/minimal.png
// - frontend/public/resume-templates/executive.png
// - frontend/public/resume-templates/ats-friendly.png

const WIZARD_STEPS = {
  DASHBOARD: 'dashboard', // New Dashboard Step
  UPLOAD_OR_NEW: 'upload-or-new',
  EDITOR: 'editor', // New unified editor with tabs
  EXPERT_REVIEW: 'expert-review', // Expert review options after resume creation
  TARGET_POSITIONS: 'target-positions', // Target positions, location, salary screen
  ACTION_OPTIONS: 'action-options', // Email or apply options
  MATCHING_JOBS: 'matching-jobs', // Show matching jobs for application
  PERSONAL: 'personal',
  SUMMARY: 'summary',
  SKILLS: 'skills',
  EXPERIENCE: 'experience',
  EDUCATION: 'education',
  CERTIFICATIONS: 'certifications',
  REFERENCES: 'references',
  COMPLETE: 'complete',
};

const EDITOR_TABS = {
  OVERVIEW: 'overview',
  CONTENT: 'content',
  CUSTOMIZE: 'customize',
  LINKS: 'links',
};

// Template images configuration
// To add images: Extract images from PDF and save them to:
// frontend/public/resume-templates/modern.png (or .jpg, .webp)
// Then update the preview paths below
// TODO: update the images later
const templates = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary design perfect for tech and creative roles',
    preview: '/resume-templates/modern.png', // Path in public folder
    color: 'blue',
    category: 'Popular',
    company: 'Ogilvy',
    isPro: false, // Free template
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional, formal layout ideal for corporate positions',
    preview: '/resume-templates/professional.png',
    color: 'zinc',
    category: 'Classic',
    company: 'Palantir',
    isPro: true,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold and unique design for designers and artists',
    preview: '/resume-templates/creative.png',
    color: 'purple',
    category: 'Creative',
    company: 'Kirkland & Ellis',
    isPro: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant, focuses on content',
    preview: '/resume-templates/minimal.png',
    color: 'gray',
    category: 'Simple',
    company: 'Mailchimp',
    isPro: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated layout for senior positions',
    preview: '/resume-templates/executive.png',
    color: 'indigo',
    category: 'Executive',
    company: 'Netflix',
    isPro: true,
  },
  {
    id: 'ats-friendly',
    name: 'ATS Friendly',
    description: 'Optimized for applicant tracking systems',
    preview: '/resume-templates/ats-friendly.png',
    color: 'green',
    category: 'ATS',
    company: 'Brex',
    isPro: true,
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Modern design for technology professionals',
    preview: '/resume-templates/modern.png',
    color: 'blue',
    category: 'Tech',
    company: 'Allbirds',
    isPro: true,
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Professional layout for finance roles',
    preview: '/resume-templates/professional.png',
    color: 'zinc',
    category: 'Finance',
    company: 'Palo Alto Networks',
    isPro: true,
  },
  {
    id: 'startup',
    name: 'Startup',
    description: 'Dynamic design for startup culture',
    preview: '/resume-templates/creative.png',
    color: 'purple',
    category: 'Startup',
    company: 'DoorDash',
    isPro: true,
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Traditional corporate layout',
    preview: '/resume-templates/executive.png',
    color: 'indigo',
    category: 'Corporate',
    company: 'BlackRock',
    isPro: true,
  },
];

const industries = [
  { value: 'all', label: 'All Industries' },
  { value: 'tech', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'healthcare', label: 'Healthcare' },
];

// Countries with their currencies
const countries = [
  { name: 'United States', code: 'US', currency: 'USD', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', currency: 'CAD', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', currency: 'AUD', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', currency: 'EUR', flag: '🇩🇪' },
  { name: 'France', code: 'FR', currency: 'EUR', flag: '🇫🇷' },
  { name: 'Netherlands', code: 'NL', currency: 'EUR', flag: '🇳🇱' },
  { name: 'Ireland', code: 'IE', currency: 'EUR', flag: '🇮🇪' },
  { name: 'Spain', code: 'ES', currency: 'EUR', flag: '🇪🇸' },
  { name: 'Italy', code: 'IT', currency: 'EUR', flag: '🇮🇹' },
  { name: 'Switzerland', code: 'CH', currency: 'CHF', flag: '🇨🇭' },
  { name: 'Sweden', code: 'SE', currency: 'SEK', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', currency: 'NOK', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', currency: 'DKK', flag: '🇩🇰' },
  { name: 'India', code: 'IN', currency: 'INR', flag: '🇮🇳' },
  { name: 'Singapore', code: 'SG', currency: 'SGD', flag: '🇸🇬' },
  { name: 'Japan', code: 'JP', currency: 'JPY', flag: '🇯🇵' },
  { name: 'South Korea', code: 'KR', currency: 'KRW', flag: '🇰🇷' },
  { name: 'Hong Kong', code: 'HK', currency: 'HKD', flag: '🇭🇰' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED', flag: '🇦🇪' },
  { name: 'Israel', code: 'IL', currency: 'ILS', flag: '🇮🇱' },
  { name: 'Brazil', code: 'BR', currency: 'BRL', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', currency: 'MXN', flag: '🇲🇽' },
  { name: 'Remote / Anywhere', code: 'REMOTE', currency: 'USD', flag: '🌍' },
];

// Currency symbols mapping
const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  SGD: 'S$',
  JPY: '¥',
  KRW: '₩',
  HKD: 'HK$',
  AED: 'AED',
  ILS: '₪',
  BRL: 'R$',
  MXN: '$',
};

// Cities by country
const citiesByCountry = {
  'United States': [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'Austin, TX', 'Jacksonville, FL', 'San Francisco, CA', 'Columbus, OH', 'Fort Worth, TX',
    'Charlotte, NC', 'Seattle, WA', 'Denver, CO', 'Washington, DC', 'Boston, MA',
    'Remote / Anywhere'
  ],
  'United Kingdom': [
    'London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool',
    'Leeds', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast',
    'Newcastle', 'Sheffield', 'Remote / Anywhere'
  ],
  'Canada': [
    'Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON',
    'Edmonton, AB', 'Winnipeg, MB', 'Quebec City, QC', 'Hamilton, ON', 'Kitchener, ON',
    'Remote / Anywhere'
  ],
  'Australia': [
    'Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA',
    'Gold Coast, QLD', 'Canberra, ACT', 'Newcastle, NSW', 'Remote / Anywhere'
  ],
  'Germany': [
    'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
    'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig',
    'Remote / Anywhere'
  ],
  'France': [
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
    'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
    'Remote / Anywhere'
  ],
  'Netherlands': [
    'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven',
    'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen',
    'Remote / Anywhere'
  ],
  'Ireland': [
    'Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford',
    'Drogheda', 'Dundalk', 'Swords', 'Remote / Anywhere'
  ],
  'Spain': [
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza',
    'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
    'Remote / Anywhere'
  ],
  'Italy': [
    'Rome', 'Milan', 'Naples', 'Turin', 'Palermo',
    'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania',
    'Remote / Anywhere'
  ],
  'Switzerland': [
    'Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne',
    'St. Gallen', 'Lucerne', 'Lugano', 'Remote / Anywhere'
  ],
  'Sweden': [
    'Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås',
    'Örebro', 'Linköping', 'Helsingborg', 'Remote / Anywhere'
  ],
  'Norway': [
    'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bærum',
    'Kristiansand', 'Fredrikstad', 'Remote / Anywhere'
  ],
  'Denmark': [
    'Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg',
    'Randers', 'Kolding', 'Remote / Anywhere'
  ],
  'India': [
    'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
    'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
    'Remote / Anywhere'
  ],
  'Singapore': [
    'Singapore', 'Remote / Anywhere'
  ],
  'Japan': [
    'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo',
    'Fukuoka', 'Kobe', 'Kyoto', 'Remote / Anywhere'
  ],
  'South Korea': [
    'Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon',
    'Gwangju', 'Ulsan', 'Remote / Anywhere'
  ],
  'Hong Kong': [
    'Hong Kong', 'Remote / Anywhere'
  ],
  'United Arab Emirates': [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Remote / Anywhere'
  ],
  'Israel': [
    'Tel Aviv', 'Jerusalem', 'Haifa', 'Rishon LeZion', 'Petah Tikva',
    'Ashdod', 'Netanya', 'Remote / Anywhere'
  ],
  'Brazil': [
    'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza',
    'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre',
    'Remote / Anywhere'
  ],
  'Mexico': [
    'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana',
    'León', 'Juárez', 'Torreón', 'Remote / Anywhere'
  ],
  'Remote / Anywhere': ['Remote / Anywhere']
};

// Job types
const jobTypes = [
  { value: 'full-time', label: 'Full-time', icon: '💼' },
  { value: 'part-time', label: 'Part-time', icon: '⏰' },
  { value: 'contract', label: 'Contract', icon: '📋' },
];

export default function AIResumeBuilder() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DASHBOARD); // Default to Dashboard
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [uploadMethod, setUploadMethod] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResume, setCurrentResume] = useState(null);
  const [previousResumes, setPreviousResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [showPreviousResumes, setShowPreviousResumes] = useState(false);
  
  // New state for dashboard tabs and filters
  const [dashboardTab, setDashboardTab] = useState('sample-library'); // 'my-resumes' or 'sample-library'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  const [resumeData, setResumeData] = useState({
    name: 'My Resume',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    photo: '', // Photo URL
    summary: '',
    profileSummary: '', // Profile Summary section
    skills: [],
    technicalSkills: [], // Separate technical skills
    experience: [],
    education: [],
    certifications: [],
    references: [], // Professional references
    projects: [],
    languages: [],
    interests: [],
    courses: [],
    awards: [],
    organizations: [],
    publications: [],
    declaration: '',
    custom: [],
  });

  // Template customization
  const [templateSettings, setTemplateSettings] = useState({
    colorScheme: 'blue', // blue, green, purple, orange, red, indigo
    fontFamily: 'inter', // inter, roboto, playfair, lato, montserrat
    fontSize: 'medium', // small, medium, large
  });

  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [currentEditorStep, setCurrentEditorStep] = useState('personal');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeTab, setActiveTab] = useState(EDITOR_TABS.CONTENT);
  const [editingSection, setEditingSection] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null); // Track which index is being edited

  // Fetch user plan/entitlements
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/entitlements`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUserPlan(data.planType || 'FREE');
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
      }
    };
    fetchUserPlan();
  }, [user]);

  // Browser History API integration for wizard navigation
  const navigateToStep = useCallback((step, replace = false) => {
    const query = { ...router.query, step };
    
    // Add resume ID to URL if we're in editor and have a current resume
    if (step === WIZARD_STEPS.EDITOR && currentResume) {
      const resumeId = currentResume._id || currentResume.id;
      if (resumeId) {
        query.resume = resumeId;
      }
    } else if (step !== WIZARD_STEPS.EDITOR && query.resume) {
      // Remove resume ID from URL if we're not in editor
      delete query.resume;
    }
    
    if (replace) {
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    } else {
      router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    }
    setCurrentStep(step);
  }, [router, currentResume]);

  // Check if user can access PRO template
  const canAccessProTemplate = (template) => {
    if (!template.isPro) return true;
    return userPlan === 'PRO' || userPlan === 'ELITE' || userPlan === 'INTERVIEW';
  };

  // Check required blocks completeness - memoized to prevent infinite loops
  const completenessValue = useMemo(() => ({
    personal: !!(resumeData.fullName && resumeData.email),
    experience: resumeData.experience && resumeData.experience.length > 0,
    education: resumeData.education && resumeData.education.length > 0,
  }), [resumeData.fullName, resumeData.email, resumeData.experience?.length, resumeData.education?.length]);

  // Update completeness state only when it actually changes
  useEffect(() => {
    if (currentStep === WIZARD_STEPS.EDITOR && currentResume) {
      setResumeCompleteness(prev => {
        const hasChanged = Object.keys(completenessValue).some(
          key => prev[key] !== completenessValue[key]
        );
        return hasChanged ? completenessValue : prev;
      });
    }
  }, [completenessValue, currentStep, currentResume]);

  // Check if resume is complete
  const checkResumeCompleteness = useCallback(() => {
    return Object.values(completenessValue).every(v => v === true);
  }, [completenessValue]);

  // Handle template switch with entitlement check
  const handleTemplateSwitch = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (template.isPro && !canAccessProTemplate(template)) {
      setSelectedProTemplate(template);
      setShowUpgradeModal(true);
      return;
    }

    setSelectedTemplate(templateId);
    // Update resume template in backend
    if (currentResume) {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      fetch(`${API_URL}/api/resume-builder/${currentResume._id || currentResume.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: templateId }),
      }).catch(err => console.error('Error updating template:', err));
    }
  };

  // Sync URL with current step on mount and route changes
  useEffect(() => {
    if (!router.isReady) return;
    
    const stepFromUrl = router.query.step;
    const resumeIdFromUrl = router.query.resume;
    
    // If resume ID is in URL and we don't have current resume, load it
    if (resumeIdFromUrl && typeof resumeIdFromUrl === 'string' && (!currentResume || (currentResume._id !== resumeIdFromUrl && currentResume.id !== resumeIdFromUrl))) {
      // Load resume by ID
      const loadResumeById = async () => {
        try {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          const response = await fetch(`${API_URL}/api/resume-builder/${resumeIdFromUrl}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            handleEditResume(data);
          }
        } catch (error) {
          console.error('Error loading resume from URL:', error);
        }
      };
      loadResumeById();
    }
    
    if (stepFromUrl && typeof stepFromUrl === 'string' && Object.values(WIZARD_STEPS).includes(stepFromUrl)) {
      setCurrentStep(stepFromUrl);
    } else if (!stepFromUrl) {
      // Set initial URL if no step in query
      const query = { ...router.query, step: WIZARD_STEPS.DASHBOARD };
      if (currentResume) {
        const resumeId = currentResume._id || currentResume.id;
        if (resumeId) query.resume = resumeId;
      }
      router.replace({ 
        pathname: router.pathname, 
        query
      }, undefined, { shallow: true });
    }
  }, [router.isReady, router.query.step, router.query.resume]);

  // Update URL when step or resume changes (but not from URL change)
  useEffect(() => {
    if (!router.isReady) return;
    
    const query = { ...router.query };
    let shouldUpdate = false;
    
    if (query.step !== currentStep) {
      query.step = currentStep;
      shouldUpdate = true;
    }
    
    // Update resume ID in URL if we have a current resume and we're in editor
    if (currentStep === WIZARD_STEPS.EDITOR && currentResume) {
      const resumeId = currentResume._id || currentResume.id;
      if (resumeId && query.resume !== resumeId) {
        query.resume = resumeId;
        shouldUpdate = true;
      }
    } else if (query.resume && currentStep !== WIZARD_STEPS.EDITOR) {
      // Remove resume from URL if we're not in editor
      delete query.resume;
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      router.replace({ 
        pathname: router.pathname, 
        query
      }, undefined, { shallow: true });
    }
  }, [currentStep, currentResume, router.isReady]);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState(null);
  const [showResumeNameModal, setShowResumeNameModal] = useState(false);
  const [resumeNameInput, setResumeNameInput] = useState('');
  const [addedSections, setAddedSections] = useState(['personal']); // Only personal info by default
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPDFPreview, setShowPDFPreview] = useState(true); // Toggle between PDF and HTML preview
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProTemplate, setSelectedProTemplate] = useState(null);
  const [userPlan, setUserPlan] = useState('FREE'); // Track user's plan
  const [selectedReviewPackage, setSelectedReviewPackage] = useState(null);
  const [targetPositions, setTargetPositions] = useState({
    position: '',
    country: '', // Single country selection
    cities: [], // Multiple city selection
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    salaryPeriod: 'year', // year, month, hour
    jobType: '', // full-time, part-time, contract
  });
  const [countryQuery, setCountryQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [loadingMatchingJobs, setLoadingMatchingJobs] = useState(false);
  const [hasMatchingJobs, setHasMatchingJobs] = useState(false);
  const [resumeCompleteness, setResumeCompleteness] = useState({
    personal: false,
    experience: false,
    education: false,
  });
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    summary: false,
    profileSummary: false,
    skills: false,
    experience: false,
    education: false,
    certifications: false,
    references: false,
    languages: false,
    interests: false,
    projects: false,
    courses: false,
    awards: false,
    organizations: false,
    publications: false,
    declaration: false,
    custom: false,
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentTechnicalSkill, setCurrentTechnicalSkill] = useState('');
  const [currentExperience, setCurrentExperience] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    responsibilities: '', // Rich text
  });
  const [currentEducation, setCurrentEducation] = useState({
    degree: '',
    institution: '',
    location: '',
    startDate: '',
    endDate: '',
    gpa: '',
    description: '',
  });
  const [currentCertification, setCurrentCertification] = useState({
    name: '',
    issuer: '',
    date: '',
    expiryDate: '',
    credentialId: '',
    credentialUrl: '',
  });
  const [currentReference, setCurrentReference] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    relationship: '',
  });
  const [currentLanguage, setCurrentLanguage] = useState({
    language: '',
    proficiency: 'Native',
  });
  const [currentProject, setCurrentProject] = useState({
    name: '',
    description: '',
    technologies: '',
    url: '',
    startDate: '',
    endDate: '',
  });
  const [currentInterest, setCurrentInterest] = useState('');
  const [currentCourse, setCurrentCourse] = useState({
    name: '',
    provider: '',
    date: '',
    certificateUrl: '',
  });
  const [currentAward, setCurrentAward] = useState({
    title: '',
    issuer: '',
    date: '',
    description: '',
  });
  const [currentOrganization, setCurrentOrganization] = useState({
    name: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [currentPublication, setCurrentPublication] = useState({
    title: '',
    publisher: '',
    date: '',
    url: '',
    description: '',
  });
  const [currentCustom, setCurrentCustom] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    fetchPreviousResumes();
  }, []);

  // Auto-generate PDF when editor opens and ensure preview URL is set
  useEffect(() => {
    if (currentStep === WIZARD_STEPS.EDITOR && currentResume) {
      ensurePDFPreview();
    }
  }, [currentStep, currentResume?._id, currentResume?.id]);

  // Update PDF preview URL when resume data changes (debounced)
  useEffect(() => {
    if (currentStep === WIZARD_STEPS.EDITOR && currentResume) {
      const timeoutId = setTimeout(() => {
        ensurePDFPreview();
      }, 2000); // Wait 2 seconds after last change
      return () => clearTimeout(timeoutId);
    }
  }, [resumeData, templateSettings]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const ensurePDFPreview = async () => {
    if (!currentResume) return;

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found');
      return;
    }

    const resumeId = currentResume._id || currentResume.id;
    if (!resumeId) {
      console.error('No resume ID found');
      return;
    }

    try {
      // First, try to load existing PDF
      const pdfUrl = `${API_URL}/api/resume-builder/${resumeId}/pdf`;
      const checkResponse = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        // PDF exists, load it
        await loadPDFPreview(resumeId, token);
        return;
      }

      // PDF doesn't exist, generate it
      if (checkResponse.status === 404) {
        setPdfGenerating(true);
        try {
          const generateResponse = await fetch(`${API_URL}/api/resume-builder/${resumeId}/generate-pdf`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (generateResponse.ok) {
            const data = await generateResponse.json();
            setCurrentResume(prev => ({ ...prev, pdfUrl: data.pdfUrl }));
            toast.success('PDF generated successfully!');
            // Wait a bit for PDF to be written to disk, then load it
            // Try multiple times in case file isn't ready immediately
            let attempts = 0;
            const maxAttempts = 5;
            const tryLoadPDF = async () => {
              attempts++;
              console.log(`Attempting to load PDF (attempt ${attempts}/${maxAttempts})`);
              const success = await loadPDFPreview(resumeId, token);
              if (!success && attempts < maxAttempts) {
                setTimeout(tryLoadPDF, 1000);
              } else if (attempts >= maxAttempts) {
                setPdfGenerating(false);
                toast.error('PDF generated but failed to load. Showing HTML preview instead.');
                setShowPDFPreview(false);
              } else {
                setPdfGenerating(false);
              }
            };
            setTimeout(tryLoadPDF, 2000); // Initial wait
          } else {
            const errorData = await generateResponse.json().catch(() => ({ message: 'Unknown error' }));
            console.error('PDF generation failed:', errorData);
            toast.error(errorData.message || 'Failed to generate PDF');
            setPdfGenerating(false);
          }
        } catch (error) {
          console.error('Error generating PDF:', error);
          toast.error('Error generating PDF. Please try again.');
          setPdfGenerating(false);
        }
      } else {
        // Other error
        console.error('Error checking PDF:', checkResponse.status);
        setPdfGenerating(false);
      }
    } catch (error) {
      console.error('Error ensuring PDF preview:', error);
      setPdfGenerating(false);
    }
  };

  const loadPDFPreview = async (resumeId, token) => {
    try {
      const pdfUrl = `${API_URL}/api/resume-builder/${resumeId}/pdf`;
      console.log('Loading PDF from:', pdfUrl);
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        console.log('PDF blob received:', blob.type, blob.size, 'bytes');

        // Verify it's actually a PDF
        if (blob.type === 'application/pdf' || blob.size > 0) {
          const objectUrl = window.URL.createObjectURL(blob);
          // Clean up previous URL if exists
          if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
            window.URL.revokeObjectURL(pdfPreviewUrl);
          }
          setPdfPreviewUrl(objectUrl);
          console.log('PDF preview loaded successfully, object URL created');
          return true;
        } else {
          console.error('Invalid PDF blob received:', blob.type, blob.size);
          setPdfPreviewUrl(null);
          return false;
        }
      } else if (response.status === 404) {
        // PDF doesn't exist yet
        console.log('PDF not found (404)');
        setPdfPreviewUrl(null);
        return false;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error loading PDF:', response.status, errorText);
        setPdfPreviewUrl(null);
        return false;
      }
    } catch (error) {
      console.error('Error loading PDF preview:', error);
      setPdfPreviewUrl(null);
      return false;
    }
  };

  useEffect(() => {
    if (user && currentResume && (
      currentStep === WIZARD_STEPS.PERSONAL ||
      currentStep === WIZARD_STEPS.SUMMARY ||
      currentStep === WIZARD_STEPS.SKILLS ||
      currentStep === WIZARD_STEPS.EXPERIENCE ||
      currentStep === WIZARD_STEPS.EDUCATION
    )) {
      setResumeData(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        location: prev.location || user.location || '',
        summary: prev.summary || user.summary || '',
        skills: prev.skills.length > 0 ? prev.skills : (user.skills || []),
        experience: prev.experience.length > 0 ? prev.experience : (user.experience || []),
        education: prev.education.length > 0 ? prev.education : (user.education || []),
      }));
    }
  }, [user, currentStep, currentResume]);

  // Update currentEditorStep when currentStep changes
  useEffect(() => {
    if ([
      WIZARD_STEPS.PERSONAL,
      WIZARD_STEPS.SUMMARY,
      WIZARD_STEPS.SKILLS,
      WIZARD_STEPS.EXPERIENCE,
      WIZARD_STEPS.EDUCATION,
      WIZARD_STEPS.CERTIFICATIONS,
      WIZARD_STEPS.REFERENCES,
    ].includes(currentStep)) {
      setCurrentEditorStep(currentStep);
    }
  }, [currentStep]);

  // Helper function to determine which sections should be added based on resume data
  const determineAddedSections = (data) => {
    const sections = ['personal']; // Always include personal

    // Check each section for data
    if (data.summary && data.summary.trim()) sections.push('summary');
    if (data.profileSummary && data.profileSummary.trim()) sections.push('profileSummary');
    if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) sections.push('skills');
    if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) sections.push('experience');
    if (data.education && Array.isArray(data.education) && data.education.length > 0) sections.push('education');
    if (data.certifications && Array.isArray(data.certifications) && data.certifications.length > 0) sections.push('certifications');
    if (data.references && Array.isArray(data.references) && data.references.length > 0) sections.push('references');
    if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) sections.push('languages');
    if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) sections.push('interests');
    if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) sections.push('projects');
    if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) sections.push('courses');
    if (data.awards && Array.isArray(data.awards) && data.awards.length > 0) sections.push('awards');
    if (data.organizations && Array.isArray(data.organizations) && data.organizations.length > 0) sections.push('organizations');
    if (data.publications && Array.isArray(data.publications) && data.publications.length > 0) sections.push('publications');
    if (data.declaration && data.declaration.trim()) sections.push('declaration');
    if (data.custom && Array.isArray(data.custom) && data.custom.length > 0) sections.push('custom');

    return sections;
  };

  const fetchPreviousResumes = async () => {
    setLoadingResumes(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPreviousResumes(data);
      }
    } catch (error) {
      console.error('Error fetching previous resumes:', error);
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // If pro template and user doesn't have pro entitlement, show upgrade modal
    if (template.isPro && !canAccessProTemplate(template)) {
      setSelectedProTemplate(template);
      setShowUpgradeModal(true);
      return;
    }

    // Free template or user has pro entitlement - show resume name modal
    setSelectedTemplate(templateId);
    setShowResumeNameModal(true);
  };

  const handleMethodSelect = (method) => {
    setUploadMethod(method);
    // Don't auto-create, let user proceed manually
  };

  const handleFileUpload = async () => {
    if (!resumeFile) {
      toast.error('Please select a file');
      return;
    }

    // Show modal to get resume name if not already provided
    if (!resumeNameInput.trim()) {
      setShowResumeNameModal(true);
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('template', selectedTemplate || 'modern');
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
        setCurrentResume(data);

        const resumeDataToSet = {
          name: data.name || resumeNameInput.trim() || 'My Resume',
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          website: data.website || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          summary: data.summary || '',
          profileSummary: data.profileSummary || '',
          skills: data.skills || [],
          experience: data.experience || [],
          education: data.education || [],
          certifications: data.certifications || [],
          references: data.references || [],
          projects: data.projects || [],
          languages: data.languages || [],
          interests: data.interests || [],
          courses: data.courses || [],
          awards: data.awards || [],
          organizations: data.organizations || [],
          publications: data.publications || [],
          declaration: data.declaration || '',
          custom: data.custom || [],
        };

        setResumeData(resumeDataToSet);

        // Determine which sections should be added based on the loaded data
        const sectionsToAdd = determineAddedSections(resumeDataToSet);
        setAddedSections(sectionsToAdd);

        setShowResumeNameModal(false);
        setResumeNameInput('');
        navigateToStep(WIZARD_STEPS.EDITOR);
        toast.success('Resume uploaded and parsed successfully!');
        // Refresh previous resumes list
        fetchPreviousResumes();
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

  const handleCreateNew = async () => {
    // Show modal to get resume name
    if (!resumeNameInput.trim()) {
      setShowResumeNameModal(true);
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to create a resume');
        setIsGenerating(false);
        return;
      }

      const requestBody = {
        template: selectedTemplate || 'modern',
        name: resumeNameInput.trim() || 'My Resume',
        importFromProfile: true,
      };

      console.log('Creating resume with:', { template: selectedTemplate || 'modern', name: requestBody.name });
      console.log('API URL:', `${API_URL}/api/resume-builder`);

      const response = await fetch(`${API_URL}/api/resume-builder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.ok) {
        let data;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('Resume data received:', data);
          } else {
            const responseText = await response.text();
            console.error('Unexpected content type. Response:', responseText);
            throw new Error('Server returned non-JSON response');
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          throw new Error('Invalid response from server');
        }

        // Handle both _id and id formats from backend
        const resumeId = data._id || data.id;
        console.log('Resume created with ID:', resumeId);

        setCurrentResume({
          ...data,
          id: resumeId,
          _id: resumeId,
        });
        const resumeDataToSet = {
          name: data.name || resumeNameInput.trim() || 'My Resume',
          fullName: data.fullName || user?.name || '',
          email: data.email || user?.email || '',
          phone: data.phone || user?.phone || '',
          location: data.location || user?.location || '',
          website: data.website || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          summary: data.summary || user?.summary || '',
          profileSummary: data.profileSummary || '',
          skills: data.skills || user?.skills || [],
          experience: data.experience || user?.experience || [],
          education: data.education || user?.education || [],
          certifications: data.certifications || [],
          references: data.references || [],
          projects: data.projects || [],
          languages: data.languages || [],
          interests: data.interests || [],
          courses: data.courses || [],
          awards: data.awards || [],
          organizations: data.organizations || [],
          publications: data.publications || [],
          declaration: data.declaration || '',
          custom: data.custom || [],
        };

        setResumeData(resumeDataToSet);

        // Determine which sections should be added based on the loaded data
        const sectionsToAdd = determineAddedSections(resumeDataToSet);
        setAddedSections(sectionsToAdd);

        setShowResumeNameModal(false);
        setResumeNameInput('');
        navigateToStep(WIZARD_STEPS.EDITOR);
        toast.success('Resume created successfully!');
        // Refresh previous resumes list
        fetchPreviousResumes();
      } else {
        let errorMessage = 'Failed to create resume';
        try {
          const responseText = await response.text();
          console.error('Error response text:', responseText);
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
              if (errorData.errors) {
                // Handle validation errors
                const validationErrors = Array.isArray(errorData.errors)
                  ? errorData.errors.join(', ')
                  : Object.values(errorData.errors).flat().join(', ');
                errorMessage = validationErrors || errorMessage;
              }
            } catch (parseError) {
              // Response is not JSON, use as-is
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (e) {
          // If we can't read the response, use status text
          errorMessage = response.statusText || errorMessage;
          console.error('Error reading error response:', e);
        }
        console.error('Error response:', response.status, errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating resume:', error);
      toast.error(error.message || 'Error creating resume. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section) => {
    if (!currentResume) return;

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder/${currentResume._id || currentResume.id}/regenerate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ section }),
      });

      if (response.ok) {
        const data = await response.json();

        if (section === 'summary') {
          setResumeData(prev => ({ ...prev, summary: data.content }));
        } else if (section === 'profileSummary') {
          setResumeData(prev => ({ ...prev, profileSummary: data.content }));
        } else if (section === 'skills') {
          const skills = data.content.split(',').map(s => s.trim()).filter(Boolean);
          setResumeData(prev => ({ ...prev, skills }));
        }

        toast.success(`${section} regenerated successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to regenerate ${section}`);
      }
    } catch (error) {
      console.error(`Error regenerating ${section}:`, error);
      toast.error(`Error regenerating ${section}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExperience = async () => {
    if (!currentExperience.title || !currentExperience.company) {
      toast.error('Please enter a job title and company first');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      // Use the generic regenerate endpoint but pass context for specific experience generation
      const response = await fetch(`${API_URL}/api/resume-builder/${currentResume?._id || currentResume?.id || 'temp'}/regenerate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: 'experience_responsibilities',
          context: {
            title: currentExperience.title,
            company: currentExperience.company,
            current: currentExperience.current
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentExperience(prev => ({ ...prev, responsibilities: data.content }));
        toast.success('Responsibilities generated successfully!');
      } else {
        // Mock fallback if backend endpoint is not yet capable of experience generation
        console.warn('Backend generation failed, using fallback mock.');
        setTimeout(() => {
          const mockContent = `<ul>
              <li>Spearheaded development initiatives at ${currentExperience.company} as ${currentExperience.title}, driving key project milestones.</li>
              <li>Collaborated with cross-functional teams to optimize workflows and enhance productivity.</li>
              <li>Implemented scalable solutions resulting in improved performance and user satisfaction.</li>
            </ul>`;
          setCurrentExperience(prev => ({ ...prev, responsibilities: mockContent }));
          toast.success('Responsibilities generated (Demo Mode)!');
        }, 1000);
      }
    } catch (error) {
      console.error('Error generating experience:', error);
      toast.error('Error generating experience');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSkills = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      // Determine context - use most recent experience if available
      const latestExperience = resumeData.experience && resumeData.experience.length > 0
        ? resumeData.experience[0]
        : null;

      const context = {
        title: latestExperience ? latestExperience.title : 'Professional',
        industry: latestExperience ? latestExperience.company : 'Tech'
      };

      const response = await fetch(`${API_URL}/api/resume-builder/${currentResume?._id || currentResume?.id || 'temp'}/regenerate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: 'skills',
          context: context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Backend should return comma separated skills or a list
        let skills = [];
        if (Array.isArray(data.content)) {
          skills = data.content;
        } else if (typeof data.content === 'string') {
          skills = data.content.split(/,|\n/).map(s => s.trim()).filter(Boolean);
        }

        // Merge with existing skills to avoid losing them
        setResumeData(prev => {
          const existingSkills = prev.skills || [];
          // Combine and unique
          const combined = [...new Set([...existingSkills, ...skills])];
          return { ...prev, skills: combined };
        });

        if (!expandedSections.skills) {
          setExpandedSections(prev => ({ ...prev, skills: true }));
        }

        toast.success('Skills generated successfully!');
      } else {
        // Mock fallback
        console.warn('Backend generation failed, using fallback mock.');
        setTimeout(() => {
          const role = context.title.toLowerCase();
          let mockSkills = ['Communication', 'Teamwork', 'Problem Solving'];

          if (role.includes('developer') || role.includes('engineer') || role.includes('software')) {
            mockSkills = ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git', 'Agile', 'Jira', 'AWS'];
          } else if (role.includes('manager') || role.includes('lead')) {
            mockSkills = ['Leadership', 'Strategic Planning', 'Project Management', 'Agile', 'Stakeholder Management'];
          } else if (role.includes('designer')) {
            mockSkills = ['Figma', 'Adobe XD', 'UI/UX', 'Prototyping', 'Wireframing', 'User Research'];
          }

          setResumeData(prev => {
            const existingSkills = prev.skills || [];
            const combined = [...new Set([...existingSkills, ...mockSkills])];
            return { ...prev, skills: combined };
          });

          if (!expandedSections.skills) {
            setExpandedSections(prev => ({ ...prev, skills: true }));
          }

          toast.success('Skills generated (Demo Mode)!');
        }, 1000);
      }
    } catch (error) {
      console.error('Error generating skills:', error);
      toast.error('Error generating skills');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentResume) {
      toast.error('No resume to save');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder/${currentResume._id || currentResume.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(resumeData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentResume(data);
        toast.success('Resume saved successfully!');
        // Stay in editor, don't redirect to complete
        // Refresh previous resumes list
        fetchPreviousResumes();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save resume');
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Error saving resume');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!currentResume) return;

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder/${currentResume._id || currentResume.id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentResume(prev => ({ ...prev, pdfUrl: data.pdfUrl }));
        toast.success('PDF generated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewPDF = async () => {
    if (!currentResume) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resumeId = currentResume._id || currentResume.id;
      const pdfUrl = `${API_URL}/api/resume-builder/${resumeId}/pdf`;

      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to view PDF. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentResume) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resumeId = currentResume._id || currentResume.id;
      const pdfUrl = `${API_URL}/api/resume-builder/${resumeId}/pdf`;

      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${resumeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleDeleteResume = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/resume-builder/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setPreviousResumes(prev => prev.filter(resume => (resume.id || resume._id) !== id));
        toast.success('Resume deleted successfully');
        // If we deleted the current resume, reset
        if (currentResume && (currentResume._id === id || currentResume.id === id)) {
          setCurrentResume(null);
          navigateToStep(WIZARD_STEPS.DASHBOARD);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete resume');
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Error deleting resume');
    }
  };

  const handleEditResume = async (resume) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resumeId = resume.id || resume._id;
      const response = await fetch(`${API_URL}/api/resume-builder/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentResume(data);
        setSelectedTemplate(data.template);

        const resumeDataToSet = {
          name: data.name || 'My Resume',
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          website: data.website || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          summary: data.summary || '',
          profileSummary: data.profileSummary || '',
          skills: data.skills || [],
          experience: data.experience || [],
          education: data.education || [],
          certifications: data.certifications || [],
          references: data.references || [],
          projects: data.projects || [],
          languages: data.languages || [],
          interests: data.interests || [],
          courses: data.courses || [],
          awards: data.awards || [],
          organizations: data.organizations || [],
          publications: data.publications || [],
          declaration: data.declaration || '',
          custom: data.custom || [],
        };

        setResumeData(resumeDataToSet);

        // Determine which sections should be added based on the loaded data
        const sectionsToAdd = determineAddedSections(resumeDataToSet);
        setAddedSections(sectionsToAdd);

        // Expand sections that have data
        const expandedToSet = {
          personal: true,
          summary: !!data.summary,
          profileSummary: !!data.profileSummary,
          skills: (data.skills && data.skills.length > 0),
          experience: (data.experience && data.experience.length > 0),
          education: (data.education && data.education.length > 0),
          certifications: (data.certifications && data.certifications.length > 0),
          references: (data.references && data.references.length > 0),
          languages: (data.languages && data.languages.length > 0),
          interests: (data.interests && data.interests.length > 0),
          projects: (data.projects && data.projects.length > 0),
          courses: (data.courses && data.courses.length > 0),
          awards: (data.awards && data.awards.length > 0),
          organizations: (data.organizations && data.organizations.length > 0),
          publications: (data.publications && data.publications.length > 0),
          declaration: !!data.declaration,
          custom: (data.custom && data.custom.length > 0),
        };
        setExpandedSections(expandedToSet);

        navigateToStep(WIZARD_STEPS.EDITOR);
        setShowPreviousResumes(false);
        toast.success('Resume loaded for editing');
      } else {
        toast.error('Failed to load resume');
      }
    } catch (error) {
      console.error('Error loading resume:', error);
      toast.error('Error loading resume');
    }
  };

  const handleViewResumePDF = async (resume) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resumeId = resume.id || resume._id;
      const pdfUrl = `${API_URL}/api/resume-builder/${resumeId}/pdf`;

      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to view PDF. Please try again.');
    }
  };

  const addExperience = () => {
    if (!currentExperience.title || !currentExperience.company) {
      toast.error('Please fill in title and company');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      experience: [...(prev.experience || []), { ...currentExperience }],
    }));
    setCurrentExperience({
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      responsibilities: '',
    });
    toast.success('Experience added!');
  };

  const addCertification = () => {
    if (!currentCertification.name || !currentCertification.issuer) {
      toast.error('Please fill in certification name and issuer');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), { ...currentCertification }],
    }));
    setCurrentCertification({
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      credentialId: '',
      credentialUrl: '',
    });
    toast.success('Certification added!');
  };

  const addReference = () => {
    if (!currentReference.name || !currentReference.email) {
      toast.error('Please fill in reference name and email');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      references: [...(prev.references || []), { ...currentReference }],
    }));
    setCurrentReference({
      name: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      relationship: '',
    });
    toast.success('Reference added!');
  };

  const addTechnicalSkill = () => {
    if (currentTechnicalSkill.trim()) {
      setResumeData(prev => ({
        ...prev,
        technicalSkills: [...(prev.technicalSkills || []), currentTechnicalSkill.trim()],
      }));
      setCurrentTechnicalSkill('');
    }
  };

  const addEducation = () => {
    if (!currentEducation.degree || !currentEducation.institution) {
      toast.error('Please fill in degree and institution');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      education: [...(prev.education || []), { ...currentEducation }],
    }));
    setCurrentEducation({
      degree: '',
      institution: '',
      location: '',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
    });
    toast.success('Education added!');
  };

  const addLanguage = () => {
    if (!currentLanguage.language) {
      toast.error('Please fill in language');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      languages: [...(prev.languages || []), { ...currentLanguage }],
    }));
    setCurrentLanguage({ language: '', proficiency: 'Native' });
    toast.success('Language added!');
  };

  const addProject = () => {
    if (!currentProject.name) {
      toast.error('Please fill in project name');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      projects: [...(prev.projects || []), { ...currentProject }],
    }));
    setCurrentProject({ name: '', description: '', technologies: '', url: '', startDate: '', endDate: '' });
    toast.success('Project added!');
  };

  const addInterest = () => {
    if (!currentInterest.trim()) {
      toast.error('Please enter an interest');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      interests: [...(prev.interests || []), currentInterest.trim()],
    }));
    setCurrentInterest('');
    toast.success('Interest added!');
  };

  const addCourse = () => {
    if (!currentCourse.name) {
      toast.error('Please fill in course name');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      courses: [...(prev.courses || []), { ...currentCourse }],
    }));
    setCurrentCourse({ name: '', provider: '', date: '', certificateUrl: '' });
    toast.success('Course added!');
  };

  const addAward = () => {
    if (!currentAward.title) {
      toast.error('Please fill in award title');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      awards: [...(prev.awards || []), { ...currentAward }],
    }));
    setCurrentAward({ title: '', issuer: '', date: '', description: '' });
    toast.success('Award added!');
  };

  const addOrganization = () => {
    if (!currentOrganization.name) {
      toast.error('Please fill in organization name');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      organizations: [...(prev.organizations || []), { ...currentOrganization }],
    }));
    setCurrentOrganization({ name: '', role: '', startDate: '', endDate: '', description: '' });
    toast.success('Organization added!');
  };

  const addPublication = () => {
    if (!currentPublication.title) {
      toast.error('Please fill in publication title');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      publications: [...(prev.publications || []), { ...currentPublication }],
    }));
    setCurrentPublication({ title: '', publisher: '', date: '', url: '', description: '' });
    toast.success('Publication added!');
  };

  const addCustom = () => {
    if (!currentCustom.title) {
      toast.error('Please fill in custom section title');
      return;
    }
    setResumeData(prev => ({
      ...prev,
      custom: [...(prev.custom || []), { ...currentCustom }],
    }));
    setCurrentCustom({ title: '', content: '' });
    toast.success('Custom section added!');
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setResumeData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  // Step navigation helpers
  const handleStepClick = (stepId) => {
    if (currentResume) {
      setCurrentStep(stepId);
      setCurrentEditorStep(stepId);
    }
  };

  const handleNextStep = () => {
    const steps = [
      WIZARD_STEPS.PERSONAL,
      WIZARD_STEPS.SUMMARY,
      WIZARD_STEPS.SKILLS,
      WIZARD_STEPS.EXPERIENCE,
      WIZARD_STEPS.EDUCATION,
      WIZARD_STEPS.CERTIFICATIONS,
      WIZARD_STEPS.REFERENCES,
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      setCurrentEditorStep(nextStep);
    }
  };

  const handlePreviousStep = () => {
    const steps = [
      WIZARD_STEPS.PERSONAL,
      WIZARD_STEPS.SUMMARY,
      WIZARD_STEPS.SKILLS,
      WIZARD_STEPS.EXPERIENCE,
      WIZARD_STEPS.EDUCATION,
      WIZARD_STEPS.CERTIFICATIONS,
      WIZARD_STEPS.REFERENCES,
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      setCurrentStep(prevStep);
      setCurrentEditorStep(prevStep);
    }
  };

  const markStepComplete = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case WIZARD_STEPS.UPLOAD_OR_NEW: return uploadMethod === 'upload' ? 'Upload Your Resume' : 'Create New Resume';
      case WIZARD_STEPS.EDITOR: return 'Edit Your Resume';
      case WIZARD_STEPS.COMPLETE: return 'Resume Complete!';
      default: return 'Resume Builder';
    }
  };

  const getProgress = () => {
    const steps = [
      WIZARD_STEPS.UPLOAD_OR_NEW,
      WIZARD_STEPS.PERSONAL_INFO,
      WIZARD_STEPS.SUMMARY,
      WIZARD_STEPS.EXPERIENCE,
      WIZARD_STEPS.EDUCATION,
      WIZARD_STEPS.SKILLS,
      WIZARD_STEPS.PREVIEW,
    ];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;
  };

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Head>
        <title>AI Resume Builder | Jobocate</title>
        <meta name="description" content="Build professional resumes with AI" />
      </Head>
      <DashboardLayout>
        <div className="min-h-screen bg-white dark:bg-zinc-900">

          {/* Main Content - Full Width */}
          <div className="w-full px-8">
            {/* Dashboard Step - My Resumes Grid */}
            {currentStep === WIZARD_STEPS.DASHBOARD && (
              <div className="w-full px-6 py-8 bg-white dark:bg-zinc-900 min-h-[80vh]">
                <div className="max-w-7xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Resume Builder</h1>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => navigateToStep(WIZARD_STEPS.UPLOAD_OR_NEW)} 
                        className="px-4 py-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-colors text-sm font-medium flex items-center"
                      >
                        <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                        Upload
                      </button>
                      <button 
                        onClick={() => navigateToStep(WIZARD_STEPS.UPLOAD_OR_NEW)} 
                        className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md flex items-center"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Create New
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800 mb-8">
                    <button
                      onClick={() => setDashboardTab('my-resumes')}
                      className={`pb-4 px-1 text-sm font-semibold transition-all duration-200 relative ${
                        dashboardTab === 'my-resumes'
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      My Resumes
                      {dashboardTab === 'my-resumes' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setDashboardTab('sample-library')}
                      className={`pb-4 px-1 text-sm font-semibold transition-all duration-200 relative ${
                        dashboardTab === 'sample-library'
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      Templates
                      {dashboardTab === 'sample-library' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></span>
                      )}
                    </button>
                  </div>

                  {/* Search and Filter Bar - Only show for Templates */}
                  {dashboardTab === 'sample-library' && (
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex-1 relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search resume template"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={selectedIndustry}
                          onChange={(e) => setSelectedIndustry(e.target.value)}
                          className="appearance-none pl-4 pr-10 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer transition-all min-w-[160px]"
                        >
                          {industries.map((industry) => (
                            <option key={industry.value} value={industry.value}>
                              {industry.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* My Resumes Tab Content */}
                  {dashboardTab === 'my-resumes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                      {/* Create New Card */}
                      <div
                        onClick={() => navigateToStep(WIZARD_STEPS.UPLOAD_OR_NEW)}
                        className="group aspect-[3/4] border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all duration-300"
                      >
                        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors mb-4">
                          <PlusIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-primary-700 dark:group-hover:text-primary-400">Create New Resume</h3>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Start from a template</p>
                      </div>

                      {/* Existing Resumes */}
                      {loadingResumes ? (
                        [1, 2, 3, 4].map((_, i) => (
                          <div key={i} className="aspect-[3/4] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse">
                            <div className="w-full h-3/4 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4"></div>
                            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2"></div>
                          </div>
                        ))
                      ) : (
                        previousResumes.map((resume) => (
                        <div
                          key={resume.id || resume._id}
                          onClick={() => handleEditResume(resume)}
                          className="group relative aspect-[3/4] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                        >
                          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 relative overflow-hidden p-4 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
                            {/* Template Preview Image */}
                            {(() => {
                              const templateConfig = templates.find(t => t.id === (resume.template || 'modern'));
                              return templateConfig?.preview ? (
                                <div className="w-full h-full shadow-sm border border-zinc-100 dark:border-zinc-700 rounded overflow-hidden scale-[0.9] origin-top group-hover:scale-100 transition-transform duration-500">
                                  <img 
                                    src={templateConfig.preview} 
                                    alt={resume.name} 
                                    className="w-full h-full object-cover object-top"
                                  />
                                </div>
                              ) : (
                                /* Fallback Placeholder */
                                <div className="w-full h-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-700 rounded flex flex-col p-3 scale-[0.9] origin-top group-hover:scale-100 transition-transform duration-500">
                                  <div className="w-1/3 h-2 bg-zinc-800 dark:bg-zinc-200 rounded mb-4"></div>
                                  <div className="space-y-2">
                                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="w-5/6 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                  </div>
                                  <div className="mt-6 flex gap-3">
                                    <div className="w-1/4 h-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                                    <div className="flex-1 space-y-2">
                                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                              <div
                                onClick={(e) => { e.stopPropagation(); handleEditResume(resume); }}
                                className="p-2 bg-white rounded-full text-zinc-900 hover:text-primary-600 hover:scale-110 transition-all shadow-lg"
                                title="Edit"
                              >
                                <PencilIcon className="w-5 h-5" />
                              </div>
                              <div
                                onClick={(e) => { e.stopPropagation(); handleDeleteResume(resume.id || resume._id); }}
                                className="p-2 bg-white rounded-full text-zinc-900 hover:text-red-600 hover:scale-110 transition-all shadow-lg"
                                title="Delete"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </div>
                              {resume.pdfUrl && (
                                <div
                                  onClick={(e) => { e.stopPropagation(); handleViewResumePDF(resume); }}
                                  className="p-2 bg-white rounded-full text-zinc-900 hover:text-indigo-600 hover:scale-110 transition-all shadow-lg"
                                  title="View PDF"
                                >
                                  <EyeIcon className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative z-10">
                            <h3 className="font-semibold text-zinc-900 dark:text-white truncate" title={resume.name}>{resume.name || 'Untitled Resume'}</h3>
                            <div className="flex items-center justify-between mt-2">
                              <Badge color="zinc" className="text-[10px] px-1.5 py-0">
                                {resume.template || 'Modern'}
                              </Badge>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatDate(resume.updatedAt || resume.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    </div>
                  )}

                  {/* Templates Tab Content */}
                  {dashboardTab === 'sample-library' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                      {templates
                        .filter((template) => {
                          const matchesSearch = searchQuery === '' || 
                            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            template.description.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesIndustry = selectedIndustry === 'all' || 
                            template.category.toLowerCase() === selectedIndustry.toLowerCase();
                          return matchesSearch && matchesIndustry;
                        })
                        .map((template) => (
                          <div
                            key={template.id}
                            onClick={() => {
                              setSelectedTemplate(template.id);
                              navigateToStep(WIZARD_STEPS.UPLOAD_OR_NEW);
                            }}
                            className="group relative aspect-[3/4] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden cursor-pointer hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:-translate-y-1"
                          >
                            {/* Template Preview */}
                            <div className="relative w-full h-full bg-zinc-50 dark:bg-zinc-800 p-3 flex-1">
                              {/* Company Logo Placeholder */}
                              <div className="absolute top-3 left-3 w-10 h-10 bg-white dark:bg-zinc-900 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 z-10">
                                {template.company?.substring(0, 2).toUpperCase() || 'CO'}
                              </div>
                              
                              {/* PRO Badge */}
                              {template.isPro && (
                                <div className="absolute bottom-3 right-3 bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
                                  PRO
                                </div>
                              )}

                              {/* Template Preview Image */}
                              {template.preview ? (
                                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                  <img 
                                    src={template.preview} 
                                    alt={template.name} 
                                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  {/* Fallback if image fails to load */}
                                  <div className="hidden w-full h-full bg-white dark:bg-zinc-900 p-2.5 flex-col">
                                    <div className="w-2/3 h-2 bg-zinc-800 dark:bg-zinc-200 rounded mb-3"></div>
                                    <div className="space-y-1.5 mb-3">
                                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                      <div className="w-4/5 h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    </div>
                                    <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">EDUCATION</div>
                                    <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5"></div>
                                    <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">WORK EXPERIENCE</div>
                                    <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5"></div>
                                    <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">PROJECTS</div>
                                    <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                  </div>
                                </div>
                              ) : (
                                /* Mock Resume Preview Fallback */
                                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded shadow-sm border border-zinc-100 dark:border-zinc-800 p-2.5 flex flex-col">
                                  <div className="w-2/3 h-2 bg-zinc-800 dark:bg-zinc-200 rounded mb-3"></div>
                                  <div className="space-y-1.5 mb-3">
                                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="w-4/5 h-1 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                  </div>
                                  <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">EDUCATION</div>
                                  <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5"></div>
                                  <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">WORK EXPERIENCE</div>
                                  <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5"></div>
                                  <div className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1 tracking-wide">PROJECTS</div>
                                  <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                </div>
                              )}
                            </div>

                            {/* Template Info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 p-3 border-t border-zinc-100 dark:border-zinc-800">
                              <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-0.5">{template.name}</h3>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{template.description}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* Upload or New Step - Full Width */}
            {currentStep === WIZARD_STEPS.UPLOAD_OR_NEW && (
              <div className="w-full px-6 py-12">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-12 text-center">
                    <h2 className="text-4xl font-bold text-zinc-950 dark:text-white mb-4">How would you like to start?</h2>
                    <p className="text-xl text-zinc-600 dark:text-zinc-400">Choose the option that works best for you</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {/* Upload Option */}
                    <div
                      onClick={() => handleMethodSelect('upload')}
                      className={`group relative cursor-pointer rounded-3xl border-2 transition-all duration-300 overflow-hidden ${uploadMethod === 'upload'
                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-blue-900/20 shadow-2xl ring-4 ring-blue-100 dark:ring-blue-900/30 scale-[1.02]'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-xl bg-white dark:bg-zinc-900'
                        }`}
                    >
                      <div className="p-10">
                        <div className="flex flex-col items-center text-center">
                          <div className={`p-5 rounded-2xl mb-6 transition-all duration-300 ${uploadMethod === 'upload' ? 'bg-primary-100 dark:bg-blue-900/30 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary-50 dark:group-hover:bg-blue-900/20 group-hover:scale-105'
                            }`}>
                            <CloudArrowUpIcon className={`h-14 w-14 ${uploadMethod === 'upload' ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                              }`} />
                          </div>
                          <h3 className="text-2xl font-bold text-zinc-950 dark:text-white mb-3">Upload Existing Resume</h3>
                          <p className="text-base text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">We'll extract and enhance your information automatically using AI</p>
                          {uploadMethod === 'upload' && (
                            <Badge className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-1.5">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Start Fresh Option */}
                    <div
                      onClick={() => {
                        if (!isGenerating) {
                          setUploadMethod('new');
                          setShowResumeNameModal(true);
                        }
                      }}
                      className={`group relative cursor-pointer rounded-3xl border-2 transition-all duration-300 overflow-hidden ${uploadMethod === 'new'
                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-blue-900/20 shadow-2xl ring-4 ring-blue-100 dark:ring-blue-900/30 scale-[1.02]'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-xl bg-white dark:bg-zinc-900'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="p-10">
                        <div className="flex flex-col items-center text-center">
                          <div className={`p-5 rounded-2xl mb-6 transition-all duration-300 ${uploadMethod === 'new' ? 'bg-primary-100 dark:bg-blue-900/30 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary-50 dark:group-hover:bg-blue-900/20 group-hover:scale-105'
                            }`}>
                            {isGenerating ? (
                              <ArrowPathIcon className="h-14 w-14 text-primary-600 dark:text-primary-400 animate-spin" />
                            ) : (
                              <SparklesIcon className={`h-14 w-14 ${uploadMethod === 'new' ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                                }`} />
                            )}
                          </div>
                          <h3 className="text-2xl font-bold text-zinc-950 dark:text-white mb-3">
                            {isGenerating ? 'Creating Resume...' : 'Start Fresh'}
                          </h3>
                          <p className="text-base text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            {isGenerating
                              ? 'Setting up your resume with AI assistance'
                              : 'Build from scratch with AI-powered suggestions'
                            }
                          </p>
                          {uploadMethod === 'new' && !isGenerating && (
                            <Badge className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-1.5">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  {uploadMethod === 'upload' && (
                    <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-zinc-950 mb-2">Upload Your Resume</h3>
                        <p className="text-sm text-zinc-500">Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
                      </div>

                      <FieldGroup>
                        <Field>
                          <Label htmlFor="resume-upload">Select Resume File</Label>
                          <div className="mt-2">
                            <input
                              id="resume-upload"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer cursor-pointer"
                            />
                          </div>
                          {resumeFile && (
                            <div className="mt-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
                              <div className="flex items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                                <span className="text-sm font-medium text-zinc-950">{resumeFile.name}</span>
                                <span className="text-xs text-zinc-500">
                                  ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                            </div>
                          )}
                        </Field>
                      </FieldGroup>

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={() => setUploadMethod(null)}
                          outline
                        >
                          <ChevronLeftIcon data-slot="icon" className="h-4 w-4" />
                          Back
                        </Button>
                        <Button
                          onClick={() => {
                            if (!resumeNameInput.trim()) {
                              setShowResumeNameModal(true);
                            } else {
                              handleFileUpload();
                            }
                          }}
                          className="bg-primary-500 hover:bg-primary-600 text-white flex-1"
                          disabled={!resumeFile || uploading}
                        >
                          {uploading ? (
                            <>
                              <ArrowPathIcon data-slot="icon" className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              Upload & Continue
                              <ChevronRightIcon data-slot="icon" className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}



                  {/* Loading State for Start Fresh */}
                  {uploadMethod === 'new' && isGenerating && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                      <div className="text-center py-8">
                        <ArrowPathIcon className="h-12 w-12 mx-auto mb-4 text-blue-500 dark:text-primary-400 animate-spin" />
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">Creating Your Resume...</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Please wait while we set up your resume</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New Tabbed Editor - Like FlowCV */}
            {currentStep === WIZARD_STEPS.EDITOR && currentResume && (
              <div className="w-full h-[calc(100vh-120px)] flex flex-col">
                {/* Top Tabs Navigation - Smooth FlowCV Style */}
                <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setActiveTab(EDITOR_TABS.OVERVIEW)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-all duration-200 ${activeTab === EDITOR_TABS.OVERVIEW
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                        }`}
                    >
                      Overview
                      {activeTab === EDITOR_TABS.OVERVIEW && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-t-full animate-in slide-in-from-left duration-200" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab(EDITOR_TABS.CONTENT)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-all duration-200 ${activeTab === EDITOR_TABS.CONTENT
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                        }`}
                    >
                      Content
                      {activeTab === EDITOR_TABS.CONTENT && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-t-full animate-in slide-in-from-left duration-200" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab(EDITOR_TABS.CUSTOMIZE)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-all duration-200 ${activeTab === EDITOR_TABS.CUSTOMIZE
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                        }`}
                    >
                      Customize
                      {activeTab === EDITOR_TABS.CUSTOMIZE && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-t-full animate-in slide-in-from-left duration-200" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab(EDITOR_TABS.LINKS)}
                      className={`relative px-5 py-3.5 text-sm font-medium transition-all duration-200 ${activeTab === EDITOR_TABS.LINKS
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                        }`}
                    >
                      Links
                      {activeTab === EDITOR_TABS.LINKS && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-t-full animate-in slide-in-from-left duration-200" />
                      )}
                    </button>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      {/* Completeness Indicator */}
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>Completeness:</span>
                        <div className="flex items-center gap-1">
                          {Object.values(resumeCompleteness).map((complete, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full ${
                                complete
                                  ? 'bg-green-500'
                                  : 'bg-zinc-300 dark:bg-zinc-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">
                          {Object.values(resumeCompleteness).filter(Boolean).length}/
                          {Object.keys(resumeCompleteness).length}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!checkResumeCompleteness()) {
                            toast.error('Please complete all required sections (Personal Info, Experience, Education) before continuing');
                            return;
                          }
                          // Save resume before completing
                          if (currentResume) {
                            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                            const resumeId = currentResume._id || currentResume.id;
                            try {
                              await fetch(`${API_URL}/api/resume-builder/${resumeId}`, {
                                method: 'PATCH',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  ...resumeData,
                                  templateSettings,
                                }),
                              });
                            } catch (error) {
                              console.error('Error saving resume:', error);
                            }
                          }
                          navigateToStep(WIZARD_STEPS.EXPERT_REVIEW);
                        }}
                        disabled={!checkResumeCompleteness()}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${
                          checkResumeCompleteness()
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white cursor-pointer'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Complete Resume
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor Content - Split Screen */}
                <div className="flex-1 grid grid-cols-3 overflow-hidden">
                  {/* Left Sidebar - Section Cards */}
                  <div className="col-span-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {/* Content Tab - Show Section Cards */}
                    {activeTab === EDITOR_TABS.CONTENT && (
                      <>
                        {/* Personal Information Card */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            onClick={() => setExpandedSections(prev => ({ ...prev, personal: !prev.personal }))}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary-50 dark:bg-blue-900/20">
                                <UserIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Personal Information</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSection(editingSection === 'personal' ? null : 'personal');
                                  if (!expandedSections.personal) {
                                    setExpandedSections(prev => ({ ...prev, personal: true }));
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedSections(prev => ({ ...prev, personal: !prev.personal }));
                                }}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                              >
                                {expandedSections.personal ? (
                                  <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                )}
                              </button>
                            </div>
                          </div>

                          {expandedSections.personal && (
                            <div className="px-4 pb-4">
                              {editingSection === 'personal' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 pt-4">
                                  <FieldGroup className="space-y-6">
                                    <Field>
                                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
                                        FULL NAME
                                      </Label>
                                      <Input
                                        value={resumeData.fullName}
                                        onChange={(e) => setResumeData(prev => ({ ...prev, fullName: e.target.value }))}
                                        placeholder="Enter your full name"
                                        className="h-11 px-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                      />
                                    </Field>
                                    <Field>
                                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
                                        JOB TITLE
                                      </Label>
                                      <Input
                                        value={resumeData.jobTitle || ''}
                                        onChange={(e) => setResumeData(prev => ({ ...prev, jobTitle: e.target.value }))}
                                        placeholder="e.g. Software Engineer"
                                        className="h-11 px-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                      />
                                    </Field>
                                    <Field>
                                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
                                        EMAIL
                                      </Label>
                                      <Input
                                        type="email"
                                        value={resumeData.email}
                                        onChange={(e) => setResumeData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="your.email@example.com"
                                        className="h-11 px-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                      />
                                    </Field>
                                    <Field>
                                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
                                        PHONE
                                      </Label>
                                      <Input
                                        value={resumeData.phone}
                                        onChange={(e) => setResumeData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+1 (555) 123-4567"
                                        className="h-11 px-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                      />
                                    </Field>
                                    <Field>
                                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
                                        LOCATION
                                      </Label>
                                      <Input
                                        value={resumeData.location}
                                        onChange={(e) => setResumeData(prev => ({ ...prev, location: e.target.value }))}
                                        placeholder="City, State or Country"
                                        className="h-11 px-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                      />
                                    </Field>
                                  </FieldGroup>
                                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                    <button
                                      onClick={() => setEditingSection(null)}
                                      className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => setEditingSection(null)}
                                      className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-zinc-950 dark:text-white text-base">
                                      {resumeData.fullName || <span className="text-zinc-400 italic">Your Name</span>}
                                    </p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                      {resumeData.jobTitle || <span className="text-zinc-400 italic">Job Title</span>}
                                    </p>
                                  </div>
                                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                    {resumeData.email && (
                                      <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                                        <EnvelopeIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                        <span>{resumeData.email}</span>
                                      </div>
                                    )}
                                    {resumeData.phone && (
                                      <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                                        <PhoneIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                        <span>{resumeData.phone}</span>
                                      </div>
                                    )}
                                    {resumeData.location && (
                                      <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                                        <MapPinIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                        <span>{resumeData.location}</span>
                                      </div>
                                    )}
                                    {!resumeData.email && !resumeData.phone && !resumeData.location && (
                                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No contact information added yet</p>
                                    )}
                                  </div>
                                  {resumeData.photo && (
                                    <div className="pt-2">
                                      <img
                                        src={resumeData.photo}
                                        alt="Profile"
                                        className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Profile/Summary Card - Only show if added */}
                        {addedSections.includes('summary') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, summary: !prev.summary }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                  <UserIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Profile Summary</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSection(editingSection === 'summary' ? null : 'summary');
                                    if (!expandedSections.summary) {
                                      setExpandedSections(prev => ({ ...prev, summary: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, summary: !prev.summary }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.summary ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.summary && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {editingSection === 'summary' ? (
                                  <div className="space-y-4 pt-2">
                                    <RichTextEditor
                                      value={typeof resumeData.summary === 'string' ? resumeData.summary : ''}
                                      onChange={(value) => setResumeData(prev => ({ ...prev, summary: value }))}
                                      placeholder="Write your professional summary..."
                                    />
                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                      <button
                                        onClick={() => setEditingSection(null)}
                                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => setEditingSection(null)}
                                        className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.summary ? (
                                      <div
                                        className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: resumeData.summary }}
                                      />
                                    ) : (
                                      <p className="text-sm text-zinc-400 dark:text-zinc-500 italic py-4 text-center">
                                        No profile summary yet. Click edit to add one.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Profile Summary Card - Only show if added */}
                        {addedSections.includes('profileSummary') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-zinc-600" />
                                <h3 className="text-sm font-semibold text-zinc-950">Profile Summary</h3>
                              </div>
                              <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, profileSummary: !prev.profileSummary }))}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              >
                                {expandedSections.profileSummary ? (
                                  <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                )}
                              </button>
                            </div>

                            {expandedSections.profileSummary && (
                              <div className="space-y-2">
                                {editingSection === 'profileSummary' ? (
                                  <>
                                    <RichTextEditor
                                      value={typeof resumeData.profileSummary === 'string' ? resumeData.profileSummary : ''}
                                      onChange={(value) => setResumeData(prev => ({ ...prev, profileSummary: value }))}
                                      placeholder="Write your profile summary..."
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => {
                                          if (currentResume) {
                                            handleRegenerateSection('profileSummary');
                                          } else {
                                            toast.error('Please create a resume first');
                                          }
                                        }}
                                        disabled={isGenerating}
                                        plain
                                        size="sm"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <SparklesIcon className="h-3 w-3 text-primary-600" />
                                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                                      </Button>
                                      {resumeData.profileSummary && (
                                        <Button
                                          onClick={() => {
                                            if (currentResume) {
                                              handleRegenerateSection('profileSummary');
                                            } else {
                                              toast.error('Please create a resume first');
                                            }
                                          }}
                                          disabled={isGenerating}
                                          plain
                                          size="sm"
                                          className="text-xs flex items-center gap-1"
                                        >
                                          <ArrowPathIcon className="h-3 w-3 text-primary-600" />
                                          {isGenerating ? 'Rewriting...' : 'Rewrite with AI'}
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    {resumeData.profileSummary ? (
                                      <div
                                        className="text-sm text-zinc-600 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: resumeData.profileSummary }}
                                      />
                                    ) : (
                                      <p className="text-sm text-zinc-400 italic">No profile summary yet</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => setEditingSection('profileSummary')}
                                        plain
                                        size="sm"
                                        className="text-xs"
                                      >
                                        <PencilIcon className="h-3 w-3" />
                                        Edit
                                      </Button>
                                      {currentResume && (
                                        <>
                                          {!resumeData.profileSummary ? (
                                            <Button
                                              onClick={() => handleRegenerateSection('profileSummary')}
                                              disabled={isGenerating}
                                              plain
                                              size="sm"
                                              className="text-xs flex items-center gap-1"
                                            >
                                              <SparklesIcon className="h-3 w-3 text-primary-600" />
                                              {isGenerating ? 'Generating...' : 'Generate with AI'}
                                            </Button>
                                          ) : (
                                            <Button
                                              onClick={() => handleRegenerateSection('profileSummary')}
                                              disabled={isGenerating}
                                              plain
                                              size="sm"
                                              className="text-xs flex items-center gap-1"
                                            >
                                              <ArrowPathIcon className="h-3 w-3 text-primary-600" />
                                              {isGenerating ? 'Rewriting...' : 'Rewrite with AI'}
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {editingSection === 'profileSummary' && (
                                  <div className="flex gap-2 mt-2">
                                    <Button onClick={() => setEditingSection(null)} outline size="sm">
                                      Save
                                    </Button>
                                    <Button onClick={() => setEditingSection(null)} plain size="sm">
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Skills Card - Only show if added */}
                        {addedSections.includes('skills') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, skills: !prev.skills }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                                  <LightBulbIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Skills</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateSkills();
                                  }}
                                  disabled={isGenerating}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105 text-zinc-600 dark:text-zinc-400"
                                  title="Generate Skills with AI"
                                >
                                  {isGenerating ? (
                                    <ArrowPathIcon className="h-4 w-4 animate-spin text-purple-600" />
                                  ) : (
                                    <SparklesIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSection(editingSection === 'skills' ? null : 'skills');
                                    if (!expandedSections.skills) {
                                      setExpandedSections(prev => ({ ...prev, skills: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Edit Skills"
                                >
                                  <PencilIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, skills: !prev.skills }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.skills ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.skills && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {editingSection === 'skills' ? (
                                  <div className="space-y-3 pt-2">
                                    <Field>
                                      <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                        List your skills
                                      </Label>
                                      <RichTextEditor
                                        value={Array.isArray(resumeData.skills) ? resumeData.skills.join('\n') : (resumeData.skills || '')}
                                        onChange={(value) => {
                                          // Handle converting HTML to clean list
                                          const tempDiv = document.createElement('div');
                                          tempDiv.innerHTML = value;
                                          // Replace <br> and blocks with newlines to clean up
                                          const cleanText = tempDiv.innerText || tempDiv.textContent || '';
                                          // This is a bit of a hack since RichTextEditor returns HTML
                                          // Ideally we want a tagging input for skills, but sticking to existing logic for now
                                          const skillsArray = cleanText.split(/\n|,/).map(s => s.trim()).filter(s => s);
                                          setResumeData(prev => ({ ...prev, skills: skillsArray }));
                                        }}
                                        placeholder="Enter your skills, one per line..."
                                      />
                                    </Field>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Tip: Enter skills separated by new lines or commas.
                                    </p>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button onClick={() => setEditingSection(null)} plain size="sm">
                                        Done
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4 pt-2">
                                    {Array.isArray(resumeData.skills) && resumeData.skills.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {resumeData.skills.map((skill, idx) => (
                                          <div
                                            key={idx}
                                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                                          >
                                            <span>{skill}</span>
                                            <button
                                              onClick={() => {
                                                setResumeData(prev => ({
                                                  ...prev,
                                                  skills: prev.skills.filter((_, i) => i !== idx),
                                                }));
                                              }}
                                              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500 transition-colors"
                                            >
                                              <XMarkIcon className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">No skills added yet</p>
                                        <Button
                                          onClick={() => setEditingSection('skills')}
                                          outline
                                          size="sm"
                                        >
                                          Add Skills manually
                                        </Button>
                                        <span className="mx-2 text-xs text-zinc-400">or</span>
                                        <Button
                                          onClick={handleGenerateSkills}
                                          disabled={isGenerating}
                                          plain
                                          size="sm"
                                          className="text-purple-600 dark:text-purple-400"
                                        >
                                          Generate with AI
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Professional Experience Card - Only show if added */}
                        {addedSections.includes('experience') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, experience: !prev.experience }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                  <BriefcaseIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Professional Experience</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentExperience({
                                      title: '',
                                      company: '',
                                      location: '',
                                      startDate: '',
                                      endDate: '',
                                      current: false,
                                      responsibilities: '',
                                    });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'experience' ? null : 'experience');
                                    if (!expandedSections.experience) {
                                      setExpandedSections(prev => ({ ...prev, experience: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Experience"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, experience: !prev.experience }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.experience ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.experience && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.experience && resumeData.experience.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.experience.map((exp, idx) => (
                                      <div
                                        key={idx}
                                        className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm"
                                      >
                                        <div className="w-1 h-full bg-green-500 dark:bg-green-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                            {exp.title || 'Untitled Position'}
                                          </p>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                                            {exp.company || 'Company Name'}
                                          </p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                            {exp.startDate || 'Start Date'} - {exp.current ? 'Present' : (exp.endDate || 'End Date')}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentExperience(exp);
                                              setEditingIndex(idx);
                                              setEditingSection('experience');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                experience: prev.experience.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editingSection === 'experience' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Job Title
                                          </Label>
                                          <Input
                                            value={currentExperience.title}
                                            onChange={(e) => setCurrentExperience(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g. Software Engineer"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Company
                                          </Label>
                                          <Input
                                            value={currentExperience.company}
                                            onChange={(e) => setCurrentExperience(prev => ({ ...prev, company: e.target.value }))}
                                            placeholder="Company Name"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                      </div>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Location
                                        </Label>
                                        <Input
                                          value={currentExperience.location}
                                          onChange={(e) => setCurrentExperience(prev => ({ ...prev, location: e.target.value }))}
                                          placeholder="City, State or Remote"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Start Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentExperience.startDate}
                                            onChange={(e) => setCurrentExperience(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            End Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentExperience.endDate}
                                            onChange={(e) => setCurrentExperience(prev => ({ ...prev, endDate: e.target.value }))}
                                            disabled={currentExperience.current}
                                            placeholder="Leave empty if current"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                      </div>
                                      <Field>
                                        <CheckboxField>
                                          <Checkbox
                                            checked={currentExperience.current}
                                            onChange={(checked) => setCurrentExperience(prev => ({ ...prev, current: checked }))}
                                          />
                                          <Label className="text-sm">I currently work here</Label>
                                        </CheckboxField>
                                      </Field>
                                      <Field>
                                        <div className="flex justify-between items-center mb-2">
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                                            Responsibilities
                                          </Label>
                                          <Button
                                            onClick={handleGenerateExperience}
                                            disabled={isGenerating || !currentExperience.title || !currentExperience.company}
                                            plain
                                            size="sm"
                                            className="text-xs flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-blue-300 transition-colors"
                                          >
                                            <SparklesIcon className="h-3.5 w-3.5" />
                                            {isGenerating ? 'Generating...' : 'Generate with AI'}
                                          </Button>
                                        </div>
                                        <RichTextEditor
                                          value={currentExperience.responsibilities || ''}
                                          onChange={(value) => setCurrentExperience(prev => ({ ...prev, responsibilities: value }))}
                                          placeholder="Describe your key responsibilities and achievements..."
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentExperience({
                                            title: '',
                                            company: '',
                                            location: '',
                                            startDate: '',
                                            endDate: '',
                                            current: false,
                                            responsibilities: '',
                                          });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentExperience.title && currentExperience.company) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                experience: prev.experience.map((e, i) => i === editingIndex ? currentExperience : e),
                                              }));
                                            } else {
                                              addExperience();
                                            }
                                            setCurrentExperience({
                                              title: '',
                                              company: '',
                                              location: '',
                                              startDate: '',
                                              endDate: '',
                                              current: false,
                                              responsibilities: '',
                                            });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        className="bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
                                        size="sm"
                                      >
                                        {editingIndex !== null ? 'Update Experience' : 'Add Experience'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentExperience({
                                        title: '',
                                        company: '',
                                        location: '',
                                        startDate: '',
                                        endDate: '',
                                        current: false,
                                        responsibilities: '',
                                      });
                                      setEditingIndex(null);
                                      setEditingSection('experience');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Experience
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Education Card - Only show if added */}
                        {addedSections.includes('education') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, education: !prev.education }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                  <AcademicCapIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Education</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentEducation({
                                      degree: '',
                                      institution: '',
                                      location: '',
                                      startDate: '',
                                      endDate: '',
                                      gpa: '',
                                      description: '',
                                    });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'education' ? null : 'education');
                                    if (!expandedSections.education) {
                                      setExpandedSections(prev => ({ ...prev, education: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Education"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, education: !prev.education }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.education ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.education && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.education && resumeData.education.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.education.map((edu, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-orange-500 dark:bg-orange-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white">{edu.degree || 'Degree'}</p>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{edu.institution || 'Institution'}</p>
                                          {edu.startDate && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                              {edu.startDate} - {edu.endDate || 'Present'}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentEducation(edu);
                                              setEditingIndex(idx);
                                              setEditingSection('education');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                education: prev.education.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editingSection === 'education' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Degree
                                        </Label>
                                        <Input
                                          value={currentEducation.degree}
                                          onChange={(e) => setCurrentEducation(prev => ({ ...prev, degree: e.target.value }))}
                                          placeholder="e.g. Bachelor of Science in Computer Science"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Institution
                                        </Label>
                                        <Input
                                          value={currentEducation.institution}
                                          onChange={(e) => setCurrentEducation(prev => ({ ...prev, institution: e.target.value }))}
                                          placeholder="University Name"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Location
                                        </Label>
                                        <Input
                                          value={currentEducation.location}
                                          onChange={(e) => setCurrentEducation(prev => ({ ...prev, location: e.target.value }))}
                                          placeholder="City, State"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Start Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentEducation.startDate}
                                            onChange={(e) => setCurrentEducation(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            End Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentEducation.endDate}
                                            onChange={(e) => setCurrentEducation(prev => ({ ...prev, endDate: e.target.value }))}
                                            placeholder="Leave empty if ongoing"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                      </div>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          GPA (Optional)
                                        </Label>
                                        <Input
                                          value={currentEducation.gpa}
                                          onChange={(e) => setCurrentEducation(prev => ({ ...prev, gpa: e.target.value }))}
                                          placeholder="e.g. 3.8/4.0"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Description
                                        </Label>
                                        <RichTextEditor
                                          value={currentEducation.description || ''}
                                          onChange={(value) => setCurrentEducation(prev => ({ ...prev, description: value }))}
                                          placeholder="Additional details about your education..."
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentEducation({
                                            degree: '',
                                            institution: '',
                                            location: '',
                                            startDate: '',
                                            endDate: '',
                                            gpa: '',
                                            description: '',
                                          });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentEducation.degree && currentEducation.institution) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                education: prev.education.map((e, i) => i === editingIndex ? currentEducation : e),
                                              }));
                                            } else {
                                              addEducation();
                                            }
                                            setCurrentEducation({
                                              degree: '',
                                              institution: '',
                                              location: '',
                                              startDate: '',
                                              endDate: '',
                                              gpa: '',
                                              description: '',
                                            });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        className="bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
                                        size="sm"
                                      >
                                        {editingIndex !== null ? 'Update Education' : 'Add Education'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentEducation({
                                        degree: '',
                                        institution: '',
                                        location: '',
                                        startDate: '',
                                        endDate: '',
                                        gpa: '',
                                        description: '',
                                      });
                                      setEditingIndex(null);
                                      setEditingSection('education');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Education
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Certifications Card - Only show if added */}
                        {addedSections.includes('certifications') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, certifications: !prev.certifications }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                                  <CheckBadgeIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Certifications</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentCertification({
                                      name: '',
                                      issuer: '',
                                      date: '',
                                      expiryDate: '',
                                      credentialId: '',
                                      credentialUrl: '',
                                    });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'certifications' ? null : 'certifications');
                                    if (!expandedSections.certifications) {
                                      setExpandedSections(prev => ({ ...prev, certifications: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Certification"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, certifications: !prev.certifications }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.certifications ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.certifications && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.certifications && resumeData.certifications.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.certifications.map((cert, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-teal-500 dark:bg-teal-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white">{cert.name || 'Certification Name'}</p>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{cert.issuer || 'Issuer'}</p>
                                          {cert.date && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{cert.date}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentCertification(cert);
                                              setEditingIndex(idx);
                                              setEditingSection('certifications');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                certifications: prev.certifications.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editingSection === 'certifications' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Certification Name
                                        </Label>
                                        <Input
                                          value={currentCertification.name}
                                          onChange={(e) => setCurrentCertification(prev => ({ ...prev, name: e.target.value }))}
                                          placeholder="e.g. AWS Certified Solutions Architect"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Issuer
                                        </Label>
                                        <Input
                                          value={currentCertification.issuer}
                                          onChange={(e) => setCurrentCertification(prev => ({ ...prev, issuer: e.target.value }))}
                                          placeholder="e.g. Amazon Web Services"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentCertification.date}
                                            onChange={(e) => setCurrentCertification(prev => ({ ...prev, date: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Expiry Date (Optional)
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentCertification.expiryDate}
                                            onChange={(e) => setCurrentCertification(prev => ({ ...prev, expiryDate: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                          />
                                        </Field>
                                      </div>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Credential ID (Optional)
                                        </Label>
                                        <Input
                                          value={currentCertification.credentialId}
                                          onChange={(e) => setCurrentCertification(prev => ({ ...prev, credentialId: e.target.value }))}
                                          placeholder="e.g. ABC123456"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Credential URL (Optional)
                                        </Label>
                                        <Input
                                          type="url"
                                          value={currentCertification.credentialUrl}
                                          onChange={(e) => setCurrentCertification(prev => ({ ...prev, credentialUrl: e.target.value }))}
                                          placeholder="https://..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentCertification({
                                            name: '',
                                            issuer: '',
                                            date: '',
                                            expiryDate: '',
                                            credentialId: '',
                                            credentialUrl: '',
                                          });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentCertification.name && currentCertification.issuer) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                certifications: prev.certifications.map((c, i) => i === editingIndex ? currentCertification : c),
                                              }));
                                            } else {
                                              addCertification();
                                            }
                                            setCurrentCertification({
                                              name: '',
                                              issuer: '',
                                              date: '',
                                              expiryDate: '',
                                              credentialId: '',
                                              credentialUrl: '',
                                            });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        className="bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
                                        size="sm"
                                      >
                                        {editingIndex !== null ? 'Update Certification' : 'Add Certification'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentCertification({
                                        name: '',
                                        issuer: '',
                                        date: '',
                                        expiryDate: '',
                                        credentialId: '',
                                        credentialUrl: '',
                                      });
                                      setEditingIndex(null);
                                      setEditingSection('certifications');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Certification
                                  </Button>
                                )}
                              </div>
                            )}

                          </div>
                        )}

                        {/* References Card - Only show if added */}
                        {addedSections.includes('references') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, references: !prev.references }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                                  <UserGroupIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">References</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentReference({
                                      name: '',
                                      title: '',
                                      company: '',
                                      email: '',
                                      phone: '',
                                      relationship: '',
                                    });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'references' ? null : 'references');
                                    if (!expandedSections.references) {
                                      setExpandedSections(prev => ({ ...prev, references: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Reference"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, references: !prev.references }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.references ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.references && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.references && resumeData.references.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.references.map((ref, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white">{ref.name || 'Reference Name'}</p>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                                            {ref.title && ref.company ? `${ref.title} at ${ref.company}` : (ref.title || ref.company || '')}
                                          </p>
                                          {ref.email && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                              <EnvelopeIcon className="h-3 w-3" />
                                              <span>{ref.email}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentReference(ref);
                                              setEditingIndex(idx);
                                              setEditingSection('references');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                references: prev.references.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editingSection === 'references' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Name
                                        </Label>
                                        <Input
                                          value={currentReference.name}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, name: e.target.value }))}
                                          placeholder="e.g. John Doe"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Title
                                        </Label>
                                        <Input
                                          value={currentReference.title}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="e.g. Senior Manager"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Company
                                        </Label>
                                        <Input
                                          value={currentReference.company}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, company: e.target.value }))}
                                          placeholder="e.g. Acme Corp"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Email
                                        </Label>
                                        <Input
                                          type="email"
                                          value={currentReference.email}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, email: e.target.value }))}
                                          placeholder="john@example.com"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Phone (Optional)
                                        </Label>
                                        <Input
                                          value={currentReference.phone}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, phone: e.target.value }))}
                                          placeholder="+1 (555) 123-4567"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Relationship (Optional)
                                        </Label>
                                        <Input
                                          value={currentReference.relationship}
                                          onChange={(e) => setCurrentReference(prev => ({ ...prev, relationship: e.target.value }))}
                                          placeholder="e.g. Former Manager"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentReference({
                                            name: '',
                                            title: '',
                                            company: '',
                                            email: '',
                                            phone: '',
                                            relationship: '',
                                          });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentReference.name && currentReference.email) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                references: prev.references.map((r, i) => i === editingIndex ? currentReference : r),
                                              }));
                                            } else {
                                              addReference();
                                            }
                                            setCurrentReference({
                                              name: '',
                                              title: '',
                                              company: '',
                                              email: '',
                                              phone: '',
                                              relationship: '',
                                            });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        className="bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
                                        size="sm"
                                      >
                                        {editingIndex !== null ? 'Update Reference' : 'Add Reference'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentReference({
                                        name: '',
                                        title: '',
                                        company: '',
                                        email: '',
                                        phone: '',
                                        relationship: '',
                                      });
                                      setEditingIndex(null);
                                      setEditingSection('references');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Reference
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Languages Card - Only show if added */}
                        {addedSections.includes('languages') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, languages: !prev.languages }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
                                  <GlobeAltIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Languages</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentLanguage({ language: '', proficiency: 'Native' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'languages' ? null : 'languages');
                                    if (!expandedSections.languages) {
                                      setExpandedSections(prev => ({ ...prev, languages: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Language"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, languages: !prev.languages }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.languages ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.languages && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.languages && resumeData.languages.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.languages.map((lang, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-cyan-500 dark:bg-cyan-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white">{lang.language || 'Language'}</p>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{lang.proficiency || 'Proficiency'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentLanguage(lang);
                                              setEditingIndex(idx);
                                              setEditingSection('languages');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                languages: prev.languages.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editingSection === 'languages' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Language
                                        </Label>
                                        <Input
                                          value={currentLanguage.language}
                                          onChange={(e) => setCurrentLanguage(prev => ({ ...prev, language: e.target.value }))}
                                          placeholder="e.g. English"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Proficiency
                                        </Label>
                                        <select
                                          value={currentLanguage.proficiency}
                                          onChange={(e) => setCurrentLanguage(prev => ({ ...prev, proficiency: e.target.value }))}
                                          className="w-full rounded-md border-zinc-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white p-2.5 transition-all duration-200"
                                        >
                                          <option value="Native">Native</option>
                                          <option value="Fluent">Fluent</option>
                                          <option value="Conversational">Conversational</option>
                                          <option value="Basic">Basic</option>
                                        </select>
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentLanguage({ language: '', proficiency: 'Native' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentLanguage.language) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                languages: prev.languages.map((l, i) => i === editingIndex ? currentLanguage : l),
                                              }));
                                            } else {
                                              addLanguage();
                                            }
                                            setCurrentLanguage({ language: '', proficiency: 'Native' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        className="bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
                                        size="sm"
                                      >
                                        {editingIndex !== null ? 'Update Language' : 'Add Language'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentLanguage({ language: '', proficiency: 'Native' });
                                      setEditingIndex(null);
                                      setEditingSection('languages');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Language
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interests Card - Only show if added */}
                        {addedSections.includes('interests') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, interests: !prev.interests }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                                  <HeartIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Interests</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentInterest('');
                                    setEditingSection(editingSection === 'interests' ? null : 'interests');
                                    if (!expandedSections.interests) {
                                      setExpandedSections(prev => ({ ...prev, interests: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Interest"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, interests: !prev.interests }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.interests ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.interests && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.interests && resumeData.interests.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {resumeData.interests.map((interest, idx) => (
                                      <div key={idx} className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-pink-200 dark:hover:border-pink-800 transition-all duration-200">
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{interest}</span>
                                        <button
                                          onClick={() => {
                                            setResumeData(prev => ({
                                              ...prev,
                                              interests: prev.interests.filter((_, i) => i !== idx),
                                            }));
                                          }}
                                          className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                          <XMarkIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'interests' ? (
                                  <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Interest
                                        </Label>
                                        <Input
                                          value={currentInterest}
                                          onChange={(e) => setCurrentInterest(e.target.value)}
                                          placeholder="e.g. Photography, Hiking, Chess"
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (currentInterest.trim()) {
                                                addInterest();
                                              }
                                            }
                                          }}
                                          className="transition-all duration-200 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                          autoFocus
                                        />
                                      </Field>
                                      <div className="flex items-center justify-end gap-2 pt-2">
                                        <Button
                                          onClick={() => {
                                            setCurrentInterest('');
                                            setEditingSection(null);
                                          }}
                                          plain
                                          size="sm"
                                          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                        >
                                          Done
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            if (currentInterest.trim()) {
                                              addInterest();
                                            }
                                          }}
                                          color="pink"
                                          size="sm"
                                          className="transition-all duration-200 hover:scale-105"
                                        >
                                          Add Interest
                                        </Button>
                                      </div>
                                    </FieldGroup>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => setEditingSection('interests')}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Interest
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Projects Card - Only show if added */}
                        {addedSections.includes('projects') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, projects: !prev.projects }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                  <BriefcaseIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Projects</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentProject({ name: '', description: '', technologies: '', url: '', startDate: '', endDate: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'projects' ? null : 'projects');
                                    if (!expandedSections.projects) {
                                      setExpandedSections(prev => ({ ...prev, projects: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Project"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, projects: !prev.projects }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.projects ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.projects && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.projects && resumeData.projects.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.projects.map((project, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-orange-500 dark:bg-orange-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{project.name || 'Project Name'}</p>
                                          {project.technologies && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{project.technologies}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentProject(project);
                                              setEditingIndex(idx);
                                              setEditingSection('projects');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                projects: prev.projects.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'projects' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Project Name
                                        </Label>
                                        <Input
                                          value={currentProject.name}
                                          onChange={(e) => setCurrentProject(prev => ({ ...prev, name: e.target.value }))}
                                          placeholder="e.g. E-commerce Platform"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Description
                                        </Label>
                                        <RichTextEditor
                                          value={currentProject.description || ''}
                                          onChange={(value) => setCurrentProject(prev => ({ ...prev, description: value }))}
                                          placeholder="Describe your project, key features, and your contribution..."
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Technologies
                                        </Label>
                                        <Input
                                          value={currentProject.technologies}
                                          onChange={(e) => setCurrentProject(prev => ({ ...prev, technologies: e.target.value }))}
                                          placeholder="e.g. React, Node.js, MongoDB"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Project URL (Optional)
                                        </Label>
                                        <Input
                                          type="url"
                                          value={currentProject.url}
                                          onChange={(e) => setCurrentProject(prev => ({ ...prev, url: e.target.value }))}
                                          placeholder="https://..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentProject({ name: '', description: '', technologies: '', url: '', startDate: '', endDate: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentProject.name) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                projects: prev.projects.map((p, i) => i === editingIndex ? currentProject : p),
                                              }));
                                            } else {
                                              addProject();
                                            }
                                            setCurrentProject({ name: '', description: '', technologies: '', url: '', startDate: '', endDate: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="orange"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Project' : 'Add Project'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentProject({ name: '', description: '', technologies: '', url: '', startDate: '', endDate: '' });
                                      setEditingIndex(null);
                                      setEditingSection('projects');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Project
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Courses Card - Only show if added */}
                        {addedSections.includes('courses') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, courses: !prev.courses }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                                  <AcademicCapIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Courses</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentCourse({ name: '', provider: '', date: '', certificateUrl: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'courses' ? null : 'courses');
                                    if (!expandedSections.courses) {
                                      setExpandedSections(prev => ({ ...prev, courses: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Course"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, courses: !prev.courses }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.courses ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.courses && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.courses && resumeData.courses.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.courses.map((course, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-teal-500 dark:bg-teal-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{course.name || 'Course Name'}</p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{course.provider || 'Provider'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentCourse(course);
                                              setEditingIndex(idx);
                                              setEditingSection('courses');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                courses: prev.courses.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'courses' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Course Name
                                        </Label>
                                        <Input
                                          value={currentCourse.name}
                                          onChange={(e) => setCurrentCourse(prev => ({ ...prev, name: e.target.value }))}
                                          placeholder="e.g. Machine Learning Specialization"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Provider
                                        </Label>
                                        <Input
                                          value={currentCourse.provider}
                                          onChange={(e) => setCurrentCourse(prev => ({ ...prev, provider: e.target.value }))}
                                          placeholder="e.g. Coursera"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Completion Date
                                        </Label>
                                        <Input
                                          type="month"
                                          value={currentCourse.date}
                                          onChange={(e) => setCurrentCourse(prev => ({ ...prev, date: e.target.value }))}
                                          className="transition-all duration-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Certificate URL (Optional)
                                        </Label>
                                        <Input
                                          type="url"
                                          value={currentCourse.certificateUrl}
                                          onChange={(e) => setCurrentCourse(prev => ({ ...prev, certificateUrl: e.target.value }))}
                                          placeholder="https://..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentCourse({ name: '', provider: '', date: '', certificateUrl: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentCourse.name) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                courses: prev.courses.map((c, i) => i === editingIndex ? currentCourse : c),
                                              }));
                                            } else {
                                              addCourse();
                                            }
                                            setCurrentCourse({ name: '', provider: '', date: '', certificateUrl: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="teal"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Course' : 'Add Course'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentCourse({ name: '', provider: '', date: '', certificateUrl: '' });
                                      setEditingIndex(null);
                                      setEditingSection('courses');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Course
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Awards Card - Only show if added */}
                        {addedSections.includes('awards') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, awards: !prev.awards }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                                  <TrophyIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Awards</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentAward({ title: '', issuer: '', date: '', description: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'awards' ? null : 'awards');
                                    if (!expandedSections.awards) {
                                      setExpandedSections(prev => ({ ...prev, awards: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Award"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, awards: !prev.awards }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.awards ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.awards && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.awards && resumeData.awards.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.awards.map((award, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-yellow-500 dark:bg-yellow-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{award.title || 'Award Title'}</p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{award.issuer || 'Issuer'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentAward(award);
                                              setEditingIndex(idx);
                                              setEditingSection('awards');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                awards: prev.awards.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'awards' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Award Title
                                        </Label>
                                        <Input
                                          value={currentAward.title}
                                          onChange={(e) => setCurrentAward(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="e.g. Best Student Award"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Issuer
                                        </Label>
                                        <Input
                                          value={currentAward.issuer}
                                          onChange={(e) => setCurrentAward(prev => ({ ...prev, issuer: e.target.value }))}
                                          placeholder="e.g. University Name"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Date
                                        </Label>
                                        <Input
                                          type="month"
                                          value={currentAward.date}
                                          onChange={(e) => setCurrentAward(prev => ({ ...prev, date: e.target.value }))}
                                          className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Description (Optional)
                                        </Label>
                                        <Textarea
                                          value={currentAward.description}
                                          onChange={(e) => setCurrentAward(prev => ({ ...prev, description: e.target.value }))}
                                          placeholder="Additional details about the award..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentAward({ title: '', issuer: '', date: '', description: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentAward.title) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                awards: prev.awards.map((a, i) => i === editingIndex ? currentAward : a),
                                              }));
                                            } else {
                                              addAward();
                                            }
                                            setCurrentAward({ title: '', issuer: '', date: '', description: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="yellow"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Award' : 'Add Award'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentAward({ title: '', issuer: '', date: '', description: '' });
                                      setEditingIndex(null);
                                      setEditingSection('awards');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Award
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Organizations Card - Only show if added */}
                        {addedSections.includes('organizations') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, organizations: !prev.organizations }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                                  <UserGroupIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Organizations</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentOrganization({ name: '', role: '', startDate: '', endDate: '', description: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'organizations' ? null : 'organizations');
                                    if (!expandedSections.organizations) {
                                      setExpandedSections(prev => ({ ...prev, organizations: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Organization"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, organizations: !prev.organizations }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.organizations ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.organizations && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.organizations && resumeData.organizations.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.organizations.map((org, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{org.name || 'Organization Name'}</p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{org.role || 'Role'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentOrganization(org);
                                              setEditingIndex(idx);
                                              setEditingSection('organizations');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                organizations: prev.organizations.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'organizations' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Organization Name
                                        </Label>
                                        <Input
                                          value={currentOrganization.name}
                                          onChange={(e) => setCurrentOrganization(prev => ({ ...prev, name: e.target.value }))}
                                          placeholder="e.g. Red Cross"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Role
                                        </Label>
                                        <Input
                                          value={currentOrganization.role}
                                          onChange={(e) => setCurrentOrganization(prev => ({ ...prev, role: e.target.value }))}
                                          placeholder="e.g. Volunteer"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                      </Field>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            Start Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentOrganization.startDate}
                                            onChange={(e) => setCurrentOrganization(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                          />
                                        </Field>
                                        <Field>
                                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                            End Date
                                          </Label>
                                          <Input
                                            type="month"
                                            value={currentOrganization.endDate}
                                            onChange={(e) => setCurrentOrganization(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                          />
                                        </Field>
                                      </div>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Description (Optional)
                                        </Label>
                                        <Textarea
                                          value={currentOrganization.description}
                                          onChange={(e) => setCurrentOrganization(prev => ({ ...prev, description: e.target.value }))}
                                          placeholder="Describe your role and contributions..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentOrganization({ name: '', role: '', startDate: '', endDate: '', description: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentOrganization.name) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                organizations: prev.organizations.map((o, i) => i === editingIndex ? currentOrganization : o),
                                              }));
                                            } else {
                                              addOrganization();
                                            }
                                            setCurrentOrganization({ name: '', role: '', startDate: '', endDate: '', description: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="indigo"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Organization' : 'Add Organization'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentOrganization({ name: '', role: '', startDate: '', endDate: '', description: '' });
                                      setEditingIndex(null);
                                      setEditingSection('organizations');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Organization
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Publications Card - Only show if added */}
                        {addedSections.includes('publications') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, publications: !prev.publications }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                  <DocumentTextIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Publications</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPublication({ title: '', publisher: '', date: '', url: '', description: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'publications' ? null : 'publications');
                                    if (!expandedSections.publications) {
                                      setExpandedSections(prev => ({ ...prev, publications: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Publication"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, publications: !prev.publications }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.publications ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.publications && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.publications && resumeData.publications.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.publications.map((pub, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-emerald-500 dark:bg-emerald-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{pub.title || 'Publication Title'}</p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{pub.publisher || 'Publisher'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentPublication(pub);
                                              setEditingIndex(idx);
                                              setEditingSection('publications');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                publications: prev.publications.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'publications' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Title
                                        </Label>
                                        <Input
                                          value={currentPublication.title}
                                          onChange={(e) => setCurrentPublication(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="e.g. Research Paper Title"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Publisher
                                        </Label>
                                        <Input
                                          value={currentPublication.publisher}
                                          onChange={(e) => setCurrentPublication(prev => ({ ...prev, publisher: e.target.value }))}
                                          placeholder="e.g. Journal Name"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Date
                                        </Label>
                                        <Input
                                          type="month"
                                          value={currentPublication.date}
                                          onChange={(e) => setCurrentPublication(prev => ({ ...prev, date: e.target.value }))}
                                          className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          URL (Optional)
                                        </Label>
                                        <Input
                                          type="url"
                                          value={currentPublication.url}
                                          onChange={(e) => setCurrentPublication(prev => ({ ...prev, url: e.target.value }))}
                                          placeholder="https://..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Description (Optional)
                                        </Label>
                                        <Textarea
                                          value={currentPublication.description}
                                          onChange={(e) => setCurrentPublication(prev => ({ ...prev, description: e.target.value }))}
                                          placeholder="Additional details about the publication..."
                                          className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentPublication({ title: '', publisher: '', date: '', url: '', description: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentPublication.title) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                publications: prev.publications.map((p, i) => i === editingIndex ? currentPublication : p),
                                              }));
                                            } else {
                                              addPublication();
                                            }
                                            setCurrentPublication({ title: '', publisher: '', date: '', url: '', description: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="emerald"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Publication' : 'Add Publication'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentPublication({ title: '', publisher: '', date: '', url: '', description: '' });
                                      setEditingIndex(null);
                                      setEditingSection('publications');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Publication
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Declaration Card - Only show if added */}
                        {addedSections.includes('declaration') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, declaration: !prev.declaration }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                                  <PencilIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Declaration</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, declaration: !prev.declaration }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.declaration ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.declaration && (
                              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {editingSection === 'declaration' ? (
                                  <div className="space-y-4">
                                    <Field className="pt-2">
                                      <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                        Declaration Text
                                      </Label>
                                      <RichTextEditor
                                        value={resumeData.declaration || ''}
                                        onChange={(value) => setResumeData(prev => ({ ...prev, declaration: value }))}
                                        placeholder="I hereby declare that the information provided is true and correct..."
                                      />
                                    </Field>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => setEditingSection(null)}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => setEditingSection(null)}
                                        color="rose"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        Save Declaration
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group pt-2">
                                    {resumeData.declaration ? (
                                      <div
                                        className="text-sm text-zinc-600 dark:text-zinc-300 prose prose-sm max-w-none prose-zinc dark:prose-invert p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-all duration-200"
                                        dangerouslySetInnerHTML={{ __html: resumeData.declaration }}
                                      />
                                    ) : (
                                      <div className="text-sm text-zinc-400 dark:text-zinc-500 italic p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
                                        No declaration added yet
                                      </div>
                                    )}
                                    <div className="mt-3">
                                      <Button
                                        onClick={() => setEditingSection('declaration')}
                                        outline
                                        size="sm"
                                        className="w-full transition-all duration-200 hover:scale-[1.02]"
                                      >
                                        <PencilIcon className="h-3.5 w-3.5" />
                                        Edit Declaration
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Custom Card - Only show if added */}
                        {addedSections.includes('custom') && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              onClick={() => setExpandedSections(prev => ({ ...prev, custom: !prev.custom }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20">
                                  <PuzzlePieceIcon className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Custom Section</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentCustom({ title: '', content: '' });
                                    setEditingIndex(null);
                                    setEditingSection(editingSection === 'custom' ? null : 'custom');
                                    if (!expandedSections.custom) {
                                      setExpandedSections(prev => ({ ...prev, custom: true }));
                                    }
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-105"
                                  title="Add Item"
                                >
                                  <PlusIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => ({ ...prev, custom: !prev.custom }));
                                  }}
                                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                                >
                                  {expandedSections.custom ? (
                                    <ChevronUpIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {expandedSections.custom && (
                              <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {resumeData.custom && resumeData.custom.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {resumeData.custom.map((item, idx) => (
                                      <div key={idx} className="group flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-sm">
                                        <div className="w-1 h-full bg-fuchsia-500 dark:bg-fuchsia-400 rounded-full min-h-[40px]" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{item.title || 'Section Title'}</p>
                                          {item.content && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]+>/g, '') }} />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setCurrentCustom(item);
                                              setEditingIndex(idx);
                                              setEditingSection('custom');
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title="Edit"
                                          >
                                            <PencilIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setResumeData(prev => ({
                                                ...prev,
                                                custom: prev.custom.filter((_, i) => i !== idx),
                                              }));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {editingSection === 'custom' ? (
                                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <FieldGroup className="space-y-5">
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Section Title
                                        </Label>
                                        <Input
                                          value={currentCustom.title}
                                          onChange={(e) => setCurrentCustom(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="e.g. Certifications"
                                          className="transition-all duration-200 focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
                                        />
                                      </Field>
                                      <Field>
                                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">
                                          Content
                                        </Label>
                                        <RichTextEditor
                                          value={currentCustom.content || ''}
                                          onChange={(value) => setCurrentCustom(prev => ({ ...prev, content: value }))}
                                          placeholder="Enter content..."
                                        />
                                      </Field>
                                    </FieldGroup>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                      <Button
                                        onClick={() => {
                                          setCurrentCustom({ title: '', content: '' });
                                          setEditingIndex(null);
                                          setEditingSection(null);
                                        }}
                                        plain
                                        size="sm"
                                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (currentCustom.title) {
                                            if (editingIndex !== null && editingIndex >= 0) {
                                              setResumeData(prev => ({
                                                ...prev,
                                                custom: prev.custom.map((c, i) => i === editingIndex ? currentCustom : c),
                                              }));
                                            } else {
                                              addCustom();
                                            }
                                            setCurrentCustom({ title: '', content: '' });
                                            setEditingIndex(null);
                                            setEditingSection(null);
                                          }
                                        }}
                                        color="fuchsia"
                                        size="sm"
                                        className="transition-all duration-200 hover:scale-105"
                                      >
                                        {editingIndex !== null ? 'Update Section' : 'Add Section'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      setCurrentCustom({ title: '', content: '' });
                                      setEditingIndex(null);
                                      setEditingSection('custom');
                                    }}
                                    outline
                                    size="sm"
                                    className="w-full transition-all duration-200 hover:scale-[1.02]"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Custom Section
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Add Content Button - Opens Modal to Select Block Type */}
                        <button
                          onClick={() => setShowAddBlockModal(true)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                        >
                          <PlusIcon className="h-5 w-5" />
                          Add Content
                        </button>



                        {/* Block Type Selection Modal - Grid Layout */}
                        <Transition appear show={showAddBlockModal} as={Fragment}>
                          <Dialog as="div" className="relative z-50" onClose={() => setShowAddBlockModal(false)}>
                            <Transition.Child
                              as={Fragment}
                              enter="ease-out duration-300"
                              enterFrom="opacity-0"
                              enterTo="opacity-100"
                              leave="ease-in duration-200"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <div className="fixed inset-0 bg-black/30" />
                            </Transition.Child>

                            <div className="fixed inset-0 overflow-y-auto">
                              <div className="flex min-h-full items-center justify-center p-4">
                                <Transition.Child
                                  as={Fragment}
                                  enter="ease-out duration-300"
                                  enterFrom="opacity-0 scale-95"
                                  enterTo="opacity-100 scale-100"
                                  leave="ease-in duration-200"
                                  leaveFrom="opacity-100 scale-100"
                                  leaveTo="opacity-0 scale-95"
                                >
                                  <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-zinc-200">
                                      <div className="flex items-center gap-4">
                                        <h2 className="text-2xl font-bold text-purple-900">Add content</h2>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-zinc-600">Quick start:</span>
                                          <button className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm font-medium">
                                            <CloudArrowUpIcon className="h-4 w-4" />
                                            Import Resume
                                          </button>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setShowAddBlockModal(false)}
                                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                                      >
                                        <XMarkIcon className="h-5 w-5 text-zinc-600" />
                                      </button>
                                    </div>

                                    {/* Content Blocks Grid */}
                                    <div className="p-6">
                                      <div className="grid grid-cols-4 gap-4">
                                        {/* Education */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('education')) {
                                              setAddedSections(prev => [...prev, 'education']);
                                              setSelectedBlockType('education');
                                              setEditingSection('education');
                                              setExpandedSections(prev => ({ ...prev, education: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('education')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('education')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <AcademicCapIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('education') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Education</h3>
                                          <p className="text-xs text-zinc-600">Show off your primary education, college degrees & exchange semesters.</p>
                                        </button>

                                        {/* Professional Experience */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('experience')) {
                                              setAddedSections(prev => [...prev, 'experience']);
                                              setSelectedBlockType('experience');
                                              setEditingSection('experience');
                                              setExpandedSections(prev => ({ ...prev, experience: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('experience')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('experience')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <BriefcaseIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('experience') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Professional Experience</h3>
                                          <p className="text-xs text-zinc-600">A place to highlight your professional experience - including internships.</p>
                                        </button>

                                        {/* Skills */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('skills')) {
                                              setAddedSections(prev => [...prev, 'skills']);
                                              setSelectedBlockType('skills');
                                              setEditingSection('skills');
                                              setExpandedSections(prev => ({ ...prev, skills: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('skills')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('skills')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <LightBulbIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('skills') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Skills</h3>
                                          <p className="text-xs text-zinc-600">List your technical, managerial or soft skills in this section.</p>
                                        </button>

                                        {/* Profile Summary */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('profileSummary')) {
                                              setAddedSections(prev => [...prev, 'profileSummary']);
                                              setSelectedBlockType('profileSummary');
                                              setEditingSection('profileSummary');
                                              setExpandedSections(prev => ({ ...prev, profileSummary: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('profileSummary')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('profileSummary')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <UserIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('profileSummary') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Profile Summary</h3>
                                          <p className="text-xs text-zinc-600">A brief overview of your professional background and key achievements.</p>
                                        </button>

                                        {/* Languages */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('languages')) {
                                              setAddedSections(prev => [...prev, 'languages']);
                                              setSelectedBlockType('languages');
                                              setEditingSection('languages');
                                              setExpandedSections(prev => ({ ...prev, languages: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('languages')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('languages')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <GlobeAltIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('languages') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Languages</h3>
                                          <p className="text-xs text-zinc-600">You speak more than one language? Make sure to list them here.</p>
                                        </button>

                                        {/* Certificates */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('certifications')) {
                                              setAddedSections(prev => [...prev, 'certifications']);
                                              setSelectedBlockType('certifications');
                                              setEditingSection('certifications');
                                              setExpandedSections(prev => ({ ...prev, certifications: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('certifications')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('certifications')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <DocumentTextIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('certifications') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Certificates</h3>
                                          <p className="text-xs text-zinc-600">Drivers licenses and other industry-specific certificates you have belong here.</p>
                                        </button>

                                        {/* Interests */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('interests')) {
                                              setAddedSections(prev => [...prev, 'interests']);
                                              setSelectedBlockType('interests');
                                              setEditingSection('interests');
                                              setExpandedSections(prev => ({ ...prev, interests: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('interests')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('interests')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <HeartIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('interests') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Interests</h3>
                                          <p className="text-xs text-zinc-600">Do you have interests that align with your career aspiration?</p>
                                        </button>

                                        {/* Projects */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('projects')) {
                                              setAddedSections(prev => [...prev, 'projects']);
                                              setSelectedBlockType('projects');
                                              setEditingSection('projects');
                                              setExpandedSections(prev => ({ ...prev, projects: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('projects')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('projects')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <FolderIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('projects') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Projects</h3>
                                          <p className="text-xs text-zinc-600">Worked on a particular challenging project in the past? Mention it here.</p>
                                        </button>

                                        {/* Courses */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('courses')) {
                                              setAddedSections(prev => [...prev, 'courses']);
                                              setSelectedBlockType('courses');
                                              setEditingSection('courses');
                                              setExpandedSections(prev => ({ ...prev, courses: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('courses')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('courses')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <BookOpenIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('courses') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Courses</h3>
                                          <p className="text-xs text-zinc-600">Did you complete MOOCs or an evening course? Show them off in this section.</p>
                                        </button>

                                        {/* Awards */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('awards')) {
                                              setAddedSections(prev => [...prev, 'awards']);
                                              setSelectedBlockType('awards');
                                              setEditingSection('awards');
                                              setExpandedSections(prev => ({ ...prev, awards: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('awards')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('awards')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <TrophyIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('awards') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Awards</h3>
                                          <p className="text-xs text-zinc-600">Awards like student competitions or industry accolades belong here.</p>
                                        </button>

                                        {/* Organizations */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('organizations')) {
                                              setAddedSections(prev => [...prev, 'organizations']);
                                              setSelectedBlockType('organizations');
                                              setEditingSection('organizations');
                                              setExpandedSections(prev => ({ ...prev, organizations: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('organizations')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('organizations')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <HeartIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('organizations') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Organizations</h3>
                                          <p className="text-xs text-zinc-600">If you volunteer or participate in a good cause, why not state it?</p>
                                        </button>

                                        {/* Publications */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('publications')) {
                                              setAddedSections(prev => [...prev, 'publications']);
                                              setSelectedBlockType('publications');
                                              setEditingSection('publications');
                                              setExpandedSections(prev => ({ ...prev, publications: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('publications')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('publications')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <BookOpenIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('publications') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Publications</h3>
                                          <p className="text-xs text-zinc-600">Academic publications or book releases have a dedicated place here.</p>
                                        </button>

                                        {/* References */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('references')) {
                                              setAddedSections(prev => [...prev, 'references']);
                                              setSelectedBlockType('references');
                                              setEditingSection('references');
                                              setExpandedSections(prev => ({ ...prev, references: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('references')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('references')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <UserGroupIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('references') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">References</h3>
                                          <p className="text-xs text-zinc-600">If you have former colleagues or bosses that vouch for you, list them.</p>
                                        </button>

                                        {/* Declaration */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('declaration')) {
                                              setAddedSections(prev => [...prev, 'declaration']);
                                              setSelectedBlockType('declaration');
                                              setEditingSection('declaration');
                                              setExpandedSections(prev => ({ ...prev, declaration: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('declaration')}
                                          className={`p-4 rounded-lg border transition-all text-left ${addedSections.includes('declaration')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <PencilIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('declaration') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Declaration</h3>
                                          <p className="text-xs text-zinc-600">You need a declaration with signature?</p>
                                        </button>

                                        {/* Custom - Dashed Border */}
                                        <button
                                          onClick={() => {
                                            if (!addedSections.includes('custom')) {
                                              setAddedSections(prev => [...prev, 'custom']);
                                              setSelectedBlockType('custom');
                                              setEditingSection('custom');
                                              setExpandedSections(prev => ({ ...prev, custom: true }));
                                              setShowAddBlockModal(false);
                                            }
                                          }}
                                          disabled={addedSections.includes('custom')}
                                          className={`p-4 rounded-lg border-2 border-dashed transition-all text-left ${addedSections.includes('custom')
                                            ? 'bg-zinc-100 border-zinc-300 opacity-50 cursor-not-allowed'
                                            : 'bg-zinc-50 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                                            }`}
                                        >
                                          <div className="flex items-start justify-between mb-3">
                                            <PuzzlePieceIcon className="h-8 w-8 text-zinc-600" />
                                            {addedSections.includes('custom') && (
                                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                          <h3 className="font-semibold text-zinc-950 mb-1">Custom</h3>
                                          <p className="text-xs text-zinc-600">You didn't find what you are looking for? Or you want to combine two sections to save space?</p>
                                        </button>
                                      </div>
                                    </div>
                                  </Dialog.Panel>
                                </Transition.Child>
                              </div>
                            </div>
                          </Dialog>
                        </Transition>
                      </>
                    )}


                    {/* Customize Tab */}
                    {activeTab === EDITOR_TABS.CUSTOMIZE && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Template Selection */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white mb-5 flex items-center gap-2">
                            <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                            Resume Template
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {templates.map((template) => {
                              const isSelected = selectedTemplate === template.id;
                              const isLocked = template.isPro && !canAccessProTemplate(template);
                              return (
                                <button
                                  key={template.id}
                                  onClick={() => handleTemplateSwitch(template.id)}
                                  className={`relative group p-3 rounded-xl border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                                  } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}`}
                                >
                                  {template.isPro && (
                                    <div className="absolute top-2 right-2">
                                      <Badge className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-[10px] font-bold px-2 py-0.5">
                                        PRO
                                      </Badge>
                                    </div>
                                  )}
                                  {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 dark:bg-zinc-800/50 rounded-xl">
                                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="text-left">
                                    <div className="font-semibold text-sm text-zinc-950 dark:text-white mb-1">
                                      {template.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                      {template.description}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute bottom-2 right-2">
                                      <CheckCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white mb-5 flex items-center gap-2">
                            <SwatchIcon className="h-4 w-4 text-purple-600" />
                            Template Design
                          </h3>
                          <FieldGroup className="space-y-6">
                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3 block">Color Theme</Label>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {[
                                  { value: 'blue', label: 'Blue', color: 'bg-blue-600', ring: 'ring-blue-600' },
                                  { value: 'green', label: 'Green', color: 'bg-emerald-600', ring: 'ring-emerald-600' },
                                  { value: 'purple', label: 'Purple', color: 'bg-purple-600', ring: 'ring-purple-600' },
                                  { value: 'orange', label: 'Orange', color: 'bg-orange-600', ring: 'ring-orange-600' },
                                  { value: 'red', label: 'Red', color: 'bg-rose-600', ring: 'ring-rose-600' },
                                  { value: 'indigo', label: 'Indigo', color: 'bg-indigo-600', ring: 'ring-indigo-600' },
                                  { value: 'slate', label: 'Slate', color: 'bg-slate-600', ring: 'ring-slate-600' },
                                  { value: 'black', label: 'Black', color: 'bg-zinc-900', ring: 'ring-zinc-900' },
                                ].map((scheme) => (
                                  <button
                                    key={scheme.value}
                                    onClick={() => setTemplateSettings(prev => ({ ...prev, colorScheme: scheme.value }))}
                                    className={`relative group flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200 ${templateSettings.colorScheme === scheme.value
                                      ? `border-${scheme.value}-200 dark:border-${scheme.value}-900/50 bg-${scheme.value}-50 dark:bg-${scheme.value}-900/10 ring-1 ${scheme.ring}`
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                                      }`}
                                  >
                                    <div className={`w-8 h-8 rounded-full ${scheme.color} shadow-sm group-hover:scale-110 transition-transform duration-200`} />
                                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">{scheme.label}</span>
                                    {templateSettings.colorScheme === scheme.value && (
                                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current text-primary-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </Field>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Field>
                                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3 block">Typography</Label>
                                <div className="space-y-2">
                                  <select
                                    value={templateSettings.fontFamily}
                                    onChange={(e) => setTemplateSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                                    className="w-full rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 py-2.5 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer hover:bg-white dark:hover:bg-zinc-700"
                                  >
                                    <option value="inter">Inter (Modern Sans)</option>
                                    <option value="roboto">Roboto (Geometric)</option>
                                    <option value="playfair">Playfair Display (Serif)</option>
                                    <option value="lato">Lato (Humanist)</option>
                                    <option value="montserrat">Montserrat (Bold)</option>
                                    <option value="opensans">Open Sans (Neutral)</option>
                                  </select>
                                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                                    <span className="text-sm text-zinc-500" style={{ fontFamily: templateSettings.fontFamily }}>
                                      The quick brown fox jumps over the lazy dog.
                                    </span>
                                  </div>
                                </div>
                              </Field>

                              <Field>
                                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3 block">Text Size</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { value: 'small', label: 'Compact', icon: 'A', size: 'text-xs' },
                                    { value: 'medium', label: 'Standard', icon: 'A', size: 'text-sm' },
                                    { value: 'large', label: 'Large', icon: 'A', size: 'text-base' },
                                  ].map((size) => (
                                    <button
                                      key={size.value}
                                      onClick={() => setTemplateSettings(prev => ({ ...prev, fontSize: size.value }))}
                                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all duration-200 ${templateSettings.fontSize === size.value
                                        ? 'border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 ring-1 ring-purple-600 dark:ring-purple-400'
                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900'
                                        }`}
                                    >
                                      <span className={`font-serif font-medium mb-1 ${size.size}`}>{size.icon}</span>
                                      <span className="text-[10px] uppercase tracking-wide">{size.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </Field>
                            </div>

                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3 block">Line Spacing</Label>
                              <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="text-xs font-medium text-zinc-500">Tight</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="2"
                                  step="0.1"
                                  value={templateSettings.lineHeight || 1.5}
                                  onChange={(e) => setTemplateSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                                  className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <span className="text-xs font-medium text-zinc-500">Loose</span>
                              </div>
                            </Field>
                          </FieldGroup>
                        </div>
                      </div>
                    )}

                    {/* Upgrade Modal for PRO Templates */}
                    <Transition show={showUpgradeModal}>
                      <Dialog as="div" className="relative z-50" onClose={() => setShowUpgradeModal(false)}>
                        <Transition.Child
                          as={Fragment}
                          enter="ease-out duration-300"
                          enterFrom="opacity-0"
                          enterTo="opacity-100"
                          leave="ease-in duration-200"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <div className="fixed inset-0 bg-zinc-900/75 backdrop-blur-sm" />
                        </Transition.Child>

                        <div className="fixed inset-0 overflow-y-auto">
                          <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                              as={Fragment}
                              enter="ease-out duration-300"
                              enterFrom="opacity-0 scale-95"
                              enterTo="opacity-100 scale-100"
                              leave="ease-in duration-200"
                              leaveFrom="opacity-100 scale-100"
                              leaveTo="opacity-0 scale-95"
                            >
                              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                  <Dialog.Title as="h3" className="text-xl font-bold text-zinc-950 dark:text-white">
                                    Upgrade to PRO
                                  </Dialog.Title>
                                  <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                  >
                                    <XMarkIcon className="h-5 w-5" />
                                  </button>
                                </div>

                                <div className="mb-6">
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                    The <span className="font-semibold text-primary-600">{selectedProTemplate?.name}</span> template is available exclusively for PRO members.
                                  </p>
                                  <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
                                    <h4 className="font-semibold text-zinc-950 dark:text-white mb-2">PRO Plan Benefits:</h4>
                                    <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                                      <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                                        Access to all premium templates
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                                        Unlimited resume downloads
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                                        Advanced customization options
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                                        Priority support
                                      </li>
                                    </ul>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                  >
                                    Maybe Later
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowUpgradeModal(false);
                                      router.push('/candidate/billing');
                                    }}
                                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                  >
                                    Upgrade Now
                                  </button>
                                </div>
                              </Dialog.Panel>
                            </Transition.Child>
                          </div>
                        </div>
                      </Dialog>
                    </Transition>

                    {/* Overview and Links tabs */}
                    {activeTab === EDITOR_TABS.OVERVIEW && (
                      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-zinc-950 mb-2">Resume Overview</h3>
                        <p className="text-sm text-zinc-600">Template: {selectedTemplate || 'modern'}</p>
                        <p className="text-sm text-zinc-600">Last updated: {new Date().toLocaleDateString()}</p>
                      </div>
                    )}
                    {/* Links Tab */}
                    {activeTab === EDITOR_TABS.LINKS && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white mb-5 flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-primary-600" />
                            Web & Social Links
                          </h3>
                          <FieldGroup className="space-y-5">
                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">LinkedIn Profile</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="h-5 w-5 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                  </svg>
                                </div>
                                <Input
                                  value={resumeData.linkedin}
                                  onChange={(e) => setResumeData(prev => ({ ...prev, linkedin: e.target.value }))}
                                  placeholder="linkedin.com/in/yourname"
                                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-[#0077b5]/20 focus:border-[#0077b5]"
                                />
                              </div>
                            </Field>
                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">GitHub Profile</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="h-5 w-5 text-zinc-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                  </svg>
                                </div>
                                <Input
                                  value={resumeData.github}
                                  onChange={(e) => setResumeData(prev => ({ ...prev, github: e.target.value }))}
                                  placeholder="github.com/yourname"
                                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                                />
                              </div>
                            </Field>
                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">Personal Website / Portfolio</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <GlobeAltIcon className="h-5 w-5 text-indigo-500" />
                                </div>
                                <Input
                                  value={resumeData.website}
                                  onChange={(e) => setResumeData(prev => ({ ...prev, website: e.target.value }))}
                                  placeholder="yourwebsite.com"
                                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                              </div>
                            </Field>
                            <Field>
                              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2 block">Twitter / X (Optional)</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="h-4 w-4 text-zinc-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                </div>
                                <Input
                                  value={resumeData.twitter}
                                  onChange={(e) => setResumeData(prev => ({ ...prev, twitter: e.target.value }))}
                                  placeholder="twitter.com/yourname"
                                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                />
                              </div>
                            </Field>
                          </FieldGroup>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Preview Panel - 2 columns - PDF Preview */}
                  <div className="col-span-2 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
                    {/* PDF Preview Header */}
                    <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">PDF Preview</h3>
                        {currentResume && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{resumeData.name || currentResume.name || 'My Resume'}</p>
                            {currentResume.createdAt && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(currentResume.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pdfGenerating && (
                          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            <span>Generating PDF...</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {!pdfGenerating && (
                            <button
                              onClick={() => setShowPDFPreview(!showPDFPreview)}
                              className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                              title={showPDFPreview ? 'Switch to HTML Preview' : 'Switch to PDF Preview'}
                            >
                              {showPDFPreview ? 'HTML' : 'PDF'}
                            </button>
                          )}
                          {!pdfGenerating && pdfPreviewUrl && showPDFPreview && (
                            <button
                              onClick={ensurePDFPreview}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Refresh PDF Preview"
                            >
                              <ArrowPathIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </button>
                          )}
                          <Badge color="zinc" className="text-xs capitalize">{selectedTemplate || 'modern'}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* PDF Viewer or HTML Preview */}
                    <div className="flex-1 overflow-hidden relative bg-zinc-50 dark:bg-zinc-900">
                      {pdfGenerating ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <ArrowPathIcon className="h-12 w-12 mx-auto mb-4 text-blue-500 dark:text-primary-400 animate-spin" />
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Generating PDF preview...</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">This may take a few seconds</p>
                          </div>
                        </div>
                      ) : showPDFPreview && pdfPreviewUrl ? (
                        <embed
                          src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                          type="application/pdf"
                          className="w-full h-full"
                          title="Resume PDF Preview"
                          onError={(e) => {
                            console.error('PDF embed error:', e);
                            toast.error('Failed to load PDF preview. Showing HTML preview instead.');
                            setShowPDFPreview(false);
                          }}
                        />
                      ) : (
                        <div className="h-full overflow-y-auto">
                          {/* HTML Preview Fallback */}
                          {selectedTemplate === 'finance' ? (
                            <FinanceTemplatePreview data={resumeData} />
                          ) : (
                            <DefaultPreview 
                              resumeData={resumeData} 
                              templateSettings={templateSettings} 
                              currentResume={currentResume}
                              selectedTemplate={selectedTemplate}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expert Review Step */}
            {currentStep === WIZARD_STEPS.EXPERT_REVIEW && (
              <div className="w-full px-6 py-8 bg-white dark:bg-zinc-900 min-h-[80vh]">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                      Get Expert Review
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Have a professional review your resume and get personalized feedback
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Basic Review Package */}
                    <div
                      onClick={() => setSelectedReviewPackage('basic')}
                      className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedReviewPackage === 'basic'
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Basic Review</h3>
                        {selectedReviewPackage === 'basic' && (
                          <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-zinc-950 dark:text-white">$29</span>
                        <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-1">one-time</span>
                      </div>
                      <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Grammar & spelling check</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Formatting review</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Basic feedback</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>24-48 hour turnaround</span>
                        </li>
                      </ul>
                    </div>

                    {/* Professional Review Package */}
                    <div
                      onClick={() => setSelectedReviewPackage('professional')}
                      className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedReviewPackage === 'professional'
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold px-2 py-1">
                          POPULAR
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Professional Review</h3>
                        {selectedReviewPackage === 'professional' && (
                          <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-zinc-950 dark:text-white">$79</span>
                        <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-1">one-time</span>
                      </div>
                      <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Everything in Basic</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Industry-specific feedback</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>ATS optimization tips</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Content enhancement suggestions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>12-24 hour turnaround</span>
                        </li>
                      </ul>
                    </div>

                    {/* Executive Review Package */}
                    <div
                      onClick={() => setSelectedReviewPackage('executive')}
                      className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedReviewPackage === 'executive'
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">Executive Review</h3>
                        {selectedReviewPackage === 'executive' && (
                          <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-zinc-950 dark:text-white">$149</span>
                        <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-1">one-time</span>
                      </div>
                      <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Everything in Professional</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>1-on-1 consultation call</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>Personalized rewrite suggestions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>LinkedIn profile review</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <span>6-12 hour turnaround</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => navigateToStep(WIZARD_STEPS.TARGET_POSITIONS)}
                      className="px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Skip for Now
                    </button>
                    {selectedReviewPackage && (
                      <button
                        onClick={async () => {
                          // Handle payment/checkout for selected package
                          toast.info(`Redirecting to checkout for ${selectedReviewPackage} review...`);
                          // TODO: Integrate with payment system
                          // For now, proceed to target positions
                          navigateToStep(WIZARD_STEPS.TARGET_POSITIONS);
                        }}
                        className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                      >
                        Continue with Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Target Positions Step */}
            {currentStep === WIZARD_STEPS.TARGET_POSITIONS && (
              <div className="w-full px-4 sm:px-6 py-12 bg-white dark:bg-zinc-950 min-h-screen">
                <div className="max-w-3xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                  >
                    <h1 className="text-5xl font-extrabold text-zinc-900 dark:text-white mb-4 tracking-tight">
                      Target Position Details
                    </h1>
                    <p className="text-xl text-zinc-600 dark:text-zinc-400 font-light">
                      Help us match you with the right opportunities
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-10 space-y-10"
                  >
                    <FieldGroup className="space-y-8">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                            Target Position / Job Title
                          </Label>
                          <input
                            type="text"
                            value={targetPositions.position}
                            onChange={(e) => setTargetPositions(prev => ({ ...prev, position: e.target.value }))}
                            placeholder="e.g. Software Engineer, Product Manager"
                            className="w-full h-14 px-5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
                          />
                        </Field>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                            Preferred Country
                          </Label>
                          <div className="relative">
                            <div className="relative">
                              <MapPinIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10" />
                              <input
                                type="text"
                                value={countryQuery}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setCountryQuery(value);
                                  setShowCountryDropdown(value.length > 0);
                                }}
                                onFocus={() => {
                                  if (countryQuery || !targetPositions.country) {
                                    setShowCountryDropdown(true);
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => setShowCountryDropdown(false), 200);
                                }}
                                placeholder="Search for a country..."
                                className="w-full h-14 pl-14 pr-14 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
                              />
                              {targetPositions.country && (
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  type="button"
                                  onClick={() => {
                                    setTargetPositions(prev => ({ ...prev, country: '', cities: [], currency: 'USD' }));
                                    setCountryQuery('');
                                    setCityQuery('');
                                    setShowCountryDropdown(false);
                                    setShowCityDropdown(false);
                                  }}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </motion.button>
                              )}
                            </div>
                            
                            {/* Country Dropdown */}
                            <AnimatePresence>
                              {showCountryDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto"
                                >
                                  {countries
                                    .filter(country => 
                                      country.name.toLowerCase().includes(countryQuery.toLowerCase()) &&
                                      country.name !== targetPositions.country
                                    )
                                    .map((country, index) => (
                                      <motion.button
                                        key={country.code}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.02 }}
                                        type="button"
                                        onClick={() => {
                                          setTargetPositions(prev => ({ 
                                            ...prev, 
                                            country: country.name,
                                            cities: [], // Clear cities when country changes
                                            currency: country.currency
                                          }));
                                          setCountryQuery('');
                                          setCityQuery('');
                                          setShowCountryDropdown(false);
                                          setShowCityDropdown(false);
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 flex items-center gap-3 text-sm text-zinc-900 dark:text-white group border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                      >
                                        <span className="text-2xl">{country.flag}</span>
                                        <span className="flex-1 font-medium">{country.name}</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                          {country.currency}
                                        </span>
                                      </motion.button>
                                    ))}
                                  {countries.filter(country => 
                                    country.name.toLowerCase().includes(countryQuery.toLowerCase()) &&
                                    country.name !== targetPositions.country
                                  ).length === 0 && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center"
                                    >
                                      No countries found
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          {/* Selected Country Badge */}
                          <AnimatePresence>
                            {targetPositions.country && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                transition={{ 
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 20
                                }}
                                className="mt-3 inline-flex items-center gap-2.5 px-5 py-2.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl text-sm font-semibold text-primary-700 dark:text-primary-300"
                              >
                                <span className="text-xl">
                                  {countries.find(c => c.name === targetPositions.country)?.flag || '🌍'}
                                </span>
                                <span>{targetPositions.country}</span>
                                <span className="ml-2 text-xs bg-primary-200 dark:bg-primary-900/50 px-2 py-0.5 rounded-md">
                                  {targetPositions.currency} {currencySymbols[targetPositions.currency] || targetPositions.currency}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Field>
                      </motion.div>

                      {/* City Selection - Only show after country is selected */}
                      <AnimatePresence>
                        {targetPositions.country && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: 0.1 }}
                            >
                              <Field>
                                <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                                  Preferred Cities
                                </Label>
                                <div className="relative">
                                  <div className="relative">
                                    <MapPinIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10" />
                                    <input
                                      type="text"
                                      value={cityQuery}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setCityQuery(value);
                                        setShowCityDropdown(value.length > 0);
                                      }}
                                      onFocus={() => {
                                        if (cityQuery || targetPositions.cities.length === 0) {
                                          setShowCityDropdown(true);
                                        }
                                      }}
                                      onBlur={() => {
                                        setTimeout(() => setShowCityDropdown(false), 200);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && cityQuery.trim() && !targetPositions.cities.includes(cityQuery.trim())) {
                                          e.preventDefault();
                                          setTargetPositions(prev => ({ 
                                            ...prev, 
                                            cities: [...prev.cities, cityQuery.trim()] 
                                          }));
                                          setCityQuery('');
                                          setShowCityDropdown(false);
                                        }
                                      }}
                                      placeholder="Search and add cities..."
                                      className="w-full h-14 pl-14 pr-14 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
                                    />
                                    {cityQuery && (
                                      <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        type="button"
                                        onClick={() => {
                                          setCityQuery('');
                                          setShowCityDropdown(false);
                                        }}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </motion.button>
                                    )}
                                  </div>
                                  
                                  {/* City Dropdown */}
                                  <AnimatePresence>
                                    {showCityDropdown && targetPositions.country && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto"
                                      >
                                        {(citiesByCountry[targetPositions.country] || [])
                                          .filter(city => 
                                            city.toLowerCase().includes(cityQuery.toLowerCase()) &&
                                            !targetPositions.cities.includes(city)
                                          )
                                          .slice(0, 15)
                                          .map((city, index) => (
                                            <motion.button
                                              key={city}
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ duration: 0.2, delay: index * 0.02 }}
                                              type="button"
                                              onClick={() => {
                                                if (!targetPositions.cities.includes(city)) {
                                                  setTargetPositions(prev => ({ 
                                                    ...prev, 
                                                    cities: [...prev.cities, city]
                                                  }));
                                                  setCityQuery('');
                                                  setShowCityDropdown(false);
                                                }
                                              }}
                                              className="w-full px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 flex items-center gap-3 text-sm text-zinc-900 dark:text-white group border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                            >
                                              <MapPinIcon className="h-4 w-4 text-zinc-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 flex-shrink-0 transition-colors" />
                                              <span className="flex-1 font-medium">{city}</span>
                                              <PlusIcon className="h-4 w-4 text-zinc-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all" />
                                            </motion.button>
                                          ))}
                                        {(citiesByCountry[targetPositions.country] || []).filter(city => 
                                          city.toLowerCase().includes(cityQuery.toLowerCase()) &&
                                          !targetPositions.cities.includes(city)
                                        ).length === 0 && (
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center"
                                          >
                                            No cities found
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                
                                {/* Selected Cities Badges */}
                                <AnimatePresence>
                                  {targetPositions.cities.length > 0 && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="mt-3 flex flex-wrap gap-2"
                                    >
                                      {targetPositions.cities.map((city, index) => (
                                        <motion.div
                                          key={city}
                                          initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                          animate={{ opacity: 1, scale: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                          transition={{ 
                                            duration: 0.2,
                                            delay: index * 0.05,
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20
                                          }}
                                          className="group inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent-50 to-accent-100/50 dark:from-accent-900/30 dark:to-accent-800/20 border-2 border-accent-200 dark:border-accent-800 rounded-lg text-sm font-medium text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 transition-all duration-200"
                                        >
                                          <MapPinIcon className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
                                          <span>{city}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTargetPositions(prev => ({
                                                ...prev,
                                                cities: prev.cities.filter(c => c !== city)
                                              }));
                                            }}
                                            className="ml-1 text-accent-600 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-200 opacity-60 hover:opacity-100 transition-opacity"
                                          >
                                            <XMarkIcon className="h-3.5 w-3.5" />
                                          </button>
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </Field>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Job Type Selection */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                      >
                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-4 block">
                            Job Type
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {jobTypes.map((type) => (
                              <motion.button
                                key={type.value}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => setTargetPositions(prev => ({ ...prev, jobType: type.value }))}
                                className={`h-16 rounded-2xl border transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-base ${
                                  targetPositions.jobType === type.value
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-lg shadow-primary-500/20'
                                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-primary-400 dark:hover:border-primary-700 hover:bg-white dark:hover:bg-zinc-800'
                                }`}
                              >
                                <span className="text-2xl">{type.icon}</span>
                                <span>{type.label}</span>
                              </motion.button>
                            ))}
                          </div>
                        </Field>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                      >
                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                            Minimum Salary
                          </Label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 pointer-events-none">
                              <span className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                                {currencySymbols[targetPositions.currency] || targetPositions.currency}
                              </span>
                              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-md">
                                {targetPositions.currency}
                              </span>
                            </div>
                            <input
                              type="number"
                              value={targetPositions.salaryMin}
                              onChange={(e) => setTargetPositions(prev => ({ ...prev, salaryMin: e.target.value }))}
                              placeholder="0"
                              className="w-full h-14 pl-28 pr-4 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
                            />
                          </div>
                        </Field>

                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                            Maximum Salary
                          </Label>
                          <input
                            type="number"
                            value={targetPositions.salaryMax}
                            onChange={(e) => setTargetPositions(prev => ({ ...prev, salaryMax: e.target.value }))}
                            placeholder="0"
                            className="w-full h-14 px-5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
                          />
                        </Field>

                        <Field>
                          <Label className="text-base font-semibold text-zinc-900 dark:text-white mb-3 block">
                            Period
                          </Label>
                          <div className="relative">
                            <select
                              value={targetPositions.salaryPeriod}
                              onChange={(e) => setTargetPositions(prev => ({ ...prev, salaryPeriod: e.target.value }))}
                              className="w-full h-14 px-5 pr-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base transition-all duration-200 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer appearance-none"
                            >
                              <option value="year">Per Year</option>
                              <option value="month">Per Month</option>
                              <option value="hour">Per Hour</option>
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                          </div>
                        </Field>
                      </motion.div>
                    </FieldGroup>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      className="flex items-center justify-end gap-4 pt-8 border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigateToStep(WIZARD_STEPS.ACTION_OPTIONS)}
                        className="px-8 py-4 text-base font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-all duration-200"
                      >
                        Skip
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2, boxShadow: "0 20px 40px -10px rgba(239, 68, 68, 0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          // Save target positions to resume
                          if (currentResume) {
                            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                            const resumeId = currentResume._id || currentResume.id;
                            try {
                              await fetch(`${API_URL}/api/resume-builder/${resumeId}`, {
                                method: 'PATCH',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ targetPositions }),
                              });
                            } catch (error) {
                              console.error('Error saving target positions:', error);
                            }
                          }
                          navigateToStep(WIZARD_STEPS.ACTION_OPTIONS);
                        }}
                        className="px-10 py-4 text-base font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Continue
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Action Options Step */}
            {currentStep === WIZARD_STEPS.ACTION_OPTIONS && (
              <div className="w-full px-6 py-8 bg-white dark:bg-zinc-900 min-h-[80vh]">
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                      What would you like to do next?
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Your resume is ready! Choose how you'd like to use it.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Email Resume Option */}
                    <div
                      onClick={() => {
                        // Handle email resume
                        const resumeId = currentResume?._id || currentResume?.id;
                        if (resumeId) {
                          router.push(`/candidate/resume-builder?step=editor&resume=${resumeId}`);
                          toast.info('Email functionality coming soon!');
                        }
                      }}
                      className="group p-8 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-zinc-900 cursor-pointer transition-all hover:shadow-lg"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                          <EnvelopeIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-950 dark:text-white mb-2">
                          Email Resume
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Send your resume directly to employers or yourself via email
                        </p>
                      </div>
                    </div>

                    {/* Use for Application Option */}
                    <div
                      onClick={async () => {
                        // Handle use for application
                        const resumeId = currentResume?._id || currentResume?.id;
                        if (resumeId) {
                          // Save resume first
                          try {
                            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                            await fetch(`${API_URL}/api/resume-builder/${resumeId}`, {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ 
                                ...targetPositions,
                                readyForApplication: true 
                              }),
                            });
                            
                            // Fetch matching jobs
                            setLoadingMatchingJobs(true);
                            const recommendationsResponse = await fetch(`${API_URL}/api/matching/recommendations?limit=10`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            if (recommendationsResponse.ok) {
                              const data = await recommendationsResponse.json();
                              const recommendations = data.recommendations || data.data?.recommendations || [];
                              if (recommendations && recommendations.length > 0) {
                                setMatchingJobs(recommendations);
                                setHasMatchingJobs(true);
                                navigateToStep(WIZARD_STEPS.MATCHING_JOBS);
                              } else {
                                setHasMatchingJobs(false);
                                navigateToStep(WIZARD_STEPS.MATCHING_JOBS);
                              }
                            } else {
                              // If profile not complete or other error, still show the message
                              const errorData = await recommendationsResponse.json().catch(() => ({}));
                              if (errorData.error?.includes('profile')) {
                                toast.info('Please complete your profile for better job matches');
                              }
                              setHasMatchingJobs(false);
                              navigateToStep(WIZARD_STEPS.MATCHING_JOBS);
                            }
                            setLoadingMatchingJobs(false);
                          } catch (error) {
                            console.error('Error saving resume or fetching jobs:', error);
                            toast.error('Failed to load matching jobs');
                            setLoadingMatchingJobs(false);
                            setHasMatchingJobs(false);
                            navigateToStep(WIZARD_STEPS.MATCHING_JOBS);
                          }
                        }
                      }}
                      className="group p-8 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-zinc-900 cursor-pointer transition-all hover:shadow-lg"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                          <DocumentTextIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-950 dark:text-white mb-2">
                          Use for Application
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Browse jobs and apply with this resume
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => navigateToStep(WIZARD_STEPS.EDITOR)}
                      className="px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Edit Resume
                    </button>
                    <button
                      onClick={() => navigateToStep(WIZARD_STEPS.DASHBOARD)}
                      className="px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Matching Jobs Step */}
            {currentStep === WIZARD_STEPS.MATCHING_JOBS && (
              <div className="w-full px-4 sm:px-6 py-12 bg-white dark:bg-zinc-950 min-h-screen">
                <div className="max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                  >
                    <h1 className="text-5xl font-extrabold text-zinc-900 dark:text-white mb-4 tracking-tight">
                      {hasMatchingJobs ? 'Matching Jobs Found' : 'Job Search Initiated'}
                    </h1>
                    <p className="text-xl text-zinc-600 dark:text-zinc-400 font-light">
                      {hasMatchingJobs 
                        ? 'We found some great matches for your profile'
                        : 'Our AI and Human Agents will search for jobs matching your preferences'}
                    </p>
                  </motion.div>

                  {loadingMatchingJobs ? (
                    <div className="flex items-center justify-center py-20">
                      <ArrowPathIcon className="h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin" />
                    </div>
                  ) : hasMatchingJobs ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="space-y-4"
                    >
                      {matchingJobs.map((match, index) => (
                        <motion.div
                          key={match.job._id || match.job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 hover:shadow-xl transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                                {match.job.title}
                              </h3>
                              <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                                {match.job.company} • {match.job.location}
                              </p>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                    {match.matchScore}% Match
                                  </span>
                                </div>
                                {match.matchedSkills && match.matchedSkills.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {match.matchedSkills.length} skills matched
                                    </span>
                                  </div>
                                )}
                              </div>
                              {match.job.description && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
                                  {match.job.description.substring(0, 200)}...
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={() => {
                                const jobId = match.job._id || match.job.id;
                                router.push(`/candidate/jobs/${jobId}?resume=${currentResume?._id || currentResume?.id}`);
                              }}
                              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              View Details
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                                  const jobId = match.job._id || match.job.id;
                                  const response = await fetch(`${API_URL}/api/applications/apply/${jobId}`, {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      resumeId: currentResume?._id || currentResume?.id,
                                    }),
                                  });
                                  
                                  if (response.ok) {
                                    toast.success('Application submitted successfully!');
                                  } else {
                                    const error = await response.json();
                                    toast.error(error.error || 'Failed to apply');
                                  }
                                } catch (error) {
                                  console.error('Error applying:', error);
                                  toast.error('Failed to submit application');
                                }
                              }}
                              className="px-6 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all duration-200"
                            >
                              Apply Now
                            </button>
                          </div>
                        </motion.div>
                      ))}
                      
                      <div className="mt-8 text-center">
                        <button
                          onClick={() => router.push(`/candidate/jobs?resume=${currentResume?._id || currentResume?.id}`)}
                          className="px-8 py-3 text-base font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          Browse All Jobs →
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-12 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6">
                        <SparklesIcon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                        AI & Human Agent Search Activated
                      </h2>
                      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
                        Our AI and Human Agents are now actively searching for jobs that match your preferences. 
                        You'll be notified when we find matching opportunities.
                      </p>
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center gap-3 text-zinc-700 dark:text-zinc-300">
                          <CheckCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          <span>Resume saved and ready for applications</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 text-zinc-700 dark:text-zinc-300">
                          <CheckCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          <span>Job search preferences saved</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 text-zinc-700 dark:text-zinc-300">
                          <CheckCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          <span>Active job matching enabled</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => router.push(`/candidate/jobs?resume=${currentResume?._id || currentResume?.id}`)}
                          className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Browse Available Jobs
                        </button>
                        <button
                          onClick={() => navigateToStep(WIZARD_STEPS.DASHBOARD)}
                          className="px-8 py-3 text-base font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all duration-200"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Global Resume Name Modal - Available in all steps */}
        <Transition appear show={showResumeNameModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowResumeNameModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/30" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl transition-all border border-zinc-200 dark:border-zinc-800">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-zinc-900 dark:text-white mb-2">
                      Name your resume
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-500 mb-4">
                        Give your resume a name to help you identify it later.
                      </p>
                      <Input
                        value={resumeNameInput}
                        onChange={(e) => setResumeNameInput(e.target.value)}
                        placeholder="e.g. Software Engineer Resume"
                        className="w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && resumeNameInput.trim()) {
                            handleCreateNew();
                          }
                        }}
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        plain
                        onClick={() => setShowResumeNameModal(false)}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-primary-500 hover:bg-primary-600 text-white"
                        onClick={() => {
                          if (uploadMethod === 'upload') {
                            handleFileUpload();
                          } else {
                            handleCreateNew();
                          }
                        }}
                        disabled={!resumeNameInput.trim()}
                      >
                        {uploadMethod === 'upload' ? 'Upload Resume' : 'Create Resume'}
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </DashboardLayout>
    </>
  );
}


