// src/lib/firebase/project-lists-service.ts
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
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { listsService } from './lists-service';
import { contactsEnhancedService } from './crm-service-enhanced';
import { DistributionList, ListFilters } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';

// Interface für Projekt-Verteilerlisten
export interface ProjectDistributionList {
  id?: string;
  projectId: string;
  organizationId: string;
  type: 'linked' | 'custom' | 'combined';

  // Für verknüpfte Listen
  masterListId?: string;

  // Für projekt-eigene Listen
  name?: string;
  description?: string;
  category?: string;  // Kategorie für custom-Listen
  listType?: 'static' | 'dynamic';  // Typ der custom-Liste
  filters?: ListFilters;
  contactIds?: string[];

  // Für kombinierte Listen
  linkedLists?: string[];
  additionalContacts?: string[];

  // Metadaten
  addedBy: string;
  addedAt?: Timestamp;
  lastModified?: Timestamp;

  // Cache für Performance
  cachedContactCount?: number;
  cachedContactsSnapshot?: string[];
}

export const projectListsService = {
  // Projekt-Listen abrufen
  async getProjectLists(projectId: string): Promise<ProjectDistributionList[]> {
    try {
      const q = query(
        collection(db, 'project_distribution_lists'),
        where('projectId', '==', projectId),
        orderBy('addedAt', 'desc')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectDistributionList));
    } catch (error) {
      console.error('Fehler beim Abrufen der Projekt-Listen:', error);
      return [];
    }
  },

  // Master-Liste mit Projekt verknüpfen
  async linkMasterList(
    projectId: string,
    masterListId: string,
    userId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Prüfen ob Liste bereits verknüpft ist
      const existing = await this.getProjectLists(projectId);
      const alreadyLinked = existing.find(l =>
        l.type === 'linked' && l.masterListId === masterListId
      );

      if (alreadyLinked) {
        throw new Error('Diese Liste ist bereits mit dem Projekt verknüpft');
      }

      // Master-Liste abrufen für Kontaktzahl
      const masterList = await listsService.getById(masterListId);
      if (!masterList) {
        throw new Error('Master-Liste nicht gefunden');
      }

      const docRef = await addDoc(collection(db, 'project_distribution_lists'), {
        projectId,
        organizationId,
        type: 'linked',
        masterListId,
        addedBy: userId,
        addedAt: serverTimestamp(),
        cachedContactCount: masterList.contactCount || 0
      });

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Verknüpfen der Liste:', error);
      throw error;
    }
  },

  // Projekt-eigene Liste erstellen
  async createProjectList(
    projectId: string,
    listData: {
      name: string;
      description?: string;
      category?: string;
      type?: 'static' | 'dynamic';
      filters?: ListFilters;
      contactIds?: string[];
    },
    userId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Bestimme den Listentyp
      const listType = listData.type || (listData.filters && Object.keys(listData.filters).length > 0 ? 'dynamic' : 'static');

      // Kontaktzahl berechnen
      let contactCount = 0;
      if (listType === 'dynamic' && listData.filters) {
        // Für dynamische Listen: Kontakte basierend auf Filtern zählen
        const contacts = await this.getFilteredContacts(listData.filters, organizationId);
        contactCount = contacts.length;
        console.log('[createProjectList] Dynamic list, contacts found:', contactCount);
      } else if (listType === 'static' && listData.contactIds) {
        // Für statische Listen: Direkte Anzahl
        contactCount = listData.contactIds.length;
        console.log('[createProjectList] Static list, contactIds:', listData.contactIds.length);
      }

      console.log('[createProjectList] Final contactCount to save:', contactCount, 'listType:', listType);

      const docRef = await addDoc(collection(db, 'project_distribution_lists'), {
        projectId,
        organizationId,
        type: 'custom',
        name: listData.name,
        description: listData.description,
        category: listData.category || 'custom',
        listType: listType,
        filters: listData.filters || null,
        contactIds: listData.contactIds || [],
        addedBy: userId,
        addedAt: serverTimestamp(),
        cachedContactCount: contactCount
      });

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Projekt-Liste:', error);
      throw error;
    }
  },

  // Kombinierte Liste erstellen
  async createCombinedList(
    projectId: string,
    listIds: string[],
    additionalContacts: string[] = [],
    name: string,
    description: string,
    userId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Kontakte aus allen Listen sammeln und deduplizieren
      const allContactIds = new Set<string>();

      // Kontakte aus verknüpften Listen
      for (const listId of listIds) {
        const list = await listsService.getById(listId);
        if (list) {
          const contacts = await listsService.getContacts(list);
          contacts.forEach((c: ContactEnhanced) => {
            if (c.id) allContactIds.add(c.id);
          });
        }
      }

      // Zusätzliche Kontakte
      additionalContacts.forEach(id => allContactIds.add(id));

      const docRef = await addDoc(collection(db, 'project_distribution_lists'), {
        projectId,
        organizationId,
        type: 'combined',
        name,
        description,
        linkedLists: listIds,
        additionalContacts,
        addedBy: userId,
        addedAt: serverTimestamp(),
        cachedContactCount: allContactIds.size,
        cachedContactsSnapshot: Array.from(allContactIds)
      });

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der kombinierten Liste:', error);
      throw error;
    }
  },

  // Kontakte einer Projekt-Liste abrufen
  async getProjectListContacts(projectListId: string): Promise<ContactEnhanced[]> {
    try {
      const docRef = doc(db, 'project_distribution_lists', projectListId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Projekt-Liste nicht gefunden');
      }

      const listData = docSnap.data() as ProjectDistributionList;

      switch (listData.type) {
        case 'linked':
          // Kontakte aus Master-Liste abrufen
          if (listData.masterListId) {
            const masterList = await listsService.getById(listData.masterListId);
            if (masterList) {
              return await listsService.getContacts(masterList);
            }
          }
          break;

        case 'custom':
          // Kontakte basierend auf Filtern oder IDs
          if (listData.filters) {
            return await this.getFilteredContacts(listData.filters, listData.organizationId);
          } else if (listData.contactIds) {
            return await this.getContactsByIds(listData.contactIds, listData.organizationId);
          }
          break;

        case 'combined':
          // Kontakte aus Cache oder neu berechnen
          if (listData.cachedContactsSnapshot) {
            return await this.getContactsByIds(listData.cachedContactsSnapshot, listData.organizationId);
          } else {
            // Neu berechnen falls kein Cache
            const allContacts: ContactEnhanced[] = [];
            const contactIds = new Set<string>();

            if (listData.linkedLists) {
              for (const listId of listData.linkedLists) {
                const list = await listsService.getById(listId);
                if (list) {
                  const contacts = await listsService.getContacts(list);
                  contacts.forEach((c: ContactEnhanced) => {
                    if (c.id && !contactIds.has(c.id)) {
                      contactIds.add(c.id);
                      allContacts.push(c);
                    }
                  });
                }
              }
            }

            if (listData.additionalContacts) {
              const additional = await this.getContactsByIds(
                listData.additionalContacts.filter(id => !contactIds.has(id)),
                listData.organizationId
              );
              allContacts.push(...additional);
            }

            return allContacts;
          }
          break;
      }

      return [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Listen-Kontakte:', error);
      return [];
    }
  },

  // Verknüpfung entfernen
  async unlinkList(projectId: string, listId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'project_distribution_lists', listId));
    } catch (error) {
      console.error('Fehler beim Entfernen der Verknüpfung:', error);
      throw error;
    }
  },

  // Liste aktualisieren
  async updateProjectList(
    listId: string,
    updates: Partial<ProjectDistributionList>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'project_distribution_lists', listId);
      await updateDoc(docRef, {
        ...updates,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Projekt-Liste:', error);
      throw error;
    }
  },

  // Hilfsfunktionen
  async getFilteredContacts(filters: ListFilters, organizationId: string): Promise<ContactEnhanced[]> {
    try {
      // Verwende den erweiterten Service für gefilterte Kontakte
      const allContacts = await contactsEnhancedService.getAll(organizationId);

      // Filter anwenden (vereinfacht - sollte erweitert werden)
      return allContacts.filter(contact => {
        if (filters.hasEmail !== undefined && filters.hasEmail) {
          if (!contact.emails || contact.emails.length === 0) return false;
        }
        if (filters.hasPhone !== undefined && filters.hasPhone) {
          if (!contact.phones || contact.phones.length === 0) return false;
        }
        if (filters.tagIds && filters.tagIds.length > 0) {
          if (!contact.tagIds || !filters.tagIds.some((tag: string) => contact.tagIds?.includes(tag))) {
            return false;
          }
        }
        return true;
      });
    } catch (error) {
      console.error('Fehler beim Filtern der Kontakte:', error);
      return [];
    }
  },

  async getContactsByIds(contactIds: string[], organizationId?: string): Promise<ContactEnhanced[]> {
    // Nutze listsService.getContactsByIds() - unterstützt References automatisch
    return await listsService.getContactsByIds(contactIds, organizationId);
  },

  // Master-Listen mit Details abrufen
  async getMasterListsWithDetails(
    masterListIds: string[]
  ): Promise<DistributionList[]> {
    try {
      const lists: DistributionList[] = [];

      for (const listId of masterListIds) {
        const list = await listsService.getById(listId);
        if (list) {
          lists.push(list);
        }
      }

      return lists;
    } catch (error) {
      console.error('Fehler beim Abrufen der Master-Listen:', error);
      return [];
    }
  }
};