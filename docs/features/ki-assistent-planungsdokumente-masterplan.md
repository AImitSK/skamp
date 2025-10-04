# KI-Assistent Planungsdokumente - Masterplan

**Feature:** Planungsdokumente als KI-Assistent Kontext für Pressemeldungen
**Version:** 1.0
**Erstellt:** 2025-10-04
**Status:** KONZEPT

---

## Executive Summary

Dieses Feature erweitert den KI-Assistenten im News-Bereich (Pressemeldungen-Tab) um die Möglichkeit, Planungsdokumente aus dem Strategie-Tab als Kontext zu verwenden. Statt generischer Templates nutzt die KI projekt-spezifische Informationen aus Zielgruppenanalysen, Strategie-Dokumenten und anderen Planungsmaterialien.

### Kernziele

1. **Kontext-basierte KI-Generierung:** Planungsdokumente als intelligenter Kontext
2. **Nahtlose Integration:** Verbindung zwischen Strategie-Tab und Pressemeldungen-Tab
3. **User Experience:** Einfache Auswahl relevanter Dokumente
4. **Qualitätsverbesserung:** Pressemeldungen mit projekt-spezifischem Kontext

---

## 1. Bestands-Analyse

### 1.1 Projekt-Ordner-Struktur

**Firestore Collections:**
- `project_folders` - Hauptordner pro Projekt (Dokumente, Medien, Pressemeldungen)
- `media_folders` - Unterordner innerhalb der Hauptordner
- `media_assets` - Dateien/Assets inkl. celero-doc Dokumente
- `documentContent` - Tiptap HTML-Content der Dokumente

**Projekt-Ordner-System:**
```
Projekt-Ordner/
├── Medien/           (folderId: xxx)
├── Dokumente/        (folderId: yyy) ← HIER SIND DIE PLANUNGSDOKUMENTE
└── Pressemeldungen/  (folderId: zzz)
```

**Dokumente-Struktur (im Strategie-Tab):**
- Zielgruppenanalyse.celero-doc
- Kommunikationsstrategie.celero-doc
- Key Messages.celero-doc
- Personas.celero-doc
- etc.

### 1.2 Bestehende Komponenten

#### Strategie-Tab (`ProjectStrategyTab.tsx`)
- **Location:** `src/components/projects/strategy/ProjectStrategyTab.tsx`
- **Funktion:** Zeigt Templates für Strategie-Dokumente
- **Features:**
  - Template-Auswahl aus `STRATEGY_TEMPLATES`
  - Öffnet `DocumentEditorModal` zum Erstellen
  - Speichert direkt im Dokumente-Ordner

#### Document Editor (`DocumentEditorModal.tsx`)
- **Location:** `src/components/projects/DocumentEditorModal.tsx`
- **Technologie:** Tiptap Rich-Text-Editor
- **Features:**
  - HTML-Content-Editing
  - Auto-Save alle 2 Sekunden
  - Versionierung
  - Lock-Mechanismus für Kollaboration

#### Document Content Service
- **Location:** `src/lib/firebase/document-content-service.ts`
- **Funktionen:**
  ```typescript
  - createDocument(content, metadata) → { documentId, assetId }
  - loadDocument(documentId) → DocumentContent
  - updateDocument(documentId, content, userId, createVersion)
  - lockDocument(documentId, userId) → boolean
  - unlockDocument(documentId, userId)
  ```

#### Document Types
- **Location:** `src/types/document-content.ts`
- **Typen:**
  ```typescript
  interface DocumentContent {
    content: string;           // HTML from Tiptap
    plainText?: string;        // Für Suche
    organizationId: string;
    projectId: string;
    folderId: string;
    version: number;
    versionHistory?: DocumentVersion[];
    // ... mehr
  }

  interface InternalDocument {
    fileName: string;
    fileType: 'celero-doc' | 'celero-sheet';
    contentRef: string;        // Referenz zu documentContent/{id}
    // ... mehr
  }
  ```

### 1.3 KI-Assistent im News-Bereich

