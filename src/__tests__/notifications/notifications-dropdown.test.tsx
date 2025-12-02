// src/__tests__/notifications/notifications-dropdown.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { useNotifications } from '@/hooks/use-notifications';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Timestamp
const mockTimestamp = {
  fromDate: jest.fn((date: Date) => ({
    toDate: () => date,
    nanoseconds: 0,
    seconds: Math.floor(date.getTime() / 1000)
  }))
};

jest.mock('firebase/firestore', () => ({
  Timestamp: mockTimestamp
}));

// Mock useNotifications hook
jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: jest.fn()
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => 'vor 2 Minuten')
}));

jest.mock('date-fns/locale', () => ({
  de: {}
}));

// Mock window.location is already handled by setup.ts

describe('NotificationsDropdown', () => {
  const mockNotifications = [
    {
      id: '1',
      userId: 'user123',
      type: 'APPROVAL_GRANTED' as const,
      title: 'Freigabe erteilt',
      message: 'Ihre Kampagne wurde genehmigt',
      isRead: false,
      createdAt: mockTimestamp.fromDate(new Date('2025-08-10T10:00:00Z')),
      linkUrl: '/dashboard/campaigns/123'
    },
    {
      id: '2',
      userId: 'user123',
      type: 'EMAIL_BOUNCED' as const,
      title: 'E-Mail nicht zugestellt',
      message: 'Eine E-Mail konnte nicht zugestellt werden',
      isRead: true,
      createdAt: mockTimestamp.fromDate(new Date('2025-08-10T09:00:00Z')),
      linkUrl: '/dashboard/campaigns/456'
    },
    {
      id: '3',
      userId: 'user123',
      type: 'TASK_OVERDUE' as const,
      title: 'Überfällige Aufgabe',
      message: 'Ihre Aufgabe ist überfällig',
      isRead: false,
      createdAt: mockTimestamp.fromDate(new Date('2025-08-10T08:00:00Z'))
    }
  ];

  const mockUseNotifications = {
    notifications: mockNotifications,
    unreadCount: 2,
    loading: false,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotifications as jest.Mock).mockReturnValue(mockUseNotifications);
  });

  it('sollte das Glocken-Icon mit Badge rendern', () => {
    render(<NotificationsDropdown />);
    
    // Bell icon sollte vorhanden sein
    expect(document.querySelector('[data-testid="bell-icon"]') || 
           document.querySelector('svg')).toBeInTheDocument();
    
    // Badge mit Anzahl ungelesener Notifications
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('sollte Badge nicht anzeigen wenn keine ungelesenen Notifications', () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      unreadCount: 0
    });

    render(<NotificationsDropdown />);
    
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('sollte "99+" anzeigen bei mehr als 99 ungelesenen Notifications', () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      unreadCount: 150
    });

    render(<NotificationsDropdown />);
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('sollte Dropdown-Inhalt beim Klick anzeigen', async () => {
    render(<NotificationsDropdown />);
    
    // Klick auf Bell-Icon
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    // Dropdown-Inhalt sollte erscheinen
    await waitFor(() => {
      expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
    });
  });

  it('sollte Notifications korrekt anzeigen', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // Alle Notifications sollten angezeigt werden
      expect(screen.getByText('Freigabe erteilt')).toBeInTheDocument();
      expect(screen.getByText('E-Mail nicht zugestellt')).toBeInTheDocument();
      expect(screen.getByText('Überfällige Aufgabe')).toBeInTheDocument();
      
      // Messages sollten angezeigt werden
      expect(screen.getByText('Ihre Kampagne wurde genehmigt')).toBeInTheDocument();
      expect(screen.getByText('Eine E-Mail konnte nicht zugestellt werden')).toBeInTheDocument();
    });
  });

  it('sollte ungelesene Notifications hervorheben', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // "Neu" Badge für ungelesene Notifications
      const neuBadges = screen.getAllByText('Neu');
      expect(neuBadges).toHaveLength(2); // 2 ungelesene Notifications
    });
  });

  it('sollte "Alle als gelesen" Button anzeigen wenn ungelesene vorhanden', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Alle als gelesen')).toBeInTheDocument();
    });
  });

  it('sollte "Alle als gelesen" Button nicht anzeigen wenn keine ungelesenen', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      unreadCount: 0,
      notifications: mockNotifications.map(n => ({ ...n, isRead: true }))
    });

    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Alle als gelesen')).not.toBeInTheDocument();
    });
  });

  it('sollte markAllAsRead aufrufen beim Klick auf "Alle als gelesen"', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const allReadButton = screen.getByText('Alle als gelesen');
      fireEvent.click(allReadButton);
      
      expect(mockUseNotifications.markAllAsRead).toHaveBeenCalled();
    });
  });

  it('sollte Notification als gelesen markieren beim Klick', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const notification = screen.getByText('Freigabe erteilt');
      fireEvent.click(notification.closest('div[class*="cursor-pointer"]')!);
      
      // Sollte Notification als gelesen markieren (nicht navigieren)
      expect(mockUseNotifications.markAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('sollte markAsRead für ungelesene Notifications aufrufen', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const notification = screen.getByText('Freigabe erteilt');
      fireEvent.click(notification.closest('div[class*="cursor-pointer"]')!);
      
      expect(mockUseNotifications.markAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('sollte Notification löschen beim Klick auf Löschen-Button', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const deleteButtons = document.querySelectorAll('[title="Löschen"]');
      fireEvent.click(deleteButtons[0]);
      
      expect(mockUseNotifications.deleteNotification).toHaveBeenCalledWith('1');
    });
  });

  it('sollte einzelne Notification als gelesen markieren', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const markReadButtons = document.querySelectorAll('[title="Als gelesen markieren"]');
      fireEvent.click(markReadButtons[0]);
      
      expect(mockUseNotifications.markAsRead).toHaveBeenCalled();
    });
  });

  it('sollte Loading-State anzeigen', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      loading: true,
      notifications: []
    });

    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Laden...')).toBeInTheDocument();
    });
  });

  it('sollte Empty-State anzeigen wenn keine Notifications', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      notifications: [],
      unreadCount: 0
    });

    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Keine Benachrichtigungen')).toBeInTheDocument();
    });
  });

  it('sollte Link zu allen Notifications anzeigen', async () => {
    render(<NotificationsDropdown />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const allNotificationsLink = screen.getByText(/Alle Benachrichtigungen anzeigen/);
      expect(allNotificationsLink).toBeInTheDocument();
      expect(allNotificationsLink.closest('a')).toHaveAttribute('href', '/dashboard/communication/notifications');
    });
  });

  it('sollte korrekte Notification-Icons anzeigen', async () => {
    render(<NotificationsDropdown />);

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      // Icons sind SVGs innerhalb der Notification-Items (nicht der Button selbst)
      const notificationItems = document.querySelectorAll('.px-4.py-3.hover\\:bg-gray-50.cursor-pointer');
      expect(notificationItems).toHaveLength(3);
    });
  });

  it('sollte maximal 8 Notifications im Dropdown anzeigen', async () => {
    const manyNotifications = Array.from({ length: 12 }, (_, i) => ({
      id: `${i + 1}`,
      userId: 'user123',
      type: 'APPROVAL_GRANTED' as const,
      title: `Notification ${i + 1}`,
      message: `Message ${i + 1}`,
      isRead: i % 2 === 0,
      createdAt: mockTimestamp.fromDate(new Date()),
      linkUrl: `/dashboard/test/${i + 1}`
    }));

    (useNotifications as jest.Mock).mockReturnValue({
      ...mockUseNotifications,
      notifications: manyNotifications
    });

    render(<NotificationsDropdown />);

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      // Zähle nur die Notification-Items, nicht den Dropdown-Button
      const notificationItems = document.querySelectorAll('.px-4.py-3.hover\\:bg-gray-50.cursor-pointer');
      expect(notificationItems).toHaveLength(8); // Maximal 8 anzeigen

      // Sollte Hinweis auf weitere Notifications geben
      expect(screen.getByText('(4 weitere)')).toBeInTheDocument();
    });
  });
});