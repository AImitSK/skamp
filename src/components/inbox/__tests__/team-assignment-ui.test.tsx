// src/components/inbox/__tests__/team-assignment-ui.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { TeamAssignmentUI } from '../TeamAssignmentUI';
import { EmailThread } from '@/types/inbox-enhanced';
import { TeamMember } from '@/types/international';

// Mock services
jest.mock('@/lib/firebase/organization-service', () => ({
  teamMemberService: {
    getByOrganization: jest.fn()
  }
}));

jest.mock('@/lib/email/thread-matcher-service-flexible', () => ({
  threadMatcherService: {
    getAssignedThreadsCount: jest.fn()
  }
}));

const { teamMemberService } = require('@/lib/firebase/organization-service');
const { threadMatcherService } = require('@/lib/email/thread-matcher-service-flexible');

describe('TeamAssignmentUI - Team-Management Tests', () => {
  const TEST_ORG_ID = 'test-org-123';
  const TEST_USER_ID = 'test-user-456';
  
  const createTestThread = (): EmailThread => ({
    id: 'test-thread-123',
    organizationId: TEST_ORG_ID,
    userId: TEST_USER_ID,
    subject: 'Test E-Mail Thread',
    participants: [
      { email: 'sender@example.com', name: 'Test Sender' },
      { email: 'receiver@celeropress.com', name: 'Test Receiver' }
    ],
    lastMessageAt: { toDate: () => new Date() } as any,
    messageCount: 3,
    unreadCount: 1,
    contactIds: [],
    folderType: 'general' as any,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any
  });

  const createTestTeamMembers = (): TeamMember[] => [
    {
      id: 'member-1',
      userId: 'user-1',
      organizationId: TEST_ORG_ID,
      displayName: 'Max Mustermann',
      email: 'max@celeropress.com',
      role: 'admin',
      status: 'active',
      joinedAt: { toDate: () => new Date() } as any,
      permissions: []
    },
    {
      id: 'member-2',
      userId: 'user-2',
      organizationId: TEST_ORG_ID,
      displayName: 'Lisa Schmidt',
      email: 'lisa@celeropress.com',
      role: 'member',
      status: 'active',
      joinedAt: { toDate: () => new Date() } as any,
      permissions: []
    },
    {
      id: 'member-3',
      userId: 'user-3',
      organizationId: TEST_ORG_ID,
      displayName: 'Stefan Weber',
      email: 'stefan@celeropress.com',
      role: 'member',
      status: 'active',
      joinedAt: { toDate: () => new Date() } as any,
      permissions: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    teamMemberService.getByOrganization.mockResolvedValue(createTestTeamMembers());
    threadMatcherService.getAssignedThreadsCount.mockResolvedValue(2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Team Member Loading & Display', () => {
    it('should load and display team members for organization', async () => {
      const testThread = createTestThread();
      const mockOnAssignmentChange = jest.fn();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={mockOnAssignmentChange}
        />
      );

      // Should show loading initially
      expect(screen.getByTitle(/Loading/i) || screen.getByText(/Loading/i)).toBeInTheDocument();

      // Wait for team members to load
      await waitFor(() => {
        expect(teamMemberService.getByOrganization).toHaveBeenCalledWith(TEST_ORG_ID);
      });

      // Should display team members after loading
      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.getByText('Lisa Schmidt')).toBeInTheDocument();
        expect(screen.getByText('Stefan Weber')).toBeInTheDocument();
      });
    });

    it('should display workload statistics for team members', async () => {
      const testThread = createTestThread();
      threadMatcherService.getAssignedThreadsCount
        .mockResolvedValueOnce(0) // Max - Available
        .mockResolvedValueOnce(3) // Lisa - Normal
        .mockResolvedValueOnce(7); // Stefan - Overloaded

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          showHistory={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      // Check workload stats are calculated
      expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledTimes(3);
      expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledWith(TEST_ORG_ID, 'user-1');
      expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledWith(TEST_ORG_ID, 'user-2');
      expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledWith(TEST_ORG_ID, 'user-3');
    });

    it('should show "Nicht zugewiesen" when no assignment', async () => {
      const testThread = createTestThread();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          compact={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nicht zugewiesen')).toBeInTheDocument();
      });
    });
  });

  describe('Assignment Operations', () => {
    it('should assign thread to team member', async () => {
      const testThread = createTestThread();
      const mockOnAssignmentChange = jest.fn().mockResolvedValue(undefined);

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={mockOnAssignmentChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      // Click on assignment button/dropdown
      const assignmentButton = screen.getByRole('button');
      fireEvent.click(assignmentButton);

      await waitFor(() => {
        // Look for team member in dropdown/assignment UI
        const maxButton = screen.getByText('Max Mustermann');
        fireEvent.click(maxButton);
      });

      // Should call assignment change
      await waitFor(() => {
        expect(mockOnAssignmentChange).toHaveBeenCalledWith('test-thread-123', 'user-1');
      });
    });

    it('should remove assignment from thread', async () => {
      // Create thread with existing assignment
      const testThread = {
        ...createTestThread(),
        assignedTo: 'user-1' // Already assigned to Max
      };
      const mockOnAssignmentChange = jest.fn().mockResolvedValue(undefined);

      render(
        <TeamAssignmentUI 
          thread={testThread as any}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={mockOnAssignmentChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      // Find and click remove assignment button
      const removeButton = screen.getByTitle(/entfernen/i) || screen.getByText(/entfernen/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnAssignmentChange).toHaveBeenCalledWith('test-thread-123', null);
      });
    });

    it('should handle assignment errors gracefully', async () => {
      const testThread = createTestThread();
      const mockOnAssignmentChange = jest.fn().mockRejectedValue(new Error('Assignment failed'));

      // Mock console.error to prevent test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={mockOnAssignmentChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      const assignmentButton = screen.getByRole('button');
      fireEvent.click(assignmentButton);

      await waitFor(() => {
        const maxButton = screen.getByText('Max Mustermann');
        fireEvent.click(maxButton);
      });

      // Should handle error without crashing
      await waitFor(() => {
        expect(mockOnAssignmentChange).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Error assigning thread:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Workload Management', () => {
    it('should display workload levels correctly', async () => {
      const testThread = createTestThread();
      
      // Mock different workload levels
      threadMatcherService.getAssignedThreadsCount
        .mockResolvedValueOnce(0)  // Available
        .mockResolvedValueOnce(2)  // Normal 
        .mockResolvedValueOnce(8); // Overloaded

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          showHistory={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      // Wait for workload calculation
      await waitFor(() => {
        expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledTimes(3);
      });
    });

    it('should refresh workload stats after assignment', async () => {
      const testThread = createTestThread();
      const mockOnAssignmentChange = jest.fn().mockResolvedValue(undefined);

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={mockOnAssignmentChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });

      // First load should call workload stats
      expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledTimes(3);

      // Assign to team member
      const assignmentButton = screen.getByRole('button');
      fireEvent.click(assignmentButton);

      await waitFor(() => {
        const maxButton = screen.getByText('Max Mustermann');
        fireEvent.click(maxButton);
      });

      // Should refresh workload stats after assignment
      await waitFor(() => {
        expect(threadMatcherService.getAssignedThreadsCount).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh
      });
    });
  });

  describe('UI Variants & States', () => {
    it('should render compact view correctly', async () => {
      const testThread = createTestThread();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          compact={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nicht zugewiesen')).toBeInTheDocument();
      });

      // Compact view should not show full team list initially
      expect(screen.queryByText('Team-Zuweisung')).not.toBeInTheDocument();
    });

    it('should render full view with team assignment header', async () => {
      const testThread = createTestThread();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          compact={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Team-Zuweisung')).toBeInTheDocument();
        expect(screen.getByText('Team-Mitglieder:')).toBeInTheDocument();
      });
    });

    it('should show assigned member details', async () => {
      const testThread = {
        ...createTestThread(),
        assignedTo: 'user-1'
      };

      render(
        <TeamAssignmentUI 
          thread={testThread as any}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
          compact={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.getByText('max@celeropress.com')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle team member loading failure', async () => {
      const testThread = createTestThread();
      teamMemberService.getByOrganization.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(teamMemberService.getByOrganization).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Error loading team members:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle empty team member list', async () => {
      const testThread = createTestThread();
      teamMemberService.getByOrganization.mockResolvedValue([]);

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nicht zugewiesen')).toBeInTheDocument();
      });

      // Should not crash with empty team
      expect(screen.queryByText('Team-Mitglieder:')).toBeInTheDocument();
    });

    it('should filter out inactive team members', async () => {
      const testThread = createTestThread();
      const teamMembersWithInactive = [
        ...createTestTeamMembers(),
        {
          id: 'inactive-member',
          userId: 'inactive-user',
          organizationId: TEST_ORG_ID,
          displayName: 'Inactive User',
          email: 'inactive@celeropress.com',
          role: 'member' as any,
          status: 'inactive' as any,
          joinedAt: { toDate: () => new Date() } as any,
          permissions: []
        }
      ];
      
      teamMemberService.getByOrganization.mockResolvedValue(teamMembersWithInactive);

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.getByText('Lisa Schmidt')).toBeInTheDocument();
        expect(screen.getByText('Stefan Weber')).toBeInTheDocument();
      });

      // Inactive member should not be shown
      expect(screen.queryByText('Inactive User')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Tenancy & Security', () => {
    it('should only load team members for correct organization', async () => {
      const testThread = createTestThread();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId={TEST_ORG_ID}
          onAssignmentChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(teamMemberService.getByOrganization).toHaveBeenCalledWith(TEST_ORG_ID);
        expect(teamMemberService.getByOrganization).toHaveBeenCalledTimes(1);
      });
    });

    it('should not load team members without organizationId', async () => {
      const testThread = createTestThread();

      render(
        <TeamAssignmentUI 
          thread={testThread}
          organizationId=""
          onAssignmentChange={jest.fn()}
        />
      );

      // Should not call service with empty org ID
      await waitFor(() => {
        expect(teamMemberService.getByOrganization).not.toHaveBeenCalled();
      });
    });
  });
});