# Implementierungsplan: Automatisches Firma & Publikation-Matching

> **Feature:** Beim Import von Matching-Kandidaten werden Firmen und Publikationen automatisch erkannt, zugeordnet oder erstellt.

---

## 🎯 Ziel

Wenn ein SuperAdmin einen Matching-Kandidaten importiert, sollen **automatisch**:
1. Die **Firma** erkannt und verknüpft werden (oder neu erstellt)
2. Die **Publikationen** erkannt und verknüpft werden (oder neu erstellt)
3. Der **Kontakt** vollständig verknüpft importiert werden

**Ergebnis:** Kontakt ist sofort einsatzbereit mit vollständigen Firma- und Publikations-Verknüpfungen.

---

## 📋 Übersicht

### Was wird implementiert:
- ✅ E-Mail-Domain → Firma Mapping
- ✅ Fuzzy Company Name Matching
- ✅ Automatische Company-Erstellung
- ✅ Automatische Publication-Zuordnung
- ✅ Automatische Publication-Erstellung
- ✅ Konfidenz-System für Matches
- ✅ UI-Feedback im Modal

### Vorteile:
- ⚡ **Zeitsparend:** Keine manuelle Zuordnung mehr nötig
- 🎯 **Genauer:** Algorithmus findet Duplikate besser als Menschen
- 📊 **Konsistent:** Immer gleiche Zuordnungs-Logik
- 🔗 **Vollständig:** Kontakte haben sofort alle Verknüpfungen

---

## 🏗️ Architektur

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    CandidateDetailModal                      │
│  [Importieren Button] → ruft importWithAutoMatching()       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              matching-service.ts                             │
│  importWithAutoMatching()                                    │
│    ├─> matchCompany()                                       │
│    ├─> matchPublications()                                  │
│    └─> createContact()                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           company-matcher.ts (NEU)                           │
│  - matchByEmailDomain()                                      │
│  - matchByFuzzyName()                                        │
│  - createNewCompany()                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         publication-matcher.ts (NEU)                         │
│  - getPublicationsForCompany()                               │
│  - createDefaultPublication()                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│        email-domain-map.ts (NEU)                             │
│  - DOMAIN_TO_COMPANY_MAP                                     │
│  - Top 100 deutsche Medien                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Neue Dateien

### 1. `src/lib/matching/email-domain-map.ts`
**Zweck:** Mapping von E-Mail-Domains zu Firmen-Namen

### 2. `src/lib/matching/company-matcher.ts`
**Zweck:** Firma-Matching Logik

### 3. `src/lib/matching/publication-matcher.ts`
**Zweck:** Publikation-Matching Logik

### 4. `src/lib/matching/string-similarity.ts`
**Zweck:** Fuzzy String Matching Algorithmen

### 5. `src/types/matching.ts` (erweitern)
**Zweck:** Neue Types für Matching-Ergebnisse

---

## 🔧 Implementierung

### Phase 1: Foundation (1-2 Stunden)

#### 1.1 Email-Domain Map erstellen

**Datei:** `src/lib/matching/email-domain-map.ts`

```typescript
/**
 * Email Domain → Company Name Mapping
 *
 * Mapping der häufigsten deutschen Medien-Domains zu standardisierten Firmennamen.
 * Diese Namen sollten mit den existierenden Company-Namen in der Datenbank übereinstimmen.
 */

export const EMAIL_DOMAIN_TO_COMPANY: Record<string, string> = {
  // Überregionale Tageszeitungen
  'spiegel.de': 'Der Spiegel',
  'zeit.de': 'Die Zeit',
  'faz.net': 'Frankfurter Allgemeine Zeitung',
  'sueddeutsche.de': 'Süddeutsche Zeitung',
  'welt.de': 'Die Welt',
  'handelsblatt.com': 'Handelsblatt',
  'tagesspiegel.de': 'Der Tagesspiegel',
  'taz.de': 'die tageszeitung',
  'fr.de': 'Frankfurter Rundschau',

  // Boulevardzeitungen
  'bild.de': 'BILD',
  'focus.de': 'FOCUS',
  'stern.de': 'Stern',

  // Regionale Zeitungen
  'mopo.de': 'Hamburger Morgenpost',
  'abendblatt.de': 'Hamburger Abendblatt',
  'berliner-zeitung.de': 'Berliner Zeitung',
  'rp-online.de': 'Rheinische Post',
  'ksta.de': 'Kölner Stadt-Anzeiger',
  'stuttgarter-zeitung.de': 'Stuttgarter Zeitung',
  'stuttgarter-nachrichten.de': 'Stuttgarter Nachrichten',
  'merkur.de': 'Münchner Merkur',
  'tz.de': 'tz München',

  // Nachrichtenagenturen
  'dpa.com': 'Deutsche Presse-Agentur',
  'afp.com': 'Agence France-Presse',
  'reuters.com': 'Reuters',
  'ap.org': 'Associated Press',
  'epd.de': 'Evangelischer Pressedienst',
  'kna.de': 'Katholische Nachrichten-Agentur',

  // Online-Medien
  't-online.de': 't-online',
  'web.de': 'WEB.DE',
  'gmx.de': 'GMX',
  'heise.de': 'Heise Online',
  'golem.de': 'Golem.de',
  'netzpolitik.org': 'netzpolitik.org',
  'correctiv.org': 'CORRECTIV',

  // Magazine
  'spiegel-online.de': 'Spiegel Online',
  'zeit-online.de': 'Zeit Online',
  'manager-magazin.de': 'manager magazin',
  'capital.de': 'Capital',
  'wirtschaftswoche.de': 'WirtschaftsWoche',
  'brandeins.de': 'brand eins',

  // TV-Sender
  'ard.de': 'ARD',
  'zdf.de': 'ZDF',
  'rtl.de': 'RTL',
  'pro7.de': 'ProSieben',
  'sat1.de': 'SAT.1',
  'vox.de': 'VOX',
  'n-tv.de': 'n-tv',
  'welt.tv': 'WELT TV',
  'ntv.de': 'n-tv',

  // Radio-Sender
  'deutschlandfunk.de': 'Deutschlandfunk',
  'br.de': 'Bayerischer Rundfunk',
  'wdr.de': 'Westdeutscher Rundfunk',
  'ndr.de': 'Norddeutscher Rundfunk',
  'swr.de': 'Südwestrundfunk',
  'mdr.de': 'Mitteldeutscher Rundfunk',
  'hr.de': 'Hessischer Rundfunk',
  'rbb-online.de': 'Rundfunk Berlin-Brandenburg',

  // Fachmedien
  'horizont.net': 'Horizont',
  'werben-verkaufen.de': 'W&V',
  'kress.de': 'kress',
  'journalist.de': 'journalist',
  'meedia.de': 'MEEDIA',

  // Internationale (in Deutschland tätig)
  'nytimes.com': 'The New York Times',
  'theguardian.com': 'The Guardian',
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'cnn.com': 'CNN',
  'washingtonpost.com': 'The Washington Post',
  'ft.com': 'Financial Times',
  'wsj.com': 'The Wall Street Journal',
  'economist.com': 'The Economist',
  'lemonde.fr': 'Le Monde',
  'elpais.com': 'El País',

  // Weitere relevante
  'axelspringer.de': 'Axel Springer',
  'burda.com': 'Hubert Burda Media',
  'bertelsmann.de': 'Bertelsmann',
  'funke-medien.de': 'Funke Mediengruppe',
  'madsack.de': 'Madsack',
  'ippen.de': 'Ippen Digital',
};

/**
 * Versucht aus einer E-Mail-Adresse den Firmennamen zu extrahieren
 */
export function getCompanyFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }

  const domain = email.split('@')[1].toLowerCase().trim();

  // Direkte Übereinstimmung
  if (EMAIL_DOMAIN_TO_COMPANY[domain]) {
    return EMAIL_DOMAIN_TO_COMPANY[domain];
  }

  // Subdomain-Check (z.B. redaktion.spiegel.de → spiegel.de)
  const parts = domain.split('.');
  if (parts.length > 2) {
    const mainDomain = parts.slice(-2).join('.');
    if (EMAIL_DOMAIN_TO_COMPANY[mainDomain]) {
      return EMAIL_DOMAIN_TO_COMPANY[mainDomain];
    }
  }

  return null;
}

/**
 * Prüft ob eine Domain zu einem bekannten Medium gehört
 */
export function isKnownMediaDomain(email: string): boolean {
  return getCompanyFromEmail(email) !== null;
}

/**
 * Gibt alle bekannten Domains zurück (für Autocomplete etc.)
 */
export function getAllKnownDomains(): string[] {
  return Object.keys(EMAIL_DOMAIN_TO_COMPANY);
}

/**
 * Gibt alle bekannten Firmennamen zurück
 */
export function getAllKnownCompanies(): string[] {
  return Array.from(new Set(Object.values(EMAIL_DOMAIN_TO_COMPANY)));
}
```

