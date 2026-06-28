import React from "react";
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/advocate_logo.png';

export const Footer = () => {
  const footerLinks = {
    product: [
      { label: 'Resume Builder', href: '/candidate/resume-builder' },
      { label: 'Job Matching', href: '/#features' },
      { label: 'Auto-Apply', href: '/#features' },
      { label: 'Application Tracker', href: '/candidate/applications' },
      { label: 'Pricing', href: '/pricing' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blogs' },
      { label: 'Press', href: '/press' },
    ],
    resources: [
      { label: 'Help Center', href: '/help' },
      { label: 'FAQs', href: '/#faq' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'API', href: '/api-docs' },
      { label: 'Partners', href: '/partners' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' },
      { label: 'Sitemap', href: '/sitemap' },
    ],
  };

  const socialLinks = [
    { 
      name: 'Twitter', 
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    { 
      name: 'LinkedIn', 
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    },
    { 
      name: 'GitHub', 
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    },
    { 
      name: 'YouTube', 
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
          <Link href="/" className="inline-block mb-6">
              <div className="relative w-36 h-10">
              <Image 
                src={logo} 
                  alt="Jobocate Logo" 
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
              Revolutionizing the job search with AI. Find your dream career faster with intelligent matching and automated applications.
          </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary-500 hover:border-primary-200 hover:bg-primary-50 transition-all duration-300"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
          </div>
        </div>
        
          {/* Product Links */}
        <div>
            <h3 className="text-gray-900 font-semibold mb-4">Product</h3>
          <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-600 text-sm hover:text-primary-600 transition-colors duration-200"
                  >
                    {link.label}
              </Link>
            </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-600 text-sm hover:text-primary-600 transition-colors duration-200"
                  >
                    {link.label}
              </Link>
            </li>
              ))}
          </ul>
        </div>
        
          {/* Resources Links */}
        <div>
            <h3 className="text-gray-900 font-semibold mb-4">Resources</h3>
          <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-600 text-sm hover:text-primary-600 transition-colors duration-200"
                  >
                    {link.label}
              </Link>
            </li>
              ))}
          </ul>
        </div>
        
          {/* Legal Links */}
        <div>
            <h3 className="text-gray-900 font-semibold mb-4">Legal</h3>
          <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-gray-600 text-sm hover:text-primary-600 transition-colors duration-200"
                  >
                    {link.label}
              </Link>
            </li>
              ))}
          </ul>
        </div>
      </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-gray-900 font-semibold mb-1">Stay Updated</h3>
              <p className="text-gray-500 text-sm">Get the latest job search tips and product updates.</p>
            </div>
            <form className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full transition-all duration-300"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      
      {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {new Date().getFullYear()} <span className="text-primary-600 font-medium">Jobocate</span>. All rights reserved.
        </p>
          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
        </div>
      </div>
    </div>
  </footer>
);
};
