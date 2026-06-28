import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function CandidateSettings() {
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    jobAlerts: true,
    newsletter: false,
    profileVisibility: 'public',
    language: 'en',
    timezone: 'America/Los_Angeles'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ success: null, message: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus({
        success: true,
        message: 'Your settings have been saved successfully.'
      });
    } catch (error) {
      setSaveStatus({
        success: false,
        message: 'An error occurred while saving your settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
      
      // Clear status message after 5 seconds
      setTimeout(() => {
        setSaveStatus({ success: null, message: '' });
      }, 5000);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your account settings and preferences.</p>
        </div>

        {saveStatus.message && (
          <div className={`mb-6 p-4 rounded-md ${
            saveStatus.success ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {saveStatus.success ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" aria-hidden="true" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  saveStatus.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 dark:divide-gray-700">
          {/* Profile Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium leading-6 text-black">Profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                This information will be displayed on your public profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="profileVisibility" className="block text-sm font-medium text-gray-700">
                  Profile Visibility
                </label>
                <select
                  id="profileVisibility"
                  name="profileVisibility"
                  value={formData.profileVisibility}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-base focus:border-black focus:outline-none focus:ring-0 sm:text-sm"
                >
                  <option value="public">Public - Visible to anyone</option>
                  <option value="private">Private - Only visible to you</option>
                  <option value="employers">Employers Only - Visible to registered employers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="pt-8">
            <div>
              <h2 className="text-lg font-medium leading-6 text-black">Change Password</h2>
              <p className="mt-1 text-sm text-gray-600">
                Update your password associated with your account.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 p-2 focus:border-black focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-8">
            <div>
              <h2 className="text-lg font-medium leading-6 text-black">Email Notifications</h2>
              <p className="mt-1 text-sm text-gray-600">
                Control which email notifications you receive.
              </p>
            </div>

            <div className="mt-6">
              <fieldset>
                <legend className="sr-only">Email notifications</legend>
                <div className="space-y-4">
                  <div className="relative flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="emailNotifications"
                        name="emailNotifications"
                        type="checkbox"
                        checked={formData.emailNotifications}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                        Email notifications
                      </label>
                      <p className="text-gray-600">Receive important account notifications via email.</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="jobAlerts"
                        name="jobAlerts"
                        type="checkbox"
                        checked={formData.jobAlerts}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="jobAlerts" className="font-medium text-gray-700">
                        Job alerts
                      </label>
                      <p className="text-gray-600">Get notified when new jobs matching your profile are posted.</p>
                    </div>
                  </div>
                  <div className="relative flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="newsletter"
                        name="newsletter"
                        type="checkbox"
                        checked={formData.newsletter}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="newsletter" className="font-medium text-gray-700">
                        Newsletter
                      </label>
                      <p className="text-gray-600">Receive our newsletter with career tips and industry insights.</p>
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          {/* Preferences */}
          <div className="pt-8">
            <div>
              <h2 className="text-lg font-medium leading-6 text-black">Preferences</h2>
              <p className="mt-1 text-sm text-gray-600">
                Customize your application experience.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-base focus:border-black focus:outline-none focus:ring-0 sm:text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-base focus:border-black focus:outline-none focus:ring-0 sm:text-sm"
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET/CEST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-8">
            <div>
              <h2 className="text-lg font-medium leading-6 text-red-700">Danger Zone</h2>
              <p className="mt-1 text-sm text-gray-600">
                These actions are irreversible. Please proceed with caution.
              </p>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center py-3 px-4 border border-red-300 rounded-md bg-red-50">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Delete account</h3>
                  <p className="text-sm text-red-700">
                    Permanently delete your account and all of your data.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      // Handle account deletion
                    }
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="ml-3 inline-flex justify-center rounded-md border border-black bg-black py-2 px-4 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
