// src/components/pr/campaign/hooks/__tests__/useBoilerplateProcessing.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useBoilerplateProcessing } from '../useBoilerplateProcessing';
import { BoilerplateSection } from '../../IntelligentBoilerplateSection';

describe('useBoilerplateProcessing Hook', () => {
  let mockOnFullContentChange: jest.Mock;

  beforeEach(() => {
    mockOnFullContentChange = jest.fn();
    jest.clearAllMocks();
  });

  it('should initialize with date even when content is empty', async () => {
    const { result } = renderHook(() =>
      useBoilerplateProcessing([], '', mockOnFullContentChange)
    );

    await waitFor(() => {
      // Hook always includes the date, even with empty content
      expect(result.current).toContain('text-sm text-gray-600 mt-8');
    });
  });

  describe('Title Processing', () => {
    it('should include title in processed content when title is provided', async () => {
      const title = 'Test Pressemitteilung Titel';
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], title, mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('<h1 class="text-2xl font-bold mb-4">Test Pressemitteilung Titel</h1>');
      });
    });

    it('should not include title when title is empty', async () => {
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).not.toContain('<h1');
      });
    });

    it('should handle special characters in title', async () => {
      const title = 'Titel mit Ümläuten & Sonderzeichen: @#$%';
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], title, mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('Titel mit Ümläuten & Sonderzeichen: @#$%');
      });
    });
  });

  describe('Section Sorting', () => {
    it('should sort sections by order property', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'section-3',
          type: 'main',
          content: '<p>Third Section</p>',
          order: 2,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'section-1',
          type: 'lead',
          content: '<p><strong>First Section</strong></p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'section-2',
          type: 'main',
          content: '<p>Second Section</p>',
          order: 1,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, 'Title', mockOnFullContentChange)
      );

      await waitFor(() => {
        const content = result.current;
        const firstIndex = content.indexOf('First Section');
        const secondIndex = content.indexOf('Second Section');
        const thirdIndex = content.indexOf('Third Section');

        expect(firstIndex).toBeLessThan(secondIndex);
        expect(secondIndex).toBeLessThan(thirdIndex);
      });
    });

    it('should handle sections without order property', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'section-1',
          type: 'main',
          content: '<p>Content 1</p>',
          order: undefined as any,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'section-2',
          type: 'main',
          content: '<p>Content 2</p>',
          order: undefined as any,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('Content 1');
        expect(result.current).toContain('Content 2');
      });
    });
  });

  describe('Boilerplate Section Processing', () => {
    it('should render boilerplate content correctly', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'bp-1',
          type: 'boilerplate',
          boilerplateId: 'test-bp-id',
          boilerplate: {
            id: 'test-bp-id',
            name: 'Test Boilerplate',
            content: '<p>This is boilerplate content</p>',
            category: 'company',
            isGlobal: true,
            organizationId: 'org-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('This is boilerplate content');
      });
    });

    it('should handle multiple boilerplate sections', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'bp-1',
          type: 'boilerplate',
          boilerplate: {
            id: 'bp-1',
            name: 'Boilerplate 1',
            content: '<p>Boilerplate One</p>',
            category: 'company',
            isGlobal: true,
            organizationId: 'org-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'bp-2',
          type: 'boilerplate',
          boilerplate: {
            id: 'bp-2',
            name: 'Boilerplate 2',
            content: '<p>Boilerplate Two</p>',
            category: 'contact',
            isGlobal: false,
            organizationId: 'org-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          order: 1,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('Boilerplate One');
        expect(result.current).toContain('Boilerplate Two');
      });
    });
  });

  describe('Quote Section Processing', () => {
    it('should render quote with full metadata', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'quote-1',
          type: 'quote',
          content: 'This is a great quote about our product.',
          metadata: {
            person: 'Max Mustermann',
            role: 'CEO',
            company: 'Example GmbH',
          },
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        const content = result.current;
        expect(content).toContain('This is a great quote about our product.');
        expect(content).toContain('Max Mustermann');
        expect(content).toContain('CEO');
        expect(content).toContain('Example GmbH');
        expect(content).toContain('<blockquote');
        expect(content).toContain('border-l-4 border-blue-400');
      });
    });

    it('should render quote with partial metadata (no company)', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'quote-1',
          type: 'quote',
          content: 'Another quote here.',
          metadata: {
            person: 'Jane Doe',
            role: 'CTO',
          },
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        const content = result.current;
        expect(content).toContain('Another quote here.');
        expect(content).toContain('Jane Doe');
        expect(content).toContain('CTO');
        expect(content).not.toContain('bei');
      });
    });

    it('should render quote with only person metadata', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'quote-1',
          type: 'quote',
          content: 'Simple quote.',
          metadata: {
            person: 'John Smith',
          },
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        const content = result.current;
        expect(content).toContain('Simple quote.');
        expect(content).toContain('John Smith');
      });
    });
  });

  describe('Structured Content Processing', () => {
    it('should render lead section correctly', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'lead-1',
          type: 'lead',
          content: '<p><strong>This is the lead paragraph.</strong></p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('This is the lead paragraph.');
      });
    });

    it('should render main section correctly', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'main-1',
          type: 'main',
          content: '<p>This is the main content with more details.</p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('This is the main content with more details.');
      });
    });
  });

  describe('Date Rendering', () => {
    it('should include current date at the end', async () => {
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('<p class="text-sm text-gray-600 mt-8">');
        // Check for German date format parts
        expect(result.current).toMatch(/\d{1,2}\.\s+\w+\s+\d{4}/);
      });
    });

    it('should include date even with empty sections', async () => {
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], 'Just Title', mockOnFullContentChange)
      );

      await waitFor(() => {
        const currentYear = new Date().getFullYear();
        expect(result.current).toContain(currentYear.toString());
      });
    });
  });

  describe('onFullContentChange Callback', () => {
    it('should call onFullContentChange with processed content', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'main-1',
          type: 'main',
          content: '<p>Test content</p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      renderHook(() =>
        useBoilerplateProcessing(sections, 'Test Title', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(mockOnFullContentChange).toHaveBeenCalled();
        const calledWith = mockOnFullContentChange.mock.calls[0][0];
        expect(calledWith).toContain('Test Title');
        expect(calledWith).toContain('Test content');
      });
    });

    it('should call onFullContentChange when sections change', async () => {
      const initialSections: BoilerplateSection[] = [
        {
          id: 'main-1',
          type: 'main',
          content: '<p>Initial content</p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { rerender } = renderHook(
        ({ sections, title }) => useBoilerplateProcessing(sections, title, mockOnFullContentChange),
        { initialProps: { sections: initialSections, title: 'Initial Title' } }
      );

      await waitFor(() => {
        expect(mockOnFullContentChange).toHaveBeenCalled();
      });

      const callCountBefore = mockOnFullContentChange.mock.calls.length;

      const updatedSections: BoilerplateSection[] = [
        {
          id: 'main-1',
          type: 'main',
          content: '<p>Updated content</p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      rerender({ sections: updatedSections, title: 'Updated Title' });

      await waitFor(() => {
        expect(mockOnFullContentChange.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array', async () => {
      const { result } = renderHook(() =>
        useBoilerplateProcessing([], '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toBeTruthy();
        expect(result.current).toContain('text-gray-600'); // Date element
      });
    });

    it('should handle sections with empty content', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'empty-1',
          type: 'main',
          content: '',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });
    });

    it('should handle very long content', async () => {
      const longContent = '<p>' + 'Lorem ipsum '.repeat(500) + '</p>';
      const sections: BoilerplateSection[] = [
        {
          id: 'long-1',
          type: 'main',
          content: longContent,
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, '', mockOnFullContentChange)
      );

      await waitFor(() => {
        expect(result.current).toContain('Lorem ipsum');
        expect(result.current.length).toBeGreaterThan(1000);
      });
    });

    it('should handle mixed section types in complex scenario', async () => {
      const sections: BoilerplateSection[] = [
        {
          id: 'lead-1',
          type: 'lead',
          content: '<p><strong>Lead paragraph</strong></p>',
          order: 0,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'main-1',
          type: 'main',
          content: '<p>Main content paragraph</p>',
          order: 1,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'quote-1',
          type: 'quote',
          content: 'A meaningful quote',
          metadata: {
            person: 'Expert Name',
            role: 'Position',
            company: 'Company Name',
          },
          order: 2,
          isLocked: false,
          isCollapsed: false,
        },
        {
          id: 'bp-1',
          type: 'boilerplate',
          boilerplate: {
            id: 'bp-1',
            name: 'Company Info',
            content: '<p>Company boilerplate</p>',
            category: 'company',
            isGlobal: true,
            organizationId: 'org-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          order: 3,
          isLocked: false,
          isCollapsed: false,
        },
      ];

      const { result } = renderHook(() =>
        useBoilerplateProcessing(sections, 'Complex Title', mockOnFullContentChange)
      );

      await waitFor(() => {
        const content = result.current;
        expect(content).toContain('Complex Title');
        expect(content).toContain('Lead paragraph');
        expect(content).toContain('Main content paragraph');
        expect(content).toContain('A meaningful quote');
        expect(content).toContain('Company boilerplate');

        // Check order
        const titleIndex = content.indexOf('Complex Title');
        const leadIndex = content.indexOf('Lead paragraph');
        const mainIndex = content.indexOf('Main content paragraph');
        const quoteIndex = content.indexOf('A meaningful quote');
        const bpIndex = content.indexOf('Company boilerplate');

        expect(titleIndex).toBeLessThan(leadIndex);
        expect(leadIndex).toBeLessThan(mainIndex);
        expect(mainIndex).toBeLessThan(quoteIndex);
        expect(quoteIndex).toBeLessThan(bpIndex);
      });
    });
  });
});
