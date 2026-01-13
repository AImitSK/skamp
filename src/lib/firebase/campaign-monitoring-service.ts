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

// HINWEIS: Keine Client-SDK Services importieren! Diese lösen den Client-SDK Import aus.
// Stattdessen direkt mit adminDb arbeiten.
// Für RSS-Feed-Logik siehe Plan 02.

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
    // 1. Lade Kampagne (direkt mit Admin SDK)
    const campaignDoc = await adminDb.collection('pr_campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      throw new Error('Campaign not found');
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as PRCampaign;

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
   *
   * Workflow:
   * 1. Lade Verteilerlisten der Kampagne
   * 2. Extrahiere Kontakt-IDs aus den Listen
   * 3. Lade Kontakte und deren Publikations-Verknüpfungen
   * 4. Lade Publikationen mit RSS-Feeds
   * 5. Erstelle RSS-Feed Channels
   */
  private async buildChannelsFromRecipients(
    campaign: PRCampaign,
    organizationId: string
  ): Promise<MonitoringChannel[]> {
    const channels: MonitoringChannel[] = [];
    const processedPublicationIds = new Set<string>();

    try {
      // 1. Sammle alle Kontakt-IDs aus Verteilerlisten
      const contactIds = await this.getContactIdsFromDistributionLists(
        campaign.distributionListIds || [],
        organizationId
      );

      if (contactIds.length === 0) {
        console.log(`📧 Keine Kontakte in Verteilerlisten gefunden`);
        return [];
      }

      console.log(`📧 ${contactIds.length} Kontakte aus Verteilerlisten geladen`);

      // 2. Lade Kontakte und extrahiere Publikations-IDs
      const publicationIds = await this.getPublicationIdsFromContacts(contactIds, organizationId);

      if (publicationIds.length === 0) {
        console.log(`📰 Keine Publikationen bei Kontakten gefunden`);
        return [];
      }

      console.log(`📰 ${publicationIds.length} Publikationen bei Kontakten gefunden`);

      // 3. Lade Publikationen mit RSS-Feeds
      for (const publicationId of publicationIds) {
        // Verhindere Duplikate
        if (processedPublicationIds.has(publicationId)) continue;
        processedPublicationIds.add(publicationId);

        const publication = await this.getPublicationWithRssFeeds(publicationId);

        if (!publication) continue;

        // Extrahiere RSS-Feeds aus monitoringConfig oder legacy-Feld
        const rssFeeds = this.extractRssFeedsFromPublication(publication);

        if (rssFeeds.length === 0) continue;

        // Erstelle Channel für jeden RSS-Feed
        for (const feedUrl of rssFeeds) {
          const channelId = this.generateChannelId('rss_feed', publicationId, feedUrl);

          channels.push({
            id: channelId,
            type: 'rss_feed',
            publicationId: publicationId,
            publicationName: publication.title || 'Unbekannte Publikation',
            url: feedUrl,
            isActive: true,
            wasFound: false,
            articlesFound: 0,
            errorCount: 0
          });
        }
      }

      console.log(`📡 ${channels.length} RSS-Feed Channels erstellt`);

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der RSS-Feed Channels:', error);
    }

    return channels;
  }

  /**
   * Lädt Kontakt-IDs aus Verteilerlisten
   */
  private async getContactIdsFromDistributionLists(
    listIds: string[],
    organizationId: string
  ): Promise<string[]> {
    const allContactIds = new Set<string>();

    for (const listId of listIds) {
      try {
        const listDoc = await adminDb.collection('distribution_lists').doc(listId).get();

        if (!listDoc.exists) continue;

        const listData = listDoc.data();

        // Prüfe Organization-Zugehörigkeit
        if (listData?.organizationId !== organizationId) continue;

        // Statische Listen: direkte contactIds
        if (listData?.contactIds && Array.isArray(listData.contactIds)) {
          listData.contactIds.forEach((id: string) => allContactIds.add(id));
        }

        // Dynamische Listen: Hier müssten wir die Filter auswerten
        // Für jetzt überspringen wir dynamische Listen
        if (listData?.type === 'dynamic') {
          console.log(`⏭️ Dynamische Liste ${listId} übersprungen (TODO: Filter auswerten)`);
        }

      } catch (error) {
        console.error(`Fehler beim Laden der Liste ${listId}:`, error);
      }
    }

    return Array.from(allContactIds);
  }

  /**
   * Extrahiert Publikations-IDs aus Kontakten
   */
  private async getPublicationIdsFromContacts(
    contactIds: string[],
    organizationId: string
  ): Promise<string[]> {
    const publicationIds = new Set<string>();

    // Batch-Lade Kontakte (Firestore erlaubt max 30 IDs pro 'in' Query)
    const batchSize = 30;

    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);

      try {
        const snapshot = await adminDb
          .collection('contacts')
          .where('organizationId', '==', organizationId)
          .where('__name__', 'in', batch)
          .get();

        for (const doc of snapshot.docs) {
          const contact = doc.data();

          // 1. Prüfe mediaInfo.publications (Array von IDs)
          if (contact.mediaInfo?.publications && Array.isArray(contact.mediaInfo.publications)) {
            contact.mediaInfo.publications.forEach((id: string) => {
              if (id && typeof id === 'string') {
                publicationIds.add(id);
              }
            });
          }

          // 2. Prüfe companyInfo.publications (Array von Objekten)
          if (contact.companyInfo?.publications && Array.isArray(contact.companyInfo.publications)) {
            contact.companyInfo.publications.forEach((pub: any) => {
              if (pub?.id) {
                publicationIds.add(pub.id);
              }
            });
          }
        }

      } catch (error) {
        console.error(`Fehler beim Laden der Kontakte (Batch ${i}):`, error);
      }
    }

    return Array.from(publicationIds);
  }

  /**
   * Lädt Publikation mit RSS-Feed Informationen
   */
  private async getPublicationWithRssFeeds(publicationId: string): Promise<any | null> {
    try {
      const doc = await adminDb.collection('publications').doc(publicationId).get();

      if (!doc.exists) return null;

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Fehler beim Laden der Publikation ${publicationId}:`, error);
      return null;
    }
  }

  /**
   * Extrahiert RSS-Feed URLs aus Publikation
   * Unterstützt sowohl neue monitoringConfig als auch legacy rssFeedUrl
   */
  private extractRssFeedsFromPublication(publication: any): string[] {
    const feeds: string[] = [];

    // 1. Neue Struktur: monitoringConfig.rssFeedUrls (Array)
    if (publication.monitoringConfig?.rssFeedUrls && Array.isArray(publication.monitoringConfig.rssFeedUrls)) {
      publication.monitoringConfig.rssFeedUrls.forEach((url: string) => {
        if (url && typeof url === 'string' && url.startsWith('http')) {
          feeds.push(url);
        }
      });
    }

    // 2. Legacy: rssFeedUrl (einzelner String)
    if (publication.rssFeedUrl && typeof publication.rssFeedUrl === 'string' && publication.rssFeedUrl.startsWith('http')) {
      if (!feeds.includes(publication.rssFeedUrl)) {
        feeds.push(publication.rssFeedUrl);
      }
    }

    return feeds;
  }

  // buildChannelsFromPublication() wurde deaktiviert - wird in Plan 02 mit Admin SDK neu implementiert

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

    console.log(`🔍 buildGoogleNewsChannel: clientId=${campaign.clientId}, existingKeywords=${keywords.length}`);

    if (keywords.length === 0 && campaign.clientId) {
      // Lade Company und extrahiere Keywords
      const company = await this.getCompany(campaign.clientId, organizationId);
      console.log(`🔍 Company loaded:`, company ? { id: company.id, name: company.name, officialName: company.officialName } : 'null');

      if (company) {
        keywords = this.extractKeywordsFromCompany(company);
        console.log(`📝 Extracted ${keywords.length} keywords from company: ${keywords.join(', ')}`);
      }
    } else if (keywords.length === 0 && !campaign.clientId) {
      console.log('⚠️ No clientId on campaign - cannot extract keywords from company');
    }

    if (keywords.length === 0) {
      console.log('⚠️ No keywords available for Google News channel');
      return null;
    }

    // Baue Google News RSS URL mit OR für bessere Ergebnisse
    const query = keywords.join(' OR ');
    const encodedQuery = encodeURIComponent(query);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=de&gl=DE&ceid=DE:de`;

    // WICHTIG: Keine undefined-Werte für Firestore!
    // publicationId wird weggelassen da Google News nicht publication-spezifisch ist
    return {
      id: `google_news_${campaign.id}`,
      type: 'google_news',
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
   * Sucht zuerst in companies_enhanced, dann Fallback auf companies
   */
  private async getCompany(
    companyId: string,
    organizationId: string
  ): Promise<any | null> {
    try {
      // Primär: companies_enhanced (neue Collection)
      let companyDoc = await adminDb.collection('companies_enhanced').doc(companyId).get();

      if (!companyDoc.exists) {
        // Fallback: legacy companies Collection
        console.log(`🔍 Company not in companies_enhanced, trying companies...`);
        companyDoc = await adminDb.collection('companies').doc(companyId).get();
      }

      if (!companyDoc.exists) {
        console.log(`⚠️ Company ${companyId} not found in any collection`);
        return null;
      }

      const data = companyDoc.data();
      if (!data || data.organizationId !== organizationId) {
        console.log(`⚠️ Company ${companyId} organizationId mismatch: ${data?.organizationId} !== ${organizationId}`);
        return null;
      }

      return { id: companyDoc.id, ...data };
    } catch (error) {
      console.error('Error loading company:', error);
      return null;
    }
  }

  /**
   * Extrahiert Keywords aus Company-Daten
   * Verwendet name, officialName und tradingName
   *
   * WICHTIG: Filtert alleinstehende Rechtsformen heraus (z.B. nur "GmbH"),
   * da diese zu viele False Positives in Google News erzeugen.
   */
  private extractKeywordsFromCompany(company: any): string[] {
    const keywords: string[] = [];
    const legalForms = [
      'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
      'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
      'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC',
      '& Co.', '& Co', 'KGaA', 'mbH', 'Co. KG', 'Co.KG'
    ];

    const removeLegalForm = (name: string): string => {
      let cleaned = name.trim();
      for (const form of legalForms) {
        const regex = new RegExp(`\\s*${form.replace('.', '\\.')}\\s*$`, 'i');
        cleaned = cleaned.replace(regex, '').trim();
      }
      return cleaned;
    };

    // Prüft ob ein Keyword nur eine Rechtsform ist (zu generisch für Suche)
    const isOnlyLegalForm = (keyword: string): boolean => {
      const cleaned = keyword.trim();
      return legalForms.some(form =>
        cleaned.toLowerCase() === form.toLowerCase()
      );
    };

    // 1. name (Pflicht)
    if (company.name) {
      const name = company.name.trim();
      // Nur hinzufügen wenn es NICHT nur eine Rechtsform ist
      if (!isOnlyLegalForm(name)) {
        keywords.push(name);
      }
      const withoutLegal = removeLegalForm(name);
      if (withoutLegal !== name && withoutLegal.length >= 2 && !isOnlyLegalForm(withoutLegal)) {
        keywords.push(withoutLegal);
      }
    }

    // 2. officialName (falls vorhanden und anders als name)
    if (company.officialName && company.officialName !== company.name) {
      const officialName = company.officialName.trim();
      // Nur hinzufügen wenn es NICHT nur eine Rechtsform ist
      if (!isOnlyLegalForm(officialName)) {
        keywords.push(officialName);
      }
      const withoutLegal = removeLegalForm(officialName);
      if (withoutLegal !== officialName && !keywords.includes(withoutLegal) && withoutLegal.length >= 2 && !isOnlyLegalForm(withoutLegal)) {
        keywords.push(withoutLegal);
      }
    }

    // 3. tradingName (falls vorhanden)
    if (company.tradingName) {
      const tradingName = company.tradingName.trim();
      if (!keywords.includes(tradingName) && !isOnlyLegalForm(tradingName)) {
        keywords.push(tradingName);
      }
    }

    // Deduplizieren und filtern (min. 2 Zeichen, keine reinen Rechtsformen)
    return [...new Set(keywords)].filter(k => k.length >= 2 && !isOnlyLegalForm(k));
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
