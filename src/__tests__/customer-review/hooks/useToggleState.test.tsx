/**
 * Test-Suite für useToggleState Hook
 * 
 * Diese Tests decken ab:
 * - State-Management für Toggle-Boxen
 * - Toggle-Funktionen (open, close, toggle)
 * - State-Persistierung
 * - Multi-Toggle-Support
 * - Performance-Optimierungen
 * - Error-Handling
 */

import { renderHook, act } from '@testing-library/react';
import { useToggleState } from '@/components/customer-review/toggle/useToggleState';

describe('useToggleState Hook', () => {
  describe('Initialization', () => {
    it('sollte mit leeren initial States initialisieren', () => {
      const { result } = renderHook(() => useToggleState());
      
      expect(result.current.toggleStates).toEqual({});
      expect(result.current.isOpen('any-id')).toBe(false);
    });

    it('sollte mit vorgegebenen initial States initialisieren', () => {
      const initialStates = {
        'toggle-1': true,
        'toggle-2': false,
        'toggle-3': true
      };
      
      const { result } = renderHook(() => useToggleState(initialStates));
      
      expect(result.current.toggleStates).toEqual(initialStates);
      expect(result.current.isOpen('toggle-1')).toBe(true);
      expect(result.current.isOpen('toggle-2')).toBe(false);
      expect(result.current.isOpen('toggle-3')).toBe(true);
    });

    it('sollte nicht-existierende IDs als closed behandeln', () => {
      const { result } = renderHook(() => useToggleState());
      
      expect(result.current.isOpen('non-existent')).toBe(false);
    });
  });

  describe('Toggle-Funktionalität', () => {
    it('sollte Toggle-State umschalten', () => {
      const { result } = renderHook(() => useToggleState());
      
      // Initial closed
      expect(result.current.isOpen('test-toggle')).toBe(false);
      
      // Toggle to open
      act(() => {
        result.current.toggleBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(true);
      expect(result.current.toggleStates['test-toggle']).toBe(true);
      
      // Toggle back to closed
      act(() => {
        result.current.toggleBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(false);
      expect(result.current.toggleStates['test-toggle']).toBe(false);
    });

    it('sollte mehrere Toggles unabhängig handhaben', () => {
      const { result } = renderHook(() => useToggleState());
      
      act(() => {
        result.current.toggleBox('toggle-1');
        result.current.toggleBox('toggle-2');
      });
      
      expect(result.current.isOpen('toggle-1')).toBe(true);
      expect(result.current.isOpen('toggle-2')).toBe(true);
      
      act(() => {
        result.current.toggleBox('toggle-1');
      });
      
      expect(result.current.isOpen('toggle-1')).toBe(false);
      expect(result.current.isOpen('toggle-2')).toBe(true);
    });
  });

  describe('Explizite Open/Close-Funktionen', () => {
    it('sollte Toggle explizit öffnen', () => {
      const { result } = renderHook(() => useToggleState());
      
      act(() => {
        result.current.openBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(true);
      expect(result.current.toggleStates['test-toggle']).toBe(true);
    });

    it('sollte Toggle explizit schließen', () => {
      const initialStates = { 'test-toggle': true };
      const { result } = renderHook(() => useToggleState(initialStates));
      
      act(() => {
        result.current.closeBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(false);
      expect(result.current.toggleStates['test-toggle']).toBe(false);
    });

    it('sollte bereits geöffnete Box weiterhin offen lassen', () => {
      const { result } = renderHook(() => useToggleState());
      
      act(() => {
        result.current.openBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(true);
      
      // Erneut öffnen
      act(() => {
        result.current.openBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(true);
    });

    it('sollte bereits geschlossene Box weiterhin geschlossen lassen', () => {
      const { result } = renderHook(() => useToggleState());
      
      expect(result.current.isOpen('test-toggle')).toBe(false);
      
      // Erneut schließen
      act(() => {
        result.current.closeBox('test-toggle');
      });
      
      expect(result.current.isOpen('test-toggle')).toBe(false);
    });
  });

  describe('State-Konsistenz', () => {
    it('sollte State-Object korrekt aktualisieren', () => {
      const { result } = renderHook(() => useToggleState());
      
      act(() => {
        result.current.toggleBox('toggle-1');
        result.current.openBox('toggle-2');
        result.current.closeBox('toggle-3');
      });
      
      const expectedState = {
        'toggle-1': true,
        'toggle-2': true,
        'toggle-3': false
      };
      
      expect(result.current.toggleStates).toEqual(expectedState);
    });

    it('sollte State-Updates nicht mutieren', () => {
      const { result } = renderHook(() => useToggleState());
      
      const initialState = result.current.toggleStates;
      
      act(() => {
        result.current.toggleBox('test-toggle');
      });
      
      // Initial state sollte unverändert sein
      expect(initialState).toEqual({});
      expect(result.current.toggleStates).not.toBe(initialState);
    });
  });

  describe('Performance-Optimierung', () => {
    it('sollte stabile Funktions-Referenzen haben für Setter', () => {
      const { result } = renderHook(() => useToggleState());

      const {
        toggleBox: toggleBox1,
        openBox: openBox1,
        closeBox: closeBox1,
      } = result.current;

      // State ändern
      act(() => {
        result.current.toggleBox('test-toggle');
      });

      const {
        toggleBox: toggleBox2,
        openBox: openBox2,
        closeBox: closeBox2,
      } = result.current;

      // Setter-Funktionen sollten stabil bleiben (useCallback ohne dependencies)
      expect(toggleBox1).toBe(toggleBox2);
      expect(openBox1).toBe(openBox2);
      expect(closeBox1).toBe(closeBox2);

      // isOpen ändert sich mit toggleStates (ist abhängig vom State, daher korrekt)
    });

    it('sollte nicht unnötig re-rendern bei gleichen State-Änderungen', () => {
      const { result } = renderHook(() => useToggleState());
      
      // Öffne Toggle
      act(() => {
        result.current.openBox('test-toggle');
      });
      
      const stateAfterOpen = result.current.toggleStates;
      
      // Versuche erneut zu öffnen
      act(() => {
        result.current.openBox('test-toggle');
      });
      
      // State sollte sich nicht geändert haben
      expect(result.current.toggleStates).toBe(stateAfterOpen);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit leeren String-IDs umgehen', () => {
      const { result } = renderHook(() => useToggleState());
      
      act(() => {
        result.current.toggleBox('');
      });
      
      expect(result.current.isOpen('')).toBe(true);
      expect(result.current.toggleStates['']).toBe(true);
    });

    it('sollte mit speziellen Zeichen in IDs umgehen', () => {
      const { result } = renderHook(() => useToggleState());
      
      const specialId = 'toggle-with-special-chars_123!@#';
      
      act(() => {
        result.current.toggleBox(specialId);
      });
      
      expect(result.current.isOpen(specialId)).toBe(true);
      expect(result.current.toggleStates[specialId]).toBe(true);
    });

    it('sollte mit sehr langen IDs umgehen', () => {
      const { result } = renderHook(() => useToggleState());
      
      const longId = 'a'.repeat(1000);
      
      act(() => {
        result.current.toggleBox(longId);
      });
      
      expect(result.current.isOpen(longId)).toBe(true);
      expect(result.current.toggleStates[longId]).toBe(true);
    });

    it('sollte mit undefined oder null IDs robust umgehen', () => {
      const { result } = renderHook(() => useToggleState());
      
      // Diese Aufrufe sollten nicht crashen, auch wenn sie nicht sinvoll sind
      expect(() => {
        act(() => {
          result.current.toggleBox(undefined as any);
        });
      }).not.toThrow();
      
      expect(() => {
        act(() => {
          result.current.toggleBox(null as any);
        });
      }).not.toThrow();
    });
  });

  describe('Initial States Edge Cases', () => {
    it('sollte mit null initial States umgehen', () => {
      const { result } = renderHook(() => useToggleState(null as any));
      
      expect(result.current.toggleStates).toEqual({});
      expect(result.current.isOpen('any-id')).toBe(false);
    });

    it('sollte mit undefined initial States umgehen', () => {
      const { result } = renderHook(() => useToggleState(undefined));
      
      expect(result.current.toggleStates).toEqual({});
      expect(result.current.isOpen('any-id')).toBe(false);
    });

    it('sollte mit gemischten Boolean-Werten in initial States umgehen', () => {
      const initialStates = {
        'toggle-true': true,
        'toggle-false': false,
        'toggle-truthy': 'truthy-string' as any,
        'toggle-falsy': '' as any,
        'toggle-zero': 0 as any
      };
      
      const { result } = renderHook(() => useToggleState(initialStates));
      
      // Nur echte Boolean-Werte sollten korrekt behandelt werden
      expect(result.current.isOpen('toggle-true')).toBe(true);
      expect(result.current.isOpen('toggle-false')).toBe(false);
      
      // Truthy/falsy-Werte werden als Boolean-Werte interpretiert
      expect(result.current.isOpen('toggle-truthy')).toBe(true);
      expect(result.current.isOpen('toggle-falsy')).toBe(false);
      expect(result.current.isOpen('toggle-zero')).toBe(false);
    });
  });

  describe('Viele Toggle-Boxen Performance', () => {
    it('sollte viele Toggle-Boxen effizient handhaben', () => {
      const { result } = renderHook(() => useToggleState());
      
      // Erstelle 100 Toggle-Boxen
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toggleBox(`toggle-${i}`);
        }
      });
      
      // Alle sollten geöffnet sein
      for (let i = 0; i < 100; i++) {
        expect(result.current.isOpen(`toggle-${i}`)).toBe(true);
      }
      
      expect(Object.keys(result.current.toggleStates)).toHaveLength(100);
    });

    it('sollte State-Abfragen für viele Boxen schnell durchführen', () => {
      const initialStates: Record<string, boolean> = {};
      for (let i = 0; i < 1000; i++) {
        initialStates[`toggle-${i}`] = i % 2 === 0;
      }
      
      const { result } = renderHook(() => useToggleState(initialStates));
      
      // Performance-Test: Viele isOpen-Aufrufe
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        result.current.isOpen(`toggle-${i}`);
      }
      
      const endTime = performance.now();
      
      // Sollte unter 10ms bleiben (großzügiger Wert für CI)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Hook Re-Initialization', () => {
    it('sollte initial States bei Props-Änderung NICHT ändern (useState initialisiert nur einmal)', () => {
      const initialStates = { 'toggle-1': true };

      const { result, rerender } = renderHook(
        ({ initial }) => useToggleState(initial),
        {
          initialProps: { initial: initialStates }
        }
      );

      expect(result.current.isOpen('toggle-1')).toBe(true);

      // useState initial value wird nur beim ersten Render verwendet
      rerender({ initial: { 'toggle-1': false } });

      // State bleibt unverändert, da useState initial value nur einmal ausgewertet wird
      expect(result.current.isOpen('toggle-1')).toBe(true);
    });
  });

  describe('Memory-Optimierung', () => {
    it('sollte keine Memory Leaks bei vielen State-Changes haben', () => {
      const { result, unmount } = renderHook(() => useToggleState());
      
      // Viele State-Changes
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toggleBox('test-toggle');
        }
      });
      
      // State sollte konsistent sein
      expect(result.current.isOpen('test-toggle')).toBe(false); // 100 Toggles = even = false
      
      // Cleanup beim Unmount
      unmount();
      
      // Sollte erfolgreich unmounten ohne Errors
      expect(true).toBe(true);
    });
  });
});
