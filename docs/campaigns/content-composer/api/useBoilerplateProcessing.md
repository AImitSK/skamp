# useBoilerplateProcessing - Hook-API-Referenz

> **Hook**: useBoilerplateProcessing
> **Datei**: `src/components/pr/campaign/hooks/useBoilerplateProcessing.ts`
> **Zeilen**: 94
> **Status**: ✅ Produktiv

## Überblick

`useBoilerplateProcessing` verarbeitet Boilerplate-Sections und generiert vollständigen HTML-Content für die Pressemitteilungs-Vorschau.

### Features

- ✅ Automatische Section-Sortierung (nach order-Property)
- ✅ HTML-Content-Generierung
- ✅ Strukturierte Inhalte (lead, main, quote, boilerplate)
- ✅ Quote-Metadata-Formatting
- ✅ Automatisches Datum am Ende
- ✅ useEffect-basierte Auto-Updates
- ✅ 100% Test-Coverage (21 Tests)

## Import

```tsx
import { useBoilerplateProcessing } from '@/components/pr/campaign/hooks/useBoilerplateProcessing';
```

## Signatur

```typescript
function useBoilerplateProcessing(
  boilerplateSections: BoilerplateSection[],
  title: string,
  onFullContentChange: (content: string) => void
): string
```

## Parameter

### boilerplateSections

```typescript
boilerplateSections: BoilerplateSection[]
```

**Beschreibung:** Array von Boilerplate-Sections zur Verarbeitung.

**Format:**
```typescript
const sections: BoilerplateSection[] = [
  {
    id: 'section-1',
    type: 'lead',
    order: 0,
    content: '<p>Lead-Absatz...</p>',
    isLocked: false,
    isCollapsed: false,
  },
  {
    id: 'section-2',
    type: 'quote',
    order: 1,
    content: '<p>Das ist revolutionär.</p>',
    metadata: {
      person: 'Max Mustermann',
      role: 'CEO',
      company: 'Acme Corp'
    },
    isLocked: false,
    isCollapsed: false,
  },
];
```

**Verarbeitung:**
1. Sections nach `order` sortieren
2. Nach `type` rendern:
   - `boilerplate`: `section.boilerplate.content`
   - `lead`/`main`: `section.content`
   - `quote`: `section.content` mit Metadata-Footer

---

### title

```typescript
title: string
```

**Beschreibung:** Titel der Pressemitteilung.

**Verwendung:**
- Wird als `<h1>` am Anfang eingefügt
- Nur wenn nicht leer

**Beispiel:**
```tsx
const title = 'Neue Partnerschaft angekündigt';
// → <h1 class="text-2xl font-bold mb-4">Neue Partnerschaft angekündigt</h1>
```

---

### onFullContentChange

```typescript
onFullContentChange: (content: string) => void
```

**Beschreibung:** Callback für vollständigen HTML-Content.

**Wird aufgerufen bei:**
- Component-Mount
- `boilerplateSections` ändern
- `title` ändert

**Parameter:**
- `content`: Vollständiger HTML-String

**Beispiel:**
```tsx
const [fullContent, setFullContent] = useState('');

const processedContent = useBoilerplateProcessing(
  sections,
  title,
  setFullContent // ← Callback
);

// fullContent wird automatisch aktualisiert
console.log(fullContent); // <h1>...</h1><p>...</p>...
```

## Return-Value

```typescript
return: string
```

**Beschreibung:** Vollständig prozessierter HTML-Content.

**Format:**
```html
<h1 class="text-2xl font-bold mb-4">Titel</h1>

<p>Lead-Section-Content...</p>

<p>Main-Section-Content...</p>

<blockquote class="border-l-4 border-blue-400 pl-4 italic">
Das ist ein Zitat.
<footer class="text-sm text-gray-600 mt-2">— Max Mustermann, CEO bei Acme Corp</footer>
</blockquote>

<p>Boilerplate-Content...</p>

<p class="text-sm text-gray-600 mt-8">04. November 2025</p>
```

## Verwendung

### Basic Usage

```tsx
import { useBoilerplateProcessing } from '@/components/pr/campaign/hooks/useBoilerplateProcessing';

function MyComponent() {
  const [sections, setSections] = useState<BoilerplateSection[]>([]);
  const [title, setTitle] = useState('');
  const [fullContent, setFullContent] = useState('');

  const processedContent = useBoilerplateProcessing(
    sections,
    title,
    setFullContent
  );

  return (
    <div
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
```

### Im CampaignContentComposer

