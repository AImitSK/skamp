// src/components/projects/distribution/helpers/list-helpers.ts

/**
 * Shared helper functions für Verteiler-Listen
 *
 * Extrahiert aus ProjectDistributionLists.tsx und MasterListBrowser.tsx
 * zur Vermeidung von Code-Duplikation
 */

/**
 * Gibt die passende Farbe für eine Listen-Kategorie zurück
 */
export function getCategoryColor(category?: string): string {
  switch (category) {
    case 'press': return 'purple';
    case 'customers': return 'blue';
    case 'partners': return 'green';
    case 'leads': return 'amber';
    default: return 'zinc';
  }
}

/**
 * Formatiert einen Firestore-Timestamp in deutsches Datumsformat
 */
export function formatDate(timestamp: any): string {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Kategorie-Optionen für Filter
 */
export const categoryOptions = [
  { value: 'press', label: 'Presse' },
  { value: 'customers', label: 'Kunden' },
  { value: 'partners', label: 'Partner' },
  { value: 'leads', label: 'Leads' },
  { value: 'custom', label: 'Benutzerdefiniert' }
];

/**
 * Typ-Optionen für Projekt-Listen Filter
 * (linked = verknüpft mit Master-Liste, custom = projektspezifisch)
 */
export const projectListTypeOptions = [
  { value: 'linked', label: 'Verknüpft' },
  { value: 'custom', label: 'Projekt' },
  { value: 'combined', label: 'Kombiniert' }
];

/**
 * Typ-Optionen für Master-Listen Filter
 * (dynamic = dynamisch mit Filtern, static = statisch mit IDs)
 */
export const masterListTypeOptions = [
  { value: 'dynamic', label: 'Dynamisch' },
  { value: 'static', label: 'Statisch' }
];