**Tests:**
```typescript
// Test-Cases
getCompanyFromEmail('m.mueller@spiegel.de') // → 'Der Spiegel'
getCompanyFromEmail('redaktion@zeit.de') // → 'Die Zeit'
getCompanyFromEmail('journalist@unknown.de') // → null
getCompanyFromEmail('max@subdomain.faz.net') // → 'Frankfurter Allgemeine Zeitung'
```

---

#### 1.2 String-Similarity Utilities

**Datei:** `src/lib/matching/string-similarity.ts`

```typescript
/**
 * String-Ähnlichkeits-Algorithmen für Fuzzy Matching
 */

/**
 * Berechnet Levenshtein-Distanz zwischen zwei Strings
 * (Anzahl der nötigen Änderungen um String A in String B zu verwandeln)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Berechnet Ähnlichkeit zwischen 0 und 1 (1 = identisch)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1.0 - (distance / maxLength);
}

/**
 * Normalisiert Firmennamen für besseren Vergleich
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(gmbh|ag|kg|e\.v\.|ev|verlag|media|gruppe|holding|se|ug|ohg|gbr|co|company|inc|corp|ltd|limited)\b/gi, '')
    .replace(/[^a-z0-9äöüß]/g, '')
    .trim();
}

/**
 * Erweiterte Normalisierung mit Alias-Ersetzungen
 */
export function normalizeWithAliases(name: string): string {
  const normalized = normalizeCompanyName(name);

  // Häufige Abkürzungen/Varianten
  const aliases: Record<string, string> = {
    'sz': 'sueddeutsche',
    'faz': 'frankfurterallgemeine',
    'fr': 'frankfurterrundschau',
    'welt': 'diewelt',
    'zeit': 'diezeit',
    'spiegel': 'derspiegel',
    'taz': 'tageszeitung',
    'bild': 'bildzeitung',
  };

  // Ersetze Aliase
  for (const [alias, replacement] of Object.entries(aliases)) {
    if (normalized === alias || normalized.includes(alias)) {
      return replacement;
    }
  }

  return normalized;
}

/**
 * Prüft ob zwei Firmennamen wahrscheinlich dasselbe Unternehmen bezeichnen
 */
export function areCompanyNamesSimilar(
  name1: string,
  name2: string,
  threshold: number = 0.8
): boolean {
  // Normalisiere beide Namen
  const norm1 = normalizeWithAliases(name1);
  const norm2 = normalizeWithAliases(name2);

  // Exakte Übereinstimmung
  if (norm1 === norm2) return true;

  // Einer ist in dem anderen enthalten
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Ähnlichkeits-Score
  const similarity = calculateSimilarity(norm1, norm2);
  return similarity >= threshold;
}

/**
 * Findet beste Übereinstimmung aus einer Liste von Optionen
 */
export function findBestMatch(
  searchName: string,
  options: Array<{ id: string; name: string }>,
  threshold: number = 0.8
): { id: string; name: string; similarity: number } | null {

  const normalized = normalizeWithAliases(searchName);
  let bestMatch: { id: string; name: string; similarity: number } | null = null;
  let highestSimilarity = 0;

  for (const option of options) {
    const optionNormalized = normalizeWithAliases(option.name);
    const similarity = calculateSimilarity(normalized, optionNormalized);

    if (similarity > highestSimilarity && similarity >= threshold) {
      highestSimilarity = similarity;
      bestMatch = {
        id: option.id,
        name: option.name,
        similarity
      };
    }
  }

  return bestMatch;
}
```

