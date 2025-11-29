/**
 * Monitoring Suggestion Service
 *
 * Verwaltet automatisch gefundene Artikel-Vorschläge
 */

import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { MonitoringSuggestion } from '@/types/monitoring';
import { clippingService } from './clipping-service';
import { detectOutletType } from '@/lib/utils/outlet-type-detector';
import { publicationService } from './library-service';

class MonitoringSuggestionService {
  private collectionName = 'monitoring_suggestions';

  /**
   * Lädt alle Suggestions für eine Kampagne
   */
  async getByCampaignId(
    campaignId: string,
    organizationId: string
  ): Promise<MonitoringSuggestion[]> {
    const q = query(
      collection(db, this.collectionName),
      where('campaignId', '==', campaignId),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MonitoringSuggestion[];
  }

  /**
   * Lädt Suggestion by ID
   */
  async getById(
    suggestionId: string
  ): Promise<MonitoringSuggestion | null> {
    const docRef = doc(db, this.collectionName, suggestionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as MonitoringSuggestion;
  }

  /**
   * Bestätigt Suggestion und erstellt Clipping
   */
  async confirmSuggestion(
    suggestionId: string,
    context: {
      userId: string;
      organizationId: string;
      sentiment?: 'positive' | 'neutral' | 'negative';
    }
  ): Promise<string> {
    const suggestion = await this.getById(suggestionId);

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    if (suggestion.status !== 'pending') {
      throw new Error('Suggestion already processed');
    }

    // Lade Kampagne für projectId
    const { prService } = await import('./pr-service');
    const campaign = await prService.getById(suggestion.campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Intelligente outletType-Erkennung basierend auf Library Publication
    let outletType: 'print' | 'online' | 'broadcast' | 'audio' = 'online'; // Default

    // Versuche Publication zu laden falls publicationId vorhanden
    const publicationId = suggestion.sources[0]?.publicationId;
    if (publicationId) {
      try {
        const publication = await publicationService.getById(
          publicationId,
          suggestion.organizationId
        );
        if (publication) {
          outletType = detectOutletType(publication);
        }
      } catch (error) {
        console.warn('Konnte Publication nicht laden, verwende Default outletType:', error);
      }
    }

    // Erstelle Clipping aus Suggestion
    const clippingData: Record<string, any> = {
      organizationId: suggestion.organizationId,
      campaignId: suggestion.campaignId,
      projectId: campaign.projectId,
      title: suggestion.articleTitle,
      url: suggestion.articleUrl,
      publishedAt: suggestion.sources[0]?.foundAt || Timestamp.now(),
      outletName: suggestion.sources[0]?.sourceName || 'Unbekannt',
      outletType,
      sentiment: context.sentiment || 'neutral' as const,
      detectionMethod: 'automated' as const,
      detectedAt: suggestion.createdAt,
      createdBy: context.userId,
      verifiedBy: context.userId,
      verifiedAt: Timestamp.now()
    };

    // Nur definierte optionale Felder hinzufügen (Firestore akzeptiert kein undefined)
    if (suggestion.articleExcerpt) {
      clippingData.excerpt = suggestion.articleExcerpt;
    }
    if (suggestion.articleImage) {
      clippingData.imageUrl = suggestion.articleImage;
    }

    const clippingId = await clippingService.create(
      clippingData,
      context
    );

    // Update Suggestion Status
    await updateDoc(doc(db, this.collectionName, suggestionId), {
      status: 'confirmed',
      clippingId,
      reviewedBy: context.userId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Suggestion ${suggestionId} confirmed and clipping ${clippingId} created`);

    return clippingId;
  }

  /**
   * Markiert Suggestion als Spam
   */
  async markAsSpam(
    suggestionId: string,
    context: {
      userId: string;
      organizationId: string;
    },
    createPattern?: {
      type: 'url_domain' | 'keyword_title' | 'outlet_name';
      description?: string;
    }
  ): Promise<void> {
    const suggestion = await this.getById(suggestionId);

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    // Update Suggestion
    await updateDoc(doc(db, this.collectionName, suggestionId), {
      status: 'spam',
      spamMarkedBy: context.userId,
      spamMarkedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Optional: Erstelle Spam Pattern
    if (createPattern) {
      const { spamPatternService } = await import('./spam-pattern-service');

      let pattern = '';
      switch (createPattern.type) {
        case 'url_domain':
          try {
            const url = new URL(suggestion.articleUrl);
            pattern = url.hostname.replace(/^www\./, '');
          } catch (e) {
            pattern = suggestion.articleUrl;
          }
          break;
        case 'keyword_title':
          // Extrahiere erstes Wort aus Titel als Pattern
          pattern = suggestion.articleTitle.split(' ')[0].toLowerCase();
          break;
        case 'outlet_name':
          pattern = suggestion.sources[0]?.sourceName || '';
          break;
      }

      if (pattern) {
        await spamPatternService.create({
          organizationId: context.organizationId,
          type: createPattern.type,
          pattern,
          isRegex: false,
          scope: 'global',
          isActive: true,
          description: createPattern.description || `Automatisch erstellt aus Spam-Vorschlag: ${suggestion.articleTitle}`
        }, { userId: context.userId });

        console.log(`🚫 Spam pattern created: ${pattern} (${createPattern.type})`);
      }
    }

    console.log(`🚫 Suggestion ${suggestionId} marked as spam`);
  }

  /**
   * Löscht Suggestion
   */
  async delete(suggestionId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, suggestionId));
    console.log(`🗑️  Suggestion ${suggestionId} deleted`);
  }

  /**
   * Zählt Suggestions nach Status
   */
  async getStats(
    campaignId: string,
    organizationId: string
  ): Promise<{
    total: number;
    pending: number;
    autoConfirmed: number;
    confirmed: number;
    spam: number;
  }> {
    const suggestions = await this.getByCampaignId(campaignId, organizationId);

    return {
      total: suggestions.length,
      pending: suggestions.filter(s => s.status === 'pending').length,
      autoConfirmed: suggestions.filter(s => s.status === 'auto_confirmed').length,
      confirmed: suggestions.filter(s => s.status === 'confirmed').length,
      spam: suggestions.filter(s => s.status === 'spam').length
    };
  }
}

export const monitoringSuggestionService = new MonitoringSuggestionService();
