import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import logo from '@/assets/advocate_logo.png';
import {
  HomeIcon,
  BriefcaseIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

function EmployerLayoutContent({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  
  const dashboardHome = '/employer/dashboard';

  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/employer/dashboard', icon: HomeIcon },
    { name: 'Jobs', href: '/employer/jobs', icon: BriefcaseIcon },
    { name: 'Candidates', href: '/employer/candidates', icon: UsersIcon },
    { name: 'Interviews', href: '/employer/interviews', icon: CalendarIcon },
    { name: 'Messages', href: '/employer/messages', icon: ChatBubbleLeftIcon },
    { name: 'Company', href: '/employer/company', icon: BuildingOfficeIcon },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  function isActive(href) {
    return router.pathname === href ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-600' : 'text-gray-700 hover:bg-gray-100';
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
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
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive(item.href)}`}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-6 border-b border-gray-100">
            <Link href={dashboardHome} className="flex items-center">
              <div className="relative w-32 h-12">
                <Image 
                  src={logo} 
                  alt="Jobocate Logo" 
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive(item.href)}`}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow-sm border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500 lg:hidden"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-end px-4">
            <div className="ml-4 flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <BellIcon className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center text-sm focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  </div>
                </button>
                {isProfileOpen && (
                  <div ref={profileRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link href="/employer/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <UserCircleIcon className="mr-3 h-5 w-5" />
                      Profile
                    </Link>
                    <Link href="/employer/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Cog6ToothIcon className="mr-3 h-5 w-5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}

export default function EmployerLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['ROLE_EMPLOYER']}>
      <EmployerLayoutContent>{children}</EmployerLayoutContent>
    </ProtectedRoute>
  );
}
