"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import personImg from "@/assets/home/testimonialImage.png";
import AOS from "aos";
import "aos/dist/aos.css";

export default function TestimonialSection() {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  return (
    <section className="relative w-full min-h-[50vh] md:min-h-[60vh] bg-white overflow-hidden">
      {/* Full Background Image */}
      <div className="absolute inset-0">
        <Image
          src={personImg}
          alt="Testimonial Background"
          fill
          className="object-cover md:object-contain object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white from-30% via-white/90 to-transparent md:from-white/90 md:via-white/80"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 h-full flex flex-col justify-end mt-90">
        <div 
          className="w-full pb-6 md:pb-8 lg:pb-12 px-4 sm:px-6 lg:px-8"
          data-aos="fade-up"
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left text */}
              <div className="text-center lg:text-left" data-aos="fade-right">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">
                  Empowering Companies <br className="hidden sm:block" /> to Hire Smarter.
                </h2>
              </div>

              {/* Right testimonial */}
              <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6  rounded-xl shadow-sm border border-gray-100" data-aos="fade-left">
                <svg 
                  className="w-8 h-8 text-gray-300 mb-4" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-gray-700 italic text-base sm:text-lg">
                  "Listing our open roles on Jobocate significantly streamlined our recruitment process. The platform ensures only actively hiring positions are shown, saving us countless hours."
                </p>
                <p className="mt-4 text-gray-900 font-medium text-sm sm:text-base">
                  — Priyank Sharma, Head of Talent Acquisition @ TechCorp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
