# Verbesserungsvorschläge: Ton-Änderung

**Basierend auf:** 12 Tests (4 Töne × 3 Szenarien)
**Datum:** 08.11.2025
**Durchschnittlicher Score:** 63% (Ziel: 85%+)

---

## 🔴 KRITISCH - Startup-Ton komplett überarbeiten

**Problem:** Startup-Ton Score 45% - schlechteste Performance
- ❌ 0/6 MUSS-Begriffe in B2B Product Test
- ❌ Keine Growth-Metriken ("300% YoY", "ARR €3M")
- ❌ Keine Funding-Begriffe ("raised €8M Series A")
- ❌ Klingt wie "Professional", NICHT wie "Startup"

### Vorschlag 1: Startup-Prompt drastisch verschärfen

**Aktueller Prompt:**
```
ZWINGEND VERWENDEN:
- Dynamische Action-Verben: "skaliert", "disrupted", "launcht", "raised", "wächst", "expandiert"
- Wachstumszahlen prominent: "300% YoY", "10x Growth", "ARR verdoppelt", "Series A €5M"
```

**NEUER Prompt (viel aggressiver):**
```
🚨 STARTUP-TON - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🚨

Du schreibst NICHT für etablierte Unternehmen. Du schreibst für STARTUPS!

⚡ PFLICHT-ELEMENTE (MINDESTENS 4 VON 6 IN LEAD/BODY):
1. Growth-Metrik: "300% YoY Growth", "10x Wachstum", "ARR von €500K auf €3M"
2. Funding: "raised €8M Series A led by Sequoia", "€5M Seed-Runde"
3. User-Zahlen: "50.000 User in 6 Monaten", "10K+ Signups"
4. Traction: "Product-Market-Fit erreicht Q2", "MRR €100K"
5. Action-Verben: "skaliert", "disrupted", "expandiert", "wächst"
6. Vision: "Mission: X democratisieren", "Next Unicorn"

BEISPIEL STARTUP LEAD (RICHTIG):
❌ FALSCH: "TechVision lanciert DataSense Pro ab Januar 2025."
✅ RICHTIG: "**TechVision raised €5M Series A für DataSense Pro – skaliert auf 50.000 User in 6 Monaten mit 400% YoY Growth.**"

BEISPIEL STARTUP BODY (RICHTIG):
❌ FALSCH: "Die Plattform wurde entwickelt um KMU zu unterstützen."
✅ RICHTIG: "TechVision erreichte Product-Market-Fit im Q3 2024. Wuchs von 1.000 auf 50.000 aktive User in nur 6 Monaten. ARR stieg von €500K auf €3M. Series-A-Funding von €5M led by Index Ventures sichert aggressive Europa-Expansion 2025."

BEISPIEL STARTUP ZITAT (RICHTIG):
❌ FALSCH: "Wir freuen uns über diese Entwicklung."
✅ RICHTIG: "Unsere Mission: Datenanalyse für 1 Million KMUs demokratisieren. Mit €5M Series-A-Funding skalieren wir jetzt europaweit – Target: 200.000 User bis Q4 2025", sagt Anna Weber, Co-Founder & CEO.

VERBOTEN:
- ❌ "etabliert", "bewährt", "langjährige Erfahrung"
- ❌ Vorsichtige Sprache ("möglicherweise", "plant", "erwägt")
- ❌ Texte OHNE konkrete Zahlen

💥 WENN DU DIESE REGELN IGNORIERST, IST DER OUTPUT FALSCH! 💥
```

**Implementierung:**
`src/lib/ai/flows/generate-press-release-structured.ts:271-309`

---

### Vorschlag 2: Startup-Prompt an ERSTE Stelle setzen

**Aktuell:**
```typescript
systemPrompt += '\n' + SYSTEM_PROMPTS.base;       // 1. Base
systemPrompt += '\n' + SYSTEM_PROMPTS.scoreRules; // 2. Score
systemPrompt += '\n' + SYSTEM_PROMPTS.rules;      // 3. Rules
if (tone) { systemPrompt += '\n' + SYSTEM_PROMPTS.tones[tone]; } // 4. Tone (ZULETZT!)
```

