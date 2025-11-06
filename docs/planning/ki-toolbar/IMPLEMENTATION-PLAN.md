# KI-Toolbar Refactoring - Implementierungsplan

**Datum:** 2025-11-06
**Status:** Planning
**Ziel:** Format-preserving Text-Transformationen + Kontext-aware Custom-Actions

---

## 1. Überblick

### Aktuelle UI-Komponente
**Datei:** `src/components/FixedAIToolbar.tsx`
- Fixed Toolbar oben am Editor (nicht floating)
- 5 Action-Buttons: Umformulieren, Kürzen, Erweitern, Ausformulieren, Ton ändern
- Custom-Input-Field unten für freie Anweisungen
- useFullDocument Logic bereits teilweise vorhanden

### Problem (Aktuell)
- ❌ **Formatierung geht verloren** (fett → normal, CTA/Hashtags weg)
  - Grund: `parseTextFromAIOutput` (Zeilen 71-122) entfernt ALLE HTML/Markdown-Tags
- ❌ **Struktur kollabiert** (2 Absätze → 1 Absatz)
- ❌ **Custom-Marker verschwinden** (`[[CTA: ...]]`, `[[HASHTAGS: ...]]`)
- ❌ **Custom-Action inkonsistent:**
  - Sendet zwar `fullDocument` (Zeile 437)
  - Aber arbeitet mit `textToProcess` (Selektion ODER ganzer Text)
  - Sollte: IMMER auf ganzem Text arbeiten

### Lösung (Neu)
- ✅ **Pre/Post-Processing:** Formatierung extrahieren → Gemini transformiert → Formatierung wiederherstellen
- ✅ **Formalize (statt elaborate):** Rohentwurf → Strukturierte PR via generate-press-release-structured
- ✅ **Custom konsequent:** Immer ganzer Text + Anweisung, unabhängig von Selektion
- ✅ **Format-Preservation Helper:** Ersetzt `parseTextFromAIOutput` durch intelligente Formatierungs-Erhaltung

---

## 2. Actions-Übersicht

| Action | Wording | Verhalten | Pipeline |
|--------|---------|-----------|----------|
| `rephrase` | Umformulieren | Synonyme ersetzen, markierter Text | Pre/Post |
| `shorten` | Kürzen | 30% kürzer, markierter Text | Pre/Post |
| `expand` | Erweitern | 50% länger, markierter Text | Pre/Post |
| `formalize` | Ausformulieren | Rohentwurf → Strukturierte PR | generate-press-release-structured |
| `change-tone` | Ton ändern | Tonalität ändern, markierter Text | Pre/Post |
| `custom` | Anweisung | Freie Instruktion, **GANZER TEXT** | Kontext-aware |

---

## 3. Pre/Post-Processing Pipeline

### 3.1 Konzept

```typescript
// INPUT: Formatierter Text
"Die **IBD Wickeltechnik** startet [[CTA: Mehr erfahren]]"

// STEP 1: Extract Formatting
{
  plainText: "Die IBD Wickeltechnik startet Mehr erfahren",
  formatMap: [
    {start: 4, end: 19, type: "bold"},
    {start: 28, end: 51, type: "cta", marker: "[[CTA: Mehr erfahren]]"}
  ]
}

// STEP 2: Gemini Transform (Plain Text)
"Das Unternehmen IBD Wickeltechnik beginnt Weitere Infos"

// STEP 3: Re-apply Formatting (intelligent mapping)
"Das Unternehmen **IBD Wickeltechnik** beginnt [[CTA: Weitere Infos]]"
```

### 3.2 Format-Typen

| Format-Typ | Erkennung | Beispiel |
|------------|-----------|----------|
| Bold | `**text**` oder `<strong>` | `**IBD Wickeltechnik**` |
| Italic | `*text*` oder `<em>` | `*wichtig*` |
| CTA | `[[CTA: ...]]` oder `<span data-type="cta-text">` | `[[CTA: Mehr]]` |
| Hashtag | `[[HASHTAGS: ...]]` oder `<span data-type="hashtag">` | `[[HASHTAGS: #PR]]` |
| Quote | `"..."` oder `<blockquote data-type="pr-quote">` | `"Zitat", sagt Name` |
| Paragraph | `\n\n` oder `<p>` | Absatz-Trennung |

