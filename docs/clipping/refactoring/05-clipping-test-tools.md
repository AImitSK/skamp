# Refactoring-Plan 05: Clipping-System Test-Tools

**Datum:** 25.11.2025
**Status:** Geplant
**Priorität:** Mittel

---

## Zusammenfassung

Integration von Test-Tools für das Clipping/Monitoring-System in die SuperAdmin Settings Seite (`/dashboard/super-admin/settings`). Ermöglicht das Simulieren von Veröffentlichungen um alle Systeme zu testen.

---

## Ziele

1. **Veröffentlichungen simulieren** ohne echte RSS-Feeds
2. **Auto-Confirm Logik testen** (Firmenname + SEO-Score)
3. **Keyword-Extraktion prüfen** (Company → Keywords)
4. **End-to-End Flow validieren** (Crawler → Suggestion → Clipping → Dashboard)

---

## Integration in SuperAdmin Settings

### Neue Section: "Clipping-System Tests"

```
┌─────────────────────────────────────────────────────────────┐
│ 📰 Clipping-System Tests                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [1. Keyword-Extraktion Test]                               │
│   Company Name: [________________] [Testen]                 │
│   → Generierte Keywords: TechVision, TechVision GmbH, ...  │
│                                                             │
│ [2. Match-Score Test]                                       │
│   Firmenname: [________________]                            │
│   Artikel-Titel: [________________]                         │
│   Artikel-Content: [________________]                       │
│   SEO-Keywords: [________________] [Testen]                 │
│   → Score: 85% | Auto-Confirm: Ja                          │
│                                                             │
│ [3. Artikel-Simulation]                                     │
│   Kampagne: [Dropdown] Artikel-URL: [____________]         │
│   Titel: [________________]                                 │
│   [Als Auto-Fund erstellen] [Als Clipping erstellen]       │
│                                                             │
│ [4. Test-Daten Generator]                                   │
│   [Test-Kampagne mit Clippings erstellen]                  │
│   [Test-Daten löschen]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Test-Tools im Detail

### 1. Keyword-Extraktion Test

**Funktion:** Testet die automatische Keyword-Generierung aus Company-Daten

**Input:**
- `company.name` (Pflicht)
- `company.officialName` (optional)
- `company.tradingName` (optional)
- `company.legalForm` (optional)

**Output:**
- Liste der generierten Keywords
- Rechtsformen die entfernt wurden
- Validierung der Logik

**Code-Beispiel:**
```typescript
interface KeywordExtractionTestResult {
  inputCompany: {
    name: string;
    officialName?: string;
    tradingName?: string;
  };
  extractedKeywords: string[];
  removedLegalForms: string[];
  warnings: string[];
}

function testKeywordExtraction(company: CompanyData): KeywordExtractionTestResult {
  // Implementierung der Keyword-Extraktion
  // Gleiche Logik wie im Crawler
}
```

---

### 2. Match-Score Test

**Funktion:** Testet die Auto-Confirm Logik mit simulierten Daten

**Input:**
- Firmenname (aus Company)
- Artikel-Titel
- Artikel-Content (Excerpt)
- SEO-Keywords (optional)

**Output:**
- Firmenname gefunden: Ja/Nein
- Position: Titel / Content / Nicht gefunden
- SEO-Match Score: 0-100%
- **Ergebnis: AUTO-CONFIRM / AUTO-FUNDE / SKIP**

**Entscheidungslogik (aus Plan 02):**
```
Firmenname im Titel → AUTO-CONFIRM
Firmenname im Content + SEO >= 70% → AUTO-CONFIRM
Firmenname im Content + SEO < 70% → AUTO-FUNDE
Kein Firmenname → SKIP
```

---

### 3. Artikel-Simulation

**Funktion:** Erstellt simulierte Artikel direkt in der Datenbank

**Optionen:**

#### A) Als Auto-Fund (MonitoringSuggestion)
- Status: `pending`
- Erscheint im "Auto-Funde" Tab
- Kann manuell bestätigt/abgelehnt werden

#### B) Als Clipping (MediaClipping)
- Erscheint direkt im Clipping-Archiv
- Mit konfigurierbaren Metadaten (Reach, Sentiment, etc.)

**Input-Felder:**
```typescript
interface SimulatedArticle {
  campaignId: string;        // Dropdown aus aktiven Kampagnen
  articleUrl: string;
  articleTitle: string;
  articleExcerpt?: string;
  outletName: string;        // z.B. "Test-Publikation"
  outletType: 'online' | 'print' | 'tv' | 'radio';
  publishedAt: Date;
  reach?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';

