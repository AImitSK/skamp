// src/lib/email/email-address-service-extensions.ts
// Erweiterungen für den email-address-service.ts

import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { EmailAddress } from '@/types/email-enhanced';

// Diese Methode sollte dem EmailAddressService hinzugefügt werden:

/**
 * Aktualisiert alle Routing-Regeln einer E-Mail-Adresse
 * Wird für Drag & Drop Reordering verwendet
 */
export async function updateRoutingRules(
  this: any, // EmailAddressService context
  emailAddressId: string,
  rules: NonNullable<EmailAddress['routingRules']>,
  userId: string
): Promise<void> {
  try {
    const emailAddress = await this.get(emailAddressId);
    if (!emailAddress) {
      throw new Error('E-Mail-Adresse nicht gefunden');
    }

    // Prüfe Berechtigung
    if (!emailAddress.permissions.manage.includes(userId)) {
      throw new Error('Keine Berechtigung zum Aktualisieren von Routing-Regeln');
    }

    // Aktualisiere alle Regeln auf einmal
    await updateDoc(doc(db, this.collectionName, emailAddressId), {
      routingRules: rules,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Routing-Regeln:', error);
    throw error;
  }
}

// Füge diese Methode zum email-address-service.ts hinzu:
// In der EmailAddressService Klasse nach der removeRoutingRule Methode:
/*

  async updateRoutingRules(
    emailAddressId: string,
    rules: NonNullable<EmailAddress['routingRules']>,
    userId: string
  ): Promise<void> {
    try {
      const emailAddress = await this.get(emailAddressId);
      if (!emailAddress) {
        throw new Error('E-Mail-Adresse nicht gefunden');
      }

      // Prüfe Berechtigung
      if (!emailAddress.permissions.manage.includes(userId)) {
        throw new Error('Keine Berechtigung zum Aktualisieren von Routing-Regeln');
      }

      // Aktualisiere alle Regeln auf einmal
      await updateDoc(doc(db, this.collectionName, emailAddressId), {
        routingRules: rules,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Routing-Regeln:', error);
      throw error;
    }
  }

*/