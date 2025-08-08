# Claude AI Projektspezifische Anweisungen

## Sprache
- **IMMER auf Deutsch antworten und kommunizieren**
- Deutsche Commit-Messages und Kommentare verwenden
- Deutsche Variablen- und Funktionsnamen wo möglich

## Test-Kommandos
- Tests ausführen: `npm test`
- Test-Coverage: `npm run test:coverage` 
- Linter: `npm run lint`
- TypeScript-Check: `npm run typecheck`

## Entwicklungsrichtlinien
- CeleroPress Design System v2.0 verwenden
- Heroicons: Nur /24/outline Icons verwenden
- Keine Shadow-Effekte (Design Pattern)
- Console-Statements vor Commits entfernen
- Multi-Tenancy-Architektur mit organizationId

## Git Workflow
- Feature-Branches verwenden
- Deutsche Commit-Messages
- Tests vor dem Push ausführen
- Pull Requests für größere Features

## Codebase-Struktur
- React/Next.js mit TypeScript
- Firebase für Backend (Firestore + Storage)  
- Tailwind CSS für Styling
- Jest + React Testing Library für Tests

## Wichtige Dateien
- `/docs/DESIGN_PATTERNS.md` - UI/UX Patterns
- `/docs/features/` - Feature-Dokumentationen
- `/src/types/` - TypeScript-Typen
- `/src/lib/firebase/` - Firebase Services

## Aktueller Status
- Media Library Feature: Vollständig implementiert und getestet
- Tests aktuell in Bearbeitung - Funktionsnamen anpassen