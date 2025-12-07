// src/lib/firebase-admin/glossary-admin-service.ts
// Admin-Service für Glossar-Einträge (Server-Side)

import { adminDb } from '@/lib/firebase/admin-init';
import { LanguageCode } from '@/types/international';

/**
 * Glossar-Eintrag aus Firestore
 */
interface GlossaryEntry {
  id: string;
  customerId: string;
  translations: Record<LanguageCode, string>;
  context?: string;
  isApproved: boolean;
}

/**
 * Admin-Service für Glossar-Einträge (Server-Side)
 * Verwendet Firebase Admin SDK für API-Routes
 */
class GlossaryAdminService {
  /**
   * Gibt den Collection-Pfad für eine Organization zurück
   */
  private getCollectionPath(organizationId: string): string {
    return `organizations/${organizationId}/customer_glossary`;
  }

  /**
   * Holt alle Glossar-Einträge eines Kunden
   */
  async getByCustomer(
    organizationId: string,
    customerId: string
  ): Promise<GlossaryEntry[]> {
    const collectionRef = adminDb.collection(
      this.getCollectionPath(organizationId)
    );

    const snapshot = await collectionRef
      .where('customerId', '==', customerId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        translations: data.translations || {},
        context: data.context,
        isApproved: data.isApproved ?? false,
      };
    });
  }

  /**
   * Holt freigegebene Glossar-Einträge für eine Sprachkombination
   */
  async getApprovedForLanguages(
    organizationId: string,
    customerId: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<GlossaryEntry[]> {
    const entries = await this.getByCustomer(organizationId, customerId);

    return entries.filter(
      (entry) =>
        entry.isApproved &&
        entry.translations[sourceLanguage] &&
        entry.translations[targetLanguage]
    );
  }
}

export const glossaryAdminService = new GlossaryAdminService();
