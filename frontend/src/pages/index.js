import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';

// Feature data
const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'AI Resume Builder',
    description: 'Create ATS-optimized resumes that pass automated screening systems. Our AI tailors your resume for each application.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Smart Job Matching',
    description: 'Our AI scans thousands of jobs daily to find roles that match your skills, experience, and preferences.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Auto-Apply',
    description: 'Automatically apply to verified jobs on company career pages. We submit applications on your behalf, saving you hours.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Cover Letter Generator',
    description: 'Generate personalized, compelling cover letters for each application with a single click.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Application Tracker',
    description: 'Track all your applications in one dashboard. See status updates, deadlines, and interview schedules at a glance.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Interview Prep',
    description: 'Practice with AI-powered mock interviews. Get feedback on your answers and improve your interview skills.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Upload Your Resume',
    description: 'Our AI analyzes your experience, skills, and career goals to build your professional profile.',
  },
  {
    step: '02',
    title: 'Set Preferences',
    description: 'Tell us your ideal role, salary expectations, location preferences, and work style.',
  },
  {
    step: '03',
    title: 'AI Matches Jobs',
    description: 'Our algorithm scans thousands of verified jobs daily and ranks them by fit score.',
  },
  {
    step: '04',
    title: 'Auto-Apply & Track',
    description: 'We submit tailored applications on your behalf and track every response.',
  },
];

const stats = [
  { value: '500K+', label: 'Jobs Applied' },
  { value: '85%', label: 'Interview Rate' },
  { value: '100K+', label: 'Users Hired' },
  { value: '4.9★', label: 'User Rating' },
];

const testimonials = [
  {
    quote: "I was spending 3 hours a day applying to jobs. Jobocate reduced that to 15 minutes and I got 3x more interviews.",
    name: "Sarah Chen",
    role: "Software Engineer at Google",
    avatar: "SC"
  },
  {
    quote: "The AI resume optimization got me past the ATS filters that were blocking me. Landed my dream job in 3 weeks.",
    name: "Marcus Johnson",
    role: "Product Manager at Stripe",
    avatar: "MJ"
  },
  {
    quote: "Auto-apply to verified company pages was a game changer. No more sketchy job boards—only real opportunities.",
    name: "Emily Rodriguez",
    role: "Data Scientist at Meta",
    avatar: "ER"
  },
];

const faqs = [
  {
    question: "How does auto-apply work?",
    answer: "Our system applies directly to verified company career pages on your behalf. We never apply to scam listings or third-party aggregators. You can review and approve each application before it's submitted."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We're GDPR compliant and never share your data with third parties. You maintain full control over your information and can delete your account and data at any time."
  },
  {
    question: "What makes your ATS optimization different?",
    answer: "Our AI has analyzed millions of successful job applications across industries. We optimize for both ATS parsing and human readability, ensuring your resume gets seen by recruiters."
  },
  {
    question: "Can I use Jobocate for free?",
    answer: "Yes! Our free tier includes resume building, job matching, and limited auto-apply credits each month. Premium plans unlock unlimited applications and advanced features."
  },
];

