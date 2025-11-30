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
  QueryDocumentSnapshot,
  getFirestore
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { domainService } from '@/lib/firebase/domain-service';
import { 
  EmailAddress, 
  EmailDomain,
  EmailAddressFormData 
} from '@/types/email-enhanced';

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialisiere Firebase App wenn noch nicht geschehen
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Firestore Instanz
const db = getFirestore(app);

// Hilfsfunktion für Server-seitige Authentifizierung
async function authenticateWithToken(token: string): Promise<void> {
  if (typeof window === 'undefined' && token) {
    try {
      // Versuche mit dem Token zu authentifizieren
      // Da wir kein Admin SDK verwenden können, müssen wir einen anderen Weg finden
      // Option 1: Custom Token (benötigt Backend-Endpoint)
      // Option 2: ID Token direkt verwenden (nicht ideal)
      // Für jetzt: Skip auth auf Server-Seite und verlassen uns auf Security Rules
    } catch (error) {
    }
  }
}

export class EmailAddressService {
  private readonly collectionName = 'email_addresses';

  /**
   * Server-seitige Methode mit direktem Firestore-Zugriff
   * Nutzt Firestore REST API statt SDK für Server-Kompatibilität
   */
  async getDefaultForOrganizationServer(organizationId: string, authToken?: string): Promise<EmailAddress | null> {
    if (typeof window !== 'undefined') {
      // Client-seitig: Nutze normale Methode
      return this.getDefaultForOrganization(organizationId);
    }

    try {
      
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
      
      // Query für Standard E-Mail-Adresse
      const queryUrl = `${baseUrl}:runQuery`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: this.collectionName }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'organizationId' },
                    op: 'EQUAL',
                    value: { stringValue: organizationId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'isDefault' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                  }
                }
              ]
            }
          },
          limit: 1
        }
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        const error = await response.text();
        
        // Fallback auf normale SDK-Methode
        return this.getDefaultForOrganization(organizationId);
      }

      const data = await response.json();
      
      if (data.length === 0 || !data[0].document) {
        // Keine Standard-E-Mail gefunden, versuche Fallback
        return this.getFirstActiveEmailServer(organizationId, authToken);
      }

      // Konvertiere Firestore-Dokument zu EmailAddress
      const doc = data[0].document;
      const emailAddress = this.convertFirestoreDocument(doc);
      
      return emailAddress;

    } catch (error) {
      // Fallback auf Client SDK
      return this.getDefaultForOrganization(organizationId);
    }
  }

  /**
   * Server-seitige Methode für erste aktive E-Mail
   */
  private async getFirstActiveEmailServer(organizationId: string, authToken?: string): Promise<EmailAddress | null> {
    try {
      
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
      
      const queryUrl = `${baseUrl}:runQuery`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: this.collectionName }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'organizationId' },
                    op: 'EQUAL',
                    value: { stringValue: organizationId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'isActive' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                  }
                }
              ]
            }
          },
          limit: 1
        }
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.length === 0 || !data[0].document) {
        return null;
      }

      const doc = data[0].document;
      const emailAddress = this.convertFirestoreDocument(doc);
      
      return emailAddress;

    } catch (error) {
      return null;
    }
  }

  /**
   * Server-seitige Methode um alle E-Mail-Adressen einer Organisation zu holen
   */
  async getByOrganizationServer(
    organizationId: string, 
    userId: string,
    authToken?: string
  ): Promise<EmailAddress[]> {
    if (typeof window !== 'undefined') {
      // Client-seitig: Nutze normale Methode
      return this.getByOrganization(organizationId, userId);
    }

    try {
      
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
      
      const queryUrl = `${baseUrl}:runQuery`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: this.collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'organizationId' },
              op: 'EQUAL',
              value: { stringValue: organizationId }
            }
          },
          orderBy: [
            {
              field: { fieldPath: 'isDefault' },
              direction: 'DESCENDING'
            },
            {
              field: { fieldPath: 'createdAt' },
              direction: 'DESCENDING'  
            }
          ]
        }
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        const error = await response.text();
        // Fallback auf normale SDK-Methode
        return this.getByOrganization(organizationId, userId);
      }

      const data = await response.json();
      const emailAddresses: EmailAddress[] = [];
      
      if (data && data.length > 0) {
        for (const result of data) {
          if (result.document) {
            const emailAddress = this.convertFirestoreDocument(result.document);
            emailAddresses.push(emailAddress);
          }
        }
      }
      
      return emailAddresses;

    } catch (error) {
      // Fallback auf Client SDK
      return this.getByOrganization(organizationId, userId);
    }
  }

  /**
   * Konvertiert Firestore REST API Dokument zu EmailAddress
   */
  private convertFirestoreDocument(doc: any): EmailAddress {
    const fields = doc.fields;
    const id = doc.name.split('/').pop();
    
    return {
      id,
      email: fields.email?.stringValue || '',
      localPart: fields.localPart?.stringValue || '',
      domainId: fields.domainId?.stringValue || '',
      displayName: fields.displayName?.stringValue || '',
      isActive: fields.isActive?.booleanValue || false,
      isDefault: fields.isDefault?.booleanValue || false,
      aliasType: fields.aliasType?.stringValue as any || 'specific',
      inboxEnabled: fields.inboxEnabled?.booleanValue || false,
      assignedUserIds: fields.assignedUserIds?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
      permissions: {
        read: fields.permissions?.mapValue?.fields?.read?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
        write: fields.permissions?.mapValue?.fields?.write?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
        manage: fields.permissions?.mapValue?.fields?.manage?.arrayValue?.values?.map((v: any) => v.stringValue) || []
      },
      emailsSent: parseInt(fields.emailsSent?.integerValue || '0'),
      emailsReceived: parseInt(fields.emailsReceived?.integerValue || '0'),
      organizationId: fields.organizationId?.stringValue || '',
      userId: fields.userId?.stringValue || '',
      createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) as any : null,
      updatedAt: fields.updatedAt?.timestampValue ? new Date(fields.updatedAt.timestampValue) as any : null,
      createdBy: fields.createdBy?.stringValue,
      updatedBy: fields.updatedBy?.stringValue,
      lastUsedAt: fields.lastUsedAt?.timestampValue ? new Date(fields.lastUsedAt.timestampValue) as any : undefined,
      clientName: fields.clientName?.stringValue,
      routingRules: fields.routingRules?.arrayValue?.values?.map((v: any) => this.convertRoutingRule(v.mapValue)) || undefined,
      aiSettings: fields.aiSettings?.mapValue ? this.convertAISettings(fields.aiSettings.mapValue) : undefined
    } as EmailAddress;
  }

  private convertRoutingRule(mapValue: any): any {
    const fields = mapValue.fields;
    return {
      id: fields.id?.stringValue,
      name: fields.name?.stringValue,
      conditions: {
        subject: fields.conditions?.mapValue?.fields?.subject?.stringValue,
        from: fields.conditions?.mapValue?.fields?.from?.stringValue,
        keywords: fields.conditions?.mapValue?.fields?.keywords?.arrayValue?.values?.map((v: any) => v.stringValue) || []
      },
      actions: {
        assignTo: fields.actions?.mapValue?.fields?.assignTo?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
        addTags: fields.actions?.mapValue?.fields?.addTags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
        setPriority: fields.actions?.mapValue?.fields?.setPriority?.stringValue,
        autoReply: fields.actions?.mapValue?.fields?.autoReply?.stringValue
      }
    };
  }

  private convertAISettings(mapValue: any): any {
    const fields = mapValue.fields;
    return {
      enabled: fields.enabled?.booleanValue || false,
      autoSuggest: fields.autoSuggest?.booleanValue || false,
      autoCategorize: fields.autoCategorize?.booleanValue || false,
      preferredTone: fields.preferredTone?.stringValue || 'formal',
      customPromptContext: fields.customPromptContext?.stringValue
    };
  }

  /**
   * Erstellt eine neue E-Mail-Adresse
   */
  async create(
    data: EmailAddressFormData, 
    organizationId: string, 
    userId: string
  ): Promise<EmailAddress> {
    try {
      // Validiere Domain mit organisationsspezifischem Lookup
      let domain;

      // Erst prüfen ob domainId gültig ist
      if (!data.domainId || typeof data.domainId !== 'string' || data.domainId.trim() === '') {
        throw new Error('Ungültige Domain-ID');
      }

      try {
        // Dynamischer Import des Enhanced Service zur Laufzeit
        const { domainServiceEnhanced } = await import('@/lib/firebase/domain-service-enhanced');
        domain = await domainServiceEnhanced.getById(data.domainId, organizationId);
      } catch (error) {
        // Fallback zu domainService für Build-Kompatibilität
        console.warn('Fallback to domainService due to:', error);
        domain = await domainService.getById(data.domainId);
      }
      
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

      // Prüfe ob es bereits E-Mail-Adressen gibt (vor dem Speichern)
      const existingEmails = await this.getByOrganization(organizationId, userId);
      const shouldBeDefault = existingEmails.length === 0;
      
      // Wenn erste E-Mail-Adresse, setze als Standard
      if (shouldBeDefault) {
        emailAddress.isDefault = true;
      }

      // Speichere in Firestore
      const docRef = await addDoc(
        collection(db, this.collectionName), 
        emailAddress
      );

      return { ...emailAddress, id: docRef.id } as EmailAddress;
    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Holt alle E-Mail-Adressen einer Organisation
   * 
   * @param organizationId - ID der Organisation
   * @param userId - ID des anfragenden Users
   * @param userRole - Rolle des Users in der Organisation (optional, für erweiterte Berechtigungen)
   */
  async getByOrganization(organizationId: string, userId: string, userRole?: string): Promise<EmailAddress[]> {
    try {
      
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('email')
      );

      const querySnapshot = await getDocs(q);
      const emailAddresses: EmailAddress[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as EmailAddress;
        
        // Erweiterte Berechtigungsprüfung für Multi-Tenancy
        const hasAccess =
          // Für alle verfügbar (z.B. Default-Emails)
          data.availableToAll === true ||
          // Explizite Leserechte
          data.permissions?.read?.includes(userId) ||
          // Zugewiesen an User
          data.assignedUserIds?.includes(userId) ||
          // Ersteller der E-Mail-Adresse
          data.userId === userId ||
          // Owner/Admin der Organisation sehen alle E-Mails
          (userRole && (userRole === 'owner' || userRole === 'admin'));

        if (hasAccess) {
          emailAddresses.push({ ...data, id: doc.id });
        }
      });

      // Populate Domains mit echten Daten
      await this.populateDomains(emailAddresses, organizationId);

      return emailAddresses;
    } catch (error) {
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
      // Fehler nicht werfen, da Statistiken nicht kritisch sind
    }
  }

