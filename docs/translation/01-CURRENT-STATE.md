# Ist-Analyse: Internationalisierung

**Zuletzt aktualisiert:** 2024-12-06
**Status:** Analyse abgeschlossen
**Siehe auch:** [README.md](./README.md) für Masterplan

---

## 1. Ausgangssituation

### 1.1 Aktueller Stand
Die CeleroPress-Anwendung ist derzeit **vollständig auf Deutsch** aufgebaut:
- Alle UI-Texte sind hardcodiert auf Deutsch
- Email-Templates nur in Deutsch
- Systembenachrichtigungen nur in Deutsch
- Keine i18n-Bibliothek installiert

### 1.2 Geschäftliche Anforderungen
- Viele Verlage veröffentlichen **Deutsch und Englisch** und fordern Pressemitteilungen zweisprachig an
- Internationale Expansion erfordert mehrsprachige Inhalte
- Kunden mit internationalen Teams benötigen englische UI

### 1.3 Identifizierte Hürden

| Kategorie | Problem | Priorität |
|-----------|---------|-----------|
| **Content** | Boilerplates, PR-Texte, Email-Anschreiben nur einsprachig | HOCH |
| **System** | Bestätigungsmails, Error Handling, Benachrichtigungen nur Deutsch | HOCH |
| **UI** | Alle Labels, Buttons, Meldungen hardcodiert Deutsch | MITTEL |
| **Infrastruktur** | Keine i18n-Bibliothek, keine Übersetzungsstruktur | HOCH |

---

## 2. Vorhandene Infrastruktur

### 2.1 ISO Standard Types (✅ Vorhanden)
```typescript
// src/types/international.ts
export type LanguageCode = 'de' | 'en' | 'fr' | 'it' | 'es' | 'nl' | 'pl' | 'pt' | 'cs' | 'hu' | 'ro' | 'bg' | 'el' | 'sv' | 'da' | 'no' | 'fi' | string;
export type CountryCode = 'DE' | 'AT' | 'CH' | 'GB' | 'US' | ...;
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | ...;
```

### 2.2 Sprachfelder in Datenmodellen (✅ Teilweise vorhanden)

| Entity | Feld | Status |
|--------|------|--------|
| `ContactEnhanced` | `communicationPreferences.preferredLanguage` | ✅ Definiert, ❌ nicht genutzt |
| `ContactEnhanced` | `personalInfo.languages[]` | ✅ Definiert, ❌ nicht genutzt |
| `BoilerplateEnhanced` | `language`, `translations` | ✅ Definiert, ❌ kein UI |
| `Publication` | `languages[]`, `secondaryLanguages[]` | ✅ Definiert, ✅ teilweise genutzt |
| `Organization` | `settings.defaultLanguage` | ✅ Definiert, ❌ nicht genutzt |

### 2.3 Boilerplate Übersetzungs-Struktur (✅ Vorbereitet)
```typescript
// src/types/crm-enhanced.ts
export interface BoilerplateEnhanced {
  language?: LanguageCode;           // Primärsprache
  translations?: {
    [key in LanguageCode]?: {
      name: string;
      content: string;
      description?: string;
    };
  };
}
```

---

## 3. Hardcodierte Deutsche Texte

### 3.1 Email-Templates (31+ Dateien)

**Kritische Dateien:**
- `src/lib/email/team-invitation-templates.ts` - Einladungsmails
- `src/lib/email/approval-email-templates.ts` - Freigabe-Mails
- `src/lib/email/auto-reporting-email-templates.ts` - Report-Benachrichtigungen

**Beispiele:**
```typescript
// team-invitation-templates.ts
const subject = `Einladung zum Team von ${data.organizationName}`;
const roleDescriptions = {
  admin: 'Administrator - Vollzugriff auf alle Funktionen',
  member: 'Team-Mitglied - Kann PR-Kampagnen erstellen und versenden',
  // ...
};
```

### 3.2 UI-Labels (src/types/crm-enhanced.ts)

```typescript
// Aktuell hardcodiert
export const COMPANY_STATUS_OPTIONS = [
  { value: 'prospect', label: 'Interessent' },
  { value: 'active', label: 'Aktiv' },
  // ...
];

export const companyTypeLabels = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  // ...
};
```

### 3.3 Toast/Benachrichtigungen (50+ Stellen)

```typescript
// Verstreut in Komponenten
toastService.success('Vorschlag erfolgreich als Clipping gespeichert');
toastService.error('Fehler beim Übernehmen des Vorschlags');
```

### 3.4 Error Handler

```typescript
// src/utils/emailErrorHandler.ts
- "Kampagne mit ID ${campaignId} nicht gefunden"
- "SendGrid Fehler: ${message}"
- "Ein unbekannter Fehler ist aufgetreten"
```

---

## 4. Lösungsansätze

### 4.1 Option A: next-intl (Empfohlen für Next.js)

**Vorteile:**
- Native Next.js App Router Integration
- Server-Side Rendering Support
- Automatische Locale Detection
- Type-Safety

**Struktur:**
```
/messages
  /de.json
  /en.json
  /fr.json
```

### 4.2 Option B: react-i18next

**Vorteile:**
- Weit verbreitet, große Community
- Namespace-Support für modulare Übersetzungen
- Interpolation und Pluralisierung

