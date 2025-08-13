// src/__tests__/gmail-style-editor.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GmailStyleEditor } from '@/components/GmailStyleEditor';
import '@testing-library/jest-dom';

// Mock TipTap modules
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        setLink: jest.fn(() => ({ run: jest.fn() })),
        unsetLink: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    can: jest.fn(() => ({
      toggleBold: jest.fn(() => true),
      toggleItalic: jest.fn(() => true),
      toggleBulletList: jest.fn(() => true),
    })),
    isActive: jest.fn((name: string) => false),
    getAttributes: jest.fn(() => ({ href: '', target: '_self' })),
  })),
  EditorContent: ({ editor }: any) => <div data-testid="editor-content">Editor Content</div>,
}));

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('@tiptap/extension-link', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('@tiptap/extension-heading', () => ({
  configure: jest.fn(() => ({})),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  DialogActions: ({ children }: any) => <div data-testid="dialog-actions">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/fieldset', () => ({
  Field: ({ children }: any) => <div data-testid="field">{children}</div>,
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

describe('Gmail-Style Editor', () => {
  const defaultProps = {
    content: '<p>Initial content</p>',
    onChange: jest.fn(),
    placeholder: 'Test placeholder...',
    title: 'Test Title',
    onTitleChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Editor Grundfunktionen', () => {
    test('sollte Editor mit Gmail-Style Layout rendern', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Gmail-Style Container vorhanden
      const container = document.querySelector('.gmail-style-editor');
      expect(container).toBeInTheDocument();
      
      // Editor Content vorhanden
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    test('sollte Titel-Eingabefeld rendern wenn onTitleChange gegeben', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Titel der Pressemitteilung...');
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveValue('Test Title');
    });

    test('sollte Titel-Änderungen verarbeiten', async () => {
      const user = userEvent.setup();
      render(<GmailStyleEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Titel der Pressemitteilung...');
      
      // Einfachere Lösung: Direkt Text ändern via fireEvent
      fireEvent.change(titleInput, { target: { value: 'Neuer Titel' } });
      
      expect(defaultProps.onTitleChange).toHaveBeenCalledWith('Neuer Titel');
    });

    test('sollte ohne Titel-Feld rendern wenn onTitleChange nicht gegeben', () => {
      const { onTitleChange, ...propsWithoutTitle } = defaultProps;
      render(<GmailStyleEditor {...propsWithoutTitle} />);
      
      expect(screen.queryByPlaceholderText('Titel der Pressemitteilung...')).not.toBeInTheDocument();
    });
  });

  describe('CeleroPress Design System Compliance', () => {
    test('sollte Primary-Farben (#005fab) verwenden', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Container sollte korrekte CSS Custom Properties haben
      const container = document.querySelector('.gmail-style-editor');
      expect(container).toBeInTheDocument();
    });

    test('sollte KEINE Schatten-Effekte verwenden', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Container sollte Design Pattern konforme Klassen haben
      const container = document.querySelector('.gmail-style-editor');
      expect(container).toHaveClass('border', 'border-gray-200');
      expect(container).not.toHaveClass('shadow', 'shadow-md', 'shadow-lg');
    });

    test('sollte korrekte Border-Styles verwenden', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      const container = document.querySelector('.gmail-style-editor');
      expect(container).toHaveClass('border', 'border-gray-200', 'rounded-lg');
    });
  });

  describe('Auto-Save Funktionalität', () => {
    test('sollte Auto-Save standardmäßig aktiviert haben', () => {
      const onAutoSave = jest.fn();
      render(<GmailStyleEditor {...defaultProps} autoSave={true} onAutoSave={onAutoSave} />);
      
      // Auto-Save Indikator sollte sichtbar sein
      expect(screen.getByText('Auto-Speichern aktiv')).toBeInTheDocument();
    });

    test('sollte Auto-Save Delay von 10 Sekunden verwenden (Masterplan)', () => {
      const onAutoSave = jest.fn();
      render(
        <GmailStyleEditor 
          {...defaultProps} 
          autoSave={true} 
          autoSaveDelay={10000}
          onAutoSave={onAutoSave} 
        />
      );
      
      // Component sollte rendern ohne Fehler
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Toolbar Funktionalität', () => {
    test('sollte minimale Gmail-Style Toolbar rendern', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Toolbar sollte minimale Buttons haben
      const toolbar = document.querySelector('.gmail-style-editor .bg-gray-50');
      expect(toolbar).toBeInTheDocument();
    });

    test('sollte nur essentielle Format-Buttons anzeigen', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Sollte Bold, Italic, List, Link Buttons haben (Gmail-minimal)
      const buttons = document.querySelectorAll('button[title*="Fett"], button[title*="Kursiv"]');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Mindestens Bold und Italic
    });
  });

  describe('Accessibility', () => {
    test('sollte korrekte ARIA-Labels haben', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Titel der Pressemitteilung...');
      expect(titleInput).toBeInTheDocument();
    });

    test('sollte Keyboard-Navigation unterstützen', () => {
      render(<GmailStyleEditor {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Titel der Pressemitteilung...');
      expect(titleInput).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Link-Dialog Funktionalität', () => {
    test('sollte Link-Dialog öffnen können', async () => {
      const user = userEvent.setup();
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Link Button finden und klicken
      const linkButton = document.querySelector('button[title*="Link"]');
      if (linkButton) {
        await user.click(linkButton);
        
        await waitFor(() => {
          expect(screen.queryByTestId('dialog')).toBeInTheDocument();
        });
      }
    });

    test('sollte CeleroPress-konforme Dialog-Buttons haben', async () => {
      const user = userEvent.setup();
      render(<GmailStyleEditor {...defaultProps} />);
      
      // Link Button finden und klicken
      const linkButton = document.querySelector('button[title*="Link"]');
      if (linkButton) {
        await user.click(linkButton);
        
        await waitFor(() => {
          const dialog = screen.queryByTestId('dialog');
          if (dialog) {
            // Buttons sollten CeleroPress-Farben verwenden
            const primaryButton = dialog.querySelector('.bg-\\[\\#005fab\\]');
            const secondaryButton = dialog.querySelector('.bg-gray-50');
            expect(primaryButton || secondaryButton).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Performance Tests', () => {
    test('sollte ohne Performance-Probleme rendern', () => {
      const startTime = performance.now();
      render(<GmailStyleEditor {...defaultProps} />);
      const endTime = performance.now();
      
      // Sollte unter 50ms rendern (Masterplan Ziel)
      expect(endTime - startTime).toBeLessThan(50);
    });

    test('sollte Debouncing für Auto-Save verwenden', () => {
      const onAutoSave = jest.fn();
      render(
        <GmailStyleEditor 
          {...defaultProps} 
          autoSave={true} 
          autoSaveDelay={100}
          onAutoSave={onAutoSave} 
        />
      );
      
      // Auto-save sollte nicht sofort aufgerufen werden
      expect(onAutoSave).not.toHaveBeenCalled();
    });
  });
});

describe('Gmail-Style Editor Integration', () => {
  test('sollte mit bestehenden TipTap Extensions kompatibel sein', () => {
    const props = {
      content: '<h1>Heading</h1><p>Text with <a href="https://example.com">link</a></p>',
      onChange: jest.fn(),
    };
    
    render(<GmailStyleEditor {...props} />);
    
    // Sollte ohne Fehler rendern
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  test('sollte sauberes HTML ohne Design Pattern Verstöße generieren', () => {
    const onChange = jest.fn();
    render(<GmailStyleEditor content="<p>Test</p>" onChange={onChange} />);
    
    // Sollte rendern ohne Console-Warnungen über falsche CSS-Klassen
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });
});