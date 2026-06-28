"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/config/api';
import 'react-toastify/dist/ReactToastify.css';
import mobile from '@/assets/login/mobile.png'
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    role: 'ROLE_TALENT' // Default to Candidate
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (newRole) => {
    setFormData(prev => ({
      ...prev,
      role: newRole
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      setIsLoading(true);
      
      // For testing - remove this in production
      console.log('Login attempt with:', formData.email);
      
      // Simulate API call for testing - remove this in production
      // Uncomment the real fetch and remove this block when your API is ready
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      // Make the actual API call
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role // Include the selected role in the request
        }),
      });
      
      const responseData = await response.json();
      console.log('Login response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Login failed');
      }
      
      // Extract data from the response structure
      const { data } = responseData;
      if (!data || !data.access_token || !data.user) {
        throw new Error('Invalid response from server');
      }
      
      // Login using context
      login(data.access_token, data.user);
      
      // Show success toast
      toast.success('Login successful! Redirecting to dashboard...');
      
      // Get redirect URL from query params or use default based on role
      const redirectUrl = router.query.redirect || 
        (data.user.role === 'ROLE_EMPLOYER' ? '/employer/dashboard' : '/candidate/dashboard');
      
      // Use window.location for full page reload to ensure auth state is properly set
      window.location.href = redirectUrl;
      
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Invalid email or password';
      setError(errorMessage);
      toast.error(`Login failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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

        {/* Right Login Form */}
        <div className="w-full">
          {/* Logo */}
          <h1 className="text-3xl font-bold text-orange-600 mb-6">JOBOCATE</h1>

          {/* Heading */}
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Welcome Back!
          </h2>

          {/* Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-md font-medium ${
                formData.role === "ROLE_TALENT"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => handleRoleChange("ROLE_TALENT")}
              type="button"
            >
              Candidate
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium ${
                formData.role === "ROLE_EMPLOYER"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => handleRoleChange("ROLE_EMPLOYER")}
              type="button"
            >
              Employer
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
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

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input 
                  type="checkbox" 
                  name="rememberMe"
                  className="w-4 h-4 border-gray-400" 
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm text-orange-600 hover:underline">
                Forgot password?
              </Link>
            </div>

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
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2 my-4">
              <span className="flex-1 h-px bg-gray-300"></span>
              <span className="text-gray-500 text-sm">or</span>
              <span className="flex-1 h-px bg-gray-300"></span>
            </div>

            {/* Google Login */}
            <button 
              type="button"
              className="w-full border border-orange-600 text-orange-600 py-3 rounded-md font-medium hover:bg-orange-50 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            {/* Don't have an account */}
            <p className="text-sm text-gray-600 text-center mt-4">
              Don't have an account?{' '}
              <Link href="/signup" className="text-orange-600 font-medium hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
