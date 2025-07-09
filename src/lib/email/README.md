# PR-Kampagnen Versand - Korrekturplan

## Übersicht

Dieses Dokument beschreibt die notwendigen Korrekturen am überarbeiteten PR-Kampagnen-Versandprozess. Die Fehler sind nach Priorität und Abhängigkeiten geordnet.

## Status der Implementierung

✅ **Abgeschlossen:**
- Grundstruktur des 3-Stufen-Prozesses
- Komponenten-Architektur
- Type-Definitionen
- Basis-Navigation

❌ **Fehlerhaft/Unvollständig:**
- Backend-Integration (Firebase-Fehler)
- UI/UX-Konsistenz
- Datenfluss zwischen Steps
- E-Mail-Formatierung
- Anhang-Verwaltung

## Priorisierte Fehlerliste

### Phase 1: Kritische Backend-Fehler (Priorität: HOCH)

#### 1.1 Firebase Collection Error (HTTP 500)
**Problem:** `authenticatedFetch` Aufrufe für E-Mail-Entwürfe schlagen fehl
```
ApiError: Expected first argument to collection() to be a CollectionReference, 
a DocumentReference or FirebaseFirestore
```

**Betroffene Dateien:**
- `src/lib/api/api-client.ts`
- `src/app/api/email/drafts/[id]/route.ts`
- `src/lib/email/email-composer-service.ts`

**Lösungsansatz:**
1. Firebase-Client-Initialisierung in API-Routes prüfen
2. Korrekte Import-Statements sicherstellen
3. Collection-Referenzen validieren

**Geschätzter Aufwand:** 2-3 Stunden

### Phase 2: UI/UX Inkonsistenzen (Priorität: MITTEL)

#### 2.1 Design-Angleichung an KI-Assistent
**Referenz:** `src/components/pr/ai/StructuredGenerationModal.tsx`

**Zu korrigieren:**
- Fortschrittsbalken-Design
- Modal-Header-Struktur
- Schritt-Navigation
- Allgemeines Spacing/Padding

**Betroffene Dateien:**
- `src/components/pr/email/EmailComposer.tsx`
- `src/components/pr/email/StepIndicator.tsx`

#### 2.2 Doppelter Close-Button
**Problem:** Zwei "X"-Buttons im Modal-Header

**Lösung:** Prüfung der Dialog-Komponente und Entfernung redundanter Buttons

#### 2.3 InfoTooltip Integration
**Aufgabe:** Migration aller Hinweistexte in InfoTooltip-Komponente

**Betroffene Steps:**
- Step 1: "Verfassen Sie Ihre E-Mail mit persönlicher Ansprache..."
- Step 2: "Wählen Sie die Empfänger aus Ihren Verteilerlisten..."
- Step 3: "Überprüfen Sie Ihre E-Mail und senden Sie sie an X Empfänger"

**Geschätzter Aufwand:** 2 Stunden

### Phase 3: Funktionale Fehler Step 1 (Priorität: HOCH)

#### 3.1 Variablen-Modal Copy-Funktion
**Problem:** Kopieren von Variablen funktioniert nicht

**Betroffene Datei:** `src/components/pr/email/VariablesModal.tsx`

**Lösungsansatz:**
- Navigator.clipboard API-Implementierung prüfen
- Fallback für ältere Browser
- User-Feedback bei erfolgreichem Kopieren

**Geschätzter Aufwand:** 1 Stunde

### Phase 4: Funktionale Fehler Step 2 (Priorität: MITTEL)

#### 4.1 Vorauswahl der Verteilerlisten
**Problem:** Kampagnen-Verteilerlisten nicht vorausgewählt

**Lösung:**
```typescript
// In Step2Details.tsx
useEffect(() => {
  if (campaign.distributionListIds && recipients.listIds.length === 0) {
    onRecipientsChange({
      listIds: campaign.distributionListIds,
      listNames: campaign.distributionListNames
    });
  }
}, [campaign]);
```

#### 4.2 Validierungs-Timing
**Problem:** Fehler erscheinen sofort beim Laden

**Lösung:** Validierung nur bei User-Interaktion triggern

**Geschätzter Aufwand:** 2 Stunden

### Phase 5: Funktionale Fehler Step 3 (Priorität: HOCH)

#### 5.1 E-Mail-Formatierung
**Problem:** Zeilenumbrüche gehen verloren