### 3.3 Implementierung

**Datei:** `src/lib/ai/helpers/format-preserving-transform.ts`

```typescript
interface FormatMarker {
  start: number;
  end: number;
  type: 'bold' | 'italic' | 'cta' | 'hashtag' | 'quote' | 'paragraph';
  originalText: string;
  metadata?: Record<string, any>;
}

interface FormatExtraction {
  plainText: string;
  formatMap: FormatMarker[];
}

// 1. Extrahieren
export function extractFormatting(text: string): FormatExtraction {
  // Regex für alle Format-Typen
  // Position tracken
  // FormatMap erstellen
}

// 2. Intelligent Re-mapping nach Transform
export function applyFormatting(
  transformedText: string,
  originalText: string,
  formatMap: FormatMarker[]
): string {
  // Word-Alignment zwischen original & transformed
  // Formatierung auf neue Positionen mappen
  // Edge-Cases: gelöschte/hinzugefügte Wörter
}

// 3. Main Transform Function
export async function transformWithFormatting(
  text: string,
  action: TransformAction,
  options?: TransformOptions
): Promise<string> {
  // Extract
  const {plainText, formatMap} = extractFormatting(text);

  // Transform (Gemini auf Plain Text)
  const transformed = await geminiTransform(plainText, action, options);

  // Re-apply
  const formatted = applyFormatting(transformed, plainText, formatMap);

  return formatted;
}
```

---

## 4. Formalize (Sonderfall)

### 4.1 Use-Case

**Input:** Roher Entwurf vom User
```
IBD macht jetzt Antistatik mit Bonato.
Seit 1993 aktiv.
DACH-Region exklusiv.
Dennis Hermann findet es gut.
```

**Output:** Strukturierte PR
```
Headline: IBD Wickeltechnik startet exklusive Partnerschaft mit Bonato

**Bad Oeynhausen, 6. November 2024 – IBD Wickeltechnik GmbH, seit 1993
führender Experte für Bahnverarbeitung, verkündet eine strategische
Partnerschaft mit Bonato für Antistatik-Systeme in der DACH-Region.**

[3-4 ausformulierte Absätze]

"Diese Partnerschaft ist ein wichtiger Schritt für IBD", sagt Dennis Hermann,
Geschäftsführer der IBD Wickeltechnik GmbH.

[[CTA: Weitere Informationen unter ibd-wickeltechnik.de]]

[[HASHTAGS: #Antistatik #Bahnverarbeitung #IBDWickeltechnik]]
```

### 4.2 Implementierung

**Nutzt existierenden Flow:**
```typescript
// src/lib/ai/flows/text-transform.ts

case 'formalize': {
  // Nutze generate-press-release-structured Flow
  const prResult = await generatePressReleaseStructured({
    inputText: text,
    industry: 'general', // oder aus Kontext ableiten
    tone: 'professional',
    audience: 'b2b',
    documents: [] // optional
  });

  // Konvertiere strukturierte PR zu Editor-Format
  return formatStructuredPRForEditor(prResult);
}
```

**Neue Helper-Funktion:**
```typescript
// src/lib/ai/helpers/pr-formatter.ts

export function formatStructuredPRForEditor(pr: StructuredPressRelease): string {
  return `
${pr.headline}

**${pr.lead}**

${pr.paragraphs.join('\n\n')}

"${pr.quote.text}", sagt ${pr.quote.attribution}.

[[CTA: ${pr.cta}]]

[[HASHTAGS: ${pr.hashtags.join(' ')}]]
`.trim();
}
```

---

## 5. Custom mit Kontext-Aware

### 5.1 Problem gelöst

**UX-Problem:** Selektion geht verloren beim Klick ins Input-Field

**Lösung:** Custom arbeitet immer auf **GANZEM TEXT** + Anweisung

### 5.2 Use-Case Beispiele

**Beispiel 1: Lokale Änderung**
```
Ganzer Text: [3 Absätze PR]

Custom-Anweisung: "Füge im letzten Absatz etwas über 34KL Bauteile hinzu"

→ Gemini findet letzten Absatz
→ Fügt Info über 34KL Bauteile ein
→ Rest bleibt unverändert
```

