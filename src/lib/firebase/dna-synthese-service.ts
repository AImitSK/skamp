// src/lib/firebase/dna-synthese-service.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import {
  DNASynthese,
  DNASyntheseCreateData,
  DNASyntheseUpdateData,
} from '@/types/dna-synthese';
import { markenDNAService } from './marken-dna-service';

/**
 * Service fuer DNA Synthese
 *
 * Firestore-Pfad: companies/{companyId}/markenDNA/synthesis
 *
 * Die DNA Synthese ist eine KI-optimierte Kurzform der 6 Marken-DNA Dokumente.
 * Sie reduziert ~5.000 Tokens auf ~500 Tokens und dient als effizienter Kontext
 * fuer KI-gestuetzte Textgenerierung.
 */
class DNASyntheseService {
  /**
   * Laedt die DNA Synthese eines Kunden
   */
  async getSynthese(companyId: string): Promise<DNASynthese | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', 'synthesis');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DNASynthese;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der DNA Synthese:', error);
      return null;
    }
  }

  /**
   * Erstellt eine neue DNA Synthese
   */
  async createSynthese(
    data: DNASyntheseCreateData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      const syntheseData: any = {
        id: 'synthesis',
        companyId: data.companyId,
        organizationId: context.organizationId,
        content: data.content,
        plainText: data.plainText,
        synthesizedAt: serverTimestamp(),
        synthesizedFrom: data.synthesizedFrom,
        markenDNAVersion: data.markenDNAVersion,
        manuallyEdited: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: context.userId,
        updatedBy: context.userId,
      };

      const docRef = doc(db, 'companies', data.companyId, 'markenDNA', 'synthesis');
      await setDoc(docRef, syntheseData);

      return 'synthesis';
    } catch (error) {
      console.error('Fehler beim Erstellen der DNA Synthese:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine DNA Synthese
   */
  async updateSynthese(
    companyId: string,
    data: DNASyntheseUpdateData,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', 'synthesis');

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId,
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der DNA Synthese:', error);
      throw error;
    }
  }

  /**
   * Loescht die DNA Synthese
   */
  async deleteSynthese(companyId: string): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', 'synthesis');
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Loeschen der DNA Synthese:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue DNA Synthese aus den 6 Marken-DNA Dokumenten
   *
   * Diese Methode:
   * 1. Exportiert alle 6 Marken-DNA Dokumente als Plain-Text
   * 2. Berechnet einen Hash ueber die Dokumente fuer Versions-Tracking
   * 3. Speichert die Synthese mit den Dokument-IDs
   *
   * @param companyId - ID des Kunden
   * @param context - Organisations- und User-Kontext
   * @returns Die erstellte DNA Synthese
   */
  async synthesize(
    companyId: string,
    context: { organizationId: string; userId: string }
  ): Promise<DNASynthese> {
    try {
      // 1. Alle Marken-DNA Dokumente als Plain-Text exportieren
      const markenDNAContent = await markenDNAService.exportForAI(companyId);

      if (!markenDNAContent) {
        throw new Error('Keine Marken-DNA Dokumente gefunden');
      }

      // 2. Hash ueber alle Dokumente berechnen (fuer Versions-Tracking)
      const markenDNAVersion = await markenDNAService.computeMarkenDNAHash(companyId);

      // 3. Dokument-IDs ermitteln (die 6 Standardtypen)
      const synthesizedFrom = ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'];

      // 4. Synthese-Daten erstellen
      const syntheseData: DNASyntheseCreateData = {
        companyId,
        content: markenDNAContent, // Vorerst identisch mit plainText (KI-Generierung erfolgt in Phase 3)
        plainText: markenDNAContent,
        synthesizedFrom,
        markenDNAVersion,
      };

      // 5. Synthese speichern
      await this.createSynthese(syntheseData, context);

      // 6. Gespeicherte Synthese zurueckgeben
      const synthese = await this.getSynthese(companyId);
      if (!synthese) {
        throw new Error('DNA Synthese konnte nicht geladen werden');
      }

      return synthese;
    } catch (error) {
      console.error('Fehler beim Synthetisieren der Marken-DNA:', error);
      throw error;
    }
  }

  /**
   * Prueft ob die DNA Synthese veraltet ist
   *
   * Vergleicht den gespeicherten markenDNAVersion Hash mit dem aktuellen Hash
   * der 6 Marken-DNA Dokumente.
   *
   * @param companyId - ID des Kunden
   * @returns true wenn die Marken-DNA geaendert wurde, false sonst
   */
  async isOutdated(companyId: string): Promise<boolean> {
    try {
      // 1. DNA Synthese laden
      const synthese = await this.getSynthese(companyId);
      if (!synthese) {
        // Keine Synthese vorhanden - nicht veraltet, aber auch nicht vorhanden
        return false;
      }

      // 2. Aktuellen Hash der Marken-DNA berechnen
      const currentHash = await markenDNAService.computeMarkenDNAHash(companyId);

      // 3. Vergleichen
      return synthese.markenDNAVersion !== currentHash;
    } catch (error) {
      console.error('Fehler beim Pruefen der Aktualitaet der DNA Synthese:', error);
      return false;
    }
  }
}

export const dnaSyntheseService = new DNASyntheseService();
