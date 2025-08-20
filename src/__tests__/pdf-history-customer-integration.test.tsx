// src/__tests__/pdf-history-customer-integration.test.tsx - Tests für PDF-Historie auf Kundenfreigabe-Seite
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PDFVersionOverview, PDFHistoryModal } from '@/components/pdf/PDFHistoryComponents';
import { PDFVersion } from '@/lib/firebase/pdf-versions-service';

// Mock PDF-Versionen für Tests
const createTestPdfVersion = (overrides: Partial<PDFVersion> = {}): PDFVersion => ({
  id: 'test-pdf-id',
  campaignId: 'test-campaign-id',
  organizationId: 'test-org-id',
  version: 1,
  status: 'pending_customer',
  downloadUrl: 'https://example.com/test.pdf',
  fileSize: 1024000,
  contentSnapshot: {
    title: 'Test Campaign',
    htmlContent: '<p>Test content</p>',
    plainContent: 'Test content'
  },
  metadata: {
    wordCount: 150,
    pageCount: 2,
    generatedAt: new Date()
  },
  createdAt: {
    toDate: () => new Date('2024-01-15T10:00:00Z')
  } as any,
  updatedAt: {
    toDate: () => new Date('2024-01-15T10:00:00Z')
  } as any,
  ...overrides
});

