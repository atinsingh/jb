import { apiCall } from './client';

/* ----------------------------------------------------------------- types --- */

export type User = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  provider?: string;
  [key: string]: unknown;
};

export type Eligibility = {
  status: string;
  label?: string;
  autoApplySafe?: boolean;
  [key: string]: unknown;
};

export type Match = {
  id: string;
  title: string;
  companyName?: string;
  companyLogo?: string;
  location?: string;
  workplaceType?: string;
  externalUrl?: string;
  matchScore?: number;
  matchLabel?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  eligibility?: Eligibility;
};

// Full job document (GET /jobs/:id -> { message, job })
export type Job = {
  _id?: string;
  id?: string;
  title: string;
  companyName?: string;
  location?: string;
  workplaceType?: string;
  description?: string;
  skills?: string[];
  requirements?: string[];
  salary?: string;
  externalUrl?: string;
  originalApplyUrl?: string;
  [key: string]: unknown;
};

// A resume summary from GET /resume-builder (returns an array)
export type ResumeSummary = {
  id?: string;
  name?: string;
  targetRole?: string | null;
  targetCompany?: string | null;
  template?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  atsScore?: number | null;
  updatedAt?: string;
  sections?: {
    hasSummary?: boolean;
    experienceCount?: number;
    skillsCount?: number;
  };
  [key: string]: unknown;
};

// GET /users/preferences -> { message, preferences }
export type Preferences = {
  titles?: string[];
  locations?: string[];
  salaryMin?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  remoteOnly?: boolean;
  workplaceTypes?: string[];
  [key: string]: unknown;
};

export type Application = {
  id?: string;
  _id?: string;
  jobTitle?: string;
  companyName?: string;
  status?: string;
  appliedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type AppNotification = {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
};

/* ------------------------------------------------------------------ auth --- */

// POST /auth/login -> { token }  (field is `token`, NOT access_token)
export const login = (email: string, password: string) =>
  apiCall<{ token: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

// POST /auth/register -> { message, user, token }
export const register = (name: string, email: string, password: string) =>
  apiCall<{ message: string; user: User; token?: string }>('/auth/register', {
    method: 'POST',
    body: { name, email, password, role: 'ROLE_CANDIDATE' },
  });

// GET /users/profile -> { user } (or the user object directly)
export const getProfile = () =>
  apiCall<{ user?: User } & User>('/users/profile');

/* --------------------------------------------------------------- matching --- */

// GET /matching/eligible-jobs?limit= -> { jobs, total }
export const getMatches = (limit = 20) =>
  apiCall<{ jobs: Match[]; total: number }>(
    `/matching/eligible-jobs?limit=${limit}`,
  );

// GET /jobs/:id -> { message, job }
export const getJob = (id: string) =>
  apiCall<{ message: string; job: Job }>(`/jobs/${id}`);

/* ---------------------------------------------------------- applications --- */

// GET /applications/my-applications -> { applications, total }
export const getMyApplications = () =>
  apiCall<{ applications: Application[]; total: number }>(
    '/applications/my-applications',
  );

// POST /applications/apply/:jobId -> { message, application }
// Creates a real application. Rejects (server-side) if already applied.
export const applyToJob = (jobId: string) =>
  apiCall<{ message: string; application: Application }>(
    `/applications/apply/${jobId}`,
    { method: 'POST' },
  );

/* --------------------------------------------------------------- profile --- */

// GET /resume-builder -> ResumeSummary[]
export const getResume = () => apiCall<ResumeSummary[]>('/resume-builder');

// GET /users/preferences -> { message, preferences }
export const getPreferences = () =>
  apiCall<{ message: string; preferences: Preferences }>('/users/preferences');

/* --------------------------------------------------------- notifications --- */

// GET /notifications -> { notifications, unread }
export const getNotifications = () =>
  apiCall<{ notifications: AppNotification[]; unread: number }>(
    '/notifications',
  );
