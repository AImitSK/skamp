// src/lib/email/email-address-service.ts
"use client";

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init'; // Always use client init
import { 
  EmailAddress, 
  EmailDomain,
  EmailAddressFormData 
} from '@/types/email-enhanced';

export class EmailAddressService {
  private readonly collectionName = 'email_addresses';
  private readonly domainsCollection = 'email_domains';

  /**
   * Erstellt eine neue E-Mail-Adresse
   */
  async create(
    data: EmailAddressFormData, 
    organizationId: string, 
    userId: string
  ): Promise<EmailAddress> {
    try {
      // Validiere Domain
      const domain = await this.getDomain(data.domainId);
      if (!domain || !domain.verified) {
        throw new Error('Domain ist nicht verifiziert');
      }

      // Prüfe auf Duplikate
      const email = `${data.localPart}@${domain.name}`;
      const existing = await this.findByEmail(email, organizationId);
      if (existing) {
        throw new Error('E-Mail-Adresse existiert bereits');
      }

      // Erstelle E-Mail-Adresse Objekt
      const emailAddress: Omit<EmailAddress, 'id'> = {
        email,
        localPart: data.localPart,
        domainId: data.domainId,
        displayName: data.displayName,
        isActive: data.isActive,
        isDefault: false,
        aliasType: data.aliasType,
        aliasPattern: data.aliasType === 'pattern' ? data.localPart : undefined,
        inboxEnabled: data.inboxEnabled,
        assignedUserIds: data.assignedUserIds,
        clientName: data.clientName || undefined,
        permissions: {
          read: [...data.assignedUserIds, userId],
          write: [...data.assignedUserIds, userId],
          manage: [userId]
        },
        aiSettings: data.aiEnabled ? {
          enabled: true,
          autoSuggest: data.autoSuggest,
          autoCategorize: data.autoCategorize,
          preferredTone: data.preferredTone
        } : undefined,
        emailsSent: 0,
        emailsReceived: 0,
        organizationId,
        userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedBy: userId
      };

      // Speichere in Firestore
      const docRef = await addDoc(
        collection(db, this.collectionName), 
        emailAddress as DocumentData
      );

      // Setze als Standard wenn erste E-Mail-Adresse
      const isFirst = await this.isFirstEmailAddress(organizationId);
      if (isFirst) {
        await this.setAsDefault(docRef.id, organizationId);
      }

      return { ...emailAddress, id: docRef.id } as EmailAddress;
    } catch (error) {
      console.error('Fehler beim Erstellen der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine E-Mail-Adresse
   */
  async update(
    id: string,
    data: Partial<EmailAddressFormData>,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('E-Mail-Adresse nicht gefunden');
      }

      const currentData = docSnap.data() as EmailAddress;
      
      // Prüfe Berechtigung
      if (!currentData.permissions.manage.includes(userId)) {
        throw new Error('Keine Berechtigung zum Bearbeiten');
      }

      // Update-Objekt erstellen
      const updateData: Partial<EmailAddress> = {
        updatedAt: serverTimestamp() as Timestamp,
        updatedBy: userId
      };

      // Nur geänderte Felder aktualisieren
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.inboxEnabled !== undefined) updateData.inboxEnabled = data.inboxEnabled;
      if (data.assignedUserIds !== undefined) {
        updateData.assignedUserIds = data.assignedUserIds;
        const uniqueReadUsers = new Set([...data.assignedUserIds, ...currentData.permissions.manage]);
        const uniqueWriteUsers = new Set([...data.assignedUserIds, ...currentData.permissions.manage]);
        updateData.permissions = {
          ...currentData.permissions,
          read: Array.from(uniqueReadUsers),
          write: Array.from(uniqueWriteUsers)
        };
      }
      if (data.clientName !== undefined) updateData.clientName = data.clientName || undefined;
      
      // AI Settings
      if (data.aiEnabled !== undefined) {
        updateData.aiSettings = data.aiEnabled ? {
          enabled: true,
          autoSuggest: data.autoSuggest || false,
          autoCategorize: data.autoCategorize || false,
          preferredTone: data.preferredTone || 'formal'
        } : undefined;
      }

      await updateDoc(docRef, updateData as DocumentData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Löscht eine E-Mail-Adresse
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('E-Mail-Adresse nicht gefunden');
      }

      const emailAddress = docSnap.data() as EmailAddress;
      
      // Prüfe Berechtigung
      if (!emailAddress.permissions.manage.includes(userId)) {
        throw new Error('Keine Berechtigung zum Löschen');
      }

      // Verhindere Löschen der Standard-Adresse
      if (emailAddress.isDefault) {
        throw new Error('Standard E-Mail-Adresse kann nicht gelöscht werden');
      }

      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Löschen der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Holt eine E-Mail-Adresse
   */
  async get(id: string): Promise<EmailAddress | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as EmailAddress;
    } catch (error) {
      console.error('Fehler beim Abrufen der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Holt alle E-Mail-Adressen einer Organisation
   */
  async getByOrganization(organizationId: string, userId: string): Promise<EmailAddress[]> {
    try {
      console.log('getByOrganization called with:', { organizationId, userId });
      
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('email')
      );

      const querySnapshot = await getDocs(q);
      const emailAddresses: EmailAddress[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as EmailAddress;
        // Nur E-Mail-Adressen zurückgeben, für die der User Leserechte hat
        if (data.permissions?.read?.includes(userId) || data.userId === userId) {
          emailAddresses.push({ ...data, id: doc.id });
        }
      });

      // Populate Domains
      await this.populateDomains(emailAddresses);

      return emailAddresses;
    } catch (error) {
      console.error('Fehler beim Abrufen der E-Mail-Adressen:', error);
      throw error;
    }
  }

  /**
   * Setzt eine E-Mail-Adresse als Standard
   */
  async setAsDefault(id: string, organizationId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Entferne Standard von allen anderen
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });

