import { useState } from 'react';
import { useRouter } from 'next/router';
import { XMarkIcon } from '@heroicons/react/24/outline';

const SettingsLayout = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  children 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="pb-5 border-b border-gray-200">
        <div className="md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account settings and preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* Mobile menu button */}
        <div className="sm:hidden mb-4">
          <button
            type="button"
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-3 inline-flex justify-between items-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="flex items-center">
              {activeTabData?.icon && (
                <activeTabData.icon className="mr-2 h-5 w-5 text-gray-500" />
              )}
              {activeTabData?.name || 'Select a tab'}
            </span>
            <svg
              className="-mr-1 ml-2 h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                  onClick={() => setMobileMenuOpen(false)}></div>
                <div className="relative flex-1 flex flex-col w-full max-w-xs bg-white">
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                    <nav className="px-2 space-y-1">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onTabChange(tab.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`${
                            activeTab === tab.id
                              ? 'bg-gray-100 text-orange-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center px-2 py-2 text-base font-medium rounded-md w-full`}
                        >
                          <tab.icon
                            className={`${
                              activeTab === tab.id ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'
                            } mr-4 flex-shrink-0 h-6 w-6`}
                            aria-hidden="true"
                          />
                          {tab.name}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Desktop sidebar */}
          <div className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-64">
              <nav className="flex-1 space-y-1 bg-white pr-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'bg-orange-50 border-orange-500 text-orange-700 hover:bg-orange-50 hover:text-orange-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group border-l-4 py-2 px-3 flex items-center text-sm font-medium w-full text-left rounded-r-md`}
                  >
                    <tab.icon
                      className={`${
                        activeTab === tab.id
                          ? 'text-orange-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-5 w-5`}
                      aria-hidden="true"
                    />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 md:ml-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {activeTabData?.title && (
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    {activeTabData.title}
                  </h2>
                  {activeTabData.description && (
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {activeTabData.description}
                    </p>
                  )}
                </div>
              )}
              <div className="px-4 py-5 sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
