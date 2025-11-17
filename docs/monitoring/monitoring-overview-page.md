# Monitoring Overview Page - Dokumentation

**Seite:** PR-Monitoring & Versandhistorie
**URL:** `/dashboard/analytics/monitoring`
**Datei:** `src/app/dashboard/analytics/monitoring/page.tsx`
**LOC:** 249 Zeilen
**Status:** ✅ PRODUKTIV - Kein Refactoring erforderlich
**Letzte Prüfung:** 17. November 2025

---

## 📋 Übersicht

Die Monitoring Overview Page zeigt eine **Liste aller versendeten PR-Kampagnen** mit Versand-Statistiken und Veröffentlichungen (Clippings).

### Hauptfunktionen

1. **Kampagnen-Liste**
   - Zeigt alle PR-Kampagnen mit mindestens einem Versand (Send)
   - Sortiert nach Versanddatum (neueste zuerst)
   - Klick auf Kampagne → Navigation zur Detail-Seite

2. **Statistiken pro Kampagne**
   - **Versand-Stats:** Total, Delivered, Opened, Clicked, Bounced
   - **Clippings:** Anzahl der Veröffentlichungen
   - Live-Berechnung aus Firestore-Daten

3. **Filter-Funktionen**
   - **Suche:** Kampagnen-Name durchsuchen
   - **Projekt-Filter:** Nach Projekt filtern
   - Filter-Logik in `filterCampaigns()` (Zeile 91-106)

---

## 🏗️ Architektur

### Daten-Flow

```
1. Load: prService.getAll() → Alle PR-Kampagnen
2. Parallel für jede Kampagne:
   - emailCampaignService.getSends() → Versand-Daten
   - clippingService.getByCampaignId() → Veröffentlichungen
3. Filter: Nur Kampagnen mit Sends (= versendet)
4. Stats: Inline-Berechnung (Zeile 65-72)
5. State: setCampaigns() → Render
```

### Services verwendet

| Service | Zweck | Import |
|---------|-------|--------|
| `prService` | PR-Kampagnen laden | `@/lib/firebase/pr-service` |
| `emailCampaignService` | Versand-Daten (Sends) | `@/lib/firebase/email-campaign-service` |
| `clippingService` | Veröffentlichungen | `@/lib/firebase/clipping-service` |

### State Management

**Lokaler State (useState):**
- `campaigns` - Alle Kampagnen mit Stats
- `filteredCampaigns` - Nach Filter gefiltert
- `searchTerm` - Suchbegriff
- `projectFilter` - Ausgewähltes Projekt
- `loading` - Loading State

**Kein globaler State** - Alles lokal, da reine Read-Only-Liste

---

## 💡 Warum kein Refactoring?

### Entscheidung: ✅ AS-IS BELASSEN

**Begründung:**
1. **Einfache Funktionalität**
   - Reine Read-Only-Liste ohne Mutations
   - Keine komplexen Berechnungen
   - Keine komplexe UI (keine Modals, Charts, etc.)

2. **Code-Qualität bereits gut**
   - Klar strukturiert und lesbar
   - Logische Trennung (Load → Filter → Render)
   - Keine offensichtlichen Performance-Probleme

3. **Refactoring-Wert niedrig**
   - React Query würde hauptsächlich Caching bringen
   - Stats-Berechnung ist trivial (filter + count)
   - Keine Code-Duplikation
   - Geschätzte Code-Reduktion: -28% (60 Zeilen) → Aufwand lohnt nicht

4. **"Don't refactor for the sake of refactoring"**
   - Funktioniert einwandfrei
   - Keine User-Beschwerden
   - Bessere Prioritäten: Detail-Page & Tab-Module

### Alternative Überlegungen (falls in Zukunft nötig)

**React Query würde bringen:**
- ✅ Automatisches Caching
- ✅ Background Refetch
- ✅ Loading/Error States standardisiert

**Aber:**
- ❌ Overhead für simple Liste
- ❌ Drei separate Queries (campaigns, sends, clippings) = komplex
- ❌ Stats-Berechnung trotzdem client-side nötig

**Fazit:** Aufwand > Nutzen

---

## 🔧 Technische Details

### Stats-Berechnung (Zeile 65-72)