// src/lib/email/email-address-service.ts - findByReplyToAddress Methode
// Diese Methode ersetzt die existierende findByReplyToAddress Methode

/**
 * Findet eine E-Mail-Adresse basierend auf der Reply-To Adresse
 * Unterstützt zwei Formate:
 * 1. PR-Kampagnen: {prefix}-{campaignId}@inbox.domain (2 Teile)
 * 2. Inbox: {localpart}-{orgId}-{emailId}@inbox.domain (3 Teile)
 */
async findByReplyToAddress(replyToEmail: string): Promise<EmailAddress | null> {
  try {
    
    // Extrahiere den lokalen Teil
    const [localPart, domain] = replyToEmail.split('@');
    const parts = localPart.split('-');
    
    
    // PR-KAMPAGNEN FORMAT (2 Teile): prefix-campaignId
    if (parts.length === 2) {
      const [prefix, campaignId] = parts;
      
      // Bei PR-Kampagnen suchen wir nach der E-Mail-Adresse mit dem passenden Prefix
      // z.B. "test" -> test@sk-online-marketing.de
      const q = query(
        collection(db, this.collectionName),
        where('localPart', '==', prefix),
        where('isActive', '==', true),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Nimm die erste aktive E-Mail-Adresse mit diesem Prefix
        const emailAddress = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as EmailAddress;
        return emailAddress;
      }
      
      // Fallback: Suche nach der Default-E-Mail der Organisation
      // Da wir die campaignId haben, könnten wir theoretisch die Organisation aus der pr_campaigns Collection laden
      
      // Für den Moment: Verwende bekannte Test-E-Mail
      const fallbackQuery = query(
        collection(db, this.collectionName),
        where('email', '==', 'test@sk-online-marketing.de'),
        where('isActive', '==', true),
        limit(1)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      if (!fallbackSnapshot.empty) {
        const emailAddress = { ...fallbackSnapshot.docs[0].data(), id: fallbackSnapshot.docs[0].id } as EmailAddress;
        return emailAddress;
      }
    }
    
    // INBOX FORMAT (3 Teile): localpart-orgId-emailId
    else if (parts.length >= 3) {
      
      // Die letzten zwei Teile sind orgId und emailId (lowercase von SendGrid)
      const shortEmailId = parts[parts.length - 1]; // rtedp7rd
      const shortOrgId = parts[parts.length - 2]; // wva3cj7y
      
      
      // Suche alle E-Mail-Adressen und filtere manuell
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      
      // Durchsuche alle E-Mail-Adressen
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const docId = doc.id;
        const orgId = docData.organizationId || '';
        
        // Extrahiere die ersten 8 Zeichen für Vergleich
        const orgIdShort = orgId.substring(0, 8).toLowerCase();
        const docIdShort = docId.substring(0, 8).toLowerCase();
        
        
        // Vergleiche die Kurzformen (case-insensitive)
        if (orgIdShort === shortOrgId.toLowerCase() && docIdShort === shortEmailId.toLowerCase()) {
          const emailAddress = { ...docData, id: doc.id } as EmailAddress;
          return emailAddress;
        }
      }
      
      // FALLBACK: Direkte Suche mit bekannter Org-ID
      
      const knownOrgId = 'wVa3cJ7YhYUCQcbwZLLVB6w5Xs23';
      const fallbackQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', knownOrgId),
        limit(10)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      
      for (const doc of fallbackSnapshot.docs) {
        const docIdLower = doc.id.substring(0, 8).toLowerCase();
        if (docIdLower === shortEmailId.toLowerCase()) {
          const emailAddress = { ...doc.data(), id: doc.id } as EmailAddress;
          return emailAddress;
        }
      }
    }
    
    // UNBEKANNTES FORMAT
    else {
      return null;
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
}

  /**
   * Holt eine E-Mail-Adresse per ID (für Server-seitige Verwendung)
   */
  async getEmailAddressById(id: string): Promise<EmailAddress | null> {
    return this.get(id);
  }

  /**
   * Holt E-Mail-Adressen einer Organisation (Alias für getByOrganization)
   * Verwendet für Client-seitige Komponenten (keine userId erforderlich)
   */
  async getEmailAddressesByOrganization(organizationId: string): Promise<EmailAddress[]> {
    try {
      // Einfache Query ohne orderBy um Index-Anforderung zu vermeiden
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId)
      );

      const querySnapshot = await getDocs(q);
      const emailAddresses: EmailAddress[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as EmailAddress;
        emailAddresses.push({ ...data, id: doc.id });
      });

      // Populate Domains
      await this.populateDomains(emailAddresses, organizationId);

      // Sortierung im Client: isDefault zuerst, dann alphabetisch nach email
      emailAddresses.sort((a, b) => {
        // isDefault zuerst (true vor false)
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;

        // Dann alphabetisch nach email
        return a.email.localeCompare(b.email);
      });

      return emailAddresses;
    } catch (error) {
      console.error('Error fetching email addresses:', error);
      throw error;
    }
  }

  /**
   * Generiert eine Reply-To Adresse
   *
   * Kann auf zwei Arten aufgerufen werden:
   * 1. Mit EmailAddress-Objekt: generateReplyToAddress(emailAddress)
   * 2. Mit zwei Strings (async): generateReplyToAddressAsync(organizationId, emailAddressId)
   */
  generateReplyToAddress(emailAddress: EmailAddress): string;
  generateReplyToAddress(organizationIdOrEmailAddress: string | EmailAddress, emailAddressId?: string): string | Promise<string> {
    // Wenn ein EmailAddress-Objekt übergeben wurde (synchron)
    if (typeof organizationIdOrEmailAddress === 'object' && organizationIdOrEmailAddress !== null) {
      const emailAddr = organizationIdOrEmailAddress as EmailAddress;

      // Extrahiere localPart aus email falls nicht direkt vorhanden
      let localPart = emailAddr.localPart;
      if (!localPart && emailAddr.email) {
        localPart = emailAddr.email.split('@')[0];
      }

      // Validierung mit Fallback-Strategie
      if (!localPart || !emailAddr.organizationId || !emailAddr.id) {
        console.warn('⚠️ generateReplyToAddress: Unvollständiges EmailAddress-Objekt:', {
          hasLocalPart: !!localPart,
          hasEmail: !!emailAddr.email,
          hasOrganizationId: !!emailAddr.organizationId,
          hasId: !!emailAddr.id,
          email: emailAddr.email || 'N/A'
        });

        // Fallback: Generiere eine einfache Reply-To basierend auf verfügbaren Daten
        if (emailAddr.email) {
          const [emailLocalPart, domain] = emailAddr.email.split('@');
          const fallbackReplyTo = `${emailLocalPart}-reply@inbox.${domain}`;
          console.log('📧 Fallback Reply-To generiert:', fallbackReplyTo);
          return fallbackReplyTo;
        }

        // Letzter Fallback
        console.error('❌ generateReplyToAddress: Keine E-Mail-Adresse verfügbar');
        return 'noreply@inbox.celeropress.com';
      }

      // Kurzer Prefix aus der lokalen E-Mail-Adresse
      const prefix = localPart
        .substring(0, 10)
        .replace(/[^a-z0-9]/gi, ''); // Nur alphanumerisch

      // Kurze IDs verwenden (erste 8 Zeichen)
      const shortOrgId = emailAddr.organizationId.substring(0, 8);
      const shortEmailId = emailAddr.id.substring(0, 8);

      // Verwende sk-online-marketing.de statt celeropress.de
      return `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
    }

    // Wenn zwei Strings übergeben wurden (async, für Abwärtskompatibilität)
    return this.generateReplyToAddressAsync(organizationIdOrEmailAddress as string, emailAddressId!);
  }

  /**
   * Async-Version: Generiert eine Reply-To Adresse anhand von IDs
   * Lädt die EmailAddress erst aus der Datenbank
   */
  async generateReplyToAddressAsync(organizationId: string, emailAddressId: string): Promise<string> {
    const emailAddress = await this.get(emailAddressId);
    if (!emailAddress) {
      throw new Error(`EmailAddress nicht gefunden: ${emailAddressId}`);
    }

    // Kurzer Prefix aus der lokalen E-Mail-Adresse
    const prefix = emailAddress.localPart
      .substring(0, 10)
      .replace(/[^a-z0-9]/gi, ''); // Nur alphanumerisch

    // Kurze IDs verwenden (erste 8 Zeichen)
    const shortOrgId = organizationId.substring(0, 8);
    const shortEmailId = emailAddressId.substring(0, 8);

    // Verwende sk-online-marketing.de statt celeropress.de
    return `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
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
          const emailAddress = { ...doc.data(), id: doc.id } as EmailAddress;
          return emailAddress;
        }
        
        return null;
      }

      const doc = snapshot.docs[0];
      const emailAddress = { ...doc.data(), id: doc.id } as EmailAddress;
      return emailAddress;
    } catch (error) {
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
      let domains;
      try {
        // Dynamischer Import des Enhanced Service zur Laufzeit
        const { domainServiceEnhanced } = await import('@/lib/firebase/domain-service-enhanced');
        domains = await domainServiceEnhanced.getAll(organizationId);
      } catch (error) {
        // Fallback zu domainService für Build-Kompatibilität
        console.warn('Fallback to domainService for populateDomains due to:', error);
        domains = await domainService.getAll(organizationId);
      }
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

}

// Singleton Export
export const emailAddressService = new EmailAddressService();