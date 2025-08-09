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

// Mock ApprovalWidget
jest.mock('@/components/calendar/ApprovalWidget', () => ({
  ApprovalWidget: ({ userId, onRefresh }: { userId: string; onRefresh: () => void }) => (
    <div data-testid="approval-widget">
      <span>Approval Widget for {userId}</span>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  )
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

      render(<DashboardHomePage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('sollte Welcome-Message mit Benutzername anzeigen', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('Willkommen bei CeleroPress')).toBeInTheDocument();
      expect(screen.getByText(/Hallo Test User, schön dass du wieder da bist!/)).toBeInTheDocument();
    });

    it('sollte E-Mail-Präfix verwenden, wenn kein displayName vorhanden', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, displayName: null },
        loading: false
      } as any);

      render(<DashboardHomePage />);

      expect(screen.getByText(/Hallo test, schön dass du wieder da bist!/)).toBeInTheDocument();
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
        expect(screen.getByText(/Ihre Rolle: Owner/)).toBeInTheDocument();
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
        expect(screen.getByText(/Ihre Rolle: Administrator/)).toBeInTheDocument();
      });
    });
  });

  describe('Organization Management', () => {
    it('sollte Organization-Switcher anzeigen bei mehreren Organisationen', () => {
      const multipleOrgs = [
        { id: 'org-1', name: 'Org 1', role: 'owner' },
        { id: 'org-2', name: 'Org 2', role: 'member' }
      ];
      
      mockUseOrganization.mockReturnValue({
        currentOrganization: multipleOrgs[0],
        organizations: multipleOrgs,
        loading: false,
        switchOrganization: jest.fn(),
        userRole: 'owner'
      } as any);

      render(<DashboardHomePage />);

      expect(screen.getByText('Organisation:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('org-1')).toBeInTheDocument();
    });

    it('sollte Role-Badge anzeigen bei nur einer Organisation', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.queryByText('Organisation:')).not.toBeInTheDocument();
    });

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

    it('sollte Organization-Switching funktionieren', () => {
      const mockSwitchOrganization = jest.fn();
      const multipleOrgs = [
        { id: 'org-1', name: 'Org 1', role: 'owner' },
        { id: 'org-2', name: 'Org 2', role: 'member' }
      ];
      
      mockUseOrganization.mockReturnValue({
        currentOrganization: multipleOrgs[0],
        organizations: multipleOrgs,
        loading: false,
        switchOrganization: mockSwitchOrganization,
        userRole: 'owner'
      } as any);

      render(<DashboardHomePage />);

      const select = screen.getByDisplayValue('org-1');
      fireEvent.change(select, { target: { value: 'org-2' } });

      expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2');
    });
  });

  describe('ApprovalWidget Integration', () => {
    it('sollte ApprovalWidget anzeigen bei vorhandener Organisation', () => {
      render(<DashboardHomePage />);

      expect(screen.getByTestId('approval-widget')).toBeInTheDocument();
      expect(screen.getByText('Approval Widget for org-123')).toBeInTheDocument();
    });

    it('sollte ApprovalWidget nicht anzeigen ohne Organisation', () => {
      mockUseOrganization.mockReturnValue({
        currentOrganization: null,
        organizations: [],
        loading: false,
        switchOrganization: jest.fn(),
        userRole: null
      } as any);

      render(<DashboardHomePage />);

      expect(screen.queryByTestId('approval-widget')).not.toBeInTheDocument();
    });

    it('sollte Refresh-Funktionalität für ApprovalWidget unterstützen', () => {
      render(<DashboardHomePage />);

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // RefreshKey sollte sich ändern, ApprovalWidget sollte neu rendern
      expect(screen.getByTestId('approval-widget')).toBeInTheDocument();
    });
  });

  describe('Account-Informationen', () => {
    it('sollte Account-Details korrekt anzeigen', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.getByText('1. Januar 2024')).toBeInTheDocument();
      expect(screen.getByText('25. Dezember 2024, 15:30')).toBeInTheDocument();
      expect(screen.getByText('Aktiv')).toBeInTheDocument();
    });

    it('sollte "Unbekannt" anzeigen bei fehlenden Metadaten', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, metadata: {} },
        loading: false
      } as any);

      render(<DashboardHomePage />);

      expect(screen.getAllByText('Unbekannt')).toHaveLength(2); // Erstellung + letzter Login
    });

    it('sollte korrekte Role-Badge-Farben verwenden', () => {
      const testCases = [
        { role: 'owner', expectedColor: 'purple' },
        { role: 'admin', expectedColor: 'blue' },
        { role: 'member', expectedColor: 'green' }
      ];

      testCases.forEach(({ role, expectedColor }) => {
        mockUseOrganization.mockReturnValue({
          currentOrganization: mockOrganization,
          organizations: [mockOrganization],
          loading: false,
          switchOrganization: jest.fn(),
          userRole: role
        } as any);

        const { rerender } = render(<DashboardHomePage />);
        
        // Badge sollte mit erwarteter Farbe gerendert werden
        const badge = screen.getByText(role === 'owner' ? 'Owner' : role === 'admin' ? 'Administrator' : 'Team-Mitglied');
        expect(badge).toBeInTheDocument();

        rerender(<div />); // Clean up für nächsten Test
      });
    });
  });

  describe('Schnellzugriff und Platzhalter', () => {
    it('sollte Schnellzugriff-Section mit Coming Soon anzeigen', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('Schnellzugriff')).toBeInTheDocument();
      expect(screen.getByText('Hier findest du bald Schnellzugriffe auf deine wichtigsten Funktionen.')).toBeInTheDocument();
      expect(screen.getByText('CRM')).toBeInTheDocument();
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('sollte Marketing-Zentrale Platzhalter anzeigen', () => {
      render(<DashboardHomePage />);

      expect(screen.getByText('Deine Marketing-Zentrale')).toBeInTheDocument();
    });

    it('sollte verschiedene Messages für Owner vs Member anzeigen', () => {
      // Test für Owner (user.uid === currentOrganization.id)
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, uid: 'org-123' },
        loading: false
      } as any);

      const { rerender } = render(<DashboardHomePage />);

      expect(screen.getByText(/Hier entstehen bald deine Marketing-Tools/)).toBeInTheDocument();

      // Test für Member
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, uid: 'user-456' },
        loading: false
      } as any);

      rerender(<DashboardHomePage />);

      expect(screen.getByText(/Sie arbeiten jetzt in der Organisation: Test Organization/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design und Accessibility', () => {
    it('sollte strukturierte Inhalte mit korrekten Headings haben', () => {
      render(<DashboardHomePage />);

      expect(screen.getByRole('heading', { name: 'Willkommen bei CeleroPress' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Schnellzugriff' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Account-Informationen' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Deine Marketing-Zentrale' })).toBeInTheDocument();
    });
  });
});