      // Setze neue Standard-Adresse
      const docRef = doc(db, this.collectionName, id);
      batch.update(docRef, { 
        isDefault: true,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Fehler beim Setzen der Standard E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Fügt eine Routing-Regel hinzu
   */
  async addRoutingRule(
    emailAddressId: string,
    rule: NonNullable<EmailAddress['routingRules']>[0],
    userId: string
  ): Promise<void> {
    try {
      const emailAddress = await this.get(emailAddressId);
      if (!emailAddress) {
        throw new Error('E-Mail-Adresse nicht gefunden');
      }

      // Prüfe Berechtigung
      if (!emailAddress.permissions.manage.includes(userId)) {
        throw new Error('Keine Berechtigung zum Hinzufügen von Routing-Regeln');
      }

      const updatedRules = [...(emailAddress.routingRules || []), rule];
      
      await updateDoc(doc(db, this.collectionName, emailAddressId), {
        routingRules: updatedRules,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Routing-Regel:', error);
      throw error;
    }
  }

  /**
   * Entfernt eine Routing-Regel
   */
  async removeRoutingRule(
    emailAddressId: string,
    ruleId: string,
    userId: string
  ): Promise<void> {
    try {
      const emailAddress = await this.get(emailAddressId);
      if (!emailAddress) {
        throw new Error('E-Mail-Adresse nicht gefunden');
      }

      // Prüfe Berechtigung
      if (!emailAddress.permissions.manage.includes(userId)) {
        throw new Error('Keine Berechtigung zum Entfernen von Routing-Regeln');
      }

      const updatedRules = (emailAddress.routingRules || [])
        .filter(rule => rule.id !== ruleId);
      
      await updateDoc(doc(db, this.collectionName, emailAddressId), {
        routingRules: updatedRules,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
    } catch (error) {
      console.error('Fehler beim Entfernen der Routing-Regel:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Statistiken
   */
  async updateStats(
    emailAddressId: string,
    type: 'sent' | 'received'
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, emailAddressId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return;
      }

      const currentData = docSnap.data() as EmailAddress;
      const updateData: Partial<EmailAddress> = {
        lastUsedAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      if (type === 'sent') {
        updateData.emailsSent = (currentData.emailsSent || 0) + 1;
      } else {
        updateData.emailsReceived = (currentData.emailsReceived || 0) + 1;
      }

      await updateDoc(docRef, updateData as DocumentData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Statistiken:', error);
      // Fehler nicht werfen, da Statistiken nicht kritisch sind
    }
  }

  /**
   * Private Hilfsmethoden
   */
  private async findByEmail(email: string, organizationId: string): Promise<EmailAddress | null> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('email', '==', email)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { ...doc.data(), id: doc.id } as EmailAddress;
  }

  private async getDomain(domainId: string): Promise<EmailDomain | null> {
    // Temporär: Mock-Domain zurückgeben
    // TODO: Implementiere echten Domain-Service
    return {
      id: domainId,
      name: 'example.com',
      verified: true
    } as EmailDomain;
  }

  private async populateDomains(emailAddresses: EmailAddress[]): Promise<void> {
    // TODO: Implementiere Domain-Population wenn Domain-Service verfügbar ist
    // Für jetzt setzen wir Mock-Domains
    emailAddresses.forEach(ea => {
      ea.domain = {
        id: ea.domainId,
        name: 'example.com',
        verified: true
      } as EmailDomain;
    });
  }

  private async isFirstEmailAddress(organizationId: string): Promise<boolean> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size === 1;
  }
}

// Singleton Export
export const emailAddressService = new EmailAddressService();