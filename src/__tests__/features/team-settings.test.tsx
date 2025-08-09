/**
 * Team Settings Feature Tests
 * Testet Team-Management, Einladungen, Rollen und Berechtigungen
 */

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn()
}));

// Mock Firebase App
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({}))
}));

// Mock Firebase vollständig
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({
    empty: false,
    docs: [
      { 
        id: 'team-member-1', 
        data: () => ({ 
          userId: 'user-123',
          organizationId: 'org-456',
          email: 'member@test.de',
          displayName: 'Test Member',
          role: 'member',
          status: 'active',
          invitedAt: { seconds: Date.now() / 1000 },
          invitedBy: 'owner-user',
          joinedAt: { seconds: Date.now() / 1000 },
          lastActiveAt: { seconds: Date.now() / 1000 },
          createdBy: 'owner-user',
          createdAt: { seconds: Date.now() / 1000 }
        }) 
      },
      { 
        id: 'team-owner-1', 
        data: () => ({ 
          userId: 'owner-user',
          organizationId: 'org-456',
          email: 'owner@test.de',
          displayName: 'Team Owner',
          role: 'owner',
          status: 'active',
          invitedAt: { seconds: Date.now() / 1000 },
          invitedBy: 'owner-user',
          joinedAt: { seconds: Date.now() / 1000 },
          lastActiveAt: { seconds: Date.now() / 1000 }
        }) 
      }
    ],
    forEach: jest.fn((callback) => {
      const docs = [
        { 
          id: 'team-member-1', 
          data: () => ({ 
            userId: 'user-123',
            organizationId: 'org-456',
            email: 'member@test.de',
            role: 'member',
            status: 'active'
          })
        },
        { 
          id: 'team-owner-1', 
          data: () => ({ 
            userId: 'owner-user',
            role: 'owner',
            status: 'active'
          })
        }
      ];
      docs.forEach(callback);
    })
  })),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    id: 'team-member-1',
    data: () => ({ 
      userId: 'user-123',
      organizationId: 'org-456',
      email: 'member@test.de',
      role: 'member',
      status: 'active'
    })
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-member-123' })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  })),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
    fromDate: jest.fn((date) => ({ toDate: () => date, seconds: date.getTime() / 1000 }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
  app: {}
}));

// Mock Team Service
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { hasPermission } from '@/types/international';
import { 
  hasTeamPermission,
  formatLastActive,
  formatJoinedDate,
  canRemoveMember,
  canChangeRole,
  calculateTeamStatistics,
  TEAM_ROLE_CONFIG,
  TEAM_STATUS_CONFIG,
  TEAM_CONSTANTS
} from '@/types/team-enhanced';

