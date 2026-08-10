"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function CallToAction() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <section className="py-20 bg-white">
      <div
        className="max-w-7xl 2xl:container px-4 sm:px-6 lg:px-8 mx-auto text-center"
        data-aos="fade-up"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Want to Become a Success Employers?
        </h2>
        <p className="text-gray-600 mb-8">
          We'll help you to grow your career and growth.
        </p>
        <Link href="/app/signup">
          <button className="flex items-center cursor-pointer gap-2 px-6 py-3 border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 transition mx-auto">
            Get Started <span className="text-xl">→</span>
          </button>
        </Link>
      </div>
    </section>
  );
}
