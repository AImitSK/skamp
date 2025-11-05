// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/PreviewTab.tsx
"use client";

import React, { useMemo } from 'react';
import {
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  LockClosedIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { CampaignPreviewStep } from '@/components/campaigns/CampaignPreviewStep';
import { PDFVersionHistory } from '@/components/campaigns/PDFVersionHistory';
import { PipelinePDFViewer } from '@/components/campaigns/PipelinePDFViewer';
import { EDIT_LOCK_CONFIG } from '@/types/pr';
import { useCampaign } from '../context/CampaignContext';
import { toastService } from '@/lib/utils/toast';

interface ApprovalWorkflowResult {
  workflowId: string;
  pdfVersionId: string;
  shareableLinks?: {
    team?: string;
    customer?: string;
  };
}

interface PreviewTabProps {
  organizationId: string;
  campaignId: string;
}

export default React.memo(function PreviewTab({
  organizationId,
  campaignId
}: PreviewTabProps) {
  // Get all state from Context
  const {
    campaign,
    campaignTitle,
    editorContent,
    keyVisual,
    keywords,
    boilerplateSections,
    attachedAssets,
    seoScore,
    selectedCompanyName,
    approvalData,
    selectedTemplateId,
    updateSelectedTemplate,
    currentPdfVersion,
    generatingPdf,
    generatePdf,
    editLockStatus
  } = useCampaign();

  // Computed values
  const finalContentHtml = useMemo(() => {
    // Combine editorContent with boilerplateSections to create finalContentHtml
    let html = editorContent;

    if (boilerplateSections.length > 0) {
      const boilerplateHtml = boilerplateSections
        .map(section => section.content)
        .join('\n');
      html = `${html}\n${boilerplateHtml}`;
    }

    return html;
  }, [editorContent, boilerplateSections]);

  // Approval Workflow wird in separater Task implementiert
  const approvalWorkflowResult = null as ApprovalWorkflowResult | null;

  return (
    <div className="bg-white rounded-lg border p-6">

      {/* PDF-WORKFLOW STATUS BANNER */}
      {approvalWorkflowResult?.workflowId && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Freigabe-Workflow aktiv
              </h4>
              <Text className="text-sm text-green-700 mb-3">
                Die Kampagne befindet sich im Freigabe-Prozess. Links wurden versendet.
              </Text>

              <div className="flex flex-wrap gap-2">
                {approvalWorkflowResult?.shareableLinks?.team && (
                  <Button
                    plain
                    onClick={() => window.open(approvalWorkflowResult?.shareableLinks?.team!, '_blank')}
                    className="text-xs text-green-700 hover:text-green-800"
                  >
                    <UserGroupIcon className="h-3 w-3 mr-1" />
                    Team-Link öffnen
                  </Button>
                )}

                {approvalWorkflowResult?.shareableLinks?.customer && (
                  <Button
                    plain
                    onClick={() => window.open(approvalWorkflowResult?.shareableLinks?.customer!, '_blank')}
                    className="text-xs text-green-700 hover:text-green-800"
                  >
                    <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                    Kunden-Link öffnen
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Vorschau - Mit CampaignPreviewStep Komponente */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live-Vorschau</h3>

        <CampaignPreviewStep
          campaignTitle={campaignTitle}
          finalContentHtml={finalContentHtml}
          keyVisual={keyVisual}
          selectedCompanyName={selectedCompanyName}
          realPrScore={seoScore}
          keywords={keywords}
          boilerplateSections={boilerplateSections}
          attachedAssets={attachedAssets}
          editorContent={editorContent}
          approvalData={approvalData}
          organizationId={organizationId}
          selectedTemplateId={selectedTemplateId}
          onTemplateSelect={updateSelectedTemplate}
          showTemplateSelector={true}
        />
      </div>

      {/* PDF-Vorschau und Versionen-Historie */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">PDF-Vorschau und Versionen</h3>

          {/* WORKFLOW-STATUS INDICATOR */}
          {approvalWorkflowResult?.pdfVersionId ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircleIcon className="h-4 w-4" />
              <span>PDF für Freigabe erstellt</span>
            </div>
          ) : !editLockStatus.isLocked ? (
            <Button
              type="button"
              onClick={() => generatePdf()}
              disabled={generatingPdf}
              color="secondary"
            >
              {generatingPdf ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  PDF wird erstellt...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  PDF generieren
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LockClosedIcon className="h-4 w-4" />
              PDF-Erstellung gesperrt - {editLockStatus.reason ? EDIT_LOCK_CONFIG[editLockStatus.reason]?.label : 'Bearbeitung nicht möglich'}
            </div>
          )}
        </div>

        {/* Aktuelle PDF-Version */}
        {currentPdfVersion && (
          <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Vorschau PDF</span>
                    <Badge color="blue" className="text-xs">
                      {approvalWorkflowResult?.pdfVersionId ? 'Freigabe-PDF' : 'Aktuell'}
                    </Badge>
                  </div>
                  {approvalWorkflowResult?.workflowId && (
                    <div className="text-sm text-blue-700">
                      Workflow aktiv
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  color={currentPdfVersion.status === 'draft' ? 'zinc' :
                        currentPdfVersion.status === 'approved' ? 'green' : 'amber'}
                  className="text-xs"
                >
                  {currentPdfVersion.status === 'draft' ? 'Entwurf' :
                   currentPdfVersion.status === 'approved' ? 'Freigegeben' : 'Freigabe angefordert'}
                </Badge>

                <Button
                  type="button"
                  plain
                  onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}
                  className="!text-gray-600 hover:!text-gray-900 text-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PDF-Hinweis */}
        {!currentPdfVersion && (
          <div className="text-center py-6 text-gray-500">
            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Noch keine PDF-Version erstellt</p>
            <p className="text-sm">Klicken Sie auf &ldquo;PDF generieren&rdquo; um eine Vorschau zu erstellen</p>
          </div>
        )}

        {/* PDF-Versionen Historie - innerhalb derselben Box */}
        {campaignId && organizationId && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-base font-semibold mb-4 text-gray-900">
              PDF-Versionen Historie
            </h4>
            <PDFVersionHistory
              campaignId={campaignId}
              organizationId={organizationId}
              showActions={true}
            />
          </div>
        )}
      </div>

      {/* ✅ Plan 2/9: Pipeline-PDF-Viewer für Projekt-verknüpfte Kampagnen */}
      {campaign?.projectId && organizationId && (
        <div className="mt-8">
          <PipelinePDFViewer
            campaign={campaign}
            organizationId={organizationId}
            onPDFGenerated={(pdfUrl: string) => {
              toastService.success('Pipeline-PDF erfolgreich generiert');
            }}
          />
        </div>
      )}

    </div>
  );
});