#### Strukturierter KI-Assistent (`StructuredGenerationModal.tsx`)
- **Location:** `src/components/pr/ai/StructuredGenerationModal.tsx`
- **Features:**
  - 4-Step Workflow: Context → Content → Generating → Review
  - Kontext-Setup: Branche, Tonalität, Zielgruppe
  - Template-Dropdown
  - Strukturierte Ausgabe mit Headline, Lead, Body, Quote, CTA

**Aktueller Context-Flow:**
```typescript
interface GenerationContext {
  industry?: string;
  tone?: 'formal' | 'modern' | 'technical' | 'startup';
  audience?: 'b2b' | 'consumer' | 'media';
  companyName?: string;
  brandVoice?: 'professional' | 'innovative' | 'trustworthy';
}
```

#### AI Service
- **Location:** `src/lib/ai/firebase-ai-service.ts`
- **Endpoints:**
  - `/api/ai/generate` - Basis-Generierung
  - `/api/ai/generate-structured` - Strukturierte Generierung
  - `/api/ai/templates` - Template-Liste

**API Request Format:**
```typescript
{
  prompt: string;
  context: GenerationContext;
}
```

### 1.4 Pressemeldungen-Tab

**Location:** `src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx`

**Aktueller Ablauf:**
1. User klickt "Meldung Erstellen"
2. Öffnet `CampaignCreateModal`
3. CampaignCreateModal zeigt Kampagnen-Editor
4. Im Editor kann KI-Assistent geöffnet werden

**Campaign Create Modal:**
- **Location:** `src/components/projects/pressemeldungen/CampaignCreateModal.tsx`
- Erstellt neue PR-Kampagne
- Integriert mit KI-Assistent

---

## 2. Datenfluss-Analyse

### 2.1 Dokumente-Speicherung

**Schritt 1: Dokument erstellen im Strategie-Tab**
```
User wählt Template → DocumentEditorModal öffnet sich
→ User bearbeitet Content (Tiptap HTML)
→ documentContentService.createDocument() aufgerufen
→ Firestore: documentContent/{docId} mit HTML-Content
→ Firestore: media_assets/{assetId} mit Metadaten
   {
     fileName: "Zielgruppenanalyse.celero-doc",
     contentRef: docId,
     folderId: dokumenteFolderId,
     projectId: xxx,
     organizationId: yyy
   }
```

**Schritt 2: Dokumente laden**
```
ProjectFoldersView (Daten-Tab) lädt:
→ mediaService.getMediaAssets(orgId, folderId)
→ Erhält media_assets mit contentRef
→ Bei Klick: documentContentService.loadDocument(contentRef)
→ Erhält HTML-Content für Editor
```

### 2.2 Aktueller KI-Assistent-Flow

```
User im Campaign Editor → Klickt "KI-Assistent"
→ StructuredGenerationModal öffnet sich
→ Step 1: Context Setup (Branche, Ton, Zielgruppe)
→ Step 2: Prompt eingeben + Template wählen
→ POST /api/ai/generate-structured
   Body: { prompt, context }
→ Gemini generiert strukturierte Pressemeldung
→ Step 3: Review & Übernehmen
→ Content wird in Campaign-Editor eingefügt
```

### 2.3 Geplanter Dokumente-Kontext-Flow

```
User im Campaign Editor → Klickt "KI-Assistent"
→ StructuredGenerationModal öffnet sich
→ NEUE OPTION: "Planungsdokumente verwenden"
→ DocumentPickerModal öffnet sich
   - Lädt alle .celero-doc aus Dokumente-Ordner
   - User wählt 1-3 relevante Dokumente
   - Dokumente werden geladen (HTML → Plain Text)
→ Zurück zu StructuredGenerationModal
→ Context wird AUTOMATISCH befüllt aus Dokumenten
→ Step 2: Prompt eingeben (mit Dokumenten-Kontext)
→ POST /api/ai/generate-structured
   Body: {
     prompt,
     context,
     documentContext: [
       { fileName, plainText, excerpt }
     ]
   }
→ Gemini nutzt Dokumente als Kontext
→ Bessere, projekt-spezifische Pressemeldung
```

