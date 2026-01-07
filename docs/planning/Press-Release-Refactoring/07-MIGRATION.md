# Migration & Rückwärtskompatibilität

## Betroffene Daten

### Bestehende Projekte ohne Strategie
- **Anzahl:** Unbekannt (abfragen nötig)
- **Problem:** Keine DNA-Synthese, keine Fakten-Matrix
- **Lösung:** Standard-Modus bleibt verfügbar

### Bestehende Projekte mit DNA aber ohne Fakten-Matrix
- **Situation:** DNA-Synthese vorhanden, aber Project-Wizard im alten Format
- **Problem:** Alte Sidebar-Dokumente haben keine strukturierte Fakten-Matrix
- **Lösung:** Fallback auf Standard-Modus, Hinweis "Kernbotschaft neu erstellen"

### Bestehende Pressemeldungen
- **Problem:** PM-Vorlage könnte überschreiben
- **Lösung:** Explizite Warnung + Bestätigung

---

## Migrationsstrategie

### Option A: Kein Datenmigration (Empfohlen)
- Alte Projekte behalten alten Workflow
- Neue Funktion nur für neue Projekte oder nach "Kernbotschaft neu erstellen"
- **Vorteil:** Kein Risiko, keine komplexe Migration
- **Nachteil:** Alte Projekte profitieren nicht automatisch

### Option B: Retrospektives Parsing (Später)
- Script parst alte Sidebar-Dokumente zu Fakten-Matrix
- Nur für Projekte mit abgeschlossener Kernbotschaft
- **Vorteil:** Alle Projekte profitieren
- **Nachteil:** Parsing kann fehlschlagen

---

## Feature-Flag

```typescript
// src/lib/config/feature-flags.ts

export const FEATURE_FLAGS = {
  // Aktiviert PM-Vorlage im Strategie-Tab
  PM_VORLAGE_ENABLED: true,

  // Zeigt Profi-Modus noch an (für Übergangszeit)
  LEGACY_PROFI_MODUS: false,

  // Aktiviert automatisches Überschreiben der PM
  PM_AUTO_APPLY: false, // Später auf true setzen
};
```

---

## Rollout-Plan

### Woche 1: Soft Launch
1. Feature hinter Flag aktivieren
2. Nur für neue Projekte sichtbar
3. Profi-Modus noch verfügbar (deprecated)

### Woche 2: Feedback-Phase
1. User-Feedback sammeln
2. Bugs fixen
3. UX-Anpassungen

### Woche 3: Vollständiger Rollout
1. Profi-Modus entfernen
2. Für alle Projekte aktivieren
3. Dokumentation aktualisieren

### Woche 4+: Cleanup
1. Legacy-Code entfernen
2. Feature-Flags entfernen
3. Migration-Script für alte Projekte (optional)

---

## Firestore-Schema Evolution

### Aktuell
```
projects/{projectId}/
├── strategy/
│   ├── dnaSynthese      # ✅ Bleibt
│   └── kernbotschaft    # ✅ Bleibt (plainText, content)
```

### NEU (additiv)
```
projects/{projectId}/
├── strategy/
│   ├── dnaSynthese           # Unverändert
│   ├── faktenMatrix          # NEU (strukturiert, via Tool-Call vom Wizard)
│   │   ├── hook
│   │   │   ├── event
│   │   │   ├── location
│   │   │   └── date
│   │   ├── details
│   │   │   ├── delta
│   │   │   └── evidence
│   │   ├── quote
│   │   │   ├── speakerId    # Referenz auf DNA-Kontakt
│   │   │   └── rawStatement
│   │   └── createdAt
│   └── pmVorlage             # NEU
│       ├── headline
│       ├── leadParagraph
│       ├── bodyParagraphs[]
│       ├── quote
│       │   ├── text
│       │   ├── person
│       │   ├── role
│       │   └── company
│       ├── cta
│       ├── hashtags[]
│       ├── htmlContent
│       ├── generatedAt
│       ├── markenDNAHash      # NEU: Für Änderungserkennung
│       ├── faktenMatrixHash   # NEU: Für Änderungserkennung
│       ├── targetGroup        # NEU: ZG1/ZG2/ZG3
│       └── history[]          # NEU: Letzte 3 Versionen für Undo
│           ├── [0].content
│           ├── [0].generatedAt
│           ├── [1].content
│           └── ...
```

