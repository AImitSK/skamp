# i18n Migration Workflow

**Letzte Aktualisierung:** 2025-12-11

---

## Aktueller Status

| Phase | Checklist | Status |
|-------|-----------|--------|
| **Phase 1: Seiten** | `09-MIGRATION-CHECKLIST.md` | ✅ Abgeschlossen (50/50) |
| **Phase 2: Komponenten** | `09.1-COMPONENT-MIGRATION-CHECKLIST.md` | 🔄 In Bearbeitung (40/47) |

---

## Schnellübersicht

```
1. Checklist öffnen: docs/translation/09.1-COMPONENT-MIGRATION-CHECKLIST.md
2. Nächste Komponente(n) auswählen (⬜ = offen)
3. i18n-migration Agent starten
4. Ergebnis prüfen (type-check, Browser)
5. Checklist aktualisieren (✅)
6. Commit
```

---

## Vorgehen im Detail

### Schritt 1: Status prüfen

**Für Komponenten-Migration (Phase 2):**
```
Lies: docs/translation/09.1-COMPONENT-MIGRATION-CHECKLIST.md
```

**Für Seiten-Migration (Phase 1 - abgeschlossen):**
```
Lies: docs/translation/09-MIGRATION-CHECKLIST.md
```

- ⬜ = Noch offen
- 🔄 = In Bearbeitung
- ✅ = Fertig

### Schritt 2: Komponente(n) auswählen

- **Parallel:** 4-6 unabhängige Komponenten gleichzeitig möglich
- **Priorität:** Von oben nach unten (Priorität 1 → 5)
- **Gruppierung:** Zusammengehörige Komponenten gemeinsam migrieren

### Schritt 3: Agent starten

**Für EINE Komponente:**
```
Starte i18n-migration Agent für:
[DATEIPFAD]

Namespace: [NAMESPACE aus Checklist]
```

**Für MEHRERE Komponenten parallel:**
```
Starte 4 i18n-migration Agenten parallel für:
1. [DATEIPFAD_1] - Namespace: [NAMESPACE_1]
2. [DATEIPFAD_2] - Namespace: [NAMESPACE_2]
3. [DATEIPFAD_3] - Namespace: [NAMESPACE_3]
4. [DATEIPFAD_4] - Namespace: [NAMESPACE_4]
```

### Schritt 4: Qualitätsprüfung

Nach jedem Agent-Lauf:

```bash
npm run type-check
```

Optional im Browser testen:
- Sprache auf Englisch umstellen (Settings → Sprache)
- Komponente aufrufen und prüfen

### Schritt 5: Checklist aktualisieren

In `09.1-COMPONENT-MIGRATION-CHECKLIST.md`:
- ⬜ → ✅ für erledigte Komponenten
- Statistik am Ende aktualisieren

### Schritt 6: Commit

```bash
git add .
git commit -m "i18n: [Bereich] Komponenten migriert ([Liste])"
```

**Beispiel:**
```bash
git commit -m "i18n: CRM CompanyModal Sections migriert (Legal, General, International)"
```

---

## Agent-Regeln

### Was der Agent migriert:
- Hardcodierte deutsche Texte → `t('key')`
- Seiten (`page.tsx`)
- Eigene Komponenten (`@/components/[modul]/*`)

### Was der Agent IGNORIERT:
- UI-Primitives (`@/components/ui/*`)
- Toast-Aufrufe (`toastService.*`)
- Externe Bibliotheken
- Kommentare und console.log

### Namespace-Konvention:

| Typ | Namespace | Beispiel |
|-----|-----------|----------|
| Seite | Modulname | `dashboard`, `contacts` |
| Widget | `common.widgets.[name]` | `common.widgets.myTasks` |
| Feature-Komponente | `[modul].[bereich]` | `campaigns.form` |
| Modal-Section | `[modul].[modal].[section]` | `crm.companyModal.legal` |

---

## Übersetzungsdateien

- **Deutsch:** `messages/de.json` (Original)
- **Englisch:** `messages/en.json` (Übersetzung)

Beide Dateien müssen IMMER synchron sein!

---

## Wichtige Hinweise

1. **Toasts:** Werden separat behandelt (nicht pro Komponente)
2. **Existierende Keys:** Vor Anlegen neuer Keys `de.json` prüfen
3. **Nach Merge:** Immer `npm run type-check` ausführen
4. **Browser-Test:** Nach Sprachumstellung Seite neu laden
5. **Gemeinsame Keys:** Für wiederkehrende Texte `common.*` nutzen

---

## Empfohlene Runden (Phase 2)

| Runde | Komponenten | Priorität |
|-------|-------------|-----------|
| 1 | CompanyModal Sections (6) | 1 |
| 2 | ContactModal Sections (6) | 1 |
| 3 | CRM Komponenten (4) | 1 |
| 4 | Kampagnen Status/Approval (5) | 2 |
| 5 | Kampagnen Preview (6) | 2 |
| 6 | Kampagnen PDF/Assets (4) | 2 |
| 7 | Kampagnen Projekt (4) | 2 |
| 8 | PR-SEO (6) | 3 |
| 9 | Customer Review (6) | 4 |
| 10 | Admin Tools (2) | 5 |

---

## Checklists

- **Phase 1 (Seiten):** `09-MIGRATION-CHECKLIST.md` - ✅ Abgeschlossen
- **Phase 2 (Komponenten):** `09.1-COMPONENT-MIGRATION-CHECKLIST.md` - 🔄 Aktuell
