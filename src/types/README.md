# TypeScript Types

Dieses Verzeichnis enthält alle TypeScript-Interfaces für die Anwendung.

## Pressemeldungs-Refactoring (Phase 1)

### `fakten-matrix.ts`
Strukturierte Fakten für PM-Generierung, gespeichert via Tool-Call (NICHT Regex-Parsing).

**Firestore-Pfad:** `projects/{projectId}/strategy/faktenMatrix`

**Interfaces:**
- `FaktenMatrix` - Haupt-Interface mit hook, details, quote
- `FaktenMatrixCreateData` - Daten zum Erstellen
- `FaktenMatrixUpdateData` - Daten zum Aktualisieren

**Struktur:**
```typescript
interface FaktenMatrix {
  hook: {
    event: string;      // Was passiert?
    location: string;   // Wo?
    date: string;       // Wann?
  };
  details: {
    delta: string;      // Neuigkeitswert
    evidence: string;   // Harte Beweise
  };
  quote: {
    speakerId: string;    // Referenz auf DNA-Kontakt
    rawStatement: string; // Erarbeitete Kernaussage
  };
}
```

### `pm-vorlage.ts`
Generierte Pressemeldungs-Vorlage mit Hash-basierter Änderungserkennung.

**Firestore-Pfad:** `projects/{projectId}/strategy/pmVorlage`

**Interfaces:**
- `PMVorlage` - Haupt-Interface für PM-Vorlage
- `PMVorlageContent` - Versionierbarer Content-Teil
- `PMVorlageHistoryEntry` - History-Entry für Undo
- `PMVorlageStatus` - Union-Type für Status-Handling
- `PMVorlageCreateData` - Daten zum Erstellen
- `PMVorlageUpdateData` - Daten zum Aktualisieren

**Struktur:**
```typescript
interface PMVorlage {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: { text, person, role, company };
  cta: string;
  hashtags: string[];
  htmlContent: string;

  // Metadata
  generatedAt: Timestamp;
  targetGroup: 'ZG1' | 'ZG2' | 'ZG3';

  // Hash-Tracking
  markenDNAHash: string;
  faktenMatrixHash: string;

  // History (letzte 3 Versionen)
  history?: PMVorlageHistoryEntry[];
}
```

**Status-Handling:**
```typescript
type PMVorlageStatus =
  | { status: 'missing_dna' }
  | { status: 'missing_fakten' }
  | { status: 'outdated'; reason: 'dna_changed' | 'fakten_changed' }
  | { status: 'available'; vorlage?: PMVorlage };
```

## Marken-DNA System

### `marken-dna.ts`
6 Marken-DNA Dokumente (Briefing, SWOT, Audience, Positioning, Goals, Messages).

**Firestore-Pfad:** `companies/{companyId}/markenDNA/{documentType}`

### `dna-synthese.ts`
KI-optimierte Kurzform der 6 Marken-DNA Dokumente (~500 Tokens).

**Firestore-Pfad:** `companies/{companyId}/markenDNA/synthesis`

**Features:**
- Token-Ersparnis: 6 Dokumente (~5.000 Tokens) → Synthese (~500 Tokens)
- Hash-basiertes Änderungs-Tracking
- Plain-Text für KI-Übergabe

### `kernbotschaft.ts`
Projekt-spezifische strategische Kernbotschaft.

**Firestore-Pfad:** `projects/{projectId}/kernbotschaft`

## Verwendung

### Import einzelner Typen
```typescript
import { FaktenMatrix } from '@/types/fakten-matrix';
import { PMVorlage, PMVorlageStatus } from '@/types/pm-vorlage';
```

### Import über zentrale index.ts
```typescript
import { FaktenMatrix, PMVorlage, DNASynthese } from '@/types';
```

## Firestore-Struktur

```
companies/{companyId}/
├── markenDNA/
│   ├── briefing         # MarkenDNADocument
│   ├── swot             # MarkenDNADocument
│   ├── audience         # MarkenDNADocument
│   ├── positioning      # MarkenDNADocument
│   ├── goals            # MarkenDNADocument
│   ├── messages         # MarkenDNADocument
│   └── synthesis        # DNASynthese

projects/{projectId}/
├── kernbotschaft        # Kernbotschaft
└── strategy/
    ├── dnaSynthese      # (Kopie für Projekt)
    ├── faktenMatrix     # FaktenMatrix (NEU)
    └── pmVorlage        # PMVorlage (NEU)
```

## Best Practices

1. **Timestamp-Handling**
   ```typescript
   import { Timestamp } from 'firebase/firestore';

   const faktenMatrix: FaktenMatrix = {
     // ... data
     createdAt: Timestamp.now(),
     updatedAt: Timestamp.now()
   };
   ```

2. **Hash-Berechnung**
   ```typescript
   import { createHash } from 'crypto';

   function hashString(data: string): string {
     return createHash('sha256')
       .update(data)
       .digest('hex')
       .substring(0, 16);
   }
   ```

3. **Status-Prüfung mit Type Guards**
   ```typescript
   async function getPMVorlageStatus(
     projectId: string
   ): Promise<PMVorlageStatus> {
     // ... Implementierung siehe 07-MIGRATION.md
   }
   ```

## Siehe auch

- [Zod-Schemas](../lib/ai/schemas/README.md)
- [Planungsdokumentation](../../docs/planning/Press-Release-Refactoring/)
- [Implementierungsschritte](../../docs/planning/Press-Release-Refactoring/06-IMPLEMENTATION-STEPS.md)
- [Migration Guide](../../docs/planning/Press-Release-Refactoring/07-MIGRATION.md)
