'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  const themes = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];

  const currentTheme = theme || 'light';
  const currentThemeOption = themes.find(t => t.value === currentTheme) || themes[0];
  const CurrentIcon = currentThemeOption.icon;

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        aria-label="Toggle theme"
      >
        <CurrentIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 w-40 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl py-1 z-[101]"
            >
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                const isActive = currentTheme === themeOption.value;
                
                return (
                  <button
                    key={themeOption.value}
                    onClick={() => handleThemeChange(themeOption.value)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{themeOption.label}</span>
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
