# KI-Assistent Planungsdokumente - Implementierungsplan

**Feature:** Planungsdokumente als KI-Assistent Kontext
**Version:** 1.0
**Erstellt:** 2025-10-04
**Status:** READY FOR IMPLEMENTATION

---

## Überblick

Dieser Implementierungsplan beschreibt die schrittweise Umsetzung des Features "Planungsdokumente als KI-Assistent Kontext". Die Implementierung erfolgt in 5 Phasen über ca. 2-3 Wochen.

---

## Phase 1: Basis-Infrastruktur (Tag 1-3)

### 1.1 Types & Interfaces erstellen

**Datei:** `src/types/ai.ts` (erweitern)

```typescript
// Hinzufügen am Ende der Datei

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

  // Dokumente-Referenz
  documentContext?: {
    documents: DocumentContext[];
    documentSummary?: string;
  };
}

export interface EnhancedGenerationRequest {
  prompt: string;
  context: EnrichedGenerationContext;
  documentContext?: {
    documents: DocumentContext[];
  };
}
```

**Tests:**
- `src/types/__tests__/ai-types-extension.test.ts`

### 1.2 DocumentPickerService erstellen

**Datei:** `src/lib/firebase/document-picker-service.ts` (NEU)

```typescript
import { documentContentService } from './document-content-service';
import { mediaService } from './media-service';
import type { DocumentContext } from '@/types/ai';

class DocumentPickerService {
  /**
   * Lädt alle .celero-doc Dokumente aus dem Dokumente-Ordner
   */
  async getProjectDocuments(
    organizationId: string,
    dokumenteFolderId: string
  ): Promise<DocumentContext[]> {
    try {
      // 1. Lade alle Assets aus Dokumente-Ordner
      const assets = await mediaService.getMediaAssets(
        organizationId,
        dokumenteFolderId
      );

      // 2. Filtere nur .celero-doc Dateien
      const celeroDocAssets = assets.filter(
        asset => asset.fileType === 'celero-doc' ||
                 asset.fileName?.endsWith('.celero-doc')
      );

      // 3. Lade Content für jedes Dokument
      const documentsPromises = celeroDocAssets.map(async (asset) => {
        if (!asset.contentRef) {
          console.warn(`Asset ${asset.id} hat keine contentRef`);
          return null;
        }

        const content = await documentContentService.loadDocument(asset.contentRef);
        if (!content) return null;

        const plainText = this.stripHTML(content.content);
        const excerpt = plainText.substring(0, 500);
        const wordCount = plainText.split(/\s+/).length;

        return {
          id: asset.contentRef,
          fileName: asset.fileName,
          plainText,
          excerpt,
          wordCount,
          createdAt: asset.createdAt?.toDate() || new Date()
        } as DocumentContext;
      });

      const documents = await Promise.all(documentsPromises);
      return documents.filter(doc => doc !== null) as DocumentContext[];

    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Dokumente:', error);
      throw error;
    }
  }

  /**
   * Lädt spezifische Dokumente nach IDs
   */
  async loadDocuments(documentIds: string[]): Promise<DocumentContext[]> {
    const documentsPromises = documentIds.map(async (id) => {
      const content = await documentContentService.loadDocument(id);
      if (!content) return null;

      const plainText = this.stripHTML(content.content);
      const excerpt = plainText.substring(0, 500);
      const wordCount = plainText.split(/\s+/).length;

      return {
        id,
        fileName: `Dokument ${id.substring(0, 8)}`, // Fallback
        plainText,
        excerpt,
        wordCount,
        createdAt: content.createdAt?.toDate() || new Date()
      } as DocumentContext;
    });

    const documents = await Promise.all(documentsPromises);
    return documents.filter(doc => doc !== null) as DocumentContext[];
  }

  /**
   * Entfernt HTML-Tags und gibt Plain Text zurück
   */
  private stripHTML(html: string): string {
    // Client-Side: Browser DOM verwenden
    if (typeof window !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    }

    // Server-Side: Simple Regex (nicht perfekt, aber ausreichend)
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validiert Kontext-Größe
   */
  validateContextSize(documents: DocumentContext[]): {
    valid: boolean;
    totalSize: number;
    message?: string;
  } {
    const MAX_DOCUMENTS = 3;
    const MAX_SIZE_PER_DOC = 5000;
    const MAX_TOTAL_SIZE = 15000;

    if (documents.length > MAX_DOCUMENTS) {
      return {
        valid: false,
        totalSize: 0,
        message: `Maximal ${MAX_DOCUMENTS} Dokumente erlaubt`
      };
    }

    const totalSize = documents.reduce(
      (sum, doc) => sum + doc.plainText.length,
      0
    );

    if (totalSize > MAX_TOTAL_SIZE) {
      return {
        valid: false,
        totalSize,
        message: `Gesamtgröße überschreitet ${MAX_TOTAL_SIZE} Zeichen`
      };
    }

    const oversizedDocs = documents.filter(
      doc => doc.plainText.length > MAX_SIZE_PER_DOC
    );

    if (oversizedDocs.length > 0) {
      return {
        valid: false,
        totalSize,
        message: `Dokument "${oversizedDocs[0].fileName}" ist zu groß (>${MAX_SIZE_PER_DOC} Zeichen)`
      };
    }

    return { valid: true, totalSize };
  }
}

export const documentPickerService = new DocumentPickerService();
```

