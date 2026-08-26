import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { motion } from 'framer-motion';

export default function Cookies() {
  const cookieTypes = [
    {
      title: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions you take, such as logging in or filling out forms.',
      examples: ['Session management', 'Authentication', 'Security tokens'],
      required: true
    },
    {
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      examples: ['Page views', 'User behavior', 'Feature usage'],
      required: false
    },
    {
      title: 'Functional Cookies',
      description: 'These cookies enable enhanced functionality and personalization, such as remembering your preferences.',
      examples: ['Language preferences', 'Theme settings', 'Recently viewed jobs'],
      required: false
    },
    {
      title: 'Marketing Cookies',
      description: 'These cookies may be set by our advertising partners to build a profile of your interests and show you relevant ads on other sites.',
      examples: ['Advertising tracking', 'Retargeting', 'Social media integration'],
      required: false
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Cookie Policy - Jobocate</title>
        <meta name="description" content="Learn about how Jobocate uses cookies and how you can manage your preferences." />
      </Head>

      <PublicLayout surface="v3">
        {/* Hero Section */}
        <section className="relative pt-16 pb-16 overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px]" />
            <div className="dot-pattern absolute inset-0 opacity-30" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Legal</span>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-4">
                Cookie Policy
              </h1>
              <p className="text-gray-500">Last updated: December 15, 2024</p>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 mb-8">
                <p className="text-gray-600 text-lg leading-relaxed">
                  This Cookie Policy explains how Jobocate uses cookies and similar technologies to recognize you when you visit our platform. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
                </p>
              </div>

              {/* What Are Cookies */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
                <p className="text-gray-600 leading-relaxed">
                  Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
                </p>
              </div>

              {/* Cookie Types */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Types of Cookies We Use</h2>
                <div className="space-y-4">
                  {cookieTypes.map((type, index) => (
                    <motion.div
                      key={type.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-6 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{type.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${type.required ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                          {type.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {type.examples.map((example) => (
                          <span key={example} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600">
                            {example}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Managing Cookies */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  You have the right to decide whether to accept or reject cookies. You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Please note that if you choose to block all cookies, some features of our website may not function properly.
                </p>
              </div>

              <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Questions About Cookies?</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about our use of cookies, please contact us:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>Email: <a href="mailto:privacy@jobocate.com" className="text-primary-600 hover:text-primary-700">privacy@jobocate.com</a></li>
                </ul>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 text-center"
            >
              <Link
                href="/app/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold rounded-full transition-all duration-300"
              >
                Start Your Job Search
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      </PublicLayout>
    </div>
  );
}
