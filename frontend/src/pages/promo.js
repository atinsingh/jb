import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/jobocate_logo.svg';

export default function PromoPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('loading');
    
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage('Thank you! We\'ll notify you when we launch.');
        setEmail('');
      } else {
        throw new Error(data.message || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to subscribe. Please try again.');
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col items-center justify-center p-6">
      <Head>
        <title>Jobocate - Coming Soon</title>
        <meta name="description" content="Jobocate is coming soon. Be the first to know when we launch!" />
      </Head>
      
      <div className="text-center max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl">
          <Link href="/" className="block w-48 h-20 relative mb-8 mx-auto">
            <Image 
              src={logo} 
              alt="Jobocate Logo" 
              fill
              className="object-contain hover:opacity-90 transition-opacity"
              priority
            />
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">🚀 Something Amazing is Coming</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            We're building the future of job searching with AI-powered matching to help you find your dream job faster and easier than ever before.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Smart Matching</h3>
              <p className="text-gray-400 text-sm">AI-powered job matching tailored to your skills and preferences.</p>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Trusted by Thousands</h3>
              <p className="text-gray-400 text-sm">Join thousands of professionals who found their dream jobs.</p>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Get matched with relevant jobs in seconds, not hours.</p>
            </div>
          </div>
          
          <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-orange-200 font-semibold text-lg mb-2">🚀 Be the First to Know</h3>
            <p className="text-orange-100 text-sm mb-4">Sign up now to get early access and exclusive updates.</p>
            
            {status === 'success' ? (
              <div className="bg-green-500/20 border border-green-400/30 text-green-100 p-4 rounded-lg mb-4">
                {message}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email" 
                    className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={status === 'loading'}
                  />
                  <button 
                    type="submit"
                    disabled={status === 'loading'}
                    className={`px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium rounded-lg transition-all whitespace-nowrap hover:shadow-lg hover:shadow-orange-500/20 ${
                      status === 'loading' ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                  >
                    {status === 'loading' ? 'Sending...' : 'Notify Me'}
                  </button>
                </div>
                {status === 'error' && (
                  <p className="text-red-300 text-sm mt-2">{message}</p>
                )}
              </form>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" legacyBehavior>
              <a className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors duration-200 text-center hover:shadow-lg hover:shadow-orange-500/20">
                ← Back to Home
              </a>
            </Link>
          </div>
        </div>
        
        <p className="mt-8 text-gray-500 text-sm">
          © {new Date().getFullYear()} Jobocate. All rights reserved.
        </p>
      </div>
    </div>
  );
}
