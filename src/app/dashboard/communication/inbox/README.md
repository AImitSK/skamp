# Finaler Implementierungsplan: E-Mail Inbox für CeleroPress

## 📋 Übersicht

Vollständige E-Mail-Inbox Integration für CeleroPress (ehemals SKAMP) mit Multi-Tenancy-Support für PR-Agenturen und deren Kunden. Integration mit vorhandener Gemini KI.

## ✅ Bereits implementiert

### Frontend Komponenten
- **Inbox Hauptseite** (`/dashboard/communication/inbox/page.tsx`)
  - Thread-basierte E-Mail-Ansicht
  - Ordner-Navigation (Posteingang, Gesendet, Entwürfe, etc.)
  - Suchfunktion
- **InboxSidebar** - Ordnerstruktur mit Unread-Counts
- **EmailList** - Thread-Liste mit Vorschau
- **EmailViewer** - E-Mail-Anzeige mit Thread-Historie
- **ComposeEmail** - E-Mail verfassen mit RichTextEditor
- **Mock-Daten** für Entwicklung

### Typen & Interfaces
- **EmailMessage** mit Multi-Tenancy (BaseEntity)
- **EmailThread** für Konversations-Gruppierung
- **EmailAccount** Struktur definiert

### Bestehende Infrastruktur
- **SendGrid Integration** für E-Mail-Versand
- **Domain-Verifizierung** bereits implementiert
- **Auth Middleware** mit organizationId
- **CRM Service** mit Kontakt-Suche
- **Organization Service** mit Team-Management
- **API Client** mit Authentication
- **Google Gemini KI** mit strukturierter Textgenerierung

## 🆕 Zu implementieren

### 1. E-Mail-Adressen Verwaltung (Erweitert)

#### 1.1 Datenmodell
```typescript
// src/types/email-enhanced.ts
interface EmailAddress extends BaseEntity {
  // Identifikation
  email: string; // vollständige Adresse: presse@domain.de
  localPart: string; // "presse"
  domainId: string; // Referenz zur verifizierten Domain
  domain?: EmailDomain; // Populated
  
  // Konfiguration
  displayName: string; // "Pressestelle ABC GmbH"
  isActive: boolean;
  isDefault: boolean;
  
  // Erweitert: E-Mail-Aliasing
  aliasType?: 'specific' | 'catch-all' | 'pattern';
  aliasPattern?: string; // z.B. "pr-*" für pr-2024@, pr-sommer@
  
  // Signatur
  signatureId?: string;
  signature?: EmailSignature; // Populated
  
  // Inbox Settings
  inboxEnabled: boolean;
  autoReply?: string;
  forwardTo?: string[]; // Weiterleitung an andere Adressen
  
  // Auto-Routing Regeln
  routingRules?: Array<{
    id: string;
    name: string;
    conditions: {
      subject?: string; // Contains
      from?: string; // Email oder Domain
      keywords?: string[];
    };
    actions: {
      assignTo?: string[]; // User IDs
      addTags?: string[];
      setPriority?: 'low' | 'normal' | 'high';
      autoReply?: string; // Template ID
    };
  }>;
  
  // Team-Zuweisungen (für Agenturen)
  assignedUserIds: string[]; // Team-Mitglieder
  clientId?: string; // Wenn kundenspezifisch
  clientName?: string; // "Kunde ABC GmbH"
  
  // Berechtigungen
  permissions: {
    read: string[]; // User IDs die lesen dürfen
    write: string[]; // User IDs die antworten dürfen
    manage: string[]; // User IDs die verwalten dürfen
  };
  
  // Statistiken
  lastUsedAt?: Timestamp;
  emailsSent?: number;
  emailsReceived?: number;
  
  // KI-Einstellungen (nutzt vorhandene Gemini Integration)
  aiSettings?: {
    enabled: boolean;
    autoSuggest: boolean;
    autoCategorize: boolean;
    preferredTone?: 'formal' | 'modern' | 'technical' | 'startup';
    customPromptContext?: string; // Zusätzlicher Kontext für KI
  };
}

interface EmailSignature extends BaseEntity {
  name: string;
  content: string; // HTML
  isDefault: boolean;
  
  // Zuordnungen
  emailAddressIds: string[]; // Welche E-Mail-Adressen nutzen diese Signatur
  
  // Variablen
  variables: {
    includeUserName?: boolean;
    includeUserTitle?: boolean;
    includeCompanyName?: boolean;
    includePhone?: boolean;
    includeWebsite?: boolean;
    includeSocialLinks?: boolean;
  };
  
  // Templates für verschiedene Kontexte
  variants?: Array<{
    id: string;
    name: string;
    condition: 'first-contact' | 'reply' | 'follow-up';
    content: string;
  }>;
}

// Email Templates für häufige Antworten
interface EmailTemplate extends BaseEntity {
  name: string;
  category: 'response' | 'follow-up' | 'thank-you' | 'decline' | 'custom';
  subject: string;
  content: string; // Mit Merge-Tags: {{contact.firstName}}, {{campaign.title}}
  
  // Kontext-basierte Aktivierung
  triggers?: {
    type: 'manual' | 'auto-suggest';
    conditions?: {
      intentType?: string[]; // Für KI-Integration
      keywords?: string[];
      sentiment?: 'positive' | 'negative' | 'neutral';
    };
  };
  
  // Verwendungs-Statistiken
  usageCount?: number;
  lastUsedAt?: Timestamp;
  successRate?: number; // Basierend auf Antworten
}
```

