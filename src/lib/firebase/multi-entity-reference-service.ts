/**
 * Multi-Entity Reference Service
 *
 * Dieses System erstellt automatisch References für alle verwandten Entities:
 * - Company-References (Medienhaus-Verweise)
 * - Publication-References (Publikations-Verweise)
 * - Journalist-References (mit korrekten lokalen Relations)
 *
 * KERNIDEE: Ein Journalist-Import erstellt 3 Entity-References automatisch!
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  documentId,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ========================================
// TYPES
// ========================================

export interface CompanyReference {
  id?: string;
  organizationId: string;
  globalCompanyId: string;
  localCompanyId: string; // Generierte lokale ID für Relations

  // Lokale Anpassungen
  localNotes?: string;
  localTags?: string[];

  // Meta
  addedAt: any;
  addedBy: string;
  isActive: boolean;
}

export interface PublicationReference {
  id?: string;
  organizationId: string;
  globalPublicationId: string;
  localPublicationId: string; // Generierte lokale ID für Relations
  parentCompanyReferenceId: string; // Verknüpfung zur Company-Reference

  // Lokale Anpassungen
  localNotes?: string;
  localTags?: string[];

  // Meta
  addedAt: any;
  addedBy: string;
  isActive: boolean;
}

export interface JournalistReference {
  id?: string;
  organizationId: string;
  globalJournalistId: string;
  localJournalistId: string; // Generierte lokale ID für Relations

  // KRITISCH: Lokale Relations!
  companyReferenceId: string; // Lokale Company-Reference-ID
  publicationReferenceIds: string[]; // Lokale Publication-Reference-IDs

  // Lokale Anpassungen
  localNotes?: string;
  localTags?: string[];
  customLabel?: string;

  // Meta
  addedAt: any;
  addedBy: string;
  isActive: boolean;
}

export interface CombinedContactReference {
  // Journalist-Daten (aus globaler Quelle)
  id: string; // Lokale Journalist-Reference-ID
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;

  // Company-Daten (aus globaler Quelle)
  companyId: string; // Lokale Company-Reference-ID
  companyName?: string;
  companyTagIds?: string[]; // Company Tags

  // Publication-Daten (aus globaler Quelle)
  publicationIds: string[]; // Lokale Publication-Reference-IDs
  beats?: string[];
  mediaTypes?: string[];

  // Social Media (aus globaler Quelle)
  socialProfiles?: Array<{
    platform: string;
    url: string;
    handle?: string;
    verified?: boolean;
  }>;

  // Contact Tags (aus globaler Quelle)
  tagIds?: string[];

  // Reference-Meta
  _isReference: true;
  _globalJournalistId: string;
  _localMeta: {
    notes?: string;
    tags?: string[];
    customLabel?: string;
    addedAt: Date;
  };
}

export interface MultiEntityImportResult {
  success: boolean;
  journalistReferenceId?: string;
  companyReferenceId?: string;
  publicationReferenceIds?: string[];
  errors?: string[];
}

// ========================================
// MULTI-ENTITY REFERENCE SERVICE
// ========================================

class MultiEntityReferenceService {
  private companyRefsCollection = 'company_references';
  private publicationRefsCollection = 'publication_references';
  private journalistRefsCollection = 'journalist_references';

  /**
   * HAUPTMETHODE: Erstellt automatisch alle Entity-References
   *
   * Ein Journalist-Import erstellt:
   * 1. Company-Reference (falls nicht vorhanden)
   * 2. Publication-References (falls nicht vorhanden)
   * 3. Journalist-Reference mit korrekten lokalen Relations
   */
  async createJournalistReference(
    globalJournalistId: string,
    organizationId: string,
    userId: string,
    initialNotes?: string
  ): Promise<MultiEntityImportResult> {
    const batch = writeBatch(db);

    try {
      // 1. Lade globale Journalist-Daten
      const globalJournalist = await this.loadGlobalJournalist(globalJournalistId);
      if (!globalJournalist) {
        return {
          success: false,
          errors: ['Globaler Journalist nicht gefunden']
        };
      }

      // 2. Prüfe auf existierende Journalist-Reference
      const existingJournalistRef = await this.findExistingJournalistReference(
        globalJournalistId, organizationId
      );
      if (existingJournalistRef) {
        return {
          success: false,
          errors: ['Journalist bereits als Verweis vorhanden']
        };
      }

      // 3. Company-Reference erstellen oder finden
      // WICHTIG: Beide Werte validieren bevor wir sie kombinieren
      const companyId = globalJournalist.companyId;
      const companyName = globalJournalist.companyName;

      // Prüfe ob MINDESTENS einer der Werte gültig ist
      const hasValidCompanyId = companyId && typeof companyId === 'string' && companyId.trim() !== '';
      const hasValidCompanyName = companyName && typeof companyName === 'string' && companyName.trim() !== '';

      if (!hasValidCompanyId && !hasValidCompanyName) {
        
        return {
          success: false,
          errors: ['Journalist hat keine gültige Company-Zuordnung']
        };
      }

      // Verwende den ersten gültigen Wert
      const globalCompanyIdOrName = hasValidCompanyId ? companyId : companyName;

      const companyResult = await this.ensureCompanyReference(
        globalCompanyIdOrName,
        organizationId,
        userId,
        batch
      );

      if (!companyResult.success) {
        return {
          success: false,
          errors: [`Company-Reference fehlgeschlagen: ${companyResult.error}`]
        };
      }

      // 4. Publication-References erstellen oder finden
      

      // Lade globale Company um Typ zu prüfen und Publications zu finden
      

      const globalCompany = await this.loadGlobalCompany(globalJournalist.companyId || globalJournalist.companyName);

      

      // Finde Publications basierend auf Company-Zuordnung (wenn Company ein Media House/Publisher ist)
      let publicationIds = globalJournalist.publicationIds || [];
      

      if ((!publicationIds.length) && globalCompany && ['publisher', 'media_house', 'agency'].includes(globalCompany.type)) {
        
        

        const companyPublications = await this.findPublicationsByCompany(globalCompany.id);
        publicationIds = companyPublications.map(pub => pub.id);

        
      }

      

      const publicationsResult = await this.ensurePublicationReferences(
        publicationIds,
        companyResult.documentId!,  // Document ID statt localCompanyId
        organizationId,
        userId,
        batch
      );

      

      if (!publicationsResult.success) {
        return {
          success: false,
          errors: [`Publication-References fehlgeschlagen: ${publicationsResult.error}`]
        };
      }

      // 5. Journalist-Reference mit korrekten Relations erstellen
      const journalistResult = await this.createJournalistReferenceWithRelations(
        globalJournalist,
        companyResult.documentId!,  // Document ID statt localCompanyId
        publicationsResult.documentIds,  // Document IDs verwenden
        organizationId,
        userId,
        initialNotes,
        batch
      );

      if (!journalistResult.success) {
        return {
          success: false,
          errors: [`Journalist-Reference fehlgeschlagen: ${journalistResult.error}`]
        };
      }

      // 6. Atomisch committen
      await batch.commit();

      return {
        success: true,
        journalistReferenceId: journalistResult.localJournalistId,
        companyReferenceId: companyResult.documentId!,
        publicationReferenceIds: publicationsResult.documentIds  // Document IDs verwenden
      };

    } catch (error) {
      console.error('Fehler bei Multi-Entity Reference-Erstellung:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler']
      };
    }
  }

  /**
   * Lädt alle Contact-References einer Organisation (kombiniert mit globalen Daten)
   */
  async getAllContactReferences(organizationId: string): Promise<CombinedContactReference[]> {
    try {
      // 1. Lade alle aktiven Journalist-References
      const journalistRefsQuery = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('isActive', '==', true)
      );

      const journalistRefsSnapshot = await getDocs(journalistRefsQuery);
      if (journalistRefsSnapshot.empty) {
        return [];
      }

      const journalistRefs = journalistRefsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JournalistReference));

      // 2. Batch-lade alle benötigten globalen Daten
      const globalJournalistIds = journalistRefs.map(ref => ref.globalJournalistId);
      const globalJournalists = await this.batchLoadGlobalJournalists(globalJournalistIds);

      // 3. Lade Company-References für lokale IDs (nur valide IDs)
      const companyRefIds = journalistRefs
        .map(ref => ref.companyReferenceId)
        .filter(id => id && typeof id === 'string');
      const companyRefs = await this.batchLoadCompanyReferences(companyRefIds, organizationId);

      // 3a. Lade globale Company-Daten für Tags
      const globalCompanyIds = Array.from(new Set(
        Array.from(companyRefs.values()).map(ref => ref.globalCompanyId)
      )).filter(id => id && typeof id === 'string');
      const globalCompanies = await this.batchLoadGlobalCompanies(globalCompanyIds);

      // 4. Lade Publication-References für lokale IDs (nur valide IDs)
      const allPublicationRefIds = journalistRefs
        .flatMap(ref => ref.publicationReferenceIds || [])
        .filter(id => id && typeof id === 'string');
      const publicationRefs = await this.batchLoadPublicationReferences(allPublicationRefIds, organizationId);

      // 5. Kombiniere alle Daten
      const combinedReferences: CombinedContactReference[] = [];

      for (const journalistRef of journalistRefs) {
        const globalJournalist = globalJournalists.get(journalistRef.globalJournalistId);
        const companyRef = companyRefs.get(journalistRef.companyReferenceId);
        const globalCompany = companyRef ? globalCompanies.get(companyRef.globalCompanyId) : null;
        const journalistPublicationRefs = (journalistRef.publicationReferenceIds || [])
          .map(id => publicationRefs.get(id))
          .filter(Boolean);

        if (globalJournalist && companyRef) {
          combinedReferences.push({
            // Verwende lokale Reference-ID als Contact-ID
            id: journalistRef.localJournalistId,

            // Globale Journalist-Daten
            displayName: globalJournalist.displayName,
            firstName: globalJournalist.name?.firstName || globalJournalist.displayName?.split(' ')[0],
            lastName: globalJournalist.name?.lastName || globalJournalist.displayName?.split(' ').slice(1).join(' '),
            email: globalJournalist.emails?.[0]?.email,
            phone: globalJournalist.phones?.[0]?.number,
            position: globalJournalist.position,

            // Lokale Company-Reference-ID (kritisch für Relations!)
            companyId: companyRef.localCompanyId,
            companyName: globalJournalist.companyName,
            companyTagIds: globalCompany?.tagIds || [], // ✅ Company Tags

            // Lokale Publication-Reference-IDs (kritisch für Relations!)
            publicationIds: journalistPublicationRefs.map(ref => ref!.localPublicationId),
            beats: globalJournalist.mediaProfile?.beats,
            mediaTypes: globalJournalist.mediaProfile?.mediaTypes,

            // ✅ Social Media Profile
            socialProfiles: globalJournalist.socialProfiles || [],

            // ✅ Contact Tags
            tagIds: globalJournalist.tagIds || [],

            // Reference-Meta
            _isReference: true,
            _globalJournalistId: journalistRef.globalJournalistId,
            _localMeta: {
              notes: journalistRef.localNotes,
              tags: journalistRef.localTags,
              customLabel: journalistRef.customLabel,
              addedAt: journalistRef.addedAt?.toDate() || new Date()
            }
          });
        }
      }

      return combinedReferences;

    } catch (error) {
      console.error('Fehler beim Laden der Contact-References:', error);
      return [];
    }
  }

  /**
   * Entfernt alle Entity-References eines Journalisten atomisch
   */
  async removeJournalistReference(
    globalJournalistId: string,
    organizationId: string
  ): Promise<void> {
    const batch = writeBatch(db);

    try {
      // 1. Finde Journalist-Reference
      const journalistRef = await this.findJournalistReferenceByGlobalId(globalJournalistId, organizationId);
      if (!journalistRef) {
        throw new Error('Journalist-Reference nicht gefunden');
      }

      // 2. Soft-Delete Journalist-Reference
      const journalistRefDoc = doc(
        db, 'organizations', organizationId, this.journalistRefsCollection, journalistRef.id!
      );
      batch.update(journalistRefDoc, {
        isActive: false,
        removedAt: serverTimestamp()
      });

      // 3. Prüfe ob Company/Publication-References noch von anderen genutzt werden
      const companyStillUsed = await this.isCompanyReferenceStillUsed(
        journalistRef.companyReferenceId, organizationId, journalistRef.id!
      );

      if (!companyStillUsed) {
        const companyRefDoc = doc(
          db, 'organizations', organizationId, this.companyRefsCollection, journalistRef.companyReferenceId
        );
        batch.update(companyRefDoc, {
          isActive: false,
          removedAt: serverTimestamp()
        });
      }

      // 4. Publication-References prüfen und ggf. entfernen
      for (const pubRefId of journalistRef.publicationReferenceIds) {
        const pubStillUsed = await this.isPublicationReferenceStillUsed(
          pubRefId, organizationId, journalistRef.id!
        );

        if (!pubStillUsed) {
          const pubRefDoc = doc(
            db, 'organizations', organizationId, this.publicationRefsCollection, pubRefId
          );
          batch.update(pubRefDoc, {
            isActive: false,
            removedAt: serverTimestamp()
          });
        }
      }

      // 5. Atomisch committen
      await batch.commit();

    } catch (error) {
      console.error('Fehler beim Entfernen der Journalist-Reference:', error);
      throw error;
    }
  }

  // ========================================
  // HELPER METHODEN
  // ========================================

  /**
   * Lädt globale Journalist-Daten
   */
  private async loadGlobalJournalist(globalJournalistId: string): Promise<any | null> {
    try {
      const globalDoc = await getDoc(doc(db, 'contacts_enhanced', globalJournalistId));

      if (!globalDoc.exists() || !globalDoc.data().isGlobal) {
        return null;
      }

      return {
        id: globalDoc.id,
        ...globalDoc.data()
      };
    } catch (error) {
      console.error('Fehler beim Laden des globalen Journalisten:', error);
      return null;
    }
  }

  /**
   * Lädt globale Company-Daten
   */
  private async loadGlobalCompany(globalCompanyIdOrName: string): Promise<any | null> {
    try {
      

      // Validiere Input
      if (!globalCompanyIdOrName || typeof globalCompanyIdOrName !== 'string' || globalCompanyIdOrName.trim() === '') {
        
        return null;
      }

      // Versuche zuerst über ID zu laden
      
      const globalDoc = await getDoc(doc(db, 'companies_enhanced', globalCompanyIdOrName));

      

      if (globalDoc.exists()) {
        // WORKAROUND: Akzeptiere Company auch ohne isGlobal Flag (SuperAdmin Problem)
        const data = globalDoc.data();
        const result = {
          id: globalDoc.id,
          ...data
        };
        
        return result;
      }

      // Falls nicht gefunden, suche nach Name in der superadmin Organization
      

      const companiesQuery = query(
        collection(db, 'companies_enhanced'),
        where('isGlobal', '==', true),
        where('name', '==', globalCompanyIdOrName)
      );

      const snapshot = await getDocs(companiesQuery);
      

      if (!snapshot.empty) {
        const companyDoc = snapshot.docs[0];
        const result = {
          id: companyDoc.id,
          ...companyDoc.data()
        };
        
        return result;
      }

      
      return null;
    } catch (error) {
      console.error('💥 Fehler beim Laden der globalen Company:', error);
      return null;
    }
  }

  /**
   * Findet Publications einer bestimmten Company
   */
  private async findPublicationsByCompany(companyId: string): Promise<any[]> {
    try {
      

      // Versuche verschiedene SuperAdmin Organization IDs
      const superAdminOrgIds = ['superadmin', 'superadmin-org'];
      let allPublications: any[] = [];

      for (const orgId of superAdminOrgIds) {
        

        // Versuche mit publisherId
        let publicationsQuery = query(
          collection(db, 'publications'),
          where('organizationId', '==', orgId),
          where('publisherId', '==', companyId)
        );

        let snapshot = await getDocs(publicationsQuery);
        let publications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        

        // Falls keine gefunden, versuche mit companyId
        if (publications.length === 0) {
          
          publicationsQuery = query(
            collection(db, 'publications'),
            where('organizationId', '==', orgId),
            where('companyId', '==', companyId)
          );

          snapshot = await getDocs(publicationsQuery);
          publications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          
        }

        allPublications.push(...publications);
      }

      // Falls keine gefunden, versuche allgemeine Suche nach publisherId ODER companyId
      if (allPublications.length === 0) {
        

        // Erst publisherId
        let fallbackQuery = query(
          collection(db, 'publications'),
          where('publisherId', '==', companyId)
        );

        let fallbackSnapshot = await getDocs(fallbackQuery);
        allPublications = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        

        // Falls noch keine gefunden, versuche companyId
        if (allPublications.length === 0) {
          
          fallbackQuery = query(
            collection(db, 'publications'),
            where('companyId', '==', companyId)
          );

          fallbackSnapshot = await getDocs(fallbackQuery);
          allPublications = fallbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          
        }
      }

      return allPublications;
    } catch (error) {
      console.error('Fehler beim Laden der Company Publications:', error);
      return [];
    }
  }

  /**
   * Erstellt oder findet Company-Reference
   */
  private async ensureCompanyReference(
    globalCompanyIdOrName: string,
    organizationId: string,
    userId: string,
    batch: any
  ): Promise<{ success: boolean; localCompanyId?: string; documentId?: string; error?: string }> {
    try {
      // Validiere globalCompanyIdOrName
      if (!globalCompanyIdOrName || typeof globalCompanyIdOrName !== 'string' || globalCompanyIdOrName.trim() === '') {
        
        return {
          success: false,
          error: 'Ungültige globalCompanyId oder Company-Name'
        };
      }

      // Prüfe ob Company-Reference bereits existiert
      const existingCompanyRef = await this.findCompanyReferenceByGlobalId(
        globalCompanyIdOrName, organizationId
      );

      if (existingCompanyRef) {
        return {
          success: true,
          localCompanyId: existingCompanyRef.localCompanyId,
          documentId: existingCompanyRef.id
        };
      }

      // Erstelle neue Company-Reference
      const localCompanyId = `local-ref-company-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const companyRefDoc = doc(
        collection(db, 'organizations', organizationId, this.companyRefsCollection)
      );

      // Finale Validation vor dem Schreiben (Defense in Depth)
      const trimmedGlobalId = globalCompanyIdOrName.trim();
      if (!trimmedGlobalId) {
        console.error('❌ CRITICAL: Empty globalCompanyId detected before write!', {
          globalCompanyIdOrName,
          organizationId
        });
        return {
          success: false,
          error: 'Leere globalCompanyId darf nicht geschrieben werden'
        };
      }

      const companyRefData: Omit<CompanyReference, 'id'> = {
        organizationId,
        globalCompanyId: trimmedGlobalId,
        localCompanyId,
        addedAt: serverTimestamp(),
        addedBy: userId,
        isActive: true
      };

      batch.set(companyRefDoc, companyRefData);

      return {
        success: true,
        localCompanyId,
        documentId: companyRefDoc.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Company-Reference Fehler'
      };
    }
  }

  /**
   * Erstellt oder findet Publication-References
   */
  private async ensurePublicationReferences(
    globalPublicationIds: string[],
    companyReferenceDocumentId: string,  // Document ID der Company Reference
    organizationId: string,
    userId: string,
    batch: any
  ): Promise<{ success: boolean; documentIds: string[]; error?: string }> {
    try {
      

      const documentIds: string[] = [];  // Document IDs sammeln

      for (const globalPubId of globalPublicationIds) {
        

        // Prüfe ob Publication-Reference bereits existiert
        const existingPubRef = await this.findPublicationReferenceByGlobalId(
          globalPubId, organizationId
        );

        if (existingPubRef) {
          
          documentIds.push(existingPubRef.id!);  // Document ID, nicht localPublicationId
          continue;
        }

        // Erstelle neue Publication-Reference
        const localPublicationId = `local-ref-pub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const pubRefDoc = doc(
          collection(db, 'organizations', organizationId, this.publicationRefsCollection)
        );

        const pubRefData: Omit<PublicationReference, 'id'> = {
          organizationId,
          globalPublicationId: globalPubId,
          localPublicationId,
          parentCompanyReferenceId: companyReferenceDocumentId,  // Document ID verwenden
          addedAt: serverTimestamp(),
          addedBy: userId,
          isActive: true
        };

        

        batch.set(pubRefDoc, pubRefData);
        documentIds.push(pubRefDoc.id);  // Document ID sammeln, nicht localPublicationId
      }

      

      return {
        success: true,
        documentIds  // Document IDs zurückgeben
      };

    } catch (error) {
      return {
        success: false,
        documentIds: [],  // Leer bei Fehler
        error: error instanceof Error ? error.message : 'Publication-References Fehler'
      };
    }
  }

  /**
   * Erstellt Journalist-Reference mit korrekten lokalen Relations
   */
  private async createJournalistReferenceWithRelations(
    globalJournalist: any,
    companyReferenceDocumentId: string,  // Document ID der Company Reference
    publicationReferenceDocumentIds: string[],  // Document IDs der Publication References
    organizationId: string,
    userId: string,
    initialNotes: string | undefined,
    batch: any
  ): Promise<{ success: boolean; localJournalistId?: string; error?: string }> {
    try {
      const localJournalistId = `local-ref-journalist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const journalistRefDoc = doc(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection)
      );

      const journalistRefData: Omit<JournalistReference, 'id'> = {
        organizationId,
        globalJournalistId: globalJournalist.id,
        localJournalistId,

        // KRITISCH: Lokale Relations!
        companyReferenceId: companyReferenceDocumentId,
        publicationReferenceIds: publicationReferenceDocumentIds,  // Document IDs verwenden

        // Lokale Daten
        localNotes: initialNotes || '',
        localTags: [],
        addedAt: serverTimestamp(),
        addedBy: userId,
        isActive: true
      };

      batch.set(journalistRefDoc, journalistRefData);

      return {
        success: true,
        localJournalistId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Journalist-Reference Fehler'
      };
    }
  }

  /**
   * Findet existierende Journalist-Reference
   */
  private async findExistingJournalistReference(
    globalJournalistId: string,
    organizationId: string
  ): Promise<JournalistReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('globalJournalistId', '==', globalJournalistId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as JournalistReference;
    } catch (error) {
      console.error('Fehler beim Suchen der Journalist-Reference:', error);
      return null;
    }
  }

  /**
   * Batch-lädt globale Journalisten
   */
  private async batchLoadGlobalJournalists(ids: string[]): Promise<Map<string, any>> {
    const journalistsMap = new Map();

    if (ids.length === 0) return journalistsMap;

    try {
      // Firestore erlaubt max 10 IDs pro "in" Query
      const chunks = this.chunkArray(ids, 10);

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'contacts_enhanced'),
          where(documentId(), 'in', chunk),
          where('isGlobal', '==', true)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          journalistsMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        });
      }
    } catch (error) {
      console.error('Fehler beim Batch-Load der globalen Journalisten:', error);
    }

    return journalistsMap;
  }

  /**
   * Batch-lädt Company-References
   */
  private async batchLoadCompanyReferences(
    ids: string[],
    organizationId: string
  ): Promise<Map<string, CompanyReference>> {
    const companyRefsMap = new Map();

    if (ids.length === 0) return companyRefsMap;

    try {
      const chunks = this.chunkArray(ids, 10);

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'organizations', organizationId, this.companyRefsCollection),
          where(documentId(), 'in', chunk),
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          companyRefsMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          } as CompanyReference);
        });
      }
    } catch (error) {
      console.error('Fehler beim Batch-Load der Company-References:', error);
    }

    return companyRefsMap;
  }

  /**
   * Batch-lädt globale Companies für Tags
   */
  private async batchLoadGlobalCompanies(ids: string[]): Promise<Map<string, any>> {
    const companiesMap = new Map();

    if (ids.length === 0) return companiesMap;

    try {
      const chunks = this.chunkArray(ids, 10);

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'companies_enhanced'),
          where(documentId(), 'in', chunk)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          companiesMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        });
      }
    } catch (error) {
      console.error('Fehler beim Batch-Load der globalen Companies:', error);
    }

    return companiesMap;
  }

  /**
   * Batch-lädt Publication-References
   */
  private async batchLoadPublicationReferences(
    ids: string[],
    organizationId: string
  ): Promise<Map<string, PublicationReference>> {
    const publicationRefsMap = new Map();

    if (ids.length === 0) return publicationRefsMap;

    try {
      const chunks = this.chunkArray(ids, 10);

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'organizations', organizationId, this.publicationRefsCollection),
          where(documentId(), 'in', chunk),
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          publicationRefsMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          } as PublicationReference);
        });
      }
    } catch (error) {
      console.error('Fehler beim Batch-Load der Publication-References:', error);
    }

    return publicationRefsMap;
  }

  /**
   * Findet Company-Reference nach globaler ID
   */
  private async findCompanyReferenceByGlobalId(
    globalId: string,
    organizationId: string
  ): Promise<CompanyReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.companyRefsCollection),
        where('globalCompanyId', '==', globalId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as CompanyReference;
    } catch (error) {
      console.error('Fehler beim Suchen der Company-Reference:', error);
      return null;
    }
  }

  /**
   * Findet Publication-Reference nach globaler ID
   */
  private async findPublicationReferenceByGlobalId(
    globalId: string,
    organizationId: string
  ): Promise<PublicationReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.publicationRefsCollection),
        where('globalPublicationId', '==', globalId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as PublicationReference;
    } catch (error) {
      console.error('Fehler beim Suchen der Publication-Reference:', error);
      return null;
    }
  }

  /**
   * Findet Journalist-Reference nach lokaler ID
   */
  private async findJournalistReferenceByLocalId(
    localId: string,
    organizationId: string
  ): Promise<JournalistReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('localJournalistId', '==', localId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as JournalistReference;
    } catch (error) {
      console.error('Fehler beim Suchen der Journalist-Reference:', error);
      return null;
    }
  }

  /**
   * Findet Journalist-Reference nach globaler ID
   */
  private async findJournalistReferenceByGlobalId(
    globalId: string,
    organizationId: string
  ): Promise<JournalistReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('globalJournalistId', '==', globalId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as JournalistReference;
    } catch (error) {
      console.error('Fehler beim Suchen der Journalist-Reference:', error);
      return null;
    }
  }

  /**
   * Prüft ob Company-Reference noch von anderen Journalisten verwendet wird
   */
  private async isCompanyReferenceStillUsed(
    companyRefId: string,
    organizationId: string,
    excludeJournalistRefId: string
  ): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('companyReferenceId', '==', companyRefId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      // Prüfe ob andere aktive References existieren (außer der ausgeschlossenen)
      const otherRefs = snapshot.docs.filter(doc => doc.id !== excludeJournalistRefId);
      return otherRefs.length > 0;
    } catch (error) {
      console.error('Fehler beim Prüfen der Company-Reference-Nutzung:', error);
      return true; // Im Fehlerfall nicht löschen
    }
  }

  /**
   * Prüft ob Publication-Reference noch von anderen Journalisten verwendet wird
   */
  private async isPublicationReferenceStillUsed(
    pubRefId: string,
    organizationId: string,
    excludeJournalistRefId: string
  ): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.journalistRefsCollection),
        where('publicationReferenceIds', 'array-contains', pubRefId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      // Prüfe ob andere aktive References existieren (außer der ausgeschlossenen)
      const otherRefs = snapshot.docs.filter(doc => doc.id !== excludeJournalistRefId);
      return otherRefs.length > 0;
    } catch (error) {
      console.error('Fehler beim Prüfen der Publication-Reference-Nutzung:', error);
      return true; // Im Fehlerfall nicht löschen
    }
  }

  /**
   * Teilt Array in Chunks für Batch-Operationen
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Lädt eine Publication-Reference und kombiniert sie mit globalen Daten
   */
  async loadPublicationReference(publicationId: string, organizationId: string): Promise<any | null> {
    try {
      

      // 1. Versuche zuerst direkte Document ID Suche
      try {
        const pubRefDoc = await getDoc(doc(db, 'organizations', organizationId, this.publicationRefsCollection, publicationId));
        if (pubRefDoc.exists()) {
          const pubRefData = pubRefDoc.data() as PublicationReference;
          

          // Lade globale Publication-Daten
          const globalPubDoc = await getDoc(doc(db, 'publications', pubRefData.globalPublicationId));
          if (globalPubDoc.exists()) {
            const globalPubData = globalPubDoc.data();
            

            // Publisher-Name laden
            let publisherName = globalPubData.publisherName || '';
            

            if (globalPubData.publisherId && !publisherName) {
              try {
                
                const companyDoc = await getDoc(doc(db, 'companies', globalPubData.publisherId));
                if (companyDoc.exists()) {
                  const companyData = companyDoc.data();
                  publisherName = companyData?.companyName || companyData?.name || '';
                  
                } else {
                  
                }
              } catch (error) {
                
              }
            }

            // Kombiniere Reference-Daten mit globalen Daten (vollständiges Mapping)
            const combinedData = {
              id: pubRefDoc.id, // Document ID für Navigation
              ...globalPubData,
              organizationId,
              publisherId: pubRefData.parentCompanyReferenceId, // Lokale Company-Reference ID verwenden
              publisherName,

              // Sicherstelle vollständige Datenübernahme
              geographicTargets: globalPubData.geographicTargets || [],
              geographicScope: globalPubData.geographicScope || 'national',
              languages: globalPubData.languages || [],
              focusAreas: globalPubData.focusAreas || [],
              verified: globalPubData.verified || false,
              status: globalPubData.status || 'active',
              format: globalPubData.format || 'online',
              websiteUrl: globalPubData.websiteUrl || globalPubData.website || '',

              // Identifikatoren & Links (sicherstellen dass Arrays für UI)
              identifiers: globalPubData.identifiers || [],
              socialMediaUrls: globalPubData.socialMediaUrls || {},
              internalNotes: globalPubData.internalNotes || '',

              // Reference-Marker
              isReference: true,
              globalPublicationId: pubRefData.globalPublicationId,
              localPublicationId: pubRefData.localPublicationId,
              addedAt: pubRefData.addedAt,
              addedBy: pubRefData.addedBy,

              // Vollständiges Metrics-Schema (von globalPubData.metrics lesen)
              metrics: {
                frequency: globalPubData.metrics?.frequency || globalPubData.frequency || 'monthly',
                targetAudience: globalPubData.metrics?.targetAudience || globalPubData.targetAudience || '',
                targetAgeGroup: globalPubData.metrics?.targetAgeGroup || globalPubData.targetAgeGroup || '',
                targetGender: globalPubData.metrics?.targetGender || globalPubData.targetGender || 'all',
                print: {
                  circulation: globalPubData.metrics?.print?.circulation || globalPubData.circulation || 0,
                  circulationType: globalPubData.metrics?.print?.circulationType || globalPubData.circulationType || ''
                },
                online: {
                  monthlyUniqueVisitors: globalPubData.metrics?.online?.monthlyUniqueVisitors || globalPubData.readership || globalPubData.monthlyUniqueVisitors || 0,
                  monthlyPageViews: globalPubData.metrics?.online?.monthlyPageViews || globalPubData.monthlyPageViews || 0
                }
              }
            };

            return combinedData;
          }
        }
      } catch (error) {
        
      }

      // 2. Fallback: Suche nach localPublicationId
      const pubRefsQuery = query(
        collection(db, 'organizations', organizationId, this.publicationRefsCollection),
        where('localPublicationId', '==', publicationId)
      );

      const snapshot = await getDocs(pubRefsQuery);
      if (snapshot.empty) {
        
        return null;
      }

      const pubRefDoc = snapshot.docs[0];
      const pubRefData = pubRefDoc.data() as PublicationReference;

      

      // 2. Lade globale Publication-Daten
      const globalPubDoc = await getDoc(doc(db, 'publications', pubRefData.globalPublicationId));
      if (!globalPubDoc.exists()) {
        console.error('❌ Globale Publication nicht gefunden:', pubRefData.globalPublicationId);
        return null;
      }

      const globalPubData = globalPubDoc.data();
      

      // 3. Lade Publisher-Daten (Company) für publisherName
      let publisherName = globalPubData.publisherName || '';
      if (globalPubData.publisherId && !publisherName) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', globalPubData.publisherId));
          if (companyDoc.exists()) {
            const companyData = companyDoc.data();
            publisherName = companyData?.companyName || companyData?.name || '';
            
          }
        } catch (error) {
          
        }
      }

      // 4. Kombiniere Reference-Daten mit globalen Daten (vollständiges Mapping)
      const combinedData = {
        id: pubRefDoc.id, // Document ID für Navigation
        ...globalPubData,
        // Override mit lokalen Reference-Daten falls vorhanden
        organizationId,
        publisherId: pubRefData.parentCompanyReferenceId, // Lokale Company-Reference ID verwenden
        publisherName, // Publisher-Name sicherstellen

        // Sicherstelle vollständige Datenübernahme
        geographicTargets: globalPubData.geographicTargets || [],
        geographicScope: globalPubData.geographicScope || 'national',
        languages: globalPubData.languages || [],
        focusAreas: globalPubData.focusAreas || [],
        verified: globalPubData.verified || false,
        status: globalPubData.status || 'active',
        format: globalPubData.format || 'online',
        websiteUrl: globalPubData.websiteUrl || globalPubData.website || '',

        // Identifikatoren & Links (sicherstellen dass Arrays für UI)
        identifiers: globalPubData.identifiers || [],
        socialMediaUrls: globalPubData.socialMediaUrls || {},
        internalNotes: globalPubData.internalNotes || '',

        // Reference-Marker
        isReference: true,
        globalPublicationId: pubRefData.globalPublicationId,
        localPublicationId: pubRefData.localPublicationId,
        addedAt: pubRefData.addedAt,
        addedBy: pubRefData.addedBy,

        // Vollständiges Metrics schema (von globalPubData.metrics lesen)
        metrics: {
          frequency: globalPubData.metrics?.frequency || globalPubData.frequency || 'monthly',
          targetAudience: globalPubData.metrics?.targetAudience || globalPubData.targetAudience || '',
          targetAgeGroup: globalPubData.metrics?.targetAgeGroup || globalPubData.targetAgeGroup || '',
          targetGender: globalPubData.metrics?.targetGender || globalPubData.targetGender || 'all',
          print: {
            circulation: globalPubData.metrics?.print?.circulation || globalPubData.circulation || 0,
            circulationType: globalPubData.metrics?.print?.circulationType || globalPubData.circulationType || ''
          },
          online: {
            monthlyUniqueVisitors: globalPubData.metrics?.online?.monthlyUniqueVisitors || globalPubData.readership || globalPubData.monthlyUniqueVisitors || 0,
            monthlyPageViews: globalPubData.metrics?.online?.monthlyPageViews || globalPubData.monthlyPageViews || 0
          }
        }
      };

      return combinedData;
    } catch (error) {
      console.error('Fehler beim Laden der Publication-Reference:', error);
      return null;
    }
  }
}

// ========================================
// EXPORT
// ========================================

export const multiEntityService = new MultiEntityReferenceService();
// All interfaces are already exported above with 'export interface'