**Beispiel 2: Strukturelle Änderung**
```
Ganzer Text: [PR mit CTA]

Custom-Anweisung: "Entferne den CTA-Block, formuliere es zu normalem Text um"

→ Gemini findet CTA
→ Wandelt um zu normaler Text
→ Rest bleibt unverändert
```

**Beispiel 3: Globale Änderung**
```
Ganzer Text: [PR mit Firmennamen "IBD"]

Custom-Anweisung: "Ersetze überall 'IBD' durch 'IBD Wickeltechnik GmbH'"

→ Gemini ersetzt alle Vorkommen
→ Struktur bleibt erhalten
```

### 5.3 Implementierung

**Prompt-Anpassung:**
```typescript
// src/lib/ai/flows/text-transform.ts

custom: {
  withFullContext: (fullText: string, instruction: string) => ({
    system: `Du bist ein präziser Text-Editor. Du bekommst einen GESAMTEN Text
und eine spezifische Anweisung.

WICHTIG - FORMATIERUNG BEIBEHALTEN:
- **fett** bleibt **fett**
- [[CTA: ...]] bleibt [[CTA: ...]]
- [[HASHTAGS: ...]] bleiben [[HASHTAGS: ...]]
- "Zitate" mit Attribution bleiben erhalten
- Absatz-Struktur beibehalten

AUFGABE:
1. Verstehe den Gesamttext
2. Finde die relevante Stelle für die Anweisung
3. Führe die Anweisung präzise aus
4. Ändere NUR was nötig ist
5. Behalte alle Formatierungen bei

BEISPIELE:
Anweisung: "Füge im letzten Absatz etwas über 34KL Bauteile hinzu"
→ Finde letzten Absatz, füge Info ein, Rest unverändert

Anweisung: "Entferne den CTA"
→ Finde [[CTA: ...]], entferne oder formuliere um, Rest unverändert

Antworte mit dem KOMPLETTEN angepassten Text!`,
    user: `GESAMTER TEXT:\n${fullText}\n\nANWEISUNG:\n${instruction}`
  })
}
```

**Hinweis:** Custom nutzt KEINE Pre/Post-Pipeline, da Gemini die Formatierung selbst beibehalten soll (laut Prompt).

**Fallback:** Falls Formatierung verloren geht → Pre/Post-Processing aktivieren

---

## 6. Schema-Änderungen

### 6.1 TransformAction Enum

**Datei:** `src/lib/ai/schemas/text-transform-schemas.ts`

```typescript
// Alt:
export const TransformActionEnum = z.enum([
  'rephrase',
  'shorten',
  'expand',
  'elaborate',  // ❌ umbenennen
  'change-tone',
  'custom'
]);

// Neu:
export const TransformActionEnum = z.enum([
  'rephrase',
  'shorten',
  'expand',
  'formalize',  // ✅ statt elaborate
  'change-tone',
  'custom'
]);
```

### 6.2 Input Schema

```typescript
export const TextTransformInputSchema = z.object({
  text: z.string(),
  action: TransformActionEnum,
  tone: ToneEnum.nullish(),
  instruction: z.string().nullish(),
  fullDocument: z.string().nullish(),  // Für Custom: ganzer Editor-Content
});
```

---

## 7. API Route Anpassungen

**Datei:** `src/app/api/ai/text-transform/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const { text, action, tone, instruction, fullDocument } = await req.json();

    // Custom: Nutze fullDocument statt text
    const inputText = action === 'custom' && fullDocument
      ? fullDocument
      : text;

    const result = await textTransformFlow({
      text: inputText,
      action,
      tone,
      instruction,
      fullDocument: action === 'custom' ? null : fullDocument
    });

    // ...
  });
}
```

---

## 8. Frontend-Änderungen

### 8.1 FixedAIToolbar (Aktuelle UI)

**Datei:** `src/components/FixedAIToolbar.tsx`

**Status:** ✅ Grundstruktur bereits vorhanden
- Fixed Toolbar oben (nicht floating)
- 5 Action-Buttons + Custom-Input-Field
- useFullDocument Logic bereits implementiert

**Änderungen notwendig:**

#### 8.1.1 Custom-Instruction: Immer auf ganzem Text
**Aktuell (Zeilen 427-428):**
```typescript
const textToProcess = selectedText.length > 0 ? selectedText : editor.getText();
```

