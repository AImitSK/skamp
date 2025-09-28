import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { SUPER_ADMIN_EMAIL } from '@/lib/hooks/useAutoGlobal';

export interface GlobalTeamInvitation {
  id?: string;
  email: string;
  role: 'global-team-admin' | 'global-team-member';
  invitedBy: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  acceptedAt?: Date;
  expiresAt: Date;
  organizationId: string; // SuperAdmin's Organization ID
}

export interface GlobalTeamMember {
  id?: string;
  userId: string;
  email: string;
  role: 'global-team-admin' | 'global-team-member';
  organizationId: string;
  addedBy: string;
  addedAt: Date;
  status: 'active' | 'suspended';
  lastActiveAt?: Date;
  permissions: {
    canCreateGlobal: boolean;
    canEditGlobal: boolean;
    canDeleteGlobal: boolean;
    canInviteToGlobal: boolean;
    canAccessMatching: boolean;
    canBulkImport: boolean;
  };
}

class GlobalTeamService {
  private invitationsCollection = 'globalTeamInvitations';
  private membersCollection = 'globalTeamMembers';

  /**
   * Team-Einladung erstellen (nur SuperAdmin und Global Team Admins)
   */
  async inviteToGlobalTeam(
    email: string,
    role: 'global-team-admin' | 'global-team-member',
    invitedBy: string,
    organizationId: string
  ): Promise<string> {
    // Prüfe ob bereits eine aktive Einladung existiert
    const existingInvitation = await this.getActiveInvitation(email, organizationId);
    if (existingInvitation) {
      throw new Error('Es existiert bereits eine aktive Einladung für diese E-Mail-Adresse');
    }

    // Prüfe ob bereits Mitglied
    const existingMember = await this.getMemberByEmail(email, organizationId);
    if (existingMember) {
      throw new Error('Diese Person ist bereits Mitglied der Global-Organisation');
    }

    const invitation: Omit<GlobalTeamInvitation, 'id'> = {
      email: email.toLowerCase(),
      role,
      invitedBy,
      invitedAt: new Date(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
      organizationId
    };

    const docRef = await addDoc(collection(db, this.invitationsCollection), {
      ...invitation,
      invitedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // TODO: E-Mail-Benachrichtigung senden
    console.log(`Global Team Einladung an ${email} gesendet (Rolle: ${role})`);

    return docRef.id;
  }

  /**
   * Einladung akzeptieren
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    const invitationRef = doc(db, this.invitationsCollection, invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Einladung nicht gefunden');
    }

    const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as GlobalTeamInvitation;

    if (invitation.status !== 'pending') {
      throw new Error('Diese Einladung ist nicht mehr gültig');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('Diese Einladung ist abgelaufen');
    }

    // Batch-Operation für Konsistenz
    const batch = writeBatch(db);

    // 1. Team-Mitglied erstellen
    const member: Omit<GlobalTeamMember, 'id'> = {
      userId,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      addedBy: invitation.invitedBy,
      addedAt: new Date(),
      status: 'active',
      permissions: this.getRolePermissions(invitation.role)
    };

    const memberRef = doc(collection(db, this.membersCollection));
    batch.set(memberRef, {
      ...member,
      addedAt: serverTimestamp()
    });

    // 2. Einladung als akzeptiert markieren
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });

    await batch.commit();

    console.log(`${invitation.email} ist der Global-Organisation beigetreten (Rolle: ${invitation.role})`);
  }

  /**
   * Alle aktiven Team-Mitglieder abrufen
   */
  async getGlobalTeamMembers(organizationId: string): Promise<GlobalTeamMember[]> {
    const q = query(
      collection(db, this.membersCollection),
      where('organizationId', '==', organizationId),
      where('status', '==', 'active'),
      orderBy('addedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GlobalTeamMember));
  }

  /**
   * Team-Mitglied entfernen (nur SuperAdmin)
   */
  async removeTeamMember(memberId: string, removedBy: string): Promise<void> {
    // Nur SuperAdmin kann Team-Mitglieder entfernen
    if (removedBy !== SUPER_ADMIN_EMAIL) {
      throw new Error('Nur der SuperAdmin kann Team-Mitglieder entfernen');
    }

    const memberRef = doc(db, this.membersCollection, memberId);
    await deleteDoc(memberRef);

    console.log(`Team-Mitglied ${memberId} wurde entfernt`);
  }

  /**
   * Team-Mitglied-Rolle ändern (nur SuperAdmin)
   */
  async updateMemberRole(
    memberId: string,
    newRole: 'global-team-admin' | 'global-team-member',
    updatedBy: string
  ): Promise<void> {
    // Nur SuperAdmin kann Rollen ändern
    if (updatedBy !== SUPER_ADMIN_EMAIL) {
      throw new Error('Nur der SuperAdmin kann Rollen ändern');
    }

    const memberRef = doc(db, this.membersCollection, memberId);
    await updateDoc(memberRef, {
      role: newRole,
      permissions: this.getRolePermissions(newRole),
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: updatedBy
    });

    console.log(`Team-Mitglied ${memberId} Rolle geändert zu ${newRole}`);
  }

  /**
   * Aktive Einladung für E-Mail finden
   */
  private async getActiveInvitation(email: string, organizationId: string): Promise<GlobalTeamInvitation | null> {
    const q = query(
      collection(db, this.invitationsCollection),
      where('email', '==', email.toLowerCase()),
      where('organizationId', '==', organizationId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as GlobalTeamInvitation;
  }

  /**
   * Team-Mitglied per E-Mail finden
   */
  private async getMemberByEmail(email: string, organizationId: string): Promise<GlobalTeamMember | null> {
    const q = query(
      collection(db, this.membersCollection),
      where('email', '==', email.toLowerCase()),
      where('organizationId', '==', organizationId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as GlobalTeamMember;
  }

  /**
   * Berechtigungen für eine Rolle ermitteln
   */
  private getRolePermissions(role: 'global-team-admin' | 'global-team-member') {
    switch (role) {
      case 'global-team-admin':
        return {
          canCreateGlobal: true,
          canEditGlobal: true,
          canDeleteGlobal: false, // Nur SuperAdmin
          canInviteToGlobal: true,
          canAccessMatching: true,
          canBulkImport: true
        };
      case 'global-team-member':
        return {
          canCreateGlobal: true,
          canEditGlobal: true,
          canDeleteGlobal: false,
          canInviteToGlobal: false,
          canAccessMatching: true,
          canBulkImport: false
        };
    }
  }

  /**
   * Abgelaufene Einladungen bereinigen
   */
  async cleanupExpiredInvitations(): Promise<void> {
    const q = query(
      collection(db, this.invitationsCollection),
      where('status', '==', 'pending'),
      where('expiresAt', '<', new Date())
    );

    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });

    await batch.commit();
    console.log(`${snapshot.docs.length} abgelaufene Einladungen bereinigt`);
  }
}

export const globalTeamService = new GlobalTeamService();