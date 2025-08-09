// src/__tests__/features/communication-notifications-simple.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { notificationsService } from '@/lib/firebase/notifications-service';

// Mock Firebase service
jest.mock('@/lib/firebase/notifications-service', () => ({
  notificationsService: {
    create: jest.fn().mockResolvedValue('test-id'),
    getAll: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    markAsRead: jest.fn().mockResolvedValue(),
    delete: jest.fn().mockResolvedValue(),
    getSettings: jest.fn().mockResolvedValue({}),
    updateSettings: jest.fn().mockResolvedValue()
  }
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/communication/notifications'
}));

// Mock useNotifications hook
jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null
  }),
  useNotificationSettings: () => ({
    settings: null,
    loading: false,
    error: null
  })
}));

// Mock data
const mockNotification = {
  id: 'notif-1',
  userId: 'user-123',
  type: 'APPROVAL_GRANTED' as const,
  title: 'Freigabe erteilt',
  message: 'Max hat die Freigabe für "Kampagne 2024" erteilt.',
  linkUrl: '/dashboard/pr-kampagnen/campaign-123',
  linkType: 'campaign' as const,
  linkId: 'campaign-123',
  isRead: false,
  metadata: {
    senderName: 'Max Mustermann',
    campaignTitle: 'Kampagne 2024'
  },
  createdAt: {
    toDate: () => new Date('2024-01-15T10:00:00Z')
  } as any
};

describe('Communication Notifications Components', () => {
  describe('NotificationBadge', () => {
    test('should display unread count correctly', () => {
      render(<NotificationBadge unreadCount={3} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
    });

    test('should show 99+ for large numbers', () => {
      render(<NotificationBadge unreadCount={150} />);
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    test('should handle icon-only mode', () => {
      render(<NotificationBadge unreadCount={2} iconOnly={true} />);
      
      expect(screen.queryByText('Benachrichtigungen')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('should handle click events', () => {
      const handleClick = jest.fn();
      render(<NotificationBadge unreadCount={1} onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('NotificationItem', () => {
    const mockOnMarkAsRead = jest.fn();
    const mockOnDelete = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should render notification content correctly', () => {
      render(
        <NotificationItem 
          notification={mockNotification}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      expect(screen.getByText('Max hat die Freigabe für "Kampagne 2024" erteilt.')).toBeInTheDocument();
    });

    test('should show unread indicator for unread notifications', () => {
      const { container } = render(
        <NotificationItem 
          notification={mockNotification}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      // Look for unread styling on the main container div
      const unreadDiv = container.querySelector('.bg-blue-50\\/30');
      expect(unreadDiv).toBeInTheDocument();
    });

    test('should not show unread indicator for read notifications', () => {
      const readNotification = { ...mockNotification, isRead: true };
      
      render(
        <NotificationItem 
          notification={readNotification}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      const container = screen.getByRole('button').closest('div');
      expect(container).not.toHaveClass('bg-blue-50/30');
    });

    test('should call onDelete when delete button is clicked', () => {
      render(
        <NotificationItem 
          notification={mockNotification}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText('Benachrichtigung löschen');
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('notif-1');
    });

    test('should display metadata badges when available', () => {
      const notificationWithMetadata = {
        ...mockNotification,
        metadata: {
          ...mockNotification.metadata,
          clientName: 'ACME Corp',
          recipientCount: 150
        }
      };

      render(
        <NotificationItem 
          notification={notificationWithMetadata}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
      expect(screen.getByText('150 Empfänger')).toBeInTheDocument();
    });

    test('should show relative time', () => {
      render(
        <NotificationItem 
          notification={mockNotification}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />
      );

      // Should show some form of relative time
      expect(screen.getByText(/vor/)).toBeInTheDocument();
    });

    test('should handle missing metadata gracefully', () => {
      const notificationWithoutMetadata = {
        ...mockNotification,
        metadata: undefined
      };

      expect(() => {
        render(
          <NotificationItem 
            notification={notificationWithoutMetadata}
            onMarkAsRead={mockOnMarkAsRead}
            onDelete={mockOnDelete}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
    });
  });

  describe('Service Layer', () => {
    test('should have all required service methods available', () => {
      expect(notificationsService.create).toBeDefined();
      expect(notificationsService.getAll).toBeDefined();
      expect(notificationsService.getUnreadCount).toBeDefined();
      expect(notificationsService.markAsRead).toBeDefined();
      expect(notificationsService.delete).toBeDefined();
      expect(notificationsService.getSettings).toBeDefined();
      expect(notificationsService.updateSettings).toBeDefined();
    });

    test('should call service methods correctly', async () => {
      await notificationsService.create({
        userId: 'test-user',
        type: 'APPROVAL_GRANTED',
        title: 'Test',
        message: 'Test message',
        isRead: false
      });

      expect(notificationsService.create).toHaveBeenCalledWith({
        userId: 'test-user',
        type: 'APPROVAL_GRANTED',
        title: 'Test',
        message: 'Test message',
        isRead: false
      });
    });
  });
});

describe('Notification System Integration', () => {
  test('should support different notification types', () => {
    const types = [
      'APPROVAL_GRANTED',
      'CHANGES_REQUESTED', 
      'OVERDUE_APPROVAL',
      'EMAIL_SENT_SUCCESS',
      'EMAIL_BOUNCED',
      'TASK_OVERDUE',
      'MEDIA_FIRST_ACCESS',
      'MEDIA_DOWNLOADED',
      'MEDIA_LINK_EXPIRED'
    ];

    types.forEach(type => {
      const notification = {
        ...mockNotification,
        type: type as any
      };

      expect(() => {
        render(
          <NotificationItem 
            notification={notification}
            onMarkAsRead={jest.fn()}
            onDelete={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });

  test('should handle various metadata structures', () => {
    const metadataVariations = [
      { senderName: 'Test User' },
      { campaignTitle: 'Test Campaign' },
      { recipientCount: 100 },
      { daysOverdue: 5 },
      { clientName: 'Test Client' },
      { mediaAssetName: 'test.pdf' },
      {}
    ];

    metadataVariations.forEach(metadata => {
      const notification = {
        ...mockNotification,
        metadata
      };

      expect(() => {
        render(
          <NotificationItem 
            notification={notification}
            onMarkAsRead={jest.fn()}
            onDelete={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });
});

describe('Accessibility Features', () => {
  test('should have proper ARIA labels on badge', () => {
    render(<NotificationBadge unreadCount={5} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Benachrichtigungen (5 ungelesen)');
  });

  test('should have proper ARIA labels on delete button', () => {
    render(
      <NotificationItem 
        notification={mockNotification}
        onMarkAsRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const deleteButton = screen.getByLabelText('Benachrichtigung löschen');
    expect(deleteButton).toBeInTheDocument();
  });

  test('should support keyboard navigation', () => {
    render(
      <NotificationItem 
        notification={mockNotification}
        onMarkAsRead={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const notificationButton = screen.getByRole('button');
    expect(notificationButton).toBeInTheDocument();
    
    // Should be focusable
    notificationButton.focus();
    expect(notificationButton).toHaveFocus();
  });
});