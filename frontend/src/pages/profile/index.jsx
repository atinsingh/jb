"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '@/components/layout';
import ProfileForm from '@/components/form/ProfileForm';

export default function ProfilePage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
          // router.push('/login');
          return;
        }

        const { API_URL } = await import('@/config/api');
        const response = await fetch(`${API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          // Token is invalid or expired
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        setProfileData(data);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <ProfileForm initialData={profileData} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
