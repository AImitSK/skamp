# ADR-0005: Google Gemini für KI-Integration

**Status:** Accepted  
**Datum:** 2024-12-22  
**Entscheider:** Development Team  

## Kontext

SKAMP benötigt KI-Unterstützung für:
- Generierung von Pressemeldungen
- Textverbesserungen und -optimierungen
- Zukünftig: Zusammenfassungen, Übersetzungen
- Zukünftig: Sentiment-Analyse von Medienresonanz

Die KI-Lösung sollte:
- Gute deutsche Sprachunterstützung bieten
- Kosteneffizient sein
- Sich gut in das bestehende Google-Ökosystem integrieren
- Zuverlässig und skalierbar sein

## Entscheidung

Wir verwenden Google Gemini (ehemals Bard) über die Generative AI API.

## Alternativen

### Option 1: Google Gemini ✅
- **Vorteile:**
  - Exzellente deutsche Sprachunterstützung
  - Integration im Google-Ökosystem
  - Kosteneffizient (großzügige Free Tier)
  - Gute Performance
  - Strukturierte Ausgabe möglich
  - Vertex AI Migration-Pfad
- **Nachteile:**
  - Relativ neue API (weniger Beispiele)
  - Weniger Feintuning-Optionen als GPT
  - Gelegentliche Capacity-Limits

### Option 2: OpenAI GPT-4
- **Vorteile:**
  - Marktführer mit bester Qualität
  - Große Community
  - Viele Beispiele und Libraries
  - Fine-tuning möglich
- **Nachteile:**
  - Teurer als Gemini
  - Nicht im Google-Ökosystem
  - Datenschutz-Bedenken (US-Server)
  - API-Limits strenger

### Option 3: Claude (Anthropic)
- **Vorteile:**
  - Sehr gute Textqualität
  - Längere Kontextfenster
  - Gute Sicherheitsfeatures
- **Nachteile:**
  - Teurer als Gemini
  - Kleinere Community
  - Weniger Integrationen
  - Keine deutsche Lokalisierung

### Option 4: Open Source (Llama, Mistral)
- **Vorteile:**
  - Volle Kontrolle
  - Keine API-Kosten
  - Datenschutz (on-premise)
- **Nachteile:**
  - Hosting-Kosten hoch
  - Schlechtere Qualität
  - Wartungsaufwand
  - GPU-Server nötig

### Option 5: Keine KI
- **Vorteile:**
  - Keine Abhängigkeiten
  - Keine Kosten
  - Volle Kontrolle
- **Nachteile:**
  - Wichtiges Differenzierungsmerkmal fehlt
  - Manuelle Texterstellung zeitaufwändig
  - Wettbewerbsnachteil

## Begründung

Google Gemini wurde gewählt, weil:
1. **Google-Ökosystem**: Perfekte Integration mit Firebase und zukünftigen Google-Services
2. **Deutsch**: Native Unterstützung für deutsche Pressemeldungen
3. **Kosten**: Beste Preis-Leistung für Startups
4. **Zukunft**: Vertex AI bietet Enterprise-Pfad
5. **Compliance**: EU-Datacenter verfügbar

## Konsequenzen

### Positive
- Nahtlose Integration in SKAMP
- Niedrige Einstiegskosten
- Gute Performance für deutsche Texte
- Strukturierte JSON-Ausgabe für Pressemeldungen
- Skaliert mit Nutzung

### Negative
- Abhängigkeit von Google (zusätzlich zu Firebase)
- Gelegentliche Capacity-Errors bei Free Tier
- Weniger Kontrolle über Modell-Updates
- Safety-Filter können legitime Inhalte blockieren

### Neutral
- API-Key Management nötig
- Error-Handling für Quota-Limits
- Fallback-Strategie bei Ausfall
- Prompt-Engineering erforderlich

## Notizen

### Implementierung
```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
});
```

### Kostenstruktur (Stand 12/2024)
- Free Tier: 2 Requests/Minute, 50 Requests/Tag
- Paid: $0.00025 per 1K characters input
- Sehr günstig im Vergleich zu GPT-4

### Error Handling
```typescript
// Wichtige Error Cases:
- 429: Rate Limit → Exponential Backoff
- 503: Capacity → Retry mit Delay
- Safety Block → Alternative Formulierung
```

### Zukünftige Features
1. **Vertex AI Migration** für Enterprise-Kunden
2. **Fine-tuning** für Branchen-spezifische Sprache
3. **Embeddings** für semantische Suche
4. **Multi-Modal** für Bild-Analyse

### Fallback-Strategie
1. Retry mit Exponential Backoff
2. Vereinfachter Prompt
3. Manuelle Eingabe als letzter Ausweg
4. Cache erfolgreicher Generierungen

## Referenzen

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)
- [Vertex AI Migration](https://cloud.google.com/vertex-ai/docs/generative-ai/migrate-from-generative-ai-on-vertex-ai)