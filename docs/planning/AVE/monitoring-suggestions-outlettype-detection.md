# Monitoring Suggestions: Intelligente outletType-Erkennung

**Datum:** 2025-01-29
**Status:** 🟡 Planung
**Bereich:** Monitoring, Auto-Funde, Clipping-Erstellung
**Bezug:** `monitoring-types-refactoring.md`, `publication-type-format-metrics-konzept.md`

---

## 🎯 Zielsetzung

Wenn ein Auto-Fund (Monitoring Suggestion) als Clipping übernommen wird, soll der `outletType` **nicht hardcoded** sein, sondern **intelligent basierend auf der Publication** ermittelt werden.

**Ziel:**
- ✅ Podcasts (RSS Feeds) → `outletType: 'audio'`
- ✅ Radio/TV Feeds → `outletType: 'broadcast'`
- ✅ Online-Artikel → `outletType: 'online'`
- ✅ Print-Publikationen → `outletType: 'print'`

---

## 📍 Wo wird der outletType gesetzt?

**Route:** `/dashboard/analytics/monitoring/[campaignId]?tab=suggestions`

**User Flow:**
1. User sieht Auto-Funde (Monitoring Suggestions)
2. User klickt "Übernehmen" → Dialog öffnet sich
3. User wählt Sentiment (Positiv/Neutral/Negativ)
4. User klickt "Clipping erstellen"
5. **Service:** `monitoring-suggestion-service.ts` erstellt Clipping
6. **HIER:** `outletType` wird gesetzt

---

## ❌ Aktuelles Problem

### **Hardcoded `outletType: 'online'`**

**Datei:** `src/lib/firebase/monitoring-suggestion-service.ts`
**Zeile:** 97-112

```typescript
async confirmSuggestion(
  suggestionId: string,
  context: {
    userId: string;
    organizationId: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }
): Promise<string> {
  const suggestion = await this.getById(suggestionId);

  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  // Lade Kampagne für projectId
  const { prService } = await import('./pr-service');
  const campaign = await prService.getById(suggestion.campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Erstelle Clipping aus Suggestion
  const clippingData: Record<string, any> = {
    organizationId: suggestion.organizationId,
    campaignId: suggestion.campaignId,
    projectId: campaign.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0]?.foundAt || Timestamp.now(),
    outletName: suggestion.sources[0]?.sourceName || 'Unbekannt',
    outletType: 'online' as const,  // ❌ HARDCODED - PROBLEM
    sentiment: context.sentiment || 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: suggestion.createdAt,
    createdBy: context.userId,
    verifiedBy: context.userId,
    verifiedAt: Timestamp.now()
  };

  // ...
}
```

---

### **Problemszenarien:**

| Szenario | Source | Aktuell | Sollte sein |
|----------|--------|---------|-------------|
| Podcast-RSS Feed gefunden | `rss_feed` (Publication: Podcast) | `'online'` ❌ | `'audio'` ✅ |
| Radio-RSS Feed gefunden | `rss_feed` (Publication: Radio) | `'online'` ❌ | `'broadcast'` ✅ |
| Online-Artikel gefunden | `google_news` | `'online'` ✅ | `'online'` ✅ |
| Print-Zeitung (Online-Ausgabe) | `rss_feed` (Publication: Newspaper, Format: online) | `'online'` ✅ | `'online'` ✅ |

---

## ✅ SOLL-Zustand

### **Intelligente Erkennung basierend auf Publication**

**Prinzip:**
1. Prüfe Source-Type der Suggestion
2. **Wenn RSS Feed + publicationId vorhanden:**
   - Lade Publication aus Library
   - Verwende `mapPublicationTypeToMonitoring(type, format)` zur Ermittlung des `outletType`
3. **Wenn Google News oder keine publicationId:**
   - Fallback: `'online'`

---

## 💡 Lösungsansatz

### **Option A: Intelligente Erkennung (EMPFOHLEN)**

**Vorteile:**
- ✅ Präzise (verwendet tatsächliche Publication-Daten)
- ✅ Konsistent (nutzt `mapPublicationTypeToMonitoring()`)
- ✅ Zukunftssicher (funktioniert für alle Publication-Types)
- ✅ Keine manuelle Nachbearbeitung nötig

