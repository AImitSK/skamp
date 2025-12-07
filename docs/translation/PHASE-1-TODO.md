# Phase 1: Foundation - ToDo-Liste

**Status:** In Arbeit
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

## 2. Settings-Seite `/settings/language`

### 2.1 Routing & Page
- [ ] `src/app/dashboard/settings/language/page.tsx` erstellen
- [ ] Navigation-Link in Settings-Sidebar hinzufügen
- [ ] Basis-Layout mit Heading "Sprache"

### 2.2 Box 1: UI-Sprache
- [ ] UI-Sprache Dropdown (DE/EN)
- [ ] Speichern in User-Preferences (`user.preferences.language`)
- [ ] Bei Änderung: Locale im Provider aktualisieren

### 2.3 Box 2: Content-Sprachen
- [ ] Anzeige Primärsprache (fest, nicht editierbar)
- [ ] Liste zusätzlicher Sprachen (max. 3)
- [ ] "Sprache hinzufügen" Button → CountrySelector Modal
- [ ] Bei Ländern mit mehreren Sprachen: Sprach-Auswahl Dropdown
- [ ] Speichern in Organization (`organization.contentLanguages`)
- [ ] Entfernen-Button (X) pro zusätzlicher Sprache

### 2.4 Box 3: Glossar-Tabelle
- [ ] Tabelle mit Spalten: Kunde, Deutsch, [dynamische Sprachen], Aktionen
- [ ] Spalten basierend auf `contentLanguages` generieren
- [ ] Filter-Dropdown nach Kunde
- [ ] Suche über alle Begriffe
- [ ] Pagination
- [ ] "Neuer Eintrag" Button → Modal öffnen

### 2.5 Glossar-Modal (Neu/Bearbeiten)
- [ ] Kunde-Dropdown (alle Companies der Organization)
- [ ] Deutsch-Feld (Pflicht)
- [ ] Dynamische Sprach-Felder basierend auf `contentLanguages`
- [ ] Kontext-Feld (optional)
- [ ] Speichern/Abbrechen Buttons
- [ ] Validierung: Deutsch-Feld required

---

## 3. Datenmodell erweitern

### 3.1 Organization erweitern
- [ ] Type `Organization` erweitern in `src/types/organization.ts`:
  ```typescript
  contentLanguages?: {
    primary: string;      // z.B. 'de'
    additional: string[]; // z.B. ['en', 'fr']
  };
  ```
- [ ] Migration: Default-Wert für bestehende Organizations setzen
- [ ] API-Endpoints für contentLanguages Update

### 3.2 User Preferences erweitern
- [ ] `user.preferences.language` Feld prüfen/hinzufügen
- [ ] Default: 'de'

### 3.3 CustomerGlossaryEntry Collection
- [ ] Type `CustomerGlossaryEntry` in `src/types/glossary.ts` erstellen:
  ```typescript
  interface CustomerGlossaryEntry {
    id: string;
    organizationId: string;
    customerId: string;
    translations: Record<string, string>;
    context?: string;
    isApproved: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
  }
  ```
- [ ] Firestore Collection: `organizations/{orgId}/customer_glossary`
- [ ] Firestore Index: `customerId` + `organizationId`

---

## 4. Services erstellen

### 4.1 Glossar-Service
- [ ] `src/lib/services/glossary-service.ts` erstellen
- [ ] `getByOrganization(orgId)` - Alle Einträge
- [ ] `getByCustomer(orgId, customerId)` - Gefiltert nach Kunde
- [ ] `create(entry)` - Neuen Eintrag erstellen
- [ ] `update(id, entry)` - Eintrag aktualisieren
- [ ] `delete(id)` - Eintrag löschen
- [ ] `search(orgId, query)` - Suche in allen Übersetzungen

### 4.2 React Query Hooks
- [ ] `src/lib/hooks/useGlossary.ts` erstellen
- [ ] `useGlossaryEntries(orgId, customerId?)` - Query
- [ ] `useCreateGlossaryEntry()` - Mutation
- [ ] `useUpdateGlossaryEntry()` - Mutation
- [ ] `useDeleteGlossaryEntry()` - Mutation

### 4.3 Content-Languages Service
- [ ] `updateContentLanguages(orgId, languages)` in Organization-Service
- [ ] Validierung: Max 3 zusätzliche Sprachen
- [ ] Validierung: Keine Duplikate

---

## 5. Toast Service i18n

### 5.1 Toast Service erweitern
- [ ] `src/lib/utils/toast.ts` erweitern:
  - Keys mit `toasts.` Prefix erkennen
  - `t()` Funktion von next-intl integrieren
  - Fallback: Wenn kein Key, originalen Text anzeigen
- [ ] Abwärtskompatibilität sicherstellen (alte Aufrufe funktionieren weiter)

### 5.2 Toast Keys in Übersetzungsdateien
- [ ] Alle Toast-Messages in `/messages/de.json` unter `toasts` sammeln
- [ ] Englische Übersetzungen in `/messages/en.json`

---

## 6. Testing & Qualitätssicherung

### 6.1 TypeScript
- [ ] `npm run type-check` erfolgreich
- [ ] Alle neuen Types korrekt exportiert

### 6.2 Funktionstest
- [ ] UI-Sprache wechseln funktioniert
- [ ] Content-Sprachen hinzufügen/entfernen funktioniert
- [ ] Glossar CRUD funktioniert
- [ ] Glossar-Tabelle zeigt dynamische Spalten
- [ ] Toast-Messages werden übersetzt (bei EN)

### 6.3 Build
- [ ] `npm run build` erfolgreich
- [ ] Keine Console-Errors im Browser

---

## Abschluss Phase 1

- [ ] Alle obigen Punkte abgehakt
- [ ] Code-Review durchgeführt
- [ ] Dokumentation aktualisiert (README.md Status ändern)
- [ ] Phase 2 Planung starten

---

## Notizen

_Hier können während der Implementierung Notizen, Probleme oder Entscheidungen dokumentiert werden._

---

**Letzte Aktualisierung:** 2025-12-07
