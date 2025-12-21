'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentTextIcon,
  PencilIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

// Helper function to format date
function formatDate(date: any): string {
  if (!date) return '';

  // Handle Firestore Timestamp
  const dateObj = date?.toDate ? date.toDate() : new Date(date);

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

// TODO: TextMatrix Type aus types/project-strategy.ts importieren wenn vorhanden
interface TextMatrix {
  id: string;
  content: string;
  createdAt: any;
  updatedAt: any;
  finalizedAt?: any;
}

interface TextMatrixSectionProps {
  textMatrix: TextMatrix;
  onEdit: () => void;
  onRework: () => void;
  onFinalize?: () => void;
  isLoading?: boolean;
}

export function TextMatrixSection({
  textMatrix,
  onEdit,
  onRework,
  onFinalize,
  isLoading = false,
}: TextMatrixSectionProps) {
  const t = useTranslations('markenDNA');

  const handleFinalizeClick = () => {
    if (confirm(t('textMatrix.confirmFinalize'))) {
      if (onFinalize) {
        onFinalize();
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-zinc-900">📋 Strategische Text-Matrix (Roh-Skelett)</h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onEdit}
            disabled={isLoading}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-10 px-4 rounded-lg font-medium transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
          <Button
            onClick={onRework}
            disabled={isLoading}
            className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-10 px-4 rounded-lg font-medium transition-colors"
          >
            <SparklesIcon className="h-4 w-4 mr-1" />
            Mit AI Sequenz umarbeiten
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Text-Matrix Inhalt (Roh-Skelett) */}
        <div
          className="prose prose-sm max-w-none bg-amber-50 rounded p-4 border border-amber-200"
          dangerouslySetInnerHTML={{ __html: textMatrix.content }}
        />

        {/* Info-Box */}
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800 mb-0">
            ℹ️ Dies ist ein KI-generiertes Roh-Skelett. Prüfen Sie den Text sorgfältig,
            bevor Sie ihn als finale Pressemeldung freigeben.
          </p>
        </div>
      </div>

      {/* Human Sign-off Section */}
      {!textMatrix.finalizedAt && (
        <div className="p-4 border-t border-zinc-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-zinc-600 flex-1 mr-4">
            <p className="font-medium mb-1">📰 Als Pressemeldung finalisieren</p>
            <p className="text-xs">
              Dieser Button signalisiert: Der Mensch hat die Matrix geprüft und gibt den
              finalen Sign-off. Erst danach gilt der Text als fertige Pressemeldung.
            </p>
          </div>
          <Button
            onClick={handleFinalizeClick}
            disabled={isLoading}
            className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Human Sign-off
          </Button>
        </div>
      )}

      {/* Footer mit Zeitstempel */}
      <div className="p-4 border-t border-zinc-200 text-sm text-zinc-500">
        Zuletzt aktualisiert: {formatDate(textMatrix.updatedAt)}
        {textMatrix.finalizedAt && (
          <span className="ml-2 text-green-600 font-medium">
            · Finalisiert am {formatDate(textMatrix.finalizedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
