// src/components/projects/pressemeldungen/CampaignCreateModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'press_release' as const,
    priority: 'medium' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toastService.error('Bitte geben Sie einen Titel ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new campaign
      const campaignData: Partial<PRCampaign> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        status: 'draft',
        organizationId,
        projectId, // Link to project
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };

      const campaignId = await prService.createCampaign(campaignData, organizationId);

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
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="z.B. Neue Produkteinführung bei..."
                required
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Kurze Beschreibung der Pressemeldung..."
                rows={3}
                disabled={isSubmitting}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Typ</Label>
                <Select
                  value={formData.type}
                  onChange={(value) => handleInputChange('type', value)}
                  disabled={isSubmitting}
                >
                  <option value="press_release">Pressemitteilung</option>
                  <option value="announcement">Ankündigung</option>
                  <option value="product_launch">Produktlaunch</option>
                  <option value="event">Veranstaltung</option>
                  <option value="corporate">Unternehmensnews</option>
                </Select>
              </Field>

              <Field>
                <Label>Priorität</Label>
                <Select
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  disabled={isSubmitting}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </Select>
              </Field>
            </div>

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
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? 'Wird erstellt...' : 'Kampagne erstellen'}
            </Button>
          </DialogActions>
        </form>
      </div>
    </Dialog>
  );
}