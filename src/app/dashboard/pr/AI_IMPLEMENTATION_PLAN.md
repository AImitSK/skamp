# 🤖 KI-Assistent Implementierungsplan

## 📋 Aktueller Stand vs. Ziel

### ✅ Was funktioniert bereits:
- Grundlegende Gemini API-Integration
- Modal-UI mit Template-Auswahl
- Einfache Text-Generierung
- Integration in New/Edit-Modi
- Basis-Fehlerbehandlung

### ❌ Was noch fehlt:
- **Strukturierte Ausgabe** (Headline ≠ Body)
- **Intelligente Feld-Übernahme**
- **Qualitäts-Prompts** für professionelle PR
- **UX-Workflow** für optimale Bedienung
- **Context-Bewusstsein** aus CRM-Daten

---

## 🎯 Phase 1: Strukturierte Generierung (Priorität 1)

### 1.1 Neue Datenstrukturen

```typescript
// src/types/ai.ts (NEU)
export interface StructuredPressRelease {
  headline: string;
  subheadline?: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quotes: PRQuote[];
  boilerplate: string;
  callToAction?: string;
}

export interface PRQuote {
  person: string;
  role: string;
  company?: string;
  text: string;
}

export interface GenerationRequest {
  prompt: string;
  mode: 'structured' | 'headline_only' | 'body_only' | 'improve';
  context?: GenerationContext;
  tone?: 'formal' | 'modern' | 'technical' | 'startup';
  industry?: string;
  language?: 'de' | 'en';
}

export interface GenerationContext {
  companyName?: string;
  industry?: string;
  previousStyle?: string;
  targetAudience?: 'b2b' | 'consumer' | 'media';
  brandVoice?: 'professional' | 'innovative' | 'trustworthy';
}
```

### 1.2 Optimierte System-Prompts

```typescript
// src/lib/ai/prompt-templates.ts (NEU)
export const SYSTEM_PROMPTS = {
  structuredGeneration: `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung. 
  
Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

<headline>Prägnante Schlagzeile (max. 80 Zeichen)</headline>
<subheadline>Ergänzende Unterzeile (optional, max. 120 Zeichen)</subheadline>
<lead>Lead-Absatz mit 5 W-Fragen (Wer, Was, Wann, Wo, Warum) in 2-3 Sätzen</lead>
<body>
<p>Detaillierter Hauptteil - Absatz 1 mit Hintergründen</p>
<p>Absatz 2 mit weiteren wichtigen Informationen</p>
<p>Absatz 3 mit Bedeutung und Auswirkungen</p>
</body>
<quote person="[Name]" role="[Position]" company="[Unternehmen]">Authentisches, relevantes Zitat</quote>
<boilerplate>[Kurze Unternehmensbeschreibung als Platzhalter]</boilerplate>

QUALITÄTS-STANDARDS:
- Sachlich und objektiv, keine Werbesprache
- Aktive Sprache, Präsens
- Kurze Sätze (max. 20 Wörter)
- Perfekte deutsche Rechtschreibung
- Journalistische Standards einhalten
- Fakten priorisieren vor Meinungen

Antworte NUR mit der strukturierten Pressemitteilung.`,

  headlineOptimization: `Du bist ein Headline-Spezialist für deutsche Medien.

Erstelle 3 alternative Headlines für diese Pressemitteilung:

HEADLINE-REGELN:
✓ 60-80 Zeichen optimal
✓ Aktive Sprache, keine Passiv-Konstruktionen  
✓ Newsworthy Hook am Anfang
✓ Konkrete Fakten statt Superlative
✓ Zielgruppen-relevant
✓ SEO-bewusst aber natürlich

FORMAT:
1. [Headline-Variante 1]
2. [Headline-Variante 2]  
3. [Headline-Variante 3]

Gib NUR die 3 nummerierten Headlines aus.`,

  toneAdjustment: `Du passt den Schreibstil einer Pressemitteilung an die gewünschte Tonalität an.

