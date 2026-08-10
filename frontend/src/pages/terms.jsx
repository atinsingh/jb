import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { motion } from 'framer-motion';

export default function Terms() {
  const sections = [
    {
      title: 'Acceptance of Terms',
      content: `By accessing or using Jobocate's services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services. These terms apply to all users, visitors, and others who access or use our platform.`
    },
    {
      title: 'Description of Service',
      content: `Jobocate provides an AI-powered job search platform that includes resume building, job matching, automated job applications, and career tools. We submit applications to verified company career pages on your behalf based on your preferences and profile information.`
    },
    {
      title: 'User Accounts',
      content: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use of your account.`
    },
    {
      title: 'User Conduct',
      content: `You agree not to misuse our services, including but not limited to: providing false information, attempting to manipulate our systems, harassing other users or employers, violating any applicable laws, or using our platform for any purpose other than legitimate job searching.`
    },
    {
      title: 'Application Submissions',
      content: `When you enable auto-apply features, you authorize us to submit job applications on your behalf. You are responsible for ensuring your profile information is accurate and up-to-date. We apply only to verified job listings on legitimate company career pages.`
    },
    {
      title: 'Intellectual Property',
      content: `Our platform, including its content, features, and functionality, is owned by Jobocate and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express permission.`
    },
    {
      title: 'Payment Terms',
      content: `Some features require a paid subscription. Payments are processed securely through our payment providers. Subscriptions auto-renew unless cancelled. Refunds are provided within 7 days of initial purchase if you're not satisfied with our service.`
    },
    {
      title: 'Limitation of Liability',
      content: `Jobocate is not responsible for the hiring decisions of employers. We do not guarantee job offers, interviews, or specific outcomes. Our liability is limited to the amount paid for our services in the preceding 12 months.`
    },
    {
      title: 'Termination',
      content: `We may terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service ceases immediately. You may delete your account at any time through your account settings.`
    },
    {
      title: 'Changes to Terms',
      content: `We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use of our services after changes constitutes acceptance of the new terms.`
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Terms of Service - Jobocate</title>
        <meta name="description" content="Read Jobocate's Terms of Service to understand the rules and guidelines for using our platform." />
      </Head>

      <PublicLayout>
        {/* Hero Section */}
        <section className="relative pt-16 pb-16 overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px]" />
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
                Terms of Service
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
                  Welcome to Jobocate. These Terms of Service govern your use of our AI-powered job search platform. Please read them carefully before using our services.
                </p>
              </div>

              {sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 flex items-center justify-center text-primary-600 text-sm font-mono">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed pl-11">{section.content}</p>
                </motion.div>
              ))}

              <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Questions?</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>Email: <a href="mailto:legal@jobocate.com" className="text-primary-600 hover:text-primary-700">legal@jobocate.com</a></li>
                  <li>Address: 123 Innovation Drive, San Francisco, CA 94107</li>
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
                Get Started Today
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
