/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  }
};

module.exports = nextConfig;