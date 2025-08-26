# PR-SEO Scoring System Dokumentation

## Übersicht

Das PR-SEO Scoring System bewertet Pressemitteilungen auf einer Skala von 0-100 Punkten basierend auf verschiedenen SEO- und PR-Kriterien. Das System kombiniert algorithmische Berechnungen mit KI-basierten Analysen für eine umfassende Bewertung.

### Hauptkomponenten

- **PRSEOHeaderBar**: Haupt-Scoring-Komponente für PR-Kampagnen
- **seo-keyword-service**: Service für Keyword-Analyse und Scoring
- **KI-Integration**: OpenAI API für semantische Analysen

## Scoring-Bereiche und Gewichtung

Das System bewertet 6 Hauptbereiche mit unterschiedlichen Gewichtungen:

### 1. Headline Score (25%)
**Gewichtung**: 25% vom Gesamtscore

**Kriterien**:
- **Länge** (40 Punkte): 30-80 Zeichen optimal
- **Keywords** (30 Punkte): Keywords in Headline vorhanden
- **Aktive Verben** (30 Punkte): Verben wie "startet", "lanciert", "präsentiert", "entwickelt"

**100% Anforderungen**:
- Headline zwischen 30-80 Zeichen
- Mindestens ein Keyword enthalten
- Aktive Verben verwenden

### 2. Keywords Score (20%)
**Gewichtung**: 20% vom Gesamtscore

**Kriterien**:
- **Keyword-Dichte** (50%): 0.3-2.5% optimal (flexibler Bereich)
- **KI-Relevanz** (50%): Semantische Relevanz wenn verfügbar
- **Positionierung**: Keywords in Headline und erstem Absatz
- **Verteilung**: Gleichmäßige Verteilung im Text

**Formeln** (Stand: 26.08.2025 - Phase 1.1 implementiert):
```javascript
// Flexiblere Basis-Bewertung nach Dichte
if (avgDensity >= 0.3 && avgDensity <= 2.5) keywordScore += 50; // Optimaler Bereich erweitert
else if (avgDensity >= 0.2 && avgDensity <= 3.0) keywordScore += 35; // Akzeptabler Bereich
else if (avgDensity > 0) keywordScore += 20; // Grundpunkte für alle Keywords

// KI-Relevanz (wenn verfügbar) - unverändert
keywordScore += Math.min(50, (avgRelevance / 100) * 50);
```

**100% Anforderungen** (Stand: Phase 1.1):
- Keyword-Dichte zwischen 0.3-2.5% (erweiterte Toleranz)
- KI-Relevanz > 70% (wenn analysiert)
- Keywords in Headline und erstem Absatz
- Gute Verteilung (mindestens 3 Vorkommen)

### 3. Struktur Score (20%)
**Gewichtung**: 20% vom Gesamtscore

**Kriterien (zielgruppenspezifisch)**:
- **Absatzlänge** (30 Punkte): Zielgruppen-abhängige Schwellenwerte
  - B2B: 150-500 Zeichen
  - B2C: 80-250 Zeichen
  - Verbraucher: 60-200 Zeichen
- **Bullet Points** (20 Punkte): Optional
- **Zwischenüberschriften** (25 Punkte): Optional
- **Lead-Länge** (25 Punkte): 80-250 Zeichen

**100% Anforderungen**:
- Absatzlänge optimal für Zielgruppe
- Bullet Points oder Zwischenüberschriften
- Lead-Absatz 80-250 Zeichen

### 4. Relevance Score (15%)
**Gewichtung**: 15% vom Gesamtscore

**KI-basierte Bewertung**:
- Semantische Relevanz der Keywords
- Kontext-Qualität (natürliche Einbindung)
- Verwandte Begriffe im Text

**100% Anforderungen**:
- KI-Relevanz ≥ 90%
- Hohe Kontext-Qualität ≥ 85%

### 5. Concreteness Score (10%)
**Gewichtung**: 10% vom Gesamtscore

**Kriterien**:
- **Zahlen** (40 Punkte): Mindestens 2 Zahlen im Text
- **Spezifische Daten** (30 Punkte): Konkrete Datumsangaben
- **Firmennamen** (30 Punkte): Unternehmensnamen erkannt

**100% Anforderungen**:
- ≥ 2 Zahlen im Text
- Spezifische Datumsangaben
- Firmennamen/Rechtsformen erwähnt

### 6. Engagement Score (10%)
**Gewichtung**: 10% vom Gesamtscore

**Kriterien**:
- **Zitate** (40 Punkte): Mindestens 1 Zitat (Strg+Shift+Q)
- **Call-to-Action** (35 Punkte): CTA-Texte (Strg+Shift+C)
- **Aktive Sprache** (25 Punkte): Handlungsauffordernde Verben

**100% Anforderungen**:
- Mindestens 1 Zitat
- Call-to-Action vorhanden
- Aktive Handlungsverben

## Berechnungsformeln

### Gesamtscore
```javascript
totalScore = Math.round(
  (headline * 0.25) +
  (keywords * 0.20) +
  (structure * 0.20) +
  (relevance * 0.15) +
  (concreteness * 0.10) +
  (engagement * 0.10)
);
```

