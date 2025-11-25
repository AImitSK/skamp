/**
 * Timestamp Utilities
 *
 * Konvertiert verschiedene Timestamp-Formate zu Date-Objekten.
 * Wird benötigt weil Firestore Timestamps über JSON serialisiert werden
 * und dann keine toDate() Methode mehr haben.
 */

/**
 * Konvertiert einen Timestamp (Firestore oder serialisiert) zu einem Date-Objekt
 */
export function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;

  // Bereits ein Date-Objekt
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firestore Timestamp mit toDate() Methode
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Serialisiertes Firestore Timestamp { _seconds, _nanoseconds }
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000);
  }

  // Serialisiertes Timestamp { seconds, nanoseconds }
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // ISO String oder Unix Timestamp (Zahl)
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}
