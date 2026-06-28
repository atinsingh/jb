import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AIAssistantPanel({ resumeData, onUpdate, isOpen, onClose }) {
  const [activeFeature, setActiveFeature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(null);
  const [usage, setUsage] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [bulletRewriteResult, setBulletRewriteResult] = useState(null);
  const [tailorResult, setTailorResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchQuota();
      fetchUsage();
      fetchPendingReviews();
    }
  }, [isOpen]);

  const fetchQuota = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/quota/rewriteBullets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error('Error fetching quota:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/claims-review/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingReviews(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleRewriteBullets = async (bullets, roleTarget) => {
    setLoading(true);
    setActiveFeature('rewrite-bullets');
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/rewrite-bullets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bullets, roleTarget }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to rewrite bullets');
      }

      const data = await response.json();
      setBulletRewriteResult(data);
      toast.success('Bullets rewritten successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to rewrite bullets');
    } finally {
      setLoading(false);
    }
  };

  const handleTailorResume = async (jobDescription) => {
    setLoading(true);
    setActiveFeature('tailor-resume');
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/tailor-resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeJson: resumeData,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to tailor resume');
      }

      const data = await response.json();
      setTailorResult(data);
      toast.success('Resume tailored successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to tailor resume');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChanges = (type, changes) => {
    if (type === 'bullets' && bulletRewriteResult) {
      // Apply improved bullets
      onUpdate({ experience: changes });
      toast.success('Changes applied!');
      setBulletRewriteResult(null);
    } else if (type === 'resume' && tailorResult) {
      // Apply tailored resume
      onUpdate(tailorResult.updatedResume);
      toast.success('Resume updated!');
      setTailorResult(null);
    }
  };

  const handleReviewClaim = async (reviewId, decision, modifiedContent) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/llm/claims-review/${reviewId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, modifiedContent }),
      });

      if (response.ok) {
        toast.success('Claim reviewed');
        fetchPendingReviews();
      }
    } catch (error) {
      toast.error('Failed to review claim');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-zinc-900 dark:text-white">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Quota Meter */}
        {quota && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              AI Credits: {quota.remaining || 0} / {quota.limit || '∞'}
            </div>
            {quota.limit && (
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${((quota.remaining || 0) / quota.limit) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pending Reviews */}
          {pendingReviews.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Pending Reviews ({pendingReviews.length})
              </h3>
              {pendingReviews.map((review) => (
                <div key={review._id} className="mb-2 text-xs text-yellow-800 dark:text-yellow-300">
                  <p className="mb-1">{review.claim}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewClaim(review._id, 'approve')}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewClaim(review._id, 'reject')}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bullet Rewrite Result */}
          {bulletRewriteResult && (
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                Improved Bullets
              </h3>
              <div className="space-y-3 mb-4">
                {bulletRewriteResult.diffs?.map((diff, idx) => (
                  <div key={idx} className="border-l-2 border-primary-500 pl-3">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                      Before:
                    </div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                      {diff.original}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                      After:
                    </div>
                    <div className="text-sm text-zinc-900 dark:text-white font-medium">
                      {diff.improved}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Changes: {diff.changes.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptChanges('bullets', bulletRewriteResult.improvedBullets)}
                  className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  Accept All
                </button>
                <button
                  onClick={() => setBulletRewriteResult(null)}
                  className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Tailor Result */}
          {tailorResult && (
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                Resume Tailored
              </h3>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                <div className="mb-2">
                  <strong>Keywords Matched:</strong> {tailorResult.keywordMap?.matched?.join(', ')}
                </div>
                <div className="mb-2">
                  <strong>Keywords Added:</strong> {tailorResult.keywordMap?.added?.join(', ')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptChanges('resume', tailorResult.updatedResume)}
                  className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  Accept Changes
                </button>
                <button
                  onClick={() => setTailorResult(null)}
                  className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                const bullets = resumeData.experience?.[0]?.achievements || [];
                if (bullets.length > 0) {
                  handleRewriteBullets(bullets);
                } else {
                  toast.error('No bullets to rewrite');
                }
              }}
              disabled={loading}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && activeFeature === 'rewrite-bullets' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PencilIcon className="h-4 w-4" />
              )}
              Rewrite Bullets
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

