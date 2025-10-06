/**
 * Spam Pattern Service
 *
 * Phase 3.2: Verwaltet Spam-Patterns für Monitoring
 *
 * Workflow:
 * 1. Admin erstellt globale Spam-Patterns (z.B. "Pressemitteilung")
 * 2. Kampagnen können eigene Patterns haben
 * 3. Crawler prüft jeden Artikel gegen Patterns
 * 4. Bei Match: Artikel wird als Spam markiert
 * 5. Pattern-Counter für Analytics
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
  increment
} from 'firebase/firestore';
import { db } from './config';
import { SpamPattern } from '@/types/monitoring';

class SpamPatternService {
  private collectionName = 'spam_patterns';

  /**
   * Erstellt neues Spam Pattern
   */
  async create(
    pattern: Omit<SpamPattern, 'id' | 'createdAt' | 'updatedAt' | 'timesMatched' | 'createdBy'>,
    context: { userId: string }
  ): Promise<string> {
    const data: Omit<SpamPattern, 'id'> = {
      ...pattern,
      timesMatched: 0,
      createdBy: context.userId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(collection(db, this.collectionName), data);

    console.log(`✅ Spam pattern created: ${pattern.pattern} (${pattern.type})`);

    return docRef.id;
  }

  /**
   * Lädt alle Patterns für Organisation
   */
  async getByOrganization(
    organizationId: string,
    scope?: 'global' | 'campaign'
  ): Promise<SpamPattern[]> {
    const constraints = [
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    ];

    if (scope) {
      constraints.push(where('scope', '==', scope));
    }

    const q = query(
      collection(db, this.collectionName),
      ...constraints
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SpamPattern[];
  }

  /**
   * Lädt ALLE Patterns für Organisation (inkl. inaktive)
   * Für Settings/Admin UI
   */
  async getAllByOrganization(
    organizationId: string,
    scope?: 'global' | 'campaign'
  ): Promise<SpamPattern[]> {
    const constraints = [
      where('organizationId', '==', organizationId)
    ];

    if (scope) {
      constraints.push(where('scope', '==', scope));
    }

    const q = query(
      collection(db, this.collectionName),
      ...constraints
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SpamPattern[];
  }

  /**
   * Lädt Patterns für spezifische Kampagne (Global + Campaign-Specific)
   */
  async getPatternsForCampaign(
    organizationId: string,
    campaignId: string
  ): Promise<SpamPattern[]> {
    // Lade sowohl globale als auch kampagnen-spezifische Patterns
    const globalQuery = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('scope', '==', 'global'),
      where('isActive', '==', true)
    );

    const campaignQuery = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('scope', '==', 'campaign'),
      where('campaignId', '==', campaignId),
      where('isActive', '==', true)
    );

    const [globalSnap, campaignSnap] = await Promise.all([
      getDocs(globalQuery),
      getDocs(campaignQuery)
    ]);

    const patterns: SpamPattern[] = [
      ...globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpamPattern)),
      ...campaignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpamPattern))
    ];

    return patterns;
  }

  /**
   * Prüft ob URL/Titel gegen Spam-Patterns matcht
   */
  async checkForSpam(
    url: string,
    title: string,
    outletName: string,
    organizationId: string,
    campaignId?: string
  ): Promise<{ isSpam: boolean; matchedPattern?: SpamPattern }> {
    // Lade relevante Patterns
    const patterns = campaignId
      ? await this.getPatternsForCampaign(organizationId, campaignId)
      : await this.getByOrganization(organizationId, 'global');

    for (const pattern of patterns) {
      let isMatch = false;

      switch (pattern.type) {
        case 'url_domain':
          isMatch = this.matchPattern(url, pattern);
          break;
        case 'keyword_title':
          isMatch = this.matchPattern(title, pattern);
          break;
        case 'keyword_content':
          // TODO: Content matching wenn fullText vorhanden
          // Für Phase 5: Nur Title + URL
          break;
        case 'outlet_name':
          isMatch = this.matchPattern(outletName, pattern);
          break;
      }

      if (isMatch) {
        // Increment match counter
        if (pattern.id) {
          await this.incrementMatchCount(pattern.id);
        }

        console.log(`🚫 Spam detected: "${title}" matched pattern "${pattern.pattern}"`);

        return {
          isSpam: true,
          matchedPattern: pattern
        };
      }
    }

    return { isSpam: false };
  }

  /**
   * Pattern Matching Logik
   */
  private matchPattern(text: string, pattern: SpamPattern): boolean {
    if (!text) return false;

    const textLower = text.toLowerCase();
    const patternLower = pattern.pattern.toLowerCase();

    if (pattern.isRegex) {
      try {
        const regex = new RegExp(patternLower, 'i');
        return regex.test(text);
      } catch (e) {
        console.error('Invalid regex pattern:', pattern.pattern);
        return false;
      }
    } else {
      // Einfacher String-Match
      return textLower.includes(patternLower);
    }
  }

  /**
   * Erhöht Match Counter
   */
  private async incrementMatchCount(patternId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, patternId);
      await updateDoc(docRef, {
        timesMatched: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to increment match count:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Aktualisiert Pattern
   */
  async update(
    patternId: string,
    updates: Partial<Omit<SpamPattern, 'id' | 'createdAt' | 'createdBy' | 'organizationId'>>,
    context: { userId: string }
  ): Promise<void> {
    const docRef = doc(db, this.collectionName, patternId);

    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Spam pattern updated: ${patternId}`);
  }

  /**
   * Deaktiviert Pattern (Soft Delete)
   */
  async deactivate(patternId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, patternId);

    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    console.log(`⏹️  Spam pattern deactivated: ${patternId}`);
  }

  /**
   * Löscht Pattern permanent
   */
  async delete(patternId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, patternId);
    await deleteDoc(docRef);

    console.log(`🗑️  Spam pattern deleted: ${patternId}`);
  }

  /**
   * Lädt Pattern by ID
   */
  async getById(patternId: string): Promise<SpamPattern | null> {
    const docRef = doc(db, this.collectionName, patternId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as SpamPattern;
  }

  /**
   * Lädt Pattern-Statistiken für Organisation
   */
  async getStats(organizationId: string): Promise<{
    totalPatterns: number;
    activePatterns: number;
    totalMatches: number;
    topPatterns: Array<{ pattern: SpamPattern; matches: number }>;
  }> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId)
    );

    const snapshot = await getDocs(q);

    const patterns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SpamPattern[];

    const activePatterns = patterns.filter(p => p.isActive);
    const totalMatches = patterns.reduce((sum, p) => sum + (p.timesMatched || 0), 0);

    // Top 10 Patterns nach Matches
    const topPatterns = patterns
      .filter(p => (p.timesMatched || 0) > 0)
      .sort((a, b) => (b.timesMatched || 0) - (a.timesMatched || 0))
      .slice(0, 10)
      .map(p => ({
        pattern: p,
        matches: p.timesMatched || 0
      }));

    return {
      totalPatterns: patterns.length,
      activePatterns: activePatterns.length,
      totalMatches,
      topPatterns
    };
  }

  /**
   * Erstellt Standard-Patterns für neue Organisation
   */
  async createDefaultPatterns(
    organizationId: string,
    userId: string
  ): Promise<string[]> {
    const defaultPatterns: Array<Omit<SpamPattern, 'id' | 'createdAt' | 'updatedAt' | 'timesMatched' | 'createdBy'>> = [
      {
        organizationId,
        type: 'keyword_title',
        pattern: 'pressemitteilung',
        isRegex: false,
        scope: 'global',
        isActive: true,
        description: 'Filtert Pressemitteilungen (oft irrelevant)'
      },
      {
        organizationId,
        type: 'keyword_title',
        pattern: 'anzeige',
        isRegex: false,
        scope: 'global',
        isActive: true,
        description: 'Filtert gekennzeichnete Anzeigen'
      },
      {
        organizationId,
        type: 'keyword_title',
        pattern: 'sponsored',
        isRegex: false,
        scope: 'global',
        isActive: true,
        description: 'Filtert gesponserte Inhalte'
      },
      {
        organizationId,
        type: 'url_domain',
        pattern: 'example.com',
        isRegex: false,
        scope: 'global',
        isActive: false,
        description: 'Beispiel: Domain-basierter Filter (deaktiviert)'
      }
    ];

    const createdIds: string[] = [];

    for (const pattern of defaultPatterns) {
      const id = await this.create(
        pattern,
        { userId }
      );
      createdIds.push(id);
    }

    console.log(`✅ Created ${createdIds.length} default spam patterns for organization ${organizationId}`);

    return createdIds;
  }
}

export const spamPatternService = new SpamPatternService();
