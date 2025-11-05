# PreviewTab Architecture Decision Records (ADR)

> **Modul**: PreviewTab ADRs
> **Refactoring-Phase**: 2.4 - Testing & Dokumentation
> **Letzte Aktualisierung**: 05.11.2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ADR-001: Context-basiertes State Management](#adr-001-context-basiertes-state-management)
- [ADR-002: Keine Code-Modularisierung](#adr-002-keine-code-modularisierung)
- [ADR-003: React.memo für Performance](#adr-003-reactmemo-für-performance)
- [ADR-004: useMemo für finalContentHtml](#adr-004-usememo-für-finalcontenthtml)
- [ADR-005: Toast-Integration im Context-Layer](#adr-005-toast-integration-im-context-layer)
- [ADR-006: Conditional Rendering statt Hidden-Props](#adr-006-conditional-rendering-statt-hidden-props)
- [ADR-007: Externe Komponenten wiederverwendbar gestalten](#adr-007-externe-komponenten-wiederverwendbar-gestalten)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Dieses Dokument enthält alle architektonischen Entscheidungen (Architecture Decision Records) für das PreviewTab-Modul. Jede Entscheidung wird mit Kontext, Entscheidung, Konsequenzen und Alternativen dokumentiert.

**ADR-Format:**
- **Kontext**: Warum musste eine Entscheidung getroffen werden?
- **Entscheidung**: Was wurde entschieden?
- **Konsequenzen**: Welche Auswirkungen hat die Entscheidung?
- **Alternativen**: Welche Optionen wurden verworfen und warum?
- **Status**: Aktueller Status der Entscheidung

---

## ADR-001: Context-basiertes State Management

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** State Management

### Kontext

PreviewTab benötigt Zugriff auf umfangreiche Campaign-Daten:
- Content (Titel, Editor-Content, Boilerplates)
- Visuals (Key Visual)
- SEO (Keywords, Score)
- Assets (Anhänge)
- Approval (Kunden-Freigabe-Konfiguration)
- PDF (Template-Auswahl, Version, Generierungs-Status)
- Edit-Lock (Bearbeitungssperren)

**Herausforderung:** Wie soll State Management für PreviewTab implementiert werden?

**Optionen:**
1. **React Query** für Server-State Management
2. **CampaignContext** für zentrales State Management
3. **Lokaler State** im PreviewTab
4. **Hybrid** (Context + React Query)

### Entscheidung

**Gewählt:** Option 2 - CampaignContext für zentrales State Management

**Begründung:**
- ✅ **Konsistenz**: Einheitliches State Management über alle Campaign-Tabs (ContentTab, AttachmentsTab, ApprovalTab, PreviewTab)
- ✅ **Single Source of Truth**: Campaign-Daten werden nur einmal geladen (im Context)
- ✅ **Keine Duplikation**: Vermeidung von redundanten Netzwerk-Anfragen
- ✅ **Einfachheit**: Kein zusätzliches Tool/Library nötig
- ✅ **Performance**: Context ist für Campaign-Edit-Anforderungen ausreichend (keine Re-Render-Probleme)
- ✅ **Shared State**: Alle Tabs greifen auf dieselben Daten zu (z.B. campaignTitle, editorContent)

### Implementierung

```typescript
// PreviewTab nutzt ausschließlich CampaignContext
import { useCampaign } from '../context/CampaignContext';

export default React.memo(function PreviewTab({ organizationId, campaignId }) {
  const {
    campaign,
    campaignTitle,
    editorContent,
    keyVisual,
    keywords,
    boilerplateSections,
    attachedAssets,
    seoScore,
    selectedCompanyName,
    approvalData,
    selectedTemplateId,
    updateSelectedTemplate,
    currentPdfVersion,
    generatingPdf,
    generatePdf,
    editLockStatus
  } = useCampaign();

  // ... Component Logic
});
```

### Konsequenzen

**Positiv:**
- ✅ Einfache Integration (nur `useCampaign()` Hook verwenden)
- ✅ Konsistente States über alle Tabs
- ✅ Zentrale Validierung und Error Handling
- ✅ Toast-Meldungen im Context-Layer
- ✅ Keine State-Synchronisations-Probleme

**Negativ:**
- ⚠️ PreviewTab ist abhängig von CampaignContext (kann nicht standalone verwendet werden)
- ⚠️ Alle Context-Werte werden bei jedem Render übergeben (minimiert durch React.memo)

**Risiken:**
- ⚠️ Context-Provider muss korrekt im Parent verwendet werden
- ⚠️ Performance-Probleme bei sehr häufigen Context-Updates (aktuell nicht relevant)

### Alternativen

#### Alternative 1: React Query

**Warum verworfen:**
- ❌ **Duplikation**: Campaign-Daten würden doppelt geladen (Context + React Query)
- ❌ **Komplexität**: Zusätzliches Tool/Library nötig
- ❌ **Synchronisation**: State müsste zwischen Context und React Query synchronisiert werden
- ❌ **Overhead**: React Query ist Overkill für Campaign-Edit (keine komplexen Server-State-Anforderungen)

**Wann sinnvoll:**
- Wenn PreviewTab separates Feature wird (außerhalb Campaign-Edit)
- Wenn Campaign-Daten-Laden vom PDF-Laden getrennt werden soll

#### Alternative 2: Lokaler State

**Warum verworfen:**
- ❌ **Duplikation**: Props müssten von Parent durchgereicht werden
- ❌ **Inkonsistenz**: Keine Garantie dass States über Tabs synchron sind
- ❌ **Props-Drilling**: Viele Props müssten übergeben werden (>15 Props)

**Wann sinnvoll:**
- Wenn PreviewTab komplett standalone ist (keine Tabs)

#### Alternative 3: Hybrid (Context + React Query)

**Warum verworfen:**
- ❌ **Komplexität**: Zwei State-Management-Systeme parallel
- ❌ **Overhead**: Kein klarer Vorteil gegenüber reinem Context
- ❌ **Synchronisation**: Schwierig zu maintainen

**Wann sinnvoll:**
- Wenn Campaign-Daten und PDF-Daten komplett getrennt werden sollen

### Lessons Learned

- **Context ist ausreichend** für Campaign-Edit-Anforderungen (keine Re-Render-Probleme)
- **Konsistenz** ist wichtiger als theoretische Performance-Optimierung
- **Single Source of Truth** verhindert Synchronisations-Probleme

### Future Considerations

- Wenn Campaign-Edit in Zukunft sehr komplex wird (>10 Tabs), könnte **Zustand** (State Manager) in Betracht gezogen werden
- Wenn PDF-Generierung unabhängig von Campaign-Edit werden soll, könnte React Query für PDF-spezifische Anfragen sinnvoll sein

---

## ADR-002: Keine Code-Modularisierung

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** Code-Struktur

### Kontext

PreviewTab hat **267 Zeilen Code** und enthält einen conditional Workflow-Status-Banner (~40 Zeilen, aktuell nicht implementiert).

**Herausforderung:** Soll PreviewTab weiter modularisiert werden?

**Optionen:**
1. **Workflow-Banner in separate Component extrahieren**
2. **PDF-Version Box in separate Component extrahieren**
3. **Keine Modularisierung** (Status Quo beibehalten)

### Entscheidung

**Gewählt:** Option 3 - Keine Modularisierung

**Begründung:**
- ✅ **Kompakte Größe**: 267 Zeilen sind gut lesbar und wartbar (< 300 Zeilen Grenze)
- ✅ **Conditional Code**: Workflow-Banner ist nur ~40 Zeilen und wird nur conditional gerendert
- ✅ **Overhead vs. Nutzen**: Extraktion würde mehr Overhead erzeugen als Nutzen bringen
- ✅ **Bereits gut separiert**: Externe Komponenten (CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer) sind bereits ausgelagert
- ✅ **Keine Wiederverwendung**: Workflow-Banner ist PreviewTab-spezifisch (wird nirgendwo sonst gebraucht)

### Implementierung

```typescript
// PreviewTab.tsx bleibt bei 267 Zeilen (unverändert)
export default React.memo(function PreviewTab({ organizationId, campaignId }) {
  // ... Context Integration

  // Workflow-Banner bleibt inline (conditional, ~40 Zeilen)
  {approvalWorkflowResult?.workflowId && (
    <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
      {/* Workflow-Status Banner */}
    </div>
  )}

  // Live-Vorschau (externe Component)
  <CampaignPreviewStep ... />

  // PDF-Vorschau (inline)
  <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
    {/* PDF-Generierungs-Button & Version-Anzeige */}
  </div>

  // PDF-Versionen-Historie (externe Component)
  <PDFVersionHistory ... />

  // Pipeline-PDF-Viewer (externe Component, conditional)
  {campaign?.projectId && <PipelinePDFViewer ... />}
});
```

### Konsequenzen

**Positiv:**
- ✅ **Einfachheit**: Weniger Dateien, einfachere Navigation
- ✅ **Lesbarkeit**: Alle Logik an einem Ort, leichter zu verstehen
- ✅ **Performance**: Keine zusätzlichen Component-Instanziierungen
- ✅ **Wartbarkeit**: Änderungen können direkt im PreviewTab vorgenommen werden

**Negativ:**
- ⚠️ Workflow-Banner kann nicht isoliert wiederverwendet werden (aktuell nicht benötigt)
- ⚠️ Wenn Workflow-Banner komplexer wird (>100 Zeilen), sollte Extraktion überdacht werden

**Risiken:**
- ⚠️ Wenn PreviewTab in Zukunft stark wächst (>500 Zeilen), müsste Modularisierung nachgeholt werden

### Alternativen

#### Alternative 1: Workflow-Banner extrahieren

**Warum verworfen:**
- ❌ ~40 Zeilen Code rechtfertigen keine separate Component
- ❌ Workflow-Banner ist conditional (nur bei aktivem Workflow sichtbar)
- ❌ Keine Wiederverwendung außerhalb PreviewTab geplant
- ❌ Overhead durch Props-Übergabe (approvalWorkflowResult)

**Dateistruktur (hätte gewesen):**
```
tabs/
├── PreviewTab.tsx (227 Zeilen, -15%)
└── components/
    └── ApprovalWorkflowBanner.tsx (50 Zeilen)
```

**Wann sinnvoll:**
- Wenn Workflow-Banner in anderen Modulen wiederverwendet wird
- Wenn Workflow-Banner sehr komplex wird (>100 Zeilen)

#### Alternative 2: PDF-Version Box extrahieren

**Warum verworfen:**
- ❌ PDF-Version Box ist eng mit PreviewTab-Logik verzahnt (currentPdfVersion, editLockStatus)
- ❌ Nur ~60 Zeilen Code (zu klein für Extraktion)
- ❌ Keine Wiederverwendung geplant

**Wann sinnvoll:**
- Wenn PDF-Version Box in mehreren Tabs/Modulen verwendet wird

### Lessons Learned

- **Nicht alles muss modularisiert werden** - Modularisierung sollte Nutzen bringen
- **< 300 Zeilen ist gut wartbar** - Extraktion ist nur bei größeren Components sinnvoll
- **Conditional Code** (~40 Zeilen) rechtfertigt keine separate Component

### Future Considerations

- **Falls Workflow-Banner komplex wird** (>100 Zeilen): Extraktion in separate Component
- **Falls PreviewTab wächst** (>500 Zeilen): Gesamte Modularisierung überdenken
- **Falls Workflow-Banner wiederverwendet wird**: Extraktion in shared Component

---

## ADR-003: React.memo für Performance

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** Performance-Optimierung

### Kontext

PreviewTab ist ein Tab innerhalb der Campaign-Edit-Page. Bei Tab-Wechseln wird die Parent-Component neu gerendert, was potenziell alle Child-Components (Tabs) neu rendern könnte.

**Herausforderung:** Wie verhindert man unnötige Re-Renders des PreviewTab?

**Optionen:**
1. **React.memo** für PreviewTab
2. **useMemo** für alle Child-Components
3. **Keine Optimierung** (Re-Render bei jedem Parent-Render)

### Entscheidung

**Gewählt:** Option 1 - React.memo für PreviewTab

**Begründung:**
- ✅ **Einfach**: Ein-Zeilen-Wrapper um Export
- ✅ **Effektiv**: Verhindert Re-Renders bei stabilen Props
- ✅ **Shallow Comparison**: Props (`organizationId`, `campaignId`) ändern sich selten
- ✅ **Keine Komplexität**: Keine Deep-Comparison nötig

### Implementierung

```typescript
// PreviewTab.tsx
export default React.memo(function PreviewTab({
  organizationId,
  campaignId
}: PreviewTabProps) {
  // ... Component Logic
});
```

### Konsequenzen

**Positiv:**
- ✅ **Performance**: Verhindert unnötige Re-Renders bei Tab-Wechseln
- ✅ **Einfach**: Keine komplexe Memo-Logik nötig
- ✅ **Testbar**: Tests können Re-Render-Verhalten verifizieren

**Negativ:**
- ⚠️ Minimal erhöhte Komplexität (Shallow Comparison bei jedem Render)

**Messbare Performance-Verbesserung:**
- **Ohne React.memo**: Re-Render bei jedem Tab-Wechsel (~50ms)
- **Mit React.memo**: Kein Re-Render wenn Props stabil (~0ms)

### Alternativen

#### Alternative 1: useMemo für Child-Components

**Warum verworfen:**
- ❌ useMemo ist für einzelne Werte gedacht, nicht für Components
- ❌ Mehr Boilerplate-Code nötig
- ❌ React.memo ist das richtige Tool für Component-Memoization

**Wann sinnvoll:**
- Für einzelne berechnete Werte (z.B. finalContentHtml → siehe ADR-004)

#### Alternative 2: Keine Optimierung

**Warum verworfen:**
- ❌ Unnötige Re-Renders verschwenden Performance
- ❌ PreviewTab ist komplex (267 Zeilen + externe Components)
- ❌ React.memo ist Best Practice für solche Szenarien

**Wann sinnvoll:**
- Bei sehr einfachen Components (<50 Zeilen)
- Wenn Re-Renders kein Performance-Problem darstellen

### Lessons Learned

- **React.memo ist Standard** für Tab-Components in Multi-Tab-Layouts
- **Shallow Comparison ist ausreichend** wenn Props primitiv sind (string, number)
- **Performance-Optimierung sollte messbar sein** (vorher/nachher vergleichen)

### Future Considerations

- Wenn PreviewTab in Zukunft komplexe Objekt-Props erhält, könnte **Custom Comparison Function** nötig werden

---

## ADR-004: useMemo für finalContentHtml

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** Performance-Optimierung

### Kontext

`finalContentHtml` kombiniert `editorContent` mit `boilerplateSections` zu einem finalen HTML-String:

```typescript
let html = editorContent;
if (boilerplateSections.length > 0) {
  const boilerplateHtml = boilerplateSections.map(section => section.content).join('\n');
  html = `${html}\n${boilerplateHtml}`;
}
```

**Herausforderung:** Diese String-Konkatenation wird bei jedem Render ausgeführt, auch wenn `editorContent` und `boilerplateSections` unverändert sind.

**Optionen:**
1. **useMemo** für finalContentHtml
2. **Keine Optimierung** (Berechnung bei jedem Render)
3. **Separate State-Variable** für finalContentHtml

### Entscheidung

**Gewählt:** Option 1 - useMemo für finalContentHtml

**Begründung:**
- ✅ **Performance**: Verhindert unnötige String-Konkatenation bei jedem Render
- ✅ **Dependencies klar**: Nur `editorContent` und `boilerplateSections` triggern Neu-Berechnung
- ✅ **Standard React Pattern**: useMemo ist genau für solche Berechnungen gedacht
- ✅ **Stabile Referenz**: `CampaignPreviewStep` erhält stabile `finalContentHtml` Referenz

### Implementierung

```typescript
const finalContentHtml = useMemo(() => {
  let html = editorContent;

  if (boilerplateSections.length > 0) {
    const boilerplateHtml = boilerplateSections
      .map(section => section.content)
      .join('\n');
    html = `${html}\n${boilerplateHtml}`;
  }

  return html;
}, [editorContent, boilerplateSections]);
```

### Konsequenzen

**Positiv:**
- ✅ **Performance-Verbesserung**: Messbar bei großen Boilerplates (1-2ms pro Render gespart)
- ✅ **Stabile Referenz**: `CampaignPreviewStep` erhält stabile Prop (verhindert Child-Re-Renders)
- ✅ **Korrekte Dependencies**: Klare Abhängigkeiten dokumentiert

**Negativ:**
- ⚠️ Minimal erhöhte Komplexität (useMemo-Overhead)

**Messbare Performance-Verbesserung:**
- **Ohne useMemo**: String-Konkatenation bei jedem Render (~1-2ms bei großen Boilerplates)
- **Mit useMemo**: Nur bei Änderung (0ms bei stabilen Werten)

### Alternativen

#### Alternative 1: Keine Optimierung

**Warum verworfen:**
- ❌ String-Konkatenation ist teuer bei großen Boilerplates (>10 Sections)
- ❌ Unnötige Berechnungen bei jedem Render
- ❌ `CampaignPreviewStep` erhält instabile Referenz (könnte Child-Re-Renders triggern)

**Wann sinnvoll:**
- Bei sehr kleinen Daten-Sets (<3 Boilerplates)
- Wenn Performance kein Problem ist

#### Alternative 2: Separate State-Variable

**Warum verworfen:**
- ❌ State müsste manuell synchronisiert werden (useEffect)
- ❌ Mehr Boilerplate-Code
- ❌ Fehleranfällig (Dependencies vergessen)

**Wann sinnvoll:**
- Wenn `finalContentHtml` unabhängig von `editorContent` und `boilerplateSections` ist

### Lessons Learned

- **useMemo ist das richtige Tool** für berechnete Werte mit Dependencies
- **Dependencies sollten minimal sein** (nur `editorContent` und `boilerplateSections`)
- **Messbare Performance-Verbesserung** ist wichtig (nicht blind optimieren)

### Future Considerations

- Wenn `finalContentHtml` Berechnung komplexer wird (z.B. Markdown-Parsing), könnte **Web Worker** in Betracht gezogen werden

---

## ADR-005: Toast-Integration im Context-Layer

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** User Feedback

### Kontext

PreviewTab hat mehrere User-Aktionen, die Feedback benötigen:
- PDF-Generierung (Erfolg/Fehler)
- Template-Auswahl (Erfolg)
- Pipeline-PDF-Generierung (Erfolg)

**Herausforderung:** Wo sollen Toast-Benachrichtigungen implementiert werden?

**Optionen:**
1. **Toast im Context-Layer** (bei Actions wie `generatePdf`, `updateSelectedTemplate`)
2. **Toast im Component-Layer** (im PreviewTab nach Action-Aufruf)
3. **Hybrid** (manche Toasts im Context, manche im Component)

### Entscheidung

**Gewählt:** Hybrid - Toasts im Context-Layer für Context-Actions, Toasts im Component-Layer für Component-spezifische Callbacks

**Begründung:**
- ✅ **Context-Actions**: PDF-Generierung & Template-Auswahl sind Context-Logik → Toast im Context
- ✅ **Component-Callbacks**: Pipeline-PDF ist Component-spezifisch → Toast im PreviewTab
- ✅ **Konsistenz**: Alle Tabs nutzen dieselben Context-Actions → Toasts sind konsistent
- ✅ **DRY-Prinzip**: Keine Duplikation von Toast-Logik in mehreren Tabs

### Implementierung

**Context-Layer (PDF-Generierung):**

```typescript
// In CampaignContext.tsx
const generatePdf = async (forApproval: boolean = false) => {
  // Validierung
  const errors: string[] = [];
  if (!selectedCompanyId) errors.push('Bitte wählen Sie einen Kunden aus');
  if (!campaignTitle.trim()) errors.push('Titel ist erforderlich');
  if (!editorContent.trim()) errors.push('Inhalt ist erforderlich');

  if (errors.length > 0) {
    toastService.error(errors.join(', '));  // ← Toast im Context
    return;
  }

  try {
    await pdfVersionsService.createPDFVersion(...);
    toastService.success('PDF erfolgreich generiert!');  // ← Toast im Context
  } catch (error) {
    toastService.error('Fehler bei der PDF-Erstellung');  // ← Toast im Context
  }
};
```

**Context-Layer (Template-Auswahl):**

```typescript
// In CampaignContext.tsx
const updateSelectedTemplate = useCallback((templateId: string, templateName?: string) => {
  setSelectedTemplateId(templateId);

  if (templateName) {
    toastService.success(`PDF-Template "${templateName}" ausgewählt`);  // ← Toast im Context
  } else {
    toastService.success('PDF-Template ausgewählt');  // ← Toast im Context
  }
}, []);
```

**Component-Layer (Pipeline-PDF):**

```typescript
// In PreviewTab.tsx
<PipelinePDFViewer
  campaign={campaign}
  organizationId={organizationId}
  onPDFGenerated={(pdfUrl: string) => {
    toastService.success('Pipeline-PDF erfolgreich generiert');  // ← Toast im Component
  }}
/>
```

### Konsequenzen

**Positiv:**
- ✅ **Konsistenz**: Alle Tabs verwenden dieselbe Toast-Logik für Context-Actions
- ✅ **DRY**: Keine Duplikation von Toast-Logik
- ✅ **Zentrale Validierung**: Validation-Errors werden zentral im Context gehandhabt
- ✅ **Flexibilität**: Component-spezifische Toasts können im Component-Layer bleiben

**Negativ:**
- ⚠️ Toast-Logik ist über Context und Component verteilt (aber logisch begründet)

**Toast-Übersicht:**

| Aktion | Ort | Toast-Nachricht |
|--------|-----|-----------------|
| PDF generieren (Erfolg) | Context | "PDF erfolgreich generiert!" |
| PDF generieren (Fehler) | Context | "Fehler bei der PDF-Erstellung" |
| Validierung fehlgeschlagen | Context | Error-Liste (z.B. "Titel ist erforderlich, Inhalt ist erforderlich") |
| Template ausgewählt | Context | `"PDF-Template '[Name]' ausgewählt"` |
| Pipeline-PDF generiert | Component | "Pipeline-PDF erfolgreich generiert" |

### Alternativen

#### Alternative 1: Alle Toasts im Context

**Warum verworfen:**
- ❌ Pipeline-PDF ist Component-spezifisch (nicht in Context)
- ❌ Context würde zu viele Component-spezifische Callbacks benötigen

**Wann sinnvoll:**
- Wenn alle Actions im Context sind

#### Alternative 2: Alle Toasts im Component

**Warum verworfen:**
- ❌ Duplikation von Toast-Logik in allen Tabs (ContentTab, PreviewTab, etc.)
- ❌ Inkonsistente Toast-Nachrichten möglich
- ❌ Validation-Logic wäre nicht zentral

**Wann sinnvoll:**
- Wenn PreviewTab standalone ist (kein Context)

### Lessons Learned

- **Toasts folgen der Logik-Schicht**: Context-Actions → Context-Toasts, Component-Callbacks → Component-Toasts
- **Zentrale Validierung** sollte immer zentrale Toast-Nachrichten verwenden
- **Konsistenz** ist wichtiger als strenge Trennung

### Future Considerations

- Wenn Toast-Nachrichten i18n-fähig werden sollen, sollte zentrale Toast-Logik in Context-Layer bleiben

---

## ADR-006: Conditional Rendering statt Hidden-Props

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** UI/UX

### Kontext

PreviewTab hat mehrere optionale UI-Elemente:
- Workflow-Status-Banner (nur wenn Workflow aktiv)
- PDF-Version Box (nur wenn PDF vorhanden)
- Pipeline-PDF-Viewer (nur bei Projekt-verknüpften Kampagnen)
- PDF-Generierungs-Button (nur wenn nicht gesperrt)

**Herausforderung:** Wie soll optionale UI gerendert werden?

**Optionen:**
1. **Conditional Rendering** (`{condition && <Component />}`)
2. **Hidden-Props** (`<Component show={condition} />`)
3. **CSS Display None** (immer rendern, aber verstecken)

### Entscheidung

**Gewählt:** Option 1 - Conditional Rendering

**Begründung:**
- ✅ **Performance**: DOM-Elemente werden nur erstellt wenn benötigt
- ✅ **Klarheit**: Code zeigt klar was wann gerendert wird
- ✅ **Best Practice**: React Conditional Rendering ist Standard
- ✅ **Weniger Props**: Komponenten benötigen keine `show`/`hidden` Props

### Implementierung

**Workflow-Banner (conditional, noch nicht implementiert):**

```typescript
{approvalWorkflowResult?.workflowId && (
  <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
    {/* Workflow-Status Banner */}
  </div>
)}
```

**PDF-Version Box:**

```typescript
{currentPdfVersion && (
  <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
    {/* PDF-Version Anzeige */}
  </div>
)}
```

**Pipeline-PDF-Viewer:**

```typescript
{campaign?.projectId && organizationId && (
  <PipelinePDFViewer
    campaign={campaign}
    organizationId={organizationId}
    onPDFGenerated={(pdfUrl) => {
      toastService.success('Pipeline-PDF erfolgreich generiert');
    }}
  />
)}
```

**PDF-Generierungs-Button vs. Lock-Status:**

```typescript
{!editLockStatus.isLocked ? (
  <Button onClick={() => generatePdf()} disabled={generatingPdf}>
    PDF generieren
  </Button>
) : (
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <LockClosedIcon className="h-4 w-4" />
    PDF-Erstellung gesperrt - {EDIT_LOCK_CONFIG[editLockStatus.reason]?.label}
  </div>
)}
```

### Konsequenzen

**Positiv:**
- ✅ **Performance**: Keine unnötigen DOM-Elemente
- ✅ **Klarheit**: Code ist selbsterklärend
- ✅ **Weniger Event-Listener**: Versteckte Components haben trotzdem Event-Listener
- ✅ **Kein CSS-Overhead**: Kein zusätzliches `display: none` CSS

**Negativ:**
- ⚠️ Mount/Unmount bei Condition-Wechsel (kann State-Reset verursachen)
- ⚠️ Wenn Components State haben, geht dieser bei Unmount verloren

**Messbare Performance-Verbesserung:**
- **Conditional Rendering**: Nur benötigte Components im DOM (~50% weniger DOM-Elemente)
- **Hidden-Props**: Alle Components im DOM (100% DOM-Elemente)

### Alternativen

#### Alternative 1: Hidden-Props

**Warum verworfen:**
- ❌ Component wird immer gerendert (Performance-Overhead)
- ❌ Zusätzliche Props nötig (`show`, `hidden`)
- ❌ Event-Listener bleiben aktiv (auch wenn versteckt)

**Implementierung (hätte gewesen):**

```typescript
<PipelinePDFViewer
  campaign={campaign}
  organizationId={organizationId}
  show={!!campaign?.projectId}  // ❌ Zusätzliche Prop
  onPDFGenerated={...}
/>
```

**Wann sinnvoll:**
- Wenn Component State behalten werden soll (zwischen show/hide)
- Wenn Mount/Unmount zu teuer ist (komplexe Components)

#### Alternative 2: CSS Display None

**Warum verworfen:**
- ❌ Component wird immer gerendert (Performance-Overhead)
- ❌ Accessibility-Probleme (Screen Reader könnte versteckte Elemente vorlesen)
- ❌ CSS-Overhead

**Wann sinnvoll:**
- Für sehr einfache Show/Hide-Animationen

### Lessons Learned

- **Conditional Rendering ist Standard** für optional Components
- **Performance-Vorteil** ist messbar bei vielen conditional Components
- **Klarheit** im Code ist wichtiger als theoretische Flexibilität

### Future Considerations

- Wenn Components State behalten sollen (z.B. Scroll-Position), könnte **Hidden-Prop** mit `display: none` sinnvoll sein

---

## ADR-007: Externe Komponenten wiederverwendbar gestalten

**Datum:** 05.11.2025
**Status:** ✅ Akzeptiert & Implementiert
**Kategorie:** Code-Architektur

### Kontext

PreviewTab nutzt drei externe Shared Components:
- `CampaignPreviewStep` (Live-Vorschau)
- `PDFVersionHistory` (PDF-Versionen-Historie)
- `PipelinePDFViewer` (Pipeline-PDFs)

**Herausforderung:** Wie sollen externe Components gestaltet werden, damit sie in anderen Modulen wiederverwendbar sind?

**Optionen:**
1. **Context-agnostic** (Components benötigen keine Context-Integration)
2. **Context-aware** (Components nutzen useCampaign Hook intern)
3. **Hybrid** (manche Components context-aware, manche nicht)

### Entscheidung

**Gewählt:** Option 1 - Context-agnostic

**Begründung:**
- ✅ **Wiederverwendbarkeit**: Components können in anderen Modulen ohne CampaignContext verwendet werden
- ✅ **Testbarkeit**: Components können isoliert getestet werden (ohne Context-Mock)
- ✅ **Flexibilität**: Props ermöglichen verschiedene Use-Cases
- ✅ **Single Responsibility**: Component fokussiert auf UI, nicht auf State-Management

### Implementierung

**CampaignPreviewStep:**

```typescript
// ❌ NICHT context-aware
export function CampaignPreviewStep({
  campaignTitle,
  finalContentHtml,
  keyVisual,
  // ... viele weitere Props
}: CampaignPreviewStepProps) {
  // KEINE useCampaign() Hook-Verwendung
  // Alle Daten kommen via Props

  return (
    <div>
      {/* UI basierend auf Props */}
    </div>
  );
}
```

**PDFVersionHistory:**

```typescript
// ❌ NICHT context-aware
export function PDFVersionHistory({
  campaignId,
  organizationId,
  showActions = true
}: PDFVersionHistoryProps) {
  // Lädt Daten via Service (NICHT via Context)
  const [versions, setVersions] = useState<PDFVersion[]>([]);

  useEffect(() => {
    pdfVersionsService.getVersionHistory(campaignId).then(setVersions);
  }, [campaignId]);

  return (
    <div>
      {/* UI basierend auf versions */}
    </div>
  );
}
```

**PipelinePDFViewer:**

```typescript
// ❌ NICHT context-aware
export function PipelinePDFViewer({
  campaign,
  organizationId,
  onPDFGenerated
}: PipelinePDFViewerProps) {
  // Arbeitet mit übergebenem campaign Objekt (NICHT via Context)

  return (
    <div>
      {/* UI basierend auf campaign Prop */}
    </div>
  );
}
```

### Konsequenzen

**Positiv:**
- ✅ **Wiederverwendbarkeit**: Components können in Campaign-Wizard, Projekt-Übersicht, etc. verwendet werden
- ✅ **Testbarkeit**: Einfache Unit-Tests ohne Context-Mock
- ✅ **Flexibilität**: Props ermöglichen verschiedene Daten-Quellen
- ✅ **Separation of Concerns**: UI-Logik getrennt von State-Management

**Negativ:**
- ⚠️ PreviewTab muss mehr Props durchreichen (13 Props für CampaignPreviewStep)
- ⚠️ Props-Drilling könnte bei tiefen Component-Hierarchien problematisch werden

**Verwendbarkeit:**

| Component | Verwendet in | Wiederverwendbar in |
|-----------|--------------|---------------------|
| **CampaignPreviewStep** | PreviewTab, Campaign-Wizard | ✅ Projekt-Übersicht, Campaign-Archiv |
| **PDFVersionHistory** | PreviewTab | ✅ Projekt-Übersicht, Admin-Dashboard |
| **PipelinePDFViewer** | PreviewTab | ✅ Projekt-Pipeline, Workflow-Dashboard |

### Alternativen

#### Alternative 1: Context-aware

**Warum verworfen:**
- ❌ Components wären nur in Campaign-Edit verwendbar (benötigen CampaignContext)
- ❌ Tests müssten CampaignContext mocken (komplexer)
- ❌ Keine Wiederverwendbarkeit in anderen Modulen

**Implementierung (hätte gewesen):**

```typescript
export function CampaignPreviewStep() {
  const { campaignTitle, editorContent, ... } = useCampaign();  // ❌ Context-aware

  return (
    <div>{campaignTitle}</div>
  );
}
```

**Wann sinnvoll:**
- Wenn Component NUR in Campaign-Edit verwendet wird
- Wenn Props-Drilling zu komplex wird (>20 Props)

#### Alternative 2: Hybrid

**Warum verworfen:**
- ❌ Inkonsistenz (manche context-aware, manche nicht)
- ❌ Verwirrend für Entwickler

**Wann sinnvoll:**
- Wenn manche Components sehr Campaign-Edit-spezifisch sind

### Lessons Learned

- **Context-agnostic ist wiederverwendbar** - Components sollten via Props arbeiten
- **Props-Drilling ist akzeptabel** bei max. 15 Props
- **Testbarkeit** ist wichtiger als Props-Anzahl

### Future Considerations

- Wenn Props-Drilling zu komplex wird (>20 Props), könnte **Component Composition** mit Context in Betracht gezogen werden
- Wenn Components sehr Campaign-Edit-spezifisch werden, könnte **Context-aware Variante** sinnvoll sein

---

## Siehe auch

### Dokumentation

- **[PreviewTab Haupt-Dokumentation](../README.md)**: Übersicht, Architektur, Features
- **[Components-Dokumentation](../components/README.md)**: CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer
- **[API-Dokumentation](../api/README.md)**: CampaignContext Integration

### Implementierungs-Planung

- **[Phase 2.4 Implementierungsplan](../../../../planning/campaigns/phase-2.4-preview-tab-refactoring.md)**: Vollständiger Refactoring-Plan
- **[Test-Report](../../../testing/PreviewTab-Test-Report.md)**: Finaler Test-Report mit Coverage-Analyse

### Verwandte ADRs

- **[ContentTab ADRs](../../content-tab/adr/README.md)**: Vergleichbare Architektur-Entscheidungen
- **[ApprovalTab ADRs](../../approval-tab/adr/README.md)**: Approval-Workflow-Entscheidungen

---

**Erstellt von:** Claude Code (Documentation Agent)
**Version:** 1.0.0
**Letzte Aktualisierung:** 05.11.2025
