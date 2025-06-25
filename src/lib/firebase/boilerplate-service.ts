// src/lib/firebase/boilerplate-service.ts

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
} from 'firebase/firestore';
import { db } from './client-init';
import { Boilerplate } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';

export const boilerplatesService = {
  // Alle Boilerplates eines Nutzers laden
  async getAll(userId: string): Promise<Boilerplate[]> {
    const q = query(
      collection(db, 'boilerplates'),
      where('userId', '==', userId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
  },

  // Einen spezifischen Boilerplate anhand seiner ID laden
  async getById(id: string): Promise<Boilerplate | null> {
    const docRef = doc(db, 'boilerplates', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Boilerplate;
    }
    return null;
  },

  // Einen neuen Boilerplate erstellen
  async create(boilerplate: Omit<Boilerplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'boilerplates'), {
      ...boilerplate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Einen bestehenden Boilerplate aktualisieren
  async update(id: string, boilerplate: Partial<Boilerplate>): Promise<void> {
    const docRef = doc(db, 'boilerplates', id);
    await updateDoc(docRef, {
      ...boilerplate,
      updatedAt: serverTimestamp(),
    });
  },

  // Einen Boilerplate löschen
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'boilerplates', id));
  },
};