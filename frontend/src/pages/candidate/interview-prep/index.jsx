import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PlayIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import MockInterviewSession from '@/components/job-tracker/MockInterviewSession';

export default function InterviewPrep() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('story-bank'); // 'story-bank' or 'mock-interview'
  const [stories, setStories] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  useEffect(() => {
    fetchStories();
    fetchSessions();
  }, []);

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/story-bank`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/interview-sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/job-tracker/story-bank/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Story deleted');
        fetchStories();
      }
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Interview Preparation</h1>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          {['story-bank', 'mock-interview'].map((tab) => (
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

        {/* Story Bank Tab */}
        {activeTab === 'story-bank' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Story Bank</h2>
              <button
                onClick={() => {
                  setEditingStory(null);
                  setShowStoryForm(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Story
              </button>
            </div>

            {showStoryForm && (
              <StoryForm
                story={editingStory}
                onClose={() => {
                  setShowStoryForm(false);
                  setEditingStory(null);
                }}
                onSave={() => {
                  fetchStories();
                  setShowStoryForm(false);
                  setEditingStory(null);
                }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map((story) => (
                <StoryCard
                  key={story._id}
                  story={story}
                  onEdit={() => {
                    setEditingStory(story);
                    setShowStoryForm(true);
                  }}
                  onDelete={() => handleDeleteStory(story._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mock Interview Tab */}
        {activeTab === 'mock-interview' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Mock Interviews</h2>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const response = await fetch(`${API_URL}/api/job-tracker/interview-sessions`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({}),
                    });

                    if (response.ok) {
                      const session = await response.json();
                      router.push(`/candidate/interview-prep/sessions/${session._id}`);
                    }
                  } catch (error) {
                    toast.error('Failed to create session');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <PlayIcon className="h-5 w-5" />
                New Session
              </button>
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onClick={() => router.push(`/candidate/interview-prep/sessions/${session._id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryCard({ story, onEdit, onDelete }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{story.title}</h3>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <PencilIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Situation:</span>
          <p className="text-zinc-600 dark:text-zinc-400">{story.star.situation}</p>
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Task:</span>
          <p className="text-zinc-600 dark:text-zinc-400">{story.star.task}</p>
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Action:</span>
          <p className="text-zinc-600 dark:text-zinc-400">{story.star.action}</p>
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Result:</span>
          <p className="text-zinc-600 dark:text-zinc-400">{story.star.result}</p>
        </div>
      </div>

      {story.competencies.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {story.competencies.map((comp, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs"
            >
              {comp}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StoryForm({ story, onClose, onSave }) {
  const [formData, setFormData] = useState(
    story || {
      title: '',
      description: '',
      star: { situation: '', task: '', action: '', result: '' },
      competencies: [],
      skills: [],
    },
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const url = story
        ? `${API_URL}/api/job-tracker/story-bank/${story._id}`
        : `${API_URL}/api/job-tracker/story-bank`;
      const method = story ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(story ? 'Story updated' : 'Story created');
        onSave();
      } else {
        throw new Error('Failed to save story');
      }
    } catch (error) {
      toast.error('Failed to save story');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 mb-6">
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
        {story ? 'Edit Story' : 'New Story'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            required
          />
        </div>

        {['situation', 'task', 'action', 'result'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 capitalize">
              {field}
            </label>
            <textarea
              value={formData.star[field]}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  star: { ...formData.star, [field]: e.target.value },
                })
              }
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
              rows={3}
              required
            />
          </div>
        ))}

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function SessionCard({ session, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{session.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.questions?.length || 0} questions •{' '}
            {session.status === 'completed' && session.overallScore
              ? `${session.overallScore.toFixed(0)}/100`
              : 'In Progress'}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs ${
            session.status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}
        >
          {session.status}
        </span>
      </div>
    </motion.div>
  );
}

