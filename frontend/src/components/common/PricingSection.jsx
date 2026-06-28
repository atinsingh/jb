"use client";
import { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PricingSection() {
  const [isMonthToMonth, setIsMonthToMonth] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  const plans = [
    {
      name: "Basic",
      tagline: "The best way to start your journey",
      priceMonthly: "Free",
      priceYearly: "Free",
      buttonText: "Start for Free",
      features: [
        "AI-based resume builder",
        "Free difference analysis",
        "Free access to resume builder",
        "Create resume by following instructions",
        "Purchase of Course of Guided Sessions",
      ],
    },
    {
      name: "Standard",
      tagline: "The best way to optimize your career",
      priceMonthly: "$15",
      priceYearly: "$150",
      buttonText: "Get Started",
      tag: "Most Popular",
      features: [
        "AI-based resume builder",
        "Free difference analysis",
        "AI-based resume builder for your career",
        "Create resume by following instructions",
        "Access to interview simulators",
      ],
    },
    {
      name: "Premium",
      tagline: "The best way to accelerate your career",
      priceMonthly: "$24",
      priceYearly: "$240",
      buttonText: "Get Started",
      features: [
        "AI-based resume builder",
        "Automated deadline",
        "Free difference analysis",
        "Talent integration",
        "Career support",
        "Best-suited benefits",
      ],
    },
  ];

  const getPrice = (plan) => {
    if (!user) return "$$$";
    return isMonthToMonth ? plan.priceMonthly : plan.priceYearly;
  };

  return (
    <section className="w-full py-20 bg-gray-50">
      <div className="text-center mb-12 px-4">
        <h4 className="text-sm font-semibold text-gray-500 mb-2">
          Choose your plan
        </h4>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          Flexible Pricing For Every Career Journey
        </h2>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-3 mt-4">
          <span
            className={
              !isMonthToMonth ? "text-gray-800 font-medium" : "text-gray-400"
            }
          >
            Billed Yearly
          </span>
          <button
            onClick={() => setIsMonthToMonth(!isMonthToMonth)}
            className="relative w-16 h-8 flex items-center bg-gray-300 cursor-pointer rounded-full transition-all duration-300"
          >
            <span
              className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${isMonthToMonth ? "translate-x-8 bg-orange-500" : ""
                }`}
            ></span>
          </button>
          <span
            className={
              isMonthToMonth ? "text-orange-600 font-medium" : "text-gray-400"
            }
          >
            Month-to-Month
          </span>
          <span
            className={
              isMonthToMonth ? "text-gray-800 font-medium" : "text-gray-400"
            }
          >
            Billed Monthly
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {plans.map((plan, index) => (
          <div
            key={index}
            data-aos="fade-up"
            data-aos-delay={index * 100}
            className={`relative flex flex-col justify-between rounded-3xl p-8 shadow-lg border transition-all duration-300 hover:scale-105 ${plan.tag
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl border-transparent"
                : "bg-white border-gray-200 hover:shadow-xl"
              }`}
          >
            {plan.tag && (
              <span className="absolute top-4 right-4 text-xs bg-white text-orange-600 px-3 py-1 rounded-full font-semibold shadow-md">
                + {plan.tag}
              </span>
            )}

            <div>
              <h3
                className={`text-xl font-bold mb-2 ${plan.tag ? "text-white" : "text-gray-900"
                  }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-5xl font-bold mb-2 ${plan.tag ? "text-white" : "text-gray-900"
                  }`}
              >
                {getPrice(plan)}
                {user && plan.priceMonthly !== "Free" && (
                  <span className="text-lg font-normal">{isMonthToMonth ? "/month" : "/year"}</span>
                )}
              </p>
              <p
                className={`text-sm mb-6 ${plan.tag ? "text-white/90" : "text-gray-600"
                  }`}
              >
                {plan.tagline}
              </p>
              <Link href={user ? "/signup" : "/signup"}>
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all cursor-pointer ${plan.tag
                      ? "bg-white text-orange-600 hover:bg-gray-100"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                    }`}
                >
                  {user ? plan.buttonText : "Sign Up to view pricing"}
                </button>
              </Link>
              <hr
                className={`my-6 ${plan.tag ? "border-white/40" : "border-gray-200"
                  }`}
              />

              <h4
                className={`text-sm font-semibold mb-4 ${plan.tag ? "text-white" : "text-gray-700"
                  }`}
              >
                Main Features
              </h4>
              <ul className="space-y-3 text-sm">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className={`text-lg ${plan.tag ? "text-white" : "text-green-500"
                        }`}
                    >
                      ✓
                    </span>
                    <span className={plan.tag ? "text-white" : "text-gray-700"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