**Neu:**
```typescript
// Custom arbeitet IMMER auf ganzem Text, unabhängig von Selektion
const textToProcess = editor.getText(); // ✅ Immer ganzer Text
const fullDocument = editor.getHTML(); // ✅ Für Kontext
```

**Grund:** User gibt Anweisung wie "Füge im letzten Absatz etwas hinzu" → Gemini soll ganzen Text sehen

---

#### 8.1.2 Parsing Functions ersetzen
**Problem:** `parseTextFromAIOutput` (Zeilen 71-122) entfernt ALLE Formatierung

**Aktuell:**
```typescript
text = text.replace(/<\/?strong[^>]*>/gi, ''); // ❌ Fett weg
text = text.replace(/\*\*(.*?)\*\*/g, '$1');   // ❌ Markdown weg
```

**Neu:** Ersetze durch Format-Preservation Helper
```typescript
import { applyFormatPreservation } from '@/lib/ai/helpers/format-preserving-transform';

// Statt parseTextFromAIOutput:
const result = await applyFormatPreservation(
  data.generatedText,
  originalText,
  action
);
```

---

#### 8.1.3 elaborate → formalize Umbenennung

**Zeile 134:** AIAction Type
```typescript
// Alt:
export type AIAction =
  | 'rephrase'
  | 'shorten'
  | 'expand'
  | 'change-tone'
  | 'elaborate';  // ❌

// Neu:
export type AIAction =
  | 'rephrase'
  | 'shorten'
  | 'expand'
  | 'change-tone'
  | 'formalize';  // ✅
```

**Zeile 229-241:** Action Handler
```typescript
// Alt:
case 'elaborate':
  systemPrompt = `Du bist ein professioneller Text-Creator...`;
  userPrompt = `Führe diese Anweisung aus:\n\n${text}`;
  break;

// Neu:
case 'formalize':
  // Rufe generate-press-release-structured auf
  return await generateStructuredPR(text);
```

**Zeile 524:** Button
```typescript
<button
  onClick={() => executeAction('formalize')}  // ✅ Statt 'elaborate'
  title="Ausformulieren (Rohentwurf → Strukturierte PR)"
>
  <DocumentTextIcon className="h-4 w-4" />
  <span>Ausformulieren</span>
</button>
```

---

#### 8.1.4 Format-Preservation Integration

**Zeilen 392-410:** Ersetze Plain-Text-Einsetzung durch Format-Aware

**Alt:**
```typescript
const plainText = parseTextFromAIOutput(newText);
editor.view.dispatch(
  editor.view.state.tr
    .replaceSelectionWith(editor.state.schema.text(plainText), false)
);
```

**Neu:**
```typescript
import { preserveFormatting } from '@/lib/ai/helpers/format-preserving-transform';

// Format-Preservation anwenden
const formatted = await preserveFormatting({
  original: selectedText,
  transformed: newText,
  action: action
});

// Als HTML einfügen (behält Formatierung)
editor.chain()
  .setTextSelection({ from, to })
  .insertContent(formatted)
  .run();
```

---

### 8.2 Custom-Input Placeholder

**Zeile 593:**
```typescript
// Alt:
placeholder="z.B. Das ist mir zu langweilig. Schreib das werblicher."

// Neu (zeigt Kontext-Awareness):
placeholder="z.B. Füge im letzten Absatz etwas über 34KL Bauteile hinzu"
```

---

### 8.3 Button-Labels (bereits korrekt!)

✅ Keine Änderungen nötig, Labels sind bereits passend:
- Umformulieren
- Kürzen
- Erweitern
- Ausformulieren (wird zu formalize)
- Ton ändern
- Anweisung (Custom-Input)

---

## 9. Implementierungsschritte

### Phase 1: Format-Preservation Basics
**Ziel:** Pre/Post-Pipeline funktioniert

- [ ] **Step 1.1:** Format-Extraction implementieren
  - Datei: `src/lib/ai/helpers/format-preserving-transform.ts`
  - Funktion: `extractFormatting(text: string)`
  - Erkennt: `**bold**`, `[[CTA: ...]]`, `[[HASHTAGS: ...]]`, Paragraphs

- [ ] **Step 1.2:** Format-Application implementieren
  - Funktion: `applyFormatting(transformed, original, formatMap)`
  - Word-Alignment-Algorithmus
  - Handle Edge-Cases (deleted/added words)

