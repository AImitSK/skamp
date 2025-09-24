'use client';

import { useState } from 'react';
import { Dialog, DialogBody, DialogActions, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmailCampaignSend } from '@/types/email';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { clippingService } from '@/lib/firebase/clipping-service';

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
  const [formData, setFormData] = useState({
    articleUrl: '',
    articleTitle: '',
    outletName: '',
    reach: '',
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    publicationNotes: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrganization) return;

    setLoading(true);

    try {
      const publishedDate = new Date(formData.publishedAt);
      const publishedTimestamp = Timestamp.fromDate(publishedDate);

      const clippingId = await clippingService.create({
        organizationId: currentOrganization.id,
        campaignId,
        emailSendId: send.id,
        title: formData.articleTitle || `Artikel von ${send.recipientName}`,
        url: formData.articleUrl,
        publishedAt: publishedTimestamp,
        outletName: formData.outletName || 'Unbekannt',
        outletType: 'online',
        sentiment: formData.sentiment,
        reach: formData.reach ? parseInt(formData.reach) : undefined,
        sentimentNotes: formData.publicationNotes,
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: user.uid,
        verifiedBy: user.uid,
        verifiedAt: Timestamp.now()
      }, { organizationId: currentOrganization.id });

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
              <Field>
                <Label>Empfänger</Label>
                <Input
                  value={`${send.recipientName} (${send.recipientEmail})`}
                  disabled
                />
              </Field>

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

              <Field>
                <Label>Sentiment</Label>
                <Select
                  value={formData.sentiment}
                  onChange={(e) => setFormData({ ...formData, sentiment: e.target.value as any })}
                >
                  <option value="positive">😊 Positiv</option>
                  <option value="neutral">😐 Neutral</option>
                  <option value="negative">😞 Negativ</option>
                </Select>
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