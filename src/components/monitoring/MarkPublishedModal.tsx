'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogBody, DialogActions, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { EmailCampaignSend } from '@/types/email';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { PublicationSelector } from './PublicationSelector';
import {
  type MatchedPublication,
  type PublicationLookupResult,
  getReachFromPublication,
  calculateAVE
} from '@/lib/utils/publication-matcher';
import { useMarkAsPublished, type MarkAsPublishedFormData } from '@/lib/hooks/useMonitoringMutations';
import { clippingService, type DuplicateCheckResult } from '@/lib/firebase/clipping-service';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MarkPublishedModalProps {
  send: EmailCampaignSend;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkPublishedModal({ send, campaignId, onClose, onSuccess }: MarkPublishedModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const markAsPublished = useMarkAsPublished();

  const [selectedPublication, setSelectedPublication] = useState<MatchedPublication | null>(null);
  const [lookupData, setLookupData] = useState<PublicationLookupResult | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [formData, setFormData] = useState<MarkAsPublishedFormData>({
    articleUrl: '',
    articleTitle: '',
    outletName: '',
    outletType: 'online',
    reach: '',
    sentiment: 'neutral',
    sentimentScore: 0,
    publishedAt: new Date().toISOString().split('T')[0]
  });

  // Duplikat-Prüfung bei URL-Änderung (mit Debounce)
  useEffect(() => {
    if (!formData.articleUrl || !currentOrganization?.id) {
      setDuplicateCheck(null);
      return;
    }

    // Nur prüfen wenn URL gültig aussieht
    if (!formData.articleUrl.startsWith('http')) {
      setDuplicateCheck(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const result = await clippingService.checkForDuplicate(
          formData.articleUrl,
          campaignId,
          { organizationId: currentOrganization.id }
        );
        setDuplicateCheck(result);
      } catch (error) {
        console.error('Duplikat-Prüfung fehlgeschlagen:', error);
        setDuplicateCheck(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500); // 500ms Debounce

    return () => clearTimeout(timeoutId);
  }, [formData.articleUrl, campaignId, currentOrganization?.id]);

  // Berechne AVE bei Änderungen
  const calculatedAVE = useMemo(() => {
    if (formData.reach && formData.sentiment) {
      return calculateAVE(
        parseInt(formData.reach),
        formData.sentiment,
        formData.outletType
      );
    }
    return 0;
  }, [formData.reach, formData.sentiment, formData.outletType]);

  // Handle Publication Selection
  const handlePublicationSelect = useCallback((publication: MatchedPublication | null) => {
    setSelectedPublication(publication);

    if (publication) {
      // Auto-fill Felder basierend auf der gewählten Publikation
      const reach = getReachFromPublication(publication);
      setFormData(prev => ({
        ...prev,
        outletName: publication.name,
        outletType: publication.type,
        reach: reach ? reach.toString() : prev.reach
      }));
    }
  }, []);

  // Handle Lookup Data Load
  const handleDataLoad = useCallback((data: PublicationLookupResult) => {
    setLookupData(data);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrganization || !send.id) return;

    try {
      await markAsPublished.mutateAsync({
        organizationId: currentOrganization.id,
        campaignId,
        sendId: send.id,
        userId: user.uid,
        recipientName: send.recipientName,
        formData
      });
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  }, [user, currentOrganization, send.id, send.recipientName, campaignId, formData, markAsPublished, onSuccess]);

  return (
    <Dialog open={true} onClose={onClose} size="3xl">
      <DialogTitle>Als veröffentlicht markieren</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            {/* Publication Selector mit CRM-Integration */}
            {currentOrganization && (
              <PublicationSelector
                recipientEmail={send.recipientEmail}
                recipientName={send.recipientName}
                organizationId={currentOrganization.id}
                onPublicationSelect={handlePublicationSelect}
                onDataLoad={handleDataLoad}
              />
            )}

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
                  {checkingDuplicate && (
                    <Text className="text-xs text-gray-500 mt-1">Prüfe auf Duplikate...</Text>
                  )}
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

              {/* Duplikat-Warnung */}
              {duplicateCheck?.isDuplicate && duplicateCheck.existingClipping && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Text className="font-medium text-amber-800">
                        Mögliches Duplikat gefunden
                      </Text>
                      <Text className="text-sm text-amber-700 mt-1">
                        Ein Clipping mit dieser URL existiert bereits:
                      </Text>
                      <div className="mt-2 bg-white rounded border border-amber-200 p-3">
                        <Text className="font-medium text-gray-900">
                          {duplicateCheck.existingClipping.title}
                        </Text>
                        <div className="flex items-center gap-2 mt-1">
                          <Text className="text-sm text-gray-600">
                            {duplicateCheck.existingClipping.outletName}
                          </Text>
                          <Badge color={
                            duplicateCheck.existingClipping.detectionMethod === 'manual'
                              ? 'blue'
                              : duplicateCheck.existingClipping.detectionMethod === 'rss' || duplicateCheck.existingClipping.detectionMethod === 'google_news'
                                ? 'green'
                                : 'zinc'
                          }>
                            {duplicateCheck.existingClipping.detectionMethod === 'manual'
                              ? 'Manuell erfasst'
                              : duplicateCheck.existingClipping.detectionMethod === 'rss' || duplicateCheck.existingClipping.detectionMethod === 'google_news'
                                ? 'Auto-Fund'
                                : duplicateCheck.existingClipping.detectionMethod}
                          </Badge>
                          {duplicateCheck.existingClipping.reach && (
                            <Text className="text-sm text-gray-500">
                              Reichweite: {duplicateCheck.existingClipping.reach.toLocaleString('de-DE')}
                            </Text>
                          )}
                        </div>
                      </div>
                      <Text className="text-xs text-amber-600 mt-2">
                        Wenn Sie fortfahren, wird ein zweites Clipping erstellt.
                        Die Reichweite wird dann doppelt gezählt.
                      </Text>
                    </div>
                  </div>
                </div>
              )}

              {/* Medium/Outlet und Typ - 2-spaltig (nur wenn nicht automatisch gefüllt) */}
              {!selectedPublication && (
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
                      <option value="audio">🎙️ Podcast</option>
                    </Select>
                  </Field>
                </div>
              )}

              {/* Automatisch gefüllte Felder anzeigen */}
              {selectedPublication && (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>Medientyp</Label>
                    <Select
                      value={formData.outletType}
                      onChange={(e) => setFormData({ ...formData, outletType: e.target.value as any })}
                      disabled={selectedPublication.source === 'company'}
                    >
                      <option value="print">📰 Print</option>
                      <option value="online">💻 Online</option>
                      <option value="broadcast">📺 Broadcast</option>
                      <option value="audio">🎙️ Podcast</option>
                    </Select>
                    {selectedPublication.source === 'company' && (
                      <Text className="text-xs text-gray-500">
                        Automatisch gesetzt basierend auf {selectedPublication.name}
                      </Text>
                    )}
                  </Field>

                  <Field>
                    <Label>Reichweite</Label>
                    <Input
                      type="number"
                      value={formData.reach}
                      onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
                      placeholder="z.B. 2500000"
                      disabled={!!selectedPublication.reach}
                    />
                    {selectedPublication.reach && (
                      <Text className="text-xs text-gray-500">
                        Aus Medienhaus-Daten: {selectedPublication.reach.toLocaleString('de-DE')}
                      </Text>
                    )}
                  </Field>
                </div>
              )}

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

                {/* Reichweite nur wenn nicht automatisch gefüllt */}
                {!selectedPublication && (
                  <Field>
                    <Label>Reichweite (optional)</Label>
                    <Input
                      type="number"
                      value={formData.reach}
                      onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
                      placeholder="z.B. 2500000"
                    />
                  </Field>
                )}
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
                    aria-label="Sentiment-Score"
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
          <Button plain onClick={onClose} disabled={markAsPublished.isPending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={markAsPublished.isPending}>
            {markAsPublished.isPending ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}