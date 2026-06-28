import { useState } from 'react';
import Head from 'next/head';
import { 
  BuildingOfficeIcon,
  GlobeAltIcon,
  MapPinIcon,
  UsersIcon,
  LinkIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import EmployerLayout from '@/components/layout/EmployerLayout';

export default function CompanyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [company, setCompany] = useState({
    name: 'TechCorp Inc.',
    industry: 'Information Technology',
    size: '51-200 employees',
    website: 'https://techcorp.example.com',
    location: 'San Francisco, CA',
    about: 'TechCorp is a leading technology company specializing in innovative software solutions. We are committed to creating products that make a difference in people\'s lives.',
    logo: '/logos/techcorp-logo.png',
    coverPhoto: '/covers/techcorp-cover.jpg'
  });
  const [formData, setFormData] = useState({ ...company });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCompany(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(company);
    setIsEditing(false);
  };

  return (
    <EmployerLayout>
      <Head>
        <title>Company Profile | Jobocate</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Company Profile</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your company's public profile</p>
            </div>
            <div className="mt-4 md:mt-0">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <XMarkIcon className="-ml-1 mr-2 h-5 w-5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            {/* Cover Photo */}
            <div className="bg-gray-200 rounded-lg overflow-hidden h-48 relative">
              {company.coverPhoto ? (
                <img
                  src={company.coverPhoto}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-16 w-16 text-white opacity-75" />
                </div>
              )}
              <div className="absolute bottom-4 right-4">
                {isEditing && (
                  <label className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-black bg-opacity-50 hover:bg-opacity-70 cursor-pointer">
                    <PencilIcon className="h-3 w-3 mr-1" />
                    Change Cover
                    <input type="file" className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-white shadow rounded-lg -mt-12 relative z-10 mx-4">
              <div className="px-6 pt-2 pb-8 sm:px-8">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-shrink-0 -mt-8 mb-4 sm:mb-0 sm:mr-6">
                    <div className="h-24 w-24 rounded-lg bg-white border-4 border-white shadow-md overflow-hidden">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <label className="mt-2 block text-center text-xs text-orange-600 hover:text-orange-700 cursor-pointer">
                        <span>Update Logo</span>
                        <input type="file" className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            value={formData.name}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
                            <input
                              type="text"
                              name="industry"
                              id="industry"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              value={formData.industry}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div>
                            <label htmlFor="size" className="block text-sm font-medium text-gray-700">Company Size</label>
                            <select
                              id="size"
                              name="size"
                              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              value={formData.size}
                              onChange={handleInputChange}
                            >
                              <option>1-10 employees</option>
                              <option>11-50 employees</option>
                              <option>51-200 employees</option>
                              <option>201-500 employees</option>
                              <option>501-1000 employees</option>
                              <option>1001-5000 employees</option>
                              <option>5000+ employees</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                              https://
                            </span>
                            <input
                              type="text"
                              name="website"
                              id="website"
                              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              placeholder="example.com"
                              value={formData.website.replace('https://', '')}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  website: `https://${e.target.value}`
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                          <input
                            type="text"
                            name="location"
                            id="location"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            value={formData.location}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <label htmlFor="about" className="block text-sm font-medium text-gray-700">About Us</label>
                          <div className="mt-1">
                            <textarea
                              id="about"
                              name="about"
                              rows={4}
                              className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                              value={formData.about}
                              onChange={handleInputChange}
                            />
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Brief description about your company for candidates
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <BuildingOfficeIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            {company.industry}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <UsersIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            {company.size}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <GlobeAltIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-500">
                              {company.website.replace('https://', '')}
                            </a>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <MapPinIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            {company.location}
                          </div>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-gray-900">About Us</h3>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{company.about}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Stats */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900">Company Statistics</h3>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Open Positions', value: '12', change: '+2', changeType: 'increase' },
                { name: 'Total Applicants', value: '245', change: '+15%', changeType: 'increase' },
                { name: 'Interviewing', value: '24', change: '+5', changeType: 'increase' },
                { name: 'Hired This Month', value: '8', change: '+3', changeType: 'increase' },
              ].map((stat) => (
                <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</dd>
                    <div className={`mt-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                      <span className="sr-only">{stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
}
