import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  FireIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PlayIcon,
  RocketLaunchIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UserCircleIcon,
  BoltIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, FireIcon as FireSolidIcon } from '@heroicons/react/24/solid';
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

// Circular Progress Component
function CircularProgress({ value, max, size = 120, strokeWidth = 8, color = 'primary' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / max) * circumference;
  
  const colorMap = {
    primary: 'stroke-primary-500',
    emerald: 'stroke-emerald-500',
    violet: 'stroke-violet-500',
    amber: 'stroke-amber-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-zinc-200 dark:stroke-zinc-700"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={colorMap[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</span>
          <span className="text-sm text-zinc-400">/{max}</span>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'there';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    console.log('Dashboard mounted for user:', user?.email);
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [user]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Weekly goals
  const weeklyGoals = {
    applications: { current: 8, target: 15 },
    interviews: { current: 2, target: 5 },
    profileViews: { current: 34, target: 50 },
  };

  // Quick actions
  const quickActions = [
    { icon: RocketLaunchIcon, label: 'Find Jobs', href: '/jobs', color: 'from-primary-500 to-rose-500' },
    { icon: DocumentTextIcon, label: 'Resume AI', href: '/candidate/resume-builder', color: 'from-violet-500 to-purple-500' },
    { icon: EnvelopeIcon, label: 'Cover Letter', href: '/candidate/cover-letter', color: 'from-blue-500 to-cyan-500' },
    { icon: MicrophoneIcon, label: 'Interview Prep', href: '/candidate/interview-buddy', color: 'from-emerald-500 to-teal-500' },
  ];

  // Recent activity
  const recentActivity = [
    { id: 1, type: 'applied', title: 'Applied to Senior Developer at Google', time: '2 hours ago', icon: PaperAirplaneIcon, color: 'bg-blue-500' },
    { id: 2, type: 'interview', title: 'Interview scheduled with Meta', time: '5 hours ago', icon: CalendarIcon, color: 'bg-violet-500' },
    { id: 3, type: 'viewed', title: 'Your profile was viewed by Amazon', time: '1 day ago', icon: UserCircleIcon, color: 'bg-amber-500' },
    { id: 4, type: 'match', title: '3 new job matches found', time: '1 day ago', icon: SparklesIcon, color: 'bg-emerald-500' },
  ];

  // Top matches
  const topMatches = [
    { id: 1, title: 'Senior Frontend Engineer', company: 'Stripe', score: 96, logo: 'ST', salary: '$180k-220k' },
    { id: 2, title: 'Staff Software Engineer', company: 'Airbnb', score: 94, logo: 'AB', salary: '$200k-250k' },
    { id: 3, title: 'Lead React Developer', company: 'Figma', score: 91, logo: 'FG', salary: '$170k-210k' },
  ];

  // Upcoming interviews
  const upcomingInterviews = [
    { id: 1, company: 'Meta', role: 'Senior Engineer', date: 'Tomorrow', time: '2:00 PM', type: 'Technical' },
    { id: 2, company: 'Netflix', role: 'Staff Engineer', date: 'Dec 22', time: '11:00 AM', type: 'Behavioral' },
  ];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | Jobocate</title>
      </Head>
      <DashboardLayout>
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-950">
          {/* Ambient Effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px]" />
          </div>

          <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-8 pt-8 pb-12">
            
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10"
            >
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{formatDate()}</p>
                <h1 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {getGreeting()}, <span className="bg-gradient-to-r from-primary-500 to-violet-500 bg-clip-text text-transparent">{userName}</span>
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 mt-2">
                  Let's make today count. You're doing great!
                </p>
              </div>

              {/* Streak Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/25"
              >
                <div className="relative">
                  <FireSolidIcon className="w-10 h-10 text-white" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white/30 rounded-full blur-md"
                  />
                </div>
                <div className="text-white">
                  <p className="text-2xl font-bold">{streak} Day Streak!</p>
                  <p className="text-amber-100 text-sm">Keep it going 🔥</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Quick Actions */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={action.label} href={action.href}>
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative overflow-hidden bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {action.label}
                      </h3>
                      <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  </Link>
                ))}
              </motion.div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Weekly Progress - Large Card */}
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2 bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Weekly Progress</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Track your goals this week</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                      <TrophyIcon className="w-5 h-5 text-emerald-500" />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">On Track</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="flex flex-col items-center">
                      <CircularProgress 
                        value={weeklyGoals.applications.current} 
                        max={weeklyGoals.applications.target}
                        color="primary"
                      />
                      <p className="mt-4 font-semibold text-zinc-900 dark:text-white">Applications</p>
                      <p className="text-sm text-zinc-500">{weeklyGoals.applications.target - weeklyGoals.applications.current} to go</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircularProgress 
                        value={weeklyGoals.interviews.current} 
                        max={weeklyGoals.interviews.target}
                        color="violet"
                      />
                      <p className="mt-4 font-semibold text-zinc-900 dark:text-white">Interviews</p>
                      <p className="text-sm text-zinc-500">{weeklyGoals.interviews.target - weeklyGoals.interviews.current} to go</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircularProgress 
                        value={weeklyGoals.profileViews.current} 
                        max={weeklyGoals.profileViews.target}
                        color="emerald"
                      />
                      <p className="mt-4 font-semibold text-zinc-900 dark:text-white">Profile Views</p>
                      <p className="text-sm text-zinc-500">{weeklyGoals.profileViews.target - weeklyGoals.profileViews.current} to go</p>
                    </div>
                  </div>

                  {/* Progress Tips */}
                  <div className="mt-8 p-4 bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-500 rounded-lg">
                        <BoltIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-white">Pro Tip</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Apply to 2 more jobs today to stay on track for your weekly goal!</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Upcoming Interviews */}
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Upcoming Interviews</h2>
                    <Link href="/candidate/interviews" className="text-sm font-medium text-primary-500 hover:text-primary-600">
                      View all
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {upcomingInterviews.map((interview, index) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="group p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {interview.company.substring(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-zinc-900 dark:text-white">{interview.company}</p>
                            <p className="text-sm text-zinc-500">{interview.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-zinc-900 dark:text-white">{interview.date}</p>
                            <p className="text-sm text-zinc-500">{interview.time}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-medium px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                            {interview.type}
                          </span>
                          <Link href="/candidate/interview-buddy" className="flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayIcon className="w-4 h-4" />
                            Practice
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {upcomingInterviews.length === 0 && (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                      <p className="text-zinc-500">No interviews scheduled</p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Job Matches */}
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2 bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                        <SparklesIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Top Matches For You</h2>
                        <p className="text-sm text-zinc-500">AI-curated based on your profile</p>
                      </div>
                    </div>
                    <Link href="/jobs" className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600">
                      See all <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {topMatches.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ x: 4 }}
                        className="group flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 shadow-inner">
                          {job.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {job.title}
                          </h3>
                          <p className="text-sm text-zinc-500 flex items-center gap-2">
                            {job.company}
                            <span className="text-emerald-500 font-medium">{job.salary}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-500">
                              <StarSolidIcon className="w-4 h-4" />
                              <span className="font-bold">{job.score}%</span>
                            </div>
                            <p className="text-xs text-zinc-400">match</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/25 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <RocketLaunchIcon className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                  variants={itemVariants}
                  className="bg-white dark:bg-zinc-800/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg"
                >
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Recent Activity</h2>

                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center flex-shrink-0`}>
                          <activity.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white leading-tight">
                            {activity.title}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <Link 
                    href="/candidate/applications" 
                    className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    View All Activity
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>

              {/* AI Tools Promo Banner */}
              <motion.div
                variants={itemVariants}
                className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-8 shadow-2xl"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <SparklesIcon className="w-6 h-6 text-amber-300" />
                      <span className="text-amber-300 font-semibold uppercase tracking-wider text-sm">AI-Powered Tools</span>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                      Supercharge Your Job Search
                    </h2>
                    <p className="text-violet-100 text-lg max-w-xl">
                      Let AI optimize your resume, write compelling cover letters, and prepare you for interviews.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/candidate/resume-builder"
                      className="group flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all"
                    >
                      <DocumentTextIcon className="w-6 h-6" />
                      <span className="font-semibold">AI Resume</span>
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      href="/candidate/interview-buddy"
                      className="group flex items-center gap-3 px-6 py-4 bg-white text-violet-600 rounded-2xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                      <MicrophoneIcon className="w-6 h-6" />
                      <span>Interview Prep</span>
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