**Betroffene Bereiche:**
- TipTap Editor Output
- HTML-zu-Email Konvertierung
- Preview-Rendering

**Lösungsansatz:**
- HTML-Struktur preservation
- Whitespace-Handling
- CSS-Inline-Styles für E-Mail-Kompatibilität

#### 5.2 Anhang-Informationen
**Problem:** Keine Anzeige der Anhänge

**Lösung:** Anhang-Liste in Step 3 integrieren

#### 5.3 Erfolgs-Meldungen
**Problem:** Doppelte/inkonsistente Erfolgs-Meldungen

**Lösung:** 
- Native Browser-Alerts entfernen
- Nur Catalyst Toast-Notifications verwenden

**Geschätzter Aufwand:** 3 Stunden

### Phase 6: E-Mail-Output Korrekturen (Priorität: HOCH)

#### 6.1 Test-E-Mail Probleme
**Fehler:**
1. Keine Anhänge
2. Platzhalter statt echter Pressemitteilung

**Betroffene Dateien:**
- `src/app/api/email/test/route.ts`
- `src/lib/email/email-service.ts`

#### 6.2 Produktiv-E-Mail Probleme
**Fehler:**
1. Formatierung verloren
2. Falsches Branding bei Anhängen

**Wichtig:** Branding-Änderung NUR für Kampagnen-Versand, NICHT für Mediathek-Sharing

**Geschätzter Aufwand:** 4 Stunden

## Implementierungsreihenfolge

### Woche 1: Backend & Kritische Fehler
1. **Tag 1-2:** Firebase Collection Error beheben
2. **Tag 3:** Variablen-Modal Copy-Funktion
3. **Tag 4-5:** E-Mail-Formatierung & Output

### Woche 2: UI/UX & Funktionale Verbesserungen
1. **Tag 1:** Design-Angleichung
2. **Tag 2:** InfoTooltip Migration
3. **Tag 3:** Step 2 Vorauswahl & Validierung
4. **Tag 4:** Step 3 Anhang-Anzeige
5. **Tag 5:** Testing & Bugfixing

## Technische Details

### Firebase-Fix Approach
```typescript
// Korrekte Import-Struktur für API Routes
import { getFirebaseAdmin } from '@/lib/firebase/admin';
const { db } = getFirebaseAdmin();

// NICHT:
import { db } from '@/lib/firebase/client-init';
```

### Formatierungs-Preservation
```typescript
// HTML mit beibehaltener Struktur
const preserveFormatting = (html: string) => {
  return html
    .replace(/<p>/g, '<p style="margin: 0 0 1em 0;">')
    .replace(/<br\s*\/?>/g, '<br/>')
    .replace(/\n/g, '<br/>');
};
```

### Branding-Kontrolle
```typescript
// Conditional Branding basierend auf Kontext
const getBrandingSettings = (context: 'campaign' | 'mediathek') => {
  if (context === 'campaign') {
    return null; // Kein Branding für Kampagnen
  }
  return brandingService.getBrandingSettings(userId);
};
```

## Monitoring & Testing

### Test-Szenarien
1. **Draft Save/Load:** Verschiedene Browser, Netzwerk-Bedingungen
2. **Variablen-Kopieren:** Desktop & Mobile Browser
3. **E-Mail-Formatierung:** Verschiedene E-Mail-Clients
4. **Anhang-Handling:** Große/kleine Dateien, verschiedene Formate

### Metriken
- API Response Times
- Error Rates pro Step
- User Drop-off Rates
- E-Mail Delivery Success Rate

## Risiken & Mitigationen

### Risiko 1: Firebase-Migration
**Problem:** Inkompatibilität zwischen Client/Server Firebase SDKs
**Mitigation:** Klare Trennung von Client/Server Code

### Risiko 2: E-Mail-Client-Kompatibilität
**Problem:** Formatierung in verschiedenen Clients
**Mitigation:** Inline-CSS, Test-Matrix für populäre Clients

### Risiko 3: Performance bei vielen Empfängern
**Problem:** Timeout bei großen Verteilerlisten
**Mitigation:** Batch-Processing, Queue-System

## Dokumentation Updates

Nach Abschluss der Korrekturen:
1. API-Dokumentation aktualisieren
2. Komponenten-Props dokumentieren
3. E-Mail-Template-Struktur dokumentieren
4. Troubleshooting-Guide erstellen

---

*Letztes Update: 09.07.2025*
*Version: 2.0*