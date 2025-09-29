// src/lib/firebase/journalist-database-service.ts
/**
 * Service-Klassen für die Journalisten-Datenbank
 * Verwaltet Master-Datenbank, Sync und Import/Export
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  writeBatch,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService } from './service-base';
import {
  JournalistDatabaseEntry,
  JournalistCandidate,
  JournalistSyncConfig,
  JournalistImportRequest,
  JournalistImportResponse,
  JournalistExportRequest,
  JournalistSearchParams,
  JournalistSearchResult,
  JournalistSubscription,
  VerificationStatus,
  SyncDirection,
  ConflictStrategy,
  MultiEntityImportResult,
  MultiEntityImportConfig,
  CompanyImportStrategy,
  PublicationImportStrategy
} from '@/types/journalist-database';
import { ContactEnhanced, JournalistContact, CompanyEnhanced } from '@/types/crm-enhanced';
import { Publication } from '@/types/library';
import { contactsEnhancedService } from './crm-service-enhanced';

// ========================================
// Haupt-Service für Journalisten-Datenbank
// ========================================

class JournalistDatabaseService extends BaseService<JournalistDatabaseEntry> {
  constructor() {
    super('journalistDatabase');
  }

  /**
   * Sucht Journalisten in der Master-Datenbank
   */
  async search(
    params: JournalistSearchParams,
    subscription: JournalistSubscription
  ): Promise<JournalistSearchResult> {
    try {
      // Prüfe Berechtigung
      if (!subscription || subscription.status !== 'active') {
        throw new Error('Aktive Subscription erforderlich');
      }

      // Query aufbauen
      const constraints: QueryConstraint[] = [];

      // Basis-Filter
      if (params.filters.verificationStatus?.length) {
        constraints.push(
          where('metadata.verification.status', 'in', params.filters.verificationStatus)
        );
      }

      if (params.filters.minQualityScore !== undefined) {
        constraints.push(
          where('metadata.dataQuality.overallScore', '>=', params.filters.minQualityScore)
        );
      }

      // Sortierung
      const sortField = this.getSortField(params.sortBy);
      constraints.push(
        orderBy(sortField, params.sortOrder || 'desc')
      );

      // Pagination
      if (params.limit) {
        constraints.push(firestoreLimit(params.limit));
      }

      if (params.cursor) {
        const cursorDoc = await getDoc(doc(db, this.collectionName, params.cursor));
        if (cursorDoc.exists()) {
          constraints.push(startAfter(cursorDoc));
        }
      }

      // Query ausführen
      const q = query(collection(db, this.collectionName), ...constraints);
      const snapshot = await getDocs(q);

      // Client-seitige Filterung für komplexe Kriterien
      let journalists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JournalistDatabaseEntry));

      // Text-Suche (client-seitig)
      if (params.query) {
        const searchLower = params.query.toLowerCase();
        journalists = journalists.filter(j =>
          j.personalData.displayName.toLowerCase().includes(searchLower) ||
          j.personalData.emails.some(e => e.email.toLowerCase().includes(searchLower)) ||
          j.professionalData.currentEmployment.mediumName.toLowerCase().includes(searchLower) ||
          j.professionalData.expertise.primaryTopics.some(t => t.toLowerCase().includes(searchLower))
        );
      }

      // Weitere Filter
      if (params.filters.topics?.length) {
        journalists = journalists.filter(j =>
          j.professionalData.expertise.primaryTopics.some(t =>
            params.filters.topics!.includes(t)
          )
        );
      }

      if (params.filters.mediaTypes?.length) {
        journalists = journalists.filter(j =>
          j.professionalData.mediaTypes.some(mt =>
            params.filters.mediaTypes!.includes(mt)
          )
        );
      }

      if (params.filters.languages?.length) {
        journalists = journalists.filter(j =>
          j.personalData.languages.some(l =>
            params.filters.languages!.includes(l)
          )
        );
      }

      // Facetten berechnen
      const facets = this.calculateFacets(journalists);

      // Ergebnis zusammenstellen
      const result: JournalistSearchResult = {
        journalists: journalists.slice(0, params.limit || 50),
        totalCount: journalists.length,
        hasMore: journalists.length > (params.limit || 50),
        nextCursor: snapshot.docs[snapshot.docs.length - 1]?.id,
        facets
      };

      // Usage tracking
      await this.trackUsage(subscription.organizationId, 'search');

      return result;
    } catch (error) {
      console.error('Fehler bei Journalisten-Suche:', error);
      throw error;
    }
  }

  /**
   * Importiert Journalisten ins lokale CRM
   */
  async import(
    request: JournalistImportRequest,
    subscription: JournalistSubscription
  ): Promise<JournalistImportResponse> {
    try {
      // Prüfe Berechtigung und Quota
      if (!subscription.features.importEnabled) {
        throw new Error('Import-Feature nicht verfügbar');
      }

      const quotaCheck = await this.checkQuota(
        subscription,
        'import',
        request.journalistIds.length
      );

      if (!quotaCheck.allowed) {
        throw new Error(`Import-Quota überschritten. Verbleibend: ${quotaCheck.remaining}`);
      }

      const results: JournalistImportResponse['results'] = [];
      let imported = 0, updated = 0, skipped = 0, failed = 0;

      // Batch-Import
      for (const journalistId of request.journalistIds) {
        try {
          // Lade Journalist aus DB
          const journalist = await this.getById(journalistId, 'system');

          if (!journalist) {
            results.push({
              journalistId,
              status: 'failed',
              error: 'Journalist nicht gefunden'
            });
            failed++;
            continue;
          }

          // Prüfe auf existierenden lokalen Kontakt
          const existingContact = await this.findExistingContact(
            journalist,
            request.organizationId
          );

          if (existingContact && !request.options.overwriteExisting) {
            results.push({
              journalistId,
              status: 'skipped',
              localContactId: existingContact.id,
              details: 'Kontakt existiert bereits'
            });
            skipped++;
            continue;
          }

          // Konvertiere zu ContactEnhanced
          const contactData = this.convertToContact(journalist, request.options);

          let localContactId: string;

          if (existingContact && request.options.overwriteExisting) {
            // Update existierenden Kontakt
            await contactsEnhancedService.update(
              existingContact.id!,
              contactData,
              { organizationId: request.organizationId, userId: request.userId }
            );
            localContactId = existingContact.id!;
            updated++;
          } else {
            // Erstelle neuen Kontakt
            localContactId = await contactsEnhancedService.create(
              contactData,
              { organizationId: request.organizationId, userId: request.userId }
            );
            imported++;
          }

          // Erstelle Sync-Link
          if (request.options.enableSync) {
            await this.createSyncLink(
              journalistId,
              localContactId,
              request.organizationId,
              request.options.syncDirection || 'fromDatabase'
            );
          }

          results.push({
            journalistId,
            status: existingContact && request.options.overwriteExisting ? 'updated' : 'imported',
            localContactId
          });

        } catch (error) {
          results.push({
            journalistId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
          failed++;
        }
      }

      // Update Usage
      await this.updateUsage(subscription.organizationId, 'import', imported + updated);

      return {
        success: failed === 0,
        summary: {
          requested: request.journalistIds.length,
          imported,
          updated,
          skipped,
          failed
        },
        results,
        quotaInfo: {
          used: imported + updated,
          remaining: subscription.limits.importsPerMonth - (subscription.usage.currentPeriod.imports + imported + updated),
          resetDate: subscription.billing.currentPeriodEnd
        }
      };
    } catch (error) {
      console.error('Fehler beim Import:', error);
      throw error;
    }
  }

  /**
   * Exportiert lokale Kontakte zur Datenbank (Crowdsourcing)
   */
  async export(
    request: JournalistExportRequest,
    subscription: JournalistSubscription
  ): Promise<void> {
    try {
      // Auch Free-User können zum Crowdsourcing beitragen
      const contacts = await Promise.all(
        request.contactIds.map(id =>
          contactsEnhancedService.getById(id, request.organizationId)
        )
      );

      for (const contact of contacts) {
        if (!contact || !contact.mediaProfile?.isJournalist) continue;

        // Anonymisiere Daten für Crowdsourcing
        const anonymizedData = this.anonymizeContactData(contact, request.organizationId);

        // Füge zu Kandidaten hinzu
        await this.addToMatchingCandidates(anonymizedData);
      }

      // Trigger Matching-Prozess
      await this.triggerMatchingProcess();

    } catch (error) {
      console.error('Fehler beim Export:', error);
      throw error;
    }
  }

  /**
   * Verifiziert einen Journalisten
   */
  async verify(
    journalistId: string,
    method: 'email' | 'manual' | 'api',
    verifiedBy?: string
  ): Promise<void> {
    try {
      const updates = {
        'metadata.verification.status': 'verified' as VerificationStatus,
        'metadata.verification.method': method,
        'metadata.verification.verifiedAt': serverTimestamp(),
        'metadata.verification.verifiedBy': verifiedBy || 'system',
        'metadata.verification.expiresAt': Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 Jahr
        ),
        'metadata.dataQuality.accuracy': increment(20), // Erhöhe Accuracy Score
        'updatedAt': serverTimestamp()
      };

      await updateDoc(doc(db, this.collectionName, journalistId), updates);

      // Sende Bestätigungs-E-Mail
      await this.sendVerificationConfirmation(journalistId);

    } catch (error) {
      console.error('Fehler bei Verifizierung:', error);
      throw error;
    }
  }

  // ===== Helper-Methoden =====

  // ========================================
  // NEUE MULTI-ENTITY IMPORT METHODEN
  // ========================================

  /**
   * HAUPTMETHODE: Multi-Entity Import mit Company & Publications
   */
  async importWithRelations(
    journalistId: string,
    organizationId: string,
    config: MultiEntityImportConfig
  ): Promise<MultiEntityImportResult> {

    const batch = writeBatch(db);
    const result: MultiEntityImportResult = {
      success: false,
      entities: {
        contact: null,
        company: null,
        publications: []
      },
      errors: [],
      warnings: []
    };

    try {
      // 1. Hole vollständige Journalist-Daten aus Premium-DB
      const journalist = await this.getWithRelations(journalistId);
      if (!journalist) {
        result.errors.push('Journalist nicht in Premium-DB gefunden');
        return result;
      }

      // 2. Company-Import (MUSS zuerst passieren!)
      const companyResult = await this.handleCompanyImport(
        journalist.professionalData.employment,
        config.companyStrategy,
        organizationId,
        batch
      );

      if (!companyResult.success) {
        result.errors.push(`Company-Import fehlgeschlagen: ${companyResult.error}`);
        return result;
      }
      result.entities.company = companyResult.company;

      // 3. Publications-Import (braucht Company-ID!)
      const publicationsResult = await this.handlePublicationsImport(
        journalist.professionalData.publicationAssignments,
        config.publicationStrategy,
        companyResult.company!.id!,
        organizationId,
        batch
      );

      if (!publicationsResult.success) {
        result.errors.push(`Publications-Import fehlgeschlagen: ${publicationsResult.error}`);
        return result;
      }
      result.entities.publications = publicationsResult.publications;

      // 4. Contact-Import (mit korrekten Relationen!)
      const contactResult = await this.handleContactImport(
        journalist,
        {
          companyId: companyResult.company!.id!,
          publicationIds: publicationsResult.publications.map(p => p.id!)
        },
        config.fieldMapping?.journalist,
        organizationId,
        batch
      );

      if (!contactResult.success) {
        result.errors.push(`Contact-Import fehlgeschlagen: ${contactResult.error}`);
        return result;
      }
      result.entities.contact = contactResult.contact;

      // 5. Commit aller Änderungen atomisch
      await batch.commit();
      result.success = true;

    } catch (error) {
      result.errors.push(`Unerwarteter Fehler: ${error.message}`);
    }

    return result;
  }

  /**
   * Hole Journalist mit allen Relations aus Premium-DB
   */
  private async getWithRelations(journalistId: string): Promise<JournalistDatabaseEntry | null> {
    // TODO: Implementiere vollständige Premium-DB-Abfrage
    // Für jetzt Mock-Daten verwenden
    return null;
  }

  /**
   * Company-Import mit verschiedenen Strategien
   */
  private async handleCompanyImport(
    employment: JournalistDatabaseEntry['professionalData']['employment'],
    strategy: CompanyImportStrategy,
    organizationId: string,
    batch: any
  ): Promise<{ success: boolean; company?: CompanyEnhanced; error?: string }> {

    try {
      let targetCompany: CompanyEnhanced;

      switch (strategy.action) {
        case 'create_new':
          targetCompany = this.createCompanyFromPremiumData(employment, organizationId);
          const companyRef = doc(collection(db, 'organizations', organizationId, 'companies'));
          targetCompany.id = companyRef.id;
          batch.set(companyRef, targetCompany);
          break;

        case 'use_existing':
          if (!strategy.selectedCompanyId) {
            return { success: false, error: 'Keine Company-ID für existing-Strategy' };
          }
          targetCompany = await this.getExistingCompany(strategy.selectedCompanyId, organizationId);
          if (!targetCompany) {
            return { success: false, error: 'Ausgewählte Company nicht gefunden' };
          }
          break;

        case 'merge':
          if (!strategy.selectedCompanyId) {
            return { success: false, error: 'Keine Company-ID für merge-Strategy' };
          }
          const existing = await this.getExistingCompany(strategy.selectedCompanyId, organizationId);
          if (!existing) {
            return { success: false, error: 'Company für Merge nicht gefunden' };
          }
          targetCompany = this.mergeCompanyData(existing, employment);
          batch.update(
            doc(db, 'organizations', organizationId, 'companies', existing.id!),
            targetCompany
          );
          break;

        default:
          return { success: false, error: 'Unbekannte Company-Strategie' };
      }

      return { success: true, company: targetCompany };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Publications-Import mit verschiedenen Strategien
   */
  private async handlePublicationsImport(
    assignments: JournalistDatabaseEntry['professionalData']['publicationAssignments'],
    strategy: PublicationImportStrategy,
    publisherId: string,
    organizationId: string,
    batch: any
  ): Promise<{ success: boolean; publications: Publication[]; error?: string }> {

    try {
      if (strategy.action === 'skip') {
        return { success: true, publications: [] };
      }

      const publications: Publication[] = [];
      const selectedAssignments = strategy.action === 'import_all'
        ? assignments
        : assignments.filter(a =>
            strategy.selectedPublicationIds?.includes(a.publication.globalPublicationId)
          );

      for (const assignment of selectedAssignments) {
        // Prüfe ob Publication bereits existiert
        const existing = await this.findExistingPublication(
          assignment.publication.title,
          publisherId,
          organizationId
        );

        if (existing) {
          publications.push(existing);
        } else {
          // Erstelle neue Publication
          const newPublication = this.createPublicationFromPremiumData(
            assignment.publication,
            publisherId,
            organizationId
          );

          const pubRef = doc(collection(db, 'organizations', organizationId, 'publications'));
          newPublication.id = pubRef.id;
          batch.set(pubRef, newPublication);
          publications.push(newPublication);
        }
      }

      return { success: true, publications };

    } catch (error) {
      return { success: false, publications: [], error: error.message };
    }
  }

  /**
   * Contact-Import mit korrekten Relationen
   */
  private async handleContactImport(
    journalist: JournalistDatabaseEntry,
    relations: { companyId: string; publicationIds: string[] },
    fieldMapping?: Record<string, string>,
    organizationId: string,
    batch: any
  ): Promise<{ success: boolean; contact?: ContactEnhanced; error?: string }> {

    try {
      const contactData = this.convertToContactWithRelations(journalist, relations, fieldMapping);

      const contactRef = doc(collection(db, 'organizations', organizationId, 'contacts'));
      contactData.id = contactRef.id;
      batch.set(contactRef, contactData);

      return { success: true, contact: contactData };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // HELPER METHODEN
  // ========================================

  /**
   * Erstellt Company aus Premium-DB-Daten
   */
  private createCompanyFromPremiumData(
    employment: JournalistDatabaseEntry['professionalData']['employment'],
    organizationId: string
  ): CompanyEnhanced {
    const company = employment.company;

    return {
      // Basis-Felder
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'journalist-database-import',
      updatedBy: 'journalist-database-import',

      // Company-Daten aus Premium-DB
      name: company.name,
      type: 'media' as any, // TODO: Map company.type richtig
      officialName: company.name,

      // Adresse falls vorhanden
      ...(company.address && { mainAddress: company.address }),

      // Kontaktdaten
      ...(company.emails && {
        emails: company.emails.map(e => ({
          type: e.type,
          email: e.email,
          isPrimary: e.isPrimary
        }))
      }),

      ...(company.phones && { phones: company.phones }),
      ...(company.website && { website: company.website }),

      // Media-Info
      mediaInfo: {
        type: company.mediaInfo?.type || 'mixed',
        targetAudience: company.mediaInfo?.targetAudience,
        reach: company.mediaInfo?.reach,
        founded: company.mediaInfo?.founded,
        ...(company.mediaInfo?.circulation && { circulation: company.mediaInfo.circulation })
      },

      // Custom-Felder für Tracking
      customFields: {
        globalCompanyId: company.globalCompanyId,
        importedFromPremiumDB: true,
        importedAt: new Date()
      }
    } as CompanyEnhanced;
  }

  /**
   * Konvertiert Journalist zu Contact MIT korrekten Relationen
   */
  private convertToContactWithRelations(
    journalist: JournalistDatabaseEntry,
    relations: { companyId: string; publicationIds: string[] },
    fieldMapping?: Record<string, string>
  ): ContactEnhanced {
    return {
      // Basis-Felder
      organizationId: '', // Wird in handleContactImport gesetzt
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'journalist-database-import',
      updatedBy: 'journalist-database-import',

      // Persönliche Daten
      name: journalist.personalData.name,
      displayName: journalist.personalData.displayName,
      emails: journalist.personalData.emails.map(e => ({
        type: e.type as any,
        email: e.email,
        isPrimary: e.isPrimary,
        isVerified: e.isVerified
      })),
      phones: journalist.personalData.phones,

      // KRITISCH: Korrekte Company-Verknüpfung
      companyId: relations.companyId,
      companyName: journalist.professionalData.employment.company.name,
      position: journalist.professionalData.employment.position,
      department: journalist.professionalData.employment.department,

      // KRITISCH: Korrekte Publications-Verknüpfungen
      mediaProfile: {
        isJournalist: true,
        publicationIds: relations.publicationIds, // NICHT mehr leer!
        beats: journalist.professionalData.expertise.primaryTopics,
        mediaTypes: journalist.professionalData.mediaTypes as any,
        preferredTopics: journalist.professionalData.expertise.primaryTopics
      },

      // Social Media
      socialProfiles: journalist.socialMedia?.profiles?.map(p => ({
        platform: p.platform,
        url: p.url,
        handle: p.handle,
        verified: p.verified
      })) || [],

      // Custom-Felder für Tracking
      customFields: {
        journalistDatabaseId: journalist.globalId,
        verificationStatus: journalist.metadata?.verification?.status,
        qualityScore: journalist.metadata?.dataQuality?.overallScore,
        importedFromPremiumDB: true,
        lastSyncedAt: new Date()
      }
    } as ContactEnhanced;
  }

  /**
   * ALTE METHODE: Wird durch importWithRelations ersetzt
   * @deprecated Verwende stattdessen importWithRelations()
   */
  private convertToContact(
    journalist: JournalistDatabaseEntry,
    options: JournalistImportRequest['options']
  ): Partial<ContactEnhanced> {
    // Diese Methode ist KAPUTT - verwendet sie nicht mehr!
    throw new Error('convertToContact ist deprecated. Verwende importWithRelations() stattdessen.');
  }

  // TODO: Implementiere weitere Helper-Methoden:
  // - getExistingCompany()
  // - mergeCompanyData()
  // - findExistingPublication()
  // - createPublicationFromPremiumData()

  /**
   * Findet existierenden lokalen Kontakt
   */
  private async findExistingContact(
    journalist: JournalistDatabaseEntry,
    organizationId: string
  ): Promise<ContactEnhanced | null> {
    // Prüfe erst auf direkten Link
    const linkedOrg = journalist.syncInfo.linkedOrganizations.find(
      link => link.organizationId === organizationId
    );

    if (linkedOrg) {
      return await contactsEnhancedService.getById(
        linkedOrg.localContactId,
        organizationId
      );
    }

    // Suche nach E-Mail
    const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email;
    if (primaryEmail) {
      const contacts = await contactsEnhancedService.search(organizationId, {
        // Search by email would need to be implemented
      });

      // Finde besten Match
      return contacts.find(c =>
        c.emails?.some(e => e.email === primaryEmail)
      ) || null;
    }

    return null;
  }

  /**
   * Erstellt Sync-Link zwischen DB und lokalem Kontakt
   */
  private async createSyncLink(
    journalistId: string,
    localContactId: string,
    organizationId: string,
    direction: SyncDirection
  ): Promise<void> {
    const journalistRef = doc(db, this.collectionName, journalistId);

    const newLink = {
      organizationId,
      localContactId,
      linkCreatedAt: serverTimestamp(),
      linkCreatedBy: 'system',
      syncEnabled: true,
      syncDirection: direction,
      lastSyncedAt: serverTimestamp(),
      syncStatus: 'success'
    };

    // Füge Link zum Journalist hinzu
    const journalist = await getDoc(journalistRef);
    if (journalist.exists()) {
      const currentLinks = journalist.data().syncInfo?.linkedOrganizations || [];

      // Entferne alten Link falls vorhanden
      const filteredLinks = currentLinks.filter(
        (link: any) => link.organizationId !== organizationId
      );

      await updateDoc(journalistRef, {
        'syncInfo.linkedOrganizations': [...filteredLinks, newLink],
        'updatedAt': serverTimestamp()
      });
    }
  }

  /**
   * Anonymisiert Kontaktdaten für Crowdsourcing
   */
  private anonymizeContactData(
    contact: ContactEnhanced,
    organizationId: string
  ): any {
    return {
      // Hashwerte für Matching
      emailHashes: contact.emails?.map(e => this.hashEmail(e.email)),

      // Generalisierte Daten
      medium: contact.companyName,
      position: contact.position,
      topics: contact.mediaProfile?.beats,
      mediaTypes: contact.mediaProfile?.mediaTypes,

      // Metadaten
      contributedBy: organizationId,
      contributedAt: serverTimestamp(),
      dataCompleteness: this.calculateCompleteness(contact)
    };
  }

  /**
   * Berechnet Daten-Vollständigkeit
   */
  private calculateCompleteness(contact: any): number {
    const fields = [
      'name', 'emails', 'phones', 'position', 'companyName',
      'mediaProfile.beats', 'mediaProfile.mediaTypes', 'socialProfiles'
    ];

    let filledFields = 0;
    for (const field of fields) {
      const value = this.getNestedValue(contact, field);
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        filledFields++;
      }
    }

    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Hilfsfunktion für verschachtelte Objekt-Zugriffe
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Hash-Funktion für E-Mails
   */
  private hashEmail(email: string): string {
    // Einfacher Hash für Demo - in Produktion sollte crypto verwendet werden
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Mapping für Sortier-Felder
   */
  private getSortField(sortBy?: string): string {
    const mapping: Record<string, string> = {
      'relevance': 'metadata.dataQuality.overallScore',
      'qualityScore': 'metadata.dataQuality.overallScore',
      'influenceScore': 'socialMedia.influence.influenceScore',
      'lastActive': 'updatedAt',
      'name': 'personalData.displayName'
    };
    return mapping[sortBy || 'relevance'] || 'metadata.dataQuality.overallScore';
  }

  /**
   * Berechnet Facetten für Suchergebnisse
   */
  private calculateFacets(journalists: JournalistDatabaseEntry[]): any {
    const facets: any = {
      mediaTypes: new Map<string, number>(),
      topics: new Map<string, number>(),
      verificationStatus: new Map<string, number>()
    };

    for (const j of journalists) {
      // Media Types
      for (const mt of j.professionalData.mediaTypes) {
        facets.mediaTypes.set(mt, (facets.mediaTypes.get(mt) || 0) + 1);
      }

      // Topics
      for (const topic of j.professionalData.expertise.primaryTopics) {
        facets.topics.set(topic, (facets.topics.get(topic) || 0) + 1);
      }

      // Verification Status
      const status = j.metadata.verification.status;
      facets.verificationStatus.set(status, (facets.verificationStatus.get(status) || 0) + 1);
    }

    // Konvertiere zu Arrays
    return {
      mediaTypes: Array.from(facets.mediaTypes.entries()).map(([value, count]) => ({ value, count })),
      topics: Array.from(facets.topics.entries()).map(([value, count]) => ({ value, count })).slice(0, 20),
      verificationStatus: Array.from(facets.verificationStatus.entries()).map(([value, count]) => ({ value, count }))
    };
  }

  // Placeholder-Methoden für weitere Features

  private async checkQuota(
    subscription: JournalistSubscription,
    type: 'search' | 'import' | 'export',
    count: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    // Implementierung würde echte Quota-Prüfung durchführen
    return { allowed: true, remaining: 100 };
  }

  private async trackUsage(organizationId: string, action: string): Promise<void> {
    // Implementierung würde Usage tracking durchführen
  }

  private async updateUsage(organizationId: string, action: string, count: number): Promise<void> {
    // Implementierung würde Usage updaten
  }

  private async sendVerificationConfirmation(journalistId: string): Promise<void> {
    // Implementierung würde E-Mail senden
  }

  private async addToMatchingCandidates(data: any): Promise<void> {
    // Implementierung würde zu Kandidaten hinzufügen
  }

  private async triggerMatchingProcess(): Promise<void> {
    // Implementierung würde Matching-Prozess starten
  }
}

// ========================================
// Sync-Service für bidirektionale Synchronisation
// ========================================

class JournalistSyncService {
  private dbService: JournalistDatabaseService;
  private crmService: typeof contactsEnhancedService;

  constructor() {
    this.dbService = new JournalistDatabaseService();
    this.crmService = contactsEnhancedService;
  }

  /**
   * Synchronisiert alle verknüpften Journalisten einer Organisation
   */
  async syncOrganization(
    organizationId: string,
    config: JournalistSyncConfig
  ): Promise<{
    synced: number;
    conflicts: number;
    errors: Array<{ contactId: string; error: string }>;
  }> {
    try {
      if (!config.enabled) {
        throw new Error('Synchronisation ist deaktiviert');
      }

      const results = {
        synced: 0,
        conflicts: 0,
        errors: [] as Array<{ contactId: string; error: string }>
      };

      // Lade alle verknüpften Kontakte
      const linkedContacts = await this.getLinkedContacts(organizationId);

      for (const contact of linkedContacts) {
        try {
          const journalistId = contact.customFields?.journalistDatabaseId;
          if (!journalistId) continue;

          // Lade Journalist aus DB
          const journalist = await this.dbService.getById(journalistId, 'system');
          if (!journalist) {
            results.errors.push({
              contactId: contact.id!,
              error: 'Journalist nicht in Datenbank gefunden'
            });
            continue;
          }

          // Prüfe auf Konflikte
          const conflict = await this.detectConflict(contact, journalist, config);

          if (conflict) {
            const resolved = await this.resolveConflict(
              contact,
              journalist,
              config.settings.conflictResolution.strategy
            );

            if (resolved) {
              results.synced++;
            } else {
              results.conflicts++;
            }
          } else {
            // Kein Konflikt - normaler Sync
            await this.syncContact(contact, journalist, config);
            results.synced++;
          }

        } catch (error) {
          results.errors.push({
            contactId: contact.id!,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      }

      // Update Sync-Historie
      await this.updateSyncHistory(organizationId, results);

      return results;
    } catch (error) {
      console.error('Fehler bei Organisation-Sync:', error);
      throw error;
    }
  }

  /**
   * Synchronisiert einzelnen Kontakt
   */
  async syncContact(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry,
    config: JournalistSyncConfig
  ): Promise<void> {
    const direction = config.settings.direction;

    if (direction === 'fromDatabase' || direction === 'bidirectional') {
      // Update lokalen Kontakt mit DB-Daten
      await this.updateLocalFromDatabase(contact, journalist, config);
    }

    if (direction === 'toDatabase' || direction === 'bidirectional') {
      // Update DB mit lokalen Daten
      await this.updateDatabaseFromLocal(contact, journalist, config);
    }

    // Update Sync-Timestamp
    await this.updateSyncTimestamp(contact.id!, journalist.id!);
  }

  /**
   * Erkennt Konflikte zwischen lokalem Kontakt und DB
   */
  private async detectConflict(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry,
    config: JournalistSyncConfig
  ): Promise<boolean> {
    // Vergleiche Last-Modified-Timestamps
    const localUpdated = contact.updatedAt as Timestamp;
    const dbUpdated = journalist.updatedAt as Timestamp;
    const lastSync = contact.customFields?.lastSyncedAt as Timestamp;

    if (!lastSync) return false;

    // Beide wurden seit letztem Sync geändert = Konflikt
    return localUpdated > lastSync && dbUpdated > lastSync;
  }

  /**
   * Löst Konflikte basierend auf Strategie
   */
  private async resolveConflict(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry,
    strategy: ConflictStrategy
  ): Promise<boolean> {
    switch (strategy) {
      case 'localWins':
        await this.updateDatabaseFromLocal(contact, journalist, null as any);
        return true;

      case 'databaseWins':
        await this.updateLocalFromDatabase(contact, journalist, null as any);
        return true;

      case 'newest':
        const localNewer = (contact.updatedAt as Timestamp) > (journalist.updatedAt as Timestamp);
        if (localNewer) {
          await this.updateDatabaseFromLocal(contact, journalist, null as any);
        } else {
          await this.updateLocalFromDatabase(contact, journalist, null as any);
        }
        return true;

      case 'merge':
        // Intelligentes Merging - nimmt beste Daten von beiden
        await this.mergeConflict(contact, journalist);
        return true;

      case 'manual':
        // Markiere für manuelle Review
        await this.markForManualReview(contact.id!, journalist.id!);
        return false;

      default:
        return false;
    }
  }

  // Placeholder-Methoden für weitere Sync-Features

  private async getLinkedContacts(organizationId: string): Promise<ContactEnhanced[]> {
    // Würde alle Kontakte mit journalistDatabaseId laden
    return [];
  }

  private async updateLocalFromDatabase(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry,
    config: JournalistSyncConfig
  ): Promise<void> {
    // Implementierung würde lokalen Kontakt updaten
  }

  private async updateDatabaseFromLocal(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry,
    config: JournalistSyncConfig
  ): Promise<void> {
    // Implementierung würde DB-Entry updaten
  }

  private async updateSyncTimestamp(contactId: string, journalistId: string): Promise<void> {
    // Implementierung würde Timestamps updaten
  }

  private async updateSyncHistory(organizationId: string, results: any): Promise<void> {
    // Implementierung würde Historie updaten
  }

  private async mergeConflict(
    contact: ContactEnhanced,
    journalist: JournalistDatabaseEntry
  ): Promise<void> {
    // Implementierung würde intelligentes Merging durchführen
  }

  private async markForManualReview(contactId: string, journalistId: string): Promise<void> {
    // Implementierung würde für Review markieren
  }
}

// ========================================
// Matching-Service für Crowdsourcing
// ========================================

class JournalistMatchingService {
  /**
   * Findet Matches für einen Kandidaten
   */
  async findMatches(
    candidate: JournalistCandidate
  ): Promise<Array<{
    journalistId: string;
    matchScore: number;
    matchDetails: any;
  }>> {
    try {
      const matches = [];

      // Suche nach E-Mail-Matches
      if (candidate.aggregatedData.emails?.length) {
        for (const email of candidate.aggregatedData.emails) {
          // Würde in echter Implementierung nach Hash suchen
          // und Fuzzy-Matching durchführen
        }
      }

      // Suche nach Namen-Matches
      if (candidate.aggregatedData.name) {
        // Fuzzy Name Matching
      }

      return matches;
    } catch (error) {
      console.error('Fehler beim Matching:', error);
      return [];
    }
  }

  /**
   * Verarbeitet Matching-Kandidaten
   */
  async processCandidates(): Promise<void> {
    try {
      // Lade unverarbeitete Kandidaten
      const candidatesQuery = query(
        collection(db, 'journalistCandidates'),
        where('review.status', '==', 'pending'),
        orderBy('matching.averageScore', 'desc'),
        firestoreLimit(100)
      );

      const snapshot = await getDocs(candidatesQuery);

      for (const doc of snapshot.docs) {
        const candidate = { id: doc.id, ...doc.data() } as JournalistCandidate;

        // Prüfe ob genug Quellen
        if (candidate.matching.sourceCount >= 3) {
          // Automatisch genehmigen bei hohem Score
          if (candidate.matching.averageScore >= 95) {
            await this.autoApproveCandidate(candidate);
          }
        }
      }
    } catch (error) {
      console.error('Fehler bei Kandidaten-Verarbeitung:', error);
    }
  }

  /**
   * Genehmigt Kandidaten automatisch
   */
  private async autoApproveCandidate(candidate: JournalistCandidate): Promise<void> {
    // Erstelle neuen DB-Entry aus Kandidat
    const newJournalist = this.createJournalistFromCandidate(candidate);

    // Speichere in Datenbank
    const journalistRef = doc(collection(db, 'journalistDatabase'));
    await setDoc(journalistRef, newJournalist);

    // Update Kandidaten-Status
    await updateDoc(doc(db, 'journalistCandidates', candidate.id), {
      'review.status': 'approved',
      'review.reviewedAt': serverTimestamp(),
      'review.reviewedBy': 'system-auto',
      'review.decision': {
        action: 'create_new',
        targetJournalistId: journalistRef.id
      }
    });
  }

  /**
   * Erstellt Journalist aus Kandidat
   */
  private createJournalistFromCandidate(candidate: JournalistCandidate): any {
    // Implementierung würde vollständigen Entry erstellen
    return {};
  }
}

// ========================================
// Export der Service-Instanzen
// ========================================

export const journalistDatabaseService = new JournalistDatabaseService();
export const journalistSyncService = new JournalistSyncService();
export const journalistMatchingService = new JournalistMatchingService();

// Re-export Types für einfachen Import
export type {
  JournalistDatabaseEntry,
  JournalistCandidate,
  JournalistSyncConfig,
  JournalistImportRequest,
  JournalistImportResponse,
  JournalistSearchParams,
  JournalistSearchResult,
  JournalistSubscription
} from '@/types/journalist-database';