# Ton-Änderung Test-Bericht
**Datum:** 08.11.2025
**Tests:** 12 (4 Töne × 3 Szenarien)
**Modell:** gemini-2.5-flash-lite

---

## 📊 Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Gesamt Tests** | 12 |
| **Erfolgreich** | 12 (100%) |
| **Fehlgeschlagen** | 0 (0%) |
| **Durchschnittliche Dauer** | 1571ms |
| **Durchschnittlicher Ton-Score** | **63%** |

---

## 🎯 Ton-Spezifische Ergebnisse

### 1. **FORMAL** - 72% Avg Score ⭐⭐⭐
✅ **BESTE PERFORMANCE**

| Test | Score | Stärken | Schwächen |
|------|-------|---------|-----------|
| B2B Produktlaunch | 75% | ✅ präsentiert, Unternehmen, Lösung, Sie | ❌ "du", "ihr" gefunden (sollte nicht) |
| Event-Ankündigung | 55% | ✅ Veranstaltung | ❌ Fehlt: verkündet, präsentiert, Teilnehmer |
| Unternehmens-Meilenstein | **85%** | ✅✅✅ Das Unternehmen, verkündet, erreicht | ❌ Fehlt: Vorstandsvorsitzender |

**Beobachtungen:**
- ✅ Formale Sprache funktioniert gut
- ✅ Umgangssprache wird vermieden
- ⚠️ Vereinzelt "du/ihr" statt "Sie" (B2B Product: 2/6 Verstöße)
- ⚠️ Vollständige Titel fehlen teilweise

---

### 2. **MODERN** - 65% Avg Score ⭐⭐⭐
✅ **GUT**

| Test | Score | Stärken | Schwächen |
|------|-------|---------|-----------|
| B2B Produktlaunch | 76% | ✅ launcht, KI-gestützt, smart | ❌ Fehlt: Platform, digital |
| Event-Ankündigung | 64% | ✅ startet, digital | ❌ Fehlt: launcht, Event, Next-Level |
| Unternehmens-Meilenstein | 55% | ✅ Meilenstein | ❌ Fehlt: knackt, Next-Level, transformiert |

**Beobachtungen:**
- ✅ Moderne Begriffe wie "launcht", "smart" werden verwendet
- ✅ Altmodische Sprache wird vermieden
- ⚠️ "Next-Level" fehlt durchgängig (0/3)
- ⚠️ "Platform" wird nicht konsequent verwendet

---

### 3. **TECHNICAL** - 63% Avg Score ⭐⭐⭐
✅ **BEFRIEDIGEND**

| Test | Score | Stärken | Schwächen |
|------|-------|---------|-----------|
| B2B Produktlaunch | 70% | ✅ Architektur, ms, Latenz | ❌ Fehlt: API, Performance, Backend |
| Event-Ankündigung | 55% | ✅ Architektur | ❌ Fehlt: Protokoll, Spezifikation, Implementierung |
| Unternehmens-Meilenstein | 64% | ✅ Reichweite, Spezifikation | ❌ Fehlt: kWh, Ladezeit, Effizienz |

**Beobachtungen:**
- ⚠️ Technische Begriffe nur teilweise vorhanden
- ✅ Marketing-Sprache wird vermieden
- ❌ Spezifische Tech-Terms wie "API", "kWh", "Protokoll" fehlen häufig
- ⚠️ Quote enthält nur 1x Kubernetes-Erwähnung (B2B Product)

---

### 4. **STARTUP** - 45% Avg Score ⭐
❌ **SCHWÄCHSTE PERFORMANCE - KRITISCH**

| Test | Score | Stärken | Schwächen |
|------|-------|---------|-----------|
| B2B Produktlaunch | **40%** | ✅ KEINE mustContain-Begriffe! | ❌ 0/6: skaliert, Growth, YoY, raised, ARR, User |
| Event-Ankündigung | **40%** | ✅ KEINE mustContain-Begriffe! | ❌ 0/5: Funding, Investor, Networking, Pitch, Scale |
| Unternehmens-Meilenstein | 55% | ✅ Meilenstein (1/4) | ❌ 0/3: skaliert, 25% YoY Growth, expandiert |

**Beobachtungen:**
- ❌❌❌ **KRITISCH**: Startup-Vokabular fehlt fast vollständig!
- ❌ Keine Growth-Metriken ("300% YoY", "ARR", "MRR")
- ❌ Keine Funding-Begriffe ("raised €XM Series A")
- ❌ Keine Startup-Action-Verben ("skaliert", "expandiert", "disrupted")
- ⚠️ Nur 1 Zitat erwähnt "disrupten" (Event-Ankündigung)

