'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook für Toggle-State-Persistierung in localStorage
 */
export function useTogglePersistence(storageKey: string) {
  const [persistedState, setPersistedState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validierung: Nur Objekte (keine Arrays, null, etc.) akzeptieren
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setPersistedState(parsed);
        } else {
          setPersistedState({});
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Toggle-Status:', error);
      setPersistedState({});
    }
  }, [storageKey]);

  const saveToggleState = useCallback((id: string, isOpen: boolean) => {
    setPersistedState((prevState) => {
      const newState = { ...prevState, [id]: isOpen };

      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (error) {
        console.error('Fehler beim Speichern des Toggle-Status:', error);
      }

      return newState;
    });
  }, [storageKey]);

  const getToggleState = useCallback((id: string, defaultValue = false) => {
    return persistedState[id] ?? defaultValue;
  }, [persistedState]);

  const clearPersistedState = useCallback(() => {
    setPersistedState({});
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Fehler beim Löschen des Toggle-Status:', error);
    }
  }, [storageKey]);

  return {
    saveToggleState,
    getToggleState,
    clearPersistedState,
    persistedState
  };
}

export default useTogglePersistence;