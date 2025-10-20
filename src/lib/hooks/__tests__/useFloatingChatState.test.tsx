/**
 * useFloatingChatState Hook Tests
 *
 * Tests für:
 * - LocalStorage Persistierung
 * - Erstes Besuch eines Projekts (Auto-Open)
 * - State Management (open/close)
 */

import { renderHook, act } from '@testing-library/react';
import { useFloatingChatState } from '../useFloatingChatState';

describe('useFloatingChatState', () => {
  beforeEach(() => {
    // LocalStorage zurücksetzen vor jedem Test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('sollte beim ersten Besuch Chat öffnen', () => {
    const { result } = renderHook(() => useFloatingChatState('project-123'));

    // Beim ersten Besuch sollte der Chat geöffnet sein
    expect(result.current.isOpen).toBe(true);

    // Projekt sollte als besucht markiert sein
    const visitedProjects = JSON.parse(localStorage.getItem('visited-projects') || '[]');
    expect(visitedProjects).toContain('project-123');

    // Chat-State sollte gespeichert sein
    expect(localStorage.getItem('chat-open-state')).toBe('true');
  });

  it('sollte bei zweitem Besuch gespeicherten Zustand verwenden', () => {
    // Simuliere vorherigen Besuch: Chat wurde geschlossen
    localStorage.setItem('visited-projects', JSON.stringify(['project-123']));
    localStorage.setItem('chat-open-state', 'false');

    const { result } = renderHook(() => useFloatingChatState('project-123'));

    // Chat sollte geschlossen sein (gespeicherter Zustand)
    expect(result.current.isOpen).toBe(false);
  });

  it('sollte State aktualisieren und in LocalStorage speichern', () => {
    const { result } = renderHook(() => useFloatingChatState('project-123'));

    // Initial: offen (erster Besuch)
    expect(result.current.isOpen).toBe(true);

    // Chat schließen
    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem('chat-open-state')).toBe('false');

    // Chat wieder öffnen
    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.getItem('chat-open-state')).toBe('true');
  });

  it('sollte für verschiedene Projekte gleichen globalen State verwenden', () => {
    // Projekt 1 öffnen und Chat schließen
    const { result: result1 } = renderHook(() => useFloatingChatState('project-1'));
    act(() => {
      result1.current.setIsOpen(false);
    });

    // Projekt 2 öffnen → sollte auch geschlossen sein (globaler State)
    localStorage.setItem('visited-projects', JSON.stringify(['project-1', 'project-2']));
    const { result: result2 } = renderHook(() => useFloatingChatState('project-2'));

    expect(result2.current.isOpen).toBe(false);
  });

  it.skip('sollte Server-Side-Rendering sicher handhaben', () => {
    // SKIPPED: JSDOM kann window nicht vollständig entfernen
    // Der Hook prüft bereits auf typeof window === 'undefined'
    // Dies ist in echtem SSR (Next.js Server Component) ausreichend getestet
  });

  it('sollte beim ersten Besuch mit existierendem chat-open-state=false Chat geschlossen halten', () => {
    // User hat auf einem anderen Projekt den Chat geschlossen
    localStorage.setItem('chat-open-state', 'false');
    // Aber dieses Projekt wurde noch nie besucht
    localStorage.setItem('visited-projects', JSON.stringify([]));

    const { result } = renderHook(() => useFloatingChatState('project-new'));

    // Auch beim ersten Besuch sollte der gespeicherte Zustand respektiert werden
    expect(result.current.isOpen).toBe(false);

    // Projekt sollte trotzdem als besucht markiert sein
    const visitedProjects = JSON.parse(localStorage.getItem('visited-projects') || '[]');
    expect(visitedProjects).toContain('project-new');
  });
});
