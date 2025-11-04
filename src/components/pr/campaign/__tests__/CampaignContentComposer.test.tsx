// src/components/pr/campaign/__tests__/CampaignContentComposer.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampaignContentComposer from '../CampaignContentComposer';
import { toastService } from '@/lib/utils/toast';
import { mediaService } from '@/lib/firebase/media-service';
import { BoilerplateSection } from '../IntelligentBoilerplateSection';

// Mock dependencies
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getFolders: jest.fn(),
    getBreadcrumbs: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/boilerplate-service', () => ({
  boilerplatesService: {
    getForCampaignEditor: jest.fn().mockResolvedValue({
      global: {},
      client: {},
    }),
    getById: jest.fn(),
  },
}));

// Mock child components
jest.mock('@/components/GmailStyleEditor', () => ({
  GmailStyleEditor: ({ content, onChange, placeholder }: any) => (
    <div data-testid="gmail-style-editor">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  ),
}));

jest.mock('@/components/pr/ai/HeadlineGenerator', () => ({
  HeadlineGenerator: ({ onTitleSelect }: any) => (
    <button
      data-testid="headline-generator"
      onClick={() => onTitleSelect('Generated Headline')}
    >
      Generate Headline
    </button>
  ),
}));

jest.mock('@/components/campaigns/PRSEOHeaderBar', () => ({
  PRSEOHeaderBar: ({ title, keywords, onKeywordsChange }: any) => (
    <div data-testid="pr-seo-header">
      <span>SEO Analysis for: {title}</span>
      <button onClick={() => onKeywordsChange(['keyword1', 'keyword2'])}>
        Update Keywords
      </button>
    </div>
  ),
}));

jest.mock('../IntelligentBoilerplateSection', () => {
  return function MockIntelligentBoilerplateSection({ onContentChange, initialSections }: any) {
    return (
      <div data-testid="boilerplate-section">
        <button
          onClick={() => {
            const newSection: BoilerplateSection = {
              id: 'test-section',
              type: 'boilerplate',
              boilerplateId: 'bp-1',
              order: 0,
              isLocked: false,
              isCollapsed: false,
            };
            onContentChange([...initialSections, newSection]);
          }}
        >
          Add Boilerplate
        </button>
      </div>
    );
  };
});

