"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";
import contactImage from "@/assets/contact/contactImage.png";
import Image from "next/image";

export default function ContactUs() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    country: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", formData);
    alert("Message sent!");
  };

  return (
    <section className="text-black bg-[#f4f4f6] px-6 py-16 md:px-20">
      {/* Back Button */}

      <div className="max-w-7xl 2xl:container px-8 lg:px-12 mx-auto">
        {" "}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Illustration */}
          <div className="flex justify-center">
            <Image
              src={contactImage}
              alt="Illustration"
              className="w-72 md:w-96 grayscale"
              width={500}
              height={500}
            />
          </div>

          {/* Contact Form */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
              Contact Us
            </h3>
            <h2 className="text-2xl font-bold mb-6 text-black">
              Get In Touch With Us
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
              <input
                type="text"
                name="company"
                placeholder="Company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                type="text"
                name="country"
                placeholder="Country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <textarea
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 rounded-md border border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-900 transition"
              >
                Contact Us
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
