import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout';
import SEO from '@/components/seo/SEO';
import { getInterestedJobs, queueApplication, markJobAsInterested } from '@/services/api';
import { toast } from 'react-toastify';

export default function InterestedJobs() {
  const router = useRouter();
  const [interestedJobs, setInterestedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState(null);

  useEffect(() => {
    fetchInterestedJobs();
  }, []);

  const fetchInterestedJobs = async () => {
    try {
      const response = await getInterestedJobs();
      setInterestedJobs(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load interested jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleQueueApplication = async (jobId) => {
    setProcessingJobId(jobId);
    try {
      await queueApplication(jobId);
      toast.success('Application queued! Our AI will generate your cover letter.');
      // Refresh the list
      fetchInterestedJobs();
    } catch (error) {
      toast.error(error.message || 'Failed to queue application');
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleRemoveInterest = async (jobId) => {
    setProcessingJobId(jobId);
    try {
      await markJobAsInterested(jobId, false);
      toast.success('Removed from interested jobs');
      setInterestedJobs(jobs => jobs.filter(match => match.jobId._id !== jobId));
    } catch (error) {
      toast.error(error.message || 'Failed to remove interest');
    } finally {
      setProcessingJobId(null);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading interested jobs...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO
        title="Interested Jobs - My Job List | JobOcate"
        description="View and manage jobs you're interested in"
      />
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Interested Jobs
                </h1>
                <p className="text-xl text-gray-600">
                  {interestedJobs.length} job{interestedJobs.length !== 1 ? 's' : ''} marked as interested
                </p>
              </div>
              <button
                onClick={() => router.push('/candidate/applications')}
                className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700"
              >
                View Applications
              </button>
            </div>

            {interestedJobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No interested jobs yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Browse job recommendations and mark jobs you're interested in
                </p>
                <button
                  onClick={() => router.push('/candidate/recommendations')}
                  className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700"
                >
                  View Recommendations
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {interestedJobs.map((match) => {
                  const job = match.jobId;
                  return (
                    <div
                      key={match._id}
                      className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                              {job.title}
                            </h2>
                            {match.isApplied && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="text-lg text-gray-700 mb-1">
                            {job.companyName}
                          </p>
                          <p className="text-gray-600">
                            {job.location} • {job.jobType}
                          </p>
                          {job.salary && (
                            <p className="text-gray-600 font-semibold mt-1">
                              {job.salary}
                            </p>
                          )}
                        </div>
                        
                        {/* Match Score */}
                        <div className={`px-4 py-2 rounded-full font-bold ${getMatchColor(match.matchScore)}`}>
                          {match.matchScore}% Match
                        </div>
                      </div>

                      {/* Job Description */}
                      {job.description && (
                        <p className="text-gray-700 mb-4 line-clamp-3">
                          {job.description}
                        </p>
                      )}

                      {/* Skills Match */}
                      {match.matchedSkills && match.matchedSkills.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Your Matching Skills:</h4>
                          <div className="flex flex-wrap gap-2">
                            {match.matchedSkills.slice(0, 5).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                              >
                                ✓ {skill}
                              </span>
                            ))}
                            {match.matchedSkills.length > 5 && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                +{match.matchedSkills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-4">
                        {!match.isApplied ? (
                          <button
                            onClick={() => handleQueueApplication(job._id)}
                            disabled={processingJobId === job._id}
                            className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                          >
                            {processingJobId === job._id ? 'Queueing...' : 'Queue Application'}
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push('/candidate/applications')}
                            className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            View Application Status
                          </button>
                        )}
                        
                        <button
                          onClick={() => router.push(`/jobs/${job._id}`)}
                          className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          View Details
                        </button>
                        
                        <button
                          onClick={() => handleRemoveInterest(job._id)}
                          disabled={processingJobId === job._id}
                          className="px-6 py-3 bg-red-100 text-red-800 font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Info Box */}
                      {!match.isApplied && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            💡 Queue this application and our AI will generate a personalized cover letter for you!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
