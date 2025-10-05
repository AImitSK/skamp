/**
 * URL Normalizer
 *
 * Phase 2.2: URL-Normalisierung für Duplikat-Erkennung
 *
 * Zweck:
 * - Normalisierung von URLs für konsistente Vergleiche
 * - Duplikat-Erkennung bei Artikeln aus verschiedenen Quellen
 * - Domain-Extraktion für Publication-Matching
 */

import crypto from 'crypto';

/**
 * Normalisiert eine URL für konsistente Vergleiche
 *
 * Transformationen:
 * - Entfernt www. Prefix
 * - Entfernt Query-Parameter
 * - Entfernt Trailing Slashes
 * - Konvertiert zu Lowercase
 * - Entfernt Protocol (http/https)
 *
 * @example
 * normalizeUrl('https://www.Spiegel.DE/artikel?id=123/')
 * // Returns: 'spiegel.de/artikel'
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';

  try {
    // Entferne Whitespace
    let normalized = url.trim();

    // Stelle sicher dass URL ein Protokol hat (für URL Parser)
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    // Parse URL
    const urlObj = new URL(normalized);

    // Extrahiere Hostname und Pathname
    let hostname = urlObj.hostname.toLowerCase();
    let pathname = urlObj.pathname;

    // Entferne www. Prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Entferne trailing slashes
    pathname = pathname.replace(/\/+$/, '');

    // Wenn pathname leer ist, lasse ihn leer (nicht '/')
    if (pathname === '/') {
      pathname = '';
    }

    // Kombiniere hostname + pathname (ohne Protokoll, ohne Query)
    const result = hostname + pathname;

    return result;
  } catch (error) {
    // Fallback bei ungültigen URLs
    console.warn('URL normalization failed:', url, error);
    return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  }
}

/**
 * Extrahiert die Domain aus einer URL oder E-Mail
 *
 * @example
 * extractDomain('https://www.spiegel.de/artikel')
 * // Returns: 'spiegel.de'
 *
 * extractDomain('redakteur@spiegel.de')
 * // Returns: 'spiegel.de'
 */
export function extractDomain(urlOrEmail: string): string | null {
  if (!urlOrEmail) return null;

  try {
    // E-Mail-Adresse
    if (urlOrEmail.includes('@') && !urlOrEmail.includes('/')) {
      const parts = urlOrEmail.split('@');
      if (parts.length === 2) {
        let domain = parts[1].toLowerCase();
        // Entferne www. falls vorhanden
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        return domain;
      }
    }

    // URL
    let url = urlOrEmail.trim();

    // Stelle sicher dass URL ein Protokol hat
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();

    // Entferne www. Prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch (error) {
    console.warn('Domain extraction failed:', urlOrEmail, error);
    return null;
  }
}

/**
 * Prüft ob zwei URLs ähnlich/gleich sind
 *
 * Verwendet Levenshtein-Distanz für Fuzzy-Matching
 *
 * @param url1 - Erste URL
 * @param url2 - Zweite URL
 * @param threshold - Ähnlichkeits-Schwellwert (0-100), default 90
 * @returns true wenn URLs ähnlich genug sind
 *
 * @example
 * areUrlsSimilar(
 *   'https://www.spiegel.de/artikel/test',
 *   'https://spiegel.de/artikel/test?ref=home'
 * )
 * // Returns: true
 */
export function areUrlsSimilar(
  url1: string,
  url2: string,
  threshold: number = 90
): boolean {
  if (!url1 || !url2) return false;

  // Normalisiere beide URLs
  const normalized1 = normalizeUrl(url1);
  const normalized2 = normalizeUrl(url2);

  // Exakter Match nach Normalisierung
  if (normalized1 === normalized2) {
    return true;
  }

  // Levenshtein-Distanz für Fuzzy-Matching
  const similarity = calculateSimilarity(normalized1, normalized2);

  return similarity >= threshold;
}

/**
 * Generiert einen eindeutigen Fingerprint für eine URL
 *
 * Verwendet SHA-256 Hash der normalisierten URL
 * Nützlich für schnelle Duplikat-Checks in Datenbank
 *
 * @example
 * generateUrlFingerprint('https://www.spiegel.de/artikel?id=123')
 * // Returns: 'a3f5c8...' (SHA-256 Hash)
 */
export function generateUrlFingerprint(url: string): string {
  const normalized = normalizeUrl(url);

  // SHA-256 Hash
  const hash = crypto.createHash('sha256');
  hash.update(normalized);

  return hash.digest('hex');
}

/**
 * Berechnet String-Ähnlichkeit mit Levenshtein-Distanz
 *
 * @returns Similarity Score 0-100
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 100;
  }

  const distance = levenshteinDistance(longer, shorter);
  const similarity = ((longer.length - distance) / longer.length) * 100;

  return Math.round(similarity);
}

/**
 * Levenshtein Distance Algorithmus
 *
 * Berechnet minimale Anzahl an Operationen um str1 in str2 zu transformieren
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialisiere erste Spalte und Zeile
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fülle Matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j] + 1      // Deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Extrahiert Artikel-Slug aus URL (für bessere Duplikat-Erkennung)
 *
 * @example
 * extractArticleSlug('https://spiegel.de/politik/deutschland/artikel-titel-a-123456.html')
 * // Returns: 'artikel-titel'
 */
export function extractArticleSlug(url: string): string | null {
  if (!url) return null;

  try {
    const normalized = normalizeUrl(url);
    const parts = normalized.split('/');

    // Letzter Teil ist oft der Artikel-Slug
    const lastPart = parts[parts.length - 1];

    if (!lastPart) return null;

    // Entferne Dateiendungen (.html, .htm, .php)
    const slug = lastPart.replace(/\.(html|htm|php)$/, '');

    // Entferne Artikel-IDs (z.B. 'artikel-a-123456' → 'artikel')
    const cleanSlug = slug.replace(/-a-\d+$/, '');

    return cleanSlug;
  } catch (error) {
    console.warn('Article slug extraction failed:', url, error);
    return null;
  }
}
