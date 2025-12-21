# markenDNAService

Firebase Service für Marken-DNA Dokumente mit vollständigem CRUD und Status-Management.

**Pfad:** `src/lib/firebase/marken-dna-service.ts`

---

## Import

```typescript
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
```

---

## Methoden-Übersicht

| Methode | Beschreibung |
|---------|--------------|
| [getDocument](#getdocument) | Lädt ein einzelnes Dokument |
| [getDocuments](#getdocuments) | Lädt alle Dokumente eines Kunden |
| [createDocument](#createdocument) | Erstellt ein neues Dokument |
| [updateDocument](#updatedocument) | Aktualisiert ein Dokument |
| [deleteDocument](#deletedocument) | Löscht ein Dokument |
| [deleteAllDocuments](#deletealldocuments) | Löscht alle Dokumente eines Kunden |
| [getCompanyStatus](#getcompanystatus) | Ermittelt Dokumentstatus eines Kunden |
| [getAllCustomersStatus](#getallcustomersstatus) | Ermittelt Status aller Kunden einer Organisation |
| [isComplete](#iscomplete) | Prüft ob alle 6 Dokumente vorhanden sind |
| [exportForAI](#exportforai) | Exportiert alle Dokumente als Plain-Text für KI |
| [computeMarkenDNAHash](#computemarkendnahash) | Berechnet Hash über alle Dokumente |

---

## Firestore-Struktur

```
companies/{companyId}/markenDNA/
├── briefing/
├── swot/
├── audience/
├── positioning/
├── goals/
└── messages/
```

---

## getDocument

Lädt ein einzelnes Marken-DNA Dokument.

### Signatur

```typescript
async getDocument(
  companyId: string,
  type: MarkenDNADocumentType
): Promise<MarkenDNADocument | null>
```

### Parameter

- **companyId** (`string`) - ID der Company (Kunde)
- **type** (`MarkenDNADocumentType`) - Dokumenttyp (`'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages'`)

### Rückgabewert

- `MarkenDNADocument | null` - Das Dokument oder `null` wenn nicht vorhanden

### Beispiel

```typescript
const briefing = await markenDNAService.getDocument('company-123', 'briefing');

if (briefing) {
  console.log(briefing.title);        // "Briefing-Check"
  console.log(briefing.content);      // HTML-Content
  console.log(briefing.completeness); // 85
  console.log(briefing.status);       // "completed"
}
```

---

## getDocuments

Lädt alle Marken-DNA Dokumente eines Kunden.

### Signatur

```typescript
async getDocuments(companyId: string): Promise<MarkenDNADocument[]>
```

### Parameter

- **companyId** (`string`) - ID der Company (Kunde)

### Rückgabewert

- `MarkenDNADocument[]` - Array aller vorhandenen Dokumente (0-6)

### Beispiel

```typescript
const documents = await markenDNAService.getDocuments('company-123');

console.log(documents.length); // 3 (z.B. briefing, swot, audience)

documents.forEach(doc => {
  console.log(`${doc.title}: ${doc.completeness}%`);
});
```

---

## createDocument

Erstellt ein neues Marken-DNA Dokument.

### Signatur

```typescript
async createDocument(
  data: MarkenDNACreateData,
  context: { organizationId: string; userId: string }
): Promise<string>
```

### Parameter

- **data** (`MarkenDNACreateData`) - Dokument-Daten
  - `companyId: string` - ID der Company
  - `companyName: string` - Name der Company
  - `type: MarkenDNADocumentType` - Dokumenttyp
  - `content: string` - HTML-Content
  - `plainText?: string` - Plain-Text (optional, wird automatisch generiert)
  - `structuredData?: any` - Strukturierte Daten (optional)
  - `status?: 'draft' | 'in_progress' | 'completed'` - Status (default: 'draft')
  - `completeness?: number` - Fortschritt in % (default: 0)
  - `chatHistory?: ChatMessage[]` - Chat-Verlauf (optional)

- **context** (`object`) - Kontext
  - `organizationId: string` - ID der Organisation
  - `userId: string` - ID des aktuellen Users

### Rückgabewert

- `string` - Die ID des erstellten Dokuments (entspricht dem Typ)

### Beispiel

```typescript
const documentId = await markenDNAService.createDocument(
  {
    companyId: 'company-123',
    companyName: 'IBD Wickeltechnik GmbH',
    type: 'briefing',
    content: '<h1>Briefing-Check</h1><p>Branche: Maschinenbau</p>',
    status: 'in_progress',
    completeness: 50,
    chatHistory: [
      { role: 'user', content: 'Wir sind Maschinenbauer aus Stuttgart' },
      { role: 'assistant', content: 'Perfekt! Lass uns das vertiefen...' }
    ]
  },
  {
    organizationId: 'org-456',
    userId: 'user-789'
  }
);

console.log(documentId); // "briefing"
```

---

## updateDocument

Aktualisiert ein bestehendes Marken-DNA Dokument.

### Signatur

```typescript
async updateDocument(
  companyId: string,
  type: MarkenDNADocumentType,
  data: MarkenDNAUpdateData,
  context: { organizationId: string; userId: string }
): Promise<void>
```

### Parameter

- **companyId** (`string`) - ID der Company
- **type** (`MarkenDNADocumentType`) - Dokumenttyp
- **data** (`MarkenDNAUpdateData`) - Zu aktualisierende Felder (partial)
  - `content?: string` - HTML-Content
  - `plainText?: string` - Plain-Text (wird automatisch aus content generiert falls nicht gesetzt)
  - `structuredData?: any` - Strukturierte Daten
  - `status?: 'draft' | 'in_progress' | 'completed'` - Status
  - `completeness?: number` - Fortschritt in %
  - `chatHistory?: ChatMessage[]` - Chat-Verlauf

- **context** (`object`) - Kontext
  - `organizationId: string` - ID der Organisation
  - `userId: string` - ID des aktuellen Users

### Rückgabewert

- `void`

### Beispiel

```typescript
await markenDNAService.updateDocument(
  'company-123',
  'briefing',
  {
    content: '<h1>Briefing-Check</h1><p>Erweitert um neue Infos...</p>',
    completeness: 100,
    status: 'completed'
  },
  {
    organizationId: 'org-456',
    userId: 'user-789'
  }
);
```

**Hinweis:** Das Feld `plainText` wird automatisch aus `content` generiert (HTML-Tags entfernt), falls nicht explizit übergeben.

---

## deleteDocument

Löscht ein einzelnes Marken-DNA Dokument.

### Signatur

```typescript
async deleteDocument(
  companyId: string,
  type: MarkenDNADocumentType
): Promise<void>
```

### Parameter

- **companyId** (`string`) - ID der Company
- **type** (`MarkenDNADocumentType`) - Dokumenttyp

### Rückgabewert

- `void`

### Beispiel

```typescript
await markenDNAService.deleteDocument('company-123', 'briefing');
```

---

## deleteAllDocuments

Löscht alle Marken-DNA Dokumente eines Kunden (alle 6 Typen).

### Signatur

```typescript
async deleteAllDocuments(companyId: string): Promise<void>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `void`

### Beispiel

```typescript
// Löscht briefing, swot, audience, positioning, goals, messages
await markenDNAService.deleteAllDocuments('company-123');
```

**Hinweis:** Nutzt Firestore Batch-Write für atomare Löschung aller Dokumente.

---

## getCompanyStatus

Ermittelt den Status aller Dokumente eines Kunden.

### Signatur

```typescript
async getCompanyStatus(companyId: string): Promise<CompanyMarkenDNAStatus>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

```typescript
interface CompanyMarkenDNAStatus {
  companyId: string;
  companyName: string;
  documents: {
    briefing: 'missing' | 'draft' | 'in_progress' | 'completed';
    swot: 'missing' | 'draft' | 'in_progress' | 'completed';
    audience: 'missing' | 'draft' | 'in_progress' | 'completed';
    positioning: 'missing' | 'draft' | 'in_progress' | 'completed';
    goals: 'missing' | 'draft' | 'in_progress' | 'completed';
    messages: 'missing' | 'draft' | 'in_progress' | 'completed';
  };
  completeness: number;        // 0-100 (durchschnittlich)
  isComplete: boolean;          // true wenn alle 6 completed
  lastUpdated?: Timestamp;
}
```

### Beispiel

```typescript
const status = await markenDNAService.getCompanyStatus('company-123');

console.log(status.companyName);       // "IBD Wickeltechnik GmbH"
console.log(status.documents.briefing); // "completed"
console.log(status.documents.swot);     // "in_progress"
console.log(status.documents.audience); // "missing"
console.log(status.completeness);       // 42 (Durchschnitt der vorhandenen Docs)
console.log(status.isComplete);         // false
```

---

## getAllCustomersStatus

Ermittelt den Status aller Kunden einer Organisation.

### Signatur

```typescript
async getAllCustomersStatus(
  organizationId: string
): Promise<CompanyMarkenDNAStatus[]>
```

### Parameter

- **organizationId** (`string`) - ID der Organisation

### Rückgabewert

- `CompanyMarkenDNAStatus[]` - Array mit Status-Informationen aller Kunden

### Beispiel

```typescript
const allStatuses = await markenDNAService.getAllCustomersStatus('org-456');

console.log(allStatuses.length); // 12 Kunden

allStatuses.forEach(status => {
  console.log(`${status.companyName}: ${status.completeness}%`);
});

// Filtern: Nur Kunden mit allen Dokumenten
const completeCustomers = allStatuses.filter(s => s.isComplete);
```

**Hinweis:** Filtert automatisch auf Companies mit `type: 'customer'` und sortiert alphabetisch nach Name.

---

## isComplete

Prüft ob alle 6 Dokumente vorhanden und abgeschlossen sind.

### Signatur

```typescript
async isComplete(companyId: string): Promise<boolean>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `boolean` - `true` wenn alle 6 Dokumente status `'completed'` haben

### Beispiel

```typescript
const isComplete = await markenDNAService.isComplete('company-123');

if (isComplete) {
  console.log('Alle Marken-DNA Dokumente abgeschlossen!');
  // DNA Synthese generieren
}
```

---

## exportForAI

Exportiert alle Dokumente als Plain-Text für KI-Verarbeitung.

### Signatur

```typescript
async exportForAI(companyId: string): Promise<string>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `string` - Zusammengefügter Plain-Text aller Dokumente

### Format

```
# Briefing-Check

[plainText vom Briefing]

---

# SWOT-Analyse

[plainText von SWOT]

---

# Zielgruppen-Radar

[plainText von Audience]

...
```

### Beispiel

```typescript
const plainText = await markenDNAService.exportForAI('company-123');

console.log(plainText.length); // ~5000 Zeichen
// Nutzen für DNA Synthese oder KI-Prompts
```

**Hinweis:** Dokumente werden nach ihrer Order-Eigenschaft sortiert (briefing → messages).

---

## computeMarkenDNAHash

Berechnet einen Hash über alle Marken-DNA Dokumente für Versionierung.

### Signatur

```typescript
async computeMarkenDNAHash(companyId: string): Promise<string>
```

### Parameter

- **companyId** (`string`) - ID der Company

### Rückgabewert

- `string` - SHA256-Hash (erste 16 Zeichen) oder leerer String falls keine Dokumente

### Hash-Berechnung

1. Alle Dokumente laden
2. Nach Typ alphabetisch sortieren
3. Für jedes Dokument: `${type}:${updatedAt.toMillis()}`
4. Mit `|` verbinden
5. SHA256 Hash berechnen
6. Erste 16 Zeichen zurückgeben

### Beispiel

```typescript
const hash1 = await markenDNAService.computeMarkenDNAHash('company-123');
console.log(hash1); // "a3f5c8d9e2b1f4a7"

// Dokument aktualisieren
await markenDNAService.updateDocument(/* ... */);

const hash2 = await markenDNAService.computeMarkenDNAHash('company-123');
console.log(hash2); // "b8e3f1a9c5d2e7b4" (geändert!)
```

**Verwendung:** Erkennung von Änderungen für DNA Synthese (siehe `dnaSyntheseService.isOutdated()`).

---

## TypeScript Interfaces

### MarkenDNADocument

```typescript
interface MarkenDNADocument {
  id: string;                          // = type
  companyId: string;
  companyName: string;
  organizationId: string;
  type: MarkenDNADocumentType;
  title: string;                       // "Briefing-Check", "SWOT-Analyse", etc.
  content: string;                     // HTML-Content
  plainText: string;                   // Plain-Text Variante
  structuredData?: any;                // Optional: Strukturierte Daten
  status: 'draft' | 'in_progress' | 'completed';
  completeness: number;                // 0-100
  chatHistory: ChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                   // User-ID
  updatedBy: string;                   // User-ID
}
```

### MarkenDNADocumentType

```typescript
type MarkenDNADocumentType =
  | 'briefing'      // Briefing-Check
  | 'swot'          // SWOT-Analyse
  | 'audience'      // Zielgruppen-Radar
  | 'positioning'   // Positionierungs-Diamant
  | 'goals'         // Ziele-Setzer
  | 'messages';     // Botschaften-Baukasten
```

### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Timestamp;
}
```

---

## Error Handling

Alle Methoden loggen Fehler auf `console.error` und:

- **Read-Methoden** (`getDocument`, `getDocuments`, `getCompanyStatus`): Geben fallback-Werte zurück (`null`, `[]`, etc.)
- **Write-Methoden** (`createDocument`, `updateDocument`, `deleteDocument`): Werfen den Error weiter (`throw error`)

### Beispiel Error Handling

```typescript
try {
  await markenDNAService.createDocument(data, context);
} catch (error) {
  console.error('Fehler beim Speichern:', error);
  // Toast-Benachrichtigung anzeigen
}
```

---

## Multi-Tenancy

Alle Dokumente sind über `organizationId` isoliert:

```typescript
// Beim Erstellen wird organizationId gesetzt
await markenDNAService.createDocument(data, {
  organizationId: 'org-456',
  userId: 'user-789'
});

// Beim Laden ist keine weitere Filterung nötig (companyId ist eindeutig)
const documents = await markenDNAService.getDocuments('company-123');
```

**Firestore Security Rules** stellen sicher, dass nur Mitglieder der Organization Zugriff haben.

---

## Best Practices

### 1. Status-Tracking

```typescript
// Status vor Aktion prüfen
const status = await markenDNAService.getCompanyStatus(companyId);

if (status.isComplete) {
  // DNA Synthese generieren
  await dnaSyntheseService.synthesize(companyId, context);
}
```

### 2. Batch-Operationen

```typescript
// Alle Dokumente löschen (nutzt Batch intern)
await markenDNAService.deleteAllDocuments(companyId);
```

### 3. Hash-basiertes Caching

```typescript
const currentHash = await markenDNAService.computeMarkenDNAHash(companyId);
const cachedHash = localStorage.getItem(`markenDNA:${companyId}`);

if (currentHash !== cachedHash) {
  // Dokumente neu laden
  const documents = await markenDNAService.getDocuments(companyId);
  localStorage.setItem(`markenDNA:${companyId}`, currentHash);
}
```

---

## Siehe auch

- [dna-synthese-service.md](./dna-synthese-service.md) - DNA Synthese Service
- [hooks.md](./hooks.md) - React Query Hooks für Marken-DNA
- [genkit-flows.md](./genkit-flows.md) - KI-Flows für Dokumenterstellung
