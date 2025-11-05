// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/AttachmentsTab.tsx
"use client";

import React from 'react';
import {
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { FieldGroup } from '@/components/ui/fieldset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SimpleBoilerplateLoader from '@/components/pr/campaign/SimpleBoilerplateLoader';
import { toastService } from '@/lib/utils/toast';
import { useCampaign } from '../context/CampaignContext';

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
              {clientId && (
                <Button
                  type="button"
                  onClick={onOpenAssetSelector}
                  color="secondary"
                  className="text-sm px-3 py-1.5"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Medien hinzufügen
                </Button>
              )}
            </div>

            {attachedAssets.length > 0 ? (
              <div className="space-y-2">
                {attachedAssets.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {attachment.type === 'folder' ? (
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                      ) : attachment.metadata.fileType?.startsWith('image/') ? (
                        <img
                          src={attachment.metadata.thumbnailUrl}
                          alt={attachment.metadata.fileName}
                          className="h-8 w-8 object-cover rounded"
                        />
                      ) : (
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {attachment.metadata.fileName || attachment.metadata.folderName}
                        </p>
                        {attachment.type === 'folder' && (
                          <Badge color="blue" className="text-xs">Ordner</Badge>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAsset(attachment.assetId || attachment.folderId || '')}
                      className="text-red-600 hover:text-red-500"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
                onClick={() => {
                  if (clientId) {
                    onOpenAssetSelector();
                  } else {
                    // Zeige Fehlermeldung wenn kein Kunde ausgewählt
                    toastService.error('Bitte wählen Sie zuerst einen Kunden aus, um Medien hinzuzufügen');
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center">
                  <PhotoIcon className="h-10 w-10 text-gray-400 group-hover:text-[#005fab] mb-2" />
                  <p className="text-gray-600 group-hover:text-[#005fab] font-medium">
                    {clientId ? 'Medien hinzufügen' : 'Zuerst Kunden auswählen'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {clientId ? 'Klicken zum Auswählen' : 'Wählen Sie einen Kunden aus'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </FieldGroup>
    </div>
  );
});
