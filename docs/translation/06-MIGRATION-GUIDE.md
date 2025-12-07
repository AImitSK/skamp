# Migrations-Leitfaden für UI-Komponenten

**Status:** Template
**Zweck:** Schrittweise Migration bestehender Seiten auf i18n

---

## Grundprinzip: Minimal-Invasiv

Die deutsche Version muss **jederzeit funktionieren**. Migration erfolgt:
- Seite für Seite
- Ohne Breaking Changes
- Mit automatischem Fallback auf Deutsch

---

## Vor der Migration

### Checkliste
- [ ] next-intl ist installiert und konfiguriert
- [ ] `/messages/de.json` existiert mit Basis-Texten
- [ ] Provider ist in `layout.tsx` eingerichtet
- [ ] Fallback-Sprache ist 'de'

---

## Migrations-Template

### Schritt 1: Seite identifizieren

**Beispiel:** `src/app/dashboard/contacts/page.tsx`

### Schritt 2: Hardcodierte Texte finden

```tsx
// VORHER - Hardcodierte Texte
function ContactsPage() {
  return (
    <div>
      <h1>Kontakte</h1>
      <Button>Neuer Kontakt</Button>
      <p>Keine Kontakte gefunden</p>
      {error && <Alert>Fehler beim Laden</Alert>}
    </div>
  );
}
```

### Schritt 3: Übersetzungs-Keys definieren

In `/messages/de.json` hinzufügen:
```json
{
  "contacts": {
    "title": "Kontakte",
    "newContact": "Neuer Kontakt",
    "empty": "Keine Kontakte gefunden",
    "loadError": "Fehler beim Laden"
  }
}
```

In `/messages/en.json` hinzufügen:
```json
{
  "contacts": {
    "title": "Contacts",
    "newContact": "New Contact",
    "empty": "No contacts found",
    "loadError": "Error loading data"
  }
}
```

### Schritt 4: Komponente migrieren

```tsx
// NACHHER - Mit i18n
import { useTranslations } from 'next-intl';

function ContactsPage() {
  const t = useTranslations('contacts');

  return (
    <div>
      <h1>{t('title')}</h1>
      <Button>{t('newContact')}</Button>
      <p>{t('empty')}</p>
      {error && <Alert>{t('loadError')}</Alert>}
    </div>
  );
}
```

### Schritt 5: Testen

1. [ ] Deutsche Version funktioniert wie vorher
2. [ ] Englische Version zeigt Übersetzungen
3. [ ] Fehlende Keys zeigen Fallback (deutsch)

---

## Patterns für häufige Fälle

### 1. Einfache Labels
```tsx
// Vorher
<Button>Speichern</Button>

// Nachher
<Button>{t('common.save')}</Button>
```

### 2. Mit Variablen
```tsx
// Vorher
<p>Willkommen, {user.name}!</p>

// Nachher
// de.json: "welcome": "Willkommen, {name}!"
// en.json: "welcome": "Welcome, {name}!"
<p>{t('welcome', { name: user.name })}</p>
```

### 3. Pluralisierung
```tsx
// Vorher
<p>{count} Kontakte</p>

// Nachher
// de.json: "contactCount": "{count, plural, =0 {Keine Kontakte} =1 {1 Kontakt} other {# Kontakte}}"
<p>{t('contactCount', { count })}</p>
```

### 4. HTML in Übersetzungen
```tsx
// de.json: "terms": "Ich akzeptiere die <link>AGB</link>"
<p>
  {t.rich('terms', {
    link: (chunks) => <a href="/terms">{chunks}</a>
  })}
</p>
```

### 5. Datum/Zeit Formatierung
```tsx
import { useFormatter } from 'next-intl';

function DateDisplay({ date }) {
  const format = useFormatter();
  return <span>{format.dateTime(date, { dateStyle: 'medium' })}</span>;
}
```

### 6. Server Components
```tsx
// Server Component
import { getTranslations } from 'next-intl/server';

async function ServerComponent() {
  const t = await getTranslations('contacts');
  return <h1>{t('title')}</h1>;
}
```

---

## Namespace-Konventionen

| Namespace | Verwendung | Beispiele |
|-----------|------------|-----------|
| `common` | Globale UI-Elemente | save, cancel, delete, loading |
| `errors` | Fehlermeldungen | notFound, serverError, validation |
| `navigation` | Menü/Navigation | dashboard, contacts, campaigns |
| `contacts` | Kontakte-Modul | title, newContact, filters |
| `campaigns` | Kampagnen-Modul | title, create, status |
| `crm` | CRM allgemein | companies, tags |
| `monitoring` | Monitoring-Modul | clippings, reports |

---

## Migrations-Reihenfolge (Empfehlung)

### Priorität 1: Globale Komponenten
1. [ ] Header/Navigation
2. [ ] Sidebar
3. [ ] Common Buttons (save, cancel, delete)
4. [ ] Toast-Meldungen
5. [ ] Error-Komponenten

### Priorität 2: Häufig genutzte Seiten
6. [ ] Dashboard
7. [ ] Kontakte-Liste
8. [ ] Kampagnen-Übersicht

### Priorität 3: Detail-Seiten
9. [ ] Kontakt-Detail
10. [ ] Kampagnen-Editor
11. [ ] Settings

### Priorität 4: Seltener genutzte Bereiche
12. [ ] Monitoring
13. [ ] Reports
14. [ ] Admin-Bereich

---

## Datei-Checkliste pro Seite

```markdown
## Migration: [Seitenname]

**Datei:** `src/app/dashboard/[bereich]/page.tsx`
**Namespace:** `[bereich]`

### Gefundene Texte:
- [ ] "Text 1" → `bereich.key1`
- [ ] "Text 2" → `bereich.key2`
- [ ] "Text 3" → `common.key3` (bereits vorhanden)

### Status:
- [ ] Keys in de.json hinzugefügt
- [ ] Keys in en.json hinzugefügt
- [ ] Komponente migriert
- [ ] Getestet (DE)
- [ ] Getestet (EN)
```

---

## Häufige Fehler vermeiden

### ❌ NICHT: Übersetzungen inline
```tsx
// SCHLECHT
<Button>{locale === 'en' ? 'Save' : 'Speichern'}</Button>
```

### ✅ STATTDESSEN: Immer t() verwenden
```tsx
// GUT
<Button>{t('common.save')}</Button>
```

---

### ❌ NICHT: Fehlende Fallbacks
```tsx
// SCHLECHT - Fehler wenn Key fehlt
<p>{t('nonExistentKey')}</p>
```

### ✅ STATTDESSEN: Fallback konfigurieren
```typescript
// next-intl Konfiguration
{
  onError: (error) => console.warn(error),
  getMessageFallback: ({ key }) => key
}
```

---

### ❌ NICHT: Ganze Sätze als Keys
```json
// SCHLECHT
{
  "Willkommen bei unserer Anwendung, bitte melden Sie sich an": "..."
}
```

### ✅ STATTDESSEN: Kurze, beschreibende Keys
```json
// GUT
{
  "welcomeMessage": "Willkommen bei unserer Anwendung, bitte melden Sie sich an"
}
```

---

## Nach der Migration

### Cleanup
- [ ] Keine hardcodierten deutschen Texte mehr in Komponente
- [ ] Alle Keys in beiden Sprach-Dateien vorhanden
- [ ] Keine `// TODO: translate` Kommentare übrig

### Dokumentation
- [ ] Migrierte Seite in dieser Liste abhaken
- [ ] Besonderheiten dokumentieren
