"use client";
import React, { useEffect } from "react";
import mobile from "@/assets/home/mobile.png";
import Image from "next/image";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function WhyUs() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <section className="px-8 py-20 max-w-7xl 2xl:container mx-auto">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        {/* Left Side - Phone Mockup */}
        <div data-aos="fade-right" className="flex justify-center">
          <Image
            src={mobile}
            alt="Job Automation App Preview"
            className="w-[320px] h-auto md:w-[400px] drop-shadow-2xl"
            width={500}
            height={500}
            priority
          />
        </div>

        {/* Right Side - Text Content */}
        <div data-aos="fade-left">
          {/* Top Tag */}
          <p className="text-sm text-gray-600 uppercase tracking-wider font-semibold mb-2">
            Why Choose Us
          </p>

          {/* Heading */}
          <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-snug text-gray-900">
            We Work Nonstop Until <br /> You Land the Job 🚀
          </h2>

          {/* Intro Description */}
          <p className="text-gray-600 mb-6 text-base leading-relaxed">
            We combine automation, intelligent job curation, and expert support to give you the edge in today’s competitive job market.
            Whether you’re a fresher or an experienced professional, we make your job hunt smarter, faster, and easier.
          </p>

          {/* Feature List */}
          <ul className="space-y-3 mb-8 text-gray-700 text-base">
            <li className="flex items-start gap-2">
              <span className="text-gray-600 text-lg">✔</span>
              <span>Automate your job search with AI-powered matching</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 text-lg">✔</span>
              <span>Wake up to your best daily job matches — no endless scrolling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 text-lg">✔</span>
              <span>Apply 10x faster and track your progress effortlessly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 text-lg">✔</span>
              <span>Reclaim valuable hours every week with smart automation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 text-lg">✔</span>
              <span>Exclusive job alerts and personalized career tips</span>
            </li>
          </ul>

          {/* CTA Button */}
          <Link href="/promo">
            <button className="flex cursor-pointer items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full font-semibold shadow-md hover:bg-gray-700 transition duration-300">
              Get Started <span className="text-xl">→</span>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
