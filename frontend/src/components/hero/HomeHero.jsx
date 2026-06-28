import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { FiArrowRight } from "react-icons/fi";
import AOS from "aos";
import "aos/dist/aos.css";

import girl from "@/assets/home/home_girl.png";
import boy from "@/assets/home/home_boy.png";

// Features and stats data
const FEATURES = [
  "Curated job queue",
  "AI auto-apply + resume match",
  "Human QA accuracy",
  "Live tracking & insights",
];

const STATS = [
  { number: "5,000+", label: "Subscribers Target (Year 1)" },
  { number: "35%+", label: "Avg. Interview Invite Rate" },
  { number: "24 Hrs", label: "Platinum SLA Response Time" },
  { number: "50+", label: "Partner Organizations" },
];

// Component for left/right images
const ImageContainer = ({ src, alt }) => (
  <div className="relative h-[500px] w-full max-w-[400px] overflow-hidden">
    <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 0, 25vw" className="object-cover" priority />
  </div>
);

// Component for each stat with AOS animation
const StatItem = ({ number, label, delay }) => (
  <div className="p-4 text-center" data-aos="fade-up" data-aos-delay={delay}>
    <div className="text-3xl font-bold text-gray-900">{number}</div>
    <div className="text-gray-600 text-sm">{label}</div>
  </div>
);

// Component for each feature with AOS animation
const FeatureItem = ({ text, delay }) => (
  <div className="flex items-center justify-center" data-aos="fade-up" data-aos-delay={delay}>
    <FiCheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-gray-700">{text}</span>
  </div>
);

const HomeHero = () => {
  const router = useRouter();

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  const handleGetStarted = () => {
    router.push('/candidate/resume/upload');
  };

  return (
    <div className="relative py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
            AI-Powered Reach,
            <br />
            <span className="text-orange-600">Human-Smart Precision,</span>
            <br />
            10x Faster Job Applications
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Let our AI take the stress out of job searching and applications.
          </p>

          <button
            onClick={handleGetStarted}
            className="px-10 py-5 bg-orange-600 hover:bg-orange-700 text-white text-lg font-semibold rounded-full transition-all transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center gap-3"
          >
            Start Applying Now
            <FiArrowRight className="h-6 w-6" />
          </button>

          <div className="mt-16 flex justify-center items-center gap-8">
            <div className="hidden md:block">
              <Image src={girl} alt="Job seeker" width={200} height={300} className="object-contain" />
            </div>
            <div className="hidden md:block">
              <Image src={boy} alt="Professional" width={200} height={300} className="object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
    </div>
  );
};

export default HomeHero;
