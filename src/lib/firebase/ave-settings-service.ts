import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from './client-init';
import { AVESettings, DEFAULT_AVE_SETTINGS, MediaClipping } from '@/types/monitoring';

class AVESettingsService {
  private collectionName = 'ave_settings';

  async getOrCreate(organizationId: string, userId: string): Promise<AVESettings> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as AVESettings;
    }

    const newSettings: Omit<AVESettings, 'id'> = {
      organizationId,
      ...DEFAULT_AVE_SETTINGS,
      updatedBy: userId,
      updatedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any
    };

    const docRef = doc(collection(db, this.collectionName));
    await setDoc(docRef, newSettings);

    return { id: docRef.id, ...newSettings } as AVESettings;
  }

  async update(
    settingsId: string,
    data: Partial<Omit<AVESettings, 'id' | 'organizationId' | 'createdAt'>>,
    userId: string
  ): Promise<void> {
    const docRef = doc(db, this.collectionName, settingsId);

    await setDoc(docRef, {
      ...data,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  calculateAVE(clipping: MediaClipping, settings: AVESettings): number {
    if (!clipping.reach) return 0;

    const factor = settings.factors[clipping.outletType] || 0;

    let sentimentMultiplier = settings.sentimentMultipliers.neutral;

    if (clipping.sentimentScore !== undefined) {
      if (clipping.sentimentScore > 0.3) {
        sentimentMultiplier = settings.sentimentMultipliers.positive;
      } else if (clipping.sentimentScore < -0.3) {
        sentimentMultiplier = settings.sentimentMultipliers.negative;
      }
    } else {
      sentimentMultiplier = settings.sentimentMultipliers[clipping.sentiment];
    }

    return Math.round(clipping.reach * factor * sentimentMultiplier);
  }

  getSentimentScoreFromLabel(sentiment: 'positive' | 'neutral' | 'negative'): number {
    switch (sentiment) {
      case 'positive': return 0.7;
      case 'neutral': return 0;
      case 'negative': return -0.7;
    }
  }
}

export const aveSettingsService = new AVESettingsService();