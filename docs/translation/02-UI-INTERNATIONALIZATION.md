# UI-Internationalisierung

**Status:** Konzept
**Priorität:** 1 (Foundation)
**Sprachen Initial:** Deutsch, Englisch

---

## Ziel

Die Benutzeroberfläche soll zwischen Deutsch und Englisch umschaltbar sein, mit der Möglichkeit später weitere Sprachen hinzuzufügen.

---

## Anforderungen

### Funktional
- [ ] Sprachauswahl in User-Settings oder Header
- [ ] Sprache wird pro User gespeichert
- [ ] Fallback auf Deutsch wenn Übersetzung fehlt
- [ ] Alle UI-Texte übersetzbar (Labels, Buttons, Meldungen, Errors)

### Technisch
- [ ] Erweiterbar auf weitere Sprachen ohne Code-Änderung
- [ ] Type-Safety für Übersetzungs-Keys
- [ ] Server-Side Rendering Support
- [ ] Keine Performance-Einbußen

---

## Technologie: next-intl

### Warum next-intl?
- Native Next.js App Router Integration
- Server Components Support
- Type-Safe Message Keys
- Kleine Bundle-Size
- Aktiv gewartet

### Alternativen (abgelehnt)
| Bibliothek | Grund für Ablehnung |
|------------|---------------------|
| react-i18next | Komplexer Setup für App Router |
| lingui | Weniger Verbreitung |
| Eigene Lösung | Zu viel Aufwand |

---

## Architektur

### Ordnerstruktur
```
/messages
├── de.json          # Deutsche Übersetzungen (Default/Fallback)
├── en.json          # Englische Übersetzungen
└── (später: fr.json, es.json, ...)
```

### Namespace-Struktur (innerhalb JSON)
```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "loading": "Laden...",
    "error": "Fehler",
    "success": "Erfolgreich"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "contacts": "Kontakte",
    "campaigns": "Kampagnen"
  },
  "errors": {
    "notFound": "Nicht gefunden",
    "unauthorized": "Nicht autorisiert",
    "serverError": "Serverfehler"
  },
  "toasts": {
    "saved": "Erfolgreich gespeichert",
    "deleted": "Erfolgreich gelöscht",
    "error": "Ein Fehler ist aufgetreten",
    "loadError": "Fehler beim Laden",
    "saveError": "Fehler beim Speichern",
    "copied": "In Zwischenablage kopiert",
    "emailSent": "E-Mail wurde versendet"
  },
  "crm": { ... },
  "pr": { ... },
  "monitoring": { ... }
}
```

---

## Sprachauswahl-Speicherung

### Option A: User-Dokument (Empfohlen)
```typescript
interface User {
  // ... existing fields
  preferences: {
    language: 'de' | 'en';  // UI-Sprache
    // ...
  }
}
```

### Option B: LocalStorage
- Schneller, keine DB-Abfrage
- Aber: Nicht sync zwischen Geräten

**Empfehlung:** User-Dokument mit LocalStorage-Cache

---

## Konfiguration

### Unterstützte Sprachen (erweiterbar)
```typescript
// src/config/i18n.ts
export const SUPPORTED_UI_LANGUAGES = ['de', 'en'] as const;
export type UILanguage = typeof SUPPORTED_UI_LANGUAGES[number];

export const DEFAULT_LANGUAGE: UILanguage = 'de';

export const LANGUAGE_NAMES: Record<UILanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

// Später einfach erweiterbar:
// export const SUPPORTED_UI_LANGUAGES = ['de', 'en', 'fr', 'es'] as const;
```

---

## Minimal-Invasive Migration

### Prinzip: Wrapper-Ansatz

**Vorher (hardcodiert):**
```tsx
<Button>Speichern</Button>
```

**Nachher (mit Fallback):**
```tsx
<Button>{t('common.save')}</Button>
// Wenn 'common.save' fehlt → zeigt Key oder Fallback
```

### Schrittweise Migration
1. next-intl installieren + konfigurieren
2. Provider einrichten (mit Default: 'de')
3. Neue Komponenten nutzen `useTranslations()`
4. Bestehende Seiten nach und nach migrieren
5. **Deutsche Version funktioniert immer** (Fallback)

---

## Implementierungs-Schritte

### Schritt 1: Installation
```bash
npm install next-intl
```

### Schritt 2: Konfiguration
```typescript
// next.config.js
const withNextIntl = require('next-intl/plugin')();
module.exports = withNextIntl({ ... });
```

### Schritt 3: Provider Setup
```typescript
// src/app/[locale]/layout.tsx
// ODER: Middleware für Locale-Detection
```

### Schritt 4: Übersetzungsdateien
```
/messages/de.json
/messages/en.json
```

### Schritt 5: Nutzung in Komponenten
```tsx
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}
```

---

## Toast Service Integration

Der Toast Service (`src/lib/utils/toast.ts`) wird von **~90 Dateien** mit hardcodierten deutschen Texten aufgerufen.

### Strategie: Zentrale Übersetzung

