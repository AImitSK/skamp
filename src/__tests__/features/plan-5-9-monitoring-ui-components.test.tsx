// src/__tests__/features/plan-5-9-monitoring-ui-components.test.tsx
/**
 * PLAN 5/9: MONITORING-IMPLEMENTIERUNG TESTS
 * Umfassende Tests für Monitoring-UI-Komponenten
 * 
 * Test-Coverage:
 * - AnalyticsDashboard Komponente
 * - ClippingsGallery Komponente
 * - MonitoringStatusWidget Komponente
 * - MonitoringConfigPanel Komponente
 * - User-Interaktionen und State-Management
 * - Loading-States und Error-Handling
 * - Real-time Updates und Data-Refresh
 * - Export-Funktionalität
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import AnalyticsDashboard from '@/components/projects/monitoring/AnalyticsDashboard';
import ClippingsGallery from '@/components/projects/monitoring/ClippingsGallery';
import MonitoringStatusWidget from '@/components/projects/monitoring/MonitoringStatusWidget';
import MonitoringConfigPanel from '@/components/projects/monitoring/MonitoringConfigPanel';
import { ProjectAnalytics, MediaOutlet, AnalyticsTimeline } from '@/types/project';
import { ClippingAsset } from '@/types/media';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Services
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/media-service');

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChartBarIcon: ({ className }: any) => <div data-testid="chart-bar-icon" className={className} />,
  DocumentChartBarIcon: ({ className }: any) => <div data-testid="document-chart-bar-icon" className={className} />,
  ArrowTrendingUpIcon: ({ className }: any) => <div data-testid="arrow-trending-up-icon" className={className} />,
  EyeIcon: ({ className }: any) => <div data-testid="eye-icon" className={className} />,
  TrophyIcon: ({ className }: any) => <div data-testid="trophy-icon" className={className} />,
  ClipboardDocumentListIcon: ({ className }: any) => <div data-testid="clipboard-document-list-icon" className={className} />,
  MagnifyingGlassIcon: ({ className }: any) => <div data-testid="magnifying-glass-icon" className={className} />,
  FunnelIcon: ({ className }: any) => <div data-testid="funnel-icon" className={className} />,
  ArrowDownTrayIcon: ({ className }: any) => <div data-testid="arrow-down-tray-icon" className={className} />,
  CalendarIcon: ({ className }: any) => <div data-testid="calendar-icon" className={className} />,
  BuildingOfficeIcon: ({ className }: any) => <div data-testid="building-office-icon" className={className} />,
  PlayIcon: ({ className }: any) => <div data-testid="play-icon" className={className} />,
  PauseIcon: ({ className }: any) => <div data-testid="pause-icon" className={className} />,
  StopIcon: ({ className }: any) => <div data-testid="stop-icon" className={className} />,
  Cog6ToothIcon: ({ className }: any) => <div data-testid="cog-6-tooth-icon" className={className} />
}));

describe('Monitoring-UI-Komponenten (Plan 5/9)', () => {
  const testContext = {
    projectId: 'project-123',
    organizationId: 'org-456'
  };

  const mockAnalytics: ProjectAnalytics = {
    projectId: testContext.projectId,
    organizationId: testContext.organizationId,
    totalReach: 150000,
    mediaValue: 35000,
    clippingCount: 8,
    sentimentScore: 0.45,
    topOutlets: [
      {
        name: 'TechCrunch',
        clippingCount: 3,
        totalReach: 75000,
        averageSentiment: 0.6,
        mediaValue: 18000,
        tier: 'tier1' as const,
        type: 'online' as const,
        country: 'US',
        language: 'en'
      },
      {
        name: 'Wired',
        clippingCount: 2,
        totalReach: 45000,
        averageSentiment: 0.3,
        mediaValue: 9000,
        tier: 'tier2' as const,
        type: 'online' as const,
        country: 'US',
        language: 'en'
      }
    ] as MediaOutlet[],
    timelineData: [
      {
        date: Timestamp.fromDate(new Date('2024-03-15')),
        dailyReach: 25000,
        dailyClippings: 2,
        dailySentiment: 0.5,
        cumulativeReach: 125000,
        cumulativeMediaValue: 25000
      },
      {
        date: Timestamp.fromDate(new Date('2024-03-16')),
        dailyReach: 30000,
        dailyClippings: 3,
        dailySentiment: 0.4,
        cumulativeReach: 155000,
        cumulativeMediaValue: 30000
      }
    ] as AnalyticsTimeline[],
    lastUpdated: Timestamp.now(),
    dataCollectionStarted: Timestamp.now()
  };

  const mockClippings: ClippingAsset[] = [
    {
      id: 'clip-1',
      type: 'clipping',
      userId: 'user-123',
      fileName: 'techcrunch_article.txt',
      fileType: 'text/clipping',
      storagePath: 'clippings/org-456/clip-1',
      downloadUrl: 'https://techcrunch.com/article1',
      description: 'Revolutionary AI breakthrough',
      tags: ['ai', 'tech', 'breakthrough'],
      outlet: 'TechCrunch',
      publishDate: Timestamp.fromDate(new Date('2024-03-15T10:00:00Z')),
      reachValue: 50000,
      sentimentScore: 0.7,
      url: 'https://techcrunch.com/article1',
      projectId: testContext.projectId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'clip-2',
      type: 'clipping',
      userId: 'user-123',
      fileName: 'wired_review.txt',
      fileType: 'text/clipping',
      storagePath: 'clippings/org-456/clip-2',
      downloadUrl: 'https://wired.com/review1',
      description: 'Product review with mixed sentiment',
      tags: ['product', 'review'],
      outlet: 'Wired',
      publishDate: Timestamp.fromDate(new Date('2024-03-16T14:30:00Z')),
      reachValue: 30000,
      sentimentScore: -0.2,
      url: 'https://wired.com/review1',
      projectId: testContext.projectId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AnalyticsDashboard', () => {
    const mockProjectService = require('@/lib/firebase/project-service');

    beforeEach(() => {
      mockProjectService.projectService = {
        getAnalyticsDashboard: jest.fn(),
        generateMonitoringReport: jest.fn()
      };
    });

    it('sollte Analytics-Dashboard mit Daten erfolgreich rendern', async () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockResolvedValue({
        analytics: mockAnalytics,
        kpiData: {
          totalClippings: 8,
          totalReach: 150000,
          totalMediaValue: 35000,
          averageSentiment: 0.45
        },
        timelineData: mockAnalytics.timelineData,
        outletRanking: mockAnalytics.topOutlets
      });

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert - Warte auf das Laden der Daten
      await waitFor(() => {
        expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
        expect(screen.getByText('150K')).toBeInTheDocument(); // Formatierte Reichweite
        expect(screen.getByText('8')).toBeInTheDocument(); // Clipping-Count
        expect(screen.getByText('€35.0K')).toBeInTheDocument(); // Media Value
        expect(screen.getByText('+0.45')).toBeInTheDocument(); // Sentiment Score
      });

      expect(mockProjectService.projectService.getAnalyticsDashboard).toHaveBeenCalledWith(
        testContext.projectId,
        { organizationId: testContext.organizationId }
      );
    });

    it('sollte Loading-State korrekt anzeigen', () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockImplementation(
        () => new Promise(() => {}) // Niemals auflösen für Loading-State
      );

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument(); // animate-pulse
      expect(screen.getAllByRole('generic').some(el => 
        el.classList.contains('bg-gray-200')
      )).toBe(true);
    });

    it('sollte Error-State korrekt anzeigen', async () => {
      // Arrange
      const errorMessage = 'Analytics laden fehlgeschlagen';
      mockProjectService.projectService.getAnalyticsDashboard.mockRejectedValue(
        new Error(errorMessage)
      );

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Fehler:/)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('sollte Empty-State für fehlende Analytics anzeigen', async () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockResolvedValue({
        analytics: null
      });

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Keine Analytics-Daten')).toBeInTheDocument();
        expect(screen.getByText(/Monitoring für dieses Projekt wurde noch nicht gestartet/)).toBeInTheDocument();
      });
    });

    it('sollte Timeline-Chart mit korrekten Daten rendern', async () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockResolvedValue({
        analytics: mockAnalytics
      });

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
          analytics={mockAnalytics}
        />
      );

      // Assert
      expect(screen.getByText('Reichweiten-Entwicklung')).toBeInTheDocument();
      expect(screen.getByText('25.000')).toBeInTheDocument(); // Erste Timeline-Daten
      expect(screen.getByText('30.000')).toBeInTheDocument(); // Zweite Timeline-Daten
    });

    it('sollte Outlet-Ranking korrekt anzeigen', async () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockResolvedValue({
        analytics: mockAnalytics
      });

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
          analytics={mockAnalytics}
        />
      );

      // Assert
      expect(screen.getByText('Top Outlets')).toBeInTheDocument();
      expect(screen.getByText('TechCrunch')).toBeInTheDocument();
      expect(screen.getByText('TIER1')).toBeInTheDocument();
      expect(screen.getByText('3 Clippings • 75.000 Reichweite')).toBeInTheDocument();
      expect(screen.getByText('+0.60')).toBeInTheDocument(); // Sentiment
    });

    it('sollte Sentiment-Verteilung korrekt berechnen und anzeigen', async () => {
      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
          analytics={mockAnalytics}
        />
      );

      // Assert
      expect(screen.getByText('Sentiment-Verteilung')).toBeInTheDocument();
      expect(screen.getByText('Durchschnittliches Sentiment')).toBeInTheDocument();
      expect(screen.getByText('+0.45')).toBeInTheDocument();
    });

    it('sollte Export-Buttons rendern und Funktionen aufrufen', async () => {
      // Arrange
      mockProjectService.projectService.getAnalyticsDashboard.mockResolvedValue({
        analytics: mockAnalytics
      });
      
      mockProjectService.projectService.generateMonitoringReport.mockResolvedValue(
        new Blob(['test'], { type: 'application/pdf' })
      );

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
          analytics={mockAnalytics}
        />
      );

      // Assert
      expect(screen.getByText('PDF-Report generieren')).toBeInTheDocument();
      expect(screen.getByText('Excel-Export')).toBeInTheDocument();
      expect(screen.getByText('PowerPoint-Präsentation')).toBeInTheDocument();

      // Test PDF-Export Click
      fireEvent.click(screen.getByText('PDF-Report generieren'));
      
      await waitFor(() => {
        expect(mockProjectService.projectService.generateMonitoringReport).toHaveBeenCalledWith(
          testContext.projectId,
          'pdf',
          { organizationId: testContext.organizationId }
        );
      });
    });

    it('sollte letzte Aktualisierung korrekt formatieren', async () => {
      // Arrange
      const testDate = new Date('2024-03-15T10:30:00Z');
      const analyticsWithDate = {
        ...mockAnalytics,
        lastUpdated: Timestamp.fromDate(testDate)
      };

      // Act
      render(
        <AnalyticsDashboard
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
          analytics={analyticsWithDate}
        />
      );

      // Assert
      expect(screen.getByText(/Letzte Aktualisierung:/)).toBeInTheDocument();
      expect(screen.getByText(testDate.toLocaleString('de-DE'))).toBeInTheDocument();
    });
  });

  describe('ClippingsGallery', () => {
    const mockMediaService = require('@/lib/firebase/media-service');

    beforeEach(() => {
      mockMediaService.mediaService = {
        getProjectClippings: jest.fn(),
        searchClippings: jest.fn(),
        exportClippings: jest.fn(),
        createClippingPackage: jest.fn()
      };
    });

    it('sollte Clippings-Gallery erfolgreich rendern', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('TechCrunch')).toBeInTheDocument();
        expect(screen.getByText('Wired')).toBeInTheDocument();
        expect(screen.getByText('Revolutionary AI breakthrough')).toBeInTheDocument();
      });

      expect(mockMediaService.mediaService.getProjectClippings).toHaveBeenCalledWith(
        testContext.projectId,
        testContext.organizationId
      );
    });

    it('sollte Clipping-Cards mit korrekten Daten rendern', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        // TechCrunch Clipping
        expect(screen.getByText('TechCrunch')).toBeInTheDocument();
        expect(screen.getByText('15.03.2024')).toBeInTheDocument(); // Deutsches Datumsformat
        expect(screen.getByText('0.70')).toBeInTheDocument(); // Sentiment Score
        expect(screen.getByText('😊')).toBeInTheDocument(); // Positive Sentiment Icon

        // Wired Clipping
        expect(screen.getByText('Wired')).toBeInTheDocument();
        expect(screen.getByText('16.03.2024')).toBeInTheDocument();
        expect(screen.getByText('-0.20')).toBeInTheDocument(); // Negative Sentiment
        expect(screen.getByText('😞')).toBeInTheDocument(); // Negative Sentiment Icon
      });
    });

    it('sollte Sentiment-Farben korrekt zuweisen', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        const positiveBadge = screen.getByText('0.70').closest('div');
        expect(positiveBadge).toHaveClass('text-green-600', 'bg-green-50');

        const negativeBadge = screen.getByText('-0.20').closest('div');
        expect(negativeBadge).toHaveClass('text-red-600', 'bg-red-50');
      });
    });

    it('sollte Clipping-Auswahl korrekt handhaben', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);

        // Selektiere erstes Clipping
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0]).toBeChecked();
        
        // Card sollte selected Style haben
        const selectedCard = checkboxes[0].closest('div');
        expect(selectedCard).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');
      });
    });

    it('sollte Suche und Filter korrekt implementieren', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);
      mockMediaService.mediaService.searchClippings.mockResolvedValue([mockClippings[0]]); // Nur TechCrunch

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Suche in Clippings/i);
        expect(searchInput).toBeInTheDocument();

        // Teste Suche
        fireEvent.change(searchInput, { target: { value: 'TechCrunch' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      });

      await waitFor(() => {
        expect(mockMediaService.mediaService.searchClippings).toHaveBeenCalledWith(
          testContext.organizationId,
          expect.objectContaining({
            projectIds: [testContext.projectId],
            searchTerm: 'TechCrunch'
          })
        );
      });
    });

    it('sollte Export-Funktionalität korrekt implementieren', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue(mockClippings);
      mockMediaService.mediaService.exportClippings.mockResolvedValue(
        new Blob(['csv,data'], { type: 'text/csv' })
      );

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]); // Selektiere erstes Clipping
      });

      // Assert - Export-Button sollte sichtbar sein
      await waitFor(() => {
        const exportButton = screen.getByText(/Exportieren/i);
        expect(exportButton).toBeInTheDocument();

        fireEvent.click(exportButton);
      });

      // Test Export-Call
      await waitFor(() => {
        expect(mockMediaService.mediaService.exportClippings).toHaveBeenCalledWith(
          ['clip-1'],
          'csv',
          expect.objectContaining({ organizationId: testContext.organizationId })
        );
      });
    });

    it('sollte Empty-State für keine Clippings anzeigen', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockResolvedValue([]);

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Keine Clippings gefunden/i)).toBeInTheDocument();
        expect(screen.getByText(/Monitoring wurde noch nicht gestartet/i)).toBeInTheDocument();
      });
    });

    it('sollte Loading-State während Clipping-Abruf anzeigen', () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockImplementation(
        () => new Promise(() => {}) // Niemals auflösen
      );

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      expect(screen.getByText(/Lade Clippings.../i)).toBeInTheDocument();
    });

    it('sollte Error-Handling bei Clipping-Abruf-Fehlern implementieren', async () => {
      // Arrange
      mockMediaService.mediaService.getProjectClippings.mockRejectedValue(
        new Error('Clippings konnten nicht geladen werden')
      );

      // Act
      render(
        <ClippingsGallery
          projectId={testContext.projectId}
          organizationId={testContext.organizationId}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Clippings/i)).toBeInTheDocument();
      });
    });
  });

  describe('MonitoringStatusWidget', () => {
    it('sollte Monitoring-Status "not_started" korrekt anzeigen', () => {
      // Act
      render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="not_started"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      // Assert
      expect(screen.getByText('Monitoring nicht gestartet')).toBeInTheDocument();
      expect(screen.getByText('Starten')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('sollte Monitoring-Status "active" korrekt anzeigen', () => {
      // Act
      render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="active"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      // Assert
      expect(screen.getByText('Monitoring läuft')).toBeInTheDocument();
      expect(screen.getByText('Pausieren')).toBeInTheDocument();
      expect(screen.getByText('Stoppen')).toBeInTheDocument();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
      expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
    });

    it('sollte Monitoring-Status "paused" korrekt anzeigen', () => {
      // Act
      render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="paused"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      // Assert
      expect(screen.getByText('Monitoring pausiert')).toBeInTheDocument();
      expect(screen.getByText('Fortsetzen')).toBeInTheDocument();
      expect(screen.getByText('Stoppen')).toBeInTheDocument();
    });

    it('sollte Monitoring-Status "completed" korrekt anzeigen', () => {
      // Act
      render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="completed"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      // Assert
      expect(screen.getByText('Monitoring abgeschlossen')).toBeInTheDocument();
      expect(screen.getByText('Erneut starten')).toBeInTheDocument();
    });

    it('sollte Callback-Funktionen korrekt aufrufen', () => {
      // Arrange
      const mockOnStart = jest.fn();
      const mockOnPause = jest.fn();
      const mockOnStop = jest.fn();

      // Act
      render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="active"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onStop={mockOnStop}
        />
      );

      // Test Pause-Button
      fireEvent.click(screen.getByText('Pausieren'));
      expect(mockOnPause).toHaveBeenCalledWith(testContext.projectId);

      // Test Stop-Button
      fireEvent.click(screen.getByText('Stoppen'));
      expect(mockOnStop).toHaveBeenCalledWith(testContext.projectId);
    });

    it('sollte Status-Indicator-Farben korrekt setzen', () => {
      // Test not_started
      const { rerender } = render(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="not_started"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      let statusIndicator = screen.getByRole('status').querySelector('div');
      expect(statusIndicator).toHaveClass('bg-gray-400');

      // Test active
      rerender(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="active"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      statusIndicator = screen.getByRole('status').querySelector('div');
      expect(statusIndicator).toHaveClass('bg-green-400');

      // Test paused
      rerender(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="paused"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      statusIndicator = screen.getByRole('status').querySelector('div');
      expect(statusIndicator).toHaveClass('bg-yellow-400');

      // Test completed
      rerender(
        <MonitoringStatusWidget
          projectId={testContext.projectId}
          status="completed"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onStop={jest.fn()}
        />
      );

      statusIndicator = screen.getByRole('status').querySelector('div');
      expect(statusIndicator).toHaveClass('bg-blue-400');
    });
  });

  describe('MonitoringConfigPanel', () => {
    const mockDefaultConfig = {
      isEnabled: true,
      monitoringPeriod: 30 as const,
      autoTransition: true,
      providers: [],
      alertThresholds: {
        minReach: 1000,
        sentimentAlert: -0.3,
        competitorMentions: 5
      },
      reportSchedule: 'weekly' as const
    };

    it('sollte Monitoring-Config-Panel erfolgreich rendern', () => {
      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isLoading={false}
        />
      );

      // Assert
      expect(screen.getByText('Monitoring-Konfiguration')).toBeInTheDocument();
      expect(screen.getByLabelText(/Monitoring aktiviert/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Monitoring-Zeitraum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Auto-Transition/i)).toBeInTheDocument();
    });

    it('sollte Config-Werte korrekt in Form-Fields laden', () => {
      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isLoading={false}
        />
      );

      // Assert
      expect(screen.getByLabelText(/Monitoring aktiviert/i)).toBeChecked();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByLabelText(/Auto-Transition/i)).toBeChecked();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument(); // Min Reach
      expect(screen.getByDisplayValue('-0.3')).toBeInTheDocument(); // Sentiment Alert
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Competitor Mentions
    });

    it('sollte Form-Änderungen korrekt handhaben', async () => {
      // Arrange
      const mockOnSave = jest.fn();

      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={mockOnSave}
          onCancel={jest.fn()}
          isLoading={false}
        />
      );

      // Ändere Monitoring-Zeitraum
      const periodSelect = screen.getByDisplayValue('30');
      fireEvent.change(periodSelect, { target: { value: '90' } });

      // Ändere Min-Reach
      const minReachInput = screen.getByDisplayValue('1000');
      fireEvent.change(minReachInput, { target: { value: '2000' } });

      // Speichere Änderungen
      fireEvent.click(screen.getByText('Speichern'));

      // Assert
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            monitoringPeriod: 90,
            alertThresholds: expect.objectContaining({
              minReach: 2000
            })
          })
        );
      });
    });

    it('sollte Validierung bei ungültigen Werten durchführen', async () => {
      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isLoading={false}
        />
      );

      // Setze ungültige Werte
      const minReachInput = screen.getByDisplayValue('1000');
      fireEvent.change(minReachInput, { target: { value: '-100' } }); // Negative Reichweite

      const sentimentInput = screen.getByDisplayValue('-0.3');
      fireEvent.change(sentimentInput, { target: { value: '5' } }); // Wert außerhalb -1 bis 1

      // Versuche zu speichern
      fireEvent.click(screen.getByText('Speichern'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Mindestreichweite muss positiv sein/i)).toBeInTheDocument();
        expect(screen.getByText(/Sentiment-Wert muss zwischen -1 und 1 liegen/i)).toBeInTheDocument();
      });
    });

    it('sollte Loading-State während Speichern anzeigen', () => {
      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isLoading={true}
        />
      );

      // Assert
      const saveButton = screen.getByText('Speichern');
      expect(saveButton).toBeDisabled();
      expect(screen.getByText(/Wird gespeichert.../i)).toBeInTheDocument();
    });

    it('sollte Abbrechen-Button korrekt funktionieren', () => {
      // Arrange
      const mockOnCancel = jest.fn();

      // Act
      render(
        <MonitoringConfigPanel
          config={mockDefaultConfig}
          onSave={jest.fn()}
          onCancel={mockOnCancel}
          isLoading={false}
        />
      );

      fireEvent.click(screen.getByText('Abbrechen'));

      // Assert
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('sollte Provider-Konfiguration korrekt handhaben', () => {
      // Arrange
      const configWithProviders = {
        ...mockDefaultConfig,
        providers: [
          {
            name: 'landau' as const,
            apiEndpoint: 'https://api.landau.de',
            isEnabled: true,
            supportedMetrics: ['reach', 'sentiment'] as const
          }
        ]
      };

      // Act
      render(
        <MonitoringConfigPanel
          config={configWithProviders}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isLoading={false}
        />
      );

      // Assert
      expect(screen.getByText('Landau Media Monitoring')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://api.landau.de')).toBeInTheDocument();
      
      const providerCheckbox = screen.getByLabelText(/Landau aktiviert/i);
      expect(providerCheckbox).toBeChecked();
    });
  });

  describe('Integration Tests', () => {
    it('sollte Komponenten-Interaktion zwischen Dashboard und Gallery korrekt handhaben', async () => {
      // Arrange
      const mockProjectService = require('@/lib/firebase/project-service');
      const mockMediaService = require('@/lib/firebase/media-service');

      mockProjectService.projectService = {
        getAnalyticsDashboard: jest.fn().mockResolvedValue({
          analytics: mockAnalytics
        })
      };

      mockMediaService.mediaService = {
        getProjectClippings: jest.fn().mockResolvedValue(mockClippings)
      };

      // Act - Render beide Komponenten
      const { container } = render(
        <div>
          <AnalyticsDashboard
            projectId={testContext.projectId}
            organizationId={testContext.organizationId}
          />
          <ClippingsGallery
            projectId={testContext.projectId}
            organizationId={testContext.organizationId}
          />
        </div>
      );

      // Assert
      await waitFor(() => {
        // Dashboard sollte Analytics anzeigen
        expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
        expect(screen.getByText('150K')).toBeInTheDocument();

        // Gallery sollte Clippings anzeigen
        expect(screen.getByText('TechCrunch')).toBeInTheDocument();
        expect(screen.getByText('Wired')).toBeInTheDocument();
      });

      // Beide Services sollten mit gleichen Parametern aufgerufen worden sein
      expect(mockProjectService.projectService.getAnalyticsDashboard).toHaveBeenCalledWith(
        testContext.projectId,
        { organizationId: testContext.organizationId }
      );
      expect(mockMediaService.mediaService.getProjectClippings).toHaveBeenCalledWith(
        testContext.projectId,
        testContext.organizationId
      );
    });

    it('sollte Monitoring-Workflow von Config über Status zu Dashboard korrekt implementieren', async () => {
      // Arrange
      const mockOnStart = jest.fn();
      const mockOnSave = jest.fn();

      // Act - Simuliere Monitoring-Workflow
      const { rerender } = render(
        <div>
          <MonitoringConfigPanel
            config={mockDefaultConfig}
            onSave={mockOnSave}
            onCancel={jest.fn()}
            isLoading={false}
          />
          <MonitoringStatusWidget
            projectId={testContext.projectId}
            status="not_started"
            onStart={mockOnStart}
            onPause={jest.fn()}
            onStop={jest.fn()}
          />
        </div>
      );

      // Step 1: Konfiguration speichern
      fireEvent.click(screen.getByText('Speichern'));
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockDefaultConfig);
      });

      // Step 2: Monitoring starten
      fireEvent.click(screen.getByText('Starten'));
      expect(mockOnStart).toHaveBeenCalledWith(testContext.projectId);

      // Step 3: Status zu "active" ändern und Dashboard rendern
      rerender(
        <div>
          <MonitoringStatusWidget
            projectId={testContext.projectId}
            status="active"
            onStart={mockOnStart}
            onPause={jest.fn()}
            onStop={jest.fn()}
          />
          <AnalyticsDashboard
            projectId={testContext.projectId}
            organizationId={testContext.organizationId}
            analytics={mockAnalytics}
          />
        </div>
      );

      // Assert
      expect(screen.getByText('Monitoring läuft')).toBeInTheDocument();
      expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
    });

    it('sollte Error-States konsistent über alle Komponenten handhaben', async () => {
      // Arrange
      const error = new Error('Service nicht verfügbar');
      const mockProjectService = require('@/lib/firebase/project-service');
      const mockMediaService = require('@/lib/firebase/media-service');

      mockProjectService.projectService = {
        getAnalyticsDashboard: jest.fn().mockRejectedValue(error)
      };

      mockMediaService.mediaService = {
        getProjectClippings: jest.fn().mockRejectedValue(error)
      };

      // Act
      render(
        <div>
          <AnalyticsDashboard
            projectId={testContext.projectId}
            organizationId={testContext.organizationId}
          />
          <ClippingsGallery
            projectId={testContext.projectId}
            organizationId={testContext.organizationId}
          />
        </div>
      );

      // Assert
      await waitFor(() => {
        // Beide Komponenten sollten Error-States zeigen
        expect(screen.getByText('Fehler: Service nicht verfügbar')).toBeInTheDocument();
        expect(screen.getByText(/Fehler beim Laden der Clippings/i)).toBeInTheDocument();
      });
    });
  });
});