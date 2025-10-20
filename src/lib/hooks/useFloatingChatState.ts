import { useState, useEffect } from 'react';

/**
 * Custom Hook für Floating Chat State (LocalStorage)
 * Extrahiert LocalStorage-Logik aus FloatingChat-Komponente
 *
 * Features:
 * - Persistiert Chat-Zustand (offen/geschlossen) in LocalStorage
 * - Öffnet Chat automatisch beim ersten Besuch eines Projekts
 * - Verwendet globalen Key für Chat-Zustand (nicht per-Projekt)
 */
export function useFloatingChatState(projectId: string) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;

    // Prüfe ob es der erste Besuch dieses Projekts ist
    const visitedProjects = JSON.parse(localStorage.getItem('visited-projects') || '[]');
    const isFirstVisit = !visitedProjects.includes(projectId);

    // Globaler Key für den Chat-Zustand
    const savedState = localStorage.getItem('chat-open-state');

    if (isFirstVisit) {
      // Projekt als besucht markieren
      visitedProjects.push(projectId);
      localStorage.setItem('visited-projects', JSON.stringify(visitedProjects));

      // Beim ersten Besuch: Wenn kein gespeicherter Zustand existiert, öffne den Chat
      if (savedState === null) {
        localStorage.setItem('chat-open-state', 'true');
        return true;
      }
      // Wenn es einen gespeicherten Zustand gibt, respektiere ihn auch beim ersten Besuch
      return savedState === 'true';
    }

    // Bei bereits besuchten Projekten: Verwende den gespeicherten Zustand
    if (savedState !== null) {
      return savedState === 'true';
    }

    return false; // Default geschlossen
  });

  // LocalStorage synchronisieren bei Änderungen
  useEffect(() => {
    localStorage.setItem('chat-open-state', isOpen.toString());
  }, [isOpen]);

  return { isOpen, setIsOpen };
}
