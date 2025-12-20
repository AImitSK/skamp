# Phase 1: Datenmodell & Services

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel
Grundlegende Datenstrukturen und Firebase-Services für die Marken-DNA erstellen.

---

## Aufgaben

### 1.1 TypeScript Interfaces erstellen

**Datei:** `src/types/marken-dna.ts`

```typescript
import { Timestamp } from 'firebase/firestore';

// Dokument-Typen
export type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';

// Haupt-Interface
// Firestore: companies/{companyId}/markenDNA/{documentType}
// Hinweis: Kunden sind Companies mit type: 'customer'
export interface MarkenDNADocument {
  id: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  organizationId: string;

  // Typ
  type: MarkenDNADocumentType;
  title: string;              // z.B. "Briefing-Check"

  // Inhalt
  content: string;            // HTML für Editor
  plainText: string;          // Plain-Text für KI
  structuredData?: Record<string, unknown>;

  // Status
  // missing: Dokument noch nicht erstellt
  // draft: Dokument in Bearbeitung (Chat läuft noch)
  // completed: Dokument fertig und vom User bestätigt
  status: 'missing' | 'draft' | 'completed';
  completeness: number;       // 0-100

  // Chat-Verlauf (für Weiterbearbeitung)
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

// Chat-Nachricht
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

// Create-Daten
export interface MarkenDNACreateData {
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  type: MarkenDNADocumentType;
  content: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'missing' | 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Update-Daten
export interface MarkenDNAUpdateData {
  content?: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'missing' | 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Kunden-Status (für Übersichtstabelle)
// Hinweis: Kunden sind Companies mit type: 'customer'
export interface CompanyMarkenDNAStatus {
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  documents: {
    briefing: boolean;
    swot: boolean;
    audience: boolean;
    positioning: boolean;
    goals: boolean;
    messages: boolean;
  };
  completeness: number;       // Gesamtfortschritt 0-100
  isComplete: boolean;        // Alle 6 Dokumente vorhanden
  lastUpdated?: Timestamp;
}

// Dokument-Metadaten
export const MARKEN_DNA_DOCUMENTS: Record<MarkenDNADocumentType, {
  title: string;
  description: string;
  order: number;
}> = {
  briefing: {
    title: 'Briefing-Check',
    description: 'Die Faktenbasis - Wer sind wir?',
    order: 1,
  },
  swot: {
    title: 'SWOT-Analyse',
    description: 'Die Bewertung - Stärken, Schwächen, Chancen, Risiken',
    order: 2,
  },
  audience: {
    title: 'Zielgruppen-Radar',
    description: 'Die Adressaten - Empfänger, Mittler, Absender',
    order: 3,
  },
  positioning: {
    title: 'Positionierungs-Designer',
    description: 'Das Herzstück - USP und Soll-Image',
    order: 4,
  },
  goals: {
    title: 'Ziele-Setzer',
    description: 'Die Messlatte - Kopf, Herz, Hand',
    order: 5,
  },
  messages: {
    title: 'Botschaften-Baukasten',
    description: 'Die Argumentation - Kern, Beweis, Nutzen',
    order: 6,
  },
};
```

---

### 1.2 Firebase Service erstellen

**Datei:** `src/lib/firebase/marken-dna-service.ts`

```typescript
// Firestore-Pfad: companies/{companyId}/markenDNA/{documentType}
// Hinweis: Kunden sind Companies mit type: 'customer'

// Service-Methoden:

// CRUD
getDocument(companyId: string, type: MarkenDNADocumentType): Promise<MarkenDNADocument | null>
getDocuments(companyId: string): Promise<MarkenDNADocument[]>
createDocument(data: MarkenDNACreateData, context: ServiceContext): Promise<string>
updateDocument(companyId: string, type: MarkenDNADocumentType, data: MarkenDNAUpdateData, context: ServiceContext): Promise<void>
deleteDocument(companyId: string, type: MarkenDNADocumentType): Promise<void>
deleteAllForCompany(companyId: string): Promise<void>

// Status
getCompanyStatus(companyId: string): Promise<CompanyMarkenDNAStatus>
getAllCustomersStatus(organizationId: string): Promise<CompanyMarkenDNAStatus[]>  // Filtert auf type: 'customer'
isComplete(companyId: string): Promise<boolean>

// Export für KI
exportForAI(companyId: string): Promise<string>  // Alle Dokumente als Plain-Text

// Hash-Berechnung für Aktualitäts-Check
computeMarkenDNAHash(companyId: string): Promise<string>
```

---

### 1.3 React Query Hooks erstellen

**Datei:** `src/lib/hooks/useMarkenDNA.ts`

```typescript
// Query Hooks
useMarkenDNADocument(companyId: string, type: MarkenDNADocumentType)
useMarkenDNADocuments(companyId: string)
useMarkenDNAStatus(companyId: string)
useAllCustomersMarkenDNAStatus(organizationId: string)  // Filtert auf type: 'customer'
useMarkenDNAHash(companyId: string)  // Für Aktualitäts-Check

// Mutation Hooks
useCreateMarkenDNADocument()
useUpdateMarkenDNADocument()
useDeleteMarkenDNADocument()
useDeleteAllMarkenDNA()
```

---

### 1.4 🧪 DNA Synthese Interface

**Datei:** `src/types/dna-synthese.ts` (neu)

