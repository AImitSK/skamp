// src/lib/email/smart-folder-service.ts
import { 
  collection, 
  doc,
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { SmartFolder, EmailThread } from '@/types/inbox-enhanced';

/**
 * Smart Folder Service für dynamische E-Mail-Organisation
 * 
 * Ermöglicht das Erstellen und Verwalten von intelligenten Ordnern
 * basierend auf Kunden, Kampagnen, Team-Assignments und Status
 */
export class SmartFolderService {
  private readonly collectionName = 'smart_folders';

  /**
   * Erstellt die Standard System-Ordner für eine Organisation
   */
  async createSystemFolders(organizationId: string): Promise<void> {
    console.log('📁 Creating system folders for organization:', organizationId);

    const systemFolders: Partial<SmartFolder>[] = [
      {
        name: 'Alle E-Mails',
        type: 'custom',
        filters: {},
        color: '#6B7280',
        icon: '📧',
        isSystem: true,
        organizationId
      },
      {
        name: 'Unbearbeitet',
        type: 'status',
        filters: { status: 'new' },
        color: '#EF4444',
        icon: '🔴',
        isSystem: true,
        organizationId
      },
      {
        name: 'In Bearbeitung',
        type: 'status',
        filters: { status: 'in-progress' },
        color: '#F59E0B',
        icon: '🟡',
        isSystem: true,
        organizationId
      },
      {
        name: 'Wartet auf Antwort',
        type: 'status',
        filters: { status: 'waiting-response' },
        color: '#3B82F6',
        icon: '🔵',
        isSystem: true,
        organizationId
      },
      {
        name: 'Abgeschlossen',
        type: 'status',
        filters: { status: 'resolved' },
        color: '#10B981',
        icon: '✅',
        isSystem: true,
        organizationId
      },
      {
        name: 'VIP-Kunden',
        type: 'custom',
        filters: { isVip: true },
        color: '#8B5CF6',
        icon: '⭐',
        isSystem: true,
        organizationId
      },
      {
        name: 'Hohe Priorität',
        type: 'custom',
        filters: { priority: 'high' },
        color: '#DC2626',
        icon: '🔥',
        isSystem: true,
        organizationId
      }
    ];

    for (const folder of systemFolders) {
      try {
        await addDoc(collection(db, this.collectionName), {
          ...folder,
          count: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error creating system folder:', folder.name, error);
      }
    }

    console.log('✅ System folders created successfully');
  }

  /**
   * Holt alle Ordner für eine Organisation
   */
  async getFoldersForOrganization(organizationId: string): Promise<SmartFolder[]> {
    try {
      const foldersQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('isSystem', 'desc'), // System-Ordner zuerst
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(foldersQuery);
      const folders: SmartFolder[] = [];

      for (const doc of snapshot.docs) {
        const folderData = { ...doc.data(), id: doc.id } as SmartFolder;
        
        // Aktualisiere Count für jeden Ordner
        folderData.count = await this.calculateFolderCount(folderData, organizationId);
        
        folders.push(folderData);
      }

      return folders;
    } catch (error) {
      console.error('Error fetching smart folders:', error);
      return [];
    }
  }

  /**
   * Erstellt einen neuen benutzerdefinierten Ordner
   */
  async createCustomFolder(
    folder: Omit<SmartFolder, 'id' | 'count' | 'isSystem'>,
    userId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...folder,
        count: 0,
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId
      });

      console.log('✅ Custom folder created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating custom folder:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Ordner
   */
  async updateFolder(
    folderId: string,
    updates: Partial<SmartFolder>,
    userId: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, folderId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });

      console.log('✅ Folder updated:', folderId);
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  /**
   * Löscht einen benutzerdefinierten Ordner
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      // Prüfe ob es ein System-Ordner ist
      const folderDoc = await getDocs(query(
        collection(db, this.collectionName),
        where('id', '==', folderId),
        where('isSystem', '==', true),
        limit(1)
      ));

      if (!folderDoc.empty) {
        throw new Error('System-Ordner können nicht gelöscht werden');
      }

      await deleteDoc(doc(db, this.collectionName, folderId));
      console.log('✅ Folder deleted:', folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  /**
   * Holt E-Mail-Threads für einen spezifischen Ordner
   */
  async getThreadsForFolder(
    folder: SmartFolder,
    organizationId: string,
    limitCount: number = 50
  ): Promise<EmailThread[]> {
    try {
      console.log('📁 Getting threads for folder:', folder.name, folder.filters);

      // Basis-Query für alle Threads der Organisation
      let threadsQuery = query(
        collection(db, 'email_threads'),
        where('organizationId', '==', organizationId)
      );

      // Filter anwenden
      const threads = await this.applyFiltersToQuery(threadsQuery, folder.filters, limitCount);
      
      return threads;
    } catch (error) {
      console.error('Error getting threads for folder:', error);
      return [];
    }
  }

  /**
   * Berechnet die Anzahl der E-Mails in einem Ordner
   */
  private async calculateFolderCount(
    folder: SmartFolder,
    organizationId: string
  ): Promise<number> {
    try {
      const threads = await this.getThreadsForFolder(folder, organizationId, 1000);
      return threads.length;
    } catch (error) {
      console.error('Error calculating folder count:', error);
      return 0;
    }
  }

  /**
   * Wendet Filter auf eine Query an
   */
  private async applyFiltersToQuery(
    baseQuery: any,
    filters: SmartFolder['filters'],
    limitCount: number
  ): Promise<EmailThread[]> {
    try {
      // Hole alle Threads und filtere im Client
      // (Firestore unterstützt nicht alle Filter-Kombinationen)
      const snapshot = await getDocs(query(baseQuery, limit(1000)));
      const allThreads: EmailThread[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as any;
        const thread: EmailThread = {
          ...data,
          id: doc.id
        } as EmailThread;
        allThreads.push(thread);
      });

      // Client-seitige Filterung
      let filteredThreads = allThreads;

      // Kunden-Filter
      if (filters.customerId) {
        filteredThreads = filteredThreads.filter(thread => 
          thread.customerId === filters.customerId
        );
      }

      // Kampagnen-Filter
      if (filters.campaignId) {
        filteredThreads = filteredThreads.filter(thread => 
          thread.campaignId === filters.campaignId
        );
      }

      // Team-Assignment-Filter
      if (filters.assignedTo) {
        filteredThreads = filteredThreads.filter(thread => 
          thread.assignedTo?.includes(filters.assignedTo!)
        );
      }

      // Status-Filter
      if (filters.status) {
        filteredThreads = filteredThreads.filter(thread => 
          thread.status === filters.status
        );
      }

      // Prioritäts-Filter
      if (filters.priority) {
        filteredThreads = filteredThreads.filter(thread => 
          thread.priority === filters.priority
        );
      }

      // VIP-Filter
      if (filters.isVip !== undefined) {
        filteredThreads = filteredThreads.filter(thread => 
          Boolean(thread.isVip) === filters.isVip
        );
      }

      // Datums-Filter
      if (filters.dateRange) {
        filteredThreads = filteredThreads.filter(thread => {
          const threadDate = thread.lastMessageAt;
          return threadDate.toMillis() >= filters.dateRange!.start.toMillis() &&
                 threadDate.toMillis() <= filters.dateRange!.end.toMillis();
        });
      }

      // Sortiere nach letzter Aktivität (neueste zuerst)
      filteredThreads.sort((a, b) => 
        b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis()
      );

      return filteredThreads.slice(0, limitCount);
    } catch (error) {
      console.error('Error applying filters:', error);
      return [];
    }
  }

  /**
   * Erstellt automatisch Kunden-Ordner basierend auf vorhandenen Kunden
   */
  async createCustomerFolders(organizationId: string): Promise<void> {
    try {
      console.log('👥 Creating customer folders...');

      // Hole alle Kunden mit E-Mail-Threads
      const customersQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId),
        limit(20) // Limit um Performance zu gewährleisten
      );

      const customersSnapshot = await getDocs(customersQuery);

      for (const customerDoc of customersSnapshot.docs) {
        const customer = customerDoc.data();
        
        // Prüfe ob bereits ein Ordner für diesen Kunden existiert
        const existingFolderQuery = query(
          collection(db, this.collectionName),
          where('organizationId', '==', organizationId),
          where('type', '==', 'customer'),
          where('filters.customerId', '==', customerDoc.id),
          limit(1)
        );

        const existingFolder = await getDocs(existingFolderQuery);
        
        if (existingFolder.empty) {
          // Erstelle Kunden-Ordner
          await addDoc(collection(db, this.collectionName), {
            name: customer.name,
            type: 'customer',
            filters: { customerId: customerDoc.id },
            color: this.getCustomerColor(customer),
            icon: '🏢',
            count: 0,
            organizationId,
            isSystem: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          console.log('✅ Created customer folder:', customer.name);
        }
      }
    } catch (error) {
      console.error('Error creating customer folders:', error);
    }
  }

  /**
   * Erstellt automatisch Kampagnen-Ordner
   */
  async createCampaignFolders(organizationId: string): Promise<void> {
    try {
      console.log('📈 Creating campaign folders...');

      const campaignsQuery = query(
        collection(db, 'pr_campaigns'),
        where('organizationId', '==', organizationId),
        where('status', 'in', ['active', 'published']),
        limit(15)
      );

      const campaignsSnapshot = await getDocs(campaignsQuery);

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        
        // Prüfe ob bereits ein Ordner existiert
        const existingFolderQuery = query(
          collection(db, this.collectionName),
          where('organizationId', '==', organizationId),
          where('type', '==', 'campaign'),
          where('filters.campaignId', '==', campaignDoc.id),
          limit(1)
        );

        const existingFolder = await getDocs(existingFolderQuery);
        
        if (existingFolder.empty) {
          await addDoc(collection(db, this.collectionName), {
            name: `📈 ${campaign.title}`,
            type: 'campaign',
            filters: { campaignId: campaignDoc.id },
            color: '#059669',
            icon: '📈',
            count: 0,
            organizationId,
            isSystem: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          console.log('✅ Created campaign folder:', campaign.title);
        }
      }
    } catch (error) {
      console.error('Error creating campaign folders:', error);
    }
  }

  /**
   * Hilfsmethoden
   */
  
  private getCustomerColor(customer: any): string {
    if (customer.isVip || customer.priority === 'high') {
      return '#8B5CF6'; // Lila für VIP
    }
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    const hash = customer.name.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Aktualisiert alle Ordner-Counts (sollte regelmäßig ausgeführt werden)
   */
  async updateAllFolderCounts(organizationId: string): Promise<void> {
    try {
      const folders = await this.getFoldersForOrganization(organizationId);
      
      for (const folder of folders) {
        const count = await this.calculateFolderCount(folder, organizationId);
        
        if (count !== folder.count) {
          await updateDoc(doc(db, this.collectionName, folder.id), {
            count,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      console.log('✅ All folder counts updated');
    } catch (error) {
      console.error('Error updating folder counts:', error);
    }
  }
}

// Singleton Export
export const smartFolderService = new SmartFolderService();