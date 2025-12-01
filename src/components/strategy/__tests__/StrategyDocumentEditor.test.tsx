// src/components/strategy/__tests__/StrategyDocumentEditor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import StrategyDocumentEditor from '../StrategyDocumentEditor';
import type { StrategyDocument } from '@/lib/firebase/strategy-document-service';

// ========================================
// MOCKS
// ========================================

// TipTap Editor Mocks
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: { editor: any }) => (
    <div data-testid="editor-content">
      {editor ? 'Editor geladen' : 'Editor wird geladen...'}
    </div>
  )
}));

jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: 'StarterKit'
}));

jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => 'Link')
  }
}));

// UI Component Mocks
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant || 'default'} ${className || ''}`}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>
      {children}
    </span>
  )
}));

// Heroicons Mocks
jest.mock('@heroicons/react/24/outline', () => ({
  ListBulletIcon: () => <span data-testid="list-bullet-icon">List</span>,
  CodeBracketIcon: () => <span data-testid="code-bracket-icon">Code</span>,
  LinkIcon: () => <span data-testid="link-icon">Link</span>,
  DocumentIcon: () => <span data-testid="document-icon">Document</span>
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = {
  toDate: () => new Date('2024-01-01T10:00:00Z'),
  seconds: 1704096000,
  nanoseconds: 0
} as any;

const mockStrategyDocument: StrategyDocument = {
  id: 'doc-123',
  projectId: 'project-456',
  title: 'Test Strategiedokument',
  type: 'strategy',
  content: '<h1>Test Content</h1><p>Inhalt des Dokuments</p>',
  plainText: 'Test Content\nInhalt des Dokuments',
  status: 'draft',
  author: 'test-user-456',
  authorName: 'Test User',
  version: 1,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  organizationId: 'test-org-123'
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function createMockEditor(overrides: any = {}): any {
  const commands: any = {
    setContent: jest.fn(),
    focus: jest.fn(() => commands),
    toggleBold: jest.fn(() => commands),
    toggleItalic: jest.fn(() => commands),
    toggleHeading: jest.fn(() => commands),
    toggleBulletList: jest.fn(() => commands),
    toggleOrderedList: jest.fn(() => commands),
    toggleBlockquote: jest.fn(() => commands),
    toggleCodeBlock: jest.fn(() => commands),
    run: jest.fn()
  };

  return {
    commands,
    isActive: jest.fn((type: string, attrs?: any) => {
      if (type === 'bold' && overrides.boldActive) return true;
      if (type === 'italic' && overrides.italicActive) return true;
      if (type === 'heading' && attrs?.level === 1 && overrides.h1Active) return true;
      if (type === 'heading' && attrs?.level === 2 && overrides.h2Active) return true;
      if (type === 'bulletList' && overrides.bulletListActive) return true;
      if (type === 'orderedList' && overrides.orderedListActive) return true;
      if (type === 'blockquote' && overrides.blockquoteActive) return true;
      if (type === 'codeBlock' && overrides.codeBlockActive) return true;
      return false;
    }),
    getHTML: jest.fn(() => overrides.htmlContent || '<p>Test content</p>'),
    storage: {
      characterCount: {
        characters: jest.fn(() => overrides.characterCount || 42)
      }
    },
    ...overrides
  };
}

const mockEditor: any = createMockEditor();

// ========================================
// TEST SETUP
// ========================================

const defaultProps = {
  onSave: jest.fn() as jest.MockedFunction<(content: string, title: string) => Promise<void>>,
  onCancel: jest.fn() as jest.MockedFunction<() => void>,
  isLoading: false
};

// Mock useEditor Hook
const { useEditor } = require('@tiptap/react');

describe('StrategyDocumentEditor', () => {
  
  beforeEach(() => {
    useEditor.mockReturnValue(mockEditor);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC RENDERING TESTS
  // ========================================
  
  describe('Basic Rendering', () => {
    
    test('sollte Editor ohne Dokument korrekt rendern', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Dokumenttitel eingeben...')).toBeInTheDocument();
      expect(screen.getByText('Speichern')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      expect(screen.getByText('Editor geladen')).toBeInTheDocument();
    });
    
    test('sollte Editor mit vorhandenem Dokument korrekt rendern', () => {
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={mockStrategyDocument}
        />
      );
      
      const titleInput = screen.getByDisplayValue('Test Strategiedokument');
      expect(titleInput).toBeInTheDocument();
      
      expect(screen.getByText('Bearbeitung')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getByText('01.01.2024')).toBeInTheDocument();
    });
    
    test('sollte Loading-State korrekt anzeigen', () => {
      useEditor.mockReturnValue(null); // Editor not ready
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument();
    });
    
    test('sollte alle Toolbar-Buttons rendern', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Text-Formatierung
      expect(screen.getByRole('button', { name: /B/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /I/i })).toBeInTheDocument();
      
      // Überschriften
      expect(screen.getByRole('button', { name: /H1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /H2/i })).toBeInTheDocument();
      
      // Listen
      expect(screen.getByTestId('list-bullet-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /1\./i })).toBeInTheDocument();
      
      // Sonstige
      expect(screen.getByRole('button', { name: /"/i })).toBeInTheDocument(); // Blockquote
      expect(screen.getByTestId('code-bracket-icon')).toBeInTheDocument();
    });

  });

  // ========================================
  // EDITOR INTERACTION TESTS
  // ========================================
  
  describe('Editor Interactions', () => {
    
    test('sollte Titel-Eingabe korrekt handhaben', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      
      await user.type(titleInput, 'Neuer Titel');
      
      expect(titleInput).toHaveValue('Neuer Titel');
    });
    
    test('sollte Bold-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /B/i });
      await user.click(boldButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleBold).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte Italic-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const italicButton = screen.getByRole('button', { name: /I/i });
      await user.click(italicButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleItalic).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte H1-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const h1Button = screen.getByRole('button', { name: /H1/i });
      await user.click(h1Button);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleHeading).toHaveBeenCalledWith({ level: 1 });
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte H2-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const h2Button = screen.getByRole('button', { name: /H2/i });
      await user.click(h2Button);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleHeading).toHaveBeenCalledWith({ level: 2 });
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte Bullet List Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const bulletListButton = screen.getByTestId('list-bullet-icon').closest('button')!;
      await user.click(bulletListButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleBulletList).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte Ordered List Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const orderedListButton = screen.getByRole('button', { name: /1\./i });
      await user.click(orderedListButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleOrderedList).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte Blockquote Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const blockquoteButton = screen.getByRole('button', { name: /"/i });
      await user.click(blockquoteButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleBlockquote).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });
    
    test('sollte Code Block Button korrekt funktionieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const codeBlockButton = screen.getByTestId('code-bracket-icon').closest('button')!;
      await user.click(codeBlockButton);
      
      expect(mockEditor.commands.focus).toHaveBeenCalled();
      expect(mockEditor.commands.toggleCodeBlock).toHaveBeenCalled();
      expect(mockEditor.commands.run).toHaveBeenCalled();
    });

  });

  // ========================================
  // ACTIVE STATE TESTS
  // ========================================
  
  describe('Active States', () => {
    
    test('sollte aktive Formatierungen in Toolbar anzeigen', () => {
      const activeEditor = createMockEditor({
        boldActive: true,
        italicActive: true,
        h1Active: true,
        bulletListActive: true
      });
      
      useEditor.mockReturnValue(activeEditor);
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Prüfe CSS-Klassen für aktive Zustände
      const boldButton = screen.getByRole('button', { name: /B/i });
      const italicButton = screen.getByRole('button', { name: /I/i });
      const h1Button = screen.getByRole('button', { name: /H1/i });
      const bulletListButton = screen.getByTestId('list-bullet-icon').closest('button')!;
      
      expect(boldButton).toHaveClass('bg-gray-200');
      expect(italicButton).toHaveClass('bg-gray-200');
      expect(h1Button).toHaveClass('bg-gray-200');
      expect(bulletListButton).toHaveClass('bg-gray-200');
    });
    
    test('sollte nicht-aktive Formatierungen korrekt anzeigen', () => {
      const inactiveEditor = createMockEditor({
        boldActive: false,
        italicActive: false
      });
      
      useEditor.mockReturnValue(inactiveEditor);
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /B/i });
      const italicButton = screen.getByRole('button', { name: /I/i });
      
      expect(boldButton).not.toHaveClass('bg-gray-200');
      expect(italicButton).not.toHaveClass('bg-gray-200');
    });

  });

  // ========================================
  // SAVE FUNCTIONALITY TESTS
  // ========================================
  
  describe('Save Functionality', () => {
    
    test('sollte Dokument erfolgreich speichern', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<(content: string, title: string) => Promise<void>>;

      const editorWithContent = createMockEditor({
        htmlContent: '<h1>Gespeicherter Inhalt</h1>'
      });
      useEditor.mockReturnValue(editorWithContent);

      render(
        <StrategyDocumentEditor
          {...defaultProps}
          onSave={mockOnSave}
        />
      );
      
      // Titel eingeben
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      await user.type(titleInput, 'Test Titel');
      
      // Speichern Button klicken
      const saveButton = screen.getByText('Speichern');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          '<h1>Gespeicherter Inhalt</h1>',
          'Test Titel'
        );
      });
    });
    
    test('sollte Speichern-Button bei leerem Titel deaktivieren', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const saveButton = screen.getByText('Speichern');
      expect(saveButton).toBeDisabled();
    });
    
    test('sollte Loading-State beim Speichern anzeigen', async () => {
      const user = userEvent.setup();
      let resolveSave: (value: void) => void;
      const mockOnSave = jest.fn(() => new Promise<void>((resolve) => {
        resolveSave = resolve;
      })) as unknown as jest.MockedFunction<(content: string, title: string) => Promise<void>>;

      render(
        <StrategyDocumentEditor
          {...defaultProps}
          onSave={mockOnSave}
        />
      );
      
      // Titel eingeben
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      await user.type(titleInput, 'Test Titel');
      
      // Speichern Button klicken
      const saveButton = screen.getByText('Speichern');
      await user.click(saveButton);
      
      // Prüfe Loading-State
      expect(screen.getByText('Speichern...')).toBeInTheDocument();
      expect(screen.getByText('Speichern...')).toBeDisabled();
      
      // Speichern abschließen
      resolveSave!();
      
      await waitFor(() => {
        expect(screen.getByText('Speichern')).toBeInTheDocument();
      });
    });
    
    test('sollte Fehler beim Speichern korrekt behandeln', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed')) as jest.MockedFunction<(content: string, title: string) => Promise<void>>;
      
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          onSave={mockOnSave}
        />
      );
      
      // Titel eingeben
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      await user.type(titleInput, 'Test Titel');
      
      // Speichern Button klicken
      const saveButton = screen.getByText('Speichern');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Fehler beim Speichern:', expect.any(Error));
      });
      
      // Button sollte wieder aktiviert sein
      expect(screen.getByText('Speichern')).not.toBeDisabled();
      
      consoleErrorSpy.mockRestore();
    });
    
    test('sollte Save-Button bei isLoading deaktivieren', () => {
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          isLoading={true}
        />
      );
      
      const saveButton = screen.getByText('Speichern');
      expect(saveButton).toBeDisabled();
    });

  });

  // ========================================
  // CANCEL FUNCTIONALITY TESTS
  // ========================================
  
  describe('Cancel Functionality', () => {
    
    test('sollte onCancel beim Klick auf Abbrechen aufrufen', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn() as jest.MockedFunction<() => void>;

      render(
        <StrategyDocumentEditor
          {...defaultProps}
          onCancel={mockOnCancel}
        />
      );
      
      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

  });

  // ========================================
  // DOCUMENT CONTENT LOADING TESTS
  // ========================================
  
  describe('Document Content Loading', () => {
    
    test('sollte Dokument-Content in Editor laden wenn Editor bereit ist', () => {
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={mockStrategyDocument}
        />
      );
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(
        '<h1>Test Content</h1><p>Inhalt des Dokuments</p>'
      );
    });
    
    test('sollte Default-Content verwenden wenn kein Dokument vorhanden', () => {
      // useEditor wird mit initialem Content aufgerufen
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Prüfe useEditor Aufruf
      expect(useEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Beginnen Sie hier mit der Erstellung Ihres Strategiedokuments...'
        })
      );
    });
    
    test('sollte Content aktualisieren wenn sich Dokument ändert', () => {
      const { rerender } = render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Dokument hinzufügen
      rerender(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={mockStrategyDocument}
        />
      );
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(
        '<h1>Test Content</h1><p>Inhalt des Dokuments</p>'
      );
    });

  });

  // ========================================
  // STATUS BAR TESTS
  // ========================================
  
  describe('Status Bar', () => {
    
    test('sollte Status Bar für neues Dokument korrekt anzeigen', () => {
      const editorWithCharCount = createMockEditor({
        characterCount: 125
      });
      useEditor.mockReturnValue(editorWithCharCount);
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByText(/Neues Dokument/)).toBeInTheDocument();
      expect(screen.getByText(/Typ: strategy/)).toBeInTheDocument();
      expect(screen.getByText(/125 Zeichen/)).toBeInTheDocument();
    });
    
    test('sollte Status Bar für vorhandenes Dokument korrekt anzeigen', () => {
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={mockStrategyDocument}
        />
      );
      
      expect(screen.getByText(/Bearbeitung/)).toBeInTheDocument();
      expect(screen.getByText(/Typ: strategy/)).toBeInTheDocument();
      expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      expect(screen.getByText(/01.01.2024/)).toBeInTheDocument();
    });
    
    test('sollte Zeichenzählung korrekt anzeigen', () => {
      const editorWithCharCount = createMockEditor({
        characterCount: 0
      });
      useEditor.mockReturnValue(editorWithCharCount);
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByText(/0 Zeichen/)).toBeInTheDocument();
    });

  });

  // ========================================
  // EDGE CASES TESTS
  // ========================================
  
  describe('Edge Cases', () => {
    
    test('sollte mit fehlendem updatedAt korrekt umgehen', () => {
      const documentWithoutDate = {
        ...mockStrategyDocument,
        updatedAt: null as any
      };
      
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={documentWithoutDate}
        />
      );
      
      expect(screen.getByText(/Unbekannt/)).toBeInTheDocument();
    });
    
    test('sollte mit Editor ohne characterCount korrekt umgehen', () => {
      const editorWithoutCharCount = createMockEditor({
        characterCount: undefined
      });
      useEditor.mockReturnValue(editorWithoutCharCount);
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByText(/0 Zeichen/)).toBeInTheDocument();
    });
    
    test('sollte verschiedene Document Types korrekt anzeigen', () => {
      const briefingDocument = {
        ...mockStrategyDocument,
        type: 'briefing' as const
      };
      
      render(
        <StrategyDocumentEditor 
          {...defaultProps}
          document={briefingDocument}
        />
      );
      
      expect(screen.getByText(/Typ: briefing/)).toBeInTheDocument();
    });
    
    test('sollte Titel-Eingabe mit Leerzeichen korrekt validieren', async () => {
      const user = userEvent.setup();
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      const saveButton = screen.getByText('Speichern');
      
      // Nur Leerzeichen eingeben
      await user.type(titleInput, '   ');
      
      // Button sollte deaktiviert bleiben
      expect(saveButton).toBeDisabled();
      
      // Echten Titel eingeben
      await user.clear(titleInput);
      await user.type(titleInput, '  Echter Titel  ');
      
      // Button sollte aktiviert werden
      expect(saveButton).not.toBeDisabled();
    });

  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================
  
  describe('Accessibility', () => {
    
    test('sollte alle Interactive Elements zugänglich sein', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Titel Input
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      expect(titleInput).toBeAccessible();
      
      // Buttons
      const saveButton = screen.getByText('Speichern');
      const cancelButton = screen.getByText('Abbrechen');
      
      expect(saveButton).toBeAccessible();
      expect(cancelButton).toBeAccessible();
      
      // Toolbar Buttons
      const boldButton = screen.getByRole('button', { name: /B/i });
      const italicButton = screen.getByRole('button', { name: /I/i });
      
      expect(boldButton).toBeAccessible();
      expect(italicButton).toBeAccessible();
    });
    
    test('sollte korrekte ARIA-Attribute haben', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      // Editor sollte als Hauptbereich identifizierbar sein
      const editorContainer = screen.getByTestId('editor-content');
      expect(editorContainer).toBeInTheDocument();
      
      // Buttons sollten korrekte Rollen haben
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================
  
  describe('Integration Tests', () => {
    
    test('sollte kompletten Editor-Workflow abbilden', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<(content: string, title: string) => Promise<void>>;

      const editorWithContent = createMockEditor({
        htmlContent: '<h1>Integration Test</h1><p><strong>Fetter Text</strong></p>'
      });
      useEditor.mockReturnValue(editorWithContent);

      render(
        <StrategyDocumentEditor
          {...defaultProps}
          onSave={mockOnSave}
        />
      );
      
      // 1. Titel eingeben
      const titleInput = screen.getByPlaceholderText('Dokumenttitel eingeben...');
      await user.type(titleInput, 'Integration Test Dokument');
      
      // 2. Text formatieren
      const boldButton = screen.getByRole('button', { name: /B/i });
      await user.click(boldButton);
      
      // 3. Überschrift hinzufügen
      const h1Button = screen.getByRole('button', { name: /H1/i });
      await user.click(h1Button);
      
      // 4. Liste hinzufügen
      const bulletListButton = screen.getByTestId('list-bullet-icon').closest('button')!;
      await user.click(bulletListButton);
      
      // 5. Speichern
      const saveButton = screen.getByText('Speichern');
      await user.click(saveButton);
      
      // Prüfe dass alle Aktionen ausgeführt wurden
      expect(mockEditor.commands.toggleBold).toHaveBeenCalled();
      expect(mockEditor.commands.toggleHeading).toHaveBeenCalledWith({ level: 1 });
      expect(mockEditor.commands.toggleBulletList).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          '<h1>Integration Test</h1><p><strong>Fetter Text</strong></p>',
          'Integration Test Dokument'
        );
      });
    });

  });

});

// ========================================
// CUSTOM MATCHERS
// ========================================

// Erweitere Jest Matchers für bessere Accessibility Tests
declare global {
  namespace jest {
    interface Matchers<R = void> {
      toBeAccessible(): R;
    }
  }
}

expect.extend({
  toBeAccessible(received: HTMLElement) {
    // Basis-Accessibility Checks
    const hasValidRole = received.hasAttribute('role') || received.tagName.toLowerCase() in ['button', 'input', 'textarea'];
    const isNotAriaHidden = received.getAttribute('aria-hidden') !== 'true';
    const hasValidTabIndex = !received.hasAttribute('tabindex') || parseInt(received.getAttribute('tabindex') || '0') >= -1;

    const pass = hasValidRole && isNotAriaHidden && hasValidTabIndex;

    if (pass) {
      return {
        message: () => `Expected element not to be accessible`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to be accessible: missing role, aria-hidden, or invalid tabindex`,
        pass: false,
      };
    }
  },
});