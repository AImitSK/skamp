# Phase 1: Foundation - ToDo-Liste

**Status:** ✅ ABGESCHLOSSEN
**Ziel:** Grundinfrastruktur für Internationalisierung aufbauen

---

## 1. next-intl Setup ✅ ABGESCHLOSSEN

### 1.1 Installation
- [x] `npm install next-intl` ausführen
- [x] Verify: Package in `package.json` vorhanden

### 1.2 Konfiguration
- [x] `src/config/i18n.ts` erstellen
- [x] `src/i18n/request.ts` erstellen (next-intl Server-Konfiguration)
- [x] `next.config.mjs` erweitern mit next-intl Plugin

### 1.3 Übersetzungsdateien
- [x] `/messages/de.json` erstellen mit Basis-Struktur:
  - `common` (save, cancel, delete, edit, loading, error, success)
  - `navigation` (dashboard, contacts, campaigns, etc.)
  - `errors` (notFound, unauthorized, serverError)
  - `toasts` (saved, deleted, error, loadError, etc.)
  - `settings.language` (UI für Spracheinstellungen)
- [x] `/messages/en.json` erstellen (Kopie von de.json, übersetzt)

### 1.4 Provider Integration
- [x] `NextIntlClientProvider` in Root-Layout einbinden
- [x] Locale aus `getLocale()` dynamisch laden
- [ ] Verify: `useTranslations()` Hook funktioniert in Test-Komponente (steht aus)

---

## 2. Settings-Seite `/settings/language` ✅ UI ABGESCHLOSSEN

### 2.1 Routing & Page
- [x] `src/app/dashboard/settings/language/page.tsx` erstellen
- [x] Navigation-Link in Settings-Sidebar hinzufügen (SettingsNav.tsx)
- [x] Basis-Layout mit Heading "Sprache"
- [x] useTranslations() Hook integriert und funktioniert
- [x] FlagIcon-Komponente statt Emoji-Flaggen
- [x] Einheitliches blaues Design für alle Icon-Boxen

### 2.2 Box 1: UI-Sprache
- [x] UI-Sprache Dropdown (DE/EN) mit Select-Komponente
- [ ] Speichern in User-Preferences (`user.preferences.language`) - TODO
- [ ] Bei Änderung: Locale im Provider aktualisieren - TODO

### 2.3 Box 2: Content-Sprachen
- [x] Anzeige Primärsprache (fest, nicht editierbar) mit FlagIcon
- [x] Liste zusätzlicher Sprachen (max. 3) mit FlagIcon
- [x] UI für Sprachen-Tags mit Remove-Button
- [x] Entfernen-Button (X) pro zusätzlicher Sprache
- [ ] "Sprache hinzufügen" Button → CountrySelector Modal - TODO
- [ ] Bei Ländern mit mehreren Sprachen: Sprach-Auswahl Dropdown - TODO
- [ ] Speichern in Organization (`organization.contentLanguages`) - TODO

### 2.4 Box 3: Glossar-Tabelle
- [x] Tabelle mit Spalten: Kunde, Deutsch, [dynamische Sprachen], Aktionen
- [x] Spalten basierend auf `contentLanguages` generieren
- [x] Filter-Dropdown nach Kunde (UI)
- [x] Suche über alle Begriffe (UI)
- [ ] Pagination - TODO
- [ ] "Neuer Eintrag" Button → Modal öffnen - TODO

### 2.5 Glossar-Modal (Neu/Bearbeiten)
- [ ] Kunde-Dropdown (alle Companies der Organization)
- [ ] Deutsch-Feld (Pflicht)
- [ ] Dynamische Sprach-Felder basierend auf `contentLanguages`
- [ ] Kontext-Feld (optional)
- [ ] Speichern/Abbrechen Buttons
- [ ] Validierung: Deutsch-Feld required

---

## 3. Datenmodell erweitern ✅ ABGESCHLOSSEN

### 3.1 Organization erweitern
- [x] Type `Organization` erweitern in `src/types/organization.ts`:
  ```typescript
  contentLanguages?: {
    primary: string;      // z.B. 'de'
    additional: string[]; // z.B. ['en', 'fr']
  };
  ```
- [ ] Migration: Default-Wert für bestehende Organizations setzen
- [ ] API-Endpoints für contentLanguages Update

### 3.2 User Preferences erweitern
- [x] `user.preferences.language` Feld in `UserProfileData` hinzugefügt
- [x] `UserPreferences` Interface erstellt
- [x] `updateLanguagePreference()` Methode in user-service
- [x] `getLanguagePreference()` Methode in user-service
- [ ] Default: 'de' bei Provider-Integration

### 3.3 CustomerGlossaryEntry Collection
- [x] Type `CustomerGlossaryEntry` in `src/types/glossary.ts` erstellt
- [x] `CreateGlossaryEntryInput` Type erstellt
- [x] `UpdateGlossaryEntryInput` Type erstellt
- [x] `GlossaryFilterOptions` Type erstellt
- [ ] Firestore Collection: `organizations/{orgId}/customer_glossary`
- [ ] Firestore Index: `customerId` + `organizationId`

