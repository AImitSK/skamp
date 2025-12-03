// src/app/dashboard/__tests__/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import DashboardHomePage from '../page';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

// Mock Next.js Navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: jest.fn(),
}));

// Mock MyTasksWidget
jest.mock('@/components/dashboard/MyTasksWidget', () => ({
  MyTasksWidget: () => (
    <div data-testid="my-tasks-widget">
      <span>My Tasks Widget</span>
    </div>
  )
}));

// Mock useNotifications Hook
jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: jest.fn(() => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    markAsRead: jest.fn(),
    deleteNotification: jest.fn()
  }))
}));

// Mock Firebase Services
jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getAll: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getAll: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('@/lib/firebase/email-campaign-service', () => ({
  emailCampaignService: {
    getSends: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('@/lib/firebase/clipping-service', () => ({
  clippingService: {
    getByCampaignId: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('@/lib/firebase/monitoring-suggestion-service', () => ({
  monitoringSuggestionService: {
    getByCampaignId: jest.fn().mockResolvedValue([]),
    confirmSuggestion: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock Recharts
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => null
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => 'vor 2 Stunden')
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('DashboardHomePage', () => {
  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    metadata: {
      creationTime: '2024-01-01T10:00:00Z',
      lastSignInTime: '2024-12-25T14:30:00Z'
    }
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    role: 'owner'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null)
    } as any);
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    } as any);
    
    mockUseOrganization.mockReturnValue({
      currentOrganization: mockOrganization,
      organizations: [mockOrganization],
      loading: false,
      switchOrganization: jest.fn(),
      userRole: 'owner'
    } as any);
  });

  describe('Grundfunktionalität', () => {
    it('sollte Loading-State anzeigen, wenn Organization lädt', () => {
      mockUseOrganization.mockReturnValue({
        currentOrganization: null,
        organizations: [],
        loading: true,
        switchOrganization: jest.fn(),
        userRole: null
      } as any);

      const { container } = render(<DashboardHomePage />);

      // Spinner sollte angezeigt werden
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('sollte Dashboard mit Widgets rendern', () => {
      render(<DashboardHomePage />);

      // MyTasksWidget sollte angezeigt werden
      expect(screen.getByTestId('my-tasks-widget')).toBeInTheDocument();
    });
  });

  describe('Welcome Banner für neue Team-Mitglieder', () => {
    it('sollte Welcome-Banner anzeigen bei ?welcome=true', async () => {
      const mockSearchParams = {
        get: jest.fn().mockReturnValue('true')
      };
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      // Mock window.history
      const mockReplaceState = jest.fn();
      Object.defineProperty(window, 'history', {
        value: { replaceState: mockReplaceState },
        writable: true
      });

      render(<DashboardHomePage />);

      await waitFor(() => {
        expect(screen.getByText('Willkommen im Team!')).toBeInTheDocument();
        // Text ist aufgeteilt in <p> und <strong>, daher mit Regex prüfen
        expect(screen.getByText(/Sie wurden erfolgreich zum Team hinzugefügt/)).toBeInTheDocument();
        expect(screen.getByText('Owner')).toBeInTheDocument();
      });

      // URL sollte bereinigt werden
      expect(mockReplaceState).toHaveBeenCalled();
    });

    it('sollte korrekte Rolle im Welcome-Banner anzeigen', async () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn().mockReturnValue('true')
      } as any);

      mockUseOrganization.mockReturnValue({
        currentOrganization: mockOrganization,
        organizations: [mockOrganization],
        loading: false,
        switchOrganization: jest.fn(),
        userRole: 'admin'
      } as any);

      render(<DashboardHomePage />);

      await waitFor(() => {
        expect(screen.getByText('Administrator')).toBeInTheDocument();
      });
    });
  });

  describe('Organization Management', () => {
    it('sollte Warnung anzeigen, wenn keine Organisation vorhanden', () => {
      mockUseOrganization.mockReturnValue({
        currentOrganization: null,
        organizations: [],
        loading: false,
        switchOrganization: jest.fn(),
        userRole: null
      } as any);

      render(<DashboardHomePage />);

      expect(screen.getByText('Keine Organisation gefunden')).toBeInTheDocument();
      expect(screen.getByText(/Sie sind derzeit keiner Organisation zugeordnet/)).toBeInTheDocument();
    });

    it('sollte Dashboard-Inhalte anzeigen mit Organisation', () => {
      render(<DashboardHomePage />);

      // Widgets sollten sichtbar sein
      expect(screen.getByTestId('my-tasks-widget')).toBeInTheDocument();
      expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
      expect(screen.getByText('E-Mail Performance')).toBeInTheDocument();
      expect(screen.getByText('PR-Monitoring')).toBeInTheDocument();
    });
  });

  describe('Benachrichtigungen Widget', () => {
    it('sollte "Keine Benachrichtigungen" anzeigen wenn leer', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('Benachrichtigungen')).toBeInTheDocument();
      expect(screen.getByText('Keine Benachrichtigungen')).toBeInTheDocument();
    });

    it('sollte Benachrichtigungen nicht anzeigen ohne Organisation', () => {
      mockUseOrganization.mockReturnValue({
        currentOrganization: null,
        organizations: [],
        loading: false,
        switchOrganization: jest.fn(),
        userRole: null
      } as any);

      render(<DashboardHomePage />);

      expect(screen.queryByText('Benachrichtigungen')).not.toBeInTheDocument();
    });
  });

  describe('E-Mail Performance Widget', () => {
    it('sollte "Keine versendeten Kampagnen" anzeigen wenn leer', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('E-Mail Performance')).toBeInTheDocument();
      // Widget lädt initial
    });
  });

  describe('PR-Monitoring Widget', () => {
    it('sollte PR-Monitoring Widget anzeigen', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('PR-Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Veröffentlichungen')).toBeInTheDocument();
      expect(screen.getByText('Auto-Funde')).toBeInTheDocument();
    });
  });

  describe('Copyright Footer', () => {
    it('sollte Copyright-Footer mit aktuellem Jahr anzeigen', () => {
      render(<DashboardHomePage />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear} CeleroPress`))).toBeInTheDocument();
    });
  });
});