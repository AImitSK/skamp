/**
 * Clipping Test Data Generator
 *
 * Plan 05: Erstellt Test-Daten für das Clipping/Monitoring-System
 * Ermöglicht schnelles Testing ohne echte RSS-Feeds
 */

import { db } from '@/lib/firebase/client-init';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface ClippingTestDataStats {
  projects: number;
  companies: number;
  campaigns: number;
  clippings: number;
  suggestions: number;
}

/**
 * Erstellt realistische Test-Daten für das Clipping-System
 */
export async function seedClippingTestData(
  organizationId: string,
  userId: string
): Promise<ClippingTestDataStats> {

  // 1. Test-Company erstellen
  const companyRef = await addDoc(collection(db, 'companies'), {
    organizationId,
    name: 'TechVision GmbH',
    officialName: 'TechVision Solutions GmbH',
    tradingName: 'TechVision',
    isTestData: true,
    createdAt: serverTimestamp(),
    createdBy: userId
  });

  // 2. Test-Projekt erstellen (mit allen Pflichtfeldern für Projects-Page)
  const projectRef = await addDoc(collection(db, 'projects'), {
    organizationId,
    userId, // Pflichtfeld
    title: 'Test-Projekt: Clipping System',
    description: 'Automatisch generiertes Test-Projekt für Clipping-System Tests',
    // Kunde als korrektes Objekt (nicht nur companyId)
    customer: {
      id: companyRef.id,
      name: 'TechVision GmbH'
    },
    status: 'active',
    currentStage: 'monitoring', // Pflichtfeld - direkt in Monitoring für Tests
    linkedCampaigns: [],
    isTestData: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), // Pflichtfeld für orderBy Query
    createdBy: userId
  });

  // 3. Test-Kampagne mit Monitoring
  const campaignRef = await addDoc(collection(db, 'pr_campaigns'), {
    organizationId,
    projectId: projectRef.id,
    title: 'Test-Kampagne: Produkt-Launch',
    status: 'sent',
    monitoringConfig: {
      isEnabled: true,
      keywords: ['TechVision', 'Smart Home', 'IoT'],
      monitoringPeriod: 30
    },
    isTestData: true,
    createdAt: serverTimestamp(),
    createdBy: userId,
    sentAt: serverTimestamp()
  });

  // 3b. Monitoring-Tracker erstellen
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  await addDoc(collection(db, 'campaign_monitoring_trackers'), {
    organizationId,
    campaignId: campaignRef.id,
    isActive: true,
    startDate: Timestamp.fromDate(now),
    endDate: Timestamp.fromDate(endDate),
    totalArticlesFound: 0,
    totalAutoConfirmed: 0,
    totalManuallyAdded: 0,
    isTestData: true,
    createdAt: serverTimestamp()
  });

  // 4. Test-Clippings erstellen
  const testClippings = [
    {
      title: 'TechVision revolutioniert Smart Home Markt',
      outletName: 'Handelsblatt',
      sentiment: 'positive',
      reach: 850000
    },
    {
      title: 'Neue IoT-Lösung von TechVision vorgestellt',
      outletName: 'Heise Online',
      sentiment: 'neutral',
      reach: 1200000
    },
    {
      title: 'Smart Home Trends 2025 - TechVision unter Top 10',
      outletName: 'FAZ',
      sentiment: 'positive',
      reach: 450000
    },
    {
      title: 'TechVision-CEO im Interview über Zukunftspläne',
      outletName: 'Manager Magazin',
      sentiment: 'positive',
      reach: 320000
    },
    {
      title: 'Kritik an neuer TechVision-Datenschutzrichtlinie',
      outletName: 'Netzpolitik',
      sentiment: 'negative',
      reach: 180000
    }
  ];

  let clippingCount = 0;
  for (const clipping of testClippings) {
    await addDoc(collection(db, 'media_clippings'), {
      organizationId,
      campaignId: campaignRef.id,
      ...clipping,
      url: `https://example.com/article/${Date.now()}-${clippingCount}`,
      outletType: 'online',
      detectionMethod: 'automated',
      isTestData: true,
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userId
    });
    clippingCount++;
  }

  // 5. Test-Suggestions (Auto-Funde) erstellen
  const testSuggestions = [
    {
      articleTitle: 'TechVision startet Partnerschaft mit Telekom',
      confidence: 'high',
      matchScore: 85
    },
    {
      articleTitle: 'Smart Home Anbieter im Vergleich',
      confidence: 'medium',
      matchScore: 65
    },
    {
      articleTitle: 'IoT-Sicherheit: Was Verbraucher wissen müssen',
      confidence: 'low',
      matchScore: 45
    }
  ];

  let suggestionCount = 0;
  for (const suggestion of testSuggestions) {
    await addDoc(collection(db, 'monitoring_suggestions'), {
      organizationId,
      campaignId: campaignRef.id,
      articleTitle: suggestion.articleTitle,
      articleUrl: `https://example.com/suggestion/${Date.now()}-${suggestionCount}`,
      articleExcerpt: `Dies ist ein Auszug aus dem Artikel "${suggestion.articleTitle}"...`,
      status: 'pending',
      autoConfirmResult: {
        shouldConfirm: suggestion.confidence === 'high',
        reason: suggestion.confidence === 'high' ? 'company_in_title' : 'company_only',
        companyMatch: {
          found: true,
          inTitle: suggestion.confidence === 'high',
          matchedKeyword: 'TechVision'
        },
        seoScore: suggestion.matchScore
      },
      confidence: suggestion.confidence,
      sources: [{
        type: 'rss_feed',
        sourceName: 'Test-RSS-Feed',
        matchScore: suggestion.matchScore
      }],
      avgMatchScore: suggestion.matchScore,
      highestMatchScore: suggestion.matchScore,
      isTestData: true,
      createdAt: serverTimestamp()
    });
    suggestionCount++;
  }

  // Update Project linkedCampaigns
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, 'projects', projectRef.id), {
    linkedCampaigns: [campaignRef.id]
  });

  return {
    projects: 1,
    companies: 1,
    campaigns: 1,
    clippings: clippingCount,
    suggestions: suggestionCount
  };
}

/**
 * Löscht alle Test-Daten einer Organisation
 */
export async function cleanupClippingTestData(organizationId: string): Promise<void> {
  const collections = [
    'media_clippings',
    'monitoring_suggestions',
    'campaign_monitoring_trackers',
    'pr_campaigns',
    'projects',
    'companies'
  ];

  for (const collectionName of collections) {
    const q = query(
      collection(db, collectionName),
      where('organizationId', '==', organizationId),
      where('isTestData', '==', true)
    );

    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  }
}
