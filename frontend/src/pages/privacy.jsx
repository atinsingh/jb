import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { motion } from 'framer-motion';

export default function Privacy() {
  const sections = [
    {
      title: 'Information We Collect',
      content: `We collect information you provide directly, including your name, email address, resume, work history, and job preferences. We also collect usage data such as how you interact with our platform, pages visited, and features used. Device information like IP address, browser type, and operating system may also be collected for security and optimization purposes.`
    },
    {
      title: 'How We Use Your Information',
      content: `Your information is used to provide and improve our services, match you with relevant job opportunities, submit job applications on your behalf, and communicate with you about your account and our services. We use AI and machine learning to analyze your profile and optimize your job search experience.`
    },
    {
      title: 'Data Sharing',
      content: `We only share your information when you authorize us to apply to jobs on your behalf. We do not sell your personal data to third parties. We may share anonymized, aggregated data for research and analytics purposes. Service providers who assist in operating our platform may access data under strict confidentiality agreements.`
    },
    {
      title: 'Data Security',
      content: `We implement industry-standard security measures including encryption, secure servers, and regular security audits. Your data is stored in secure cloud infrastructure with redundant backups. We use SSL/TLS encryption for all data transmission and employ strict access controls for our team.`
    },
    {
      title: 'Your Rights',
      content: `You have the right to access, correct, or delete your personal data at any time. You can export your data in a portable format or request complete account deletion. We respond to all data requests within 30 days as required by GDPR and similar regulations.`
    },
    {
      title: 'Data Retention',
      content: `We retain your data for as long as your account is active or as needed to provide services. Deleted accounts are permanently removed within 30 days. We may retain anonymized data for analytics and improvement purposes.`
    },
    {
      title: 'Third-Party Services',
      content: `We integrate with job boards, company career pages, and other services to provide our platform. These third parties have their own privacy policies. We carefully vet partners and require them to meet our privacy standards.`
    },
    {
      title: 'Changes to This Policy',
      content: `We may update this privacy policy from time to time. We will notify you of any material changes via email or through our platform. Continued use of our services after changes constitutes acceptance of the updated policy.`
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Privacy Policy - Jobocate</title>
        <meta name="description" content="Learn how Jobocate protects your privacy and handles your personal data." />
      </Head>

      <PublicLayout>
        {/* Hero Section */}
        <section className="relative pt-16 pb-16 overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px]" />
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
                Privacy Policy
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
                  At Jobocate, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our AI-powered job search platform.
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy or your data, please contact us:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>Email: <a href="mailto:privacy@jobocate.com" className="text-primary-600 hover:text-primary-700">privacy@jobocate.com</a></li>
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