---

## 🔍 Detaillierte Analyse

### Ton-Konsistenz über Szenarien hinweg

| Ton | B2B Product | Event | Milestone | Konsistenz |
|-----|-------------|-------|-----------|------------|
| **Formal** | 75% | 55% | **85%** | ⚠️ Variabel (30% Spread) |
| **Modern** | **76%** | 64% | 55% | ⚠️ Variabel (21% Spread) |
| **Technical** | 70% | 55% | 64% | ⚠️ Variabel (15% Spread) |
| **Startup** | 40% | 40% | 55% | ✅ Konsistent schlecht |

**Erkenntnis:** Formal und Modern haben inkonsistente Performance je nach Szenario.

---

### Häufigste Probleme

#### ❌ **Problem 1: Startup-Ton komplett ineffektiv**
- **Schweregrad:** KRITISCH
- **Betroffene Tests:** 3/3 Startup-Tests
- **Symptom:** Startup-spezifisches Vokabular fehlt nahezu vollständig
- **Beispiel:** B2B Product Startup: 0/6 MUSS-Begriffe gefunden

#### ⚠️ **Problem 2: Formaler Ton verwendet "du/ihr"**
- **Schweregrad:** MITTEL
- **Betroffene Tests:** 1/3 Formal-Tests
- **Symptom:** B2B Product Formal enthält "du" und "ihr" (sollte NUR "Sie")
- **Quote-Analyse:** Lead-Absatz enthält "für deutsche KMU zur Automatisierung **ihrer**"

#### ⚠️ **Problem 3: Technical-Ton fehlen konkrete Specs**
- **Schweregrad:** MITTEL
- **Betroffene Tests:** 3/3 Technical-Tests
- **Symptom:** Nur 3/6 technische MUSS-Begriffe im Durchschnitt
- **Beispiel:** Event-Announcement nur 1/4 (Architektur), fehlt: Protokoll, Spezifikation, Implementierung

#### ⚠️ **Problem 4: Modern-Ton fehlt "Next-Level"**
- **Schweregrad:** NIEDRIG
- **Betroffene Tests:** 3/3 Modern-Tests
- **Symptom:** "Next-Level" wird in KEINEM Modern-Test verwendet
- **Quote verwendet:** "Next-Level Insights" in B2B Product (aber im Quote, nicht Lead/Body)

---

## 📈 Performance-Metriken

### Generierungsgeschwindigkeit

| Ton | Avg Duration | Min | Max |
|-----|--------------|-----|-----|
| **Formal** | 1741ms | 1564ms | 2000ms |
| **Modern** | 1450ms | 1165ms | 1753ms |
| **Technical** | 1568ms | 1434ms | 1706ms |
| **Startup** | 1540ms | 1117ms | 1879ms |
| **GESAMT** | **1571ms** | 1117ms | 2000ms |

✅ Alle Tests unter 2 Sekunden - Performance gut!

---

### Struktur-Qualität (alle Tests)

| Metrik | Ergebnis |
|--------|----------|
| **Headline-Länge** | ✅ 40-75 Zeichen (12/12) |
| **Lead-Länge** | ✅ 80-200 Zeichen (12/12) |
| **Body-Paragraphs** | ✅ 2-4 Absätze (12/12) |
| **Hashtags** | ✅ 2-3 Tags (12/12) |
| **Quote vorhanden** | ✅ Ja (12/12) |
| **CTA vorhanden** | ✅ Ja (12/12) |
| **Social-Optimized** | ✅ Ja (12/12) |

✅ **Strukturelle Anforderungen: 100% erfüllt!**

---

## 💡 Beispiel-Outputs

### ✅ **BEST PRACTICE - Formal (85% Score)**
**Test:** Unternehmens-Meilenstein Formal

**Headline:**
> "AutoTech Deutschland erreicht Produktionsmeilenstein von 100.000 E-Fahrzeugen"

**Lead:**
> "AutoTech Deutschland **verkündet** die Fertigung des 100.000sten Elektrofahrzeugs und etabliert damit einen neuen Meilenstein in der nachhaltigen Mobilität."

**Body Auszug:**
> "**Das Unternehmen**, AutoTech Deutschland, hat heute die Produktion seines 100.000sten vollelektrischen Fahrzeugs gefeiert. Diese Leistung markiert eine signifikante Steigerung von 25 Prozent..."

✅ Perfekt: "Das Unternehmen", "verkündet", "erreicht"
✅ Keine Umgangssprache
⚠️ Fehlt nur: "Vorstandsvorsitzender" im Zitat

