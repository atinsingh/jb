"use client";

import { FaBuilding } from "react-icons/fa";
import { FaTags } from "react-icons/fa";

export default function ContactCards() {
  return (
    <section className="bg-white text-black py-12 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Office Card */}
        <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-3">
            <FaBuilding className="text-xl text-black" />
            <h3 className="text-lg font-bold">Office</h3>
          </div>
          <p className="text-gray-600 mb-2">
            99 10th Drive Sunnyside, NY 11104
          </p>
          <a
            href="mailto:office@jobocate.com"
            className="text-black font-medium hover:underline"
          >
            office@jobocate.com
          </a>
        </div>

        {/* Sales Card */}
        <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-3">
            <FaTags className="text-xl text-black" />
            <h3 className="text-lg font-bold">Sales</h3>
          </div>
          <p className="text-gray-600 mb-2">
            Talk to us and see how we can work together
          </p>
          <a
            href="mailto:sales@jobocate.com"
            className="text-black font-medium hover:underline"
          >
            sales@jobocate.com
          </a>
        </div>
      </div>
    </section>
  );
}
