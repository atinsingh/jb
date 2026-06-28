import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckIcon,
  InformationCircleIcon,
  RocketLaunchIcon,
  CogIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 12 },
  },
};

const JOB_TYPES = [
  { value: 'remote', label: 'Remote', icon: GlobeAltIcon },
  { value: 'hybrid', label: 'Hybrid', icon: HomeModernIcon },
  { value: 'onsite', label: 'On-site', icon: BuildingOfficeIcon },
];

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level', years: '0-2 years' },
  { value: 'junior', label: 'Junior', years: '1-3 years' },
  { value: 'mid', label: 'Mid-Level', years: '3-5 years' },
  { value: 'senior', label: 'Senior', years: '5-8 years' },
  { value: 'lead', label: 'Lead', years: '8-10 years' },
  { value: 'principal', label: 'Principal', years: '10+ years' },
  { value: 'staff', label: 'Staff', years: '10+ years' },
  { value: 'director', label: 'Director', years: '12+ years' },
];

const SALARY_RANGES = [
  { min: 50000, max: 80000, label: '$50k - $80k' },
  { min: 80000, max: 120000, label: '$80k - $120k' },
  { min: 120000, max: 160000, label: '$120k - $160k' },
  { min: 160000, max: 200000, label: '$160k - $200k' },
  { min: 200000, max: 250000, label: '$200k - $250k' },
  { min: 250000, max: 350000, label: '$250k - $350k' },
  { min: 350000, max: 500000, label: '$350k+' },
];

