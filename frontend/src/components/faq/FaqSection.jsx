"use client";

import React, { useState, useEffect } from "react";
import faqImage from "@/assets/home/faqImage.png";
import Image from "next/image";
import AOS from "aos";
import "aos/dist/aos.css";

const faqs = [
  {
    question: "How does Jobocate’s auto-apply system work?",
    answer:
      "Once you approve your curated job queue, our AI + human team applies to roles on your behalf with tailored resumes — saving hours of manual work.",
  },
  {
    question: "Can I review jobs before they’re applied to?",
    answer:
      "Yes! You’re always in control. Every matched role is queued for your approval before any application is submitted.",
  },
  {
    question: "How fast will my applications go out?",
    answer:
      "Applications are typically submitted within 24 hours of approval. Platinum plan users get priority processing within the same day.",
  },
  {
    question: "Will my data be safe with Jobocate?",
    answer:
      "Absolutely. We follow strict security standards and are PIPEDA/GDPR ready — your personal data is encrypted and never shared without consent.",
  },
  {
    question: "Can Jobocate guarantee interviews?",
    answer:
      "While no one can guarantee interviews, our curated queue + resume tailoring + high-volume apply strategy significantly boosts your chances.",
  },
  {
    question: "Can I cancel or switch plans anytime?",
    answer:
      "Yes, you can upgrade, downgrade, or cancel your subscription anytime — no hidden fees or long-term contracts.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="px-8 lg:px-16 py-16 max-w-7xl 2xl:container mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* FAQ Content */}
        <div data-aos="fade-right">
          <p className="text-sm text-gray-500 uppercase mb-2 tracking-wide">
            F.A.Q
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 leading-snug text-gray-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-5">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b pb-4 transition-colors duration-200 hover:border-gray-400"
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="text-gray-800 font-medium text-base">
                    {faq.question}
                  </span>
                  <span className="text-xl font-bold text-orange-500">
                    {openIndex === index ? "−" : "+"}
                  </span>
                </div>

                {openIndex === index && (
                  <p className="mt-3 text-gray-600 text-base leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Illustration */}
        <div className="flex justify-center" data-aos="fade-left">
          <Image
            src={faqImage}
            alt="FAQ Illustration"
            className="w-140"
            width={500}
            height={500}
            priority
          />
        </div>
      </div>
    </section>
  );
}
