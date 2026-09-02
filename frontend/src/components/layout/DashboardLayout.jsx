'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/advocate_logo.png';
import {
  HomeModernIcon,
  BriefcaseIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  EnvelopeIcon,
  MicrophoneIcon,
  UserGroupIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

// Catalyst imports
import { SidebarLayout } from '@/components/catalyst/sidebar-layout';
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarDivider,
} from '@/components/catalyst/sidebar';

import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/catalyst/dropdown';
import { Avatar, AvatarButton } from '@/components/catalyst/avatar';
import { Badge } from '@/components/catalyst/badge';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Determine dashboard home based on user role
  const dashboardHome = user?.role === 'ROLE_EMPLOYER'
    ? '/employer/dashboard'
    : '/app/dashboard';

  const handleSignOut = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  // Navigation based on user role.
  //
  // Every href here was verified against src/pages. Two classes of dead link
  // were removed:
  //   - '/employer/applications' never existed; applications live per-job under
  //     /employer/jobs/[id]/applications, and the cross-job view is the
  //     candidate pipeline at /employer/candidates.
  //   - the whole /candidate/* tree has been retired in favour of /app/*.
  //     Those paths still 307 via next.config.js, but linking straight at the
  //     real route avoids a redirect hop on every sidebar click.
  const navigation = user?.role === 'ROLE_EMPLOYER' ? [
    { name: 'Dashboard', href: '/employer/dashboard', icon: HomeModernIcon, current: router.pathname === '/employer/dashboard' },
    { name: 'Jobs', href: '/employer/jobs', icon: BriefcaseIcon, current: router.pathname === '/employer/jobs' },
    { name: 'Candidates', href: '/employer/candidates', icon: ClipboardDocumentListIcon, current: router.pathname === '/employer/candidates' },
  ] : [
    { name: 'Dashboard', href: '/app/dashboard', icon: HomeModernIcon, current: router.pathname === '/app/dashboard' },
    { name: 'My Applications', href: '/app/tracker', icon: ClipboardDocumentListIcon, current: router.pathname === '/app/tracker' },
    { name: 'Matched Jobs', href: '/jobs', icon: BriefcaseIcon, current: router.pathname === '/jobs' },
    { name: 'Résumé', href: '/app/resume', icon: SparklesIcon, current: router.pathname === '/app/resume', isPro: true },
    { name: 'AI Cover Letter', href: '/app/cover-letter', icon: EnvelopeIcon, current: router.pathname === '/app/cover-letter', isPro: true },
    { name: 'Interview Buddy', href: '/app/mock-interview', icon: MicrophoneIcon, current: router.pathname === '/app/mock-interview', isPro: true },
    { name: 'Job Profiles', href: '/app/preferences', icon: UserGroupIcon, current: router.pathname === '/app/preferences' },
  ];

  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.split(' ').filter(n => n.length > 0);
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      if (names.length === 1 && names[0].length >= 2) {
        return names[0].substring(0, 2).toUpperCase();
      }
      if (names.length === 1 && names[0].length === 1) {
        return `${names[0][0]}${names[0][0]}`.toUpperCase();
      }
    }
    return 'U';
  };

  return (
    <>
      <SidebarLayout
        isCollapsed={isCollapsed}
        sidebar={
          <Sidebar className="h-full w-full transition-all duration-300 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Header with logo and theme switcher */}
            <SidebarHeader className={`${isCollapsed ? 'p-3' : 'p-5'} border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}>
              {isCollapsed ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-lg shadow-lg shadow-primary-500/20 transition-transform group-hover:scale-105">
                      JO
                    </div>
                    <button
                      onClick={toggleSidebar}
                      className="absolute -right-1 -top-1 p-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-lg hover:scale-110 transition-all"
                      aria-label="Expand sidebar"
                    >
                      <ChevronRightIcon className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                    </button>
                  </div>
                  <ThemeSwitcher />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-32 h-10">
                      <Image
                        src={logo}
                        alt="Jobocate Logo"
                        fill
                        className="object-contain object-left"
                        priority
                      />
                    </div>
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <ThemeSwitcher />
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
                  </button>
                </div>
              )}
            </SidebarHeader>

            {/* Navigation items */}
            <SidebarBody className={`${isCollapsed ? 'p-2' : 'p-3'} flex-1 overflow-y-auto`}>
              <SidebarSection>
                {navigation.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="relative group">
                      <SidebarItem
                        href={item.href}
                        current={item.current}
                        title={isCollapsed ? item.name : undefined}
                        className={`${isCollapsed ? 'justify-center px-2' : ''} relative transition-all duration-200 ${
                          item.current 
                            ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' 
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
                          <div className={`relative ${item.current ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'} transition-colors`}>
                            <Icon className="h-5 w-5" data-slot="icon" />
                            {item.current && (
                              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary-500 dark:bg-primary-400" />
                            )}
                          </div>
                          {!isCollapsed && (
                            <SidebarLabel className="flex items-center gap-2 flex-1">
                              <span className="font-medium">{item.name}</span>
                              {item.isPro && (
                                <Badge color="amber" className="text-[10px] px-1.5 py-0.5 font-semibold">
                                  Pro
                                </Badge>
                              )}
                            </SidebarLabel>
                          )}
                        </div>
                      </SidebarItem>
                    </div>
                  );
                })}
              </SidebarSection>
            </SidebarBody>

            {/* Footer with notifications and user menu */}
            <SidebarFooter className={`${isCollapsed ? 'p-2' : 'p-3'} border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}>
              <SidebarSection>
                <SidebarItem
                  title={isCollapsed ? 'Notifications' : undefined}
                  className={`${isCollapsed ? 'justify-center px-2' : ''} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
                >
                  <div className="relative">
                    <BellIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" data-slot="icon" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary-500 border-2 border-white dark:border-zinc-900" />
                  </div>
                  {!isCollapsed && <SidebarLabel>Notifications</SidebarLabel>}
                </SidebarItem>
                
                <SidebarDivider className="my-3" />
                
                <Dropdown>
                  <DropdownButton
                    as={SidebarItem}
                    className={`${isCollapsed ? 'justify-center px-2' : ''} text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
                    title={isCollapsed ? user?.name || 'User' : undefined}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
                      <Avatar
                        src={user?.picture || null}
                        initials={getUserInitials()}
                        alt={user?.name || 'User'}
                        className="size-8 border-2 border-zinc-200 dark:border-zinc-700"
                        data-slot="avatar"
                      />
                      {!isCollapsed && (
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <SidebarLabel className="font-semibold text-zinc-900 dark:text-white truncate w-full">
                            {user?.name || 'User'}
                          </SidebarLabel>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate w-full">
                            {user?.email || 'user@example.com'}
                          </span>
                        </div>
                      )}
                    </div>
                  </DropdownButton>
                  <DropdownMenu anchor="top end" className="z-[100] min-w-[200px]">
                    <DropdownItem href={user?.role === 'ROLE_EMPLOYER' ? '/employer/profile' : '/app/settings'}>
                      <UserCircleIcon data-slot="icon" />
                      <span>Profile</span>
                    </DropdownItem>
                    {/* "Settings" is gone rather than repointed: it linked to
                        /employer/settings and /candidate/settings, neither of
                        which exists, and the only real destination is the
                        account page "Profile" above already opens. */}
                    <DropdownItem href={user?.role === 'ROLE_EMPLOYER' ? '/employer/billing' : '/app/subscription'}>
                      <CreditCardIcon data-slot="icon" />
                      <span>Manage Subscription</span>
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                      <ArrowRightOnRectangleIcon data-slot="icon" />
                      <span>Sign out</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </SidebarSection>
            </SidebarFooter>
          </Sidebar>
        }
      >
        {children}
      </SidebarLayout>
    </>
  );
}
