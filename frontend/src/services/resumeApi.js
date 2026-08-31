import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// Generic JSON API call, mirrors the convention in services/api.js
const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// -------------------------------------------------- resume (basic data) ---
// GET /api/resume/data  ->  { name, email, phone }
export const getResumeData = async () => apiCall('/api/resume/data');

// ------------------------------------------------------- resume builder ---
// GET /api/resume-builder  ->  [{ id, name, template, ... }]
export const listResumes = async () => apiCall('/api/resume-builder');

// POST /api/resume-builder  (CreateResumeDto)
export const createResume = async (payload) =>
  apiCall('/api/resume-builder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/resume-builder/:id  ->  one resume (full document)
export const getResumeById = async (id) => apiCall(`/api/resume-builder/${id}`);

// PATCH /api/resume-builder/:id  (UpdateResumeDto)
export const updateResume = async (id, payload) =>
  apiCall(`/api/resume-builder/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// PATCH /api/resume-builder/:id/autosave  (optimistic lock, 409 on conflict)
export const autosaveResume = async (id, payload) =>
  apiCall(`/api/resume-builder/${id}/autosave`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// POST /api/resume-builder/:id/regenerate-section  (RegenerateSectionDto) -> { content }
export const regenerateSection = async (id, payload) =>
  apiCall(`/api/resume-builder/${id}/regenerate-section`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/resume-builder/:id/generate-pdf  ->  { pdfUrl }
export const generateResumePdf = async (id) =>
  apiCall(`/api/resume-builder/${id}/generate-pdf`, { method: 'POST' });

// GET /api/resume-builder/:id/versions  ->  version history
export const getResumeVersions = async (id) =>
  apiCall(`/api/resume-builder/${id}/versions`);

// POST /api/resume-builder/:id/versions  { description }
export const createResumeVersion = async (id, description) =>
  apiCall(`/api/resume-builder/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });

// POST /api/resume-builder/upload  (multipart: resume + template)
export const uploadResumeToBuilder = async (file, template) => {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('resume', file);
  if (template) formData.append('template', template);

  const response = await fetch(`${API_URL}/api/resume-builder/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }
  return response.json();
};

// GET /api/resume-builder/:id/pdf  ->  PDF binary (blob)
export const downloadResumePdf = async (id) => {
  const token = await getAccessToken();
  const response = await fetch(`${API_URL}/api/resume-builder/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('PDF download failed');
  return response.blob();
};

// ---- Library / workspace operations --------------------------------------

// POST /api/resume-builder/import  -> creates a resume from parsed data + source metadata
export const importResume = async (payload) =>
  apiCall('/api/resume-builder/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/resume-builder/:id/duplicate  -> new independent resume
export const duplicateResume = async (id, name) =>
  apiCall(`/api/resume-builder/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {}),
  });

// PATCH /api/resume-builder/:id/primary  -> set as default resume
export const setPrimaryResume = async (id) =>
  apiCall(`/api/resume-builder/${id}/primary`, { method: 'PATCH' });

// PATCH /api/resume-builder/:id  -> rename / status / archive (generic update)
export const renameResume = async (id, name) => updateResume(id, { name });
export const archiveResume = async (id) => updateResume(id, { status: 'archived' });
export const unarchiveResume = async (id) => updateResume(id, { status: 'ready' });
export const setResumeStatus = async (id, status) => updateResume(id, { status });

// DELETE /api/resume-builder/:id
export const deleteResume = async (id) =>
  apiCall(`/api/resume-builder/${id}`, { method: 'DELETE' });
