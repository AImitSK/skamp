# Chat Toolbox - Visueller Phasen-basierter Chat Flow

## Übersicht

Der KI-Chat für Kernbotschaften (und andere Dokumente) soll als **geführter Wizard** funktionieren mit visuellen Boxen die den Fortschritt zeigen - nicht nur Fließtext.

---

## Design-Prinzip: Kompakte Boxen

**Wichtig:** Die Toolbox-Boxen sind visuell **kleiner und kompakter** als der normale Chat-Text. Sie sind Status-Indikatoren, keine Hauptinhalte.

| Element | Schriftgröße | Tailwind |
|---------|--------------|----------|
| Normaler Chat-Text | 16px (base) | `text-base` |
| **Box-Inhalt** | 13px (xs) | `text-xs` |
| **Box-Titel** | 12px (xs) | `text-xs font-medium` |
| **Box-Werte** | 13px (xs) | `text-xs text-zinc-600` |

**Beispiel einer kompakten Box:**
```
┌─ Phase 1: Anlass ─────────────────────┐  ← text-xs, font-medium, text-zinc-500
│ (●)──(◐)──(○)                         │  ← 12px Kreise, 1px Linien
│                                        │
│ Thema      Produktlaunch Feature X    │  ← text-xs, kompaktes Grid
│ News-Hook  20% Zeitersparnis          │
└────────────────────────────────────────┘
   ↑ Gesamthöhe: ~60-80px, nicht mehr
```

Die Boxen sollen sich **dezent einfügen** wie Status-Badges, nicht wie große Karten.

---

## Chat Flow

### 1. Begrüßung mit Roadmap

Zu Beginn zeigt der Chat alle Phasen als kompakte Übersicht:

```
Hallo! Ich erarbeite mit dir die Projekt-Kernbotschaft.

┌─ Roadmap ──────────────────────────────┐
│ (○)───(○)───(○)───(○)                  │
│  1     2     3     4                   │
│                                        │
│ Anlass → Ziel → Botschaft → Material   │
└────────────────────────────────────────┘

Bereit zu beginnen?
```

### 2. Aktive Phase mit ToDo-Box

Jede Phase zeigt ihre offenen Fragen als kompakte Liste:

```
┌─ Phase 1: Anlass ──────────────────────┐
│ │                                      │
│ (○) Worüber berichten wir?             │
│ │                                      │
│ (○) Was macht es nachrichtenrelevant?  │
│                                        │
└────────────────────────────────────────┘

Worüber berichten wir bei diesem Projekt?
```

### 3. Fortschritt durch Abhaken

Nach User-Antworten wird der Status aktualisiert:

```
┌─ Phase 1: Anlass ──────────────────────┐
│ │                                      │
│ (●) Thema → Produktlaunch              │
│ │                                      │
│ (◐) News-Hook → (wird geklärt...)      │
│                                        │
└────────────────────────────────────────┘

Gut! Was macht das Thema nachrichtenrelevant?
```

### 4. Ergebnis-Box zur Bestätigung

Wenn alle Fragen einer Phase beantwortet sind:

```
┌─ Phase 1: Ergebnis ────────────────────┐
│                                        │
│ Thema      Produktlaunch Feature X     │
│ News-Hook  20% Zeitersparnis           │
│                                        │
│ ────────────────────────────────────── │
│ Stimmt das?          [Ja] [Anpassen]   │
└────────────────────────────────────────┘
```

**Nach "Ja":** Sidebar wird aktualisiert, Phase abgeschlossen.

### 5. Phasen-Abschluss

```
┌─ Phase 1: Anlass ✓ ────────────────────┐
│ Thema      Produktlaunch Feature X     │
│ News-Hook  20% Zeitersparnis           │
└────────────────────────────────────────┘

Phase 1 abgeschlossen! Weiter mit Phase 2?
```

### 6. Roadmap-Update mit Prozent

