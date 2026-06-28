import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import AnswersPackGenerator from '@/components/job-tracker/AnswersPackGenerator';

export default function ApplicationDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [answersPack, setAnswersPack] = useState(null);

  useEffect(() => {
    if (id) {
      fetchApplication();
      fetchAnswersPack();
    }
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApplication(data);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      toast.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswersPack = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/applications/${id}/answers-pack`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAnswersPack(data);
      }
    } catch (error) {
      // Answers pack might not exist yet
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status updated');
        fetchApplication();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application) {
    return <div>Application not found</div>;
  }

  const job = application.jobId || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            {job.title || 'Untitled Position'}
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {job.companyName} • {job.location || 'N/A'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          {['overview', 'apply-kit', 'timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Job Description</h2>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {job.description || 'No description available'}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Application Status</h2>
              <div className="flex items-center gap-4">
                <select
                  value={application.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                >
                  <option value="pending">Applied</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="rejected">Rejected</option>
                  <option value="accepted">Accepted</option>
                </select>
                {application.matchScore && (
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Match Score: {application.matchScore}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apply-kit' && (
          <div className="space-y-6">
            <AnswersPackGenerator
              applicationId={id}
              jobId={job._id || job.id}
              existingAnswersPack={answersPack}
              onUpdate={fetchAnswersPack}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Status Timeline</h2>
            <div className="space-y-4">
              {(application.statusTimeline || []).map((entry, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary-600 mt-2"></div>
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900 dark:text-white capitalize">{entry.status}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    {entry.notes && (
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{entry.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

