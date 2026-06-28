import Head from 'next/head';
import PropTypes from 'prop-types';

const SEO = ({ 
  title = 'JobOcate - Find Your Dream Job with AI-Powered Job Search',
  description = 'Discover your next career opportunity with JobOcate. AI-powered job search platform connecting talented professionals with top companies.',
  keywords = 'job search, careers, employment, jobs, hiring, job portal, AI jobs, tech jobs',
  url = 'https://www.jobocate.com/',
  ogImage = 'https://res.cloudinary.com/dkyp14kzf/image/upload/v1761322676/favicon_vg5qij.png',
  noIndex = false
}) => {
  return (
    <Head>
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/favicon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      
      {/* Theme Color for Mobile Browsers */}
      <meta name="theme-color" content="#ffffff" />
      
      {/* Viewport for responsive design */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* No Index */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Head>
  );
};

SEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.string,
  url: PropTypes.string,
  ogImage: PropTypes.string,
  noIndex: PropTypes.bool
};

export default SEO;
