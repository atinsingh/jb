import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { checkProfileCompletion } from '@/utils/profileCompletion';
import ProfileCompletionGauge from './ProfileCompletionGauge';
import ProfileCompletionWizard from './ProfileCompletionWizard';

export default function ProfileCompletionModal() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    if (user) {
      const result = checkProfileCompletion(user);
      setCompletion(result);
      
      // Only show modal if profile is incomplete and not already on profile page
      if (!result.isComplete && router.pathname !== '/candidate/profile' && router.pathname !== '/employer/profile') {
        setIsOpen(true);
      }
    }
  }, [user, router.pathname]);

  const handleClose = () => {
    setIsOpen(false);
    // Store in localStorage to not show again for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('profileCompletionDismissed', 'true');
    }
  };

  const handleCompleteProfile = () => {
    setIsOpen(false);
    setShowWizard(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    setIsOpen(false);
  };

  // Don't show if dismissed in this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('profileCompletionDismissed');
      if (dismissed === 'true') {
        setIsOpen(false);
      }
    }
  }, []);

  if (!isOpen || !completion || completion.isComplete) {
    return null;
  }

  return (
    <>
      <ProfileCompletionWizard 
        isOpen={showWizard} 
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Content */}
          <div className="text-center">
            <div className="mx-auto mb-4">
              <ProfileCompletionGauge percentage={completion.completionPercentage} size="md" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Complete Your Profile
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your profile is {completion.completionPercentage}% complete. Complete your profile to get better job matches and opportunities.
            </p>

            {/* Missing fields */}
            {completion.missingFields.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Missing information:</p>
                <ul className="list-disc list-inside space-y-1">
                  {completion.missingFields.map((field, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400">{field}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Maybe Later
              </button>
              <button
                onClick={handleCompleteProfile}
                className="flex-1 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600"
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

