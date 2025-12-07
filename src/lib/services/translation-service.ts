// src/lib/services/translation-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import {
  ProjectTranslation,
  CreateTranslationInput,
  UpdateTranslationInput,
  TranslationFilterOptions,
  TranslationSummary,
  TranslationStatus,
} from '@/types/translation';
import { LanguageCode } from '@/types/international';

/**
 * Service für KI-generierte Projekt-Übersetzungen
 *
 * Firestore Collection: `organizations/{orgId}/projects/{projectId}/translations`
 */
class TranslationService {
  /**
   * Gibt den Collection-Pfad für ein Projekt zurück
   */
  private getCollectionPath(organizationId: string, projectId: string): string {
    return `organizations/${organizationId}/projects/${projectId}/translations`;
  }

  /**
   * Konvertiert Firestore-Dokument zu ProjectTranslation
   */
  private docToTranslation(
    docSnap: any,
    organizationId: string,
    projectId: string
  ): ProjectTranslation {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      organizationId,
      projectId,
      campaignId: data.campaignId,
      language: data.language,
      title: data.title,
      content: data.content,
      status: data.status || 'generated',
      generatedAt: data.generatedAt?.toDate?.() || new Date(),
      generatedBy: data.generatedBy || 'ai',
      modelUsed: data.modelUsed,
      glossaryEntriesUsed: data.glossaryEntriesUsed || [],
      sourceVersion: data.sourceVersion || 1,
      isOutdated: data.isOutdated ?? false,
      reviewedBy: data.reviewedBy,
      reviewedAt: data.reviewedAt?.toDate?.(),
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }

