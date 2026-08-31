import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  PencilIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

export default function AnswersPackGenerator({ applicationId, jobId, existingAnswersPack, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [answersPack, setAnswersPack] = useState(existingAnswersPack || {});

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/job-tracker/applications/${applicationId}/answers-pack/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnswersPack(data);
        setEditing(true);
        toast.success('Answers pack generated!');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate answers pack');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to generate answers pack');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/job-tracker/applications/${applicationId}/answers-pack`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answersPack),
      });

      if (response.ok) {
        toast.success('Answers pack saved!');
        setEditing(false);
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to save answers pack');
      }
    } catch (error) {
      toast.error('Failed to save answers pack');
    }
  };

  const handleChange = (key, value) => {
    setAnswersPack((prev) => ({ ...prev, [key]: value }));
  };

  const commonQuestions = [
    { key: 'workAuthorization', label: 'Work Authorization' },
    { key: 'salaryExpectations', label: 'Salary Expectations' },
    { key: 'noticePeriod', label: 'Notice Period' },
    { key: 'whyUs', label: 'Why Us?' },
    { key: 'availability', label: 'Availability' },
    { key: 'relocation', label: 'Relocation Willingness' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Application Answers Pack</h2>
        {!existingAnswersPack && !editing && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <SparklesIcon className="h-5 w-5" />
            {loading ? 'Generating...' : 'Generate Answers Pack'}
          </button>
        )}
        {editing && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Save Changes
          </button>
        )}
      </div>

      {Object.keys(answersPack).length === 0 && !loading ? (
        <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
          <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
          <p>Generate an answers pack to get AI-powered responses to common application questions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commonQuestions.map((question) => (
            <div key={question.key}>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {question.label}
              </label>
              {editing ? (
                <textarea
                  value={answersPack[question.key] || ''}
                  onChange={(e) => handleChange(question.key, e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  rows={3}
                />
              ) : (
                <p className="text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                  {answersPack[question.key] || 'Not answered'}
                </p>
              )}
            </div>
          ))}

          {/* Custom questions */}
          {Object.keys(answersPack)
            .filter((key) => !commonQuestions.find((q) => q.key === key))
            .map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                {editing ? (
                  <textarea
                    value={answersPack[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    rows={3}
                  />
                ) : (
                  <p className="text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                    {answersPack[key] || 'Not answered'}
                  </p>
                )}
              </div>
            ))}

          {!editing && existingAnswersPack && (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-300"
            >
              <PencilIcon className="h-5 w-5" />
              Edit Answers
            </button>
          )}
        </div>
      )}
    </div>
  );
}