describe('PDF-Historie für Kundenfreigabe', () => {
  
  describe('PDFVersionOverview Komponente', () => {
    
    it('should always display PDF version on customer approval page', () => {
      const mockPdfVersion = createTestPdfVersion();
      const mockOnHistoryToggle = jest.fn();
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={mockOnHistoryToggle}
          totalVersions={2}
        />
      );
      
      // PDF-Sektion MUSS immer vorhanden sein
      expect(screen.getByText('PDF-Dokument zur Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign - Version 1')).toBeInTheDocument();
      expect(screen.getByText('Unveränderlich')).toBeInTheDocument();
      
      // Download-Button muss vorhanden sein
      expect(screen.getByText('PDF öffnen und prüfen')).toBeInTheDocument();
      
      // Historie-Button nur wenn mehrere Versionen
      expect(screen.getByText('Weitere Versionen (1)')).toBeInTheDocument();
    });
    
    it('should show unveränderlich badge for customer variant', () => {
      const mockPdfVersion = createTestPdfVersion();
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={jest.fn()}
        />
      );
      
      expect(screen.getByText('Unveränderlich')).toBeInTheDocument();
      
      // Info-Box für Unveränderlichkeit
      expect(screen.getByText('📄 Unveränderliche PDF-Version')).toBeInTheDocument();
      expect(screen.getByText(/Diese PDF-Version wurde automatisch/)).toBeInTheDocument();
    });
    
    it('should not show history button when only one version exists', () => {
      const mockPdfVersion = createTestPdfVersion();
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={jest.fn()}
          totalVersions={1}
        />
      );
      
      expect(screen.queryByText(/Weitere Versionen/)).not.toBeInTheDocument();
    });
    
    it('should call onHistoryToggle when history button is clicked', () => {
      const mockOnHistoryToggle = jest.fn();
      const mockPdfVersion = createTestPdfVersion();
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={mockOnHistoryToggle}
          totalVersions={3}
        />
      );
      
      fireEvent.click(screen.getByText('Weitere Versionen (2)'));
      expect(mockOnHistoryToggle).toHaveBeenCalledTimes(1);
    });
    
    it('should display PDF metadata correctly', () => {
      const mockPdfVersion = createTestPdfVersion({
        metadata: {
          wordCount: 250,
          pageCount: 3,
          generatedAt: new Date()
        },
        fileSize: 2048000
      });
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={jest.fn()}
        />
      );
      
      expect(screen.getByText('250 Wörter • 3 Seiten')).toBeInTheDocument();
      expect(screen.getByText(/2.00 MB/)).toBeInTheDocument();
    });
  });
  
  describe('PDFHistoryModal Komponente', () => {
    
    it('should display PDF history modal with customer-specific information', () => {
      const mockPdfVersions = [
        createTestPdfVersion({ 
          version: 1, 
          status: 'rejected',
          customerApproval: { 
            requestedAt: { toDate: () => new Date('2024-01-10T10:00:00Z') } as any,
            approvedAt: { toDate: () => new Date('2024-01-10T12:00:00Z') } as any,
            comment: 'Datum korrigieren'
          }
        }),
        createTestPdfVersion({ 
          version: 2, 
          status: 'pending_customer',
          customerApproval: {
            requestedAt: { toDate: () => new Date('2024-01-15T10:00:00Z') } as any
          }
        })
      ];
      
      const mockOnClose = jest.fn();
      
      render(
        <PDFHistoryModal
          versions={mockPdfVersions}
          variant="customer"
          onClose={mockOnClose}
        />
      );
      
      // Modal-Titel
      expect(screen.getByText('PDF-Versions-Historie')).toBeInTheDocument();
      
      // Customer-spezifische Info-Box
      expect(screen.getByText(/Hier sehen Sie alle PDF-Versionen/)).toBeInTheDocument();
      
      // Beide Versionen angezeigt (neueste zuerst)
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      
      // Kommentar angezeigt
      expect(screen.getByText('"Datum korrigieren"')).toBeInTheDocument();
      
      // Status-Badges
      expect(screen.getByText('Zur Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });
    
    it('should close modal when close button is clicked', () => {
      const mockOnClose = jest.fn();
      const mockPdfVersions = [createTestPdfVersion()];
      
      render(
        <PDFHistoryModal
          versions={mockPdfVersions}
          variant="customer"
          onClose={mockOnClose}
        />
      );
      
      fireEvent.click(screen.getByText('Schließen'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    it('should sort versions by version number (newest first)', () => {
      const mockPdfVersions = [
        createTestPdfVersion({ version: 1 }),
        createTestPdfVersion({ version: 3 }),
        createTestPdfVersion({ version: 2 })
      ];
      
      render(
        <PDFHistoryModal
          versions={mockPdfVersions}
          variant="customer"
          onClose={jest.fn()}
        />
      );
      
      const versionElements = screen.getAllByText(/Version \d+/);
      expect(versionElements[0]).toHaveTextContent('Version 3');
      expect(versionElements[1]).toHaveTextContent('Version 2');  
      expect(versionElements[2]).toHaveTextContent('Version 1');
    });
    
    it('should display download links for all versions', () => {
      const mockPdfVersions = [
        createTestPdfVersion({ 
          version: 1, 
          downloadUrl: 'https://example.com/v1.pdf' 
        }),
        createTestPdfVersion({ 
          version: 2, 
          downloadUrl: 'https://example.com/v2.pdf' 
        })
      ];
      
      render(
        <PDFHistoryModal
          versions={mockPdfVersions}
          variant="customer"
          onClose={jest.fn()}
        />
      );
      
      const downloadButtons = screen.getAllByText('Öffnen');
      expect(downloadButtons).toHaveLength(2);
    });
  });
  
  describe('PDF-Status-Validierung', () => {
    
    it('should handle missing PDF version gracefully', () => {
      // Diese Tests würden die Customer-Freigabe-Seite direkt testen
      // Hier nur ein Beispiel-Test für die Validierungs-Logik
      const validatePDFPresence = (pdfVersion: PDFVersion | null) => {
        if (!pdfVersion) {
          throw new Error('PDF-Version nicht gefunden');
        }
        return true;
      };
      
      expect(() => validatePDFPresence(null)).toThrow('PDF-Version nicht gefunden');
      expect(validatePDFPresence(createTestPdfVersion())).toBe(true);
    });
    
    it('should validate PDF version has required fields', () => {
      const incompletePDF = {
        id: 'test-id',
        version: 1,
        // Missing required fields
      } as Partial<PDFVersion>;
      
      const validatePDFCompleteness = (pdf: Partial<PDFVersion>) => {
        const required = ['id', 'version', 'status', 'downloadUrl', 'campaignId'];
        return required.every(field => field in pdf && pdf[field as keyof PDFVersion]);
      };
      
      expect(validatePDFCompleteness(incompletePDF)).toBe(false);
      expect(validatePDFCompleteness(createTestPdfVersion())).toBe(true);
    });
  });
  
  describe('Benutzerfreundlichkeit', () => {
    
    it('should display appropriate file sizes in human readable format', () => {
      const testCases = [
        { bytes: 1024, expected: '1.00 KB' },
        { bytes: 1048576, expected: '1.00 MB' },
        { bytes: 2560000, expected: '2.44 MB' }
      ];
      
      testCases.forEach(({ bytes, expected }) => {
        const mockPdfVersion = createTestPdfVersion({ fileSize: bytes });
        
        const { rerender } = render(
          <PDFVersionOverview 
            version={mockPdfVersion}
            campaignTitle="Test"
            variant="customer"
            onHistoryToggle={jest.fn()}
          />
        );
        
        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
        
        // Cleanup für nächsten Test
        rerender(<div />);
      });
    });
    
    it('should display dates in German locale format', () => {
      const mockPdfVersion = createTestPdfVersion({
        createdAt: {
          toDate: () => new Date('2024-01-15T14:30:00Z')
        } as any
      });
      
      render(
        <PDFVersionOverview 
          version={mockPdfVersion}
          campaignTitle="Test Campaign"
          variant="customer"
          onHistoryToggle={jest.fn()}
        />
      );
      
      // Deutsches Datumsformat: 15. Jan. 2024, 15:30 (abhängig von Zeitzone)
      expect(screen.getByText(/15\. Jan\. 2024/)).toBeInTheDocument();
    });
  });
});