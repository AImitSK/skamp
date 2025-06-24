// src/lib/firebase/pr-service.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { PRCampaign } from '@/types/pr';

export const prService = {
  
  async create(campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'pr_campaigns'), {
      ...campaignData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(campaignId: string): Promise<PRCampaign | null> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PRCampaign;
    }
    return null;
  },

  async update(campaignId: string, data: Partial<Omit<PRCampaign, 'id'| 'userId'>>): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

};
