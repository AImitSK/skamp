# Templates & Vorlagen

**Wiederverwendbare Templates für CeleroPress-Entwicklung**

---

## 📁 Übersicht

Dieses Verzeichnis enthält bewährte Templates und Vorlagen für verschiedene Entwicklungsaufgaben im CeleroPress-Projekt.

---

## 📚 Verfügbare Templates

### 1. Modul-Refactoring Template

**Datei:** `module-refactoring-template.md`
**Umfang:** ~2,300 Zeilen, detailliert
**Verwendung:** Vollständiges Refactoring eines React-Moduls

**Beinhaltet:**
- 7-Phasen-Struktur (Setup → Cleanup → React Query → Modularisierung → Performance → Testing → Dokumentation → Code Quality)
- Phase 0.5 "Pre-Refactoring Cleanup" ⭐ NEU
- Detaillierte Schritt-für-Schritt-Anleitung
- Code-Templates für Hooks, Komponenten, Tests
- Dokumentations-Templates
- Checklisten für jede Phase
- Git-Workflow
- Best Practices

**Wann verwenden?**
- Bestehende Module refactorieren
- Neue Module nach Best Practices aufsetzen
- React Query Integration
- Performance-Optimierung
- Toter Code entfernen (Phase 0.5)

**Geschätzter Aufwand:** 2-4 Tage

**Was ist neu in v1.1?**
- Phase 0.5 "Pre-Refactoring Cleanup" hinzugefügt
- Toter Code wird BEVOR dem Refactoring entfernt
- Verhindert, dass alter Code modularisiert wird
- Basiert auf Learnings aus Editors-Refactoring

---

### 2. Quick Reference

**Datei:** `QUICK_REFERENCE.md`
**Umfang:** ~530 Zeilen, kompakt
**Verwendung:** Schnellzugriff während der Entwicklung

**Beinhaltet:**
- 7 Phasen auf einen Blick (inkl. Phase 0.5 Cleanup)
- Ordnerstruktur-Übersicht
- Wichtigste Git-Kommandos
- Test-Kommandos
- Design System Rules (Do's & Don'ts)
- React Query Patterns
- Performance Patterns
- Testing Patterns
- Kurzcheckliste

**Wann verwenden?**
- Als Spickzettel während der Entwicklung
- Für schnelle Nachschläge
- Als Erinnerung an Best Practices

---

## 🎯 Verwendung

### Neues Modul refactorieren

1. **Template lesen:** `module-refactoring-template.md`
2. **Quick Reference griffbereit:** `QUICK_REFERENCE.md`
3. **Design System prüfen:** `../design-system/DESIGN_SYSTEM.md`
4. **Los geht's!**

### Während der Entwicklung

- **Quick Reference** für schnelle Nachschläge
- **Design System** für Styling-Fragen
- **Listen-Modul Docs** (`../lists/`) als Beispiel-Implementierung

---

## 📖 Beispiel-Implementierungen

### Listen-Modul (Referenz-Implementierung)

**Location:** `src/app/dashboard/contacts/lists/`
**Docs:** `docs/lists/`

Das Listen-Modul ist die vollständige Referenz-Implementierung des Refactoring-Templates:

**Struktur:**
```
src/app/dashboard/contacts/lists/
├── page.tsx (279 Zeilen)
├── [listId]/page.tsx (268 Zeilen)
├── components/
│   ├── shared/ (Alert, ConfirmDialog, EmptyState)
│   └── sections/ (ListModal-Sections)
└── __tests__/

src/lib/hooks/
└── useListsData.ts (6 Hooks)

docs/lists/
├── README.md (459 Zeilen)
├── api/ (1161 Zeilen)
├── components/ (848 Zeilen)
└── adr/ (375 Zeilen)
```

**Verwendung als Referenz:**
- Code-Struktur anschauen
- Dokumentation als Vorlage
- Tests als Beispiele
- Best Practices ableiten

---

## 🚀 Template-Workflow

### 1. Vorbereitung

```bash
# Template kopieren (optional)
cp docs/templates/module-refactoring-template.md docs/[module]/REFACTORING_PLAN.md

# Variablen ersetzen
# [module] → Dein Modul-Name
# [Module] → Dein Modul-Name (PascalCase)
```

### 2. Schritt-für-Schritt durchführen

