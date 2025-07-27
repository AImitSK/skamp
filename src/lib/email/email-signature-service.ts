// src/lib/email/email-signature-service.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { EmailSignature } from '@/types/email-enhanced';

export class EmailSignatureService {
  private readonly collectionName = 'email_signatures';

  /**
   * Erstellt eine neue Signatur
   */
  async create(
    data: Partial<EmailSignature>,
    organizationId: string,
    userId: string
  ): Promise<string> {
    try {
      // Wenn als Standard gesetzt, entferne Standard von anderen
      if (data.isDefault) {
        await this.clearDefaultSignatures(organizationId);
      }

      const signature: Partial<EmailSignature> = {
        ...data,
        organizationId,
        userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedBy: userId
      };

      const docRef = await addDoc(
        collection(db, this.collectionName),
        signature
      );

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Signatur:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Signatur
   */
  async update(
    id: string,
    data: Partial<EmailSignature>,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Signatur nicht gefunden');
      }

      const currentData = docSnap.data() as EmailSignature;

      // Wenn als Standard gesetzt, entferne Standard von anderen
      if (data.isDefault && !currentData.isDefault) {
        await this.clearDefaultSignatures(currentData.organizationId);
      }

      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      };

      // Entferne undefined Werte
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      await updateDoc(docRef, updateData as DocumentData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Signatur:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Signatur
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Signatur nicht gefunden');
      }

      const signature = docSnap.data() as EmailSignature;
      
      // Verhindere Löschen der Standard-Signatur
      if (signature.isDefault) {
        throw new Error('Standard-Signatur kann nicht gelöscht werden');
      }

      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Löschen der Signatur:', error);
      throw error;
    }
  }

  /**
   * Holt eine Signatur
   */
  async get(id: string): Promise<EmailSignature | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as EmailSignature;
    } catch (error) {
      console.error('Fehler beim Abrufen der Signatur:', error);
      throw error;
    }
  }

  /**
   * Holt alle Signaturen einer Organisation
   */
  async getByOrganization(organizationId: string): Promise<EmailSignature[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const signatures: EmailSignature[] = [];

      querySnapshot.forEach((doc) => {
        signatures.push({ ...doc.data(), id: doc.id } as EmailSignature);
      });

      return signatures;
    } catch (error) {
      console.error('Fehler beim Abrufen der Signaturen:', error);
      throw error;
    }
  }

  /**
   * Holt alle Signaturen für eine E-Mail-Adresse
   */
  async getByEmailAddress(emailAddressId: string, organizationId: string): Promise<EmailSignature[]> {
    try {
      const allSignatures = await this.getByOrganization(organizationId);
      
      // Filtere Signaturen die dieser E-Mail-Adresse zugeordnet sind
      return allSignatures.filter(sig => 
        sig.emailAddressIds?.includes(emailAddressId)
      );
    } catch (error) {
      console.error('Fehler beim Abrufen der Signaturen für E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Holt die Standard-Signatur
   */
  async getDefaultSignature(organizationId: string): Promise<EmailSignature | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { ...doc.data(), id: doc.id } as EmailSignature;
    } catch (error) {
      console.error('Fehler beim Abrufen der Standard-Signatur:', error);
      return null;
    }
  }

  /**
   * Setzt eine Signatur als Standard
   */
  async setAsDefault(id: string, organizationId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Entferne Standard von allen anderen
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId),
        where('isDefault', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });

      // Setze neue Standard-Signatur
      const docRef = doc(db, this.collectionName, id);
      batch.update(docRef, { 
        isDefault: true,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Fehler beim Setzen der Standard-Signatur:', error);
      throw error;
    }
  }

  /**
   * Dupliziert eine Signatur
   */
  async duplicate(id: string, userId: string): Promise<string> {
    try {
      const original = await this.get(id);
      if (!original) {
        throw new Error('Signatur nicht gefunden');
      }

      const duplicate: Partial<EmailSignature> = {
        ...original,
        name: `${original.name} (Kopie)`,
        isDefault: false, // Kopie ist nie Standard
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedBy: userId
      };

      // Entferne ID
      delete duplicate.id;

      const docRef = await addDoc(
        collection(db, this.collectionName),
        duplicate
      );

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Duplizieren der Signatur:', error);
      throw error;
    }
  }

  /**
   * Fügt eine E-Mail-Adresse zu einer Signatur hinzu
   */
  async addEmailAddress(signatureId: string, emailAddressId: string): Promise<void> {
    try {
      const signature = await this.get(signatureId);
      if (!signature) {
        throw new Error('Signatur nicht gefunden');
      }

      const emailAddressIds = signature.emailAddressIds || [];
      if (!emailAddressIds.includes(emailAddressId)) {
        emailAddressIds.push(emailAddressId);
        
        await updateDoc(doc(db, this.collectionName, signatureId), {
          emailAddressIds,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Entfernt eine E-Mail-Adresse von einer Signatur
   */
  async removeEmailAddress(signatureId: string, emailAddressId: string): Promise<void> {
    try {
      const signature = await this.get(signatureId);
      if (!signature) {
        throw new Error('Signatur nicht gefunden');
      }

      const emailAddressIds = (signature.emailAddressIds || [])
        .filter(id => id !== emailAddressId);
      
      await updateDoc(doc(db, this.collectionName, signatureId), {
        emailAddressIds,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Entfernen der E-Mail-Adresse:', error);
      throw error;
    }
  }

  /**
   * Private Hilfsmethoden
   */
  private async clearDefaultSignatures(organizationId: string): Promise<void> {
    const batch = writeBatch(db);
    
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('isDefault', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });
    
    await batch.commit();
  }
}

// Singleton Export
export const emailSignatureService = new EmailSignatureService();