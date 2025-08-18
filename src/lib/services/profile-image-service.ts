// src/lib/services/profile-image-service.ts
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

      // TeamMember-Tabelle aktualisieren (KRITISCH für Multi-Tenancy Avatare)
      await this.updateTeamMemberAvatar(user.uid, organizationId, downloadURL);

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

      // TeamMember-Tabelle aktualisieren (Avatar löschen)
      await this.updateTeamMemberAvatar(user.uid, organizationId, null);

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
   * KRITISCH: Aktualisiert TeamMember-Avatar für Multi-Tenancy
   * Damit alle Kollegen das richtige Avatar sehen
   */
  private async updateTeamMemberAvatar(
    userId: string, 
    organizationId: string, 
    photoUrl: string | null
  ): Promise<void> {
    try {
      console.log('🔄 AVATAR-SYNC START:', {
        userId: userId,
        organizationId: organizationId,
        photoUrl: photoUrl ? photoUrl.substring(0, 50) + '...' : 'null'
      });

      // Suche TeamMember-Dokument für diesen User in dieser Organisation
      const teamMembersQuery = query(
        collection(db, 'team_members'),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId)
      );
      
      const querySnapshot = await getDocs(teamMembersQuery);
      
      console.log('🔍 TeamMember Query Ergebnis:', {
        found: querySnapshot.size,
        isEmpty: querySnapshot.empty
      });

      if (querySnapshot.empty) {
        console.warn(`❌ Kein TeamMember-Dokument gefunden für User ${userId} in Organisation ${organizationId}`);
        
        // Debug: Zeige alle TeamMembers für diese Organisation
        const allMembersQuery = query(
          collection(db, 'team_members'),
          where('organizationId', '==', organizationId)
        );
        const allMembers = await getDocs(allMembersQuery);
        console.log('🔍 Alle TeamMembers in dieser Organisation:', 
          allMembers.docs.map(doc => ({ id: doc.id, userId: doc.data().userId, displayName: doc.data().displayName }))
        );
        return;
      }

      // Update alle gefundenen TeamMember-Dokumente (sollte nur 1 sein)
      const updateData = {
        photoUrl: photoUrl,
        avatarUpdatedAt: new Date()
      };

      console.log('📝 Updating TeamMember mit Daten:', updateData);

      const updatePromises = querySnapshot.docs.map(doc => {
        console.log('📄 Updating TeamMember Dokument:', doc.id);
        return updateDoc(doc.ref, updateData);
      });

      await Promise.all(updatePromises);
      
      console.log(`✅ TeamMember Avatar aktualisiert für User ${userId}:`, photoUrl ? 'Neues Bild' : 'Avatar gelöscht');
      
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des TeamMember-Avatars:', error);
      // Nicht werfen - Avatar-Sync sollte Upload nicht blockieren
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