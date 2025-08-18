// src/__tests__/features/communication-notifications.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotifications, useNotificationSettings } from '@/hooks/use-notifications';
import { TestWrapper } from '../test-utils';
import { NotificationsPage } from '@/app/dashboard/communication/notifications/page';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { AuthProvider } from '@/context/AuthContext';

// Mock Firebase
jest.mock('@/lib/firebase/notifications-service');

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/communication/notifications'
}));

const mockNotificationsService = notificationsService as jest.Mocked<typeof notificationsService>;

// Mock Data
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org'
};

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'test-user-123',
    organizationId: 'org-123',
    type: 'APPROVAL_GRANTED' as const,
    title: 'Freigabe erteilt',
    message: 'Max Mustermann hat die Freigabe für "Kampagne 2024" erteilt.',
    linkUrl: '/dashboard/pr-kampagnen/campaign-123',
    linkType: 'campaign' as const,
    linkId: 'campaign-123',
    isRead: false,
    metadata: {
      campaignId: 'campaign-123',
      campaignTitle: 'Kampagne 2024',
      senderName: 'Max Mustermann'
    },
    createdAt: {
      toDate: () => new Date('2024-01-15T10:00:00Z')
    } as any
  },
  {
    id: 'notif-2',
    userId: 'test-user-123',
    organizationId: 'org-123',
    type: 'EMAIL_SENT_SUCCESS' as const,
    title: 'E-Mail versendet',
    message: 'Deine Kampagne "Newsletter Januar" wurde erfolgreich an 150 Kontakte versendet.',
    linkUrl: '/dashboard/schedule-mails/campaign-456',
    linkType: 'campaign' as const,
    linkId: 'campaign-456',
    isRead: true,
    metadata: {
      campaignId: 'campaign-456',
      campaignTitle: 'Newsletter Januar',
      recipientCount: 150
    },
    createdAt: {
      toDate: () => new Date('2024-01-14T15:30:00Z')
    } as any
  }
];

const mockSettings = {
  id: 'org-123_test-user-123',
  userId: 'test-user-123',
  organizationId: 'org-123',
  approvalGranted: true,
  changesRequested: true,
  overdueApprovals: true,
  overdueApprovalDays: 3,
  emailSentSuccess: true,
  emailBounced: true,
  taskOverdue: true,
  mediaFirstAccess: true,
  mediaDownloaded: true,
  mediaLinkExpired: true,
  createdAt: new Date('2024-01-01T00:00:00Z') as any,
  updatedAt: new Date('2024-01-15T00:00:00Z') as any
};

// Simplified test approach focusing on components and service integration

