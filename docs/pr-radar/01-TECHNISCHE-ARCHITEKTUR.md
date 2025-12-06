# PR-Radar: Technische Architektur

## Übersicht

Der PR-Radar ist ein KI-gestütztes Themen-Findungs- und Planungsmodul, das proaktiv PR-würdige Themen vorschlägt. Die Architektur integriert sich nahtlos in die bestehende CeleroPress-Infrastruktur.

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  PR-Radar       │  │  Redaktions-    │  │  Weekly Check-in        │  │
│  │  Dashboard      │  │  Kalender       │  │  Chat-Interface         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                         │              │
│           └────────────────────┴─────────────────────────┘              │
│                                │                                        │
│                    ┌───────────┴───────────┐                           │
│                    │  React Query Hooks    │                           │
│                    │  useTopicSuggestions  │                           │
│                    │  useWeeklyCheckin     │                           │
│                    │  useEditorialCalendar │                           │
│                    └───────────┬───────────┘                           │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────┐
│                           API LAYER                                     │
├────────────────────────────────┼────────────────────────────────────────┤
│  ┌─────────────────────────────┴─────────────────────────────────────┐  │
│  │                    /api/pr-radar/*                                │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  POST /topics/generate     → Themen-Vorschläge generieren         │  │
│  │  POST /checkin/analyze     → Weekly Check-in Antworten auswerten  │  │
│  │  GET  /topics              → Alle Topics für Org laden            │  │
│  │  PATCH /topics/:id         → Topic Status ändern                  │  │
│  │  POST /calendar/schedule   → Topic auf Kalender planen            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────┐
│                         GENKIT AI LAYER                                 │
├────────────────────────────────┼────────────────────────────────────────┤
│  ┌─────────────────────────────┴─────────────────────────────────────┐  │
│  │                     src/lib/ai/flows/                             │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │                                                                   │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │  │
│  │  │ silentInterviewer   │  │ topicIdeationFlow                   │ │  │
│  │  │ Flow                │  │                                     │ │  │
│  │  │                     │  │ - Analysiert Unternehmensprofil     │ │  │
│  │  │ - Trigger-Fragen    │  │ - Matched mit externen Trends       │ │  │
│  │  │ - Antwort-Analyse   │  │ - Generiert Topic-Vorschläge        │ │  │
│  │  │ - Topic-Extraktion  │  │ - Bewertet Relevanz (Score)         │ │  │
│  │  └─────────────────────┘  └─────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ trendScannerFlow (Phase 2)                                  │  │
│  │  │                                                             │  │
│  │  │ - Vertex AI Search Integration (Grounding)                  │  │
│  │  │ - Keyword-basierte Trend-Erkennung                          │  │
│  │  │ - News-Matching mit Unternehmensprofil                      │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────┐
│                      FIREBASE / FIRESTORE                               │
├────────────────────────────────┼────────────────────────────────────────┤
│                                │                                        │
│  ┌─────────────────────────────┴─────────────────────────────────────┐  │
│  │                     Collections                                   │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │                                                                   │  │
│  │  organizations/{orgId}                                            │  │
│  │    └─ prRadarSettings: PRRadarSettings                            │  │
│  │                                                                   │  │
│  │  pr_topics/{topicId}                                              │  │
│  │    ├─ organizationId: string                                      │  │
│  │    ├─ source: 'trend_scan' | 'user_interview' | 'seasonal'        │  │
│  │    ├─ headline: string                                            │  │
│  │    ├─ reasoning: string                                           │  │
│  │    ├─ status: 'new' | 'approved' | 'drafted' | 'published'        │  │
│  │    ├─ relevanceScore: number (1-100)                              │  │
│  │    ├─ scheduledDate?: Timestamp                                   │  │
│  │    ├─ linkedProjectId?: string                                    │  │
│  │    └─ createdAt / updatedAt                                       │  │
│  │                                                                   │  │
│  │  pr_checkins/{checkinId}                                          │  │
│  │    ├─ organizationId: string                                      │  │
│  │    ├─ userId: string                                              │  │
│  │    ├─ weekOf: Timestamp                                           │  │
│  │    ├─ responses: CheckinResponse[]                                │  │
│  │    ├─ extractedTopics: string[] (Topic IDs)                       │  │
│  │    └─ createdAt                                                   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Datenmodelle (TypeScript)

### Neue Types in `src/types/pr-radar.ts`

```typescript
// src/types/pr-radar.ts

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Quellen für Topic-Vorschläge
 */
export type TopicSource = 'trend_scan' | 'user_interview' | 'seasonal' | 'manual';

/**
 * Status eines Topics im Workflow
 */
