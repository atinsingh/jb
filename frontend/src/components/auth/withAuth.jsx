import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function withAuth(WrappedComponent, allowedRoles = []) {
  return function WithAuthComponent(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Only run on client side
      if (typeof window === 'undefined') return;

      // If not loading and no user, redirect to login
      if (!loading && !user) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }

      // If user exists but doesn't have the required role, redirect to unauthorized
      if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }, [user, loading, router]);

    // Show loading state while checking auth
    if (loading || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
        </div>
      );
    }

    // If user doesn't have required role, don't render the component
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return null;
    }

    // If all checks pass, render the wrapped component
    return <WrappedComponent {...props} />;
  };
}
