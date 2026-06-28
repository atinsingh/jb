import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout';
import SEO from '@/components/seo/SEO';
import { getJobRecommendations, markJobAsInterested, calculateJobMatch } from '@/services/api';
import { toast } from 'react-toastify';

export default function JobRecommendations() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await getJobRecommendations(20);
      setRecommendations(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleInterest = async (jobId, interested) => {
    setProcessingJobId(jobId);
    try {
      await markJobAsInterested(jobId, interested);
      toast.success(interested ? 'Job marked as interested!' : 'Interest removed');
      
      // Update local state
      setRecommendations(recs =>
        recs.map(rec =>
          rec.jobId._id === jobId ? { ...rec, isInterested: interested } : rec
        )
      );
    } catch (error) {
      toast.error(error.message || 'Failed to update interest');
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
            <p className="mt-4 text-gray-600">Loading recommendations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO
        title="Job Recommendations - AI-Powered Matches | JobOcate"
        description="Discover jobs that match your skills and preferences with AI-powered recommendations"
      />
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Job Recommendations
              </h1>
              <p className="text-xl text-gray-600">
                AI-matched jobs based on your profile and skills
              </p>
            </div>

            {recommendations.length === 0 ? (
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No recommendations yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload your resume to get personalized job recommendations
                </p>
                <button
                  onClick={() => router.push('/candidate/resume/upload')}
                  className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700"
                >
                  Upload Resume
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {recommendations.map((match) => {
                  const job = match.jobId;
                  return (
                    <div
                      key={match._id}
                      className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {job.title}
                          </h2>
                          <p className="text-lg text-gray-700 mb-1">
                            {job.companyName}
                          </p>
                          <p className="text-gray-600">
                            {job.location} • {job.jobType} • {job.salary}
                          </p>
                        </div>
                        
                        {/* Match Score */}
                        <div className={`px-4 py-2 rounded-full font-bold ${getMatchColor(match.matchScore)}`}>
                          {match.matchScore}% Match
                        </div>
                      </div>

                      {/* Skills Match */}
                      {match.matchedSkills && match.matchedSkills.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Matched Skills:</h4>
                          <div className="flex flex-wrap gap-2">
                            {match.matchedSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                              >
                                ✓ {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {match.missingSkills && match.missingSkills.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Skills to Develop:</h4>
                          <div className="flex flex-wrap gap-2">
                            {match.missingSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Reasoning */}
                      {match.reasoning && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Why this job?</h4>
                          <p className="text-blue-800 text-sm">{match.reasoning}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleInterest(job._id, !match.isInterested)}
                          disabled={processingJobId === job._id}
                          className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-colors ${
                            match.isInterested
                              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                          } disabled:opacity-50`}
                        >
                          {match.isInterested ? '✓ Interested' : 'Mark as Interested'}
                        </button>
                        <button
                          onClick={() => router.push(`/jobs/${job._id}`)}
                          className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
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
