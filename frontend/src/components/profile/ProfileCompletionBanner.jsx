import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { checkProfileCompletion } from '@/utils/profileCompletion';
import ProfileCompletionGauge from './ProfileCompletionGauge';
import ProfileCompletionWizard from './ProfileCompletionWizard';

export default function ProfileCompletionBanner() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    if (user) {
      const result = checkProfileCompletion(user);
      setCompletion(result);
      
      // Only show banner if profile is incomplete and not on profile page
      if (!result.isComplete && router.pathname !== '/candidate/profile' && router.pathname !== '/employer/profile') {
        // Check if dismissed in localStorage
        const dismissed = localStorage.getItem(`profileBannerDismissed_${user.id}`);
        if (!dismissed) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(false);
      }
    }
  }, [user, router.pathname]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (refreshUser) {
        refreshUser();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate);
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate);
      };
    }
  }, [refreshUser]);

  const handleClose = () => {
    setIsVisible(false);
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(`profileBannerDismissed_${user.id}`, 'true');
    }
  };

  const handleCompleteProfile = () => {
    setShowWizard(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    setIsVisible(false);
  };

  if (!isVisible || !completion || completion.isComplete) {
    return null;
  }

  return (
    <>
      <ProfileCompletionWizard 
        isOpen={showWizard} 
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />
      <div className="relative bg-pink-50 dark:bg-pink-900/10 border-l-4 border-red-500 dark:border-red-400 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Left: Circular Progress Indicator */}
          <div className="flex-shrink-0 relative">
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - completion.completionPercentage / 100)}`}
                  className="text-red-500 dark:text-red-400 transition-all duration-500"
                />
              </svg>
              {/* Percentage text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {completion.completionPercentage}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Complete
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1.5">
              Complete your profile to get better matches
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your profile is <span className="font-medium">{completion.completionPercentage}%</span> complete.{' '}
              {completion.missingFields.length > 0 && (
                <span>
                  Missing: <span className="font-medium">{completion.missingFields.slice(0, 3).join(', ')}</span>
                  {completion.missingFields.length > 3 && (
                    <span> +{completion.missingFields.length - 3} more</span>
                  )}
                </span>
              )}
            </p>
          </div>

          {/* Right: Action Button and Close */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <button
              onClick={handleCompleteProfile}
              className="bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
            >
              Complete Now
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

