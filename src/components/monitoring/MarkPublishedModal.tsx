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
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { clippingService } from '@/lib/firebase/clipping-service';
import { PublicationSelector } from './PublicationSelector';
import {
  type MatchedPublication,
  type PublicationLookupResult,
  getReachFromPublication,
  calculateAVE
} from '@/lib/utils/publication-matcher';

interface MarkPublishedModalProps {
  send: EmailCampaignSend;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkPublishedModal({ send, campaignId, onClose, onSuccess }: MarkPublishedModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<MatchedPublication | null>(null);
  const [lookupData, setLookupData] = useState<PublicationLookupResult | null>(null);
  const [calculatedAVE, setCalculatedAVE] = useState(0);
  const [formData, setFormData] = useState({
    articleUrl: '',
    articleTitle: '',
    outletName: '',
    outletType: 'online' as 'print' | 'online' | 'broadcast' | 'blog',
    reach: '',
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    sentimentScore: 0,
    publicationNotes: '',
    publishedAt: new Date().toISOString().split('T')[0]
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

  // Handle Publication Selection
  const handlePublicationSelect = (publication: MatchedPublication | null) => {
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
  };

  // Handle Lookup Data Load
  const handleDataLoad = (data: PublicationLookupResult) => {
    setLookupData(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrganization) return;

    setLoading(true);

    try {
      const publishedDate = new Date(formData.publishedAt);
      const publishedTimestamp = Timestamp.fromDate(publishedDate);

      const clippingData: any = {
        organizationId: currentOrganization.id,
        campaignId,
        emailSendId: send.id,
        title: formData.articleTitle || `Artikel von ${send.recipientName}`,
        url: formData.articleUrl,
        publishedAt: publishedTimestamp,
        outletName: formData.outletName || 'Unbekannt',
        outletType: formData.outletType,
        sentiment: formData.sentiment,
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: user.uid,
        verifiedBy: user.uid,
        verifiedAt: Timestamp.now()
      };

      if (formData.reach) {
        clippingData.reach = parseInt(formData.reach);
      }

      if (formData.publicationNotes) {
        clippingData.sentimentNotes = formData.publicationNotes;
      }

      clippingData.sentimentScore = formData.sentimentScore;

      const clippingId = await clippingService.create(clippingData, { organizationId: currentOrganization.id });

      const sendRef = doc(db, 'email_campaign_sends', send.id!);
      const updateData: any = {
        publishedStatus: 'published',
        publishedAt: publishedTimestamp,
        clippingId,
        articleUrl: formData.articleUrl,
        sentiment: formData.sentiment,
        manuallyMarkedPublished: true,
        markedPublishedBy: user.uid,
        markedPublishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (formData.articleTitle) {
        updateData.articleTitle = formData.articleTitle;
      }

      if (formData.reach) {
        updateData.reach = parseInt(formData.reach);
      }

      if (formData.publicationNotes) {
        updateData.publicationNotes = formData.publicationNotes;
      }

      updateData.sentimentScore = formData.sentimentScore;

      await updateDoc(sendRef, updateData);

      onSuccess();
    } catch (error) {
      console.error('Fehler beim Markieren als veröffentlicht:', error);
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={true} onClose={onClose}>
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

              {/* Outlet und Typ nur anzeigen wenn nicht automatisch gefüllt */}
              {!selectedPublication && (
                <>
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
                </>
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
                      <option value="blog">✍️ Blog</option>
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
                    onChange={(e) => setFormData({ ...formData, sentimentScore: parseFloat(e.target.value) })}
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

              <Field>
                <Label>Notizen (optional)</Label>
                <Textarea
                  value={formData.publicationNotes}
                  onChange={(e) => setFormData({ ...formData, publicationNotes: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                />
              </Field>
            </div>
          </DialogBody>

          <DialogActions>
            <Button plain onClick={onClose} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!error} onClose={() => setError('')}>
        <DialogTitle>Fehler</DialogTitle>
        <DialogBody>
          <p className="text-sm text-gray-600">{error}</p>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setError('')}>OK</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}