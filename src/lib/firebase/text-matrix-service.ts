// src/lib/firebase/text-matrix-service.ts - Text-Matrix Service für Marken-DNA Phase 4
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';

/**
 * Text-Matrix Interface
 * Repräsentiert das Roh-Skelett einer Pressemeldung, generiert durch AI Sequenz
 */
export interface TextMatrix {
  id: string;
  projectId: string;
  companyId: string;
  organizationId: string;

  /** HTML-Content der Text-Matrix (Roh-Skelett) */
  content: string;

  /** Plain-Text-Version für KI-Verarbeitung */
  plainText: string;

  /** Status: draft = noch nicht finalisiert, finalized = Human Sign-off erfolgt */
  status: 'draft' | 'finalized';

  /** Zeitpunkt der Finalisierung (Human Sign-off) */
  finalizedAt?: Timestamp | null;

  /** Metadaten für Tracking */
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

/**
 * Daten für das Erstellen/Aktualisieren einer Text-Matrix
 */
export interface TextMatrixData {
  content: string;
  plainText: string;
  status?: 'draft' | 'finalized';
  finalizedAt?: Timestamp | null;
}

export const textMatrixService = {
  /**
   * Holt die Text-Matrix für ein Projekt
   *
   * @param projectId - ID des Projekts
   * @returns Text-Matrix oder null wenn nicht vorhanden
   */
  async getTextMatrix(projectId: string): Promise<TextMatrix | null> {
    try {
      const q = query(
        collection(db, 'text_matrices'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const docSnap = snapshot.docs[0];
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as TextMatrix;
    } catch (error) {
      console.error('Fehler beim Laden der Text-Matrix:', error);
      return null;
    }
  },

  /**
   * Erstellt eine neue Text-Matrix für ein Projekt
   *
   * @param projectId - ID des Projekts
   * @param companyId - ID des Kunden
   * @param organizationId - ID der Organisation
   * @param data - Text-Matrix Daten
   * @param userId - ID des erstellenden Users
   * @returns ID der erstellten Text-Matrix
   */
  async createTextMatrix(
    projectId: string,
    companyId: string,
    organizationId: string,
    data: TextMatrixData,
    userId: string
  ): Promise<string> {
    try {
      // Prüfe ob bereits eine Text-Matrix existiert
      const existing = await this.getTextMatrix(projectId);
      if (existing) {
        throw new Error('Text-Matrix für dieses Projekt existiert bereits');
      }

      const docRef = await addDoc(collection(db, 'text_matrices'), {
        projectId,
        companyId,
        organizationId,
        content: data.content,
        plainText: data.plainText,
        status: data.status || 'draft',
        finalizedAt: data.finalizedAt || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        updatedBy: userId,
      });

      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aktualisiert eine Text-Matrix
   *
   * @param id - ID der Text-Matrix
   * @param data - Zu aktualisierende Daten
   * @param userId - ID des aktualisierenden Users
   */
  async updateTextMatrix(
    id: string,
    data: Partial<TextMatrixData>,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'text_matrices', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Text-Matrix nicht gefunden');
      }

      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Finalisiert eine Text-Matrix (Human Sign-off)
   * Setzt den Status auf 'finalized' und speichert den Zeitpunkt
   *
   * @param id - ID der Text-Matrix
   * @param userId - ID des finalisierenden Users
   */
  async finalizeTextMatrix(id: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'text_matrices', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Text-Matrix nicht gefunden');
      }

      const textMatrix = docSnap.data() as TextMatrix;

      if (textMatrix.status === 'finalized') {
        throw new Error('Text-Matrix ist bereits finalisiert');
      }

      await updateDoc(docRef, {
        status: 'finalized',
        finalizedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Löscht eine Text-Matrix
   *
   * @param id - ID der Text-Matrix
   * @param organizationId - ID der Organisation (für Sicherheitsprüfung)
   */
  async deleteTextMatrix(id: string, organizationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'text_matrices', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Text-Matrix nicht gefunden');
      }

      const textMatrix = docSnap.data() as TextMatrix;

      // Multi-Tenancy Sicherheitsprüfung
      if (textMatrix.organizationId !== organizationId) {
        throw new Error('Keine Berechtigung zum Löschen dieser Text-Matrix');
      }

      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt alle Text-Matrices für eine Organisation
   * (Admin/Debug-Zwecke)
   *
   * @param organizationId - ID der Organisation
   * @returns Array von Text-Matrices
   */
  async getAllTextMatrices(organizationId: string): Promise<TextMatrix[]> {
    try {
      const q = query(
        collection(db, 'text_matrices'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TextMatrix[];
    } catch (error) {
      console.error('Fehler beim Laden der Text-Matrices:', error);
      return [];
    }
  },

  /**
   * Holt alle Text-Matrices für einen Kunden
   *
   * @param companyId - ID des Kunden
   * @param organizationId - ID der Organisation
   * @returns Array von Text-Matrices
   */
  async getTextMatricesByCompany(
    companyId: string,
    organizationId: string
  ): Promise<TextMatrix[]> {
    try {
      const q = query(
        collection(db, 'text_matrices'),
        where('organizationId', '==', organizationId),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TextMatrix[];
    } catch (error) {
      console.error(
        'Fehler beim Laden der Text-Matrices für Kunde:',
        error
      );
      return [];
    }
  },
};