**Nachteile:**
- ⚠️ Zusätzliche Firestore-Abfrage (nur bei RSS Feeds)

---

### **Option B: Heuristik basierend auf Source-Name**

**Vorteile:**
- ✅ Keine zusätzliche Firestore-Abfrage
- ✅ Einfacher Code

**Nachteile:**
- ❌ Unpräzise (basiert auf String-Matching)
- ❌ Fehleranfällig (was wenn Source-Name nicht "Podcast" enthält?)
- ❌ Nicht zukunftssicher

---

### **Option C: Manuell nachträglich anpassen**

**Vorteile:**
- ✅ Keine Code-Änderung nötig

**Nachteile:**
- ❌ Schlechte UX
- ❌ Fehleranfällig
- ❌ User müssen jedes Clipping nachbearbeiten

---

**Empfehlung:** **Option A (Intelligente Erkennung)**

---

## 🔧 Implementierungsplan

### **Phase 1: Helper-Funktion erstellen**

**Datei:** `src/lib/firebase/monitoring-suggestion-service.ts`

**Neue Funktion hinzufügen:**

```typescript
/**
 * Ermittelt den outletType basierend auf der Monitoring-Source
 *
 * @param suggestion - Die Monitoring Suggestion
 * @param organizationId - Organisation ID für Publication-Lookup
 * @returns outletType für das zu erstellende Clipping
 */
private async detectOutletType(
  suggestion: MonitoringSuggestion,
  organizationId: string
): Promise<'print' | 'online' | 'broadcast' | 'audio'> {
  // Default: online (für Google News und Fallback)
  let outletType: 'print' | 'online' | 'broadcast' | 'audio' = 'online';

  // Prüfe erste Source (Primary Source)
  const primarySource = suggestion.sources[0];

  if (!primarySource) {
    return outletType; // Fallback
  }

  // Google News → immer online
  if (primarySource.type === 'google_news') {
    return 'online';
  }

  // RSS Feed → Publication laden und Type ermitteln
  if (primarySource.type === 'rss_feed' && primarySource.publicationId) {
    try {
      const { publicationService } = await import('./library-service');
      const publication = await publicationService.getById(
        primarySource.publicationId,
        organizationId
      );

      if (publication) {
        // Verwende existing mapping function
        const { mapPublicationTypeToMonitoring } = await import('../utils/publication-matcher');
        outletType = mapPublicationTypeToMonitoring(publication.type, publication.format);

        console.log(`✅ Detected outletType '${outletType}' for Publication '${publication.title}' (Type: ${publication.type}, Format: ${publication.format})`);
      } else {
        console.warn(`⚠️ Publication ${primarySource.publicationId} not found, using fallback 'online'`);
      }
    } catch (error) {
      console.error('Error detecting outletType from Publication:', error);
      // Fallback: online
    }
  }

  return outletType;
}
```

---

### **Phase 2: confirmSuggestion() anpassen**

**Datei:** `src/lib/firebase/monitoring-suggestion-service.ts`
**Zeile:** 70-139

**VORHER:**
```typescript
async confirmSuggestion(
  suggestionId: string,
  context: {
    userId: string;
    organizationId: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }
): Promise<string> {
  const suggestion = await this.getById(suggestionId);

  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion already processed');
  }

  // Lade Kampagne für projectId
  const { prService } = await import('./pr-service');
  const campaign = await prService.getById(suggestion.campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Erstelle Clipping aus Suggestion
  const clippingData: Record<string, any> = {
    organizationId: suggestion.organizationId,
    campaignId: suggestion.campaignId,
    projectId: campaign.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0]?.foundAt || Timestamp.now(),
    outletName: suggestion.sources[0]?.sourceName || 'Unbekannt',
    outletType: 'online' as const,  // ❌ HARDCODED
    sentiment: context.sentiment || 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: suggestion.createdAt,
    createdBy: context.userId,
    verifiedBy: context.userId,
    verifiedAt: Timestamp.now()
  };

  // Nur definierte optionale Felder hinzufügen (Firestore akzeptiert kein undefined)
  if (suggestion.articleExcerpt) {
    clippingData.excerpt = suggestion.articleExcerpt;
  }
  if (suggestion.articleImage) {
    clippingData.imageUrl = suggestion.articleImage;
  }

  const clippingId = await clippingService.create(
    clippingData,
    context
  );

  // Update Suggestion Status
  await updateDoc(doc(db, this.collectionName, suggestionId), {
    status: 'confirmed',
    clippingId,
    reviewedBy: context.userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log(`✅ Suggestion ${suggestionId} confirmed and clipping ${clippingId} created`);

  return clippingId;
}
```

