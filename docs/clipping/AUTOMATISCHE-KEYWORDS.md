# Automatischer Such-Algorithmus - Keyword-Extraktion

**Datum:** 25.11.2025
**Status:** Konzept (überarbeitet)

---

## Zielsetzung

Entwicklung eines automatischen Such-Algorithmus, der **ohne manuelle Keyword-Eingabe** auskommt.

**Kernprinzip:** Nur Firmennamen sind zuverlässig genug für automatisches Matching.

---

## Problem mit dem aktuellen System

```typescript
// Aktuell: Keywords werden manuell eingegeben
const keywords = campaign.monitoringConfig?.keywords || [];

// Probleme:
// 1. Wird oft vergessen
// 2. Inkonsistente Eingaben
// 3. Score-basierte Auto-Confirm führt zu False Positives
```

---

## Einzige zuverlässige Datenquelle: Company (CRM)

### Verfügbare Felder

```typescript
// Aus src/types/crm-enhanced.ts
interface CompanyEnhanced {
  name: string;           // "TechVision GmbH" - Anzeigename (PFLICHT)
  officialName: string;   // "TechVision Solutions GmbH" - Handelsregister
  tradingName?: string;   // "TechVision" - Handelsname/DBA
  legalForm?: string;     // "GmbH" - Zur Bereinigung
}
```

### Warum nur Firmennamen?

| Datenquelle | Zuverlässigkeit | Problem |
|-------------|-----------------|---------|
| Firmenname | **Hoch** | Erscheint fast immer in Artikeln |
| Projekt-Titel | Niedrig | Interner Name, erscheint nie in Presse |
| Kampagnen-Titel | Niedrig | Interner Name, erscheint nie in Presse |
| SEO-Keywords | Mittel | Gut als Zusatz, nicht als Hauptkriterium |
| Branche | Sehr niedrig | Zu generisch, viele False Positives |

---

## Konzept: Keyword-Extraktion

### Generierte Keywords aus Company

```
Eingabe:
  company.name = "TechVision GmbH"
  company.officialName = "TechVision Solutions GmbH"
  company.tradingName = "TechVision"

Generierte Keywords:
  1. "TechVision GmbH"           (name - exakt)
  2. "TechVision"                (ohne Rechtsform)
  3. "TechVision Solutions GmbH" (officialName)
  4. "TechVision Solutions"      (officialName ohne Rechtsform)
```

### Rechtsformen die entfernt werden

```
GmbH, AG, KG, OHG, GbR, UG, e.V., eG,
Ltd., Inc., LLC, Corp., SE, S.A., B.V., PLC
```

---

## Neue Auto-Confirm Logik

### Entscheidungsbaum

```
Artikel gefunden
      │
      ▼
┌─────────────────────────┐
│ Enthält Firmenname?     │
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │             │
    NEIN          JA
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────────────┐
│ SKIP    │  │ Firmenname im Titel?│
│ (kein   │  └──────────┬──────────┘
│ Match)  │             │
└─────────┘      ┌──────┴──────┐
                 │             │
                JA           NEIN
                 │             │
                 ▼             ▼
          ┌───────────┐  ┌─────────────────────┐
          │ AUTO-     │  │ SEO-Keywords        │
          │ CONFIRM   │  │ Score >= 70?        │
          └───────────┘  └──────────┬──────────┘
                                    │
                             ┌──────┴──────┐
                             │             │
                            JA           NEIN
                             │             │
                             ▼             ▼
                      ┌───────────┐  ┌───────────┐
                      │ AUTO-     │  │ AUTO-     │
                      │ CONFIRM   │  │ FUNDE     │
                      └───────────┘  │ (manuell) │
                                     └───────────┘
```

### Regeln

| Bedingung | Ergebnis |
|-----------|----------|
| Kein Firmenname im Artikel | SKIP (kein Treffer) |
| Firmenname im **Titel** | AUTO-CONFIRM |
| Firmenname im Content + SEO-Score >= 70% | AUTO-CONFIRM |
| Firmenname im Content + SEO-Score < 70% | AUTO-FUNDE (manuell) |
| Firmenname im Content, keine SEO-Keywords | AUTO-FUNDE (manuell) |

---

## Beispiele

### Beispiel 1: Auto-Confirm (Titel-Match)

```
Company: "TechVision GmbH"

Artikel:
  Titel: "TechVision stellt neues Smart Home System vor"
  Content: "Das Unternehmen präsentierte heute..."

→ Firmenname "TechVision" im TITEL
→ AUTO-CONFIRM
```

### Beispiel 2: Auto-Confirm (Content + SEO)

```
Company: "TechVision GmbH"
SEO-Keywords: ["Smart Home", "Hub", "IoT"]

Artikel:
  Titel: "Neues Smart Home Hub revolutioniert den Markt"
  Content: "TechVision hat heute sein neues Smart Home Hub vorgestellt..."

→ Firmenname "TechVision" im Content
→ SEO-Match: "Smart Home" (Titel) + "Hub" (Titel) = 100%
→ AUTO-CONFIRM
```

### Beispiel 3: Auto-Funde (nur Content)

```
Company: "TechVision GmbH"
SEO-Keywords: ["Smart Home", "Hub"]

Artikel:
  Titel: "Branchennews der Woche"
  Content: "...unter anderem berichtete TechVision von neuen Entwicklungen..."

→ Firmenname "TechVision" im Content
→ SEO-Match: Kein Match im Titel/Content
→ AUTO-FUNDE (manuell prüfen)
```

### Beispiel 4: Skip (kein Match)

```
Company: "TechVision GmbH"

Artikel:
  Titel: "Smart Home Markt wächst weiter"
  Content: "Der Markt für Smart Home Produkte..."

→ Kein Firmenname gefunden
→ SKIP
```

---

## Vorteile gegenüber aktuellem System

| Aspekt | Aktuell | Neu |
|--------|---------|-----|
| Setup | Manuell Keywords eingeben | Automatisch aus CRM |
| Vergessen möglich | Ja | Nein |
| False Positives | Hoch (nur Score-basiert) | Niedrig (Firmenname Pflicht) |
| Qualität Auto-Confirms | Variabel | Hoch |
| Manueller Aufwand | Wenig (aber Fehler) | Mehr (aber korrekt) |

---

## Zusammenfassung

1. **Keywords = Firmennamen** (aus Company CRM)
2. **Auto-Confirm nur bei:**
   - Firmenname im Titel, ODER
   - Firmenname im Content + hoher SEO-Score
3. **Alles andere → Auto-Funde** zur manuellen Prüfung

---

*Erstellt am 25.11.2025*
*Überarbeitet am 25.11.2025 - Fokus auf Firmennamen als einzige zuverlässige Quelle*
