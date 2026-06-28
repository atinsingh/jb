"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import jobhunt1 from "@/assets/home/Jobhunt1.png";
import jobhunt2 from "@/assets/home/Jobhunt2.png";
import AOS from "aos";
import "aos/dist/aos.css";
import Link from "next/link";

const cards = [
  {
    id: 1,
    subtitle: "We find jobs for you",
    title: (
      <>
        The best talent pool on <br /> the job market
      </>
    ),
    description:
      "Our AI matches the most suitable candidates with the right opportunities, saving time for both employers and job seekers.",
    button: "Hire Talents",
    image: jobhunt1,
  },
  {
    id: 2,
    subtitle: "We apply for you",
    title: (
      <>
        The best job updates <br /> from companies hiring
      </>
    ),
    description:
      "Never miss an opportunity — we apply to your dream jobs instantly and keep you updated in real-time.",
    button: "View Roles",
    image: jobhunt2,
  },
];

export default function TalentJobs() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <section className="bg-black py-24 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {cards.map((card, index) => (
          <div
            key={card.id}
            data-aos="fade-up"
            data-aos-delay={index * 100}
            className="relative flex flex-col justify-between bg-[#1A1A1A] rounded-3xl p-10 text-white overflow-hidden min-h-[560px] shadow-lg hover:shadow-2xl transition-shadow duration-300"
          >
            {/* Top Text Content */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400">{card.subtitle}</p>
              <h3 className="text-2xl md:text-3xl font-bold mt-2 leading-snug">
                {card.title}
              </h3>
              <p className="text-gray-300 mt-3 text-sm md:text-base">{card.description}</p>
              <div className="mt-6 flex justify-center md:justify-start">
               
                <Link href="/promo">
                <button className="px-6 py-3 cursor-pointer border border-gray-600 rounded-full hover:bg-white hover:text-black transition duration-300 font-medium">
                  {card.button}
                </button>
                </Link>
              </div>
            </div>

            {/* Bottom Image */}
            <div className="mt-10 w-full overflow-hidden rounded-b-3xl">
              <Image
                src={card.image}
                alt="Job Illustration"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
