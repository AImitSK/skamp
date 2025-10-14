# Claude AI Projektspezifische Anweisungen

## Sprache
- **IMMER auf Deutsch antworten und kommunizieren**
- Deutsche Commit-Messages und Kommentare verwenden
- Deutsche Variablen- und Funktionsnamen wo möglich

## Test-Kommandos
- Tests ausführen: `npm test`
- Test-Coverage: `npm run test:coverage` 
- Linter: `npm run lint`
- TypeScript-Check: `npm run type-check`

## Entwicklungsrichtlinien
- CeleroPress Design System docs/design-system/DESIGN_SYSTEM.md
- Heroicons: Nur /24/outline Icons verwenden
- Console-Statements vor Commits entfernen
- Multi-Tenancy-Architektur mit organizationId

## Git Workflow
- Feature-Branches verwenden
- Deutsche Commit-Messages
- Pull Requests für größere Features

## Codebase-Struktur
- React/Next.js mit TypeScript
- Firebase für Backend (Firestore + Storage)  
- Tailwind CSS für Styling
- Jest + React Testing Library für Tests

## Wichtige Dateien
- `/src/types/` - TypeScript-Typen
- `/src/lib/firebase/` - Firebase Services
- `/docs/` - Docomentation

## Kommunikationsrichtlinien
- **WICHTIG: Fragen sind Fragen, keine Handlungsaufforderungen**
- Bei Fragen ("Wie stellst du dir das vor?", "Was denkst du?") immer erst antworten und Konzept besprechen
- Keine automatischen Aktionen bei Fragen - erst nach expliziter Aufforderung handeln
- Immer erst Design und Ansatz diskutieren, bevor mit Implementierung begonnen wird