#### 1.2 Erweiterte Thread-Verwaltung
```typescript
// src/types/inbox-enhanced.ts - ERWEITERT
interface EmailThread extends BaseEntity {
  // ... existing fields ...
  
  // Erweiterte Thread-Zuordnung
  threadingStrategy: 'headers' | 'subject' | 'ai-semantic' | 'manual';
  confidence?: number; // 0-100, wie sicher die Zuordnung ist
  
  // Thread-Status
  status: 'active' | 'waiting' | 'resolved' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // SLA Tracking
  sla?: {
    firstResponseDue?: Timestamp;
    resolutionDue?: Timestamp;
    responded?: boolean;
    respondedAt?: Timestamp;
  };
  
  // KI-Analyse (nutzt vorhandene Gemini Integration)
  aiAnalysis?: {
    intent?: 'question' | 'interest' | 'complaint' | 'request-material' | 'other';
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics?: string[];
    suggestedActions?: string[];
    analyzedAt?: Timestamp;
    generatedBy?: 'gemini'; // Tracking welche KI verwendet wurde
  };
}
```

### 2. PR-Kampagnen Integration

#### 2.1 Kampagnen-Service Anpassung
```typescript
// src/app/api/sendgrid/send-pr-campaign/route.ts - ANGEPASST
interface SendPRCampaignRequest {
  // ... existing fields ...
  
  // NEU: Absender-Auswahl
  fromEmailAddressId: string; // Referenz zu EmailAddress
  fromEmail?: string; // Überschreibbar für Kompatibilität
  
  // NEU: Thread-Management
  threadStrategy?: 'campaign-id' | 'subject' | 'manual';
  campaignThreadId?: string; // Für Gruppierung aller Antworten
}

// Anpassung im Code:
const emailAddress = await emailAddressService.get(data.fromEmailAddressId);
const signature = await signatureService.get(emailAddress.signatureId);

const msg = {
  from: {
    email: emailAddress.email,
    name: emailAddress.displayName
  },
  replyTo: emailAddress.email, // Antworten kommen ins System
  subject: `[CELEROPRESS-${campaignId}] ${data.campaignEmail.subject}`,
  // ... rest of message
  
  // Custom Headers für Tracking
  headers: {
    'X-CELEROPRESS-Campaign': campaignId,
    'X-CELEROPRESS-Thread': campaignThreadId,
    'X-CELEROPRESS-EmailAddress': emailAddressId
  }
};
```

### 3. Settings UI (Erweitert)

#### 3.1 E-Mail-Adressen Verwaltung
**Route:** `/dashboard/settings/email/addresses`

