// src/__tests__/floating-ai-toolbar.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FloatingAIToolbar, AIAction } from '../components/FloatingAIToolbar';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import '@testing-library/jest-dom';

// Mock für TipTap Editor
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: () => null,
}));

// Mock für fetch API
global.fetch = jest.fn();

describe('FloatingAIToolbar', () => {
  let mockEditor: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Editor Setup - Erweitert für FloatingAIToolbar
    mockEditor = {
      state: {
        selection: {
          from: 0,
          to: 10,
          constructor: {
            create: jest.fn().mockReturnValue({
              from: 0,
              to: 10
            })
          }
        },
        doc: {
          textBetween: jest.fn().mockReturnValue('Test Text'),
          content: { size: 1000 }
        },
        schema: {
          text: jest.fn().mockImplementation((text) => ({ text }))
        },
        tr: {
          setSelection: jest.fn().mockReturnThis(),
          replaceSelectionWith: jest.fn().mockReturnThis()
        }
      },
      view: {
        dispatch: jest.fn(),
        state: {
          doc: {
            content: { size: 1000 }
          }
        },
        dom: document.createElement('div')
      },
      getHTML: jest.fn().mockReturnValue('<p>Test Content</p>'),
      chain: jest.fn().mockReturnThis(),
      focus: jest.fn().mockReturnThis(),
      insertContent: jest.fn().mockReturnThis(),
      setTextSelection: jest.fn().mockReturnThis(),
      run: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock window.getSelection
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 200,
        width: 100,
        height: 20,
        bottom: 120,
        right: 300
      })
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange
    };

    global.getSelection = jest.fn(() => mockSelection as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sollte nicht sichtbar sein ohne Text-Markierung', () => {
    mockEditor.state.doc.textBetween.mockReturnValue('');
    
    const { container } = render(
      <FloatingAIToolbar editor={mockEditor} />
    );
    
    // Toolbar sollte nicht im DOM sein
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeInTheDocument();
  });

  test('sollte bei Text-Markierung erscheinen', async () => {
    const { container } = render(
      <FloatingAIToolbar editor={mockEditor} />
    );

    // Simuliere Text-Selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    // Warte auf Animation
    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });

    expect(screen.getByText('Kürzen')).toBeInTheDocument();
    expect(screen.getByText('Erweitern')).toBeInTheDocument();
    expect(screen.getByText('Ton ändern')).toBeInTheDocument();
    expect(screen.getByText('Ton ändern')).toBeInTheDocument();
  });

  test('sollte Umformulieren-Aktion ausführen', async () => {
    const mockAIAction = jest.fn().mockResolvedValue('Neuer Text');
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection update
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });

    // Klicke auf Umformulieren
    fireEvent.click(screen.getByText('Umformulieren'));

    await waitFor(() => {
      expect(mockAIAction).toHaveBeenCalledWith('rephrase', 'Test Text');
      // FloatingAIToolbar nutzt jetzt view.dispatch statt chain().insertContent()
      expect(mockEditor.view.dispatch).toHaveBeenCalled();
    });
  });

  test('sollte Kürzen-Aktion ausführen', async () => {
    const mockAIAction = jest.fn().mockResolvedValue('Kurz');
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Kürzen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Kürzen'));

    await waitFor(() => {
      expect(mockAIAction).toHaveBeenCalledWith('shorten', 'Test Text');
    });
  });

  test('sollte Erweitern-Aktion ausführen', async () => {
    const mockAIAction = jest.fn().mockResolvedValue('Sehr langer erweiterter Text');
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Erweitern')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Erweitern'));

    await waitFor(() => {
      expect(mockAIAction).toHaveBeenCalledWith('expand', 'Test Text');
    });
  });

  test('sollte Ton-Dropdown anzeigen und Ton ändern', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Formeller Text' })
    });
    
    render(
      <FloatingAIToolbar editor={mockEditor} />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Ton ändern')).toBeInTheDocument();
    });

    // Öffne Dropdown
    fireEvent.click(screen.getByText('Ton ändern'));

    await waitFor(() => {
      expect(screen.getByText('Formell')).toBeInTheDocument();
      expect(screen.getByText('Locker')).toBeInTheDocument();
      expect(screen.getByText('Professionell')).toBeInTheDocument();
    });

    // Wähle einen Ton
    fireEvent.click(screen.getByText('Formell'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('formal')
        })
      );
    });
  });

  test('sollte alle Aktions-Buttons anzeigen', async () => {
    const mockAIAction = jest.fn().mockResolvedValue('Bearbeiteter Text');
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    // SEO-Button wurde entfernt - prüfe nur ob andere Buttons da sind
    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
      expect(screen.getByText('Kürzen')).toBeInTheDocument();
      expect(screen.getByText('Erweitern')).toBeInTheDocument();
      expect(screen.getByText('Ton ändern')).toBeInTheDocument();
    });
  });

  test('sollte Position über dem markierten Text berechnen', async () => {
    const { container } = render(
      <FloatingAIToolbar editor={mockEditor} />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      const toolbar = container.querySelector('.fixed');
      expect(toolbar).toHaveStyle({
        top: '40px', // 100 - 60
        left: '250px', // 200 + 100/2
        transform: 'translateX(-50%)'
      });
    });
  });

  test('sollte bei Blur ausgeblendet werden', async () => {
    render(
      <FloatingAIToolbar editor={mockEditor} />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });

    // Trigger blur
    const blurHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'blur'
    )?.[1];
    
    if (blurHandler) {
      blurHandler();
    }

    // Warte auf Timeout
    await waitFor(() => {
      expect(screen.queryByText('Umformulieren')).not.toBeInTheDocument();
    }, { timeout: 500 });
  });

  test('sollte Ladeindikator während Verarbeitung zeigen', async () => {
    const mockAIAction = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('Neuer Text'), 1000))
    );
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Umformulieren'));

    // Prüfe ob Ladeindikator erscheint
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  test('sollte Fehler behandeln wenn KI-API fehlschlägt', async () => {
    const mockAIAction = jest.fn().mockRejectedValue(new Error('API Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <FloatingAIToolbar 
        editor={mockEditor} 
        onAIAction={mockAIAction}
      />
    );

    // Trigger selection
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Umformulieren'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Aktion fehlgeschlagen:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('sollte nur bei Mindestlänge von 3 Zeichen erscheinen', async () => {
    // Teste mit zu kurzem Text
    mockEditor.state.doc.textBetween.mockReturnValue('ab');
    
    const { rerender } = render(
      <FloatingAIToolbar editor={mockEditor} />
    );

    // Trigger selection mit kurzem Text
    const selectionHandler = mockEditor.on.mock.calls.find(
      call => call[0] === 'selectionUpdate'
    )?.[1];
    
    if (selectionHandler) {
      selectionHandler();
    }

    // Toolbar sollte nicht erscheinen
    expect(screen.queryByText('Umformulieren')).not.toBeInTheDocument();

    // Teste mit ausreichend langem Text
    mockEditor.state.doc.textBetween.mockReturnValue('abc');
    
    if (selectionHandler) {
      selectionHandler();
    }

    // Toolbar sollte erscheinen
    await waitFor(() => {
      expect(screen.getByText('Umformulieren')).toBeInTheDocument();
    });
  });
});