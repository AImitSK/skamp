# PR-Tool für SKAMP Marketing Suite - Mit KI-Assistent

## 🎯 Vision

Das PR-Tool ermöglicht professionelle Pressearbeit durch intelligente Integration mit dem CRM und Listen-System. Mit dem **Gemini KI-Assistenten** werden Pressemitteilungen automatisch generiert und optimiert. Journalisten werden zielgerichtet angesprochen, Kampagnen nachverfolgt und der Erfolg gemessen.

## 📊 Aktueller Status

### ✅ Fertig implementiert

#### Foundation & CRM-Integration
- **PR-Service** (`src/lib/firebase/pr-service.ts`) - CRUD für Kampagnen
- **PR-Datentypen** (`src/types/pr.ts`) - Vollständige Typisierung
- **Navigation** - PR-Bereich in Sidebar integriert
- **Listen-Integration** - Vollständige Verteiler-Synchronisation

#### Kampagnen-Management
- **Neue Kampagne** (`/dashboard/pr/campaigns/new`) - Vollständiger Workflow
- **Kampagnen-Bearbeitung** (`/dashboard/pr/campaigns/edit/[id]`) - Entwürfe bearbeiten
- **Kampagnen-Übersicht** (`/dashboard/pr/page.tsx`) - Status-Management & Analytics
- **Verteiler-Integration** - Auswahl aus Listen-System mit Live-Vorschau
- **Rich-Text-Editor** - Professionelle Pressemitteilungs-Erstellung
- **Entwurf-Speicherung** - Kampagnen als Draft speichern

#### 🤖 KI-Assistent (Gemini Integration)
- **Infrastruktur** - Firebase Functions + Next.js API Routes
- **Modal-Interface** - Vollständige UI-Integration
- **Text-Generierung** - Pressemitteilungen automatisch erstellen
- **Text-Verbesserung** - Bestehende Inhalte optimieren
- **Template-System** - Vorgefertigte Prompt-Vorlagen
- **Service-Integration** - `firebase-ai-service.ts` mit Fehlerbehandlung

#### E-Mail-Versand & Analytics
- **E-Mail-Service Integration** - SendGrid mit Template-System
- **Personalisierung** - `{{firstName}}`, `{{company}}`, etc.
- **Versand-Modal** - Vollständiger E-Mail-Workflow
- **Analytics Dashboard** (`/dashboard/pr/campaigns/[id]/analytics`) - Umfassende Metriken
- **Empfänger-Tracking** - Individuelle Öffnungs- und Klick-Statistiken
- **Real-time Updates** - Live-Aktualisierung der Statistiken

### 🚧 Verbesserungspotentiale für KI-Assistent

#### Strukturelle Verbesserungen
- [ ] **Getrennte Feld-Generierung** - Headline und Body separat generieren
- [ ] **Intelligente Übernahme** - Automatische Zuweisung zu Titel/Content-Feldern
- [ ] **Erweiterte Templates** - Branchenspezifische und detailliertere Prompts
- [ ] **Prompt-Engineering** - Optimierte System-Prompts für bessere Qualität

#### UX-Optimierungen
- [ ] **Workflow-Verbesserung** - Schrittweise Generierung mit Zwischenergebnissen
- [ ] **Live-Vorschau** - Echtzeit-Preview während der Generierung
- [ ] **Tonality-Optionen** - Verschiedene Schreibstile (formal, modern, technisch)
- [ ] **Iterative Bearbeitung** - Mehrfache Verbesserungszyklen

#### Advanced Features
- [ ] **Mehrsprachigkeit** - DE/EN Pressemitteilungen
- [ ] **Branchenkontext** - CRM-Daten für bessere Personalisierung
- [ ] **A/B-Testing** - Verschiedene Varianten generieren
- [ ] **SEO-Optimierung** - Keywords und Meta-Tags generieren

## 🛠 Nächste Entwicklungsschritte

### Phase 1: Strukturierte KI-Generierung (2-3 Tage)

```typescript
// Erweiterte KI-Service API
interface StructuredPressRelease {
  headline: string;
  subheadline?: string;
  body: string;
  boilerplate: string;
  quotes: Array<{
    person: string;
    role: string;
    text: string;
  }>;
}

// Neue Generierungs-Modi
type GenerationMode = 
  | 'full_release'      // Komplette Pressemitteilung
  | 'headline_only'     // Nur Schlagzeile
  | 'body_only'         // Nur Haupttext
  | 'improve_headline'  // Headline verbessern
  | 'improve_body'      // Body verbessern
```

### Phase 2: Template-System Überarbeitung (1-2 Tage)

```typescript
// Erweiterte Template-Struktur
interface AITemplate {
  id: string;
  title: string;
  category: 'product' | 'corporate' | 'partnership' | 'research' | 'event';
  industry?: string[];
  prompt: {
    system: string;
    user: string;
    context?: string;
  };
  examples: {
    input: string;
    output: StructuredPressRelease;
  }[];
  tone: 'formal' | 'modern' | 'technical' | 'startup';
}
```

### Phase 3: UX-Verbesserungen (2-3 Tage)

```typescript
// Mehrstufiger Generierungs-Workflow
const KIWorkflow = {
  step1: 'Branche und Kontext auswählen',
  step2: 'Kern-Informationen eingeben',
  step3: 'Tonality und Stil festlegen', 
  step4: 'Headline generieren und verfeinern',
  step5: 'Body-Text erstellen und optimieren',
  step6: 'Finale Übernahme in Kampagne'
}
```

### Phase 4: CRM-Integration (1-2 Tage)

