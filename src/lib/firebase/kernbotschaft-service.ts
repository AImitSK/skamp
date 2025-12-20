// src/lib/firebase/kernbotschaft-service.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import {
  Kernbotschaft,
  KernbotschaftCreateData,
  KernbotschaftUpdateData,
} from '@/types/kernbotschaft';

/**
 * Service fuer Kernbotschaft
 *
 * Firestore-Pfad: projects/{projectId}/kernbotschaft/{id}
 *
 * Die Kernbotschaft ist projekt-spezifisch und dynamisch.
 * Sie definiert Anlass, Ziel und Teilbotschaften fuer ein konkretes Projekt.
 */
class KernbotschaftService {
  /**
   * Laedt eine einzelne Kernbotschaft
   */
  async getKernbotschaft(
    projectId: string,
    id: string
  ): Promise<Kernbotschaft | null> {
    try {
      const docRef = doc(db, 'projects', projectId, 'kernbotschaft', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Kernbotschaft;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Kernbotschaft:', error);
      return null;
    }
  }

  /**
   * Laedt die Kernbotschaft eines Projekts
   *
   * Da es pro Projekt nur eine Kernbotschaft gibt, wird das erste
   * Dokument in der Collection zurueckgegeben.
   */
  async getKernbotschaftByProject(
    projectId: string
  ): Promise<Kernbotschaft | null> {
    try {
      const collectionRef = collection(db, 'projects', projectId, 'kernbotschaft');
      const snapshot = await getDocs(collectionRef);

      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() } as Kernbotschaft;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Kernbotschaft fuer Projekt:', error);
      return null;
    }
  }

  /**
   * Erstellt eine neue Kernbotschaft
   */
  async createKernbotschaft(
    data: KernbotschaftCreateData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Neue Dokument-ID generieren
      const collectionRef = collection(db, 'projects', data.projectId, 'kernbotschaft');
      const newDocRef = doc(collectionRef);

      const kernbotschaftData: any = {
        id: newDocRef.id,
        projectId: data.projectId,
        companyId: data.companyId,
        organizationId: context.organizationId,
        occasion: data.occasion,
        goal: data.goal,
        keyMessage: data.keyMessage,
        content: data.content,
        plainText: data.plainText || data.content.replace(/<[^>]*>/g, ''),
        status: data.status || 'draft',
        chatHistory: data.chatHistory || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: context.userId,
        updatedBy: context.userId,
      };

      await setDoc(newDocRef, kernbotschaftData);

      return newDocRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Kernbotschaft:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Kernbotschaft
   */
  async updateKernbotschaft(
    projectId: string,
    id: string,
    data: KernbotschaftUpdateData,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'kernbotschaft', id);

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId,
      };

      // PlainText automatisch aus content generieren wenn nicht explizit gesetzt
      if (data.content && !data.plainText) {
        updateData.plainText = data.content.replace(/<[^>]*>/g, '');
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kernbotschaft:', error);
      throw error;
    }
  }

  /**
   * Loescht eine Kernbotschaft
   */
  async deleteKernbotschaft(projectId: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'kernbotschaft', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Loeschen der Kernbotschaft:', error);
      throw error;
    }
  }

  /**
   * Exportiert eine Kernbotschaft als Plain-Text fuer KI
   *
   * Format:
   * ANLASS
   * [Anlass-Text]
   *
   * ZIEL
   * [Ziel-Text]
   *
   * TEILBOTSCHAFT
   * [Teilbotschaft-Text]
   *
   * DOKUMENT
   * [Vollstaendiger Content]
   */
  async exportForAI(projectId: string): Promise<string> {
    try {
      const kernbotschaft = await this.getKernbotschaftByProject(projectId);

      if (!kernbotschaft) {
        return '';
      }

      const parts: string[] = [];

      // Anlass
      if (kernbotschaft.occasion) {
        parts.push(`ANLASS\n${kernbotschaft.occasion}`);
      }

      // Ziel
      if (kernbotschaft.goal) {
        parts.push(`ZIEL\n${kernbotschaft.goal}`);
      }

      // Teilbotschaft
      if (kernbotschaft.keyMessage) {
        parts.push(`TEILBOTSCHAFT\n${kernbotschaft.keyMessage}`);
      }

      // Vollstaendiger Content
      if (kernbotschaft.plainText) {
        parts.push(`DOKUMENT\n${kernbotschaft.plainText}`);
      }

      return parts.join('\n\n---\n\n');
    } catch (error) {
      console.error('Fehler beim Export der Kernbotschaft fuer KI:', error);
      return '';
    }
  }
}

export const kernbotschaftService = new KernbotschaftService();
