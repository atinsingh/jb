"use client";

import { IoArrowBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ContactHeader() {
  const router = useRouter();

  return (
    <section className="bg-white text-black py-16 px-6 text-center">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-black hover:text-gray-600 font-medium"
        >
          <IoArrowBack className="text-lg" /> Back
        </button>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-3">Contact Us</h1>
      <p className="text-gray-600 mb-6">
        Have questions? We’re ready to help!
      </p>

      {/* Breadcrumb */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 text-sm text-gray-600">
        <Link href="/">
          <span className="font-medium cursor-pointer hover:text-black">
            Home
          </span>
        </Link>
        <span>{">"}</span>
        <span className="text-black font-semibold">Contact</span>
      </div>
    </section>
  );
}
