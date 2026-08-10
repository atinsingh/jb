import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const AuthSuccess = () => {
  const router = useRouter();
  const { setAuthData } = useAuth();
  const [message, setMessage] = useState({ title: 'Completing sign in...', subtitle: 'Please wait...' });
  // Guard so the OAuth token is processed exactly once. Without this the effect
  // re-runs on every router change (router.replace mutates the router object),
  // re-entering with no token in the URL and looping on the redirect.
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processAuth = async () => {
      console.log('🔵 [Auth Success] Page loaded');
      console.log('🔵 [Auth Success] Full URL:', window.location.href);
      console.log('🔵 [Auth Success] Search params:', window.location.search);
      
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userString = urlParams.get('user');
      
      // Check if user existed before (existing user has token in localStorage)
      const hadExistingToken = !!localStorage.getItem('authToken');
      
      console.log('🔵 [Auth Success] Token received:', token ? `Yes (length: ${token.length})` : 'No');
      console.log('🔵 [Auth Success] User string received:', userString ? `Yes (length: ${userString.length})` : 'No');
      console.log('🔵 [Auth Success] Had existing token:', hadExistingToken);
  
      // Check if we have token in URL
      if (token) {
        try {
          let user = null;
          
          // If user data is provided in URL, use it
          if (userString) {
            console.log('🔵 [Auth Success] Parsing user data...');
            user = JSON.parse(decodeURIComponent(userString));
            console.log('🔵 [Auth Success] Parsed user:', user);
          }
          
          // Set initial message (will be updated after fetching profile)
          setMessage({
            title: 'Logging in, please wait...',
            subtitle: 'Almost there!'
          });
          
          // Store token and user data
          console.log('🔵 [Auth Success] Storing token and user in localStorage...');
          localStorage.setItem('authToken', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          console.log('🔵 [Auth Success] Data stored successfully');
          
          // Fetch full user profile to check if user is new
          let fullUser = user;
          try {
            const { API_URL } = require('@/config/api');
            const profileResponse = await fetch(`${API_URL}/api/users/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.user) {
                fullUser = profileData.user;
                localStorage.setItem('user', JSON.stringify(fullUser));
                
                // Update message based on profile completeness
                const hasProfileData = fullUser.phone || fullUser.location || fullUser.summary || 
                                      (fullUser.skills && fullUser.skills.length > 0) ||
                                      (fullUser.experience && fullUser.experience.length > 0) ||
                                      (fullUser.education && fullUser.education.length > 0);
                
                if (!hasProfileData && !hadExistingToken) {
                  setMessage({
                    title: 'Setting up your account...',
                    subtitle: 'Please wait while we set up your account'
                  });
                } else {
                  setMessage({
                    title: 'Logging in, please wait...',
                    subtitle: 'Almost there!'
                  });
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [Auth Success] Could not fetch profile, using basic user data:', error);
            // Use the basic user data we have
            if (!hadExistingToken) {
              setMessage({
                title: 'Setting up your account...',
                subtitle: 'Please wait while we set up your account'
              });
            }
          }
          
          // Update auth context if available
          if (setAuthData) {
            console.log('🔵 [Auth Success] Updating auth context...');
            setAuthData({ token, user: fullUser });
            console.log('🔵 [Auth Success] Auth context updated');
          } else {
            console.warn('⚠️ [Auth Success] setAuthData function not available');
          }
          
          // Small delay to ensure state is updated, then redirect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect to dashboard based on user role
          const redirectPath = fullUser?.role === 'ROLE_EMPLOYER' 
            ? '/employer/dashboard' 
            : '/app/dashboard';
          console.log('🔵 [Auth Success] Redirecting to dashboard...');
          router.replace(redirectPath);
        } catch (error) {
          console.error('❌ [Auth Success] Error processing auth:', error);
          console.error('❌ [Auth Success] Error stack:', error.stack);
          router.replace('/login?error=auth_processing_failed');
        }
      } else {
        // Token not in URL - check if we already have it in localStorage (from previous attempt)
        console.log('⚠️ [Auth Success] No token in URL, checking localStorage...');
        const existingToken = localStorage.getItem('authToken');
        const existingUser = localStorage.getItem('user');
        
        if (existingToken) {
          console.log('✅ [Auth Success] Found existing token in localStorage, using it');
          setMessage({
            title: 'Logging in, please wait...',
            subtitle: 'Almost there!'
          });
          
          try {
            let user = null;
            if (existingUser) {
              user = JSON.parse(existingUser);
            }
            
            // Update auth context
            if (setAuthData) {
              setAuthData({ token: existingToken, user });
            }
            
            // Small delay to ensure state is updated, then redirect
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redirect to dashboard
            const redirectPath = user?.role === 'ROLE_EMPLOYER' 
              ? '/employer/dashboard' 
              : '/app/dashboard';
            console.log('🔵 [Auth Success] Redirecting to dashboard with existing token...');
            router.replace(redirectPath);
            return;
          } catch (error) {
            console.error('❌ [Auth Success] Error using existing token:', error);
            router.replace('/login?error=missing_auth_data');
          }
        } else {
          // No token found anywhere
          console.error('❌ [Auth Success] Missing auth token in both URL and localStorage');
          router.replace('/login?error=missing_auth_data');
        }
      }
    };
  
    processAuth();
    // Run once on mount only. Depending on `router` would re-fire this effect
    // on the post-login navigation and loop. router/setAuthData are stable
    // enough to use via closure here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-600 mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{message.title}</h2>
        <p className="text-gray-600">{message.subtitle}</p>
      </div>
    </div>
  );
};

export default AuthSuccess;
