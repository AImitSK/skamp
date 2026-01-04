# Konzept: Web-URL-Analyse in Marken-DNA Chats

**Status:** Konzept
**Erstellt:** 2026-01-03
**Ziel:** User können URLs im Chat eingeben, die KI analysiert den Webseiten-Content

---

## 1. Übersicht

### Use Case
```
User: "Schau dir mal https://wettbewerber.de/about an für mehr Input"
      ↓
KI analysiert die Webseite und nutzt den Content für die Marken-DNA Erstellung
```

### Betroffene Flows
- `markenDNAChatFlow` (alle 6 Dokumenttypen: briefing, swot, audience, positioning, goals, messages)

---

## 2. Technischer Ansatz

### 2.1 Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     markenDNAChatFlow                           │
├─────────────────────────────────────────────────────────────────┤
│  1. User-Nachricht empfangen                                    │
│                    ↓                                            │
│  2. URL-Detection (Regex)                                       │
│     └── URLs gefunden? ──┬── Nein → Weiter zu Schritt 4        │
│                          └── Ja ↓                               │
│  3. Web-Content abrufen (Jina AI / Firecrawl)                  │
│     └── Content als Kontext speichern                          │
│                    ↓                                            │
│  4. System-Prompt + Web-Content zusammenbauen                   │
│                    ↓                                            │
│  5. Gemini aufrufen (optional mit Grounding)                   │
│                    ↓                                            │
│  6. Response zurückgeben                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 URL-Detection

```typescript
// Einfache URL-Erkennung
const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) || [];
  // Duplikate entfernen, max 3 URLs
  return [...new Set(matches)].slice(0, 3);
}
```

### 2.3 Web-Content Fetching

#### Option A: Jina AI Reader (Empfohlen für Start)

**Vorteile:**
- Zero Setup - nur URL-Prefix
- Kostenlos (Rate-Limited: 5/Minute)
- Gibt sauberes Markdown zurück
- JavaScript-Rendering

**Implementierung:**
```typescript
async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/markdown' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    // Auf 10.000 Zeichen begrenzen (Token-Limit)
    return content.slice(0, 10000);
  } catch (error) {
    console.error(`Fehler beim Abrufen von ${url}:`, error);
    return `[Fehler: Webseite konnte nicht abgerufen werden: ${url}]`;
  }
}
```

#### Option B: Firecrawl (Für Skalierung)

**Vorteile:**
- 500 Credits/Monat kostenlos
- Robuster, keine Rate-Limits
- LLM-optimierter Output
- Anti-Bot-Handling

**Implementierung:**
```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

async function fetchWebContent(url: string): Promise<string> {
  const result = await firecrawl.scrapeUrl(url, {
    formats: ['markdown'],
    onlyMainContent: true
  });

  return result.markdown?.slice(0, 10000) || '';
}
```

### 2.4 Integration in markenDNAChatFlow

```typescript
// src/lib/ai/flows/marken-dna-chat.ts

export const markenDNAChatFlow = ai.defineFlow(
  { name: 'markenDNAChatFlow', ... },
  async (input) => {
    // 1. URLs aus letzter User-Nachricht extrahieren
    const lastMessage = input.messages[input.messages.length - 1];
    const urls = lastMessage.role === 'user'
      ? extractUrls(lastMessage.content)
      : [];

    // 2. Web-Content parallel abrufen
    let webContext = '';
    if (urls.length > 0) {
      const contents = await Promise.all(
        urls.map(url => fetchWebContent(url))
      );

      webContext = urls.map((url, i) =>
        `\n\n[WEBSEITE: ${url}]\n${contents[i]}\n[/WEBSEITE]`
      ).join('');
    }

    // 3. System-Prompt erweitern
    const systemPrompt = buildFullSystemPrompt(...);
    const enrichedPrompt = webContext
      ? `${systemPrompt}\n\nREFERENZ-MATERIAL VON WEBSEITEN:${webContext}`
      : systemPrompt;

    // 4. Gemini aufrufen
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: enrichedPrompt,
      messages: formattedMessages,
      config: { temperature: 0.7 },
    });

    return { ... };
  }
);
```

