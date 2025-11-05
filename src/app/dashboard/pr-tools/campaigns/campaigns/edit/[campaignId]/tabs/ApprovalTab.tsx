// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ApprovalTab.tsx
"use client";

import React, { useMemo } from 'react';
import { FieldGroup } from '@/components/ui/fieldset';
import ApprovalSettings from '@/components/campaigns/ApprovalSettings';
import { useCampaign } from '../context/CampaignContext';
import { PDFWorkflowPreview } from './components/PDFWorkflowPreview';

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

  // Computed: PDF Workflow Preview Data
  const pdfWorkflowData = useMemo(() => {
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

        {/* PDF-Workflow Preview */}
        <PDFWorkflowPreview
          enabled={pdfWorkflowData.enabled}
          estimatedSteps={pdfWorkflowData.estimatedSteps}
        />
      </FieldGroup>
    </div>
  );
});
