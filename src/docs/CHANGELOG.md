# Changelog

Alle nennenswerten Änderungen an CeleroPress werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚧 In Entwicklung
- Erweiterte Editor-Features (Farben, Links, Tabellen)
- Text-Verbesserung mit KI
- Multi-Stakeholder Approval Workflows
- Externe Kalender-Sync (Google Calendar, Outlook)
- Erweiterte Platzhalter für Boilerplates

## [1.0.0] - 2025-01-15

### 🎉 Initial Release
Erste produktionsreife Version von CeleroPress - Die Online Suite für Pressemeldungen

### ✨ Neue Features

#### CRM & Kontakte
- **Firmenverwaltung** mit spezialisierten Feldern für Medienhäuser
- **Kontaktverwaltung** mit Publikationszuordnung für Journalisten
- **Tag-System** mit Farbcodierung zur Organisation
- **CSV Import/Export** für Bulk-Operationen
- **Erweiterte Filterung** nach Firma, Tags, Publikationen
- **Inline-Editing** für schnelle Änderungen
- **Detailansichten** für Firmen und Kontakte

#### Kampagnen-Management
- **Rich-Text Editor** (TipTap) für professionelle Pressemeldungen
- **KI-Integration** mit Google Gemini für Texterstellung
- **Template-System** für verschiedene Meldungstypen
- **Freigabe-Workflow** mit eindeutigen Share-Links
- **SendGrid-Integration** für professionellen E-Mail-Versand
- **Basis-Tracking** (Öffnungen, Klicks, Bounces)
- **Anhänge-Verwaltung** mit Mediathek-Integration

#### Verteilerlisten
- **Statische Listen** für manuell gepflegte Kontaktgruppen
- **Dynamische Listen** mit automatischer Aktualisierung
- **Multi-Filter-System** für präzise Zielgruppen
- **Live-Vorschau** der betroffenen Kontakte
- **Kampagnen-Integration** für einfache Empfängerauswahl

#### Mediathek (DAM)
- **Multi-File Upload** mit Drag & Drop
- **Hierarchische Ordnerstruktur** mit Farbcodierung
- **Multi-Client Assignment** für flexible Zuordnung
- **Automatische Thumbnail-Generierung** für Bilder
- **Such- und Filterfunktionen** nach Typ, Kunde, Datum
- **Firebase Storage Integration** mit CDN

#### Freigabe-Workflow
- **Öffentliche Vorschau** ohne Login-Zwang
- **Kommentar-Funktion** für strukturiertes Feedback
- **Status-Tracking** mit vollständiger Historie
- **E-Mail-Benachrichtigungen** bei Statusänderungen
- **Mobile-optimierte** Freigabe-Seiten

#### Kalender
- **FullCalendar Integration** mit mehreren Ansichten
- **Drag & Drop** für Terminverschiebungen
- **Event-Typen** für verschiedene PR-Aktivitäten
- **Responsive Design** für mobile Nutzung

#### Textbausteine (Boilerplates)
- **Kategorisierung** nach Typ (Unternehmen, Kontakt, Rechtlich)
- **Rich-Text Support** für formatierte Bausteine
- **Quick-Insert** im Kampagnen-Editor
- **Verwendungs-Counter** zur Nutzungsanalyse

#### KI-Assistent
- **Strukturierte Pressemeldungen** mit Headline, Lead, Body, Zitat
- **Kontext-basierte Generierung** (Branche, Ton, Zielgruppe)
- **Vordefinierte Templates** für häufige Anlässe
- **Deutsche Sprachunterstützung** optimiert

### 🛠 Technische Features
- **Next.js 14** mit App Router für optimale Performance
- **Firebase Backend** (Firestore, Auth, Storage)
- **TypeScript** für Type-Safety
- **Tailwind CSS** für modernes UI
- **Responsive Design** für alle Gerätegrößen
- **Row-Level Security** für Datenschutz

### 📚 Dokumentation
- Umfassende README mit Projektübersicht
- Detaillierte API-Dokumentation
- Architektur-Übersicht mit ADRs
- Feature-Dokumentation für alle Module
- Deployment Guide für verschiedene Umgebungen
- Contributing Guidelines für Entwickler

## [0.9.0] - 2024-12-20 (Beta)

### ✨ Neue Features
- Beta-Version des Kampagnen-Moduls
- Basis KI-Integration mit Gemini
- Erste Version der Mediathek
- SendGrid E-Mail-Versand

### 🐛 Bugfixes
- Performance-Verbesserungen bei großen Kontaktlisten
- Fix für Firebase Auth Session-Handling
- Verbessertes Error-Handling in API Routes

## [0.8.0] - 2024-11-15 (Alpha)

### ✨ Neue Features
- CRM-Grundfunktionen implementiert
- Kontakt- und Firmenverwaltung
- Basis-Authentifizierung mit Firebase
- Erste UI-Komponenten mit Tailwind

### 🔧 Technische Änderungen
- Migration von Pages Router zu App Router
- Firebase Integration Setup
- Projekt-Struktur etabliert

## [0.5.0] - 2024-10-01 (Proof of Concept)

### 🎯 Initial Development
- Projekt-Setup mit Next.js 14
- Technologie-Stack Entscheidungen
- Erste Prototypen für UI
- Konzept-Validierung

---

## Versionierungs-Schema

CeleroPress folgt Semantic Versioning:

- **MAJOR.MINOR.PATCH**
  - **MAJOR**: Inkompatible API-Änderungen
  - **MINOR**: Neue Features (rückwärtskompatibel)
  - **PATCH**: Bugfixes (rückwärtskompatibel)

## Release-Zyklus

- **Feature Releases**: Quartalsweise (x.Y.0)
- **Bugfix Releases**: Nach Bedarf (x.y.Z)
- **Security Updates**: Sofort bei Bedarf

## Upgrade-Hinweise

### Von 0.9.0 zu 1.0.0

1. **Datenbank-Migration erforderlich**:
   ```bash
   npm run migrate:v1
   ```

2. **Neue Umgebungsvariablen**:
   - `NEXT_PUBLIC_APP_URL` hinzufügen
   - `SENDGRID_FROM_NAME` konfigurieren

3. **Firebase Security Rules aktualisieren**:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

## Support

- **Aktuelle Version**: 1.0.0 (LTS bis Januar 2026)
- **Vorherige Versionen**: Kein offizieller Support
- **Upgrade-Pfad**: Immer von einer Major-Version zur nächsten

## Links

- [GitHub Releases](https://github.com/celeropress/celeropress/releases)
- [Upgrade Guide](./docs/UPGRADE.md)
- [Breaking Changes](./docs/BREAKING_CHANGES.md)

[Unreleased]: https://github.com/celeropress/celeropress/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/celeropress/celeropress/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/celeropress/celeropress/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/celeropress/celeropress/compare/v0.5.0...v0.8.0
[0.5.0]: https://github.com/celeropress/celeropress/releases/tag/v0.5.0