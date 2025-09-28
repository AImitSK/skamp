import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

// SuperAdmin-Konfiguration
export const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';

// Global-Berechtigungen für Team-Mitglieder
export interface GlobalPermissions {
  canCreateGlobal: boolean;
  canEditGlobal: boolean;
  canDeleteGlobal: boolean;
  canInviteToGlobal: boolean;
  canAccessMatching: boolean;
  canBulkImport: boolean;
}

export function useAutoGlobal() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // SuperAdmin Detection
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // SuperAdmin's Organisation Detection
  // Die SuperAdmin-Organisation kann entweder die des SuperAdmins selbst sein
  // oder explizit als Global-Organisation markiert sein
  const superAdminUserId = getSuperAdminUserId();
  const isGlobalOrganization = currentOrganization?.id === superAdminUserId ||
    currentOrganization?.id === user?.uid; // SuperAdmin's eigene Organisation

  // Detaillierte Berechtigungen basierend auf Rolle
  const userRole = currentOrganization?.role;
  const isGlobalTeamAdmin = userRole === 'global-team-admin';
  const isGlobalTeamMemberRole = userRole === 'global-team-member';

  // Team-Mitglied in SuperAdmin-Organisation
  // Berechtigt sind: owner, admin, und explizit als global-team-member markierte
  const isGlobalTeamMember = Boolean(isGlobalOrganization &&
    currentOrganization?.role &&
    ['owner', 'admin', 'global-team-admin', 'global-team-member'].includes(currentOrganization.role));

  // Auto-Global Modus (alles was erstellt wird = global)
  const autoGlobalMode = Boolean(isSuperAdmin || isGlobalTeamMember);

  const globalPermissions: GlobalPermissions = {
    canCreateGlobal: autoGlobalMode,
    canEditGlobal: autoGlobalMode,
    canDeleteGlobal: Boolean(isSuperAdmin), // Nur SuperAdmin kann löschen
    canInviteToGlobal: Boolean(isSuperAdmin || isGlobalTeamAdmin), // SuperAdmin + Team Admins können einladen
    canAccessMatching: autoGlobalMode, // Duplikat-Matching für alle Global-Benutzer
    canBulkImport: Boolean(isSuperAdmin || isGlobalTeamAdmin) // Bulk-Import nur für SuperAdmin + Team Admins
  };

  return {
    // Status Checks
    isSuperAdmin,
    isGlobalOrganization,
    isGlobalTeamMember,
    isGlobalTeamAdmin,
    isGlobalTeamMemberRole,
    autoGlobalMode,

    // Role Information
    userRole,

    // Permissions
    globalPermissions,

    // UI States
    showGlobalBanner: autoGlobalMode,
    defaultGlobalState: autoGlobalMode,

    // Helper Functions
    getSuperAdminUserId,
    getGlobalMetadata
  };
}

// Helper: SuperAdmin User ID ermitteln
function getSuperAdminUserId(): string {
  // Die SuperAdmin-Organisation ist die Organisation des SuperAdmin-Users
  // Diese wird über die Firebase Auth UID identifiziert
  // TODO: Implementiere echte User ID Auflösung via Firebase Auth
  // Für jetzt verwenden wir eine bekannte SuperAdmin UID
  return 'superadmin-uid-placeholder'; // Wird durch echte UID ersetzt
}

// Helper: Global Metadata generieren
export function getGlobalMetadata(user: any, context: 'contact' | 'company' | 'publication') {
  return {
    addedBy: user?.email || 'unknown',
    addedAt: new Date(),
    autoPromoted: true,
    context: context,
    version: 1,
    isDraft: false, // TODO: Basierend auf Live-Modus Toggle
    qualityScore: 85 // TODO: Berechnen basierend auf Vollständigkeit
  };
}