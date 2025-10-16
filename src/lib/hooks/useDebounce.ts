// src/lib/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Custom Hook für Debouncing von Werten
 * @param value Der zu debounce-ende Wert
 * @param delay Verzögerung in Millisekunden (Standard: 300ms)
 * @returns Der debounced Wert
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Setze einen Timer, um den Wert nach der Verzögerung zu aktualisieren
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: Lösche den Timer, wenn sich der Wert ändert (bevor die Verzögerung abgelaufen ist)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
