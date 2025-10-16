// src/lib/firebase/media-clippings-service.ts
// Media Clippings Service - Monitoring & Clipping Operations
// Extrahiert aus media-service.ts (Phase 2.1)

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// === CLIPPING/MONITORING OPERATIONS ===

/**
 * Save clipping as media asset
 */
export async function saveClippingAsset(
  clipping: any, // ClippingAsset from types/media
  context: { organizationId: string; userId: string }
): Promise<string> {
  try {
    const clippingData: any = {
      organizationId: context.organizationId,
      createdBy: context.userId,
      fileName: `${clipping.outlet}_${Date.now()}.txt`,
      fileType: 'text/clipping',
      storagePath: `clippings/${context.organizationId}/${clipping.id}`,
      downloadUrl: clipping.url || '',
      description: clipping.content || clipping.title,
      tags: clipping.tags || [],

      // Clipping-spezifische Felder
      type: 'clipping',
      outlet: clipping.outlet,
      publishDate: clipping.publishDate,
      reachValue: clipping.reachValue || 0,
      sentimentScore: clipping.sentimentScore || 0,

      // Pipeline-Kontext
      projectId: clipping.projectId,
      campaignId: clipping.campaignId,
      distributionId: clipping.distributionId,
      monitoringPhaseId: clipping.monitoringPhaseId,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'media_assets'), clippingData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all clippings for a project
 */
export async function getProjectClippings(
  projectId: string,
  organizationId: string
): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'media_assets'),
      where('organizationId', '==', organizationId),
      where('type', '==', 'clipping'),
      where('projectId', '==', projectId),
      orderBy('publishDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const clippings = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        userId: data.createdBy || data.organizationId
      };
    });

    return clippings;
  } catch (error) {
    console.error('Fehler beim Laden der Projekt-Clippings:', error);
    return [];
  }
}

/**
 * Update clipping metrics
 */
