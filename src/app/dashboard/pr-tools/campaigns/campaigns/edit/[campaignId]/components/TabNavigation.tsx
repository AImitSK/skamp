// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/TabNavigation.tsx
import React from 'react';
import {
  DocumentTextIcon,
  PaperClipIcon,
  UserGroupIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TabNavigationProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onGeneratePreview: () => void;
}

export default function TabNavigation({ currentStep, onStepChange, onGeneratePreview }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex space-x-8">
        <button
          type="button"
          onClick={() => onStepChange(1)}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
            currentStep === 1
              ? 'border-[#005fab] text-[#005fab]'
              : currentStep > 1
              ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Pressemeldung
          {currentStep > 1 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
        </button>

        <button
          type="button"
          onClick={() => onStepChange(2)}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
            currentStep === 2
              ? 'border-[#005fab] text-[#005fab]'
              : currentStep > 2
              ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <PaperClipIcon className="h-4 w-4 mr-2" />
          Anhänge
          {currentStep > 2 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
        </button>

        <button
          type="button"
          onClick={() => onStepChange(3)}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
            currentStep === 3
              ? 'border-[#005fab] text-[#005fab]'
              : currentStep > 3
              ? 'border-[#004a8c] text-[#004a8c] hover:text-[#003d7a]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <UserGroupIcon className="h-4 w-4 mr-2" />
          Freigaben
          {currentStep > 3 && <CheckCircleIcon className="ml-2 h-4 w-4 text-[#004a8c]" />}
        </button>

        <button
          type="button"
          onClick={onGeneratePreview}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
            currentStep === 4
              ? 'border-[#005fab] text-[#005fab]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <InformationCircleIcon className="h-4 w-4 mr-2" />
          Vorschau
        </button>
      </nav>
    </div>
  );
}
