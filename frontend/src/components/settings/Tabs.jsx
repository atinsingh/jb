import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const Tab = ({ tab, isActive, onClick }) => {
  const Icon = tab.icon;
  
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      className={`group inline-flex items-center px-4 py-3 border-b-2 font-medium text-sm ${
        isActive
          ? 'border-orange-500 text-orange-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={`-ml-0.5 mr-2 h-5 w-5 ${
          isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'
        }`}
        aria-hidden="true"
      />
      <span>{tab.name}</span>
    </button>
  );
};

export const Tabs = ({ tabs, activeTab, onTabChange, className = '' }) => {
  const router = useRouter();
  
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={onTabChange}
          />
        ))}
      </nav>
    </div>
  );
};

export const TabContent = ({ children, isActive }) => {
  if (!isActive) return null;
  
  return (
    <div className="py-6">
      {children}
    </div>
  );
};

export const TabPanel = ({ children, tabId, activeTab }) => {
  if (tabId !== activeTab) return null;
  
  return (
    <div className="py-6">
      {children}
    </div>
  );
};
