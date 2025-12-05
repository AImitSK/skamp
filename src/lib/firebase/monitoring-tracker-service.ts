/**
 * Monitoring Tracker Service (Client SDK)
 *
 * Plan 03: Client-Side Service für Monitoring-Steuerung
 * Ermöglicht UI-Operationen wie Toggle, Verlängern, Laden von Trackern
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './client-init';
import { CampaignMonitoringTracker } from '@/types/monitoring';

interface ServiceContext {
  organizationId: string;
  userId?: string;
}

export const monitoringTrackerService = {

  /**
   * Lädt den Tracker für ein Projekt (über verknüpfte Kampagnen)
   */
  async getTrackerForProject(
    projectId: string,
    context: ServiceContext
  ): Promise<CampaignMonitoringTracker | null> {
    // 1. Lade Projekt-Daten um linkedCampaigns zu bekommen
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return null;
    }

    const project = projectDoc.data();

    // Prüfe organizationId
    if (project.organizationId !== context.organizationId) {
      return null;
    }

    // 2. Sammle alle Campaign-IDs (linkedCampaigns + projectId-basiert)
    const campaignIds: string[] = [];

    // LinkedCampaigns
    if (project.linkedCampaigns?.length) {
      campaignIds.push(...project.linkedCampaigns);
    }

    // Suche auch Kampagnen mit projectId (Fallback)
    const campaignsQuery = query(
      collection(db, 'pr_campaigns'),
      where('projectId', '==', projectId),
      where('organizationId', '==', context.organizationId)
    );
    const campaignsSnapshot = await getDocs(campaignsQuery);
    campaignsSnapshot.docs.forEach(doc => {
      if (!campaignIds.includes(doc.id)) {
        campaignIds.push(doc.id);
      }
    });

    if (campaignIds.length === 0) {
      return null;
    }

    // 3. Suche aktiven Tracker für eine der Kampagnen
    // Firestore erlaubt max 30 Items in 'in' Query
    const batchSize = 30;
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      const batch = campaignIds.slice(i, i + batchSize);

      const trackersQuery = query(
        collection(db, 'campaign_monitoring_trackers'),
        where('campaignId', 'in', batch)
      );

      const trackersSnapshot = await getDocs(trackersQuery);

      if (!trackersSnapshot.empty) {
        // Nimm den ersten gefundenen Tracker
        const doc = trackersSnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as CampaignMonitoringTracker;
      }
    }

    return null;
  },

  /**
   * Lädt den Tracker für eine bestimmte Kampagne
   */
  async getTrackerByCampaign(
    campaignId: string,
    context: ServiceContext
  ): Promise<CampaignMonitoringTracker | null> {
    const trackersQuery = query(
      collection(db, 'campaign_monitoring_trackers'),
      where('campaignId', '==', campaignId),
      where('organizationId', '==', context.organizationId)
    );

    const snapshot = await getDocs(trackersQuery);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as CampaignMonitoringTracker;
  },

  /**
   * Lädt Tracker by ID
   */
  async getById(
    trackerId: string,
    context: ServiceContext
  ): Promise<CampaignMonitoringTracker | null> {
    const docRef = doc(db, 'campaign_monitoring_trackers', trackerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    if (data.organizationId !== context.organizationId) return null;

    return {
      id: docSnap.id,
      ...data
    } as CampaignMonitoringTracker;
  },

  /**
   * Verlängert den Monitoring-Zeitraum um X Tage
   */
  async extendMonitoringPeriod(
    trackerId: string,
    additionalDays: 30 | 60 | 90,
    context: ServiceContext
  ): Promise<void> {
    // Lade aktuellen Tracker
    const tracker = await this.getById(trackerId, context);

    if (!tracker) {
      throw new Error('Tracker nicht gefunden');
    }

    // Berechne neues End-Datum
    const currentEndDate = tracker.endDate && typeof tracker.endDate.toDate === 'function'
      ? tracker.endDate.toDate()
      : new Date(tracker.endDate as unknown as string);

    const now = new Date();

    // Wenn abgelaufen, von jetzt an rechnen, sonst von aktuellem Ende
    const baseDate = currentEndDate < now ? now : currentEndDate;
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    // Update Tracker
    const docRef = doc(db, 'campaign_monitoring_trackers', trackerId);
    await updateDoc(docRef, {
      endDate: Timestamp.fromDate(newEndDate),
      isActive: true, // Reaktivieren falls deaktiviert/abgelaufen
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Aktiviert/Deaktiviert das Monitoring
   */
  async toggleMonitoring(
    trackerId: string,
    isActive: boolean,
    context: ServiceContext
  ): Promise<void> {
    // Prüfe Zugriff
    const tracker = await this.getById(trackerId, context);

    if (!tracker) {
      throw new Error('Tracker nicht gefunden');
    }

    const docRef = doc(db, 'campaign_monitoring_trackers', trackerId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Lädt alle Tracker für eine Organisation
   */
  async getAllForOrganization(
    context: ServiceContext
  ): Promise<CampaignMonitoringTracker[]> {
    const q = query(
      collection(db, 'campaign_monitoring_trackers'),
      where('organizationId', '==', context.organizationId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CampaignMonitoringTracker[];
  }
};
