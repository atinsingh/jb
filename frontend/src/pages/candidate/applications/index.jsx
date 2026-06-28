import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  FunnelIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  FireIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 14 },
  },
};

const STATUSES = {
  pending: { 
    label: 'Applied', 
    color: 'from-blue-500 to-cyan-400',
    bgLight: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    icon: DocumentTextIcon,
  },
  submitted: { 
    label: 'Submitted', 
    color: 'from-violet-500 to-purple-400',
    bgLight: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    icon: CheckCircleIcon,
  },
  reviewing: { 
    label: 'In Review', 
    color: 'from-amber-500 to-orange-400',
    bgLight: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    icon: ClockIcon,
  },
  interviewed: { 
    label: 'Interview', 
    color: 'from-indigo-500 to-blue-400',
    bgLight: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    icon: ChatBubbleLeftRightIcon,
  },
  rejected: { 
    label: 'Rejected', 
    color: 'from-red-500 to-rose-400',
    bgLight: 'bg-red-500/10',
    textColor: 'text-red-400',
    icon: XCircleIcon,
  },
  accepted: { 
    label: 'Offer', 
    color: 'from-emerald-500 to-teal-400',
    bgLight: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    icon: StarIcon,
  },
};

export default function ApplicationsDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    console.log('Applications page mounted, fetching data');
    fetchApplications();
    fetchStats();
  }, [statusFilter, searchQuery]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter.length > 0) {
        statusFilter.forEach(status => params.append('status', status));
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      console.log('Fetching applications with params:', params.toString());
      const response = await fetch(`${API_URL}/api/job-tracker/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Applications fetched successfully:', data.length, 'items');
        setApplications(data);
      } else {
        console.error('Failed to fetch applications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Fetching application stats');
      const response = await fetch(`${API_URL}/api/job-tracker/applications/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Stats fetched successfully:', data);
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const groupedByStatus = applications.reduce((acc, app) => {
    const status = app.status || 'pending';
    if (!acc[status]) acc[status] = [];
    acc[status].push(app);
    return acc;
  }, {});

  return (
    <>
      <Head>
        <title>My Applications | Jobocate</title>
        <meta name="description" content="Track and manage your job applications" />
      </Head>
      
      <DashboardLayout>
        <div className="min-h-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          {/* Ambient Background Effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-[1920px] px-6 sm:px-8 lg:px-10 pt-8 pb-12">
            
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-500 text-sm font-medium mb-4">
                    <RocketLaunchIcon className="w-4 h-4" />
                    Application Tracker
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                    My Applications
                  </h1>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl">
                    Track your journey from application to offer. Stay organized and land your dream job.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/jobs"
                    className="group relative px-6 py-3 overflow-hidden rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/25"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5" />
                      Find New Jobs
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              {[
                { key: 'total', label: 'Total', value: stats?.total || 0, icon: BriefcaseIcon, color: 'from-blue-500 to-indigo-500' },
                { key: 'active', label: 'Active', value: (stats?.byStatus?.pending || 0) + (stats?.byStatus?.reviewing || 0), icon: FireIcon, color: 'from-amber-500 to-orange-500' },
                { key: 'interviews', label: 'Interviews', value: stats?.byStatus?.interviewed || 0, icon: ChatBubbleLeftRightIcon, color: 'from-violet-500 to-purple-500' },
                { key: 'offers', label: 'Offers', value: stats?.byStatus?.accepted || 0, icon: StarIcon, color: 'from-emerald-500 to-teal-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.key}
                  variants={itemVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" 
                    style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }} 
                  />
                  <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-zinc-700/50 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-700`} />
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Search & Controls Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-zinc-700/50 p-5 mb-8 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50"
            >
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative group">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-100/80 dark:bg-zinc-900/50 border-2 border-transparent rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-primary-500/50 focus:bg-white dark:focus:bg-zinc-800 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-medium transition-all ${
                      showFilters || statusFilter.length > 0
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                        : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <FunnelIcon className="h-5 w-5" />
                    <span>Filters</span>
                    {statusFilter.length > 0 && (
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {statusFilter.length}
                      </span>
                    )}
                  </button>

                  {/* View Toggle */}
                  <div className="flex items-center p-1.5 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl">
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'kanban' 
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      <Squares2X2Icon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      <ListBulletIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 mt-5 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(STATUSES).map(([key, status]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setStatusFilter(prev => 
                                prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                              );
                            }}
                            className={`group relative px-4 py-2 rounded-full text-sm font-medium transition-all overflow-hidden ${
                              statusFilter.includes(key)
                                ? 'text-white shadow-lg'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {statusFilter.includes(key) && (
                              <div className={`absolute inset-0 bg-gradient-to-r ${status.color}`} />
                            )}
                            <span className="relative flex items-center gap-1.5">
                              <status.icon className="w-4 h-4" />
                              {status.label}
                            </span>
                          </button>
                        ))}
                        {statusFilter.length > 0 && (
                          <button
                            onClick={() => setStatusFilter([])}
                            className="px-4 py-2 rounded-full text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">Loading your applications...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && applications.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-zinc-700/50 p-16 text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-violet-500/5" />
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-2xl shadow-primary-500/30">
                    <BriefcaseIcon className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">No applications yet</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto text-lg">
                    Your job search journey begins here. Discover AI-matched positions and start applying today.
                  </p>
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:scale-[1.02] transition-all"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    Discover Jobs
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Kanban View */}
            {!loading && applications.length > 0 && viewMode === 'kanban' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="overflow-x-auto pb-6 -mx-2 px-2"
              >
                <div className="flex gap-5 min-w-max">
                  {Object.entries(STATUSES).map(([statusKey, status]) => (
                    <motion.div
                      key={statusKey}
                      variants={itemVariants}
                      className="w-[320px] flex-shrink-0"
                    >
                      {/* Column Header */}
                      <div className="flex items-center gap-3 mb-4 px-1">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${status.color} shadow-lg`}>
                          <status.icon className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-200">
                          {status.label}
                        </h3>
                        <span className="ml-auto text-sm font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                          {(groupedByStatus[statusKey] || []).length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-3 min-h-[300px] p-3 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/30">
                        <AnimatePresence>
                          {(groupedByStatus[statusKey] || []).map((app, index) => (
                            <KanbanCard
                              key={app._id}
                              application={app}
                              onClick={() => router.push(`/candidate/applications/${app._id}`)}
                              statusInfo={status}
                              delay={index * 0.05}
                            />
                          ))}
                        </AnimatePresence>
                        
                        {(groupedByStatus[statusKey] || []).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                            <div className={`p-4 rounded-2xl ${status.bgLight} mb-3`}>
                              <status.icon className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-sm font-medium">No applications</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* List View */}
            {!loading && applications.length > 0 && viewMode === 'list' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-zinc-700/50 shadow-lg"
              >
                {/* Table Header */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-700/50 text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  <div className="col-span-5">Position</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Match</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-zinc-100/50 dark:divide-zinc-700/30">
                  <AnimatePresence>
                    {applications.map((app, index) => (
                      <ListCard
                        key={app._id}
                        application={app}
                        onClick={() => router.push(`/candidate/applications/${app._id}`)}
                        delay={index * 0.03}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

function KanbanCard({ application, onClick, statusInfo, delay = 0 }) {
  const job = application.jobId || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className="group relative overflow-hidden bg-white dark:bg-zinc-800 rounded-xl p-5 cursor-pointer transition-all duration-300 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50"
    >
      {/* Gradient accent on hover */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${statusInfo.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      {/* Company Logo */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 shadow-inner">
            {(job.companyName || 'UN').substring(0, 2).toUpperCase()}
          </div>
          {application.matchScore >= 90 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <StarIcon className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
            {job.title || 'Untitled Position'}
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 mt-1">
            <BuildingOfficeIcon className="w-4 h-4" />
            {job.companyName || 'Unknown Company'}
          </p>
        </div>
      </div>

      {/* Location */}
      {job.location && (
        <div className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 mb-4">
          <MapPinIcon className="w-4 h-4" />
          <span className="truncate">{job.location}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <CalendarIcon className="w-4 h-4" />
          {new Date(application.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        
        {application.matchScore && (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${application.matchScore >= 80 ? 'from-emerald-400 to-teal-400' : application.matchScore >= 60 ? 'from-amber-400 to-orange-400' : 'from-zinc-400 to-zinc-500'} rounded-full`}
                style={{ width: `${application.matchScore}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${application.matchScore >= 80 ? 'text-emerald-500' : application.matchScore >= 60 ? 'text-amber-500' : 'text-zinc-500'}`}>
              {application.matchScore}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ListCard({ application, onClick, delay = 0 }) {
  const job = application.jobId || {};
  const statusKey = application.status || 'pending';
  const statusInfo = STATUSES[statusKey] || STATUSES.pending;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay }}
      whileHover={{ backgroundColor: 'rgba(250,82,82,0.02)' }}
      onClick={onClick}
      className="group px-6 py-5 cursor-pointer transition-colors"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Job Info */}
        <div className="col-span-5 flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 shadow-inner group-hover:shadow-lg transition-shadow">
              {(job.companyName || 'UN').substring(0, 2).toUpperCase()}
            </div>
            {application.matchScore >= 90 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <StarIcon className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-primary-600 transition-colors truncate text-lg">
              {job.title || 'Untitled Position'}
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-1">
              <BuildingOfficeIcon className="w-4 h-4" />
              {job.companyName || 'Unknown'}
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <CalendarIcon className="w-4 h-4" />
              {new Date(application.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="col-span-2 hidden lg:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <MapPinIcon className="w-4 h-4 text-zinc-400" />
          <span className="truncate">{job.location || 'Remote'}</span>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-semibold text-white bg-gradient-to-r ${statusInfo.color} shadow-md`}>
            <statusInfo.icon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        </div>

        {/* Match Score */}
        <div className="col-span-2">
          {application.matchScore ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${application.matchScore >= 80 ? 'from-emerald-400 to-teal-400' : 'from-amber-400 to-orange-400'} rounded-full transition-all`}
                  style={{ width: `${application.matchScore}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${application.matchScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {application.matchScore}%
              </span>
            </div>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-1 flex justify-end">
          <button 
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisHorizontalIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
