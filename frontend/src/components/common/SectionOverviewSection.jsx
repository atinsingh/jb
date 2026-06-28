"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiCheckCircle, FiZap, FiTrendingUp, FiAward, FiUsers } from "react-icons/fi";

/* =========================
   Trending Career Roles
========================= */
const careerRoles = [
  {
    name: "AI Content Strategist",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/9ae01db3adcfa81edc29bdd2c94749a33e2589d1?width=64",
    color: "#4F46E5",
    description: "Craft compelling content strategies powered by AI insights",
  },
  {
    name: "Prompt Engineer",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/17e68a1a775685d3a305713a5f8e04cf62e01552?width=64",
    color: "#10B981",
    description: "Master the art of AI communication and prompt design",
  },
  {
    name: "Automation Expert",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/8c22684971983ff2c5c1ab496bc5484eda93ecd6?width=64",
    color: "#F59E0B",
    description: "Streamline workflows with intelligent automation solutions",
  },
  {
    name: "AI Product Manager",
    image:
      "https://api.builder.io/api/v1/image/assets/TEMP/8c22684971983ff2c5c1ab496bc5484eda93ecd6?width=64",
    color: "#8B5CF6",
    description: "Lead AI product development and strategy",
  },
];

/* =========================
   Quick Stats
========================= */
const stats = [
  { value: "10,000+", label: "Jobs Matched" },
  { value: "95%", label: "Success Rate" },
  { value: "24/7", label: "AI Support" },
  { value: "50+", label: "Industries Served" },
];

/* =========================
   Feature Highlights
========================= */
const features = [
  {
    icon: <FiZap className="w-6 h-6" />,
    title: "Lightning Fast",
    description: "Get matched with your dream job in seconds",
  },
  {
    icon: <FiTrendingUp className="w-6 h-6" />,
    title: "Smart Growth",
    description: "AI-powered career path recommendations",
  },
  {
    icon: <FiAward className="w-6 h-6" />,
    title: "Proven Success",
    description: "Trusted by professionals worldwide",
  },
  {
    icon: <FiUsers className="w-6 h-6" />,
    title: "Community",
    description: "Join a network of like-minded professionals",
  },
];

/* =========================
   Animation Variants
========================= */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } };

/* =========================
   MAIN SECTION COMPONENT
========================= */
export default function SectionOverviewSection() {
  const router = useRouter();
  return (
    <section className="relative bg-black text-white py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      {/* ========= Animated Background ========= */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-black via-[#0b0b0b] to-black"
        initial="hidden"
        animate="show"
        variants={fadeIn}
      />
      <motion.div
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-blue-500/20 blur-[200px] rounded-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ========= Header Section ========= */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
          >
            <span className="text-orange-400 text-sm font-medium">
              🚀 NEXT GENERATION JOB SEARCH
            </span>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            The{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              AI-Powered
            </span>{" "}
            Career <br className="hidden md:block" />
            Platform You've Been <span className="text-orange-400">Waiting For</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Transform your job search with our cutting-edge AI technology that
            understands your career goals and matches you with perfect opportunities.
          </p>
        </motion.div>

        {/* ========= Stats Section ========= */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl border border-gray-800 shadow-lg"
              variants={item}
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div className="text-3xl font-bold text-orange-400 mb-2">{stat.value}</div>
              <div className="text-gray-300">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ========= Why Choose Us Section ========= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* ---- Left Side (Text + Features) ---- */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">Why Choose Our Platform?</h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              We go beyond traditional job boards — understanding your skills
              and goals to deliver smart, real opportunities that fit you best.
            </p>

            {/* Feature List */}
            <div className="space-y-4 mb-8">
              {[
                "AI-powered job matching",
                "Personalized career coaching",
                "Resume optimization",
                "Interview preparation",
                "Salary negotiation tools",
                "Company culture insights",
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <FiCheckCircle className="text-green-400 w-5 h-5 flex-shrink-0" />
                  <span className="text-gray-200">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/promo")}
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          </motion.div>

          {/* ---- Right Side (Features + Roles) ---- */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Feature Cards */}
            <div className="relative z-10 bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl border border-gray-800 shadow-2xl">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {features.map((feature, i) => (
                  <motion.div
                    key={i}
                    className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50"
                    whileHover={{ y: -5, backgroundColor: "rgba(55, 65, 81, 0.5)" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-orange-400 mb-2">{feature.icon}</div>
                    <h4 className="font-medium text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-300">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              {/* Trending Roles */}
              <div className="relative overflow-hidden rounded-2xl bg-gray-900/50 p-6 border border-gray-800">
                <h3 className="text-lg font-medium text-white mb-4">Trending Roles</h3>
                <div className="space-y-3">
                  {careerRoles.map((role, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer group"
                      whileHover={{ x: 5 }}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        <img
                          src={role.image}
                          alt={role.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{role.name}</h4>
                        <p className="text-sm text-gray-400">{role.description}</p>
                      </div>
                      <FiArrowRight className="ml-auto text-gray-500 group-hover:text-orange-400 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ========= Testimonial Section ========= */}
        <motion.div
          className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 relative overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="text-orange-400 text-5xl mb-6">"</div>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              This platform completely transformed my job search. The AI matching is
              incredibly accurate, and I landed my dream job at a top tech company
              within two weeks of signing up. The career coaching was the cherry on top!
            </p>
            <div className="flex items-center justify-center gap-4">
              <img
                src="https://randomuser.me/api/portraits/women/32.jpg"
                alt="Sarah Johnson"
                className="w-12 h-12 rounded-full border-2 border-orange-400"
              />
              <div className="text-left">
                <h4 className="font-medium text-white">Sarah Johnson</h4>
                <p className="text-orange-300">Senior Product Designer @ TechCorp</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ========= Floating Decorative Elements ========= */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-4 h-4 bg-orange-400 rounded-full"
        animate={{ y: [0, -20, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-purple-400 rounded-full"
        animate={{ y: [0, 20, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", delay: 1 }}
      />
    </section>
  );
}
