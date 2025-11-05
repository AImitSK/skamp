// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/AttachmentsTab.tsx
"use client";

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { FieldGroup } from '@/components/ui/fieldset';
import { Button } from '@/components/ui/button';
import SimpleBoilerplateLoader from '@/components/pr/campaign/SimpleBoilerplateLoader';
import { useCampaign } from '../context/CampaignContext';
import { MediaList } from './components/MediaList';
import { MediaEmptyState } from './components/MediaEmptyState';

interface AttachmentsTabProps {
  // Organization & Client (Infrastructure)
  organizationId: string;

  // UI Callbacks
  onOpenAssetSelector: () => void;
}

export default React.memo(function AttachmentsTab({
  organizationId,
  onOpenAssetSelector
}: AttachmentsTabProps) {
  // Phase 3: Get all state from Context
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    boilerplateSections,
    updateBoilerplateSections,
    attachedAssets,
    removeAsset
  } = useCampaign();
  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Textbausteine */}
        <div className="mb-6">
          <SimpleBoilerplateLoader
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            onSectionsChange={updateBoilerplateSections}
            initialSections={boilerplateSections}
          />
        </div>

        {/* Medien */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Medien</h3>
              <Button
                type="button"
                onClick={onOpenAssetSelector}
                color="secondary"
                className="text-sm px-3 py-1.5"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Medien hinzufügen
              </Button>
            </div>

            {attachedAssets.length > 0 ? (
              <MediaList attachments={attachedAssets} onRemove={removeAsset} />
            ) : (
              <MediaEmptyState onAddMedia={onOpenAssetSelector} />
            )}
          </div>
        </div>
      </FieldGroup>
    </div>
  );
});
