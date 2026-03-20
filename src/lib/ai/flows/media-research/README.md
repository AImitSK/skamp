# Media Research Pipeline - Anleitung

## Ziel-Organisation (WICHTIG!)

**Organisation:** Stefan Kühne / SK Online Marketing
**Organization ID:** `hJ4gTE9Gm35epoub0zIU`
**User ID:** `FA1mBm2twKSBHEM3VPIJtJIulUz1`
**Tag für Recherche-Ergebnisse:** `GCRL` (Tag-ID: `ymY4Gh9R7F150Js9R2xt`)

⚠️ **NIEMALS eine andere organizationId verwenden!**

---

## Geschützte Daten (NIEMALS löschen!)

Diese Einträge haben auch den GCRL-Tag, sind aber KEINE Testdaten:
- **Company:** Golfclub Rehburg-Loccum
- **Contact:** Gregor von Hinten

---

## Flow via Genkit MCP starten

### 1. Genkit Dev Server starten

```bash
npm run genkit:dev
```

### 2. Flow über MCP ausführen

#### Option A: Staging-Modus (EMPFOHLEN)

Speichert Ergebnisse zur Prüfung bevor sie ins CRM importiert werden:

```json
{
  "flowName": "mediaResearchFlow",
  "input": "{\"region\":\"Rehburg-Loccum\",\"center\":{\"lat\":52.4638,\"lng\":9.2261},\"radiusKm\":50,\"organizationId\":\"hJ4gTE9Gm35epoub0zIU\",\"userId\":\"FA1mBm2twKSBHEM3VPIJtJIulUz1\",\"tagName\":\"GCRL\",\"useStaging\":true,\"autoEnrich\":true,\"importToCrm\":false}"
}
```

#### Option B: Direkter CRM-Import

```json
{
  "flowName": "mediaResearchFlow",
  "input": "{\"region\":\"Rehburg-Loccum\",\"center\":{\"lat\":52.4638,\"lng\":9.2261},\"radiusKm\":50,\"organizationId\":\"hJ4gTE9Gm35epoub0zIU\",\"userId\":\"FA1mBm2twKSBHEM3VPIJtJIulUz1\",\"tagName\":\"GCRL\",\"importToCrm\":true}"
}
```

#### Option C: Erweiterte Suche MIT Hannover

```json
{
  "flowName": "mediaResearchFlow",
  "input": "{\"region\":\"Rehburg-Loccum\",\"center\":{\"lat\":52.4638,\"lng\":9.2261},\"radiusKm\":50,\"additionalCenters\":[{\"name\":\"Hannover\",\"center\":{\"lat\":52.3759,\"lng\":9.7320},\"radiusKm\":25}],\"organizationId\":\"hJ4gTE9Gm35epoub0zIU\",\"userId\":\"FA1mBm2twKSBHEM3VPIJtJIulUz1\",\"tagName\":\"GCRL\",\"importToCrm\":true}"
}
```

### 3. Einzelne Sub-Flows testen

#### Google Places Suche

```json
{
  "flowName": "googlePlacesSearchFlow",
  "input": "{\"region\":\"Rehburg-Loccum\",\"center\":{\"lat\":52.4638,\"lng\":9.2261},\"radiusKm\":50}"
}
```

#### Web Scraper (einzelne Website)

```json
{
  "flowName": "webScraperFlow",
  "input": "{\"websiteUrl\":\"https://www.die-harke.de\",\"companyName\":\"Die Harke\"}"
}
```

---

## Parameter Erklärung

| Parameter | Beschreibung |
|-----------|--------------|
| `region` | Name der Region (z.B. "Rehburg-Loccum") |
| `center.lat` | Breitengrad des Suchzentrums |
| `center.lng` | Längengrad des Suchzentrums |
| `radiusKm` | Suchradius in Kilometern (1-100) |
| `organizationId` | Firebase Organization ID (**immer** `hJ4gTE9Gm35epoub0zIU`) |
| `userId` | User ID für Audit-Felder |
| `tagName` | Tag-Name für alle erstellten Einträge |
| `importToCrm` | `true` = in CRM importieren, `false` = nur Recherche |
| `useStaging` | `true` = in Staging Collection speichern (empfohlen) |
| `autoEnrich` | `true` = automatisches Re-Enrichment bei niedrigem Score |

---

## Import-Daten löschen (nach fehlgeschlagenem Test)

### Sicheres Löschen - NUR Daten dieser Import-Runde

Um NUR die Daten eines bestimmten Imports zu löschen (ohne ältere Daten oder geschützte Einträge):

**Vor dem Import:** Zeitstempel notieren (z.B. `2026-03-19T15:00:00Z`)

**Nach dem Import löschen:**
```bash
npx tsx scripts/delete-import-by-timestamp.ts --after="2026-03-19T15:00:00Z"
```

Das Script löscht nur:
- Dokumente mit `tagIds` enthält GCRL-Tag
- UND `createdAt` > angegebener Zeitstempel

**GESCHÜTZT bleiben immer:**
- Golfclub Rehburg-Loccum
- Gregor von Hinten
- Alle Daten die VOR dem Zeitstempel erstellt wurden

---

## Output

Nach dem Flow-Durchlauf werden erstellt:
- **Companies** in `companies_enhanced` Collection (type: `publisher`)
- **Publications** als `mediaInfo.publications[]` in der Company
- **Contacts** in `contacts_enhanced` Collection (mit `isJournalist: true`)

Alle Einträge werden mit dem GCRL-Tag versehen (`tagIds: ["ymY4Gh9R7F150Js9R2xt"]`).

---

## Qualitätskontrolle

Der Flow führt automatisch eine Medien-Klassifizierung durch:
- Jede gefundene Website wird vom LLM geprüft
- Nur als "echte Medien" klassifizierte Unternehmen werden importiert
- Nicht-Medien (Bäckereien, Marketing-Agenturen, etc.) werden gefiltert
- Fachverlage ohne Nachrichtenwert werden ausgeschlossen
