// src/types/team-enhanced.ts
import { TeamMember, UserRole, Permission, ROLE_PERMISSIONS } from './international';

// ========================================
// Enhanced Team Types
// ========================================

/**
 * Team Invitation Interface
 */
export interface TeamInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  displayName: string;
  invitedBy: string;
  invitedAt: Date;
  token: string;
  tokenExpiry: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  restrictedToCompanyIds?: string[];
  expiresAt?: Date;
}

/**
 * Team Member mit erweiterten Feldern für UI
 */
export interface TeamMemberEnhanced extends TeamMember {
  // Status-Badge Konfiguration
  statusConfig: {
    label: string;
    color: 'green' | 'yellow' | 'red' | 'gray';
    icon: any;
  };
  
  // Rolle-Badge Konfiguration  
  roleConfig: {
    label: string;
    color: 'purple' | 'blue' | 'green' | 'gray';
    icon: any;
    description: string;
  };
  
  // Berechnet Felder
  isOwner: boolean;
  canChangeRole: boolean;
  canRemove: boolean;
  formattedLastActive: string;
  formattedJoinedDate: string;
}

/**
 * Team Statistics
 */
export interface TeamStatistics {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  roleDistribution: Record<UserRole, number>;
  
  // Aktivität
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  
  // Retention
  newMembersThisMonth: number;
  membersTurnover: number; // Prozent der Fluktuation
}

/**
 * Team Permission Check Result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
  suggestions?: string[];
}

/**
 * Team Activity Log Entry
 */
export interface TeamActivityLogEntry {
  id: string;
  organizationId: string;
  type: 'member_invited' | 'member_joined' | 'member_left' | 'role_changed' | 'permission_changed';
  actorId: string; // User der die Aktion ausgeführt hat
  actorName: string;
  targetId?: string; // Betroffener User
  targetName?: string;
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Bulk Team Operations
 */
export interface BulkTeamOperation {
  type: 'invite' | 'role_change' | 'remove' | 'suspend';
  members: string[] | TeamMember[];
  data?: {
    role?: UserRole;
    permissions?: Permission[];
    reason?: string;
  };
}

/**
 * Team Settings
 */
export interface TeamSettings {
  organizationId: string;
  
  // Einladungs-Einstellungen
  invitationSettings: {
    requireApproval: boolean;
    allowSelfRegistration: boolean;
    defaultRole: UserRole;
    invitationExpiryDays: number;
    maxPendingInvitations: number;
  };
  
  // Sicherheit
  securitySettings: {
    enforce2FA: boolean;
    sessionTimeoutMinutes: number;
    ipWhitelist?: string[];
    allowedEmailDomains?: string[];
  };
  
  // Notifications
  notificationSettings: {
    notifyOnNewMember: boolean;
    notifyOnRoleChange: boolean;
    notifyOnSuspension: boolean;
    emailNotifications: boolean;
    slackWebhook?: string;
  };
}

// ========================================
// Component Props Interfaces
// ========================================

/**
 * Team List Component Props
 */
export interface TeamListProps {
  members: TeamMember[];
  loading?: boolean;
  onRoleChange: (member: TeamMember, newRole: UserRole) => Promise<void>;
  onRemoveMember: (member: TeamMember) => Promise<void>;
  onResendInvite: (member: TeamMember) => Promise<void>;
  currentUserId: string;
  permissions: Permission[];
}

/**
 * Team Invitation Modal Props
 */
export interface TeamInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: UserRole, options?: {
    restrictedToCompanyIds?: string[];
    expiresAt?: Date;
  }) => Promise<void>;
  loading?: boolean;
  availableRoles: UserRole[];
  availableCompanies?: Array<{ id: string; name: string }>;
}

/**
 * Team Statistics Card Props
 */
export interface TeamStatisticsProps {
  statistics: TeamStatistics;
  loading?: boolean;
  timeframe?: 'day' | 'week' | 'month';
}

/**
 * Team Role Selector Props
 */
