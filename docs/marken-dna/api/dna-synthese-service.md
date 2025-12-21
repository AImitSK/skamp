# dnaSyntheseService

Firebase Service für DNA Synthese - KI-optimierte Kurzfassung der 6 Marken-DNA Dokumente.

**Pfad:** `src/lib/firebase/dna-synthese-service.ts`

---

## Überblick

Die DNA Synthese ist eine komprimierte Version aller 6 Marken-DNA Dokumente (briefing, swot, audience, positioning, goals, messages). Sie reduziert ~5.000 Tokens auf ~500 Tokens und dient als effizienter Kontext für KI-gestützte Textgenerierung.

### Hauptfunktionen

- **Synthese-Generierung**: Komprimiert 6 Dokumente in ein optimiertes Format
- **Versions-Tracking**: Hash-basierte Erkennung von Änderungen
- **Manuelle Bearbeitung**: Unterstützt User-Anpassungen
- **Aktualitätsprüfung**: Erkennt veraltete Synthesen

---

## Import

```typescript
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';
```

---

## Methoden-Übersicht

| Methode | Beschreibung |
|---------|--------------|
| [getSynthese](#getsynthese) | Lädt die DNA Synthese |
| [createSynthese](#createsynthese) | Erstellt eine neue Synthese |
| [updateSynthese](#updatesynthese) | Aktualisiert die Synthese |
| [deleteSynthese](#deletesynthese) | Löscht die Synthese |
| [synthesize](#synthesize) | Generiert neue Synthese aus 6 Dokumenten |
| [isOutdated](#isoutdated) | Prüft ob Synthese veraltet ist |

---

## Firestore-Struktur

```
companies/{companyId}/markenDNA/
└── synthesis/
    ├── content          (string, HTML)
    ├── plainText        (string, optimiert für KI)
    ├── synthesizedFrom  (string[], IDs der Quelldokumente)
    ├── markenDNAVersion (string, Hash der Quelldokumente)
    ├── manuallyEdited   (boolean)
    ├── synthesizedAt    (Timestamp)
    ├── createdAt        (Timestamp)
    └── updatedAt        (Timestamp)
```

---

## getSynthese

Lädt die DNA Synthese eines Kunden.

### Signatur

```typescript
async getSynthese(companyId: string): Promise<DNASynthese | null>
```

### Parameter

- **companyId** (`string`) - ID der Company (Kunde)

### Rückgabewert

- `DNASynthese | null` - Die Synthese oder `null` wenn nicht vorhanden

### Beispiel

```typescript
const synthese = await dnaSyntheseService.getSynthese('company-123');

if (synthese) {
  console.log(synthese.plainText);         // Optimierter KI-Kontext (~500 Tokens)
  console.log(synthese.markenDNAVersion);  // "a3f5c8d9e2b1f4a7"
  console.log(synthese.synthesizedFrom);   // ["briefing", "swot", ...]
  console.log(synthese.manuallyEdited);    // false
}
```

---

## createSynthese

Erstellt eine neue DNA Synthese.

### Signatur

```typescript
async createSynthese(
  data: DNASyntheseCreateData,
  context: { organizationId: string; userId: string }
): Promise<string>
```

### Parameter

- **data** (`DNASyntheseCreateData`)
  - `companyId: string` - ID der Company
  - `content: string` - HTML-Content
  - `plainText: string` - Plain-Text für KI (~500 Tokens)
  - `synthesizedFrom: string[]` - IDs der Quelldokumente
  - `markenDNAVersion: string` - Hash der Quelldokumente

- **context** (`object`)
  - `organizationId: string` - ID der Organisation
  - `userId: string` - ID des aktuellen Users

### Rückgabewert

- `string` - Die ID der erstellten Synthese (`"synthesis"`)

### Beispiel

```typescript
const syntheseId = await dnaSyntheseService.createSynthese(
  {
    companyId: 'company-123',
    content: '<h1>DNA Synthese</h1><p>Maschinenbau...</p>',
    plainText: 'Maschinenbau-Unternehmen spezialisiert auf...',
    synthesizedFrom: ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'],
    markenDNAVersion: 'a3f5c8d9e2b1f4a7'
  },
  {
    organizationId: 'org-456',
    userId: 'user-789'
  }
);

console.log(syntheseId); // "synthesis"
```

**Hinweis:** Setzt automatisch `manuallyEdited: false` und `synthesizedAt: serverTimestamp()`.

---

## updateSynthese

Aktualisiert eine bestehende DNA Synthese.

### Signatur

```typescript
async updateSynthese(
  companyId: string,
  data: DNASyntheseUpdateData,
  context: { organizationId: string; userId: string }
): Promise<void>
```

### Parameter

- **companyId** (`string`) - ID der Company
- **data** (`DNASyntheseUpdateData`) - Zu aktualisierende Felder (partial)
  - `content?: string` - HTML-Content
  - `plainText?: string` - Plain-Text
  - `manuallyEdited?: boolean` - Flag für manuelle Bearbeitung
  - `synthesizedFrom?: string[]` - IDs der Quelldokumente
  - `markenDNAVersion?: string` - Hash der Quelldokumente

- **context** (`object`)
  - `organizationId: string` - ID der Organisation
  - `userId: string` - ID des aktuellen Users

### Rückgabewert

- `void`

### Beispiel

```typescript
// User bearbeitet Synthese manuell
await dnaSyntheseService.updateSynthese(
  'company-123',
  {
    plainText: 'User-angepasste Version der Synthese...',
    manuallyEdited: true
  },
  {
    organizationId: 'org-456',
    userId: 'user-789'
  }
);
```

---

## deleteSynthese

Löscht die DNA Synthese.

### Signatur

```typescript
async deleteSynthese(companyId: string): Promise<void>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `void`

### Beispiel

```typescript
await dnaSyntheseService.deleteSynthese('company-123');
```

---

## synthesize

Generiert eine neue DNA Synthese aus den 6 Marken-DNA Dokumenten.

### Signatur

```typescript
async synthesize(
  companyId: string,
  context: { organizationId: string; userId: string }
): Promise<DNASynthese>
```

### Parameter

- **companyId** (`string`) - ID der Company
- **context** (`object`)
  - `organizationId: string` - ID der Organisation
  - `userId: string` - ID des aktuellen Users

### Rückgabewert

- `DNASynthese` - Die neu generierte Synthese

### Workflow

1. Exportiert alle 6 Marken-DNA Dokumente als Plain-Text (`markenDNAService.exportForAI()`)
2. Berechnet Hash über alle Dokumente für Versions-Tracking (`markenDNAService.computeMarkenDNAHash()`)
3. Speichert die Synthese mit den Dokument-IDs
4. Gibt die gespeicherte Synthese zurück

### Beispiel

```typescript
// Prüfen ob alle Dokumente vorhanden sind
const isComplete = await markenDNAService.isComplete('company-123');

if (isComplete) {
  const synthese = await dnaSyntheseService.synthesize(
    'company-123',
    {
      organizationId: 'org-456',
      userId: 'user-789'
    }
  );

  console.log(synthese.plainText);         // Generierte Synthese
  console.log(synthese.synthesizedFrom);   // ["briefing", "swot", ...]
  console.log(synthese.markenDNAVersion);  // "a3f5c8d9e2b1f4a7"
}
```

### Error

Wirft Error wenn:
- Keine Marken-DNA Dokumente gefunden wurden
- Die Synthese nicht gespeichert werden konnte

---

## isOutdated

Prüft ob die DNA Synthese veraltet ist (Marken-DNA wurde geändert).

### Signatur

```typescript
async isOutdated(companyId: string): Promise<boolean>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `boolean` - `true` wenn die Marken-DNA geändert wurde, `false` sonst

### Workflow

1. Lädt die gespeicherte DNA Synthese
2. Berechnet den aktuellen Hash der 6 Marken-DNA Dokumente
3. Vergleicht `synthese.markenDNAVersion` mit dem aktuellen Hash

### Beispiel

```typescript
const synthese = await dnaSyntheseService.getSynthese('company-123');

if (synthese) {
  const isOutdated = await dnaSyntheseService.isOutdated('company-123');

  if (isOutdated) {
    console.log('Synthese ist veraltet - bitte neu generieren!');

    // User fragen ob Synthese aktualisiert werden soll
    const shouldUpdate = confirm('Marken-DNA wurde geändert. Synthese neu generieren?');

    if (shouldUpdate) {
      await dnaSyntheseService.synthesize('company-123', context);
    }
  } else {
    console.log('Synthese ist aktuell.');
  }
}
```

**Hinweis:** Gibt `false` zurück wenn keine Synthese vorhanden ist (nicht veraltet, aber auch nicht vorhanden).

---

## TypeScript Interfaces

### DNASynthese

```typescript
interface DNASynthese {
  id: string;                          // "synthesis"
  companyId: string;
  organizationId: string;
  content: string;                     // HTML-Content
  plainText: string;                   // Plain-Text (~500 Tokens)
  synthesizedFrom: string[];           // ["briefing", "swot", ...]
  markenDNAVersion: string;            // Hash der Quelldokumente
  manuallyEdited: boolean;             // false bei KI-Generierung
  synthesizedAt: Timestamp;            // Wann wurde synthetisiert
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                   // User-ID
  updatedBy: string;                   // User-ID
}
```

### DNASyntheseCreateData

```typescript
interface DNASyntheseCreateData {
  companyId: string;
  content: string;
  plainText: string;
  synthesizedFrom: string[];           // IDs der Quelldokumente
  markenDNAVersion: string;            // Hash der Quelldokumente
}
```

### DNASyntheseUpdateData

```typescript
interface DNASyntheseUpdateData {
  content?: string;
  plainText?: string;
  manuallyEdited?: boolean;
  synthesizedFrom?: string[];
  markenDNAVersion?: string;
}
```

---

## Error Handling

Alle Methoden loggen Fehler auf `console.error` und:

- **Read-Methoden** (`getSynthese`, `isOutdated`): Geben fallback-Werte zurück (`null`, `false`)
- **Write-Methoden** (`createSynthese`, `updateSynthese`, `synthesize`): Werfen den Error weiter (`throw error`)

### Beispiel Error Handling

```typescript
try {
  const synthese = await dnaSyntheseService.synthesize(companyId, context);
  toast.success('DNA Synthese erfolgreich generiert!');
} catch (error) {
  console.error('Fehler beim Generieren der Synthese:', error);
  toast.error('DNA Synthese konnte nicht generiert werden.');
}
```

---

## Workflow-Beispiele

### 1. Vollständiger Synthese-Flow

```typescript
// 1. Prüfen ob alle Dokumente vorhanden
const isComplete = await markenDNAService.isComplete(companyId);

if (!isComplete) {
  toast.error('Bitte vervollständigen Sie alle 6 Marken-DNA Dokumente.');
  return;
}

// 2. Prüfen ob Synthese bereits vorhanden
const existingSynthese = await dnaSyntheseService.getSynthese(companyId);

if (existingSynthese) {
  // 3. Prüfen ob veraltet
  const isOutdated = await dnaSyntheseService.isOutdated(companyId);

  if (isOutdated) {
    toast.info('Marken-DNA wurde geändert - Synthese wird aktualisiert...');
  } else {
    console.log('Synthese ist aktuell:', existingSynthese.plainText);
    return;
  }
}

// 4. Neue Synthese generieren
const synthese = await dnaSyntheseService.synthesize(companyId, context);
toast.success('DNA Synthese erfolgreich generiert!');
```

### 2. Manuelle Bearbeitung

```typescript
// User bearbeitet Synthese in Editor
const handleSave = async (editedText: string) => {
  await dnaSyntheseService.updateSynthese(
    companyId,
    {
      plainText: editedText,
      manuallyEdited: true  // Wichtig: Flag setzen
    },
    context
  );

  toast.success('Änderungen gespeichert.');
};

// Bei nächster Aktualitätsprüfung:
const isOutdated = await dnaSyntheseService.isOutdated(companyId);

if (isOutdated) {
  const synthese = await dnaSyntheseService.getSynthese(companyId);

  if (synthese?.manuallyEdited) {
    // User warnen dass manuelle Änderungen überschrieben werden
    const shouldUpdate = confirm(
      'Sie haben die Synthese manuell bearbeitet. ' +
      'Möchten Sie wirklich eine neue Version generieren? ' +
      'Ihre Änderungen gehen verloren.'
    );

    if (!shouldUpdate) return;
  }

  await dnaSyntheseService.synthesize(companyId, context);
}
```

### 3. KI-Assistenten Integration

```typescript
// DNA Synthese als Kontext für KI-Assistenten übergeben
const generatePressRelease = async () => {
  const synthese = await dnaSyntheseService.getSynthese(companyId);

  if (!synthese) {
    toast.error('Bitte generieren Sie zuerst die DNA Synthese.');
    return;
  }

  // Prüfen ob aktuell
  const isOutdated = await dnaSyntheseService.isOutdated(companyId);
  if (isOutdated) {
    toast.warning('DNA Synthese ist veraltet - bitte aktualisieren.');
  }

  // An KI-Flow übergeben (~500 Tokens statt ~5000 Tokens)
  const pressRelease = await pressReleaseFlow({
    topic: 'Produkteinführung',
    dnaSynthese: synthese.plainText,  // Optimierter Kontext
    ...
  });
};
```

---

## Abhängigkeiten

Der `dnaSyntheseService` nutzt den `markenDNAService` für:

1. **Export**: `markenDNAService.exportForAI()` - Alle Dokumente als Plain-Text
2. **Hash-Berechnung**: `markenDNAService.computeMarkenDNAHash()` - Versions-Tracking
3. **Status-Check**: `markenDNAService.isComplete()` - Vollständigkeitsprüfung

```typescript
import { markenDNAService } from './marken-dna-service';
```

---

## Best Practices

### 1. Aktualität prüfen vor Verwendung

```typescript
const synthese = await dnaSyntheseService.getSynthese(companyId);

if (synthese) {
  const isOutdated = await dnaSyntheseService.isOutdated(companyId);

  if (isOutdated) {
    // Synthese aktualisieren
    await dnaSyntheseService.synthesize(companyId, context);
  }
}
```

### 2. Manuelle Bearbeitungen schützen

```typescript
if (synthese?.manuallyEdited) {
  // User warnen bevor überschrieben wird
  const confirmed = await confirmDialog({
    title: 'Manuelle Änderungen vorhanden',
    message: 'Ihre Änderungen gehen verloren. Fortfahren?'
  });

  if (!confirmed) return;
}
```

### 3. Token-Optimierung für KI

```typescript
// NICHT: Alle 6 Dokumente einzeln (~5000 Tokens)
const briefing = await markenDNAService.getDocument(companyId, 'briefing');
const swot = await markenDNAService.getDocument(companyId, 'swot');
// ... 4 weitere Aufrufe

// BESSER: DNA Synthese (~500 Tokens)
const synthese = await dnaSyntheseService.getSynthese(companyId);
const context = synthese?.plainText || '';
```

---

## Siehe auch

- [marken-dna-service.md](./marken-dna-service.md) - Marken-DNA Service
- [hooks.md](./hooks.md) - React Query Hooks für DNA Synthese
- [genkit-flows.md](./genkit-flows.md) - DNA Synthese Flow (KI-Generierung)
