import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { motion } from 'framer-motion';

export default function Sitemap() {
  const sitemapSections = [
    // Every href below resolves to a real file under src/pages. The previous
    // list advertised /#features, /#how-it-works, /help and the retired
    // /candidate/* tree — a sitemap of dead links is worse than no sitemap.
    {
      title: 'Main Pages',
      links: [
        { name: 'Home', href: '/' },
        { name: 'Find Jobs', href: '/jobs' },
        { name: 'For Employers', href: '/employers' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'About Us', href: '/about' },
        { name: 'Contact', href: '/contact' },
      ]
    },
    {
      title: 'Product Features',
      links: [
        { name: 'Job Matching', href: '/features/job-matching' },
        { name: 'Auto-Apply', href: '/features/auto-apply' },
        { name: 'Resume Builder', href: '/features/resume-builder' },
        { name: 'Cover Letters', href: '/features/cover-letters' },
        { name: 'Interview Prep', href: '/features/interview-prep' },
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', href: '/blog' },
        { name: 'Customer Stories', href: '/customers' },
        { name: 'Book a Demo', href: '/demo' },
        { name: 'Enterprise', href: '/enterprise' },
        { name: 'Security', href: '/security' },
      ]
    },
    {
      title: 'Account',
      links: [
        { name: 'Log In', href: '/app/login' },
        { name: 'Sign Up', href: '/app/signup' },
        { name: 'Candidate Dashboard', href: '/app/dashboard' },
        { name: 'Employer Dashboard', href: '/employer/dashboard' },
      ]
    },
    {
      title: 'Legal & Support',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'GDPR Compliance', href: '/gdpr' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Sitemap - Jobocate</title>
        <meta name="description" content="Navigate all pages and features of Jobocate's AI-powered job search platform." />
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
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Navigation</span>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mt-4 mb-4">
                Sitemap
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Find your way around Jobocate. Browse all our pages and features organized by category.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sitemap Grid */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {sitemapSections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-200">
                    {section.title}
                  </h2>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <Link 
                          href={link.href}
                          className="text-gray-600 hover:text-primary-600 transition-colors duration-200 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 text-center"
            >
              <p className="text-gray-500 mb-6">Can't find what you're looking for?</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold rounded-full transition-all duration-300"
              >
                Contact Us
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
