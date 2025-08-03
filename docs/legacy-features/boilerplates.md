# Boilerplates - Textbausteine

## 📋 Übersicht

Das Boilerplates-Modul ermöglicht die Verwaltung wiederverwendbarer Textbausteine für Pressemeldungen. Diese standardisierten Textblöcke sparen Zeit und sichern konsistente Kommunikation.

**Hauptzweck:** Zentrale Verwaltung von Standard-Texten wie Unternehmensbeschreibungen, Kontaktblöcken und rechtlichen Hinweisen.

## ✅ Implementierte Funktionen

### Boilerplate-Verwaltung
- [x] **CRUD-Operationen** für Textbausteine
- [x] **Kategorisierung**:
  - Unternehmensbeschreibung
  - Kontaktinformationen
  - Rechtliche Hinweise
  - Produktbeschreibungen
  - Custom-Kategorien
- [x] **Rich-Text Support** (HTML-Format)
- [x] **Vorschau-Funktion**

### Editor-Integration
- [x] **Quick-Insert** im Kampagnen-Editor
- [x] **Dropdown-Auswahl** nach Kategorie
- [x] **Ein-Klick-Einfügung** an Cursor-Position
- [x] **Platzhalter-System** (Basic)
- [x] **Copy-to-Clipboard** Funktion

### Organisation
- [x] **Sortierung** nach Name/Kategorie/Datum
- [x] **Suchfunktion** in Boilerplate-Texten
- [x] **Favoriten-Markierung** für häufig genutzte
- [x] **Archivierung** ungenutzter Bausteine
- [x] **Verwendungs-Counter**

## 🚧 In Entwicklung

- [ ] **Erweiterte Platzhalter** (Branch: feature/smart-placeholders)
  - Dynamische Firmendaten
  - Kontakt-Variablen
  - Datumsformate

## ❗ Dringend benötigt

