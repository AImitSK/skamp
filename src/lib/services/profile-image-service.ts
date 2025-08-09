// src/lib/services/profile-image-service.ts
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { updateProfile } from 'firebase/auth';
import { User } from 'firebase/auth';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class ProfileImageService {
  private static instance: ProfileImageService;
  private storage = getStorage();

  static getInstance(): ProfileImageService {
    if (!ProfileImageService.instance) {
      ProfileImageService.instance = new ProfileImageService();
    }
    return ProfileImageService.instance;
  }

  /**
   * Validiert eine Bild-Datei für Profilbild-Upload
   */
  validateImageFile(file: File): ValidationResult {
    // Dateigröße-Limit: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Datei ist zu groß. Maximum 5MB erlaubt.'
      };
    }

    // Erlaubte Dateitypen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Nur JPEG, PNG und WebP Dateien sind erlaubt.'
      };
    }

    return { valid: true };
  }

  /**
   * Lädt ein Profilbild hoch und aktualisiert das User-Profil
   * Multi-Tenancy: /organizations/{organizationId}/profiles/{userId}/avatar.{ext}
   */
  async uploadProfileImage(
    file: File, 
    user: User, 
    organizationId: string
  ): Promise<UploadResult> {
    try {
      // Validierung
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Datei-Extension ermitteln
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Multi-Tenant Storage-Pfad
      const imagePath = `organizations/${organizationId}/profiles/${user.uid}/avatar.${extension}`;
      const imageRef = ref(this.storage, imagePath);

      // Altes Bild löschen (falls vorhanden)
      await this.deleteExistingProfileImage(user.uid, organizationId);

      // Neue Datei hochladen
      const uploadSnapshot = await uploadBytes(imageRef, file, {
        contentType: file.type,
        customMetadata: {
          userId: user.uid,
          organizationId: organizationId,
          uploadedAt: new Date().toISOString()
        }
      });

      // Download-URL abrufen
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      // Firebase Auth Profil aktualisieren
      await updateProfile(user, {
        photoURL: downloadURL
      });

      // Firestore User-Dokument aktualisieren (falls vorhanden)
      try {
        const userDocRef = doc(db, `organizations/${organizationId}/users`, user.uid);
        await updateDoc(userDocRef, {
          photoURL: downloadURL,
          profileImageUpdatedAt: new Date()
        });
      } catch (error) {
        console.warn('Firestore User-Dokument nicht gefunden oder nicht aktualisierbar:', error);
      }

      return {
        success: true,
        url: downloadURL
      };

    } catch (error) {
      console.error('Fehler beim Profilbild-Upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Upload'
      };
    }
  }

  /**
   * Löscht das aktuelle Profilbild
   */
  async deleteProfileImage(user: User, organizationId: string): Promise<UploadResult> {
    try {
      await this.deleteExistingProfileImage(user.uid, organizationId);

      // Firebase Auth Profil aktualisieren
      await updateProfile(user, {
        photoURL: null
      });

      // Firestore User-Dokument aktualisieren
      try {
        const userDocRef = doc(db, `organizations/${organizationId}/users`, user.uid);
        await updateDoc(userDocRef, {
          photoURL: null,
          profileImageDeletedAt: new Date()
        });
      } catch (error) {
        console.warn('Firestore User-Dokument nicht aktualisierbar:', error);
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Fehler beim Löschen des Profilbilds:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Löschen'
      };
    }
  }

  /**
   * Hilfsfunktion: Löscht vorhandene Profilbilder
   * (Alle möglichen Dateierweiterungen)
   */
  private async deleteExistingProfileImage(userId: string, organizationId: string): Promise<void> {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    for (const ext of extensions) {
      try {
        const imagePath = `organizations/${organizationId}/profiles/${userId}/avatar.${ext}`;
        const imageRef = ref(this.storage, imagePath);
        await deleteObject(imageRef);
      } catch (error) {
        // Ignoriere Fehler wenn Datei nicht existiert
        if ((error as any)?.code !== 'storage/object-not-found') {
          console.warn(`Fehler beim Löschen von ${ext}-Datei:`, error);
        }
      }
    }
  }

  /**
   * Generiert Initialen aus Name oder E-Mail
   */
  generateInitials(user: User): string {
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return '?';
  }

  /**
   * Erstellt eine Fallback-Avatar-URL basierend auf Initialen
   * (Für zukünftige Integration mit Avatar-Generatoren)
   */
  generateFallbackAvatarUrl(user: User): string {
    const initials = this.generateInitials(user);
    // Beispiel: UI-Avatars Service (kostenlos)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=256&background=005fab&color=ffffff&bold=true`;
  }
}

export default ProfileImageService.getInstance();