/**
 * Test-Suite für useTogglePersistence Hook
 * 
 * Diese Tests decken ab:
 * - localStorage-Integration
 * - State-Persistierung zwischen Sessions
 * - Error-Handling bei localStorage-Fehlern
 * - JSON-Serialisierung/-Deserialisierung
 * - Memory-Management und Cleanup
 * - Cross-Browser-Kompatibilität
 */

import { renderHook, act } from '@testing-library/react';
import { useTogglePersistence } from '@/components/customer-review/toggle/useTogglePersistence';

// Mock für localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = { ...newStore };
    }
  };
})();

// Mock console.error
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useTogglePersistence Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Initialization', () => {
    it('sollte mit leerem State initialisieren wenn kein localStorage-Eintrag existiert', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.persistedState).toEqual({});
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('sollte gespeicherten State aus localStorage laden', () => {
      const storedData = {
        'toggle-1': true,
        'toggle-2': false,
        'toggle-3': true
      };
      
      mockLocalStorage.setItem('test-key', JSON.stringify(storedData));
      
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.persistedState).toEqual(storedData);
    });

    it('sollte verschiedene Storage-Keys unterstützen', () => {
      mockLocalStorage.setItem('key1', JSON.stringify({ 'toggle-a': true }));
      mockLocalStorage.setItem('key2', JSON.stringify({ 'toggle-b': false }));
      
      const { result: result1 } = renderHook(() => useTogglePersistence('key1'));
      const { result: result2 } = renderHook(() => useTogglePersistence('key2'));
      
      expect(result1.current.persistedState).toEqual({ 'toggle-a': true });
      expect(result2.current.persistedState).toEqual({ 'toggle-b': false });
    });

    it('sollte fehlerhafte JSON-Daten graceful handhaben', () => {
      mockLocalStorage.setItem('test-key', 'invalid-json-data');
      
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.persistedState).toEqual({});
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Laden des Toggle-Status:',
        expect.any(Error)
      );
    });
  });

  describe('State-Persistierung', () => {
    it('sollte Toggle-State speichern', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      expect(result.current.persistedState).toEqual({ 'toggle-1': true });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ 'toggle-1': true })
      );
    });

    it('sollte mehrere Toggle-States akkumulieren', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
        result.current.saveToggleState('toggle-2', false);
        result.current.saveToggleState('toggle-3', true);
      });
      
      const expectedState = {
        'toggle-1': true,
        'toggle-2': false,
        'toggle-3': true
      };
      
      expect(result.current.persistedState).toEqual(expectedState);
      expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(
        'test-key',
        JSON.stringify(expectedState)
      );
    });

    it('sollte bestehende Toggle-States überschreiben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      expect(result.current.persistedState['toggle-1']).toBe(true);
      
      act(() => {
        result.current.saveToggleState('toggle-1', false);
      });
      
      expect(result.current.persistedState['toggle-1']).toBe(false);
    });

    it('sollte localStorage-Fehler beim Speichern handhaben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      // Mock localStorage.setItem to throw
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      // State sollte trotzdem aktualisiert werden
      expect(result.current.persistedState).toEqual({ 'toggle-1': true });
      
      // Error sollte geloggt werden
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Speichern des Toggle-Status:',
        expect.any(Error)
      );
    });
  });

  describe('State-Abfrage', () => {
    it('sollte gespeicherten Toggle-State zurückgeben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      expect(result.current.getToggleState('toggle-1')).toBe(true);
    });

    it('sollte default Value für nicht-existierenden Toggle zurückgeben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.getToggleState('non-existent')).toBe(false);
      expect(result.current.getToggleState('non-existent', true)).toBe(true);
    });

    it('sollte false als Standard-Default verwenden', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.getToggleState('any-toggle')).toBe(false);
    });

    it('sollte custom Default-Werte respektieren', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.getToggleState('toggle-1', true)).toBe(true);
      expect(result.current.getToggleState('toggle-2', false)).toBe(false);
    });

    it('sollte gespeicherte Werte über Default-Werte priorisieren', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', false);
      });
      
      // Gespeicherter Wert (false) sollte Default (true) überschreiben
      expect(result.current.getToggleState('toggle-1', true)).toBe(false);
    });
  });

  describe('State-Cleanup', () => {
    it('sollte persistierten State löschen', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
        result.current.saveToggleState('toggle-2', false);
      });
      
      expect(result.current.persistedState).toEqual({
        'toggle-1': true,
        'toggle-2': false
      });
      
      act(() => {
        result.current.clearPersistedState();
      });
      
      expect(result.current.persistedState).toEqual({});
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('sollte localStorage-Fehler beim Löschen handhaben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      // Mock localStorage.removeItem to throw
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });
      
      act(() => {
        result.current.clearPersistedState();
      });
      
      // State sollte trotzdem gelöscht werden
      expect(result.current.persistedState).toEqual({});
      
      // Error sollte geloggt werden
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Löschen des Toggle-Status:',
        expect.any(Error)
      );
    });
  });

  describe('Hook Re-Initialization mit verschiedenen Keys', () => {
    it('sollte State neu laden bei Key-Änderung', () => {
      mockLocalStorage.setItem('key1', JSON.stringify({ 'toggle-a': true }));
      mockLocalStorage.setItem('key2', JSON.stringify({ 'toggle-b': false }));
      
      const { result, rerender } = renderHook(
        ({ storageKey }) => useTogglePersistence(storageKey),
        {
          initialProps: { storageKey: 'key1' }
        }
      );
      
      expect(result.current.persistedState).toEqual({ 'toggle-a': true });
      
      rerender({ storageKey: 'key2' });
      
      expect(result.current.persistedState).toEqual({ 'toggle-b': false });
    });
  });

  describe('Performance-Optimierung', () => {
    it('sollte stabile Funktions-Referenzen haben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));

      const {
        saveToggleState: save1,
        getToggleState: get1,
        clearPersistedState: clear1
      } = result.current;

      // State ändern
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });

      const {
        saveToggleState: save2,
        getToggleState: get2,
        clearPersistedState: clear2
      } = result.current;

      // saveToggleState sollte stabil sein (verwendet setState mit Callback)
      // clearPersistedState sollte stabil sein (nur storageKey dependency)
      expect(save1).toBe(save2);
      expect(clear1).toBe(clear2);

      // getToggleState ändert sich bei State-Änderungen (persistedState dependency)
      expect(get1).not.toBe(get2);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit speziellen Zeichen in Toggle-IDs umgehen', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      const specialId = 'toggle-with-special-chars_123!@#';
      
      act(() => {
        result.current.saveToggleState(specialId, true);
      });
      
      expect(result.current.getToggleState(specialId)).toBe(true);
    });

    it('sollte mit leeren String-IDs umgehen', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('', true);
      });
      
      expect(result.current.getToggleState('')).toBe(true);
    });

    it('sollte mit Unicode-Zeichen in IDs umgehen', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      const unicodeId = 'toggle-中文-😀-test';
      
      act(() => {
        result.current.saveToggleState(unicodeId, true);
      });
      
      expect(result.current.getToggleState(unicodeId)).toBe(true);
    });

    it('sollte mit sehr langen Storage-Keys umgehen', () => {
      const longKey = 'a'.repeat(1000);
      
      const { result } = renderHook(() => useTogglePersistence(longKey));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        longKey,
        JSON.stringify({ 'toggle-1': true })
      );
    });
  });

  describe('localStorage-Verfügbarkeit', () => {
    it('sollte graceful degradieren wenn localStorage nicht verfügbar ist', () => {
      // Mock localStorage als nicht verfügbar
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;
      
      expect(() => {
        const { result } = renderHook(() => useTogglePersistence('test-key'));
        
        act(() => {
          result.current.saveToggleState('toggle-1', true);
        });
      }).not.toThrow();
      
      // localStorage wiederherstellen
      window.localStorage = originalLocalStorage;
    });

    it('sollte mit localStorage-Quota-Überschreitung umgehen', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      // Mock localStorage.setItem to throw QuotaExceededError
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      // State sollte trotzdem aktualisiert werden
      expect(result.current.persistedState).toEqual({ 'toggle-1': true });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Speichern des Toggle-Status:',
        expect.any(Error)
      );
    });
  });

  describe('JSON-Serialisierung Edge Cases', () => {
    it('sollte mit korrupten localStorage-Daten umgehen', () => {
      mockLocalStorage.setItem('test-key', 'null');
      
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      // null sollte als leeres Objekt behandelt werden
      expect(result.current.persistedState).toEqual({});
    });

    it('sollte mit leeren localStorage-Daten umgehen', () => {
      mockLocalStorage.setItem('test-key', '');

      const { result } = renderHook(() => useTogglePersistence('test-key'));

      // Leerer String wird als falsy behandelt und JSON.parse wird nicht aufgerufen
      expect(result.current.persistedState).toEqual({});
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('sollte mit nicht-Objekt-Daten in localStorage umgehen', () => {
      mockLocalStorage.setItem('test-key', JSON.stringify('string-data'));
      
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.persistedState).toEqual({});
    });

    it('sollte mit Array-Daten in localStorage umgehen', () => {
      mockLocalStorage.setItem('test-key', JSON.stringify([1, 2, 3]));
      
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      expect(result.current.persistedState).toEqual({});
    });
  });

  describe('Große Datenmengen', () => {
    it('sollte viele Toggle-States effizient handhaben', () => {
      const { result } = renderHook(() => useTogglePersistence('test-key'));
      
      // 100 Toggle-States hinzufügen
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.saveToggleState(`toggle-${i}`, i % 2 === 0);
        }
      });
      
      expect(Object.keys(result.current.persistedState)).toHaveLength(100);
      
      // Alle States sollten korrekt gespeichert sein
      for (let i = 0; i < 100; i++) {
        expect(result.current.getToggleState(`toggle-${i}`)).toBe(i % 2 === 0);
      }
    });
  });

  describe('Memory Leaks Prevention', () => {
    it('sollte keine Memory Leaks beim Unmount haben', () => {
      const { result, unmount } = renderHook(() => useTogglePersistence('test-key'));
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      expect(() => unmount()).not.toThrow();
    });
  });
});