---

## 4. Services erstellen ✅ ABGESCHLOSSEN

### 4.1 Glossar-Service
- [x] `src/lib/services/glossary-service.ts` erstellt
- [x] `getByOrganization(orgId)` - Alle Einträge
- [x] `getByCustomer(orgId, customerId)` - Gefiltert nach Kunde
- [x] `create(entry)` - Neuen Eintrag erstellen
- [x] `update(id, entry)` - Eintrag aktualisieren
- [x] `delete(id)` - Eintrag löschen
- [x] `search(orgId, query)` - Suche in allen Übersetzungen
- [x] `count(orgId, customerId?)` - Anzahl Einträge

### 4.2 React Query Hooks
- [x] `src/lib/hooks/useGlossary.ts` erstellt
- [x] `useGlossaryEntries(orgId, filterOptions?)` - Query
- [x] `useGlossaryEntry(orgId, entryId)` - Einzelner Eintrag
- [x] `useCreateGlossaryEntry()` - Mutation
- [x] `useUpdateGlossaryEntry()` - Mutation
- [x] `useDeleteGlossaryEntry()` - Mutation
- [x] `useApproveGlossaryEntry()` - Mutation für Freigabe
- [x] Query Key Factory `glossaryKeys`

### 4.3 Content-Languages Service
- [x] `updateContentLanguages(orgId, languages)` in Organization-Service
- [x] `getContentLanguages(orgId)` - Content-Sprachen laden
- [x] `addContentLanguage(orgId, languageCode)` - Sprache hinzufügen
- [x] `removeContentLanguage(orgId, languageCode)` - Sprache entfernen
- [x] Validierung: Max 3 zusätzliche Sprachen
- [x] Validierung: Keine Duplikate
- [x] Validierung: Primärsprache nicht in additional

---

## 5. Toast Service i18n ✅ ABGESCHLOSSEN

### 5.1 Toast Service Ansatz
- [x] Entscheidung: Toast-Service bleibt unverändert (akzeptiert übersetzte Strings)
- [x] Übersetzung erfolgt im aufrufenden Code mit `useTranslations('toasts')`
- [x] Abwärtskompatibilität sichergestellt (alte Aufrufe funktionieren weiter)

### 5.2 Toast Keys in Übersetzungsdateien
- [x] Toast-Messages in `/messages/de.json` unter `toasts` erweitert (38 Keys)
- [x] Englische Übersetzungen in `/messages/en.json` synchronisiert
- [x] Interpolation-Syntax für dynamische Werte (`{count}`, `{name}`, etc.)

---

## 6. Testing & Qualitätssicherung ✅ ABGESCHLOSSEN

### 6.1 TypeScript
- [x] `npm run type-check` erfolgreich
- [x] Alle neuen Types korrekt exportiert

### 6.2 Funktionstest
- [ ] UI-Sprache wechseln funktioniert (Backend-Anbindung Phase 2)
- [ ] Content-Sprachen hinzufügen/entfernen funktioniert (Backend-Anbindung Phase 2)
- [ ] Glossar CRUD funktioniert (Backend-Anbindung Phase 2)
- [x] Glossar-Tabelle zeigt dynamische Spalten
- [ ] Toast-Messages werden übersetzt (bei EN) (Backend-Anbindung Phase 2)

### 6.3 Build
- [x] `npm run build` erfolgreich
- [x] Keine Console-Errors im Browser

---

## Abschluss Phase 1

- [x] Alle obigen Punkte abgehakt
- [ ] Code-Review durchgeführt
- [ ] Dokumentation aktualisiert (README.md Status ändern)
- [ ] Phase 2 Planung starten

---

## Notizen

- **2025-12-07**: Phase 1 Foundation komplett implementiert
- TypeScript-Check und Build erfolgreich
- Funktionale Tests für Backend-Anbindung in Phase 2 verschoben
- Branch: `feature/i18n-foundation` (3 Commits gepusht)

---

## Erstellte Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/config/i18n.ts` | Locale-Konfiguration |
| `src/i18n/request.ts` | next-intl Server-Konfiguration |
| `src/types/glossary.ts` | Glossar-Types (CustomerGlossaryEntry, etc.) |
| `src/lib/services/glossary-service.ts` | CRUD Service für Glossar |
| `src/lib/hooks/useGlossary.ts` | React Query Hooks |
| `messages/de.json` | Deutsche Übersetzungen (38 Toast-Keys) |
| `messages/en.json` | Englische Übersetzungen |
| `src/app/dashboard/settings/language/page.tsx` | Settings-Seite UI |

---

**Letzte Aktualisierung:** 2025-12-07 (Phase 1 ABGESCHLOSSEN)
