import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './client-init';
import { MediaClipping, ClippingStats } from '@/types/monitoring';

interface ServiceContext {
  organizationId: string;
  userId?: string;
}

/**
 * Duplikat-Prüfungsergebnis
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingClipping?: MediaClipping;
  matchType?: 'exact_url' | 'normalized_url';
}

/**
 * Normalisiert eine URL für Duplikat-Vergleich
 * Entfernt: www., trailing slashes, query params (utm_*, ref, etc.), Protokoll-Unterschiede
 */
export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);

    // Hostname normalisieren (www. entfernen, lowercase)
    let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Pfad normalisieren (trailing slash entfernen)
    let pathname = parsed.pathname.replace(/\/+$/, '');

    // Nur relevante Query-Parameter behalten (die meisten sind Tracking)
    // Behalte nur Parameter die Teil der Artikel-ID sein könnten
    const keepParams = ['id', 'article', 'p', 'page', 'story'];
    const newParams = new URLSearchParams();

    parsed.searchParams.forEach((value, key) => {
      const keyLower = key.toLowerCase();
      if (keepParams.includes(keyLower) || keyLower.startsWith('article')) {
        newParams.set(key, value);
      }
    });

    const queryString = newParams.toString();

    return `${hostname}${pathname}${queryString ? '?' + queryString : ''}`;
  } catch {
    // Falls URL ungültig, einfach lowercase und trimmen
    return url.toLowerCase().trim();
  }
}

export const clippingService = {

  async create(clipping: Omit<MediaClipping, 'id' | 'createdAt' | 'updatedAt'>, context: ServiceContext): Promise<string> {
    const clippingData = {
      ...clipping,
      organizationId: context.organizationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'media_clippings'), clippingData);
    return docRef.id;
  },

  async getById(id: string, context: ServiceContext): Promise<MediaClipping | null> {
    const docRef = doc(db, 'media_clippings', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    if (data.organizationId !== context.organizationId) return null;

    return { id: docSnap.id, ...data } as MediaClipping;
  },

  async getByCampaignId(campaignId: string, context: ServiceContext): Promise<MediaClipping[]> {
    const q = query(
      collection(db, 'media_clippings'),
      where('organizationId', '==', context.organizationId),
      where('campaignId', '==', campaignId),
      orderBy('publishedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MediaClipping));
  },

  async getByProjectId(projectId: string, context: ServiceContext): Promise<MediaClipping[]> {
    const q = query(
      collection(db, 'media_clippings'),
      where('organizationId', '==', context.organizationId),
      where('projectId', '==', projectId),
      orderBy('publishedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MediaClipping));
  },

  async update(id: string, data: Partial<MediaClipping>, context: ServiceContext): Promise<void> {
    const docRef = doc(db, 'media_clippings', id);

    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists() || existingDoc.data().organizationId !== context.organizationId) {
      throw new Error('Clipping not found or access denied');
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async delete(id: string, context: ServiceContext): Promise<void> {
    const docRef = doc(db, 'media_clippings', id);

    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists() || existingDoc.data().organizationId !== context.organizationId) {
      throw new Error('Clipping not found or access denied');
    }

    await deleteDoc(docRef);
  },

  async getCampaignStats(campaignId: string, context: ServiceContext): Promise<ClippingStats> {
    const clippings = await this.getByCampaignId(campaignId, context);

    return this.calculateStats(clippings);
  },

  async getProjectStats(projectId: string, context: ServiceContext): Promise<ClippingStats> {
    const clippings = await this.getByProjectId(projectId, context);

    return this.calculateStats(clippings);
  },

  /**
   * Prüft ob bereits ein Clipping mit dieser URL existiert (Duplikat-Erkennung)
   * Sucht in der gleichen Kampagne nach exakter oder normalisierter URL-Übereinstimmung
   */
  async checkForDuplicate(
    url: string,
    campaignId: string,
    context: ServiceContext
  ): Promise<DuplicateCheckResult> {
    // Lade alle Clippings der Kampagne
    const clippings = await this.getByCampaignId(campaignId, context);

    if (clippings.length === 0) {
      return { isDuplicate: false };
    }

    const normalizedInputUrl = normalizeUrlForComparison(url);

    // Suche nach Duplikat
    for (const clipping of clippings) {
      // Exakte URL-Übereinstimmung
      if (clipping.url === url) {
        return {
          isDuplicate: true,
          existingClipping: clipping,
          matchType: 'exact_url'
        };
      }

      // Normalisierte URL-Übereinstimmung
      const normalizedClippingUrl = normalizeUrlForComparison(clipping.url);
      if (normalizedClippingUrl === normalizedInputUrl) {
        return {
          isDuplicate: true,
          existingClipping: clipping,
          matchType: 'normalized_url'
        };
      }
    }

    return { isDuplicate: false };
  },

  calculateStats(clippings: MediaClipping[]): ClippingStats {
    const stats: ClippingStats = {
      totalClippings: clippings.length,
      totalReach: 0,
      totalAVE: 0,
      sentimentBreakdown: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      byOutletType: {
        print: 0,
        online: 0,
        broadcast: 0,
        blog: 0
      },
      byCategory: {
        news: 0,
        feature: 0,
        interview: 0,
        mention: 0
      }
    };

    clippings.forEach(clipping => {
      stats.totalReach += clipping.reach || 0;
      stats.totalAVE += clipping.ave || 0;

      stats.sentimentBreakdown[clipping.sentiment]++;
      stats.byOutletType[clipping.outletType]++;

      if (clipping.category) {
        stats.byCategory[clipping.category]++;
      }
    });

    return stats;
  }
};