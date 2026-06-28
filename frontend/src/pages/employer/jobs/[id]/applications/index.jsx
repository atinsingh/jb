import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import EmployerLayout from '@/components/layout/EmployerLayout';

// Mock data - replace with API calls in production
const mockApplications = [
  {
    id: 'app1',
    jobId: '1',
    candidate: {
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      phone: '(555) 123-4567',
      location: 'San Francisco, CA',
      resume: '/resume.pdf',
      coverLetter: 'I am excited to apply for this position...',
      appliedDate: '2023-10-15T10:30:00Z',
    },
    status: 'New',
    jobTitle: 'Senior Frontend Developer',
    matchScore: 85,
    skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'CSS'],
    experience: '5 years',
    education: 'BSc Computer Science',
  },
  // Add more mock applications as needed
];

const ApplicationStatusBadge = ({ status }) => {
  const statusStyles = {
    New: 'bg-blue-100 text-blue-800',
    Reviewed: 'bg-purple-100 text-purple-800',
    Interview: 'bg-yellow-100 text-yellow-800',
    Hired: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
  };

  const statusIcons = {
    New: <DocumentTextIcon className="h-4 w-4 mr-1" />,
    Reviewed: <EyeIcon className="h-4 w-4 mr-1" />,
    Interview: <ClockIcon className="h-4 w-4 mr-1" />,
    Hired: <CheckCircleIcon className="h-4 w-4 mr-1" />,
    Rejected: <XMarkIcon className="h-4 w-4 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
};
export default function JobApplications() {
  const router = useRouter();
  const { id: jobId } = router.query;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    // In a real app, fetch applications for this jobId from your API
    const fetchApplications = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Filter mock data by jobId
        const filteredApps = mockApplications.filter(app => app.jobId === jobId);
        setApplications(filteredApps);
        
        // Select the first application by default if available
        if (filteredApps.length > 0) {
          setSelectedApplication(filteredApps[0]);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchApplications();
    }
  }, [jobId]);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <EmployerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <Head>
        <title>Job Applications | Jobocate</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              {applications.length} {applications.length === 1 ? 'Application' : 'Applications'}
            </h2>
            <div className="flex space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="appearance-none bg-white pl-10 pr-8 py-2 border border-gray-300 rounded-md leading-5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Interview">Interview</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row h-full">
            {/* Application List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {filteredApplications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No applications found
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <li key={application.id}>
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-150 ${
                          selectedApplication?.id === application.id ? 'bg-gray-50 border-l-4 border-orange-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{application.candidate.name}</p>
                              <p className="text-sm text-gray-500">{application.jobTitle}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <ApplicationStatusBadge status={application.status} />
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(application.candidate.appliedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Application Details */}
            <div className="w-full md:w-2/3 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {selectedApplication ? (
                <>
                  <div className="border-b border-gray-200 pb-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedApplication.candidate.name}</h2>
                        <p className="text-lg text-gray-600">{selectedApplication.jobTitle}</p>
                        <div className="mt-2">
                          <ApplicationStatusBadge status={selectedApplication.status} />
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex space-x-3">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                          Message
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5" />
                          View Resume
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a href={`mailto:${selectedApplication.candidate.email}`} className="text-orange-600 hover:text-orange-500">
                            {selectedApplication.candidate.email}
                          </a>
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a href={`tel:${selectedApplication.candidate.phone}`} className="text-orange-600 hover:text-orange-500">
                            {selectedApplication.candidate.phone}
                          </a>
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <MapPinIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {selectedApplication.candidate.location}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Applied on</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {new Date(selectedApplication.candidate.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </dd>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Cover Letter</h3>
                      <div className="mt-4 bg-gray-50 p-4 rounded-md">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {selectedApplication.candidate.coverLetter || 'No cover letter provided.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Skills & Experience</h3>
                      <div className="mt-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700">Skills</h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedApplication.skills.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Experience</h4>
                            <p className="mt-1 text-sm text-gray-900">{selectedApplication.experience}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Education</h4>
                            <p className="mt-1 text-sm text-gray-900">{selectedApplication.education}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
                      <div className="mt-4 border border-gray-200 rounded-md divide-y divide-gray-200">
                        <div className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <PaperClipIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                            <span className="ml-2 flex-1 w-0 truncate">resume.pdf</span>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <a
                              href={selectedApplication.candidate.resume}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-orange-600 hover:text-orange-500"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <XMarkIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                          Reject
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                          Move to Next Round
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No application selected</h3>
                  <p className="mt-1 text-sm text-gray-500">Select an application from the list to view details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
}

// Add getServerSideProps for server-side data fetching in production
// export async function getServerSideProps(context) {
//   const { id } = context.params;
//   // Fetch job and applications data from your API
//   // const job = await fetchJobById(id);
//   // const applications = await fetchJobApplications(id);
//   
//   return {
//     props: {
//       // job,
//       // applications,
//     },
//   };
// }
