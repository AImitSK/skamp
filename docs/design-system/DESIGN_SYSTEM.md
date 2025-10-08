# SKAMP Design System

Version 1.0 - Januar 2025

> **Lebendiges Dokument**: Dieses Design System wächst mit dem Projekt. Jede neue Komponente und jedes Pattern wird hier dokumentiert.

---

## 📋 Inhaltsverzeichnis

- [Foundation](#foundation)
  - [Farben](#farben)
  - [Typografie](#typografie)
  - [Abstände & Grid](#abstände--grid)
  - [Schatten & Elevation](#schatten--elevation)
  - [Animationen & Transitions](#animationen--transitions)
- [Icons](#icons)
- [Komponenten](#komponenten)
  - [Buttons](#buttons)
  - [Form Elements](#form-elements)
  - [Tables](#tables)
  - [Badges & Tags](#badges--tags)
  - [Modals & Dialogs](#modals--dialogs)
  - [Dropdowns & Popovers](#dropdowns--popovers)
  - [Alerts & Toasts](#alerts--toasts)
  - [Navigation](#navigation)
  - [Cards](#cards)
  - [Loading States](#loading-states)
- [Patterns](#patterns)
- [Do's and Don'ts](#dos-and-donts)

---

## Foundation

### Farben

#### Primärfarben

```typescript
// Brand Colors
primary: '#005fab'        // CI-Blau - Hauptfarbe
primaryHover: '#004a8c'   // CI-Blau - Hover State
accent: '#dedc00'         // Gelb-Grün - Aktionen/Highlights (rgb(222, 220, 0))
```

**Verwendung:**
- **Primary (#005fab)**:
  - Hauptaktions-Buttons
  - Links
  - Aktive Tab-Unterstriche
  - Focus-Rings
  - Brand-Elemente

- **Accent (#dedc00)**:
  - Checkboxen (checked state)
  - Radio Buttons (selected state)
  - Wichtige Highlights
  - Auswahlmarkierungen

#### Neutrale Farben (Zinc-Palette)

```typescript
// Text
text-heading: 'rgb(24, 24, 27)'      // zinc-900 (Überschriften, sehr wichtig)
text-primary: 'rgb(63, 63, 70)'      // zinc-700 (Haupttext, Icons)
text-secondary: 'rgb(113, 113, 122)' // zinc-500 (Sekundärtext)
text-muted: 'rgb(161, 161, 170)'     // zinc-400 (Placeholder, sehr zurückhaltend)
text-disabled: 'rgb(212, 212, 216)'  // zinc-300 (Deaktiviert)

// Borders
border-strong: 'rgb(113, 113, 122)'  // zinc-500 (Hervorgehoben)
border-default: 'rgb(212, 212, 216)' // zinc-300 (Standard: Inputs, Buttons)
border-light: 'rgb(228, 228, 231)'   // zinc-200 (Subtil: Tabellen, Trenner)
border-subtle: 'rgb(244, 244, 245)'  // zinc-100 (Sehr subtil)

// Backgrounds
bg-white: '#ffffff'                   // Primärer Hintergrund
bg-subtle: 'rgb(250, 250, 250)'      // zinc-50 (Cards, Table Header)
bg-hover-light: 'rgb(250, 250, 250)' // zinc-50 (Subtile Hover)
bg-hover: 'rgb(228, 228, 231)'       // zinc-200 (Sichtbare Hover)
bg-muted: 'rgb(244, 244, 245)'       // zinc-100 (Deaktiviert)
```

#### Semantische Farben

```typescript
// Status & Feedback
success: {
  DEFAULT: 'rgb(34, 197, 94)',    // green-500
  light: 'rgb(220, 252, 231)',    // green-100
  text: 'rgb(21, 128, 61)',       // green-700
}

warning: {
  DEFAULT: 'rgb(234, 179, 8)',    // yellow-500
  light: 'rgb(254, 249, 195)',    // yellow-100
  text: 'rgb(161, 98, 7)',        // yellow-700
}

error: {
  DEFAULT: 'rgb(239, 68, 68)',    // red-500
  light: 'rgb(254, 226, 226)',    // red-100
  text: 'rgb(185, 28, 28)',       // red-700
}

info: {
  DEFAULT: 'rgb(59, 130, 246)',   // blue-500
  light: 'rgb(219, 234, 254)',    // blue-100
  text: 'rgb(29, 78, 216)',       // blue-700
}
```

**Verwendung:**
- **Success**: Erfolgsmeldungen, positive Aktionen
- **Warning**: Warnungen, wichtige Hinweise
- **Error**: Fehlermeldungen, destructive Aktionen (Löschen)
- **Info**: Informationen, neutrale Hinweise

#### Farb-Utilities

```typescript
// Overlays & Masks
overlay: 'rgba(0, 0, 0, 0.5)'       // Modal-Hintergrund
overlay-light: 'rgba(0, 0, 0, 0.25)' // Subtiles Overlay
backdrop-blur: 'backdrop-blur-sm'    // Für Modals/Drawers
```

---

### Typografie

#### Schriftfamilie

```typescript
// System Font Stack (Standard aus Tailwind)
font-sans: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
```

#### Überschriften

```typescript
// H1 - Hauptüberschrift (Seiten-Titel)
className="text-3xl font-semibold text-zinc-900"
// Beispiel: "Kontakte", "Dashboard"

// H2 - Sektion-Überschrift
className="text-2xl font-semibold text-zinc-900"
// Beispiel: "Kampagnen-Übersicht", "Statistiken"

// H3 - Sub-Sektion / Card-Titel
className="text-xl font-semibold text-zinc-900"
// Beispiel: "Aktuelle Kampagne", "Team-Mitglieder"

// H4 - Kleinere Überschrift
className="text-lg font-semibold text-zinc-900"

// H5 - Inline-Überschrift
className="text-base font-semibold text-zinc-900"

// H6 - Mini-Überschrift
className="text-sm font-semibold text-zinc-700"
```

#### Body Text

```typescript
// Large Body
className="text-base text-zinc-700"
// Für wichtigeren Fließtext, Beschreibungen

// Standard Body (DEFAULT)
className="text-sm text-zinc-700"
// Standard für meisten Text

// Small Body
className="text-xs text-zinc-600"
// Für Metadaten, Timestamps, kleine Labels
```

#### Special Text

```typescript
// Form Labels
className="text-sm font-semibold text-zinc-700"
// Fett für bessere Scanbarkeit

// Table Headers
className="text-xs font-medium text-zinc-500 uppercase tracking-wider"
// Klein, uppercase, guter Kontrast

// Placeholder Text
className="placeholder:text-zinc-300"
// Sehr hell, unauffällig

// Links
className="text-sm text-primary hover:text-primary-hover underline"

// Muted/Secondary
className="text-sm text-zinc-500"
// Weniger wichtige Informationen

// Disabled
className="text-sm text-zinc-300"
// Deaktiviert
```

#### Line Heights

```typescript
// Tight (Überschriften)
leading-tight: 1.25

// Normal (Standard)
leading-normal: 1.5

// Relaxed (Lange Texte)
leading-relaxed: 1.625
```

---

### Abstände & Grid

#### Standard-Spacing-Scale

```typescript
// Tailwind Spacing Scale (bevorzugt)
0.5  // 2px  - Micro-Spacing
1    // 4px  - Sehr eng
2    // 8px  - Standard gap zwischen verwandten Elementen
3    // 12px - Medium gap
4    // 16px - Standard Section-Spacing
6    // 24px - Große Sections
8    // 32px - Sehr große Abstände
12   // 48px - Extra große Abstände
16   // 64px - Maximum
```

#### Komponenten-Höhen

```typescript
// Interactive Elements (STANDARD)
h-10  // 40px - Buttons, Inputs, Dropdowns (EINHEITLICH!)

// Compact Elements
h-8   // 32px - Kleine Buttons, Badges mit Padding

// Large Elements
h-12  // 48px - Große Call-to-Action Buttons
h-14  // 56px - Hero Buttons

// Icons
h-4 w-4  // 16px - Tabellen, kleine Kontexte
h-5 w-5  // 20px - Toolbars, Standard
h-6 w-6  // 24px - Große Buttons
```

#### Layout-Spacing

```typescript
// Container Padding
p-4   // 16px - Standard Card/Panel
p-6   // 24px - Großzügige Cards
p-8   // 32px - Modals, wichtige Container

// Section Margins
mb-4  // 16px - Zwischen kleineren Sections
mb-6  // 24px - Zwischen größeren Sections
mb-8  // 32px - Zwischen Haupt-Bereichen
```

#### Gaps (Flexbox/Grid)

```typescript
gap-1  // 4px  - Sehr eng (Badges nebeneinander)
gap-2  // 8px  - Standard (Toolbar-Elemente)
gap-3  // 12px - Medium (Form-Fields)
gap-4  // 16px - Groß (Grid-Columns)
gap-6  // 24px - Extra groß (Cards in Grid)
```

---

### Schatten & Elevation

**🚫 WICHTIG: Keine Schatten im CeleroPress Design System!**

```typescript
// NICHT VERWENDEN:
shadow-sm, shadow, shadow-md, shadow-lg, etc.

// Stattdessen für Elevation:
- Borders (ring-1, border)
- Backgrounds (bg-zinc-50 vs bg-white)
- Subtle Overlays
```

**Ausnahme: Dropdown-Menüs** (vom Framework vorgegeben)
```typescript
// Nur für Popovers/Dropdowns erlaubt:
className="shadow-lg ring-1 ring-black ring-opacity-5"
```

---

### Animationen & Transitions

#### Standard Transitions

```typescript
// Colors (Buttons, Hovers)
transition-colors duration-200

// All (wenn mehrere Properties ändern)
transition-all duration-200

// Transform (für Bewegungen)
transition-transform duration-200
```

#### Easing

```typescript
// Standard
ease-out  // Für die meisten Transitions

// Spezielle Fälle
ease-in-out  // Für Modal-Animationen
```

#### Häufige Animationen

```typescript
// Fade In/Out
transition: opacity 200ms ease-out

// Slide & Fade (Popover)
enterFrom="opacity-0 translate-y-1"
enterTo="opacity-100 translate-y-0"
leave="transition ease-in duration-150"
leaveFrom="opacity-100 translate-y-0"
leaveTo="opacity-0 translate-y-1"
```

---

## Icons

### Icon-Bibliothek

**🎯 AUSSCHLIESSLICH: Heroicons /24/outline**

```typescript
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  // ...
} from "@heroicons/react/24/outline"
```

**❌ NICHT verwenden:**
- `/20/solid` Heroicons
- Font Awesome
- Material Icons
- Andere Icon-Bibliotheken

### Icon-Farben

```typescript
// Standard Icons
className="text-zinc-700"
// Beispiel: Lupe, Filter, Navigation

// Muted Icons (weniger wichtig)
className="text-zinc-500"
// Beispiel: Deaktivierte Aktionen

// Icons in Primary Buttons
className="text-white"

// Icons in gefärbten Contexts
className="text-red-600"     // Löschen
className="text-green-600"   // Erfolg
className="text-primary"     // Brand-Aktion
```

### Icon-Größen

```typescript
// Tabellen-Kontext
h-4 w-4  // 16px - Action-Icons in Rows

// Standard-Kontext (Toolbar, Buttons)
h-5 w-5  // 20px - DEFAULT für die meisten Fälle

// Große Buttons
h-6 w-6  // 24px - CTA-Buttons, Hero-Sections

// Empty States, Illustrations
h-12 w-12  // 48px
h-16 w-16  // 64px
```

### Icon-Strokes (Dicke)

```typescript
// Standard (kein stroke nötig)
<FunnelIcon className="h-5 w-5" />

// Medium-Dick (wichtige Icons)
stroke-2
// Beispiel: Filter-Icon

// Extra-Dick (sehr wichtig, 3-Punkte)
stroke-[2.5]
// Beispiel: Ellipsis-Icon in Tabellen

// ❌ NICHT: stroke-1 (zu dünn, schlecht lesbar)
```

### Icon-Spacing (mit Text)

```typescript
// Icon LINKS von Text
<PlusIcon className="h-4 w-4 mr-2" />
Neu hinzufügen

// Icon RECHTS von Text
Weiter
<ChevronRightIcon className="h-4 w-4 ml-2" />
```

---

## Komponenten

### Buttons

#### Primary Button

```tsx
<Button
  className="bg-primary hover:bg-primary-hover text-white
             font-medium whitespace-nowrap
             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
             h-10 px-6 rounded-lg transition-colors"
>
  <PlusIcon className="h-4 w-4 mr-2" />
  Neu hinzufügen
</Button>
```

**Verwendung:**
- Hauptaktionen auf der Seite
- Call-to-Actions
- Submit-Buttons in Formularen

**Varianten:**
```tsx
// Mit Icon
<PlusIcon className="h-4 w-4 mr-2" />

// Ohne Icon
Text only

// Large (h-12 px-8)
Für Hero-Sections

// Full Width
className="w-full"
```

---

#### Secondary Button

**TODO: Noch nicht definiert**
- Outline-Style vs. Ghost-Style?
- Farbe: zinc-700 border + hover?

```tsx
// Placeholder - Zu definieren:
<Button
  className="border border-zinc-300 bg-white text-zinc-700
             hover:bg-zinc-50 h-10 px-6 rounded-lg"
>
  Abbrechen
</Button>
```

---

#### Icon Button (Outlined)

```tsx
<button
  className="inline-flex items-center justify-center rounded-lg
             border border-zinc-300 bg-white text-zinc-700
             hover:bg-zinc-50 transition-colors
             focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
             h-10 w-10 p-2.5"
  aria-label="Filter"
>
  <FunnelIcon className="h-5 w-5 stroke-2" />
</button>
```

**Verwendung:**
- Toolbars
- Kompakte Aktionen (Filter, Menüs)

**Mit Badge/Indicator:**
```tsx
<button className="relative h-10 w-10...">
  <FunnelIcon className="h-5 w-5" />
  {/* Badge */}
  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center
                   rounded-full bg-primary text-xs font-medium text-white">
    3
  </span>
</button>
```

---

#### Dropdown Action Button (3-Punkte in Tabellen)

```tsx
<DropdownButton
  plain
  className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors
             focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
>
  <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
</DropdownButton>
```

**Verwendung:**
- Table-Row-Actions
- Card-Actions

---

#### Destructive Button

**TODO: Noch nicht definiert**

```tsx
// Placeholder - Zu definieren:
<Button
  className="bg-red-600 hover:bg-red-700 text-white
             h-10 px-6 rounded-lg"
>
  <TrashIcon className="h-4 w-4 mr-2" />
  Löschen
</Button>
```

---

#### Link Button (Text-only)

```tsx
<button className="text-sm text-primary hover:text-primary-hover underline">
  Mehr anzeigen
</button>

{/* Destructive Link */}
<button className="text-sm text-red-600 hover:text-red-700 underline">
  3 Löschen
</button>
```

**Verwendung:**
- Inline-Aktionen
- Weniger wichtige Aktionen
- Bulk-Actions

---

### Form Elements

#### Text Input

```tsx
<input
  type="text"
  placeholder="Name eingeben..."
  className="block w-full rounded-lg border border-zinc-300 bg-white
             px-3 py-2 text-sm
             placeholder:text-zinc-300
             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
             h-10"
/>
```

**Varianten:**
```tsx
// Disabled
disabled
className="...bg-zinc-50 text-zinc-400 cursor-not-allowed"

// Error State
className="...border-red-500 focus:border-red-500 focus:ring-red-200"

// Success State
className="...border-green-500 focus:border-green-500 focus:ring-green-200"
```

---

#### Search Input (mit Icon)

```tsx
<div className="flex-1 relative">
  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
    <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" />
  </div>
  <input
    type="search"
    placeholder="Durchsuchen..."
    className="block w-full rounded-lg border border-zinc-300 bg-white
               py-2 pl-10 pr-3 text-sm
               placeholder:text-zinc-300
               focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
               h-10"
  />
</div>
```

**Verwendung:**
- Toolbars
- Filter-Bereiche
- Suchfunktionen

---

#### Textarea

**TODO: Noch nicht definiert**

```tsx
// Placeholder:
<textarea
  rows={4}
  className="block w-full rounded-lg border border-zinc-300 bg-white
             px-3 py-2 text-sm
             placeholder:text-zinc-300
             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
/>
```

---

#### Select Dropdown

**TODO: Noch nicht definiert**

```tsx
// Native Select (Placeholder):
<select
  className="block w-full rounded-lg border border-zinc-300 bg-white
             px-3 py-2 text-sm h-10
             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
>
  <option>Option 1</option>
</select>
```

---

#### Checkbox (Custom)

**✅ Implementiert in `/components/ui/checkbox.tsx`**

```tsx
<Checkbox
  checked={isChecked}
  onChange={(checked) => handleChange(checked)}
/>
```

**Styling (bereits in Komponente):**
```typescript
// Unchecked
border-zinc-300 bg-white

// Checked
border-[#dedc00] bg-[#dedc00]

// Häkchen
text-white  // Weißes SVG-Icon

// Indeterminate
border-[#dedc00] bg-[#dedc00]
// Mit Strich statt Häkchen
```

**❌ NICHT verwenden:**
```tsx
// Keine nativen Checkboxen:
<input type="checkbox" />
```

**Warum Custom?**
- Volle Kontrolle über Häkchen-Farbe (weiß auf #dedc00)
- Konsistentes Aussehen cross-browser
- Indeterminate-State unterstützt

---

#### Radio Buttons

**TODO: Noch nicht definiert**

```tsx
// Placeholder:
// Wahrscheinlich ähnlich wie Checkbox, mit accent-Farbe
```

---

#### Toggle/Switch

**TODO: Noch nicht definiert**

---

#### File Upload

**TODO: Noch nicht definiert**

---

### Tables

#### Table Container

```tsx
<div className="bg-white rounded-lg shadow-sm overflow-hidden">
  {/* Table Header */}
  {/* Table Body */}
</div>
```

**shadow-sm erlaubt für Table-Container** (subtile Elevation)

---

#### Table Header

```tsx
<div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
  <div className="flex items-center">
    <div className="flex items-center w-[25%]">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={handleSelectAll}
      />
      <span className="ml-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Name / Typ
      </span>
    </div>
    {/* Weitere Spalten */}
  </div>
</div>
```

**Header-Styling:**
- Hintergrund: `bg-zinc-50` (subtile Abgrenzung)
- Border: `border-b border-zinc-200`
- Text: `text-xs font-medium text-zinc-500 uppercase tracking-wider`

---

#### Table Row

```tsx
<div className="px-6 py-4 hover:bg-zinc-50 transition-colors">
  <div className="flex items-center">
    <div className="flex items-center w-[25%]">
      <Checkbox
        checked={isSelected}
        onChange={handleSelect}
      />
      <div className="ml-4 min-w-0 flex-1">
        <button className="text-sm font-semibold text-zinc-900 hover:text-primary truncate">
          Item Name
        </button>
        <div className="flex items-center gap-2 mt-1">
          <Badge color="zinc" className="text-xs">Type</Badge>
        </div>
      </div>
    </div>
    {/* Weitere Spalten */}
  </div>
</div>
```

**Row-Styling:**
- Hover: `hover:bg-zinc-50`
- Padding: `px-6 py-4`
- Border: Automatisch durch `divide-y divide-zinc-200` am Container

---

#### Table Borders & Dividers

```tsx
{/* Body Container */}
<div className="divide-y divide-zinc-200">
  {items.map(item => (
    <TableRow key={item.id} />
  ))}
</div>
```

**Konsistenz:**
- Header-Border: `border-b border-zinc-200`
- Row-Dividers: `divide-y divide-zinc-200`
- **Immer zinc-200** für Tabellen (nicht zinc-300!)

---

#### Empty State (Tabelle leer)

**TODO: Noch nicht definiert**

```tsx
// Placeholder:
<div className="px-6 py-12 text-center">
  <FolderIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
  <p className="text-sm text-zinc-500">Keine Einträge vorhanden</p>
  <Button className="mt-4...">Ersten Eintrag erstellen</Button>
</div>
```

---

### Badges & Tags

#### Standard Badge

```tsx
<Badge color="zinc" className="text-xs">
  Medienhaus
</Badge>

<Badge color="purple" className="text-xs">
  Journalist
</Badge>

<Badge color="blue" className="text-xs">
  🌐 Verweis
</Badge>
```

**Verfügbare Farben** (aus `/components/ui/badge.tsx`):
- `zinc` - Grau (Standard)
- `red` - Rot (Error, Wichtig)
- `orange` - Orange (Warning)
- `amber` - Gelb
- `yellow` - Gelb
- `lime` - Hellgrün
- `green` - Grün (Success)
- `emerald` - Smaragd
- `teal` - Türkis
- `cyan` - Cyan
- `sky` - Hellblau
- `blue` - Blau (Info)
- `indigo` - Indigo
- `violet` - Violett
- `purple` - Lila (Journalist)
- `fuchsia` - Fuchsia
- `pink` - Pink
- `rose` - Rose

**Verwendung:**
- Tags/Kategorien
- Status-Anzeigen
- Typen (Medienhaus, Journalist, etc.)

---

#### Badge mit Dot (Status)

**TODO: Noch nicht definiert**

```tsx
// Placeholder:
<span className="inline-flex items-center gap-1.5 text-xs">
  <span className="h-2 w-2 rounded-full bg-green-500"></span>
  Aktiv
</span>
```

---

### Modals & Dialogs

#### Modal-Größen

```tsx
// Dialog Component unterstützt diese Größen:
size="xs"   // max-w-xs  (320px)  - Kleine Bestätigungen
size="sm"   // max-w-sm  (384px)  - Einfache Formulare
size="md"   // max-w-md  (448px)  - Standard-Formulare
size="lg"   // max-w-lg  (512px)  - Standard (DEFAULT)
size="xl"   // max-w-xl  (576px)  - Größere Formulare
size="2xl"  // max-w-2xl (672px)  - Komplexe Formulare
size="3xl"  // max-w-3xl (768px)  - Sehr große Formulare
size="4xl"  // max-w-4xl (896px)  - Extra groß
size="5xl"  // max-w-5xl (1024px) - Maximum
```

**Faustregel:**
- Einfache Bestätigungen: `sm` oder `md`
- Standard-Formulare: `lg` oder `xl`
- Formulare mit Tabs: `2xl` bis `4xl`
- Komplexe Multi-Tab-Formulare: `3xl` bis `5xl`

---

#### Modal-Struktur (Basis)

```tsx
<Dialog open={isOpen} onClose={handleClose} size="lg">
  {/* 1. Title */}
  <DialogTitle>Modal-Titel</DialogTitle>

  {/* 2. Body - Scrollbarer Content */}
  <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
    <FieldGroup>
      {/* Ihr Content hier */}
    </FieldGroup>
  </DialogBody>

  {/* 3. Actions - Footer mit Buttons */}
  <DialogActions>
    <Button variant="secondary" onClick={handleClose}>
      Abbrechen
    </Button>
    <Button onClick={handleSubmit}>
      Speichern
    </Button>
  </DialogActions>
</Dialog>
```

**Anatomie:**
- **DialogTitle**: Überschrift (px-6 py-4, automatisch gestylt)
- **DialogBody**: Scrollbarer Content-Bereich
- **DialogActions**: Button-Footer (bg-gray-50 px-6 py-4)

---

#### Scrollbare Modals (Standard)

```tsx
<DialogBody className="px-6 py-6 h-[500px] overflow-y-auto overflow-x-hidden">
  <FieldGroup>
    {/* Formular-Felder */}
  </FieldGroup>
</DialogBody>
```

**Standard-Höhe: h-[500px]**
- Verhindert zu kleine/große Modals
- Konsistente UX über alle Modals
- Overflow: `overflow-y-auto overflow-x-hidden`

---

#### Modal mit Tabs

```tsx
<Dialog open={isOpen} onClose={handleClose} size="3xl">
  <DialogTitle>Firma bearbeiten</DialogTitle>

  {/* Tab-Navigation */}
  <div className="border-b border-gray-200 px-6">
    <nav className="flex -mb-px">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
          )}
        >
          <tab.icon className="h-5 w-5" />
          {tab.label}
        </button>
      ))}
    </nav>
  </div>

  <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
    {activeTab === 'general' && (
      <FieldGroup>
        {/* Tab Content */}
      </FieldGroup>
    )}
  </DialogBody>

  <DialogActions>
    <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
    <Button onClick={handleSave}>Speichern</Button>
  </DialogActions>
</Dialog>
```

**Tab-Styling:**
- Active: `border-primary text-primary`
- Inactive: `border-transparent text-zinc-500`
- Hover: `hover:border-zinc-300 hover:text-zinc-700`
- Icons: `h-5 w-5` mit Text

---

#### FieldGroup Pattern

```tsx
<FieldGroup>
  {/* Einzelfeld */}
  <Field>
    <Label>Firmenname *</Label>
    <Input value={name} onChange={setName} />
  </Field>

  {/* 2-Spalten-Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Field>
      <Label>Vorname</Label>
      <Input value={firstName} />
    </Field>
    <Field>
      <Label>Nachname</Label>
      <Input value={lastName} />
    </Field>
  </div>

  {/* Gruppierte Felder mit Hintergrund */}
  <div className="space-y-4 rounded-md border p-4 bg-gray-50">
    <div className="text-sm font-medium text-gray-900">Hauptadresse</div>
    <Field>
      <Label>Straße</Label>
      <Input value={street} />
    </Field>
  </div>
</FieldGroup>
```

**Regeln:**
- Wrapper für alle Tab-Inhalte
- Automatisches Spacing
- `bg-gray-50` für gruppierte Bereiche
- 2-Spalten: `md:grid-cols-2 gap-4`

---

#### Feldgruppen mit Hintergrund

```tsx
<div className="space-y-4 rounded-md border p-4 bg-gray-50">
  <div className="flex items-center justify-between">
    <div className="text-sm font-medium text-gray-900">E-Mail-Adressen</div>
    <Button variant="ghost" onClick={addEmail}>
      <PlusIcon className="h-4 w-4 mr-2" />
      Hinzufügen
    </Button>
  </div>

  {emails.map((email, index) => (
    <div key={index} className="flex gap-2 items-start">
      <Input value={email.email} className="flex-1" />
      <Select value={email.type}>
        <option value="work">Geschäftlich</option>
      </Select>
      <div className="flex items-center gap-2 pt-2">
        <Checkbox checked={email.isPrimary} />
        <button onClick={() => removeEmail(index)}>
          <TrashIcon className="h-4 w-4 text-red-600" />
        </button>
      </div>
    </div>
  ))}

  {emails.length === 0 && (
    <Text className="text-sm text-gray-500">Keine E-Mails</Text>
  )}
</div>
```

**Pattern:**
- Container: `space-y-4 rounded-md border p-4 bg-gray-50`
- Header: `text-sm font-medium text-gray-900`
- Add-Button: Ghost-Variante mit PlusIcon
- Delete: `TrashIcon h-4 w-4 text-red-600`
- Empty: `text-sm text-gray-500`

---

#### Checkboxen in Modals

```tsx
{/* Gelbe Checkbox (#dedc00) */}
<div className="flex items-center gap-2">
  <Checkbox
    checked={isPrimary}
    onChange={(checked) => setIsPrimary(checked)}
  />
  <label className="text-sm text-zinc-700">Als primär markieren</label>
</div>
```

**Farben (automatisch):**
- Unchecked: `border-zinc-300 bg-white`
- Checked: `border-[#dedc00] bg-[#dedc00]`
- Häkchen: Weißes SVG auf Gelb

---

#### Länder-/Telefon-Felder mit Flaggen

```tsx
{/* Telefon mit Ländervorwahl */}
<div className="flex gap-2">
  <Select value={phone.countryCode} className="w-32">
    {COUNTRY_OPTIONS.map((c) => (
      <option key={c.code} value={c.code}>
        {c.label} {/* z.B. "+49 DE" */}
      </option>
    ))}
  </Select>
  <Input value={phone.number} placeholder="30 12345678" className="flex-1" />
</div>

{/* Adresse mit Flagge */}
<Field>
  <Label>Land</Label>
  <div className="flex items-center gap-2">
    <FlagIcon countryCode={address.countryCode} className="h-4 w-6" />
    <CountrySelector value={address.countryCode} onChange={setCountry} />
  </div>
</Field>
```

**Flag Component:**
```tsx
import * as Flags from 'country-flag-icons/react/3x2';

const FlagIcon = ({ countryCode, className = "h-4 w-6" }) => {
  if (!countryCode) return null;
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};
```

**Flaggen-Größe: `h-4 w-6`** (Standard inline)

---

#### Modal-Actions (Footer)

```tsx
<DialogActions>
  <Button variant="secondary" onClick={onClose}>
    Abbrechen
  </Button>
  <Button onClick={handleSave} disabled={loading}>
    {loading ? 'Speichert...' : 'Speichern'}
  </Button>
</DialogActions>

{/* Mit Delete-Action */}
<DialogActions>
  <div className="flex-1">
    <Button variant="destructive" onClick={handleDelete}>
      <TrashIcon className="h-4 w-4 mr-2" />
      Löschen
    </Button>
  </div>
  <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
  <Button onClick={handleSave}>Speichern</Button>
</DialogActions>
```

**Layout:**
- Cancel: Links, secondary
- Primary: Rechts
- Delete: Ganz links mit `flex-1`
- Spacing: `gap-4` (automatisch)

---

#### Bestätigungs-Modal

```tsx
<Dialog open={showConfirm} onClose={handleCancel} size="sm">
  <DialogTitle>Eintrag löschen?</DialogTitle>

  <DialogBody>
    <Text className="text-sm text-zinc-600">
      Diese Aktion kann nicht rückgängig gemacht werden.
    </Text>
  </DialogBody>

  <DialogActions>
    <Button variant="secondary" onClick={handleCancel}>
      Abbrechen
    </Button>
    <Button variant="destructive" onClick={handleDelete}>
      Löschen
    </Button>
  </DialogActions>
</Dialog>
```

**Größe: `sm` oder `md`** (kurzer Inhalt)

---

#### Validation & Alerts

```tsx
<Dialog open={isOpen} onClose={onClose} size="xl">
  <DialogTitle>Kontakt bearbeiten</DialogTitle>

  {/* Alert nach Title */}
  {validationErrors.length > 0 && (
    <div className="px-6 pt-2">
      <Alert
        type="error"
        title="Validierungsfehler"
        message={validationErrors.join(', ')}
      />
    </div>
  )}

  <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
    {/* Content */}
  </DialogBody>

  <DialogActions>
    {/* Buttons */}
  </DialogActions>
</Dialog>
```

**Alert-Position: Nach Title** (`px-6 pt-2`)

---

### Dropdowns & Popovers

#### Filter-Popover (2-spaltig)

```tsx
<Popover className="relative">
  <Popover.Button className="h-10 w-10 border border-zinc-300...">
    <FunnelIcon className="h-5 w-5 stroke-2" />
  </Popover.Button>

  <Transition
    enter="transition ease-out duration-200"
    enterFrom="opacity-0 translate-y-1"
    enterTo="opacity-100 translate-y-0"
    leave="transition ease-in duration-150"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 translate-y-1"
  >
    <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px]
                              origin-top-right rounded-lg bg-white p-4
                              shadow-lg ring-1 ring-black ring-opacity-5">
      <div>
        {/* 2-spaltiges Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-[10px]">
            <label className="block text-sm font-semibold text-zinc-700 mb-1">
              Filter 1
            </label>
            {/* Checkboxen */}
          </div>
        </div>

        {/* Reset-Button am Ende */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2 border-t border-zinc-200">
            <button className="text-sm text-zinc-500 hover:text-zinc-700 underline">
              Zurücksetzen
            </button>
          </div>
        )}
      </div>
    </Popover.Panel>
  </Transition>
</Popover>
```

**Position:**
- Standard: `right-0 origin-top-right` (öffnet nach links)
- Links: `left-0 origin-top-left` (öffnet nach rechts)

**Breite:**
- Schmal: `w-64` (256px)
- Standard: `w-80` (320px)
- Breit: `w-96` (384px)
- 2-spaltig: `w-[600px]`

---

#### Action-Dropdown (3-Punkte-Menü)

```tsx
<Dropdown>
  <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md">
    <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
  </DropdownButton>

  <DropdownMenu anchor="bottom end">
    <DropdownItem onClick={handleView}>
      <EyeIcon className="h-4 w-4" />
      Anzeigen
    </DropdownItem>
    <DropdownItem onClick={handleEdit}>
      <PencilIcon className="h-4 w-4" />
      Bearbeiten
    </DropdownItem>
    <DropdownDivider />
    <DropdownItem onClick={handleDelete}>
      <TrashIcon className="h-4 w-4" />
      <span className="text-red-600">Löschen</span>
    </DropdownItem>
  </DropdownMenu>
</Dropdown>
```

**Verwendung:**
- Table-Row-Actions
- Card-Actions
- Overflow-Menüs

---

### Alerts & Toasts

#### Alert Component

```tsx
<Alert type="success" title="Erfolgreich gespeichert" />
<Alert type="error" title="Fehler" message="Die Aktion konnte nicht ausgeführt werden" />
<Alert type="warning" title="Achtung" message="Diese Aktion kann nicht rückgängig gemacht werden" />
<Alert type="info" title="Information" message="Neue Features verfügbar" />
```

**Alert-Container (Anti-Ruckeln-Pattern):**
```tsx
{/* Fester Platz unter Überschrift */}
<div className="mb-4 h-[50px]">
  {alert && (
    <Alert type={alert.type} title={alert.title} message={alert.message} />
  )}
</div>
```

**Warum feste Höhe?**
- Verhindert Layout-Shift
- Kein "Springen" der Seite
- Immer unter der Überschrift

---

#### Toast-Notifications

**TODO: Noch nicht definiert**

```tsx
// Placeholder:
// Position: Fixed top-right
// Auto-hide nach 5 Sekunden
// Stackable
```

---

### Navigation

**TODO: Vollständig zu definieren**

#### Tabs

```tsx
<nav className="-mb-px flex space-x-8">
  <button
    className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium
                ${active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
  >
    <BuildingOfficeIcon className={`mr-2 size-5 ${active ? 'text-primary' : 'text-zinc-400'}`} />
    <span>Firmen (24)</span>
  </button>
</nav>
```

**Styling:**
- Active: Primary-Farbe, border-bottom
- Inactive: Grau, transparent border
- Hover: Subtil

---

#### Sidebar Navigation

**TODO: Noch nicht definiert**

---

#### Breadcrumbs

**TODO: Noch nicht definiert**

---

### Cards

**TODO: Vollständig zu definieren**

```tsx
// Placeholder:
<div className="bg-white rounded-lg p-6">
  <h3 className="text-lg font-semibold text-zinc-900 mb-4">
    Card-Titel
  </h3>
  {/* Content */}
</div>
```

**Varianten zu definieren:**
- Standard Card
- Card mit Header/Footer
- Clickable Card
- Card mit Bild
- Stat Card

---

### Loading States

**TODO: Vollständig zu definieren**

#### Spinner

```tsx
// Aktuell im Projekt:
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
```

**Zu definieren:**
- Skeleton Screens
- Shimmer Effects
- Button-Loading-States
- Table-Loading-State

---

## Patterns

### Toolbar Pattern

**Standard-Layout: Search + Primary Action + Filter + More**

```tsx
<div className="mb-6">
  <div className="flex items-center gap-2">
    {/* 1. Search Input (flex-1 = nimmt verfügbaren Platz) */}
    <SearchInput className="flex-1" placeholder="Durchsuchen..." />

    {/* 2. Primary Action */}
    <Button className="bg-primary hover:bg-primary-hover text-white h-10 px-6">
      <PlusIcon className="h-4 w-4 mr-2" />
      Neu hinzufügen
    </Button>

    {/* 3. Filter (optional) */}
    <Popover>
      <button className="h-10 w-10 border border-zinc-300 bg-white...">
        <FunnelIcon className="h-5 w-5 stroke-2" />
      </button>
    </Popover>

    {/* 4. More Actions (optional) */}
    <Popover>
      <button className="h-10 w-10 border border-zinc-300 bg-white...">
        <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
      </button>
    </Popover>
  </div>
</div>
```

**Reihenfolge (wichtig!):**
1. **Search** - Hauptinteraktion
2. **Primary Action** - Wichtigste Aktion
3. **Filter** - Sekundäre Funktion
4. **More** - Overflow

---

### Results Info Pattern

```tsx
<div className="mb-4 flex items-center justify-between">
  {/* Left: Count */}
  <Text className="text-sm text-zinc-600">
    {filtered.length} von {total.length} Firmen
    {selected.length > 0 && (
      <span className="ml-2">
        · {selected.length} ausgewählt
      </span>
    )}
  </Text>

  {/* Right: Bulk Action (optional) */}
  {selected.length > 0 && (
    <button className="text-sm text-red-600 hover:text-red-700 underline">
      {selected.length} Löschen
    </button>
  )}
</div>
```

**Middle Dot:**
- ✅ `·` (U+00B7, Middle Dot)
- ❌ `•` (U+2022, Bullet, zu dick)

---

### Page Layout Pattern

**TODO: Zu definieren**

```tsx
// Standard-Seitenstruktur:
// - Header mit Titel
// - Alert-Bereich (fest)
// - Tabs (optional)
// - Toolbar
// - Results Info
// - Content (Table/Grid/Cards)
// - Pagination (optional)
```

---

### Form Layout Pattern

**TODO: Zu definieren**

---

### Empty State Pattern

**TODO: Zu definieren**

---

### Confirmation Dialog Pattern

**TODO: Zu definieren**

---

## Do's and Don'ts

### Allgemein

**✅ Do's:**
- Konsistente Höhen: h-10 für alle Toolbar-Elemente
- Einheitliche Borders: zinc-300 für Inputs/Buttons, zinc-200 für Tabellen
- Icon-Farben: text-zinc-700 (sichtbar, nicht dominant)
- Focus-States: Immer `focus:ring-2 focus:ring-primary`
- Gelb-Grün (#dedc00) für Checkboxen/Selections
- Spacing: gap-2 zwischen Toolbar-Elementen
- Transitions: `transition-colors` für sanfte Übergänge

**❌ Don'ts:**
- ❌ Keine Schatten (außer Dropdowns)
- ❌ Keine /20/solid Icons - nur /24/outline
- ❌ Keine inkonsistenten Grautöne - nur Zinc
- ❌ Kein Dark Mode (nicht implementiert)
- ❌ Keine nativen Checkboxen
- ❌ Keine Font Awesome / Material Icons

---

### Farben

**✅ Do's:**
- Zinc-Palette für neutrale Elemente
- #dedc00 für Checkboxen/Active States
- #005fab für Primary Actions
- Semantische Farben (red = Error, green = Success)
- Konsistente Farb-Nutzung (z.B. zinc-700 für alle Icons)

**❌ Don'ts:**
- ❌ Kein Blau für Checkboxen
- ❌ Keine Gray/Slate/Stone-Paletten
- ❌ Keine zu hellen Borders (schlecht sichtbar)
- ❌ Keine unterschiedlichen Grautöne für gleichen Zweck

---

### Icons

**✅ Do's:**
- Heroicons /24/outline ausschließlich
- stroke-2 für wichtige Icons
- stroke-[2.5] für extra-dicke Icons (3-Punkte)
- h-5 w-5 in Toolbars, h-4 w-4 in Tabellen
- text-zinc-700 als Standard-Farbe
- mr-2 Spacing bei Icon + Text

**❌ Don'ts:**
- ❌ Keine /20/solid Icons
- ❌ Keine anderen Icon-Bibliotheken
- ❌ Kein stroke-1 (zu dünn)
- ❌ Keine inkonsistenten Größen

---

### Interaktive Elemente

**✅ Do's:**
- Hover: hover:bg-zinc-50 (subtil), hover:bg-zinc-200 (sichtbar)
- Focus-Rings für Accessibility
- transition-colors für sanfte Übergänge
- cursor-pointer für Clickables
- Disabled: opacity-50 + cursor-not-allowed

**❌ Don'ts:**
- ❌ Kein hover:bg-zinc-100 bei 3-Punkte (zu wenig Kontrast)
- ❌ Keine Transitions ohne Easing
- ❌ Keine interaktiven Elemente ohne Hover

---

### Layout & Spacing

**✅ Do's:**
- gap-2 zwischen Toolbar-Buttons
- gap-4 in 2-spaltigen Grids
- px-6 py-4 für Table Cells
- mb-4 / mb-6 für Sections
- h-[50px] für Alert-Container (Anti-Ruckeln)

**❌ Don'ts:**
- ❌ Keine willkürlichen Pixel-Werte
- ❌ Keine Layout-Shifts durch dynamische Inhalte
- ❌ Keine inkonsistenten Paddings

---

## Erweiterung & Workflow

### Neue Komponente hinzufügen

1. **Komponente implementieren** (`/src/components/ui/`)
2. **Dokumentation hier hinzufügen**:
   - Screenshot/Beispiel
   - Code-Snippet
   - Varianten
   - Do's & Don'ts
3. **Version hochzählen** (unten)

### Neue Pattern hinzufügen

1. **Pattern identifizieren** (wiederkehrende UI-Struktur)
2. **Im Projekt umsetzen**
3. **Hier dokumentieren** mit Code-Beispiel

### Feedback & Fragen

- Bei Unklarheiten: TODO markieren
- Bei fehlenden Komponenten: Placeholder erstellen
- Pull Requests für Design-Änderungen

---

## Changelog

### Version 1.1 - Januar 2025
- ✅ **Modals & Dialogs**: Vollständig dokumentiert
  - Modal-Größen (xs bis 5xl)
  - Scrollbare Modals (h-[500px] Standard)
  - Modal mit Tabs (Tab-Navigation Pattern)
  - FieldGroup Pattern (Formular-Container)
  - Feldgruppen mit Hintergrund (bg-gray-50)
  - Checkboxen (#dedc00 gelb mit weißem Häkchen)
  - Länder-/Telefon-Felder mit Flaggen (h-4 w-6)
  - Modal-Actions (Footer mit Buttons)
  - Bestätigungs-Modal Pattern
  - Validation & Alerts in Modals

### Version 1.0 - Januar 2025
- ✅ Foundation: Farben, Typografie, Spacing, Icons
- ✅ Buttons: Primary, Icon-Buttons, Dropdown-Actions
- ✅ Form Elements: Input, Search, Checkbox
- ✅ Tables: Header, Rows, Borders
- ✅ Badges: Standard-Varianten
- ✅ Dropdowns: Filter-Popover, Action-Menü
- ✅ Alerts: Alert-Component, Anti-Ruckeln-Pattern
- ✅ Patterns: Toolbar, Results Info
- 📝 TODO: Secondary Buttons, Cards, Navigation, Loading States

---

## Referenzen

- **Basis-Komponenten**: `/src/components/ui/`
- **Referenz-Seite**: `/src/app/dashboard/contacts/crm/page.tsx`
- **Tailwind Config**: `/tailwind.config.ts`
- **CeleroPress Design Patterns**: `/docs/DESIGN_PATTERNS.md` (falls vorhanden)

---

*Dieses Design System ist ein lebendes Dokument und wird kontinuierlich erweitert.*
