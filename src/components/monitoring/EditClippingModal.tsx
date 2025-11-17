'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogBody, DialogActions, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { calculateAVE } from '@/lib/utils/publication-matcher';
import { useUpdateClipping, type UpdateClippingFormData } from '@/lib/hooks/useMonitoringMutations';

interface EditClippingModalProps {
  send: EmailCampaignSend;
  clipping: MediaClipping;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditClippingModal({ send, clipping, onClose, onSuccess }: EditClippingModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const updateClipping = useUpdateClipping();

  const [calculatedAVE, setCalculatedAVE] = useState(0);
  const [formData, setFormData] = useState<UpdateClippingFormData>({
    articleUrl: clipping.url || '',
    articleTitle: clipping.title || '',
    outletName: clipping.outletName || '',
    outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'blog',
    reach: clipping.reach?.toString() || '',
    sentiment: clipping.sentiment,
    sentimentScore: clipping.sentimentScore || aveSettingsService.getSentimentScoreFromLabel(clipping.sentiment),
    publishedAt: clipping.publishedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  });

  // Berechne AVE bei Änderungen
  useEffect(() => {
    if (formData.reach && formData.sentiment) {
      const ave = calculateAVE(
        parseInt(formData.reach),
        formData.sentiment,
        formData.outletType
      );
      setCalculatedAVE(ave);
    }
  }, [formData.reach, formData.sentiment, formData.outletType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrganization || !clipping.id || !send.id) return;

    try {
      await updateClipping.mutateAsync({
        organizationId: currentOrganization.id,
        clippingId: clipping.id,
        sendId: send.id,
        recipientName: send.recipientName,
        formData
      });
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <DialogTitle>Veröffentlichung bearbeiten</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <Field>
                <Label>Empfänger</Label>
                <Input
                  value={`${send.recipientName} (${send.recipientEmail})`}
                  disabled
                />
              </Field>

              {/* Artikel-URL und Titel - 2-spaltig */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <Label>Artikel-URL *</Label>
                  <Input
                    type="url"
                    value={formData.articleUrl}
                    onChange={(e) => setFormData({ ...formData, articleUrl: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </Field>

                <Field>
                  <Label>Artikel-Titel</Label>
                  <Input
                    type="text"
                    value={formData.articleTitle}
                    onChange={(e) => setFormData({ ...formData, articleTitle: e.target.value })}
                    placeholder="Optional"
                  />
                </Field>
              </div>

              {/* Medium/Outlet und Medientyp - 2-spaltig */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <Label>Medium/Outlet</Label>
                  <Input
                    type="text"
                    value={formData.outletName}
                    onChange={(e) => setFormData({ ...formData, outletName: e.target.value })}
                    placeholder="z.B. Süddeutsche Zeitung"
                  />
                </Field>

                <Field>
                  <Label>Medientyp</Label>
                  <Select
                    value={formData.outletType}
                    onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
                  >
                    <option value="print">📰 Print (Zeitung/Magazin)</option>
                    <option value="online">💻 Online</option>
                    <option value="broadcast">📺 Broadcast (TV/Radio)</option>
                    <option value="blog">✍️ Blog</option>
                  </Select>
                </Field>
              </div>

              {/* Veröffentlichungsdatum und Reichweite - 2-spaltig */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <Label>Veröffentlichungsdatum</Label>
                  <Input
                    type="date"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  />
                </Field>

                <Field>
                  <Label>Reichweite (optional)</Label>
                  <Input
                    type="number"
                    value={formData.reach}
                    onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
                    placeholder="z.B. 2500000"
                  />
                </Field>
              </div>

              {/* Sentiment & AVE Preview */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <Label>Sentiment</Label>
                  <Select
                    value={formData.sentiment}
                    onChange={(e) => {
                      const sentiment = e.target.value as 'positive' | 'neutral' | 'negative';
                      let score = 0;
                      if (sentiment === 'positive') score = 0.7;
                      if (sentiment === 'negative') score = -0.7;
                      setFormData({ ...formData, sentiment, sentimentScore: score });
                    }}
                  >
                    <option value="positive">😊 Positiv</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="negative">😞 Negativ</option>
                  </Select>
                </Field>

                {formData.reach && (
                  <Field>
                    <Label>Voraussichtlicher AVE</Label>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <Text className="text-2xl font-bold text-gray-900">
                        {calculatedAVE.toLocaleString('de-DE')} €
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Basierend auf {parseInt(formData.reach).toLocaleString('de-DE')} Reichweite
                      </Text>
                    </div>
                  </Field>
                )}
              </div>

              <Field>
                <Label>Sentiment-Score (optional)</Label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={formData.sentimentScore}
                    onChange={(e) => {
                      const score = parseFloat(e.target.value);
                      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

                      // Automatische Sentiment-Auswahl basierend auf Score
                      if (score > 0.3) {
                        sentiment = 'positive';
                      } else if (score < -0.3) {
                        sentiment = 'negative';
                      }

                      setFormData({ ...formData, sentimentScore: score, sentiment });
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Sehr negativ</span>
                    <span className="font-medium">{formData.sentimentScore.toFixed(1)}</span>
                    <span>Sehr positiv</span>
                  </div>
                </div>
              </Field>
            </div>
          </DialogBody>

        <DialogActions>
          <Button plain onClick={onClose} disabled={updateClipping.isPending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={updateClipping.isPending}>
            {updateClipping.isPending ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}