```
┌─ Fortschritt: 25% ─────────────────────┐
│ (●)───(◐)───(○)───(○)                  │
│  1     2     3     4                   │
│  ✓   aktuell                           │
└────────────────────────────────────────┘
```

### 7. Finale Übersicht (nach Phase 4)

Bevor das Dokument generiert wird, eine Gesamtübersicht:

```
┌─ Zusammenfassung ──────────────────────┐
│                                        │
│ 1. Anlass     Produktlaunch Feature X  │
│ 2. Ziel       Klicks & Anmeldungen     │
│ 3. Botschaft  "20% schneller arbeiten" │
│ 4. Material   CEO-Zitat, Statistik     │
│                                        │
│ ────────────────────────────────────── │
│ Kernbotschaft generieren?   [Ja] [Nein]│
└────────────────────────────────────────┘
```

---

## Nicht-lineare Szenarien

Der Chat ist nicht immer "happy path". Folgende Szenarien müssen abgedeckt werden:

### 1. Nachfrage - KI versteht nicht ganz

```
User: "Wir machen was mit Golf"
KI: "Kannst du das konkretisieren? Ist es ein Event, eine neue Mitgliedschaft...?"
```

→ Punkt bleibt `(○)` (Outline), kein Fortschritt

### 2. Teilantwort - User beantwortet nur Teil

```
User: "Es geht um ein Turnier"
KI: "Ein Turnier, gut! Aber was macht es besonders/nachrichtenrelevant?"
```

→ Punkt wird `(◐)` (halb gefüllt) - teilweise beantwortet

### 3. Korrektur - User korrigiert sich

```
User: "Achso nein, es ist kein Turnier sondern eine Kooperation"
```

→ Vorheriger Eintrag wird überschrieben, Punkt bleibt `(◐)`

### 4. Abschweifung - User fragt was anderes

```
User: "Wie lang sollte eine Pressemitteilung sein?"
```

→ Keine Box-Änderung, normale Markdown-Antwort ohne Box

### 5. Zurückspringen - User will frühere Phase ändern

```
User: "Ich möchte nochmal den Anlass ändern"
```

→ Zurück zu Phase 1, Status wird auf `(◐)` zurückgesetzt

### 6. "Anpassen" Button geklickt

```
User klickt [Anpassen]
KI: "Was möchtest du ändern? Den Anlass oder den News-Hook?"
```

→ KI fragt nach, User kann gezielt korrigieren

---

## Design-System: Progress-Line

### Ikonografie mit Kreisen und Linien

Statt Text-Symbole (□ ✓) verwenden wir eine **visuelle Progress-Line** mit Kreisen:

**Horizontal (Phasen-Roadmap):**
```
    (●)─────────(◐)─────────(○)─────────(○)
     │           │           │           │
  Phase 1    Phase 2     Phase 3     Phase 4
  Anlass      Ziel      Botschaft   Material
```

**Vertikal (ToDo-Items innerhalb einer Phase):**
```
    │
   (●)  Worüber berichten wir? → "Produktlaunch"
    │
   (◐)  Was macht es relevant? → (wird geklärt...)
    │
   (○)  Gibt es einen Zeitbezug?
    │
```

### Status-Symbole (alle 12x12px)

| Symbol | Name | Bedeutung |
|--------|------|-----------|
| `(○)` | Outline | Offen / Ausstehend |
| `(◐)` | Halb | In Bearbeitung / Nachfrage |
| `(●)` | Voll | Erledigt / Bestätigt |

### Tailwind-Implementierung

