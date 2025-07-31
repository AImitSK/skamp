// src/lib/firebase/team-service-enhanced.ts
import { BaseService } from './service-base';
import { TeamMember, BaseEntity } from '@/types/international';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from './client-init';

// Extended TeamMember type that includes BaseEntity fields
interface TeamMemberExtended extends Omit<TeamMember, 'id'>, BaseEntity {
  // id kommt von BaseEntity (optional)
}

/**
 * Enhanced Team Member Service - folgt dem CRM Pattern
 * Nutzt den authentifizierten User Context für alle Operationen
 */
class TeamMemberEnhancedService extends BaseService<TeamMemberExtended> {
  constructor() {
    super('team_members');
  }

  /**
   * Lädt alle Team-Mitglieder einer Organisation
   */
  async getByOrganization(organizationId: string): Promise<TeamMember[]> {
    const extended = await this.getAll(organizationId, {
      orderBy: { field: 'displayName', direction: 'asc' }
    });
    // Convert back to TeamMember type
    return extended.map(({ createdBy, updatedBy, deletedAt, deletedBy, ...rest }) => ({
      ...rest,
      id: rest.id! // Ensure id is string for TeamMember
    } as TeamMember));
  }

  /**
   * Lädt ein Team-Mitglied by User & Org
   */
  async getByUserAndOrg(userId: string, organizationId: string): Promise<TeamMember | null> {
    const members = await this.search(organizationId, { userId });
    if (members.length === 0) return null;
    // Convert to TeamMember
    const { createdBy, updatedBy, deletedAt, deletedBy, ...rest } = members[0];
    return {
      ...rest,
      id: rest.id!
    } as TeamMember;
  }

  /**
   * Lädt ein Team-Mitglied by Email & Org
   */
  async getByEmailAndOrg(email: string, organizationId: string): Promise<TeamMember | null> {
    const members = await this.search(organizationId, { email });
    if (members.length === 0) return null;
    // Convert to TeamMember
    const { createdBy, updatedBy, deletedAt, deletedBy, ...rest } = members[0];
    return {
      ...rest,
      id: rest.id!
    } as TeamMember;
  }

