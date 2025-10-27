// src/components/projects/pressemeldungen/CampaignCreateModal.tsx
'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { PRCampaign } from '@/types/pr';
import { prService } from '@/lib/firebase/pr-service';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toastService } from '@/lib/utils/toast';

interface Props {
  projectId: string;
  organizationId: string;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

export default function CampaignCreateModal({
  projectId,
  organizationId,
  onClose,
  onSuccess
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toastService.error('Bitte geben Sie einen Titel ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new campaign with minimal required fields
      const campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        contentHtml: '',
        status: 'draft',
        organizationId,
        projectId,
        userId: '', // Will be set by service
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      };

      const campaignId = await prService.create(campaignData);

      // Link campaign to project
      await prService.linkCampaignToProject(campaignId, projectId);

      toastService.success('Kampagne erfolgreich erstellt');
      onSuccess(campaignId);
    } catch (error) {
      console.error('Fehler beim Erstellen der Kampagne:', error);
      toastService.error('Fehler beim Erstellen der Kampagne. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, organizationId, projectId, onSuccess]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <DialogTitle>Neue Pressemeldung erstellen</DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-6">
            <Field>
              <Label>Titel der Pressemeldung</Label>
              <Input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="z.B. Neue Produkteinführung bei..."
                required
                disabled={isSubmitting}
                autoFocus
              />
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Nächster Schritt
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Nach dem Erstellen werden Sie zur Kampagnen-Bearbeitung weitergeleitet,
                      wo Sie den Inhalt der Pressemeldung verfassen können.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogActions>
            <Button
              color="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Wird erstellt...' : 'Kampagne erstellen'}
            </Button>
          </DialogActions>
        </form>
      </div>
    </Dialog>
  );
}