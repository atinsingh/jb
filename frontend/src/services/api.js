import { API_URL } from '@/config/api';

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    // Check both 'authToken' and 'token' for backward compatibility
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// Resume Parser API
export const uploadResume = async (file) => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(`${API_URL}/api/resume/parse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }

  return response.json();
};

// Job Scraper API
export const triggerJobScraping = async (keywords, location) => {
  return apiCall('/api/jobs/scraper/trigger', {
    method: 'POST',
    body: JSON.stringify({ keywords, location }),
  });
};

export const searchScrapedJobs = async (filters) => {
  const params = new URLSearchParams();
  if (filters.keywords) params.append('keywords', filters.keywords);
  if (filters.location) params.append('location', filters.location);
  if (filters.skills) params.append('skills', filters.skills.join(','));
  if (filters.source) params.append('source', filters.source);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);

  return apiCall(`/api/jobs/scraper/search?${params.toString()}`);
};

export const getScrapedJobById = async (jobId) => {
  return apiCall(`/api/jobs/scraper/${jobId}`);
};

// Job Matching API
export const calculateJobMatch = async (jobId) => {
  return apiCall(`/api/job-matching/calculate/${jobId}`, {
    method: 'POST',
  });
};

export const getMyMatches = async (filters) => {
  const params = new URLSearchParams();
  if (filters.minScore) params.append('minScore', filters.minScore);
  if (filters.isInterested !== undefined) params.append('isInterested', filters.isInterested);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);

  return apiCall(`/api/job-matching/matches?${params.toString()}`);
};

export const markJobAsInterested = async (jobId, interested) => {
  return apiCall(`/api/job-matching/interest/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify({ interested }),
  });
};

export const getInterestedJobs = async () => {
  return apiCall('/api/job-matching/interested');
};

export const getJobRecommendations = async (limit = 10) => {
  return apiCall(`/api/job-matching/recommendations?limit=${limit}`);
};

// Application Agent API
export const queueApplication = async (jobId) => {
  return apiCall(`/api/application-agent/queue/${jobId}`, {
    method: 'POST',
  });
};

export const getMyApplications = async (filters) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);

  return apiCall(`/api/application-agent/my-applications?${params.toString()}`);
};

export const getApplicationById = async (applicationId) => {
  return apiCall(`/api/application-agent/${applicationId}`);
};

export const retryApplication = async (applicationId) => {
  return apiCall(`/api/application-agent/${applicationId}/retry`, {
    method: 'PATCH',
  });
};

export const cancelApplication = async (applicationId) => {
  return apiCall(`/api/application-agent/${applicationId}`, {
    method: 'DELETE',
  });
};

export const processApplicationQueue = async (limit = 10) => {
  return apiCall(`/api/application-agent/process-queue?limit=${limit}`, {
    method: 'POST',
  });
};

// User Preferences API
export const getUserPreferences = async () => {
  return apiCall('/api/users/preferences');
};

export const updateUserPreferences = async (prefs) => {
  return apiCall('/api/users/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
};

// Application Activity API
export const getApplicationActivity = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.since) search.append('since', params.since);
  if (params.limit) search.append('limit', params.limit);
  if (params.skip) search.append('skip', params.skip);
  if (params.type) {
    if (Array.isArray(params.type)) {
      params.type.forEach((t) => search.append('type', t));
    } else {
      search.append('type', params.type);
    }
  }
  const qs = search.toString();
  return apiCall(`/api/applications/activity${qs ? `?${qs}` : ''}`);
};

// Apply Runner (stub) API
export const processApplyRunner = async (limit = 10) => {
  return apiCall('/api/apply-runner/process', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
};
