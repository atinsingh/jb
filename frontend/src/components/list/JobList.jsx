"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaMapMarkerAlt, FaBriefcase, FaSearch } from "react-icons/fa";
import { jobs } from "@/data/jobs";

export default function JobList() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState(["All"]);

  useEffect(() => {
    // Get unique categories from jobs data
    const uniqueCategories = ["All", ...new Set(jobs.map((job) => job.category))];
    setCategories(uniqueCategories);
  }, []);

  // Get search query from URL if it exists
  useEffect(() => {
    if (router.query.search) {
      setSearchQuery(router.query.search);
    }
  }, [router.query.search]);

  const filteredJobs = jobs.filter((job) => {
    // Filter by category
    const matchesCategory =
      activeCategory === "All" || job.category === activeCategory;

    // Filter by search query if it exists
    const matchesSearch =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.requirements.some((req) =>
        req.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800">
          Find Your Favorite Job
        </h1>
        <p className="text-gray-500 mt-2">
          Find jobs, create trackable resumes and enrich your applications
        </p>
        <p className="text-sm text-gray-400 mt-1">Home › Jobs</p>
      </div>

      {/* Search and Categories */}
      <div className="mb-8">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  router.push({
                    pathname: "/jobs",
                    query: { search: searchQuery.trim() },
                  });
                }
              }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search jobs by title, company, or keywords"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1 rounded-full text-sm ${
                activeCategory === cat
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      <div className="mb-8">
        {searchQuery && (
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredJobs.length}{" "}
            {filteredJobs.length === 1 ? "job" : "jobs"} for "{searchQuery}"
          </div>
        )}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No jobs found
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Try adjusting your search or filter to find what you're looking for."
                : "No jobs match the selected category."}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  router.push("/jobs");
                }}
                className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <Link href={`/jobs/${job.id}`} key={job.id} className="block">
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <img
                        src={job.companyLogo}
                        alt={`${job.companyName} logo`}
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600">
                          {job.title}
                        </h3>
                        <p className="text-gray-600">{job.companyName}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {job.type}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {job.description.substring(0, 150)}...
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center">
                      <FaBriefcase className="mr-1" /> {job.experience}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center">
                      <FaMapMarkerAlt className="mr-1" /> {job.location}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {job.postedDate}
                    </span>
                    <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
