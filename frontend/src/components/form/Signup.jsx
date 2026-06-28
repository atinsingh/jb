"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import mobile from '@/assets/login/mobile.png';
import Link from "next/link";
import { toast } from 'react-toastify';
import { API_URL } from '@/config/api';
import 'react-toastify/dist/ReactToastify.css';

export default function Signup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('candidate');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ROLE_TALENT',
    agreeTerms: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (newRole) => {
    const roleValue = newRole === 'candidate' ? 'ROLE_TALENT' : 'ROLE_EMPLOYER';
    setRole(newRole);
    setFormData(prev => ({
      ...prev,
      role: roleValue
    }));
  };

  const verifyEmail = async (email, token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token
        }),
      });

      if (!response.ok) {
        throw new Error('Email verification failed');
      }

      return true;
    } catch (err) {
      console.error('Email verification error:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.agreeTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    try {
      setIsLoading(true);
      
      // First, register the user
      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.message || 'Registration failed');
      }

      // If registration is successful, send verification email
      setVerificationSent(true);
      setVerificationToken(registerData.verificationToken || '');
      
      // If we have the verification token, try to verify immediately
      if (registerData.verificationToken) {
        const verified = await verifyEmail(formData.email, registerData.verificationToken);
        if (verified) {
          toast.success('Email verified successfully! Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }
      }
      
      // If we reach here, we need manual verification
      toast.success('Registration successful! Please check your email to verify your account.');
      
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      toast.error(error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full">
        {verificationSent ? (
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
              <p className="text-gray-600 mb-6">We've sent a verification link to <span className="font-medium">{formData.email}</span></p>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Didn't receive an email? Check your spam folder or 
                      <button 
                        onClick={async () => {
                          try {
                            await verifyEmail(formData.email, verificationToken);
                            toast.success('Verification email resent!');
                          } catch (err) {
                            toast.error('Failed to resend verification email');
                          }
                        }}
                        className="ml-1 text-blue-600 font-medium hover:underline"
                      >
                        resend
                      </button>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Illustration */}
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

        {/* Right Signup Form */}
        <div className="w-full">
          {/* Logo */}
          <h1 className="text-3xl font-bold text-orange-600 mb-6">JOBOCATE</h1>

          {/* Heading */}
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Create Your Account
          </h2>

          {/* Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              className={`px-4 py-2 rounded-md font-medium ${
                role === "candidate"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => handleRoleChange("candidate")}
            >
              Candidate
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md font-medium ${
                role === "ROLE_EMPLOYER"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => handleRoleChange("ROLE_EMPLOYER")}
            >
              Employer
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
              value={formData.password}
              onChange={handleInputChange}
              minLength={6}
              required
            />

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <button 
              type="submit" 
              className="w-full bg-orange-600 text-white py-3 rounded-md font-medium hover:bg-orange-700 transition disabled:opacity-70 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Sign Up'}
            </button>

            {/* Terms */}
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input 
                type="checkbox" 
                name="agreeTerms"
                className="w-4 h-4 border-gray-400 mt-1" 
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                required
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-orange-600 hover:underline">
                  Terms & Conditions
                </Link>.
                {error && error.includes('Terms') && (
                  <span className="text-red-500 text-sm block mt-1">{error}</span>
                )}
              </span>
            </label>

            {/* Divider */}
            <div className="flex items-center gap-2 my-4">
              <span className="flex-1 h-px bg-gray-300"></span>
              <span className="text-gray-500 text-sm">or</span>
              <span className="flex-1 h-px bg-gray-300"></span>
            </div>

            {/* Google Signup */}
            <button className="w-full border border-orange-600 text-orange-600 py-3 rounded-md font-medium hover:bg-orange-50 transition">
              Sign Up With Google
            </button>

            {/* Already have account */}
            <p className="text-sm text-gray-600 text-center mt-4">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-orange-600 font-medium hover:underline cursor-pointer">
                  Sign In
                </span>
              </Link>
            </p>
          </form>
        </div>
          </div>
        )}
      </div>
    </section>
  );
}
