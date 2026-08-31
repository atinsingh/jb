import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

const getHeaders = async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export const resumeApi = {
    // List all resumes
    getAll: async () => {
        const res = await fetch(`${API_URL}/api/resume-builder`, {
            method: 'GET',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resumes');
        return res.json();
    },

    // Get one resume
    getOne: async (id) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}`, {
            method: 'GET',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch resume');
        return res.json();
    },

    // Create new resume
    create: async (data) => {
        const res = await fetch(`${API_URL}/api/resume-builder`, {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create resume');
        return res.json();
    },

    // Create from upload
    upload: async (file, template) => {
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('template', template);

        const res = await fetch(`${API_URL}/api/resume-builder/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type not set for FormData, browser sets it with boundary
            },
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload resume');
        return res.json();
    },

    // Autosave / Update
    update: async (id, data) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/autosave`, {
            method: 'PATCH',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (res.status === 409) throw new Error('Conflict: Resume modified elsewhere');
        if (!res.ok) throw new Error('Failed to save resume');
        return res.json();
    },

    // Save Version
    saveVersion: async (id, description) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/versions`, {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ description }),
        });
        if (!res.ok) throw new Error('Failed to save version');
        return res.json();
    },

    // Generate PDF URL (triggers generation if needed)
    generatePDF: async (id) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/generate-pdf`, {
            method: 'POST',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to generate PDF');
        return res.json();
    },

    // Share
    share: async (id, data) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/share`, {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update share settings');
        return res.json();
    },

    // View Shared (Public)
    viewShared: async (slug, password) => {
        const res = await fetch(`${API_URL}/api/resume-builder/shared/${slug}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Auth header
            },
            body: JSON.stringify({ password }),
        });
        if (res.status === 403) throw new Error('Password required');
        if (res.status === 404) throw new Error('Resume not found or expired');
        if (!res.ok) throw new Error('Failed to view shared resume');
        return res.json();
    },

    // Check version history
    getVersions: async (id) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/versions`, {
            method: 'GET',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch versions');
        return res.json();
    },

    // Regenerate Section
    regenerateSection: async (id, data) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}/regenerate-section`, {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to regenerate section');
        return res.json();
    },

    // Delete
    delete: async (id) => {
        const res = await fetch(`${API_URL}/api/resume-builder/${id}`, {
            method: 'DELETE',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to delete resume');
        return res.json();
    }
};