const trustedCompanies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      const dashboardPath = user.role === 'ROLE_EMPLOYER' 
        ? '/employer/dashboard' 
        : '/candidate/dashboard';
      router.push(dashboardPath);
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Jobocate | AI-Powered Job Search That Gets You Hired</title>
        <meta name="description" content="Revolutionizing the job search with AI. Auto-apply to thousands of verified jobs, optimize your resume for ATS, and land interviews 10x faster." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main>
      {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px]" />
            <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-[80px]" />
            <div className="dot-pattern absolute inset-0 opacity-50" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-50 border border-primary-100 mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-primary-600 text-sm font-medium">Join 100,000+ job seekers using AI</span>
              </motion.div>

          {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-gray-900 leading-tight mb-6"
              >
                Revolutionizing the
            <br />
                <span className="gradient-text">Job Search</span> with AI
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-3xl mx-auto text-xl md:text-2xl text-gray-600 mb-12"
              >
                Stop applying for weeks. Start interviewing in days. Our AI finds matching jobs, tailors your applications with human review for quality, and helps you land interviews 10x faster.
              </motion.p>

          {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
              >
                <button
                  onClick={handleGetStarted}
                  className="group px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold rounded-full transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    Get Started — It's Free
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
              </button>
                <Link
                  href="/#how-it-works"
                  className="px-8 py-4 bg-white border border-gray-200 text-gray-700 text-lg font-medium rounded-full hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Demo
            </Link>
              </motion.div>

              {/* Social Proof - Avatars */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex items-center justify-center gap-4 mb-16"
              >
                <div className="flex -space-x-3">
                  {['JC', 'MP', 'SK', 'AL'].map((initials, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white ${
                        i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-orange-500' : i === 2 ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                    >
                      {initials}
              </div>
            ))}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  ))}
                </div>
                <span className="text-gray-500 text-sm">Loved by 100,000+ users</span>
              </motion.div>

              {/* Dashboard Preview */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="relative max-w-5xl mx-auto"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-2xl border border-gray-200">
                  {/* Browser Chrome */}
                  <div className="h-10 bg-gray-200 flex items-center px-4 gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-4 py-1 bg-white rounded-md text-xs text-gray-500">
                        app.jobocate.com/dashboard
                </div>
              </div>
            </div>

                  {/* Dashboard Content */}
                  <div className="p-6 bg-gray-50">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-xl p-5 border border-gray-100">
                        <p className="text-gray-500 text-sm mb-1">Applications Sent</p>
                        <p className="text-3xl font-bold text-gray-900">247 <span className="text-green-500 text-sm font-medium">+12%</span></p>
                      </div>
                      <div className="bg-white rounded-xl p-5 border border-gray-100">
                        <p className="text-gray-500 text-sm mb-1">Interviews</p>
                        <p className="text-3xl font-bold text-gray-900">18 <span className="text-green-500 text-sm font-medium">+4</span></p>
                </div>
                      <div className="bg-white rounded-xl p-5 border border-gray-100">
                        <p className="text-gray-500 text-sm mb-1">Match Score</p>
                        <p className="text-3xl font-bold text-primary-500">94% <span className="text-green-500 text-sm font-medium">+2%</span></p>
                </div>
                      <div className="bg-white rounded-xl p-5 border border-gray-100">
                        <p className="text-gray-500 text-sm mb-1">Saved Jobs</p>
                        <p className="text-3xl font-bold text-primary-500">52 <span className="text-green-500 text-sm font-medium">+8</span></p>
              </div>
            </div>

                    {/* Content Placeholders */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl h-32 border border-gray-100" />
                      <div className="bg-white rounded-xl h-32 border border-gray-100" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-20 flex flex-wrap justify-center items-center gap-8"
              >
                <span className="text-sm text-gray-500">Trusted by professionals at</span>
                <div className="flex items-center gap-8">
                  {trustedCompanies.map((company) => (
                    <span key={company} className="text-lg font-semibold text-gray-400">{company}</span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-display font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section id="features" className="py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Everything You Need</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-6">
                Your Complete <span className="gradient-text">Job Search Toolkit</span>
            </h2>
              <p className="max-w-2xl mx-auto text-lg text-gray-600">
                From resume optimization to automated applications, we've built every tool you need to land your dream job faster.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 flex items-center justify-center text-primary-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Simple Process</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-6">
                How <span className="gradient-text">Jobocate</span> Works
          </h2>
              <p className="max-w-2xl mx-auto text-lg text-gray-600">
                Get started in minutes. Our AI handles the heavy lifting while you focus on preparing for interviews.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative"
                >
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-primary-200 to-transparent" />
                  )}
                  <div className="text-6xl font-display font-bold text-primary-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* Testimonials Section */}
        <section className="py-32 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Success Stories</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-6">
                Loved by <span className="gradient-text">100K+</span> Job Seekers
            </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                  ))}
                </div>
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4">
                Common Questions
              </h2>
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden bg-gray-900">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
            Ready to Land Your Dream Job?
          </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Join 100,000+ professionals who've transformed their job search with AI. Start free today—no credit card required.
              </p>
              <button
                onClick={handleGetStarted}
                className="group px-10 py-5 bg-primary-500 hover:bg-primary-600 text-white text-xl font-semibold rounded-full transition-all duration-300"
              >
                <span className="flex items-center gap-3">
                  Get Started Free
                  <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
            </button>
              <p className="mt-6 text-gray-400 text-sm">Free forever plan available • No credit card required</p>
            </motion.div>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