```typescript
// src/app/dashboard/settings/email/addresses/page.tsx
- Liste aller E-Mail-Adressen der Organisation
- Pro Adresse:
  - Domain-Auswahl (Dropdown verifizierter Domains)
  - Local Part eingeben (z.B. "presse")
  - ⚠️ Warnung wenn E-Mail bereits existieren könnte
  - Alias-Konfiguration (optional)
  - Team-Zuweisungen (Multi-Select mit Suche)
  - Client-Zuordnung (optional)
  - Signatur-Auswahl
  - Auto-Routing Regeln
  - Status (Aktiv/Inaktiv)
```

**UI Flow:**
```
E-Mail-Adressen
├── presse@kunde1.de [✓ Aktiv] [✓ Inbox] [🤖 KI]
│   ├── Team: Anna M., Ben K.
│   ├── Client: Kunde ABC GmbH
│   ├── Signatur: "Pressestelle Signatur"
│   └── Routing: 2 Regeln aktiv
├── pr-*@kunde2.de [✓ Aktiv] [✓ Catch-All]
│   ├── Team: Marketing Team
│   └── Auto-Routing nach Betreff
└── [+ Neue E-Mail-Adresse]
```

**Routing-Regel Editor:**
```
Regel: "Wichtige Journalisten"
WENN
  - Absender enthält: @spiegel.de, @faz.net
  - ODER Betreff enthält: "Urgent", "Deadline"
DANN
  - Zuweisen an: Anna M.
  - Priorität: Hoch
  - Tag hinzufügen: "VIP-Presse"
```

#### 3.2 E-Mail Templates
**Route:** `/dashboard/settings/email/templates`

```typescript
// Template-Verwaltung für schnelle Antworten
- Kategorisierte Templates
- Merge-Tags Support
- Verwendungs-Statistiken
- A/B Testing Vorbereitung
```

### 4. Inbox Anpassungen (Erweitert)

#### 4.1 Smart Inbox Features
```typescript
// src/components/inbox/InboxSidebar.tsx - ERWEITERT
- "Meine E-Mails" (Standard)
- "Unbeantwortet" - Requires Action
- "Wartend auf Antwort" - Sent, awaiting response
- "VIP" - Basierend auf Routing-Regeln
- Gruppierung:
  - Nach Client
  - Nach Kampagne
  - Nach Priorität
  - Nach SLA-Status
```

#### 4.2 EmailViewer mit Gemini KI-Integration
```typescript
// src/components/inbox/EmailViewer.tsx - MIT GEMINI INTEGRATION
import { StructuredGenerationModal } from '@/components/pr/ai/StructuredGenerationModal';

<EmailViewer>
  {/* Existing email content */}
  
  {/* Gemini KI-Assistant */}
  {emailAddress.aiSettings?.enabled && (
    <AIAssistantPanel>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          KI-Assistent (Gemini)
        </h4>
        
        {/* Quick Actions mit KI */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button 
            onClick={() => generateReply('professional')}
            className="text-sm"
          >
            Professionelle Antwort
          </Button>
          <Button 
            onClick={() => generateReply('friendly')}
            className="text-sm"
          >
            Freundliche Antwort
          </Button>
          <Button 
            onClick={() => generateReply('decline')}
            className="text-sm"
          >
            Höflich ablehnen
          </Button>
          <Button 
            onClick={() => setShowStructuredModal(true)}
            className="text-sm"
          >
            Individuell erstellen
          </Button>
        </div>
        
        {/* KI-generierte Vorschläge */}
        {aiSuggestions && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Vorgeschlagene Antwort:</p>
            <div className="bg-white p-3 rounded border">
              {aiSuggestions.content}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={useAISuggestion}>
                Verwenden
              </Button>
              <Button size="sm" plain onClick={regenerate}>
                Neu generieren
              </Button>
            </div>
          </div>
        )}
      </div>
    </AIAssistantPanel>
  )}
  
  {/* Template Quick Select */}
  <QuickActions>
    <TemplateSelector 
      templates={emailTemplates}
      onSelect={(template) => {
        // Template mit Merge-Tags füllen
        const filled = fillTemplate(template, { contact, campaign });
        setReplyContent(filled);
      }}
    />
  </QuickActions>
  
  {/* Modal für strukturierte KI-Generierung */}
  {showStructuredModal && (
    <StructuredGenerationModal
      onClose={() => setShowStructuredModal(false)}
      onGenerate={(result) => {
        setReplyContent(result.content);
        setShowStructuredModal(false);
      }}
      existingContent={{
        title: `Re: ${email.subject}`,
        content: email.content
      }}
    />
  )}
</EmailViewer>
```

