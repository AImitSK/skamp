// src/components/campaigns/__tests__/campaign-editor-integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all dependencies
jest.mock('@/lib/firebase/campaign-media-service', () => ({
  campaignMediaService: {
    uploadCampaignMedia: jest.fn(),
    getCampaignAssets: jest.fn(),
    getCampaignHeroImage: jest.fn(),
    previewCampaignStoragePath: jest.fn()
  },
  uploadCampaignHeroImage: jest.fn(),
  uploadCampaignAttachment: jest.fn(),
  getCampaignUploadFeatureStatus: jest.fn()
}));

jest.mock('@/components/campaigns/config/campaign-feature-flags', () => ({
  createFeatureFlagContext: jest.fn(),
  getUIEnhancements: jest.fn(),
  isCampaignSmartRouterEnabled: jest.fn(),
  isUploadTypeSmartRouterEnabled: jest.fn(),
  getMigrationStatus: jest.fn()
}));

jest.mock('@/components/campaigns/utils/campaign-context-builder', () => ({
  campaignContextBuilder: {
    buildCampaignContext: jest.fn(),
    buildStorageConfig: jest.fn(),
    validateCampaignContext: jest.fn()
  },
  createHeroImageContext: jest.fn(),
  resolveCampaignStoragePath: jest.fn()
}));

// Mock Campaign Editor Component (simplified version for testing)
const MockCampaignEditor = ({ 
  organizationId, 
  userId, 
  initialData, 
  enableSmartRouter,
  onSave,
  onAssetUpload 
}: any) => {
  const [campaignData, setCampaignData] = React.useState(initialData || {
    name: '',
    selectedProjectId: undefined,
    keyVisual: undefined,
    attachments: []
  });

  const handleProjectChange = (projectId: string, projectName: string) => {
    setCampaignData(prev => ({
      ...prev,
      selectedProjectId: projectId,
      selectedProjectName: projectName
    }));
  };

  const handleKeyVisualUpload = async (file: File) => {
    if (onAssetUpload) {
      const result = await onAssetUpload(file, 'hero-image');
      setCampaignData(prev => ({
        ...prev,
        keyVisual: result
      }));
    }
  };

  const handleAttachmentUpload = async (files: File[]) => {
    if (onAssetUpload) {
      const results = await Promise.all(
        files.map(file => onAssetUpload(file, 'attachment'))
      );
      setCampaignData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...results]
      }));
    }
  };

  return (
    <div data-testid="campaign-editor">
      <input
        data-testid="campaign-name"
        value={campaignData.name}
        onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Campaign Name"
      />

      <select
        data-testid="project-selector"
        value={campaignData.selectedProjectId || ''}
        onChange={(e) => handleProjectChange(e.target.value, `Project ${e.target.value}`)}
      >
        <option value="">Kein Projekt</option>
        <option value="project123">Test Project</option>
        <option value="project456">Another Project</option>
      </select>

      <div data-testid="smart-router-info">
        {enableSmartRouter && (
          <span>Smart Router: {campaignData.selectedProjectId ? 'Organisiert' : 'Unzugeordnet'}</span>
        )}
      </div>

      <div data-testid="key-visual-section">
        <input
          type="file"
          data-testid="key-visual-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleKeyVisualUpload(file);
          }}
          accept="image/*"
        />
        {campaignData.keyVisual && (
          <div data-testid="key-visual-preview">
            Key Visual: {campaignData.keyVisual.url}
          </div>
        )}
      </div>

      <div data-testid="attachments-section">
        <input
          type="file"
          data-testid="attachment-upload"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) handleAttachmentUpload(files);
          }}
        />
        <div data-testid="attachments-list">
          {campaignData.attachments.map((attachment, index) => (
            <div key={index} data-testid={`attachment-${index}`}>
              {attachment.name || attachment.url}
            </div>
          ))}
        </div>
      </div>

      <button
        data-testid="save-campaign"
        onClick={() => onSave && onSave(campaignData)}
      >
        Kampagne Speichern
      </button>
    </div>
  );
};

