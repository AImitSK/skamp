// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/PDFWorkflowPreview.tsx
"use client";

import React from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';

interface PDFWorkflowPreviewProps {
  enabled: boolean;
  estimatedSteps: string[];
}

/**
 * PDFWorkflowPreview Komponente
 *
 * Zeigt eine Vorschau des PDF-Freigabe-Workflows an, wenn Kundenfreigabe aktiviert ist.
 * Informiert den User über die automatischen Schritte, die beim Speichern ausgeführt werden.
 *
 * @param enabled - Ob der PDF-Workflow aktiviert ist (customerApprovalRequired)
 * @param estimatedSteps - Array von Workflow-Schritten, die angezeigt werden
 */
export const PDFWorkflowPreview = React.memo(function PDFWorkflowPreview({ enabled, estimatedSteps }: PDFWorkflowPreviewProps) {
  if (!enabled) return null;

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
      <div className="flex items-start">
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            ✅ PDF-Workflow bereit
          </h4>
          <Text className="text-sm text-green-700 mb-3">
            Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:
          </Text>

          <div className="space-y-2">
            {estimatedSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                <ArrowRightIcon className="h-4 w-4" />
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-green-300">
            <Text className="text-xs text-green-600">
              💡 Tipp: Nach dem Speichern finden Sie alle Freigabe-Links und den aktuellen
              Status in Step 4 &ldquo;Vorschau&rdquo;.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
});