---

## 3. Konzept-Entwicklung

### 3.1 Dokumente-Auswahl UI

**Komponente: DocumentPickerModal**

```typescript
interface DocumentPickerModalProps {
  projectId: string;
  organizationId: string;
  dokumenteFolderId: string;
  onSelect: (selectedDocs: DocumentContext[]) => void;
  onClose: () => void;
  maxSelection?: number; // Default: 3
}

interface DocumentContext {
  id: string;
  fileName: string;
  plainText: string;
  excerpt: string; // Erste 500 Zeichen für Preview
  wordCount: number;
  createdAt: Date;
}
```

**UI-Design:**
- Liste aller .celero-doc Dokumente aus Dokumente-Ordner
- Checkbox-Auswahl (max. 3 Dokumente)
- Preview-Panel: Zeigt Excerpt des ausgewählten Dokuments
- Word Count Indicator
- Search/Filter Funktionalität
- "Dokumente verwenden" Button

### 3.2 Kontext-Extraktion

**Service: DocumentContextExtractor**

```typescript
class DocumentContextExtractor {
  async extractContext(
    documentIds: string[],
    organizationId: string
  ): Promise<EnrichedGenerationContext> {
    const documents = await Promise.all(
      documentIds.map(id => this.loadAndParse(id))
    );

    return {
      // Basis-Context
      industry: this.detectIndustry(documents),
      tone: this.detectTone(documents),
      audience: this.detectAudience(documents),
      companyName: this.extractCompanyName(documents),

      // Erweiterte Felder
      keyMessages: this.extractKeyMessages(documents),
      targetGroups: this.extractTargetGroups(documents),
      usp: this.extractUSP(documents),

      // Dokumente-Kontext
      documentContext: documents.map(doc => ({
        fileName: doc.fileName,
        plainText: doc.plainText,
        excerpt: doc.plainText.substring(0, 500)
      }))
    };
  }

  private async loadAndParse(documentId: string) {
    const content = await documentContentService.loadDocument(documentId);
    const plainText = this.stripHTML(content.content);
    return { ...content, plainText };
  }

  private stripHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  private detectIndustry(docs: any[]): string {
    // KI-basierte oder Keyword-basierte Erkennung
    // z.B. "Software", "Fintech", "Healthcare" in Dokumenten suchen
  }

  private extractKeyMessages(docs: any[]): string[] {
    // Suche nach "Key Message", "Kernbotschaft", Listen
  }

  private extractTargetGroups(docs: any[]): string[] {
    // Suche nach "Zielgruppe", "Target", Persona-Namen
  }

  private extractUSP(docs: any[]): string {
    // Suche nach "Alleinstellungsmerkmal", "USP", "einzigartig"
  }
}
```

### 3.3 API-Erweiterung

**Erweiterte Request-Struktur:**

```typescript
interface EnhancedGenerationRequest {
  prompt: string;
  context: GenerationContext;

  // NEU: Dokumenten-Kontext
  documentContext?: {
    documents: Array<{
      fileName: string;
      plainText: string;
      excerpt: string;
    }>;
    autoExtractedContext?: {
      keyMessages?: string[];
      targetGroups?: string[];
      usp?: string;
    };
  };
}
```

**API Route Update (`/api/ai/generate-structured`):**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { prompt, context, documentContext } = body;

  // Erweiterten Prompt bauen
  let enhancedPrompt = prompt;

  if (documentContext?.documents) {
    enhancedPrompt = `
KONTEXT AUS PLANUNGSDOKUMENTEN:

${documentContext.documents.map(doc => `
--- ${doc.fileName} ---
${doc.plainText.substring(0, 1000)}
`).join('\n')}

AUFGABE:
${prompt}

Nutze die Informationen aus den Planungsdokumenten, um eine zielgruppengerechte
und strategisch passende Pressemitteilung zu erstellen.
    `.trim();
  }

  // An Gemini senden
  const result = await geminiService.generateStructured(enhancedPrompt, context);

  return NextResponse.json(result);
}
```

### 3.4 User Flow (Schritt-für-Schritt)

#### Variante A: Dokumente VOR Prompt

```
1. User klickt "Meldung Erstellen" im Pressemeldungen-Tab
2. CampaignCreateModal öffnet sich
3. User klickt "KI-Assistent" Button
4. StructuredGenerationModal öffnet sich

