# Die 6 Strategie-Dokumente der Marken-DNA

Basierend auf dem Schmidbauer/Knödler PR-Strategie-Modell.

---

## Übersicht

| Nr. | Dokument | Zweck | KI-Funktion |
|-----|----------|-------|-------------|
| 1 | Briefing-Check | Faktenbasis | Halluzinationen verhindern |
| 2 | SWOT-Analyse | Bewertung | Strategische Richtung |
| 3 | Zielgruppen-Radar | Adressaten | Ansprache definieren |
| 4 | Positionierungs-Designer | USP (Herzstück) | Tonalität & Sound |
| 5 | Ziele-Setzer | Messlatte | Messbarkeit |
| 6 | Botschaften-Baukasten | Argumentation | Kernaussagen |

---

## 1. Briefing-Check (Die Faktenbasis)

### Ziel
Die KI muss verstehen, worum es überhaupt geht. Ohne diese Daten halluziniert sie. Dies ist die "unverrückbare Faktenplattform".

### Fragenkatalog der KI

#### Das Unternehmen (Der Absender)
- Was sind die harten Fakten (Branche, Größe, Standort, Angebot)?
- Gibt es eine spezifische Unternehmensgeschichte oder ein Leitbild, das wir beachten müssen?

#### Die Aufgabe (Der Anlass)
- Warum brauchen Sie jetzt eine PR-Strategie? (Produktlaunch, Krise, Jubiläum, Imagekorrektur?)
- Was ist das konkrete Kommunikationsproblem, das gelöst werden soll?

#### Der Markt & Wettbewerb
- Wer sind Ihre direkten Konkurrenten?
- Wie unterscheiden Sie sich objektiv von diesen (Preis, Qualität, Service)?

### Funktion für die KI
Sicherstellen, dass Fakten immer korrekt sind (z.B. "Wir haben 50 Mitarbeiter", nicht "Wir sind ein Konzern").

### Strukturierte Daten (Optional)

```typescript
interface BriefingData {
  company: {
    name: string;
    industry: string;
    size: string;           // "10-50 Mitarbeiter", "50-200", etc.
    location: string;
    founded?: string;
    offerings: string[];    // Produkte/Dienstleistungen
  };
  mission?: string;         // Leitbild
  challenge: string;        // Kommunikationsproblem
  competitors: string[];
  differentiation: string;  // Objektive Unterscheidung
}
```

---

## 2. SWOT-Analyse (Die Bewertung)

### Ziel
Verdichtung der Fakten zu Strategiefaktoren. Die KI zwingt den User, ehrlich zu sein. Entstehung eines "klaren Bildes der Ist-Situation".

### Fragenkatalog der KI

#### Interne Stärken (Strengths)
- Was können Sie besser als der Wettbewerb? (Technologie, Personal, Schnelligkeit?)

#### Interne Schwächen (Weaknesses)
- Wo drückt der Schuh? Wo sind Sie angreifbar oder schlechter aufgestellt? (Budget, Bekanntheit, Vertrieb?)

#### Externe Chancen (Opportunities)
- Welche Trends im Markt oder in der Gesellschaft spielen Ihnen in die Karten? (Gesetzesänderungen, Modetrends, Technologiewandel?)

#### Externe Risiken (Threats)
- Was bedroht Ihren Erfolg von außen? (Neue Wettbewerber, schlechte Presse, verändertes Kundenverhalten?)

### Output der KI
Ein "Analytisches Fazit", das Lösungsrichtungen andeutet.

### Strukturierte Daten (Optional)

```typescript
interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  conclusion: string;       // KI-generiertes Fazit
}
```

---

## 3. Zielgruppen-Radar (Die Adressaten)

### Ziel
Präzise Ansprache statt Gießkanne. Strikte Unterscheidung von drei Gruppen.

### Fragenkatalog der KI