### Score-Farbkodierung
- **Grün** (76-100): Sehr gut
- **Gelb** (51-75): Gut
- **Rot** (0-50): Verbesserungsbedürftig
- **Grau** (0 ohne Keywords): Keine Keywords definiert

## KI vs. Algorithmische Bewertungen

### Algorithmische Berechnungen
- **Keyword-Dichte**: Vorkommen / Gesamtwörter * 100
- **Textlänge**: Wörter-/Zeichenanzahl
- **Struktur-Elemente**: HTML-Tag-Erkennung
- **Zahlen/Daten**: Regex-Pattern-Matching
- **Aktive Verben**: Wörterbuch-basiert

### KI-basierte Analysen
**Service**: `/api/ai/generate` (OpenAI Integration)

**KI-Bewertungen**:
- **Semantische Relevanz** (0-100): Wie zentral ist das Keyword?
- **Kontext-Qualität** (0-100): Wie natürlich eingebunden?
- **Zielgruppen-Erkennung**: B2B, B2C, Verbraucher, etc.
- **Tonalität**: Sachlich, Emotional, Verkäuferisch, etc.
- **Verwandte Begriffe**: Thematisch passende Begriffe

**KI-Prompt-Beispiel**:
```
Du bist ein SEO-Analyst. Analysiere das Keyword "Innovation" im PR-Text.
Bewerte:
1. Semantische Relevanz (0-100)
2. Kontext-Qualität (0-100) 
3. Zielgruppe (B2B, B2C, etc.)
4. Tonalität (Sachlich, Emotional, etc.)
5. Verwandte Begriffe (3 Begriffe)
```

## Empfehlungssystem

Das System generiert automatische Verbesserungsvorschläge:

### Algorithmische Empfehlungen
- Keyword-Dichte optimieren
- Headline-Länge anpassen
- Strukturelle Verbesserungen
- Call-to-Action hinzufügen

### KI-basierte Empfehlungen
- Tonalität an Zielgruppe anpassen
- Relevanz durch thematische Verbindungen erhöhen
- Zielgruppen-spezifische Textlängen

## Anforderungen für 100% Score

Um 100/100 Punkte zu erreichen, müssen alle Bereiche optimiert werden:

### Perfekte Pressemitteilung (100 Punkte)

1. **Headline** (25/25):
   - 30-80 Zeichen
   - Keywords enthalten
   - Aktive Verben

2. **Keywords** (20/20):
   - 0.3-2.5% Dichte (flexiblerer Bereich seit Phase 1.1)
   - KI-Relevanz ≥ 70%
   - In Headline + Lead

3. **Struktur** (20/20):
   - Zielgruppen-optimierte Absätze
   - Bullet Points/Überschriften
   - Lead 80-250 Zeichen

4. **Relevanz** (15/15):
   - KI-Relevanz ≥ 90%
   - Hohe Kontext-Qualität

5. **Konkretheit** (10/10):
   - ≥ 2 Zahlen
   - Datumsangaben
   - Firmennamen

6. **Engagement** (10/10):
   - Zitat vorhanden
   - Call-to-Action
   - Aktive Sprache

## Technische Implementation

### Haupt-Dateien
- `C:\Users\skuehne\Desktop\Projekt\skamp\src\components\campaigns\PRSEOHeaderBar.tsx`: Haupt-Scoring-Komponente
- `C:\Users\skuehne\Desktop\Projekt\skamp\src\lib\ai\seo-keyword-service.ts`: Scoring-Service und Algorithmen

### Key Functions
- `calculatePRScore()`: Haupt-Scoring-Funktion
- `calculateBasicMetrics()`: Algorithmische Berechnungen
- `analyzeKeywordWithAI()`: KI-Integration
- `generateRecommendations()`: Empfehlungsgenerierung

## Verbesserungsvorschläge

### 1. Realistischeres Scoring
**Problem**: Aktuell sehr schwer 100% zu erreichen

**Lösungen**:
- Gewichtung zugunsten algorithmischer Faktoren anpassen
- KI-Relevanz als Bonus statt Requirement
- Stufenweise Punktvergabe statt Alles-oder-Nichts

### 2. Zielgruppen-Optimierung
**Problem**: Ein-Größe-passt-allen Ansatz

**Lösungen**:
- Spezifische Scoring-Profile per Zielgruppe
- Adaptive Schwellenwerte
- Branchen-spezifische Keywords

### 3. Performance-Optimierung
**Problem**: KI-Calls bei jeder Änderung

**Lösungen**:
- Intelligenteres Caching
- Batch-Processing für Keywords
- Fallback-Scores ohne KI

### 4. Transparenz
**Problem**: Scoring-Logik nicht immer verständlich

**Lösungen**:
- Detailliertere Score-Aufschlüsselung
- Interaktive Erklärungen
- A/B-Testing verschiedener Algorithmen

## Fazit

Das PR-SEO Scoring System bietet eine umfassende Bewertung von Pressemitteilungen durch die Kombination algorithmischer Präzision mit KI-basierter semantischer Analyse. Während das System technisch ausgefeilt ist, besteht Optimierungspotenzial in der Balance zwischen Genauigkeit und Benutzerfreundlichkeit.