Folge dem Template Phase für Phase:
- Phase 0: Setup
- Phase 0.5: Pre-Refactoring Cleanup ⭐ NEU
- Phase 1: React Query
- Phase 2: Modularisierung
- Phase 3: Performance
- Phase 4: Testing
- Phase 5: Dokumentation
- Phase 6: Code Quality

### 3. Quick Reference nutzen

Halte `QUICK_REFERENCE.md` während der Entwicklung offen für:
- Git-Kommandos
- Test-Kommandos
- Design System Rules
- Code Patterns

### 4. Dokumentieren

Nutze die Dokumentations-Templates aus dem Refactoring-Template:
- README.md
- API-Docs
- Component-Docs
- ADRs

---

## 📝 Template-Anpassung

### Projektspezifische Anpassungen

Die Templates sind generisch gehalten. Passe sie an dein Modul an:

**Ersetzen:**
- `[module]` → z.B. `campaigns`, `media`, `analytics`
- `[Module]` → z.B. `Campaigns`, `Media`, `Analytics`
- `[X]`, `[Y]`, `[Z]` → Konkrete Zahlen/Werte

**Ergänzen:**
- Modulspezifische Features
- Besondere Requirements
- Custom Components

**Weglassen:**
- Nicht benötigte Sections
- Nicht relevante Features

---

## 🎨 Design System Integration

Alle Templates basieren auf dem **CeleroPress Design System v2.0**.

**Location:** `docs/design-system/DESIGN_SYSTEM.md`

**Wichtigste Regeln:**
- Nur Heroicons /24/outline
- Keine Schatten (außer Dropdowns)
- Zinc-Palette für neutrale Farben
- #005fab für Primary Actions
- #dedc00 für Checkboxen
- Konsistente Höhen (h-10)

Siehe `QUICK_REFERENCE.md` für die wichtigsten Do's & Don'ts.

---

## 🧪 Testing Integration

Alle Templates beinhalten Testing-Strategien.

**Test-Setup:** `src/__tests__/setup.ts`

**Test-Typen:**
1. **Hook-Tests:** React Query Hooks testen
2. **Integration-Tests:** CRUD-Flows testen
3. **Component-Tests:** UI-Komponenten testen

**Test-Commands:**
```bash
npm test                      # Alle Tests
npm test -- [module]          # Modul-Tests
npm test -- [module] --watch  # Watch-Mode
npm run test:coverage         # Coverage
```

---

## 📊 Erfolgsmetriken

Templates sollen helfen, folgende Metriken zu erreichen:

### Code Quality
- ✅ Komponenten: <300 Zeilen
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings

### Testing
- ✅ Coverage: >80%
- ✅ Tests: 20+ Tests
- ✅ Pass-Rate: 100%

### Performance
- ✅ Re-Renders: Optimiert
- ✅ Load-Time: <500ms
- ✅ Filter: <100ms

### Dokumentation
- ✅ README: 400+ Zeilen
- ✅ API-Docs: 800+ Zeilen
- ✅ Gesamt: 2500+ Zeilen

---

## 💡 Best Practices

### Template-Nutzung

**DO ✅**
- Template als Leitfaden nutzen
- Schritt-für-Schritt vorgehen
- Nach jeder Phase committen
- Quick Reference griffbereit halten
- Beispiele aus Listen-Modul anschauen

**DON'T ❌**
- Template blind kopieren
- Phasen überspringen
- Ohne Tests weitermachen
- Dokumentation am Ende nachholen
- Design System ignorieren

### Git-Workflow

```bash
# Feature-Branch für Refactoring
git checkout -b feature/[module]-refactoring-production

# Nach jeder Phase committen
git add .
git commit -m "feat: Phase [X] - [Beschreibung]"

# Regelmäßig pushen
git push origin feature/[module]-refactoring-production

# Am Ende mergen
git checkout main
git merge feature/[module]-refactoring-production
git push origin main
```

### Phasen-Reihenfolge

**⚠️ WICHTIG:** Phasen nicht überspringen!

Die Reihenfolge ist sinnvoll:
1. **Setup zuerst** - Sicherer Start mit Backups
2. **Cleanup vor Refactoring** - Toter Code wird nicht modularisiert ⭐
3. **React Query** - Foundation für alles andere
4. **Modularisierung** - Basis für Testing & Docs
5. **Performance** - Optimierung der Struktur
6. **Testing** - Sicherstellen, dass alles funktioniert
7. **Dokumentation** - Wissen festhalten
8. **Code Quality** - Final Polish

