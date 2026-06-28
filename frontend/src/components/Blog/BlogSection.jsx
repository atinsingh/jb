"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import blog1 from '@/assets/blogs/blog1.png'
import blog2 from '@/assets/blogs/blog2.png'
import blog3 from '@/assets/blogs/blog3.png'

export const blogs = [
  {
    id: 1,
    title: "How To Get More Results Out Of Your Job",
    slug: "how-to-get-more-results-out-of-your-job",
    date: "February 10, 2020",
    category: "Announcement",
    image: blog1,
    excerpt: "Discover effective strategies to maximize your job performance and achieve better results in your career.",
    content: `<h2>Introduction</h2>
    <p>In today's competitive job market, it's essential to stand out and deliver exceptional results. This article will guide you through proven strategies to enhance your job performance and achieve your career goals.</p>
    
    <h2>Set Clear Goals</h2>
    <p>Setting clear, measurable goals is the first step toward achieving better results. Break down your objectives into smaller, manageable tasks and track your progress regularly.</p>
    
    <h2>Develop New Skills</h2>
    <p>Continuous learning is key to staying relevant in your field. Identify skills that can enhance your performance and invest time in developing them through courses, workshops, or self-study.</p>
    
    <h2>Time Management</h2>
    <p>Effective time management can significantly improve your productivity. Prioritize tasks, minimize distractions, and use productivity tools to stay organized and focused.</p>
    
    <h2>Conclusion</h2>
    <p>By implementing these strategies, you can enhance your job performance and achieve better results in your career. Remember, consistency and dedication are key to long-term success.</p>`
  },
  {
    id: 2,
    title: "What's Holding Back The Job Industry?",
    slug: "whats-holding-back-the-job-industry",
    date: "February 10, 2020",
    category: "Announcement",
    image: blog2,
    excerpt: "Explore the challenges and barriers affecting the job industry and how we can overcome them.",
    content: `<h2>Introduction</h2>
    <p>The job industry faces numerous challenges that hinder growth and development. In this article, we'll explore these barriers and discuss potential solutions.</p>
    
    <h2>Skills Gap</h2>
    <p>One of the biggest challenges is the growing skills gap. Many job seekers lack the specific skills required by employers, while others struggle to keep up with rapidly evolving technologies.</p>
    
    <h2>Hiring Practices</h2>
    <p>Traditional hiring practices often focus on degrees and experience rather than skills and potential. This approach can exclude talented individuals who may not fit the conventional mold.</p>
    
    <h2>Workplace Diversity</h2>
    <p>Diversity and inclusion remain significant challenges in many industries. Creating more inclusive workplaces can lead to better decision-making and improved company performance.</p>
    
    <h2>Conclusion</h2>
    <p>Addressing these challenges requires a collaborative effort from employers, educators, and policymakers to create a more inclusive and dynamic job market.</p>`
  },
  {
    id: 3,
    title: "Eliminate Your Fear And Pick Up Job Today",
    slug: "eliminate-your-fear-and-pick-up-job-today",
    date: "February 10, 2020",
    category: "Inspiration",
    image: blog3,
    excerpt: "Overcome your job search fears and take the first step toward your dream career with these practical tips.",
    content: `<h2>Introduction</h2>
    <p>Job searching can be daunting, but fear shouldn't hold you back. In this article, we'll explore ways to overcome common job search fears and take control of your career.</p>
    
    <h2>Identify Your Fears</h2>
    <p>The first step to overcoming fear is identifying what you're afraid of. Common fears include rejection, not being good enough, or making the wrong career choice.</p>
    
    <h2>Build Confidence</h2>
    <p>Focus on your strengths and achievements. Create a list of your skills and accomplishments to remind yourself of your value in the job market.</p>
    
    <h2>Take Small Steps</h2>
    <p>Break down your job search into smaller, more manageable steps. This approach can make the process feel less overwhelming and help you build momentum.</p>
    
    <h2>Conclusion</h2>
    <p>Remember that fear is a natural part of the job search process. By facing your fears head-on and taking consistent action, you can achieve your career goals.</p>`
  },
];

export default function BlogSection() {
  return (
    <section className="bg-gray-50 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Blog Post</h2>
            <p className="text-gray-500">Featured blog posts</p>
          </div>
          <Link href="/blogs">
          <button className="flex items-center gap-2 cursor-pointer px-5 py-2 border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 transition">
            Get Started <span className="text-xl">→</span>
          </button>
          </Link>
        </div>

        {/* Blog Cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Link key={blog.id} href={`/blogs/${blog.slug}`}>
              <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col">
                <Image
                  src={blog.image}
                  alt={blog.title}
                  width={800}
                  height={500}
                  className="w-full h-52 object-cover"
                />
                <div className="p-5 flex flex-col flex-grow">
                  <p className="text-sm text-gray-500 mb-2">
                    {blog.date} <span className="mx-2">|</span> {blog.category}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {blog.title}
                  </h3>
                  <p className="text-gray-600 mb-4 flex-grow">
                    {blog.excerpt}
                  </p>
                  <div className="mt-auto">
                    <span className="inline-block px-4 py-2 bg-black text-white rounded-md cursor-pointer hover:bg-gray-800">
                      Read More
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
