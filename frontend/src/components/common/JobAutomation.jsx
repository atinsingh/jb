"use client";
import React, { useEffect } from "react";
import { DocumentTextIcon, ClockIcon, BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function JobAutomation() {
  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  return (
    <section className="bg-white py-16 lg:py-20 px-6 lg:px-20 text-center">
      {/* ================================
          SECTION HEADING
      ================================= */}
      <div className="max-w-7xl mx-auto mb-12" data-aos="fade-up">
        <p className="text-base text-gray-600 font-medium">
          Smarter Way to Job Hunt
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
          Job Hunting, Automated <br /> — Because Your Time Matters
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mt-4 text-base md:text-lg">
          Let our AI handle the heavy lifting — from understanding your profile 
          to shortlisting roles, applying automatically, and keeping you updated in real time.
        </p>
      </div>

      {/* ================================
          FEATURE CARDS
      ================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-7xl mx-auto">
        {/* Card 1 - Profile Setup */}
        <div className="text-center md:text-left" data-aos="fade-right">
          <DocumentTextIcon className="h-10 w-10 text-gray-800 mx-auto md:mx-0" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            1. Know You Better
          </h3>
          <p className="mt-2 text-gray-600 text-base leading-relaxed border-t pt-4">
            Our AI creates a dynamic professional profile based on your skills, 
            experience, and career goals. It highlights your strengths and aligns them 
            with top industry requirements, ensuring every match fits you — not just keywords.
          </p>
        </div>

        {/* Card 2 - Smart Search */}
        <div className="text-center md:text-left" data-aos="fade-up" data-aos-delay={200}>
          <ClockIcon className="h-10 w-10 text-gray-800 mx-auto md:mx-0" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            2. Smart Job Match
          </h3>
          <p className="mt-2 text-gray-600 text-base leading-relaxed border-t pt-4">
            We eliminate the noise. Our system curates a personalized queue of 
            job openings that match your profile. No more scrolling endlessly — 
            just approve or skip roles, saving 10+ hours each week.
          </p>
        </div>

        {/* Card 3 - Auto Apply */}
        <div className="text-center md:text-left" data-aos="fade-left" data-aos-delay={400}>
          <BellIcon className="h-10 w-10 text-gray-800 mx-auto md:mx-0" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            3. Auto Apply & Alert
          </h3>
          <p className="mt-2 text-gray-600 text-base leading-relaxed border-t pt-4">
            Once approved, we auto-apply with tailored resumes and cover letters.
            You’ll get real-time notifications when applications are submitted, 
            viewed, or when interviews are scheduled — so you never miss an opportunity.
          </p>
        </div>
      </div>

      {/* ================================
          CTA BUTTON
      ================================= */}
      <div className="mt-12" data-aos="zoom-in" data-aos-delay={600}>
        {/* <Link href="/jobs"> */}
          <button className="px-8 py-3 bg-black text-white font-medium rounded-full shadow-sm hover:bg-gray-900 transition">
            Get Started →
          </button>
        {/* </Link> */}
      </div>
    </section>
  );
}