export type TopicStatus = 'new' | 'approved' | 'drafted' | 'scheduled' | 'published' | 'rejected';

/**
 * Typ des generierten Contents
 */
export type ContentType = 'press_release' | 'blog_post' | 'social_media' | 'case_study' | 'interview';

/**
 * PR-Radar Einstellungen pro Organisation
 */
export interface PRRadarSettings {
  // Keywords für Trend-Scanning (Phase 2)
  industryKeywords: string[];
  competitorNames: string[];

  // Unternehmens-Kontext für AI
  companyDescription: string;
  targetAudience: string;
  uniqueSellingPoints: string[];

  // Saisonale Trigger (z.B. Messen, Jahrestage)
  seasonalEvents: SeasonalEvent[];

  // Benachrichtigungen
  weeklyCheckinEnabled: boolean;
  weeklyCheckinDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  notifyOnNewTrends: boolean;
}

/**
 * Saisonales Event (z.B. Messe, Jubiläum)
 */
export interface SeasonalEvent {
  id: string;
  name: string;
  date: Timestamp;
  recurring: 'none' | 'yearly' | 'quarterly' | 'monthly';
  leadTimeDays: number; // Wie viele Tage vorher erinnern
  suggestedContentTypes: ContentType[];
}

/**
 * Ein PR-Topic (Themen-Vorschlag)
 */
export interface PRTopic {
  id: string;
  organizationId: string;

  // Quelle und Kontext
  source: TopicSource;
  sourceContext?: {
    trendUrl?: string;       // Bei trend_scan: Link zur News
    trendHeadline?: string;  // Bei trend_scan: Original-Headline
    checkinId?: string;      // Bei user_interview: Zugehöriger Check-in
    seasonalEventId?: string; // Bei seasonal: Zugehöriges Event
  };

  // Der eigentliche Vorschlag
  headline: string;
  reasoning: string;           // Warum jetzt? Warum relevant?
  suggestedAngle: string;      // Vorgeschlagener Blickwinkel
  suggestedContentType: ContentType;

  // Bewertung
  relevanceScore: number;      // 1-100
  urgencyScore: number;        // 1-100 (wie zeitkritisch)

  // Workflow-Status
  status: TopicStatus;
  rejectionReason?: string;

  // Planung
  scheduledDate?: Timestamp;
  linkedProjectId?: string;    // Wenn ein Projekt erstellt wurde

  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: 'ai' | string;    // 'ai' oder UserId
  approvedBy?: string;
}

/**
 * Weekly Check-in Session
 */
export interface PRCheckin {
  id: string;
  organizationId: string;
  userId: string;

  weekOf: Timestamp;           // Montag der Woche

  // Die gestellten Fragen und Antworten
  responses: CheckinResponse[];

  // Extrahierte Topics aus diesem Check-in
  extractedTopicIds: string[];

  // Status
  status: 'in_progress' | 'completed' | 'skipped';

  createdAt: Timestamp;
  completedAt?: Timestamp;
}

/**
 * Einzelne Frage-Antwort im Check-in
 */
export interface CheckinResponse {
  questionId: string;
  questionText: string;
  answer: string;
  followUpQuestions?: string[];  // Dynamische Nachfragen
  followUpAnswers?: string[];
}

/**
 * Vordefinierte Check-in Fragen (Trigger-basiert)
 */
export interface CheckinQuestion {
  id: string;
  category: 'team' | 'product' | 'customer' | 'event' | 'milestone';
  question: string;
  followUpPrompt: string;        // Prompt für AI-Nachfrage
  suggestedContentType: ContentType;
}
```

---

## Neue Firebase Services

### `src/lib/firebase/pr-radar-service.ts`

```typescript
// src/lib/firebase/pr-radar-service.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './client-init';
import type { PRTopic, PRCheckin, PRRadarSettings, TopicStatus } from '@/types/pr-radar';

