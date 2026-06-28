"use client";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaMapMarkerAlt,
  FaClock,
  FaDollarSign,
  FaBriefcase,
  FaArrowLeft,
} from "react-icons/fa";
import { jobs } from "../../data/jobs";
import Layout from "@/components/layout";

export default function JobDetails() {
  const router = useRouter();
  const { id } = router.query;
  const job = jobs.find((job) => job.id === parseInt(id));

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link
            href="/jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <FaArrowLeft className="mr-2" />
            Back to Jobs
          </Link>

          {/* Job Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex items-start space-x-4">
                <img
                  src={job.companyLogo}
                  alt={`${job.companyName} logo`}
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {job.title}
                  </h1>
                  <p className="text-lg text-gray-600">{job.companyName}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {job.type}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {job.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Link 
                  href={`/jobs/apply/${job.id}`}
                  className="inline-block w-full md:w-auto text-center bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-md transition"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Description */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Job Description</h2>
                <p className="text-gray-700 mb-4">{job.description}</p>

                <h3 className="text-lg font-medium mt-6 mb-3">
                  Responsibilities
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  {job.responsibilities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium mt-6 mb-3">Requirements</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  {job.requirements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Job Overview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Job Overview</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <FaDollarSign className="text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Salary</p>
                      <p className="font-medium">{job.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaBriefcase className="text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Experience</p>
                      <p className="font-medium">{job.experience}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Job Type</p>
                      <p className="font-medium">{job.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaMapMarkerAlt className="text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{job.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Benefits</h2>
                <ul className="space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Apply Button (sticky on scroll) */}
              <div className="sticky top-6">
                <Link 
                  href={`/jobs/apply/${job.id}`}
                  className="block w-full text-center bg-black hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-md transition"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