```typescript
// CRM-Kontext für bessere Generierung
interface GenerationContext {
  company?: Company;        // Aus CRM-System
  industry?: string;        // Automatisch ermittelt
  previousReleases?: string[]; // Für konsistenten Stil
  brandVoice?: BrandVoice;  // Gespeicherte Marken-Stimme
}
```

## 🎨 Neue UI/UX Konzepte

### KI-Assistent Workflow
```
1. Context Setup
   ├── Branche auswählen (Tech, Healthcare, Finance, etc.)
   ├── Zielgruppe definieren (Fachpresse, Verbraucher, B2B)
   └── Tonality festlegen (Professional, Modern, Technical)

2. Content Generation
   ├── Kern-Informationen eingeben
   ├── Headline generieren (3 Varianten)
   ├── Body-Text erstellen
   └── Interative Verbesserung

3. Final Review
   ├── Strukturierte Vorschau
   ├── Feld-Zuordnung bestätigen
   └── Übernahme in Kampagne
```

### Modal-Layout Redesign
- **Sidebar:** Context & Templates
- **Main Area:** Generation & Preview  
- **Footer:** Actions & Progress

## 💡 Technische Verbesserungen

### Prompt Engineering
```typescript
// Optimierte System-Prompts
const SYSTEM_PROMPTS = {
  headline: `Du bist ein erfahrener PR-Experte. Erstelle prägnante, journalistisch ansprechende Headlines.
  
  HEADLINE-REGELN:
  - Max. 10-12 Wörter
  - Aktive Sprache
  - Newsworthy Hook
  - Keine Superlative ohne Beleg
  - Deutsche Rechtschreibung perfekt
  
  FORMAT: Nur die Headline, keine Erklärungen.`,
  
  body: `Du bist ein PR-Profi und erstellst den Haupttext einer Pressemitteilung.
  
  STRUKTUR:
  1. Lead (5 W-Fragen in 2-3 Sätzen)
  2. Details & Hintergrund (3-4 Absätze)
  3. Zitat (authentisch, relevant)
  4. Weitere Details/Kontext
  5. Boilerplate-Platzhalter
  
  STIL: Sachlich, präzise, journalistisch`
};
```

### API-Verbesserungen
```typescript
// Erweiterte API-Endpoints
POST /api/ai/generate-structured  // Strukturierte Generierung
POST /api/ai/improve-section      // Einzelne Abschnitte verbessern
POST /api/ai/analyze-tone         // Tonalität analysieren
POST /api/ai/suggest-keywords     // SEO-Keywords vorschlagen
```

## 🚀 Implementierungs-Prioritäten

### 🔥 High Priority (Woche 1)
1. **Strukturierte Generierung** - Headline/Body getrennt
2. **Intelligente Übernahme** - Automatische Feld-Zuweisung  
3. **Verbesserte Templates** - Branchenspezifische Prompts
4. **Prompt-Optimierung** - Bessere System-Prompts

### 🔶 Medium Priority (Woche 2)
1. **UX-Redesign** - Mehrstufiger Workflow
2. **Context-Integration** - CRM-Daten nutzen
3. **Tonality-Optionen** - Verschiedene Schreibstile
4. **Live-Vorschau** - Echtzeit-Preview

### 🔵 Nice-to-Have (Woche 3+)
1. **Mehrsprachigkeit** - EN/DE Support
2. **A/B-Testing** - Varianten generieren
3. **SEO-Features** - Keyword-Optimierung
4. **Brand Voice** - Konsistente Marken-Stimme

## 📁 Erweiterte Dateistruktur

```
src/app/dashboard/pr/
├── ai/                           # 🆕 KI-spezifische Features
│   ├── templates/               # Template-Management
│   │   └── page.tsx
│   ├── settings/                # KI-Einstellungen
│   │   └── page.tsx
│   └── usage/                   # Usage-Analytics
│       └── page.tsx

src/components/pr/ai/             # 🆕 KI-Komponenten
├── StructuredGenerationModal.tsx # Neue strukturierte Generierung
├── TemplateSelector.tsx         # Verbesserter Template-Picker
├── ToneSelector.tsx             # Tonality-Auswahl
├── ContextSetup.tsx             # Kontext-Konfiguration
├── ProgressStepper.tsx          # Workflow-Steps
└── ResultPreview.tsx            # Strukturierte Vorschau

src/lib/ai/
├── prompt-templates.ts          # 🆕 Optimierte Prompts
├── generation-context.ts        # 🆕 Kontext-Management
├── structured-generator.ts      # 🆕 Strukturierte API
└── tone-analyzer.ts            # 🆕 Tonalitäts-Analyse

src/types/
└── ai.ts                       # 🆕 KI-spezifische Types
```

## 🎯 Erfolgs-Metriken

### KI-Assistent Adoption
- **Nutzungsrate:** % der Kampagnen mit KI-Generierung
- **Effizienz:** Zeit von Start bis fertiger Pressemitteilung
- **Qualität:** User-Bewertungen der generierten Inhalte
- **Iterationen:** Durchschnittliche Verbesserungszyklen

### Content-Qualität  
- **Struktur-Score:** Vollständigkeit der generierten Elemente
- **Journalistischer Standard:** Einhaltung der 5 W-Fragen
- **Lesbarkeit:** Flesch-Reading-Score für deutsche Texte
- **Brand Consistency:** Konsistenz zur Unternehmens-Stimme

---

**KI-Integration Status:** 🟡 Grundfunktionen implementiert, Optimierungen folgen  
**Nächster Meilenstein:** Strukturierte Generierung mit getrennten Feldern  
**Geschätzter Aufwand für KI-Optimierung:** 6-8 Entwicklungstage