5. STEP 1: Kontext-Setup
   → Neue Option: "📄 Planungsdokumente verwenden"
   → Button öffnet DocumentPickerModal

6. DocumentPickerModal:
   → Zeigt alle Dokumente aus Strategie-Tab
   → User wählt z.B.:
     - Zielgruppenanalyse.celero-doc ✓
     - Key Messages.celero-doc ✓
     - Kommunikationsstrategie.celero-doc ✓
   → "Dokumente verwenden" Button

7. Zurück zu StructuredGenerationModal
   → Zeigt Badge: "3 Dokumente ausgewählt"
   → Context wird automatisch befüllt
   → User kann manuelle Anpassungen vornehmen

8. STEP 2: Content Input
   → Prompt eingeben
   → Template optional wählen

9. STEP 3: Generating
   → API-Call mit Dokumenten-Kontext
   → Gemini nutzt Planungsdokumente

10. STEP 4: Review
    → Strukturierte Pressemeldung anzeigen
    → "Text übernehmen"

11. Content wird in Campaign-Editor eingefügt
```

#### Variante B: Dokumente als zusätzlicher Context

```
1-5. Wie Variante A

6. STEP 1: Basis-Context Setup
   → Branche, Ton, Zielgruppe manuell wählen
   → DANN: "📄 Mit Planungsdokumenten verfeinern" Button

7. DocumentPickerModal öffnet sich
   → Dokumente auswählen
   → Context wird ANGEREICHERT (nicht ersetzt)

8-11. Wie Variante A
```

### 3.5 Intelligente Context-Extraktion

**Erweiterte Analyse:**

```typescript
class SmartContextAnalyzer {
  async analyzeDocuments(documents: DocumentContent[]): Promise<SmartContext> {
    const combinedText = documents.map(d => d.plainText).join('\n\n');

    // KI-basierte Analyse des Inhalts
    const analysis = await geminiService.analyzeContext({
      text: combinedText,
      task: 'extract_planning_context'
    });

    return {
      // Automatisch erkannt
      industry: analysis.industry,
      tone: analysis.recommendedTone,
      audience: analysis.primaryAudience,

      // Extrahierte Inhalte
      keyMessages: analysis.keyMessages,
      targetGroups: analysis.targetGroups,
      usp: analysis.usp,
      challenges: analysis.challenges,
      opportunities: analysis.opportunities,

      // Meta
      documentSummary: analysis.summary,
      confidence: analysis.confidence
    };
  }
}
```

---

## 4. Technische Architektur

### 4.1 Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│         ProjectPressemeldungenTab                       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  CampaignCreateModal                              │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │  Campaign Editor                            │ │ │
│  │  │                                             │ │ │
│  │  │  Button: "KI-Assistent"                     │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         StructuredGenerationModal (ERWEITERT)           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  STEP 1: Context Setup                          │   │
│  │  - Branche, Ton, Zielgruppe                     │   │
│  │  - Button: "📄 Planungsdokumente verwenden"     │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DocumentPickerModal (NEU)                      │   │
│  │  - Liste: Dokumente aus Strategie-Tab          │   │
│  │  - Checkboxes (max 3)                           │   │
│  │  - Preview Panel                                │   │
│  │  - Button: "Dokumente verwenden"                │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DocumentContextExtractor (NEU)                 │   │
│  │  - Load Documents                               │   │
│  │  - Extract Plain Text                           │   │
│  │  - Analyze Context                              │   │
│  │  - Build Enhanced Context                       │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  STEP 2: Content Input                          │   │
│  │  - Badge: "3 Dokumente verwendet"               │   │
│  │  - Prompt eingeben                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         API: /api/ai/generate-structured                │
│                                                         │
│  - Receive: prompt + context + documentContext         │
│  - Build Enhanced Prompt                               │
│  - Call Gemini                                         │
│  - Return: Structured Press Release                    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Datenmodell-Erweiterungen

**Neue Interfaces:**

```typescript
// src/types/ai.ts