export const prRadarService = {
  // ══════════════════════════════════════════════════════════════
  // TOPICS
  // ══════════════════════════════════════════════════════════════

  /**
   * Lädt alle Topics einer Organisation
   */
  async getTopics(
    organizationId: string,
    filters?: {
      status?: TopicStatus[];
      source?: string;
      limit?: number;
    }
  ): Promise<PRTopic[]> {
    let q = query(
      collection(db, 'pr_topics'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PRTopic));
  },

  /**
   * Erstellt ein neues Topic
   */
  async createTopic(topic: Omit<PRTopic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'pr_topics'), {
      ...topic,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  /**
   * Aktualisiert Topic-Status
   */
  async updateTopicStatus(
    topicId: string,
    status: TopicStatus,
    additionalData?: Partial<PRTopic>
  ): Promise<void> {
    const docRef = doc(db, 'pr_topics', topicId);
    await updateDoc(docRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Plant ein Topic für ein bestimmtes Datum
   */
  async scheduleTopic(
    topicId: string,
    scheduledDate: Date,
    projectId?: string
  ): Promise<void> {
    const docRef = doc(db, 'pr_topics', topicId);
    await updateDoc(docRef, {
      status: 'scheduled',
      scheduledDate: Timestamp.fromDate(scheduledDate),
      linkedProjectId: projectId,
      updatedAt: serverTimestamp()
    });
  },

  // ══════════════════════════════════════════════════════════════
  // CHECK-INS
  // ══════════════════════════════════════════════════════════════

  /**
   * Erstellt einen neuen Weekly Check-in
   */
  async createCheckin(
    organizationId: string,
    userId: string
  ): Promise<string> {
    // Montag dieser Woche berechnen
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const docRef = await addDoc(collection(db, 'pr_checkins'), {
      organizationId,
      userId,
      weekOf: Timestamp.fromDate(monday),
      responses: [],
      extractedTopicIds: [],
      status: 'in_progress',
      createdAt: serverTimestamp()
    });

    return docRef.id;
  },

  /**
   * Fügt Antwort zu Check-in hinzu
   */
  async addCheckinResponse(
    checkinId: string,
    response: CheckinResponse
  ): Promise<void> {
    const docRef = doc(db, 'pr_checkins', checkinId);
    const checkin = await getDoc(docRef);

    if (!checkin.exists()) {
      throw new Error('Check-in nicht gefunden');
    }

    const responses = checkin.data().responses || [];
    responses.push(response);

    await updateDoc(docRef, { responses });
  },

  /**
   * Schließt Check-in ab und verknüpft extrahierte Topics
   */
  async completeCheckin(
    checkinId: string,
    extractedTopicIds: string[]
  ): Promise<void> {
    const docRef = doc(db, 'pr_checkins', checkinId);
    await updateDoc(docRef, {
      status: 'completed',
      extractedTopicIds,
      completedAt: serverTimestamp()
    });
  },

  // ══════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════

  /**
   * Lädt PR-Radar Einstellungen einer Organisation
   */
  async getSettings(organizationId: string): Promise<PRRadarSettings | null> {
    const docRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(docRef);

    if (!orgDoc.exists()) return null;

    return orgDoc.data().prRadarSettings || null;
  },

  /**
   * Speichert PR-Radar Einstellungen
   */
  async saveSettings(
    organizationId: string,
    settings: PRRadarSettings
  ): Promise<void> {
    const docRef = doc(db, 'organizations', organizationId);
    await updateDoc(docRef, {
      prRadarSettings: settings,
      updatedAt: serverTimestamp()
    });
  }
};
```

---

## GenKit Flows

### Flow 1: Silent Interviewer (`src/lib/ai/flows/silent-interviewer.ts`)

```typescript
// src/lib/ai/flows/silent-interviewer.ts

import { ai, gemini25FlashModel } from '../genkit-config';
import { z } from 'zod';

// Input Schema
const SilentInterviewerInputSchema = z.object({
  // Unternehmens-Kontext
  companyDescription: z.string().describe('Beschreibung des Unternehmens'),
  industry: z.string().describe('Branche des Unternehmens'),

  // Aktuelle Antworten aus dem Check-in
  responses: z.array(z.object({
    questionId: z.string(),
    question: z.string(),
    answer: z.string()
  })).describe('Bisherige Fragen und Antworten'),

  // Modus
  mode: z.enum(['generate_questions', 'analyze_responses', 'extract_topics'])
});

// Output Schemas
const GeneratedQuestionsSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    category: z.enum(['team', 'product', 'customer', 'event', 'milestone']),
    question: z.string(),
    followUpPrompt: z.string()
  }))
});

const ExtractedTopicsSchema = z.object({
  topics: z.array(z.object({
    headline: z.string(),
    reasoning: z.string(),
    suggestedAngle: z.string(),
    relevanceScore: z.number().min(1).max(100),
    urgencyScore: z.number().min(1).max(100),
    suggestedContentType: z.enum(['press_release', 'blog_post', 'social_media', 'case_study', 'interview']),
    sourceQuestionId: z.string()
  }))
});

export const silentInterviewerFlow = ai.defineFlow(
  {
    name: 'silentInterviewer',
    inputSchema: SilentInterviewerInputSchema,
    outputSchema: z.union([GeneratedQuestionsSchema, ExtractedTopicsSchema])
  },
  async (input) => {
    // ... Implementation siehe System-Prompt Dokument
  }
);
```

### Flow 2: Topic Ideation (`src/lib/ai/flows/topic-ideation.ts`)

```typescript
// src/lib/ai/flows/topic-ideation.ts