  /**
   * Erstellt Owner-Eintrag (spezielle Methode mit fester ID)
   */
  async createOwner(
    userData: {
      userId: string;
      organizationId: string;
      email: string;
      displayName: string;
      photoUrl?: string;
    }
  ): Promise<string> {
    const ownerId = `${userData.userId}_${userData.organizationId}`;
    const ownerRef = doc(db, 'team_members', ownerId);
    
    // Erstelle Owner-Daten ohne undefined-Werte
    const ownerData: any = {
      id: ownerId,
      userId: userData.userId,
      organizationId: userData.organizationId,
      email: userData.email,
      displayName: userData.displayName,
      role: 'owner',
      status: 'active',
      invitedAt: serverTimestamp(),
      invitedBy: userData.userId,
      joinedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      createdBy: userData.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Füge photoUrl nur hinzu, wenn vorhanden
    if (userData.photoUrl) {
      ownerData.photoUrl = userData.photoUrl;
    }

    // Nutze setDoc statt addDoc für deterministische ID
    await setDoc(ownerRef, ownerData);

    return ownerId;
  }

  /**
   * Lädt Team-Mitglied einladen (erstellt direkt ohne API)
   */
  async invite(
    data: {
      email: string;
      role: TeamMember['role'];
      displayName?: string;
      restrictedToCompanyIds?: string[];
      expiresAt?: Date;
    },
    context: { organizationId: string; userId: string }
  ): Promise<{ memberId: string; invitationToken: string }> {
    // Prüfe ob Email bereits existiert
    const existing = await this.getByEmailAndOrg(data.email, context.organizationId);
    
    if (existing) {
      if (existing.status === 'inactive') {
        // Reaktiviere inaktives Mitglied
        await this.reactivate(existing.id!, context);
        return { 
          memberId: existing.id!, 
          invitationToken: this.generateInvitationToken() 
        };
      }
      throw new Error('Diese E-Mail wurde bereits eingeladen');
    }

    // Generiere Token
    const invitationToken = this.generateInvitationToken();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 Tage gültig

    // Erstelle saubere Mitgliedsdaten ohne undefined
    const memberData: any = {
      userId: '', // Wird beim Accept gesetzt
      organizationId: context.organizationId,
      email: data.email,
      displayName: data.displayName || data.email,
      role: data.role,
      status: 'invited',
      invitedAt: serverTimestamp(),
      invitedBy: context.userId,
      lastActiveAt: serverTimestamp()
    };

    // Füge optionale Felder nur hinzu, wenn sie definiert sind
    if (data.restrictedToCompanyIds && data.restrictedToCompanyIds.length > 0) {
      memberData.restrictedToCompanyIds = data.restrictedToCompanyIds;
    }

    if (data.expiresAt) {
      memberData.expiresAt = Timestamp.fromDate(data.expiresAt);
    }

    // Erstelle das Mitglied
    const memberId = await this.create(memberData, context);

    // Speichere Token separat (da nicht im TeamMember Type)
    await this.saveInvitationToken(memberId, invitationToken, tokenExpiry);

    return { memberId, invitationToken };
  }

  /**
   * Reaktiviert ein inaktives Mitglied
   */
  async reactivate(memberId: string, context: { organizationId: string; userId: string }): Promise<void> {
    await this.update(memberId, {
      status: 'invited',
      invitedAt: serverTimestamp() as Timestamp,
      invitedBy: context.userId
    }, context);
  }

  /**
   * Einladung annehmen
   */
  async acceptInvite(
    memberId: string,
    token: string,
    userData: {
      userId: string;
      displayName: string;
      photoUrl?: string;
    }
  ): Promise<void> {
    // Validiere Token
    const tokenData = await this.validateInvitationToken(memberId, token);
    if (!tokenData.valid) {
      throw new Error(tokenData.error || 'Ungültiger Token');
    }

    // Update Mitglied
    const memberRef = doc(db, 'team_members', memberId);
    const updateData: any = {
      userId: userData.userId,
      displayName: userData.displayName,
      status: 'active',
      joinedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Lösche Token-Felder
      invitationToken: null,
      invitationTokenExpiry: null
    };

    // Füge photoUrl nur hinzu, wenn vorhanden
    if (userData.photoUrl) {
      updateData.photoUrl = userData.photoUrl;
    }

    await updateDoc(memberRef, updateData);
  }

  /**
   * Soft Delete (Status auf inactive)
   */
  async remove(memberId: string, context: { organizationId: string; userId: string }): Promise<void> {
    // Prüfe ob nicht Owner
    const member = await this.getById(memberId, context.organizationId);
    if (!member) throw new Error('Mitglied nicht gefunden');
    
    // Check role
    if (member.role === 'owner') throw new Error('Owner kann nicht entfernt werden');

    await this.update(memberId, {
      status: 'inactive'
    }, context);
  }

  /**
   * Hard Delete (für Cleanup)
   */
  async hardDelete(memberId: string, organizationId: string): Promise<void> {
    const member = await this.getById(memberId, organizationId);
    if (!member) throw new Error('Mitglied nicht gefunden');
    
    // Check role
    if (member.role === 'owner') throw new Error('Owner kann nicht gelöscht werden');

    await super.hardDelete(memberId, organizationId);
  }

  /**
   * Update Last Active
   */
  async updateActivity(memberId: string): Promise<void> {
    const memberRef = doc(db, 'team_members', memberId);
    await updateDoc(memberRef, {
      lastActiveAt: serverTimestamp()
    });
  }

  /**
   * Zählt aktive Mitglieder
   */
  async countActiveMembers(organizationId: string): Promise<number> {
    return this.count(organizationId, { status: 'active' });
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Generiert Einladungstoken
   */
  private generateInvitationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Speichert Invitation Token (separates Dokument wegen Type-Safety)
   */
  private async saveInvitationToken(
    memberId: string, 
    token: string, 
    expiry: Date
  ): Promise<void> {
    // Speichere in separater invitation_tokens Collection
    // oder als Update am team_member Dokument
    const memberRef = doc(db, 'team_members', memberId);
    await updateDoc(memberRef, {
      invitationToken: token,
      invitationTokenExpiry: Timestamp.fromDate(expiry)
    });
  }

  /**
   * Validiert Invitation Token
   */
  private async validateInvitationToken(
    memberId: string,
    token: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const memberRef = doc(db, 'team_members', memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        return { valid: false, error: 'Einladung nicht gefunden' };
      }

      const data = memberDoc.data();
      
      // Prüfe Status - akzeptiere sowohl 'invited' als auch 'active' (falls bereits teilweise akzeptiert)
      if (data.status !== 'invited' && data.status !== 'active') {
        return { valid: false, error: 'Einladung hat ungültigen Status' };
      }

      // Bei aktivem Status, prüfe ob userId bereits gesetzt ist
      if (data.status === 'active' && data.userId) {
        return { valid: false, error: 'Einladung bereits verwendet' };
      }

      if (data.invitationToken !== token) {
        return { valid: false, error: 'Ungültiger Token' };
      }

      if (data.invitationTokenExpiry && data.invitationTokenExpiry.toDate() < new Date()) {
        return { valid: false, error: 'Einladung abgelaufen' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating token:', error);
      return { valid: false, error: 'Fehler bei Token-Validierung' };
    }
  }
}

// Export singleton instance
export const teamMemberEnhancedService = new TeamMemberEnhancedService();

// Re-export für Kompatibilität
export const teamMemberService = teamMemberEnhancedService;