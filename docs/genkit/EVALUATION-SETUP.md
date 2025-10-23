# Genkit Evaluation Setup für mergeVariants Flow

## Übersicht

Dieses Dokument beschreibt das Evaluation-Setup für den `mergeVariants` Genkit Flow, mit dem die Qualität des KI-gestützten Mergens von Journalisten-Kontakten systematisch getestet werden kann.

## Architektur

```
src/lib/ai/
├── genkit-config.ts                      # Genkit mit Evaluator-Plugins
├── flows/
│   └── merge-variants.ts                 # Zu testender Flow
├── evaluators/
│   └── merge-quality-evaluators.ts       # 6 Custom Evaluators
└── test-data/
    └── merge-variants-dataset.json       # 5 Test-Szenarien
```

## Custom Evaluators (6 Stück)

### 1. `merge/allEmailsPresent`
- **Prüft:** Alle E-Mails aus allen Varianten sind im gemergten Kontakt vorhanden (dedupliziert)
- **Score:** 1 = alle vorhanden, 0 = fehlende E-Mails
- **Details:** Listet fehlende E-Mails auf

### 2. `merge/allBeatsPresent`
- **Prüft:** Alle Beats (Themenschwerpunkte) aus allen Varianten sind vorhanden
- **Score:** 1 = alle vorhanden, 0 = fehlende Beats
- **Details:** Listet fehlende Beats auf

### 3. `merge/allPublicationsPresent`
- **Prüft:** Alle Publications aus allen Varianten sind vorhanden
- **Score:** 1 = alle vorhanden, 0 = fehlende Publications
- **Details:** Listet fehlende Publications auf

### 4. `merge/titlePreserved`
- **Prüft:** Titel (Dr., Prof., etc.) wird korrekt übernommen, wenn vorhanden
- **Score:** 1 = Titel korrekt, 0 = Titel fehlt oder falsch
- **Details:** Expected vs. Actual Titel

### 5. `merge/noDuplicateEmails`
- **Prüft:** Keine doppelten E-Mail-Adressen im gemergten Kontakt
- **Score:** 1 = keine Duplikate, 0 = Duplikate gefunden
- **Details:** Listet Duplikate auf

### 6. `merge/primaryFlagsSet`
- **Prüft:** Mindestens eine E-Mail und Telefon (falls vorhanden) haben `isPrimary=true`
- **Score:** 1 = Primary-Flags gesetzt, 0 = fehlende Primary-Flags
- **Details:** Status pro Kontakttyp

## Standard Genkit Evaluators (3 Stück)

Zusätzlich zu den Custom Evaluators sind die Standard-Evaluatoren von Genkit aktiviert:

### 1. `genkitEval/faithfulness`
- Prüft die faktische Konsistenz der generierten Antwort gegenüber dem gegebenen Kontext

### 2. `genkitEval/answer_relevancy`
- Bewertet, wie relevant die generierte Antwort für die gegebene Anfrage ist

### 3. `genkitEval/maliciousness`
- Prüft, ob der generierte Output darauf abzielt zu täuschen, zu schaden oder auszunutzen

## Test-Dataset: 5 Szenarien

### Scenario 1: Title Preservation
- **Testet:** Dr.-Titel wird korrekt übernommen
- **Varianten:** 2 (eine mit, eine ohne Titel)
- **Expected:** Titel "Dr." im Output

### Scenario 2: Multiple Phones
- **Testet:** Mobile & Business Phone werden korrekt gemergt
- **Varianten:** 2 (eine mit 1 Phone, eine mit 2 Phones)
- **Expected:** 2 Telefonnummern, 3 Beats, 2 Publications

### Scenario 3: Social Profiles Merge
- **Testet:** Twitter + LinkedIn Profile werden kombiniert
- **Varianten:** 2 (jeweils unterschiedliche Social Profiles)
- **Expected:** 2 Social Profiles, Prof.-Titel

### Scenario 4: Missing Data Handling
- **Testet:** Fehlende Phones in erster Variante werden aus zweiter ergänzt
- **Varianten:** 2 (erste ohne Phones, zweite mit)
- **Expected:** 2 E-Mails, 1 Phone, 3 Beats

### Scenario 5: Three Variants
- **Testet:** Merge von 3 Varianten (Print, Online, Podcast)
- **Varianten:** 3
- **Expected:** 2 E-Mails, 1 Phone, 4 Beats, 3 Publications, 3 Media Types

## Evaluation ausführen

### Option 1: Developer UI (Empfohlen)

1. **Genkit Dev Server starten:**
   ```bash
   npx dotenv-cli -e .env.local -- genkit start -- npx tsx --watch genkit.config.ts
   ```

2. **Developer UI öffnen:**
   ```
   http://localhost:4002
   ```

3. **Dataset importieren:**
   - Gehe zu "Datasets"
   - Klicke "Create Dataset"
   - `datasetId`: `mergeVariantsTestDataset`
   - Type: `Flow`
   - Importiere `src/lib/ai/test-data/merge-variants-dataset.json`

4. **Evaluation starten:**
   - Klicke "Run new evaluation"
   - Flow: `mergeVariants`
   - Dataset: `mergeVariantsTestDataset`
   - Wähle Evaluators aus:
     - ✅ `merge/allEmailsPresent`
     - ✅ `merge/allBeatsPresent`
     - ✅ `merge/allPublicationsPresent`
     - ✅ `merge/titlePreserved`
     - ✅ `merge/noDuplicateEmails`
     - ✅ `merge/primaryFlagsSet`
     - ✅ `genkitEval/faithfulness`
     - ✅ `genkitEval/answer_relevancy`
   - Klicke "Run evaluation"

