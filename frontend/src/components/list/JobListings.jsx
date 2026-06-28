"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaList, FaMapMarkerAlt, FaTh } from "react-icons/fa";
import { jobs } from "../../data/jobs";

// Get unique categories from jobs data
const allCategories = ["All", ...new Set(jobs.map(job => job.category))];
const categories = allCategories.map(cat => ({ name: cat }));

export default function JobListings() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleJobs, setVisibleJobs] = useState(9);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Filter jobs based on active category
  const filteredJobs = activeCategory === "All" 
    ? jobs 
    : jobs.filter(job => job.category === activeCategory);
    
  // Reset visible jobs when category changes
  useEffect(() => {
    setVisibleJobs(9);
  }, [activeCategory]);

  return (
    <section className="px-8 lg:px-16 py-12 2xl:container max-w-7xl mx-auto">
      {/* Heading */}
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
        {activeCategory === "All" ? "All Jobs" : `${activeCategory} Jobs`}
      </h2>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-4 py-2 rounded-md transition ${
              activeCategory === cat.name
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-blue-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Top Row */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/jobs" className="text-blue-600 font-medium hover:underline">
          View All Jobs →
        </Link>
        <div className="flex gap-3 text-gray-600">
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            aria-label="List view"
          >
            <FaList className="text-lg" />
          </button>
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            aria-label="Grid view"
          >
            <FaTh className="text-lg" />
          </button>
        </div>
      </div>

      {/* Jobs Count */}
      <div className="mb-4 text-gray-600">
        Showing {Math.min(visibleJobs, filteredJobs.length)} of {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
        {activeCategory !== 'All' && ` in ${activeCategory}`}
      </div>

      {/* Jobs Grid/List */}
      <div className={viewMode === 'grid' ? 'grid md:grid-cols-3 gap-6' : 'space-y-3'}>
        {filteredJobs.length > 0 ? (
          filteredJobs.slice(0, visibleJobs).map((job) => (
            <Link href={`/jobs/${job.id}`} key={job.id} className="block group">
              <div className={`border-b border-gray-200 py-4 hover:bg-gray-50 transition ${
                viewMode === 'list' ? 'px-4' : 'h-full border rounded-lg p-6 bg-white hover:shadow-md'
              }`}>
                {viewMode === 'list' ? (
                  <div className="flex items-start gap-4">
                    <img 
                      src={job.companyLogo} 
                      alt={`${job.companyName} logo`} 
                      className="w-12 h-12 object-contain rounded-md border border-gray-100 p-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">{job.title}</h3>
                          <p className="text-gray-600">{job.companyName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{job.salary}</p>
                          <p className="text-xs text-gray-500">{job.type}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <FaMapMarkerAlt className="mr-1 text-blue-500 text-xs" />
                          {job.location}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">Posted {job.postedDate}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      <img 
                        src={job.companyLogo} 
                        alt={`${job.companyName} logo`} 
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">{job.title}</h3>
                        <p className="text-gray-600">{job.companyName}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {job.type}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {job.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-blue-500" />
                        <span>{job.location}</span>
                      </div>
                      <div className="mt-1 font-medium">{job.salary}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Posted {job.postedDate}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-3 text-center py-10">
            <p className="text-gray-500 text-lg">No jobs found in this category.</p>
            <button 
              onClick={() => setActiveCategory("All")}
              className="mt-4 text-blue-600 hover:underline"
            >
              View all jobs
            </button>
          </div>
        )}
      </div>

    
    </section>
  );
}
