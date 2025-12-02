// src/components/projects/edit/steps/CampaignsEditStep.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { projectService } from '@/lib/firebase/project-service';
import { useAuth } from '@/context/AuthContext';
import { CampaignsEditStepProps } from './types';
import { Alert } from '@/components/common/Alert';

export default function CampaignsEditStep({
  project,
  organizationId,
  formData
}: CampaignsEditStepProps) {
  const { user } = useAuth();
  const [linkedCampaigns, setLinkedCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createNewCampaign, setCreateNewCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLinkedCampaigns();
  }, [project.id]);

  const loadLinkedCampaigns = async () => {
    if (!project.id) return;

    try {
      setIsLoading(true);
      const campaigns = await projectService.getLinkedCampaigns(project.id, {
        organizationId: organizationId
      });
      setLinkedCampaigns(campaigns);
    } catch (error) {
      console.error('Fehler beim Laden der Kampagnen:', error);
      setLinkedCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignTitle.trim() || !user || !project.id) return;

    try {
      setIsCreating(true);
      setError(null);

      const { prService } = await import('@/lib/firebase/pr-service');
      const campaignData = {
        title: campaignTitle.trim(),
        organizationId: organizationId,
        userId: user.uid,
        clientId: formData.clientId || '',
        projectId: project.id,
        projectTitle: formData.title,
        status: 'draft' as any,
        contentHtml: '<p>Automatisch erstellt durch Projekt-Edit</p>',
        distributionListId: '',
        distributionListName: 'Standard-Liste',
        recipientCount: 0,
        approvalRequired: false
      };

      const campaignId = await prService.create(campaignData);

      // Kampagne zu Projekt verlinken
      await projectService.addLinkedCampaign(project.id, campaignId, {
        organizationId: organizationId,
        userId: user.uid
      });

      // Reload campaigns
      await loadLinkedCampaigns();

      // Reset form
      setCreateNewCampaign(false);
      setCampaignTitle('');

      setSuccessMessage(`Kampagne "${campaignTitle.trim()}" wurde erfolgreich erstellt und verknüpft.`);
    } catch (error: any) {
      console.error('Fehler beim Erstellen der Kampagne:', error);
      setError(`Fehler beim Erstellen der Kampagne: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <FieldGroup>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Verknüpfte Kampagnen</h3>
          <Text className="text-sm text-gray-600">
            Verwalten Sie PR-Kampagnen, die mit diesem Projekt verknüpft sind.
          </Text>
        </div>

        {/* Bestehende Kampagnen anzeigen */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Lade Kampagnen...</p>
          </div>
        ) : linkedCampaigns.length > 0 ? (
          <div className="space-y-3">
            {linkedCampaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{campaign.title}</h4>
                  <p className="text-xs text-gray-500">
                    Status: {campaign.status === 'draft' ? 'Entwurf' :
                            campaign.status === 'approved' ? 'Freigegeben' :
                            campaign.status === 'sent' ? 'Versendet' : campaign.status}
                    {campaign.createdAt && (
                      <span className="ml-2">
                        • Erstellt: {new Date(campaign.createdAt.seconds * 1000).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    color="secondary"
                    onClick={() => window.open(`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`, '_blank')}
                  >
                    Anzeigen
                  </Button>
                  <Button
                    type="button"
                    color="secondary"
                    onClick={() => window.open(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`, '_blank')}
                  >
                    Bearbeiten
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Keine Kampagnen mit diesem Projekt verknüpft.</p>
          </div>
        )}

        {/* Neue Kampagne erstellen - nur wenn noch keine Kampagne existiert */}
        {linkedCampaigns.length === 0 && (
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex items-start space-x-3 mb-4">
              <input
                id="createNewCampaign"
                type="checkbox"
                checked={createNewCampaign}
                onChange={(e) => {
                  setCreateNewCampaign(e.target.checked);
                  if (!e.target.checked) {
                    setCampaignTitle('');
                  }
                }}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="createNewCampaign" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Neue PR-Kampagne erstellen
                </label>
                <Text className="text-sm text-gray-600 mt-1">
                  Erstelle eine neue Kampagne und verknüpfe sie automatisch mit diesem Projekt.
                </Text>
              </div>
            </div>

            {createNewCampaign && (
              <div className="ml-7 space-y-4">
                <Field>
                  <Label>Kampagnen-Titel *</Label>
                  <Input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder={`${formData.title} - PR-Kampagne`}
                  />
                </Field>
                <Button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={!campaignTitle.trim() || isCreating}
                >
                  {isCreating ? 'Erstelle...' : 'Kampagne erstellen'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </FieldGroup>
  );
}