**NEU (Ton VOR Base!):**
```typescript
// Ton-Prompt ZUERST für maximale Priorität
if (context?.tone && SYSTEM_PROMPTS.tones[context.tone]) {
  systemPrompt += '\n' + SYSTEM_PROMPTS.tones[context.tone]; // 1. TON (ZUERST!)
}

systemPrompt += '\n' + SYSTEM_PROMPTS.base;       // 2. Base
systemPrompt += '\n' + SYSTEM_PROMPTS.scoreRules; // 3. Score
systemPrompt += '\n' + SYSTEM_PROMPTS.rules;      // 4. Rules
```

**Implementierung:**
`src/lib/ai/flows/generate-press-release-structured.ts:264-290`

**Begründung:**
- LLMs priorisieren frühere Instruktionen
- Aktuell wird Ton-Prompt ZULETZT angehängt → wird überschrieben
- Lösung: Ton-Prompt als ERSTES → dominiert über Base-Regeln

---

## 🟡 MITTEL - Formal-Ton: "Sie" vs. "ihr" klären

**Problem:** Formal-Ton verwendet "ihr/ihre" (Possessiv) obwohl Prompt "NIEMALS du/ihr" sagt
- Beispiel: "für deutsche KMU zur Automatisierung **ihrer** Prozesse"

### Vorschlag 3: Possessivpronomen vs. Anrede präzisieren

**Aktueller Prompt:**
```
VERBOTEN:
- ❌ Informelle Anrede ("du", "ihr", "euch")
```

**NEUER Prompt (präziser):**
```
ANREDE-REGELN (SEHR WICHTIG!):
✅ ERLAUBT: "Sie", "Ihnen", "Ihrer" (formelle Anrede)
✅ ERLAUBT: Possessivpronomen 3. Person: "ihrer" (gehörend zu Firma/KMU)
   Beispiel: "KMU nutzen ihre Daten" → KORREKT
   Beispiel: "für Unternehmen und deren Prozesse" → KORREKT

❌ VERBOTEN: Informelle Anrede 2. Person:
   - "du", "dein", "dir"
   - "ihr" als Anrede (aber "ihr/ihre" als Possessiv ist OK!)
   - "euch"

REGEL: Nutze NUR "Sie"-Form zur direkten Ansprache. Possessivpronomen sind erlaubt.

BEISPIEL RICHTIG:
✅ "Unternehmen automatisieren ihre Prozesse" (Possessiv)
✅ "Wir unterstützen Sie bei Ihrer Digitalisierung" (Sie-Form)

BEISPIEL FALSCH:
❌ "Automatisiert eure Prozesse jetzt!" (Anrede)
❌ "Ihr könnt damit..." (Anrede)
```

**Implementierung:**
`src/lib/ai/flows/generate-press-release-structured.ts:122-158`

---

## 🟡 MITTEL - Technical-Ton: Mehr konkrete Specs

**Problem:** Nur 3/6 technische MUSS-Begriffe im Durchschnitt
- Event-Test nur 1/4: "Architektur" vorhanden, fehlt: Protokoll, Spezifikation, Implementierung

### Vorschlag 4: Technical-Prompt mit PFLICHT-Specs

**Aktueller Prompt:**
```
ZWINGEND VERWENDEN:
- Technische Fachbegriffe korrekt und prominent
- Spezifikationen, Zahlen, Metriken, Benchmarks
```