5. **Ergebnisse ansehen:**
   - Gehe zu "Evaluations"
   - Klicke auf die neueste Evaluation
   - Siehe Scores pro Test-Case

### Option 2: CLI (für CI/CD)

```bash
# Genkit Server starten (in separatem Terminal)
npx dotenv-cli -e .env.local -- genkit start -- npx tsx genkit.config.ts

# Evaluation ausführen
genkit eval:flow mergeVariants \
  --input src/lib/ai/test-data/merge-variants-dataset.json \
  --evaluators merge/allEmailsPresent,merge/allBeatsPresent,merge/allPublicationsPresent,merge/titlePreserved,merge/noDuplicateEmails,merge/primaryFlagsSet
```

### Option 3: Direkter API-Test

```bash
curl -X POST http://localhost:3000/api/ai/merge-variants \
  -H "Content-Type: application/json" \
  -d @src/lib/ai/test-data/merge-variants-dataset.json[0].input
```

## Evaluation-Ergebnisse interpretieren

### Perfect Score (alle 1.0)
```
✅ merge/allEmailsPresent: 1.0
✅ merge/allBeatsPresent: 1.0
✅ merge/allPublicationsPresent: 1.0
✅ merge/titlePreserved: 1.0
✅ merge/noDuplicateEmails: 1.0
✅ merge/primaryFlagsSet: 1.0
```
→ **Merge-Qualität ist perfekt**

### Problematische Scores
```
❌ merge/allEmailsPresent: 0.0
   Details: Missing emails: anna.schmidt@gmail.com
```
→ **Problem:** KI hat E-Mail nicht übernommen

```
❌ merge/noDuplicateEmails: 0.0
   Details: Found duplicate emails: a.schmidt@sz.de
```
→ **Problem:** Deduplizierung fehlgeschlagen

## Evaluation-Vergleiche

Das Developer UI unterstützt Side-by-Side-Vergleiche mehrerer Evaluation-Runs:

1. Führe mehrere Evaluations aus (z.B. nach Code-Änderungen)
2. Gehe zu Dataset → Evaluations Tab
3. Wähle eine Baseline-Evaluation
4. Klicke "+ Comparison"
5. Wähle eine zweite Evaluation
6. **Metric Highlighting aktivieren:**
   - Wähle eine Metrik aus dem Dropdown
   - ✅ Toggle "Lower is better" wenn nötig
   - Grün = Verbesserung, Rot = Verschlechterung

## Batch-Evaluation für Performance

Für große Datasets kann Batching aktiviert werden:

```bash
genkit eval:flow mergeVariants \
  --input src/lib/ai/test-data/merge-variants-dataset.json \
  --evaluators merge/allEmailsPresent \
  --batchSize 10
```

## Integration in CI/CD

### GitHub Actions Beispiel

```yaml
name: Genkit Evaluation

on:
  pull_request:
    branches: [main]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install

      - name: Run Genkit Evaluation
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          npx genkit start -- npx tsx genkit.config.ts &
          sleep 10
          npx genkit eval:flow mergeVariants \
            --input src/lib/ai/test-data/merge-variants-dataset.json \
            --evaluators merge/allEmailsPresent,merge/allBeatsPresent
```

## Neue Evaluators hinzufügen

1. **Evaluator erstellen** in `src/lib/ai/evaluators/`:
   ```typescript
   export const myCustomEvaluator = ai.defineEvaluator(
     {
       name: 'merge/myMetric',
       displayName: 'My Metric',
       definition: 'Description',
     },
     async (datapoint) => {
       // Evaluation-Logik
       return {
         testCaseId: datapoint.testCaseId,
         evaluation: {
           score: 1,
           details: { reason: 'Success' },
         },
       };
     }
   );
   ```

2. **Import in genkit.config.ts:**
   ```typescript
   import './src/lib/ai/evaluators/my-evaluator';
   ```

3. **Server neu starten**

## Troubleshooting

### Evaluator nicht sichtbar im UI
- Server neu starten
- Browser-Cache leeren
- Check: Evaluator korrekt exportiert?

### Evaluation schlägt fehl
- Check: API Key gesetzt? (`GEMINI_API_KEY`)
- Check: Input-Schema korrekt?
- Check: Server läuft?

### Langsame Evaluations
- Batch-Size erhöhen (`--batchSize 10`)
- Weniger Evaluators auswählen
- Kleineres Dataset verwenden

## Nächste Schritte

1. **Mehr Test-Szenarien hinzufügen**
   - Edge Cases (leere Varianten, nur 1 Variante)
   - Error Cases (invalide E-Mails, fehlende Required Fields)

2. **Mehr Custom Evaluators**
   - `merge/phoneNumbersValid` - Telefonnummern-Format prüfen
   - `merge/emailDomainsConsistent` - E-Mail-Domains plausibel?
   - `merge/positionQuality` - Position-String Qualität

3. **Automatisierung**
   - Pre-commit Hook für Evaluations
   - Nightly Evaluation-Runs
   - Slack-Notifications bei schlechten Scores

## Referenzen

- [Genkit Evaluation Docs](https://firebase.google.com/docs/genkit/evaluation)
- [Custom Evaluators schreiben](https://firebase.google.com/docs/genkit/plugin-authoring/evaluators)
- [Genkit Developer UI](https://firebase.google.com/docs/genkit/devtools)
