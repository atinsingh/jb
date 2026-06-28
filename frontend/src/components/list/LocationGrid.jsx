"use client";
import Image from "next/image";
import location1 from "@/assets/job/location1.png"
import location2 from "@/assets/job/location2.png"
import location3 from "@/assets/job/location3.png"
import location4 from "@/assets/job/location4.png"

const locations = [
  {
    id: 1,
    name: "Seattle, WA",
    image:
      location1,
  },
  {
    id: 2,
    name: "Remote",
    image:
      location2,
  },
  {
    id: 3,
    name: "Stockholm, SE",
    image:
      location3,
  },
  {
    id: 4,
    name: "San Francisco, CA",
    image:
      location4,
  },
];

export default function LocationGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">
        Select by Location
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
          >
            {/* Background Image */}
            <Image
              src={loc.image}
              alt={loc.name}
              width={400}
              height={250}
              className="w-full h-48 object-cover group-hover:scale-105 transition duration-500"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            {/* Text */}
            <p className="absolute bottom-3 left-3 text-white font-semibold text-lg">
              {loc.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