export interface DocumentContext {
  id: string;
  fileName: string;
  plainText: string;
  excerpt: string;
  wordCount: number;
  createdAt: Date;
}

export interface EnrichedGenerationContext extends GenerationContext {
  // Aus Dokumenten extrahiert
  keyMessages?: string[];
  targetGroups?: string[];
  usp?: string;
  challenges?: string[];
  opportunities?: string[];

  // Dokumente-Referenz
  documentContext?: {
    documents: DocumentContext[];
    autoExtractedContext?: {
      keyMessages?: string[];
      targetGroups?: string[];
      usp?: string;
    };
    documentSummary?: string;
    confidence?: number;
  };
}

export interface EnhancedGenerationRequest {
  prompt: string;
  context: EnrichedGenerationContext;
  documentContext?: {
    documents: DocumentContext[];
    autoExtractedContext?: any;
  };
}
```

### 4.3 Service-Integration

**Neue Services:**

1. **DocumentPickerService**
   - `getProjectDocuments(projectId, dokumenteFolderId)` - Lädt alle Dokumente
   - `loadDocumentContent(documentId)` - Lädt Content für Dokument

2. **DocumentContextExtractor**
   - `extractContext(documentIds)` - Extrahiert Context aus Dokumenten
   - `buildEnhancedPrompt(prompt, context)` - Baut erweiterten Prompt

3. **API Route Erweiterung**
   - `/api/ai/generate-structured` erweitern für Dokumenten-Kontext

### 4.4 Bestehende Services verwenden

**Wiederverwendbare Services:**

```typescript
// Document Content laden
import { documentContentService } from '@/lib/firebase/document-content-service';

// Media Assets laden (für Dokument-Liste)
import { mediaService } from '@/lib/firebase/media-service';

// AI Service
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
```

---

## 5. Sicherheit & Permissions

### 5.1 Zugriffskontrolle

**Dokumente-Zugriff:**
- User muss Projekt-Mitglied sein
- Permissions werden über `organizationId` validiert
- Dokumente sind projekt-spezifisch (kein Cross-Project-Access)

**Firestore Rules:**
```javascript
// documentContent Collection
match /documentContent/{docId} {
  allow read: if isProjectMember(resource.data.projectId);
  allow write: if isProjectMember(request.resource.data.projectId);
}

// media_assets Collection
match /media_assets/{assetId} {
  allow read: if isProjectMember(resource.data.projectId);
  allow write: if isProjectMember(request.resource.data.projectId);
}
```

### 5.2 Daten-Validierung

**Context Size Limits:**
- Max. 3 Dokumente pro Request
- Max. 5000 Zeichen Plain Text pro Dokument
- Total Context Size: Max. 15000 Zeichen

**API Validation:**
```typescript
if (documentContext?.documents?.length > 3) {
  throw new Error('Max. 3 Dokumente erlaubt');
}

const totalSize = documentContext.documents.reduce(
  (sum, doc) => sum + doc.plainText.length,
  0
);

if (totalSize > 15000) {
  throw new Error('Dokumente-Kontext zu groß (max. 15000 Zeichen)');
}
```

### 5.3 Performance-Überlegungen

**Caching:**
- Geladene Dokumente im Client-State cachen
- Wiederverwendung bei mehreren Generierungen

**Lazy Loading:**
- Dokument-Liste erst bei Bedarf laden
- Preview nur bei Selektion laden

**Optimierung:**
- Paralleles Laden von Dokumenten
- Debouncing bei Search/Filter

---

## 6. Metadaten & Analytics

### 6.1 Tracking

**Events tracken:**
- `ai_assistant_document_picker_opened`
- `ai_assistant_documents_selected` (mit Count)
- `ai_assistant_generation_with_context` (mit Document IDs)
- `ai_assistant_generation_quality` (User Feedback)

### 6.2 Metadaten speichern

**Bei Kampagnen-Erstellung:**
```typescript
interface CampaignMetadata {
  // Bestehend
  generatedBy?: string;
  generatedAt?: Date;

