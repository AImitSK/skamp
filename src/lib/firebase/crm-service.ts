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
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { Company, Contact } from '@/types/crm';

// Companies CRUD
export const companiesService = {
  async getAll(userId: string): Promise<Company[]> {
    const q = query(
      collection(db, 'companies'),
      where('userId', '==', userId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Company));
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
    // Firestore doesn't support full-text search, so we get all and filter
    const allCompanies = await this.getAll(userId);
    const term = searchTerm.toLowerCase();
    return allCompanies.filter(company => 
      company.name.toLowerCase().includes(term) ||
      company.industry?.toLowerCase().includes(term) ||
      company.website?.toLowerCase().includes(term)
    );
  }
};

// Contacts CRUD
export const contactsService = {
  async getAll(userId: string): Promise<Contact[]> {
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId),
      orderBy('lastName'),
      orderBy('firstName')
    );
    const snapshot = await getDocs(q);
    const contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));

    // Firmen-Namen laden für die Anzeige
    const companyIds = Array.from(new Set(contacts.map(c => c.companyId).filter(Boolean)));
    const companies = await Promise.all(
      companyIds.map(id => companiesService.getById(id!))
    );
    const companyMap = Object.fromEntries(
      companies.filter(Boolean).map(c => [c!.id, c!.name])
    );

    return contacts.map(contact => ({
      ...contact,
      companyName: contact.companyId ? companyMap[contact.companyId] : undefined
    }));
  },

  async getByCompany(companyId: string): Promise<Contact[]> {
    const q = query(
      collection(db, 'contacts'),
      where('companyId', '==', companyId),
      orderBy('lastName'),
      orderBy('firstName')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));
  },

  async getById(id: string): Promise<Contact | null> {
    const docRef = doc(db, 'contacts', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const contact = { id: docSnap.id, ...docSnap.data() } as Contact;
      // Firmenname laden
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
      contact.firstName.toLowerCase().includes(term) ||
      contact.lastName.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.companyName?.toLowerCase().includes(term)
    );
  }
};