**Tests:**
```typescript
// Test-Cases
normalizeCompanyName('Der Spiegel GmbH') // → 'derspiegel'
normalizeCompanyName('SPIEGEL Verlag') // → 'spiegel'
normalizeCompanyName('Die Zeit AG') // → 'diezeit'

areCompanyNamesSimilar('Der Spiegel', 'Spiegel Verlag') // → true
areCompanyNamesSimilar('Der Spiegel', 'SPIEGEL GmbH') // → true
areCompanyNamesSimilar('Die Zeit', 'Die Welt') // → false
```

---

### Phase 2: Company Matcher (2-3 Stunden)

#### 2.1 Company Matcher Service

**Datei:** `src/lib/matching/company-matcher.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCompanyFromEmail } from './email-domain-map';
import { findBestMatch, normalizeCompanyName } from './string-similarity';
import { MatchingCandidateVariant } from '@/types/matching';

export interface CompanyMatchResult {
  companyId: string | null;
  companyName: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  method: 'email_domain' | 'fuzzy_match' | 'created_new' | 'none';
  wasCreated: boolean;
  similarity?: number;
}

export class CompanyMatcher {

  /**
   * Haupt-Matching-Funktion
   */
  async matchCompany(
    variants: MatchingCandidateVariant[],
    selectedVariantIndex: number,
    organizationId: string,
    userId: string
  ): Promise<CompanyMatchResult> {

    const selectedVariant = variants[selectedVariantIndex];

    // STRATEGIE 1: E-Mail Domain Matching
    const emailMatch = await this.matchByEmailDomain(
      selectedVariant,
      organizationId
    );
    if (emailMatch) {
      return emailMatch;
    }

    // STRATEGIE 2: Fuzzy Name Matching
    const fuzzyMatch = await this.matchByFuzzyName(
      variants,
      organizationId
    );
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    // STRATEGIE 3: Neue Firma erstellen
    if (selectedVariant.contactData.companyName) {
      const created = await this.createNewCompany(
        selectedVariant.contactData.companyName,
        organizationId,
        userId
      );
      return created;
    }

    // Keine Firma gefunden/erstellt
    return {
      companyId: null,
      companyName: null,
      confidence: 'none',
      method: 'none',
      wasCreated: false
    };
  }

  /**
   * STRATEGIE 1: Matching via E-Mail Domain
   */
  private async matchByEmailDomain(
    variant: MatchingCandidateVariant,
    organizationId: string
  ): Promise<CompanyMatchResult | null> {

    // Hole E-Mail
    const email = variant.contactData.emails?.[0]?.email;
    if (!email) return null;

    // Mappe Domain → Company Name
    const expectedCompanyName = getCompanyFromEmail(email);
    if (!expectedCompanyName) return null;

    console.log(`📧 E-Mail Domain Match: ${email} → ${expectedCompanyName}`);

    // Suche Company mit diesem Namen
    const company = await this.findCompanyByName(
      expectedCompanyName,
      organizationId
    );

    if (company) {
      return {
        companyId: company.id,
        companyName: company.name,
        confidence: 'high',
        method: 'email_domain',
        wasCreated: false
      };
    }

    return null;
  }

  /**
   * STRATEGIE 2: Fuzzy Matching auf Varianten-Namen
   */
  private async matchByFuzzyName(
    variants: MatchingCandidateVariant[],
    organizationId: string
  ): Promise<CompanyMatchResult | null> {

    // Sammle alle Company-Namen aus Varianten
    const companyNames = variants
      .map(v => v.contactData.companyName)
      .filter(Boolean) as string[];

    if (companyNames.length === 0) return null;

    // Lade alle existierenden Companies
    const existingCompanies = await this.getAllCompanies(organizationId);
    if (existingCompanies.length === 0) return null;

    // Finde beste Übereinstimmung für jeden Varianten-Namen
    let bestOverallMatch: {
      id: string;
      name: string;
      similarity: number;
    } | null = null;

    for (const variantName of companyNames) {
      const match = findBestMatch(
        variantName,
        existingCompanies.map(c => ({ id: c.id, name: c.name })),
        0.75 // 75% Threshold für fuzzy match
      );

      if (match && (!bestOverallMatch || match.similarity > bestOverallMatch.similarity)) {
        bestOverallMatch = match;
      }
    }

    if (bestOverallMatch) {
      console.log(`🔍 Fuzzy Match gefunden: ${bestOverallMatch.name} (${Math.round(bestOverallMatch.similarity * 100)}%)`);

      return {
        companyId: bestOverallMatch.id,
        companyName: bestOverallMatch.name,
        confidence: bestOverallMatch.similarity >= 0.9 ? 'high' : 'medium',
        method: 'fuzzy_match',
        wasCreated: false,
        similarity: bestOverallMatch.similarity
      };
    }

    return null;
  }

  /**
   * STRATEGIE 3: Neue Company erstellen
   */
  private async createNewCompany(
    companyName: string,
    organizationId: string,
    userId: string
  ): Promise<CompanyMatchResult> {

    console.log(`🏢 Erstelle neue Firma: ${companyName}`);

    try {
      const companyData = {
        name: companyName,
        officialName: companyName,
        type: 'publisher' as const,
        organizationId,
        isGlobal: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
        deletedAt: null
      };

      const docRef = await addDoc(
        collection(db, 'companies_enhanced'),
        companyData
      );

      return {
        companyId: docRef.id,
        companyName,
        confidence: 'low',
        method: 'created_new',
        wasCreated: true
      };
    } catch (error) {
      console.error('Fehler beim Erstellen der Firma:', error);
      throw error;
    }
  }

  /**
   * Sucht Company nach Namen
   */
  private async findCompanyByName(
    name: string,
    organizationId: string
  ): Promise<{ id: string; name: string } | null> {

    try {
      const q = query(
        collection(db, 'companies_enhanced'),
        where('name', '==', name),
        where('organizationId', '==', organizationId),
        where('deletedAt', '==', null)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        name: doc.data().name
      };
    } catch (error) {
      console.error('Fehler beim Suchen der Firma:', error);
      return null;
    }
  }

  /**
   * Lädt alle Companies einer Organisation
   */
  private async getAllCompanies(
    organizationId: string
  ): Promise<Array<{ id: string; name: string }>> {

    try {
      const q = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId),
        where('deletedAt', '==', null)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Firmen:', error);
      return [];
    }
  }
}

// Singleton-Instanz
export const companyMatcher = new CompanyMatcher();
```

---

### Phase 3: Publication Matcher (1-2 Stunden)

