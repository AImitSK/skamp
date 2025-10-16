// src/lib/utils/throttle.ts

/**
 * Throttle-Funktion: Limitiert die Häufigkeit der Funktionsausführung
 * @param func Die zu throttle-ende Funktion
 * @param limit Mindestabstand zwischen Ausführungen in Millisekunden
 * @returns Die gethrottelte Funktion
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
