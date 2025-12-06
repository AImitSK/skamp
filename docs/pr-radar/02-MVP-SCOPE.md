# PR-Radar: MVP-Scope Definition

## Ziel des MVP

**Kernfrage**: Was ist das Minimum, um den Wow-Effekt zu demonstrieren und echtes Nutzer-Feedback zu bekommen?

**Antwort**: Der "Silent Interviewer" - Ein Chat-Interface, das durch gezielte Fragen PR-würdige Themen aus dem Unternehmen extrahiert.

---

## MVP Feature-Set

### Enthalten (Must-Have)

| Feature | Beschreibung | Aufwand |
|---------|--------------|---------|
| **Weekly Check-in Chat** | Chat-Interface mit 3-5 trigger-basierten Fragen | Mittel |
| **Topic-Extraktion** | AI analysiert Antworten und generiert Topic-Vorschläge | Mittel |
| **Topic-Übersicht** | Einfache Liste aller generierten Topics | Klein |
| **Topic Approve/Reject** | Buttons zum Annehmen oder Ablehnen von Vorschlägen | Klein |
| **Projekt-Erstellung** | "Entwurf starten" Button → Erstellt CeleroPress-Projekt | Klein |
| **Basic Settings** | Unternehmens-Kontext eingeben (Name, Branche, USPs) | Klein |

### Nicht enthalten (Phase 2+)

| Feature | Warum nicht im MVP | Phase |
|---------|-------------------|-------|
| Trend Scanner (News-Jacking) | Erfordert Vertex AI Search, höhere Komplexität | 2 |
| Redaktionskalender | Nice-to-have, nicht kritisch für ersten Wow | 2 |
| Saisonale Events | Braucht Kalender-UI | 2 |
| E-Mail-Reminder | Cron-Jobs, Notification-System | 2 |
| Wettbewerber-Tracking | Erfordert Trend Scanner | 3 |

---

## User Journey (MVP)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MVP USER JOURNEY                                │
└─────────────────────────────────────────────────────────────────────────┘

1. ONBOARDING (Einmalig)
   ┌──────────────────────────────────────┐
   │  "Erzählen Sie uns von Ihrem         │
   │   Unternehmen"                       │
   │                                      │
   │  • Unternehmensname                  │
   │  • Branche/Keywords                  │
   │  • Was macht Sie besonders? (USPs)   │
   │  • Wer ist Ihre Zielgruppe?          │
   │                                      │
   │            [Speichern]               │
   └──────────────────────────────────────┘
                    │
                    ▼
2. WEEKLY CHECK-IN (Wöchentlich)
   ┌──────────────────────────────────────┐
   │  "Kurzer Wochen-Check-in"            │
   │                                      │
   │  🤖 "Haben Sie diesen Monat einen    │
   │      neuen Mitarbeiter eingestellt?" │
   │                                      │
   │  [Ja, erzähl mehr]  [Nein, weiter]   │
   │                                      │
   │  💬 "Ja, wir haben einen neuen       │
   │      Senior Developer eingestellt"   │
   │                                      │
   │  🤖 "Interessant! Was wird diese     │
   │      Person bei Ihnen bewegen?"      │
   │                                      │
   │  💬 "Sie leitet unser neues          │
   │      KI-Projekt..."                  │
   │                                      │
   └──────────────────────────────────────┘
                    │
                    ▼
3. TOPIC-GENERIERUNG (Automatisch)
   ┌──────────────────────────────────────┐
   │  "Wir haben 2 Themen-Ideen für Sie!" │
   │                                      │
   │  ┌────────────────────────────────┐  │
   │  │ 📰 "Maschinenbauer setzt auf   │  │
   │  │     KI: Neuer Tech-Lead..."    │  │
   │  │                                │  │
   │  │ Relevanz: ████████░░ 85%       │  │
   │  │                                │  │
   │  │ 💡 Warum jetzt?                │  │
   │  │ "Fachkräfte-Thema aktuell..."  │  │
   │  │                                │  │
   │  │ [✓ Annehmen]  [✕ Ablehnen]    │  │
   │  └────────────────────────────────┘  │
   │                                      │
   └──────────────────────────────────────┘
                    │
                    ▼