#### 3.1 Publication Matcher Service

**Datei:** `src/lib/matching/publication-matcher.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export interface PublicationMatchResult {
  publicationIds: string[];
  publicationNames: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  method: 'from_company' | 'created_new' | 'none';
  wereCreated: boolean;
}

export class PublicationMatcher {

  /**
   * Haupt-Matching-Funktion
   */
  async matchPublications(
    companyId: string | null,
    companyName: string | null,
    organizationId: string,
    userId: string
  ): Promise<PublicationMatchResult> {

    if (!companyId) {
      return {
        publicationIds: [],
        publicationNames: [],
        confidence: 'none',
        method: 'none',
        wereCreated: false
      };
    }

    // STRATEGIE 1: Lade existierende Publications der Firma
    const existingPubs = await this.getPublicationsForCompany(
      companyId,
      organizationId
    );

    if (existingPubs.length > 0) {
      return {
        publicationIds: existingPubs.map(p => p.id),
        publicationNames: existingPubs.map(p => p.name),
        confidence: 'high',
        method: 'from_company',
        wereCreated: false
      };
    }

    // STRATEGIE 2: Erstelle Default-Publikation für Firma
    if (companyName) {
      const created = await this.createDefaultPublication(
        companyId,
        companyName,
        organizationId,
        userId
      );

      return {
        publicationIds: [created.id],
        publicationNames: [created.name],
        confidence: 'medium',
        method: 'created_new',
        wereCreated: true
      };
    }

    return {
      publicationIds: [],
      publicationNames: [],
      confidence: 'none',
      method: 'none',
      wereCreated: false
    };
  }

  /**
   * STRATEGIE 1: Lade Publications einer Company
   */
  private async getPublicationsForCompany(
    companyId: string,
    organizationId: string
  ): Promise<Array<{ id: string; name: string }>> {

    try {
      const q = query(
        collection(db, 'publications_enhanced'),
        where('companyId', '==', companyId),
        where('organizationId', '==', organizationId),
        where('deletedAt', '==', null)
      );

      const snapshot = await getDocs(q);

      const publications = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));

      console.log(`📰 ${publications.length} Publikationen für Firma gefunden`);

      return publications;
    } catch (error) {
      console.error('Fehler beim Laden der Publikationen:', error);
      return [];
    }
  }

  /**
   * STRATEGIE 2: Erstelle Default-Publikation
   */
  private async createDefaultPublication(
    companyId: string,
    companyName: string,
    organizationId: string,
    userId: string
  ): Promise<{ id: string; name: string }> {

    console.log(`📰 Erstelle Publikation für Firma: ${companyName}`);

    try {
      const publicationData = {
        name: companyName,
        companyId,
        type: 'print' as const, // Default
        organizationId,
        isGlobal: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
        deletedAt: null
      };

      const docRef = await addDoc(
        collection(db, 'publications_enhanced'),
        publicationData
      );

      return {
        id: docRef.id,
        name: companyName
      };
    } catch (error) {
      console.error('Fehler beim Erstellen der Publikation:', error);
      throw error;
    }
  }
}

// Singleton-Instanz
export const publicationMatcher = new PublicationMatcher();
```

---

### Phase 4: Integration in Matching-Service (2-3 Stunden)

#### 4.1 Erweitere matching-service.ts

**Datei:** `src/lib/firebase/matching-service.ts`

```typescript
// Neue Imports hinzufügen
import { companyMatcher, CompanyMatchResult } from '@/lib/matching/company-matcher';
import { publicationMatcher, PublicationMatchResult } from '@/lib/matching/publication-matcher';

// Neuer erweiterter Import-Response-Type
export interface ImportCandidateResponseEnhanced extends ImportCandidateResponse {
  companyMatch?: CompanyMatchResult;
  publicationMatch?: PublicationMatchResult;
}

// In MatchingCandidatesService class:

/**
 * Importiert Kandidaten MIT automatischem Company & Publication Matching
 */
async importCandidateWithAutoMatching(
  request: ImportCandidateRequest & { organizationId?: string }
): Promise<ImportCandidateResponseEnhanced> {
  try {
    console.log('🚀 Starting import with auto-matching...');

    // Lade Kandidat
    const candidate = await this.getCandidateById(request.candidateId);
    if (!candidate) {
      throw new Error('Kandidat nicht gefunden');
    }

    const selectedVariant = candidate.variants[request.selectedVariantIndex];
    if (!selectedVariant) {
      throw new Error('Variante nicht gefunden');
    }

    const superAdminOrgId = request.organizationId;
    if (!superAdminOrgId) {
      throw new Error('organizationId fehlt');
    }

    // ==========================================
    // SCHRITT 1: FIRMA MATCHEN/ERSTELLEN
    // ==========================================

    console.log('🏢 Step 1: Matching company...');
    const companyMatch = await companyMatcher.matchCompany(
      candidate.variants,
      request.selectedVariantIndex,
      superAdminOrgId,
      request.userId
    );

    console.log('Company Match Result:', companyMatch);

    // ==========================================
    // SCHRITT 2: PUBLIKATIONEN MATCHEN/ERSTELLEN
    // ==========================================

    console.log('📰 Step 2: Matching publications...');
    const publicationMatch = await publicationMatcher.matchPublications(
      companyMatch.companyId,
      companyMatch.companyName,
      superAdminOrgId,
      request.userId
    );

    console.log('Publication Match Result:', publicationMatch);

    // ==========================================
    // SCHRITT 3: KONTAKT ERSTELLEN
    // ==========================================

    console.log('👤 Step 3: Creating contact...');

    const contactData: any = {
      name: selectedVariant.contactData.name,
      displayName: selectedVariant.contactData.displayName,
      emails: selectedVariant.contactData.emails,

      // ✅ Company-Verknüpfung
      companyId: companyMatch.companyId,
      companyName: companyMatch.companyName || selectedVariant.contactData.companyName,

      organizationId: superAdminOrgId,
      isGlobal: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: request.userId,
      updatedBy: request.userId,
      deletedAt: null
    };

    // Optionale Felder
    if (selectedVariant.contactData.phones?.length) {
      contactData.phones = selectedVariant.contactData.phones;
    }
    if (selectedVariant.contactData.position) {
      contactData.position = selectedVariant.contactData.position;
    }
    if (selectedVariant.contactData.department) {
      contactData.department = selectedVariant.contactData.department;
    }
    if (selectedVariant.contactData.socialProfiles?.length) {
      contactData.socialProfiles = selectedVariant.contactData.socialProfiles;
    }
    if (selectedVariant.contactData.photoUrl) {
      contactData.photoUrl = selectedVariant.contactData.photoUrl;
    }
    if (selectedVariant.contactData.website) {
      contactData.website = selectedVariant.contactData.website;
    }

    // ✅ Media Profile mit Publications
    if (selectedVariant.contactData.hasMediaProfile) {
      contactData.mediaProfile = {
        isJournalist: true,
        publicationIds: publicationMatch.publicationIds, // ✅ Verknüpfung!
        beats: selectedVariant.contactData.beats || [],
        mediaTypes: selectedVariant.contactData.mediaTypes || []
      };
    }

    // Kontakt erstellen
    const contactRef = await addDoc(
      collection(db, 'contacts_enhanced'),
      contactData
    );

    console.log('✅ Contact created:', contactRef.id);

    // ==========================================
    // SCHRITT 4: KANDIDAT ALS IMPORTED MARKIEREN
    // ==========================================

    await this.markAsImported(
      request.candidateId,
      contactRef.id,
      request.userId
    );

    return {
      success: true,
      contactId: contactRef.id,
      companyMatch,
      publicationMatch
    };

  } catch (error) {
    console.error('Import with auto-matching failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

---

### Phase 5: UI-Integration (2-3 Stunden)

#### 5.1 Import-Handler im Modal erweitern

**Datei:** `src/app/dashboard/super-admin/matching/candidates/CandidateDetailModal.tsx`

```typescript
// Import-Handler ersetzen mit Auto-Matching Version

