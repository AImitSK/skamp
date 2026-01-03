# Seiten-Mappings Anleitung

## Was sind Mappings?

Mappings verknüpfen **App-Routen** mit **Hilfe-Artikeln**. Wenn ein User auf einer bestimmten Seite das Hilfe-Panel öffnet, zeigt das System den passenden Artikel an.

```
Route: /dashboard/settings/email
       ↓
Mapping: pageName: "E-Mail-Einstellungen"
         mainArticle: "email-absender-einrichten"
         quickTips: [...]
       ↓
HelpPanel zeigt: Artikel + Tipps
```

---

## Anleitung für Claude

### START-PROMPT

```
Erstelle die Seiten-Mappings für Kategorie: {KATEGORIE}

Lies diese Anleitung: docs/help-content/MAPPING-ANLEITUNG.md
Lies die Taxonomie: docs/planning/help-system/03-TAXONOMIE.md (Seiten-Mapping Tabelle)

Erstelle die JSON-Datei unter: docs/help-content/mappings/{KATEGORIE}.json
```

---

## Workflow

```
1. Prüfe welche Artikel für die Kategorie existieren
2. Lies die Seiten-Mapping Tabelle aus der Taxonomie
3. Erstelle die Mapping-JSON-Datei
4. Führe npm run import:help-mappings aus
5. Prüfe ob Import erfolgreich war
```

---

## JSON-Schema

```json
{
  "_description": "Seiten-Mappings für Kategorie 'kategorie-name'",
  "mappings": [
    {
      "pageName": "Lesbarer Seitenname (für Sanity Studio)",
      "routes": [
        "/dashboard/pfad/zur/seite",
        "/dashboard/pfad/zur/seite?tab=variante"
      ],
      "mainArticle": "artikel-slug",
      "quickTips": [
        {
          "tip": "Deutscher Kurztipp für diese Seite",
          "tipEn": "English quick tip for this page"
        }
      ],
      "featureVideo": {
        "title": "Video-Titel",
        "titleEn": "Video Title",
        "url": "https://youtube.com/...",
        "thumbnailUrl": "https://..."
      },
      "additionalArticles": ["verwandter-artikel-1", "verwandter-artikel-2"]
    }
  ]
}
```

### Pflichtfelder

| Feld | Beschreibung |
|------|--------------|
| `pageName` | Eindeutiger Name für die Seite (wird in Sanity angezeigt) |
| `routes` | Array von App-Routen (mindestens eine) |

### Optionale Felder

| Feld | Beschreibung |
|------|--------------|
| `mainArticle` | Slug des Hauptartikels (wird als FAQ angezeigt) |
| `quickTips` | 2-4 kurze Tipps speziell für diese Seite |
| `featureVideo` | Video-Tutorial für diese Seite |
| `additionalArticles` | Weitere relevante Artikel-Slugs |

---

## Routen-Konventionen

### Wildcards

```
/dashboard/projects/*        → Alle Unterseiten von Projekten
/dashboard/projects/[id]/*   → Alle Tabs eines Projekts
```

### Query-Parameter

```
/dashboard/contacts/crm?tab=companies   → CRM mit Tab "Unternehmen"
/dashboard/contacts/crm?tab=contacts    → CRM mit Tab "Personen"
```

### Beispiele

| Route | Beschreibung |
|-------|--------------|
| `/dashboard` | Dashboard-Startseite |
| `/dashboard/admin/profile` | Profil-Seite |
| `/dashboard/settings/email` | E-Mail-Einstellungen |
| `/dashboard/projects` | Projektliste |
| `/dashboard/projects/[id]` | Einzelnes Projekt |
| `/dashboard/projects/[id]/press-release` | Pressemeldung im Projekt |

---

## Mappings pro Kategorie

### ✅ erste-schritte (fertig)

Datei: `docs/help-content/mappings/erste-schritte.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Dashboard | /dashboard | willkommen-bei-celeropress |
| Profil | /dashboard/admin/profile | profil-einrichten |
| Branding-Einstellungen | /dashboard/settings/branding | branding-einrichten |
| Team-Einstellungen | /dashboard/settings/team | team-einladen |
| Domain-Einstellungen | /dashboard/settings/domain | versand-domain-authentifizieren |
| E-Mail-Einstellungen | /dashboard/settings/email | email-absender-einrichten |
| CRM - Unternehmen | /dashboard/contacts/crm | kunde-anlegen |

---

### ⏳ crm

Datei: `docs/help-content/mappings/crm.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| CRM - Verlage | /dashboard/contacts/crm?tab=companies&type=publisher | verlag-anlegen |
| CRM - Journalisten | /dashboard/contacts/crm?tab=contacts | journalist-anlegen |
| Verteilerlisten | /dashboard/contacts/lists | verteiler-erstellen |
| Verteiler-Details | /dashboard/contacts/lists/[id] | journalisten-zum-verteiler-hinzufuegen |