---

**NACHHER:**
```typescript
async confirmSuggestion(
  suggestionId: string,
  context: {
    userId: string;
    organizationId: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }
): Promise<string> {
  const suggestion = await this.getById(suggestionId);

  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion already processed');
  }

  // Lade Kampagne für projectId
  const { prService } = await import('./pr-service');
  const campaign = await prService.getById(suggestion.campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // ✅ NEU: Ermittle outletType intelligent
  const outletType = await this.detectOutletType(suggestion, context.organizationId);

  // Erstelle Clipping aus Suggestion
  const clippingData: Record<string, any> = {
    organizationId: suggestion.organizationId,
    campaignId: suggestion.campaignId,
    projectId: campaign.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0]?.foundAt || Timestamp.now(),
    outletName: suggestion.sources[0]?.sourceName || 'Unbekannt',
    outletType,  // ✅ Dynamisch ermittelt
    sentiment: context.sentiment || 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: suggestion.createdAt,
    createdBy: context.userId,
    verifiedBy: context.userId,
    verifiedAt: Timestamp.now()
  };

  // Nur definierte optionale Felder hinzufügen (Firestore akzeptiert kein undefined)
  if (suggestion.articleExcerpt) {
    clippingData.excerpt = suggestion.articleExcerpt;
  }
  if (suggestion.articleImage) {
    clippingData.imageUrl = suggestion.articleImage;
  }

  const clippingId = await clippingService.create(
    clippingData,
    context
  );

  // Update Suggestion Status
  await updateDoc(doc(db, this.collectionName, suggestionId), {
    status: 'confirmed',
    clippingId,
    reviewedBy: context.userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log(`✅ Suggestion ${suggestionId} confirmed and clipping ${clippingId} created (outletType: ${outletType})`);

  return clippingId;
}
```

**Änderungen:**
1. Zeile nach Campaign-Load: `const outletType = await this.detectOutletType(suggestion, context.organizationId);`
2. Zeile 105: `outletType: 'online' as const,` → `outletType,`
3. Console.log erweitert um `outletType`

---

### **Phase 3: Auto-Confirm ebenfalls anpassen**

**Hintergrund:** Es gibt auch eine `autoConfirmSuggestion()`-Funktion, die automatisch Clippings erstellt (ohne User-Interaktion).

**Prüfen ob vorhanden:**
```bash
grep -n "autoConfirmSuggestion" src/lib/firebase/monitoring-suggestion-service.ts
```

**Falls vorhanden:** Gleiche Änderung wie bei `confirmSuggestion()` anwenden:
```typescript
const outletType = await this.detectOutletType(suggestion, organizationId);
```

---

## 📊 Betroffene Dateien

| Datei | Änderungen | Aufwand |
|-------|-----------|---------|
| `src/lib/firebase/monitoring-suggestion-service.ts` | Neue `detectOutletType()` Funktion + `confirmSuggestion()` anpassen | 20 Min |
| `src/lib/firebase/monitoring-suggestion-service.ts` | Optional: `autoConfirmSuggestion()` anpassen (falls vorhanden) | 5 Min |

**Gesamt:** ~25 Minuten

---

## 🔄 Beispiele nach Implementierung

### **Beispiel 1: Podcast-RSS Feed**

**Suggestion:**
- Source Type: `rss_feed`
- Source Name: "Tech-Talk Podcast"
- Publication ID: `abc123` (Type: `podcast`, Format: `audio`)

**Ergebnis:**
```typescript
const outletType = await this.detectOutletType(suggestion, organizationId);
// outletType = 'audio' ✅
```

**Clipping:**
```typescript
{
  title: "Neue KI-Trends besprochen",
  outletName: "Tech-Talk Podcast",
  outletType: 'audio',  // ✅ Korrekt
  reach: 120000  // Monthly Downloads
}
```

---

### **Beispiel 2: Online-Zeitung (Google News Fund)**

**Suggestion:**
- Source Type: `google_news`
- Source Name: "Google News"

