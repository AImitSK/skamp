// src/lib/firebase-admin/translation-admin-service.ts
// Admin-Service für KI-generierte Übersetzungen (Server-Side)

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { LanguageCode } from '@/types/international';
import { TranslationStatus } from '@/types/translation';

/**
 * Übersetzte Boilerplate-Section
 */
interface TranslatedBoilerplate {
  id: string;
  translatedContent: string;
  translatedTitle?: string | null;
}

/**
 * Input für neue Übersetzung
 */
interface CreateTranslationInput {
  projectId: string;
  campaignId?: string;
  language: LanguageCode;
  title?: string;
  content: string;
  modelUsed?: string;
  glossaryEntriesUsed?: string[];
  sourceVersion?: number;
  /** Übersetzte Boilerplate-Sections */
  translatedBoilerplates?: TranslatedBoilerplate[] | null;
}

/**
 * Gespeicherte Übersetzung
 */
interface SavedTranslation {
  id: string;
  organizationId: string;
  projectId: string;
  language: LanguageCode;
  title?: string;
  content: string;
  status: TranslationStatus;
  isOutdated: boolean;
  translatedBoilerplates?: TranslatedBoilerplate[] | null;
}

/**
 * Admin-Service für Übersetzungen (Server-Side)
 * Verwendet Firebase Admin SDK für API-Routes
 */
class TranslationAdminService {
  /**
   * Gibt den Collection-Pfad für ein Projekt zurück
   */
  private getCollectionPath(organizationId: string, projectId: string): string {
    return `organizations/${organizationId}/projects/${projectId}/translations`;
  }

  /**
   * Erstellt eine neue Übersetzung
   */
  async create(
    organizationId: string,
    input: CreateTranslationInput
  ): Promise<SavedTranslation> {
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId, input.projectId)
    );

    const docData = {
      projectId: input.projectId,
      campaignId: input.campaignId || null,
      language: input.language,
      title: input.title || null,
      content: input.content,
      translatedBoilerplates: input.translatedBoilerplates || null,
      status: 'generated' as TranslationStatus,
      generatedAt: FieldValue.serverTimestamp(),
      generatedBy: 'ai',
      modelUsed: input.modelUsed || null,
      glossaryEntriesUsed: input.glossaryEntriesUsed || [],
      sourceVersion: input.sourceVersion || 1,
      isOutdated: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await collectionRef.add(docData);

    return {
      id: docRef.id,
      organizationId,
      projectId: input.projectId,
      language: input.language,
      title: input.title,
      content: input.content,
      translatedBoilerplates: input.translatedBoilerplates,
      status: 'generated',
      isOutdated: false,
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
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId, projectId)
    );

    const snapshot = await collectionRef
      .where('language', '==', language)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  /**
   * Aktualisiert eine bestehende Übersetzung (Upsert)
   */
  async upsert(
    organizationId: string,
    input: CreateTranslationInput
  ): Promise<SavedTranslation> {
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId, input.projectId)
    );

    // Prüfe ob bereits eine Übersetzung existiert
    const existingSnapshot = await collectionRef
      .where('language', '==', input.language)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      // Update bestehende Übersetzung
      const existingDoc = existingSnapshot.docs[0];
      await existingDoc.ref.update({
        title: input.title || null,
        content: input.content,
        translatedBoilerplates: input.translatedBoilerplates || null,
        modelUsed: input.modelUsed || null,
        glossaryEntriesUsed: input.glossaryEntriesUsed || [],
        sourceVersion: input.sourceVersion || 1,
        isOutdated: false,
        generatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        id: existingDoc.id,
        organizationId,
        projectId: input.projectId,
        language: input.language,
        title: input.title,
        content: input.content,
        translatedBoilerplates: input.translatedBoilerplates,
        status: 'generated',
        isOutdated: false,
      };
    }

    // Erstelle neue Übersetzung
    return this.create(organizationId, input);
  }

  /**
   * Holt eine Übersetzung für eine bestimmte Sprache
   */
  async getByLanguage(
    organizationId: string,
    projectId: string,
    language: string
  ): Promise<SavedTranslation | null> {
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId, projectId)
    );

    const snapshot = await collectionRef
      .where('language', '==', language)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      organizationId,
      projectId,
      language: data.language,
      title: data.title,
      content: data.content,
      translatedBoilerplates: data.translatedBoilerplates || null,
      status: data.status || 'generated',
      isOutdated: data.isOutdated ?? false,
    };
  }

  /**
   * Markiert alle Übersetzungen eines Projekts als veraltet
   */
  async markAsOutdated(
    organizationId: string,
    projectId: string
  ): Promise<number> {
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId, projectId)
    );

    const snapshot = await collectionRef.where('isOutdated', '==', false).get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isOutdated: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return snapshot.size;
  }
}

export const translationAdminService = new TranslationAdminService();
