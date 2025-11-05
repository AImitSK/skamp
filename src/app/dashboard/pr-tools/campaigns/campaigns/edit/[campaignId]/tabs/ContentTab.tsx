// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ContentTab.tsx
"use client";

import React, { useCallback, useMemo } from 'react';
import { FieldGroup } from '@/components/ui/fieldset';
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
import { KeyVisualSection } from '@/components/campaigns/KeyVisualSection';
import { useCampaign } from '../context/CampaignContext';
import { CustomerFeedbackAlert } from './components/CustomerFeedbackAlert';
import { AiAssistantCTA } from './components/AiAssistantCTA';

interface ContentTabProps {
  // Organization & User (Infrastructure)
  organizationId: string;
  userId: string;
  campaignId: string;

  // UI Callbacks
  onOpenAiModal: () => void;
  onSeoScoreChange: (scoreData: any) => void;
}

export default React.memo(function ContentTab({
  organizationId,
  userId,
  campaignId,
  onOpenAiModal,
  onSeoScoreChange
}: ContentTabProps) {
  // Phase 3: Get all state from Context
  const {
    campaignTitle,
    updateTitle,
    editorContent,
    updateEditorContent,
    pressReleaseContent,
    updatePressReleaseContent,
    boilerplateSections,
    updateBoilerplateSections,
    keywords,
    updateKeywords,
    keyVisual,
    updateKeyVisual,
    selectedCompanyId,
    selectedCompanyName,
    selectedProjectId,
    selectedProjectName,
    previousFeedback
  } = useCampaign();

  // Performance-Optimierung: useCallback für SEO Score Handler
  const handleSeoScoreChange = useCallback((scoreData: any) => {
    // Stelle sicher, dass social Property vorhanden ist
    if (scoreData && scoreData.breakdown) {
      onSeoScoreChange({
        ...scoreData,
        breakdown: {
          ...scoreData.breakdown,
          social: scoreData.breakdown.social || 0
        }
      });
    } else {
      onSeoScoreChange(scoreData);
    }
  }, [onSeoScoreChange]);

  // Performance-Optimierung: useMemo für Composer Key
  const composerKey = useMemo(
    () => `composer-${boilerplateSections.length}`,
    [boilerplateSections.length]
  );

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Letzte Änderungsanforderung anzeigen */}
      <CustomerFeedbackAlert feedback={previousFeedback || []} />

      <FieldGroup>
        {/* Pressemeldung */}
        <div className="mb-8 mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pressemeldung</h3>

            {/* KI-Assistent CTA */}
            <AiAssistantCTA onOpenAiModal={onOpenAiModal} />

            {/* Content Composer mit SEO-Features */}
            <CampaignContentComposer
              key={composerKey}
              organizationId={organizationId}
              clientId={selectedCompanyId}
              clientName={selectedCompanyName}
              title={campaignTitle}
              onTitleChange={updateTitle}
              mainContent={editorContent}
              onMainContentChange={updateEditorContent}
              onFullContentChange={updatePressReleaseContent}
              onBoilerplateSectionsChange={updateBoilerplateSections}
              initialBoilerplateSections={boilerplateSections}
              hideMainContentField={false}
              hidePreview={true}
              hideBoilerplates={true}
              keywords={keywords}
              onKeywordsChange={updateKeywords}
              onSeoScoreChange={handleSeoScoreChange}
            />
          </div>
        </div>

        {/* Key Visual */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <KeyVisualSection
              value={keyVisual}
              onChange={updateKeyVisual}
              clientId={selectedCompanyId}
              clientName={selectedCompanyName}
              organizationId={organizationId}
              userId={userId}
              // Campaign Smart Router Props für strukturierte Uploads
              campaignId={campaignId}
              campaignName={campaignTitle}
              selectedProjectId={selectedProjectId}
              selectedProjectName={selectedProjectName}
              enableSmartRouter={true}
            />
          </div>
        </div>
      </FieldGroup>
    </div>
  );
});