#### 4.3 Analytics Vorbereitung
```typescript
// src/types/email-analytics.ts - NEU
interface EmailAnalytics {
  // Response-Zeit Tracking
  responseMetrics: {
    averageFirstResponse: Duration;
    averageResolution: Duration;
    byTeamMember: Record<string, {
      assigned: number;
      responded: number;
      avgResponseTime: Duration;
    }>;
  };
  
  // Volume Metrics
  volumeMetrics: {
    received: number;
    sent: number;
    byEmailAddress: Record<string, number>;
    byClient: Record<string, number>;
  };
  
  // KI-Nutzung (Gemini Tracking)
  aiMetrics: {
    suggestionsGenerated: number;
    suggestionsUsed: number;
    averageQuality: number; // User-Feedback
    byIntentType: Record<string, number>;
  };
}
```

### 5. Backend Integration (Erweitert)

#### 5.1 Thread-Matching Service
```typescript
// src/lib/email/thread-matcher-service.ts - NEU
class ThreadMatcherService {
  async matchToThread(
    email: IncomingEmail,
    strategy: ThreadingStrategy
  ): Promise<{ threadId: string; confidence: number }> {
    const matchers = {
      headers: this.matchByHeaders,
      subject: this.matchBySubject,
      aiSemantic: this.matchByAI, // Nutzt Gemini
      contact: this.matchByContact
    };
    
    // Multi-Strategy mit Confidence Score
    const results = await Promise.all(
      Object.entries(matchers).map(([type, matcher]) => 
        matcher(email).then(result => ({ type, ...result }))
      )
    );
    
    // Beste Übereinstimmung wählen
    return results.sort((a, b) => b.confidence - a.confidence)[0];
  }
  
  private async matchByAI(email: IncomingEmail) {
    // Nutzt vorhandene Gemini Integration
    try {
      const prompt = `Analysiere diese E-Mail und finde den passenden Thread:
        Betreff: ${email.subject}
        Absender: ${email.from}
        Erste Zeilen: ${email.preview}
        
        Existierende Threads: ${JSON.stringify(recentThreads)}`;
      
      const result = await firebaseAIService.analyzeEmail(prompt);
      return {
        threadId: result.threadId,
        confidence: result.confidence
      };
    } catch (error) {
      return { threadId: null, confidence: 0 };
    }
  }
}
```

#### 5.2 Email Processing Pipeline
```typescript
// src/lib/email/email-processor.ts - NEU
class EmailProcessor {
  async processIncomingEmail(rawEmail: any): Promise<void> {
    // 1. Parse & Validate
    const parsed = await this.parseEmail(rawEmail);
    
    // 2. Find Email Address
    const emailAddress = await this.findEmailAddress(parsed.to);
    
    // 3. Check Permissions
    const hasAccess = await this.checkAccess(emailAddress);
    
    // 4. Thread Matching
    const thread = await threadMatcher.matchToThread(parsed);
    
    // 5. Apply Routing Rules
    const routing = await this.applyRoutingRules(
      parsed,
      emailAddress.routingRules
    );
    
    // 6. Create Email Message
    const message = await this.createMessage({
      ...parsed,
      threadId: thread.threadId,
      assignedUserIds: routing.assignedUsers,
      priority: routing.priority,
      tags: routing.tags
    });
    
    // 7. Trigger Notifications
    await this.notifyAssignedUsers(message);
    
    // 8. KI-Analyse mit Gemini (wenn aktiviert)
    if (emailAddress.aiSettings?.enabled) {
      await this.analyzeWithAI(message);
    }
  }
  
  private async analyzeWithAI(message: EmailMessage) {
    try {
      const analysis = await firebaseAIService.generateStructured({
        prompt: `Analysiere diese E-Mail:
          Von: ${message.from}
          Betreff: ${message.subject}
          Inhalt: ${message.content}
          
          Identifiziere:
          - Intent (question, interest, complaint, etc.)
          - Sentiment (positive, neutral, negative)
          - Wichtige Themen
          - Empfohlene Aktionen`,
        context: {
          industry: message.organizationIndustry,
          tone: 'formal',
          audience: 'b2b'
        }
      });
      
      // Speichere Analyse
      await this.saveAIAnalysis(message.id, analysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fortsetzung ohne KI-Analyse
    }
  }
}
```

