// Mock-Data Helpers für Tests
import { Timestamp } from 'firebase/firestore';

/**
 * Erstellt einen Mock Firestore Timestamp aus einem Date
 *
 * Dieser Mock hat alle Eigenschaften eines echten Firestore Timestamps:
 * - toDate() Methode
 * - seconds Eigenschaft
 * - nanoseconds Eigenschaft
 */
export const createMockTimestamp = (date: Date = new Date()): any => {
  const seconds = Math.floor(date.getTime() / 1000);
  const nanoseconds = (date.getTime() % 1000) * 1000000;

  return {
    seconds,
    nanoseconds,
    toDate: () => new Date(seconds * 1000 + nanoseconds / 1000000),
    toMillis: () => seconds * 1000 + nanoseconds / 1000000,
    isEqual: (other: any) => {
      return seconds === other?.seconds && nanoseconds === other?.nanoseconds;
    },
    valueOf: () => `Timestamp(seconds=${seconds}, nanoseconds=${nanoseconds})`,
  };
};

/**
 * Erstellt einen Mock Firestore Timestamp für "jetzt"
 */
export const mockNow = (): any => {
  return createMockTimestamp(new Date());
};

/**
 * Erstellt einen Mock Firestore Timestamp für ein bestimmtes Datum
 */
export const mockDate = (year: number, month: number, day: number): any => {
  return createMockTimestamp(new Date(year, month - 1, day));
};