  // Für Auto-Fund
  matchScore?: number;
  confidence?: 'low' | 'medium' | 'high' | 'very_high';
}
```

---

### 4. Test-Daten Generator

**Funktion:** Erstellt komplette Test-Szenarien mit einem Klick

#### "Test-Kampagne mit Clippings erstellen"

Erstellt:
1. Test-Projekt (falls nicht vorhanden)
2. Test-Company mit verschiedenen Namen
3. Test-Kampagne mit Monitoring aktiviert
4. 5-10 simulierte Clippings (verschiedene Sentiments, Reichweiten)
5. 3-5 Auto-Funde (pending) zum Testen

**Vorteile:**
- Schnelles Setup für Demo/Testing
- Alle UI-Komponenten haben Daten
- Verschiedene Szenarien abgedeckt

#### "Test-Daten löschen"

Löscht alle Entitäten mit `isTestData: true` Flag:
- Clippings
- MonitoringSuggestions
- CampaignMonitoringTracker
- Test-Kampagnen
- Test-Projekte

---

## Technische Implementierung

### Neue Dateien

```
src/
├── app/dashboard/super-admin/settings/
│   └── ClippingTestSection.tsx         # UI-Komponente
├── lib/clipping/
│   ├── keyword-extractor.ts            # Keyword-Logik (aus Crawler extrahiert)
│   ├── match-score-calculator.ts       # Score-Logik (aus Crawler extrahiert)
│   └── seed-clipping-test-data.ts      # Test-Daten Generator
```

### ClippingTestSection.tsx

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  NewspaperIcon,
  BeakerIcon,
  SparklesIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ClippingTestSection() {
  // State für die 4 Test-Tools
  const [loading, setLoading] = useState(false);

  // 1. Keyword-Extraktion
  const [companyName, setCompanyName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [keywordResult, setKeywordResult] = useState<string[]>([]);

  // 2. Match-Score
  const [testFirmenname, setTestFirmenname] = useState('');
  const [testTitel, setTestTitel] = useState('');
  const [testContent, setTestContent] = useState('');
  const [testSeoKeywords, setTestSeoKeywords] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);

  // 3. Artikel-Simulation
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [articleTitle, setArticleTitle] = useState('');

  // Handlers...

  return (
    <div className="space-y-8">
      {/* 1. Keyword-Extraktion */}
      {/* 2. Match-Score Test */}
      {/* 3. Artikel-Simulation */}
      {/* 4. Test-Daten Generator */}
    </div>
  );
}
```

### seed-clipping-test-data.ts