---

### ❌ **WORST CASE - Startup (40% Score)**
**Test:** B2B Product Startup

**Headline:**
> "TechVision launcht KI-Analytics-Plattform für KMU ab 2025"

**Lead:**
> "TechVision lanciert DataSense Pro: KI-gestützte Analytics steigern KMU-Effizienz um 40%."

**Probleme:**
- ❌ KEINE Startup-Begriffe: Kein "raised", "ARR", "YoY Growth", "skaliert", "User"
- ❌ KEINE Growth-Metriken (sollte sein: "300% YoY", "10.000 User in 3 Monaten")
- ❌ Klingt wie Modern/Professional, NICHT wie Startup
- ❌ Zitat ist generisch: "Wir ermöglichen KMU..." statt "Unsere Mission: 1M KMU digitalisieren. Mit €5M Funding skalieren wir..."

---

## 🎯 Ton-Charakteristik-Bewertung

### Wie gut matcht der Output die erwartete Tonalität?

| Ton | Erwartung | Realität | Match |
|-----|-----------|----------|-------|
| **Formal** | Konservativ, offiziell, "Sie", Vollständige Titel | Meist korrekt, selten "du/ihr" | **75%** ⭐⭐⭐ |
| **Modern** | Zeitgemäß, "launcht", kurze Sätze, "Next-Level" | Korrekt aber "Next-Level" fehlt | **65%** ⭐⭐⭐ |
| **Technical** | Specs, Metriken, "API", "kWh", Architekturen | Teilweise, viele Tech-Begriffe fehlen | **63%** ⭐⭐ |
| **Startup** | Growth-Zahlen, "raised €XM", "skaliert", Vision | Fast NICHTS davon vorhanden | **45%** ⭐ |

---

## 📋 Kritische Erkenntnisse

### 1. **Startup-Ton funktioniert NICHT** ❌
Der Startup-Prompt wird vom Modell ignoriert oder nicht verstanden. Output klingt wie "Professional" statt "Startup".

**Hypothese:**
- Base-Prompt überschreibt Startup-Ton trotz "🔥 ÜBERSCHREIBT REGELN"
- Startup-Vokabular zu speziell (ARR, YoY, raised) - Modell kennt Kontext nicht
- Prompt zu lang, wichtige Begriffe gehen verloren

---

### 2. **Formal-Ton hat "Sie vs. du/ihr" Konflikt** ⚠️
Trotz Prompt "NIEMALS du/ihr" erscheint gelegentlich "ihr/ihre" im Text.

**Beispiel:** "für deutsche KMU zur Automatisierung **ihrer** Prozesse"

**Hypothese:**
- Possessivpronomen "ihr" (gehörend zu KMU) vs. Anrede "ihr" wird nicht unterschieden
- Prompt sollte spezifizieren: "NIEMALS Anrede du/ihr (Possessiv erlaubt)"

---

### 3. **Technical-Ton zu generisch** ⚠️
Technische Begriffe werden nur teilweise verwendet, nicht durchgängig.

**Beobachtung:**
- 1 Test erwähnt "Kubernetes, Microservices, Latenz <60ms" (B2B Product)
- 2 Tests fehlen konkrete Specs (Event, Milestone)

**Hypothese:**
- Technical-Prompt sollte ZWINGEND Specs fordern
- Beispiele im Prompt müssen drastischer sein

---

### 4. **Modern-Ton vergisst "Next-Level"** ⚠️
"Next-Level" kommt in KEINEM Lead/Body vor, nur 1x in einem Quote.

**Hypothese:**
- "Next-Level" zu werblich, Modell filtert es raus
- Prompt sollte explizit sagen: "Next-Level ist ERLAUBT und erwünscht"

---

## ✅ Was funktioniert gut

1. ✅ **Strukturelle Qualität:** 100% aller Tests erfüllen PR-Struktur (Headline, Lead, Body, Quote, CTA, Hashtags)
2. ✅ **Formal-Ton:** Beste Performance (72%), vermeidet Umgangssprache sehr gut
3. ✅ **Performance:** Durchschnittlich 1.5s - schnell genug
4. ✅ **Verbotene Begriffe:** Werden in allen Tönen korrekt vermieden (mega, krass, cool, etc.)
5. ✅ **Quote-Attribution:** 12/12 Tests haben Zitate (teilweise ohne Person/Role, aber Text vorhanden)

---

## Nächste Schritte

Siehe **VERBESSERUNGSVORSCHLÄGE** im nächsten Abschnitt.
