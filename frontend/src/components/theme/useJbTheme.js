'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'jobocate-marketing-theme';

/**
 * Light/dark for the marketing surface only.
 *
 * Kept apart from next-themes on purpose: that provider is global and the
 * signed-in app (/app/*, /employer/*, /admin/*) is cream-designed, so flipping
 * it from the marketing header would restyle screens this design never covered.
 *
 * The initial attribute is written by the inline script in _document.js before
 * first paint, so this hook only has to read what is already on <html> — it
 * never sets state during render, which is what would cause a flash or a
 * hydration mismatch.
 */
export default function useMarketingTheme() {
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