```tsx
// Kreis-Komponente - alle exakt 12x12px (w-3 h-3)
function ProgressCircle({ status }: { status: 'open' | 'active' | 'done' }) {
  const size = "w-3 h-3"; // 12px - kompakt!

  switch (status) {
    case 'open':
      return <div className={`${size} rounded-full border-2 border-zinc-300 bg-transparent flex-shrink-0`} />;

    case 'active':
      return (
        <div
          className={`${size} rounded-full flex-shrink-0`}
          style={{
            background: 'conic-gradient(#3b82f6 0deg 180deg, transparent 180deg 360deg)',
            border: '2px solid #3b82f6'
          }}
        />
      );

    case 'done':
      return <div className={`${size} rounded-full bg-blue-500 flex-shrink-0`} />;
  }
}

// Vertikale Linie
function ProgressLine({ done }: { done: boolean }) {
  return (
    <div className={`w-px h-4 ml-[5px] ${done ? 'bg-blue-500' : 'bg-zinc-200'}`} />
  );
}
```

### Animationen

Wenn ein Kreis den Status wechselt, sanfte Animation:

```css
.progress-circle {
  transition: all 0.3s ease-out;
}

/* Von open zu active */
.progress-circle.active {
  animation: pulse 0.3s ease-out;
}

/* Von active zu done */
.progress-circle.done {
  animation: pop 0.2s ease-out;
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

---

## Responsive Design

### Desktop (>768px)
- Roadmap: Horizontal
- Boxen: Volle Breite bis max-w-md

### Mobile (<768px)
- Roadmap: Vertikal statt horizontal
- Boxen: Volle Breite, noch kompakter

```
Mobile Roadmap:
┌─ Fortschritt ──────────┐
│ (●) Phase 1: Anlass ✓  │
│  │                     │
│ (◐) Phase 2: Ziel      │
│  │                     │
│ (○) Phase 3: Botschaft │
│  │                     │
│ (○) Phase 4: Material  │
└────────────────────────┘
```

---

## Box-Typen (Toolbox)

### Übersicht der Box-Komponenten

| Tag | Komponente | Zweck |
|-----|------------|-------|
| `[ROADMAP]` | `RoadmapBox` | Horizontale/Vertikale Phasen-Übersicht |
| `[TODO]` | `TodoBox` | Offene Fragen mit Progress-Line |
| `[RESULT]` | `ResultConfirmBox` | Ergebnis mit Ja/Anpassen Buttons |
| `[SUMMARY]` | `SummaryBox` | Abgeschlossene Phase (read-only) |
| `[FINAL]` | `FinalSummaryBox` | Gesamtübersicht vor Generierung |

### Gemeinsame Box-Styles

```tsx
// Basis-Container für alle Boxen
const boxBaseStyles = `
  rounded-lg
  border border-zinc-200
  bg-zinc-50/50
  text-xs
  max-w-md
`;

// Box-Header
const boxHeaderStyles = `
  px-3 py-1.5
  border-b border-zinc-200
  text-xs font-medium text-zinc-500
  flex items-center gap-2
`;

// Box-Content
const boxContentStyles = `
  px-3 py-2
  text-xs text-zinc-600
`;
```

### Tag-Syntax für den Prompt

```
[ROADMAP]
(○) Phase 1: DER ANLASS
(○) Phase 2: DAS MASSNAHMENZIEL
(○) Phase 3: DIE TEILBOTSCHAFT
(○) Phase 4: DAS MATERIAL
[/ROADMAP]

[TODO phase="1" title="DER ANLASS"]
(○) Worüber berichten wir?
(○) Was macht das Thema nachrichtenrelevant?
[/TODO]

[RESULT phase="1" title="DER ANLASS"]
Thema: Produktlaunch Feature X
News-Hook: 20% Zeitersparnis
[/RESULT]

[SUMMARY phase="1" title="DER ANLASS" status="completed"]
Thema: Produktlaunch Feature X
News-Hook: 20% Zeitersparnis
[/SUMMARY]

