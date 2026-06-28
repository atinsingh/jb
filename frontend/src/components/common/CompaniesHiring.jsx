"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import AOS from "aos";
import "aos/dist/aos.css";

import companyone from "@/assets/home/companyone.png";
import companytwo from "@/assets/home/companytwo.png";
import companythree from "@/assets/home/companythree.png";
import companyfour from "@/assets/home/companyfour.png";
import companyfive from "@/assets/home/companyfive.png";

const companies = [
  { name: "Hitech", logo: companyone },
  { name: "Sitemark", logo: companytwo },
  { name: "Volume", logo: companythree },
  { name: "Iceberg", logo: companyfour },
  { name: "Vision", logo: companyfive },
];

export default function CompaniesHiring() {
  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true, // animation runs only once
    });
  }, []);

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl 2xl:container mx-auto text-center px-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-10" data-aos="fade-up">
          Top Companies Hiring
        </h2>

        <div className="flex flex-wrap justify-center items-center gap-10 opacity-60">
          {companies.map((company, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              data-aos="fade-up"
              data-aos-delay={index * 100} // stagger effect
            >
              <Image
                src={company.logo}
                alt={company.name}
                className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
