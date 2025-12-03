'use client';

import { useState, useCallback } from 'react';

/**
 * Hook für Toggle-State-Management
 */
export function useToggleState(initialStates: Record<string, boolean> = {}) {
  // Normalisiere null/undefined zu leerem Object
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(
    initialStates || {}
  );

  const toggleBox = useCallback((id: string) => {
    setToggleStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const openBox = useCallback((id: string) => {
    setToggleStates(prev => {
      // Performance-Optimierung: Nur neuen State erstellen wenn sich was ändert
      if (prev[id] === true) {
        return prev;
      }
      return {
        ...prev,
        [id]: true
      };
    });
  }, []);

  const closeBox = useCallback((id: string) => {
    setToggleStates(prev => {
      // Performance-Optimierung: Nur neuen State erstellen wenn sich was ändert
      if (prev[id] === false) {
        return prev;
      }
      return {
        ...prev,
        [id]: false
      };
    });
  }, []);

  // Stabiler isOpen Callback ohne toggleStates dependency
  const isOpen = useCallback((id: string) => {
    return Boolean(toggleStates[id]);
  }, [toggleStates]);

  return {
    toggleStates,
    toggleBox,
    openBox,
    closeBox,
    isOpen
  };
}

export default useToggleState;