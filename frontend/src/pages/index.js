'use client';

import Head from 'next/head';
import PublicLayout from '@/components/layout/PublicLayout';
import HomeV3 from '@/components/home/v3/HomeV3';

/**
 * Jobocate public homepage - Candidate v3 direction.
 *
 * Rebuilt against the approved "Jobocate Candidate v3" design bundle
 * (artboard "Marketing home"). The page stays on the shared PublicLayout, so
 * the header here is byte-for-byte the header on /jobs.
 *
 * Structured data is deliberately minimal — Organization only. No
 * AggregateRating / JobPosting / review markup: there is no verified rating
 * data behind this page and asserting it would be a fabricated claim.
 */

const SITE_URL = 'https://jobocate.com';
const OG_IMAGE = `${SITE_URL}/jobocate-logo.png`;
const SEO_TITLE = 'Jobocate — AI Job Search from Apply to Offer';
const SEO_DESC =
  "The AI job-search platform that matches you to roles you're eligible for, tailors every application from your real experience, and applies only when you approve. Free to start.";

// Honest structured data only: Organization + WebSite. No AggregateRating /
// JobPosting / review markup — there is no verified rating data behind this
// page and asserting it would be a fabricated claim.
const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Jobocate',
    url: SITE_URL,
    logo: OG_IMAGE,
    description:
      'AI job-search and hiring platform. Candidates get matched to eligible roles and control every application; employers post jobs and meet ranked candidates.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Jobocate',
    url: SITE_URL,
  },
];

export default function JobocateHome() {
  return (
    <>
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESC} />
        <meta
          name="keywords"
          content="AI job search, job matching, auto apply jobs, tailored job applications, AI cover letter generator, job application tracker, apply to jobs, hiring platform"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:site_name" content="Jobocate" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:alt" content="Jobocate — AI job search from apply to offer" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
        />
      </Head>

      <PublicLayout surface="v3">
        {/* .jb carries the shared focus-visible ring; .jbv3 scopes the
            Candidate v3 token block in styles/tokens.css. */}
        <div className="jb jbv3">
          <HomeV3 />
        </div>
      </PublicLayout>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </>
  );
}