**Ergebnis:**
```typescript
const outletType = await this.detectOutletType(suggestion, organizationId);
// outletType = 'online' ✅ (Fallback für Google News)
```

**Clipping:**
```typescript
{
  title: "Startup erhält Millionen-Funding",
  outletName: "Süddeutsche Zeitung",
  outletType: 'online',  // ✅ Korrekt
  reach: 1500000  // Page Views
}
```

---

### **Beispiel 3: Radio-RSS Feed**

**Suggestion:**
- Source Type: `rss_feed`
- Source Name: "SWR Nachrichten"
- Publication ID: `def456` (Type: `radio`, Format: `broadcast`)

**Ergebnis:**
```typescript
const outletType = await this.detectOutletType(suggestion, organizationId);
// outletType = 'broadcast' ✅
```

**Clipping:**
```typescript
{
  title: "Interview im Morgenprogramm",
  outletName: "SWR Nachrichten",
  outletType: 'broadcast',  // ✅ Korrekt
  reach: 800000  // Viewership
}
```

---

### **Beispiel 4: Zeitung (Print + Online) - RSS Feed der Online-Ausgabe**

**Suggestion:**
- Source Type: `rss_feed`
- Source Name: "Handelsblatt"
- Publication ID: `ghi789` (Type: `newspaper`, Format: `both`)

**Ergebnis:**
```typescript
const outletType = await this.detectOutletType(suggestion, organizationId);
// outletType = 'print' ✅ (mapPublicationTypeToMonitoring wählt 'print' bei Format 'both')
```

**Clipping:**
```typescript
{
  title: "Neue Steuerreform beschlossen",
  outletName: "Handelsblatt",
  outletType: 'print',  // ✅ Korrekt (Default bei 'both')
  reach: 50000  // Auflage
}
```

---

## 🎯 Implementierungs-Schritte

### **Phase 1: Helper-Funktion** ✅ Priorität 1
- [ ] `detectOutletType()` Funktion erstellen
- [ ] Import von `publicationService` und `mapPublicationTypeToMonitoring`
- [ ] Error Handling + Logging implementieren
- [ ] Fallback auf `'online'` sicherstellen

### **Phase 2: confirmSuggestion() anpassen** ✅ Priorität 1
- [ ] `detectOutletType()` aufrufen vor Clipping-Erstellung
- [ ] `outletType` verwenden statt hardcoded `'online'`
- [ ] Console.log erweitern um `outletType`

### **Phase 3: autoConfirmSuggestion() prüfen** ✅ Priorität 2
- [ ] Prüfen ob `autoConfirmSuggestion()` existiert
- [ ] Falls ja: Gleiche Änderung anwenden

### **Phase 4: Testing** ✅ Priorität 3
- [ ] Test: RSS Feed von Podcast übernehmen → `outletType: 'audio'`
- [ ] Test: Google News übernehmen → `outletType: 'online'`
- [ ] Test: RSS Feed von Radio übernehmen → `outletType: 'broadcast'`
- [ ] Test: Fallback wenn Publication nicht gefunden → `'online'`

---

## 🔗 Verwandte Dokumente

- `monitoring-types-refactoring.md` - Type-Definitionen Anpassung
- `publication-type-format-metrics-konzept.md` - Type/Format-Hauptkonzept
- `monitoring-modals-refactoring.md` - Modal-Anpassungen

---

## ✅ Entscheidungen

1. **Erkennungs-Methode:**
   - ✅ **Option A (Intelligente Erkennung)** basierend auf Publication
   - ❌ Option B (Heuristik) verworfen (zu unpräzise)
   - ❌ Option C (Manuell) verworfen (schlechte UX)

2. **Fallback:**
   - ✅ Wenn Publication nicht geladen werden kann: `'online'`
   - ✅ Google News: Immer `'online'`

3. **Performance:**
   - ⚠️ Zusätzliche Firestore-Abfrage bei RSS Feeds akzeptabel
   - ✅ Nur bei Confirmation (nicht bei Auto-Confirm mit hoher Frequenz)

4. **Logging:**
   - ✅ Console.log für erfolgreiche Detection
   - ✅ Console.warn für Fallback-Fälle
   - ✅ Console.error für Fehler

---

## 📝 Code-Beispiel (Vollständig)

### **Neue Helper-Funktion**