### 1. **Intelligente Platzhalter & Variablen** 🔴
**Beschreibung:** Dynamische Inhalte in Boilerplates
- Variablen-System: {{company.name}}, {{contact.firstName}}
- Bedingte Blöcke: {{#if company.isStartup}}...{{/if}}
- Datums-Formatierung: {{date.today|format:"DD.MM.YYYY"}}
- Listen-Iteration: {{#each products}}...{{/each}}
- Fallback-Werte: {{company.revenue|default:"nicht bekannt"}}

**Technische Anforderungen:**
- Template-Engine (Handlebars-Style)
- Variable Resolver
- Syntax-Highlighting im Editor

**Geschätzter Aufwand:** 2 Wochen

### 2. **Versionierung & Change Management** 🔴
**Beschreibung:** Historie und Kontrolle über Änderungen
- Versions-Historie pro Boilerplate
- Diff-Ansicht zwischen Versionen
- Rollback-Möglichkeit
- Änderungskommentare
- Approval für kritische Boilerplates

**Geschätzter Aufwand:** 1-2 Wochen

### 3. **Multi-Language Support** 🟡
**Beschreibung:** Mehrsprachige Textbausteine
- Sprach-Varianten pro Boilerplate
- Automatische Sprachauswahl
- Übersetzungs-Management
- Fallback auf Default-Sprache
- DeepL/Google Translate Integration

**Geschätzter Aufwand:** 2 Wochen

### 4. **Boilerplate-Sets & Templates** 🟡
**Beschreibung:** Zusammenstellungen für verschiedene Zwecke
- Vordefinierte Sets (z.B. "Produktlaunch-Set")
- Template-Wizard für neue Kampagnen
- Branchen-spezifische Sets
- Export/Import von Sets
- Sharing zwischen Teams

**Geschätzter Aufwand:** 1-2 Wochen

## 💡 Nice to Have

### KI-Features
- **Auto-Generierung** basierend auf Unternehmsdaten
- **Optimierungsvorschläge** für SEO
- **Tone-of-Voice Anpassung**
- **A/B Testing** für Boilerplates
- **Performance-Tracking** (welche funktionieren besser)

### Erweiterte Verwaltung
- **Berechtigungssystem** (wer darf ändern)
- **Gültigkeitszeitraum** (temporäre Boilerplates)
- **Compliance-Check** (rechtliche Prüfung)
- **Brand-Guidelines Integration**
- **Style-Guide Enforcement**

### Integration & Automation
- **CMS-Integration** für Website-Sync
- **Marketing Automation** Anbindung
- **Social Media Templates**
- **E-Mail-Signatur Management**
- **Word/Google Docs Sync**

### Analytics & Optimization
- **Verwendungsstatistiken** pro Boilerplate
- **Performance-Metriken** (Öffnungsraten)
- **Sentiment-Analyse** der Verwendung
- **Empfehlungs-Engine** ("Nutzer wie Sie...")
- **ROI-Tracking** pro Textbaustein

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
boilerplates/
  {boilerplateId}/
    - name: string
    - category: 'company' | 'contact' | 'legal' | 'product' | 'custom'
    - content: string (HTML)
    - plainText: string // Für Suche
    - description?: string
    - tags?: string[]
    - isFavorite: boolean
    - isArchived: boolean
    - usageCount: number
    - lastUsed?: Timestamp
    
    // Platzhalter
    - variables?: string[] // erkannte Variablen
    - requiredData?: string[] // benötigte Felder
    
    // Metadata
    - language: string // 'de', 'en', etc.
    - version: number
    - userId: string
    - createdAt: Timestamp
    - updatedAt: Timestamp

// Für Versionierung (Zukunft)
boilerplateVersions/
  {versionId}/
    - boilerplateId: string
    - version: number
    - content: string
    - changedBy: string
    - changeNote?: string
    - createdAt: Timestamp
```

### Service-Architektur

```typescript
// src/lib/firebase/boilerplate-service.ts
export const boilerplateService = {
  // CRUD Operations
  getAll(userId: string): Promise<Boilerplate[]>
  getById(id: string): Promise<Boilerplate>
  create(data: BoilerplateData): Promise<string>
  update(id: string, data: Partial<Boilerplate>): Promise<void>
  delete(id: string): Promise<void>
  
  // Special Operations
  archive(id: string): Promise<void>
  toggleFavorite(id: string): Promise<void>
  incrementUsage(id: string): Promise<void>
  
  // Search & Filter
  search(query: string): Promise<Boilerplate[]>
  getByCategory(category: string): Promise<Boilerplate[]>
  getFavorites(userId: string): Promise<Boilerplate[]>
  
  // Template Processing
  processVariables(content: string, data: any): string
  extractVariables(content: string): string[]
  validateTemplate(content: string): ValidationResult
}
```

### Variable Processing

```typescript
// Platzhalter-System
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

function processVariables(template: string, context: any): string {
  return template.replace(VARIABLE_REGEX, (match, variable) => {
    // Handle nested properties: company.name
    const value = variable.split('.').reduce((obj, key) => obj?.[key], context);
    
    // Handle filters: date|format:"DD.MM.YYYY"
    if (variable.includes('|')) {
      const [varName, ...filters] = variable.split('|');
      return applyFilters(value, filters);
    }
    
    return value ?? match; // Keep original if not found
  });
}

// Beispiel-Kontext
const context = {
  company: {
    name: "SKAMP GmbH",
    website: "www.skamp.de",
    employees: 50
  },
  contact: {
    name: "Max Mustermann",
    email: "presse@skamp.de"
  },
  date: {
    today: new Date(),
    year: new Date().getFullYear()
  }
};
```

### Editor Integration

```typescript
// TipTap Extension für Boilerplate-Einfügung
const BoilerplateExtension = Extension.create({
  name: 'boilerplate',
  
  addCommands() {
    return {
      insertBoilerplate: (boilerplateId: string) => ({ editor, commands }) => {
        const boilerplate = await boilerplateService.getById(boilerplateId);
        const processed = processVariables(boilerplate.content, currentContext);
        return commands.insertContent(processed);
      }
    }
  },
  
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.openBoilerplateMenu()
    }
  }
});
```

## 📊 Metriken & KPIs

- **Anzahl Boilerplates**: Gesamt und nach Kategorie
- **Nutzungsfrequenz**: Welche werden oft verwendet
- **Durchschnittliche Textlänge**
- **Variablen-Nutzung**: Statisch vs. dynamisch
- **Update-Frequenz**: Wie oft werden sie geändert

## 🐛 Bekannte Probleme

1. **HTML-Formatierung**
   - Formatierung geht beim Einfügen verloren
   - Lösung: Bessere HTML-to-Editor Konvertierung

2. **Platzhalter-Preview**
   - Variablen werden nicht in Vorschau ersetzt
   - Lösung: Live-Preview mit Beispieldaten

3. **Performance bei vielen Boilerplates**
   - Lange Ladezeiten bei >100 Einträgen
   - Lösung: Pagination, Lazy Loading

## 🔒 Sicherheit & Datenschutz

- Boilerplates nur für Ersteller sichtbar
- Keine Ausführung von JavaScript in Inhalten
- HTML-Sanitization vor Speicherung
- Versionskontrolle für Compliance
- Zugriffsprotokoll für sensitive Bausteine

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Intelligente Platzhalter
- Versionierung
- Erweiterte Kategorien

### Phase 2 (Q2 2025)
- Multi-Language Support
- KI-Optimierung
- Template-Sets

### Phase 3 (Q3 2025)
- External Integrations
- Advanced Analytics
- Team Collaboration

## 📚 Weiterführende Dokumentation

- [Editor Integration](./campaigns.md#editor)
- [Variable Syntax Guide](./variable-syntax.md)
- [Best Practices](./boilerplate-guidelines.md)
- [Template Examples](./template-library.md)