# CeleroPress Design Patterns & Standards

Zentrale Dokumentation für einheitliche UI/UX-Standards in der gesamten CeleroPress-Plattform.

## 🎨 Branding & Naming

### Projektname
- **WICHTIG:** Der alte Projektname "SKAMP" wird ÜBERALL durch "CeleroPress" ersetzt
- **Schreibweise:** Immer "CeleroPress" (CamelCase, ein Wort)
- **Domain:** https://www.celeropress.com/
- **In Texten:** "CeleroPress" konsistent verwendet in allen UI-Elementen

## 🎯 Farben & States

### Primary-Farben
- **Primary-Farbe:** `bg-primary hover:bg-primary-hover` (#005fab / #004a8c)
- **Sekundäre Aktionen:** `plain` Button-Variante
- **Focus-States:** Immer `focus:ring-primary`

### Status-Farben
- **Erfolg:** `text-green-600`, `bg-green-50`
- **Warnung:** `text-yellow-600`, `bg-yellow-50`
- **Fehler:** `text-red-600`, `bg-red-50`
- **Info:** `text-blue-600`, `bg-blue-50`

## 🔧 Icons & Symbole

### Icon-Library
- **Konsistenz:** IMMER Outline-Varianten (`@heroicons/react/24/outline`)
- **NIEMALS:** `@heroicons/react/20/solid` verwenden

### Icon-Größen
- **Buttons & kleine UI:** `h-4 w-4` (Standard für Button-Icons)
- **Navigation & Menüs:** `h-5 w-5` (für wichtige Navigation)
- **Status-Cards:** `h-5 w-5` oder `h-6 w-6` (dezent, NICHT h-8 w-8)
- **Hero-Bereiche:** `h-6 w-6` bis `h-8 w-8` (nur für große Bereiche)

### Icon-Abstände
- **Nach Icon:** `mr-2` (Standard-Abstand)
- **Vor Icon:** `ml-2` (bei nachgestellten Icons)
- **NIEMALS:** `mr-1` oder `ml-1` verwenden

## 🎛️ Navigation & Buttons

### Zurück-Buttons
**Standard-Muster für alle Detail-Seiten:**
```tsx
<button
  onClick={() => router.push('/dashboard/library/publications')}
  className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium"
>
  <ArrowLeftIcon className="h-4 w-4 mr-2" />
  Zurück zur Übersicht
</button>
```

### Verifizieren-Buttons
**Standard-Muster für Verifizierungs-Funktionen:**
```tsx
<button
  onClick={() => setShowVerifyDialog(true)}
  className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium"
>
  <CheckBadgeIcon className="h-4 w-4 mr-2" />
  {verified ? 'Verifizierung zurücknehmen' : 'Verifizieren'}
</button>
```

**NICHT verwenden:**
- ❌ `Button plain` Komponente für Navigation
- ❌ Links statt Buttons für Aktionen

### Button-Padding
- **Standard-Buttons:** `px-6 py-2`
- **Kompakte Buttons:** `px-4 py-2`
- **Icon-Only:** `p-2`

### Primäre Aktionen
```tsx
// Hinzufügen-Buttons IMMER mit PlusIcon
<Button className="bg-primary hover:bg-primary-hover px-6 py-2">
  <PlusIcon className="h-4 w-4 mr-2" />
  Hinzufügen
</Button>
```

### Outline Button Pattern
**Standard für sekundäre Aktionen (z.B. "Änderungen anfordern", "Abbrechen"):**
```tsx
<Button className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100">
  <PencilSquareIcon className="h-5 w-5 mr-2" />
  Änderungen anfordern
</Button>
```

**Eigenschaften:**
- **Hintergrund:** Weiß (`!bg-white`)
- **Border:** Graue Outline (`!border !border-gray-300`)
- **Text:** Dunkler Text (`!text-gray-700`)
- **Hover:** Graues Hover wie Back-Button (`hover:!bg-gray-100`)
- **!important:** Nötig um Button-Component-Styles zu überschreiben

**Verwendung:**
- Sekundäre Aktionen in Formularen
- "Abbrechen" Buttons
- "Änderungen anfordern" in Freigabe-Workflows

## 📦 Content Boxes & Cards

### Grundregel: KEINE Schatten & KEINE Linien
- **NIEMALS:** `shadow`, `shadow-md`, `hover:shadow-md` verwenden
- **NIEMALS:** `border-b` Linien zwischen Header und Content
- **Stattdessen:** Nur äußere Borders für Abgrenzung

### Standard Content-Boxen (InfoCard Pattern)
```tsx
<div className="rounded-lg border bg-white overflow-hidden">
  <div className="px-4 py-3 bg-gray-50">
    <h3 className="text-lg font-medium text-gray-900">
      Titel
    </h3>
  </div>
  <div className="p-6">
    {/* Content */}
  </div>
</div>
```

### Status-Cards (Reichweite, Metriken, etc.)
**Hellgelbes Design mit grauer Schrift:**
```tsx
<div className="bg-gray-50 rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0">
      <Icon className="h-5 w-5 text-gray-500" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
        {value}
      </div>
      <div className="text-sm text-gray-500 truncate">
        {label}
      </div>
      {subValue && (
        <div className="text-xs text-gray-400 truncate">
          {subValue}
        </div>
      )}
    </div>
  </div>
</div>
```

**NICHT verwenden:**
```tsx
// ❌ Alte, zu große Stat-Cards
<div className="bg-white shadow rounded-lg px-4 py-5 sm:p-6">
  <Icon className="h-8 w-8 text-zinc-400" />
  {/* Zu viel Höhe, zu große Icons */}
</div>
```

## 📏 Spacing & Layout

### Modal-Standards
- **Padding:** `p-6` Standard
- **Titel-Bereich:** `px-6 py-4`
- **Content-Bereich:** `p-6`
- **Actions:** `px-6 py-4`

### Tabellen (Team/Templates-Style)
**Standard-Layout für Settings-Seiten:**
```tsx
<div className="bg-white rounded-lg overflow-hidden">
  {/* Table Header */}
  <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
    <div className="flex items-center">
      <div className="w-[40%] text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Haupt-Spalte
      </div>
      <div className="flex-1 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">
        Aktionen
      </div>
    </div>
  </div>
  
  {/* Table Body */}
  <div className="divide-y divide-zinc-200">
    <div className="px-6 py-4 hover:bg-zinc-50 transition-colors">
      {/* Row Content */}
    </div>
  </div>
</div>
```

**Spalten-Breiten:**
- **Haupt-Content:** `w-[40%]` (Name/Beschreibung)
- **Status/Typ:** `w-[20%]` (Badges)  
- **Version/Datum:** `w-[15%]` (Zusatzinfo)
- **Aktionen:** `flex-1` (Dropdown-Menü rechts)

**Aktionen-Dropdown:**
```tsx
<Dropdown>
  <DropdownButton outline>
    <EllipsisVerticalIcon className="h-4 w-4" />
  </DropdownButton>
  <DropdownMenu>
    <DropdownItem>
      <EyeIcon className="h-4 w-4 mr-2" />
      Aktion
    </DropdownItem>
  </DropdownMenu>
</Dropdown>
```

**Padding-Standards:**
- **Header:** `px-6 py-3`
- **Zeilen:** `px-6 py-4`
- **Loading/Empty:** `px-6 py-8`

### Status-Cards Spacing
- **Padding:** `p-4` (kompakt, NICHT `px-4 py-5 sm:p-6`)
- **Gap zwischen Icon und Text:** `gap-3`
- **Minimale Höhe anstreben**

## 🎪 Listen & Übersichten

### Hover-Effekte
```tsx
// Für interaktive Zeilen
<tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
```

### Checkbox-Listen
- **Standard:** `h-4 w-4` Checkboxes
- **Primary-Farbe:** `text-primary focus:ring-primary`

## 🌓 Dark Mode

### Konsistente Farbwerte
- **Hintergrund:** `bg-white dark:bg-zinc-800`
- **Border:** `border-zinc-200 dark:border-zinc-700`
- **Text:** `text-zinc-900 dark:text-white`
- **Sekundärer Text:** `text-zinc-500 dark:text-zinc-400`

## ♿ Accessibility

### ARIA-Labels
- **Navigation:** `aria-label="Zurück zur Übersicht"`
- **Buttons:** Beschreibende Labels für Icon-Only Buttons
- **Filter:** `aria-label="Filter"`

### Keyboard-Navigation
- **Focus-Indikatoren:** Immer sichtbar
- **Tab-Reihenfolge:** Logisch und vorhersagbar
- **Escape-Key:** Modals schließen

### Screen-Reader
- **Status-Updates:** Live-Regions für dynamische Inhalte
- **Strukturierte Überschriften:** H1 → H2 → H3 Hierarchie

## 🎨 UI-Komponenten Standards

### Verifizierungs-Dialoge
```tsx
<Dialog open={showVerifyDialog} onClose={() => setShowVerifyDialog(false)}>
  <div className="p-6">
    <div className="sm:flex sm:items-start">
      <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
        verified ? 'bg-yellow-100' : 'bg-green-100'
      } sm:mx-0 sm:h-10 sm:w-10`}>
        <CheckBadgeIcon className={`h-6 w-6 ${
          verified ? 'text-yellow-600' : 'text-green-600'
        }`} />
      </div>
      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
        <DialogTitle>
          {verified ? 'Verifizierung zurücknehmen' : 'Publikation verifizieren'}
        </DialogTitle>
        <DialogBody className="mt-2">
          <Text>Bestätigungstext hier</Text>
        </DialogBody>
      </div>
    </div>
  </div>
