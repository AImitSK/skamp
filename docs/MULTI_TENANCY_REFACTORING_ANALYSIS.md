# CLAUDE.md - CeleroPress Projekt-Kontext

## 🎯 PROJEKT-ÜBERSICHT
CeleroPress ist eine Next.js TypeScript SaaS-Anwendung für PR/Marketing-Kampagnen mit Firebase-Backend.

## 🌍 SPRACHE & KOMMUNIKATION
- **IMMER auf Deutsch antworten und kommunizieren**
- Deutsche Commit-Messages verwenden
- Deutsche Kommentare im Code
- Deutsche Dokumentation
- Englische Variablen-/Funktionsnamen (Branchenstandard)

## 🚨 KRITISCHE EINSCHRÄNKUNGEN
- **KEIN ADMIN SDK**: Nur Client-SDKs verwenden!
- **KEINE externen Admin-APIs**: Alle Admin-Funktionen über bestehende Services
- **NIEMALS funktionierende Features zerstören**: Erst prüfen, dann erweitern

## 📋 ARBEITSWEISE
1. **IMMER DEUTSCH** sprechen und dokumentieren
2. **DOKUMENTATION FIRST**: Lies relevante Docs bevor du startest
3. **Step-by-Step**: Ein Feature komplett fertig, dann erst das nächste
4. **Tests**: 100% Coverage bei `src/__tests__/` - KEINE Ausnahmen
5. **Dokumentation**: Nach jedem Feature alle Ebenen aktualisieren

## 📚 DOKUMENTATIONS-HIERARCHIE

**4-Ebenen-System für vollständige Nachverfolgbarkeit:**

1. **Implementation Plans** (`docs/implementation-plans/`)
   - Detaillierte technische Pläne
   - Task-Listen mit Fortschritt
   - Technische Entscheidungen

2. **Masterplans** (`docs/masterplans/`)
   - Feature-übergreifende Strategien
   - Meilensteine und Timelines
   - Abhängigkeiten zwischen Features

3. **Feature Docs** (`docs/features/`)
   - Finale Ist-Dokumentation
   - Nach FEATURE_DOCUMENTATION_TEMPLATE.md
   - Wartbare Referenz-Dokumente

4. **README Index** (`docs/features/README.md`)
   - Übersicht aller Features
   - Status-Tracking
   - Quick-Links

**Nach Feature-Änderungen:**
1. Implementation Plan → Task abhaken
2. Masterplan → Status updaten
3. Feature Doc → NUR Änderungen eintragen
4. README → Bei neuen Features ergänzen

**Dateinamen-Konvention:**
- Masterplans: `[BEREICH]_MASTERPLAN.md`
- Impl. Plans: `[FEATURE]_IMPLEMENTATION.md`
- Feature Docs: `docu_[bereich]_[feature].md`

## 🎨 DESIGN SYSTEM v2.0 - STRIKT EINHALTEN
```css
--primary: #005fab;
--primary-hover: #004a8c;
--secondary: #f1f0e2;  /* Hellgelb für Status-Cards */
```

**VERBOTEN:**
- ❌ NIEMALS `shadow`, `shadow-md` verwenden
- ❌ NIEMALS `border-b` zwischen Header/Content
- ❌ NIEMALS `/20/solid` Icons

**PFLICHT:**
- ✅ IMMER `@heroicons/react/24/outline`
- ✅ Zurück-Buttons: `bg-gray-50 hover:bg-gray-100`
- ✅ Status-Cards: Hellgelb `#f1f0e2`

## 🏗️ TECHNOLOGIE-STACK
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase v9+ (Firestore, Auth, Functions)
- **Editor**: TipTap v2 (NICHT ersetzen, nur stylen!)
- **Email**: SendGrid v3 API
- **AI**: Google Gemini 1.5 Flash (bereits integriert)
- **Testing**: Jest + React Testing Library

## 📁 PROJEKT-STRUKTUR
```
src/
├── app/                    # Next.js App Router
├── components/            # React Components
│   └── ui/               # Basis-UI-Komponenten
├── lib/                   # Business Logic & Services
│   ├── firebase/         # Firebase Client Services
│   └── services/         # Business Logic
├── __tests__/            # Test-Suite (100% Coverage!)
└── types/                # TypeScript Definitionen

docs/
├── masterplans/          # Feature-übergreifende Pläne
├── implementation-plans/ # Detaillierte Arbeitspläne
├── features/            # Finale Feature-Dokumentationen
├── DESIGN_PATTERNS.md   # UI/UX Standards
└── FEATURE_DOCUMENTATION_TEMPLATE.md  # Doku-Vorlage
```

## 🔥 FIREBASE PATTERNS
```typescript
// IMMER User Context für Multi-Tenancy
const userId = user?.uid || user?.id;
if (!userId) return;

// Firestore Pfade:
// /users/{userId}/campaigns/{campaignId}
// /users/{userId}/customers/{customerId}
```

## 🧪 TEST-ANFORDERUNGEN
- **Pfad**: `src/__tests__/`
- **Commands**: 
  - `npm test` - Tests ausführen
  - `npm run test:coverage` - Coverage Report
  - `npm run lint` - ESLint Check
  - `npm run type-check` - TypeScript Check
- **Coverage**: 100% oder Feature wird nicht gemerged
- **Fokus**: Service-Tests > UI-Tests

## ⚠️ BEKANNTE STOLPERFALLEN
1. **Legacy User ID System**: Manche Komponenten nutzen `user.id` statt `user.uid`
2. **CORS bei Edit-Funktionen**: Edit-Komponenten müssen spezielle Props haben
3. **TipTap v2**: Viele Extensions brauchen custom implementations
4. **SimpleSwitch**: Immer SimpleSwitch statt Switch verwenden
5. **Dialog Padding**: IMMER px-6 py-4 hinzufügen

## 🤔 KOMMUNIKATIONS-RICHTLINIEN
- **Fragen sind Fragen**: Keine automatischen Aktionen bei Fragen
- **Erst diskutieren**: Design und Ansatz besprechen vor Implementierung
- **Explizite Aufforderung**: Code nur nach klarer Anweisung erstellen
- **Step-by-Step**: Große Features in kleine Schritte aufteilen

## 💡 BEI UNSICHERHEIT
1. Lies relevante Dokumentation (Masterplan, Feature-Docs)
2. Prüfe bestehende Implementierungen
3. Frage nach, bevor du große Änderungen machst
4. Kleine, testbare Schritte machen


---
**WICHTIG**: Dieser Context wird bei JEDEM Claude Code Start geladen.
Halte ihn aktuell, aber kompakt! Detaillierte Infos gehören in die Dokumentations-Hierarchie.