**Tests:**
- `src/lib/firebase/__tests__/document-picker-service.test.ts`

### 1.3 DocumentPickerModal Komponente

**Datei:** `src/components/pr/ai/DocumentPickerModal.tsx` (NEU)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  XMarkIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { documentPickerService } from '@/lib/firebase/document-picker-service';
import type { DocumentContext } from '@/types/ai';

interface DocumentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (documents: DocumentContext[]) => void;
  organizationId: string;
  dokumenteFolderId: string;
  maxSelection?: number;
}

export default function DocumentPickerModal({
  isOpen,
  onClose,
  onSelect,
  organizationId,
  dokumenteFolderId,
  maxSelection = 3
}: DocumentPickerModalProps) {
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dokumente laden
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, organizationId, dokumenteFolderId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await documentPickerService.getProjectDocuments(
        organizationId,
        dokumenteFolderId
      );
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Selektion
  const toggleDocument = (docId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      if (newSelection.size >= maxSelection) {
        alert(`Maximal ${maxSelection} Dokumente erlaubt`);
        return;
      }
      newSelection.add(docId);
    }
    setSelectedIds(newSelection);
  };

  // Dokumente verwenden
  const handleUseDocuments = () => {
    const selected = documents.filter(doc => selectedIds.has(doc.id));

    // Validierung
    const validation = documentPickerService.validateContextSize(selected);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    onSelect(selected);
    onClose();
  };

  // Filter Dokumente
  const filteredDocs = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ausgewähltes Dokument für Preview
  const previewDoc = documents.find(doc =>
    selectedIds.has(doc.id) && selectedIds.size === 1
  );

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-5xl w-full bg-white rounded-lg shadow-xl max-h-[80vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Planungsdokumente auswählen
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Wähle bis zu {maxSelection} Dokumente als Kontext für die KI-Generierung
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Dokumente durchsuchen..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Dokumente Liste */}
            <div className="w-1/2 border-r overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Dokumente werden geladen...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  <p>{error}</p>
                  <Button onClick={loadDocuments} className="mt-4">
                    Erneut versuchen
                  </Button>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Keine Dokumente gefunden</p>
                  {searchTerm && (
                    <p className="text-sm mt-2">Versuche eine andere Suche</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedIds.has(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`
                          block p-4 border rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDocument(doc.id)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 truncate">
                                {doc.fileName.replace('.celero-doc', '')}
                              </h4>
                              {isSelected && (
                                <CheckCircleIcon className="h-5 w-5 text-indigo-600 ml-2" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {doc.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge color="zinc" className="text-xs">
                                {doc.wordCount} Wörter
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {doc.createdAt.toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 overflow-y-auto p-4 bg-gray-50">
              {previewDoc ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Vorschau: {previewDoc.fileName.replace('.celero-doc', '')}
                  </h3>
                  <div className="bg-white border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {previewDoc.plainText.substring(0, 1000)}
                    {previewDoc.plainText.length > 1000 && '...'}
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p><strong>Wörter:</strong> {previewDoc.wordCount}</p>
                    <p><strong>Zeichen:</strong> {previewDoc.plainText.length}</p>
                  </div>
                </div>
              ) : selectedIds.size > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{selectedIds.size} Dokumente ausgewählt</p>
                  <p className="text-xs mt-2">
                    Wähle ein einzelnes Dokument für die Vorschau
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Wähle ein Dokument für die Vorschau</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedIds.size} von {maxSelection} Dokumenten ausgewählt
            </div>
            <div className="flex gap-2">
              <Button plain onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleUseDocuments}
                disabled={selectedIds.size === 0}
              >
                Dokumente verwenden
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

**Tests:**
- `src/components/pr/ai/__tests__/DocumentPickerModal.test.tsx`

---

## Phase 2: Integration in KI-Assistent (Tag 4-5)

### 2.1 StructuredGenerationModal erweitern

**Datei:** `src/components/pr/ai/StructuredGenerationModal.tsx` (erweitern)

**Änderungen:**

```typescript
// State hinzufügen (Zeile ~260)
const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([]);
const [showDocumentPicker, setShowDocumentPicker] = useState(false);
const [enrichedContext, setEnrichedContext] = useState<EnrichedGenerationContext | null>(null);

// Handler für Dokument-Auswahl
const handleDocumentsSelected = (documents: DocumentContext[]) => {
  setSelectedDocuments(documents);

  // Auto-Extract Basic Context
  const extractedContext = extractBasicContext(documents);
  setEnrichedContext(extractedContext);

  setShowDocumentPicker(false);
};

// Context-Extraktion
const extractBasicContext = (documents: DocumentContext[]): EnrichedGenerationContext => {
  const combinedText = documents.map(d => d.plainText).join('\n\n');

  // Basis-Extraktion (einfache Keyword-Suche)
  const keyMessages = extractKeyMessages(combinedText);
  const targetGroups = extractTargetGroups(combinedText);
  const usp = extractUSP(combinedText);

  return {
    ...context,
    keyMessages,
    targetGroups,
    usp,
    documentContext: {
      documents,
      documentSummary: `${documents.length} Dokumente: ${documents.map(d => d.fileName).join(', ')}`
    }
  };
};

// Hilfsfunktionen für Extraktion
const extractKeyMessages = (text: string): string[] => {
  const keywords = ['key message', 'kernbotschaft', 'hauptbotschaft', 'wichtig'];
  const messages: string[] = [];

  // Einfache Extraktion basierend auf Absätzen nach Keywords
  const paragraphs = text.split('\n').filter(p => p.trim());
  paragraphs.forEach((para, i) => {
    if (keywords.some(kw => para.toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      messages.push(paragraphs[i + 1]);
    }
  });

  return messages.slice(0, 3); // Max 3
};

const extractTargetGroups = (text: string): string[] => {
  const keywords = ['zielgruppe', 'target', 'persona', 'audience'];
  const groups: string[] = [];

  const paragraphs = text.split('\n').filter(p => p.trim());
  paragraphs.forEach((para, i) => {
    if (keywords.some(kw => para.toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      groups.push(paragraphs[i + 1]);
    }
  });

  return groups.slice(0, 3);
};

const extractUSP = (text: string): string => {
  const keywords = ['usp', 'alleinstellungsmerkmal', 'einzigartig', 'unique'];

  const paragraphs = text.split('\n').filter(p => p.trim());
  for (let i = 0; i < paragraphs.length; i++) {
    if (keywords.some(kw => paragraphs[i].toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      return paragraphs[i + 1];
    }
  }

  return '';
};
```

**UI-Anpassungen in ContextSetupStep:**

```typescript
// Nach Audience-Auswahl hinzufügen
<Field>
  <Label className="text-base font-semibold mb-3">
    Planungsdokumente (optional)
  </Label>

  {selectedDocuments.length > 0 ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-900">
            {selectedDocuments.length} Dokumente ausgewählt
          </span>
        </div>
        <Button
          plain
          onClick={() => setShowDocumentPicker(true)}
          className="text-sm text-green-700"
        >
          Ändern
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {selectedDocuments.map(doc => (
          <div key={doc.id} className="p-2 bg-gray-50 rounded text-sm">
            <p className="font-medium">{doc.fileName.replace('.celero-doc', '')}</p>
            <p className="text-xs text-gray-600">{doc.wordCount} Wörter</p>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Button
      outline
      onClick={() => setShowDocumentPicker(true)}
      className="w-full"
    >
      <DocumentTextIcon className="h-5 w-5 mr-2" />
      Planungsdokumente auswählen
    </Button>
  )}
</Field>

{/* DocumentPickerModal */}
{showDocumentPicker && (
  <DocumentPickerModal
    isOpen={showDocumentPicker}
    onClose={() => setShowDocumentPicker(false)}
    onSelect={handleDocumentsSelected}
    organizationId={/* von props */}
    dokumenteFolderId={/* von props */}
  />
)}
```

**Props erweitern:**

```typescript
interface StructuredGenerationModalProps {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  // NEU
  organizationId: string;
  projekteFolderId?: string; // Optional, falls verfügbar
}
```

**Tests:**
- `src/components/pr/ai/__tests__/StructuredGenerationModal-documents.test.tsx`

### 2.2 API Route erweitern

**Datei:** `src/app/api/ai/generate-structured/route.ts` (erweitern)

```typescript
export async function POST(request: Request) {
  try {
    const body: EnhancedGenerationRequest = await request.json();
    const { prompt, context, documentContext } = body;

    // Validierung
    if (documentContext?.documents) {
      if (documentContext.documents.length > 3) {
        return NextResponse.json(
          { error: 'Maximal 3 Dokumente erlaubt' },
          { status: 400 }
        );
      }

      const totalSize = documentContext.documents.reduce(
        (sum, doc) => sum + doc.plainText.length,
        0
      );

      if (totalSize > 15000) {
        return NextResponse.json(
          { error: 'Dokumente-Kontext zu groß (max. 15000 Zeichen)' },
          { status: 400 }
        );
      }
    }

    // Enhanced Prompt bauen
    let enhancedPrompt = prompt;

    if (documentContext?.documents && documentContext.documents.length > 0) {
      const documentsContext = documentContext.documents.map(doc => `
--- ${doc.fileName} ---
${doc.plainText.substring(0, 2000)} ${doc.plainText.length > 2000 ? '...' : ''}
      `).join('\n\n');

      enhancedPrompt = `
PLANUNGSDOKUMENTE ALS KONTEXT:

${documentsContext}

---

AUFGABE:
${prompt}

ANWEISUNG:
Nutze die Informationen aus den Planungsdokumenten oben, um eine zielgruppengerechte
und strategisch passende Pressemitteilung zu erstellen. Beachte dabei:
- Die definierten Zielgruppen
- Die Key Messages/Kernbotschaften
- Das Alleinstellungsmerkmal (USP)
- Den Ton und Stil aus den Dokumenten

Erstelle eine professionelle Pressemitteilung nach journalistischen Standards.
      `.trim();
    }

    // Gemini-Service aufrufen (bestehender Code)
    const result = await generateStructuredPressRelease(enhancedPrompt, context);

    return NextResponse.json({
      success: true,
      ...result,
      // Metadaten
      usedDocuments: documentContext?.documents?.length || 0,
      documentNames: documentContext?.documents?.map(d => d.fileName) || []
    });

  } catch (error: any) {
    console.error('Structured Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Generierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
```

**Tests:**
- `src/app/api/ai/__tests__/generate-structured-with-docs.test.ts`

---

## Phase 3: Projekt-Integration (Tag 6-7)

### 3.1 CampaignCreateModal erweitern

**Datei:** `src/components/projects/pressemeldungen/CampaignCreateModal.tsx` (erweitern)

**Props erweitern:**

```typescript
interface CampaignCreateModalProps {
  projectId: string;
  organizationId: string;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
  // NEU
  dokumenteFolderId?: string; // Vom Parent übergeben
}
```

**StructuredGenerationModal mit Props aufrufen:**

```typescript
{showAiAssistant && (
  <StructuredGenerationModal
    onClose={() => setShowAiAssistant(false)}
    onGenerate={handleAiGenerated}
    organizationId={organizationId}
    projekteFolderId={dokumenteFolderId}
  />
)}
```

### 3.2 ProjectPressemeldungenTab erweitern

**Datei:** `src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx` (erweitern)

**State hinzufügen:**

```typescript
const [dokumenteFolderId, setDokumenteFolderId] = useState<string | undefined>();

useEffect(() => {
  // Lade Projekt-Ordner-Struktur
  const loadFolders = async () => {
    try {
      const projectFolders = await projectService.getProjectFolders(projectId, organizationId);

      // Finde "Dokumente" Ordner
      const dokFolder = projectFolders?.subfolders?.find(
        (folder: any) => folder.name === 'Dokumente'
      );

      if (dokFolder) {
        setDokumenteFolderId(dokFolder.id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordner:', error);
    }
  };

  loadFolders();
}, [projectId, organizationId]);
```

**CampaignCreateModal mit Prop aufrufen:**

```typescript
{showCreateModal && (
  <CampaignCreateModal
    projectId={projectId}
    organizationId={organizationId}
    onClose={() => setShowCreateModal(false)}
    onSuccess={(campaignId) => {
      setShowCreateModal(false);
      loadProjectPressData();
    }}
    dokumenteFolderId={dokumenteFolderId} // NEU
  />
)}
```

**Tests:**
- `src/components/projects/pressemeldungen/__tests__/integration-ai-documents.test.tsx`

---

## Phase 4: Error Handling & UX (Tag 8-9)

### 4.1 Error States in DocumentPickerModal

**Erweiterungen:**

```typescript
// Keine Dokumente vorhanden
if (documents.length === 0 && !loading) {
  return (
    <div className="text-center py-8">
      <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Keine Planungsdokumente gefunden
      </h3>
      <p className="text-gray-600 mb-4">
        Im Strategie-Tab wurden noch keine Dokumente erstellt.
      </p>
      <Button
        onClick={() => {
          onClose();
          // Navigate to Strategie-Tab
          window.location.hash = '#strategie';
        }}
      >
        Zum Strategie-Tab
      </Button>
    </div>
  );
}

// Größen-Warnung
const handleUseDocuments = () => {
  const selected = documents.filter(doc => selectedIds.has(doc.id));
  const validation = documentPickerService.validateContextSize(selected);

  if (!validation.valid) {
    // Bessere Error-Anzeige
    setError(validation.message || 'Validation fehlgeschlagen');
    return;
  }

  onSelect(selected);
  onClose();
};

// Error Display in UI
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
    <p className="text-red-700">{error}</p>
  </div>
)}
```

### 4.2 Loading States

**In StructuredGenerationModal:**

```typescript
// Während Dokumente geladen werden
{loadingDocuments && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
      <p className="text-blue-700">Dokumente werden geladen...</p>
    </div>
  </div>
)}
```

### 4.3 Success Feedback

**Nach Dokument-Auswahl:**

```typescript
// Toast-Notification (optional mit react-hot-toast)
import toast from 'react-hot-toast';

const handleDocumentsSelected = (documents: DocumentContext[]) => {
  setSelectedDocuments(documents);

  toast.success(
    `${documents.length} Dokumente ausgewählt und Kontext extrahiert`,
    { duration: 3000 }
  );

  // ... rest
};
```

**Tests:**
- `src/components/pr/ai/__tests__/error-handling.test.tsx`

---

## Phase 5: Optimierung & Analytics (Tag 10-12)

### 5.1 Context Caching

**In StructuredGenerationModal:**

```typescript
// LocalStorage für letzte Auswahl
const CACHE_KEY = 'last_selected_documents';

const saveLastSelection = (documentIds: string[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(documentIds));
  } catch (error) {
    console.warn('Cache speichern fehlgeschlagen:', error);
  }
};

const loadLastSelection = (): string[] => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.warn('Cache laden fehlgeschlagen:', error);
    return [];
  }
};

// Button: "Letzte Auswahl verwenden"
<Button
  outline
  onClick={() => {
    const lastIds = loadLastSelection();
    if (lastIds.length > 0) {
      // Load documents by IDs
      loadDocumentsByIds(lastIds);
    }
  }}
>
  Letzte Auswahl verwenden
</Button>
```

### 5.2 Analytics Integration

**Tracking Events:**

```typescript
// In DocumentPickerModal
import { analytics } from '@/lib/firebase/analytics';

const handleUseDocuments = () => {
  const selected = documents.filter(doc => selectedIds.has(doc.id));

  // Analytics Event
  analytics.logEvent('ai_documents_selected', {
    documentCount: selected.length,
    documentNames: selected.map(d => d.fileName),
    totalWordCount: selected.reduce((sum, d) => sum + d.wordCount, 0),
    projectId: /* ... */,
    organizationId: /* ... */
  });

  onSelect(selected);
  onClose();
};

// In StructuredGenerationModal nach Generierung
analytics.logEvent('ai_generation_with_documents', {
  usedDocuments: selectedDocuments.length > 0,
  documentCount: selectedDocuments.length,
  promptLength: prompt.length,
  generatedLength: generatedResult?.htmlContent.length || 0,
  contextType: selectedDocuments.length > 0 ? 'documents' : 'manual'
});
```

### 5.3 Performance Optimierung

**Lazy Loading für DocumentPickerModal:**

```typescript
// In StructuredGenerationModal
const DocumentPickerModal = dynamic(
  () => import('./DocumentPickerModal'),
  { ssr: false }
);
```

**Parallel Loading:**

```typescript
// In DocumentPickerService
async getProjectDocuments(orgId: string, folderId: string) {
  const assets = await mediaService.getMediaAssets(orgId, folderId);
  const celeroDocAssets = assets.filter(/* ... */);

  // Parallel laden mit Promise.allSettled (robuster)
  const documentsResults = await Promise.allSettled(
    celeroDocAssets.map(async (asset) => {
      const content = await documentContentService.loadDocument(asset.contentRef);
      // ... transform
      return documentContext;
    })
  );

  // Nur erfolgreiche Results
  return documentsResults
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<DocumentContext>).value);
}
```

**Tests:**
- `src/lib/firebase/__tests__/document-picker-performance.test.ts`

---

## Phase 6: Testing & QA (Tag 13-15)

### 6.1 Unit Tests

**DocumentPickerService Tests:**

```typescript
// src/lib/firebase/__tests__/document-picker-service.test.ts

describe('DocumentPickerService', () => {
  describe('getProjectDocuments', () => {
    it('sollte alle celero-doc Dokumente laden', async () => {
      // Mock mediaService & documentContentService
      const docs = await documentPickerService.getProjectDocuments('org1', 'folder1');
      expect(docs).toHaveLength(3);
      expect(docs[0]).toHaveProperty('plainText');
    });

    it('sollte HTML korrekt zu Plain Text konvertieren', async () => {
      const html = '<p>Test <strong>bold</strong></p>';
      const plain = documentPickerService['stripHTML'](html);
      expect(plain).toBe('Test bold');
    });
  });

  describe('validateContextSize', () => {
    it('sollte bei gültiger Größe true zurückgeben', () => {
      const docs = [{ plainText: 'a'.repeat(1000) }] as DocumentContext[];
      const result = documentPickerService.validateContextSize(docs);
      expect(result.valid).toBe(true);
    });

    it('sollte bei zu vielen Dokumenten false zurückgeben', () => {
      const docs = Array(4).fill({ plainText: 'test' }) as DocumentContext[];
      const result = documentPickerService.validateContextSize(docs);
      expect(result.valid).toBe(false);
    });
  });
});
```

### 6.2 Integration Tests

**E2E Flow Test:**

```typescript
// src/__tests__/features/ai-planning-documents-integration.test.ts

describe('KI-Assistent mit Planungsdokumenten', () => {
  it('kompletter Flow: Dokument erstellen → Als Kontext verwenden → Pressemeldung generieren', async () => {
    // 1. Setup: Projekt mit Ordnern erstellen
    const project = await createTestProject();
    const dokumenteFolder = project.folders.find(f => f.name === 'Dokumente');

    // 2. Dokument im Strategie-Tab erstellen
    const docContent = '<p>Zielgruppe: Tech-affine Millennials...</p>';
    const { documentId } = await documentContentService.createDocument(
      docContent,
      {
        fileName: 'Zielgruppenanalyse',
        folderId: dokumenteFolder.id,
        organizationId: project.organizationId,
        projectId: project.id,
        userId: 'test-user'
      }
    );

    // 3. Dokumente im Picker laden
    const docs = await documentPickerService.getProjectDocuments(
      project.organizationId,
      dokumenteFolder.id
    );

    expect(docs).toHaveLength(1);
    expect(docs[0].fileName).toContain('Zielgruppenanalyse');

    // 4. KI-Generierung mit Dokumenten-Kontext
    const request: EnhancedGenerationRequest = {
      prompt: 'Neue App für Millennials',
      context: { industry: 'Technologie' },
      documentContext: { documents: docs }
    };

    const response = await fetch('/api/ai/generate-structured', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(result.usedDocuments).toBe(1);
    expect(result.structured.headline).toBeTruthy();
  });
});
```

### 6.3 E2E Tests (Playwright)

```typescript
// e2e/ai-planning-documents.spec.ts

import { test, expect } from '@playwright/test';

test('User verwendet Planungsdokumente für KI-Pressemeldung', async ({ page }) => {
  // 1. Login & Projekt öffnen
  await page.goto('/dashboard/projects/test-project');

  // 2. Strategie-Tab: Dokument erstellen
  await page.click('[data-testid="tab-strategie"]');
  await page.click('[data-testid="template-zielgruppe"]');
  await page.fill('[data-testid="doc-editor"]', 'Zielgruppe: Tech-Millennials');
  await page.click('[data-testid="save-doc"]');
  await expect(page.locator('.toast-success')).toBeVisible();

  // 3. Pressemeldungen-Tab: Kampagne erstellen
  await page.click('[data-testid="tab-pressemeldungen"]');
  await page.click('[data-testid="create-campaign"]');
  await page.click('[data-testid="open-ai-assistant"]');

  // 4. Planungsdokumente auswählen
  await page.click('[data-testid="use-planning-docs"]');
  await expect(page.locator('[data-testid="document-picker"]')).toBeVisible();

  await page.check('[data-testid="doc-checkbox-zielgruppe"]');
  await page.click('[data-testid="use-documents-btn"]');

  // 5. Kontext prüfen
  await expect(page.locator('[data-testid="selected-docs-badge"]')).toContainText('1 Dokumente');

  // 6. Prompt eingeben & generieren
  await page.click('[data-testid="next-step"]'); // Context → Content
  await page.fill('[data-testid="prompt-input"]', 'Neue Dating-App Launch');
  await page.click('[data-testid="generate-btn"]');

  // 7. Ergebnis prüfen
  await expect(page.locator('[data-testid="generated-headline"]')).toBeVisible();
  await expect(page.locator('[data-testid="generated-content"]')).toContainText('Millennials');

  // 8. Übernehmen
  await page.click('[data-testid="use-generated"]');
  await expect(page.locator('[data-testid="campaign-headline"]')).toContainText('Dating');
});
```

---

## Deployment-Checklist

### Pre-Deployment

- [ ] Alle Unit Tests grün
- [ ] Alle Integration Tests grün
- [ ] E2E Tests erfolgreich
- [ ] Code Review durchgeführt
- [ ] Performance-Tests OK
- [ ] Security Audit durchgeführt
- [ ] Firestore Rules aktualisiert
- [ ] Analytics Events implementiert

### Deployment

- [ ] Feature Flag aktivieren
- [ ] Monitoring aufsetzen
- [ ] Error Tracking (Sentry) konfigurieren
- [ ] User Onboarding vorbereiten
- [ ] Dokumentation erstellen

### Post-Deployment

- [ ] Monitoring für 24h beobachten
- [ ] User Feedback sammeln
- [ ] Performance Metriken prüfen
- [ ] Fehlerrate analysieren
- [ ] Adoption Rate tracken

---

## Rollback-Plan

Falls kritische Probleme auftreten:

1. **Feature Flag deaktivieren** (sofortiger Rollback)
2. **Alte Version wiederherstellen** (falls Flag nicht ausreichend)
3. **Fehler analysieren** und dokumentieren
4. **Fix implementieren** und erneut deployen

---

## Offene Punkte & Entscheidungen

### Zu klären mit Team:

1. **Context-Size-Limit festlegen:**
   - Aktuell: 15.000 Zeichen total
   - Optimales Limit für Gemini?

2. **Smart Context-Extraktion:**
   - Phase 1: Keyword-basiert (einfach)
   - Phase 2: KI-basiert (komplex)
   - Welche Strategie?

3. **Dokument-Recommendations:**
   - Soll KI automatisch Dokumente vorschlagen?
   - Basierend auf Prompt-Analyse?

4. **Versionierung:**
   - Immer neueste Version verwenden?
   - Oder User wählen lassen?

5. **Multi-Projekt Context:**
   - Dokumente aus ähnlichen Projekten erlauben?
   - Privacy-Implikationen?

---

## Nächste Schritte

1. **Kick-off Meeting** mit Team (Datum: ___)
2. **Phase 1 starten:** Basis-Infrastruktur (3 Tage)
3. **Review nach Phase 1:** Fortschritt prüfen
4. **Weiter mit Phase 2-5** nach Plan
5. **QA & Testing:** Woche 3
6. **Deployment:** Ende Woche 3

---

## Ressourcen & Links

**Code-Referenzen:**
- Masterplan: `/docs/features/ki-assistent-planungsdokumente-masterplan.md`
- Bestehender Code: siehe Masterplan Anhang A

**Dependencies:**
- Keine neuen NPM-Packages nötig
- Nutzt bestehende: Firebase, Tiptap, Headless UI

**Team-Kontakte:**
- Product Owner: ___
- Lead Developer: ___
- QA Lead: ___

---

**Status-Updates:**
- [ ] Phase 1 abgeschlossen
- [ ] Phase 2 abgeschlossen
- [ ] Phase 3 abgeschlossen
- [ ] Phase 4 abgeschlossen
- [ ] Phase 5 abgeschlossen
- [ ] Testing abgeschlossen
- [ ] Deployed to Production
