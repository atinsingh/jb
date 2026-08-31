import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { LOGIN_ROUTE, loginRedirectFor } from '@/lib/auth/routes';

/**
 * Role gate for a page tree.
 *
 * This is **not** the security boundary and never was. `src/middleware.js` keeps
 * an unauthenticated visitor from reaching the page at all, and the NestJS
 * guards decide what the API will actually answer. This only stops the wrong
 * role from rendering a surface that is not theirs.
 *
 * It reads the session from `useAuth` now rather than parsing `localStorage`
 * itself, so it can no longer disagree with the rest of the app about who is
 * signed in — and it no longer redirects to `/login`, a route that was deleted
 * in the redesign and had been 404-ing here.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const authorized =
    !!user && (allowedRoles.length === 0 || allowedRoles.includes(user.role));

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(loginRedirectFor(router.asPath));
      return;
    }

    if (!authorized) router.replace('/unauthorized');
  }, [loading, user, authorized, router]);

  // Render nothing rather than a spinner: the middleware has already resolved
  // the session server-side, so this window is a frame or two, and a spinner
  // that flashes in and out reads as jank.
  return authorized ? <>{children}</> : null;
};

export default ProtectedRoute;
export { LOGIN_ROUTE };