Anstatt ~90 Dateien zu ändern, wird der Toast Service selbst i18n-fähig gemacht:

```typescript
// VORHER (Legacy - funktioniert weiter!)
toastService.success('Erfolgreich gespeichert');

// NACHHER (Mit i18n)
toastService.success('toasts.saved');
toastService.success('toasts.contactCreated', { name: contact.name });
```

### Implementierung

1. Toast Service erkennt Keys mit `toasts.` Prefix
2. ToastProvider injiziert die `t()`-Funktion
3. Alte String-Aufrufe funktionieren weiterhin (Abwärtskompatibilität)

**Details:** Siehe `.claude/agents/i18n-migration.md` Abschnitt "Toast Service Migration"

---

## Settings-Seite: `/settings/language`

### Design-Entscheidung
Die Spracheinstellungen werden unter `/settings/language` zentral verwaltet.

### UI-Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│  Einstellungen → Sprache                                        │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ UI-Sprache                                                  ││
│  │                                                             ││
│  │ Wählen Sie die Sprache der Benutzeroberfläche:              ││
│  │                                                             ││
│  │ [🇩🇪 Deutsch ▼]                                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Content-Sprachen                                            ││
│  │                                                             ││
│  │ Ihre Organisation erstellt Inhalte in folgenden Sprachen:   ││
│  │                                                             ││
│  │ Primärsprache (fest):                                       ││
│  │ 🇩🇪 Deutsch                                                  ││
│  │                                                             ││
│  │ Zusätzliche Sprachen (max. 3):                              ││
│  │ [🇬🇧 Englisch    ✕]                                          ││
│  │ [🇫🇷 Französisch ✕]                                          ││
│  │ [+ Sprache hinzufügen via Land-Auswahl]                     ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Glossar                                                     ││
│  │                                                             ││
│  │ [+ Neuer Eintrag]                           🔍 Suchen...    ││
│  │                                                             ││
│  │ ┌───────────┬───────────────┬───────────┬────────────────┐  ││
│  │ │ Kunde     │ Deutsch       │ Englisch  │ Französisch    │  ││
│  │ ├───────────┼───────────────┼───────────┼────────────────┤  ││
│  │ │ KBA       │ Spannwelle    │ Air Shaft │ Arbre expansi. │  ││
│  │ │ KBA       │ Druckmaschine │ Press     │ Presse         │  ││
│  │ │ Bosch     │ Steuergerät   │ ECU       │ Calculateur    │  ││
│  │ └───────────┴───────────────┴───────────┴────────────────┘  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Sprach-Auswahl via CountrySelector

Die Auswahl zusätzlicher Content-Sprachen erfolgt über die bestehende `CountrySelector`-Komponente:
- User wählt ein Land (z.B. 🇨🇭 Schweiz)
- System verwendet `getLanguagesForCountry('CH')` → `['de', 'fr', 'it']`
- Bei mehreren Sprachen pro Land: Dropdown zur Auswahl

**Vorhandene Infrastruktur:**
- `src/components/ui/country-selector.tsx` - CountrySelector Komponente
- `src/lib/validators/iso-validators.ts` - `getLanguagesForCountry()`, `LANGUAGE_DATA`

### Content-Sprachen Logik

```typescript
interface OrganizationLanguageSettings {
  // UI-Sprache (wird in User-Preferences gespeichert)
  // Siehe User.preferences.language

  // Content-Sprachen (Organisation-Level)
  contentLanguages: {
    primary: LanguageCode;      // Fest, entspricht UI-Sprache
    additional: LanguageCode[]; // Max. 3, via CountrySelector gewählt
  };
}
```

**Regeln:**
- Primärsprache ist FEST (= UI-Sprache der Organisation)
- Max. 3 zusätzliche Sprachen wählbar
- Sprachauswahl über Land-Dropdown (CountrySelector)
- Glossar-Spalten passen sich dynamisch an gewählte Sprachen an

---

## Offene Fragen

1. **URL-Strategie?**
   - ~~Option A: `/de/dashboard`, `/en/dashboard` (SEO-freundlich)~~
   - ✅ **Option B: Keine URL-Änderung, nur Cookie/Header** (Empfohlen für SaaS-App)

2. ~~**Wo sitzt der Sprach-Switcher?**~~ ✅ Entschieden
   - `/settings/language` Seite

3. **Server Components vs. Client Components?**
   - next-intl unterstützt beides
   - Strategie für bestehende Komponenten?

---

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Fehlende Übersetzung bricht UI | Fallback auf Deutsch |
| Performance durch Bundle-Size | Nur aktive Sprache laden |
| Komplexität in bestehenden Komponenten | Schrittweise Migration |
| Team muss neue Patterns lernen | Dokumentation + Template |

---

## Nächste Schritte

1. [ ] Entscheidung: URL-Strategie
2. [ ] Entscheidung: Sprach-Switcher Position
3. [ ] next-intl installieren
4. [ ] Basis-Übersetzungsdatei (de.json) mit Common-Texten
5. [ ] Eine Beispiel-Seite migrieren als POC
