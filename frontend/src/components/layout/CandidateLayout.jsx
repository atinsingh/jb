import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import logo from '@/assets/advocate_logo.png';
import {
  HomeIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

function CandidateLayoutContent({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  
  const dashboardHome = '/candidate/dashboard';

  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/candidate/dashboard', icon: HomeIcon },
    { name: 'Find Jobs', href: '/candidate/recommendations', icon: BriefcaseIcon },
    { name: 'Applications', href: '/candidate/applications', icon: DocumentTextIcon },
    { name: 'Resume Builder', href: '/candidate/resume-builder', icon: DocumentDuplicateIcon },
    { name: 'Cover Letter', href: '/candidate/cover-letter', icon: SparklesIcon },
  ];

  // Secondary navigation
  const secondaryNavigation = [
    { name: 'Billing', href: '/candidate/billing', icon: CreditCardIcon },
    { name: 'Settings', href: '/candidate/settings', icon: Cog6ToothIcon },
  ];

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className="lg:hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-600"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <Link href={dashboardHome} className="flex items-center">
            <div className="relative w-24 h-8">
              <Image 
                src={logo} 
                alt="Jobocate Logo" 
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          </Link>
          <div className="w-6"></div> {/* For alignment */}
        </div>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 z-30 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <Link href={dashboardHome} className="flex items-center">
                <div className="relative w-28 h-10">
                  <Image 
                    src={logo} 
                    alt="Jobocate Logo" 
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    router.pathname === item.href || router.pathname.startsWith(item.href + '/')
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              
              {/* Divider */}
              <div className="my-4 border-t border-gray-200"></div>
              
              {/* Secondary Navigation */}
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    router.pathname === item.href || router.pathname.startsWith(item.href + '/')
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center w-full text-left rounded-md hover:bg-gray-50 p-2"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      {user?.name ? (
                        <span className="text-xs font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">View profile</p>
                  </div>
                </button>
                {isProfileOpen && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-md shadow-lg overflow-hidden z-10">
                    <Link
                      href="/candidate/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:pl-64">
          {/* Header */}
          <header className="bg-white shadow-sm hidden lg:block">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {[...navigation, ...secondaryNavigation].find((item) => 
                  router.pathname === item.href || router.pathname.startsWith(item.href + '/')
                )?.name || 'Dashboard'}
              </h1>
              <div className="flex items-center space-x-4">
                <button className="p-1 text-gray-500 hover:text-gray-600">
                  <BellIcon className="h-6 w-6" />
                </button>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3"
                  >
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || 'User'}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        {user?.name ? (
                          <span className="text-xs font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <UserIcon className="h-5 w-5" />
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name || 'User'}
                    </span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10">
                      <Link
                        href="/candidate/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function CandidateLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['ROLE_CANDIDATE']}>
      <CandidateLayoutContent>{children}</CandidateLayoutContent>
    </ProtectedRoute>
  );
}
