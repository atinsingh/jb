import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProfileCompletionBanner from '@/components/profile/ProfileCompletionBanner';
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/catalyst/table';
import { Button } from '@/components/catalyst/button';
import { Link } from '@/components/catalyst/link';
import { Badge } from '@/components/catalyst/badge';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const userName = user?.name || 'there';
  const [timePeriod, setTimePeriod] = useState('Last week');
  
  const timePeriods = ['Last week', 'Last two weeks', 'Last month', 'Last quarter'];
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    { 
      name: 'Total jobs posted', 
      value: '24', 
      change: '+12%',
      changeType: 'positive'
    },
    { 
      name: 'Applications received', 
      value: '142', 
      change: '+15%',
      changeType: 'positive'
    },
    { 
      name: 'Active candidates', 
      value: '89', 
      change: '+5%',
      changeType: 'positive'
    },
    { 
      name: 'Total revenue', 
      value: '$45.2K', 
      change: '+8.2%',
      changeType: 'positive'
    },
  ];

  const recentJobs = [
    {
      id: 1001,
      title: 'Senior Software Engineer',
      company: 'Your Company',
      status: 'Active',
      date: '2024-05-09',
      applications: 24,
      views: 156,
      logo: 'SE',
    },
    {
      id: 1002,
      title: 'Product Designer',
      company: 'Your Company',
      status: 'Active',
      date: '2024-05-05',
      applications: 18,
      views: 203,
      logo: 'PD',
    },
    {
      id: 1003,
      title: 'Frontend Developer',
      company: 'Your Company',
      status: 'Draft',
      date: '2024-04-28',
      applications: 0,
      views: 12,
      logo: 'FD',
    },
    {
      id: 1004,
      title: 'Backend Engineer',
      company: 'Your Company',
      status: 'Active',
      date: '2024-04-23',
      applications: 32,
      views: 189,
      logo: 'BE',
    },
    {
      id: 1005,
      title: 'DevOps Specialist',
      company: 'Your Company',
      status: 'Active',
      date: '2024-04-18',
      applications: 15,
      views: 134,
      logo: 'DS',
    },
    {
      id: 1006,
      title: 'Data Scientist',
      company: 'Your Company',
      status: 'Active',
      date: '2024-04-14',
      applications: 28,
      views: 167,
      logo: 'DT',
    },
    {
      id: 1007,
      title: 'UX Researcher',
      company: 'Your Company',
      status: 'Draft',
      date: '2024-04-10',
      applications: 0,
      views: 8,
      logo: 'UX',
    },
    {
      id: 1008,
      title: 'Mobile Developer',
      company: 'Your Company',
      status: 'Active',
      date: '2024-04-06',
      applications: 21,
      views: 145,
      logo: 'MD',
    },
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Active': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
      'Draft': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      'Closed': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    return styles[status] || styles['Draft'];
  };

  return (
    <>
      <Head>
        <title>Employer Dashboard | Jobocate</title>
        <meta name="description" content="Manage your job postings and candidates" />
      </Head>
      <DashboardLayout>
        <div className="py-8">
        <ProfileCompletionBanner />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
            {getGreeting()}, {userName}
          </h1>
        </div>

        {/* Time Period Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {timePeriods.map((period) => (
              <Button
                key={period}
                onClick={() => setTimePeriod(period)}
                color={timePeriod === period ? 'dark/zinc' : undefined}
                outline={timePeriod !== period}
                plain={timePeriod !== period}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* Overview Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-6">Overview</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div 
                key={stat.name} 
                className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900"
              >
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  {stat.name}
                </dt>
                <dd className="flex items-baseline justify-between">
                  <div className="text-2xl font-semibold text-zinc-950 dark:text-white">
                    {stat.value}
                  </div>
                  <div className={`flex items-baseline text-sm font-semibold ${
                    stat.changeType === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUpIcon className="h-4 w-4 mr-0.5" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-0.5" />
                    )}
                    {stat.change}
                  </div>
                </dd>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  from {timePeriod.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Recent jobs</h2>
            <Button href="/employer/jobs/post" color="sky">
              <PlusIcon data-slot="icon" className="h-4 w-4" />
              Post New Job
            </Button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Job</TableHeader>
                <TableHeader>Position</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Applications</TableHeader>
                <TableHeader>Views</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentJobs.slice(0, 5).map((job) => (
                <TableRow key={job.id} href={`/employer/jobs/${job.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                        {job.logo}
                      </div>
                      <div>
                        <div className="text-sm font-medium">#{job.id}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(job.date)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{job.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge color={job.status === 'Active' ? 'emerald' : job.status === 'Draft' ? 'yellow' : 'zinc'}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/employer/jobs/${job.id}/applications`} className="font-medium">
                      {job.applications}
                    </Link>
                  </TableCell>
                  <TableCell>{job.views}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Link href="/employer/jobs" className="text-sm font-medium text-sky-600 dark:text-sky-400">
              View all jobs →
            </Link>
          </div>
        </div>
        </div>
      </DashboardLayout>
    </>
  );
}
