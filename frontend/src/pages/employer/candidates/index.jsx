import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BriefcaseIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import EmployerLayout from '@/components/layout/EmployerLayout';

// Function to generate avatar URL with initials
const getAvatarUrl = (name, size = 128) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=${size}`;
};

const candidates = [
  {
    id: 1,
    name: 'Alex Johnson',
    title: 'Senior React Developer',
    location: 'San Francisco, CA',
    status: 'New',
    match: 94,
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Redux'],
    experience: '5+ years',
    lastActive: '2 hours ago',
    avatar: getAvatarUrl('Alex Johnson')
  },
  {
    id: 2,
    name: 'Sarah Williams',
    title: 'Senior UX/UI Designer',
    location: 'New York, NY',
    status: 'Reviewed',
    match: 88,
    skills: ['Figma', 'User Research', 'Prototyping', 'UI/UX', 'Accessibility'],
    experience: '6+ years',
    lastActive: '1 day ago',
    avatar: getAvatarUrl('Sarah Williams')
  },
  {
    id: 3,
    name: 'Michael Chen',
    title: 'Product Manager',
    location: 'Austin, TX',
    status: 'Interview',
    match: 92,
    skills: ['Product Strategy', 'Agile', 'Jira', 'Roadmapping', 'User Stories'],
    experience: '7+ years',
    lastActive: '5 hours ago',
    avatar: getAvatarUrl('Michael Chen')
  },
  {
    id: 4,
    name: 'Emily Rodriguez',
    title: 'Full Stack Developer',
    location: 'Chicago, IL',
    status: 'New',
    match: 90,
    skills: ['JavaScript', 'Python', 'Django', 'React', 'AWS'],
    experience: '4+ years',
    lastActive: '3 hours ago',
    avatar: getAvatarUrl('Emily Rodriguez')
  },
];

// Status badge component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    New: 'bg-blue-100 text-blue-800',
    Reviewed: 'bg-purple-100 text-purple-800',
    Interview: 'bg-yellow-100 text-yellow-800',
    Hired: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    New: <ClockIcon className="h-3.5 w-3.5 mr-1" />,
    Reviewed: <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />,
    Interview: <ChatBubbleLeftIcon className="h-3.5 w-3.5 mr-1" />,
    Hired: <SolidStarIcon className="h-3.5 w-3.5 mr-1" />,
    Rejected: <XCircleIcon className="h-3.5 w-3.5 mr-1" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
};

export default function EmployerCandidates() {
  const [filters, setFilters] = useState({ 
    search: '', 
    status: 'all',
    sort: 'recent',
    skills: []
  });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setIsDetailOpen(true);
  };

  const filteredCandidates = candidates
    .filter(candidate => {
      if (filters.status !== 'all' && candidate.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!candidate.name.toLowerCase().includes(searchLower) &&
            !candidate.title.toLowerCase().includes(searchLower) &&
            !candidate.skills.some(skill => skill.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'match') {
        return b.match - a.match;
      } else if (filters.sort === 'experience') {
        return parseInt(b.experience) - parseInt(a.experience);
      }
      return 0; // Default sort (by original order or add date-based sort)
    });

  const statusCounts = candidates.reduce((acc, candidate) => {
    acc[candidate.status] = (acc[candidate.status] || 0) + 1;
    return acc;
  }, {});

  const totalCandidates = candidates.length;

  return (
    <EmployerLayout>
      <Head><title>Candidates | Jobocate</title></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Talent Pool</h1>
              <p className="mt-1 text-sm text-gray-500">
                {totalCandidates} candidates • {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className="mr-3">
                    <span className="font-medium">{count}</span> {status}
                  </span>
                ))}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link 
                href="/employer/candidates/search" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" />
                Advanced Search
              </Link>
              <button 
                type="button" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <FunnelIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Filter
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar filters */}
            <div className="lg:w-64 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900 mb-3">Filter by</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="space-y-2">
                      {['all', 'New', 'Reviewed', 'Interview', 'Hired', 'Rejected'].map((status) => (
                        <div key={status} className="flex items-center">
                          <input
                            id={`status-${status}`}
                            name="status"
                            type="radio"
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                            checked={filters.status === status}
                            onChange={() => setFilters({...filters, status})}
                          />
                          <label htmlFor={`status-${status}`} className="ml-3 text-sm text-gray-700">
                            {status === 'all' ? 'All Statuses' : status}
                            {status !== 'all' && statusCounts[status] && (
                              <span className="text-gray-400 ml-1">({statusCounts[status]})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                      value={filters.sort}
                      onChange={(e) => setFilters({...filters, sort: e.target.value})}
                    >
                      <option value="recent">Most Recent</option>
                      <option value="match">Best Match</option>
                      <option value="experience">Experience</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900 mb-3">Skills</h3>
                <div className="space-y-2">
                  {['React', 'TypeScript', 'UI/UX', 'Product Management', 'Node.js', 'Python', 'AWS', 'Agile']
                    .map(skill => (
                      <div key={skill} className="flex items-center">
                        <input
                          id={`skill-${skill}`}
                          name={`skill-${skill}`}
                          type="checkbox"
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`skill-${skill}`} className="ml-3 text-sm text-gray-700">
                          {skill}
                        </label>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            
            {/* Candidate list */}
            <div className="flex-1">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 sm:px-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="Search candidates..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>

                <ul className="divide-y divide-gray-200">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => (
                      <li key={candidate.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 relative">
                              <div className="h-14 w-14 rounded-full bg-gray-200 overflow-hidden">
                                <Image 
                                  src={candidate.avatar} 
                                  alt={candidate.name}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=random&color=fff&size=128`;
                                  }}
                                />
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <div className="h-2 w-2 rounded-full bg-white"></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-base font-medium text-gray-900">
                                    {candidate.name}
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                      • {candidate.experience}
                                    </span>
                                  </h3>
                                  <p className="text-sm text-gray-500">{candidate.title}</p>
                                </div>
                                <div className="flex items-center">
                                  <div className="flex items-center mr-4">
                                    <SolidStarIcon className="h-4 w-4 text-yellow-400" />
                                    <span className="ml-1 text-sm font-medium text-gray-700">
                                      {candidate.match}%
                                    </span>
                                  </div>
                                  <StatusBadge status={candidate.status} />
                                </div>
                              </div>
                              
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {candidate.location}
                                <span className="mx-2">•</span>
                                <span>Active {candidate.lastActive}</span>
                              </div>
                              
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {candidate.skills.slice(0, 3).map((skill, index) => (
                                  <span 
                                    key={index} 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    +{candidate.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4 flex flex-col space-y-2">
                              <button 
                                onClick={() => handleViewDetails(candidate)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                              >
                                View Profile
                              </button>
                              <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                <ChatBubbleLeftIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                                Message
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-12 text-center">
                      <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filter to find what you're looking for.
                      </p>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Candidate Detail Panel */}
          {isDetailOpen && selectedCandidate && (
            <div className="fixed inset-0 overflow-hidden z-50">
              <div className="absolute inset-0 overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                  onClick={() => setIsDetailOpen(false)}
                ></div>
                <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                  <div className="w-screen max-w-2xl">
                    <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                      <div className="py-6 px-4 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <h2 className="text-lg font-medium text-gray-900">Candidate Details</h2>
                          <div className="ml-3 h-7 flex items-center">
                            <button
                              type="button"
                              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              onClick={() => setIsDetailOpen(false)}
                            >
                              <span className="sr-only">Close panel</span>
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-6">
                          <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0">
                              <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden">
                                <Image 
                                  src={selectedCandidate.avatar} 
                                  alt={selectedCandidate.name}
                                  width={96}
                                  height={96}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCandidate.name)}&background=random&color=fff&size=128`;
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900">{selectedCandidate.name}</h3>
                              <p className="text-lg text-gray-600">{selectedCandidate.title}</p>
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {selectedCandidate.location}
                                <span className="mx-2">•</span>
                                <span>Active {selectedCandidate.lastActive}</span>
                              </div>
                              <div className="mt-2">
                                <StatusBadge status={selectedCandidate.status} />
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center">
                              <SolidStarIcon className="h-5 w-5 text-yellow-400" />
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                {selectedCandidate.match}% Match
                              </span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="text-sm text-gray-600">
                                {selectedCandidate.experience} experience
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-3">Skills & Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skills.map((skill, index) => (
                                <span 
                                  key={index} 
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-3">About</h4>
                            <p className="text-gray-600">
                              Experienced {selectedCandidate.title.toLowerCase()} with a passion for creating exceptional user experiences. 
                              Strong background in {selectedCandidate.skills[0].toLowerCase()} and {selectedCandidate.skills[1].toLowerCase()}.
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-3">Experience</h4>
                            <div className="space-y-4">
                              <div className="border-l-4 border-orange-500 pl-4 py-1">
                                <h5 className="font-medium text-gray-900">Senior {selectedCandidate.title.split(' ').slice(1).join(' ')}</h5>
                                <p className="text-sm text-gray-600">Tech Company Inc. • {selectedCandidate.experience}</p>
                              </div>
                              <div className="border-l-4 border-gray-200 pl-4 py-1">
                                <h5 className="font-medium text-gray-700">{selectedCandidate.title.split(' ')[0]} {selectedCandidate.title.split(' ').slice(1).join(' ')}</h5>
                                <p className="text-sm text-gray-500">Startup Co. • 2 years</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                            onClick={() => setIsDetailOpen(false)}
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-orange-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                          >
                            Schedule Interview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
}