  // NEU
  usedDocuments?: {
    documentIds: string[];
    documentNames: string[];
    extractedContext: {
      keyMessages?: string[];
      targetGroups?: string[];
    };
  };
}
```

**Bei Generierung:**
```typescript
interface GenerationMetadata {
  timestamp: string;
  aiProvider: string;
  contextType: 'manual' | 'template' | 'documents';
  documentContext?: {
    documentCount: number;
    totalWordCount: number;
    confidence: number;
  };
}
```

---

## 7. User Experience

### 7.1 UI/UX Highlights

**Visual Indicators:**
- Badge "📄 3 Dokumente verwendet" im Context-Step
- Tooltip: "Kontext aus Planungsdokumenten"
- Preview-Panel zeigt Dokumenten-Excerpts

**Feedback:**
- Loading States während Dokument-Laden
- Success Message: "Kontext erfolgreich extrahiert"
- Error Handling bei fehlenden Dokumenten

**Workflow-Optimierung:**
- Optional: "Letzte Auswahl verwenden" Button
- Quick-Select: "Alle Strategie-Docs verwenden"
- Smart Recommendations: "Empfohlene Dokumente für diese Pressemeldung"

### 7.2 Error Handling

**Fehlerfälle:**

1. **Keine Dokumente vorhanden:**
   ```
   "Im Strategie-Tab wurden noch keine Planungsdokumente erstellt.
    Möchtest du jetzt welche erstellen?"
   → Button: "Zum Strategie-Tab"
   ```

2. **Dokument-Laden fehlgeschlagen:**
   ```
   "Dokument konnte nicht geladen werden. Bitte versuche es erneut."
   → Retry-Mechanismus
   ```

3. **Context zu groß:**
   ```
   "Die ausgewählten Dokumente sind zu umfangreich (>15000 Zeichen).
    Bitte wähle weniger oder kürzere Dokumente."
   ```

4. **Generierung fehlgeschlagen:**
   ```
   "KI-Generierung fehlgeschlagen. Versuche es mit weniger Kontext."
   → Fallback auf manuelle Eingabe
   ```

---

## 8. Qualitätssicherung

### 8.1 Testing-Strategie

**Unit Tests:**
- `DocumentContextExtractor.test.ts` - Context-Extraktion
- `DocumentPickerModal.test.tsx` - UI-Komponente
- `generateStructuredRoute.test.ts` - API-Logik

**Integration Tests:**
- End-to-End: Dokument erstellen → Als Kontext verwenden → Pressemeldung generieren
- Cross-Tab: Strategie → Pressemeldungen Flow

**E2E Tests (Playwright):**
```typescript
test('User verwendet Planungsdokumente für KI-Generierung', async ({ page }) => {
  // 1. Projekt öffnen
  await page.goto('/dashboard/projects/xxx');

  // 2. Zum Strategie-Tab
  await page.click('[data-testid="strategy-tab"]');

  // 3. Dokument erstellen
  await page.click('[data-testid="template-zielgruppe"]');
  await page.fill('[data-testid="doc-editor"]', 'Zielgruppe: Tech-affine Millennials...');
  await page.click('[data-testid="save-doc"]');

  // 4. Zum Pressemeldungen-Tab
  await page.click('[data-testid="pressemeldungen-tab"]');

  // 5. Meldung erstellen mit KI
  await page.click('[data-testid="create-campaign"]');
  await page.click('[data-testid="ai-assistant"]');

  // 6. Dokumente auswählen
  await page.click('[data-testid="use-planning-docs"]');
  await page.check('[data-testid="doc-checkbox-zielgruppe"]');
  await page.click('[data-testid="use-documents"]');

  // 7. Prompt eingeben
  await page.fill('[data-testid="prompt"]', 'Neue Produktankündigung...');
  await page.click('[data-testid="generate"]');

  // 8. Ergebnis prüfen
  await expect(page.locator('[data-testid="generated-headline"]')).toContainText('Millennials');
});
```

### 8.2 Qualitätsmetriken

**KPIs:**
- **Adoption Rate:** % der Generierungen mit Dokumenten-Kontext
- **Success Rate:** % erfolgreicher Generierungen
- **User Satisfaction:** Rating der generierten Inhalte
- **Time Saved:** Durchschnittliche Zeitersparnis vs. manuelle Erstellung

**Monitoring:**
- Fehlerrate bei Dokument-Laden
- Durchschnittliche Context Size
- API Response Times
- Gemini Token Usage

---

## 9. Technologie-Stack

### 9.1 Frontend

- **React/Next.js** - UI Framework
- **TypeScript** - Type Safety
- **Headless UI** - Modal Components
- **Tailwind CSS** - Styling
- **Tiptap** - Rich Text Editor (bereits vorhanden)

### 9.2 Backend

- **Firebase Firestore** - Database
- **Firebase Client SDK** - KEIN Admin SDK!
- **Next.js API Routes** - Backend Logic

### 9.3 AI/ML

- **Google Gemini** - LLM für Generierung
- **Gemini Pro** oder **Gemini 1.5 Flash** - Model Auswahl

### 9.4 Testing

- **Jest** - Unit Tests
- **React Testing Library** - Component Tests
- **Playwright** - E2E Tests

---

## 10. Rollout-Strategie

### 10.1 Phasen

**Phase 1: MVP (Woche 1-2)**
- DocumentPickerModal Komponente
- Basis Context-Extraktion (Plain Text)
- Integration in StructuredGenerationModal
- API-Erweiterung

**Phase 2: Enhancement (Woche 3)**
- Smart Context Analysis
- Auto-Extract Key Messages, Target Groups
- Improved UX (Search, Filter)
- Error Handling

**Phase 3: Optimization (Woche 4)**
- Performance Optimierung
- Caching
- Analytics Integration
- A/B Testing

**Phase 4: Advanced Features (Optional)**
- AI-basierte Dokument-Recommendations
- Multi-Language Support
- Template Learning (KI lernt aus erfolgreichen Kombinationen)

### 10.2 Feature Flags

```typescript
const FEATURE_FLAGS = {
  AI_PLANNING_DOCS_BASIC: true,        // Phase 1
  AI_PLANNING_DOCS_SMART: false,       // Phase 2
  AI_PLANNING_DOCS_RECOMMENDATIONS: false, // Phase 4
};
```

### 10.3 Migration

**Keine Breaking Changes:**
- Bestehende KI-Assistent-Funktionalität bleibt erhalten
- Dokumenten-Kontext ist optionale Erweiterung
- Backwards Compatible

---

## 11. Offene Fragen & Entscheidungen

### 11.1 Zu klären

1. **Context-Size-Limits:**
   - Wie viel Kontext kann Gemini optimal verarbeiten?
   - Sollen wir automatisch kürzen oder User warnen?

2. **Dokument-Auswahl:**
   - Manuelle Auswahl oder Smart Recommendations?
   - Soll KI automatisch relevante Dokumente vorschlagen?

3. **Kontext-Präsentation:**
   - Soll User sehen, welche Teile der Dokumente verwendet wurden?
   - Visual Highlighting im Preview?

4. **Versionierung:**
   - Welche Dokument-Version verwenden (aktuelle oder spezifische)?
   - Warnung bei veralteten Dokumenten?

### 11.2 Nice-to-Have Features

- **AI-Summary der Dokumente:** Automatische Zusammenfassung vor Verwendung
- **Context-Snippets:** Nur relevante Teile der Dokumente verwenden
- **Learning System:** KI merkt sich, welche Dokumente zu guten Ergebnissen führen
- **Multi-Project Context:** Dokumente aus ähnlichen Projekten vorschlagen

---

## 12. Risiken & Mitigations

### 12.1 Technische Risiken

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|-------------------|------------|
| Gemini Context-Size-Limit | Hoch | Mittel | Automatisches Kürzen, Smart Excerpt |
| Performance bei vielen Dokumenten | Mittel | Mittel | Lazy Loading, Pagination, Caching |
| Dokument-Laden fehlschlägt | Mittel | Niedrig | Retry-Mechanismus, Fallback |
| Inkonsistente Extraktion | Mittel | Mittel | Validation, Fallback auf manuelle Eingabe |

### 12.2 UX-Risiken

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|-------------------|------------|
| User versteht Feature nicht | Hoch | Mittel | Onboarding, Tooltips, Help-Text |
| Zu komplexer Workflow | Mittel | Mittel | Simplified Default Flow, Power-User Options |
| Langsame Generierung | Mittel | Niedrig | Loading States, Progress Indicators |

### 12.3 Business-Risiken

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|-------------------|------------|
| Niedrige Adoption | Hoch | Mittel | User Training, Best Practices Guide |
| Schlechte KI-Qualität | Hoch | Niedrig | Prompt Engineering, User Feedback Loop |
| Kosten-Explosion (Gemini API) | Mittel | Niedrig | Usage Limits, Monitoring, Alerts |

---

## Anhang A: Existierende Dateipfade

### Komponenten
- `/src/components/projects/strategy/ProjectStrategyTab.tsx` - Strategie-Tab
- `/src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx` - Pressemeldungen-Tab
- `/src/components/projects/DocumentEditorModal.tsx` - Dokument-Editor
- `/src/components/pr/ai/StructuredGenerationModal.tsx` - KI-Assistent Modal
- `/src/components/projects/ProjectFoldersView.tsx` - Ordner-Ansicht

### Services
- `/src/lib/firebase/document-content-service.ts` - Dokument-Content Service
- `/src/lib/firebase/media-service.ts` - Media/Folder Service
- `/src/lib/ai/firebase-ai-service.ts` - AI Service

### Types
- `/src/types/document-content.ts` - Dokument-Typen
- `/src/types/ai.ts` - AI-Typen
- `/src/types/project.ts` - Projekt-Typen

### API Routes
- `/src/app/api/ai/generate-structured/route.ts` - Strukturierte Generierung

---

## Anhang B: Firestore Collections

```
organizations/
├── {orgId}/
    ├── projects/
    │   └── {projectId}/
    │       ├── title: string
    │       ├── currentStage: PipelineStage
    │       └── customer: { name: string }
    │
    ├── project_folders/
    │   └── {projectId}/
    │       ├── name: "Projekt-Ordner"
    │       ├── organizationId: string
    │       └── subfolders: [
    │           { id: xxx, name: "Medien" },
    │           { id: yyy, name: "Dokumente" },
    │           { id: zzz, name: "Pressemeldungen" }
    │       ]
    │
    ├── media_folders/
    │   └── {folderId}/
    │       ├── name: string
    │       ├── parentFolderId?: string
    │       └── organizationId: string
    │
    ├── media_assets/
    │   └── {assetId}/
    │       ├── fileName: "Zielgruppenanalyse.celero-doc"
    │       ├── fileType: "celero-doc"
    │       ├── contentRef: "docContentId"
    │       ├── folderId: "dokumenteFolderId"
    │       ├── projectId: string
    │       └── organizationId: string
    │
    └── documentContent/
        └── {docId}/
            ├── content: string (HTML)
            ├── plainText: string
            ├── version: number
            ├── projectId: string
            ├── folderId: string
            └── organizationId: string
```

---

## Zusammenfassung

Dieses Masterplan-Dokument beschreibt die vollständige Architektur für das Feature "Planungsdokumente als KI-Assistent Kontext". Es nutzt die bestehende Infrastruktur (Dokumente aus Strategie-Tab, KI-Assistent, Firestore) und erweitert sie um intelligente Kontext-Extraktion für bessere, projekt-spezifische Pressemeldungen.

**Nächste Schritte:**
→ Siehe Implementierungs-Plan für detaillierte Aufgaben und Reihenfolge
