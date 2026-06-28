"use client";
import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function AIJobSearchSteps() {
  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true, // animations run only once
    });
  }, []);

  return (
    <section className="bg-white py-16 lg:py-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* ---------------- Header ---------------- */}
        <div className="text-center mb-32 lg:mb-40" data-aos="fade-up">
          <p className="text-[#1D2445] font-semibold text-[17px] leading-5 mb-4">
            AI-Powered Job Search
          </p>
          <h2 className="text-[#1D2445] font-bold text-3xl sm:text-4xl lg:text-[44px] leading-tight lg:leading-[56px] max-w-3xl mx-auto capitalize">
            Land Your Next Job in 3 Simple Steps
          </h2>
        </div>

        {/* ---------------- Cards Container ---------------- */}
        <div className="relative max-w-[1150px] mx-auto">
          {/* Mobile Steps (Column Layout) */}
          <div className="flex flex-col gap-8 sm:hidden mb-12">
            {/* STEP 1 - Mobile */}
            <div 
              className="w-full max-w-[340px] mx-auto h-[420px]"
              data-aos="fade-up"
            >
              <div
                className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
                style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
              >
              {/* Step Number Badge */}
              <div className="absolute -top-12 lg:-top-14 right-6 lg:right-12 w-[90px] h-[90px] lg:w-[104px] lg:h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                <span className="text-white font-semibold text-[46px] lg:text-[53px]">1</span>
              </div>

              {/* Step Content */}
              <div className="p-4 lg:p-6">
                <div className="bg-white/5 rounded-[19px] p-5 lg:p-6 min-h-[220px]">
                  <div className="mt-8 lg:mt-12">
                    <h3 className="text-[#DDE0E4] font-medium text-[40px] lg:text-[52px] leading-tight mb-4">
                      Set Preferences
                    </h3>
                  </div>
                </div>

                <div className="mt-4 bg-white/5 rounded-[19px] p-5">
                  <p className="text-[#87909B] text-[15px] lg:text-[17px] font-semibold leading-[24px]">
                    Choose your ideal role, location, and goals.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 - Mobile */}
          <div 
            className="w-full max-w-[340px] mx-auto h-[420px] sm:hidden"
            data-aos="fade-up"
            data-aos-delay={100}
          >
            <div
              className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
              style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
            >
              {/* Step Number Badge */}
              <div className="absolute -top-12 right-6 w-[90px] h-[90px] lg:w-[104px] lg:h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                <span className="text-white font-semibold text-[46px] lg:text-[53px]">2</span>
              </div>

              {/* Step Content */}
              <div className="p-4 lg:p-6">
                <div className="bg-white/5 rounded-[19px] p-5 lg:p-6 min-h-[220px]">
                  <div className="mt-8 lg:mt-12">
                    <h3 className="text-[#DDE0E4] font-medium text-[40px] lg:text-[52px] leading-tight mb-4">
                      AI Curates
                    </h3>
                    <p className="text-[#87909B] text-[15px] lg:text-[17px] font-semibold">
                      Get a curated list of matching jobs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 - Mobile */}
          <div 
            className="w-full max-w-[340px] mx-auto h-[420px] sm:hidden"
            data-aos="fade-up"
            data-aos-delay={200}
          >
            <div
              className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
              style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
            >
              {/* Step Number Badge */}
              <div className="absolute -top-8 -right-8 w-[90px] h-[90px] lg:w-[104px] lg:h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                <span className="text-white font-semibold text-[46px] lg:text-[53px]">3</span>
              </div>

              {/* Step Content */}
              <div className="p-4 lg:p-6">
                <div className="bg-white/5 rounded-[19px] p-5 lg:p-6 min-h-[220px]">
                  <div className="mt-8 lg:mt-12">
                    <h3 className="text-[#DDE0E4] font-medium text-[40px] lg:text-[52px] leading-tight mb-4">
                      Approve & Apply
                    </h3>
                  </div>
                </div>

                <div className="mt-4 bg-white/5 rounded-[19px] p-5 flex items-center">
                  <p className="text-[#87909B] text-[15px] lg:text-[17px] font-semibold">
                    Tap “Yes” and our AI applies instantly — no forms, no hassle.
                  </p>
                </div>
              </div>
            </div>
          </div>

          </div>

          {/* ---------------- Desktop Steps (Absolute Positioning) ---------------- */}
          <div className="hidden sm:block h-[550px]">
            {/* STEP 1 - Desktop */}
            <div
              className="absolute w-full max-w-[340px] h-[495px] left-0 lg:left-[60px]"
              style={{ transform: "rotate(-8.888deg)", transformOrigin: "center" }}
              data-aos="fade-right"
            >
              <div
                className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
                style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
              >
                <div className="absolute -top-14 right-12 w-[104px] h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                  <span className="text-white font-semibold text-[53px]">1</span>
                </div>
                <div className="p-6">
                  <div className="bg-white/5 rounded-[19px] p-6 min-h-[220px]">
                    <div className="mt-12">
                      <h3 className="text-[#DDE0E4] font-medium text-[52px] leading-tight mb-4">
                        Set Preferences
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 bg-white/5 rounded-[19px] p-5">
                    <p className="text-[#87909B] text-[17px] font-semibold leading-[24px]">
                      Choose your ideal role, location, and goals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2 - Desktop */}
            <div
              className="absolute w-full max-w-[340px] h-[495px] left-1/2 top-4 transform -translate-x-1/2 rotate-[-0.888deg]"
              data-aos="fade-up"
              data-aos-delay={200}
            >
              <div
                className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
                style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
              >
                <div className="absolute -top-12 right-6 w-[104px] h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                  <span className="text-white font-semibold text-[53px]">2</span>
                </div>
                <div className="p-6">
                  <div className="bg-white/5 rounded-[19px] p-6 min-h-[220px]">
                    <div className="mt-12">
                      <h3 className="text-[#DDE0E4] font-medium text-[52px] leading-tight mb-4">
                        AI Curates
                      </h3>
                      <p className="text-[#87909B] text-[17px] font-semibold">
                        Get a curated list of matching jobs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3 - Desktop */}
            <div
              className="absolute w-full max-w-[340px] h-[495px] right-0 lg:right-[83px] top-8 rotate-[8.89deg]"
              data-aos="fade-left"
              data-aos-delay={400}
            >
              <div
                className="relative w-full h-full rounded-[28.7px] bg-[#1F2124]"
                style={{ boxShadow: "-9.568px 9.568px 0 0 rgba(0,0,0,0.35)" }}
              >
                <div className="absolute -top-12 right-6 w-[104px] h-[104px] rounded-full bg-[#0E0F0F] flex items-center justify-center">
                  <span className="text-white font-semibold text-[53px]">3</span>
                </div>
                <div className="p-6">
                  <div className="bg-white/5 rounded-[19px] p-6 min-h-[220px]">
                    <div className="mt-12">
                      <h3 className="text-[#DDE0E4] font-medium text-[52px] leading-tight mb-4">
                        Approve & Apply
                      </h3>
                      <p className="text-[#87909B] text-[17px] font-semibold">
                        Tap "Yes" and our AI applies instantly — no forms, no hassle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- Star Icon - Bottom Center ---------------- */}
          <div
            className="absolute left-1/2 bottom-[-60px] lg:bottom-[-80px] -translate-x-1/2 flex items-center justify-center hidden lg:flex"
            data-aos="zoom-in"
            data-aos-delay={600}
          >
            <div className="w-[200px] h-[200px] rounded-full bg-[#FF480E] flex items-center justify-center shadow-lg">
              <svg
                viewBox="0 0 287 287"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[120px] h-[120px] lg:w-[200px] lg:h-[200px]"
              >
                <path
                  d="M97.4179 113.213C93.9434 108.22 99.1777 101.821 104.76 104.237L127.573 114.112C130.568 115.409 134.045 114.1 135.428 111.154L145.972 88.7173C148.552 83.2261 156.728 84.5752 157.44 90.608L160.351 115.263C160.733 118.499 163.615 120.857 166.863 120.59L191.606 118.557C197.66 118.06 200.603 125.806 195.732 129.424L175.83 144.204C173.217 146.144 172.622 149.812 174.487 152.49L188.687 172.893C192.161 177.886 186.927 184.285 181.344 181.869L158.532 171.995C155.537 170.697 152.06 172.007 150.676 174.952L140.133 197.389C137.552 202.88 129.377 201.531 128.664 195.498L125.753 170.843C125.372 167.607 122.489 165.249 119.242 165.516L94.4984 167.549C88.4441 168.046 85.5016 160.3 90.3725 156.682L110.275 141.902C112.888 139.962 113.482 136.295 111.617 133.616L97.4179 113.213Z"
                  fill="#FFFFFE"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
