# celeroPress Dokumentation

**celeroPress** ist eine PR-Management-Plattform für den deutschsprachigen Raum, die PR-Agenturen und Kommunikationsabteilungen bei der Digitalisierung und Optimierung ihrer Medienarbeit unterstützt.

## 📚 Dokumentations-Struktur

### 🏗️ [Architektur](./architecture/)
Technische Architektur, System-Design und Architektur-Entscheidungen
- **ARCHITECTURE.md** - System-Übersicht und Technologie-Stack
- **ADRs** - Architektur-Entscheidungsaufzeichnungen
- **System-Diagramme** - Visuelle Darstellungen der Architektur

### 🎯 [Features](./features/)
Aktuelle Feature-Dokumentationen (neue Template-basierte Struktur)
- **docu_*.md** - Systematische Feature-Dokumentationen nach einheitlicher Vorlage
- Jedes Feature wird nach dem standardisierten Template dokumentiert
- Fokus auf Clean Code, Tests und User-Anleitungen

### 📁 [Legacy Features](./legacy-features/)
Bestehende Feature-Dokumentationen (als Referenz)
- Ursprüngliche Feature-Beschreibungen
- Wird schrittweise in neue Template-Struktur migriert
- Wichtige Referenz für Feature-Umstellung

### 📋 [Projekt](./project/)
Projekt-Management und strategische Dokumentation
- **ROADMAP.md** - Produkt-Roadmap und strategische Planung
- **CHANGELOG.md** - Versionshistorie
- **SETUP.md** - Projekt-Setup und Installation

### 🛠️ [Development](./development/)
Entwickler-spezifische Dokumentation
- **CONTRIBUTING.md** - Beitragsleitfaden
- **TESTING.md** - Test-Strategie und Ausführung
- **DEPLOYMENT.md** - Deployment-Prozesse
- **CONFIGURATION.md** - Konfigurationsoptionen

## 🚀 Quick Start

1. **Für Entwickler:** Starten Sie mit [Project Setup](./project/SETUP.md)
2. **Für Feature-Verständnis:** Siehe [Features](./features/)
3. **Für Architektur-Überblick:** Siehe [Architektur](./architecture/ARCHITECTURE.md)
4. **Für strategische Planung:** Siehe [Roadmap](./project/ROADMAP.md)

## 📖 Dokumentations-Standards

- **Feature-Dokumentationen:** Verwenden das standardisierte Template aus `FEATURE_DOCUMENTATION_TEMPLATE.md`
- **Architektur-Entscheidungen:** Folgen dem ADR-Template
- **Code-Dokumentation:** Inline-Kommentare für komplexe Business-Logik
- **User-Tests:** Jede Feature-Dokumentation enthält manuelle Test-Anleitungen

## 🔄 Migration von Legacy-Dokumentation

Die bestehenden Feature-Dokumentationen werden schrittweise in die neue Template-Struktur migriert:
1. Legacy-Docs dienen als Referenz
2. Neue Features verwenden das standardisierte Template
3. Bestehende Features werden nach und nach aktualisiert

---

**Letzte Aktualisierung:** 2025-08-03
**Dokumentations-Version:** 2.0 (Template-basiert)