- [ ] **Step 1.3:** Main Transform Function
  - Funktion: `transformWithFormatting(text, action, options)`
  - Integration mit Gemini
  - Error-Handling

- [ ] **Step 1.4:** Unit-Tests
  - Datei: `src/lib/ai/helpers/__tests__/format-preserving-transform.test.ts`
  - Test: Formatierung bleibt erhalten
  - Test: Struktur bleibt erhalten
  - Test: Edge-Cases (empty, only formatting, etc.)

**Schätzung:** 4-6 Stunden

---

### Phase 2: Integration in text-transform Flow
**Ziel:** Rephrase, Shorten, Expand, Change-Tone nutzen Pre/Post

- [ ] **Step 2.1:** text-transform.ts Refactoring
  - Import `transformWithFormatting`
  - Wrapper für Actions: rephrase, shorten, expand, change-tone
  - Behalte Original-Prompts

- [ ] **Step 2.2:** Schema-Update
  - `elaborate` → `formalize` in Enum
  - Migration-Script für existierende Daten (falls nötig)

- [ ] **Step 2.3:** API Route Update
  - Handle `fullDocument` Parameter
  - Special handling für Custom-Action

- [ ] **Step 2.4:** Integration-Tests
  - Test mit MCP: `mcp__genkit__run_flow`
  - Alle 6 Actions durchlaufen
  - Verify: Formatierung erhalten

**Schätzung:** 3-4 Stunden

---

### Phase 3: Formalize Implementation
**Ziel:** Rohentwurf → Strukturierte PR

- [ ] **Step 3.1:** PR-Formatter Helper
  - Datei: `src/lib/ai/helpers/pr-formatter.ts`
  - Funktion: `formatStructuredPRForEditor(pr: StructuredPressRelease)`
  - Konvertiert zu Editor-Format mit Markern

- [ ] **Step 3.2:** Formalize-Action in text-transform.ts
  - Rufe `generatePressReleaseStructured` auf
  - Konvertiere Output mit `formatStructuredPRForEditor`
  - Error-Handling

- [ ] **Step 3.3:** Tests
  - Input: Roher Entwurf
  - Output: Strukturierte PR mit allen Markern
  - Verify: `[[CTA: ...]]`, `[[HASHTAGS: ...]]` vorhanden

**Schätzung:** 2-3 Stunden

---

### Phase 4: Custom Kontext-Aware
**Ziel:** Custom arbeitet auf ganzem Text

- [ ] **Step 4.1:** Prompt-Anpassung
  - Neue Prompt-Variante: `custom.withFullContext`
  - Instruktionen für Formatierungs-Erhaltung
  - Beispiele für lokale/globale Änderungen

- [ ] **Step 4.2:** Frontend-Integration
  - Custom-Action: Sende `fullDocument`
  - Ersetze ganzen Editor-Content nach Transform
  - UI-Feedback: "Analysiere Text..."

- [ ] **Step 4.3:** Testing mit realen Use-Cases
  - "Füge im letzten Absatz ... hinzu"
  - "Entferne CTA"
  - "Ersetze alle X mit Y"

**Schätzung:** 2-3 Stunden

---

### Phase 5: Frontend UI-Updates
**Ziel:** FixedAIToolbar.tsx anpassen

**Status:** ✅ Grundstruktur bereits vorhanden, nur Anpassungen nötig

- [ ] **Step 5.1:** Custom-Instruction Logic ändern
  - Zeile 427: `textToProcess` immer auf `editor.getText()`
  - Zeile 437: `fullDocument` immer mitsenden
  - Zeile 442-455: Immer ganzen Content ersetzen

- [ ] **Step 5.2:** AIAction Type updaten
  - Zeile 134: `elaborate` → `formalize`
  - Zeile 229-241: formalize Handler implementieren
  - Zeile 524: Button onClick auf `formalize` ändern

- [ ] **Step 5.3:** Parsing Functions ersetzen
  - Zeilen 71-122: `parseTextFromAIOutput` als Fallback behalten
  - Zeilen 392-410: Format-Preservation Helper integrieren
  - Import: `import { preserveFormatting } from '@/lib/ai/helpers/format-preserving-transform'`

- [ ] **Step 5.4:** Custom-Input Placeholder
  - Zeile 593: Placeholder zu "z.B. Füge im letzten Absatz etwas über 34KL Bauteile hinzu"

