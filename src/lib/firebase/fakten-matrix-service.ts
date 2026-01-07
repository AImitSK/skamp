// src/lib/firebase/fakten-matrix-service.ts
// Service fuer Fakten-Matrix (Pressemeldungs-Refactoring Phase 2)

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
  FaktenMatrix,
  FaktenMatrixCreateData,
  FaktenMatrixUpdateData,
} from '@/types/fakten-matrix';
import crypto from 'crypto';

/**
 * Service fuer Fakten-Matrix
 *
 * Firestore-Pfad: projects/{projectId}/strategy/faktenMatrix
 *
 * Die Fakten-Matrix wird vom Project-Wizard via Tool-Call (JSON) gespeichert,
 * NICHT via Regex-Parsing von Markdown!
 *
 * Struktur:
 * - hook: W-Fragen (Was? Wo? Wann?)
 * - details: Substanz (Delta + Beweise)
 * - quote: O-Ton (Speaker-Referenz + Kernaussage)
 */
class FaktenMatrixService {
  /**
   * Laedt die Fakten-Matrix eines Projekts
   */
  async get(projectId: string): Promise<FaktenMatrix | null> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'faktenMatrix');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as FaktenMatrix;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Fakten-Matrix:', error);
      return null;
    }
  }

  /**
   * Prueft ob eine Fakten-Matrix existiert
   */
  async exists(projectId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'faktenMatrix');
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Fehler beim Pruefen der Fakten-Matrix:', error);
      return false;
    }
  }

  /**
   * Speichert eine Fakten-Matrix (erstellt oder aktualisiert)
   */
  async save(projectId: string, data: FaktenMatrixCreateData): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'faktenMatrix');
      const exists = await this.exists(projectId);

      const faktenMatrixData: Record<string, unknown> = {
        hook: data.hook,
        details: data.details,
        quote: data.quote,
        updatedAt: serverTimestamp(),
      };

      if (!exists) {
        faktenMatrixData.createdAt = serverTimestamp();
        await setDoc(docRef, faktenMatrixData);
      } else {
        await updateDoc(docRef, faktenMatrixData);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Fakten-Matrix:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Teile einer Fakten-Matrix
   */
  async update(projectId: string, data: FaktenMatrixUpdateData): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'faktenMatrix');

      // Flache Update-Daten erstellen
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (data.hook) {
        if (data.hook.event !== undefined) updateData['hook.event'] = data.hook.event;
        if (data.hook.location !== undefined) updateData['hook.location'] = data.hook.location;
        if (data.hook.date !== undefined) updateData['hook.date'] = data.hook.date;
      }

      if (data.details) {
        if (data.details.delta !== undefined) updateData['details.delta'] = data.details.delta;
        if (data.details.evidence !== undefined) updateData['details.evidence'] = data.details.evidence;
      }

      if (data.quote) {
        if (data.quote.speakerId !== undefined) updateData['quote.speakerId'] = data.quote.speakerId;
        if (data.quote.rawStatement !== undefined) updateData['quote.rawStatement'] = data.quote.rawStatement;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fakten-Matrix:', error);
      throw error;
    }
  }

  /**
   * Loescht eine Fakten-Matrix
   */
  async delete(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'projects', projectId, 'strategy', 'faktenMatrix');
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Loeschen der Fakten-Matrix:', error);
      throw error;
    }
  }

  /**
   * Laedt die Fakten-Matrix mit Hash fuer Aenderungserkennung
   *
   * Der Hash wird aus den Inhalten berechnet, um zu erkennen,
   * ob sich die Fakten seit der letzten PM-Vorlage geaendert haben.
   */
  async getWithHash(projectId: string): Promise<{ data: FaktenMatrix; hash: string } | null> {
    try {
      const data = await this.get(projectId);
      if (!data) return null;

      const hash = this.calculateHash(data);
      return { data, hash };
    } catch (error) {
      console.error('Fehler beim Laden der Fakten-Matrix mit Hash:', error);
      return null;
    }
  }

  /**
   * Berechnet einen Hash aus der Fakten-Matrix
   * Verwendet nur die inhaltlichen Felder (ohne Timestamps)
   */
  calculateHash(data: FaktenMatrix): string {
    const content = JSON.stringify({
      hook: data.hook,
      details: data.details,
      quote: data.quote,
    });

    // Browser-kompatible Hash-Berechnung
    if (typeof window !== 'undefined') {
      // Client-seitig: Einfacher String-Hash
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    } else {
      // Server-seitig: crypto.createHash
      return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    }
  }

  /**
   * Exportiert die Fakten-Matrix als formatierten Text fuer KI
   *
   * Format:
   * HOOK (W-FRAGEN)
   * Was: [event]
   * Wo: [location]
   * Wann: [date]
   *
   * DETAILS (SUBSTANZ)
   * Neuigkeitswert: [delta]
   * Beweise: [evidence]
   *
   * ZITAT (O-TON)
   * Speaker-ID: [speakerId]
   * Kernaussage: [rawStatement]
   */
  async exportForAI(projectId: string): Promise<string> {
    try {
      const data = await this.get(projectId);
      if (!data) return '';

      const parts: string[] = [];

      // Hook
      parts.push(`HOOK (W-FRAGEN)
Was: ${data.hook.event}
Wo: ${data.hook.location}
Wann: ${data.hook.date}`);

      // Details
      parts.push(`DETAILS (SUBSTANZ)
Neuigkeitswert: ${data.details.delta}
Beweise: ${data.details.evidence}`);

      // Quote
      parts.push(`ZITAT (O-TON)
Speaker-ID: ${data.quote.speakerId}
Kernaussage: ${data.quote.rawStatement}`);

      return parts.join('\n\n---\n\n');
    } catch (error) {
      console.error('Fehler beim Export der Fakten-Matrix fuer KI:', error);
      return '';
    }
  }
}

export const faktenMatrixService = new FaktenMatrixService();