import { ai, gemini25FlashModel } from '../genkit-config';
import { z } from 'zod';

const TopicIdeationInputSchema = z.object({
  // Unternehmens-Kontext
  companyContext: z.object({
    name: z.string(),
    description: z.string(),
    industry: z.string(),
    uniqueSellingPoints: z.array(z.string()),
    targetAudience: z.string()
  }),

  // Optionale Trends (für Phase 2)
  currentTrends: z.array(z.object({
    headline: z.string(),
    source: z.string(),
    url: z.string().optional()
  })).optional(),

  // Check-in Antworten zur Anreicherung
  recentCheckinInsights: z.array(z.string()).optional(),

  // Saisonale Events in den nächsten 30 Tagen
  upcomingEvents: z.array(z.object({
    name: z.string(),
    date: z.string(),
    type: z.string()
  })).optional()
});

const TopicIdeationOutputSchema = z.object({
  topics: z.array(z.object({
    headline: z.string(),
    reasoning: z.string(),
    suggestedAngle: z.string(),
    relevanceScore: z.number(),
    urgencyScore: z.number(),
    suggestedContentType: z.string(),
    source: z.enum(['trend_scan', 'user_interview', 'seasonal', 'company_context']),
    trendConnection: z.string().optional()
  }))
});

export const topicIdeationFlow = ai.defineFlow(
  {
    name: 'topicIdeation',
    inputSchema: TopicIdeationInputSchema,
    outputSchema: TopicIdeationOutputSchema
  },
  async (input) => {
    // ... Implementation
  }
);
```

---

## API Routes

### `src/app/api/pr-radar/topics/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { topicIdeationFlow } from '@/lib/ai/flows/topic-ideation';
import { prRadarService } from '@/lib/firebase/pr-radar-service';
import { getServerAuth } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lade Unternehmens-Kontext
    const settings = await prRadarService.getSettings(auth.organizationId);
    if (!settings) {
      return NextResponse.json(
        { error: 'PR-Radar nicht konfiguriert' },
        { status: 400 }
      );
    }

    // GenKit Flow aufrufen
    const result = await topicIdeationFlow({
      companyContext: {
        name: auth.organizationName,
        description: settings.companyDescription,
        industry: settings.industryKeywords.join(', '),
        uniqueSellingPoints: settings.uniqueSellingPoints,
        targetAudience: settings.targetAudience
      },
      upcomingEvents: settings.seasonalEvents
        .filter(e => /* in nächsten 30 Tagen */)
        .map(e => ({
          name: e.name,
          date: e.date.toDate().toISOString(),
          type: e.recurring
        }))
    });

    // Topics in Firestore speichern
    const topicIds = await Promise.all(
      result.topics.map(topic =>
        prRadarService.createTopic({
          organizationId: auth.organizationId,
          source: topic.source,
          headline: topic.headline,
          reasoning: topic.reasoning,
          suggestedAngle: topic.suggestedAngle,
          suggestedContentType: topic.suggestedContentType,
          relevanceScore: topic.relevanceScore,
          urgencyScore: topic.urgencyScore,
          status: 'new',
          createdBy: 'ai'
        })
      )
    );

    return NextResponse.json({
      success: true,
      topicIds,
      count: topicIds.length
    });

  } catch (error) {
    console.error('Error generating topics:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Topic-Generierung' },
      { status: 500 }
    );
  }
}
```

---

## Integration mit bestehenden Modulen

### Projekt-Erstellung aus Topic

Wenn ein Topic genehmigt wird, kann daraus ein CeleroPress-Projekt erstellt werden:

```typescript
// In pr-radar-service.ts

async createProjectFromTopic(
  topicId: string,
  organizationId: string,
  userId: string
): Promise<string> {
  const topic = await this.getTopic(topicId);
  if (!topic) throw new Error('Topic nicht gefunden');

  // Projekt erstellen (nutzt bestehenden project-service)
  const { projectService } = await import('./project-service');

  const projectId = await projectService.create({
    organizationId,
    name: topic.headline,
    description: topic.suggestedAngle,
    type: this.mapContentTypeToProjectType(topic.suggestedContentType),
    stage: 'draft',
    createdBy: userId
  });

  // Topic mit Projekt verknüpfen
  await this.updateTopicStatus(topicId, 'drafted', {
    linkedProjectId: projectId
  });

  return projectId;
}
```

---

## Nächste Schritte

1. **Phase 1 (MVP)**: Silent Interviewer + Basic Topics
2. **Phase 2**: Trend Scanner mit Vertex AI Search
3. **Phase 3**: Redaktionskalender mit Drag & Drop
