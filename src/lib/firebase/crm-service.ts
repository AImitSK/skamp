// src/lib/firebase/crm-service.ts
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
} from 'firebase/firestore';
import { db } from './client-init';
import { Company, Contact, Tag } from '@/types/crm';

// --- Service für Firmen ---
export const companiesService = {
  async getAll(organizationId: string, legacyUserId?: string): Promise<Company[]> {
    try {
      
      // Zuerst versuchen mit organizationId (neues Schema)
      let q = query(
        collection(db, 'companies'),
        where('organizationId', '==', organizationId),
        orderBy('name')
      );
      let snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Company));
      }
      
      // Fallback: Legacy-Daten mit userId (falls legacyUserId übergeben)
      if (legacyUserId) {
        q = query(
          collection(db, 'companies'),
          where('userId', '==', legacyUserId),
          orderBy('name')
        );
        snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Company));
        }
      }
      
      return [];
      
    } catch (error) {
      console.error('Error in companiesService.getAll:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Company | null> {
    const docRef = doc(db, 'companies', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Company;
    }
    return null;
  },

  async create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'companies'), {
      ...company,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async createMany(companies: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    companies.forEach(companyData => {
      const docRef = doc(collection(db, 'companies'));
      batch.set(docRef, {
        ...companyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  },

  async update(id: string, company: Partial<Company>): Promise<void> {
    const docRef = doc(db, 'companies', id);
    await updateDoc(docRef, {
      ...company,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'companies', id));
  },

  async search(userId: string, searchTerm: string): Promise<Company[]> {
    const allCompanies = await this.getAll(userId);
    const term = searchTerm.toLowerCase();
    return allCompanies.filter(company => 
      company.name.toLowerCase().includes(term) ||
      company.industry?.toLowerCase().includes(term) ||
      company.website?.toLowerCase().includes(term)
    );
  }
};

// --- Service für Tags ---
export const tagsService = {
  async getAll(userId: string): Promise<Tag[]> {
    const q = query(
      collection(db, 'tags'),
      where('userId', '==', userId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tag));
  },

  async create(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tags'), {
      ...tag,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async update(id: string, tag: Partial<Tag>): Promise<void> {
    const docRef = doc(db, 'tags', id);
    await updateDoc(docRef, tag);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'tags', id));
  },

  async getByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    const tags = await Promise.all(
      ids.map(async (id) => {
        const docRef = doc(db, 'tags', id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Tag : null;
      })
    );
    return tags.filter(Boolean) as Tag[];
  }
};

// --- Service für Kontakte ---
export const contactsService = {
  async getAll(userId: string): Promise<Contact[]> {
    const q = query(collection(db, 'contacts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));

    const companyIds = Array.from(new Set(contacts.map(c => c.companyId).filter(Boolean)));
    if (companyIds.length === 0) return contacts;

    const companies = await Promise.all(
      companyIds.map(id => companiesService.getById(id!))
    );
    const companyMap = new Map(
      companies.filter(Boolean).map(c => [c!.id, c!.name])
    );

    return contacts.map(contact => ({
      ...contact,
      companyName: contact.companyId ? companyMap.get(contact.companyId) : undefined
    }));
  },

  // NEU: Funktion, um alle Kontakte für eine bestimmte Firma zu laden
  async getByCompanyId(companyId: string): Promise<Contact[]> {
    console.log('🔍 getByCompanyId: Suche in contacts_enhanced für companyId:', companyId);

    // DEBUGGING: Lade ALLE Kontakte um zu sehen welche companyIds existieren
    const allContactsQuery = query(collection(db, 'contacts_enhanced'));
    const allSnapshot = await getDocs(allContactsQuery);
    const allContacts = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('🔍 DEBUG: Alle Kontakte in DB:', allContacts.length);
    console.log('🔍 DEBUG: CompanyIds in DB:', allContacts.map(c => c.companyId));

    // ERWEITERTE ANALYSE: Finde den spezifischen Kontakt
    const targetContact = allContacts.find(c => c.companyId === companyId);
    console.log('🔍 DEBUG: Ziel-Kontakt gefunden:', targetContact ? 'JA' : 'NEIN');
    if (targetContact) {
      console.log('🔍 DEBUG: Ziel-Kontakt Details:', targetContact);
      console.log('🔍 DEBUG: companyId Typ:', typeof targetContact.companyId);
      console.log('🔍 DEBUG: companyId exakt:', JSON.stringify(targetContact.companyId));
    }

    // VERGLEICH: Gesucht vs. Vorhanden
    console.log('🔍 DEBUG: Gesuchte companyId:', JSON.stringify(companyId));
    console.log('🔍 DEBUG: Gesuchte companyId Typ:', typeof companyId);
    console.log('🔍 DEBUG: Erste 3 Kontakte Details:', allContacts.slice(0, 3));

    const q = query(
      collection(db, 'contacts_enhanced'),
      where('companyId', '==', companyId)
      // orderBy entfernt - Firestore Index noch nicht bereit
    );
    const snapshot = await getDocs(q);
    const contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));
    console.log('✅ getByCompanyId: Gefunden:', contacts.length, 'Kontakte für companyId:', companyId);
    return contacts;
  },

  async getById(id: string): Promise<Contact | null> {
    const docRef = doc(db, 'contacts', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const contact = { id: docSnap.id, ...docSnap.data() } as Contact;
      if (contact.companyId) {
        const company = await companiesService.getById(contact.companyId);
        contact.companyName = company?.name;
      }
      return contact;
    }
    return null;
  },

  async create(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'contacts'), {
      ...contact,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },
  
  async createMany(contacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    contacts.forEach(contactData => {
        const docRef = doc(collection(db, 'contacts'));
        batch.set(docRef, {
            ...contactData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
  },

  async update(id: string, contact: Partial<Contact>): Promise<void> {
    const docRef = doc(db, 'contacts', id);
    await updateDoc(docRef, {
      ...contact,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'contacts', id));
  },

  async search(userId: string, searchTerm: string): Promise<Contact[]> {
    const allContacts = await this.getAll(userId);
    const term = searchTerm.toLowerCase();
    return allContacts.filter(contact =>
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.companyName?.toLowerCase().includes(term)
    );
  },

  // NEU: Kontakt via Email finden
  async findByEmail(email: string, organizationId: string): Promise<Contact | null> {
    const q = query(
      collection(db, 'contacts'),
      where('organizationId', '==', organizationId),
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: Legacy-Suche mit userId
      const allContacts = await this.getAll(organizationId);
      const contact = allContacts.find(c => c.email?.toLowerCase() === email.toLowerCase());
      return contact || null;
    }

    const contact = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Contact;
    if (contact.companyId) {
      const company = await companiesService.getById(contact.companyId);
      contact.companyName = company?.name;
    }
    return contact;
  },
};