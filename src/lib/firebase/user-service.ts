// src/lib/firebase/user-service.ts
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, User } from 'firebase/auth';
import { db } from './client-init';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'sms' | 'totp';
  emailVerified: boolean;
  linkedProviders: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileUpdateData {
  displayName?: string;
  phoneNumber?: string;
}

class UserService {
  private collection = 'users';

  /**
   * Erstellt oder aktualisiert das Benutzerprofil in Firestore
   */
  async createOrUpdateProfile(user: User, additionalData?: Partial<UserProfileData>): Promise<void> {
    const userRef = doc(db, this.collection, user.uid);
    
    const profileData: Partial<UserProfileData> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      emailVerified: user.emailVerified,
      linkedProviders: user.providerData.map(p => p.providerId),
      lastLoginAt: new Date(),
      updatedAt: new Date(),
      ...additionalData
    };

    // Setze createdAt nur beim ersten Mal
    const existingDoc = await getDoc(userRef);
    if (!existingDoc.exists()) {
      profileData.createdAt = new Date();
      profileData.twoFactorEnabled = false;
    }

    await setDoc(userRef, profileData, { merge: true });
  }

  /**
   * Holt das vollständige Benutzerprofil aus Firestore
   */
  async getProfile(userId: string): Promise<UserProfileData | null> {
    const userRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate?.() || undefined,
    } as UserProfileData;
  }

  /**
   * Aktualisiert Benutzerprofil (Firebase Auth + Firestore + TeamMembers)
   */
  async updateProfile(
    user: User, 
    updateData: UserProfileUpdateData
  ): Promise<void> {
    try {
      // 1. Update Firebase Auth Profile (nur displayName)
      if (updateData.displayName !== undefined) {
        await updateProfile(user, {
          displayName: updateData.displayName
        });
      }

      // 2. Update Firestore Document (alle Felder)
      const userRef = doc(db, this.collection, user.uid);
      const firestoreUpdateData: any = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // Synchronisiere displayName zwischen Auth und Firestore
      if (updateData.displayName !== undefined) {
        firestoreUpdateData.displayName = updateData.displayName;
      }

      await setDoc(userRef, firestoreUpdateData, { merge: true });

      // 3. Update team_members Collection für alle Organisationen des Users
      if (updateData.displayName !== undefined) {
        try {
          // Importiere teamMemberService
          const { teamMemberService } = await import('./team-service-enhanced');
          const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
          
          // Finde alle team_members Einträge für diesen User
          const teamMembersQuery = query(
            collection(db, 'team_members'),
            where('userId', '==', user.uid)
          );
          
          const querySnapshot = await getDocs(teamMembersQuery);
          
          // Update jeden gefundenen team_member Eintrag
          const updatePromises = querySnapshot.docs.map(docSnapshot => {
            return updateDoc(docSnapshot.ref, {
              displayName: updateData.displayName,
              updatedAt: serverTimestamp()
            });
          });
          
          await Promise.all(updatePromises);
          
          console.log(`Updated ${updatePromises.length} team_member entries with new displayName`);
        } catch (teamUpdateError) {
          // Fehler beim Update der team_members nicht kritisch
          console.error('Fehler beim Update der team_members:', teamUpdateError);
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error);
      throw new Error('Profil konnte nicht aktualisiert werden');
    }
  }

  /**
   * Validiert Telefonnummer (einfache Validation)
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    
    // Entferne Formatierungszeichen
    const cleanedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Mindestens 3 Ziffern, maximal 16 (inkl. +)
    // Darf nicht mit 0 anfangen (außer nach +)
    const phoneRegex = /^[\+]?[1-9][\d]{2,15}$/;
    return phoneRegex.test(cleanedNumber);
  }

  /**
   * Validiert Anzeigename
   */
  validateDisplayName(displayName: string): { valid: boolean; error?: string } {
    if (!displayName || displayName.trim().length === 0) {
      return { valid: false, error: 'Anzeigename ist erforderlich' };
    }
    
    if (displayName.length < 2) {
      return { valid: false, error: 'Anzeigename muss mindestens 2 Zeichen haben' };
    }
    
    if (displayName.length > 50) {
      return { valid: false, error: 'Anzeigename darf maximal 50 Zeichen haben' };
    }
    
    return { valid: true };
  }

  /**
   * Löscht Benutzerprofil aus Firestore (nicht Auth - das muss separat passieren)
   */
  async deleteProfile(userId: string): Promise<void> {
    const userRef = doc(db, this.collection, userId);
    // Soft delete - markiere als gelöscht statt echter Löschung
    await setDoc(userRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export const userService = new UserService();