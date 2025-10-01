# Intelligent Matching - Teil 3: String Similarity Utils

## Übersicht

Dieses Dokument beschreibt die String-Similarity-Utilities, die für das Fuzzy Matching von Firmen- und Publikationsnamen verwendet werden.

## 1. Levenshtein Distance

### Implementation

```typescript
/**
 * src/lib/matching/string-similarity.ts
 */

/**
 * Berechnet die Levenshtein-Distanz zwischen zwei Strings
 * (Anzahl der Änderungen, um String A in String B zu verwandeln)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialisiere erste Spalte
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialisiere erste Zeile
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fülle Matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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

  return matrix[b.length][a.length];
}
```

## 2. Similarity Score (0-100)

```typescript
/**
 * Berechnet Similarity Score von 0-100
 * 100 = identisch, 0 = komplett unterschiedlich
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);

  if (normalizedA === normalizedB) {
    return 100;
  }

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  if (maxLength === 0) {
    return 100;
  }

  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}
```

## 3. String Normalization

```typescript
/**
 * Normalisiert einen String für besseres Matching:
 * - Lowercase
 * - Umlaute umwandeln (ä→ae, ö→oe, ü→ue, ß→ss)
 * - Rechtsformen entfernen (GmbH, AG, etc.)
 * - Sonderzeichen entfernen
 * - Whitespace normalisieren
 */
export function normalizeString(input: string): string {
  if (!input) return '';

  let normalized = input.toLowerCase().trim();

  // Umlaute umwandeln
  normalized = normalized
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

  // Rechtsformen entfernen
  const legalForms = [
    'gmbh',
    'ag',
    'kg',
    'gbr',
    'ohg',
    'e.v.',
    'ev',
    'ug',
    'se',
    'co.',
    'co',
    'ltd',
    'inc',
    'corp',
    'corporation'
  ];

  for (const form of legalForms) {
    // Entferne am Ende
    const regex = new RegExp(`\\s*${form}\\.?\\s*$`, 'gi');
    normalized = normalized.replace(regex, '');

    // Entferne in der Mitte mit & oder und
    const regexMiddle = new RegExp(`\\s*${form}\\.?\\s*(&|und)\\s*`, 'gi');
    normalized = normalized.replace(regexMiddle, ' ');
  }

  // Sonderzeichen durch Leerzeichen ersetzen
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Mehrfache Leerzeichen entfernen
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
```

## 4. Domain Extraction & Normalization

```typescript
/**
 * Extrahiert Domain aus URL oder E-Mail
 *
 * Beispiele:
 * - "https://www.spiegel.de/wirtschaft" → "spiegel.de"
 * - "max@spiegel.de" → "spiegel.de"
 * - "WWW.SPIEGEL.DE" → "spiegel.de"
 */
export function extractDomain(input: string): string | null {
  if (!input) return null;

  let normalized = input.toLowerCase().trim();

  // Entferne Protokoll
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');

  // Entferne alles nach @ (falls E-Mail)
  if (normalized.includes('@')) {
    const parts = normalized.split('@');
    normalized = parts[1] || '';
  }

  // Entferne Pfad (alles nach erstem /)
  const slashIndex = normalized.indexOf('/');
  if (slashIndex > -1) {
    normalized = normalized.substring(0, slashIndex);
  }

  // Validierung: Muss mindestens einen Punkt haben
  if (!normalized.includes('.')) {
    return null;
  }

  return normalized;
}

/**
 * Vergleicht zwei Domains
 */
export function domainsMatch(domain1: string, domain2: string): boolean {
  const normalized1 = extractDomain(domain1);
  const normalized2 = extractDomain(domain2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}
```

## 5. Company Name Matching

```typescript
/**
 * Prüft ob zwei Firmennamen matchen (inkl. Fuzzy Matching)
 *
 * @returns Score von 0-100
 */
export function matchCompanyNames(
  name1: string,
  name2: string,
  threshold: number = 85
): { match: boolean; score: number } {
  const score = calculateSimilarity(name1, name2);

  return {
    match: score >= threshold,
    score
  };
}

/**
 * Findet beste Company-Matches aus einer Liste
 */
export function findBestCompanyMatches(
  searchName: string,
  companies: Array<{ id: string; name: string; website?: string }>,
  options: {
    nameThreshold?: number;
    maxResults?: number;
  } = {}
): Array<{ id: string; name: string; score: number; matchType: 'exact' | 'fuzzy' | 'domain' }> {
  const {
    nameThreshold = 85,
    maxResults = 5
  } = options;

  const results: Array<{ id: string; name: string; score: number; matchType: 'exact' | 'fuzzy' | 'domain' }> = [];

  for (const company of companies) {
    // 1. Exakte Übereinstimmung (normalisiert)
    const normalized1 = normalizeString(searchName);
    const normalized2 = normalizeString(company.name);

    if (normalized1 === normalized2) {
      results.push({
        id: company.id,
        name: company.name,
        score: 100,
        matchType: 'exact'
      });
      continue;
    }

    // 2. Fuzzy Match
    const similarity = calculateSimilarity(searchName, company.name);
    if (similarity >= nameThreshold) {
      results.push({
        id: company.id,
        name: company.name,
        score: similarity,
        matchType: 'fuzzy'
      });
    }
  }

  // Sortiere nach Score (höchster zuerst)
  results.sort((a, b) => b.score - a.score);

  // Limitiere Ergebnisse
  return results.slice(0, maxResults);
}
```

## 6. Publication Name Matching

