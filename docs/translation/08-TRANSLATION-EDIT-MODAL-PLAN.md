# Implementierungsplan: TranslationEditModal Redesign

## Status: GEPLANT
**Erstellt:** 2025-12-09
**Ziel:** Side-by-Side Editor mit vollständiger Formatierungsunterstützung

---

## 1. Problemanalyse

### 1.1 Aktuelle Probleme

| Problem | Beschreibung | Auswirkung |
|---------|--------------|------------|
| **Boilerplates werden nicht gespeichert** | `UpdateTranslationInput` hat kein `translatedBoilerplates` Feld | Änderungen gehen verloren |
| **Falscher Editor** | `RichTextEditor` ohne CTA/Hashtag/Quote Extensions | Spezielle Markups werden zerstört |
| **Kein Original-Vergleich** | User sieht nicht den deutschen Originaltext | Übersetzungsqualität leidet |
| **Boilerplates ohne Kontext** | Nur "Abschnitt 1, 2, 3" - kein Name/Typ | User weiß nicht was er bearbeitet |
| **Textarea für Boilerplates** | Einfaches Textarea statt Rich-Text-Editor | HTML-Formatierung geht verloren |

### 1.2 Spezielle Markups die erhalten bleiben müssen

```typescript
// 1. CTA (Call-to-Action) - CTAExtension.ts
<span data-type="cta-text" class="cta-text font-bold text-black">Text</span>

// 2. Hashtag - HashtagExtension.ts
<span data-type="hashtag" class="hashtag text-blue-600 font-semibold">Text</span>

// 3. Quote (Zitat) - QuoteExtension.ts
<blockquote data-type="pr-quote" class="pr-quote border-l-4...">Text</blockquote>
```

### 1.3 Editor-Vergleich

| Editor | CTA | Hashtag | Quote | Verwendung |
|--------|-----|---------|-------|------------|
| `RichTextEditor` | ❌ | ❌ | ❌ | Email, TranslationEditModal (aktuell) |
| `BoilerplateModal` Editor | ❌ | ❌ | ❌ | Boilerplate-Verwaltung |
| `GmailStyleEditor` | ✅ | ✅ | ✅ | Campaign-Erstellung, PR-Content |

**Lösung:** `GmailStyleEditor` verwenden oder Extensions in neuen Editor integrieren.

---

## 2. Konzept: Side-by-Side Editor

