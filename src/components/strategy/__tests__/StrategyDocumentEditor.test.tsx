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

jest.mock('@tiptap/extension-table', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => 'Table')
  }
}));

jest.mock('@tiptap/extension-table-row', () => ({
  __esModule: true,
  default: 'TableRow'
}));

jest.mock('@tiptap/extension-table-header', () => ({
  __esModule: true,
  default: 'TableHeader'
}));

jest.mock('@tiptap/extension-table-cell', () => ({
  __esModule: true,
  default: 'TableCell'
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
  DocumentIcon: () => <span data-testid="document-icon">Document</span>,
  TableCellsIcon: () => <span data-testid="table-cells-icon">Table</span>
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
    insertTable: jest.fn(() => commands),
    addColumnBefore: jest.fn(() => commands),
    addColumnAfter: jest.fn(() => commands),
    deleteColumn: jest.fn(() => commands),
    addRowBefore: jest.fn(() => commands),
    addRowAfter: jest.fn(() => commands),
    deleteRow: jest.fn(() => commands),
    deleteTable: jest.fn(() => commands),
    run: jest.fn()
  };

  const chainMethods = {
    focus: jest.fn(() => chainMethods),
    toggleBold: jest.fn(() => chainMethods),
    toggleItalic: jest.fn(() => chainMethods),
    toggleHeading: jest.fn(() => chainMethods),
    toggleBulletList: jest.fn(() => chainMethods),
    toggleOrderedList: jest.fn(() => chainMethods),
    toggleBlockquote: jest.fn(() => chainMethods),
    toggleCodeBlock: jest.fn(() => chainMethods),
    insertTable: jest.fn(() => chainMethods),
    addColumnBefore: jest.fn(() => chainMethods),
    addColumnAfter: jest.fn(() => chainMethods),
    deleteColumn: jest.fn(() => chainMethods),
    addRowBefore: jest.fn(() => chainMethods),
    addRowAfter: jest.fn(() => chainMethods),
    deleteRow: jest.fn(() => chainMethods),
    deleteTable: jest.fn(() => chainMethods),
    run: jest.fn()
  };

  return {
    commands,
    chain: jest.fn(() => chainMethods),
    isActive: jest.fn((type: string, attrs?: any) => {
      if (type === 'bold' && overrides.boldActive) return true;
      if (type === 'italic' && overrides.italicActive) return true;
      if (type === 'heading' && attrs?.level === 1 && overrides.h1Active) return true;
      if (type === 'heading' && attrs?.level === 2 && overrides.h2Active) return true;
      if (type === 'bulletList' && overrides.bulletListActive) return true;
      if (type === 'orderedList' && overrides.orderedListActive) return true;
      if (type === 'blockquote' && overrides.blockquoteActive) return true;
      if (type === 'codeBlock' && overrides.codeBlockActive) return true;
      if (type === 'table' && overrides.tableActive) return true;
      return false;
    }),
    getHTML: jest.fn(() => overrides.htmlContent || '<p>Test content</p>'),
    storage: {
      characterCount: {
        characters: jest.fn(() => overrides.characterCount !== undefined ? overrides.characterCount : 42)
      }
    },
    ...overrides
  };
}

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
  let mockEditor: any;

  beforeEach(() => {
    // Erstelle neuen Mock fuer jeden Test
    mockEditor = createMockEditor();
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
      
      expect(screen.getByText(/Bearbeitung/)).toBeInTheDocument();
      expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      expect(screen.getByText(/1\.1\.2024/)).toBeInTheDocument();
    });
    
    test('sollte Loading-State korrekt anzeigen', () => {
      useEditor.mockReturnValue(null); // Editor not ready
      
      render(<StrategyDocumentEditor {...defaultProps} />);
      
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument();
    });
    
    test('sollte alle Toolbar-Buttons rendern', () => {
      render(<StrategyDocumentEditor {...defaultProps} />);

      // Text-Formatierung
      expect(screen.getByTitle('Fett (Strg+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Kursiv (Strg+I)')).toBeInTheDocument();

      // Überschriften
      expect(screen.getByTitle('Überschrift 1')).toBeInTheDocument();
      expect(screen.getByTitle('Überschrift 2')).toBeInTheDocument();

      // Listen
      expect(screen.getByTitle('Aufzählungsliste')).toBeInTheDocument();
      expect(screen.getByTitle('Nummerierte Liste')).toBeInTheDocument();

      // Sonstige
      expect(screen.getByTitle('Zitat')).toBeInTheDocument();
      expect(screen.getByTitle('Code-Block')).toBeInTheDocument();
      expect(screen.getByTitle('Tabelle einfügen (3x3)')).toBeInTheDocument();
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

      const boldButton = screen.getByTitle('Fett (Strg+B)');
      await user.click(boldButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte Italic-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const italicButton = screen.getByTitle('Kursiv (Strg+I)');
      await user.click(italicButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte H1-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const h1Button = screen.getByTitle('Überschrift 1');
      await user.click(h1Button);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte H2-Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const h2Button = screen.getByTitle('Überschrift 2');
      await user.click(h2Button);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte Bullet List Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const bulletListButton = screen.getByTitle('Aufzählungsliste');
      await user.click(bulletListButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte Ordered List Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const orderedListButton = screen.getByTitle('Nummerierte Liste');
      await user.click(orderedListButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte Blockquote Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const blockquoteButton = screen.getByTitle('Zitat');
      await user.click(blockquoteButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
    });
    
    test('sollte Code Block Button korrekt funktionieren', async () => {
      const user = userEvent.setup();

      render(<StrategyDocumentEditor {...defaultProps} />);

      const codeBlockButton = screen.getByTitle('Code-Block');
      await user.click(codeBlockButton);

      // Chain Mock wird aufgerufen
      expect(mockEditor.chain).toHaveBeenCalled();
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
      const boldButton = screen.getByTitle('Fett (Strg+B)');
      const italicButton = screen.getByTitle('Kursiv (Strg+I)');
      const h1Button = screen.getByTitle('Überschrift 1');
      const bulletListButton = screen.getByTitle('Aufzählungsliste');

      expect(boldButton).toHaveClass('bg-blue-100');
      expect(italicButton).toHaveClass('bg-blue-100');
      expect(h1Button).toHaveClass('bg-blue-100');
      expect(bulletListButton).toHaveClass('bg-blue-100');
    });
    
    test('sollte nicht-aktive Formatierungen korrekt anzeigen', () => {
      const inactiveEditor = createMockEditor({
        boldActive: false,
        italicActive: false
      });

      useEditor.mockReturnValue(inactiveEditor);

      render(<StrategyDocumentEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Fett (Strg+B)');
      const italicButton = screen.getByTitle('Kursiv (Strg+I)');

      expect(boldButton).not.toHaveClass('bg-blue-100');
      expect(italicButton).not.toHaveClass('bg-blue-100');
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

      const saveButton = screen.getByRole('button', { name: /Speichern/ });
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
      const saveButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(saveButton);

      // Prüfe Loading-State
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Speichern\.\.\./ })).toBeDisabled();
      });

      // Speichern abschließen
      resolveSave!();

      // Warte bis der Button wieder normal ist
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Speichern/ });
        expect(button).not.toHaveAttribute('disabled');
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
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Speichern/ })).not.toBeDisabled();
      });
      
      consoleErrorSpy.mockRestore();
    });
    
    test('sollte Save-Button bei isLoading deaktivieren', () => {
      render(
        <StrategyDocumentEditor
          {...defaultProps}
          isLoading={true}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Speichern/ });
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
          content: '<p>Beginnen Sie hier mit der Erstellung Ihres Strategiedokuments...</p>'
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
      expect(screen.getByText(/1\.1\.2024/)).toBeInTheDocument();
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
        characterCount: 0
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
      const saveButton = screen.getByRole('button', { name: /Speichern/ });

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
      const saveButton = screen.getByRole('button', { name: /Speichern/ });
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/ });

      expect(saveButton).toBeAccessible();
      expect(cancelButton).toBeAccessible();

      // Toolbar Buttons
      const boldButton = screen.getByTitle('Fett (Strg+B)');
      const italicButton = screen.getByTitle('Kursiv (Strg+I)');

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

      // Alle sollten button-Rolle haben (native buttons oder mit role="button")
      buttons.forEach(button => {
        expect(button.tagName.toLowerCase() === 'button' || button.getAttribute('role') === 'button').toBe(true);
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
      const boldButton = screen.getByTitle('Fett (Strg+B)');
      await user.click(boldButton);

      // 3. Überschrift hinzufügen
      const h1Button = screen.getByTitle('Überschrift 1');
      await user.click(h1Button);

      // 4. Liste hinzufügen
      const bulletListButton = screen.getByTitle('Aufzählungsliste');
      await user.click(bulletListButton);

      // 5. Speichern
      const saveButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(saveButton);

      // Prüfe dass chain() aufgerufen wurde
      expect(editorWithContent.chain).toHaveBeenCalled();

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
    const tagName = received.tagName.toLowerCase();
    const hasValidRole = received.hasAttribute('role') || ['button', 'input', 'textarea', 'a', 'select'].includes(tagName);
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
        message: () => `Expected element to be accessible: missing role, aria-hidden, or invalid tabindex (tag: ${tagName}, hasRole: ${hasValidRole})`,
        pass: false,
      };
    }
  },
});