```typescript
import { db } from '@/lib/firebase/client-init';
import { collection, addDoc, getDocs, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface ClippingTestDataStats {
  projects: number;
  companies: number;
  campaigns: number;
  clippings: number;
  suggestions: number;
}

/**
 * Erstellt realistische Test-Daten für das Clipping-System
 */
export async function seedClippingTestData(
  organizationId: string,
  userId: string
): Promise<ClippingTestDataStats> {

  // 1. Test-Company erstellen
  const companyRef = await addDoc(collection(db, 'companies'), {
    organizationId,
    name: 'TechVision GmbH',
    officialName: 'TechVision Solutions GmbH',
    tradingName: 'TechVision',
    isTestData: true,
    createdAt: serverTimestamp(),
    createdBy: userId
  });

  // 2. Test-Projekt erstellen
  const projectRef = await addDoc(collection(db, 'projects'), {
    organizationId,
    title: 'Test-Projekt: Clipping System',
    companyId: companyRef.id,
    status: 'active',
    isTestData: true,
    createdAt: serverTimestamp(),
    createdBy: userId
  });

  // 3. Test-Kampagne mit Monitoring
  const campaignRef = await addDoc(collection(db, 'pr_campaigns'), {
    organizationId,
    projectId: projectRef.id,
    title: 'Test-Kampagne: Produkt-Launch',
    status: 'sent',
    monitoringConfig: {
      isEnabled: true,
      keywords: ['TechVision', 'Smart Home', 'IoT'],
      monitoringPeriod: 30
    },
    isTestData: true,
    createdAt: serverTimestamp(),
    createdBy: userId
  });

  // 4. Test-Clippings erstellen
  const testClippings = [
    {
      title: 'TechVision revolutioniert Smart Home Markt',
      outletName: 'Handelsblatt',
      sentiment: 'positive',
      reach: 850000
    },
    {
      title: 'Neue IoT-Lösung von TechVision vorgestellt',
      outletName: 'Heise Online',
      sentiment: 'neutral',
      reach: 1200000
    },
    {
      title: 'Smart Home Trends 2025 - TechVision unter Top 10',
      outletName: 'FAZ',
      sentiment: 'positive',
      reach: 450000
    },
    {
      title: 'TechVision-CEO im Interview über Zukunftspläne',
      outletName: 'Manager Magazin',
      sentiment: 'positive',
      reach: 320000
    },
    {
      title: 'Kritik an neuer TechVision-Datenschutzrichtlinie',
      outletName: 'Netzpolitik',
      sentiment: 'negative',
      reach: 180000
    }
  ];

  let clippingCount = 0;
  for (const clipping of testClippings) {
    await addDoc(collection(db, 'media_clippings'), {
      organizationId,
      campaignId: campaignRef.id,
      ...clipping,
      url: `https://example.com/article/${Date.now()}`,
      outletType: 'online',
      detectionMethod: 'automated',
      isTestData: true,
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userId
    });
    clippingCount++;
  }

  // 5. Test-Suggestions (Auto-Funde) erstellen
  const testSuggestions = [
    {
      articleTitle: 'TechVision startet Partnerschaft mit Telekom',
      confidence: 'high',
      matchScore: 85
    },
    {
      articleTitle: 'Smart Home Anbieter im Vergleich',
      confidence: 'medium',
      matchScore: 65
    },
    {
      articleTitle: 'IoT-Sicherheit: Was Verbraucher wissen müssen',
      confidence: 'low',
      matchScore: 45
    }
  ];

  let suggestionCount = 0;
  for (const suggestion of testSuggestions) {
    await addDoc(collection(db, 'monitoring_suggestions'), {
      organizationId,
      campaignId: campaignRef.id,
      ...suggestion,
      articleUrl: `https://example.com/suggestion/${Date.now()}`,
      status: 'pending',
      sources: [{
        type: 'rss_feed',
        sourceName: 'Test-RSS-Feed',
        matchScore: suggestion.matchScore
      }],
      avgMatchScore: suggestion.matchScore,
      highestMatchScore: suggestion.matchScore,
      isTestData: true,
      createdAt: serverTimestamp()
    });
    suggestionCount++;
  }

  return {
    projects: 1,
    companies: 1,
    campaigns: 1,
    clippings: clippingCount,
    suggestions: suggestionCount
  };
}

/**
 * Löscht alle Test-Daten
 */
export async function cleanupClippingTestData(organizationId: string): Promise<void> {
  const collections = [
    'media_clippings',
    'monitoring_suggestions',
    'campaign_monitoring_trackers',
    'pr_campaigns',
    'projects',
    'companies'
  ];

  for (const collectionName of collections) {
    const q = query(
      collection(db, collectionName),
      where('organizationId', '==', organizationId),
      where('isTestData', '==', true)
    );

    const snapshot = await getDocs(q);
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  }
}
```

---

## Integration in page.tsx

```tsx
// In SuperAdminSettingsPage hinzufügen:

import ClippingTestSection from './ClippingTestSection';

// In der return-Anweisung, nach "Intelligent Matching System":

{/* Clipping-System Tests Section */}
<div className="mb-8">
  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
    <NewspaperIcon className="size-5" />
    Clipping-System Tests
  </h2>

  <div className="p-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
    <ClippingTestSection />
  </div>
</div>
```

---

## Checkliste

- [ ] `keyword-extractor.ts` aus Crawler extrahieren
- [ ] `match-score-calculator.ts` aus Crawler extrahieren
- [ ] `seed-clipping-test-data.ts` erstellen
- [ ] `ClippingTestSection.tsx` erstellen
- [ ] In `page.tsx` integrieren
- [ ] Keyword-Extraktion Test implementieren
- [ ] Match-Score Test implementieren
- [ ] Artikel-Simulation implementieren
- [ ] Test-Daten Generator implementieren
- [ ] Cleanup-Funktion implementieren
- [ ] Manueller Test aller 4 Tools

---

## Vorteile

| Vorteil | Beschreibung |
|---------|-------------|
| Schnelles Testing | Keine echten RSS-Feeds nötig |
| Reproduzierbar | Gleiche Test-Daten jederzeit |
| Isoliert | Test-Daten separat markiert |
| Vollständig | Alle Komponenten testbar |
| Demo-fähig | Präsentation ohne Echtdaten |

---

## Risiko-Bewertung

| Risiko | Bewertung | Maßnahme |
|--------|-----------|----------|
| Test-Daten in Produktion | Niedrig | `isTestData: true` Flag |
| Performance | Niedrig | Begrenzte Datenmenge |
| Datenleck | Niedrig | Nur für SuperAdmin |

---

*Erstellt am 25.11.2025*