```typescript
const stats = {
  total: sends.length,
  delivered: sends.filter(s =>
    s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
  ).length,
  opened: sends.filter(s =>
    s.status === 'opened' || s.status === 'clicked'
  ).length,
  clicked: sends.filter(s =>
    s.status === 'clicked'
  ).length,
  bounced: sends.filter(s =>
    s.status === 'bounced'
  ).length,
  clippings: clippings.length
};
```

**Status-Hierarchie:**
- `clicked` impliziert `opened` impliziert `delivered`
- Bounced ist separater Fehler-Status

### Filter-Logik (Zeile 91-106)

```typescript
const filterCampaigns = () => {
  let filtered = campaigns;

  // Search Filter
  if (searchTerm) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Project Filter
  if (projectFilter && projectFilter !== 'all') {
    filtered = filtered.filter(c => c.projectId === projectFilter);
  }

  setFilteredCampaigns(filtered);
};
```

**Performance:**
- Filter läuft auf jedem State-Change (searchTerm, projectFilter)
- Bei <1000 Kampagnen kein Problem
- Falls Performance-Problem: useMemo verwenden

### Navigation zur Detail-Seite

```typescript
onClick={() => router.push(`/dashboard/analytics/monitoring/${campaign.id}`)}
```

**Detail-Seite:**
- `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`
- Tab-Routing via `?tab=dashboard` Parameter
- Zeigt: Analytics, Performance, Recipients, Clippings, Suggestions

---

## 🧪 Testing

**Aktueller Status:** Keine Tests vorhanden

**Empfehlung:**
- ⏸️ Tests OPTIONAL
- Seite ist simpel genug ohne Tests
- Falls gewünscht: Basic Integration Test (Load + Filter)

**Potenzielle Test-Szenarien (falls implementiert):**
1. ✅ Kampagnen werden geladen
2. ✅ Nur versendete Kampagnen (mit Sends) werden angezeigt
3. ✅ Stats werden korrekt berechnet
4. ✅ Search-Filter funktioniert
5. ✅ Projekt-Filter funktioniert
6. ✅ Navigation zur Detail-Seite

**Aufwand:** ~1-2 Stunden für Basic Coverage

---

## 🔗 Related Pages

| Page | Pfad | Beziehung |
|------|------|-----------|
| **Monitoring Detail** | `/dashboard/analytics/monitoring/[campaignId]` | Navigation von Overview → Detail |
| **Campaign Detail** | `/dashboard/campaigns/[campaignId]` | Andere Ansicht der gleichen Kampagne |
| **Project Monitoring** | `/dashboard/projects/[projectId]` Tab "Monitoring" | Projekt-spezifisches Monitoring |

---

## 📝 Maintenance Notes

### Wenn Änderungen nötig werden:

**Performance-Optimierung (falls nötig):**
```typescript
// useMemo für filteredCampaigns
const filteredCampaigns = useMemo(() => {
  let filtered = campaigns;
  // ... Filter-Logik
  return filtered;
}, [campaigns, searchTerm, projectFilter]);

// useCallback für loadCampaigns
const loadCampaigns = useCallback(async () => {
  // ... Load-Logik
}, [currentOrganization?.id]);
```

**React Query Migration (falls gewünscht):**
```typescript
// Custom Hook erstellen
const { data: campaigns, isLoading } = useMonitoringCampaigns(
  currentOrganization?.id
);
```

### Code-Smell Warnsignale:

⚠️ **Refactoring erwägen, wenn:**
- Seite >400 Zeilen
- Mutations hinzukommen (Erstellen/Löschen)
- Komplexe Charts/Visualisierungen
- Performance-Probleme bei >1000 Kampagnen
- Stats-Berechnung deutlich komplexer

---

## 🎯 Entscheidungs-Log

| Datum | Entscheidung | Begründung |
|-------|--------------|------------|
| 2025-11-17 | ✅ Kein Refactoring | Einfache Read-Only-Liste, Aufwand > Nutzen |
| 2025-11-17 | 📝 Dokumentation statt Code | "Don't refactor for the sake of refactoring" |
| 2025-11-17 | ⏸️ Tests optional | Seite simpel genug, keine kritische Business-Logik |

---

**Erstellt:** 17. November 2025
**Maintainer:** CeleroPress Team
**Review:** Empfohlen alle 6 Monate oder bei größeren Änderungen