[FINAL]
1. Anlass: Produktlaunch Feature X
2. Ziel: Klicks & Anmeldungen
3. Botschaft: "20% schneller arbeiten"
4. Material: CEO-Zitat, Statistik
[/FINAL]
```

---

## Interaktion

### Button-Aktionen

| Button | Aktion |
|--------|--------|
| **[Ja]** | `onConfirm(phase, content)` → Sidebar-Update, nächste Phase |
| **[Anpassen]** | `onAdjust(phase)` → KI fragt "Was möchtest du ändern?" |
| **[Überspringen]** | `onSkip(question)` → Frage als optional markiert, weiter |

### Tastatur-Shortcuts (optional)

| Taste | Aktion |
|-------|--------|
| `J` | Bestätigen (Ja) |
| `A` | Anpassen |
| `Enter` | Nachricht senden |

### Überspringen-Option

Für optionale Fragen (z.B. "Gibt es Zitate vom CEO?"):

```
┌─ Phase 4: Material ────────────────────┐
│ │                                      │
│ (●) Welche Fakten gibt es?             │
│ │                                      │
│ (○) Gibt es Zitate?     [Überspringen] │
│                                        │
└────────────────────────────────────────┘
```

---

## Persistenz & Wiedereinstieg

### Wo wird der Zustand gespeichert?

Der Phase-Zustand wird **im Chat-Verlauf** gespeichert (nicht separat):
- Jede KI-Nachricht enthält den aktuellen Zustand als Tags
- Beim Wiedereinstieg wird die letzte Nachricht geparst

### Wiedereinstieg nach Unterbrechung

```
┌─ Willkommen zurück ────────────────────┐
│                                        │
│ Du warst bei Phase 2: Maßnahmenziel    │
│                                        │
│ (●)───(◐)───(○)───(○)                  │
│  ✓   hier    ○     ○                   │
│                                        │
│              [Fortsetzen] [Neu starten]│
└────────────────────────────────────────┘
```

---

## Fehlerbehandlung

### Fallback wenn Tags nicht erkannt werden

Wenn die KI die Tags falsch setzt oder vergisst:
→ Normales Markdown rendern, keine Box
→ Kein Crash, graceful degradation

### Beispiel

```tsx
function parseToolboxTags(content: string) {
  try {
    const roadmapMatch = content.match(/\[ROADMAP\]([\s\S]*?)\[\/ROADMAP\]/);
    if (roadmapMatch) {
      return { type: 'roadmap', content: roadmapMatch[1] };
    }
    // ... weitere Tags
  } catch {
    // Fallback: als normalen Text behandeln
    return { type: 'text', content };
  }
}
```

---

## Prompt-Anpassung

### Wichtig: Beispiele im Prompt

Der Prompt muss **konkrete Beispiele** enthalten, damit die KI die Tags konsistent verwendet:

```
AUSGABE-FORMAT:

Verwende diese Tags für strukturierte Ausgaben:

BEISPIEL für Roadmap am Anfang:
[ROADMAP]
(○) Phase 1: DER ANLASS
(○) Phase 2: DAS MASSNAHMENZIEL
(○) Phase 3: DIE TEILBOTSCHAFT
(○) Phase 4: DAS MATERIAL
[/ROADMAP]

BEISPIEL für ToDo-Box:
[TODO phase="1" title="DER ANLASS"]
(○) Worüber berichten wir?
(○) Was macht das Thema nachrichtenrelevant?
[/TODO]

BEISPIEL für Ergebnis zur Bestätigung:
[RESULT phase="1" title="DER ANLASS"]
Thema: Produktlaunch Feature X
News-Hook: 20% Zeitersparnis
[/RESULT]