### 2.5 Optional: Vertex AI Grounding

Zusätzlich zur URL-Analyse kann Grounding aktiviert werden für automatische Web-Recherche:

```typescript
const response = await ai.generate({
  model: vertexAI.model('gemini-2.0-flash'),
  system: enrichedPrompt,
  messages: formattedMessages,
  config: {
    temperature: 0.7,
    // Optional: Automatische Google-Suche für zusätzlichen Kontext
    googleSearchRetrieval: {
      dynamicThreshold: 0.5
    }
  },
});
```

---

## 3. Prompt-Anpassungen

### 3.1 System-Prompt Ergänzung

```markdown
## WEB-RECHERCHE

Wenn der User eine URL teilt, analysiere den Webseiten-Inhalt und nutze relevante
Informationen für die Marken-DNA Erstellung. Beachte:

1. Extrahiere relevante Fakten (Unternehmensdaten, Positionierung, Wettbewerber)
2. Zitiere wichtige Passagen wenn hilfreich
3. Weise auf die Quelle hin: "Laut [URL]..."
4. Ignoriere irrelevante Inhalte (Navigation, Footer, Werbung)
```

---

## 4. Kosten & Limits

### 4.1 Jina AI Reader (Start)
| Aspekt | Wert |
|--------|------|
| Rate-Limit | 5 Requests/Minute |
| Kosten | Kostenlos |
| Max Content | Unbegrenzt (wir limitieren auf 10k Zeichen) |

### 4.2 Firecrawl (Skalierung)
| Plan | Credits/Monat | Kosten |
|------|---------------|--------|
| Free | 500 | $0 |
| Hobby | 3.000 | $9 |
| Standard | 100.000 | $83 |

### 4.3 Geschätzte Nutzung
- ~5-10 URLs pro Chat-Session
- ~50-100 aktive Chats/Monat
- **= 250-1.000 URL-Abrufe/Monat**

→ Jina AI reicht für Start, Firecrawl Free als Backup

---

## 5. Implementierungsplan

### Phase 1: MVP (1-2 Stunden)
- [ ] URL-Detection Helper erstellen
- [ ] Jina AI Fetch-Funktion implementieren
- [ ] markenDNAChatFlow anpassen
- [ ] System-Prompt erweitern

### Phase 2: Testing
- [ ] Unit-Tests für URL-Detection
- [ ] Integration-Tests mit echten URLs
- [ ] Edge Cases (404, Timeout, große Seiten)

### Phase 3: Optional
- [ ] Firecrawl als Alternative
- [ ] Vertex AI Grounding aktivieren
- [ ] UI-Indikator "Webseite wird analysiert..."

---

## 6. Offene Fragen

1. **Max. Anzahl URLs pro Nachricht?** → Vorschlag: 3
2. **Caching?** → Gleiche URL in Session nur einmal abrufen?
3. **UI-Feedback?** → Loading-State während Fetch?
4. **Fehlerbehandlung?** → Was wenn URL nicht erreichbar?

---

## 7. Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Rate-Limiting bei Jina | Fallback zu Firecrawl |
| Große Webseiten (Token-Limit) | Content auf 10k Zeichen limitieren |
| JavaScript-Only Seiten | Jina/Firecrawl rendern JS |
| Timeout | 10s Timeout, Fehlermeldung an User |
| Malicious URLs | URL-Whitelist? Oder User-Verantwortung |

---

## 8. Entscheidungen

| Frage | Entscheidung | Begründung |
|-------|--------------|------------|
| Fetching-Service | Jina AI (Start) | Zero Setup, kostenlos |
| Max URLs | 3 pro Nachricht | Token-Limit, Performance |
| Content-Limit | 10.000 Zeichen | ~2.500 Tokens |
| Grounding | Optional (Phase 3) | Erstmal manuelles URL-Fetching |