### 6. Datenbank-Struktur (Erweitert)

#### 6.1 Collections
```
email_addresses_enhanced/
├── {id}
│   ├── email: "presse@kunde.de"
│   ├── aliasType: "specific"
│   ├── routingRules: [...]
│   ├── aiSettings: { enabled: true }
│   └── ...

email_templates_enhanced/
├── {id}
│   ├── name: "Journalist Erstantwort"
│   ├── category: "response"
│   ├── content: "Sehr geehrte/r {{contact.firstName}}..."
│   └── triggers: { conditions: {...} }

email_analytics_enhanced/
├── {organizationId}
│   ├── daily/{date}
│   │   ├── responseMetrics: {...}
│   │   ├── volumeMetrics: {...}
│   │   └── aiMetrics: {...}
│   └── patterns/
│       └── {patternId}
```

### 7. Compliance & Audit

```typescript
// src/types/email-audit.ts - NEU
interface EmailAuditLog extends BaseEntity {
  emailMessageId: string;
  
  // Alle Aktionen protokollieren
  actions: Array<{
    userId: string;
    userName: string;
    action: 'view' | 'reply' | 'forward' | 'delete' | 'assign' | 'tag' | 'ai-generate';
    timestamp: Timestamp;
    metadata?: {
      assignedTo?: string[];
      tags?: string[];
      forwardedTo?: string[];
      aiModel?: 'gemini'; // Track KI-Nutzung
      aiPrompt?: string; // Für Audit
    };
  }>;
  
  // DSGVO Compliance
  dataRetention: {
    scheduledDeletion?: Timestamp;
    retentionReason?: string;
    legalHold?: boolean;
  };
  
  // Export-Historie
  exports: Array<{
    exportedBy: string;
    exportedAt: Timestamp;
    format: 'pdf' | 'eml' | 'json';
    reason: string;
  }>;
}
```

### 8. Gemini KI-Integration für E-Mails

#### 8.1 E-Mail-spezifische KI-Services
```typescript
// src/lib/ai/email-ai-service.ts - MIT GEMINI
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
import { GenerationContext } from '@/types/ai';

class EmailAIService {
  // Nutzt vorhandenen Gemini Service
  async generateReply(
    originalEmail: EmailMessage,
    replyType: 'professional' | 'friendly' | 'decline' | 'custom',
    customPrompt?: string
  ): Promise<string> {
    const context: GenerationContext = {
      industry: originalEmail.organizationIndustry || 'Kommunikation',
      tone: replyType === 'professional' ? 'formal' : 'modern',
      audience: 'b2b'
    };
    
    const prompt = this.buildReplyPrompt(originalEmail, replyType, customPrompt);
    
    // Nutzt vorhandenen Gemini Service
    const result = await firebaseAIService.generateStructured({
      prompt,
      context,
      mode: 'generate'
    });
    
    return result.content;
  }
  
  async analyzeEmailIntent(email: EmailMessage): Promise<EmailAnalysisResult> {
    const prompt = `Analysiere diese E-Mail und identifiziere:
      Von: ${email.from}
      Betreff: ${email.subject}
      Inhalt: ${email.content}
      
      Bestimme:
      1. Hauptintention (Anfrage, Interesse, Beschwerde, etc.)
      2. Dringlichkeit (niedrig, normal, hoch, urgent)
      3. Sentiment (positiv, neutral, negativ)
      4. Wichtige Entitäten`;
    
    const result = await firebaseAIService.generateStructured({
      prompt,
      context: { tone: 'technical', audience: 'b2b' }
    });
    
    return this.parseAnalysisResult(result);
  }
  
  async suggestTemplates(
    email: EmailMessage,
    templates: EmailTemplate[]
  ): Promise<EmailTemplate[]> {
    const analysis = await this.analyzeEmailIntent(email);
    
    // Filter Templates basierend auf KI-Analyse
    return templates.filter(template => {
      const triggers = template.triggers;
      if (!triggers) return false;
      
      return triggers.conditions?.intentType?.includes(analysis.intent) ||
             triggers.conditions?.sentiment === analysis.sentiment;
    }).slice(0, 3); // Top 3 Vorschläge
  }
  
  private buildReplyPrompt(
    email: EmailMessage,
    replyType: string,
    customPrompt?: string
  ): string {
    const basePrompt = `Erstelle eine ${replyType} E-Mail-Antwort auf:
      Von: ${email.from}
      Betreff: ${email.subject}
      Inhalt: ${email.content}`;
    
    const typeSpecific = {
      professional: 'Förmlich, sachlich, respektvoll. Verwende Sie-Form.',
      friendly: 'Freundlich, persönlich aber professionell. Du-Form wenn angemessen.',
      decline: 'Höflich ablehnen, Tür offen halten, alternativ vorschlagen.'
    };
    
    return `${basePrompt}
      
      Stil: ${typeSpecific[replyType as keyof typeof typeSpecific]}
      ${customPrompt ? `Zusätzliche Anweisungen: ${customPrompt}` : ''}
      
      Struktur:
      - Passende Anrede
      - Bezug zur Anfrage
      - Hauptinhalt
      - Freundlicher Abschluss`;
  }
}

export const emailAI = new EmailAIService();
```