---

### ⏳ bibliothek

Datei: `docs/help-content/mappings/bibliothek.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Publikationen | /dashboard/library/publications | publikation-anlegen |
| Textbausteine | /dashboard/library/boilerplates | textbaustein-erstellen |
| Medien | /dashboard/library/media | medien-hochladen |
| Marken-DNA | /dashboard/library/marken-dna | marken-dna-verstehen |
| Marken-DNA Editor | /dashboard/library/marken-dna/[id] | marken-dna-unternehmensbasis |
| Datenbank | /dashboard/library/database | datenbank-nutzen |

---

### ⏳ projekte

Datei: `docs/help-content/mappings/projekte.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Projektliste | /dashboard/projects | projekt-erstellen |
| Projekt-Übersicht | /dashboard/projects/[id] | projekt-uebersicht |
| Tasks | /dashboard/projects/[id]/tasks | tasks-verstehen |
| Strategie | /dashboard/projects/[id]/strategy | strategie-definieren |
| Projekt-Daten | /dashboard/projects/[id]/data | projekt-daten |
| Projekt-Verteiler | /dashboard/projects/[id]/distribution-list | verteiler-auswaehlen |
| Pressemeldung | /dashboard/projects/[id]/press-release | pressemeldung-erstellen |
| Freigabe | /dashboard/projects/[id]/approval | freigabe-workflow |
| Versand | /dashboard/projects/[id]/distribution | versand-vorbereiten |
| Monitoring | /dashboard/projects/[id]/monitoring | projekt-monitoring |

---

### ⏳ analytics

Datei: `docs/help-content/mappings/analytics.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Monitoring-Dashboard | /dashboard/analytics/monitoring | monitoring-dashboard |
| Reporting | /dashboard/analytics/reporting | reporting-erstellen |

---

### ⏳ kommunikation

Datei: `docs/help-content/mappings/kommunikation.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Inbox | /dashboard/communication/inbox | inbox-verstehen |
| Benachrichtigungen | /dashboard/communication/notifications | benachrichtigungen |

---

### ⏳ einstellungen

Datei: `docs/help-content/mappings/einstellungen.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Team-Verwaltung | /dashboard/settings/team | team-mitglieder-verwalten |
| Branding | /dashboard/settings/branding | logo-hochladen |
| E-Mail-Konfiguration | /dashboard/settings/email | email-konfiguration |
| Domain-Verwaltung | /dashboard/settings/domain | eigene-domain-einrichten |
| Import/Export | /dashboard/settings/import-export | daten-importieren |

---

### ⏳ account

Datei: `docs/help-content/mappings/account.json`

| pageName | routes | mainArticle |
|----------|--------|-------------|
| Profil bearbeiten | /dashboard/admin/profile | profil-bearbeiten |
| Billing | /dashboard/admin/billing | subscription-billing |
| API-Keys | /dashboard/admin/api | api-keys-verwalten |

---

## Quick-Tips schreiben

### Regeln

1. **Kurz und prägnant** - Max. 80 Zeichen
2. **Aktionsorientiert** - Beginne mit Verb oder "Nutze..."
3. **Seitenspezifisch** - Tipps müssen zur aktuellen Seite passen
4. **2-4 Tipps pro Seite** - Nicht zu viele

### Beispiele

**Gut:**
```json
{ "tip": "Nutze Tags zur besseren Organisation", "tipEn": "Use tags for better organization" }
{ "tip": "Die erste Adresse wird automatisch Standard", "tipEn": "The first address becomes default" }
```

**Schlecht:**
```json
{ "tip": "CeleroPress ist eine tolle Software", "tipEn": "..." }  // Nicht hilfreich
{ "tip": "Klicke hier um...", "tipEn": "..." }  // Zu vage
```

---

## Import durchführen

Nach dem Erstellen der JSON-Datei:

```bash
# Alle Mappings importieren
npm run import:help-mappings

# Nur testen (Dry-Run)
npm run import:help-mappings:dry

# Nur eine Kategorie
npm run import:help-mappings -- --category=crm
```

---

## Wichtige Dateien

| Datei | Beschreibung |
|-------|--------------|
| `docs/help-content/mappings/*.json` | Mapping-Definitionen |
| `docs/planning/help-system/03-TAXONOMIE.md` | Route-zu-Artikel Tabelle |
| `scripts/import-help-mappings.ts` | Import-Script |
| `src/sanity/types/help-page-mapping.ts` | Sanity-Schema |

---

## Checkliste

- [x] erste-schritte (7 Mappings)
- [x] crm (4 Mappings)
- [x] bibliothek (6 Mappings)
- [x] projekte (10 Mappings)
- [ ] analytics
- [ ] kommunikation
- [ ] einstellungen
- [ ] account
