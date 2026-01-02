# Batch-Erstellung aller Hilfe-Artikel

## Anleitung für Claude

Kopiere diese Anweisung nach dem Neustart:

---

## START-PROMPT

```
Starte die Batch-Erstellung aller Hilfe-Artikel nach dieser Anleitung:
docs/help-content/BATCH-ANLEITUNG.md

Beginne mit Kategorie: erste-schritte
```

---

## Deine Aufgabe

Du erstellst ALLE 95 Hilfe-Artikel aus `docs/help-content/ARTIKEL-CHECKLISTE.md` vollautomatisch.

### Regeln

1. **Parallelisierung**: Starte für JEDE Kategorie alle Artikel gleichzeitig als parallele Task-Agenten
2. **Keine Nachfragen**: Handle selbstständig, keine Rückfragen an den User
3. **Automatischer Import**: Nach Erstellung jedes Artikels sofort `npm run import:help-articles` ausführen
4. **Fortschritt tracken**: Aktualisiere die Checkliste nach jedem erfolgreichen Import
5. **Fehler selbst beheben**: Bei Fehlern automatisch korrigieren und erneut versuchen

### Workflow pro Kategorie

```
1. Lies ARTIKEL-CHECKLISTE.md für die aktuelle Kategorie
2. Starte ALLE Artikel der Kategorie als parallele Task-Agenten
3. Warte bis alle Agenten fertig sind (TaskOutput)
4. Führe npm run import:help-articles aus
5. Prüfe ob Import erfolgreich war
6. Aktualisiere ARTIKEL-CHECKLISTE.md ([ ] → [x])
7. Melde Fortschritt an User
8. Starte automatisch nächste Kategorie
```

### Kategorien-Reihenfolge

1. `erste-schritte` (11 Artikel)
2. `crm` (15 Artikel)
3. `bibliothek` (21 Artikel)
4. `projekte` (16 Artikel)
5. `analytics` (10 Artikel)
6. `kommunikation` (10 Artikel)
7. `einstellungen` (7 Artikel)
8. `account` (5 Artikel)

### Agent-Prompt Template

Für jeden Artikel diesen Prompt an den general-purpose Agent senden:

```
Du bist ein Hilfe-Artikel-Spezialist für CeleroPress.

**AUFGABE:** Schreibe den Artikel "{TITEL}" für Kategorie "{KATEGORIE}"

**REGELN:**
- Verwende ECHTE deutsche Umlaute (ä, ö, ü, ß) - NIEMALS ae, oe, ue!
- Lies den Code ZUERST, dann Docs als Ergänzung
- Code ist die Wahrheit, Docs können veraltet sein

**VORGEHEN:**
1. Lies docs/help-content/CELEROPRESS-OVERVIEW.md
2. Lies docs/planning/help-system/03-TAXONOMIE.md für Artikel-Details
3. Analysiere den relevanten Code unter src/
4. Schreibe den Artikel auf Deutsch UND Englisch

**ARTIKEL-DETAILS:**
- Slug: {SLUG}
- Kategorie: {KATEGORIE}
- onboardingStep: {STEP oder null}

**SPEICHERN UNTER:**
docs/help-content/articles/{KATEGORIE}/{SLUG}.json

**JSON-SCHEMA:**
{
  "_type": "helpArticle",
  "title": "Deutscher Titel",
  "titleEn": "English Title",
  "slug": { "current": "{SLUG}" },
  "excerpt": "Max 160 Zeichen",
  "excerptEn": "Max 160 chars",
  "category": "{KATEGORIE}",
  "onboardingStep": "{STEP oder null}",
  "keywords": ["keyword1", "keyword2"],
  "content": {
    "de": "# Titel\n\nMarkdown...",
    "en": "# Title\n\nMarkdown..."
  },
  "tips": [{ "tip": "Deutsch", "tipEn": "English" }],
  "videos": [],
  "relatedArticles": ["slug1", "slug2"]
}
```

### Beispiel: Kategorie "erste-schritte" starten

Starte diese 11 Agenten PARALLEL in EINER Message:

| # | Titel | Slug | Step |
|---|-------|------|------|
| 1 | Willkommen bei CeleroPress | willkommen-bei-celeropress | 1.1 |
| 2 | Profil einrichten | profil-einrichten | 1.2 |
| 3 | Profilbild hochladen | profilbild-hochladen | 1.3 |
| 4 | E-Mail-Verifizierung | email-verifizierung | 1.4 |
| 5 | Zwei-Faktor-Authentifizierung | zwei-faktor-authentifizierung | 1.5 |
| 6 | Branding einrichten | branding-einrichten | 2.1 |
| 7 | Team einladen | team-einladen | 2.2 |
| 8 | Versand-Domain authentifizieren | versand-domain-authentifizieren | 2.3 |
| 9 | E-Mail-Absender einrichten | email-absender-einrichten | 2.4 |
| 10 | E-Mail-Signatur erstellen | email-signatur-erstellen | 2.5 |
| 11 | Kunde anlegen | kunde-anlegen | 3.1 |

### Nach Abschluss einer Kategorie

```bash
npm run import:help-articles
```

Dann automatisch nächste Kategorie starten.

### Fortschritts-Meldung

Nach jeder Kategorie dem User melden:

```
✅ Kategorie "{NAME}" abgeschlossen
   - Artikel erstellt: X/X
   - Import erfolgreich: X/X
   - Nächste Kategorie: {NÄCHSTE}

Gesamtfortschritt: XX/95 Artikel
```

---

## Wichtige Dateien

- Checkliste: `docs/help-content/ARTIKEL-CHECKLISTE.md`
- Taxonomie: `docs/planning/help-system/03-TAXONOMIE.md`
- Software-Übersicht: `docs/help-content/CELEROPRESS-OVERVIEW.md`
- Import-Script: `npm run import:help-articles`
- Artikel-Ordner: `docs/help-content/articles/{kategorie}/`