```typescript
import { Timestamp } from 'firebase/firestore';

// 🧪 DNA Synthese - KI-optimierte Kurzform der 6 Marken-DNA Dokumente
// Firestore: companies/{companyId}/markenDNA/synthesis
export interface DNASynthese {
  id: string;
  companyId: string;         // Referenz auf Company (type: 'customer')
  organizationId: string;

  // Inhalt (KI-optimierte Kurzform, ~500 Tokens)
  content: string;           // HTML für Anzeige
  plainText: string;         // Plain-Text für KI-Übergabe

  // Tonalität (extrahiert/gewählt)
  tone: 'formal' | 'casual' | 'modern' | 'technical' | 'startup';

  // Status
  // missing: Dokument noch nicht erstellt
  // draft: Dokument in Bearbeitung (Chat läuft noch)
  // completed: Dokument fertig und vom User bestätigt
  status: 'missing' | 'draft' | 'completed';

  // Tracking & Aktualitäts-Check
  synthesizedAt: Timestamp;
  synthesizedFrom: string[]; // Typen der 6 Marken-DNA Dokumente
  markenDNAVersion: string;  // Hash um Änderungen zu erkennen (siehe unten)
  manuallyEdited: boolean;   // Wurde manuell angepasst?

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

// Create-Daten
export interface DNASyntheseCreateData {
  companyId: string;         // Referenz auf Company (type: 'customer')
  content: string;
  plainText: string;
  tone: 'formal' | 'casual' | 'modern' | 'technical' | 'startup';
  synthesizedFrom: string[];
  markenDNAVersion: string;  // Hash über alle 6 Marken-DNA Dokumente
}

/**
 * markenDNAVersion Hash-Tracking:
 *
 * Bei Synthese-Erstellung:
 *   → Hash über alle 6 Marken-DNA Dokumente berechnen
 *   → Hash speichern in markenDNAVersion
 *
 * Später im Projekt:
 *   → Aktuellen Hash der 6 Dokumente berechnen
 *   → Vergleich mit gespeichertem markenDNAVersion
 *   → Bei Mismatch: "⚠️ Marken-DNA wurde geändert. Neu synthetisieren?"
 *
 * Hash-Berechnung:
 *   const combined = documents
 *     .sort((a, b) => a.type.localeCompare(b.type))
 *     .map(d => `${d.type}:${d.updatedAt.toMillis()}`)
 *     .join('|');
 *   return sha256(combined).substring(0, 16);
 */
```

### 1.5 💬 Kernbotschaft Interface

**Datei:** `src/types/kernbotschaft.ts` (neu)

```typescript
import { Timestamp } from 'firebase/firestore';
import { ChatMessage } from './marken-dna';

// Firestore: projects/{projectId}/kernbotschaft/{id}
export interface Kernbotschaft {
  id: string;
  projectId: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  organizationId: string;

  // Inhalt
  occasion: string;           // Anlass
  goal: string;               // Ziel
  keyMessage: string;         // Teilbotschaft
  content: string;            // Generiertes Dokument
  plainText: string;          // Für KI

  // Status
  status: 'draft' | 'completed';

  // Chat
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

---

## Firestore Regeln

```javascript
// firestore.rules ergänzen

// Marken-DNA als Subcollection unter companies
// Hinweis: Kunden sind Companies mit type: 'customer'
match /companies/{companyId}/markenDNA/{docType} {
  allow read: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow create: if isAuthenticated() &&
    belongsToOrganization(request.resource.data.organizationId);
  allow update: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow delete: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// 🧪 DNA Synthese (pro Company, gespeichert als Document in markenDNA Collection)
match /companies/{companyId}/markenDNA/synthesis {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// 💬 Kernbotschaft
match /projects/{projectId}/kernbotschaft/{kernbotschaftId} {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// 📋 Text-Matrix
match /projects/{projectId}/textMatrix/{matrixId} {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}
```

---

## Testfälle

```typescript
// __tests__/marken-dna-service.test.ts

describe('MarkenDNAService', () => {
  it('sollte ein Dokument erstellen unter companies/{companyId}/markenDNA/');
  it('sollte alle Dokumente einer Company laden');
  it('sollte den Company-Status korrekt berechnen');
  it('sollte isComplete true zurückgeben wenn alle 6 Dokumente vorhanden');
  it('sollte alle Dokumente einer Company löschen können');
  it('sollte exportForAI alle Dokumente als Text zurückgeben');
  it('sollte computeMarkenDNAHash einen konsistenten Hash berechnen');
  it('sollte getAllCustomersStatus nur Companies mit type: customer zurückgeben');
});
```

---

## Abhängigkeiten

- Keine externen Abhängigkeiten
- Nutzt bestehende Firebase-Infrastruktur
- Nutzt bestehende React Query Patterns

---

## Erledigungs-Kriterien

- [ ] TypeScript Interfaces erstellt und exportiert
- [ ] MarkenDNA Service mit allen CRUD-Methoden (Pfad: `companies/{companyId}/markenDNA/`)
- [ ] `computeMarkenDNAHash()` Methode für Aktualitäts-Check implementiert
- [ ] 🧪 DNASynthese Service mit CRUD + synthesize-Methode
- [ ] 💬 Kernbotschaft Service mit CRUD-Methoden
- [ ] 📋 TextMatrix Service mit CRUD-Methoden
- [ ] React Query Hooks funktionsfähig
- [ ] Firestore Regeln angepasst (companies statt customers)
- [ ] Tests geschrieben und bestanden

---

## Nächste Schritte

- **Weiter:** `03-PHASE-2-BIBLIOTHEK.md` (Marken-DNA UI)
- **Dokumentation:** Nach Abschluss aller Phasen → `09-DOKUMENTATION.md`
