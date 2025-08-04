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
<Button plain onClick={() => router.back()}>
  <ArrowLeftIcon className="h-4 w-4 mr-2" />
  Zurück zur Übersicht
</Button>
```

**NICHT verwenden:**
- ❌ `bg-zinc-50 hover:bg-zinc-100 px-3 py-2 rounded-lg border`
- ❌ Links statt Buttons für Navigation

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

## 📦 Content Boxes & Cards

### Grundregel: KEINE Schatten
- **NIEMALS:** `shadow`, `shadow-md`, `hover:shadow-md` verwenden
- **Stattdessen:** Nur Borders für Abgrenzung

### Standard Content-Boxen
```tsx
<div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
  {/* Content */}
</div>
```

### Status-Cards (Reichweite, Metriken, etc.)
**Kompakt und dezent:**
```tsx
<div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
  <div className="flex items-center gap-3">
    <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
    <div className="flex-1 min-w-0">
      <div className="text-lg font-semibold text-zinc-900 dark:text-white">
        {value}
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
        {label}
      </div>
      {subValue && (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
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

### Tabellen
- **Zell-Padding:** `px-6 py-4`
- **Header-Padding:** `px-6 py-3`

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

## 🧪 Qualitätssicherung

### Checkliste vor Commit
- [ ] Keine `shadow`-Klassen verwendet
- [ ] Alle Icons sind `@heroicons/react/24/outline`
- [ ] Icon-Größen entsprechen Standard (h-4, h-5, h-6)
- [ ] Zurück-Buttons ohne Hintergrundfarbe
- [ ] Status-Cards kompakt gestaltet
- [ ] CeleroPress statt SKAMP verwendet
- [ ] Dark-Mode getestet

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
- **Publications Detail-Page:** Korrekte Status-Cards
- **CRM Detail-Pages:** Standard Zurück-Buttons
- **Library Features:** Konsistente Icon-Verwendung

### Zu vermeidende Patterns
- Große, aufgeblähte Status-Cards
- Schatten-Effekte auf Content-Boxen
- Inconsistente Icon-Größen
- Zurück-Buttons mit Hintergrundfarbe

---

**Letzte Aktualisierung:** 2025-08-04  
**Version:** 1.0  
**Gültig für:** Alle CeleroPress Features