export default function JobProfilesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState({ allowed: 1, used: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (user) {
      console.log('Job Profiles page mounted for user:', user.email);
      fetchProfiles();
      fetchEntitlement();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Fetching job profiles');
      
      const response = await fetch(`${API_URL}/api/job-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profiles fetched:', data.profiles?.length || 0);
        setProfiles(data.profiles || []);
      } else {
        console.error('Failed to fetch profiles:', response.status);
        toast.error('Failed to load profiles');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntitlement = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Fetching entitlement for job_profiles');
      
      const response = await fetch(`${API_URL}/api/entitlement/check/job_profiles_count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Entitlement:', data);
        setEntitlement({
          allowed: data.limit || 1,
          used: data.usage || 0,
          remaining: data.remaining || 1,
        });
      }
    } catch (error) {
      console.error('Error fetching entitlement:', error);
      // Default to basic plan limit
      setEntitlement({ allowed: 1, used: profiles.length, remaining: Math.max(0, 1 - profiles.length) });
    }
  };

  const handleDeleteProfile = async (profileId) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Deleting profile:', profileId);
      
      const response = await fetch(`${API_URL}/api/job-profiles/${profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Profile deleted successfully');
        setProfiles(prev => prev.filter(p => p._id !== profileId));
        setDeleteConfirm(null);
      } else {
        toast.error('Failed to delete profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Failed to delete profile');
    }
  };

  const handleActivateProfile = async (profileId, active) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Activating profile:', profileId, active);
      
      const response = await fetch(`${API_URL}/api/job-profiles/${profileId}/activate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(active ? 'Profile activated!' : 'Profile deactivated');
        setProfiles(prev => prev.map(p => 
          p._id === profileId ? { ...p, active } : p
        ));
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error activating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const canCreateProfile = profiles.length < (entitlement.allowed || 1);
  const planName = user?.currentPlanType || 'FREE';

  return (
    <>
      <Head>
        <title>Job Profiles | Jobocate</title>
        <meta name="description" content="Manage your job search profiles" />
      </Head>

      <DashboardLayout>
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-950">
          {/* Ambient Effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-primary-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8 pt-8 pb-12">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
                    <BriefcaseIcon className="w-4 h-4" />
                    Job Profiles
                  </div>
                  <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                    Your Job Profiles
                  </h1>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl">
                    Create targeted profiles to get matched with the perfect opportunities.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Entitlement Badge */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Profiles Used</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">
                        {profiles.length} / {entitlement.allowed || 1}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${planName === 'FREE' ? 'bg-zinc-100 dark:bg-zinc-700' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                      {planName === 'FREE' ? (
                        <LockClosedIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                      ) : (
                        <StarIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Create Button */}
                  <motion.button
                    whileHover={{ scale: canCreateProfile ? 1.02 : 1 }}
                    whileTap={{ scale: canCreateProfile ? 0.98 : 1 }}
                    onClick={() => canCreateProfile ? setShowCreateModal(true) : toast.info('Upgrade to create more profiles')}
                    disabled={!canCreateProfile}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all ${
                      canCreateProfile
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/25 hover:shadow-xl'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create Profile
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Upgrade Banner for Free Users */}
            {planName === 'FREE' && profiles.length >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <RocketLaunchIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Unlock More Profiles</h3>
                      <p className="text-violet-100">Upgrade to Pro for up to 5 job profiles and advanced features.</p>
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    className="px-6 py-3 bg-white text-violet-600 rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-[1.02]"
                  >
                    Upgrade Now
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
                  </div>
                  <p className="text-zinc-500 font-medium">Loading profiles...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && profiles.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-700/50 p-16 text-center shadow-lg"
              >
                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <BriefcaseIcon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Create Your First Profile</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto text-lg">
                  Set up a job profile to start receiving AI-matched job recommendations tailored to your skills and preferences.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:shadow-2xl transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create Profile
                </motion.button>
              </motion.div>
            )}

            {/* Profiles Grid */}
            {!loading && profiles.length > 0 && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {profiles.map((profile, index) => (
                  <ProfileCard
                    key={profile._id}
                    profile={profile}
                    index={index}
                    onEdit={() => setEditingProfile(profile)}
                    onDelete={() => setDeleteConfirm(profile._id)}
                    onActivate={(active) => handleActivateProfile(profile._id, active)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {(showCreateModal || editingProfile) && (
            <ProfileModal
              profile={editingProfile}
              onClose={() => {
                setShowCreateModal(false);
                setEditingProfile(null);
              }}
              onSave={() => {
                fetchProfiles();
                setShowCreateModal(false);
                setEditingProfile(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Delete Profile?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(deleteConfirm)}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </>
  );
}

function ProfileCard({ profile, index, onEdit, onDelete, onActivate }) {
  const completionPercentage = calculateCompletion(profile);
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-2xl border shadow-lg transition-all ${
        profile.active 
          ? 'border-emerald-300 dark:border-emerald-700 shadow-emerald-500/10' 
          : 'border-zinc-200/50 dark:border-zinc-700/50'
      }`}
    >
      {/* Active Indicator */}
      {profile.active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
              profile.active 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' 
                : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300'
            }`}>
              {profile.profileName?.substring(0, 2).toUpperCase() || 'JP'}
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {profile.profileName || 'Untitled Profile'}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {profile.role || 'No target role set'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {profile.active ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                <CheckCircleIcon className="w-4 h-4" />
                Active
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-medium">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPinIcon className="w-4 h-4 text-zinc-400" />
            <span>{profile.location || profile.preferredLocations?.[0] || 'Any location'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <CurrencyDollarIcon className="w-4 h-4 text-zinc-400" />
            <span>
              {profile.salaryMin && profile.salaryMax 
                ? `$${(profile.salaryMin/1000).toFixed(0)}k - $${(profile.salaryMax/1000).toFixed(0)}k`
                : 'Any salary'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <BriefcaseIcon className="w-4 h-4 text-zinc-400" />
            <span className="capitalize">{profile.jobType || 'Any type'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <DocumentTextIcon className="w-4 h-4 text-zinc-400" />
            <span>{profile.resumePath ? 'Resume uploaded' : 'No resume'}</span>
          </div>
        </div>

        {/* Completion Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500">Profile Completion</span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{completionPercentage}%</span>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`h-full rounded-full ${
                completionPercentage >= 80 
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400' 
                  : completionPercentage >= 50 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-zinc-400 to-zinc-500'
              }`}
            />
          </div>
        </div>

        {/* Settings Row */}
        <div className="flex items-center gap-4 mb-6 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 mb-1">Min Match Score</p>
            <p className="font-semibold text-zinc-900 dark:text-white">{profile.minMatchScore || 75}%</p>
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1">
            <p className="text-xs text-zinc-500 mb-1">Auto-Apply</p>
            <p className={`font-semibold ${profile.autoApply ? 'text-emerald-600' : 'text-zinc-400'}`}>
              {profile.autoApply ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onActivate(!profile.active)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              profile.active
                ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl'
            }`}
          >
            {profile.active ? (
              <>
                <XCircleIcon className="w-5 h-5" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Activate
              </>
            )}
          </button>
          
          <button
            onClick={onEdit}
            className="p-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-all"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileModal({ profile, onClose, onSave }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [formData, setFormData] = useState({
    profileName: profile?.profileName || '',
    role: profile?.role || '',
    level: profile?.level || 'mid',
    location: profile?.location || '',
    jobType: profile?.jobType || 'remote',
    salaryMin: profile?.salaryMin || 100000,
    salaryMax: profile?.salaryMax || 150000,
    minMatchScore: profile?.minMatchScore || 75,
    autoApply: profile?.autoApply || false,
    preferredLocations: profile?.preferredLocations || [],
  });
  const [newLocation, setNewLocation] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const url = profile 
        ? `${API_URL}/api/job-profiles/${profile._id}`
        : `${API_URL}/api/job-profiles`;
      
      console.log(profile ? 'Updating profile' : 'Creating profile', formData);

      const response = await fetch(url, {
        method: profile ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(profile ? 'Profile updated!' : 'Profile created!');
        onSave();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      console.log('Uploading resume for profile:', profile._id);

      const response = await fetch(`${API_URL}/api/job-profiles/${profile._id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Resume uploaded and parsed!');
        onSave();
      } else {
        toast.error('Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const addLocation = () => {
    if (newLocation.trim() && !formData.preferredLocations.includes(newLocation.trim())) {
      setFormData(prev => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, newLocation.trim()]
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (loc) => {
    setFormData(prev => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter(l => l !== loc)
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {profile ? 'Edit Profile' : 'Create Job Profile'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Configure your job search preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Profile Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Profile Name *
            </label>
            <input
              type="text"
              required
              value={formData.profileName}
              onChange={(e) => setFormData(prev => ({ ...prev, profileName: e.target.value }))}
              placeholder="e.g., Senior Frontend Engineer"
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Target Role & Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Target Role
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g., Software Engineer"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Experience Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                {EXPERIENCE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} ({level.years})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Work Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {JOB_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, jobType: type.value }))}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.jobType === type.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <type.icon className="w-5 h-5" />
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Salary Range (USD)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Minimum</label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))}
                  placeholder="100000"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Maximum</label>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 0 }))}
                  placeholder="150000"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Range: ${(formData.salaryMin/1000).toFixed(0)}k - ${(formData.salaryMax/1000).toFixed(0)}k per year
            </p>
          </div>

          {/* Preferred Locations */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Preferred Locations
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                placeholder="e.g., San Francisco, CA"
                className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              <button
                type="button"
                onClick={addLocation}
                className="px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.preferredLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.preferredLocations.map((loc, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                    <MapPinIcon className="w-4 h-4" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => removeLocation(loc)}
                      className="hover:text-primary-900 dark:hover:text-primary-100"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resume Upload (only for edit) */}
          {profile && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Resume
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  profile.resumePath 
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-primary-400 dark:hover:border-primary-600'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeUpload}
                  className="hidden"
                />
                {uploadingResume ? (
                  <div className="flex items-center justify-center gap-3">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-primary-500" />
                    <span className="text-zinc-600 dark:text-zinc-400">Uploading & parsing...</span>
                  </div>
                ) : profile.resumePath ? (
                  <div className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-6 h-6" />
                    <span>Resume uploaded - Click to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <CloudArrowUpIcon className="w-10 h-10 text-zinc-400" />
                    <p className="text-zinc-600 dark:text-zinc-400">Click to upload resume (PDF or DOCX)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Match Settings */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <CogIcon className="w-5 h-5" />
              Matching Settings
            </h4>
            
            <div className="space-y-4">
              {/* Min Match Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Minimum Match Score
                  </label>
                  <span className="text-sm font-bold text-primary-600">{formData.minMatchScore}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={formData.minMatchScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, minMatchScore: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Only show jobs with at least this match score</p>
              </div>

              {/* Auto-Apply Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">Enable Auto-Apply</p>
                  <p className="text-xs text-zinc-500">AI will automatically apply to high-match jobs</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, autoApply: !prev.autoApply }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    formData.autoApply ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    formData.autoApply ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                {profile ? 'Save Changes' : 'Create Profile'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function calculateCompletion(profile) {
  const fields = [
    !!profile.profileName,
    !!profile.role,
    !!profile.location || profile.preferredLocations?.length > 0,
    !!profile.jobType,
    !!profile.salaryMin && !!profile.salaryMax,
    !!profile.resumePath,
    profile.skills?.length > 0,
    profile.experience?.length > 0,
  ];
  
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

