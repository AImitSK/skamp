# Media Research Pipeline - Anleitung

## Flow via Genkit MCP starten

### 1. Genkit Dev Server starten

```bash
npm run genkit:dev
```

### 2. Flow über MCP ausführen

Der Haupt-Flow `mediaResearchFlow` kann über das Genkit MCP Tool aufgerufen werden.

**Basis-Suche (nur Rehburg-Loccum):**
```json
{
  "flowName": "mediaResearchFlow",
  "input": "{\"region\":\"Rehburg-Loccum\",\"center\":{\"lat\":52.4638,\"lng\":9.2261},\"radiusKm\":50,\"organizationId\":\"hJ4gTE9Gm35epoub0zIU\",\"userId\":\"FA1mBm2twKSBHEM3VPIJtJIulUz1\",\"tagName\":\"GCRL\",\"importToCrm\":true}"
}
```

**Erweiterte Suche MIT Hannover (empfohlen für GCRL):**
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

## Parameter Erklärung

| Parameter | Beschreibung |
|-----------|--------------|
| `region` | Name der Region (z.B. "Rehburg-Loccum") |
| `center.lat` | Breitengrad des Suchzentrums |
| `center.lng` | Längengrad des Suchzentrums |
| `radiusKm` | Suchradius in Kilometern (1-100) |
| `organizationId` | Firebase Organization ID |
| `userId` | User ID für Audit-Felder |
| `tagName` | Tag-Name für alle erstellten Einträge |
| `importToCrm` | `true` = in CRM importieren, `false` = nur Recherche |

## Bekannte Organization IDs

- **GolfNext**: `hJ4gTE9Gm35epoub0zIU`

## Qualitätskontrolle

Der Flow führt automatisch eine Medien-Klassifizierung durch:
- Jede gefundene Website wird vom LLM geprüft
- Nur als "echte Medien" klassifizierte Unternehmen werden importiert
- Nicht-Medien (Bäckereien, Supermärkte, etc.) werden gefiltert

## Output

Nach dem Flow-Durchlauf werden erstellt:
- **Companies** in `companies_enhanced` Collection
- **Publications** in `publications` Collection
- **Contacts** in `contacts_enhanced` Collection

Alle Einträge werden mit dem Tag (z.B. "GCRL") versehen.