### Rückwärtskompatibilität
```typescript
// Prüfung im Code
async function getPMVorlageStatus(projectId: string): Promise<PMVorlageStatus> {
  const dna = await dnaSyntheseService.get(companyId);
  if (!dna) return { status: 'missing_dna' };

  const faktenMatrix = await faktenMatrixService.get(projectId);
  if (!faktenMatrix) return { status: 'missing_fakten' };

  // Prüfe ob bestehende Vorlage veraltet ist
  const pmVorlage = await pmVorlageService.get(projectId);
  if (pmVorlage) {
    const currentDNAHash = hashString(JSON.stringify(dna));
    const currentFaktenHash = hashString(JSON.stringify(faktenMatrix));

    if (pmVorlage.markenDNAHash !== currentDNAHash) {
      return { status: 'outdated', reason: 'dna_changed' };
    }
    if (pmVorlage.faktenMatrixHash !== currentFaktenHash) {
      return { status: 'outdated', reason: 'fakten_changed' };
    }
    return { status: 'available', vorlage: pmVorlage };
  }

  return { status: 'available' };
}

type PMVorlageStatus =
  | { status: 'missing_dna' }
  | { status: 'missing_fakten' }
  | { status: 'outdated'; reason: 'dna_changed' | 'fakten_changed' }
  | { status: 'available'; vorlage?: PMVorlage };
```

---

## Deprecation-Hinweise

### Im KI-Assistent
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Der Profi-Modus wurde in den Strategie-Tab verschoben.     │
│                                                                  │
│  Für optimale Ergebnisse:                                        │
│  1. Erstellen Sie die Marken-DNA unter "Strategie"              │
│  2. Erstellen Sie die Kernbotschaft                              │
│  3. Generieren Sie die PM-Vorlage                               │
│                                                                  │
│  [Zur Strategie →]                                              │
└─────────────────────────────────────────────────────────────────┘
```

### In der Dokumentation
- Changelog-Eintrag
- Help-Artikel aktualisieren
- Video-Tutorial (optional)

---

## Risikomatrix

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Alte PMs werden überschrieben | Mittel | Hoch | Explizite Warnung + Bestätigung |
| Parsing alter Sidebar schlägt fehl | Niedrig | Mittel | Fallback auf Standard-Modus |
| User finden neue Funktion nicht | Mittel | Niedrig | Hinweis im KI-Assistent |
| Performance-Probleme | Niedrig | Mittel | Caching der Vorlage |

---

## Testfälle für Migration

### 1. Neues Projekt
- [ ] Kann DNA-Synthese erstellen
- [ ] Kann Kernbotschaft mit Fakten-Matrix erstellen
- [ ] Kann PM-Vorlage generieren
- [ ] PM-Vorlage wird korrekt angezeigt

### 2. Altes Projekt ohne Strategie
- [ ] Standard-Modus funktioniert wie bisher
- [ ] Hinweis auf Strategie wird angezeigt
- [ ] Keine Fehler beim Öffnen

### 3. Altes Projekt mit DNA aber ohne Fakten-Matrix
- [ ] Zeigt "Kernbotschaft fehlt"
- [ ] Link zur Kernbotschaft-Erstellung
- [ ] Standard-Modus funktioniert

### 4. Überschreiben bestehender PM
- [ ] Warnung wird angezeigt
- [ ] Bestätigung erforderlich
- [ ] Alte Texte werden ersetzt
- [ ] Undo möglich? (Optional)
