// src/lib/firebase/organization-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
  Timestamp,
  FirestoreError,
  setDoc
} from 'firebase/firestore';
import { db } from './client-init';
import { 
  Organization, 
  TeamMember, 
  UserRole, 
  Permission,
  ROLE_PERMISSIONS,
  hasPermission
} from '@/types/international';

// ========================================
// Organization Service
// ========================================

export const organizationService = {
  /**
   * Erstellt eine neue Organisation (Mandant)
   */
  async create(data: {
    name: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
    plan?: Organization['plan'];
  }): Promise<string> {
    try {
      // 1. Organisation erstellen
      const slug = this.generateSlug(data.name);
      
      const orgData: Omit<Organization, 'id'> = {
        name: data.name,
        slug,
        plan: data.plan || 'free',
        planValidUntil: this.getPlanValidUntil(data.plan || 'free'),
        limits: this.getDefaultLimits(data.plan || 'free'),
        settings: {
          defaultLanguage: 'de',
          defaultCurrency: 'EUR',
          defaultCountry: 'DE',
          timezone: 'Europe/Berlin'
        },
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const orgRef = await addDoc(collection(db, 'organizations'), orgData);
      const organizationId = orgRef.id;

      // 2. Owner als erstes Team-Mitglied hinzufügen
      const ownerMember: Omit<TeamMember, 'id'> = {
        userId: data.ownerId,
        organizationId,
        email: data.ownerEmail,
        displayName: data.ownerName,
        role: 'owner',
        status: 'active',
        invitedAt: serverTimestamp() as Timestamp,
        invitedBy: data.ownerId,
        joinedAt: serverTimestamp() as Timestamp,
        lastActiveAt: serverTimestamp() as Timestamp
      };

      await addDoc(collection(db, 'team_members'), ownerMember);

      return organizationId;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw new Error('Fehler beim Erstellen der Organisation');
    }
  },

  /**
   * Stellt sicher, dass ein Owner-Eintrag existiert
   * Wird beim ersten Login aufgerufen um den Owner korrekt zu initialisieren
   */
  async ensureOwnerExists(
    userId: string, 
    organizationId: string,
    userData: {
      email: string;
      displayName?: string;
      photoUrl?: string;
    }
  ): Promise<void> {
    try {
      const ownerId = `${userId}_${organizationId}`;
      const ownerRef = doc(db, 'team_members', ownerId);
      
      const existing = await getDoc(ownerRef);
      if (!existing.exists()) {
        console.log('🔧 Creating owner entry for first-time user');
        
        // Owner direkt erstellen (kein Notification-Workaround)
        await setDoc(ownerRef, {
          id: ownerId,
          userId,
          organizationId,
          email: userData.email,
          displayName: userData.displayName || userData.email,
          photoUrl: userData.photoUrl,
          role: 'owner' as UserRole,
          status: 'active' as const,
          invitedAt: serverTimestamp(),
          invitedBy: userId,
          joinedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Owner entry created successfully');
      } else {
        // Update lastActiveAt
        await updateDoc(ownerRef, {
          lastActiveAt: serverTimestamp(),
          photoUrl: userData.photoUrl, // Update photo if changed
          displayName: userData.displayName || userData.email // Update name if changed
        });
      }
    } catch (error) {
      console.error('Error ensuring owner exists:', error);
      // Don't throw - this shouldn't block login
    }
  },

  /**
   * Lädt eine Organisation
   */
  async getById(organizationId: string): Promise<Organization | null> {
    try {
      const docRef = doc(db, 'organizations', organizationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Organization;
      }
      return null;
    } catch (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
  },

  /**
   * Aktualisiert Organisation
   */
  async update(
    organizationId: string, 
    data: Partial<Organization>,
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'organizations', organizationId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      throw new Error('Fehler beim Aktualisieren der Organisation');
    }
  },

  /**
   * Prüft ob Benutzer zur Organisation gehört
   */
  async isUserInOrganization(
    userId: string, 
    organizationId: string
  ): Promise<boolean> {
    try {
      const member = await teamMemberService.getByUserAndOrg(userId, organizationId);
      return member !== null && member.status === 'active';
    } catch (error) {
      return false;
    }
  },

  /**
   * Generiert URL-freundlichen Slug
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[äöü]/g, char => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[char] || char))
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Plan-Gültigkeit berechnen
   */
  getPlanValidUntil(plan: Organization['plan']): Timestamp {
    const date = new Date();
    switch (plan) {
      case 'free':
        // Free hat kein Ablaufdatum
        date.setFullYear(date.getFullYear() + 100);
        break;
      case 'starter':
      case 'professional':
      case 'enterprise':
        // Bezahlte Pläne laufen erstmal 30 Tage (Trial)
        date.setDate(date.getDate() + 30);
        break;
    }
    return Timestamp.fromDate(date);
  },

  /**
   * Standard-Limits pro Plan
   */
  getDefaultLimits(plan: Organization['plan']): Organization['limits'] {
    switch (plan) {
      case 'free':
        return {
          maxUsers: 2,
          maxContacts: 100,
          maxCampaignsPerMonth: 5,
          maxStorageGB: 1
        };
      case 'starter':
        return {
          maxUsers: 5,
          maxContacts: 1000,
          maxCampaignsPerMonth: 20,
          maxStorageGB: 10
        };
      case 'professional':
        return {
          maxUsers: 20,
          maxContacts: 10000,
          maxCampaignsPerMonth: 100,
          maxStorageGB: 50
        };
      case 'enterprise':
        return {
          // Unlimited
          maxUsers: undefined,
          maxContacts: undefined,
          maxCampaignsPerMonth: undefined,
          maxStorageGB: 500
        };
      default:
        return this.getDefaultLimits('free');
    }
  },

  /**
   * Prüft ob Limit erreicht ist
   */
  async checkLimit(
    organizationId: string,
    limitType: keyof NonNullable<Organization['limits']>
  ): Promise<{ allowed: boolean; current: number; limit?: number }> {
    try {
      const org = await this.getById(organizationId);
      if (!org) throw new Error('Organisation nicht gefunden');

      const limit = org.limits?.[limitType];
      
      // Kein Limit = unlimited
      if (limit === undefined) {
        return { allowed: true, current: 0 };
      }

      let current = 0;
      
      switch (limitType) {
        case 'maxUsers':
          current = await teamMemberService.countActiveMembers(organizationId);
          break;
        case 'maxContacts':
          // Muss aus contacts collection gezählt werden
          const contactsQuery = query(
            collection(db, 'contacts'),
            where('organizationId', '==', organizationId)
          );
          const contactsSnapshot = await getDocs(contactsQuery);
          current = contactsSnapshot.size;
          break;
        // Weitere Limits können hier implementiert werden
      }

      return {
        allowed: current < limit,
        current,
        limit
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      return { allowed: false, current: 0 };
    }
  }
};

// ========================================
// Team Member Service
// ========================================

export const teamMemberService = {
  /**
   * Lädt alle Team-Mitglieder einer Organisation
   */
  async getByOrganization(organizationId: string): Promise<TeamMember[]> {
    try {
      const q = query(
        collection(db, 'team_members'),
        where('organizationId', '==', organizationId),
        orderBy('displayName')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamMember));
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  },

  /**
   * Erstellt ein Team-Mitglied direkt ohne Organization-Check
   * Workaround für fehlende organizations Collection
   */
  async createDirectly(memberData: Partial<TeamMember>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'team_members'), {
        ...memberData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating team member directly:', error);
      throw error;
    }
  },

  /**
   * Lädt Team-Mitglied by User & Org
   */
  async getByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<TeamMember | null> {
    try {
      const q = query(
        collection(db, 'team_members'),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as TeamMember;
    } catch (error) {
      console.error('Error fetching team member:', error);
      return null;
    }
  },

  /**
   * Lädt alle Organisationen eines Users
   */
  async getUserOrganizations(userId: string): Promise<{
    member: TeamMember;
    organization: Organization;
  }[]> {
    try {
      // 1. Alle Team-Mitgliedschaften des Users
      const q = query(
        collection(db, 'team_members'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(q);
      const members = memberSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamMember));

      // 2. Organisationen laden
      const results = await Promise.all(
        members.map(async (member) => {
          const org = await organizationService.getById(member.organizationId);
          return org ? { member, organization: org } : null;
        })
      );

      return results.filter(Boolean) as { member: TeamMember; organization: Organization }[];
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      return [];
    }
  },

  /**
   * Lädt ein Mitglied einladen
   */
  async invite(data: {
    email: string;
    organizationId: string;
    role: UserRole;
    invitedBy: string;
    restrictedToCompanyIds?: string[];
    expiresAt?: Date;
  }): Promise<string> {
    try {
      // Prüfe ob Email bereits eingeladen
      const existing = await this.getByEmailAndOrg(data.email, data.organizationId);
      if (existing) {
        // Prüfe ob inaktiv - dann reaktivieren
        if (existing.status === 'inactive') {
          await this.reactivate(existing.id!, data.invitedBy);
          return existing.id!;
        }
        throw new Error('Diese E-Mail wurde bereits eingeladen');
      }

      // Prüfe Benutzer-Limit
      const limitCheck = await organizationService.checkLimit(data.organizationId, 'maxUsers');
      if (!limitCheck.allowed) {
        throw new Error(`Benutzer-Limit erreicht (${limitCheck.current}/${limitCheck.limit})`);
      }

      const memberData: Omit<TeamMember, 'id'> = {
        userId: '', // Wird beim Annehmen der Einladung gesetzt
        organizationId: data.organizationId,
        email: data.email,
        displayName: data.email, // Vorläufig
        role: data.role,
        status: 'invited',
        invitedAt: serverTimestamp() as Timestamp,
        invitedBy: data.invitedBy,
        restrictedToCompanyIds: data.restrictedToCompanyIds,
        expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : undefined
      };

      const docRef = await addDoc(collection(db, 'team_members'), memberData);
      
      // TODO: Einladungs-Email versenden
      
      return docRef.id;
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  },

  /**
   * Reaktiviert ein inaktives Mitglied
   */
  async reactivate(memberId: string, reactivatedBy: string): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', memberId);
      
      await updateDoc(docRef, {
        status: 'invited',
        invitedAt: serverTimestamp(),
        invitedBy: reactivatedBy,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error reactivating member:', error);
      throw error;
    }
  },

  /**
   * Einladung annehmen
   */
  async acceptInvite(
    inviteId: string,
    userId: string,
    displayName: string,
    photoUrl?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', inviteId);
      const invite = await getDoc(docRef);
      
      if (!invite.exists()) {
        throw new Error('Einladung nicht gefunden');
      }

      const data = invite.data() as TeamMember;
      
      if (data.status !== 'invited') {
        throw new Error('Einladung ist nicht mehr gültig');
      }

      // Prüfe Ablaufdatum
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        throw new Error('Einladung ist abgelaufen');
      }

      await updateDoc(docRef, {
        userId,
        displayName,
        photoUrl,
        status: 'active',
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  },

  /**
   * Mitglied aktualisieren
   */
  async update(
    memberId: string,
    data: Partial<TeamMember>,
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', memberId);
      
      // Sicherstellen dass Owner-Rolle nicht geändert wird
      const member = await getDoc(docRef);
      if (member.exists() && member.data().role === 'owner' && data.role && data.role !== 'owner') {
        throw new Error('Owner-Rolle kann nicht geändert werden');
      }

      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  /**
   * Mitglied entfernen (soft delete)
   */
  async remove(memberId: string, removedBy: string): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', memberId);
      
      // Owner kann nicht entfernt werden
      const member = await getDoc(docRef);
      if (member.exists() && member.data().role === 'owner') {
        throw new Error('Owner kann nicht entfernt werden');
      }

      await updateDoc(docRef, {
        status: 'inactive',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  },

  /**
   * Mitglied hart löschen (für Clean-up)
   */
  async hardDelete(memberId: string): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', memberId);
      
      // Owner kann nicht gelöscht werden
      const member = await getDoc(docRef);
      if (member.exists() && member.data().role === 'owner') {
        throw new Error('Owner kann nicht gelöscht werden');
      }

      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error hard deleting member:', error);
      throw error;
    }
  },

  /**
   * Prüft ob Mitglied bestimmte Permission hat
   */
  hasPermission(member: TeamMember, permission: Permission): boolean {
    return hasPermission(member, permission);
  },

  /**
   * Prüft ob Mitglied auf Firma zugreifen darf
   */
  canAccessCompany(member: TeamMember, companyId: string): boolean {
    // Clients können eingeschränkt sein
    if (member.role === 'client' && member.restrictedToCompanyIds) {
      return member.restrictedToCompanyIds.includes(companyId);
    }
    
    // Andere Rollen haben vollen Zugriff wenn sie CRM-Rechte haben
    return this.hasPermission(member, 'crm.view');
  },

  /**
   * Zählt aktive Mitglieder
   */
  async countActiveMembers(organizationId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'team_members'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error counting members:', error);
      return 0;
    }
  },

  /**
   * Suche Mitglied by Email in Org
   */
  async getByEmailAndOrg(
    email: string,
    organizationId: string
  ): Promise<TeamMember | null> {
    try {
      const q = query(
        collection(db, 'team_members'),
        where('email', '==', email),
        where('organizationId', '==', organizationId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as TeamMember;
    } catch (error) {
      return null;
    }
  },

  /**
   * Aktivität aktualisieren
   */
  async updateActivity(memberId: string): Promise<void> {
    try {
      const docRef = doc(db, 'team_members', memberId);
      await updateDoc(docRef, {
        lastActiveAt: serverTimestamp()
      });
    } catch (error) {
      // Silent fail - nicht kritisch
      console.error('Error updating activity:', error);
    }
  }
};

// Export für convenience
export const orgService = organizationService;