import DashboardLayout from '@/components/layout/DashboardLayout';
import { UserIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import { toast } from 'react-toastify';

export default function CandidateProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    bio: '',
    skills: [],
    experience: [],
    education: [],
  });

  const [editData, setEditData] = useState({...profile});

  // Fetch profile data from backend
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('Please log in to view your profile');
          return;
        }

        const response = await fetch(`${API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Session expired. Please log in again.');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        const userData = data.user || data;

        // Map backend data to frontend format
        setProfile({
          fullName: userData.name || authUser?.name || '',
          email: userData.email || authUser?.email || '',
          phone: userData.phone || '',
          location: userData.location || '',
          title: '', // Not in backend schema, can be added later
          bio: userData.summary || '',
          skills: userData.skills || [],
          experience: userData.experience || [],
          education: userData.education || [],
        });

        setEditData({
          fullName: userData.name || authUser?.name || '',
          email: userData.email || authUser?.email || '',
          phone: userData.phone || '',
          location: userData.location || '',
          title: '',
          bio: userData.summary || '',
          skills: userData.skills || [],
          experience: userData.experience || [],
          education: userData.education || [],
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
        
        // Fallback to auth user data if available
        if (authUser) {
          setProfile({
            fullName: authUser.name || '',
            email: authUser.email || '',
            phone: authUser.phone || '',
            location: authUser.location || '',
            title: '',
            bio: authUser.summary || '',
            skills: authUser.skills || [],
            experience: authUser.experience || [],
            education: authUser.education || [],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  const handleEdit = () => {
    setEditData({...profile});
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please log in to save your profile');
        return;
      }

      // Map frontend format to backend format
      const profileData = {
        name: editData.fullName?.trim(),
        phone: editData.phone?.trim(),
        location: editData.location?.trim(),
        summary: editData.bio?.trim(),
        skills: editData.skills || [],
        experience: editData.experience || [],
        education: editData.education || [],
      };

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(responseData.message) 
          ? responseData.message.join(', ') 
          : responseData.message || 'Failed to save profile';
        throw new Error(errorMessage);
      }

      // Update local state
      setProfile({...editData});
      setIsEditing(false);
      
      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      // Trigger profile update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profileUpdated'));
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({...profile});
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    setEditData(prev => ({
      ...prev,
      skills
    }));
  };

  const handleExperienceChange = (index, field, value) => {
    setEditData(prev => {
      const newExperience = [...prev.experience];
      newExperience[index] = {
        ...newExperience[index],
        [field]: value
      };
      return {
        ...prev,
        experience: newExperience
      };
    });
  };

  const handleEducationChange = (index, field, value) => {
    setEditData(prev => {
      const newEducation = [...prev.education];
      newEducation[index] = {
        ...newEducation[index],
        [field]: value
      };
      return {
        ...prev,
        education: newEducation
      };
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-black dark:text-gray-100">My Profile</h1>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 border border-black dark:border-gray-300 text-sm font-medium rounded-md text-black dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Edit Profile
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none disabled:opacity-50"
              >
                <XMarkIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black dark:bg-primary-600 hover:bg-gray-800 dark:hover:bg-primary-700 focus:outline-none disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700/30">
            <h3 className="text-lg leading-6 font-medium text-black dark:text-gray-100">Personal Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">Your personal details and information.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">Full name</dt>
                <dd className="mt-1 text-sm text-black dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <input
                      type="text"
                      name="fullName"
                      value={editData.fullName}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border p-2"
                    />
                  ) : (
                    profile.fullName || <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleChange}
                      disabled
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border p-2 cursor-not-allowed"
                    />
                  ) : (
                    profile.email || <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editData.phone}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border p-2"
                    />
                  ) : (
                    profile.phone || <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Location</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={editData.location}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border p-2"
                    />
                  ) : (
                    profile.location || <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Bio</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <textarea
                      name="bio"
                      rows={4}
                      value={editData.bio}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border p-2"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="whitespace-pre-line text-gray-900 dark:text-gray-100">{profile.bio || <span className="text-gray-400 dark:text-gray-500">Not provided</span>}</p>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Skills</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <div>
                      <textarea
                        name="skills"
                        rows={3}
                        value={editData.skills.join(', ')}
                        onChange={handleSkillsChange}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border p-2"
                        placeholder="Enter skills separated by commas"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate skills with commas (e.g., JavaScript, React, Node.js)</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No skills added</span>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Experience Section */}
        <div className="mt-8 bg-white border border-gray-200 overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black">Work Experience</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">Your professional work history.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
            {profile.experience && profile.experience.length > 0 ? (
              <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
                {profile.experience.map((exp, index) => (
                  <div key={index} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-700">{exp.duration || 'N/A'}</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                      <h4 className="font-medium">{exp.title || 'Untitled'}</h4>
                      <p className="text-gray-800 font-medium">{exp.company || 'Unknown Company'}</p>
                      {exp.description && <p className="mt-1">{exp.description}</p>}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No work experience added yet
              </div>
            )}
          </div>
        </div>

        {/* Education Section */}
        <div className="mt-8 bg-white border border-gray-200 overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black">Education</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">Your educational background.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
            {profile.education && profile.education.length > 0 ? (
              <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
                {profile.education.map((edu, index) => (
                  <div key={index} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-700">{edu.year || 'N/A'}</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                      <h4 className="font-medium">{edu.degree || 'No degree specified'}</h4>
                      <p className="text-gray-800 font-medium">{edu.institution || 'Unknown Institution'}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No education added yet
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