describe('Communication Notifications System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockNotificationsService.getAll.mockResolvedValue(mockNotifications);
    mockNotificationsService.getUnreadCount.mockResolvedValue(1);
    mockNotificationsService.getSettings.mockResolvedValue(mockSettings);
    mockNotificationsService.markAsRead.mockResolvedValue();
    mockNotificationsService.markAllAsRead.mockResolvedValue();
    mockNotificationsService.delete.mockResolvedValue();
    mockNotificationsService.bulkMarkAsRead.mockResolvedValue();
    mockNotificationsService.bulkDelete.mockResolvedValue();
    mockNotificationsService.updateSettings.mockResolvedValue();
  });

  describe('NotificationsService Integration', () => {
    test('should load notifications with organization context', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotificationsService.getAll).toHaveBeenCalledWith(
        'test-user-123',
        50,
        'org-123'
      );
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
    });

    test('should handle service errors gracefully', async () => {
      mockNotificationsService.getAll.mockRejectedValue(new Error('Service error'));
      
      const { result } = renderHook(() => useNotifications(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Fehler beim Laden der Benachrichtigungen');
      expect(result.current.notifications).toHaveLength(0);
    });

    test('should support bulk operations', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Bulk mark as read
      await act(async () => {
        await result.current.bulkMarkAsRead(['notif-1', 'notif-2']);
      });

      expect(mockNotificationsService.bulkMarkAsRead).toHaveBeenCalledWith(['notif-1', 'notif-2']);

      // Bulk delete
      await act(async () => {
        await result.current.bulkDelete(['notif-1']);
      });

      expect(mockNotificationsService.bulkDelete).toHaveBeenCalledWith(['notif-1']);
    });
  });

  describe('NotificationList Component', () => {
    test('should render notifications correctly', async () => {
      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
        expect(screen.getByText('E-Mail versendet')).toBeInTheDocument();
      });

      // Should show unread indicator
      expect(screen.getByText('1 ungelesene Benachrichtigung')).toBeInTheDocument();
      
      // Should show mark all as read button
      expect(screen.getByText('Alle als gelesen markieren')).toBeInTheDocument();
    });

    test('should handle mark all as read', async () => {
      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Alle als gelesen markieren')).toBeInTheDocument();
      });

      const markAllButton = screen.getByText('Alle als gelesen markieren');
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(
          'test-user-123',
          'org-123'
        );
      });
    });

    test('should show empty state when no notifications', async () => {
      mockNotificationsService.getAll.mockResolvedValue([]);
      
      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Keine Benachrichtigungen')).toBeInTheDocument();
        expect(screen.getByText('Hier werden deine Benachrichtigungen angezeigt.')).toBeInTheDocument();
      });
    });

    test('should show loading state', async () => {
      // Delay the resolve to test loading state
      mockNotificationsService.getAll.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockNotifications), 100))
      );

      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      expect(screen.getByText('Benachrichtigungen werden geladen...')).toBeInTheDocument();
    });

    test('should show error state', async () => {
      mockNotificationsService.getAll.mockRejectedValue(new Error('Test error'));

      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden der Benachrichtigungen')).toBeInTheDocument();
      });
    });
  });

  describe('NotificationItem Component', () => {
    const mockNotification = mockNotifications[0];
    const mockOnMarkAsRead = jest.fn();
    const mockOnDelete = jest.fn();

    test('should render notification item correctly', () => {
      render(
        <TestWrapper>
          <NotificationItem 
            notification={mockNotification}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann hat die Freigabe für "Kampagne 2024" erteilt.')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    test('should show unread indicator for unread notifications', () => {
      render(
        <TestWrapper>
          <NotificationItem 
            notification={mockNotification}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      // Check for unread styling (blue background)
      const notificationElement = screen.getByRole('button');
      expect(notificationElement).toHaveClass('bg-blue-50/30');
    });

    test('should handle click to mark as read and navigate', async () => {
      const mockPush = jest.fn();
      jest.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

      render(
        <TestWrapper>
          <NotificationItem 
            notification={mockNotification}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      const notificationElement = screen.getByRole('button');
      fireEvent.click(notificationElement);

      await waitFor(() => {
        expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif-1');
        expect(mockPush).toHaveBeenCalledWith('/dashboard/pr-kampagnen/campaign-123');
      });
    });

    test('should handle delete action', async () => {
      render(
        <TestWrapper>
          <NotificationItem 
            notification={mockNotification}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      const deleteButton = screen.getByLabelText('Benachrichtigung löschen');
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('notif-1');
    });

    test('should display relative time correctly', () => {
      render(
        <TestWrapper>
          <NotificationItem 
            notification={mockNotification}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      // Should show relative time (mocked to a recent date)
      expect(screen.getByText(/vor/)).toBeInTheDocument();
    });

    test('should show metadata badges', () => {
      const notificationWithMetadata = {
        ...mockNotifications[1], // Email notification with recipient count
        metadata: {
          ...mockNotifications[1].metadata,
          clientName: 'ACME Corp'
        }
      };

      render(
        <TestWrapper>
          <NotificationItem 
            notification={notificationWithMetadata}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        </TestWrapper>
      );

      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
      expect(screen.getByText('150 Empfänger')).toBeInTheDocument();
    });
  });

  describe('NotificationBadge Component', () => {
    test('should show correct unread count', async () => {
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={5} />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
    });

    test('should show 99+ for large numbers', () => {
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={150} />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    test('should show outline icon when no unread notifications', () => {
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={0} />
        </TestWrapper>
      );

      // Should not show the red badge
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      // Should show outline bell icon (not solid)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should handle click events', () => {
      const mockOnClick = jest.fn();
      
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={3} onClick={mockOnClick} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalled();
    });

    test('should show icon only mode', () => {
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={2} iconOnly={true} />
        </TestWrapper>
      );

      expect(screen.queryByText('Benachrichtigungen')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('NotificationSettings Hook', () => {
    test('should load settings with organization context', async () => {
      const { result } = renderHook(() => useNotificationSettings(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotificationsService.getSettings).toHaveBeenCalledWith(
        'test-user-123',
        'org-123'
      );
      expect(result.current.settings).toEqual(mockSettings);
    });

    test('should update settings correctly', async () => {
      const { result } = renderHook(() => useNotificationSettings(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = { approvalGranted: false, emailSentSuccess: false };
      
      await act(async () => {
        await result.current.updateSettings(updates);
      });

      expect(mockNotificationsService.updateSettings).toHaveBeenCalledWith(
        'test-user-123',
        updates,
        'org-123'
      );
    });

    test('should handle settings errors', async () => {
      mockNotificationsService.getSettings.mockRejectedValue(new Error('Settings error'));
      
      const { result } = renderHook(() => useNotificationSettings(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Fehler beim Laden der Einstellungen');
      expect(result.current.settings).toBeNull();
    });
  });

  describe('NotificationsPage Integration', () => {
    test('should render complete notifications page', async () => {
      render(
        <TestWrapper>
          <NotificationsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
        expect(screen.getByText('Einstellungen')).toBeInTheDocument();
      });

      // Should show notifications list
      await waitFor(() => {
        expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      });
    });

    test('should navigate to settings page', async () => {
      const mockPush = jest.fn();
      jest.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

      render(
        <TestWrapper>
          <NotificationsPage />
        </TestWrapper>
      );

      const settingsButton = screen.getByText('Einstellungen');
      fireEvent.click(settingsButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/settings/notifications');
    });
  });

  describe('Real-time Updates', () => {
    test('should subscribe to notification updates', async () => {
      const mockUnsubscribe = jest.fn();
      mockNotificationsService.subscribeToNotifications.mockReturnValue(mockUnsubscribe);
      mockNotificationsService.subscribeToUnreadCount.mockReturnValue(mockUnsubscribe);

      const { result, unmount } = renderHook(() => useNotifications(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotificationsService.subscribeToNotifications).toHaveBeenCalled();
      expect(mockNotificationsService.subscribeToUnreadCount).toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-Tenancy Support', () => {
    test('should filter notifications by organization', async () => {
      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNotificationsService.getAll).toHaveBeenCalledWith(
          'test-user-123',
          50,
          'org-123'
        );
      });
    });

    test('should handle organization switching', async () => {
      const newOrg = { id: 'org-456', name: 'New Organization', slug: 'new-org' };
      
      const { rerender } = render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      // Change organization context
      rerender(
        <OrganizationProvider value={{
          currentOrganization: newOrg,
          organizations: [mockOrganization, newOrg],
          loading: false,
          switchOrganization: jest.fn()
        }}>
          <AuthProvider value={{ 
            user: mockUser, 
            loading: false, 
            signOut: jest.fn(),
            signIn: jest.fn()
          }}>
            <NotificationList />
          </AuthProvider>
        </OrganizationProvider>
      );

      await waitFor(() => {
        expect(mockNotificationsService.getAll).toHaveBeenCalledWith(
          'test-user-123',
          50,
          'org-456'
        );
      });
    });
  });

  describe('Performance & Edge Cases', () => {
    test('should handle large notification lists', async () => {
      const largeNotificationList = Array.from({ length: 100 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        title: `Notification ${i}`
      }));
      
      mockNotificationsService.getAll.mockResolvedValue(largeNotificationList);

      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Notification \d+/)).toHaveLength(100);
      });
    });

    test('should handle missing metadata gracefully', () => {
      const notificationWithoutMetadata = {
        ...mockNotifications[0],
        metadata: undefined
      };

      render(
        <TestWrapper>
          <NotificationItem 
            notification={notificationWithoutMetadata}
            onMarkAsRead={jest.fn()}
            onDelete={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      // Should not crash without metadata
    });

    test('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useNotifications(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate multiple concurrent operations
      await act(async () => {
        await Promise.all([
          result.current.markAsRead('notif-1'),
          result.current.deleteNotification('notif-2'),
          result.current.refresh()
        ]);
      });

      // All operations should complete without error
      expect(result.current.error).toBeNull();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <NotificationBadge unreadCount={3} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Benachrichtigungen (3 ungelesen)');
    });

    test('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <NotificationList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      });

      // Test keyboard navigation through notifications
      const notifications = screen.getAllByRole('button');
      notifications[0].focus();
      
      expect(notifications[0]).toHaveFocus();
    });
  });
});

// Additional test utilities for mocking hooks
function renderHook<T>(hook: () => T, options?: { wrapper?: React.ComponentType }) {
  const result = { current: hook() };
  
  function TestComponent() {
    result.current = hook();
    return null;
  }
  
  const { rerender, unmount } = render(<TestComponent />, options);
  
  return {
    result,
    rerender: () => rerender(<TestComponent />),
    unmount
  };
}

function act(callback: () => Promise<void>) {
  return callback();
}

// Mock router
const useRouter = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => useRouter(),
  usePathname: () => '/dashboard/communication/notifications'
}));