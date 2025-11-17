'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { clippingService } from '@/lib/firebase/clipping-service';
import { prService } from '@/lib/firebase/pr-service';
import { toastService } from '@/lib/utils/toast';

/**
 * Form-Daten für Mark as Published
 */
export interface MarkAsPublishedFormData {
  articleUrl: string;
  articleTitle: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  publishedAt: string; // ISO Date string from input[type="date"]
}

/**
 * Input für useMarkAsPublished Mutation
 */
export interface MarkAsPublishedInput {
  organizationId: string;
  campaignId: string;
  sendId: string;
  userId: string;
  recipientName: string;
  formData: MarkAsPublishedFormData;
}

/**
 * Form-Daten für Update Clipping
 */
export interface UpdateClippingFormData {
  articleUrl: string;
  articleTitle: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  publishedAt: string; // ISO Date string from input[type="date"]
}

/**
 * Input für useUpdateClipping Mutation
 */
export interface UpdateClippingInput {
  organizationId: string;
  clippingId: string;
  sendId: string;
  recipientName: string;
  formData: UpdateClippingFormData;
}

/**
 * Hook für "Als veröffentlicht markieren" Mutation
 *
 * Erstellt einen neuen Clipping-Eintrag und updated den Send-Status
 *
 * @returns React Query Mutation für Mark as Published
 */
export function useMarkAsPublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkAsPublishedInput) => {
      const { organizationId, campaignId, sendId, userId, recipientName, formData } = input;

      // 1. Timestamp erstellen
      const publishedDate = new Date(formData.publishedAt);
      const publishedTimestamp = Timestamp.fromDate(publishedDate);

      // 2. Kampagne laden um projectId zu ermitteln
      const campaign = await prService.getById(campaignId);

      // 3. Clipping-Daten vorbereiten
      const clippingData: any = {
        organizationId,
        campaignId,
        emailSendId: sendId,
        title: formData.articleTitle || `Artikel von ${recipientName}`,
        url: formData.articleUrl,
        publishedAt: publishedTimestamp,
        outletName: formData.outletName || 'Unbekannt',
        outletType: formData.outletType,
        sentiment: formData.sentiment,
        sentimentScore: formData.sentimentScore,
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: userId,
        verifiedBy: userId,
        verifiedAt: Timestamp.now()
      };

      // Setze projectId wenn Kampagne zu einem Projekt gehört
      if (campaign?.projectId) {
        clippingData.projectId = campaign.projectId;
      }

      // Optional: Reichweite
      if (formData.reach) {
        clippingData.reach = parseInt(formData.reach);
      }

      // 4. Clipping erstellen
      const clippingId = await clippingService.create(clippingData, { organizationId });

      // 5. Send-Daten vorbereiten
      const sendRef = doc(db, 'email_campaign_sends', sendId);
      const updateData: any = {
        publishedStatus: 'published',
        publishedAt: publishedTimestamp,
        clippingId,
        articleUrl: formData.articleUrl,
        sentiment: formData.sentiment,
        sentimentScore: formData.sentimentScore,
        manuallyMarkedPublished: true,
        markedPublishedBy: userId,
        markedPublishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Optional: Artikel-Titel
      if (formData.articleTitle) {
        updateData.articleTitle = formData.articleTitle;
      }

      // Optional: Reichweite
      if (formData.reach) {
        updateData.reach = parseInt(formData.reach);
      }

      // 6. Send updaten
      await updateDoc(sendRef, updateData);

      return { clippingId };
    },
    onSuccess: () => {
      // Query-Cache invalidieren für Refresh
      queryClient.invalidateQueries({ queryKey: ['clippings'] });
      queryClient.invalidateQueries({ queryKey: ['sends'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });

      // Success-Toast
      toastService.success('Erfolgreich als veröffentlicht markiert');
    },
    onError: (error: Error) => {
      console.error('Fehler beim Markieren als veröffentlicht:', error);
      toastService.error(error.message || 'Fehler beim Speichern');
    }
  });
}

/**
 * Hook für "Veröffentlichung bearbeiten" Mutation
 *
 * Updated einen existierenden Clipping-Eintrag und den zugehörigen Send
 *
 * @returns React Query Mutation für Update Clipping
 */
export function useUpdateClipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateClippingInput) => {
      const { organizationId, clippingId, sendId, recipientName, formData } = input;

      // 1. Timestamp erstellen
      const publishedDate = new Date(formData.publishedAt);
      const publishedTimestamp = Timestamp.fromDate(publishedDate);

      // 2. Clipping-Daten vorbereiten
      const clippingData: any = {
        title: formData.articleTitle || `Artikel von ${recipientName}`,
        url: formData.articleUrl,
        publishedAt: publishedTimestamp,
        outletName: formData.outletName || 'Unbekannt',
        outletType: formData.outletType,
        sentiment: formData.sentiment,
        sentimentScore: formData.sentimentScore,
        updatedAt: serverTimestamp()
      };

      // Optional: Reichweite
      if (formData.reach) {
        clippingData.reach = parseInt(formData.reach);
      }

      // 3. Clipping updaten
      await clippingService.update(clippingId, clippingData, { organizationId });

      // 4. Send-Daten vorbereiten
      const sendRef = doc(db, 'email_campaign_sends', sendId);
      const updateData: any = {
        publishedAt: publishedTimestamp,
        articleUrl: formData.articleUrl,
        sentiment: formData.sentiment,
        sentimentScore: formData.sentimentScore,
        updatedAt: serverTimestamp()
      };

      // Optional: Artikel-Titel
      if (formData.articleTitle) {
        updateData.articleTitle = formData.articleTitle;
      }

      // Optional: Reichweite
      if (formData.reach) {
        updateData.reach = parseInt(formData.reach);
      }

      // 5. Send updaten
      await updateDoc(sendRef, updateData);
    },
    onSuccess: () => {
      // Query-Cache invalidieren für Refresh
      queryClient.invalidateQueries({ queryKey: ['clippings'] });
      queryClient.invalidateQueries({ queryKey: ['sends'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });

      // Success-Toast
      toastService.success('Veröffentlichung erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      console.error('Fehler beim Aktualisieren:', error);
      toastService.error(error.message || 'Fehler beim Speichern');
    }
  });
}
