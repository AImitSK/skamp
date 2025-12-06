# PR-Radar Feature Dokumentation

## Übersicht

Der PR-Radar ist ein KI-gestütztes Themen-Findungs- und Planungsmodul für CeleroPress. Anstatt Nutzer vor ein leeres Feld zu setzen, schlägt das Tool aktiv PR-würdige Themen vor.

## Kernkonzept

**Problem**: B2B-Unternehmen (Maschinenbau, Logistik, Tech) sitzen auf spannenden Geschichten, erkennen diese aber nicht als berichtenswert.

**Lösung**: Der PR-Radar agiert als aktiver Redaktions-Consultant und extrahiert versteckte Stories durch:
1. **Silent Interviewer** (MVP) - Trigger-basierte Fragen im Chat-Format
2. **Trend Scanner** (Phase 2) - News-Jacking durch Grounding mit Google Search
3. **Saisonaler Kalender** (Phase 2) - Automatische Erinnerungen für Events/Messen

## Dokumentation

| Dokument | Beschreibung |
|----------|--------------|
| [01-TECHNISCHE-ARCHITEKTUR.md](./01-TECHNISCHE-ARCHITEKTUR.md) | System-Architektur, Datenmodelle, Firebase Collections, GenKit Flows |
| [02-MVP-SCOPE.md](./02-MVP-SCOPE.md) | MVP Feature-Set, User Journey, UI Mockups, Aufwandsschätzung |
| [03-SILENT-INTERVIEWER-PROMPT.md](./03-SILENT-INTERVIEWER-PROMPT.md) | System-Prompts für alle drei Modi des Silent Interviewer |

## Quick Start (MVP)

### Was wird gebaut?

1. **Settings Page**: Unternehmens-Kontext eingeben
2. **Check-in Chat**: 5 trigger-basierte Fragen beantworten
3. **Topic-Generierung**: AI extrahiert PR-Themen
4. **Dashboard**: Topics annehmen/ablehnen, Projekte starten

### Technischer Stack

- **Frontend**: Next.js + React + Tailwind
- **Backend**: Firebase Firestore
- **AI**: GenKit + Gemini 2.5 Flash
- **Auth**: Bestehende CeleroPress Auth

### Neue Dateien

```
src/
├── types/pr-radar.ts
├── lib/firebase/pr-radar-service.ts
├── lib/ai/flows/silent-interviewer.ts
├── lib/ai/schemas/silent-interviewer-schemas.ts
├── app/api/pr-radar/...
├── app/[orgSlug]/pr-radar/...
└── components/pr-radar/...
```

## Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| MVP | Silent Interviewer, Topic-Generierung, Basic Dashboard | Geplant |
| Phase 2 | Trend Scanner, Redaktionskalender, E-Mail-Reminder | Backlog |
| Phase 3 | Wettbewerber-Tracking, Analytics, Multi-User Check-ins | Backlog |

## Offene Fragen

- [ ] Wie oft soll der Weekly Check-in erinnert werden?
- [ ] Sollen Topics automatisch nach X Tagen archiviert werden?
- [ ] Integration mit bestehendem Projekt-Wizard oder separater Flow?
