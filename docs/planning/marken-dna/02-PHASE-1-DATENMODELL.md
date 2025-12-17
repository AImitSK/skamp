# Phase 1: Datenmodell & Services

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
export interface MarkenDNADocument {
  id: string;
  customerId: string;
  customerName: string;
  organizationId: string;

  // Typ
  type: MarkenDNADocumentType;
  title: string;              // z.B. "Briefing-Check"

  // Inhalt
  content: string;            // HTML für Editor
  plainText: string;          // Plain-Text für KI
  structuredData?: Record<string, unknown>;

  // Status
  status: 'draft' | 'completed';
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
  customerId: string;
  customerName: string;
  type: MarkenDNADocumentType;
  content: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Update-Daten
export interface MarkenDNAUpdateData {
  content?: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Kunden-Status (für Übersichtstabelle)
export interface CustomerMarkenDNAStatus {
  customerId: string;
  customerName: string;
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
// Service-Methoden:

// CRUD
getDocument(customerId: string, type: MarkenDNADocumentType): Promise<MarkenDNADocument | null>
getDocuments(customerId: string): Promise<MarkenDNADocument[]>
createDocument(data: MarkenDNACreateData, context: ServiceContext): Promise<string>
updateDocument(id: string, data: MarkenDNAUpdateData, context: ServiceContext): Promise<void>
deleteDocument(id: string): Promise<void>
deleteAllForCustomer(customerId: string): Promise<void>

// Status
getCustomerStatus(customerId: string): Promise<CustomerMarkenDNAStatus>
getAllCustomersStatus(organizationId: string): Promise<CustomerMarkenDNAStatus[]>
isComplete(customerId: string): Promise<boolean>

// Export für KI
exportForAI(customerId: string): Promise<string>  // Alle Dokumente als Plain-Text
```

---

### 1.3 React Query Hooks erstellen

**Datei:** `src/lib/hooks/useMarkenDNA.ts`

```typescript
// Query Hooks
useMarkenDNADocument(customerId: string, type: MarkenDNADocumentType)
useMarkenDNADocuments(customerId: string)
useMarkenDNAStatus(customerId: string)
useAllCustomersMarkenDNAStatus(organizationId: string)

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
export interface DNASynthese {
  id: string;
  projectId: string;
  customerId: string;
  organizationId: string;

  // Inhalt (KI-optimierte Kurzform, ~500 Tokens)
  content: string;           // HTML für Anzeige
  plainText: string;         // Plain-Text für KI-Übergabe

  // Tracking
  synthesizedAt: Timestamp;
  synthesizedFrom: string[]; // IDs der 6 Marken-DNA Dokumente
  markenDNAVersion: string;  // Hash um Änderungen zu erkennen
  manuallyEdited: boolean;   // Wurde manuell angepasst?

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

// Create-Daten
export interface DNASyntheseCreateData {
  projectId: string;
  customerId: string;
  content: string;
  plainText: string;
  synthesizedFrom: string[];
  markenDNAVersion: string;
}
```

### 1.5 💬 Kernbotschaft Interface

**Datei:** `src/types/kernbotschaft.ts` (neu)

```typescript
export interface Kernbotschaft {
  id: string;
  projectId: string;
  customerId: string;
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

match /customers/{customerId}/markenDNA/{docId} {
  allow read: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow create: if isAuthenticated() &&
    belongsToOrganization(request.resource.data.organizationId);
  allow update: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
  allow delete: if isAuthenticated() &&
    belongsToOrganization(resource.data.organizationId);
}

// 🧪 DNA Synthese (pro Projekt)
match /projects/{projectId}/dnaSynthese/{syntheseId} {
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
  it('sollte ein Dokument erstellen');
  it('sollte alle Dokumente eines Kunden laden');
  it('sollte den Kundenstatus korrekt berechnen');
  it('sollte isComplete true zurückgeben wenn alle 6 Dokumente vorhanden');
  it('sollte alle Dokumente eines Kunden löschen können');
  it('sollte exportForAI alle Dokumente als Text zurückgeben');
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
- [ ] MarkenDNA Service mit allen CRUD-Methoden
- [ ] 🧪 DNASynthese Service mit CRUD + synthesize-Methode
- [ ] 💬 Kernbotschaft Service mit CRUD-Methoden
- [ ] 📋 TextMatrix Service mit CRUD-Methoden
- [ ] React Query Hooks funktionsfähig
- [ ] Firestore Regeln angepasst
- [ ] Tests geschrieben und bestanden
