'use client'

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { 
  UserIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  TrophyIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const STEPS = [
  { id: 'personal', label: 'Personal', icon: UserIcon },
  { id: 'summary', label: 'Summary', icon: DocumentTextIcon },
  { id: 'skills', label: 'Skills', icon: SparklesIcon },
  { id: 'experience', label: 'Experience', icon: BriefcaseIcon },
  { id: 'education', label: 'Education', icon: AcademicCapIcon },
  { id: 'certifications', label: 'Certifications', icon: TrophyIcon },
  { id: 'references', label: 'References', icon: UserGroupIcon },
];

export default function ResumeStepper({ currentStep, completedSteps = [], onStepClick }) {
  const getStepIndex = (stepId) => STEPS.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);
  
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => onStepClick?.(step.id)}
              className={`relative flex flex-col items-center flex-1 group ${
                isCurrent ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="absolute top-5 left-[60%] right-[-40%] h-0.5 z-0">
                  <div className={`h-full transition-all duration-300 ${
                    isCompleted || isPast 
                      ? 'bg-blue-600' 
                      : 'bg-zinc-200'
                  }`} />
                </div>
              )}
              
              {/* Step Circle */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                isCurrent
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : isCompleted
                  ? 'bg-blue-50 border-blue-600 text-blue-600'
                  : 'bg-white border-zinc-300 text-zinc-400'
              }`}>
                {isCompleted && !isCurrent ? (
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                ) : (
                  <Icon className={`w-5 h-5 ${
                    isCurrent ? 'text-white' : isCompleted ? 'text-blue-600' : 'text-zinc-400'
                  }`} />
                )}
              </div>
              
              {/* Step Label */}
              <span className={`mt-2 text-xs font-medium transition-colors ${
                isCurrent
                  ? 'text-blue-600'
                  : isCompleted
                  ? 'text-zinc-700'
                  : 'text-zinc-400'
              }`}>
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