#### 8.2 UI Integration mit vorhandenen KI-Komponenten
```typescript
// src/components/inbox/EmailAIAssistant.tsx
import { StructuredGenerationModal } from '@/components/pr/ai/StructuredGenerationModal';
import { emailAI } from '@/lib/ai/email-ai-service';

export function EmailAIAssistant({ email, onReplyGenerated }) {
  const [suggestions, setSuggestions] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    // Auto-Analyse bei neuen E-Mails
    const analyze = async () => {
      const analysis = await emailAI.analyzeEmailIntent(email);
      const suggestedTemplates = await emailAI.suggestTemplates(email, templates);
      setSuggestions({ analysis, templates: suggestedTemplates });
    };
    
    if (email && aiSettings.autoSuggest) {
      analyze();
    }
  }, [email]);
  
  const quickReply = async (type: string) => {
    const reply = await emailAI.generateReply(email, type);
    onReplyGenerated(reply);
  };
  
  return (
    <div className="email-ai-assistant">
      {/* Quick Actions */}
      <div className="quick-actions grid grid-cols-2 gap-2">
        <Button onClick={() => quickReply('professional')}>
          <SparklesIcon className="h-4 w-4 mr-1" />
          Professionell antworten
        </Button>
        <Button onClick={() => quickReply('friendly')}>
          Freundlich antworten
        </Button>
        <Button onClick={() => quickReply('decline')}>
          Höflich ablehnen
        </Button>
        <Button onClick={() => setShowModal(true)}>
          Individuell erstellen
        </Button>
      </div>
      
      {/* Vorgeschlagene Templates */}
      {suggestions?.templates && (
        <div className="suggested-templates mt-4">
          <h5 className="text-sm font-medium mb-2">Vorgeschlagene Antworten:</h5>
          {suggestions.templates.map(template => (
            <button
              key={template.id}
              onClick={() => useTemplate(template)}
              className="template-suggestion"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
      
      {/* Nutzt vorhandene StructuredGenerationModal */}
      {showModal && (
        <StructuredGenerationModal
          onClose={() => setShowModal(false)}
          onGenerate={(result) => {
            onReplyGenerated(result.content);
            setShowModal(false);
          }}
          existingContent={{
            title: `Re: ${email.subject}`,
            content: email.content
          }}
        />
      )}
    </div>
  );
}
```

## 📊 Implementierungs-Zeitplan

### Phase 1: Backend Grundlagen (3 Tage)
- [ ] EmailAddress Service mit Routing
- [ ] EmailSignature Service
- [ ] EmailTemplate Service
- [ ] Thread Matcher Service
- [ ] API Routes

### Phase 2: Settings UI (3 Tage)
- [ ] E-Mail-Adressen Verwaltung
- [ ] Routing-Regel Editor
- [ ] Signaturen-Editor
- [ ] Template-Verwaltung
- [ ] Team-Zuweisungen UI

