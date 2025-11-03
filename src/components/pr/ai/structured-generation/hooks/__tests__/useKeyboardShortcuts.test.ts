// src/components/pr/ai/structured-generation/hooks/__tests__/useKeyboardShortcuts.test.ts
/**
 * Tests für useKeyboardShortcuts Hook
 */

import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { GenerationStep } from '../../types';

describe('useKeyboardShortcuts', () => {
  let onGenerateMock: jest.Mock;
  let onCloseMock: jest.Mock;

  beforeEach(() => {
    onGenerateMock = jest.fn();
    onCloseMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cmd/Ctrl + Enter', () => {
    it('sollte onGenerate aufrufen wenn im content Step und Cmd+Enter gedrückt wird', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(onGenerateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('sollte onGenerate aufrufen wenn im content Step und Ctrl+Enter gedrückt wird', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(onGenerateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('sollte onGenerate NICHT aufrufen wenn NICHT im content Step', () => {
      const steps: GenerationStep[] = ['context', 'generating', 'review'];

      steps.forEach((step) => {
        onGenerateMock.mockClear();

        renderHook(() =>
          useKeyboardShortcuts({
            onGenerate: onGenerateMock,
            onClose: onCloseMock,
            currentStep: step
          })
        );

        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          metaKey: true,
          bubbles: true
        });

        window.dispatchEvent(event);

        expect(onGenerateMock).not.toHaveBeenCalled();
      });
    });

    it('sollte onGenerate NICHT aufrufen wenn nur Enter ohne Modifier gedrückt wird', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(onGenerateMock).not.toHaveBeenCalled();
    });
  });

  describe('Escape', () => {
    it('sollte onClose aufrufen wenn Escape gedrückt wird', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'context'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(onGenerateMock).not.toHaveBeenCalled();
    });

    it('sollte onClose in allen Steps aufrufen', () => {
      const steps: GenerationStep[] = ['context', 'content', 'generating', 'review'];

      steps.forEach((step) => {
        onCloseMock.mockClear();

        const { unmount } = renderHook(() =>
          useKeyboardShortcuts({
            onGenerate: onGenerateMock,
            onClose: onCloseMock,
            currentStep: step
          })
        );

        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true
        });

        window.dispatchEvent(event);

        expect(onCloseMock).toHaveBeenCalledTimes(1);

        // Cleanup nach jedem Test
        unmount();
      });
    });
  });

  describe('Event Cleanup', () => {
    it('sollte Event Listener beim Unmount entfernen', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('sollte keine Events mehr triggern nach Unmount', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      unmount();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(onCloseMock).not.toHaveBeenCalled();
      expect(onGenerateMock).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Updates', () => {
    it('sollte aktualisierte Callbacks verwenden', () => {
      const newOnGenerate = jest.fn();
      const newOnClose = jest.fn();

      const { rerender } = renderHook(
        ({ onGenerate, onClose, currentStep }) =>
          useKeyboardShortcuts({ onGenerate, onClose, currentStep }),
        {
          initialProps: {
            onGenerate: onGenerateMock,
            onClose: onCloseMock,
            currentStep: 'content' as GenerationStep
          }
        }
      );

      // Rerender mit neuen Callbacks
      rerender({
        onGenerate: newOnGenerate,
        onClose: newOnClose,
        currentStep: 'content' as GenerationStep
      });

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true
      });

      window.dispatchEvent(event);

      expect(newOnGenerate).toHaveBeenCalledTimes(1);
      expect(onGenerateMock).not.toHaveBeenCalled();
    });

    it('sollte aktualisierte currentStep berücksichtigen', () => {
      const { rerender } = renderHook(
        ({ currentStep }) =>
          useKeyboardShortcuts({
            onGenerate: onGenerateMock,
            onClose: onCloseMock,
            currentStep
          }),
        {
          initialProps: { currentStep: 'context' as GenerationStep }
        }
      );

      // Test mit context (sollte NICHT triggern)
      const event1 = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true
      });

      window.dispatchEvent(event1);
      expect(onGenerateMock).not.toHaveBeenCalled();

      // Rerender zu content
      rerender({ currentStep: 'content' as GenerationStep });

      // Test mit content (sollte triggern)
      const event2 = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true
      });

      window.dispatchEvent(event2);
      expect(onGenerateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event.preventDefault()', () => {
    it('sollte preventDefault() für Cmd+Enter aufrufen', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'content'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true,
        cancelable: true
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('sollte preventDefault() für Escape aufrufen', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          onGenerate: onGenerateMock,
          onClose: onCloseMock,
          currentStep: 'context'
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
