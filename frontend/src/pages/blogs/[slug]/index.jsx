import React from "react";
import { blogs } from "@/components/Blog/BlogSection";
import Image from "next/image";
import Link from "next/link";
import Layout from "@/components/layout";

export async function getStaticPaths() {
  const paths = blogs.map((blog) => ({
    params: { slug: blog.slug },
  }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  const blog = blogs.find((b) => b.slug === slug);

  if (!blog) {
    return { notFound: true };
  }

  return {
    props: { blog },
  };
}

export default function BlogPost({ blog }) {
  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404 - Blog Post Not Found</h1>
          <Link href="/blogs" className="text-orange-600">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link href="/blogs" className="inline-flex items-center text-orange-600 hover:underline mb-8">
            
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to all posts
            </Link>

          {/* Featured Image */}
          <div className="mb-8 rounded-lg overflow-hidden">
            <Image
              src={blog.image}
              alt={blog.title}
              width={1200}
              height={630}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          {/* Article */}
          <article className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{blog.date}</span>
              <span className="mx-2">•</span>
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {blog.category}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {blog.title}
            </h1>

            <div
              className="prose max-w-none prose-lg text-gray-700"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </article>

          {/* Related Posts */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              You might also like
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {blogs
                .filter((b) => b.id !== blog.id)
                .slice(0, 2)
                .map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blogs/${relatedPost.slug}`}
                    className="group">
                    
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full">
                        <Image
                          src={relatedPost.image}
                          alt={relatedPost.title}
                          width={600}
                          height={400}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-6">
                          <p className="text-sm text-gray-500 mb-2">
                            {relatedPost.date} • {relatedPost.category}
                          </p>
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-orange-600 transition mb-2">
                            {relatedPost.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {relatedPost.excerpt}
                          </p>
                          <span className="inline-flex items-center bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors">
                            Read More
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
