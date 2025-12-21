# ADR-0001: Genkit vs. Vercel AI SDK

**Status:** Accepted
**Datum:** 2025-12-21
**Autor:** CeleroPress Development Team

---

## Kontext

Für die KI-Chat-Funktionalität der Marken-DNA musste eine Entscheidung zwischen zwei etablierten Frameworks getroffen werden:

### Option A: Vercel AI SDK
- **Vorteile:**
  - `useChat` Hook mit automatischem Streaming
  - Einfache Integration für Chat-UIs
  - Große Community, viele Beispiele
- **Nachteile:**
  - Neues Framework im Projekt
  - Separate Konfiguration erforderlich
  - Doppelte Dependencies

### Option B: Genkit (Google)
- **Vorteile:**
  - Bereits im Projekt für 17+ Flows verwendet
  - Einheitliche Infrastruktur (Google AI, Vertex AI)
  - Konsistente Patterns
- **Nachteile:**
  - Kein automatisches Streaming via useChat
  - Manuelles State-Management für Chat
  - Eigener Hook-Wrapper notwendig

---

## Entscheidung

**Wir bleiben bei Genkit** für alle KI-Funktionalitäten im Marken-DNA Modul.

### Begründung

#### 1. Konsistenz mit bestehender Architektur

CeleroPress nutzt Genkit bereits für 17+ Flows:
- Press Release Generation
- Headlines & Teasers
- SEO Optimization
- Email Generation
- Image Generation (Imagen)
- Evaluators für Qualitätsprüfung

Ein zweites KI-Framework würde die Architektur fragmentieren.

#### 2. Infrastruktur bereits vorhanden

Die Genkit-Konfiguration ist etabliert:
```typescript
// src/lib/ai/genkit-config.ts
export const ai = genkit({
  plugins: [
    googleAI(),       // Gemini 2.0 Flash
    vertexAI(),       // Imagen 3
  ],
});
```

Service Account Integration, API-Keys, Middleware - alles funktioniert.

#### 3. Wartbarkeit

Ein Framework statt zwei:
- **Eine** Dependency zu aktualisieren
- **Ein** Set an Best Practices
- **Eine** Fehlerquelle
- Einfacheres Onboarding neuer Entwickler

#### 4. Kosten

Genkit nutzt Google AI (Gemini) direkt:
- Keine zusätzlichen Wrapper
- Keine Vendor Lock-In Risiken
- Flexibilität bei Model-Wahl

---

## Konsequenzen

### Positiv ✅

1. **Einheitliche KI-Architektur**
   - Alle Flows folgen dem gleichen Pattern
   - Konsistente Fehlerbehandlung
   - Wiederverwendbare Prompt-Libraries

2. **Bestehende Infrastruktur wiederverwendet**
   - Service Account funktioniert out-of-the-box
   - Monitoring/Logging bereits eingerichtet
   - Keine neue Konfiguration

3. **Konsistente Entwicklungserfahrung**
   - Developer kennen bereits Genkit Patterns
   - Keine Kontextwechsel zwischen Frameworks

### Negativ ⚠️

1. **Kein automatisches Streaming via useChat**
   - Lösung: Eigener `useGenkitChat` Hook
   - Implementiert in: `src/components/ai-chat/hooks/useGenkitChat.ts`

2. **Manuelles State-Management für Chat**
   - Lösung: React Query + lokaler State
   - Pattern bereits etabliert in anderen Modulen

3. **Mehr Boilerplate-Code**
   - Tradeoff: Mehr Kontrolle über Chat-Logik
   - Flexibilität für Custom-Features (z.B. Document Preview)

---

## Alternativen

### Alternative 1: Vercel AI SDK

**Vorteile:**
- useChat Hook mit automatischem Streaming
- Optimiert für Chat-UIs (Markdown, Code-Highlighting)
- Große Community, viele Beispiele

**Nachteile:**
- Zweites KI-Framework im Projekt
- Doppelte Dependencies (`@ai-sdk/google`, `@genkit-ai/google-genai`)
- Separate Konfiguration (API-Keys, Service Account)
- Muss separat aktualisiert werden

**Bewertung:** ❌ Abgelehnt
- Zu hoher Preis für "einfacheren" Chat-Hook
- Fragmentierung der Architektur nicht gerechtfertigt

### Alternative 2: Hybrid (beide Frameworks)

**Idee:**
- Genkit für bestehende Flows (Press Release, etc.)
- Vercel AI SDK nur für Marken-DNA Chat

**Bewertung:** ❌ Abgelehnt
- Erhöhte Komplexität ohne echten Mehrwert
- Zwei verschiedene Patterns im gleichen Projekt
- Schwieriger zu warten
- Onboarding-Hürde für neue Entwickler

### Alternative 3: Plain OpenAI SDK

**Idee:**
- Weder Genkit noch Vercel AI SDK
- Direkt OpenAI/Google AI SDKs nutzen

**Bewertung:** ❌ Abgelehnt
- Noch mehr Boilerplate
- Keine Abstraktion für Flows
- Verlust der bestehenden Genkit-Infrastruktur

---

## Migration Path (falls notwendig)

Falls in Zukunft ein Wechsel zu Vercel AI SDK notwendig wird:

1. **Phase 1:** Vercel AI SDK parallel installieren
2. **Phase 2:** Neue Flows mit Vercel AI SDK
3. **Phase 3:** Migration bestehender Genkit Flows
4. **Phase 4:** Genkit entfernen

**Aufwand:** ~2-3 Wochen (17+ Flows)

**Trigger für Migration:**
- Genkit wird deprecated
- Google AI Plugin funktioniert nicht mehr
- Vercel AI SDK bietet kritische Features

---

## Referenzen

- Genkit Dokumentation: https://firebase.google.com/docs/genkit
- Bestehende Flows: `src/lib/ai/flows/`
- Implementierung: `src/components/ai-chat/hooks/useGenkitChat.ts`
- Chat-UI Konzept: `docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md`

---

**Entscheidung getroffen:** 2025-12-21
**Review:** Stefan Kühne
**Status:** ✅ Accepted
