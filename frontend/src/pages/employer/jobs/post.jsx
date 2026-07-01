'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BriefcaseIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import EmployerLayout from '@/components/layout/EmployerLayout';
import { employerJobsApi } from '@/services/employerApi';

// Map the form's employment-type labels to the backend enum.
const TYPE_ENUM = {
  'Full Time': 'Full-time',
  'Part Time': 'Part-time',
  Contract: 'Contract',
  Temporary: 'Contract',
  Internship: 'Internship',
  Freelance: 'Contract',
};
const toTypeEnum = (t) => TYPE_ENUM[t] || 'Full-time';

// Custom styled input component
const StyledInput = ({ label, icon: Icon, id, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <div className="relative rounded-md shadow-sm">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
      )}
      <input
        id={id}
        className={`block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition duration-150 ease-in-out`}
        {...props}
      />
    </div>
  </div>
);

// Custom styled select component
const StyledSelect = ({ label, id, options, value, onChange, className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md shadow-sm transition duration-150 ease-in-out ${className}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Custom styled textarea component
const StyledTextarea = ({ label, id, rows = 4, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <textarea
      id={id}
      rows={rows}
      className="shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border border-gray-300 rounded-md transition duration-150 ease-in-out"
      {...props}
    />
  </div>
);

// Custom styled section component
const FormSection = ({ title, description, children, id, className = '' }) => (
  <div id={id} className={`bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md ${className}`}>
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
      <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
    <div className="px-4 py-5 sm:p-6 space-y-6">
      {children}
    </div>
  </div>
);

// Form sections for navigation
const formSections = [
  { id: 'job-info', title: 'Job Information' },
  { id: 'company', title: 'Company Details' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'preview', title: 'Preview & Submit' }
];

// Job types
const jobTypes = [
  { value: 'Full Time', label: 'Full Time' },
  { value: 'Part Time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Freelance', label: 'Freelance' },
];

// Experience levels
const experienceLevels = [
  { value: 'Entry Level', label: 'Entry Level' },
  { value: 'Mid Level', label: 'Mid Level' },
  { value: 'Senior Level', label: 'Senior Level' },
  { value: 'Executive', label: 'Executive' },
];

// Education levels
const educationLevels = [
  { value: 'High School', label: 'High School' },
  { value: 'Associate Degree', label: 'Associate Degree' },
  { value: 'Bachelor\'s Degree', label: 'Bachelor\'s Degree' },
  { value: 'Master\'s Degree', label: 'Master\'s Degree' },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'No Formal Education Required', label: 'No Formal Education Required' },
];

function PostJob() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activeSection, setActiveSection] = useState('job-info');
  
  // Initialize form data with all required fields
  const [formData, setFormData] = useState({
    title: '',
    type: 'Full Time',
    location: '',
    companyName: '',
    companyLogo: '',
    category: 'Development',
    salaryMin: '',
    salaryMax: '',
    salaryType: 'year',
    salary: '',
    experience: '',
    description: '',
    responsibilities: [],
    requirements: [],
    benefits: [],
    newResponsibility: '',
    newRequirement: '',
    newBenefit: '',
    educationLevel: "Bachelor's Degree",
    isRemote: false,
    applicationDeadline: ''
  });

  // Update salary string whenever min, max or type changes - client-side only
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const updateSalary = () => {
        if (formData.salaryMin && formData.salaryMax) {
          const min = Number(formData.salaryMin);
          const max = Number(formData.salaryMax);
          if (!isNaN(min) && !isNaN(max)) {
            const salaryStr = `$${min.toLocaleString()} - $${max.toLocaleString()}/${formData.salaryType}`;
            setFormData(prev => ({
              ...prev,
              salary: salaryStr
            }));
            return;
          }
        }
        setFormData(prev => ({
          ...prev,
          salary: ''
        }));
      };
      
      updateSalary();
    }
  }, [formData.salaryMin, formData.salaryMax, formData.salaryType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addItem = (field, valueField) => {
    const value = formData[valueField].trim();
    if (value) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value],
        [valueField]: ''
      }));
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateSalary = (min, max) => {
    if (min && max && Number(min) > Number(max)) {
      return 'Minimum salary cannot be greater than maximum salary';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Basic required-field validation.
      if (!formData.title || !formData.title.trim()) {
        throw new Error('Job title is required.');
      }

      // Validate salary
      const salaryError = validateSalary(formData.salaryMin, formData.salaryMax);
      if (salaryError) {
        throw new Error(salaryError);
      }

      // Build the DTO from the form fields for the employer jobs API.
      const dto = {
        title: formData.title.trim(),
        type: toTypeEnum(formData.type),
        location: formData.location || '',
        isRemote: !!formData.isRemote,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
        salaryPeriod: formData.salaryType === 'hour' ? 'hour' : 'year',
        description: formData.description || '',
        responsibilities: Array.isArray(formData.responsibilities) ? formData.responsibilities : [],
        requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
        benefits: Array.isArray(formData.benefits) ? formData.benefits : [],
        skills: Array.isArray(formData.skills) ? formData.skills : [],
        status: 'active',
        visibility: 'public',
      };

      await employerJobsApi.create(dto);

      // Redirect to jobs list after successful submission.
      router.push('/employer/jobs');
    } catch (error) {
      console.error('Error posting job:', error);
      setSubmitError(error?.message || 'Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render job information section
  const renderJobInfoSection = () => (
    <FormSection 
      title="Job Information" 
      description="Basic information about the job position."
      id="job-info"
      className={activeSection === 'job-info' ? 'block' : 'hidden'}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <StyledInput
            label={
              <>
                Job Title <span className="text-red-500">*</span>
              </>
            }
            icon={BriefcaseIcon}
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Senior Frontend Developer"
            required
          />
        </div>
        
        <div>
          <StyledSelect
            label="Job Type"
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={jobTypes}
          />
        </div>
        
        <div>
          <StyledInput
            label={
              <>
                Location <span className="text-red-500">*</span>
              </>
            }
            icon={MapPinIcon}
            id="location"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. New York, NY or Remote"
            required
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <StyledInput
              label="Minimum Salary ($)"
              icon={CurrencyDollarIcon}
              id="salaryMin"
              name="salaryMin"
              type="number"
              min="0"
              step="1000"
              value={formData.salaryMin}
              onChange={handleChange}
              placeholder="e.g. 60000"
            />
          </div>
          <div>
            <StyledInput
              label="Maximum Salary ($)"
              icon={CurrencyDollarIcon}
              id="salaryMax"
              name="salaryMax"
              type="number"
              min="0"
              step="1000"
              value={formData.salaryMax}
              onChange={handleChange}
              placeholder="e.g. 90000"
            />
          </div>
          <div>
            <label htmlFor="salaryType" className="block text-sm font-medium text-gray-700 mb-1">
              Per
            </label>
            <select
              id="salaryType"
              name="salaryType"
              value={formData.salaryType}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="year">Year</option>
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="hour">Hour</option>
            </select>
          </div>
          {formData.salary && (
            <div className="md:col-span-3 text-sm text-gray-500">
              Displayed as: <span className="font-medium">{formData.salary}</span>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              id="isRemote"
              name="isRemote"
              type="checkbox"
              checked={formData.isRemote}
              onChange={handleChange}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="isRemote" className="ml-2 block text-sm text-gray-700">
              This is a remote position
            </label>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <StyledTextarea
            label={
              <>
                Job Description <span className="text-red-500">*</span>
              </>
            }
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the job responsibilities, required skills, and other details..."
            rows={8}
            required
          />
        </div>
      </div>
    </FormSection>
  );

  // Render company details section
  const renderCompanySection = () => (
    <FormSection 
      title="Company Details" 
      description="Information about your company."
      id="company"
      className={activeSection === 'company' ? 'block' : 'hidden'}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <StyledInput
            label={
              <>
                Company Name <span className="text-red-500">*</span>
              </>
            }
            icon={BriefcaseIcon}
            id="companyName"
            name="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g. Acme Inc."
            required
          />
        </div>
        
        <div className="md:col-span-2">
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {formData.companyLogo ? (
                <img 
                  src={formData.companyLogo} 
                  alt="Company Logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">
                  <BriefcaseIcon className="h-10 w-10 mx-auto" />
                  <span className="text-xs block mt-1">Logo</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <StyledInput
              label="Company Logo URL (Optional)"
              id="companyLogo"
              name="companyLogo"
              type="url"
              value={formData.companyLogo}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a direct URL to your company logo. We recommend using a square image (at least 200x200px).
            </p>
          </div>
        </div>
      </div>
    </FormSection>
  );

  // Render requirements section
  const renderRequirementsSection = () => (
    <FormSection 
      title="Requirements & Benefits" 
      description="List the requirements and benefits for this position."
      id="requirements"
      className={activeSection === 'requirements' ? 'block' : 'hidden'}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Responsibilities</h4>
            <div className="flex">
              <input
                type="text"
                value={formData.newResponsibility}
                onChange={(e) => setFormData(prev => ({ ...prev, newResponsibility: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('responsibilities', 'newResponsibility'))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Add a responsibility"
              />
              <button
                type="button"
                onClick={() => addItem('responsibilities', 'newResponsibility')}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 mt-2">
              {formData.responsibilities.map((item, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm text-gray-700">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('responsibilities', index)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Requirements</h4>
            <div className="flex">
              <input
                type="text"
                value={formData.newRequirement}
                onChange={(e) => setFormData(prev => ({ ...prev, newRequirement: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('requirements', 'newRequirement'))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Add a requirement"
              />
              <button
                type="button"
                onClick={() => addItem('requirements', 'newRequirement')}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 mt-2">
              {formData.requirements.map((item, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm text-gray-700">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('requirements', index)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Benefits</h4>
            <div className="flex">
              <input
                type="text"
                value={formData.newBenefit}
                onChange={(e) => setFormData(prev => ({ ...prev, newBenefit: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('benefits', 'newBenefit'))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Add a benefit"
              />
              <button
                type="button"
                onClick={() => addItem('benefits', 'newBenefit')}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 mt-2">
              {formData.benefits.map((item, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm text-gray-700">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('benefits', index)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-6">
            <StyledSelect
              label="Required Education Level"
              id="educationLevel"
              name="educationLevel"
              value={formData.educationLevel}
              onChange={handleChange}
              options={educationLevels}
            />
          </div>
          
          <div className="mt-6">
            <StyledSelect
              label="Experience Level"
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              options={experienceLevels}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );

  // Render preview section
  const renderPreviewSection = () => (
    <FormSection 
      title="Preview & Submit" 
      description="Review your job posting before submitting."
      id="preview"
      className={activeSection === 'preview' ? 'block' : 'hidden'}
    >
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {formData.title || 'Job Title'}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {formData.companyName || 'Company Name'} • {formData.location || 'Location'}
            {formData.isRemote && ' • Remote'}
          </p>
        </div>
        <div className="px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Job Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formData.type}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Experience Level</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formData.experience || 'Not specified'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Education Level</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formData.educationLevel}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Job Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">
                {formData.description || 'No description provided.'}
              </dd>
            </div>
            {formData.responsibilities.length > 0 && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Responsibilities</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <ul className="list-disc pl-5 space-y-1">
                    {formData.responsibilities.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {formData.requirements.length > 0 && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Requirements</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <ul className="list-disc pl-5 space-y-1">
                    {formData.requirements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {formData.benefits.length > 0 && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Benefits</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <ul className="list-disc pl-5 space-y-1">
                    {formData.benefits.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </FormSection>
  );

  // Get current section index
  const currentSectionIndex = formSections.findIndex(section => section.id === activeSection);
  const isLastSection = currentSectionIndex === formSections.length - 1;

  return (
    <EmployerLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-orange-600 hover:text-orange-800 mb-4 transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1.5" />
              <span className="font-medium">Back to Jobs</span>
            </button>
            
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Fill in the details below to post a new job listing. All fields marked with <span className="text-red-500">*</span> are required.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      // Save as draft logic here
                      console.log('Saving as draft');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    form="jobPostForm"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isLastSection ? 'Publishing...' : 'Saving...'}
                      </>
                    ) : isLastSection ? 'Publish Job' : 'Save & Continue'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:block mb-8">
              <nav className="flex items-center justify-center">
                <ol className="flex items-center space-x-8">
                  {formSections.map((section, index) => (
                    <li key={section.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center ${activeSection === section.id ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${activeSection === section.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'} text-sm font-medium`}>
                          {index + 1}
                        </span>
                        <span className="ml-3 text-sm font-medium">{section.title}</span>
                      </button>
                      {index < formSections.length - 1 && (
                        <svg className="w-5 h-5 text-gray-300 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>

          {submitError && (
            <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <form id="jobPostForm" onSubmit={handleSubmit} className="space-y-8">
            {renderJobInfoSection()}
            {renderCompanySection()}
            {renderRequirementsSection()}
            {renderPreviewSection()}
            
            {/* Navigation Buttons */}
            <div className="bg-white px-4 py-3 sm:px-6 flex justify-between rounded-b-lg border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (currentSectionIndex > 0) {
                    setActiveSection(formSections[currentSectionIndex - 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={currentSectionIndex === 0}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 ${currentSectionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentIndex = formSections.findIndex(section => section.id === activeSection);
                  if (currentIndex < formSections.length - 1) {
                    setActiveSection(formSections[currentIndex + 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    // Submit form if on last section
                    document.getElementById('jobPostForm').requestSubmit();
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
              >
                {isLastSection 
                  ? (isSubmitting ? 'Publishing...' : 'Publish Job')
                  : 'Next'}
                <svg className="ml-1 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </EmployerLayout>
  );
}

export default PostJob;