#### Die Empfänger (Endkunden)
- Wen wollen Sie wirtschaftlich erreichen?
- Soziodemografie: Alter, Beruf, Einkommen
- Psychografie: Einstellungen, Ängste, Wünsche

#### Die Mittler (Journalisten/Influencer)
- Wer soll Ihre Botschaft transportieren?
- Fachpresse, Lokalzeitung, Blogger, TV?

**Hinweis:** Dies ist für PR entscheidend!

#### Die Absender (Interne Mitarbeiter)
- Müssen wir Mitarbeiter oder Partner mitnehmen, damit sie die Botschaft unterstützen?
- Führungskräfte, Vertrieb, Partner?

### Strukturierte Daten (Optional)

```typescript
interface AudienceData {
  receivers: {
    demographics: string;   // Alter, Beruf, etc.
    psychographics: string; // Einstellungen, Wünsche
    needs: string[];
  };
  intermediaries: {
    mediaTypes: string[];   // Fachpresse, TV, etc.
    specificOutlets?: string[];
    keyJournalists?: string[];
  };
  internal: {
    stakeholders: string[]; // Führungskräfte, Vertrieb
    requirements?: string;
  };
}
```

---

## 4. Positionierungs-Designer (Das Herzstück)

### Ziel
Abgrenzung vom Wettbewerb. **Dies ist der wichtigste strategische Schritt.** Hier wird die Nische gefunden.

### Fragenkatalog der KI

#### Die Alleinstellung (USP)
- Was ist der eine Punkt, der Sie einzigartig macht?
- Wenn es keinen gibt: Was machen Sie anders oder sympathischer?

#### Das "Soll-Image"
- Wenn jemand über Ihre Firma spricht, was ist der eine Satz, den er sagen soll?
- Das ist die Soll-Positionierung.

#### Die Abgrenzung
- Wollen wir uns so dicht wie möglich am Marktführer orientieren (Me-too)?
- Oder so weit wie möglich weg (Nische)?

### Funktion für die KI
Bestimmt den "Sound" und die Haltung aller Texte. Eine Discounter-Positionierung verlangt andere Adjektive als eine Luxus-Positionierung.

### Strukturierte Daten (Optional)

```typescript
interface PositioningData {
  usp: string;              // Der eine Punkt
  sollImage: string;        // Der eine Satz
  strategy: 'me-too' | 'niche' | 'challenger';
  tonality: string[];       // z.B. ["seriös", "innovativ", "nahbar"]
  keywords: string[];       // Wichtige Begriffe
  avoidWords?: string[];    // Begriffe die vermieden werden sollen
}
```

---

## 5. Ziele-Setzer (Die Messlatte)

### Ziel
Messbarkeit herstellen. Die KI muss verhindern, dass der User schwammig bleibt. Drei Ebenen werden definiert.

### Fragenkatalog der KI

#### Wahrnehmungsziele (Kopf)
- Soll die Bekanntheit gesteigert werden?
- Sollen Informationen vermittelt werden?
- **Fokus:** Wissen

#### Einstellungsziele (Herz)
- Soll das Image verbessert werden?
- Soll Sympathie geweckt werden?
- Sollen Vorurteile abgebaut werden?
- **Fokus:** Gefühl

#### Verhaltensziele (Hand)
- Soll der User etwas tun?
- Kaufen, Webseite besuchen, Newsletter abonnieren, anrufen?
- **Fokus:** Aktion

### Strukturierte Daten (Optional)

```typescript
interface GoalsData {
  awareness: {              // Kopf
    goals: string[];
    metrics?: string[];
  };
  attitude: {               // Herz
    goals: string[];
    metrics?: string[];
  };
  behavior: {               // Hand
    goals: string[];
    metrics?: string[];
    callToAction?: string;
  };
}
```

---

## 6. Botschaften-Baukasten (Die Argumentation)

### Ziel
Inhalte für Pressemeldungen erstellen, die journalistisch standhalten. Exakte Formel für jede Kernbotschaft.

### Fragenkatalog der KI (für jede Kernbotschaft)