```tsx
// src/components/pr/campaign/CampaignContentComposer.tsx
export default function CampaignContentComposer({
  title,
  onFullContentChange,
  initialBoilerplateSections = []
}) {
  const [boilerplateSections, setBoilerplateSections] = useState(initialBoilerplateSections);

  // Hook-Integration
  const processedContent = useBoilerplateProcessing(
    boilerplateSections,
    title,
    onFullContentChange
  );

  return (
    <div>
      {/* Editor */}
      <IntelligentBoilerplateSection
        onContentChange={setBoilerplateSections}
        initialSections={boilerplateSections}
      />

      {/* Preview */}
      <div
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}
```

## Processing-Details

### Section-Sortierung

```typescript
// Sortiere Sections nach order-Property
const sortedSections = [...boilerplateSections].sort((a, b) =>
  (a.order ?? 0) - (b.order ?? 0)
);
```

**Beispiel:**
```tsx
const unsorted = [
  { id: '2', type: 'main', order: 2, content: 'Main' },
  { id: '1', type: 'lead', order: 0, content: 'Lead' },
  { id: '3', type: 'quote', order: 1, content: 'Quote' },
];

// Nach Sortierung: [Lead, Quote, Main]
```

### Section-Type-Rendering

**1. Boilerplate:**
```typescript
if (section.type === 'boilerplate' && section.boilerplate) {
  fullHtml += section.boilerplate.content + '\n\n';
}
```

**2. Lead/Main:**
```typescript
if (section.content) {
  fullHtml += section.content + '\n\n';
}
```

**3. Quote:**
```typescript
if (section.type === 'quote' && section.metadata) {
  fullHtml += `<blockquote class="border-l-4 border-blue-400 pl-4 italic">\n`;
  fullHtml += `${section.content}\n`;
  fullHtml += `<footer class="text-sm text-gray-600 mt-2">— ${section.metadata.person}`;
  if (section.metadata.role) fullHtml += `, ${section.metadata.role}`;
  if (section.metadata.company) fullHtml += ` bei ${section.metadata.company}`;
  fullHtml += `</footer>\n`;
  fullHtml += `</blockquote>\n\n`;
}
```

### Datum-Formatierung

```typescript
const currentDate = new Date().toLocaleDateString('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});
fullHtml += `<p class="text-sm text-gray-600 mt-8">${currentDate}</p>`;
```

**Output:** `04. November 2025`

## Beispiele

### Beispiel 1: Einfache Sections

```tsx
const sections: BoilerplateSection[] = [
  {
    id: '1',
    type: 'lead',
    order: 0,
    content: '<p>Das ist der Lead-Absatz.</p>',
    isLocked: false,
    isCollapsed: false,
  },
  {
    id: '2',
    type: 'main',
    order: 1,
    content: '<p>Das ist der Haupttext.</p>',
    isLocked: false,
    isCollapsed: false,
  },
];

const processedContent = useBoilerplateProcessing(
  sections,
  'Pressemitteilung',
  setFullContent
);

// Output:
// <h1 class="text-2xl font-bold mb-4">Pressemitteilung</h1>
// <p>Das ist der Lead-Absatz.</p>
// <p>Das ist der Haupttext.</p>
// <p class="text-sm text-gray-600 mt-8">04. November 2025</p>
```

### Beispiel 2: Mit Quote

```tsx
const sections: BoilerplateSection[] = [
  {
    id: '1',
    type: 'quote',
    order: 0,
    content: '<p>Diese Partnerschaft ist ein Meilenstein.</p>',
    metadata: {
      person: 'Max Mustermann',
      role: 'CEO',
      company: 'Acme Corporation'
    },
    isLocked: false,
    isCollapsed: false,
  },
];

const processedContent = useBoilerplateProcessing(
  sections,
  '',
  setFullContent
);

// Output:
// <blockquote class="border-l-4 border-blue-400 pl-4 italic">
// <p>Diese Partnerschaft ist ein Meilenstein.</p>
// <footer class="text-sm text-gray-600 mt-2">— Max Mustermann, CEO bei Acme Corporation</footer>
// </blockquote>
// <p class="text-sm text-gray-600 mt-8">04. November 2025</p>
```

### Beispiel 3: Mit Boilerplate

