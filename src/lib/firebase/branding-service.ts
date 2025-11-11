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
  /**
   * Hole Branding-Einstellungen für eine Organisation
   * Fallback auf userId für Rückwärtskompatibilität
   */
  async getBrandingSettings(organizationId: string): Promise<BrandingSettings | null> {
    try {
      if (!organizationId) {
        console.error('getBrandingSettings: organizationId is required');
        return null;
      }

      // Versuche zuerst mit organizationId (neues Schema)
      const orgDocRef = doc(db, 'branding_settings', organizationId);
      const orgDocSnap = await getDoc(orgDocRef);
      
      if (orgDocSnap.exists()) {
        return { id: orgDocSnap.id, ...orgDocSnap.data() } as BrandingSettings;
      }
      
      // Fallback 1: Query nach organizationId
      const orgQuery = query(
        collection(db, 'branding_settings'),
        where('organizationId', '==', organizationId),
        limit(1)
      );
      const orgSnapshot = await getDocs(orgQuery);
      
      if (!orgSnapshot.empty) {
        const doc = orgSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BrandingSettings;
      }
      
      // Fallback 2: Legacy userId (für Migration)
      const userDocRef = doc(db, 'branding_settings', organizationId); // organizationId könnte userId sein
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists() && userDocSnap.data().userId) {
        // Legacy Dokument gefunden
        return { id: userDocSnap.id, ...userDocSnap.data() } as BrandingSettings;
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Branding-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Erstelle neue Branding-Einstellungen
   */
  async createBrandingSettings(
    settings: Omit<BrandingSettings, 'id' | 'createdAt' | 'updatedAt'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      if (!context.organizationId) {
        throw new Error('createBrandingSettings: organizationId is required');
      }

      // Verwende organizationId als Document ID
      const docRef = doc(db, 'branding_settings', context.organizationId);
      
      await setDoc(docRef, {
        ...settings,
        organizationId: context.organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: context.userId,
        updatedBy: context.userId
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Branding-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Update Branding-Einstellungen
   */
  async updateBrandingSettings(
    updates: Partial<BrandingSettings>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      if (!context.organizationId) {
        throw new Error('updateBrandingSettings: organizationId is required');
      }

      console.log('Updating branding settings for org:', context.organizationId);

      const docRef = doc(db, 'branding_settings', context.organizationId);
      
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
          updatedBy: context.userId
        });
      } else {
        // Erstelle neues Dokument wenn es noch nicht existiert
        await setDoc(docRef, {
          ...cleanedUpdates,
          organizationId: context.organizationId,
          showCopyright: updates.showCopyright ?? true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: context.userId,
          updatedBy: context.userId
        });
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Branding-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Stellt sicher, dass der "Branding" Ordner existiert
   * Gibt die Folder-ID zurück
   */
  async ensureBrandingFolder(
    organizationId: string,
    userId: string
  ): Promise<string> {
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');

      // Prüfe ob "Branding" Ordner bereits existiert
      const rootFolders = await mediaService.getFolders(organizationId, undefined);
      const brandingFolder = rootFolders.find(f => f.name === 'Branding');

      if (brandingFolder?.id) {
        return brandingFolder.id;
      }

      // Erstelle "Branding" Ordner wenn er nicht existiert
      const folderId = await mediaService.createFolder({
        userId,
        name: 'Branding',
        parentFolderId: undefined, // Root-Ordner
        description: 'Firmenlogos und Branding-Materialien',
        color: '#005fab' // Corporate Blue
      }, { organizationId, userId });

      return folderId;
    } catch (error) {
      console.error('Fehler beim Erstellen des Branding-Ordners:', error);
      throw error;
    }
  },

  /**
   * Lösche Logo Asset (inkl. Storage-Datei)
   */
  async removeLogo(context: { organizationId: string; userId: string }): Promise<void> {
    try {
      if (!context.organizationId) {
        throw new Error('removeLogo: organizationId is required');
      }

      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');

      // Lade aktuelle Branding-Einstellungen um logoAssetId zu bekommen
      const settings = await this.getBrandingSettings(context.organizationId);

      // Lösche das Original-Logo Asset aus Storage und Firestore
      if (settings?.logoAssetId) {
        try {
          const asset = await mediaService.getMediaAssetById(settings.logoAssetId);
          if (asset) {
            await mediaService.deleteMediaAsset(asset);
            console.log('Logo-Asset erfolgreich gelöscht:', settings.logoAssetId);
          } else {
            console.warn('Logo-Asset nicht gefunden:', settings.logoAssetId);
          }
        } catch (assetError) {
          console.error('Asset konnte nicht gelöscht werden:', assetError);
          // Fahre fort, auch wenn Asset-Löschung fehlschlägt
        }
      }

      // Lösche das Email-Logo Asset aus Storage und Firestore
      if (settings?.emailLogoAssetId && settings.emailLogoAssetId !== settings.logoAssetId) {
        try {
          const emailAsset = await mediaService.getMediaAssetById(settings.emailLogoAssetId);
          if (emailAsset) {
            await mediaService.deleteMediaAsset(emailAsset);
            console.log('Email-Logo-Asset erfolgreich gelöscht:', settings.emailLogoAssetId);
          } else {
            console.warn('Email-Logo-Asset nicht gefunden:', settings.emailLogoAssetId);
          }
        } catch (assetError) {
          console.error('Email-Logo-Asset konnte nicht gelöscht werden:', assetError);
          // Fahre fort, auch wenn Asset-Löschung fehlschlägt
        }
      }

      // Update Firestore-Referenzen
      const docRef = doc(db, 'branding_settings', context.organizationId);
      await updateDoc(docRef, {
        logoUrl: null,
        logoAssetId: null,
        emailLogoUrl: null,
        emailLogoAssetId: null,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId
      });
    } catch (error) {
      console.error('Fehler beim Entfernen des Logos:', error);
      throw error;
    }
  },

  /**
   * Validiere Branding-Einstellungen
   */
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
  },

  /**
   * Migration von alten Branding-Einstellungen (userId -> organizationId)
   */
  async migrateFromUserToOrg(
    userId: string,
    organizationId: string
  ): Promise<void> {
    try {
      if (!userId || !organizationId) {
        console.warn('Migration skipped: missing userId or organizationId');
        return;
      }

      // Hole alte Einstellungen mit userId
      const oldDocRef = doc(db, 'branding_settings', userId);
      const oldDocSnap = await getDoc(oldDocRef);
      
      if (oldDocSnap.exists()) {
        const oldData = oldDocSnap.data();
        
        // Erstelle neue Einstellungen mit organizationId
        await setDoc(doc(db, 'branding_settings', organizationId), {
          ...oldData,
          organizationId,
          userId: undefined, // Entferne userId
          createdBy: oldData.userId || userId,
          updatedBy: userId,
          updatedAt: serverTimestamp()
        });
        
        console.log('Branding settings migrated from user to organization');
      }
    } catch (error) {
      console.error('Error migrating branding settings:', error);
      // Nicht werfen, da Migration optional ist
    }
  }
};