### 2.1 Layout-Struktur

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Übersetzung bearbeiten                      🇬🇧 Englisch    [KI-generiert] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Titel ─────────────────────────────────────────────────────────────┐  │
│  │  Original (DE): XY eröffnet TrackMan Indoor Golfanlage              │  │
│  │  Übersetzung:  [___________________________________________]        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Hauptinhalt ───────────────────────────────────────────────────────┐  │
│  │  ┌─ Original (DE) ─────────────┐  ┌─ Übersetzung (EN) ───────────┐  │  │
│  │  │                             │  │  [B][I][U][#][❝][CTA] | H1 H2│  │  │
│  │  │  <Read-Only HTML>           │  │  ─────────────────────────── │  │  │
│  │  │  mit CTA/Hashtag/Quote      │  │  <Tiptap Editor mit allen    │  │  │
│  │  │  Styling (nur Ansicht)      │  │   Extensions>                │  │  │
│  │  └─────────────────────────────┘  └──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Boilerplates ──────────────────────────────────────────────────────┐  │
│  │  ▼ Unternehmensprofil (boilerplate)                                 │  │
│  │    ┌─ Original ────────────┐  ┌─ Übersetzung ────────────────────┐  │  │
│  │    │ <Read-Only>           │  │ <Tiptap Editor>                  │  │  │
│  │    └───────────────────────┘  └──────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ▶ Kontakt (contact) - eingeklappt                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                    [Abbrechen]  [Vorschau]  [Speichern]    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Datenfluss

```
TranslationList.tsx
    │
    ├── translation: ProjectTranslation
    │   ├── title
    │   ├── content (HTML)
    │   ├── translatedBoilerplates[]
    │   └── campaignId
    │
    └── Modal öffnen
            │
            ▼
TranslationEditModal.tsx
    │
    ├── Props: translation, organizationId, projectId
    │
    ├── useEffect: Campaign laden via campaignId
    │   └── campaign.mainContent (Original DE)
    │   └── campaign.boilerplateSections[] (Original Boilerplates)
    │
    ├── State:
    │   ├── title (editierbar)
    │   ├── content (editierbar mit Tiptap)
    │   └── translatedBoilerplates[] (editierbar)
    │
    └── Speichern
            │
            ▼
        useUpdateTranslation()
            │
            ▼
        translationService.update()
            │
            ▼
        Firestore: organizations/{orgId}/projects/{projectId}/translations/{id}
```

---

## 3. Technische Änderungen

### 3.1 Type-Erweiterung: `UpdateTranslationInput`

**Datei:** `src/types/translation.ts`

```typescript
export interface UpdateTranslationInput {
  title?: string;
  content?: string;
  status?: TranslationStatus;
  isOutdated?: boolean;
  reviewedBy?: string;
  reviewedAt?: FlexibleTimestamp;

  // NEU: Boilerplates können jetzt auch aktualisiert werden
  translatedBoilerplates?: Array<{
    id: string;
    translatedContent: string;
    translatedTitle?: string | null;
  }>;
}
```

### 3.2 Service-Erweiterung: `translation-service.ts`

**Datei:** `src/lib/services/translation-service.ts`

Die `update()` Methode muss `translatedBoilerplates` unterstützen.

### 3.3 Neue Komponente: `TranslationEditor`

**Datei:** `src/components/campaigns/TranslationEditor.tsx`

Wiederverwendbarer Tiptap-Editor mit allen PR-Extensions:

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { CTAExtension } from '@/components/editor/CTAExtension';
import { HashtagExtension } from '@/components/editor/HashtagExtension';
import { QuoteExtension } from '@/components/editor/QuoteExtension';

interface TranslationEditorProps {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: string;
  placeholder?: string;
}

export function TranslationEditor({
  content,
  onChange,
  disabled = false,
  minHeight = '200px',
  placeholder
}: TranslationEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false, // Eigene QuoteExtension verwenden
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CTAExtension,
      HashtagExtension,
      QuoteExtension,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <TranslationEditorToolbar editor={editor} />

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* CSS für Markups */}
      <style jsx>{`
        :global(.ProseMirror [data-type="cta-text"]) {
          font-weight: bold;
          color: #000;
        }
        :global(.ProseMirror [data-type="hashtag"]) {
          color: #2563eb;
          font-weight: 600;
        }
        :global(.ProseMirror [data-type="pr-quote"]) {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          font-style: italic;
          color: #374151;
        }
      `}</style>
    </div>
  );
}
```

### 3.4 Toolbar-Komponente: `TranslationEditorToolbar`

**Datei:** `src/components/campaigns/TranslationEditorToolbar.tsx`

Toolbar mit allen Formatierungs-Buttons inkl. CTA, Hashtag, Quote:

```typescript
// Buttons: Bold, Italic, Underline, Strike | H1, H2, H3 | • 1. | Quote | # Hashtag | CTA | Undo/Redo
```

### 3.5 Read-Only HTML-Ansicht: `TranslationOriginalView`

**Datei:** `src/components/campaigns/TranslationOriginalView.tsx`

Komponente zur Anzeige des Original-HTML mit korrektem Markup-Styling:

```typescript
interface TranslationOriginalViewProps {
  html: string;
  className?: string;
}

