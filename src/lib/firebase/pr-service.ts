// src/lib/firebase/pr-service.ts - SAUBERE VERSION
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
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

  async getAll(userId: string): Promise<PRCampaign[]> {
    try {
      // Mit orderBy für chronologische Sortierung
      const q = query(
        collection(db, 'pr_campaigns'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PRCampaign));
    } catch (error: any) {
      // Fallback ohne orderBy falls Index fehlt
      if (error.code === 'failed-precondition') {
        console.warn('Firestore Index fehlt, verwende Fallback ohne orderBy');
        const q = query(
          collection(db, 'pr_campaigns'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const campaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PRCampaign));
        
        // Client-seitige Sortierung
        return campaigns.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
      }
      throw error;
    }
  },

  async getByStatus(userId: string, status: string): Promise<PRCampaign[]> {
    const q = query(
      collection(db, 'pr_campaigns'),
      where('userId', '==', userId),
      where('status', '==', status)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PRCampaign));
  },

  async update(campaignId: string, data: Partial<Omit<PRCampaign, 'id'| 'userId'>>): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(campaignId: string): Promise<void> {
    await deleteDoc(doc(db, 'pr_campaigns', campaignId));
  },

  async deleteMany(campaignIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    campaignIds.forEach(id => {
      const docRef = doc(db, 'pr_campaigns', id);
      batch.delete(docRef);
    });
    await batch.commit();
  },

  async updateStatus(campaignId: string, status: string): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'sent') {
      updateData.sentAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);
  },

  async getStats(userId: string): Promise<{
    total: number;
    drafts: number;
    scheduled: number;
    sent: number;
    archived: number;
    totalRecipients: number;
  }> {
    const campaigns = await this.getAll(userId);
    
    return campaigns.reduce((acc, campaign) => {
      acc.total++;
      acc[campaign.status as keyof typeof acc]++;
      acc.totalRecipients += campaign.recipientCount || 0;
      return acc;
    }, {
      total: 0,
      drafts: 0,
      scheduled: 0,
      sent: 0,
      archived: 0,
      totalRecipients: 0
    });
  },

  async search(userId: string, searchTerm: string): Promise<PRCampaign[]> {
    const allCampaigns = await this.getAll(userId);
    const term = searchTerm.toLowerCase();
    
    return allCampaigns.filter(campaign => 
      campaign.title.toLowerCase().includes(term) ||
      campaign.distributionListName.toLowerCase().includes(term) ||
      campaign.contentHtml.toLowerCase().includes(term)
    );
  }
};