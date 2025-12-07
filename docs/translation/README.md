# Internationalisierung - Masterplan

**Status:** Konzeptphase
**Zuletzt aktualisiert:** 2025-12-07

---

## Übersicht

Dieses Verzeichnis enthält die vollständige Dokumentation zur Internationalisierung von CeleroPress.

## Dokumentstruktur

| Dokument | Beschreibung | Status |
|----------|--------------|--------|
| [01-CURRENT-STATE.md](./01-CURRENT-STATE.md) | Ist-Analyse der Codebase | ✅ Fertig |
| [02-UI-INTERNATIONALIZATION.md](./02-UI-INTERNATIONALIZATION.md) | UI-Sprachen (DE/EN) + Settings-Seite | 📝 Konzept |
| [03-AI-TRANSLATION.md](./03-AI-TRANSLATION.md) | KI-Übersetzung für Projekte | 📝 Konzept |
| [04-NATIVE-MULTILINGUAL.md](./04-NATIVE-MULTILINGUAL.md) | Native Mehrsprachigkeit (Boilerplates, etc.) | 📝 Konzept |
| [05-GLOSSARY.md](./05-GLOSSARY.md) | Kunden-spezifisches Fachbegriff-Glossar | 📝 Konzept |
| [06-MIGRATION-GUIDE.md](./06-MIGRATION-GUIDE.md) | Refactoring-Template für Seiten | ⏳ Ausstehend |
| **[PHASE-1-TODO.md](./PHASE-1-TODO.md)** | **Detaillierte Checkliste für Phase 1** | 🚀 **Aktiv** |

---

## Die drei Säulen

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERNATIONALISIERUNG                            │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│                     │                     │                         │
│   1. UI-SPRACHEN    │  2. KI-ÜBERSETZUNG  │  3. NATIVE MULTILINGUAL │
│                     │                     │                         │
│   - DE/EN (Start)   │  - Beliebige Sprache│  - Max 4 Sprachen       │
│   - Erweiterbar     │  - Pro Projekt      │  - Boilerplates         │
│   - Settings-basiert│  - Kunden-Glossar   │  - Signaturen           │
│   - next-intl       │  - Genkit Flow      │  - KI-Vorschläge        │
│                     │                     │                         │
│   PRIORITÄT: 1      │  PRIORITÄT: 2       │  PRIORITÄT: 3           │
│   (Foundation)      │  (Quick Win)        │  (Langfristig)          │
│                     │                     │                         │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

---

## Settings-Seite: `/settings/language`

Die zentrale Sprachverwaltung erfolgt unter `/settings/language` mit drei Bereichen:

| Bereich | Beschreibung |
|---------|--------------|
| **UI-Sprache** | Benutzeroberflächen-Sprache (DE/EN) |
| **Content-Sprachen** | 1 Primärsprache (fest) + max. 3 zusätzliche via CountrySelector |
| **Glossar** | Kunden-spezifische Fachbegriffe für KI-Übersetzungen |

### Wichtige Design-Entscheidungen

1. **Primärsprache ist FEST** - entspricht der UI-Sprache der Organisation
2. **Zusätzliche Sprachen via CountrySelector** - Nutzt bestehende Infrastruktur
3. **Glossar ist KUNDEN-spezifisch** - Nicht organisations-weit!
4. **Vorhandene Infrastruktur:**
   - `src/components/ui/country-selector.tsx`
   - `src/lib/validators/iso-validators.ts` → `getLanguagesForCountry()`

---

## Phasenplan

### Phase 1: Foundation
- [ ] next-intl Setup
- [ ] Settings-Seite `/settings/language` erstellen
- [ ] Organization.contentLanguages Feld
- [ ] CustomerGlossaryEntry Collection anlegen
- [ ] Refactoring-Template erstellen

### Phase 2: KI-Übersetzung (Quick Win)
- [ ] Genkit Translation Flow mit Kunden-Glossar
- [ ] Projekt-Übersetzungen Datenmodell
- [ ] Übersetzungs-UI im Projekt
- [ ] Versand-Modal Erweiterung

### Phase 3: UI-Migration
- [ ] Seiten schrittweise migrieren (nach Template)
- [ ] Email-Templates internationalisieren
- [ ] Toast Service i18n (zentral in toast.ts)

### Phase 4: Native Mehrsprachigkeit
- [ ] Boilerplate-Übersetzungen UI
- [ ] Signatur-Übersetzungen UI
- [ ] Mehrsprachige PDF-Generierung

---

## Kernprinzipien

1. **Minimal invasiv** - Deutsche Version muss weiter funktionieren
2. **Schrittweise Migration** - Keine Big-Bang-Umstellung
3. **Erweiterbar** - Neue Sprachen einfach hinzufügbar
4. **Kunden-Glossar-First** - Fachbegriffe pro Kunde haben Vorrang vor KI-Übersetzung
5. **Bestehende Infrastruktur nutzen** - CountrySelector, iso-validators

---

## Technologie-Stack

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| UI i18n | next-intl | Native Next.js App Router Support |
| KI-Übersetzung | Genkit + Gemini | Bereits im Projekt, Glossar-Kontext möglich |
| Sprach-Auswahl | CountrySelector | Bereits vorhanden, mit Flaggen |
| Land→Sprache Mapping | iso-validators.ts | `getLanguagesForCountry()` bereits implementiert |
| Datenbank | Firestore | Bestehende Infrastruktur |
| PDF | Bestehender Service | Nur Erweiterung für Sprach-Merge |
