import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { resumeApi } from '@/lib/resume-api';
import ResumePreview from '@/components/resume-builder/ResumePreview';
import { API_URL } from '@/config/api';

export default function ResumePrint() {
    const router = useRouter();
    const { id, token } = router.query;
    const [resume, setResume] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchResume = async () => {
            try {
                // If token provided in query (e.g. from Puppeteer or Share), use it to override auth
                // We need to modify resumeApi to accept token or manually fetch here.
                // For simplicity, manual fetch if token is present, else use resumeApi which uses localStorage.

                let data;
                if (token) {
                    const res = await fetch(`${API_URL}/api/resume-builder/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Failed');
                    data = await res.json();
                } else {
                    // Try standard fetch (will use localStorage token)
                    data = await resumeApi.getOne(id);
                }
                setResume(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchResume();
    }, [id, token]);

    if (loading) return <div>Loading for print...</div>;
    if (!resume) return <div>Error loading resume</div>;

    return (
        <div style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white' }}>
            <ResumePreview resume={resume} />
        </div>
    );
}
