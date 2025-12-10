# Internationalisierung - Masterplan

**Status:** In Implementierung
**Zuletzt aktualisiert:** 2025-12-10

---

## Übersicht

Dieses Verzeichnis enthält die vollständige Dokumentation zur Internationalisierung von CeleroPress.

## Dokumentstruktur

| Dokument | Beschreibung | Status |
|----------|--------------|--------|
| [01-CURRENT-STATE.md](./01-CURRENT-STATE.md) | Ist-Analyse der Codebase | ✅ Fertig |
| [02-UI-INTERNATIONALIZATION.md](./02-UI-INTERNATIONALIZATION.md) | UI-Sprachen (DE/EN) + Settings-Seite | 📝 Konzept |
| [03-AI-TRANSLATION.md](./03-AI-TRANSLATION.md) | KI-Übersetzung für Projekte | ✅ Implementiert |
| [05-GLOSSARY.md](./05-GLOSSARY.md) | Kunden-spezifisches Fachbegriff-Glossar | ✅ Implementiert |
| [06-MIGRATION-GUIDE.md](./06-MIGRATION-GUIDE.md) | Refactoring-Template für Seiten | 🔄 In Nutzung |
| [09-MIGRATION-CHECKLIST.md](./09-MIGRATION-CHECKLIST.md) | UI-Migration Fortschritt (29/57) | 🔄 In Arbeit |
| [10-MIGRATION-WORKFLOW.md](./10-MIGRATION-WORKFLOW.md) | Workflow für parallele Migration | ✅ Fertig |
| [11-AI-PRESS-RELEASE-I18N.md](./11-AI-PRESS-RELEASE-I18N.md) | KI-Assistent mehrsprachig machen | 📝 Konzept |
| [12-SEND-MODAL-LANGUAGE-DEFAULTS.md](./12-SEND-MODAL-LANGUAGE-DEFAULTS.md) | Versand-Modal Sprach-Defaults | 📝 Konzept |
| [13-SYSTEM-EMAILS-I18N.md](./13-SYSTEM-EMAILS-I18N.md) | System-Emails (Freigabe, Reports) | 📝 Konzept |
| [14-PUBLIC-PAGES-I18N.md](./14-PUBLIC-PAGES-I18N.md) | Öffentliche Seiten (Freigabe, Share) | 📝 Konzept |

> **Hinweis:** `04-NATIVE-MULTILINGUAL.md` wurde entfernt - Boilerplates werden jetzt direkt mit dem Hauptinhalt übersetzt, was eine separate mehrsprachige Boilerplate-Verwaltung überflüssig macht.

---