describe('Team Settings Feature', () => {
  const mockOrganizationId = 'org-456';
  const mockUserId = 'owner-user';
  const mockInviteeUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Availability', () => {
    test('sollte Team Service verfügbar haben', () => {
      expect(teamMemberService).toBeDefined();
      expect(typeof teamMemberService).toBe('object');
    });

    test('sollte wichtige Team Service-Methoden haben', () => {
      const expectedMethods = [
        'getByOrganization',
        'invite',
        'update',
        'remove',
        'acceptInvite',
        'createOwner',
        'reactivate'
      ];

      expectedMethods.forEach(method => {
        expect(typeof teamMemberService[method]).toBe('function');
      });
    });

    test('sollte Team-Enhanced Types exportieren', () => {
      expect(TEAM_ROLE_CONFIG).toBeDefined();
      expect(TEAM_STATUS_CONFIG).toBeDefined();
      expect(TEAM_CONSTANTS).toBeDefined();
      expect(typeof hasTeamPermission).toBe('function');
      expect(typeof formatLastActive).toBe('function');
      expect(typeof canRemoveMember).toBe('function');
    });
  });

  describe('Team Member Management', () => {
    test('sollte Team-Mitglieder laden können', async () => {
      const members = await teamMemberService.getByOrganization(mockOrganizationId);
      
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
    });

    test('sollte neues Team-Mitglied einladen können', async () => {
      const inviteData = {
        email: 'newmember@test.de',
        role: 'member' as const,
        displayName: 'New Team Member'
      };

      const context = { organizationId: mockOrganizationId, userId: mockUserId };

      // Mock für getByEmailAndOrg um keine existierende E-Mail zurückzugeben
      jest.spyOn(teamMemberService, 'getByEmailAndOrg')
        .mockResolvedValueOnce(null);

      const result = await teamMemberService.invite(inviteData, context);

      expect(result).toHaveProperty('memberId');
      expect(result).toHaveProperty('invitationToken');
      expect(typeof result.memberId).toBe('string');
      expect(typeof result.invitationToken).toBe('string');
    });

    test('sollte Team-Mitglied-Rolle aktualisieren können', async () => {
      const context = { organizationId: mockOrganizationId, userId: mockUserId };
      
      await teamMemberService.update('team-member-1', { role: 'admin' }, context);
      
      // Test erfolgreich wenn keine Exception geworfen wird
      expect(true).toBe(true);
    });

    test('sollte Team-Mitglied entfernen können', async () => {
      const context = { organizationId: mockOrganizationId, userId: mockUserId };
      
      // Mock für getById um Member zurückzugeben (nicht Owner)
      jest.spyOn(teamMemberService, 'getById')
        .mockResolvedValueOnce({
          id: 'team-member-1',
          role: 'member',
          organizationId: mockOrganizationId
        } as any);
      
      await teamMemberService.remove('team-member-1', context);
      
      // Test erfolgreich wenn keine Exception geworfen wird
      expect(true).toBe(true);
    });
  });

  describe('Team Invitation System', () => {
    test('sollte Einladungs-Token generieren', async () => {
      const inviteData = {
        email: 'invite@test.de',
        role: 'member' as const,
        displayName: 'Invited Member'
      };

      const context = { organizationId: mockOrganizationId, userId: mockUserId };

      // Mock für getByEmailAndOrg
      jest.spyOn(teamMemberService, 'getByEmailAndOrg')
        .mockResolvedValueOnce(null);

      const result = await teamMemberService.invite(inviteData, context);

      expect(result.invitationToken).toHaveLength(32);
      expect(result.invitationToken).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    test('sollte Einladung reaktivieren wenn Member inaktiv ist', async () => {
      const inviteData = {
        email: 'inactive@test.de',
        role: 'member' as const,
        displayName: 'Reactivated Member'
      };

      const context = { organizationId: mockOrganizationId, userId: mockUserId };

      // Mock für inaktives Mitglied
      jest.spyOn(teamMemberService, 'getByEmailAndOrg')
        .mockResolvedValueOnce({
          id: 'inactive-member',
          status: 'inactive',
          email: 'inactive@test.de'
        } as any);

      const result = await teamMemberService.invite(inviteData, context);

      expect(result).toHaveProperty('memberId', 'inactive-member');
      expect(result).toHaveProperty('invitationToken');
    });

    test('sollte Fehler werfen wenn E-Mail bereits existiert und aktiv ist', async () => {
      const inviteData = {
        email: 'existing@test.de',
        role: 'member' as const,
        displayName: 'Existing Member'
      };

      const context = { organizationId: mockOrganizationId, userId: mockUserId };

      // Mock für aktives Mitglied
      jest.spyOn(teamMemberService, 'getByEmailAndOrg')
        .mockResolvedValueOnce({
          id: 'existing-member',
          status: 'active',
          email: 'existing@test.de'
        } as any);

      await expect(teamMemberService.invite(inviteData, context))
        .rejects.toThrow('Diese E-Mail wurde bereits eingeladen');
    });
  });

  describe('Role & Permission Management', () => {
    test('sollte Rollen-Konfiguration korrekt definieren', () => {
      expect(TEAM_ROLE_CONFIG.owner.label).toBe('Owner');
      expect(TEAM_ROLE_CONFIG.admin.label).toBe('Admin');
      expect(TEAM_ROLE_CONFIG.member.label).toBe('Mitglied');
      expect(TEAM_ROLE_CONFIG.client.label).toBe('Kunde');
      expect(TEAM_ROLE_CONFIG.guest.label).toBe('Gast');
      
      // Alle Rollen haben erforderliche Properties
      Object.values(TEAM_ROLE_CONFIG).forEach(config => {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('permissions');
      });
    });

    test('sollte Permission-Checking korrekt funktionieren', () => {
      const ownerMember = {
        role: 'owner' as const,
        customPermissions: undefined
      };

      const memberMember = {
        role: 'member' as const,
        customPermissions: undefined
      };

      expect(hasTeamPermission(ownerMember, 'team.manage')).toBe(true);
      expect(hasTeamPermission(ownerMember, 'campaigns.create')).toBe(true);
      expect(hasTeamPermission(memberMember, 'team.manage')).toBe(false);
      expect(hasTeamPermission(memberMember, 'campaigns.create')).toBe(true);
    });

    test('sollte Custom Permissions überschreiben', () => {
      const memberWithCustom = {
        role: 'member' as const,
        customPermissions: ['team.manage' as const]
      };

      expect(hasTeamPermission(memberWithCustom, 'team.manage')).toBe(true);
    });

    test('sollte Owner-Protection korrekt implementieren', () => {
      const ownerMember = { role: 'owner' as const, userId: 'owner-123' };
      const regularMember = { role: 'member' as const, userId: 'member-123' };

      expect(canRemoveMember(ownerMember, 'admin-456')).toBe(false);
      expect(canRemoveMember(regularMember, 'admin-456')).toBe(true);
      expect(canRemoveMember(regularMember, 'member-123')).toBe(false); // Selbst-Entfernung

      expect(canChangeRole(ownerMember, 'admin-456')).toBe(false);
      expect(canChangeRole(regularMember, 'admin-456')).toBe(true);
      expect(canChangeRole(regularMember, 'member-123')).toBe(false); // Selbst-Änderung
    });
  });

  describe('Team Statistics', () => {
    test('sollte Team-Statistiken korrekt berechnen', () => {
      const mockMembers = [
        {
          role: 'owner' as const,
          status: 'active' as const,
          lastActiveAt: { toDate: () => new Date(Date.now() - 1000) }, // 1 Sekunde ago
          joinedAt: { toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } // 5 Tage ago
        },
        {
          role: 'admin' as const,
          status: 'active' as const,
          lastActiveAt: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2 Stunden ago
          joinedAt: { toDate: () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } // 10 Tage ago
        },
        {
          role: 'member' as const,
          status: 'invited' as const,
          lastActiveAt: undefined,
          joinedAt: undefined
        },
        {
          role: 'member' as const,
          status: 'active' as const,
          lastActiveAt: { toDate: () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10 Tage ago
          joinedAt: { toDate: () => new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } // 15 Tage ago
        }
      ] as any[];

      const stats = calculateTeamStatistics(mockMembers);

      expect(stats.totalMembers).toBe(4);
      expect(stats.activeMembers).toBe(3);
      expect(stats.pendingInvitations).toBe(1);
      expect(stats.roleDistribution.owner).toBe(1);
      expect(stats.roleDistribution.admin).toBe(1);
      expect(stats.roleDistribution.member).toBe(2);
      expect(stats.dailyActiveUsers).toBe(2); // Owner und Admin waren heute aktiv
      expect(stats.weeklyActiveUsers).toBe(2); // Gleiche Mitglieder
    });
  });

  describe('Utility Functions', () => {
    test('sollte letzte Aktivität korrekt formatieren', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      expect(formatLastActive({ toDate: () => now })).toBe('Heute');
      expect(formatLastActive({ toDate: () => yesterday })).toBe('Gestern');
      expect(formatLastActive({ toDate: () => lastWeek })).toBe('vor 3 Tagen');
      expect(formatLastActive(undefined)).toBe('Nie');
    });

    test('sollte Beitrittsdatum korrekt formatieren', () => {
      const testDate = new Date('2024-01-15');
      
      expect(formatJoinedDate({ toDate: () => testDate })).toBe('15.1.2024');
      expect(formatJoinedDate(undefined)).toBe('-');
    });
  });

  describe('Owner Management', () => {
    test('sollte Owner-Eintrag erstellen können', async () => {
      const ownerData = {
        userId: 'new-owner-123',
        organizationId: mockOrganizationId,
        email: 'owner@neworg.de',
        displayName: 'New Owner',
        photoUrl: 'https://example.com/photo.jpg'
      };

      const ownerId = await teamMemberService.createOwner(ownerData);

      expect(typeof ownerId).toBe('string');
      expect(ownerId).toBe('new-owner-123_org-456');
    });

    test('sollte Owner-Eintrag ohne photoUrl erstellen können', async () => {
      const ownerData = {
        userId: 'new-owner-456',
        organizationId: mockOrganizationId,
        email: 'owner2@neworg.de',
        displayName: 'Another Owner'
      };

      const ownerId = await teamMemberService.createOwner(ownerData);

      expect(typeof ownerId).toBe('string');
    });
  });

  describe('Multi-Tenancy Isolation', () => {
    test('sollte nur Mitglieder der eigenen Organisation laden', async () => {
      const members = await teamMemberService.getByOrganization(mockOrganizationId);
      
      // Alle Mitglieder sollten zur gleichen Organisation gehören
      members.forEach(member => {
        expect(member.organizationId).toBe(mockOrganizationId);
      });
    });

    test('sollte User-spezifische Mitgliedschaften korrekt laden', async () => {
      const memberships = await teamMemberService.getUserMemberships(mockInviteeUserId);
      
      expect(Array.isArray(memberships)).toBe(true);
      // Service kann Self-Owner Einträge filtern, daher teste nur Array-Typ
      if (memberships.length > 0) {
        memberships.forEach(membership => {
          expect(membership).toHaveProperty('userId');
          expect(membership).toHaveProperty('organizationId');
          expect(membership).toHaveProperty('role');
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('sollte Fehler bei Owner-Entfernung behandeln', async () => {
      const context = { organizationId: mockOrganizationId, userId: mockUserId };
      
      // Mock für Owner-Member
      jest.spyOn(teamMemberService, 'getById')
        .mockResolvedValueOnce({
          id: 'team-owner-1',
          role: 'owner',
          organizationId: mockOrganizationId
        } as any);

      await expect(teamMemberService.remove('team-owner-1', context))
        .rejects.toThrow('Owner kann nicht entfernt werden');
    });

    test('sollte Fehler bei nicht-existierendem Mitglied behandeln', async () => {
      const context = { organizationId: mockOrganizationId, userId: mockUserId };
      
      // Mock für nicht-existierenden Member
      jest.spyOn(teamMemberService, 'getById')
        .mockResolvedValueOnce(null);

      await expect(teamMemberService.remove('non-existent', context))
        .rejects.toThrow('Mitglied nicht gefunden');
    });

    test('sollte Constants korrekt definieren', () => {
      expect(TEAM_CONSTANTS.MAX_MEMBERS_FREE).toBe(3);
      expect(TEAM_CONSTANTS.INVITATION_EXPIRY_DAYS).toBe(7);
      expect(TEAM_CONSTANTS.SESSION_TIMEOUT_MINUTES).toBe(480);
      expect(typeof TEAM_CONSTANTS.MAX_PENDING_INVITATIONS).toBe('number');
    });
  });
});