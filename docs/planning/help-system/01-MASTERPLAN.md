# Hilfesystem Masterplan

## Übersicht

Aufbau eines umfassenden Hilfesystems nach Microsoft-Vorbild für CeleroPress.

## Komponenten

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SANITY CMS                                  │
│  (Content-Pflege für alle Hilfe-Inhalte)                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────────┐ ┌─────────┐ ┌──────────────┐
│ Support-Site  │ │ In-App  │ │ Academy      │
│ (öffentlich)  │ │ Panel   │ │ (überarbeitet│
│ Radiant Theme │ │         │ │              │
└───────────────┘ └─────────┘ └──────────────┘
```

## Planungsdokumente

| Nr. | Dokument | Beschreibung | Status |
|-----|----------|--------------|--------|
| 01 | MASTERPLAN.md | Dieses Dokument - Gesamtübersicht | 🟡 In Arbeit |
| 02 | SANITY.md | Backend-Schema und API | ⬜ Offen |
| 03 | TAXONOMIE.md | Kategorien und Themenliste | ⬜ Offen |
| 04 | WEBSEITE.md | Öffentliche Support-Seite | ⬜ Offen |
| 05 | ACADEMY.md | Academy-Überarbeitung | ⬜ Offen |
| 06 | PANEL.md | In-App Hilfe-Panel | ⬜ Offen |
| 07 | PANEL-INTEGRATION.md | Integrationsstrategie | ⬜ Offen |
| 08 | UEBERSETZUNG.md | i18n-Strategie | ⬜ Offen |

## Architektur

### Datenfluss

```
Sanity CMS
    │
    ├── helpCategory (Kategorien)
    │   └── PR-Tools, CRM, Einstellungen, ...
    │
    ├── helpArticle (Hilfe-Artikel)
    │   ├── Titel, Slug, Kategorie
    │   ├── Inhalt (Portable Text)
    │   ├── Tipps []
    │   ├── Videos []
    │   └── Verwandte Artikel []
    │
    ├── helpPageMapping (Seiten-Zuordnung)
    │   ├── Route: /dashboard/pr-tools/campaigns
    │   ├── Artikel: → Referenz
    │   ├── Quick-Tipps []
    │   └── Feature-Video
    │
    └── helpTip (Standalone-Tipps)
        └── Für kontextuelle Tooltips
```

### Ausgabe-Kanäle

| Kanal | URL | Zweck |
|-------|-----|-------|
| Support-Site | support.celeropress.com | Öffentlich, SEO, Suche |
| Academy | /dashboard/academy | In-App Dokumentation |
| Hilfe-Panel | Slide-out in App | Kontextuelle Hilfe |
| Tooltips | Bei UI-Elementen | Micro-Hilfe |

## Phasen

### Phase 1: Foundation (Backend)
- [ ] Sanity-Schema definieren
- [ ] API-Queries erstellen
- [ ] Taxonomie festlegen

### Phase 2: Content
- [ ] Kategorien anlegen
- [ ] Erste Artikel schreiben
- [ ] Videos zuordnen

### Phase 3: Support-Webseite
- [ ] Radiant-Theme anpassen
- [ ] Routen erstellen
- [ ] Suche implementieren

### Phase 4: In-App Integration
- [ ] Hilfe-Panel Komponente
- [ ] Seiten-Mapping
- [ ] Academy überarbeiten

### Phase 5: Rollout
- [ ] Panel in alle Seiten integrieren
- [ ] Übersetzungen
- [ ] Testing & QA

## Referenzen

- Microsoft Support: https://support.microsoft.com
- Sanity Docs: https://www.sanity.io/docs
- Radiant Theme: Bereits verwendet für Marketing-Seite
