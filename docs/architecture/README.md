# Architektur-Dokumentation

Diese Dokumentation beschreibt die technische Architektur und Design-Entscheidungen von celeroPress.

## 📋 Übersicht

### 🏗️ Haupt-Dokumentationen
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Vollständige System-Architektur und Technologie-Stack
- **[ADRs](./adr/)** - Architektur-Entscheidungsaufzeichnungen (Architecture Decision Records)

### 🎯 Quick Navigation

**Für neue Entwickler:**
1. Starten Sie mit [ARCHITECTURE.md](./ARCHITECTURE.md) für den Gesamt-Überblick
2. Lesen Sie relevante ADRs für Kontext zu Design-Entscheidungen
3. Konsultieren Sie System-Diagramme für visuelle Darstellung

**Für Architektur-Entscheidungen:**
1. Prüfen Sie bestehende ADRs auf ähnliche Entscheidungen
2. Verwenden Sie das [ADR-Template](./adr/adr-template.md) für neue Entscheidungen
3. Dokumentieren Sie alle wichtigen Architektur-Änderungen

## 📚 Architektur-Entscheidungen (ADRs)

### Implementierte Entscheidungen
1. **[Next.js 14 App Router](./adr/0001-nextjs-14-app-router.md)** - Framework-Wahl
2. **[Firebase vs. Supabase](./adr/0002-firebase-vs-supabase.md)** - Backend-Service-Entscheidung
3. **[Firestore Data Structure](./adr/0003-firestore-data-structure.md)** - Datenbankdesign
4. **[SendGrid E-Mail](./adr/0004-sendgrid-email.md)** - E-Mail-Service-Integration
5. **[Gemini AI](./adr/0005-gemini-ai.md)** - KI-Service-Auswahl
6. **[Context API](./adr/0006-context-api.md)** - State-Management-Strategie
7. **[TipTap Editor](./adr/0007-tiptap-editor.md)** - Rich-Text-Editor-Wahl

### 🔄 Aktuelle Architektur-Themen
- **UI-Komponenten-Reorganisation** (2025-08-03): Migration zu `/components/ui/`-Struktur
- **Test-Framework-Integration**: Jest + React Testing Library Setup
- **Multi-Tenancy**: Team-basierte Datenisolation

## 🛠️ Technologie-Stack (Überblick)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS + Headless UI
- **State**: React Context + React Query

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **E-Mail**: SendGrid
- **AI**: Google Gemini

### Development
- **Language**: TypeScript
- **Testing**: Jest + React Testing Library
- **Build**: Next.js Build System

## 📊 System-Diagramme

> **Hinweis**: System-Diagramme werden bei Bedarf in `/diagrams/` hinzugefügt

**Geplante Diagramme:**
- High-Level System Architecture
- Data Flow Diagrams
- Component Architecture
- Multi-Tenant Data Isolation

## 🔧 Entwicklungs-Guidelines

### Code-Organisation
```
src/
├── app/                   # Next.js App Router Pages
├── components/
│   ├── ui/               # Wiederverwendbare UI-Komponenten
│   └── [feature]/        # Feature-spezifische Komponenten
├── lib/                  # Business Logic & Services
├── types/                # TypeScript Definitionen
└── __tests__/           # Test-Struktur
```

### Design-Prinzipien
1. **Separation of Concerns**: Klare Trennung zwischen UI, Business Logic und Data
2. **Component-First**: Wiederverwendbare, testbare Komponenten
3. **Type Safety**: Vollständige TypeScript-Nutzung
4. **Performance**: Optimized Bundling und Lazy Loading

### Architektur-Review-Prozess
1. **Kleine Änderungen**: Code Review im Team
2. **Größere Änderungen**: ADR erstellen und Team-Review
3. **Breaking Changes**: Architektur-Meeting und Dokumentation

---

**Letzte Aktualisierung:** 2025-08-03  
**Aktuelle ADRs:** 7  
**Architektur-Version:** 2.0 (mit UI-Reorganisation)