</Dialog>
```

### Layout ohne störende Linien
```tsx
// Layout ohne border-b Linien
<div className="pb-5 mb-5">  {/* Kein border-b */}
  <h1>Bibliothek</h1>
</div>

<div>  {/* Kein border-b */}
  <nav className="-mb-px flex space-x-8">
    {/* Tabs mit border-b-2 nur für aktive Unterstreichung */}
  </nav>
</div>
```

## 🧪 Qualitätssicherung

### Checkliste vor Commit
- [ ] Keine `shadow`-Klassen verwendet
- [ ] Keine `border-b` Linien zwischen Header/Content
- [ ] Alle Icons sind `@heroicons/react/24/outline`
- [ ] Icon-Größen entsprechen Standard (h-4, h-5, h-6)
- [ ] Zurück/Verifizieren-Buttons mit `bg-gray-50`
- [ ] Status-Cards mit `#f1f0e2` Hintergrund
- [ ] CeleroPress statt SKAMP verwendet
- [ ] InfoCard Pattern für Content-Boxen

### Automatische Prüfungen
```bash
# Suche nach Design-Pattern-Verstößen
grep -r "shadow-md" src/
grep -r "h-8 w-8.*text-zinc-400" src/
grep -r "bg-zinc-50.*rounded-lg.*border" src/
grep -r "@heroicons/react/20/solid" src/
```

## 📚 Referenz-Implementierungen

### Gute Beispiele
- **Publications Detail-Page:** Hellgelbe Status-Cards mit `#f1f0e2`
- **CRM Detail-Pages:** InfoCard Pattern mit grauen Headern
- **Library Layout:** Keine störenden border-b Linien
- **Verifizieren-Buttons:** Graue Buttons mit Toggle-Funktionalität

### Zu vermeidende Patterns
- ❌ Schatten-Effekte auf Content-Boxen
- ❌ `border-b` Linien zwischen Header und Content
- ❌ `Button plain` für Navigation
- ❌ Verifiziert-Badges (redundant zu Button)
- ❌ Inconsistente Icon-Größen

---

**Letzte Aktualisierung:** 2025-08-04  
**Version:** 2.0  
**Gültig für:** Alle CeleroPress Features

## 🎯 Neue Standards (v2.0)
- Hellgelbe Status-Cards (`#f1f0e2`)
- InfoCard Pattern für Content-Boxen
- Keine `border-b` Linien in Layouts
- Native HTML-Buttons für Navigation
- Verifizierungs-Dialoge mit farbkodierten Icons
- Toggle-Funktionalität für Verifizierung