4. PROJEKT STARTEN (Optional)
   ┌──────────────────────────────────────┐
   │                                      │
   │  "Topic angenommen! Was nun?"        │
   │                                      │
   │  [📝 Entwurf starten]                │
   │       → Erstellt neues Projekt       │
   │       → Öffnet Editor                │
   │                                      │
   │  [📅 Später planen]                  │
   │       → Bleibt in Topic-Liste        │
   │                                      │
   └──────────────────────────────────────┘
```

---

## Technischer Scope

### Neue Dateien (MVP)

```
src/
├── types/
│   └── pr-radar.ts                    # Types (nur MVP-relevante)
│
├── lib/
│   ├── firebase/
│   │   └── pr-radar-service.ts        # Firebase Service (vereinfacht)
│   │
│   └── ai/
│       ├── flows/
│       │   └── silent-interviewer.ts  # GenKit Flow
│       └── schemas/
│           └── silent-interviewer-schemas.ts
│
├── app/
│   ├── api/
│   │   └── pr-radar/
│   │       ├── settings/
│   │       │   └── route.ts           # GET/POST Settings
│   │       ├── checkin/
│   │       │   ├── route.ts           # POST Start Check-in
│   │       │   └── [id]/
│   │       │       └── route.ts       # POST Add Response
│   │       └── topics/
│   │           ├── route.ts           # GET Topics
│   │           └── [id]/
│   │               └── route.ts       # PATCH Status
│   │
│   └── [orgSlug]/
│       └── pr-radar/
│           ├── page.tsx               # Dashboard
│           ├── settings/
│           │   └── page.tsx           # Onboarding/Settings
│           └── checkin/
│               └── page.tsx           # Chat-Interface
│
└── components/
    └── pr-radar/
        ├── TopicCard.tsx              # Topic-Anzeige mit Actions
        ├── CheckinChat.tsx            # Chat-Interface
        ├── SettingsForm.tsx           # Onboarding-Formular
        └── TopicList.tsx              # Liste aller Topics
```

### Firestore Collections (MVP)

```
organizations/{orgId}
  └── prRadarSettings: {
        companyDescription: string
        industry: string
        uniqueSellingPoints: string[]
        targetAudience: string
      }

pr_topics/{topicId}
  ├── organizationId: string
  ├── headline: string
  ├── reasoning: string
  ├── suggestedAngle: string
  ├── relevanceScore: number
  ├── status: 'new' | 'approved' | 'rejected'
  ├── linkedProjectId?: string
  ├── createdAt: Timestamp
  └── source: 'user_interview'  // Im MVP nur diese Quelle

pr_checkins/{checkinId}
  ├── organizationId: string
  ├── userId: string
  ├── responses: CheckinResponse[]
  ├── extractedTopicIds: string[]
  ├── status: 'in_progress' | 'completed'
  └── createdAt: Timestamp
