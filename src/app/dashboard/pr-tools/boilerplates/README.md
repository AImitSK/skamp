# 📋 Boilerplate-Modul Migration & Verbesserung - Implementierungsplan

## 🎯 Projektziel
Vollständige Überarbeitung des Boilerplate-Moduls mit Migration auf Multi-Tenancy, verbesserter UX und modernisierter Integration in das PR-Modul.

## 📁 Projektstruktur

### Betroffene Dateien:
```
src/
├── app/dashboard/pr-tools/boilerplates/
│   ├── page.tsx                    # Übersichtsseite
│   └── BoilerplateModal.tsx        # Create/Edit Modal
├── app/dashboard/pr-tools/campaigns/campaigns/
│   ├── new/page.tsx                # Neue Kampagne
│   └── edit/[campaignId]/page.tsx  # Kampagne bearbeiten
├── components/pr/campaign/
│   └── IntelligentBoilerplateSection.tsx  # Integration Component
├── lib/
│   ├── firebase/boilerplate-service.ts    # Service Layer
│   └── boilerplate-processor.ts           # Helper Functions
└── types/
    ├── pr.ts                              # PR Types (zu bereinigen)
    └── boilerplates.ts                    # NEU: Dedizierte Types
```

## 🔄 Migrations-Schritte

### Phase 1: Type-System & Service-Layer ✅

#### 1.1 Neue Type-Datei erstellen
```typescript
// src/types/boilerplates.ts
export interface BoilerplateEnhanced extends BaseEntity {
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  language: LanguageCode;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  // Entfernt: sortOrder, defaultPosition
}
```

#### 1.2 Service Migration
- ✅ `boilerplate-service.ts` nutzt bereits Multi-Tenancy
- ✅ Entferne Legacy-Felder aus Service-Methoden
- ✅ Validiere organizationId in allen Methoden

### Phase 2: Übersichtsseite Modernisierung 🔧

#### 2.1 Design-Anpassung an Listen-Seite
- [ ] Ersetze aktuelle Tabelle durch Design von `contacts/lists/page.tsx`
- [ ] Implementiere kompakte Toolbar mit:
  - SearchInput Component
  - Filter-Popover (Kategorie, Sprache, Global/Kunde)
  - ViewToggle (Grid/List)
  - "Baustein erstellen" Button

#### 2.2 Entfernen/Ersetzen
- [ ] Statistik-Button und Werteboxen entfernen
- [ ] Icon-Größen in Dropdowns korrigieren (`className="h-4 w-4"`)
- [ ] Sprachen-Spalte hinzufügen

#### 2.3 Code-Struktur
```tsx
// Beispiel-Struktur für neue Toolbar
<div className="mb-6">
  <div className="flex items-center gap-2">
    <SearchInput value={searchTerm} onChange={setSearchTerm} />
    <FilterPopover filters={filters} onChange={setFilters} />
    <ViewToggle value={viewMode} onChange={setViewMode} />
    <Button onClick={() => setShowModal(true)}>
      <PlusIcon className="h-4 w-4" />
      Baustein erstellen
    </Button>
  </div>
</div>
```

### Phase 3: Modal Modernisierung 🎨

#### 3.1 Rich-Text Editor Integration
- [ ] Ersetze einfaches Textarea durch TipTap Editor
- [ ] Kopiere Editor-Setup von `EmailEditor.tsx`
- [ ] Integriere Variablen-System aus `VariablesModal.tsx`
- [ ] Toolbar mit Text-Formatierung und Variablen-Button

#### 3.2 Form-Updates
- [ ] Global-Toggle mit korrektem Switch-Component (siehe `notifications/page.tsx`)
- [ ] Sprachen-Auswahl mit `LanguageSelector` Component
- [ ] Entferne: sortOrder, defaultPosition Felder

#### 3.3 Variablen-System
```tsx
const BOILERPLATE_VARIABLES = [
  { key: '{{company_name}}', label: 'Firmenname' },
  { key: '{{contact_name}}', label: 'Kontaktname' },
  { key: '{{current_date}}', label: 'Aktuelles Datum' },
  // ... weitere Variablen
];
```

