# i18n Migration Workflow

**Letzte Aktualisierung:** 2025-12-09

---

## Schnellübersicht

```
1. Checklist öffnen: docs/translation/09-MIGRATION-CHECKLIST.md
2. Nächste Seite(n) auswählen (⬜ = offen)
3. i18n-migration Agent starten
4. Ergebnis prüfen (type-check, Browser)
5. Checklist aktualisieren (✅)
6. Commit
```

---

## Vorgehen im Detail

### Schritt 1: Status prüfen

```
Lies: docs/translation/09-MIGRATION-CHECKLIST.md
```

- ⬜ = Noch offen
- 🔄 = In Bearbeitung
- ✅ = Fertig

### Schritt 2: Seite(n) auswählen

- **Parallel:** 3-4 unabhängige Seiten gleichzeitig möglich
- **Priorität:** Von oben nach unten (Priorität 1 → 10)
- **Abhängigkeiten:** Globale Komponenten (Prio 1) zuerst

### Schritt 3: Agent starten

**Für EINE Seite:**
```
Starte i18n-migration Agent für:
[DATEIPFAD]

Der Agent soll:
1. Die Seite migrieren
2. Alle importierten eigenen Komponenten (@/components/*) prüfen
3. Nicht-migrierte Komponenten ebenfalls migrieren
4. UI-Primitives (@/components/ui/*) ignorieren
```

**Für MEHRERE Seiten parallel:**
```
Starte 3 i18n-migration Agenten parallel für:
1. [DATEIPFAD_1]
2. [DATEIPFAD_2]
3. [DATEIPFAD_3]
```

### Schritt 4: Qualitätsprüfung

Nach jedem Agent-Lauf:

```bash
npm run type-check
```

Optional im Browser testen:
- Sprache auf Englisch umstellen (Settings → Sprache)
- Seite aufrufen und prüfen

### Schritt 5: Checklist aktualisieren

In `09-MIGRATION-CHECKLIST.md`:
- ⬜ → ✅ für erledigte Seiten
- Statistik am Ende aktualisieren

### Schritt 6: Commit

```bash
git add .
git commit -m "i18n: [Seitenname] auf Internationalisierung migriert"
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

### Namespace-Konvention:

| Typ | Namespace | Beispiel |
|-----|-----------|----------|
| Seite | Modulname | `dashboard`, `contacts` |
| Widget | `common.widgets.[name]` | `common.widgets.myTasks` |
| Feature-Komponente | `[modul].[bereich]` | `campaigns.form` |

---

## Übersetzungsdateien

- **Deutsch:** `messages/de.json` (Original)
- **Englisch:** `messages/en.json` (Übersetzung)

Beide Dateien müssen IMMER synchron sein!

---

## Wichtige Hinweise

1. **Toasts:** Werden separat behandelt (nicht pro Seite)
2. **Existierende Keys:** Vor Anlegen neuer Keys `de.json` prüfen
3. **Nach Merge:** Immer `npm run type-check` ausführen
4. **Browser-Test:** Nach Sprachumstellung Seite neu laden

---

## Aktueller Stand

Siehe `09-MIGRATION-CHECKLIST.md` für:
- Gesamtfortschritt
- Nächste offene Seiten
- Bereits erledigte Seiten
