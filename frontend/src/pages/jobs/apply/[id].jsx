"use client";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { FaArrowLeft, FaPaperclip, FaCheck } from "react-icons/fa";
import { jobs } from "../../../data/jobs";
import Layout from "@/components/layout";

export default function JobApplication() {
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    resume: null,
    coverLetter: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (id) {
      const jobData = jobs.find((job) => job.id === parseInt(id));
      setJob(jobData);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Here you would typically send the form data to your backend
    console.log("Form submitted:", { jobId: id, ...formData });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job not found</h1>
          <button 
            onClick={() => router.push('/jobs')} 
            className="text-blue-600 hover:underline"
          >
            ← Back to jobs
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.push(`/jobs/${id}`)}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8"
            >
              <FaArrowLeft className="mr-2" />
              Back to Job
            </button>

            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCheck className="text-green-600 text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Application Submitted!
              </h1>
              <p className="text-gray-600 mb-6">
                Thank you for applying to the {job.title} position at {job.companyName}.
                We've received your application and will review it shortly.
              </p>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-md transition"
              >
                Browse More Jobs
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8"
          >
            <FaArrowLeft className="mr-2" />
            Back to Job
          </button>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Apply for {job.title}
            </h1>
            <p className="text-gray-600 mb-6">at {job.companyName}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-1">
                  Resume/CV *
                </label>
                <div className="mt-1 flex items-center">
                  <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span>Choose file</span>
                    <input
                      type="file"
                      id="resume"
                      name="resume"
                      onChange={handleChange}
                      required
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                    />
                  </label>
                  <span className="ml-2 text-sm text-gray-500">
                    {formData.resume ? formData.resume.name : "No file chosen"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  PDF, DOC, DOCX up to 5MB
                </p>
              </div>

              <div>
                <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Letter
                </label>
                <textarea
                  id="coverLetter"
                  name="coverLetter"
                  rows={6}
                  value={formData.coverLetter}
                  onChange={handleChange}
                  placeholder="Tell us why you're a great fit for this position..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
