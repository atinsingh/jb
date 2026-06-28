import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // If no token, redirect to login with return URL
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }

      // If no user data, force logout
      if (!userData || !userData.role) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }

      // If roles are specified, check if user has required role
      if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
        router.push('/unauthorized');
        return;
      }

      // If we get here, user is authorized
      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, allowedRoles]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Only render children if authorized
  return isAuthorized ? <>{children}</> : null;
};

export default ProtectedRoute;
