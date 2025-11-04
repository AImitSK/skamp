// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ContentTab.tsx
"use client";

import React from 'react';
import { ExclamationTriangleIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { FieldGroup } from '@/components/ui/fieldset';
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
import { KeyVisualSection } from '@/components/campaigns/KeyVisualSection';
import { useCampaign } from '../context/CampaignContext';

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
  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Letzte Änderungsanforderung anzeigen */}
      {previousFeedback && previousFeedback.length > 0 && (() => {
        const lastCustomerFeedback = [...previousFeedback]
          .reverse()
          .find(f => f.author === 'Kunde');

        if (lastCustomerFeedback) {
          return (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">
                    Letzte Änderungsanforderung vom Kunden
                  </h4>
                  <p className="text-sm text-yellow-800">
                    {lastCustomerFeedback.comment}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {lastCustomerFeedback.requestedAt?.toDate ?
                      new Date(lastCustomerFeedback.requestedAt.toDate()).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) :
                      ''
                    }
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <FieldGroup>
        {/* Pressemeldung */}
        <div className="mb-8 mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pressemeldung</h3>

            {/* KI-Assistent CTA */}
            <button
              type="button"
              onClick={onOpenAiModal}
              className="w-full mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <SparklesIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white mb-1">
                      Schnellstart mit dem KI-Assistenten
                    </p>
                    <p className="text-sm text-indigo-100">
                      Erstelle einen kompletten Rohentwurf mit Titel, Lead-Absatz, Haupttext und Zitat in Sekunden
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ArrowRightIcon className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Content Composer mit SEO-Features */}
            <CampaignContentComposer
              key={`composer-${boilerplateSections.length}`}
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
              onSeoScoreChange={(scoreData: any) => {
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
              }}
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