export function TranslationOriginalView({ html, className }: TranslationOriginalViewProps) {
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### 3.6 Neues Modal: `TranslationEditModal` (Redesign)

**Datei:** `src/components/campaigns/TranslationEditModal.tsx`

Komplettes Redesign mit:
- Campaign-Daten laden (für Original-Texte)
- Side-by-Side Layout
- `TranslationEditor` für alle editierbaren Bereiche
- `TranslationOriginalView` für read-only Original
- Akkordeon für Boilerplates (Headless UI `Disclosure`)

---

## 4. Datenbedarf & Bewährtes Pattern

### 4.1 Translation (bereits vorhanden)

```typescript
interface ProjectTranslation {
  id: string;
  title?: string;
  content: string;  // Übersetzter HTML-Content
  translatedBoilerplates?: Array<{
    id: string;
    translatedContent: string;
    translatedTitle?: string | null;
  }>;
  campaignId?: string;  // Für Laden der Original-Daten
  // ...
}
```

### 4.2 Campaign (muss geladen werden)

```typescript
interface PRCampaign {
  id: string;
  title: string;           // Original-Titel (DE)
  mainContent?: string;    // Original-Content (DE)
  boilerplateSections?: Array<{
    id: string;
    type: string;          // 'boilerplate', 'contact', 'lead', 'main', 'quote'
    content: string;       // Original-Content (DE)
    customTitle?: string;
    // ...
  }>;
  // ...
}
```

### 4.3 Bewährtes Pattern: Boilerplate-Mapping aus PDF-Preview

**Referenz:** `docs/translation/07-TRANSLATION-PDF-PREVIEW-PLAN.md` (Zeilen 93-118)

Der `emailSenderService.generatePDFForTranslation()` zeigt das korrekte Mapping:

```typescript
// Aus email-sender-service.ts - BEWÄHRT und FUNKTIONIERT!
if (translation.translatedBoilerplates?.length > 0) {
  boilerplatesForPdf = translation.translatedBoilerplates.map(tb => {
    // Original-Section finden via ID-Mapping
    const originalSection = (campaign.boilerplateSections || []).find(
      s => s.id === tb.id
    );

    // Type-Mapping für Anzeige-Namen
    const typeNames: Record<string, string> = {
      'lead': 'Lead/Einleitung',
      'main': 'Haupttext',
      'quote': 'Zitat',
      'contact': 'Kontakt',
      'boilerplate': 'Unternehmensprofil',
    };

    return {
      id: tb.id,
      // Übersetzter Titel oder Original-Titel als Fallback
      displayTitle: tb.translatedTitle || originalSection?.customTitle || typeNames[originalSection?.type || ''] || 'Textbaustein',
      // Original-Content für Vergleich
      originalContent: originalSection?.content || '',
      // Übersetzter Content zum Bearbeiten
      translatedContent: tb.translatedContent,
      // Typ für Styling/Icons
      type: originalSection?.type || 'boilerplate',
    };
  });
}
```

### 4.4 Anwendung im Modal

```typescript
// TranslationEditModal.tsx - Campaign laden und Boilerplates mappen

const [campaign, setCampaign] = useState<PRCampaign | null>(null);
const [enrichedBoilerplates, setEnrichedBoilerplates] = useState<EnrichedBoilerplate[]>([]);

// Campaign laden wenn Modal öffnet
useEffect(() => {
  if (isOpen && translation?.campaignId) {
    loadCampaign(translation.campaignId);
  }
}, [isOpen, translation?.campaignId]);

const loadCampaign = async (campaignId: string) => {
  const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
  if (campaignDoc.exists()) {
    const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as PRCampaign;
    setCampaign(campaignData);

    // Boilerplates anreichern mit Original-Daten
    const enriched = (translation?.translatedBoilerplates || []).map(tb => {
      const original = campaignData.boilerplateSections?.find(s => s.id === tb.id);
      return {
        id: tb.id,
        translatedContent: tb.translatedContent,
        translatedTitle: tb.translatedTitle,
        originalContent: original?.content || '',
        originalTitle: original?.customTitle,
        type: original?.type || 'boilerplate',
        displayName: getBoilerplateDisplayName(original?.type, original?.customTitle),
      };
    });
    setEnrichedBoilerplates(enriched);
  }
};

// Helper für Anzeige-Namen
const getBoilerplateDisplayName = (type?: string, customTitle?: string): string => {
  if (customTitle) return customTitle;

  const typeNames: Record<string, string> = {
    'lead': 'Lead/Einleitung',
    'main': 'Haupttext',
    'quote': 'Zitat',
    'contact': 'Kontakt',
    'boilerplate': 'Unternehmensprofil',
  };

  return typeNames[type || ''] || 'Textbaustein';
};
```

### 4.5 Datenstruktur für angereicherte Boilerplates

```typescript
interface EnrichedBoilerplate {
  id: string;
  // Übersetzung (editierbar)
  translatedContent: string;
  translatedTitle?: string | null;
  // Original (read-only, für Vergleich)
  originalContent: string;
  originalTitle?: string;
  // Metadaten (für UI)
  type: string;
  displayName: string;
}
```

---

## 5. Implementierungsschritte

### Phase 1: Typ-Erweiterungen (30 min)
- [ ] `UpdateTranslationInput` um `translatedBoilerplates` erweitern
- [ ] `translation-service.ts` Update-Methode anpassen
- [ ] `useUpdateTranslation` Hook prüfen

### Phase 2: Editor-Komponente (1-2h)
- [ ] `TranslationEditor.tsx` erstellen
- [ ] `TranslationEditorToolbar.tsx` erstellen
- [ ] CSS für CTA/Hashtag/Quote Markups
- [ ] Testen der Markup-Erhaltung

### Phase 3: Read-Only Ansicht (30 min)
- [ ] `TranslationOriginalView.tsx` erstellen
- [ ] CSS für konsistentes Styling

### Phase 4: Modal Redesign (2-3h)
- [ ] Campaign-Daten laden (via `campaignId`)
- [ ] Side-by-Side Layout implementieren
- [ ] Titel-Bereich (Original + Input)
- [ ] Hauptinhalt-Bereich (Original + Editor)
- [ ] Boilerplates-Akkordeon
- [ ] Speichern-Logik mit Boilerplates

### Phase 5: Testing (1h)
- [ ] Markup-Erhaltung testen (CTA, Hashtag, Quote)
- [ ] Boilerplate-Speicherung testen
- [ ] Edge Cases (leere Boilerplates, fehlendes Campaign)

### Phase 6: Optional - Vorschau (1h)
- [ ] PDF-Vorschau Button
- [ ] Nutzt bestehenden `/api/translation/preview-pdf` Endpoint

---

## 6. Dateien-Übersicht

### Neue Dateien
```
src/components/campaigns/
├── TranslationEditor.tsx           # Tiptap Editor mit PR-Extensions
├── TranslationEditorToolbar.tsx    # Toolbar für den Editor
└── TranslationOriginalView.tsx     # Read-Only HTML-Ansicht
```

### Zu ändernde Dateien
```
src/types/translation.ts                    # UpdateTranslationInput erweitern
src/lib/services/translation-service.ts     # update() Methode erweitern
src/components/campaigns/TranslationEditModal.tsx  # Komplett neu
```

---

## 7. Risiken und Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Markup geht beim Editieren verloren | TranslationEditor mit allen Extensions |
| Campaign nicht gefunden | Fallback: Nur Übersetzung ohne Original-Vergleich |
| Performance bei großen Boilerplates | Lazy Loading der Akkordeon-Inhalte |
| Tiptap HTML-Output unterschiedlich | parseHTML/renderHTML konsistent halten |

---

## 8. Erfolgskriterien

- [ ] CTA-Markups (`data-type="cta-text"`) bleiben erhalten
- [ ] Hashtag-Markups (`data-type="hashtag"`) bleiben erhalten
- [ ] Quote-Markups (`data-type="pr-quote"`) bleiben erhalten
- [ ] Boilerplate-Änderungen werden gespeichert
- [ ] Original-Text ist sichtbar zum Vergleich
- [ ] Boilerplate-Typ/Name ist ersichtlich
- [ ] Rich-Text-Formatierung in allen Bereichen möglich

---

## 9. Geschätzter Aufwand

| Phase | Aufwand |
|-------|---------|
| Phase 1: Typ-Erweiterungen | 30 min |
| Phase 2: Editor-Komponente | 1-2h |
| Phase 3: Read-Only Ansicht | 30 min |
| Phase 4: Modal Redesign | 2-3h |
| Phase 5: Testing | 1h |
| Phase 6: Optional Vorschau | 1h |
| **Gesamt** | **5-8h** |

---

## 10. Nächste Schritte

1. **Review dieses Plans** durch Stakeholder
2. **Entscheidung:** Mit oder ohne Vorschau-Feature?
3. **Implementierung** nach Freigabe
