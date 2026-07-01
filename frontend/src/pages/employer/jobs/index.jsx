import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { employerJobsApi } from '@/services/employerApi';
import { 
  BriefcaseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UsersIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as SolidCheckCircleIcon } from '@heroicons/react/24/solid';
import EmployerLayout from '@/components/layout/EmployerLayout';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    Active: 'bg-green-100 text-green-800',
    Draft: 'bg-yellow-100 text-yellow-800',
    Closed: 'bg-gray-100 text-gray-800',
    Pending: 'bg-blue-100 text-blue-800',
    Rejected: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    Active: <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />,
    Draft: <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />,
    Closed: <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />,
    Pending: <ClockIcon className="h-3.5 w-3.5 mr-1" />,
    Rejected: <XMarkIcon className="h-3.5 w-3.5 mr-1" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
};

export default function EmployerJobs() {
  const [jobs, setJobs] = useState([
    { 
      id: 1, 
      title: 'Senior React Developer', 
      status: 'Active', 
      applications: 42, 
      date: '2023-11-15',
      posted: '2 days ago',
      type: 'Full-time',
      location: 'Remote',
      salary: '$90,000 - $120,000',
      views: 245,
      matches: 18,
      skills: ['React', 'TypeScript', 'Redux', 'Node.js', 'GraphQL']
    },
    { 
      id: 2, 
      title: 'UX/UI Designer', 
      status: 'Draft', 
      applications: 0, 
      date: '2023-11-10',
      posted: '1 week ago',
      type: 'Contract',
      location: 'New York, NY',
      salary: '$70,000 - $100,000',
      views: 0,
      matches: 0,
      skills: ['Figma', 'Sketch', 'User Research', 'Prototyping']
    },
    { 
      id: 3, 
      title: 'Product Manager', 
      status: 'Closed', 
      applications: 38, 
      date: '2023-11-05',
      posted: '2 weeks ago',
      type: 'Full-time',
      location: 'San Francisco, CA',
      salary: '$110,000 - $150,000',
      views: 189,
      matches: 12,
      skills: ['Product Strategy', 'Agile', 'Jira', 'Roadmapping']
    },
    { 
      id: 4, 
      title: 'Backend Engineer (Node.js)', 
      status: 'Active', 
      applications: 15, 
      date: '2023-11-20',
      posted: '1 day ago',
      type: 'Full-time',
      location: 'Remote',
      salary: '$100,000 - $140,000',
      views: 78,
      matches: 7,
      skills: ['Node.js', 'Express', 'MongoDB', 'AWS', 'Docker']
    },
  ]);

  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sort: 'newest',
    jobType: 'all',
    location: ''
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch live employer jobs on mount; on any failure keep the sample fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await employerJobsApi.list();
        if (!alive) return;
        const arr = Array.isArray(res?.jobs) ? res.jobs : null;
        if (arr && arr.length) {
          const statusLabel = (s) => {
            const map = {
              active: 'Active',
              draft: 'Draft',
              closed: 'Closed',
              paused: 'Pending',
            };
            return map[s] || 'Active';
          };
          const fmtSalary = (min, max) => {
            if (min && max) return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
            if (min) return `From $${Number(min).toLocaleString()}`;
            if (max) return `Up to $${Number(max).toLocaleString()}`;
            return 'Salary not specified';
          };
          setJobs(
            arr.map((j) => ({
              id: j._id,
              title: j.title || 'Untitled role',
              status: statusLabel(j.status),
              applications: j.applicantsCount ?? 0,
              date: j.createdAt || '',
              posted: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—',
              type: j.type || 'Full-time',
              location: j.location || (j.isRemote ? 'Remote' : '—'),
              salary: fmtSalary(j.salaryMin, j.salaryMax),
              views: j.views ?? 0,
              matches: j.matches ?? 0,
              skills: Array.isArray(j.skills) ? j.skills : [],
            })),
          );
        }
      } catch {
        // Keep sample fallback on any error.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const filteredJobs = jobs.filter(job => {
    // Status filter
    if (filters.status !== 'all' && job.status !== filters.status) {
      return false;
    }
    
    // Search filter
    if (filters.search && 
        !job.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !job.skills.some(skill => skill.toLowerCase().includes(filters.search.toLowerCase()))) {
      return false;
    }
    
    // Job type filter
    if (filters.jobType !== 'all' && job.type !== filters.jobType) {
      return false;
    }
    
    // Location filter
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (filters.sort === 'newest') {
      return new Date(b.date) - new Date(a.date);
    } else if (filters.sort === 'oldest') {
      return new Date(a.date) - new Date(b.date);
    } else if (filters.sort === 'applications') {
      return b.applications - a.applications;
    } else if (filters.sort === 'views') {
      return b.views - a.views;
    }
    return 0;
  });
  
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => job.status === 'Active').length;

  return (
    <EmployerLayout>
      <Head>
        <title>Jobs | Jobocate Employer</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
              <p className="mt-1 text-sm text-gray-500">
                {activeJobs} active • {totalJobs} total • {jobs.reduce((sum, job) => sum + job.applications, 0)} total applications
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/employer/jobs/post"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Post a Job
              </Link>
            </div>
          </div>

          {/* Search and filter bar */}
          <div className="mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Search jobs by title or skills..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleFilter}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <FunnelIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                  Filters
                </button>
              </div>
            </div>

            {/* Expanded filters */}
            {isFilterOpen && (
              <div className="mt-4 bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      id="status"
                      name="status"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="all">All Statuses</option>
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <option key={status} value={status}>
                          {status} ({count})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                    <select
                      id="jobType"
                      name="jobType"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                      value={filters.jobType}
                      onChange={handleFilterChange}
                    >
                      <option value="all">All Types</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      id="sort"
                      name="sort"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                      value={filters.sort}
                      onChange={handleFilterChange}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="applications">Most Applications</option>
                      <option value="views">Most Views</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Jobs List */}
          <div className="mt-6">
            {sortedJobs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedJobs.map((job) => (
                  <div key={job.id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col h-full hover:shadow-md transition-shadow duration-200">
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 bg-orange-100 p-3 rounded-lg">
                              <BriefcaseIcon className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900 line-clamp-1">{job.title}</h3>
                              <div className="mt-1">
                                <StatusBadge status={job.status} />
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <CurrencyDollarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{job.salary}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{job.type} • Posted {job.posted}</span>
                            </div>
                          </div>
                          
                          {job.skills && job.skills.length > 0 && (
                            <div className="mt-4">
                              <div className="flex flex-wrap gap-1.5">
                                {job.skills.slice(0, 3).map((skill, index) => (
                                  <span 
                                    key={index} 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {job.skills.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    +{job.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <div className="flex items-center text-gray-500">
                                  <UsersIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                  <span>{job.applications || 0} {job.applications === 1 ? 'Application' : 'Applications'}</span>
                                </div>
                                <Link 
                                  href={`/employer/jobs/${job.id}/applications`}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                  View Applications
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Applications</p>
                            <p className="text-lg font-semibold text-gray-900">{job.applications}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Views</p>
                            <p className="text-lg font-semibold text-gray-900">{job.views}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                      <Link
                        href={`/employer/jobs/${job.id}/applications`}
                        className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500"
                      >
                        View Applications
                        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <div className="flex space-x-2">
                        <Link
                          href={`/employer/jobs/${job.id}/edit`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <PencilIcon className="-ml-0.5 mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          {job.status === 'Draft' ? 'Publish' : 'Manage'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No jobs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status !== 'all' || filters.jobType !== 'all' || filters.location
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by creating a new job posting.'}
                </p>
                <div className="mt-6">
                  <Link
                    href="/employer/jobs/post"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Post a Job
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
}