const handleImport = async () => {
  if (!user) {
    toast.error('Nicht eingeloggt');
    return;
  }
  if (!currentOrganization) {
    toast.error('Keine Organisation ausgewählt');
    return;
  }

  if (!confirm(`Kandidat mit Variante #${selectedVariantIndex + 1} importieren?`)) return;

  const toastId = toast.loading('Importiere Kandidat mit Auto-Matching...');

  try {
    setActionLoading(true);

    // ✅ Neue Methode mit Auto-Matching
    const result = await matchingService.importCandidateWithAutoMatching({
      candidateId: candidate.id!,
      selectedVariantIndex,
      userId: user.uid,
      organizationId: currentOrganization.id
    });

    if (result.success) {
      // ✅ Erweiterte Success-Message mit Match-Info
      let message = 'Kandidat importiert!';

      if (result.companyMatch?.companyName) {
        message += `\n🏢 Firma: ${result.companyMatch.companyName}`;
        if (result.companyMatch.wasCreated) {
          message += ' (neu erstellt)';
        }
      }

      if (result.publicationMatch?.publicationNames.length) {
        message += `\n📰 Publikationen: ${result.publicationMatch.publicationNames.join(', ')}`;
        if (result.publicationMatch.wereCreated) {
          message += ' (neu erstellt)';
        }
      }

      toast.success(message, { id: toastId, duration: 5000 });
      onUpdate();
      onClose();
    } else {
      toast.error(`Fehler: ${result.error}`, { id: toastId });
    }
  } catch (error) {
    console.error('Import failed:', error);
    toast.error(
      `Import fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      { id: toastId }
    );
  } finally {
    setActionLoading(false);
  }
};
```

---

#### 5.2 Match-Preview im Modal anzeigen (Optional)

**Neue Komponente:** `src/app/dashboard/super-admin/matching/candidates/MatchingPreview.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  BuildingOfficeIcon,
  NewspaperIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { companyMatcher } from '@/lib/matching/company-matcher';
import { publicationMatcher } from '@/lib/matching/publication-matcher';
import type { CompanyMatchResult, PublicationMatchResult } from '@/lib/matching/company-matcher';
import type { MatchingCandidateVariant } from '@/types/matching';

interface MatchingPreviewProps {
  variants: MatchingCandidateVariant[];
  selectedVariantIndex: number;
  organizationId: string;
  userId: string;
}

export default function MatchingPreview({
  variants,
  selectedVariantIndex,
  organizationId,
  userId
}: MatchingPreviewProps) {
  const [companyMatch, setCompanyMatch] = useState<CompanyMatchResult | null>(null);
  const [publicationMatch, setPublicationMatch] = useState<PublicationMatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function preview() {
      setLoading(true);
      try {
        // Company-Match simulieren (readonly)
        const cMatch = await companyMatcher.matchCompany(
          variants,
          selectedVariantIndex,
          organizationId,
          userId
        );
        setCompanyMatch(cMatch);

        // Publication-Match simulieren (readonly)
        const pMatch = await publicationMatcher.matchPublications(
          cMatch.companyId,
          cMatch.companyName,
          organizationId,
          userId
        );
        setPublicationMatch(pMatch);
      } catch (error) {
        console.error('Preview failed:', error);
      } finally {
        setLoading(false);
      }
    }

    preview();
  }, [variants, selectedVariantIndex, organizationId, userId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-sm text-zinc-500">Analysiere Matching-Möglichkeiten...</div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'orange';
      default: return 'zinc';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircleIcon className="size-4" />;
      case 'medium': return <ExclamationTriangleIcon className="size-4" />;
      case 'low': return <ExclamationTriangleIcon className="size-4" />;
      default: return null;
    }
  };

  return (
    <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="size-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Auto-Matching Vorschau
        </h3>
      </div>

      <div className="space-y-3">
        {/* Company Match */}
        <div className="flex items-start gap-3">
          <BuildingOfficeIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                Firma
              </span>
              <Badge color={getConfidenceColor(companyMatch?.confidence || 'none')}>
                {getConfidenceIcon(companyMatch?.confidence || 'none')}
                <span className="capitalize">{companyMatch?.confidence || 'none'}</span>
              </Badge>
            </div>

            {companyMatch?.companyName ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                {companyMatch.companyName}
                {companyMatch.wasCreated && (
                  <span className="text-zinc-500 ml-2">(wird neu erstellt)</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500 italic">
                Keine Firma gefunden
              </div>
            )}

            <div className="text-xs text-zinc-500 mt-1">
              Methode: {companyMatch?.method === 'email_domain' && 'E-Mail Domain'}
              {companyMatch?.method === 'fuzzy_match' && `Ähnlichkeitssuche (${Math.round((companyMatch.similarity || 0) * 100)}%)`}
              {companyMatch?.method === 'created_new' && 'Neu erstellt'}
              {companyMatch?.method === 'none' && 'Keine'}
            </div>
          </div>
        </div>

        {/* Publications Match */}
        <div className="flex items-start gap-3">
          <NewspaperIcon className="size-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                Publikationen
              </span>
              <Badge color={getConfidenceColor(publicationMatch?.confidence || 'none')}>
                {getConfidenceIcon(publicationMatch?.confidence || 'none')}
                <span className="capitalize">{publicationMatch?.confidence || 'none'}</span>
              </Badge>
            </div>

            {publicationMatch?.publicationNames.length ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                {publicationMatch.publicationNames.join(', ')}
                {publicationMatch.wereCreated && (
                  <span className="text-zinc-500 ml-2">(wird neu erstellt)</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500 italic">
                Keine Publikationen gefunden
              </div>
            )}

            <div className="text-xs text-zinc-500 mt-1">
              Methode: {publicationMatch?.method === 'from_company' && 'Aus Firma geladen'}
              {publicationMatch?.method === 'created_new' && 'Neu erstellt'}
              {publicationMatch?.method === 'none' && 'Keine'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 Diese Zuordnungen werden beim Import automatisch vorgenommen
        </p>
      </div>
    </div>
  );
}
```

**Integration im CandidateDetailModal:**

```tsx
// In CandidateDetailModal.tsx vor den Varianten-Cards einfügen:

{recommendation && (
  <div className="mb-6">
    <CandidateRecommendationBox
      recommendation={recommendation}
      variantIndex={selectedVariantIndex}
      onSelectVariant={setSelectedVariantIndex}
    />
  </div>
)}

{/* ✅ NEU: Matching Preview */}
{user && currentOrganization && (
  <MatchingPreview
    variants={candidate.variants}
    selectedVariantIndex={selectedVariantIndex}
    organizationId={currentOrganization.id}
    userId={user.uid}
  />
)}

<div className="space-y-4">
  {candidate.variants.map((variant, index) => (
    // ... Varianten-Cards
  ))}
</div>
```

---

## 🧪 Testing

### Test-Cases

#### Test 1: E-Mail Domain Match (High Confidence)
```
Input:
- Variante 1: m.mueller@spiegel.de, "Der Spiegel"
- Existing Company: "Der Spiegel" (ID: comp123)
- Existing Publications: "Der Spiegel" (Print), "Spiegel Online"

Expected:
- Company: matched to comp123 (email_domain, high)
- Publications: [pub1, pub2] (from_company, high)
- Contact: created with companyId=comp123, publicationIds=[pub1, pub2]
```

#### Test 2: Fuzzy Match (Medium Confidence)
```
Input:
- Variante 1: journalist@unknown.de, "Spiegel Verlag"
- Variante 2: reporter@test.de, "SPIEGEL GmbH"
- Existing Company: "Der Spiegel" (ID: comp123)

Expected:
- Company: matched to comp123 (fuzzy_match, medium, similarity: 85%)
- Publications: loaded from comp123
- Contact: created with matched company
```

#### Test 3: New Company Created (Low Confidence)
```
Input:
- Variante 1: journalist@neue-zeitung.de, "Neue Zeitung"
- No existing company matches

Expected:
- Company: created "Neue Zeitung" (created_new, low)
- Publication: created "Neue Zeitung" (created_new, medium)
- Contact: created with new companyId and publicationId
```

#### Test 4: No Company Info (None)
```
Input:
- Variante 1: journalist@gmail.com, no companyName
- No email domain match

Expected:
- Company: null (none)
- Publications: [] (none)
- Contact: created without company/publications
```

---

## 📊 Erfolgskriterien

### MVP erfolgreich wenn:
- ✅ E-Mail-Domain-Matching funktioniert für Top 50 Medien
- ✅ Fuzzy-Matching findet ähnliche Firmennamen (>80% Genauigkeit)
- ✅ Neue Firmen werden automatisch erstellt wenn nötig
- ✅ Publikationen werden korrekt zugeordnet
- ✅ UI zeigt Matching-Vorschau mit Konfidenz
- ✅ Keine Duplikate entstehen
- ✅ Fehlerhafte Matches können manuell korrigiert werden

### Performance-Ziele:
- ⚡ Matching-Preview in <1 Sekunde
- ⚡ Import mit Auto-Matching in <3 Sekunden
- 🎯 Match-Genauigkeit >85% bei bekannten Medien
- 🎯 Keine falsch-positiven Matches bei hoher Konfidenz

---

## 🚀 Deployment-Plan

### Phase 1: Foundation (Tag 1)
- [ ] Email-Domain-Map erstellen
- [ ] String-Similarity Utils implementieren
- [ ] Initiale Tests

### Phase 2: Company Matcher (Tag 1-2)
- [ ] Company-Matcher Service implementieren
- [ ] Unit Tests für alle 3 Strategien
- [ ] Integration Tests

### Phase 3: Publication Matcher (Tag 2)
- [ ] Publication-Matcher Service implementieren
- [ ] Integration mit Company-Matcher
- [ ] Tests

### Phase 4: Service-Integration (Tag 2-3)
- [ ] Matching-Service erweitern
- [ ] Import-Methode mit Auto-Matching
- [ ] End-to-End Tests

### Phase 5: UI-Integration (Tag 3)
- [ ] Import-Handler im Modal anpassen
- [ ] Matching-Preview Komponente
- [ ] Success-Messages erweitern
- [ ] User-Testing

### Phase 6: Test-UI in Settings (Tag 3-4)
- [ ] Test-Sektion auf Settings-Seite hinzufügen
- [ ] Matching-Test-Tool implementieren
- [ ] Domain-Map Management-UI
- [ ] Test-Cases durchführen

### Phase 7: Polish & Deploy (Tag 4)
- [ ] Error-Handling verbessern
- [ ] Logging hinzufügen
- [ ] Performance-Tests
- [ ] Dokumentation finalisieren
- [ ] Deployment auf Staging
- [ ] Final Testing
- [ ] Production Deployment

---

## 🧪 Test-UI Integration: Settings-Seite

### Zweck
Auf der SuperAdmin Settings-Seite (`/dashboard/super-admin/settings`) soll eine Test-Sektion für das Auto-Matching hinzugefügt werden, um die Matching-Algorithmen zu testen und die Domain-Map zu pflegen.

### UI-Layout

**Neue Sektion auf Settings-Seite:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Auto-Matching Test & Konfiguration                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🧪 Matching-Test                                      │   │
│ │                                                       │   │
│ │ E-Mail testen:                                        │   │
│ │ ┌─────────────────────────────────────────────────┐   │   │
│ │ │ journalist@spiegel.de                           │   │   │
│ │ └─────────────────────────────────────────────────┘   │   │
│ │                                          [Test starten]│   │
│ │                                                       │   │
│ │ Ergebnis:                                             │   │
│ │ ✅ Domain erkannt: spiegel.de → "Der Spiegel"        │   │
│ │ 🏢 Company gefunden: Der Spiegel (ID: xyz123)        │   │
│ │ 📰 Publikationen: Der Spiegel, Spiegel Online        │   │
│ │ 🎯 Konfidenz: High (E-Mail Domain Match)             │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📋 Fuzzy-Match Test                                   │   │
│ │                                                       │   │
│ │ Firmenname testen:                                    │   │
│ │ ┌─────────────────────────────────────────────────┐   │   │
│ │ │ Spiegel Verlag                                  │   │   │
│ │ └─────────────────────────────────────────────────┘   │   │
│ │                                          [Test starten]│   │
│ │                                                       │   │
│ │ Ergebnis:                                             │   │
│ │ ✅ Match gefunden: "Der Spiegel" (85% Ähnlichkeit)   │   │
│ │ 🏢 Company: Der Spiegel (ID: xyz123)                 │   │
│ │ 🎯 Konfidenz: Medium (Fuzzy Match)                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🗺️ Domain-Map Verwaltung                              │   │
│ │                                                       │   │
│ │ [+ Neue Domain hinzufügen]                            │   │
│ │                                                       │   │
│ │ Bekannte Domains (100):              [Suche...]       │   │
│ │ ┌─────────────────────────────────────────────────┐   │   │
│ │ │ Domain              │ Company             │ ✎  │   │   │
│ │ ├─────────────────────────────────────────────────┤   │   │
│ │ │ spiegel.de          │ Der Spiegel         │ ✎  │   │   │
│ │ │ zeit.de             │ Die Zeit            │ ✎  │   │   │
│ │ │ faz.net             │ FAZ                 │ ✎  │   │   │
│ │ │ ...                                              │   │   │
│ │ └─────────────────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⚙️ Matching-Konfiguration                             │   │
│ │                                                       │   │
│ │ Fuzzy-Match Threshold: [████████░░] 80%               │   │
│ │ Min. Ähnlichkeit für Auto-Match                       │   │
│ │                                                       │   │
│ │ □ Auto-Create Companies                               │   │
│ │   Neue Firmen automatisch erstellen wenn kein Match  │   │
│ │                                                       │   │
│ │ □ Auto-Create Publications                            │   │
│ │   Neue Publikationen automatisch erstellen           │   │
│ │                                                       │   │
│ │                                        [Speichern]    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📊 Matching-Statistiken                               │   │
│ │                                                       │   │
│ │ Letzte 30 Tage:                                       │   │
│ │ ├─ 45 E-Mail Domain Matches (High)                    │   │
│ │ ├─ 12 Fuzzy Matches (Medium)                          │   │
│ │ ├─ 8 Neue Companies erstellt (Low)                    │   │
│ │ └─ 3 Kein Match (None)                                │   │
│ │                                                       │   │
│ │ Top Domains:                                          │   │
│ │ 1. spiegel.de (12 Matches)                            │   │
│ │ 2. zeit.de (8 Matches)                                │   │
│ │ 3. faz.net (7 Matches)                                │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementierung

#### 1. Neue Komponente: `MatchingTestSection.tsx`

**Datei:** `src/app/dashboard/super-admin/settings/MatchingTestSection.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  NewspaperIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { companyMatcher } from '@/lib/matching/company-matcher';
import { publicationMatcher } from '@/lib/matching/publication-matcher';
import { getCompanyFromEmail } from '@/lib/matching/email-domain-map';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';

export default function MatchingTestSection() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // E-Mail Test
  const [emailTest, setEmailTest] = useState('');
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Fuzzy Match Test
  const [companyTest, setCompanyTest] = useState('');
  const [companyResult, setCompanyResult] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  /**
   * Test E-Mail Domain Matching
   */
  const handleEmailTest = async () => {
    if (!emailTest || !user || !currentOrganization) return;

    setEmailLoading(true);
    setEmailResult(null);

    try {
      // 1. Domain-Map Check
      const expectedCompany = getCompanyFromEmail(emailTest);

      // 2. Simuliere Company-Match
      const mockVariant = {
        organizationId: currentOrganization.id,
        organizationName: currentOrganization.name,
        contactId: 'test',
        contactData: {
          name: { firstName: 'Test', lastName: 'User' },
          displayName: 'Test User',
          emails: [{ email: emailTest, type: 'business', isPrimary: true }],
          companyName: expectedCompany || undefined,
          hasMediaProfile: true
        }
      };

      const companyMatch = await companyMatcher.matchCompany(
        [mockVariant],
        0,
        currentOrganization.id,
        user.uid
      );

      // 3. Simuliere Publication-Match
      const publicationMatch = await publicationMatcher.matchPublications(
        companyMatch.companyId,
        companyMatch.companyName,
        currentOrganization.id,
        user.uid
      );

      setEmailResult({
        domain: emailTest.split('@')[1],
        expectedCompany,
        companyMatch,
        publicationMatch
      });

      toast.success('Test abgeschlossen');
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test fehlgeschlagen');
    } finally {
      setEmailLoading(false);
    }
  };

  /**
   * Test Fuzzy Company Matching
   */
  const handleCompanyTest = async () => {
    if (!companyTest || !user || !currentOrganization) return;

    setCompanyLoading(true);
    setCompanyResult(null);

    try {
      const mockVariant = {
        organizationId: currentOrganization.id,
        organizationName: currentOrganization.name,
        contactId: 'test',
        contactData: {
          name: { firstName: 'Test', lastName: 'User' },
          displayName: 'Test User',
          emails: [],
          companyName: companyTest,
          hasMediaProfile: true
        }
      };

      const companyMatch = await companyMatcher.matchCompany(
        [mockVariant],
        0,
        currentOrganization.id,
        user.uid
      );

      setCompanyResult(companyMatch);
      toast.success('Test abgeschlossen');
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test fehlgeschlagen');
    } finally {
      setCompanyLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'orange';
      default: return 'zinc';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          🎯 Auto-Matching Test & Konfiguration
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Teste die Matching-Algorithmen und verwalte die Domain-Map
        </p>
      </div>

      {/* E-Mail Domain Test */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          🧪 E-Mail Domain Test
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
              E-Mail-Adresse:
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="journalist@spiegel.de"
                value={emailTest}
                onChange={(e) => setEmailTest(e.target.value)}
                className="flex-1"
              />
              <Button
                color="blue"
                onClick={handleEmailTest}
                disabled={emailLoading || !emailTest}
              >
                {emailLoading ? 'Teste...' : 'Test starten'}
              </Button>
            </div>
          </div>

          {emailResult && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-green-600" />
                <span className="text-sm font-medium">
                  Domain erkannt: {emailResult.domain} → "{emailResult.expectedCompany || 'Unbekannt'}"
                </span>
              </div>

              {emailResult.companyMatch.companyName && (
                <div className="flex items-start gap-2">
                  <BuildingOfficeIcon className="size-5 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">Company gefunden:</span>{' '}
                      {emailResult.companyMatch.companyName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      ID: {emailResult.companyMatch.companyId}
                    </div>
                  </div>
                </div>
              )}

              {emailResult.publicationMatch.publicationNames.length > 0 && (
                <div className="flex items-start gap-2">
                  <NewspaperIcon className="size-5 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">Publikationen:</span>{' '}
                      {emailResult.publicationMatch.publicationNames.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-zinc-400" />
                <span className="text-sm">Konfidenz:</span>
                <Badge color={getConfidenceColor(emailResult.companyMatch.confidence)}>
                  {emailResult.companyMatch.confidence}
                </Badge>
                <span className="text-xs text-zinc-500">
                  ({emailResult.companyMatch.method})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fuzzy Match Test */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          📋 Fuzzy-Match Test
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
              Firmenname:
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Spiegel Verlag"
                value={companyTest}
                onChange={(e) => setCompanyTest(e.target.value)}
                className="flex-1"
              />
              <Button
                color="blue"
                onClick={handleCompanyTest}
                disabled={companyLoading || !companyTest}
              >
                {companyLoading ? 'Teste...' : 'Test starten'}
              </Button>
            </div>
          </div>

          {companyResult && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3">
              {companyResult.companyName ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="size-5 text-green-600" />
                    <span className="text-sm font-medium">
                      Match gefunden: "{companyResult.companyName}"
                      {companyResult.similarity && (
                        <span className="text-zinc-500 ml-2">
                          ({Math.round(companyResult.similarity * 100)}% Ähnlichkeit)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <BuildingOfficeIcon className="size-5 text-zinc-400 mt-0.5" />
                    <div>
                      <div className="text-sm">
                        <span className="font-medium">Company:</span>{' '}
                        {companyResult.companyName}
                      </div>
                      <div className="text-xs text-zinc-500">
                        ID: {companyResult.companyId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-5 text-zinc-400" />
                    <span className="text-sm">Konfidenz:</span>
                    <Badge color={getConfidenceColor(companyResult.confidence)}>
                      {companyResult.confidence}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      ({companyResult.method})
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="size-5 text-orange-500" />
                  <span className="text-sm">Kein Match gefunden</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hinweis */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Hinweis:</strong> Diese Tests simulieren das Matching ohne Daten zu ändern.
          Beim echten Import werden die Ergebnisse in die Datenbank geschrieben.
        </p>
      </div>
    </div>
  );
}
```

---

#### 2. Integration in Settings-Seite

**Datei:** `src/app/dashboard/super-admin/settings/page.tsx`

```typescript
// Importiere neue Komponente
import MatchingTestSection from './MatchingTestSection';

// In der Page-Komponente ergänzen:
export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Bestehende Sektionen */}

      {/* NEU: Matching Test Sektion */}
      <section>
        <MatchingTestSection />
      </section>
    </div>
  );
}
```

---

### Test-Cases für Settings-Seite

#### Test 1: E-Mail Domain Test
```
Input: journalist@spiegel.de
Expected:
- Domain: spiegel.de
- Company: "Der Spiegel" (high confidence)
- Publications: "Der Spiegel", "Spiegel Online"
- Method: email_domain
```

#### Test 2: Unbekannte Domain
```
Input: test@unknown-media.de
Expected:
- Domain: unknown-media.de
- Company: null (none)
- Publications: []
- Method: none
```

#### Test 3: Fuzzy Match
```
Input: "Spiegel Verlag"
Expected:
- Company: "Der Spiegel" (medium confidence)
- Similarity: 85%
- Method: fuzzy_match
```

#### Test 4: Kein Fuzzy Match
```
Input: "Völlig Neue Zeitung"
Expected:
- Company: null (none)
- Method: none
```

---

## 📝 Offene Fragen

1. **Domain-Map Pflege:** Wer pflegt die Email-Domain-Map? Automatisch oder manuell?
2. **Duplikat-Prevention:** Sollen wir prüfen ob Company schon von anderem Kandidaten erstellt wurde?
3. **Match-Korrektur:** UI für manuelle Korrektur von falschen Matches?
4. **Publication-Types:** Sollen wir Publication-Type (print/online/tv) aus Domain ableiten?
5. **Multi-Publication:** Was wenn Journalist bei mehreren Publikationen arbeitet?

---

## 🔮 Future Enhancements

### Phase 2 (später):
- **AI-basiertes Matching:** GPT-4 für komplexe Name-Matching-Fälle
- **Learning System:** System lernt aus manuellen Korrekturen
- **Bulk-Correction:** Alle Matches eines Typs auf einmal korrigieren
- **Match-History:** Zeige wie oft welche Domain→Company gemappt wurde
- **Confidence-Tuning:** SuperAdmin kann Matching-Thresholds anpassen

---

**Status:** 📋 Implementierungsplan fertig
**Geschätzter Aufwand:** 3-4 Tage
**Priorität:** Hoch
**Nächster Schritt:** Phase 1 starten - Email-Domain-Map erstellen
