// src/lib/email/email-address-service.ts
// KEIN "use client" - dieser Service wird sowohl client- als auch serverseitig verwendet

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
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { domainService } from '@/lib/firebase/domain-service';
import { 
  EmailAddress, 
  EmailDomain,
  EmailAddressFormData 
} from '@/types/email-enhanced';

export class EmailAddressService {
  private readonly collectionName = 'email_addresses';

  /**
   * Erstellt eine neue E-Mail-Adresse
   */
  async create(
    data: EmailAddressFormData, 
    organizationId: string, 
    userId: string
  ): Promise<EmailAddress> {
    try {
      // Validiere Domain mit dem echten Domain Service
      const domain = await domainService.getById(data.domainId);
      if (!domain) {
        throw new Error('Domain nicht gefunden');
      }
      
      // TODO: Temporär auch pending Domains erlauben, bis das Status-Problem gelöst ist
      if (domain.status !== 'verified' && domain.status !== 'pending') {
        throw new Error('Domain ist nicht verifiziert');
      }

      // Prüfe auf Duplikate
      const email = `${data.localPart}@${domain.domain}`;
      const existing = await this.findByEmail(email, organizationId);
      if (existing) {
        throw new Error('E-Mail-Adresse existiert bereits');
      }

      // Erstelle E-Mail-Adresse Objekt - entferne undefined Werte
      const emailAddress: any = {
        email,
        localPart: data.localPart,
        domainId: data.domainId,
        displayName: data.displayName,
        isActive: data.isActive,
        isDefault: false,
        aliasType: data.aliasType,
        inboxEnabled: data.inboxEnabled,
        assignedUserIds: data.assignedUserIds,
        permissions: {
          read: [...data.assignedUserIds, userId],
          write: [...data.assignedUserIds, userId],
          manage: [userId]
        },
        emailsSent: 0,
        emailsReceived: 0,
        organizationId,
        userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedBy: userId
      };

      // Füge optionale Felder nur hinzu wenn sie definiert sind
      if (data.aliasType === 'pattern' && data.localPart) {
        emailAddress.aliasPattern = data.localPart;
      }
      
      if (data.clientName) {
        emailAddress.clientName = data.clientName;
      }
      
      if (data.aiEnabled) {
        emailAddress.aiSettings = {
          enabled: true,
          autoSuggest: data.autoSuggest || false,
          autoCategorize: data.autoCategorize || false,
          preferredTone: data.preferredTone || 'formal'
        };
      }

      // Speichere in Firestore
      const docRef = await addDoc(
        collection(db, this.collectionName), 
        emailAddress
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

      // Update-Objekt erstellen - entferne undefined Werte
      const updateData: any = {
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
      
      // Behandle clientName speziell - nur setzen wenn es einen Wert hat
      if (data.clientName !== undefined) {
        if (data.clientName && data.clientName.trim() !== '') {
          updateData.clientName = data.clientName;
        } else {
          // Explizit löschen wenn leer
          updateData.clientName = null;
        }
      }
      
      // AI Settings
      if (data.aiEnabled !== undefined) {
        if (data.aiEnabled) {
          updateData.aiSettings = {
            enabled: true,
            autoSuggest: data.autoSuggest || false,
            autoCategorize: data.autoCategorize || false,
            preferredTone: data.preferredTone || 'formal'
          };
        } else {
          updateData.aiSettings = null;
        }
      }

      await updateDoc(docRef, updateData);
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

      // Populate Domains mit echten Daten
      await this.populateDomains(emailAddresses, organizationId);

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
   * Aktualisiert alle Routing-Regeln (für Drag & Drop)
   */
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
   * Generiert eine eindeutige Reply-To Adresse für diese E-Mail-Adresse
   * Format: {prefix}-{orgId}-{emailId}@inbox.sk-online-marketing.de
   */
  generateReplyToAddress(emailAddress: EmailAddress): string {
    // Kurzer Prefix aus der lokalen E-Mail-Adresse
    const prefix = emailAddress.localPart
      .substring(0, 10)
      .replace(/[^a-z0-9]/gi, ''); // Nur alphanumerisch
    
    // Kurze IDs verwenden (erste 8 Zeichen)
    const shortOrgId = emailAddress.organizationId.substring(0, 8);
    const shortEmailId = emailAddress.id!.substring(0, 8);
    
    // Verwende sk-online-marketing.de statt celeropress.de
    return `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
  }

  /**
   * Findet eine E-Mail-Adresse basierend auf der Reply-To Adresse
   * Parst: {prefix}-{orgId}-{emailId}@inbox.sk-online-marketing.de
   */
  async findByReplyToAddress(replyToEmail: string): Promise<EmailAddress | null> {
    try {
      // Extrahiere den lokalen Teil
      const [localPart] = replyToEmail.split('@');
      const parts = localPart.split('-');
      
      if (parts.length < 3) {
        console.error('Invalid reply-to format:', replyToEmail);
        return null;
      }
      
      // Die letzten zwei Teile sind orgId und emailId
      const shortEmailId = parts[parts.length - 1];
      const shortOrgId = parts[parts.length - 2];
      
      // Suche nach E-Mail-Adressen mit diesem Prefix
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '>=', shortOrgId),
        where('organizationId', '<=', shortOrgId + '\uf8ff'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      
      // Finde die passende E-Mail-Adresse
      for (const doc of snapshot.docs) {
        if (doc.id.startsWith(shortEmailId)) {
          const emailAddress = { ...doc.data(), id: doc.id } as EmailAddress;
          console.log('✅ Found email address for reply-to:', {
            replyTo: replyToEmail,
            found: emailAddress.email
          });
          return emailAddress;
        }
      }
      
      console.error('No email address found for reply-to:', replyToEmail);
      return null;
    } catch (error) {
      console.error('Error finding email by reply-to:', error);
      return null;
    }
  }

  /**
   * Holt die Standard E-Mail-Adresse einer Organisation
   */
  async getDefaultForOrganization(organizationId: string): Promise<EmailAddress | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // Fallback: Erste aktive E-Mail-Adresse
        const fallbackQ = query(
          collection(db, this.collectionName),
          where('organizationId', '==', organizationId),
          where('isActive', '==', true),
          limit(1)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQ);
        if (!fallbackSnapshot.empty) {
          const doc = fallbackSnapshot.docs[0];
          return { ...doc.data(), id: doc.id } as EmailAddress;
        }
        
        return null;
      }

      const doc = snapshot.docs[0];
      return { ...doc.data(), id: doc.id } as EmailAddress;
    } catch (error) {
      console.error('Error getting default email address:', error);
      return null;
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

  private async populateDomains(emailAddresses: EmailAddress[], organizationId: string): Promise<void> {
    try {
      // Hole alle Domains der Organisation einmal
      const domains = await domainService.getAll(organizationId);
      const domainMap = new Map(domains.map(d => [d.id, d]));

      // Mappe die Domains zu den E-Mail-Adressen
      emailAddresses.forEach(ea => {
        const domain = domainMap.get(ea.domainId);
        if (domain) {
          ea.domain = {
            id: domain.id!,
            name: domain.domain,
            verified: domain.status === 'verified',
            verifiedAt: domain.verifiedAt,
            dnsRecords: domain.dnsRecords
          } as EmailDomain;
        }
      });
    } catch (error) {
      console.error('Fehler beim Laden der Domains:', error);
      // Fallback auf leere Domain-Objekte
      emailAddresses.forEach(ea => {
        ea.domain = {
          id: ea.domainId,
          name: 'Unbekannte Domain',
          verified: false
        } as EmailDomain;
      });
    }
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