```

---

## Check-in Fragen (MVP-Set)

Diese 5 Fragen decken die wichtigsten PR-Trigger ab:

### 1. Team-Veränderungen
```
Frage: "Haben Sie diesen Monat jemanden neu eingestellt oder befördert?"
Follow-up: "Was wird diese Person bei Ihnen bewegen? Welche Expertise bringt sie mit?"
→ Content-Typ: Pressemitteilung (Personalien)
```

### 2. Produkt/Service-Updates
```
Frage: "Haben Sie ein neues Produkt, Feature oder Service gelauncht oder verbessert?"
Follow-up: "Was ist das Besondere daran? Welches Problem löst es für Ihre Kunden?"
→ Content-Typ: Pressemitteilung (Produkt)
```

### 3. Kunden-Erfolge
```
Frage: "Gab es einen besonderen Erfolg bei einem Kunden, den Sie teilen können?"
Follow-up: "Was war die Herausforderung und wie haben Sie geholfen?"
→ Content-Typ: Case Study
```

### 4. Events/Messen
```
Frage: "Planen Sie in den nächsten Wochen einen Messeauftritt oder ein Event?"
Follow-up: "Was zeigen Sie dort? Gibt es Neuheiten oder Vorträge?"
→ Content-Typ: Messevorbericht
```

### 5. Meilensteine
```
Frage: "Steht ein Jubiläum, Award oder anderer Meilenstein an?"
Follow-up: "Was macht diesen Meilenstein besonders? Welche Geschichte steckt dahinter?"
→ Content-Typ: Pressemitteilung (Meilenstein)
```

---

## UI/UX Mockups

### Dashboard (`/pr-radar`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PR-Radar                                              [⚙️ Einstellungen] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎯 Wöchentlicher Check-in                                      │   │
│  │                                                                 │   │
│  │  "Entdecken Sie versteckte PR-Themen in Ihrem Unternehmen"     │   │
│  │                                                                 │   │
│  │                    [Check-in starten →]                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Neue Themen-Vorschläge (3)                              [Alle anzeigen]│
│                                                                         │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────┐ │
│  │ 📰 Senior Developer verstärkt   │ │ 📰 Kunde spart 30% durch...  │ │
│  │    KI-Team bei TechCorp         │ │                              │ │
│  │                                 │ │                              │ │
│  │ Relevanz: ████████░░ 85%        │ │ Relevanz: ███████░░░ 72%     │ │
│  │                                 │ │                              │ │
│  │ [✓ Annehmen] [✕ Ablehnen]      │ │ [✓ Annehmen] [✕ Ablehnen]   │ │
│  └──────────────────────────────────┘ └──────────────────────────────┘ │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Angenommene Themen (5)                                [Alle anzeigen] │
│                                                                         │
│  • Q3 Messe-Auftritt auf der HANNOVER MESSE    [📝 Entwurf starten]   │
│  • Partnerschaft mit LogiTech GmbH             [📝 Entwurf starten]   │
│  • ...                                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Check-in Chat (`/pr-radar/checkin`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Zurück zum Dashboard                              Frage 2 von 5      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│        ┌────────────────────────────────────────────────────────┐      │
│        │  🤖  "Haben Sie ein neues Produkt, Feature oder       │      │
│        │       Service gelauncht oder verbessert?"              │      │
│        └────────────────────────────────────────────────────────┘      │
│                                                                         │
│                    ┌────────────────────────────────────────┐          │
│                    │  Ja, wir haben unsere Software um      │          │
│                    │  eine KI-gestützte Qualitätskontrolle  │          │
│                    │  erweitert.                            │  👤      │
│                    └────────────────────────────────────────┘          │
│                                                                         │
│        ┌────────────────────────────────────────────────────────┐      │
│        │  🤖  "Das klingt spannend! Was ist das Besondere      │      │
│        │       daran? Welches Problem löst es für Ihre         │      │
│        │       Kunden?"                                        │      │
│        └────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Nachricht eingeben...                                    [Senden]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│         [Überspringen]                              [Fragen beenden]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Akzeptanzkriterien

### Definition of Done (MVP)

- [ ] User kann Unternehmens-Kontext einmalig einrichten
- [ ] User kann Weekly Check-in starten und 5 Fragen beantworten
- [ ] AI extrahiert mindestens 1 Topic pro Check-in (wenn relevante Antworten)
- [ ] User sieht generierte Topics mit Headline, Reasoning und Relevanz-Score
- [ ] User kann Topic annehmen oder ablehnen
- [ ] Bei "Annehmen" kann User direkt ein Projekt starten
- [ ] Topics werden in Firestore persistiert
- [ ] Mobile-responsive UI (Tailwind)

### Nicht-funktionale Anforderungen

- **Performance**: Check-in Antwort < 3 Sekunden
- **Qualität**: AI-generierte Headlines klingen professionell (kein Clickbait)
- **Sprache**: Deutsch (wie alle CeleroPress-Features)

---

## Geschätzter Aufwand

| Komponente | Geschätzter Aufwand |
|------------|---------------------|
| Types & Schemas | 2h |
| Firebase Service | 3h |
| GenKit Flow (Silent Interviewer) | 4h |
| API Routes | 3h |
| UI: Settings/Onboarding | 2h |
| UI: Check-in Chat | 4h |
| UI: Dashboard & Topic-Liste | 3h |
| Testing & Bugfixes | 4h |
| **Gesamt** | **~25h** |

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| AI generiert irrelevante Topics | Mittel | Gutes Prompt-Engineering, Fallback auf "Keine Themen gefunden" |
| User beantwortet Fragen zu knapp | Hoch | Follow-up Fragen, Beispiele in der Frage |
| Check-in wird ignoriert | Mittel | (Phase 2) E-Mail-Reminder |
| Performance-Probleme | Niedrig | Streaming-Response für Chat |

---

## Nächste Schritte nach MVP

1. **User-Feedback sammeln** (2 Wochen live)
2. **Metriken analysieren**:
   - Wie viele Topics werden generiert?
   - Wie viele werden angenommen?
   - Wie viele werden zu Projekten?
3. **Phase 2 priorisieren** basierend auf Feedback