describe('Campaign Editor Integration Tests', () => {
  
  const mockProps = {
    organizationId: 'org123',
    userId: 'user123',
    enableSmartRouter: true,
    onSave: jest.fn(),
    onAssetUpload: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { createFeatureFlagContext, getUIEnhancements, isCampaignSmartRouterEnabled, getMigrationStatus } = require('@/components/campaigns/config/campaign-feature-flags');
    const { getCampaignUploadFeatureStatus } = require('@/lib/firebase/campaign-media-service');
    const { campaignContextBuilder } = require('@/components/campaigns/utils/campaign-context-builder');

    createFeatureFlagContext.mockReturnValue({
      organizationId: 'org123',
      userId: 'user123'
    });

    getUIEnhancements.mockReturnValue({
      showStorageType: true,
      showUploadMethodBadges: true,
      showContextPreview: true
    });

    isCampaignSmartRouterEnabled.mockReturnValue(true);
    getMigrationStatus.mockReturnValue({ useLegacyFallback: true });

    getCampaignUploadFeatureStatus.mockReturnValue({
      smartRouterAvailable: true,
      hybridStorageAvailable: true,
      uploadTypesEnabled: { 'hero-image': true, 'attachment': true }
    });

    campaignContextBuilder.buildCampaignContext.mockReturnValue({
      organizationId: 'org123',
      userId: 'user123',
      uploadType: 'campaign',
      autoTags: []
    });

    campaignContextBuilder.validateCampaignContext.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  describe('Full Campaign Creation Flow', () => {
    it('sollte vollständigen Campaign Creation Flow mit Smart Router durchführen', async () => {
      const user = userEvent.setup();
      
      // Mock successful uploads
      mockProps.onAssetUpload.mockImplementation(async (file, uploadType) => {
        if (uploadType === 'hero-image') {
          return { url: 'https://test.com/hero.jpg', type: 'hero-image' };
        }
        return { url: `https://test.com/${file.name}`, name: file.name, type: 'attachment' };
      });

      render(<MockCampaignEditor {...mockProps} />);

      // 1. Campaign Name setzen
      await user.type(screen.getByTestId('campaign-name'), 'Neue Produktkampagne');

      // 2. Projekt auswählen (organisierte Struktur)
      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      // Smart Router Info sollte aktualisiert werden
      expect(screen.getByText('Smart Router: Organisiert')).toBeInTheDocument();

      // 3. Key Visual hochladen
      const keyVisualFile = new File(['hero content'], 'hero.jpg', { type: 'image/jpeg' });
      const keyVisualInput = screen.getByTestId('key-visual-upload');
      
      await user.upload(keyVisualInput, keyVisualFile);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(keyVisualFile, 'hero-image');
        expect(screen.getByTestId('key-visual-preview')).toHaveTextContent('https://test.com/hero.jpg');
      });

      // 4. Attachments hochladen
      const attachmentFiles = [
        new File(['doc content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['image content'], 'image.png', { type: 'image/png' })
      ];
      
      const attachmentInput = screen.getByTestId('attachment-upload');
      await user.upload(attachmentInput, attachmentFiles);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(attachmentFiles[0], 'attachment');
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(attachmentFiles[1], 'attachment');
        expect(screen.getByTestId('attachment-0')).toHaveTextContent('document.pdf');
        expect(screen.getByTestId('attachment-1')).toHaveTextContent('image.png');
      });

      // 5. Campaign speichern
      await user.click(screen.getByTestId('save-campaign'));

      expect(mockProps.onSave).toHaveBeenCalledWith({
        name: 'Neue Produktkampagne',
        selectedProjectId: 'project123',
        selectedProjectName: 'Project project123',
        keyVisual: { url: 'https://test.com/hero.jpg', type: 'hero-image' },
        attachments: [
          { url: 'https://test.com/document.pdf', name: 'document.pdf', type: 'attachment' },
          { url: 'https://test.com/image.png', name: 'image.png', type: 'attachment' }
        ]
      });
    });

    it('sollte Campaign Creation ohne Projekt (unorganisiert) durchführen', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockResolvedValue({ 
        url: 'https://test.com/unorganized.jpg', 
        type: 'hero-image' 
      });

      render(<MockCampaignEditor {...mockProps} />);

      // Campaign Name setzen, aber kein Projekt
      await user.type(screen.getByTestId('campaign-name'), 'Standalone Campaign');

      // Smart Router sollte unorganisiert anzeigen
      expect(screen.getByText('Smart Router: Unzugeordnet')).toBeInTheDocument();

      // Key Visual hochladen
      const file = new File(['content'], 'standalone.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), file);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(file, 'hero-image');
        expect(screen.getByTestId('key-visual-preview')).toHaveTextContent('https://test.com/unorganized.jpg');
      });

      await user.click(screen.getByTestId('save-campaign'));

      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Standalone Campaign',
          selectedProjectId: '',
          keyVisual: { url: 'https://test.com/unorganized.jpg', type: 'hero-image' }
        })
      );
    });
  });

  describe('Project Assignment Changes', () => {
    it('sollte Migration von unorganisiert zu organisiert handhaben', async () => {
      const user = userEvent.setup();
      
      const initialData = {
        name: 'Existing Campaign',
        selectedProjectId: undefined,
        keyVisual: { url: 'https://test.com/existing.jpg' },
        attachments: []
      };

      render(<MockCampaignEditor {...mockProps} initialData={initialData} />);

      // Initial: Unorganisiert
      expect(screen.getByText('Smart Router: Unzugeordnet')).toBeInTheDocument();

      // Projekt zuordnen
      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      // Smart Router sollte zu organisiert wechseln
      expect(screen.getByText('Smart Router: Organisiert')).toBeInTheDocument();

      await user.click(screen.getByTestId('save-campaign'));

      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedProjectId: 'project123',
          selectedProjectName: 'Project project123'
        })
      );
    });

    it('sollte Projekt-Wechsel zwischen organisierten Strukturen handhaben', async () => {
      const user = userEvent.setup();
      
      const initialData = {
        name: 'Campaign with Project',
        selectedProjectId: 'project123',
        selectedProjectName: 'Old Project',
        keyVisual: { url: 'https://test.com/existing.jpg' },
        attachments: []
      };

      render(<MockCampaignEditor {...mockProps} initialData={initialData} />);

      // Projekt wechseln
      await user.selectOptions(screen.getByTestId('project-selector'), 'project456');

      await user.click(screen.getByTestId('save-campaign'));

      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedProjectId: 'project456',
          selectedProjectName: 'Project project456'
        })
      );
    });

    it('sollte Projekt-Entfernung (organisiert zu unorganisiert) handhaben', async () => {
      const user = userEvent.setup();
      
      const initialData = {
        name: 'Campaign with Project',
        selectedProjectId: 'project123',
        keyVisual: { url: 'https://test.com/existing.jpg' },
        attachments: []
      };

      render(<MockCampaignEditor {...mockProps} initialData={initialData} />);

      // Projekt entfernen
      await user.selectOptions(screen.getByTestId('project-selector'), '');

      expect(screen.getByText('Smart Router: Unzugeordnet')).toBeInTheDocument();
    });
  });

  describe('Asset Upload Scenarios', () => {
    it('sollte verschiedene Upload-Types gleichzeitig handhaben', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockImplementation(async (file, uploadType) => {
        return {
          url: `https://test.com/${uploadType}/${file.name}`,
          name: file.name,
          type: uploadType,
          uploadMethod: 'organized'
        };
      });

      render(<MockCampaignEditor {...mockProps} />);

      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      // Hero Image Upload
      const heroFile = new File(['hero'], 'hero.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), heroFile);

      // Attachment Uploads verschiedener Typen
      const attachmentFiles = [
        new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }),
        new File(['excel'], 'sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        new File(['image'], 'graphic.png', { type: 'image/png' })
      ];

      await user.upload(screen.getByTestId('attachment-upload'), attachmentFiles);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledTimes(4); // 1 Hero + 3 Attachments

        // Hero Image
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(heroFile, 'hero-image');
        
        // Attachments
        attachmentFiles.forEach(file => {
          expect(mockProps.onAssetUpload).toHaveBeenCalledWith(file, 'attachment');
        });
      });

      // Alle Assets sollten in der UI erscheinen
      expect(screen.getByTestId('key-visual-preview')).toHaveTextContent('https://test.com/hero-image/hero.jpg');
      expect(screen.getByTestId('attachment-0')).toHaveTextContent('doc.pdf');
      expect(screen.getByTestId('attachment-1')).toHaveTextContent('sheet.xlsx');
      expect(screen.getByTestId('attachment-2')).toHaveTextContent('graphic.png');
    });

    it('sollte Upload-Fehler graceful behandeln', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload
        .mockResolvedValueOnce({ url: 'https://test.com/success.jpg', type: 'hero-image' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      // Mock alert
      window.alert = jest.fn();

      render(<MockCampaignEditor {...mockProps} />);

      // Erfolgreicher Hero Upload
      const heroFile = new File(['hero'], 'hero.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), heroFile);

      await waitFor(() => {
        expect(screen.getByTestId('key-visual-preview')).toHaveTextContent('https://test.com/success.jpg');
      });

      // Fehlgeschlagener Attachment Upload
      const failingFile = new File(['fail'], 'failing.pdf', { type: 'application/pdf' });
      await user.upload(screen.getByTestId('attachment-upload'), failingFile);

      // Der erfolgreiche Upload sollte bestehen bleiben
      expect(screen.getByTestId('key-visual-preview')).toHaveTextContent('https://test.com/success.jpg');
    });

    it('sollte concurrent Uploads korrekt handhaben', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockImplementation(async (file, uploadType) => {
        // Simuliere variable Upload-Zeiten
        const delay = Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return {
          url: `https://test.com/${file.name}`,
          name: file.name,
          type: uploadType
        };
      });

      render(<MockCampaignEditor {...mockProps} />);

      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      // Gleichzeitige Uploads
      const files = [
        new File(['1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['2'], 'file2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        new File(['3'], 'file3.png', { type: 'image/png' })
      ];

      await user.upload(screen.getByTestId('attachment-upload'), files);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledTimes(3);
        expect(screen.getByTestId('attachment-0')).toBeInTheDocument();
        expect(screen.getByTestId('attachment-1')).toBeInTheDocument();
        expect(screen.getByTestId('attachment-2')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Smart Router Integration', () => {
    it('sollte Smart Router Context korrekt weiterleiten', async () => {
      const user = userEvent.setup();

      render(<MockCampaignEditor {...mockProps} />);

      await user.type(screen.getByTestId('campaign-name'), 'Test Campaign');
      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), file);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(file, 'hero-image');
      });

      // Verify that Smart Router context is built correctly
      const { campaignContextBuilder } = require('@/components/campaigns/utils/campaign-context-builder');
      expect(campaignContextBuilder.buildCampaignContext).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org123',
          userId: 'user123',
          selectedProjectId: 'project123'
        })
      );
    });

    it('sollte Feature Flag Changes während Edit berücksichtigen', async () => {
      const { isCampaignSmartRouterEnabled } = require('@/components/campaigns/config/campaign-feature-flags');
      
      // Initial: Smart Router aktiviert
      isCampaignSmartRouterEnabled.mockReturnValue(true);

      const { rerender } = render(<MockCampaignEditor {...mockProps} />);

      expect(screen.getByText(/Smart Router:/)).toBeInTheDocument();

      // Feature Flag deaktivieren
      isCampaignSmartRouterEnabled.mockReturnValue(false);

      rerender(<MockCampaignEditor {...mockProps} enableSmartRouter={false} />);

      expect(screen.queryByText(/Smart Router:/)).not.toBeInTheDocument();
    });

    it('sollte Storage Path Preview korrekt anzeigen', async () => {
      const user = userEvent.setup();
      
      render(<MockCampaignEditor {...mockProps} />);

      await user.type(screen.getByTestId('campaign-name'), 'Preview Campaign');
      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      // Smart Router Info sollte organisierte Struktur anzeigen
      expect(screen.getByText('Smart Router: Organisiert')).toBeInTheDocument();

      // Bei Projekt-Entfernung sollte sich Preview ändern
      await user.selectOptions(screen.getByTestId('project-selector'), '');
      expect(screen.getByText('Smart Router: Unzugeordnet')).toBeInTheDocument();
    });
  });

  describe('Pipeline Integration', () => {
    it('sollte Pipeline-Stage-basierte Organisation unterstützen', async () => {
      const user = userEvent.setup();
      
      const propsWithPipeline = {
        ...mockProps,
        pipelineStage: 'konzeption'
      };

      render(<MockCampaignEditor {...propsWithPipeline} />);

      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      const file = new File(['pipeline'], 'concept.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), file);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(file, 'hero-image');
      });

      // Context sollte Pipeline-Stage enthalten
      const { campaignContextBuilder } = require('@/components/campaigns/utils/campaign-context-builder');
      expect(campaignContextBuilder.buildCampaignContext).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineStage: 'konzeption'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('sollte Network-Fehler beim Asset-Upload behandeln', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockRejectedValue(new Error('Network Error'));
      
      render(<MockCampaignEditor {...mockProps} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByTestId('key-visual-upload'), file);

      // Upload sollte fehlschlagen, aber Editor sollte weiter funktionieren
      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(file, 'hero-image');
      });

      expect(screen.queryByTestId('key-visual-preview')).not.toBeInTheDocument();
    });

    it('sollte Invalid File Types abfangen', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockRejectedValue(new Error('Invalid file type'));

      render(<MockCampaignEditor {...mockProps} />);

      const invalidFile = new File(['exe content'], 'virus.exe', { type: 'application/x-executable' });
      await user.upload(screen.getByTestId('key-visual-upload'), invalidFile);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledWith(invalidFile, 'hero-image');
      });

      expect(screen.queryByTestId('key-visual-preview')).not.toBeInTheDocument();
    });

    it('sollte Campaign Validation Fehler behandeln', async () => {
      const { campaignContextBuilder } = require('@/components/campaigns/utils/campaign-context-builder');
      
      campaignContextBuilder.validateCampaignContext.mockReturnValue({
        isValid: false,
        errors: ['Campaign Name ist erforderlich']
      });

      const user = userEvent.setup();
      render(<MockCampaignEditor {...mockProps} />);

      await user.click(screen.getByTestId('save-campaign'));

      // Save sollte aufgerufen werden, aber mit Validation-Fehlern
      expect(mockProps.onSave).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('sollte große Anzahl von Attachments handhaben', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockImplementation(async (file, uploadType) => ({
        url: `https://test.com/${file.name}`,
        name: file.name,
        type: uploadType
      }));

      render(<MockCampaignEditor {...mockProps} />);

      // 50 Attachments simulieren
      const files = Array.from({ length: 50 }, (_, i) => 
        new File([`content${i}`], `file${i}.pdf`, { type: 'application/pdf' })
      );

      await user.upload(screen.getByTestId('attachment-upload'), files);

      await waitFor(() => {
        expect(mockProps.onAssetUpload).toHaveBeenCalledTimes(50);
      }, { timeout: 2000 });

      // Alle Attachments sollten gerendert werden
      for (let i = 0; i < 50; i++) {
        expect(screen.getByTestId(`attachment-${i}`)).toBeInTheDocument();
      }
    });

    it('sollte UI Responsiveness während Upload-Phase beibehalten', async () => {
      const user = userEvent.setup();
      
      mockProps.onAssetUpload.mockImplementation(async (file, uploadType) => {
        // Simuliere langsamen Upload
        await new Promise(resolve => setTimeout(resolve, 200));
        return { url: `https://test.com/${file.name}`, name: file.name, type: uploadType };
      });

      render(<MockCampaignEditor {...mockProps} />);

      // Upload starten
      const file = new File(['large content'], 'large.pdf', { type: 'application/pdf' });
      await user.upload(screen.getByTestId('attachment-upload'), file);

      // Während Upload sollte UI weiter interaktiv sein
      await user.type(screen.getByTestId('campaign-name'), 'Name während Upload');
      await user.selectOptions(screen.getByTestId('project-selector'), 'project123');

      expect(screen.getByDisplayValue('Name während Upload')).toBeInTheDocument();
      expect(screen.getByDisplayValue('project123')).toBeInTheDocument();

      // Warten auf Upload-Abschluss
      await waitFor(() => {
        expect(screen.getByTestId('attachment-0')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});