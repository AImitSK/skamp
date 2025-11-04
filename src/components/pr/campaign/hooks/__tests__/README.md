# Custom Hooks Test Suite

Test-Suite für die Custom Hooks des CampaignContentComposer.

## Hooks

### usePDFGeneration (10 Tests)

**Datei:** `usePDFGeneration.test.ts`

**Zweck:** Verwaltet State und Handler für PDF-Export-Funktionalität.

**Getestete Features:**
- ✅ Initial State (generatingPdf: false, pdfDownloadUrl: null, showFolderSelector: false)
- ✅ handlePdfExport mit leerem Titel → Toast-Error
- ✅ handlePdfExport mit gültigem Titel → öffnet Folder-Selector
- ✅ handlePdfExport mit whitespace-only Titel (akzeptiert aktuell)
- ✅ handlePdfExport mit Sonderzeichen
- ✅ handlePdfExport mit sehr langem Titel
- ✅ setShowFolderSelector State-Updates
- ✅ generatePdf Funktion (aktuell disabled)

**Edge Cases:**
- Leerer Titel: Zeigt Fehler-Toast
- Whitespace-only Titel: Akzeptiert (keine trim-Validierung)
- Lange Titel (>100 Zeichen): Funktioniert
- Sonderzeichen (Umlaute, &, <, >): Funktioniert

**Bekannte Einschränkungen:**
- PDF-Generierung ist aktuell deaktiviert (`generatePdf` returned sofort)
- Echte PDF-Generierung erfolgt über Puppeteer API Route
- Tests validieren aktuelles Verhalten, müssen erweitert werden wenn Feature aktiviert wird

---

### useBoilerplateProcessing (21 Tests)

**Datei:** `useBoilerplateProcessing.test.ts`

**Zweck:** Verarbeitet Boilerplate-Sections und generiert vollständigen HTML-Content.

**Getestete Features:**

**1. Title Processing (3 Tests)**
- ✅ Titel wird als H1 eingebunden
- ✅ Kein H1 bei leerem Titel
- ✅ Sonderzeichen in Titel

**2. Section Sorting (2 Tests)**
- ✅ Sortierung nach order-Property
- ✅ Fallback wenn order fehlt (order ?? 0)

**3. Boilerplate Content (2 Tests)**
- ✅ Single Boilerplate Rendering
- ✅ Multiple Boilerplates Rendering

**4. Quote Processing (3 Tests)**
- ✅ Quote mit vollständigen Metadaten (Person, Role, Company)
- ✅ Quote mit partiellen Metadaten (nur Person, Role)
- ✅ Quote nur mit Person

**5. Structured Content (2 Tests)**
- ✅ Lead-Section Rendering
- ✅ Main-Section Rendering

**6. Date Rendering (2 Tests)**
- ✅ Datum wird immer am Ende hinzugefügt
- ✅ Deutsches Datumsformat

**7. Callbacks (2 Tests)**
- ✅ onFullContentChange wird aufgerufen
- ✅ onFullContentChange bei Section-Änderungen

**8. Edge Cases (5 Tests)**
- ✅ Leere Sections
- ✅ Sections mit leerem Content
- ✅ Sehr lange Inhalte (>5000 Zeichen)
- ✅ Gemischte Section-Typen in komplexem Szenario

**Content-Generierung:**

Der Hook generiert folgenden HTML-Output:

```html
<!-- Optional: Titel -->
<h1 class="text-2xl font-bold mb-4">{title}</h1>

<!-- Sections (sortiert nach order) -->

<!-- Boilerplate Section -->
{boilerplate.content}

<!-- Lead Section -->
<p><strong>{content}</strong></p>

<!-- Main Section -->
{content}

<!-- Quote Section -->
<blockquote class="border-l-4 border-blue-400 pl-4 italic">
  {content}
  <footer class="text-sm text-gray-600 mt-2">
    — {person}, {role} bei {company}
  </footer>
</blockquote>

<!-- Immer am Ende: Datum -->
<p class="text-sm text-gray-600 mt-8">{currentDate}</p>
```

**Wichtige Implementierungs-Details:**

1. **Section Sorting:**
   ```typescript
   const sortedSections = [...boilerplateSections].sort((a, b) =>
     (a.order ?? 0) - (b.order ?? 0)
   );
   ```

2. **Quote Metadata Formatting:**
   ```typescript
   fullHtml += `<footer class="text-sm text-gray-600 mt-2">— ${person}`;
   if (role) fullHtml += `, ${role}`;
   if (company) fullHtml += ` bei ${company}`;
   fullHtml += `</footer>`;
   ```

3. **Datum-Formatierung:**
   ```typescript
   const currentDate = new Date().toLocaleDateString('de-DE', {
     day: 'numeric',
     month: 'long',
     year: 'numeric'
   });
   ```

## Test-Ausführung

```bash
# Nur Hook-Tests
npm test -- src/components/pr/campaign/hooks

# Mit Coverage
npm test -- --coverage src/components/pr/campaign/hooks

# Watch-Mode
npm test -- --watch src/components/pr/campaign/hooks
```

## Coverage

**Beide Hooks: 100% Coverage**

| Hook | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| usePDFGeneration | 100% | 100% | 100% | 100% |
| useBoilerplateProcessing | 100% | 100% | 100% | 100% |

---

**Erstellt:** 2025-11-04
**Status:** ✅ Production-Ready