Jede Phase baut auf der vorherigen auf!

---

## 🔄 Template-Updates

### Wann aktualisieren?

Templates sollten aktualisiert werden wenn:
- Neue Best Practices entstehen
- Design System sich ändert
- Testing-Strategien angepasst werden
- Neue Tools/Libraries verwendet werden

### Wie aktualisieren?

1. **Änderungen im Template dokumentieren**
2. **Version hochzählen**
3. **Changelog führen**
4. **Team informieren**

### Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.1 | 2025-10-14 | Phase 0.5 "Pre-Refactoring Cleanup" hinzugefügt (aus Editors-Refactoring) |
| 1.0 | 2025-10-14 | Initial Template basierend auf Listen-Refactoring |

---

## 📞 Support & Feedback

### Bei Fragen

- **Design System:** Siehe `../design-system/DESIGN_SYSTEM.md`
- **Projekt-Setup:** Siehe `CLAUDE.md` im Projekt-Root
- **Beispiel-Code:** Siehe Listen-Modul (`../lists/`)

### Feedback & Verbesserungen

Templates sind "lebende Dokumente". Feedback ist willkommen!

**Verbesserungsvorschläge:**
1. Issue erstellen oder
2. Pull Request mit Verbesserung oder
3. Team-Meeting diskutieren

---

## 🎓 Weitere Ressourcen

### Interne Docs

- **Design System:** `../design-system/DESIGN_SYSTEM.md`
- **Listen-Modul Docs:** `../lists/README.md`
- **CRM-Modul ADRs:** `../crm/adr/` (Beispiel für ADRs)
- **Project Instructions:** `CLAUDE.md` (Root)

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## 🎯 Quick Start

### Ich möchte...

**...ein Modul refactorieren:**
1. Lies `module-refactoring-template.md`
2. Halte `QUICK_REFERENCE.md` offen
3. Folge den 6 Phasen
4. Nutze Listen-Modul als Beispiel

**...schnell etwas nachschlagen:**
1. Öffne `QUICK_REFERENCE.md`
2. Suche nach Stichwort (Ctrl+F)

**...Design System Rules prüfen:**
1. Siehe `QUICK_REFERENCE.md` → "Design System (Wichtigste Regeln)"
2. Für Details: `../design-system/DESIGN_SYSTEM.md`

**...Code-Beispiele sehen:**
1. Listen-Modul: `src/app/dashboard/contacts/lists/`
2. Listen-Docs: `../lists/README.md`

---

## 📈 Template-Erfolge

### Listen-Modul Refactoring

Das Template basiert auf dem erfolgreichen Listen-Modul Refactoring:

**Ergebnisse:**
- ✅ 2898 Zeilen → modular organisiert
- ✅ 628-Zeilen-Komponente → 8 Dateien
- ✅ 46 Tests, alle bestanden
- ✅ 2843 Zeilen Dokumentation
- ✅ 0 TypeScript-Fehler
- ✅ 0 ESLint-Warnings
- ✅ Production-Ready in 2 Tagen

**Lessons Learned:**
- 6 Phasen funktionieren gut
- Quick Reference sehr hilfreich
- Regelmäßige Commits wichtig
- Tests früh schreiben spart Zeit
- Dokumentation parallel erstellen

---

## 🚀 Nächste Schritte

### Template für weitere Module nutzen

Geplante Refactorings mit diesem Template:
- [ ] Campaigns-Modul
- [ ] Media-Library (bereits production-ready)
- [ ] Analytics-Modul
- [ ] Settings-Modul

### Template erweitern

Geplante Erweiterungen:
- [ ] GraphQL Integration Template
- [ ] Microservice Integration Template
- [ ] E2E-Testing Template
- [ ] Performance-Monitoring Template

---

## 📄 Lizenz & Nutzung

**Projekt:** CeleroPress
**Team:** CeleroPress Development Team
**Nutzung:** Intern für CeleroPress-Entwicklung

Templates dürfen frei im Projekt genutzt und angepasst werden.

---

**Version:** 1.0
**Erstellt:** 2025-10-14
**Basiert auf:** Listen-Modul Refactoring (erfolgreich abgeschlossen)
**Maintainer:** Tech Lead

---

*Happy Coding! 🚀*