- [ ] **Step 5.5:** Tooltips
  - Zeile 452: "Ausformulieren (Rohentwurf → Strukturierte PR)"

**Schätzung:** 2 Stunden (reduziert, da UI bereits existiert)

---

### Phase 6: Testing & Dokumentation
**Ziel:** Production-ready

- [ ] **Step 6.1:** End-to-End Tests
  - Alle 6 Actions durchlaufen
  - Mit verschiedenen Text-Inputs
  - Mit/ohne Formatierung
  - Mit/ohne Kontext

- [ ] **Step 6.2:** Performance-Tests
  - Token-Usage messen
  - Response-Zeiten
  - Error-Rate

- [ ] **Step 6.3:** Dokumentation
  - User-Guide: Wie nutze ich Custom?
  - Developer-Docs: Format-Preservation-Algorithmus
  - genkit-integration-learnings.md updaten

**Schätzung:** 2-3 Stunden

---

## 10. Gesamt-Zeitschätzung

| Phase | Stunden | Abhängigkeiten | Status |
|-------|---------|----------------|--------|
| Phase 1: Format-Preservation | 4-6 h | - | ⏸️ Neu |
| Phase 2: Integration | 3-4 h | Phase 1 | ⏸️ Neu |
| Phase 3: Formalize | 2-3 h | Phase 2 | ⏸️ Neu |
| Phase 4: Custom Kontext | 2-3 h | Phase 2 | ⏸️ Neu |
| Phase 5: Frontend UI | 2 h | Phase 3, 4 | ✅ Basis vorhanden |
| Phase 6: Testing & Docs | 2-3 h | Phase 5 | ⏸️ Neu |

**Gesamt:** 15-21 Stunden (2-3 Arbeitstage)

**Anmerkung:** Phase 5 reduziert, da FixedAIToolbar.tsx bereits existiert und funktionstüchtig ist

---

## 11. Risiken & Mitigations

### Risiko 1: Format-Mapping bei stark geändertem Text
**Problem:** Text wird um 50% gekürzt → Formatierungs-Positionen passen nicht mehr

**Mitigation:**
- Word-Alignment-Algorithmus (ähnlich Diff-Algorithmus)
- Falls Mapping fehlschlägt: Fallback auf Plain Text (mit Warning)

### Risiko 2: Gemini hält sich nicht an Format-Anweisungen (Custom)
**Problem:** Custom soll Formatierung beibehalten, aber Gemini ignoriert es

**Mitigation:**
- Fallback: Nutze Pre/Post-Processing auch für Custom
- A/B-Testing: Mit/ohne Pre/Post vergleichen

### Risiko 3: Token-Limit bei fullDocument
**Problem:** Custom sendet ganzen Text → kann sehr lang sein → Token-Limit

**Mitigation:**
- Max-Length-Check im Frontend (z.B. 10.000 Zeichen)
- Smart-Chunking: Nur relevanten Teil senden (z.B. "letzter Absatz")

### Risiko 4: Performance-Degradation
**Problem:** Pre/Post-Processing kostet Extra-Zeit

**Mitigation:**
- Optimize Regex-Matching
- Cache Format-Maps wo möglich
- Async-Processing

---

## 12. Erfolgs-Kriterien

### Must-Have
- ✅ Formatierung bleibt erhalten (bold, CTA, Hashtags)
- ✅ Struktur bleibt erhalten (Absätze, Quotes)
- ✅ Formalize generiert vollständige PR
- ✅ Custom arbeitet auf ganzem Text
- ✅ Alle 6 Actions funktionieren in Production

### Nice-to-Have
- ✅ Performance < 10 Sekunden pro Transform
- ✅ Token-Usage Reduktion (durch Plain Text)
- ✅ User-Feedback: "Formatierung bleibt erhalten" (5/5)

---

## 13. Nächste Schritte

1. **Review diesen Plan** mit Team/Stakeholder
2. **Phase 1 starten:** Format-Preservation Basics
3. **Daily Testing:** Nach jeder Phase mit realen Daten testen
4. **Iterativ anpassen:** Falls Probleme auftauchen, Plan updaten

---

**Erstellt:** 2025-11-06
**Autor:** Claude Code
**Status:** Ready for Review
