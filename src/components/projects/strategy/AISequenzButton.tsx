'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface DNASynthese {
  id: string;
  content: string;
  plainText?: string;
  createdAt: any;
  updatedAt: any;
}

interface Kernbotschaft {
  id: string;
  content: string;
  createdAt: any;
  updatedAt: any;
}

interface AISequenzButtonProps {
  projectId: string;
  dnaSynthese: DNASynthese;
  kernbotschaft: Kernbotschaft;
  onGenerate?: () => void;
  isLoading?: boolean;
}

export function AISequenzButton({
  projectId,
  dnaSynthese,
  kernbotschaft,
  onGenerate,
  isLoading = false,
}: AISequenzButtonProps) {
  const t = useTranslations('markenDNA');

  const handleGenerateClick = () => {
    if (onGenerate) {
      onGenerate();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-zinc-900">AI Sequenz</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-center py-6">
          <p className="text-sm text-zinc-600 mb-4">
            Generiere die strategische Text-Matrix aus DNA Synthese und Kernbotschaft.
          </p>

          <Button
            onClick={handleGenerateClick}
            disabled={isLoading}
            className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg font-medium transition-colors"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            {isLoading ? 'Generiere...' : 'AI Sequenz starten'}
          </Button>

          {/* Erklärung */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Was passiert:</strong> Die AI Sequenz kombiniert die DNA Synthese (~500 Tokens)
              mit der Kernbotschaft und erstellt daraus eine strategische Text-Matrix (Roh-Skelett)
              für Ihre Pressemeldung.
            </p>
          </div>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-zinc-500">Text-Matrix wird generiert...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
