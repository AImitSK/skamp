/**
 * Campaign Monitoring Service
 *
 * Phase 3.1: Verwaltet Monitoring Tracker für PR-Kampagnen
 *
 * Workflow:
 * 1. Kampagne wird versendet
 * 2. createTrackerForCampaign() analysiert alle Empfänger
 * 3. Sammelt RSS Feeds aus Publications der Redakteure
 * 4. Erstellt Google News Channel (kampagnen-weit)
 * 5. Täglicher Crawler nutzt aktive Tracker
 * 6. Channels werden nach Fund deaktiviert (Ressourcen-Schonung)
 *
 * WICHTIG: Verwendet Admin SDK da Service ausschließlich aus API Routes aufgerufen wird
 */

import { adminDb } from './admin-init';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  CampaignMonitoringTracker,
  MonitoringChannel
} from '@/types/monitoring';
import { PRCampaign } from '@/types/pr';
import { Publication } from '@/types/library';
import { handleRecipientLookup } from '@/lib/utils/publication-matcher';
import { isMonitoringEnabled } from '@/lib/utils/publication-helpers';
import { publicationService } from './library-service';
import { prService } from './pr-service';

class CampaignMonitoringService {
  private collectionName = 'campaign_monitoring_trackers';

  /**
   * Erstellt Monitoring Tracker für Kampagne
   *
   * Analysiert alle Empfänger und erstellt Channel-Liste basierend auf ihren Publications
   */
  async createTrackerForCampaign(
    campaignId: string,
    organizationId: string
  ): Promise<string> {
    // 1. Lade Kampagne
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Erlaube Tracker-Erstellung auch ohne explizites isEnabled (für Projekt-Kampagnen)
    if (!campaign.monitoringConfig?.isEnabled && !campaign.projectId) {
      throw new Error('Monitoring not enabled for campaign');
    }

    // Fallback-Config wenn keine vorhanden (für Projekt-Kampagnen)
    const monitoringConfig = campaign.monitoringConfig || {
      isEnabled: true,
      monitoringPeriod: 30 as const,
      keywords: [],
      sources: { googleNews: true, rssFeeds: [] },
      minMatchScore: 70
    };

    // 2. Berechne End-Datum basierend auf Monitoring Period
    const startDate = Timestamp.now();
    const endDate = this.calculateEndDate(startDate, monitoringConfig.monitoringPeriod);

    // 3. Sammle alle Channels aus Empfängern
    const channels = await this.buildChannelsFromRecipients(campaign, organizationId);

    // 3b. Füge Google News Channel hinzu (kampagnen-weit, EINMAL)
    // Keywords werden aus Company extrahiert falls nicht in monitoringConfig vorhanden
    const googleNewsChannel = await this.buildGoogleNewsChannel(campaign, organizationId);
    if (googleNewsChannel) {
      channels.push(googleNewsChannel);
    }

    // 4. Erstelle Tracker
    // Type-Casts notwendig da Admin SDK Timestamp vs Client SDK Timestamp in types/monitoring.ts
    const trackerData = {
      organizationId,
      campaignId,
      startDate,
      endDate,
      isActive: true,
      channels,
      totalArticlesFound: 0,
      totalAutoConfirmed: 0,
      totalManuallyAdded: 0,
      totalSpamMarked: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection(this.collectionName).add(trackerData);

    console.log(`✅ Monitoring Tracker created for campaign ${campaignId}: ${docRef.id}`);
    console.log(`📊 Channels: ${channels.length} (${channels.filter(c => c.type === 'rss_feed').length} RSS + ${channels.filter(c => c.type === 'google_news').length} Google News)`);

    return docRef.id;
  }

  /**
   * Baut Channel-Liste aus Kampagnen-Empfängern
   */
  private async buildChannelsFromRecipients(
    campaign: PRCampaign,
    organizationId: string
  ): Promise<MonitoringChannel[]> {
    const channels: MonitoringChannel[] = [];
    const seenPublicationIds = new Set<string>();

    // 1. Lade alle Email-Sends der Kampagne
    const sendsSnapshot = await adminDb
      .collection('email_campaign_sends')
      .where('campaignId', '==', campaign.id)
      .where('status', '==', 'sent')
      .get();

    console.log(`📧 Processing ${sendsSnapshot.size} email sends...`);

    // 2. Für jeden Empfänger: Lookup Publications
    for (const sendDoc of sendsSnapshot.docs) {
      const send = sendDoc.data();
      const recipientEmail = send.recipientEmail;

      if (!recipientEmail) continue;

      try {
        // Lookup Contact + Publications
        const lookup = await handleRecipientLookup(
          recipientEmail,
          organizationId
        );

        // Für jede gefundene Publication
        for (const matchedPub of lookup.publications) {
          // Nur Company-Source Publications mit ID
          if (matchedPub.source !== 'company' || !matchedPub.id) {
            continue;
          }

          // Duplicate Check
          if (seenPublicationIds.has(matchedPub.id)) {
            continue;
          }

          seenPublicationIds.add(matchedPub.id);

          // Lade vollständige Publication-Daten
          const publication = await publicationService.getById(matchedPub.id, organizationId);

          if (!publication || !isMonitoringEnabled(publication)) {
            continue;
          }

          // Erstelle Channels aus Publication.monitoringConfig
          const pubChannels = this.buildChannelsFromPublication(publication);
          channels.push(...pubChannels);
        }
      } catch (error) {
        console.error(`Error processing recipient ${recipientEmail}:`, error);
        // Continue mit nächstem Empfänger
      }
    }

    return channels;
  }

  /**
   * Erstellt Monitoring Channels aus einer Publication
   */
  private buildChannelsFromPublication(pub: Publication): MonitoringChannel[] {
    const channels: MonitoringChannel[] = [];

    if (!pub.monitoringConfig || !pub.id) return channels;

    const config = pub.monitoringConfig;

    // RSS Feeds
    for (const feedUrl of config.rssFeedUrls || []) {
      channels.push({
        id: this.generateChannelId('rss', pub.id, feedUrl),
        type: 'rss_feed',
        publicationId: pub.id,
        publicationName: pub.title,
        url: feedUrl,
        isActive: true,
        wasFound: false,
        articlesFound: 0,
        errorCount: 0
      });
    }

    return channels;
  }

  /**
   * Erstellt Google News Channel für Kampagne
   *
   * Google News wird EINMAL pro Kampagne erstellt (nicht pro Publication)
   * Keywords werden aus Company extrahiert falls nicht in monitoringConfig vorhanden
   */
  private async buildGoogleNewsChannel(
    campaign: PRCampaign,
    organizationId: string
  ): Promise<MonitoringChannel | null> {
    // Keywords-Fallback: Aus Company extrahieren wenn keine vorhanden
    let keywords = campaign.monitoringConfig?.keywords || [];

    if (keywords.length === 0 && campaign.clientId) {
      // Lade Company und extrahiere Keywords
      const company = await this.getCompany(campaign.clientId, organizationId);
      if (company) {
        keywords = this.extractKeywordsFromCompany(company);
        console.log(`📝 Extracted ${keywords.length} keywords from company: ${keywords.join(', ')}`);
      }
    }

    if (keywords.length === 0) {
      console.log('⚠️ No keywords available for Google News channel');
      return null;
    }

    // Baue Google News RSS URL mit OR für bessere Ergebnisse
    const query = keywords.join(' OR ');
    const encodedQuery = encodeURIComponent(query);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=de&gl=DE&ceid=DE:de`;

    return {
      id: `google_news_${campaign.id}`,
      type: 'google_news',
      publicationId: undefined, // Google News ist nicht publication-spezifisch
      publicationName: 'Google News',
      url: googleNewsUrl,
      isActive: true,
      wasFound: false,
      articlesFound: 0,
      errorCount: 0
    };
  }

  /**
   * Lädt Company by ID
   */
  private async getCompany(
    companyId: string,
    organizationId: string
  ): Promise<any | null> {
    try {
      const companyDoc = await adminDb.collection('companies').doc(companyId).get();

      if (!companyDoc.exists) return null;

      const data = companyDoc.data();
      if (!data || data.organizationId !== organizationId) return null;

      return { id: companyDoc.id, ...data };
    } catch (error) {
      console.error('Error loading company:', error);
      return null;
    }
  }

  /**
   * Extrahiert Keywords aus Company-Daten
   * Verwendet name, officialName und tradingName
   */
  private extractKeywordsFromCompany(company: any): string[] {
    const keywords: string[] = [];
    const legalForms = [
      'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
      'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
      'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC'
    ];

    const removeLegalForm = (name: string): string => {
      let cleaned = name.trim();
      for (const form of legalForms) {
        const regex = new RegExp(`\\s*${form.replace('.', '\\.')}\\s*$`, 'i');
        cleaned = cleaned.replace(regex, '').trim();
      }
      return cleaned;
    };

    // 1. name (Pflicht)
    if (company.name) {
      keywords.push(company.name.trim());
      const withoutLegal = removeLegalForm(company.name);
      if (withoutLegal !== company.name.trim() && withoutLegal.length >= 2) {
        keywords.push(withoutLegal);
      }
    }

    // 2. officialName (falls vorhanden und anders als name)
    if (company.officialName && company.officialName !== company.name) {
      keywords.push(company.officialName.trim());
      const withoutLegal = removeLegalForm(company.officialName);
      if (withoutLegal !== company.officialName.trim() && !keywords.includes(withoutLegal) && withoutLegal.length >= 2) {
        keywords.push(withoutLegal);
      }
    }

    // 3. tradingName (falls vorhanden)
    if (company.tradingName && !keywords.includes(company.tradingName.trim())) {
      keywords.push(company.tradingName.trim());
    }

    // Deduplizieren und filtern
    return [...new Set(keywords)].filter(k => k.length >= 2);
  }

  /**
   * Generiert eindeutige Channel ID
   */
  private generateChannelId(type: string, publicationId: string, url: string): string {
    // Nutze einfachen Hash aus type:publicationId:url
    const str = `${type}:${publicationId}:${url}`;
    const hash = Buffer.from(str).toString('base64').substring(0, 16).replace(/[/+=]/g, '');
    return `${type}_${publicationId}_${hash}`;
  }

  /**
   * Berechnet End-Datum basierend auf Monitoring Period
   */
  private calculateEndDate(startDate: Timestamp, period: 30 | 90 | 365): Timestamp {
    const start = startDate.toDate();
    const end = new Date(start);
    end.setDate(end.getDate() + period);
    return Timestamp.fromDate(end);
  }

  /**
   * Lädt Tracker für Kampagne
   */
  async getTrackerByCampaignId(campaignId: string): Promise<CampaignMonitoringTracker | null> {
    const snapshot = await adminDb
      .collection(this.collectionName)
      .where('campaignId', '==', campaignId)
      .get();

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as CampaignMonitoringTracker;
  }

  /**
   * Markiert Channel als gefunden und deaktiviert ihn
   */
  async markChannelAsFound(
    trackerId: string,
    channelId: string
  ): Promise<void> {
    const tracker = await this.getById(trackerId);

    if (!tracker) {
      throw new Error('Tracker not found');
    }

    const updatedChannels = tracker.channels.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          wasFound: true,
          foundAt: Timestamp.now(),
          isActive: false, // 🔴 WICHTIG: Deaktiviere Channel nach Fund!
          articlesFound: (ch.articlesFound || 0) + 1
        };
      }
      return ch;
    });

    await adminDb.collection(this.collectionName).doc(trackerId).update({
      channels: updatedChannels,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`✅ Channel ${channelId} marked as found and deactivated`);
  }

  /**
   * Lädt Tracker by ID
   */
  async getById(id: string): Promise<CampaignMonitoringTracker | null> {
    const docSnap = await adminDb.collection(this.collectionName).doc(id).get();

    if (!docSnap.exists) return null;

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as CampaignMonitoringTracker;
  }

  /**
   * Lädt alle aktiven Tracker (für Crawler)
   */
  async getActiveTrackers(): Promise<CampaignMonitoringTracker[]> {
    const now = Timestamp.now();

    const snapshot = await adminDb
      .collection(this.collectionName)
      .where('isActive', '==', true)
      .where('endDate', '>', now)
      .get();

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as CampaignMonitoringTracker[];
  }

  /**
   * Deaktiviert abgelaufene Tracker
   */
  async deactivateExpiredTrackers(): Promise<number> {
    const now = Timestamp.now();

    const snapshot = await adminDb
      .collection(this.collectionName)
      .where('isActive', '==', true)
      .where('endDate', '<=', now)
      .get();

    let deactivated = 0;

    for (const docSnap of snapshot.docs) {
      await adminDb.collection(this.collectionName).doc(docSnap.id).update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp()
      });
      deactivated++;
    }

    if (deactivated > 0) {
      console.log(`⏹️  Deactivated ${deactivated} expired trackers`);
    }

    return deactivated;
  }

  /**
   * Update Tracker Statistics
   */
  async updateStats(
    trackerId: string,
    stats: {
      totalArticlesFound?: number;
      totalAutoConfirmed?: number;
      totalManuallyAdded?: number;
      totalSpamMarked?: number;
    }
  ): Promise<void> {
    await adminDb.collection(this.collectionName).doc(trackerId).update({
      ...stats,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Erhöht Artikel-Counter für Channel
   */
  async incrementChannelArticleCount(
    trackerId: string,
    channelId: string
  ): Promise<void> {
    const tracker = await this.getById(trackerId);

    if (!tracker) {
      throw new Error('Tracker not found');
    }

    const updatedChannels = tracker.channels.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          articlesFound: (ch.articlesFound || 0) + 1
        };
      }
      return ch;
    });

    await adminDb.collection(this.collectionName).doc(trackerId).update({
      channels: updatedChannels,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Erhöht Error Counter für Channel (bei Crawl-Fehlern)
   */
  async incrementChannelErrorCount(
    trackerId: string,
    channelId: string
  ): Promise<void> {
    const tracker = await this.getById(trackerId);

    if (!tracker) {
      throw new Error('Tracker not found');
    }

    const updatedChannels = tracker.channels.map(ch => {
      if (ch.id === channelId) {
        const newErrorCount = (ch.errorCount || 0) + 1;
        return {
          ...ch,
          errorCount: newErrorCount,
          // Deaktiviere Channel nach 5 Fehlern
          isActive: newErrorCount >= 5 ? false : ch.isActive
        };
      }
      return ch;
    });

    await adminDb.collection(this.collectionName).doc(trackerId).update({
      channels: updatedChannels,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Lädt alle Channels eines Trackers (gefiltert nach aktiv/inaktiv)
   */
  async getChannels(
    trackerId: string,
    activeOnly: boolean = true
  ): Promise<MonitoringChannel[]> {
    const tracker = await this.getById(trackerId);

    if (!tracker) {
      return [];
    }

    if (activeOnly) {
      return tracker.channels.filter(ch => ch.isActive);
    }

    return tracker.channels;
  }
}

export const campaignMonitoringService = new CampaignMonitoringService();