#### Der Kern (Behauptung)
- Was ist die zentrale Aussage?
- z.B. "Wir sind der schnellste Lieferant"

#### Die Begründung (Beweis)
- Warum stimmt das? Geben Sie mir Fakten!
- z.B. "Weil wir ein patentiertes Logistiksystem nutzen"

#### Der Nutzen (Benefit)
- Was hat der Kunde davon?
- z.B. "Er spart Lagerkosten und Zeit"

### Funktion für die KI
Die KI prüft, ob in jeder Pressemeldung mindestens eine dieser Kernbotschaften subtil eingeflochten ist.

### Strukturierte Daten (Optional)

```typescript
interface MessagesData {
  coreMessages: Array<{
    claim: string;          // Die Behauptung
    proof: string;          // Der Beweis
    benefit: string;        // Der Nutzen
    priority: number;       // 1-5
  }>;
  tonalityGuidelines?: string;
  forbiddenClaims?: string[];
}
```

---

## Wie die KI die Dokumente verarbeitet

### Der "Senior-Berater-Algorithmus"

Wenn der User eine Pressemitteilung schreiben will:

1. **Kontext laden:** Die KI lädt alle 6 Marken-DNA Dokumente
2. **Projekt-Briefing nutzen:** Anlass, Ziel, Teilbotschaft aus dem Projekt
3. **Execution:** Text schreiben mit Stil und Werten aus der Marken-DNA

### Prompt-Struktur

```
"Du bist ein PR-Profi.

Schritt 1 (Kontext):
Lade die Marken-DNA:
- Briefing: [Unternehmensfakten]
- Positionierung: 'Innovativer Marktführer'
- Tonalität: 'Seriös, aber nahbar'
- Zielgruppen: [Empfänger, Mittler]
- Dachbotschaften: [Kern + Beweis + Nutzen]

Schritt 2 (Aufgabe):
Nutze das Projekt-Briefing:
- Thema: 'Neuer Geschäftsführer'
- Ziel: 'Vertrauen in Kontinuität stärken'

Schritt 3 (Execution):
Schreibe die Pressemeldung über den neuen Geschäftsführer,
ABER nutze dabei den Sprachstil und die Werte aus der Marken-DNA.
Flechte mindestens eine Dachbotschaft subtil ein."
```

---

## Warum das Zeit spart und Qualität sichert

> "Zu viele Ziele zersplittern ihre Kommunikationskräfte."

Wenn der User jedes Mal die Strategie neu eingeben muss, wird er widersprüchliche Angaben machen.

Durch die Marken-DNA zwingen wir den User zu **Konsistenz** - einem Kennzeichen professioneller PR.

**Der User muss die Strategiearbeit nur einmal richtig machen. Danach erntet er die Früchte in der schnellen Maßnahmenumsetzung.**

---

## Abhängigkeiten zwischen Dokumenten

```
┌─────────────┐
│  Briefing   │──────────────────────────┐
└─────────────┘                          │
                                         ▼
┌─────────────┐     ┌─────────────────────────────┐
│    SWOT     │────▶│     Positionierung          │
└─────────────┘     │     (Das Herzstück)         │
                    └─────────────┬───────────────┘
┌─────────────┐                   │
│ Zielgruppen │───────────────────┤
└─────────────┘                   │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Botschaften-Baukasten     │
                    └─────────────────────────────┘

┌─────────────┐
│    Ziele    │ (kann unabhängig erarbeitet werden)
└─────────────┘
```

### Empfohlene Reihenfolge

1. **Briefing-Check** - Fakten sammeln
2. **SWOT-Analyse** - Fakten bewerten
3. **Zielgruppen-Radar** - Empfänger definieren
4. **Positionierungs-Designer** - USP finden (braucht 1-3)
5. **Ziele-Setzer** - Messbarkeit (kann parallel zu 4)
6. **Botschaften-Baukasten** - Argumentation (braucht 4)
