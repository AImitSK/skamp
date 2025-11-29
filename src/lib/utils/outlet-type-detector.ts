// src/lib/utils/outlet-type-detector.ts
import { Publication as LibraryPublication } from '@/types/library';
import { MediaClipping } from '@/types/monitoring';

/**
 * Intelligente Erkennung des outletType basierend auf Library Publication
 *
 * Mapping-Logik:
 * - Podcast → 'audio'
 * - TV, Radio → 'broadcast'
 * - Website, Blog, Newsletter → 'online'
 * - Newspaper, Magazine, Trade Journal → abhängig vom Format
 *   - format: 'print' → 'print'
 *   - format: 'online' → 'online'
 *   - format: 'both' → 'print' (Default)
 *   - format: 'broadcast' → 'broadcast'
 *   - format: 'audio' → 'audio'
 *
 * @param publication Library Publication mit Type und Format
 * @returns outletType für MediaClipping
 */
export function detectOutletType(
  publication: LibraryPublication
): MediaClipping['outletType'] {
  const { type, format } = publication;

  // 1. Podcast → audio (WICHTIG: Nicht broadcast!)
  if (type === 'podcast') {
    return 'audio';
  }

  // 2. TV, Radio → broadcast
  if (type === 'tv' || type === 'radio') {
    return 'broadcast';
  }

  // 3. Website, Blog, Newsletter → online
  if (type === 'website' || type === 'blog' || type === 'newsletter') {
    return 'online';
  }

  // 4. Social Media → online
  if (type === 'social_media') {
    return 'online';
  }

  // 5. Newspaper, Magazine, Trade Journal → abhängig vom Format
  if (type === 'newspaper' || type === 'magazine' || type === 'trade_journal') {
    switch (format) {
      case 'print':
        return 'print';
      case 'online':
        return 'online';
      case 'broadcast':
        return 'broadcast';
      case 'audio':
        return 'audio';
      case 'both':
        return 'print'; // Default bei Hybrid-Publikationen
      default:
        return 'online'; // Fallback
    }
  }

  // 6. Fallback für unbekannte Typen
  return 'online';
}

/**
 * Extrahiert die Reichweite aus einer Library Publication basierend auf erkanntem outletType
 *
 * Diese Funktion kombiniert detectOutletType() mit der richtigen Metrik-Auswahl
 *
 * @param publication Library Publication
 * @returns Reichweite basierend auf outletType
 */
export function getReachForOutletType(
  publication: LibraryPublication
): number | undefined {
  const outletType = detectOutletType(publication);

  switch (outletType) {
    case 'print':
      return publication.metrics?.print?.circulation;

    case 'online':
      // Priorität: monthlyPageViews > monthlyUniqueVisitors
      return (
        publication.metrics?.online?.monthlyPageViews ||
        publication.metrics?.online?.monthlyUniqueVisitors
      );

    case 'broadcast':
      return publication.metrics?.broadcast?.viewership;

    case 'audio':
      // Priorität: monthlyDownloads > monthlyListeners
      return (
        publication.metrics?.audio?.monthlyDownloads ||
        publication.metrics?.audio?.monthlyListeners
      );

    default:
      return undefined;
  }
}