TONALITÄTEN:
- FORMAL: Traditionell, konservativ, seriös (Banken, Versicherungen)
- MODERN: Zeitgemäß, innovativ, zugänglich (Tech-Startups, Apps)
- TECHNICAL: Fachspezifisch, präzise, detailliert (B2B-Software, Engineering)
- STARTUP: Dynamisch, disruptiv, visionär (VC-backed, Scale-ups)

Behalte Struktur und Fakten bei, passe nur Sprache und Stil an.`
};
```

### 1.3 Erweiterte API-Integration

```typescript
// src/app/api/ai/generate-structured/route.ts (NEU)
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompt-templates';

interface StructuredGenerateRequest {
  prompt: string;
  context?: GenerationContext;
  tone?: string;
  industry?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: StructuredGenerateRequest = await request.json();
    
    // Kontext-bewusster System-Prompt
    let systemPrompt = SYSTEM_PROMPTS.structuredGeneration;
    
    if (data.context?.companyName) {
      systemPrompt += `\n\nUNTERNEHMENS-KONTEXT: ${data.context.companyName}`;
    }
    
    if (data.industry) {
      systemPrompt += `\nBRANCHE: ${data.industry}`;
    }
    
    if (data.tone) {
      systemPrompt += `\nTONALITÄT: ${data.tone.toUpperCase()}`;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Erstelle eine strukturierte Pressemitteilung für: ${data.prompt}` }
    ]);

    const generatedText = result.response.text();
    
    // Strukturierte Ausgabe parsen
    const structured = parseStructuredOutput(generatedText);

    return NextResponse.json({
      success: true,
      structured: structured,
      rawText: generatedText
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function parseStructuredOutput(text: string): StructuredPressRelease {
  // Regex-basiertes Parsing der strukturierten Ausgabe
  const headlineMatch = text.match(/<headline>(.*?)<\/headline>/s);
  const subheadlineMatch = text.match(/<subheadline>(.*?)<\/subheadline>/s);
  const leadMatch = text.match(/<lead>(.*?)<\/lead>/s);
  const bodyMatch = text.match(/<body>(.*?)<\/body>/s);
  const quoteMatch = text.match(/<quote person="(.*?)" role="(.*?)"(?:\s+company="(.*?)")?>(.?)<\/quote>/s);
  const boilerplateMatch = text.match(/<boilerplate>(.*?)<\/boilerplate>/s);

  // Body-Paragraphen extrahieren
  const bodyParagraphs: string[] = [];
  if (bodyMatch) {
    const paragraphMatches = bodyMatch[1].match(/<p>(.*?)<\/p>/gs);
    if (paragraphMatches) {
      bodyParagraphs.push(...paragraphMatches.map(p => p.replace(/<\/?p>/g, '').trim()));
    }
  }

  return {
    headline: headlineMatch?.[1]?.trim() || '',
    subheadline: subheadlineMatch?.[1]?.trim(),
    leadParagraph: leadMatch?.[1]?.trim() || '',
    bodyParagraphs,
    quotes: quoteMatch ? [{
      person: quoteMatch[1],
      role: quoteMatch[2], 
      company: quoteMatch[3],
      text: quoteMatch[4]?.trim()
    }] : [],
    boilerplate: boilerplateMatch?.[1]?.trim() || ''
  };
}
```

---

## 🎨 Phase 2: UX-Redesign (Priorität 2)

### 2.1 Neues Modal-Design

```typescript
// src/components/pr/ai/StructuredGenerationModal.tsx (NEU)
"use client";

import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { SparklesIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
}

interface GenerationResult {
  headline: string;
  content: string;
  structured: StructuredPressRelease;
}

export default function StructuredGenerationModal({ onClose, onGenerate, existingContent }: Props) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [context, setContext] = useState<GenerationContext>({});
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState<StructuredPressRelease | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const steps = [
    { id: 1, name: 'Kontext', icon: DocumentTextIcon },
    { id: 2, name: 'Inhalt', icon: SparklesIcon },
    { id: 3, name: 'Generierung', icon: SparklesIcon },
    { id: 4, name: 'Review', icon: CheckCircleIcon }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentStep(3);

    try {
      const response = await fetch('/api/ai/generate-structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          tone: context.brandVoice,
          industry: context.industry
        })
      });

      const result = await response.json();
      setGenerated(result.structured);
      setCurrentStep(4);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseResult = () => {
    if (!generated) return;

    // Strukturierte Daten in die Form-Felder übertragen
    const combinedContent = `
      <h1>${generated.headline}</h1>
      ${generated.subheadline ? `<h2>${generated.subheadline}</h2>` : ''}
      <p><strong>${generated.leadParagraph}</strong></p>
      ${generated.bodyParagraphs.map(p => `<p>${p}</p>`).join('')}
      ${generated.quotes.map(q => `<blockquote>"${q.text}" - ${q.person}, ${q.role}</blockquote>`).join('')}
      <p><em>${generated.boilerplate}</em></p>
    `;

    onGenerate({
      headline: generated.headline,
      content: combinedContent,
      structured: generated
    });
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
          
          {/* Header mit Progress */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">KI-Pressemitteilung erstellen</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center space-x-4">
              {steps.map((step) => (
                <div key={step.id} className={`flex items-center ${
                  step.id < currentStep ? 'text-green-600' :
                  step.id === currentStep ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  <step.icon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">{step.name}</span>
                  {step.id < steps.length && (
                    <div className={`w-8 h-0.5 ml-4 ${
                      step.id < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Content basierend auf currentStep */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {currentStep === 1 && <ContextSetupStep context={context} onChange={setContext} />}
            {currentStep === 2 && <ContentInputStep prompt={prompt} onChange={setPrompt} />}
            {currentStep === 3 && <GenerationStep isGenerating={isGenerating} />}
            {currentStep === 4 && <ReviewStep generated={generated} />}
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex justify-between">
            <Button 
              plain 
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1 as any) : onClose()}
            >
              {currentStep === 1 ? 'Abbrechen' : 'Zurück'}
            </Button>
            
            <div className="flex gap-2">
              {currentStep < 3 && (
                <Button 
                  onClick={() => currentStep === 2 ? handleGenerate() : setCurrentStep(currentStep + 1 as any)}
                  disabled={currentStep === 1 && !context.industry}
                >
                  {currentStep === 2 ? 'Generieren' : 'Weiter'}
                </Button>
              )}
              {currentStep === 4 && (
                <Button onClick={handleUseResult}>
                  Übernehmen
                </Button>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### 2.2 Context-Setup Komponente

```typescript
// src/components/pr/ai/ContextSetupStep.tsx (NEU)
interface Props {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
}

export default function ContextSetupStep({ context, onChange }: Props) {
  const industries = [
    'Technologie & Software', 'Finanzdienstleistungen', 'Gesundheitswesen',
    'Automobil', 'Handel & E-Commerce', 'Immobilien', 'Energie & Nachhaltigkeit',
    'Bildung', 'Medien & Entertainment', 'Beratung', 'Sonstiges'
  ];

  const tones = [
    { id: 'professional', label: 'Professionell', desc: 'Seriös, traditionell, vertrauenswürdig' },
    { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ, zugänglich' },
    { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise, detailliert' },
    { id: 'startup', label: 'Startup', desc: 'Dynamisch, disruptiv, visionär' }
  ];

  return (
    <div className="space-y-6">
      <Field>
        <Label>Branche *</Label>
        <Select 
          value={context.industry || ''} 
          onChange={(e) => onChange({ ...context, industry: e.target.value })}
        >
          <option value="">Branche auswählen...</option>
          {industries.map(industry => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>Zielgruppe</Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'b2b', label: 'B2B-Kunden' },
            { id: 'consumer', label: 'Endverbraucher' },
            { id: 'media', label: 'Fachmedien' }
          ].map(audience => (
            <label key={audience.id} className="flex items-center space-x-2">
              <input
                type="radio"
                name="audience"
                value={audience.id}
                checked={context.targetAudience === audience.id}
                onChange={(e) => onChange({ ...context, targetAudience: e.target.value as any })}
              />
              <span className="text-sm">{audience.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field>
        <Label>Tonalität</Label>
        <div className="grid grid-cols-2 gap-3">
          {tones.map(tone => (
            <label key={tone.id} className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              context.brandVoice === tone.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="tone"
                value={tone.id}
                checked={context.brandVoice === tone.id}
                onChange={(e) => onChange({ ...context, brandVoice: e.target.value as any })}
                className="sr-only"
              />
              <div className="font-medium text-sm">{tone.label}</div>
              <div className="text-xs text-gray-600 mt-1">{tone.desc}</div>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
```

---

## 🔧 Phase 3: Integration & Qualität (Priorität 3)

### 3.1 Intelligente Feld-Übernahme

```typescript
// Erweiterung der bestehenden Form-Komponenten
// src/app/dashboard/pr/campaigns/new/page.tsx (AKTUALISIERT)

const handleAiGenerate = (result: GenerationResult) => {
  // Headline in Titel-Feld
  setCampaignTitle(result.headline);
  
  // Strukturierten Content in Rich-Text-Editor
  setPressReleaseContent(result.content);
  
  // Optional: Zusätzliche Metadaten speichern
  const metadata = {
    generatedBy: 'gemini',
    structure: result.structured,
    timestamp: new Date().toISOString()
  };
  
  // In localStorage für spätere Referenz
  localStorage.setItem(`campaign_metadata_${Date.now()}`, JSON.stringify(metadata));
  
  setShowAiModal(false);
};
```

### 3.2 Template-System Verbesserung

```typescript
// src/lib/ai/advanced-templates.ts (NEU)
export const ADVANCED_TEMPLATES = {
  productLaunch: {
    title: 'Produkteinführung',
    category: 'product',
    industries: ['Technologie & Software', 'Automobil', 'Handel & E-Commerce'],
    prompt: {
      system: SYSTEM_PROMPTS.structuredGeneration,
      context: `PRODUKTEINFÜHRUNG-KONTEXT:
- Fokus auf Nutzen und Problemlösung
- Marktdifferenzierung hervorheben  
- Verfügbarkeit und Pricing erwähnen
- Technische Details dosiert einsetzen`,
      userTemplate: `Produktname: [NAME]
Hauptfunktion: [FUNKTION]
Zielgruppe: [ZIELGRUPPE]
Besonderheiten: [ALLEINSTELLUNGSMERKMALE]
Verfügbarkeit: [MARKTSTART]
Preis: [PREISMODELL]`
    },
    examples: [{
      input: "KI-gestützte CRM-Software für kleine Unternehmen",
      output: {
        headline: "Revolutionäre KI-CRM-Software optimiert Kundenbeziehungen für KMU",
        // ... strukturierte Ausgabe
      }
    }]
  },

  partnership: {
    title: 'Strategische Partnerschaft',
    category: 'corporate',
    industries: ['alle'],
    prompt: {
      system: SYSTEM_PROMPTS.structuredGeneration,
      context: `PARTNERSCHAFT-KONTEXT:
- Synergie-Effekte konkret benennen
- Nutzen für beide Partner darstellen
- Kundenmehrwert in den Fokus
- Marktauswirkungen bewerten`,
      userTemplate: `Partner 1: [UNTERNEHMEN_1]
Partner 2: [UNTERNEHMEN_2]  
Art der Zusammenarbeit: [KOOPERATION]
Gemeinsames Ziel: [ZIELSETZUNG]
Kundenvorteil: [NUTZEN]
Zeitrahmen: [DAUER]`
    }
  }
  // ... weitere Templates
};
```

---

## 📊 Phase 4: Qualitätsmessung & Optimierung

### 4.1 Generation Analytics

```typescript
// src/lib/ai/analytics.ts (NEU)
interface GenerationEvent {
  userId: string;
  timestamp: Date;
  template: string;
  industry: string;
  tone: string;
  promptLength: number;
  generationTime: number;
  userRating?: 1 | 2 | 3 | 4 | 5;
  wasUsed: boolean;
  iterationCount: number;
}

export class AIAnalytics {
  static async trackGeneration(event: GenerationEvent) {
    // In Firestore für Analyse speichern
    await analyticsService.logAIUsage(event);
  }

  static async getUsageStats(userId: string) {
    return {
      totalGenerations: number,
      averageRating: number,
      mostUsedTemplates: string[],
      generationTrends: any[]
    };
  }
}
```

### 4.2 Qualitätsbewertung

```typescript
// src/components/pr/ai/QualityRatingModal.tsx (NEU)
export default function QualityRatingModal({ 
  generatedContent, 
  onRate, 
  onClose 
}: {
  generatedContent: StructuredPressRelease;
  onRate: (rating: number, feedback?: string) => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const qualities = [
    'Inhaltliche Relevanz',
    'Journalistischer Stil', 
    'Strukturelle Qualität',
    'Sprachliche Korrektheit',
    'Zielgruppen-Ansprache'
  ];

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogPanel className="max-w-md mx-auto bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Wie bewerten Sie die Qualität der generierten Pressemitteilung?
        </h3>
        
        {/* Star Rating */}
        <div className="flex gap-1 mb-4">
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ⭐
            </button>
          ))}
        </div>

        {/* Quality Checkboxes */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-gray-700">Was hat besonders gut funktioniert?</p>
          {qualities.map(quality => (
            <label key={quality} className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">{quality}</span>
            </label>
          ))}
        </div>

        {/* Feedback */}
        <Textarea
          placeholder="Zusätzliches Feedback (optional)..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
        />

        <div className="flex gap-2 mt-4">
          <Button plain onClick={onClose}>Überspringen</Button>
          <Button onClick={() => onRate(rating, feedback)}>Bewerten</Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
```

---

## 🚀 Implementierungs-Timeline

### Woche 1: Basis-Verbesserungen
- **Tag 1-2:** Strukturierte API (`/api/ai/generate-structured`)
- **Tag 3-4:** Parsing & Feld-Übernahme implementieren
- **Tag 5:** Verbesserte Prompts & Templates

### Woche 2: UX-Redesign  
- **Tag 1-3:** Neues Modal mit Workflow-Steps
- **Tag 4-5:** Context-Setup & Tone-Selection

### Woche 3: Qualität & Polish
- **Tag 1-2:** Analytics & Bewertungssystem
- **Tag 3-4:** Fehlerbehandlung & Edge Cases
- **Tag 5:** Testing & Dokumentation

---

## ✅ Definition of Done

### Must-Have Features:
- ✅ Strukturierte Generierung (Headline + Body getrennt)
- ✅ Intelligente Feld-Übernahme in Form
- ✅ Kontextbewusste Templates (Branche, Tonalität)
- ✅ Mehrstufiger UX-Workflow
- ✅ Qualitätsbewertung durch User

### Nice-to-Have Features:
- 🔵 CRM-Integration für besseren Kontext
- 🔵 Mehrsprachige Generierung (DE/EN)
- 🔵 A/B-Testing verschiedener Varianten
- 🔵 Brand Voice-Konsistenz

### Technische Qualität:
- ✅ Vollständige TypeScript-Typisierung
- ✅ Comprehensive Error Handling
- ✅ Performance-optimiert (<2s Generation)
- ✅ Mobile-responsive UI
- ✅ Accessibility-Standards

---

**🎯 Erfolg messbar durch:**
- **Adoption:** >70% der Kampagnen nutzen KI-Assistent
- **Effizienz:** <5min von Prompt zu fertiger Pressemitteilung  
- **Qualität:** >4.0/5.0 User-Rating
- **Iteration:** <2 Verbesserungszyklen im Durchschnitt