  /**
   * Holt alle Übersetzungen eines Projekts
   */
  async getByProject(
    organizationId: string,
    projectId: string,
    options?: TranslationFilterOptions
  ): Promise<ProjectTranslation[]> {
    const collectionRef = collection(
      db,
      this.getCollectionPath(organizationId, projectId)
    );

    let q = query(collectionRef, orderBy('createdAt', 'desc'));

    // Filter nach Sprache
    if (options?.language) {
      q = query(
        collectionRef,
        where('language', '==', options.language),
        orderBy('createdAt', 'desc')
      );
    }

    // Filter nach Status
    if (options?.status) {
      q = query(
        collectionRef,
        where('status', '==', options.status),
        orderBy('createdAt', 'desc')
      );
    }

    // Filter nur veraltete
    if (options?.outdatedOnly) {
      q = query(
        collectionRef,
        where('isOutdated', '==', true),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    let translations = snapshot.docs.map((doc) =>
      this.docToTranslation(doc, organizationId, projectId)
    );

    // Pagination
    if (options?.offset) {
      translations = translations.slice(options.offset);
    }
    if (options?.limit) {
      translations = translations.slice(0, options.limit);
    }

    return translations;
  }

  /**
   * Holt eine spezifische Übersetzung nach Sprache
   */
  async getByLanguage(
    organizationId: string,
    projectId: string,
    language: LanguageCode
  ): Promise<ProjectTranslation | null> {
    const collectionRef = collection(
      db,
      this.getCollectionPath(organizationId, projectId)
    );

    const q = query(collectionRef, where('language', '==', language));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return this.docToTranslation(snapshot.docs[0], organizationId, projectId);
  }

  /**
   * Holt eine Übersetzung nach ID
   */
  async getById(
    organizationId: string,
    projectId: string,
    translationId: string
  ): Promise<ProjectTranslation | null> {
    const docRef = doc(
      db,
      this.getCollectionPath(organizationId, projectId),
      translationId
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return this.docToTranslation(docSnap, organizationId, projectId);
  }

  /**
   * Erstellt eine neue Übersetzung
   */
  async create(
    organizationId: string,
    input: CreateTranslationInput
  ): Promise<ProjectTranslation> {
    const collectionRef = collection(
      db,
      this.getCollectionPath(organizationId, input.projectId)
    );

    const docData = {
      projectId: input.projectId,
      campaignId: input.campaignId || null,
      language: input.language,
      title: input.title || null,
      content: input.content,
      status: 'generated' as TranslationStatus,
      generatedAt: serverTimestamp(),
      generatedBy: 'ai',
      modelUsed: input.modelUsed || null,
      glossaryEntriesUsed: input.glossaryEntriesUsed || [],
      sourceVersion: input.sourceVersion,
      isOutdated: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collectionRef, docData);

    return {
      id: docRef.id,
      organizationId,
      projectId: input.projectId,
      campaignId: input.campaignId,
      language: input.language,
      title: input.title,
      content: input.content,
      status: 'generated',
      generatedAt: new Date(),
      generatedBy: 'ai',
      modelUsed: input.modelUsed,
      glossaryEntriesUsed: input.glossaryEntriesUsed || [],
      sourceVersion: input.sourceVersion,
      isOutdated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Aktualisiert eine Übersetzung
   */
  async update(
    organizationId: string,
    projectId: string,
    translationId: string,
    input: UpdateTranslationInput
  ): Promise<void> {
    const docRef = doc(
      db,
      this.getCollectionPath(organizationId, projectId),
      translationId
    );

    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.isOutdated !== undefined) {
      updateData.isOutdated = input.isOutdated;
    }
    if (input.reviewedBy !== undefined) {
      updateData.reviewedBy = input.reviewedBy;
      updateData.reviewedAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Löscht eine Übersetzung
   */
  async delete(
    organizationId: string,
    projectId: string,
    translationId: string
  ): Promise<void> {
    const docRef = doc(
      db,
      this.getCollectionPath(organizationId, projectId),
      translationId
    );
    await deleteDoc(docRef);
  }

  /**
   * Markiert alle Übersetzungen eines Projekts als veraltet
   * (Wird aufgerufen wenn das Original geändert wurde)
   */
  async markAsOutdated(
    organizationId: string,
    projectId: string
  ): Promise<number> {
    const translations = await this.getByProject(organizationId, projectId);

    if (translations.length === 0) {
      return 0;
    }

    const batch = writeBatch(db);

    for (const translation of translations) {
      if (!translation.isOutdated) {
        const docRef = doc(
          db,
          this.getCollectionPath(organizationId, projectId),
          translation.id
        );
        batch.update(docRef, {
          isOutdated: true,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();

    return translations.filter((t) => !t.isOutdated).length;
  }

  /**
   * Markiert eine Übersetzung als aktuell (nicht mehr veraltet)
   */
  async markAsCurrent(
    organizationId: string,
    projectId: string,
    translationId: string
  ): Promise<void> {
    await this.update(organizationId, projectId, translationId, {
      isOutdated: false,
    });
  }

  /**
   * Gibt eine Zusammenfassung der Übersetzungen eines Projekts zurück
   */
  async getSummary(
    organizationId: string,
    projectId: string
  ): Promise<TranslationSummary> {
    const translations = await this.getByProject(organizationId, projectId);

    return {
      projectId,
      totalCount: translations.length,
      languages: translations.map((t) => ({
        code: t.language,
        status: t.status,
        isOutdated: t.isOutdated,
        generatedAt: t.generatedAt,
      })),
      outdatedCount: translations.filter((t) => t.isOutdated).length,
    };
  }

  /**
   * Prüft ob eine Übersetzung für eine Sprache existiert
   */
  async exists(
    organizationId: string,
    projectId: string,
    language: LanguageCode
  ): Promise<boolean> {
    const translation = await this.getByLanguage(
      organizationId,
      projectId,
      language
    );
    return translation !== null;
  }

  /**
   * Holt alle verfügbaren Sprachen eines Projekts
   */
  async getAvailableLanguages(
    organizationId: string,
    projectId: string
  ): Promise<LanguageCode[]> {
    const translations = await this.getByProject(organizationId, projectId);
    return translations.map((t) => t.language);
  }
}

export const translationService = new TranslationService();
