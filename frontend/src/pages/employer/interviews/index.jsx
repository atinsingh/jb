import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import EmployerLayout from '@/components/layout/EmployerLayout';

const interviews = [
  {
    id: 1,
    candidate: 'Alex Johnson',
    job: 'Senior React Developer',
    date: '2023-12-15',
    time: '10:00 AM',
    type: 'Video',
    status: 'Scheduled',
    duration: '45 minutes'
  },
  {
    id: 2,
    candidate: 'Sarah Williams',
    job: 'UX/UI Designer',
    date: '2023-12-16',
    time: '2:30 PM',
    type: 'In-Person',
    status: 'Scheduled',
    duration: '1 hour',
    location: 'Office #12, 5th Floor'
  },
  {
    id: 3,
    candidate: 'Michael Chen',
    job: 'Product Manager',
    date: '2023-12-10',
    time: '11:00 AM',
    type: 'Phone',
    status: 'Completed',
    duration: '30 minutes',
    notes: 'Strong leadership skills, good cultural fit.'
  },
];

export default function EmployerInterviews() {
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [showNewInterviewModal, setShowNewInterviewModal] = useState(false);

  const filteredInterviews = interviews.filter(interview => {
    if (selectedTab === 'upcoming') {
      return interview.status === 'Scheduled';
    } else {
      return interview.status === 'Completed';
    }
  });

  return (
    <EmployerLayout>
      <Head>
        <title>Interviews | Jobocate</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Interviews</h1>
              <p className="mt-1 text-sm text-gray-500">Schedule and manage candidate interviews</p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => setShowNewInterviewModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Schedule Interview
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setSelectedTab('upcoming')}
                  className={`${selectedTab === 'upcoming' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Upcoming Interviews
                </button>
                <button
                  onClick={() => setSelectedTab('past')}
                  className={`${selectedTab === 'past' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Past Interviews
                </button>
              </nav>
            </div>
          </div>

          {/* Interviews List */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            {filteredInterviews.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredInterviews.map((interview) => (
                  <li key={interview.id} className="hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <UserCircleIcon className="h-12 w-12 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h2 className="text-lg font-medium text-gray-900">{interview.candidate}</h2>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {interview.status}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              {interview.job}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                              <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              <span className="mx-1">•</span>
                              <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              {interview.time} ({interview.duration})
                              <span className="mx-1">•</span>
                              {interview.type === 'Video' ? (
                                <>
                                  <VideoCameraIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  Video Call
                                </>
                              ) : interview.type === 'Phone' ? (
                                <>
                                  <PhoneIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  Phone Call
                                </>
                              ) : (
                                <>
                                  <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  {interview.location}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {interview.status === 'Scheduled' && (
                            <>
                              <button className="btn-secondary">
                                Reschedule
                              </button>
                              <button className="btn-primary">
                                Start Interview
                              </button>
                            </>
                          )}
                          {interview.status === 'Completed' && (
                            <button className="btn-primary">
                              View Feedback
                            </button>
                          )}
                        </div>
                      </div>
                      {interview.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                          <p className="mt-1 text-sm text-gray-600">{interview.notes}</p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No {selectedTab} interviews</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedTab === 'upcoming' 
                    ? 'Get started by scheduling a new interview.'
                    : 'No past interviews to display.'
                  }
                </p>
                {selectedTab === 'upcoming' && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowNewInterviewModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      Schedule Interview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Interview Modal (simplified) */}
      {showNewInterviewModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Schedule New Interview</h3>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Interview scheduling functionality will be implemented here.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:col-start-2 sm:text-sm"
                  onClick={() => setShowNewInterviewModal(false)}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowNewInterviewModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
