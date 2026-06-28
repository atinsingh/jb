import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import logo from '@/assets/advocate_logo.png';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ROLE_CANDIDATE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role;
      const redirectPath = userRole === 'ROLE_EMPLOYER' 
        ? '/employer/dashboard' 
        : '/candidate/dashboard';
      router.push(redirectPath);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const { API_URL } = require('@/config/api');
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleLinkedInSignup = () => {
    const { API_URL } = require('@/config/api');
    window.location.href = `${API_URL}/api/auth/linkedin`;
  };

  // Testimonials data
  const testimonials = [
    {
      name: 'Lucas Wright',
      role: 'Product Manager',
      company: 'Tech Corp',
      text: 'Jobocate streamlined my job search, allowing me to focus on preparing for interviews instead of endless applications.',
      avatar: 'LW'
    },
    {
      name: 'Rowan Ashford',
      role: 'Quality Assurance Engineer',
      company: 'Innovate Labs',
      text: 'The personalized job matches from Jobocate led me to opportunities I hadn\'t considered before. Fantastic service!',
      avatar: 'RA'
    },
    {
      name: 'Odette Harrington',
      role: 'Technical Writer',
      company: 'Dev Solutions',
      text: 'The automated applications from Jobocate saved me countless hours. I landed a position within 2 weeks.',
      avatar: 'OH'
    },
    {
      name: 'Ava Morgan',
      role: 'UX Designer',
      company: 'Design Studio',
      text: 'Jobocate\'s AI-driven approach matched my skills perfectly, resulting in multiple job offers.',
      avatar: 'AM'
    },
    {
      name: 'Zaid Hamdan',
      role: 'Systems Architect',
      company: 'Cloud Systems',
      text: 'Jobocate\'s intuitive platform made job hunting a breeze. I secured a fantastic position within weeks.',
      avatar: 'ZH'
    },
    {
      name: 'Diego Morales',
      role: 'Mobile App Developer',
      company: 'App Innovations',
      text: 'The AI-driven applications from Jobocate were spot on. I received multiple interview invites from leading tech firms.',
      avatar: 'DM'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <Head>
        <title>Sign Up - Jobocate | Start Your AI-Powered Job Search</title>
        <meta name="description" content="Create your Jobocate account and start your AI-powered job search" />
      </Head>

      {/* Left Side - Testimonials & Social Proof */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50">
        <div className="relative z-10 p-12 flex flex-col justify-center overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Stats Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <p className="text-2xl font-bold text-gray-900 mb-2">
                58,100+ interviews landed from the top companies and organizations
              </p>
            </motion.div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                      <p className="text-xs text-gray-600">{testimonial.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded bg-gray-200 flex-shrink-0"></div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{testimonial.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Value Proposition */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Land A Job Interview This Week
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Start automatically applying to jobs with Jobocate!
              </p>
              <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Bank Level Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Undetectable by Recruiters</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-y-auto bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 py-8"
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-12">
            <Link href="/" className="flex items-center">
              <div className="relative w-40 h-12">
                <Image 
                  src={logo} 
                  alt="Jobocate Logo" 
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create An Account</h1>
              <p className="text-gray-600">Sign up to get access to Jobocate's AI Tools!</p>
            </div>
            
            {/* Google OAuth Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-semibold text-gray-700">Continue with Google</span>
            </motion.button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-500 text-sm font-medium">or</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl"
              >
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  placeholder="Email Address"
                />
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  placeholder="Password"
                />
              </div>

              <div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  placeholder="Confirm Password"
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md shadow-primary-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </motion.button>
            </form>

            {/* Security Features */}
            <div className="mt-6 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Bank Level Security with Data</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Undetectable by Recruiters (backtested with ATS software)</span>
              </div>
            </div>

            {/* Login Link */}
            <p className="mt-8 text-center text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700 underline">
                Sign In
              </Link>
            </p>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-gray-500">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                Terms of Service
              </Link>
              {' '}&{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