### 4.3 Option C: Hybrid-Ansatz (Für Content)

Für mehrsprachige **Inhalte** (PR-Texte, Boilerplates):
- Datenbank-basierte Übersetzungen
- Pro Entität: `translations: { de: {...}, en: {...} }`
- Keine externe Bibliothek nötig

---

## 5. Unterscheidung: UI vs. Content

### 5.1 UI-Internationalisierung
**Was:** Labels, Buttons, Systemtexte, Fehlermeldungen
**Lösung:** i18n-Bibliothek (next-intl)
**Speicherort:** JSON-Dateien im Code
**Beispiel:**
```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen"
  },
  "errors": {
    "notFound": "Nicht gefunden"
  }
}
```

### 5.2 Content-Internationalisierung
**Was:** Boilerplates, PR-Texte, Email-Anschreiben
**Lösung:** Datenbank-Feld `translations`
**Speicherort:** Firestore
**Beispiel:**
```typescript
{
  id: "boilerplate-1",
  language: "de",
  content: "Über uns: ...",
  translations: {
    en: { content: "About us: ..." },
    fr: { content: "À propos de nous: ..." }
  }
}
```

---

## 6. Priorisierte Roadmap

### Phase 1: Foundation (Sprint 1-2)
- [ ] next-intl installieren und konfigurieren
- [ ] Ordnerstruktur für Übersetzungen anlegen
- [ ] Sprach-Switcher im UI implementieren
- [ ] Basis-Labels migrieren (Button, Common, Errors)

### Phase 2: Email-System (Sprint 3)
- [ ] Email-Template-Service internationalisieren
- [ ] Template-Auswahl nach Empfänger-Sprache
- [ ] Systembenachrichtigungen übersetzen

### Phase 3: Content-Management (Sprint 4-5)
- [ ] Boilerplate-UI für Übersetzungen erweitern
- [ ] PR-Kampagne: Sprachversion-Auswahl
- [ ] Zweisprachiger Versand von Pressemitteilungen

### Phase 4: Vollständige Migration (Sprint 6+)
- [ ] Alle Komponenten migrieren
- [ ] API-Responses lokalisieren
- [ ] AI-Flows mehrsprachig machen

---

## 7. Technische Entscheidungen

### 7.1 Empfohlene Bibliothek
**next-intl** - Native Next.js Integration, Type-Safety, App Router Support

### 7.2 Sprach-Fallback-Strategie
```
Nutzer-Präferenz → Organisation-Default → Browser-Locale → 'de'
```

### 7.3 Speicherort der Übersetzungen

| Typ | Speicherort | Format |
|-----|-------------|--------|
| UI-Texte | `/messages/{locale}.json` | JSON |
| Email-Templates | `/messages/emails/{locale}.json` | JSON |
| Boilerplates | Firestore `translations` Feld | Datenbank |
| PR-Inhalte | Firestore `translations` Feld | Datenbank |

### 7.4 Namespace-Struktur
```
messages/
├── de.json           # Fallback/Default
├── en.json
├── fr.json
└── [namespace]/
    ├── common.json   # Allgemeine UI-Texte
    ├── errors.json   # Fehlermeldungen
    ├── emails.json   # Email-Betreffzeilen, etc.
    ├── crm.json      # CRM-spezifische Labels
    ├── pr.json       # PR-Campaign Labels
    └── dashboard.json
```

---

## 8. Offene Fragen

1. **Welche Sprachen initial?**
   - Empfehlung: DE, EN (später FR, ES)

2. **Wer übersetzt?**
   - Professionelle Übersetzung vs. maschinell + Review

3. **Wie mit bestehenden Boilerplates umgehen?**
   - Migration oder nur neue mehrsprachig?

4. **Performance-Überlegungen?**
   - Bundle-Size bei vielen Sprachen
   - Lazy-Loading von Übersetzungen

---

## 9. Nächste Schritte

1. **Entscheidung:** i18n-Bibliothek auswählen (Empfehlung: next-intl)
2. **POC:** Kleine Komponente migrieren als Proof of Concept
3. **Priorisierung:** Kritische Pfade zuerst (Email-Versand)
4. **Team-Alignment:** Übersetzungs-Workflow definieren

---

## Anhang: Betroffene Dateien

<details>
<summary>Email-Templates (klicken zum Ausklappen)</summary>

- `src/lib/email/team-invitation-templates.ts`
- `src/lib/email/approval-email-templates.ts`
- `src/lib/email/auto-reporting-email-templates.ts`
- `src/lib/email/email-sender-service.ts`
- `src/lib/email/email-composer-service.ts`

</details>

<details>
<summary>UI-Label Definitionen (klicken zum Ausklappen)</summary>

- `src/types/crm-enhanced.ts` (Labels, Options)
- `src/types/pr.ts` (Edit Lock Labels)
- `src/types/library.ts` (Publication Labels)
- `src/types/lists.ts` (Filter Labels)

</details>

<details>
<summary>Komponenten mit hardcodierten Texten (klicken zum Ausklappen)</summary>

- `src/components/pr/campaign/*`
- `src/components/pr/email/*`
- `src/components/monitoring/*`
- `src/components/dashboard/*`
- `src/app/dashboard/**/*.tsx`

</details>