**NEUER Prompt (spezifischer):**
```
🔧 TONALITÄT: TECHNISCH - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔧

WICHTIG: Du schreibst für technische Experten und Entwickler!

⚙️ PFLICHT-ELEMENTE (MINDESTENS 3 VON 5 IN LEAD/BODY):
1. **Performance-Daten:** "Latenz <50ms", "99.9% Uptime", "10.000 req/s", "5ms Response Time"
2. **Architektur-Details:** "Microservices", "REST API", "gRPC", "Kubernetes", "PostgreSQL 15", "Redis Cache"
3. **Versionsnummern:** "v3.0", "API v2.5", "SDK 1.8.2", "TLS 1.3"
4. **Metriken & Benchmarks:** "50.000 Transaktionen/Sek", "2TB Durchsatz", "40% schneller als v2"
5. **Standards & Protokolle:** "OAuth 2.0", "HTTP/2", "WebSocket", "gRPC", "JSON API"

ZUSÄTZLICH bei spezifischen Branchen:
- **Automotive:** "kWh", "Reichweite 600km", "Ladezeit 18min", "CCS-Standard"
- **FinTech:** "TLS 1.3 Verschlüsselung", "SEPA-Instant", "PSD2-konform"

BEISPIEL TECHNICAL LEAD (RICHTIG):
❌ FALSCH: "TechCorp startet neue Cloud-Lösung ab Januar."
✅ RICHTIG: "**TechCorp released v3.0 der Analytics-Platform mit REST API, PostgreSQL 15 Backend und <50ms Query-Latenz.**"

BEISPIEL TECHNICAL BODY (RICHTIG):
❌ FALSCH: "Das System ist sehr schnell und skalierbar."
✅ RICHTIG: "Die Microservices-Architektur ermöglicht horizontale Skalierung auf 10.000+ parallele Requests. Kubernetes-Orchestrierung garantiert 99.95% Uptime. PostgreSQL 15 Backend verarbeitet 50.000 Transaktionen/Sekunde bei durchschnittlich 35ms Latenz. Redis Cache reduziert Datenbankzugriffe um 80%."

BEISPIEL TECHNICAL CTA (RICHTIG):
❌ FALSCH: [[CTA: Mehr Infos auf unserer Website]]
✅ RICHTIG: [[CTA: API-Dokumentation: docs.techcorp.dev/api/v3 | SDK Download: github.com/techcorp/sdk | OpenAPI Spec: api.techcorp.dev/openapi.json]]

VERBOTEN:
- ❌ Marketing-Sprache ohne Fakten
- ❌ Unspezifische Aussagen ("sehr schnell", "ziemlich gut")
- ❌ Emotionale Sprache

💾 OHNE KONKRETE SPECS IST DER TEXT FALSCH! 💾
```

**Implementierung:**
`src/lib/ai/flows/generate-press-release-structured.ts:233-269`

---

## 🟡 NIEDRIG - Modern-Ton: "Next-Level" aktivieren

**Problem:** "Next-Level" erscheint in 0/3 Tests (nur 1x im Quote)

### Vorschlag 5: Modern-Prompt explizit "Next-Level" erlauben

**Aktueller Prompt:**
```
VERBOTEN:
- ❌ Altmodische Begriffe ("etabliert", "bewährt", "traditionell")
```

**NEUER Prompt (erweitert):**
```
ZUKUNFTS-SPRACHE (EXPLIZIT ERLAUBT!):
✅ "Next-Level", "Zukunft 2025+", "Next Generation", "Future-Ready"
✅ "Game-Changer" (in moderatem Maß)
✅ "State-of-the-Art", "Cutting-Edge"

BEISPIEL MODERN LEAD MIT ZUKUNFTS-SPRACHE:
❌ FALSCH: "TechCorp stellt neue Lösung vor."
✅ RICHTIG: "**TechCorp launcht Next-Level Analytics-Platform – Future-Ready für 2025.**"

WICHTIG: "Next-Level" ist KEIN Werbewort sondern modernes Vokabular für Tech-Audiences!
```

**Implementierung:**
`src/lib/ai/flows/generate-press-release-structured.ts:196-231`

---

## 🟢 OPTIONAL - Weitere Optimierungen

### Vorschlag 6: Quote-Attribution verbessern

**Problem:** Viele Quotes fehlen Person/Role/Company

**Beispiel aus Formal Test:**
```json
"quote": {
  "text": "Die Einführung von DataSense Pro markiert...",
  "person": "",    // LEER!
  "role": "",      // LEER!
  "company": ""    // LEER!
}
```

