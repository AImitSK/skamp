'use client';

import { useState, useCallback } from 'react';

/**
 * Hook für Toggle-State-Management
 */
export function useToggleState(initialStates: Record<string, boolean> = {}) {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(initialStates);

  const toggleBox = useCallback((id: string) => {
    setToggleStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const openBox = useCallback((id: string) => {
    setToggleStates(prev => ({
      ...prev,
      [id]: true
    }));
  }, []);

  const closeBox = useCallback((id: string) => {
    setToggleStates(prev => ({
      ...prev,
      [id]: false
    }));
  }, []);

  const isOpen = useCallback((id: string) => {
    return toggleStates[id] || false;
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