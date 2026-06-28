import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';

export default function MockInterviewSession({ sessionId }) {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/interview-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const handleGenerateQuestion = async () => {
    try {
      setGeneratingQuestion(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/job-tracker/interview-sessions/${sessionId}/generate-question`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentQuestion(data);
        setCurrentAnswer('');
        setFeedback(null);
      }
    } catch (error) {
      toast.error('Failed to generate question');
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/job-tracker/interview-sessions/${sessionId}/submit-answer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            answer: currentAnswer,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
        fetchSession(); // Refresh session to get updated questions
      }
    } catch (error) {
      toast.error('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/job-tracker/interview-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        toast.success('Interview session completed!');
        fetchSession();
      }
    } catch (error) {
      toast.error('Failed to complete session');
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
          {session.title}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {session.questions?.length || 0} questions answered
          {session.overallScore && ` • Average Score: ${session.overallScore.toFixed(1)}/100`}
        </p>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Question</h3>
          <p className="text-zinc-700 dark:text-zinc-300 mb-4">{currentQuestion}</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Your Answer
            </label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
              rows={6}
              placeholder="Type your answer here..."
            />
          </div>

          <button
            onClick={handleSubmitAnswer}
            disabled={loading || !currentAnswer.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">Score:</span>
            <span
              className={`text-2xl font-bold ${
                feedback.score >= 80
                  ? 'text-green-600'
                  : feedback.score >= 60
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {feedback.score}/100
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Feedback:</h4>
            <p className="text-zinc-700 dark:text-zinc-300">{feedback.feedback}</p>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {!currentQuestion && (
          <button
            onClick={handleGenerateQuestion}
            disabled={generatingQuestion}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="h-5 w-5" />
            {generatingQuestion ? 'Generating...' : 'Get Next Question'}
          </button>
        )}

        {session.status === 'in_progress' && session.questions?.length > 0 && (
          <button
            onClick={handleComplete}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Complete Session
          </button>
        )}
      </div>

      {/* Previous Questions */}
      {session.questions && session.questions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Previous Questions
          </h3>
          <div className="space-y-4">
            {session.questions.map((q, idx) => (
              <div key={idx} className="border-l-2 border-primary-500 pl-4">
                <p className="font-medium text-zinc-900 dark:text-white mb-1">{q.question}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{q.answer}</p>
                {q.score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Score: {q.score}/100</span>
                    {q.feedback && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {q.feedback.substring(0, 100)}...
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {session.status === 'completed' && session.feedbackSummary && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Summary</h3>
          <p className="text-zinc-700 dark:text-zinc-300">{session.feedbackSummary}</p>
        </div>
      )}
    </div>
  );
}