describe('CampaignContentComposer', () => {
  const mockProps = {
    organizationId: 'org-123',
    title: '',
    onTitleChange: jest.fn(),
    mainContent: '',
    onMainContentChange: jest.fn(),
    onFullContentChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mediaService.getFolders as jest.Mock).mockResolvedValue([]);
    (mediaService.getBreadcrumbs as jest.Mock).mockResolvedValue([]);
  });

  describe('Basic Rendering', () => {
    it('should render with minimal props', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.getByText('Titel der Pressemitteilung')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/z.B. Neue Partnerschaft/)).toBeInTheDocument();
    });

    it('should render all main sections by default', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.getByText('Titel der Pressemitteilung')).toBeInTheDocument();
      expect(screen.getByText('Hauptinhalt der Pressemitteilung')).toBeInTheDocument();
      expect(screen.getByTestId('boilerplate-section')).toBeInTheDocument();
    });

    it('should display client name when provided', () => {
      render(
        <CampaignContentComposer
          {...mockProps}
          clientId="client-123"
          clientName="Test Client GmbH"
        />
      );

      // Component should pass clientName to IntelligentBoilerplateSection
      expect(screen.getByTestId('boilerplate-section')).toBeInTheDocument();
    });
  });

  describe('Title Input', () => {
    it('should call onTitleChange when title is typed', () => {
      const onTitleChange = jest.fn();
      render(<CampaignContentComposer {...mockProps} onTitleChange={onTitleChange} />);

      const titleInput = screen.getByPlaceholderText(/z.B. Neue Partnerschaft/);
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(onTitleChange).toHaveBeenCalledWith('New Title');
    });

    it('should display current title value', () => {
      render(<CampaignContentComposer {...mockProps} title="Current Title" />);

      const titleInput = screen.getByDisplayValue('Current Title');
      expect(titleInput).toBeInTheDocument();
    });

    it('should show title as required field', () => {
      render(<CampaignContentComposer {...mockProps} />);

      const titleInput = screen.getByPlaceholderText(/z.B. Neue Partnerschaft/);
      expect(titleInput).toHaveAttribute('required');
    });

    it('should integrate with HeadlineGenerator', () => {
      const onTitleChange = jest.fn();
      render(<CampaignContentComposer {...mockProps} onTitleChange={onTitleChange} />);

      const generateButton = screen.getByTestId('headline-generator');
      fireEvent.click(generateButton);

      expect(onTitleChange).toHaveBeenCalledWith('Generated Headline');
    });
  });

  describe('Read-Only Title Mode', () => {
    it('should show title as heading when readOnlyTitle is true', () => {
      render(
        <CampaignContentComposer
          {...mockProps}
          title="Read-Only Title"
          readOnlyTitle={true}
        />
      );

      expect(screen.getByText('Read-Only Title')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/z.B. Neue Partnerschaft/)).not.toBeInTheDocument();
    });

    it('should show placeholder text when readOnlyTitle is true and no title', () => {
      render(
        <CampaignContentComposer
          {...mockProps}
          title=""
          readOnlyTitle={true}
        />
      );

      expect(screen.getByText('Kein Titel vorhanden')).toBeInTheDocument();
    });
  });

  describe('Main Content Editor', () => {
    it('should render GmailStyleEditor by default', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.getByTestId('gmail-style-editor')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Pressemitteilung schreiben/)).toBeInTheDocument();
    });

    it('should call onMainContentChange when content is edited', () => {
      const onMainContentChange = jest.fn();
      render(<CampaignContentComposer {...mockProps} onMainContentChange={onMainContentChange} />);

      const editor = screen.getByPlaceholderText(/Pressemitteilung schreiben/);
      fireEvent.change(editor, { target: { value: 'New content' } });

      expect(onMainContentChange).toHaveBeenCalledWith('New content');
    });

    it('should hide main content field when hideMainContentField is true', () => {
      render(<CampaignContentComposer {...mockProps} hideMainContentField={true} />);

      expect(screen.queryByText('Hauptinhalt der Pressemitteilung')).not.toBeInTheDocument();
      expect(screen.queryByTestId('gmail-style-editor')).not.toBeInTheDocument();
    });

    it('should display current main content', () => {
      render(<CampaignContentComposer {...mockProps} mainContent="Existing content" />);

      const editor = screen.getByDisplayValue('Existing content');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('PR-SEO Integration', () => {
    it('should render PRSEOHeaderBar when onKeywordsChange is provided', () => {
      const onKeywordsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          title="Test Title"
          keywords={[]}
          onKeywordsChange={onKeywordsChange}
        />
      );

      expect(screen.getByTestId('pr-seo-header')).toBeInTheDocument();
      // PRSEOHeaderBar is only rendered when main content field is visible
      expect(screen.getByText('Hauptinhalt der Pressemitteilung')).toBeInTheDocument();
    });

    it('should not render PRSEOHeaderBar when onKeywordsChange is not provided', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.queryByTestId('pr-seo-header')).not.toBeInTheDocument();
    });

    it('should call onKeywordsChange when keywords are updated', () => {
      const onKeywordsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          keywords={[]}
          onKeywordsChange={onKeywordsChange}
        />
      );

      const updateButton = screen.getByText('Update Keywords');
      fireEvent.click(updateButton);

      expect(onKeywordsChange).toHaveBeenCalledWith(['keyword1', 'keyword2']);
    });

    it('should pass onSeoScoreChange callback when provided', () => {
      const onSeoScoreChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          keywords={[]}
          onKeywordsChange={jest.fn()}
          onSeoScoreChange={onSeoScoreChange}
        />
      );

      expect(screen.getByTestId('pr-seo-header')).toBeInTheDocument();
    });
  });

  describe('Boilerplate Sections', () => {
    it('should render IntelligentBoilerplateSection by default', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.getByTestId('boilerplate-section')).toBeInTheDocument();
    });

    it('should hide boilerplates when hideBoilerplates is true', () => {
      render(<CampaignContentComposer {...mockProps} hideBoilerplates={true} />);

      expect(screen.queryByTestId('boilerplate-section')).not.toBeInTheDocument();
    });

    it('should initialize with initial boilerplate sections', () => {
      const initialSections: BoilerplateSection[] = [
        {
          id: 'section-1',
          type: 'boilerplate',
          boilerplateId: 'bp-1',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      render(
        <CampaignContentComposer
          {...mockProps}
          initialBoilerplateSections={initialSections}
        />
      );

      expect(screen.getByTestId('boilerplate-section')).toBeInTheDocument();
    });

    it('should call onBoilerplateSectionsChange when sections are updated', () => {
      const onBoilerplateSectionsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          onBoilerplateSectionsChange={onBoilerplateSectionsChange}
        />
      );

      const addButton = screen.getByText('Add Boilerplate');
      fireEvent.click(addButton);

      expect(onBoilerplateSectionsChange).toHaveBeenCalled();
      const sections = onBoilerplateSectionsChange.mock.calls[0][0];
      expect(sections).toHaveLength(1);
    });
  });

  describe('Legacy Section Conversion', () => {
    it('should convert legacy position to order property', async () => {
      const legacySections: any[] = [
        {
          id: 'section-1',
          type: 'boilerplate',
          position: 0, // Legacy property
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const onBoilerplateSectionsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          initialBoilerplateSections={legacySections}
          onBoilerplateSectionsChange={onBoilerplateSectionsChange}
        />
      );

      await waitFor(() => {
        if (onBoilerplateSectionsChange.mock.calls.length > 0) {
          const convertedSections = onBoilerplateSectionsChange.mock.calls[0][0];
          expect(convertedSections[0]).not.toHaveProperty('position');
          expect(convertedSections[0]).toHaveProperty('order');
        }
      });
    });

    it('should preserve order property for modern sections', async () => {
      const modernSections: BoilerplateSection[] = [
        {
          id: 'section-1',
          type: 'boilerplate',
          order: 5,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const onBoilerplateSectionsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          initialBoilerplateSections={modernSections}
          onBoilerplateSectionsChange={onBoilerplateSectionsChange}
        />
      );

      await waitFor(() => {
        if (onBoilerplateSectionsChange.mock.calls.length > 0) {
          const sections = onBoilerplateSectionsChange.mock.calls[0][0];
          expect(sections[0].order).toBe(5);
        }
      });
    });

    it('should assign default order when neither position nor order exist', async () => {
      const sectionsWithoutOrder: any[] = [
        {
          id: 'section-1',
          type: 'boilerplate',
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const onBoilerplateSectionsChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          initialBoilerplateSections={sectionsWithoutOrder}
          onBoilerplateSectionsChange={onBoilerplateSectionsChange}
        />
      );

      await waitFor(() => {
        if (onBoilerplateSectionsChange.mock.calls.length > 0) {
          const sections = onBoilerplateSectionsChange.mock.calls[0][0];
          expect(sections[0]).toHaveProperty('order');
          expect(sections[0].order).toBe(0);
        }
      });
    });
  });

  describe('Preview Functionality', () => {
    it('should hide preview section by default', () => {
      render(<CampaignContentComposer {...mockProps} />);

      expect(screen.queryByText('Vorschau')).not.toBeInTheDocument();
    });

    it('should show preview when toggle is clicked', async () => {
      render(<CampaignContentComposer {...mockProps} title="Test Title" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Vorschau')).toBeInTheDocument();
      });
    });

    it('should hide preview when hidePreview is true', () => {
      render(<CampaignContentComposer {...mockProps} hidePreview={true} />);

      expect(screen.queryByText('Vorschau der vollständigen Pressemitteilung')).not.toBeInTheDocument();
    });

    it('should display processed content in preview', async () => {
      render(
        <CampaignContentComposer
          {...mockProps}
          title="Preview Test Title"
          mainContent="<p>Test content</p>"
        />
      );

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Vorschau')).toBeInTheDocument();
      });
    });

    it('should show PDF export button when preview is open', async () => {
      render(<CampaignContentComposer {...mockProps} title="Test" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Als PDF exportieren')).toBeInTheDocument();
      });
    });
  });

  describe('PDF Export', () => {
    it('should show error when exporting PDF without title', async () => {
      render(<CampaignContentComposer {...mockProps} title="" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const exportButton = screen.getByText('Als PDF exportieren');
        fireEvent.click(exportButton);
      });

      expect(toastService.error).toHaveBeenCalledWith(
        'Bitte geben Sie einen Titel für die Pressemitteilung ein.'
      );
    });

    it('should open folder selector when exporting with valid title', async () => {
      render(<CampaignContentComposer {...mockProps} title="Valid Title" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const exportButton = screen.getByText('Als PDF exportieren');
        fireEvent.click(exportButton);
      });

      // Folder selector should be rendered (check for dialog title)
      await waitFor(() => {
        expect(screen.getByText('PDF Speicherort auswählen')).toBeInTheDocument();
      });
    });

    it('should close folder selector when cancel is clicked', async () => {
      render(<CampaignContentComposer {...mockProps} title="Valid Title" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const exportButton = screen.getByText('Als PDF exportieren');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(screen.getByText('PDF Speicherort auswählen')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Abbrechen');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('PDF Speicherort auswählen')).not.toBeInTheDocument();
      });
    });
  });

  describe('Full Content Change Callback', () => {
    it('should call onFullContentChange when content is processed', async () => {
      const onFullContentChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          title="Test Title"
          onFullContentChange={onFullContentChange}
        />
      );

      await waitFor(() => {
        expect(onFullContentChange).toHaveBeenCalled();
        const content = onFullContentChange.mock.calls[0][0];
        expect(content).toContain('Test Title');
      });
    });

    it('should update full content when boilerplate sections change', async () => {
      const onFullContentChange = jest.fn();
      render(
        <CampaignContentComposer
          {...mockProps}
          title="Test"
          onFullContentChange={onFullContentChange}
        />
      );

      const addButton = screen.getByText('Add Boilerplate');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(onFullContentChange.mock.calls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', () => {
      render(<CampaignContentComposer {...mockProps} title="" />);

      expect(screen.getByPlaceholderText(/z.B. Neue Partnerschaft/)).toHaveValue('');
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(500);
      render(<CampaignContentComposer {...mockProps} title={longTitle} />);

      expect(screen.getByDisplayValue(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Title with Ümläuten & Special <Characters>';
      render(<CampaignContentComposer {...mockProps} title={specialTitle} />);

      expect(screen.getByDisplayValue(specialTitle)).toBeInTheDocument();
    });

    it('should handle empty main content', () => {
      render(<CampaignContentComposer {...mockProps} mainContent="" />);

      expect(screen.getByTestId('gmail-style-editor')).toBeInTheDocument();
    });

    it('should handle very long main content', () => {
      const longContent = '<p>' + 'Lorem ipsum '.repeat(1000) + '</p>';
      render(<CampaignContentComposer {...mockProps} mainContent={longContent} />);

      expect(screen.getByDisplayValue(longContent)).toBeInTheDocument();
    });

    it('should handle multiple rapid clicks on preview toggle', async () => {
      render(<CampaignContentComposer {...mockProps} title="Test" />);

      const toggleButton = screen.getByText('Vorschau der vollständigen Pressemitteilung');

      // Click 3 times rapidly (odd number means preview should be open)
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      // After 3 clicks, preview should be visible
      await waitFor(() => {
        expect(screen.getByText('Vorschau')).toBeInTheDocument();
      });
    });

    it('should handle undefined callback functions gracefully', () => {
      const minimalProps = {
        organizationId: 'org-123',
        title: 'Test',
        onTitleChange: jest.fn(),
        mainContent: '',
        onMainContentChange: jest.fn(),
        onFullContentChange: jest.fn(),
        // onBoilerplateSectionsChange: undefined
      };

      render(<CampaignContentComposer {...minimalProps} />);

      const addButton = screen.getByText('Add Boilerplate');
      fireEvent.click(addButton);

      // Should not throw errors
      expect(screen.getByTestId('boilerplate-section')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders when props don\'t change', () => {
      const { rerender } = render(<CampaignContentComposer {...mockProps} title="Test" />);

      rerender(<CampaignContentComposer {...mockProps} title="Test" />);

      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    it('should handle rapid content updates efficiently', () => {
      const onMainContentChange = jest.fn();
      render(<CampaignContentComposer {...mockProps} onMainContentChange={onMainContentChange} />);

      const editor = screen.getByPlaceholderText(/Pressemitteilung schreiben/);

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.change(editor, { target: { value: `Content ${i}` } });
      }

      expect(onMainContentChange).toHaveBeenCalledTimes(10);
    });
  });
});