export interface TeamRoleSelectorProps {
  currentRole: UserRole;
  availableRoles: UserRole[];
  onChange: (newRole: UserRole) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

/**
 * Team Bulk Actions Props
 */
export interface TeamBulkActionsProps {
  selectedMembers: TeamMember[];
  onBulkOperation: (operation: BulkTeamOperation) => Promise<void>;
  onClearSelection: () => void;
  loading?: boolean;
}

// ========================================
// Service Response Types  
// ========================================

/**
 * Team Invitation Response
 */
export interface TeamInvitationResponse {
  memberId: string;
  invitationToken: string;
  invitationUrl: string;
  expiresAt: Date;
}

/**
 * Team Member Search Result
 */
export interface TeamMemberSearchResult {
  members: TeamMember[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Team Validation Result
 */
export interface TeamValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

// ========================================
// Constants
// ========================================

/**
 * Team Role Configuration
 */
export const TEAM_ROLE_CONFIG: Record<UserRole, {
  label: string;
  icon: string;
  color: 'purple' | 'blue' | 'green' | 'gray';
  description: string;
  permissions: Permission[];
}> = {
  owner: {
    label: 'Owner',
    icon: 'ShieldCheckIcon',
    color: 'purple',
    description: 'Vollzugriff auf alle Funktionen',
    permissions: ROLE_PERMISSIONS.owner
  },
  admin: {
    label: 'Admin',
    icon: 'UserGroupIcon',
    color: 'blue',
    description: 'Kann Team und Einstellungen verwalten',
    permissions: ROLE_PERMISSIONS.admin
  },
  member: {
    label: 'Mitglied',
    icon: 'UserIcon',
    color: 'green',
    description: 'Kann PR-Kampagnen erstellen und versenden',
    permissions: ROLE_PERMISSIONS.member
  },
  client: {
    label: 'Kunde',
    icon: 'BuildingOfficeIcon',
    color: 'gray',
    description: 'Nur Lesezugriff auf eigene Kampagnen',
    permissions: ROLE_PERMISSIONS.client
  },
  guest: {
    label: 'Gast',
    icon: 'UserIcon',
    color: 'gray',
    description: 'Eingeschränkter Lesezugriff',
    permissions: ROLE_PERMISSIONS.guest
  }
};

/**
 * Team Status Configuration
 */
export const TEAM_STATUS_CONFIG: Record<TeamMember['status'], {
  label: string;
  icon: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
}> = {
  active: {
    label: 'Aktiv',
    icon: 'CheckCircleIcon',
    color: 'green'
  },
  invited: {
    label: 'Eingeladen',
    icon: 'EnvelopeIcon',
    color: 'yellow'
  },
  inactive: {
    label: 'Inaktiv',
    icon: 'XCircleIcon',
    color: 'red'
  },
  suspended: {
    label: 'Gesperrt',
    icon: 'ExclamationTriangleIcon',
    color: 'red'
  }
};

/**
 * Team Constants
 */
export const TEAM_CONSTANTS = {
  MAX_MEMBERS_FREE: 3,
  MAX_MEMBERS_STARTER: 10,
  MAX_MEMBERS_PRO: 50,
  MAX_MEMBERS_ENTERPRISE: 500,
  
  INVITATION_EXPIRY_DAYS: 7,
  MAX_PENDING_INVITATIONS: 20,
  
  SESSION_TIMEOUT_MINUTES: 480, // 8 Stunden
  BULK_OPERATION_LIMIT: 50,
  
  ACTIVITY_LOG_RETENTION_DAYS: 90,
  STATISTICS_CACHE_MINUTES: 15,
} as const;

// ========================================
// Helper Functions
// ========================================

/**
 * Prüft ob ein User eine bestimmte Permission hat
 */
export function hasTeamPermission(
  member: TeamMember, 
  permission: Permission
): boolean {
  // Custom permissions überschreiben Rollen-Permissions
  if (member.customPermissions) {
    return member.customPermissions.includes(permission);
  }
  
  // Sonst Rollen-basiert
  return ROLE_PERMISSIONS[member.role]?.includes(permission) || false;
}

/**
 * Formatiert letzten Login/Aktivität
 */
export function formatLastActive(timestamp?: any): string {
  if (!timestamp) return 'Nie';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
    
    return date.toLocaleDateString('de-DE');
  } catch {
    return 'Nie';
  }
}

/**
 * Formatiert Beitrittsdatum
 */
export function formatJoinedDate(timestamp?: any): string {
  if (!timestamp) return '-';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE');
  } catch {
    return '-';
  }
}

/**
 * Prüft ob ein Mitglied entfernt werden kann
 */
export function canRemoveMember(member: TeamMember, currentUserId: string): boolean {
  // Owner kann nicht entfernt werden
  if (member.role === 'owner') return false;
  
  // User kann sich nicht selbst entfernen
  if (member.userId === currentUserId) return false;
  
  return true;
}

/**
 * Prüft ob die Rolle eines Mitglieds geändert werden kann
 */
export function canChangeRole(member: TeamMember, currentUserId: string): boolean {
  // Owner-Rolle kann nicht geändert werden
  if (member.role === 'owner') return false;
  
  // User kann seine eigene Rolle nicht ändern
  if (member.userId === currentUserId) return false;
  
  return true;
}

/**
 * Berechnet Team-Statistiken
 */
export function calculateTeamStatistics(members: TeamMember[]): TeamStatistics {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingInvitations = members.filter(m => m.status === 'invited');

  // Rolle-Verteilung
  const roleDistribution = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  // Aktivität
  const dailyActive = activeMembers.filter(m => 
    m.lastActiveAt && (now.getTime() - m.lastActiveAt.toDate().getTime()) < oneDay
  ).length;

  const weeklyActive = activeMembers.filter(m =>
    m.lastActiveAt && (now.getTime() - m.lastActiveAt.toDate().getTime()) < oneWeek
  ).length;

  const monthlyActive = activeMembers.filter(m =>
    m.lastActiveAt && (now.getTime() - m.lastActiveAt.toDate().getTime()) < oneMonth
  ).length;

  // Neue Mitglieder
  const newMembersThisMonth = members.filter(m =>
    m.joinedAt && (now.getTime() - m.joinedAt.toDate().getTime()) < oneMonth
  ).length;

  return {
    totalMembers: members.length,
    activeMembers: activeMembers.length,
    pendingInvitations: pendingInvitations.length,
    roleDistribution,
    dailyActiveUsers: dailyActive,
    weeklyActiveUsers: weeklyActive,
    monthlyActiveUsers: monthlyActive,
    newMembersThisMonth,
    membersTurnover: 0 // TODO: Berechnung implementieren
  };
}

export default TEAM_ROLE_CONFIG;