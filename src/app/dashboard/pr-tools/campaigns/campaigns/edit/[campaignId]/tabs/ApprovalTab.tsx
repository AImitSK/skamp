// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ApprovalTab.tsx
"use client";

import React from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { FieldGroup } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';
import ApprovalSettings from '@/components/campaigns/ApprovalSettings';
import { useCampaign } from '../context/CampaignContext';
import { useMemo } from 'react';

interface PDFWorkflowPreview {
  enabled: boolean;
  estimatedSteps: string[];
}

interface ApprovalTabProps {
  // Organization (Infrastructure)
  organizationId: string;
}

export default React.memo(function ApprovalTab({
  organizationId
}: ApprovalTabProps) {
  // Phase 3: Get all state from Context
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    approvalData,
    updateApprovalData,
    previousFeedback
  } = useCampaign();

  // Computed: PDF Workflow Preview
  const pdfWorkflowPreview: PDFWorkflowPreview = useMemo(() => {
    const enabled = approvalData?.customerApprovalRequired || false;
    const estimatedSteps: string[] = [];

    if (enabled) {
      estimatedSteps.push('1. PDF wird automatisch generiert');
      estimatedSteps.push('2. Freigabe-Link wird an Kunde versendet');
      estimatedSteps.push('3. Kunde kann PDF prüfen und freigeben');
    }

    return { enabled, estimatedSteps };
  }, [approvalData]);
  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Freigabe-Einstellungen */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Freigabe-Einstellungen</h3>
            <p className="text-sm text-gray-600 mt-1">
              Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.
            </p>
          </div>
          <ApprovalSettings
            value={approvalData}
            onChange={updateApprovalData}
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            previousFeedback={previousFeedback}
          />
        </div>

        {/* PDF-WORKFLOW STATUS PREVIEW */}
        {pdfWorkflowPreview.enabled && (
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
                  {pdfWorkflowPreview.estimatedSteps.map((step, index) => (
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
        )}
      </FieldGroup>
    </div>
  );
});
