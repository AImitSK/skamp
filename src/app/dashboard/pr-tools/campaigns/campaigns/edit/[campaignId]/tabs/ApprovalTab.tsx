// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ApprovalTab.tsx
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FieldGroup } from '@/components/ui/fieldset';
import ApprovalSettings from '@/components/campaigns/ApprovalSettings';
import { useCampaign } from '../context/CampaignContext';
import { PDFWorkflowPreview } from './components/PDFWorkflowPreview';
import { approvalService } from '@/lib/firebase/approval-service';

interface ApprovalTabProps {
  // Organization (Infrastructure)
  organizationId: string;
  campaignId: string;
}

export default React.memo(function ApprovalTab({
  organizationId,
  campaignId
}: ApprovalTabProps) {
  const t = useTranslations('campaigns.edit.tabs.approval');

  // Phase 3: Get all state from Context
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    approvalData,
    updateApprovalData,
    previousFeedback
  } = useCampaign();

  // Load current approval for this campaign
  const [currentApproval, setCurrentApproval] = useState<any>(null);
  const [approvalRefreshKey, setApprovalRefreshKey] = useState(0);

  useEffect(() => {
    const loadApproval = async () => {
      if (!campaignId || !organizationId) return;

      try {
        const approval = await approvalService.getApprovalByCampaignId(
          campaignId,
          organizationId
        );
        setCurrentApproval(approval);
      } catch (error) {
        // Keine Approval gefunden ist ok
        setCurrentApproval(null);
      }
    };

    loadApproval();
  }, [campaignId, organizationId, approvalRefreshKey]);

  // Expose refresh function via window for page.tsx to trigger reload
  useEffect(() => {
    (window as any).refreshApprovalTab = () => {
      setApprovalRefreshKey(prev => prev + 1);
    };
    return () => {
      delete (window as any).refreshApprovalTab;
    };
  }, []);

  // Computed: PDF Workflow Preview Data
  const pdfWorkflowData = useMemo(() => {
    const enabled = approvalData?.customerApprovalRequired || false;
    const estimatedSteps: string[] = [];

    if (enabled) {
      estimatedSteps.push(t('workflow.step1'));
      estimatedSteps.push(t('workflow.step2'));
      estimatedSteps.push(t('workflow.step3'));
    }

    return { enabled, estimatedSteps };
  }, [approvalData, t]);
  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Freigabe-Einstellungen */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('description')}
            </p>
          </div>
          <ApprovalSettings
            value={approvalData}
            onChange={updateApprovalData}
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            previousFeedback={previousFeedback}
            currentApproval={currentApproval}
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
