# KI-Bildgenerator für Key Visuals - Implementierungsplan

## Übersicht

Erweiterung der KeyVisualSection um einen KI-gestützten Bildgenerator, der aus der Pressemeldung 3 Bild-Prompt-Ideen generiert und nach Auswahl mit Google Imagen 3 ein Bild erstellt.

## Technische Spezifikationen

| Aspekt | Wert |
|--------|------|
| **Imagen Modell** | `imagen-3.0-generate-002` |
| **Kosten** | $0.03 pro Bild |
| **Bildgröße** | 1408 × 768 px (16:9) |
| **Speicherort** | Projekt > Medien > KI-Bilder |
| **UI-Muster** | Analog HeadlineGenerator |

---

## Phase 1: Genkit Flow für Prompt-Generierung

### 1.1 Schema erstellen
**Datei:** `src/lib/ai/schemas/image-generation-schemas.ts`

```typescript
// Input: Pressemeldung-Content
// Output: 3 Bildideen mit Prompt, Beschreibung, Stil
```

**Felder pro Bildidee:**
- `prompt`: Der Imagen-Prompt (englisch, optimiert)
- `description`: Deutsche Beschreibung für User
- `style`: Bildstil (z.B. "Fotorealistisch", "Business", "Konzeptuell")
- `mood`: Stimmung (z.B. "Professionell", "Innovativ", "Vertrauenswürdig")

### 1.2 Genkit Flow erstellen
**Datei:** `src/lib/ai/flows/generate-image-prompts.ts`

- Verwendet `gemini-2.5-flash` für Prompt-Generierung
- System-Prompt für PR-optimierte Bildideen
- Extrahiert Kernaussage, Branche, Tonalität aus Pressemeldung
- Generiert 3 verschiedene Bildstile

---

## Phase 2: Imagen Integration

### 2.1 Genkit Config erweitern
**Datei:** `src/lib/ai/genkit-config.ts`

```typescript
// Imagen 3 Model Definition hinzufügen
export const imagen3Model = googleAI.model('imagen-3.0-generate-002');
```

### 2.2 Bildgenerierungs-Flow erstellen
**Datei:** `src/lib/ai/flows/generate-image.ts`

- Input: Ausgewählter Prompt
- Output: Base64-Bild oder Data-URL
- Konfiguration: 16:9 Aspect Ratio, 1408×768

---

## Phase 3: API Routes

### 3.1 Prompt-Generierung API
**Datei:** `src/app/api/ai/generate-image-prompts/route.ts`

- POST mit `content` (Pressemeldung)
- Auth-Middleware
- AI Usage Limit Check
- Rückgabe: 3 Bildideen

### 3.2 Bildgenerierung API
**Datei:** `src/app/api/ai/generate-image/route.ts`

- POST mit `prompt`, `organizationId`, `projectId`
- Auth-Middleware
- AI Usage Limit Check (separate Kategorie für Bilder?)
- Generiert Bild mit Imagen
- Speichert in Firebase Storage
- Erstellt Asset in Medien > KI-Bilder
- Rückgabe: `downloadUrl`, `assetId`

---

## Phase 4: Media Service Erweiterung

### 4.1 KI-Bilder Ordner-Logik
**Datei:** `src/lib/firebase/media-folders-service.ts` (oder neuer Helper)

```typescript
/**
 * Findet oder erstellt den "KI-Bilder" Ordner im Projekt
 * Pfad: Projekt > Medien > KI-Bilder
 */
async function getOrCreateAIImagesFolder(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<string> // folderId
```

### 4.2 Asset-Upload für generierte Bilder
- Konvertiert Base64 zu File/Buffer
- Upload via `mediaService.uploadClientMedia`
- Metadata: `source: 'ai-generated'`, `generator: 'imagen-3'`, `prompt: '...'`

---

## Phase 5: UI-Komponente

### 5.1 KeyVisualGenerator erstellen
**Datei:** `src/components/pr/ai/KeyVisualGenerator.tsx`

**States:**
- `idle` - Button sichtbar
- `generating-prompts` - Spinner "Generiert Bildideen..."
- `selecting` - 3 Bildideen zur Auswahl (Dropdown/Cards)
- `generating-image` - Spinner "Generiert Bild mit KI..."
- `complete` - Bild fertig, wird als KeyVisual gesetzt

**UI-Elemente:**
- Button: "KI Bildideen" mit SparklesIcon (analog HeadlineGenerator)
- Dropdown/Modal mit 3 Optionen (deutsche Beschreibung + Stil-Badge)
- Progress-Indikator während Bildgenerierung

### 5.2 Integration in KeyVisualSection
**Datei:** `src/components/campaigns/KeyVisualSection.tsx`

- KeyVisualGenerator neben dem Platzhalter-Bereich
- Props: `pressReleaseContent`, `onImageGenerated`, `organizationId`, `projectId`, etc.

---

## Phase 6: ContentTab Integration

### 6.1 Content-Weitergabe
**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ContentTab.tsx`

- `editorContent` an KeyVisualSection weitergeben
- Neuer Prop: `pressReleaseContent={editorContent}`

---

## Dateien-Übersicht (Neu)

```
src/lib/ai/
├── schemas/
│   └── image-generation-schemas.ts       # NEU
├── flows/
│   ├── generate-image-prompts.ts         # NEU
│   └── generate-image.ts                 # NEU

src/app/api/ai/
├── generate-image-prompts/
│   └── route.ts                          # NEU
├── generate-image/
│   └── route.ts                          # NEU

src/components/pr/ai/
└── KeyVisualGenerator.tsx                # NEU

src/lib/firebase/
└── ai-images-folder-service.ts           # NEU (Helper für KI-Bilder Ordner)
```

## Dateien-Übersicht (Änderungen)

```
src/lib/ai/genkit-config.ts               # Imagen Model Export
src/components/campaigns/KeyVisualSection.tsx  # KeyVisualGenerator Integration
src/app/.../tabs/ContentTab.tsx           # pressReleaseContent Prop
```

---

## Implementierungsreihenfolge

1. **Schemas** - Zod-Definitionen für Input/Output
2. **Genkit Config** - Imagen Model hinzufügen
3. **Flow: generate-image-prompts** - 3 Bildideen aus Pressemeldung
4. **Flow: generate-image** - Imagen Bildgenerierung
5. **API: generate-image-prompts** - Endpoint für Prompt-Generierung
6. **Helper: ai-images-folder-service** - KI-Bilder Ordner Logik
7. **API: generate-image** - Endpoint für Bildgenerierung + Upload
8. **UI: KeyVisualGenerator** - React-Komponente
9. **Integration: KeyVisualSection** - Generator einbinden
10. **Integration: ContentTab** - Content-Prop weitergeben

---

## Offene Punkte

- [ ] AI Usage Tracking: Separate Kategorie für Bildgenerierung? (Wörter vs. Bilder)
- [ ] Error Handling: Was wenn Imagen das Bild ablehnt (Content Policy)?
- [ ] Retry-Logik: Bei Timeout automatisch neu versuchen?

---

## Geschätzter Aufwand

| Phase | Dateien | Komplexität |
|-------|---------|-------------|
| Phase 1 | 2 | Mittel |
| Phase 2 | 2 | Mittel |
| Phase 3 | 2 | Mittel |
| Phase 4 | 1 | Niedrig |
| Phase 5 | 1 | Hoch |
| Phase 6 | 2 | Niedrig |

**Gesamt:** ~10 Dateien, davon 8 neu