## Die zwei Säulen

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERNATIONALISIERUNG                            │
├─────────────────────────────────┬───────────────────────────────────┤
│                                 │                                   │
│       1. UI-SPRACHEN            │       2. KI-ÜBERSETZUNG           │
│                                 │                                   │
│   - DE/EN (Start)               │   - Beliebige Zielsprache         │
│   - Erweiterbar                 │   - Hauptinhalt + Boilerplates    │
│   - Settings-basiert            │   - Kunden-Glossar                │
│   - next-intl                   │   - Genkit Flow                   │
│                                 │   - Manuell editierbar            │
│                                 │                                   │
│   PRIORITÄT: 1                  │   PRIORITÄT: 2                    │
│   (Foundation)                  │   ✅ IMPLEMENTIERT                │
│                                 │                                   │
└─────────────────────────────────┴───────────────────────────────────┘
```

---

## Settings-Seite: `/settings/language`

Die zentrale Sprachverwaltung erfolgt unter `/settings/language` mit zwei Bereichen:

| Bereich | Beschreibung | Status |
|---------|--------------|--------|
| **UI-Sprache** | Benutzeroberflächen-Sprache (DE/EN) | ⏳ Konzept |
| **Glossar** | Kunden-spezifische Fachbegriffe für KI-Übersetzungen | ✅ Implementiert |

### Wichtige Design-Entscheidungen

1. **Glossar ist KUNDEN-spezifisch** - Nicht organisations-weit!
2. **Übersetzungen On-Demand** - Keine vordefinierte Liste von Content-Sprachen nötig
3. **Boilerplates werden automatisch mit übersetzt** - Keine separate Verwaltung erforderlich
4. **Übersetzungen sind editierbar** - KI-generierte Texte können manuell angepasst werden

---

## Phasenplan

### Phase 1: Foundation ✅ FERTIG
- [x] next-intl Setup (Basis)
- [x] Settings-Seite `/settings/language`
- [x] CustomerGlossaryEntry Collection + CRUD
- [x] Glossar-UI mit Modal

### Phase 2: KI-Übersetzung ✅ FERTIG
- [x] Genkit Translation Flow mit Kunden-Glossar
- [x] Projekt-Übersetzungen Datenmodell
- [x] TranslationModal im Projekt
- [x] TranslationList mit Aktionen
- [x] TranslationEditModal für manuelle Anpassung
- [x] Boilerplate-Übersetzung integriert
- [x] Versand-Modal mit Sprachauswahl
- [x] PDF-Generierung mehrsprachig

### Phase 3: UI-Migration 🔄 IN ARBEIT
- [x] Dashboard-Seiten migrieren (29 von 57 fertig)
- [x] Navigation (SettingsNav, AdminNav, Dashboard-Layout)
- [ ] ~28 Seiten noch ausstehend
- [ ] Toast Service i18n (zentral in toast.ts)

### Phase 4: Erweiterte Internationalisierung 📝 KONZEPT
- [ ] KI-Assistent mehrsprachig (11-AI-PRESS-RELEASE-I18N.md)
- [ ] Versand-Modal Sprach-Defaults (12-SEND-MODAL-LANGUAGE-DEFAULTS.md)
- [ ] System-Emails übersetzen (13-SYSTEM-EMAILS-I18N.md)
- [ ] Öffentliche Seiten übersetzen (14-PUBLIC-PAGES-I18N.md)

---

## Kernprinzipien

1. **Minimal invasiv** - Deutsche Version muss weiter funktionieren
2. **Schrittweise Migration** - Keine Big-Bang-Umstellung
3. **Erweiterbar** - Neue Sprachen einfach hinzufügbar
4. **Kunden-Glossar-First** - Fachbegriffe pro Kunde haben Vorrang vor KI-Übersetzung
5. **Editierbare KI-Texte** - Alle Übersetzungen können manuell angepasst werden

---

## Technologie-Stack

| Komponente | Technologie | Status |
|------------|-------------|--------|
| UI i18n | next-intl | ✅ Setup fertig |
| KI-Übersetzung | Genkit + Gemini 2.0 Flash | ✅ Implementiert |
| Sprach-Flaggen | LanguageFlagIcon (SVG) | ✅ Implementiert |
| Datenbank | Firestore | ✅ Collections angelegt |
| PDF | pdf-service.ts | ✅ Mehrsprachig |
| Glossar | customer_glossary Collection | ✅ CRUD + UI |

---

## Implementierte Komponenten

### Hooks (src/lib/hooks/)
- `useGlossary.ts` - CRUD für Glossar-Einträge
- `useTranslations.ts` - CRUD für Projekt-Übersetzungen

### Services (src/lib/services/)
- `glossary-service.ts` - Firestore-Operationen für Glossar
- `translation-service.ts` - Firestore-Operationen für Übersetzungen

### UI-Komponenten
- `TranslationModal` - Sprache auswählen, Übersetzung starten
- `TranslationList` - Vorhandene Übersetzungen anzeigen
- `TranslationEditModal` - KI-Übersetzungen bearbeiten
- `TranslationLanguageSelector` - Sprachauswahl im Versand-Modal
- `GlossaryEntryModal` - Glossar-Einträge erstellen/bearbeiten
- `LanguageFlagIcon` - SVG-Flaggen für Sprachen

### API-Endpunkte
- `POST /api/ai/translate` - KI-Übersetzung via Genkit
