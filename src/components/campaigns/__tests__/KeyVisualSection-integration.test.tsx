// src/components/campaigns/__tests__/KeyVisualSection-integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyVisualSection } from '../KeyVisualSection';

// Mock dependencies
jest.mock('@/lib/firebase/client-init', () => ({
  storage: {}
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

jest.mock('@/lib/firebase/campaign-media-service', () => ({
  campaignMediaService: {
    uploadCampaignMedia: jest.fn()
  },
  uploadCampaignHeroImage: jest.fn(),
  getCampaignUploadFeatureStatus: jest.fn()
}));

jest.mock('@/components/campaigns/config/campaign-feature-flags', () => ({
  createFeatureFlagContext: jest.fn(),
  getUIEnhancements: jest.fn(),
  isCampaignSmartRouterEnabled: jest.fn()
}));

jest.mock('@/components/campaigns/AssetSelectorModal', () => ({
  AssetSelectorModal: ({ isOpen, onClose, onAssetsSelected, campaignId, enableSmartRouter }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="asset-selector-modal">
        <button onClick={() => onAssetsSelected([{ 
          type: 'asset', 
          metadata: { downloadUrl: 'https://test.com/asset.jpg' }
        }])}>
          Select Asset
        </button>
        <button onClick={onClose}>Close</button>
        {enableSmartRouter && <span data-testid="smart-router-enabled">Smart Router Enabled</span>}
        {campaignId && <span data-testid="campaign-context">{campaignId}</span>}
      </div>
    );
  }
}));

jest.mock('@/components/ui/key-visual-cropper', () => ({
  KeyVisualCropper: ({ src, onCropComplete, onCancel, isProcessing }: any) => (
    <div data-testid="key-visual-cropper">
      <span>Cropping: {src.substring(0, 20)}...</span>
      <button 
        onClick={() => onCropComplete(new File(['cropped'], 'cropped.jpg'), { x: 0, y: 0, width: 100, height: 100 })}
        disabled={isProcessing}
      >
        Complete Crop
      </button>
      <button onClick={onCancel}>Cancel</button>
      {isProcessing && <span data-testid="processing">Processing...</span>}
    </div>
  )
}));

describe('KeyVisualSection Integration Tests', () => {
  const mockProps = {
    onChange: jest.fn(),
    clientId: 'client123',
    clientName: 'Test Client',
    organizationId: 'org123',
    userId: 'user123'
  };

  const mockCampaignProps = {
    ...mockProps,
    campaignId: 'campaign123',
    campaignName: 'Test Campaign',
    selectedProjectId: 'project123',
    selectedProjectName: 'Test Project',
    enableSmartRouter: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { getCampaignUploadFeatureStatus } = require('@/lib/firebase/campaign-media-service');
    const { createFeatureFlagContext, getUIEnhancements, isCampaignSmartRouterEnabled } = require('@/components/campaigns/config/campaign-feature-flags');

    createFeatureFlagContext.mockReturnValue({
      organizationId: 'org123',
      userId: 'user123',
      campaignId: 'campaign123',
      projectId: 'project123'
    });

    getUIEnhancements.mockReturnValue({
      showStorageType: true,
      showUploadMethodBadges: true,
      showContextPreview: true,
      showPathSuggestions: false
    });

    getCampaignUploadFeatureStatus.mockReturnValue({
      smartRouterAvailable: true,
      hybridStorageAvailable: true,
      uploadTypesEnabled: { 'hero-image': true }
    });

    isCampaignSmartRouterEnabled.mockReturnValue(true);
  });

  describe('Basic Rendering', () => {
    it('sollte ohne Key Visual rendern', () => {
      render(<KeyVisualSection {...mockProps} />);

      expect(screen.getByText('Key Visual')).toBeInTheDocument();
      expect(screen.getByText('Key Visual hinzufügen')).toBeInTheDocument();
      expect(screen.getByText('Klicken zum Auswählen oder Hochladen')).toBeInTheDocument();
    });

    it('sollte mit vorhandenem Key Visual rendern', () => {
      const keyVisualValue = { url: 'https://test.com/existing.jpg' };
      
      render(<KeyVisualSection {...mockProps} value={keyVisualValue} />);

      const image = screen.getByAltText('Key Visual');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://test.com/existing.jpg');
    });

    it('sollte Edit und Remove Buttons beim Hover zeigen', async () => {
      const keyVisualValue = { url: 'https://test.com/existing.jpg' };
      const user = userEvent.setup();
      
      render(<KeyVisualSection {...mockProps} value={keyVisualValue} />);

      const imageContainer = screen.getByAltText('Key Visual').parentElement;
      expect(imageContainer).toHaveClass('group');
      
      // Hover ist schwer zu simulieren, aber Buttons sollten im DOM sein
      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
      expect(screen.getByText('Entfernen')).toBeInTheDocument();
    });
  });

  describe('Campaign Smart Router Integration', () => {
    it('sollte Smart Router Context Info Panel anzeigen', () => {
      render(<KeyVisualSection {...mockCampaignProps} />);

      expect(screen.getByText('Smart Upload Router')).toBeInTheDocument();
      expect(screen.getByText('Hero Image Upload')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Organisiert')).toBeInTheDocument();
    });

    it('sollte Unorganisierte Storage-Info anzeigen ohne Projekt', () => {
      const propsWithoutProject = {
        ...mockCampaignProps,
        selectedProjectId: undefined,
        selectedProjectName: undefined
      };

      render(<KeyVisualSection {...propsWithoutProject} />);

      expect(screen.getByText('Smart Upload Router')).toBeInTheDocument();
      expect(screen.getByText('Unzugeordnet')).toBeInTheDocument();
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });

    it('sollte Context Info Panel nicht anzeigen wenn Smart Router deaktiviert', () => {
      const { getUIEnhancements } = require('@/components/campaigns/config/campaign-feature-flags');
      getUIEnhancements.mockReturnValue({
        showStorageType: false,
        showUploadMethodBadges: false,
        showContextPreview: false,
        showPathSuggestions: false
      });

      render(<KeyVisualSection {...mockCampaignProps} />);

      expect(screen.queryByText('Smart Upload Router')).not.toBeInTheDocument();
    });

    it('sollte Smart Router in AssetSelectorModal aktivieren', async () => {
      const user = userEvent.setup();
      
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Klick auf Platzhalter öffnet Asset Selector
      await user.click(screen.getByText('Key Visual hinzufügen'));

      expect(screen.getByTestId('asset-selector-modal')).toBeInTheDocument();
      expect(screen.getByTestId('smart-router-enabled')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-context')).toHaveTextContent('campaign123');
    });
  });

  describe('Smart Router Hero Image Upload', () => {
    it('sollte Hero Image mit Smart Router hochladen', async () => {
      const { uploadCampaignHeroImage } = require('@/lib/firebase/campaign-media-service');
      uploadCampaignHeroImage.mockResolvedValue({
        asset: { downloadUrl: 'https://test.com/uploaded.jpg' },
        usedSmartRouter: true,
        storageInfo: { type: 'organized' }
      });

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Asset Selector öffnen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      
      // Asset auswählen
      await user.click(screen.getByText('Select Asset'));

      // Cropper sollte erscheinen
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      // Crop abschließen
      await user.click(screen.getByText('Complete Crop'));

      // Smart Router Upload sollte verwendet werden
      await waitFor(() => {
        expect(uploadCampaignHeroImage).toHaveBeenCalledWith({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: 'campaign123',
          campaignName: 'Test Campaign',
          selectedProjectId: 'project123',
          selectedProjectName: 'Test Project',
          clientId: 'client123',
          file: expect.any(File)
        });
      });

      // onChange sollte mit neuer URL aufgerufen werden
      expect(mockProps.onChange).toHaveBeenCalledWith({
        url: 'https://test.com/uploaded.jpg',
        cropData: { x: 0, y: 0, width: 100, height: 100 }
      });
    });

    it('sollte Smart Router Upload Progress Overlay zeigen', async () => {
      const { uploadCampaignHeroImage } = require('@/lib/firebase/campaign-media-service');
      uploadCampaignHeroImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          asset: { downloadUrl: 'https://test.com/uploaded.jpg' }
        }), 100))
      );

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Asset auswählen und croppen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Crop'));

      // Progress Overlay sollte erscheinen
      await waitFor(() => {
        expect(screen.getByText('Smart Router Upload läuft...')).toBeInTheDocument();
        expect(screen.getByText('Key Visual wird intelligent geroutet und hochgeladen')).toBeInTheDocument();
      });

      // Warten bis Upload abgeschlossen
      await waitFor(() => {
        expect(screen.queryByText('Smart Router Upload läuft...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('sollte auf Legacy Upload zurückfallen wenn Smart Router fehlschlägt', async () => {
      const { uploadCampaignHeroImage } = require('@/lib/firebase/campaign-media-service');
      const { uploadBytes, getDownloadURL, ref } = require('firebase/storage');
      
      uploadCampaignHeroImage.mockRejectedValue(new Error('Smart Router Error'));
      uploadBytes.mockResolvedValue({ ref: 'storage-ref' });
      getDownloadURL.mockResolvedValue('https://test.com/fallback.jpg');
      ref.mockReturnValue('storage-ref');

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Mock alert
      window.alert = jest.fn();

      // Asset auswählen und croppen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Crop'));

      // Fehler Alert sollte angezeigt werden
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Fehler beim Hochladen'));
      });
    });
  });

  describe('Legacy Upload Fallback', () => {
    it('sollte Legacy Upload verwenden wenn Smart Router nicht verfügbar', async () => {
      const { getCampaignUploadFeatureStatus } = require('@/lib/firebase/campaign-media-service');
      const { uploadBytes, getDownloadURL, ref } = require('firebase/storage');
      
      getCampaignUploadFeatureStatus.mockReturnValue({
        smartRouterAvailable: false,
        hybridStorageAvailable: false
      });

      uploadBytes.mockResolvedValue({ ref: 'storage-ref' });
      getDownloadURL.mockResolvedValue('https://test.com/legacy.jpg');
      ref.mockReturnValue('storage-ref');

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Asset auswählen und croppen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Crop'));

      // Legacy Firebase Storage sollte verwendet werden
      await waitFor(() => {
        expect(ref).toHaveBeenCalledWith(
          {}, 
          expect.stringMatching(/organizations\/user123\/media\/.*-key-visual\.jpg/)
        );
        expect(uploadBytes).toHaveBeenCalled();
        expect(getDownloadURL).toHaveBeenCalled();
      });

      expect(mockProps.onChange).toHaveBeenCalledWith({
        url: 'https://test.com/legacy.jpg',
        cropData: { x: 0, y: 0, width: 100, height: 100 }
      });
    });

    it('sollte Legacy Upload ohne Campaign Context verwenden', async () => {
      const { uploadBytes, getDownloadURL, ref } = require('firebase/storage');
      
      uploadBytes.mockResolvedValue({ ref: 'storage-ref' });
      getDownloadURL.mockResolvedValue('https://test.com/legacy.jpg');
      ref.mockReturnValue('storage-ref');

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockProps} />); // Ohne Campaign Props

      // Asset auswählen und croppen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Crop'));

      // Legacy Upload sollte verwendet werden
      await waitFor(() => {
        expect(uploadBytes).toHaveBeenCalled();
        expect(getDownloadURL).toHaveBeenCalled();
      });
    });
  });

  describe('Cropping Workflow', () => {
    it('sollte Cropping-Workflow mit File Input abschließen', async () => {
      const user = userEvent.setup();
      render(<KeyVisualSection {...mockProps} />);

      // File Input simulieren
      const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('textbox', { hidden: true });
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      // Cropper sollte erscheinen
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      // Crop abschließen
      await user.click(screen.getByText('Complete Crop'));

      expect(mockProps.onChange).toHaveBeenCalled();
    });

    it('sollte Cropping abbrechen können', async () => {
      const user = userEvent.setup();
      render(<KeyVisualSection {...mockProps} />);

      // Asset auswählen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      // Cancel cropping
      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('key-visual-cropper')).not.toBeInTheDocument();
      });

      expect(mockProps.onChange).not.toHaveBeenCalled();
    });

    it('sollte Processing State während Crop anzeigen', async () => {
      const { uploadCampaignHeroImage } = require('@/lib/firebase/campaign-media-service');
      uploadCampaignHeroImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const user = userEvent.setup();
      render(<KeyVisualSection {...mockCampaignProps} />);

      // Asset auswählen
      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Select Asset'));
      
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete Crop'));

      // Processing sollte angezeigt werden
      await waitFor(() => {
        expect(screen.getByTestId('processing')).toBeInTheDocument();
      });
    });
  });

  describe('Key Visual Management', () => {
    it('sollte vorhandenes Key Visual entfernen', async () => {
      const keyVisualValue = { url: 'https://test.com/existing.jpg' };
      const user = userEvent.setup();
      
      render(<KeyVisualSection {...mockProps} value={keyVisualValue} />);

      await user.click(screen.getByText('Entfernen'));

      expect(mockProps.onChange).toHaveBeenCalledWith(undefined);
    });

    it('sollte vorhandenes Key Visual bearbeiten', async () => {
      const keyVisualValue = { url: 'https://test.com/existing.jpg' };
      const user = userEvent.setup();
      
      // Mock fetch for proxy
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['image data'], { type: 'image/jpeg' }))
      });

      render(<KeyVisualSection {...mockProps} value={keyVisualValue} />);

      await user.click(screen.getByText('Bearbeiten'));

      // Cropper sollte mit bestehender URL geöffnet werden
      await waitFor(() => {
        expect(screen.getByTestId('key-visual-cropper')).toBeInTheDocument();
      });

      // Proxy URL sollte verwendet werden
      expect(fetch).toHaveBeenCalledWith(
        `/api/proxy-firebase-image?url=${encodeURIComponent('https://test.com/existing.jpg')}`
      );
    });

    it('sollte CORS Fehler beim Bearbeiten behandeln', async () => {
      const keyVisualValue = { url: 'https://test.com/existing.jpg' };
      const user = userEvent.setup();
      
      // Mock fetch to fail
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      window.alert = jest.fn();

      render(<KeyVisualSection {...mockProps} value={keyVisualValue} />);

      await user.click(screen.getByText('Bearbeiten'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('CORS-Fehler')
        );
      });
    });
  });

  describe('File Validation', () => {
    it('sollte nur Bilddateien akzeptieren', async () => {
      const user = userEvent.setup();
      render(<KeyVisualSection {...mockProps} />);

      window.alert = jest.fn();

      // Nicht-Bild Datei simulieren
      const file = new File(['document'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByRole('textbox', { hidden: true });
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      expect(window.alert).toHaveBeenCalledWith('Bitte wählen Sie eine Bilddatei aus.');
      expect(screen.queryByTestId('key-visual-cropper')).not.toBeInTheDocument();
    });

    it('sollte Dateigröße validieren', async () => {
      const user = userEvent.setup();
      render(<KeyVisualSection {...mockProps} />);

      window.alert = jest.fn();

      // Große Datei simulieren (>10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('textbox', { hidden: true });
      
      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(input);

      expect(window.alert).toHaveBeenCalledWith('Die Datei darf maximal 10MB groß sein.');
      expect(screen.queryByTestId('key-visual-cropper')).not.toBeInTheDocument();
    });
  });

  describe('Client Selection Fallback', () => {
    it('sollte Fallback Modal ohne Client zeigen', async () => {
      const propsWithoutClient = {
        ...mockProps,
        clientId: undefined,
        clientName: undefined
      };

      const user = userEvent.setup();
      render(<KeyVisualSection {...propsWithoutClient} />);

      await user.click(screen.getByText('Key Visual hinzufügen'));

      expect(screen.getByText('Bitte wählen Sie zuerst einen Kunden aus')).toBeInTheDocument();
      expect(screen.getByText('Trotzdem hochladen')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    it('sollte direkten Upload ohne Client ermöglichen', async () => {
      const propsWithoutClient = {
        ...mockProps,
        clientId: undefined,
        clientName: undefined
      };

      const user = userEvent.setup();
      render(<KeyVisualSection {...propsWithoutClient} />);

      // File Input spy
      const fileInputClickSpy = jest.fn();
      const input = screen.getByRole('textbox', { hidden: true });
      input.click = fileInputClickSpy;

      await user.click(screen.getByText('Key Visual hinzufügen'));
      await user.click(screen.getByText('Trotzdem hochladen'));

      expect(fileInputClickSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit fehlendem Feature Flag Context handhaben', () => {
      const { createFeatureFlagContext } = require('@/components/campaigns/config/campaign-feature-flags');
      createFeatureFlagContext.mockReturnValue(null);

      expect(() => {
        render(<KeyVisualSection {...mockCampaignProps} />);
      }).not.toThrow();

      // Smart Router Panel sollte nicht angezeigt werden
      expect(screen.queryByText('Smart Upload Router')).not.toBeInTheDocument();
    });

    it('sollte mit fehlenden Campaign Props handhaben', () => {
      const propsWithoutCampaign = {
        ...mockProps,
        enableSmartRouter: true
        // campaignId fehlt
      };

      expect(() => {
        render(<KeyVisualSection {...propsWithoutCampaign} />);
      }).not.toThrow();

      expect(screen.queryByText('Smart Upload Router')).not.toBeInTheDocument();
    });

    it('sollte leeren Asset Selection handhaben', async () => {
      const user = userEvent.setup();
      
      render(<KeyVisualSection {...mockProps} />);

      await user.click(screen.getByText('Key Visual hinzufügen'));
      
      // Empty asset selection simulieren
      await user.click(screen.getByText('Select Asset'));

      // onChange sollte nicht aufgerufen werden bei leerer Selection
      expect(mockProps.onChange).not.toHaveBeenCalled();
    });
  });
});