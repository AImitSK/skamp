// src/lib/firebase/pm-vorlage-service.ts
// Service fuer PM-Vorlage (Pressemeldungs-Refactoring Phase 4)

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { PMVorlage, PMVorlageContent } from '@/types/pm-vorlage';

/**
 * Service fuer PM-Vorlage
 *
 * Firestore-Pfad: projects/{projectId}/strategy/pmVorlage
 *
 * Die PM-Vorlage ist die generierte Pressemeldungs-Vorlage aus dem
 * Experten-Modus (DNA + Fakten-Matrix).
 *
 * Features:
 * - Hash-basierte Aenderungserkennung (markenDNAHash, faktenMatrixHash)
 * - History-Array fuer letzte 3 Versionen (Undo)
 * - Zielgruppen-Auswahl (ZG1/ZG2/ZG3)
 */
class PMVorlageService {
  /**
   * Laedt die PM-Vorlage eines Projekts
   */
  async get(projectId: string): Promise<PMVorlage | null> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'pmVorlage');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PMVorlage;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der PM-Vorlage:', error);
      return null;
    }
  }

  /**
   * Prueft ob eine PM-Vorlage existiert
   */
  async exists(projectId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'pmVorlage');
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Fehler beim Pruefen der PM-Vorlage:', error);
      return false;
    }
  }

  /**
   * Speichert eine neue PM-Vorlage
   *
   * Wenn bereits eine Vorlage existiert, wird die aktuelle Version
   * in die History verschoben (max. 3 Eintraege).
   */
  async save(
    projectId: string,
    data: Omit<PMVorlage, 'generatedAt' | 'history'>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'pmVorlage');
      const existing = await this.get(projectId);

      // History vorbereiten
      let history: PMVorlage['history'] = [];

      if (existing) {
        // Aktuelle Version in History verschieben
        const currentContent: PMVorlageContent = {
          headline: existing.headline,
          leadParagraph: existing.leadParagraph,
          bodyParagraphs: existing.bodyParagraphs,
          quote: existing.quote,
          cta: existing.cta,
          hashtags: existing.hashtags,
          htmlContent: existing.htmlContent,
        };

        history = [
          {
            content: currentContent,
            generatedAt: existing.generatedAt,
          },
          ...(existing.history || []),
        ].slice(0, 3); // Maximal 3 History-Eintraege
      }

      const pmVorlageData: PMVorlage = {
        ...data,
        generatedAt: serverTimestamp() as unknown as Timestamp,
        history,
      };

      await setDoc(docRef, pmVorlageData);
    } catch (error) {
      console.error('Fehler beim Speichern der PM-Vorlage:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Teile einer PM-Vorlage
   */
  async update(
    projectId: string,
    data: Partial<Omit<PMVorlage, 'generatedAt' | 'history'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'pmVorlage');

      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der PM-Vorlage:', error);
      throw error;
    }
  }

  /**
   * Loescht eine PM-Vorlage
   */
  async delete(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'pmVorlage');
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Loeschen der PM-Vorlage:', error);
      throw error;
    }
  }

  /**
   * Stellt eine aeltere Version aus der History wieder her
   *
   * @param projectId - Projekt-ID
   * @param historyIndex - Index in der History (0 = juengste)
   */
  async restoreFromHistory(projectId: string, historyIndex: number): Promise<void> {
    try {
      const existing = await this.get(projectId);
      if (!existing || !existing.history || existing.history.length === 0) {
        throw new Error('Keine History vorhanden');
      }

      if (historyIndex < 0 || historyIndex >= existing.history.length) {
        throw new Error(`History-Index ${historyIndex} ungueltig`);
      }

      const historyEntry = existing.history[historyIndex];

      // Aktuelle Version und History-Eintrag speichern
      await this.save(projectId, {
        ...historyEntry.content,
        targetGroup: existing.targetGroup,
        markenDNAHash: existing.markenDNAHash,
        faktenMatrixHash: existing.faktenMatrixHash,
      });
    } catch (error) {
      console.error('Fehler beim Wiederherstellen aus History:', error);
      throw error;
    }
  }

  /**
   * Prueft ob die PM-Vorlage veraltet ist
   *
   * Vergleicht die Hashes mit den aktuellen DNA- und Fakten-Matrix-Hashes.
   *
   * @returns true wenn die Vorlage veraltet ist (Hashes stimmen nicht)
   */
  async isOutdated(
    projectId: string,
    currentDNAHash: string,
    currentFaktenMatrixHash: string
  ): Promise<boolean> {
    try {
      const existing = await this.get(projectId);
      if (!existing) {
        return false; // Keine Vorlage = nicht veraltet
      }

      return (
        existing.markenDNAHash !== currentDNAHash ||
        existing.faktenMatrixHash !== currentFaktenMatrixHash
      );
    } catch (error) {
      console.error('Fehler beim Pruefen auf Veraltetheit:', error);
      return false;
    }
  }

  /**
   * Exportiert die PM-Vorlage als Plain-Text
   */
  async exportAsText(projectId: string): Promise<string> {
    try {
      const vorlage = await this.get(projectId);
      if (!vorlage) return '';

      const parts: string[] = [];

      parts.push(vorlage.headline);
      parts.push('');
      parts.push(`**${vorlage.leadParagraph}**`);
      parts.push('');

      for (const para of vorlage.bodyParagraphs) {
        parts.push(para);
        parts.push('');
      }

      parts.push(
        `"${vorlage.quote.text}", sagt ${vorlage.quote.person}, ${vorlage.quote.role} bei ${vorlage.quote.company}.`
      );
      parts.push('');
      parts.push(`[[CTA: ${vorlage.cta}]]`);
      parts.push('');
      parts.push(`[[HASHTAGS: ${vorlage.hashtags.join(' ')}]]`);

      return parts.join('\n');
    } catch (error) {
      console.error('Fehler beim Export der PM-Vorlage:', error);
      return '';
    }
  }
}

export const pmVorlageService = new PMVorlageService();
