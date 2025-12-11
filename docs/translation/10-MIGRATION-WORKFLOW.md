# i18n Migration Workflow

**Letzte Aktualisierung:** 2025-12-11

---

## Aktueller Status

| Phase | Checklist | Status |
|-------|-----------|--------|
| **Phase 1: Seiten** | `09-MIGRATION-CHECKLIST.md` | ✅ Abgeschlossen (50/50) |
| **Phase 2: Komponenten** | `09.1-COMPONENT-MIGRATION-CHECKLIST.md` | ✅ Abgeschlossen (45/47, 2 übersprungen) |

### ✅ UI-MIGRATION VOLLSTÄNDIG ABGESCHLOSSEN!

Die gesamte UI-Migration auf next-intl i18n ist abgeschlossen. Alle Seiten und Komponenten unterstützen nun Deutsch und Englisch.

---

## Zusammenfassung

### Phase 1: Seiten-Migration
- **50 Seiten** migriert
- **4 übersprungen** (DashboardNav, Sidebar, UI-Dialog, UI-Dropdown - keine Texte)
- Abgeschlossen am: 2025-12-11

### Phase 2: Komponenten-Migration
- **45 Komponenten** migriert in 5 Runden
- **2 übersprungen** (ToggleBox, CustomerReviewToggleContainer - UI-Komponenten ohne eigene Texte)
- Abgeschlossen am: 2025-12-11

### Migrierte Bereiche

| Bereich | Komponenten | Keys (ca.) |
|---------|-------------|------------|
| CRM Modals | 16 | ~500 |
| Kampagnen | 19 | ~400 |
| PR-SEO | 6 | ~100 |
| Customer Review | 4 | ~60 |
| Admin Tools | 2 | ~70 |
| **Gesamt** | **47** | **~1130** |

---

## Übersetzungsdateien

- **Deutsch:** `messages/de.json` (Original)
- **Englisch:** `messages/en.json` (Übersetzung)

Beide Dateien sind synchron und enthalten alle Keys für die komplette UI.

---

## Namespace-Struktur

```
common.*              - Gemeinsame UI-Texte
dashboard.*           - Dashboard-Seiten
crm.*                 - CRM Modals und Komponenten
campaigns.*           - Kampagnen-Module
  ├── editLock.*
  ├── status.*
  ├── approval.*
  ├── preview.*
  ├── pdf.*
  ├── assets.*
  ├── contacts.*
  ├── project.*
  ├── prSeo.*
  └── translation.*
customerReview.*      - Kundenportal
admin.*               - Admin-Tools
settings.*            - Einstellungen
...
```

---

## Wartung & Erweiterung

### Neue Texte hinzufügen

1. Key in `messages/de.json` hinzufügen
2. Entsprechenden Key in `messages/en.json` hinzufügen
3. In Komponente: `const t = useTranslations('namespace')`
4. Text verwenden: `{t('key')}`

### Qualitätssicherung

```bash
# TypeScript-Check
npm run type-check

# Linting
npm run lint
```

### Sprache testen

1. Settings → Sprache → Englisch
2. Seite neu laden
3. Alle Texte auf korrekte Übersetzung prüfen

---

## Checklists (Referenz)

- **Phase 1 (Seiten):** `09-MIGRATION-CHECKLIST.md` - ✅ Abgeschlossen
- **Phase 2 (Komponenten):** `09.1-COMPONENT-MIGRATION-CHECKLIST.md` - ✅ Abgeschlossen

---

## Hinweise für zukünftige Entwicklung

1. **Neue Komponenten:** Immer gleich mit i18n erstellen
2. **Existierende Keys nutzen:** Vor Anlegen neuer Keys `de.json` durchsuchen
3. **Toasts:** Werden über `toastService` separat behandelt
4. **Gemeinsame Texte:** `common.*` Namespace für wiederkehrende Texte
5. **Interpolation:** Für dynamische Werte `{variable}` verwenden
