"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import 'react-toastify/dist/ReactToastify.css';
import Image from "next/image";
import mobile from '@/assets/login/mobile.png';
import Link from "next/link";

export default function ForgotPassword() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      setMessage('Password reset link has been sent to your email. Please check your inbox.');
      toast.success('Reset link sent successfully!');
      
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      toast.error(error || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Illustration - Reusing the same illustration as login */}
        <div className="flex justify-center relative">
          <div className="absolute -z-10 w-80 h-80 bg-orange-100 rounded-full top-1/2 -translate-y-1/2"></div>
          <Image
            src={mobile}
            alt="Jobocate App"
            width={450}
            height={900}
            className="relative z-10"
          />
        </div>

        {/* Right Forgot Password Form */}
        <div className="w-full">
          {/* Logo */}
          <h1 className="text-3xl font-bold text-orange-600 mb-6">JOBOCATE</h1>

          {/* Heading */}
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Forgot Password
          </h2>
          <p className="text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
              )}
              {message && (
                <p className="mt-1 text-sm text-green-600">{message}</p>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-orange-600 text-white py-3 rounded-md font-medium hover:bg-orange-700 transition disabled:opacity-70 flex items-center justify-center"
              disabled={isLoading || message}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : message ? 'Email Sent' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-4">
              <Link 
                href="/login" 
                className="text-orange-600 hover:underline text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