### Phase 3: Inbox Integration (3 Tage)
- [ ] ContactSelector Component
- [ ] ComposeEmail erweitern
- [ ] Smart Inbox Filter
- [ ] Template Quick-Select
- [ ] Media-Integration

### Phase 4: KI-Integration (2 Tage)
- [ ] Email AI Service mit Gemini
- [ ] KI-Assistant UI Component
- [ ] Auto-Analyse Pipeline
- [ ] Template-Vorschläge

### Phase 5: PR-Kampagnen Anpassung (1 Tag)
- [ ] Absender-Auswahl
- [ ] Thread-Management
- [ ] Signatur-Integration

### Phase 6: Testing & Polish (2 Tage)
- [ ] End-to-End Tests
- [ ] Performance Optimierung
- [ ] Dokumentation
- [ ] Onboarding-Flow

**Gesamt: ~14 Arbeitstage**

## 🚀 Deployment Checkliste

1. **SendGrid Konfiguration**
   - [ ] Inbound Parse Webhook: `https://app.celeropress.de/api/webhooks/sendgrid/inbound`
   - [ ] Domain Whitelisting aktiviert
   - [ ] Event Webhooks für Analytics

2. **Firebase Security Rules**
   ```javascript
   // E-Mail-Adressen: Nur Organization-Admins
   match /email_addresses_enhanced/{addressId} {
     allow read: if isOrgMember(resource.data.organizationId);
     allow write: if isOrgAdmin(resource.data.organizationId);
   }
   
   // E-Mails: Nur zugewiesene User
   match /inbox_messages_enhanced/{messageId} {
     allow read: if request.auth.uid in resource.data.assignedUserIds
                 || isOrgAdmin(resource.data.organizationId);
     allow write: if canWriteEmail(resource.data);
   }
   ```

3. **Environment Variables**
   ```env
   # SendGrid
   SENDGRID_INBOUND_SECRET=xxx
   SENDGRID_WEBHOOK_SECRET=xxx
   
   # Gemini KI (bereits vorhanden)
   GEMINI_API_KEY=xxx
   ```

4. **Monitoring**
   - [ ] Email Delivery Rate Dashboard
   - [ ] Response Time Tracking
   - [ ] Error Rate Monitoring
   - [ ] Thread Matching Accuracy
   - [ ] KI-Nutzungs-Metriken

## 🎯 Erfolgs-Metriken

- **Delivery**: E-Mail-Zustellung > 95%
- **Threading**: Korrekte Thread-Zuordnung > 90%
- **Response**: Durchschnittliche Antwortzeit < 2 Stunden
- **Adoption**: 80% der Team-Mitglieder nutzen System aktiv
- **Automation**: 30% der E-Mails durch Routing-Regeln automatisiert
- **KI-Nutzung**: 50% der Antworten mit KI-Unterstützung

## 🔒 Sicherheit & Compliance

1. **Zugriffskontrolle**
   - Strikte Prüfung der assignedUserIds
   - Audit-Log für alle Aktionen
   - 4-Augen-Prinzip für sensible Mails

2. **Datenschutz**
   - Automatische Löschung nach Retention-Policy
   - Verschlüsselung sensibler Daten
   - DSGVO-konforme Datenverarbeitung

3. **Spam & Phishing**
   - SendGrid Spam-Score Integration
   - Phishing-Erkennung (Links, Anhänge)
   - Blacklist-Management

## 🤖 Gemini KI-Features

### Bereits integrierte Features nutzen:
1. **Strukturierte Textgenerierung** - Für E-Mail-Antworten
2. **Template Library** - Anpassbar für E-Mail-Templates
3. **Context-aware Generation** - Branche, Ton, Zielgruppe
4. **Review & Quality Control** - Vor dem Versenden
5. **Error Handling** - Quota-Management, Fallbacks

### Neue E-Mail-spezifische Features:
- Intent-Analyse eingehender E-Mails
- Automatische Template-Vorschläge
- Multi-Varianten Antwort-Generierung
- Sentiment-basiertes Routing
- Thread-Zusammenfassungen
- Response-Zeit Optimierung durch KI-Vorschläge

Die Gemini-Integration ermöglicht es, intelligente E-Mail-Antworten zu generieren und gleichzeitig die menschliche Kontrolle zu behalten.