```typescript
/**
 * Ermittelt den outletType basierend auf der Monitoring-Source
 *
 * Logik:
 * - Google News → immer 'online'
 * - RSS Feed mit publicationId → Load Publication und verwende mapPublicationTypeToMonitoring()
 * - Fallback → 'online'
 *
 * @param suggestion - Die Monitoring Suggestion
 * @param organizationId - Organisation ID für Publication-Lookup
 * @returns outletType für das zu erstellende Clipping
 */
private async detectOutletType(
  suggestion: MonitoringSuggestion,
  organizationId: string
): Promise<'print' | 'online' | 'broadcast' | 'audio'> {
  // Default: online (für Google News und Fallback)
  let outletType: 'print' | 'online' | 'broadcast' | 'audio' = 'online';

  // Prüfe erste Source (Primary Source)
  const primarySource = suggestion.sources[0];

  if (!primarySource) {
    console.warn('⚠️ No source found in suggestion, using fallback outletType: online');
    return outletType;
  }

  // Google News → immer online
  if (primarySource.type === 'google_news') {
    console.log(`✅ Google News source detected, using outletType: online`);
    return 'online';
  }

  // RSS Feed → Publication laden und Type ermitteln
  if (primarySource.type === 'rss_feed' && primarySource.publicationId) {
    try {
      const { publicationService } = await import('./library-service');
      const publication = await publicationService.getById(
        primarySource.publicationId,
        organizationId
      );

      if (publication) {
        // Verwende existing mapping function
        const { mapPublicationTypeToMonitoring } = await import('../utils/publication-matcher');
        outletType = mapPublicationTypeToMonitoring(publication.type, publication.format);

        console.log(
          `✅ Detected outletType '${outletType}' for Publication '${publication.title}' ` +
          `(Type: ${publication.type}, Format: ${publication.format})`
        );
      } else {
        console.warn(
          `⚠️ Publication ${primarySource.publicationId} not found, using fallback outletType: online`
        );
      }
    } catch (error) {
      console.error('❌ Error detecting outletType from Publication:', error);
      console.warn('⚠️ Using fallback outletType: online');
      // Fallback: online
    }
  } else if (primarySource.type === 'rss_feed' && !primarySource.publicationId) {
    console.warn('⚠️ RSS Feed source without publicationId, using fallback outletType: online');
  }

  return outletType;
}
```

---

### **Angepasste confirmSuggestion()**

```typescript
async confirmSuggestion(
  suggestionId: string,
  context: {
    userId: string;
    organizationId: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }
): Promise<string> {
  const suggestion = await this.getById(suggestionId);

  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion already processed');
  }

  // Lade Kampagne für projectId
  const { prService } = await import('./pr-service');
  const campaign = await prService.getById(suggestion.campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // ✅ NEU: Ermittle outletType intelligent
  const outletType = await this.detectOutletType(suggestion, context.organizationId);

  // Erstelle Clipping aus Suggestion
  const clippingData: Record<string, any> = {
    organizationId: suggestion.organizationId,
    campaignId: suggestion.campaignId,
    projectId: campaign.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0]?.foundAt || Timestamp.now(),
    outletName: suggestion.sources[0]?.sourceName || 'Unbekannt',
    outletType,  // ✅ Dynamisch ermittelt
    sentiment: context.sentiment || 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: suggestion.createdAt,
    createdBy: context.userId,
    verifiedBy: context.userId,
    verifiedAt: Timestamp.now()
  };

  // Nur definierte optionale Felder hinzufügen (Firestore akzeptiert kein undefined)
  if (suggestion.articleExcerpt) {
    clippingData.excerpt = suggestion.articleExcerpt;
  }
  if (suggestion.articleImage) {
    clippingData.imageUrl = suggestion.articleImage;
  }

  const clippingId = await clippingService.create(
    clippingData,
    context
  );

  // Update Suggestion Status
  await updateDoc(doc(db, this.collectionName, suggestionId), {
    status: 'confirmed',
    clippingId,
    reviewedBy: context.userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log(
    `✅ Suggestion ${suggestionId} confirmed and clipping ${clippingId} created ` +
    `(outletType: ${outletType})`
  );

  return clippingId;
}
```

---

**Erstellt von:** Claude
**Review:** Ausstehend
**Freigabe:** Ausstehend
