'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'jobocate-marketing-theme';

/**
 * Light/dark for every v3 surface — marketing AND the signed-in candidate app.
 *
 * It was `useMarketingTheme` under components/site, scoped to the marketing
 * pages because the signed-in app was still cream-designed and flipping it
 * from the marketing header would have restyled screens v3 never covered.
 * The candidate app is now v3 too and its top bar carries the same toggle
 * (see AppTopNav), so one hook, one attribute and one storage key means the
 * choice survives crossing between the two surfaces.
 *
 * Still kept apart from next-themes: that provider is global, and the employer
 * and admin surfaces are cream-designed and must not move with this.
 *
 * The initial attribute is written by the inline script in _document.js before
 * first paint, so this hook only has to read what is already on <html> — it
 * never sets state during render, which is what would cause a flash or a
 * hydration mismatch.
 */
export default function useJbTheme() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-jb-theme');
    setTheme(current === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-jb-theme', next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* private mode — the choice just won't persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
