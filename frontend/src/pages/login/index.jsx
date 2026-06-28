import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/advocate_logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();

  // Testimonials data for the left panel
  const testimonials = [
    {
      name: 'Lucas Wright',
      role: 'Product Manager',
      text: 'Jobocate streamlined my job search, allowing me to focus on preparing for interviews instead of endless applications.',
      avatar: 'LW'
    },
    {
      name: 'Rowan Ashford',
      role: 'Quality Assurance Engineer',
      text: "The personalized job matches led me to opportunities I hadn't considered before. Fantastic service!",
      avatar: 'RA'
    },
    {
      name: 'Odette Harrington',
      role: 'Technical Writer',
      text: 'The automated applications saved me countless hours. I landed a position within 2 weeks.',
      avatar: 'OH'
    },
    {
      name: 'Ava Morgan',
      role: 'UX Designer',
      text: "Jobocate's AI-driven approach matched my skills perfectly, resulting in multiple job offers.",
      avatar: 'AM'
    },
    {
      name: 'Zaid Hamdan',
      role: 'Systems Architect',
      text: "The intuitive platform made job hunting a breeze. I secured a fantastic position within weeks.",
      avatar: 'ZH'
    },
    {
      name: 'Diego Morales',
      role: 'Mobile App Developer',
      text: 'The AI-driven applications were spot on. I received multiple interview invites from leading tech firms.',
      avatar: 'DM'
    }
  ];

  useEffect(() => {
    console.log('Login page mounted, checking for auth errors and user state');
    const { error: errorParam } = router.query;
    if (errorParam) {
      const errorMessages = {
        missing_auth_data: 'Authentication failed. Please try logging in again.',
        auth_processing_failed: 'There was an error processing your authentication. Please try again.',
        google_auth_failed: 'Google authentication failed. Please try again.',
        no_user_data: 'Unable to retrieve user data. Please try again.',
      };
      setError(errorMessages[errorParam] || 'An error occurred during authentication. Please try again.');
      console.warn('Auth error detected:', errorParam);
      router.replace('/login', undefined, { shallow: true });
    }
  }, [router.query]);

  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting to dashboard');
      const redirectPath = user.role === 'ROLE_EMPLOYER' 
        ? '/employer/dashboard' 
        : '/candidate/dashboard';
      router.push(redirectPath);
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Login form submitted for email:', email);

    try {
      await login(email, password);
      console.log('Login successful');
      const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role;
      const redirectPath = userRole === 'ROLE_EMPLOYER' 
        ? '/employer/dashboard' 
        : '/candidate/dashboard';
      router.push(redirectPath);
    } catch (err) {
      console.error('Login failed:', err.message);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Initiating Google OAuth login');
    const { API_URL } = require('@/config/api');
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleLinkedInLogin = () => {
    console.log('Initiating LinkedIn OAuth login');
    const { API_URL } = require('@/config/api');
    window.location.href = `${API_URL}/api/auth/linkedin`;
  };

  return (
    <div className="min-h-screen flex">
      <Head>
        <title>Sign In - Jobocate</title>
        <meta name="description" content="Sign in to your Jobocate account to continue your AI-powered job search" />
      </Head>

      {/* Left Side - Dark Testimonials Section */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)' }}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top left, rgba(250,82,82,0.08) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at bottom right, rgba(255,146,43,0.06) 0%, transparent 50%)' }} />
        
        {/* Floating orbs for atmosphere */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(250,82,82,0.08)' }} />
        <div className="absolute bottom-40 right-20 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(255,146,43,0.06)', animationDelay: '2s' }} />
        
        <div className="relative z-10 p-12 flex flex-col justify-center w-full">
          <div className="max-w-xl mx-auto">
            {/* Stats Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <p className="text-3xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  58,100+
                </span>{' '}
                interviews landed
              </p>
              <p className="text-gray-400 text-lg">from top companies and organizations</p>
            </motion.div>

            {/* Testimonials Marquee - First Row */}
            <div className="mb-6 overflow-hidden">
              <motion.div
                animate={{ x: [0, -1200] }}
                transition={{ 
                  duration: 30, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex gap-6"
              >
                {[...testimonials, ...testimonials].map((testimonial, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-80 rounded-xl p-5 border transition-colors"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{testimonial.name}</p>
                        <p className="text-xs text-gray-400">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{testimonial.text}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Testimonials Marquee - Second Row (reverse direction) */}
            <div className="mb-12 overflow-hidden">
              <motion.div
                animate={{ x: [-1200, 0] }}
                transition={{ 
                  duration: 35, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex gap-6"
              >
                {[...testimonials.slice(3), ...testimonials.slice(0, 3), ...testimonials].map((testimonial, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-80 rounded-xl p-5 border transition-colors"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{testimonial.name}</p>
                        <p className="text-xs text-gray-400">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{testimonial.text}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Value Proposition */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Land A Job Interview This Week
              </h2>
              <p className="text-gray-400 mb-6">
                Start automatically applying to jobs with Jobocate!
              </p>
              <p className="text-sm text-gray-500">
                How Jobocate Works →
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side - Light Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-white">
        {/* Subtle background pattern */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(250,82,82,0.03) 0%, transparent 70%)' }} />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center mb-8">
            <div className="relative w-44 h-14">
              <Image 
                src={logo} 
                alt="Jobocate Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl shadow-gray-200/50">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-500">Sign in to continue your job search</p>
            </div>
            
            {/* Google OAuth Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-semibold text-gray-700">Continue with Google</span>
            </motion.button>

            {/* LinkedIn OAuth Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleLinkedInLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#0A66C2] rounded-xl hover:bg-[#004182] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="font-semibold text-white">Continue with LinkedIn</span>
            </motion.button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-400 text-sm">or</span>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all duration-200"
                  placeholder="Email Address"
                />
              </div>

              <div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all duration-200"
                  placeholder="Password"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0" 
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>

            {/* Security Features */}
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Bank Level Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>ATS Compatible</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <p className="mt-8 text-center text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                Sign Up
              </Link>
            </p>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-gray-500 hover:text-gray-700 underline transition-colors">
              Terms of Service
            </Link>
            {' '}& {' '}
            <Link href="/privacy" className="text-gray-500 hover:text-gray-700 underline transition-colors">
              Privacy Policy
            </Link>
          </p>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition-colors inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