**Lösung:**
Im Prompt explizit fordern:
```
ZITAT-FORMAT (ZWINGEND):
"Zitat-Text mit 20-35 Wörtern", sagt [VOLLSTÄNDIGER NAME], [POSITION] bei [FIRMA].

BEISPIEL:
❌ FALSCH: "Das ist super."
✅ RICHTIG: "Mit DataSense Pro demokratisieren wir KI-Analytics für den Mittelstand", sagt Dr. Anna Müller, CTO bei TechVision.

PFLICHT: Name, Position, Firma MÜSSEN IMMER angegeben sein!
```

---

### Vorschlag 7: Satz-Längen-Validierung

**Problem:** Modern-Ton soll 8-12 Wörter, aber keine Enforcement

**Lösung:**
Post-Processing Validation:
```typescript
// Nach ai.generate() aber vor return
if (context?.tone === 'modern') {
  const avgSentenceLength = calculateAvgSentenceLength(result.leadParagraph);
  if (avgSentenceLength > 12) {
    console.warn(`⚠️ Modern-Ton: Sätze zu lang (${avgSentenceLength} Wörter avg, Limit: 12)`);
  }
}
```

---

### Vorschlag 8: A/B Testing: gemini-2.5-flash vs flash-lite

**Hypothese:** Flash-Lite (günstig) ist schwächer bei komplexen Ton-Instruktionen

**Test:**
- Wiederhole alle 12 Tests mit `gemini-2.5-flash` (teurer, aber stärker)
- Vergleiche Startup-Ton Score: Bleibt bei 45% oder steigt auf 70%+?

**Wenn Flash besser:**
- Nur für Ton-Änderung auf Flash upgraden
- Andere Flows (Headlines, etc.) bei Flash-Lite lassen

**Implementierung:**
```typescript
// Conditional Model Selection
const model = context?.tone === 'startup' || context?.tone === 'technical'
  ? gemini25FlashModel      // Für komplexe Töne: besseres Modell
  : gemini25FlashLiteModel;  // Für einfache Töne: günstiges Modell
```

---

## 📊 Priorisierung

| Priorität | Vorschlag | Aufwand | Impact | Quick Win? |
|-----------|-----------|---------|--------|------------|
| 🔴 **1** | Startup-Prompt verschärfen | Mittel | Sehr hoch | Ja |
| 🔴 **2** | Ton-Prompt an erste Stelle | Gering | Hoch | **JA!** |
| 🟡 **3** | Technical-Prompt mit Pflicht-Specs | Mittel | Hoch | Ja |
| 🟡 **4** | Formal "Sie vs. ihr" klären | Gering | Mittel | **JA!** |
| 🟡 **5** | Modern "Next-Level" aktivieren | Gering | Niedrig | **JA!** |
| 🟢 **6** | Quote-Attribution verbessern | Mittel | Mittel | Nein |
| 🟢 **7** | Satz-Längen-Validierung | Hoch | Niedrig | Nein |
| 🟢 **8** | A/B Test Flash vs Flash-Lite | Mittel | ? | Nein |

**Empfehlung:**
1. ✅ **Sofort:** Vorschläge 2, 4, 5 (Quick Wins, geringer Aufwand)
2. ✅ **Diese Woche:** Vorschläge 1, 3 (Kritisch, mittlerer Aufwand)
3. ⏳ **Später:** Vorschläge 6, 7, 8 (Optional)

---

## 🎯 Erwartete Ergebnisse nach Umsetzung

| Ton | Aktuell | Nach Quick Wins | Nach Vollständig |
|-----|---------|-----------------|------------------|
| **Formal** | 72% | **80%** | **85%** |
| **Modern** | 65% | **75%** | **80%** |
| **Technical** | 63% | 63% | **80%** |
| **Startup** | 45% | **60%** | **80%** |
| **DURCHSCHNITT** | **63%** | **70%** | **82%** |

**Ziel:** 85%+ durchschnittlicher Score über alle Töne

---

## 🔄 Nächste Schritte

1. **Quick Wins implementieren** (Vorschläge 2, 4, 5)
2. **Re-Test** mit 12 Tests durchführen
3. **Kritische Fixes** (Vorschläge 1, 3) umsetzen
4. **Final Re-Test** und Dokumentation
