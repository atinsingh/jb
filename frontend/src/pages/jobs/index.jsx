import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  HandThumbDownIcon,
  SparklesIcon,
  BoltIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  FireIcon,
  RocketLaunchIcon,
  HeartIcon,
  XMarkIcon,
  StarIcon,
  ArrowRightIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, rotateY: -15 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotateY: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    x: -100,
    transition: { duration: 0.3 }
  }
};

export default function MatchedJobsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [minScore, setMinScore] = useState(60);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, applied: 0, saved: 0 });

  useEffect(() => {
    if (user) {
      console.log('MatchedJobs page mounted, fetching recommendations for user:', user.email);
      fetchRecommendations();
      fetchProfiles();
    }
  }, [user, minScore, selectedProfile]);

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Fetching job profiles');
      const response = await fetch(`${API_URL}/api/job-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Job profiles fetched:', data.profiles?.length || 0);
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const params = new URLSearchParams({ minScore: minScore.toString() });
      if (selectedProfile !== 'all') {
        params.append('profileId', selectedProfile);
      }

      console.log('Fetching recommendations with params:', params.toString());
      const response = await fetch(`${API_URL}/api/matching/recommendations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Recommendations fetched:', data.recommendations?.length || 0);
        setRecommendations(data.recommendations || []);
        setStats({
          total: data.total || 0,
          applied: data.recommendations?.filter(r => r.isInterested).length || 0,
          saved: data.recommendations?.filter(r => r.isSaved).length || 0,
        });
      } else {
        console.error('Failed to fetch recommendations:', response.status);
        toast.error('Failed to load job recommendations');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to load job recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = async (matchId, status, jobTitle) => {
    try {
      setActionLoading(prev => ({ ...prev, [matchId]: status }));
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      console.log(`Expressing interest: ${status} for match ${matchId}`);
      const response = await fetch(`${API_URL}/api/matching/express-interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchIds: [matchId],
          status: status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Interest expressed successfully:', data);

        // Show appropriate toast
        if (status === 'interested') {
          toast.success(`🚀 Auto-apply approved for "${jobTitle}"! Our AI will apply for you.`);
        } else if (status === 'not_interested') {
          toast.info(`Marked as not interested`);
        } else {
          toast.info(`Marked as not a match`);
        }

        // Remove from list with animation
        setRecommendations(prev => prev.filter(r => r._id !== matchId));
      } else {
        const error = await response.json();
        console.error('Failed to express interest:', error);
        toast.error(error.message || 'Failed to update preference');
      }
    } catch (error) {
      console.error('Error expressing interest:', error);
      toast.error('Something went wrong');
    } finally {
      setActionLoading(prev => ({ ...prev, [matchId]: null }));
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-400 to-teal-400';
    if (score >= 70) return 'from-blue-400 to-indigo-400';
    if (score >= 60) return 'from-amber-400 to-orange-400';
    return 'from-zinc-400 to-zinc-500';
  };

  const getMatchScoreLabel = (score) => {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Great Match';
    if (score >= 60) return 'Good Match';
    return 'Fair Match';
  };

  // If not logged in, show public jobs page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <Head>
          <title>Jobs | Jobocate</title>
        </Head>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-2xl shadow-primary-500/30">
            <BriefcaseIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">Find Your Perfect Job Match</h1>
          <p className="text-xl text-zinc-500 mb-8 max-w-2xl mx-auto">
            Sign in to get AI-powered job recommendations based on your profile and skills.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:scale-[1.02] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-8 py-4 bg-zinc-100 text-zinc-700 rounded-2xl font-semibold hover:bg-zinc-200 transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Matched Jobs | Jobocate</title>
        <meta name="description" content="AI-matched job recommendations based on your profile" />
      </Head>

      <DashboardLayout>
        <div className="min-h-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          {/* Ambient Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-[1920px] px-6 sm:px-8 lg:px-10 pt-8 pb-12">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-500/10 to-accent-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium mb-4">
                    <SparklesIcon className="w-4 h-4" />
                    AI-Powered Matching
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                    Your Matched Jobs
                  </h1>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl">
                    Jobs curated for you based on your skills and preferences. Approve to auto-apply!
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchRecommendations}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <Link
                    href="/candidate/job-profiles"
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 hover:scale-[1.02] transition-all"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    Manage Profiles
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-4 mb-8"
            >
              {[
                { label: 'Total Matches', value: stats.total, icon: FireIcon, color: 'from-orange-500 to-red-500' },
                { label: 'Auto-Apply Queue', value: stats.applied, icon: RocketLaunchIcon, color: 'from-emerald-500 to-teal-500' },
                { label: 'Saved', value: stats.saved, icon: HeartSolidIcon, color: 'from-pink-500 to-rose-500' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl p-5 border border-white/20 dark:border-zinc-700/50 shadow-lg"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`} />
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Filters Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-zinc-700/50 p-5 mb-8 shadow-lg"
            >
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Profile Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Job Profile</label>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100/80 dark:bg-zinc-900/50 border-2 border-transparent rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-primary-500/50 transition-all"
                  >
                    <option value="all">All Profiles</option>
                    {profiles.map(profile => (
                      <option key={profile._id} value={profile._id}>
                        {profile.profileName || profile.targetJobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Score Slider */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    Minimum Match Score: <span className="text-primary-500 font-bold">{minScore}%</span>
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    step="5"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex items-end">
                  <div className="flex items-center p-1.5 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'cards'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      <Squares2X2Icon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      <ListBulletIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
                    <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-primary-500" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">Finding your perfect matches...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && recommendations.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-zinc-700/50 p-16 text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-violet-500/5" />
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-2xl shadow-primary-500/30">
                    <SparklesIcon className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">No matches found</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto text-lg">
                    Create a job profile to get personalized job recommendations matched to your skills.
                  </p>
                  <Link
                    href="/candidate/job-profiles"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:scale-[1.02] transition-all"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    Create Job Profile
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Cards View */}
            {!loading && recommendations.length > 0 && viewMode === 'cards' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {recommendations.map((match, index) => (
                    <JobCard
                      key={match._id}
                      match={match}
                      index={index}
                      onAction={handleExpressInterest}
                      actionLoading={actionLoading}
                      getMatchScoreColor={getMatchScoreColor}
                      getMatchScoreLabel={getMatchScoreLabel}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* List View */}
            {!loading && recommendations.length > 0 && viewMode === 'list' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <AnimatePresence mode="popLayout">
                  {recommendations.map((match, index) => (
                    <JobListItem
                      key={match._id}
                      match={match}
                      index={index}
                      onAction={handleExpressInterest}
                      actionLoading={actionLoading}
                      getMatchScoreColor={getMatchScoreColor}
                      getMatchScoreLabel={getMatchScoreLabel}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

function JobCard({ match, index, onAction, actionLoading, getMatchScoreColor, getMatchScoreLabel }) {
  const job = match.jobId || {};
  const isLoading = actionLoading[match._id];

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative overflow-hidden bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg hover:shadow-2xl transition-all duration-500"
    >
      {/* Match Score Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${getMatchScoreColor(match.matchScore)} text-white text-sm font-bold shadow-lg`}>
          {match.matchScore}% Match
        </div>
      </div>

      {/* Top Gradient Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getMatchScoreColor(match.matchScore)}`} />

      <div className="p-6">
        {/* Company & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 shadow-inner flex-shrink-0">
            {(job.companyName || 'CO').substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
              {job.title || 'Job Title'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
              <BuildingOfficeIcon className="w-4 h-4" />
              {job.companyName || 'Company'}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-2 mb-5">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700/50 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <MapPinIcon className="w-3.5 h-3.5" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />
              {job.salary}
            </span>
          )}
          {job.type && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
              <BriefcaseIcon className="w-3.5 h-3.5" />
              {job.type}
            </span>
          )}
        </div>

        {/* Skills */}
        {match.matchedSkills?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Matched Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 5).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md text-xs font-medium">
                  {skill}
                </span>
              ))}
              {match.matchedSkills.length > 5 && (
                <span className="px-2 py-1 text-zinc-500 text-xs">
                  +{match.matchedSkills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {match.missingSkills?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Skills to Develop</p>
            <div className="flex flex-wrap gap-1.5">
              {match.missingSkills.slice(0, 3).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md text-xs font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        {match.reasoning && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-2">
            {match.reasoning}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
          {/* Approve Auto-Apply */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(match._id, 'interested', job.title)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
          >
            {isLoading === 'interested' ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <RocketLaunchIcon className="w-5 h-5" />
                <span>Auto-Apply</span>
              </>
            )}
          </motion.button>

          {/* Not Interested */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction(match._id, 'not_interested', job.title)}
            disabled={isLoading}
            className="p-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-all disabled:opacity-50"
            title="Not Interested"
          >
            {isLoading === 'not_interested' ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <XMarkIcon className="w-5 h-5" />
            )}
          </motion.button>

          {/* Not a Match */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction(match._id, 'not_a_match', job.title)}
            disabled={isLoading}
            className="p-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all disabled:opacity-50"
            title="Not a Match"
          >
            {isLoading === 'not_a_match' ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <HandThumbDownIcon className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* View Details Link */}
      <Link
        href={`/jobs/${job._id}`}
        className="block px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors border-t border-zinc-100 dark:border-zinc-700/50"
      >
        View Full Details →
      </Link>
    </motion.div>
  );
}

function JobListItem({ match, index, onAction, actionLoading, getMatchScoreColor, getMatchScoreLabel }) {
  const job = match.jobId || {};
  const isLoading = actionLoading[match._id];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-all"
    >
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getMatchScoreColor(match.matchScore)}`} />
      
      <div className="p-6">
        <div className="flex items-center gap-6">
          {/* Company Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 shadow-inner flex-shrink-0">
            {(job.companyName || 'CO').substring(0, 2).toUpperCase()}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
                {job.title || 'Job Title'}
              </h3>
              <span className={`px-3 py-1 rounded-full bg-gradient-to-r ${getMatchScoreColor(match.matchScore)} text-white text-xs font-bold shadow-md`}>
                {match.matchScore}%
              </span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <BuildingOfficeIcon className="w-4 h-4" />
                {job.companyName || 'Company'}
              </span>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4" />
                  {job.location}
                </span>
              )}
              {job.salary && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  {job.salary}
                </span>
              )}
            </p>

            {/* Skills Preview */}
            {match.matchedSkills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {match.matchedSkills.slice(0, 4).map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium">
                    {skill}
                  </span>
                ))}
                {match.matchedSkills.length > 4 && (
                  <span className="text-xs text-zinc-400">+{match.matchedSkills.length - 4}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction(match._id, 'interested', job.title)}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isLoading === 'interested' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RocketLaunchIcon className="w-4 h-4" />
                  Auto-Apply
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onAction(match._id, 'not_interested', job.title)}
              disabled={isLoading}
              className="p-2.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded-xl hover:bg-amber-100 hover:text-amber-600 transition-all disabled:opacity-50"
              title="Not Interested"
            >
              <XMarkIcon className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onAction(match._id, 'not_a_match', job.title)}
              disabled={isLoading}
              className="p-2.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-50"
              title="Not a Match"
            >
              <HandThumbDownIcon className="w-5 h-5" />
            </motion.button>

            <Link
              href={`/jobs/${job._id}`}
              className="p-2.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded-xl hover:bg-primary-100 hover:text-primary-600 transition-all"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