export async function updateClippingMetrics(
  clippingId: string,
  metrics: any, // ClippingMetrics from types/media
  context: { organizationId: string; userId: string }
): Promise<void> {
  try {
    const docRef = doc(db, 'media_assets', clippingId);

    // Sicherheitsprüfung: Clipping gehört zur Organisation
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Clipping nicht gefunden');
    }

    const clippingData = docSnap.data();
    if (clippingData.organizationId !== context.organizationId) {
      throw new Error('Keine Berechtigung');
    }

    await updateDoc(docRef, {
      reachValue: metrics.reachValue,
      sentimentScore: metrics.sentimentScore,
      mediaValue: metrics.mediaValue,
      engagementScore: metrics.engagementScore,
      costPerReach: metrics.costPerReach,
      earnedMediaValue: metrics.earnedMediaValue,
      updatedAt: serverTimestamp(),
      updatedBy: context.userId
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Generate screenshot for clipping
 */
export async function generateClippingScreenshot(
  url: string,
  clippingId: string,
  context: { organizationId: string; userId: string }
): Promise<string> {
  try {
    // Placeholder - echte Screenshot-Generation würde hier stattfinden
    // z.B. über Puppeteer, Playwright oder externen Service

    // Für jetzt: Return Placeholder URL
    const placeholderUrl = `https://via.placeholder.com/800x600/f0f0f0/333333?text=${encodeURIComponent('Screenshot wird generiert...')}`;

    // Aktualisiere Clipping mit Screenshot URL
    const docRef = doc(db, 'media_assets', clippingId);
    await updateDoc(docRef, {
      screenshot: placeholderUrl,
      screenshotGeneratedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return placeholderUrl;
  } catch (error) {
    console.error('Fehler bei Screenshot-Generierung:', error);
    throw error;
  }
}

/**
 * Search clippings with advanced filters
 */
export async function searchClippings(
  organizationId: string,
  filters: {
    projectIds?: string[];
    outlets?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    sentimentRange?: { min: number; max: number };
    reachMin?: number;
    searchTerm?: string;
  }
): Promise<any[]> {
  try {
    let q = query(
      collection(db, 'media_assets'),
      where('organizationId', '==', organizationId),
      where('type', '==', 'clipping')
    );

    // Grundlegende Firestore-Filter
    if (filters.dateFrom) {
      q = query(q, where('publishDate', '>=', Timestamp.fromDate(filters.dateFrom)));
    }
    if (filters.dateTo) {
      q = query(q, where('publishDate', '<=', Timestamp.fromDate(filters.dateTo)));
    }

    const snapshot = await getDocs(q);
    let clippings = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        userId: data.createdBy || data.organizationId
      };
    });

    // Client-seitige Filterung für komplexe Filter
    if (filters.projectIds?.length) {
      clippings = clippings.filter(c => filters.projectIds!.includes((c as any).projectId));
    }

    if (filters.outlets?.length) {
      clippings = clippings.filter(c => filters.outlets!.includes((c as any).outlet));
    }

    if (filters.sentimentRange) {
      clippings = clippings.filter(c =>
        (c as any).sentimentScore >= filters.sentimentRange!.min &&
        (c as any).sentimentScore <= filters.sentimentRange!.max
      );
    }

    if (filters.reachMin) {
      clippings = clippings.filter(c => (c as any).reachValue >= filters.reachMin!);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      clippings = clippings.filter(c =>
        (c as any).title?.toLowerCase().includes(searchLower) ||
        (c as any).content?.toLowerCase().includes(searchLower) ||
        (c as any).outlet?.toLowerCase().includes(searchLower)
      );
    }

    return clippings.sort((a, b) => {
      const aTime = (a as any).publishDate?.seconds || 0;
      const bTime = (b as any).publishDate?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Fehler bei Clipping-Suche:', error);
    return [];
  }
}

/**
 * Create clipping package for export
 */
export async function createClippingPackage(
  clippingIds: string[],
  packageName: string,
  context: { organizationId: string; userId: string }
): Promise<string> {
  try {
    // Validiere alle Clippings gehören zur Organisation
    const clippingPromises = clippingIds.map(id => getDoc(doc(db, 'media_assets', id)));
    const clippingDocs = await Promise.all(clippingPromises);

    const validClippings = clippingDocs
      .filter(docSnap => docSnap.exists() && docSnap.data()?.organizationId === context.organizationId)
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    if (validClippings.length === 0) {
      throw new Error('Keine gültigen Clippings gefunden');
    }

    // Erstelle Share Link für Clipping Package
    const { createShareLink } = await import('./media-shares-service');
    const shareData = {
      targetId: 'clipping_package',
      type: 'clipping_package' as any,
      title: packageName,
      description: `Package mit ${validClippings.length} Clippings`,
      settings: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
        downloadAllowed: true,
        passwordRequired: null,
        watermarkEnabled: false
      },
      assetIds: clippingIds,
      organizationId: context.organizationId,
      createdBy: context.userId
    };

    const shareLink = await createShareLink(shareData);
    return shareLink.shareId!;
  } catch (error) {
    throw error;
  }
}

/**
 * Bulk export clippings
 */
export async function exportClippings(
  clippingIds: string[],
  format: 'pdf' | 'excel' | 'csv',
  context: { organizationId: string; userId: string }
): Promise<Blob> {
  try {
    // Lade alle Clippings
    const clippingPromises = clippingIds.map(id => getDoc(doc(db, 'media_assets', id)));
    const clippingDocs = await Promise.all(clippingPromises);

    const clippings = clippingDocs
      .filter(docSnap => docSnap.exists() && docSnap.data()?.organizationId === context.organizationId)
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    if (format === 'csv') {
      // CSV-Export
      const csvHeaders = 'Titel,Outlet,Datum,Reichweite,Sentiment,Media Value,URL\n';
      const csvRows = clippings.map(c => {
        const date = (c as any).publishDate ? new Date((c as any).publishDate.seconds * 1000).toLocaleDateString() : '';
        return `"${(c as any).title || ''}","${(c as any).outlet || ''}","${date}","${(c as any).reachValue || 0}","${(c as any).sentimentScore || 0}","${(c as any).mediaValue || 0}","${(c as any).url || ''}"`;
      }).join('\n');

      return new Blob([csvHeaders + csvRows], { type: 'text/csv; charset=utf-8' });
    } else if (format === 'pdf') {
      // PDF-Export (placeholder)
      const reportContent = JSON.stringify(clippings, null, 2);
      return new Blob([reportContent], { type: 'application/pdf' });
    } else {
      // Excel-Export (placeholder)
      const reportContent = JSON.stringify(clippings, null, 2);
      return new Blob([reportContent], { type: 'application/vnd.ms-excel' });
    }
  } catch (error) {
    throw error;
  }
}
