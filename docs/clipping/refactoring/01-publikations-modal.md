# Refactoring-Plan 01: Publikations-Modal Monitoring-Tab

**Datum:** 25.11.2025
**Status:** Geplant
**Priorität:** Hoch

---

## Zusammenfassung

Entfernung von zwei funktionslosen Feldern aus dem Publikations-Modal Monitoring-Tab:
- **Prüf-Frequenz** (wird vom Crawler ignoriert)
- **Keywords** (werden vom Crawler ignoriert)

---

## Betroffene Dateien

### Hauptdatei
- `src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx`

### Typ-Definitionen
- `src/app/dashboard/library/publications/PublicationModal/types.ts`
- `src/types/library.ts` (PublicationMonitoringConfig)

### Tests
- `src/app/dashboard/library/publications/PublicationModal/__tests__/MonitoringSection.test.tsx`

### Möglicherweise betroffen
- `src/app/dashboard/library/publications/PublicationModal/index.tsx`
- `src/app/dashboard/library/publications/[publicationId]/page.tsx` (Detail-Ansicht)

---

## Änderungen

### 1. MonitoringSection.tsx

**Zu entfernen (Zeilen 261-332):**

```tsx
// ENTFERNEN: Check Frequency (Zeilen 261-276)
<div>
  <label className="block text-sm font-medium text-zinc-700 mb-1">
    Prüf-Frequenz
  </label>
  <Select
    value={monitoringConfig.checkFrequency}
    onChange={(e) => setMonitoringConfig({
      ...monitoringConfig,
      checkFrequency: e.target.value as 'daily' | 'twice_daily'
    })}
  >
    <option value="daily">Täglich</option>
    <option value="twice_daily">Zweimal täglich</option>
  </Select>
</div>

// ENTFERNEN: Keywords (Zeilen 278-332)
<div>
  <label className="block text-sm font-medium text-zinc-700 mb-2">
    Keywords (optional)
  </label>
  ...
</div>
```

### 2. types.ts

**Zu ändern:**

```typescript
// VORHER
export interface MonitoringConfigState {
  isEnabled: boolean;
  websiteUrl: string;
  rssFeedUrls: string[];
  checkFrequency: 'daily' | 'twice_daily';  // ← ENTFERNEN
  keywords: string[];                        // ← ENTFERNEN
  totalArticlesFound: number;
}

// NACHHER
export interface MonitoringConfigState {
  isEnabled: boolean;
  websiteUrl: string;
  rssFeedUrls: string[];
  totalArticlesFound: number;
}
```

**Default-Werte anpassen:**

```typescript
// VORHER
export const defaultMonitoringConfig: MonitoringConfigState = {
  isEnabled: false,
  websiteUrl: '',
  rssFeedUrls: [],
  checkFrequency: 'daily',  // ← ENTFERNEN
  keywords: [],              // ← ENTFERNEN
  totalArticlesFound: 0
};

// NACHHER
export const defaultMonitoringConfig: MonitoringConfigState = {
  isEnabled: false,
  websiteUrl: '',
  rssFeedUrls: [],
  totalArticlesFound: 0
};
```

### 3. index.tsx (PublicationModal)

**Initialisierung anpassen (ca. Zeile 213):**

```typescript
// VORHER
setMonitoringConfig({
  isEnabled: publication.monitoringConfig.isEnabled || false,
  websiteUrl: publication.monitoringConfig.websiteUrl || '',
  rssFeedUrls: publication.monitoringConfig.rssFeedUrls || [],
  checkFrequency: publication.monitoringConfig.checkFrequency || 'daily',  // ← ENTFERNEN
  keywords: publication.monitoringConfig.keywords || [],                    // ← ENTFERNEN
  totalArticlesFound: publication.monitoringConfig.totalArticlesFound || 0
});

// NACHHER
setMonitoringConfig({
  isEnabled: publication.monitoringConfig.isEnabled || false,
  websiteUrl: publication.monitoringConfig.websiteUrl || '',
  rssFeedUrls: publication.monitoringConfig.rssFeedUrls || [],
  totalArticlesFound: publication.monitoringConfig.totalArticlesFound || 0
});
```

**Speichern anpassen (ca. Zeile 298):**

```typescript
// VORHER
monitoringConfig: {
  isEnabled: monitoringConfig.isEnabled,
  websiteUrl: monitoringConfig.websiteUrl,
  rssFeedUrls: monitoringConfig.rssFeedUrls,
  checkFrequency: monitoringConfig.checkFrequency,  // ← ENTFERNEN
  keywords: monitoringConfig.keywords,              // ← ENTFERNEN
  ...
}

// NACHHER
monitoringConfig: {
  isEnabled: monitoringConfig.isEnabled,
  websiteUrl: monitoringConfig.websiteUrl,
  rssFeedUrls: monitoringConfig.rssFeedUrls,
  ...
}
```

### 4. Detail-Seite [publicationId]/page.tsx

**Zu entfernen (ca. Zeile 883-888):**

```tsx
// ENTFERNEN: checkFrequency Anzeige
{publication.monitoringConfig.checkFrequency && (
  <div>
    <dt className="text-sm font-medium text-zinc-500">Prüf-Frequenz</dt>
    <dd className="text-sm text-zinc-900">
      {publication.monitoringConfig.checkFrequency === 'daily' ? 'Täglich' :
       publication.monitoringConfig.checkFrequency === 'twice_daily' ? 'Zweimal täglich' :
       publication.monitoringConfig.checkFrequency}
    </dd>
  </div>
)}
```

### 5. Tests anpassen

**MonitoringSection.test.tsx:**

```typescript
// Default-Mock anpassen
const defaultMonitoringConfig = {
  isEnabled: false,
  websiteUrl: '',
  rssFeedUrls: [],
  // checkFrequency: 'daily',  // ← ENTFERNEN
  // keywords: [],              // ← ENTFERNEN
  totalArticlesFound: 0
};

// Tests für checkFrequency und keywords entfernen
```

---

## Nicht ändern (Datenbank)

**WICHTIG:** Die Felder in `src/types/library.ts` (PublicationMonitoringConfig) bleiben bestehen für Backward-Compatibility:

```typescript
// src/types/library.ts - NICHT ÄNDERN
interface PublicationMonitoringConfig {
  isEnabled: boolean;
  websiteUrl?: string;
  rssFeedUrls: string[];
  checkFrequency: 'daily' | 'twice_daily';  // Bleibt in DB
  keywords: string[];                        // Bleibt in DB
  // ...
}
```

Die Felder werden nur aus der UI entfernt, nicht aus dem Datenmodell. Bestehende Daten bleiben erhalten.

---

## Checkliste

- [ ] MonitoringSection.tsx: Prüf-Frequenz Feld entfernen
- [ ] MonitoringSection.tsx: Keywords Feld entfernen
- [ ] types.ts: MonitoringConfigState anpassen
- [ ] types.ts: defaultMonitoringConfig anpassen
- [ ] index.tsx: Initialisierung anpassen
- [ ] index.tsx: Speichern anpassen
- [ ] [publicationId]/page.tsx: checkFrequency Anzeige entfernen
- [ ] MonitoringSection.test.tsx: Tests anpassen
- [ ] Manueller Test: Modal öffnen, speichern, prüfen

---

## Risiko-Bewertung

| Risiko | Bewertung | Grund |
|--------|-----------|-------|
| Breaking Changes | Niedrig | Nur UI-Änderungen, DB-Schema bleibt |
| Datenverlust | Keiner | Bestehende Daten bleiben in DB |
| Regressions | Niedrig | Felder waren funktionslos |

---

*Erstellt am 25.11.2025*