### Phase 4: PR-Modul Integration vereinfachen 🔗

#### 4.1 IntelligentBoilerplateSection.tsx
- [ ] Entferne Position-System (header/footer/custom)
- [ ] Vereinfache auf "Ans Ende anfügen"
- [ ] Verbessere Drag & Drop für alle Elemente
- [ ] Ermögliche Boilerplate-Hinzufügen jederzeit

#### 4.2 Campaign Integration
- [ ] Update `CampaignContentComposer` für vereinfachte Integration
- [ ] Entferne Positionierungs-Logik
- [ ] Bausteine werden sequenziell am Ende eingefügt

### Phase 5: Cleanup & Migration 🧹

#### 5.1 Code Cleanup
- [ ] `boilerplate-processor.ts` evaluieren:
  - Falls verwendet: nach `lib/pr/` verschieben
  - Falls nicht: löschen
- [ ] Boilerplate-Types aus `pr.ts` entfernen
- [ ] Alte Interfaces durch neue ersetzen

#### 5.2 Daten-Migration
```typescript
// Migration Script für bestehende Boilerplates
async function migrateBoilerplates() {
  // 1. Lade alle Boilerplates
  // 2. Setze default language: 'de'
  // 3. Entferne sortOrder, defaultPosition
  // 4. Update in Firestore
}
```

## 📊 Implementierungs-Reihenfolge

### Woche 1: Foundation
1. **Tag 1-2**: Type-System erstellen & Service anpassen
2. **Tag 3-4**: Übersichtsseite modernisieren
3. **Tag 5**: Testing & Bugfixing

### Woche 2: Features
1. **Tag 1-2**: Modal mit Rich-Text Editor
2. **Tag 3-4**: PR-Integration vereinfachen
3. **Tag 5**: Cleanup & Migration

## ✅ Acceptance Criteria

### Übersichtsseite
- [ ] Design entspricht anderen Listen-Seiten
- [ ] Alle Filter funktionieren (Kategorie, Sprache, Global/Kunde)
- [ ] Icon-Größen korrekt (h-4 w-4)
- [ ] Keine Statistik-Boxen mehr

### Modal
- [ ] Rich-Text Editor mit Toolbar
- [ ] Variablen-System integriert
- [ ] Sprachen-Auswahl funktioniert
- [ ] Global-Toggle funktioniert korrekt

### Integration
- [ ] Bausteine können jederzeit hinzugefügt werden
- [ ] Keine Positions-Auswahl mehr
- [ ] Drag & Drop funktioniert
- [ ] Bausteine werden ans Ende angefügt

### Technisch
- [ ] Alle alten Services entfernt
- [ ] Multi-Tenancy vollständig implementiert
- [ ] Types in separate Datei ausgelagert
- [ ] Keine Console Errors

## 🚀 Quick Start für Entwickler

```bash
# 1. Branch erstellen
git checkout -b feature/boilerplate-module-redesign

# 2. Dependencies prüfen
npm install

# 3. Type-System erstellen
touch src/types/boilerplates.ts

# 4. Mit Übersichtsseite beginnen
# Kopiere Layout von src/app/dashboard/contacts/lists/page.tsx
```

## 📝 Wichtige Hinweise

- **Icon-Größen**: Immer explizit angeben (`className="h-4 w-4"`)
- **Multi-Tenancy**: OrganizationId in allen Service-Calls
- **Rich-Text**: TipTap Editor verwenden, nicht plain Textarea
- **Variablen**: System aus Email-Editor übernehmen
- **Position**: Komplett entfernen, nur noch sequenziell

## 🐛 Bekannte Issues

1. **Global-Toggle**: Switch-Component bindet nicht korrekt
2. **Icon-Größen**: Fehlen in Dropdown-Menüs
3. **Position-System**: Verhindert flexibles Hinzufügen

## 📞 Support

Bei Fragen oder Problemen:
- Code-Reviews in PR anfordern
- Pair-Programming für komplexe Teile
- Dokumentation im Code mit Kommentaren

---

**Geschätzte Gesamtdauer**: 2 Wochen  
**Priorität**: Hoch  
**Dependencies**: Multi-Tenancy Migration abgeschlossen