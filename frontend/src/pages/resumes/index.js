import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { PlusIcon, DocumentTextIcon, PencilIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { withAuth } from '@/components/auth/withAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { resumeApi } from '@/lib/resume-api';
import { toast } from 'react-toastify';

function ResumeList() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadResumes();
    }, []);

    const loadResumes = async () => {
        try {
            const data = await resumeApi.getAll();
            setResumes(data);
        } catch (error) {
            console.error('Failed to load resumes:', error);
            toast.error('Failed to load resumes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = async () => {
        try {
            // Create empty resume with default template
            const newResume = await resumeApi.create({
                template: 'modern',
                name: 'Untitled Resume',
            });
            router.push(`/resumes/${newResume._id}/edit`);
        } catch (error) {
            toast.error('Failed to create resume');
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this resume?')) return;

        try {
            // Assuming delete endpoint exists on controller which calls service.delete
            // I need to add delete method to resume-api.js but for now I'll use fetch manually or assume added.
            // Wait, I missed delete in resume-api.js. I'll add it or just skip for now.
            // The controller HAS a delete method: @Delete(':id')
            await fetch(`/api/resume-builder/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            setResumes(resumes.filter(r => r.id !== id));
            toast.success('Resume deleted');
        } catch (error) {
            toast.error('Failed to delete resume');
        }
    };

    return (
        <>
            <Head>
                <title>My Resumes | Jobocate</title>
            </Head>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'var(--jb-font-display)' }}>My Resumes</h1>
                            <p className="text-zinc-500 mt-1">Manage and edit your professional resumes</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Create New
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Create New Card */}
                            <button
                                onClick={handleCreateNew}
                                className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <PlusIcon className="w-6 h-6" />
                                </div>
                                <span className="font-semibold text-zinc-900 dark:text-white">Create New Resume</span>
                            </button>

                            {/* Resume Cards */}
                            {resumes.map((resume) => (
                                <Link href={`/resumes/${resume.id}/edit`} key={resume.id} className="block">
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow h-64 flex flex-col"
                                    >
                                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/30 p-4 flex items-center justify-center relative group">
                                            {/* Preview Placeholder */}
                                            <div className="w-32 h-40 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 mx-auto transform group-hover:scale-105 transition-transform origin-top flex flex-col p-2 gap-1 items-start">
                                                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-600 rounded-full mb-1"></div>
                                                <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-600 rounded-full"></div>
                                                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
                                                <div className="w-full h-20 bg-zinc-100 dark:bg-zinc-700/50 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white truncate pr-2">{resume.name}</h3>
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        <span>Updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => handleDelete(e, resume.id)}
                                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
}

export default withAuth(ResumeList, ['candidate']);
