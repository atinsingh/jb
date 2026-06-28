import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/advocate_logo.png';

const FlyoutMenu = ({ children, trigger, isOpen, setIsOpen }) => {
  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {trigger}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-4"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[280px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    const dashboardPath = user.role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : '/candidate/dashboard';
    router.push(dashboardPath);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const productLinks = [
    {
      name: 'Resume Builder',
      href: '/candidate/resume-builder',
      description: 'Create ATS-optimized resumes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: 'Job Matching',
      href: '/#features',
      description: 'AI-powered job recommendations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      name: 'Auto-Apply',
      href: '/#features',
      description: 'Automate your job applications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      name: 'Application Tracker',
      href: '/candidate/applications',
      description: 'Track all your applications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
  ];

  const resourceLinks = [
    { name: 'Blog', href: '/blogs', description: 'Career tips and insights' },
    { name: 'Help Center', href: '/help', description: 'Get support and answers' },
    { name: 'How It Works', href: '/#how-it-works', description: 'Learn about our platform' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100'
          : 'bg-white/80 backdrop-blur-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
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

          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Products Flyout */}
            <FlyoutMenu
              isOpen={activeMenu === 'products'}
              setIsOpen={(open) => setActiveMenu(open ? 'products' : null)}
              trigger={
                <button className="flex items-center gap-1 px-4 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors duration-200">
                  Products
                  <svg className={`w-4 h-4 transition-transform duration-200 ${activeMenu === 'products' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              }
            >
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Features</p>
                <div className="space-y-1">
                  {productLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setActiveMenu(null)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform duration-200">
                        {link.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{link.name}</p>
                        <p className="text-sm text-gray-500">{link.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <Link
                  href="/#features"
                  onClick={() => setActiveMenu(null)}
                  className="flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
                >
                  View all features
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </FlyoutMenu>

            {/* Resources Flyout */}
            <FlyoutMenu
              isOpen={activeMenu === 'resources'}
              setIsOpen={(open) => setActiveMenu(open ? 'resources' : null)}
              trigger={
                <button className="flex items-center gap-1 px-4 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors duration-200">
                  Resources
                  <svg className={`w-4 h-4 transition-transform duration-200 ${activeMenu === 'resources' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              }
            >
              <div className="p-4">
                <div className="space-y-1">
                  {resourceLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setActiveMenu(null)}
                      className="block p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      <p className="font-medium text-gray-900">{link.name}</p>
                      <p className="text-sm text-gray-500">{link.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </FlyoutMenu>

            {user && (
              <Link
                href="/pricing"
                className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors duration-200"
              >
                Pricing
              </Link>
            )}

            <Link
              href="/about"
              className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors duration-200"
            >
              About
            </Link>

            <Link
              href="/contact"
              className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors duration-200"
            >
              Contact
            </Link>
          </div>

          {/* Right Side - Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={handleDashboardClick}
                  className="px-6 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-all duration-300"
                >
                  Dashboard
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-primary-500 font-medium hover:text-primary-600 transition-colors duration-200"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-all duration-300"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden relative w-10 h-10 flex items-center justify-center text-gray-700"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
          >
            <div className="relative w-6 h-5">
              <span className={`absolute left-0 w-full h-0.5 bg-gray-700 transition-all duration-300 ${mobileOpen ? 'top-2 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-2 w-full h-0.5 bg-gray-700 transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 w-full h-0.5 bg-gray-700 transition-all duration-300 ${mobileOpen ? 'top-2 -rotate-45' : 'top-4'}`} />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2 border-t border-gray-100">
                {/* Mobile Product Links */}
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Products</p>
                  {productLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="flex items-center gap-3 px-3 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-all duration-200"
                      onClick={() => setMobileOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center text-primary-500">
                        {link.icon}
                      </div>
                      {link.name}
                    </Link>
                  ))}
                </div>

                {/* Mobile Resource Links */}
                <div className="px-4 py-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Resources</p>
                  {resourceLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="block px-3 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-all duration-200"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                {/* Mobile Other Links */}
                <div className="px-4 py-2 border-t border-gray-100">
                  {user && (
                    <Link
                      href="/pricing"
                      className="block px-3 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-all duration-200"
                      onClick={() => setMobileOpen(false)}
                    >
                      Pricing
                    </Link>
                  )}
                  <Link
                    href="/about"
                    className="block px-3 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-all duration-200"
                    onClick={() => setMobileOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    className="block px-3 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-all duration-200"
                    onClick={() => setMobileOpen(false)}
                  >
                    Contact
                  </Link>
                </div>

                {/* Mobile Auth */}
                <div className="px-4 pt-4 space-y-2 border-t border-gray-100">
                  {user ? (
                    <>
                      <button
                        onClick={(e) => {
                          handleDashboardClick(e);
                          setMobileOpen(false);
                        }}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full transition-colors"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full py-3 text-center text-gray-600 font-medium hover:text-primary-600"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        className="block w-full py-3 text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        Get Started Free
                      </Link>
                      <Link
                        href="/login"
                        className="block w-full py-3 text-center text-primary-500 font-medium hover:text-primary-600"
                        onClick={() => setMobileOpen(false)}
                      >
                        Log in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};
