// src/lib/firebase/branding-service.ts
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from './client-init';
import { BrandingSettings } from '@/types/branding';

export const brandingService = {
  // Hole Branding-Einstellungen für einen User
  async getBrandingSettings(userId: string): Promise<BrandingSettings | null> {
    try {
      // Versuche zuerst das Dokument direkt mit der userId zu holen
      const docRef = doc(db, 'branding_settings', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BrandingSettings;
      }
      
      // Fallback: Query nach userId (für Rückwärtskompatibilität)
      const q = query(
        collection(db, 'branding_settings'),
        where('userId', '==', userId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BrandingSettings;
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Branding-Einstellungen:', error);
      throw error;
    }
  },

  // Erstelle neue Branding-Einstellungen
  async createBrandingSettings(settings: Omit<BrandingSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Verwende userId als Document ID für einfacheren Zugriff
      const docRef = doc(db, 'branding_settings', settings.userId);
      
      await setDoc(docRef, {
        ...settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Branding-Einstellungen:', error);
      throw error;
    }
  },

  // Update Branding-Einstellungen
  async updateBrandingSettings(
    userId: string, 
    updates: Partial<BrandingSettings>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'branding_settings', userId);
      
      // Filtere undefined Werte heraus
      const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // Prüfe ob Dokument existiert
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existierendes Dokument
        await updateDoc(docRef, {
          ...cleanedUpdates,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Erstelle neues Dokument wenn es noch nicht existiert
        await setDoc(docRef, {
          ...cleanedUpdates,
          userId,
          showCopyright: updates.showCopyright ?? true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Branding-Einstellungen:', error);
      throw error;
    }
  },

  // Lösche Logo Asset ID (wenn Logo gelöscht wird)
  async removeLogo(userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'branding_settings', userId);
      await updateDoc(docRef, {
        logoUrl: null,      // Verwende null statt undefined
        logoAssetId: null,  // Verwende null statt undefined
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Entfernen des Logos:', error);
      throw error;
    }
  },

  // Validiere Branding-Einstellungen
  validateBrandingSettings(settings: Partial<BrandingSettings>): { 
    isValid: boolean; 
    errors: Record<string, string> 
  } {
    const errors: Record<string, string> = {};
    
    // Firmenname
    if (!settings.companyName?.trim()) {
      errors.companyName = 'Firmenname ist erforderlich';
    } else if (settings.companyName.length < 2) {
      errors.companyName = 'Firmenname muss mindestens 2 Zeichen lang sein';
    } else if (settings.companyName.length > 100) {
      errors.companyName = 'Firmenname darf maximal 100 Zeichen lang sein';
    }
    
    // E-Mail
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    
    // Website
    if (settings.website && !/^https?:\/\/.+\..+/.test(settings.website)) {
      errors.website = 'Bitte geben Sie eine gültige URL ein (z.B. https://example.com)';
    }
    
    // Telefon
    if (settings.phone && !/^\+?[\d\s\-\(\)]+$/.test(settings.phone)) {
      errors.phone = 'Bitte geben Sie eine gültige Telefonnummer ein';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};