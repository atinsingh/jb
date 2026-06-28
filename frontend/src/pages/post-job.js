import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function PostJob() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    location: '',
    type: 'Full Time',
    category: 'Development',
    salary: '',
    experience: '',
    description: '',
    requirements: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequirementChange = (index, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const removeRequirement = (index) => {
    const newRequirements = formData.requirements.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements.length > 0 ? newRequirements : ['']
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // In a real app, you would send this data to your backend
      console.log('Submitting job:', formData);
      
      // For demo purposes, we'll just log it and redirect
      // In a real app, you would handle the API call here
      // await fetch('/api/jobs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      // Redirect to a success page or jobs listing
      router.push('/jobs?posted=true');
    } catch (err) {
      console.error('Error posting job:', err);
      setError('Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Post a Job - Jobocate</title>
        <meta name="description" content="Post a new job opening on Jobocate" />
      </Head>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
          <p className="mt-2 text-sm text-gray-600">Fill in the details below to post your job opening</p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. San Francisco, CA or Remote"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Job Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                    <option>Temporary</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option>Development</option>
                    <option>Design</option>
                    <option>Marketing</option>
                    <option>Sales</option>
                    <option>Customer Support</option>
                    <option>Finance</option>
                    <option>Human Resources</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                    Salary
                  </label>
                  <input
                    type="text"
                    name="salary"
                    id="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. $90,000 - $120,000/year"
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    name="experience"
                    id="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. 3+ years"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Job Description *
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    required
                    value={formData.description}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full border border-gray-300 rounded-md sm:text-sm p-3"
                    placeholder="Detailed job description, responsibilities, and requirements..."
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Key Requirements
                  </label>
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    + Add Requirement
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => handleRequirementChange(index, e.target.value)}
                        className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter a requirement"
                      />
                      {formData.requirements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="ml-2 text-red-600 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
