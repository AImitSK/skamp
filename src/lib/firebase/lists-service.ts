// src/lib/firebase/lists-service.ts
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
  limit,
} from 'firebase/firestore';
import { db } from './client-init';
// GEÄNDERT: Import der enhanced services
import { contactsEnhancedService, companiesEnhancedService } from './crm-service-enhanced';
import { publicationService } from './library-service';
import { DistributionList, ListFilters, ListUsage, ListMetrics } from '@/types/lists';
import { ContactEnhanced, CompanyEnhanced } from '@/types/crm-enhanced';
import { Publication } from '@/types/library';

export const listsService = {
  // --- CRUD Operationen ---

  async getAll(organizationId: string, legacyUserId?: string): Promise<DistributionList[]> {
    try {
      
      // Zuerst versuchen mit organizationId (neues Schema)
      let q = query(
        collection(db, 'distribution_lists'),
        where('organizationId', '==', organizationId),
        orderBy('name')
      );
      let snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DistributionList));
      }
      
      // Fallback 1: Legacy-Daten mit legacyUserId (falls übergeben)
      if (legacyUserId) {
        q = query(
          collection(db, 'distribution_lists'),
          where('userId', '==', legacyUserId),
          orderBy('name')
        );
        snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as DistributionList));
        }
      }
      
      // Fallback 2: Versuche mit organizationId als userId (falls organizationId == userId)
      q = query(
        collection(db, 'distribution_lists'),
        where('userId', '==', organizationId),
        orderBy('name')
      );
      snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DistributionList));
      }
      
      return [];
      
    } catch (error) {
      return [];
    }
  },

  async getById(id: string): Promise<DistributionList | null> {
    // Validate ID to prevent Firebase error
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('⚠️ Invalid list ID provided to getById:', id);
      return null;
    }

    try {
      const docRef = doc(db, 'distribution_lists', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DistributionList;
      }
    } catch (error) {
      console.error('Error fetching distribution list:', error);
    }
    return null;
  },

  async create(listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Kontaktanzahl berechnen
    const contactCount = await this.calculateContactCount(listData);
    
    // Daten bereinigen - undefined Werte entfernen
    const cleanData = {
      name: listData.name,
      description: listData.description || '',
      type: listData.type,
      category: listData.category || 'custom',
      color: listData.color || 'blue',
      userId: listData.userId,
      organizationId: listData.organizationId || listData.userId, // Nutze organizationId wenn vorhanden, sonst Fallback auf userId
      contactCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // Nur definierte Filter/ContactIds hinzufügen
    if (listData.type === 'dynamic' && listData.filters) {
      (cleanData as any).filters = listData.filters;
    }
    
    if (listData.type === 'static' && listData.contactIds && listData.contactIds.length > 0) {
      (cleanData as any).contactIds = listData.contactIds;
    }
    
    const docRef = await addDoc(collection(db, 'distribution_lists'), cleanData);
    return docRef.id;
  },

  async update(id: string, updates: Partial<DistributionList>): Promise<void> {
    const docRef = doc(db, 'distribution_lists', id);
    
    // Bei Filter-Änderungen Kontaktanzahl neu berechnen
    let contactCount = updates.contactCount;
    if (updates.filters || updates.contactIds) {
      const currentList = await this.getById(id);
      if (currentList) {
        const updatedList = { ...currentList, ...updates };
        contactCount = await this.calculateContactCount(updatedList);
      }
    }
    
    // Daten bereinigen - undefined Werte entfernen
    const cleanUpdates: any = {
      updatedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // Nur definierte Werte hinzufügen
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.type !== undefined) cleanUpdates.type = updates.type;
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.color !== undefined) cleanUpdates.color = updates.color;
    if (contactCount !== undefined) cleanUpdates.contactCount = contactCount;
    
    if (updates.filters !== undefined) cleanUpdates.filters = updates.filters;
    if (updates.contactIds !== undefined) cleanUpdates.contactIds = updates.contactIds;
    
    await updateDoc(docRef, cleanUpdates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'distribution_lists', id));
  },

  // --- Listen-Logik ---

  async getContacts(list: DistributionList): Promise<ContactEnhanced[]> {
    if (list.type === 'static' && list.contactIds) {
      return await this.getContactsByIds(list.contactIds);
    } else if (list.type === 'dynamic' && list.filters) {
      const organizationId = list.organizationId || list.userId;
      return await this.getContactsByFilters(list.filters, organizationId);
    }
    return [];
  },

  async getContactsPreview(list: DistributionList, maxCount: number = 10): Promise<ContactEnhanced[]> {
    const allContacts = await this.getContacts(list);
    return allContacts.slice(0, maxCount);
  },

  async calculateContactCount(list: Partial<DistributionList>): Promise<number> {
    if (list.type === 'static' && list.contactIds) {
      return list.contactIds.length;
    } else if (list.type === 'dynamic' && list.filters) {
      const organizationId = list.organizationId || list.userId;
      if (organizationId) {
        const contacts = await this.getContactsByFilters(list.filters, organizationId);
        return contacts.length;
      }
    }
    return 0;
  },

  // --- Filter-basierte Kontaktsuche ---

  async getContactsByFilters(filters: ListFilters, organizationId: string): Promise<ContactEnhanced[]> {
    
    // Basis: Alle Kontakte der Organisation
    let allContacts = await contactsEnhancedService.getAll(organizationId);
    
    // Lade Publikationen wenn Publikations-Filter gesetzt sind
    let publications: Publication[] = [];
    let publicationIdToContactIds = new Map<string, Set<string>>();
    
    if (filters.publications) {
      // Lade alle Publikationen der Organisation
      publications = await publicationService.searchPublications(organizationId, {
        // Direkte Filter
        publisherIds: filters.publications.publisherIds,
        types: filters.publications.types,
        formats: filters.publications.formats,
        languages: filters.publications.languages,
        countries: filters.publications.countries,
        focusAreas: filters.publications.focusAreas,
        status: filters.publications.status,
        
        // Metrik-Filter
        minCirculation: filters.publications.minPrintCirculation,
        minUniqueVisitors: filters.publications.minOnlineVisitors,
      });
      
      // Filter nach spezifischen Publikations-IDs
      if (filters.publications.publicationIds?.length) {
        publications = publications.filter(pub => 
          pub.id && filters.publications!.publicationIds!.includes(pub.id)
        );
      }
      
      // Erweiterte Filterung für Eigenschaften, die searchPublications nicht abdeckt
      if (filters.publications.frequencies?.length) {
        publications = publications.filter(pub => 
          filters.publications!.frequencies!.includes(pub.metrics.frequency)
        );
      }
      
      if (filters.publications.geographicScopes?.length) {
        publications = publications.filter(pub => 
          filters.publications!.geographicScopes!.includes(pub.geographicScope)
        );
      }
      
      if (filters.publications.targetIndustries?.length) {
        publications = publications.filter(pub => 
          pub.targetIndustries?.some(industry => 
            filters.publications!.targetIndustries!.includes(industry)
          )
        );
      }
      
      if (filters.publications.maxPrintCirculation) {
        publications = publications.filter(pub => 
          (pub.metrics.print?.circulation || 0) <= filters.publications!.maxPrintCirculation!
        );
      }
      
      if (filters.publications.maxOnlineVisitors) {
        publications = publications.filter(pub => 
          (pub.metrics.online?.monthlyUniqueVisitors || 0) <= filters.publications!.maxOnlineVisitors!
        );
      }
      
      if (filters.publications.onlyVerified) {
        publications = publications.filter(pub => pub.verified === true);
      }
      
      // Sammle alle Kontakt-IDs die mit diesen Publikationen verknüpft sind
      for (const pub of publications) {
        const contactIds = new Set<string>();
        
        // Redaktionelle Kontakte der Publikation
        if (pub.editorialContacts) {
          for (const editorial of pub.editorialContacts) {
            if (editorial.contactId) {
              contactIds.add(editorial.contactId);
            }
          }
        }
        
        publicationIdToContactIds.set(pub.id!, contactIds);
      }
    }
    
    // Alle Firmen für erweiterte Filter
    let allCompanies: CompanyEnhanced[] = [];
    if (filters.companyTypes || filters.industries || filters.countries) {
      allCompanies = await companiesEnhancedService.getAll(organizationId);
    }

    // Filter anwenden
    return allContacts.filter(contact => {
      // E-Mail-Filter - GEÄNDERT: Prüfe emails Array
      if (filters.hasEmail && (!contact.emails || contact.emails.length === 0)) return false;
      
      // Telefon-Filter - GEÄNDERT: Prüfe phones Array
      if (filters.hasPhone && (!contact.phones || contact.phones.length === 0)) return false;

      // Tag-Filter
      if (filters.tagIds && filters.tagIds.length > 0) {
        const hasAnyTag = filters.tagIds.some(tagId => 
          contact.tagIds?.includes(tagId)
        );
        if (!hasAnyTag) return false;
      }

      // Position-Filter
      if (filters.positions && filters.positions.length > 0) {
        if (!contact.position || !filters.positions.includes(contact.position)) {
          return false;
        }
      }

      // Beats-Filter (Ressorts für Journalisten)
      if (filters.beats && filters.beats.length > 0) {
        const hasMatchingBeat = contact.mediaProfile?.beats?.some(beat =>
          filters.beats!.includes(beat)
        );
        if (!hasMatchingBeat) return false;
      }
      
      // Publikations-Filter
      if (filters.publications && publications.length > 0) {
        let matchesPublication = false;
        
        // Prüfe ob Kontakt Journalist ist und mit einer der gefilterten Publikationen verknüpft ist
        if (contact.mediaProfile?.publicationIds) {
          const contactPubIds = contact.mediaProfile.publicationIds;
          matchesPublication = contactPubIds.some(pubId => 
            publications.some(pub => pub.id === pubId)
          );
        }
        
        // Prüfe ob Kontakt als redaktioneller Kontakt in einer Publikation gelistet ist
        if (!matchesPublication && contact.id) {
          // Konvertiere Map zu Array für bessere Kompatibilität
          const entries = Array.from(publicationIdToContactIds.entries());
          for (const [pubId, contactIds] of entries) {
            if (contactIds.has(contact.id)) {
              matchesPublication = true;
              break;
            }
          }
        }
        
        // Wenn Publikations-Filter gesetzt sind aber Kontakt keine Übereinstimmung hat
        if (!matchesPublication) return false;
      }

      // Firmen-bezogene Filter
      if (contact.companyId && allCompanies.length > 0) {
        const company = allCompanies.find(c => c.id === contact.companyId);
        if (company) {
          // Firmentyp-Filter
          if (filters.companyTypes && filters.companyTypes.length > 0) {
            if (!filters.companyTypes.includes(company.type as any)) {
              return false;
            }
          }

          // Branchen-Filter - GEÄNDERT: Prüfe industryClassification
          if (filters.industries && filters.industries.length > 0) {
            const companyIndustry = company.industryClassification?.primary;
            if (!companyIndustry || !filters.industries.includes(companyIndustry)) {
              return false;
            }
          }

          // Länder-Filter - GEÄNDERT: Prüfe mainAddress.countryCode
          if (filters.countries && filters.countries.length > 0) {
            if (!company.mainAddress?.countryCode || 
                !filters.countries.includes(company.mainAddress.countryCode)) {
              return false;
            }
          }
        }
      } else {
        // Kontakt hat keine Company
        // Wenn firmen-spezifische Filter gesetzt sind, filtere aus
        if ((filters.companyTypes && filters.companyTypes.length > 0) ||
            (filters.industries && filters.industries.length > 0) ||
            (filters.countries && filters.countries.length > 0)) {
          return false;
        }
      }

      // Datum-Filter
      if (filters.createdAfter && contact.createdAt) {
        const createdDate = contact.createdAt.toDate();
        if (createdDate < filters.createdAfter) return false;
      }

      if (filters.createdBefore && contact.createdAt) {
        const createdDate = contact.createdAt.toDate();
        if (createdDate > filters.createdBefore) return false;
      }

      return true;
    });
  },

  async getContactsByIds(contactIds: string[]): Promise<ContactEnhanced[]> {
    if (contactIds.length === 0) return [];
    
    // Batch-Abfragen für große Listen (Firestore limit ist 10 pro "in" query)
    const batches = [];
    for (let i = 0; i < contactIds.length; i += 10) {
      batches.push(contactIds.slice(i, i + 10));
    }
    
    const allContacts: ContactEnhanced[] = [];
    
    for (const batch of batches) {
      const q = query(
        collection(db, 'contacts_enhanced'),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        allContacts.push({ id: doc.id, ...doc.data() } as ContactEnhanced);
      });
    }
    
    return allContacts;
  },

  // --- Listen-Wartung ---

  async refreshDynamicList(listId: string): Promise<void> {
    const list = await this.getById(listId);
    if (list?.type === 'dynamic') {
      const newCount = await this.calculateContactCount(list);
      await updateDoc(doc(db, 'distribution_lists', listId), {
        contactCount: newCount,
        lastUpdated: serverTimestamp()
      });
    }
  },

  async refreshAllDynamicLists(userId: string): Promise<void> {
    const lists = await this.getAll(userId);
    const dynamicLists = lists.filter(list => list.type === 'dynamic');
    
    for (const list of dynamicLists) {
      await this.refreshDynamicList(list.id!);
    }
  },

  // --- Listen-Verwendung tracken ---

  async recordUsage(usage: Omit<ListUsage, 'id' | 'usedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'list_usage'), {
      ...usage,
      usedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getUsageHistory(listId: string, limitCount: number = 10): Promise<ListUsage[]> {
    const q = query(
      collection(db, 'list_usage'),
      where('listId', '==', listId),
      orderBy('usedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ListUsage));
  },

  // --- Listen-Analyse ---

  async getListMetrics(listId: string): Promise<ListMetrics | null> {
    const docRef = doc(db, 'list_metrics', listId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ListMetrics;
    }
    return null;
  },

  async calculateAndSaveMetrics(listId: string, userId: string): Promise<void> {
    // Verwendungshistorie abrufen
    const usage = await this.getUsageHistory(listId, 100);
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentUsage = usage.filter(u => 
      u.usedAt.toDate() >= thirtyDaysAgo
    );

    // Aktive Kontakte berechnen (vereinfacht)
    const list = await this.getById(listId);
    const activeContacts = list ? Math.floor(list.contactCount * 0.8) : 0; // Placeholder

    const metrics: Omit<ListMetrics, 'id'> = {
      listId,
      totalCampaigns: usage.length,
      last30DaysCampaigns: recentUsage.length,
      activeContacts,
      lastCalculated: serverTimestamp() as any,
      userId
    };

    // Metriken speichern/aktualisieren
    const docRef = doc(db, 'list_metrics', listId);
    await updateDoc(docRef, metrics).catch(async () => {
      // Dokument existiert nicht, neu erstellen
      await addDoc(collection(db, 'list_metrics'), { ...metrics, id: listId });
    });
  },

  // --- Hilfsfunktionen ---

  async duplicateList(listId: string, newName: string): Promise<string> {
    const originalList = await this.getById(listId);
    if (!originalList) throw new Error('Liste nicht gefunden');

    const duplicatedList = {
      ...originalList,
      name: newName,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };

    return await this.create(duplicatedList);
  },

  async exportContacts(listId: string): Promise<ContactEnhanced[]> {
    const list = await this.getById(listId);
    if (!list) throw new Error('Liste nicht gefunden');
    
    return await this.getContacts(list);
  }
};

export default listsService;