import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { motion } from 'framer-motion';

export default function GDPR() {
  const rights = [
    {
      title: 'Right to Access',
      description: 'You have the right to request copies of your personal data. We may charge a small fee for this service.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      title: 'Right to Rectification',
      description: 'You have the right to request that we correct any information you believe is inaccurate or incomplete.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: 'Right to Erasure',
      description: 'You have the right to request that we erase your personal data, under certain conditions.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    {
      title: 'Right to Restrict Processing',
      description: 'You have the right to request that we restrict the processing of your personal data, under certain conditions.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    },
    {
      title: 'Right to Data Portability',
      description: 'You have the right to request that we transfer your data to another organization, or directly to you.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      title: 'Right to Object',
      description: 'You have the right to object to our processing of your personal data, under certain conditions.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>GDPR Compliance - Jobocate</title>
        <meta name="description" content="Learn about Jobocate's GDPR compliance and your data protection rights." />
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
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Data Protection</span>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-4">
                GDPR Compliance
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We are committed to protecting your personal data and ensuring compliance with the General Data Protection Regulation (GDPR).
              </p>
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
              <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment</h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Jobocate is fully committed to protecting the privacy and security of your personal information. We comply with the General Data Protection Regulation (GDPR) and implement robust measures to ensure your data is handled responsibly and transparently.
                </p>
              </div>

              {/* Rights Grid */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Rights Under GDPR</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {rights.map((right, index) => (
                    <motion.div
                      key={right.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-6 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary-100 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 flex items-center justify-center text-primary-500 mb-4">
                        {right.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{right.title}</h3>
                      <p className="text-gray-600 text-sm">{right.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Controller</h2>
                  <p className="text-gray-600 leading-relaxed">
                    Jobocate Inc. is the data controller responsible for your personal data. We determine the purposes and means of processing your personal data in accordance with GDPR requirements.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Basis for Processing</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    We process your personal data based on the following legal grounds:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong className="text-gray-900">Consent:</strong> When you have given clear consent for us to process your personal data</li>
                    <li><strong className="text-gray-900">Contract:</strong> When processing is necessary for the performance of our services</li>
                    <li><strong className="text-gray-900">Legal obligation:</strong> When we need to comply with the law</li>
                    <li><strong className="text-gray-900">Legitimate interests:</strong> When processing is necessary for our legitimate interests</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Transfers</h2>
                  <p className="text-gray-600 leading-relaxed">
                    When we transfer your data outside the European Economic Area, we ensure that appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.
                  </p>
                </div>
              </div>

              <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Exercise Your Rights</h2>
                <p className="text-gray-600 mb-4">
                  To exercise any of your GDPR rights or if you have questions about how we handle your data, please contact our Data Protection Officer:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>Email: <a href="mailto:dpo@jobocate.com" className="text-primary-600 hover:text-primary-700">dpo@jobocate.com</a></li>
                  <li>Address: 123 Innovation Drive, San Francisco, CA 94107</li>
                </ul>
                <p className="text-gray-500 text-sm mt-4">
                  We will respond to all legitimate requests within one month.
                </p>
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