REGELN:
- Zeige immer nur EINE Box pro Nachricht
- Nach jeder User-Antwort: ToDo-Box mit aktualisiertem Status
- Wenn alle Fragen einer Phase beantwortet: RESULT-Box zeigen
- Bei Nachfragen: Punkt bleibt (○), nicht (◐) oder (●)
- Bei Teilantworten: Punkt wird (◐)
- Bei vollständiger Antwort: Punkt wird (●)
```

---

## Implementierung

### Phase 1: Box-Komponenten erstellen

**Ordner:** `src/components/marken-dna/chat/toolbox/`

1. `ProgressCircle.tsx` - Kreis-Komponente (open/active/done)
2. `ProgressLine.tsx` - Verbindungslinie
3. `RoadmapBox.tsx` - Phasen-Übersicht
4. `TodoBox.tsx` - Offene Fragen
5. `ResultConfirmBox.tsx` - Ergebnis mit Buttons
6. `SummaryBox.tsx` - Abgeschlossene Phase
7. `FinalSummaryBox.tsx` - Gesamtübersicht
8. `WelcomeBackBox.tsx` - Wiedereinstieg
9. `index.ts` - Barrel Export

### Phase 2: Parser in AIMessage erweitern

`AIMessage.tsx` muss alle Tags erkennen und die richtige Box rendern.

### Phase 3: Prompt anpassen

`project-strategy-chat.ts` Prompt mit Beispielen erweitern.

### Phase 4: Interaktion mit Sidebar

- Button-Callbacks implementieren
- Sidebar-Update bei Bestätigung

### Phase 5: Persistenz

- Wiedereinstieg-Logik
- "Willkommen zurück" Box

---

## Design-Entscheidungen

| Entscheidung | Gewählt | Begründung |
|--------------|---------|------------|
| "Anpassen" Verhalten | KI fragt nach | Einfacher zu implementieren, flexibler |
| Überspringen erlaubt | Ja, für optionale Fragen | Manche Infos hat der User nicht |
| Persistenz | Im Chat-Verlauf | Keine separate Datenstruktur nötig |
| Finale Übersicht | Ja | User soll alles nochmal sehen vor Generierung |
| Box-Größe | Kompakt (text-xs) | Boxen sind Status-Indikatoren, nicht Hauptinhalt |
| Kreise-Größe | 12px (w-3 h-3) | Passt zu text-xs, dezent |

---

## Feedback & Optimierungen

### Stärken des Konzepts

| Element | Warum es funktioniert |
|---------|----------------------|
| Progress-Line | Gibt Sicherheit und Fortschritts-Gefühl, erinnert an Projektmanagement-Tools |
| Kompaktheit (text-xs) | Verhindert Formular-Feeling, Chat bleibt Chat mit "Status-Badges" |
| RESULT-Box mit Bestätigung | Psychologisch wichtig: User muss "Ja" sagen bevor KI weitermacht |
| Wiedereinstieg-Logik | Wichtig für UX bei Tab-Wechsel oder Session-Timeout |

### Gefahrenzonen

#### 1. Prompt-Komplexität
**Problem:** Zu viele verschiedene Tags ([ROADMAP], [TODO], [RESULT], [SUMMARY], [FINAL]) - KI kann bei langen Konversationen Tags vergessen.

**Lösung:** Strikte Regel im Prompt:
```
WICHTIG: Gib pro Antwort immer exakt EINE Toolbox-Box aus.
```

#### 2. Tag-Reduktion
**Idee:** [TODO] und [SUMMARY] zu einer einzigen [PHASE_STATUS] Box zusammenfassen:

```
[PHASE_STATUS phase="1" title="DER ANLASS" status="active"]
(●) Thema: Produktlaunch Feature X
(◐) News-Hook: (wird geklärt...)
(○) Zeitbezug: -
[/PHASE_STATUS]
```

Das macht es der KI einfacher und reduziert Fehlerquellen.

#### 3. Animationen dezent halten
Animationen sollten subtil sein. Wenn bei jeder Antwort Kreise hüpfen, wirkt es nervös.

```css
/* Sehr dezent - nur 0.15s, kaum merklich */
@keyframes subtlePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }  /* Nur 10% größer, nicht 20% */
  100% { transform: scale(1); }
}
```

### Fehlende Features

#### 1. Sofortiges Feedback beim Laden ("Anti-Ghosting")
**Problem:** Während KI generiert, sieht User nur LoadingIndicator.

**Lösung:** Box der aktuellen Phase sofort clientseitig zeigen (auch wenn Inhalt noch leer):

```tsx
// Beim Senden sofort optimistische Box zeigen
function onSendMessage(message: string) {
  // Sofort leere Box anzeigen
  setOptimisticPhaseBox({
    phase: currentPhase,
    status: 'loading',
    items: currentItems  // Bisherige Items behalten
  });

  // Dann API-Call
  await sendToAPI(message);
}
```

#### 2. Inline-Edit in RESULT-Box
**Upgrade-Idee:** Werte in der RESULT-Box sollten kleine Edit-Icons haben:

```
┌─ Phase 1: Ergebnis ────────────────────┐
│                                        │
│ Thema      Produktlaunch Feature X [✏️]│
│ News-Hook  20% Zeitersparnis       [✏️]│
│                                        │
│ ────────────────────────────────────── │
│ Stimmt das?          [Ja] [Anpassen]   │
└────────────────────────────────────────┘
```

Klick auf [✏️] → Sidebar öffnet sich mit Textfeld für diesen Wert.

#### 3. Token-Effizienz im Prompt
**Problem:** Lange Beispiele im System-Prompt füllen Kontext-Fenster.

**Lösung:** Beispiele extrem kurz halten:
```
TAGS (jeweils EINE pro Antwort):
[ROADMAP]...[/ROADMAP] - Phasen-Übersicht
[PHASE_STATUS phase="X"]...[/PHASE_STATUS] - Aktueller Stand
[RESULT phase="X"]...[/RESULT] - Zur Bestätigung
[FINAL]...[/FINAL] - Gesamtübersicht am Ende
```

---

## Vereinfachte Tag-Struktur

Basierend auf dem Feedback: Reduzierung von 5 auf 3 Tags:

| Alt | Neu | Zweck |
|-----|-----|-------|
| `[ROADMAP]` | `[ROADMAP]` | Bleibt (nur am Anfang) |
| `[TODO]` + `[SUMMARY]` | `[PHASE_STATUS]` | Kombiniert: zeigt offene + erledigte Items |
| `[RESULT]` | `[RESULT]` | Bleibt (zur Bestätigung) |
| `[FINAL]` | `[FINAL]` | Bleibt (am Ende) |

### Neues [PHASE_STATUS] Format

```
[PHASE_STATUS phase="1" title="DER ANLASS"]
(●) Thema: Produktlaunch Feature X
(◐) News-Hook: 20% Zeitersparnis (wird geklärt)
(○) Zeitbezug
[/PHASE_STATUS]
```

- `(●)` = erledigt mit Wert
- `(◐)` = in Bearbeitung mit Teilwert
- `(○)` = noch offen

---

## Nächste Schritte (Priorisiert)

### Phase 1: Foundation (Zuerst!)
1. [ ] Message-Komponenten (User/AI) sauber aufsetzen
2. [ ] ProgressCircle Komponente erstellen
3. [ ] ProgressLine Komponente erstellen

### Phase 2: Kern-Boxen
4. [ ] RoadmapBox implementieren
5. [ ] PhaseStatusBox implementieren (kombiniert TODO+SUMMARY)
6. [ ] ResultConfirmBox implementieren

### Phase 3: Prompt-Anpassung
7. [ ] Vereinfachte Tag-Struktur in Prompt einbauen
8. [ ] "Eine Box pro Antwort" Regel hinzufügen
9. [ ] Kurze Beispiele statt lange

### Phase 4: UX-Feinschliff
10. [ ] Optimistisches Rendering (Anti-Ghosting)
11. [ ] Dezente Animationen
12. [ ] Mobile-Ansicht
13. [ ] Inline-Edit Icons (optional)

### Phase 5: Persistenz
14. [ ] Wiedereinstieg-Logik
15. [ ] WelcomeBackBox