```typescript
/**
 * Prüft ob zwei Publikationsnamen matchen
 *
 * Spezial-Behandlung für häufige Variationen:
 * - "Süddeutsche Zeitung" vs "SZ"
 * - "Der Spiegel" vs "Spiegel"
 * - "Frankfurter Allgemeine Zeitung" vs "FAZ"
 */
export function matchPublicationNames(
  name1: string,
  name2: string,
  threshold: number = 80
): { match: boolean; score: number } {
  // Bekannte Abkürzungen
  const abbreviations: Record<string, string[]> = {
    'sz': ['süddeutsche zeitung', 'sueddeutsche zeitung'],
    'faz': ['frankfurter allgemeine zeitung'],
    'bild': ['bild zeitung'],
    'welt': ['die welt'],
    'spiegel': ['der spiegel'],
    'zeit': ['die zeit'],
    'taz': ['die tageszeitung', 'tageszeitung']
  };

  const normalized1 = normalizeString(name1);
  const normalized2 = normalizeString(name2);

  // Exakt
  if (normalized1 === normalized2) {
    return { match: true, score: 100 };
  }

  // Prüfe Abkürzungen
  for (const [abbr, fullNames] of Object.entries(abbreviations)) {
    const isAbbr1 = normalized1 === abbr;
    const isAbbr2 = normalized2 === abbr;
    const isFull1 = fullNames.includes(normalized1);
    const isFull2 = fullNames.includes(normalized2);

    if ((isAbbr1 && isFull2) || (isFull1 && isAbbr2)) {
      return { match: true, score: 95 };
    }
  }

  // Fuzzy Match
  const score = calculateSimilarity(name1, name2);

  return {
    match: score >= threshold,
    score
  };
}
```

## 7. Tests

```typescript
/**
 * src/lib/matching/__tests__/string-similarity.test.ts
 */

describe('String Similarity Utils', () => {
  describe('normalizeString', () => {
    it('should normalize company names', () => {
      expect(normalizeString('Süddeutsche Zeitung GmbH')).toBe('sueddeutsche zeitung');
      expect(normalizeString('Der Spiegel AG & Co. KG')).toBe('der spiegel');
      expect(normalizeString('BILD-Zeitung')).toBe('bild zeitung');
    });

    it('should handle umlauts', () => {
      expect(normalizeString('Müller & Söhne GmbH')).toBe('mueller soehne');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 100 for identical strings', () => {
      expect(calculateSimilarity('Spiegel', 'Spiegel')).toBe(100);
    });

    it('should handle typos', () => {
      expect(calculateSimilarity('Spiegel', 'Spiegle')).toBeGreaterThan(85);
    });

    it('should normalize before comparing', () => {
      expect(calculateSimilarity('Süddeutsche Zeitung GmbH', 'Sueddeutsche Zeitung AG')).toBeGreaterThan(90);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://www.spiegel.de/wirtschaft')).toBe('spiegel.de');
      expect(extractDomain('http://bild.de')).toBe('bild.de');
    });

    it('should extract domain from email', () => {
      expect(extractDomain('max@spiegel.de')).toBe('spiegel.de');
    });

    it('should handle invalid input', () => {
      expect(extractDomain('invalid')).toBeNull();
      expect(extractDomain('')).toBeNull();
    });
  });

  describe('matchCompanyNames', () => {
    it('should match similar names', () => {
      const result = matchCompanyNames('Spiegel Verlag', 'Der Spiegel Verlag GmbH');
      expect(result.match).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should not match different names', () => {
      const result = matchCompanyNames('Spiegel', 'BILD');
      expect(result.match).toBe(false);
    });
  });

  describe('matchPublicationNames', () => {
    it('should match abbreviations', () => {
      const result = matchPublicationNames('SZ', 'Süddeutsche Zeitung');
      expect(result.match).toBe(true);
      expect(result.score).toBe(95);
    });

    it('should match with/without articles', () => {
      const result = matchPublicationNames('Spiegel', 'Der Spiegel');
      expect(result.match).toBe(true);
    });
  });
});
```

## 8. Performance-Überlegungen

### Caching

Für häufig gesuchte Namen kann ein Cache implementiert werden:

```typescript
const similarityCache = new Map<string, number>();

function getCacheKey(a: string, b: string): string {
  // Sortiere alphabetisch für konsistente Keys
  return [a, b].sort().join('::');
}

export function calculateSimilarityWithCache(a: string, b: string): number {
  const key = getCacheKey(a, b);

  if (similarityCache.has(key)) {
    return similarityCache.get(key)!;
  }

  const score = calculateSimilarity(a, b);
  similarityCache.set(key, score);

  return score;
}
```

### Batch-Processing

Bei großen Datenmengen sollte Batch-Processing verwendet werden:

```typescript
export async function findMatchesInBatches(
  searchName: string,
  allCompanies: Array<{ id: string; name: string }>,
  batchSize: number = 100
): Promise<Array<{ id: string; name: string; score: number }>> {
  const results: Array<{ id: string; name: string; score: number }> = [];

  for (let i = 0; i < allCompanies.length; i += batchSize) {
    const batch = allCompanies.slice(i, i + batchSize);

    for (const company of batch) {
      const score = calculateSimilarity(searchName, company.name);
      if (score >= 85) {
        results.push({ id: company.id, name: company.name, score });
      }
    }

    // Kleine Pause zwischen Batches
    if (i + batchSize < allCompanies.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
```

## 9. Export

```typescript
/**
 * src/lib/matching/string-similarity.ts
 */

export {
  levenshteinDistance,
  calculateSimilarity,
  normalizeString,
  extractDomain,
  domainsMatch,
  matchCompanyNames,
  matchPublicationNames,
  findBestCompanyMatches,
  calculateSimilarityWithCache,
  findMatchesInBatches
};
```

## Nächster Schritt

→ **Teil 4**: Publication Finder (Wie funktioniert das Matching für Publikationen)