```tsx
const sections: BoilerplateSection[] = [
  {
    id: '1',
    type: 'boilerplate',
    order: 0,
    boilerplateId: 'bp-123',
    boilerplate: {
      id: 'bp-123',
      name: 'Über uns',
      content: '<h2>Über Acme Corporation</h2><p>Wir sind...</p>',
      // ...
    },
    isLocked: true,
    isCollapsed: false,
  },
];

const processedContent = useBoilerplateProcessing(
  sections,
  'Titel',
  setFullContent
);

// Output:
// <h1 class="text-2xl font-bold mb-4">Titel</h1>
// <h2>Über Acme Corporation</h2><p>Wir sind...</p>
// <p class="text-sm text-gray-600 mt-8">04. November 2025</p>
```

### Beispiel 4: Komplette Pressemitteilung

```tsx
const sections: BoilerplateSection[] = [
  {
    id: '1',
    type: 'lead',
    order: 0,
    content: '<p>Acme Corporation gibt heute eine strategische Partnerschaft bekannt.</p>',
    isLocked: false,
    isCollapsed: false,
  },
  {
    id: '2',
    type: 'main',
    order: 1,
    content: '<p>Die Partnerschaft umfasst...</p>',
    isLocked: false,
    isCollapsed: false,
  },
  {
    id: '3',
    type: 'quote',
    order: 2,
    content: '<p>Wir freuen uns auf die Zusammenarbeit.</p>',
    metadata: {
      person: 'Max Mustermann',
      role: 'CEO',
      company: 'Acme Corporation'
    },
    isLocked: false,
    isCollapsed: false,
  },
  {
    id: '4',
    type: 'boilerplate',
    order: 3,
    boilerplateId: 'bp-about',
    boilerplate: {
      id: 'bp-about',
      name: 'Über uns',
      content: '<h2>Über Acme Corporation</h2><p>Acme ist...</p>',
    },
    isLocked: true,
    isCollapsed: false,
  },
];

const processedContent = useBoilerplateProcessing(
  sections,
  'Neue Partnerschaft angekündigt',
  setFullContent
);

// Output: Vollständige Pressemitteilung mit allen Sections
```

## Best Practices

### 1. Order-Property setzen

```tsx
// ✅ RICHTIG - Explizite Order
const sections: BoilerplateSection[] = [
  { id: '1', type: 'lead', order: 0, /* ... */ },
  { id: '2', type: 'main', order: 1, /* ... */ },
  { id: '3', type: 'quote', order: 2, /* ... */ },
];

// ❌ FALSCH - Order fehlt (fallback auf 0)
const sections: BoilerplateSection[] = [
  { id: '1', type: 'lead', /* order fehlt */ },
];
```

### 2. Callback verwenden

```tsx
// ✅ RICHTIG - Parent-State aktualisieren
const [fullContent, setFullContent] = useState('');

useBoilerplateProcessing(
  sections,
  title,
  setFullContent // ← Callback
);

// fullContent wird automatisch aktualisiert

// ❌ FALSCH - Kein Callback (Parent-State nicht aktualisiert)
useBoilerplateProcessing(sections, title, () => {});
```

### 3. Quote-Metadata vollständig

```tsx
// ✅ RICHTIG - Alle Metadata-Felder
{
  type: 'quote',
  content: '<p>Zitat</p>',
  metadata: {
    person: 'Max Mustermann', // Erforderlich
    role: 'CEO',              // Optional
    company: 'Acme Corp'      // Optional
  }
}

// ⚠️ TEILWEISE - Funktioniert, aber unvollständig
{
  type: 'quote',
  content: '<p>Zitat</p>',
  metadata: {
    person: 'Max Mustermann'
    // role und company fehlen
  }
}
```

## Troubleshooting

### Problem: Sections nicht sortiert

**Symptom:** Sections in falscher Reihenfolge

**Lösung:**
```tsx
// ✅ order-Property setzen
sections.forEach((section, index) => {
  section.order = index;
});
```

### Problem: Quote ohne Metadata

**Symptom:** Quote wird als normaler Text gerendert

**Lösung:**
```tsx
// ✅ metadata hinzufügen
{
  type: 'quote',
  content: '<p>Zitat</p>',
  metadata: {
    person: 'Name', // Erforderlich!
  }
}
```

### Problem: onFullContentChange wird nicht aufgerufen

**Symptom:** Parent-State nicht aktualisiert

**Ursache:** useEffect in Hook ruft Callback auf

**Lösung:**
```tsx
// ✅ Stelle sicher dass Callback korrekt ist
const handleFullContentChange = useCallback((content: string) => {
  setFullContent(content);
}, []);

useBoilerplateProcessing(sections, title, handleFullContentChange);
```

---

**Dokumentation erstellt am:** 04. November 2025
