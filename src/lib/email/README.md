# PR-Kampagnen Versand - Implementierungsplan

## Übersicht

Dieses Dokument beschreibt die technische Umsetzung der überarbeiteten PR-Kampagnen-Versandseite. Die neue Implementierung strukturiert den Versandprozess in drei logische Stufen und verbessert das Nutzererlebnis durch eine intuitivere Benutzeroberfläche.

## Projektstruktur

### 1. Neue Komponenten

```
src/components/pr/
├── EmailComposer/
│   ├── EmailComposer.tsx          # Hauptkomponente für 3-Stufen-Prozess
│   ├── StepIndicator.tsx          # Fortschrittsanzeige
│   ├── Step1Content.tsx           # Stufe 1: Anschreiben verfassen
│   ├── Step2Details.tsx           # Stufe 2: Versand-Details
│   ├── Step3Preview.tsx           # Stufe 3: Vorschau & Versand
│   ├── VariablesModal.tsx         # Modal für Variablen-Übersicht
│   └── RecipientManager.tsx       # Empfänger-Verwaltung
```

### 2. Erweiterte Email-Services

```
src/lib/email/
├── README.md                      # Dieses Dokument
├── email-service.ts               # Erweitert um Test-Email-Funktionalität
├── email-composer-service.ts      # NEU: Service für Email-Komposition
└── email-scheduler-service.ts     # NEU: Service für geplanten Versand
```

### 3. Aktualisierte Types

```
src/types/
├── email.ts                       # Erweitert um neue Interfaces
└── email-composer.ts              # NEU: Types für den Composer
```

## Implementierungsschritte

### Phase 1: Grundstruktur (Tag 1-2)

#### 1.1 Type-Definitionen erstellen
- [ ] Interface `EmailComposerState` für den Zustand des 3-Stufen-Prozesses
- [ ] Interface `EmailDraft` für Zwischenspeicherung
- [ ] Type `ComposerStep` für die Navigation zwischen Stufen
- [ ] Interface `TestEmailRequest` für Test-Versand

#### 1.2 Basis-Komponente aufbauen
- [ ] `EmailComposer.tsx` mit State-Management (useState/useReducer)
- [ ] `StepIndicator.tsx` für visuelle Fortschrittsanzeige
- [ ] Navigation zwischen den Stufen implementieren
- [ ] Validierung für jeden Schritt

### Phase 2: Stufe 1 - Anschreiben verfassen (Tag 3-4)

#### 2.1 TipTap-Editor Integration
- [ ] TipTap-Editor für Rich-Text-Eingabe konfigurieren
- [ ] Toolbar mit relevanten Formatierungsoptionen
- [ ] Variable-Insertion-Funktion in Toolbar
- [ ] Auto-Save Funktionalität

#### 2.2 Variablen-Management
- [ ] `VariablesModal.tsx` implementieren
- [ ] Variablen-Liste aus Campaign-Context laden
- [ ] Copy-to-Clipboard Funktionalität
- [ ] Variable-Preview im Modal

#### 2.3 Template-System
- [ ] Zusammenführung der Felder (Begrüßung, Einleitung, Schluss)
- [ ] Migration bestehender Templates
- [ ] Variable-Replacement-Logic

### Phase 3: Stufe 2 - Versand-Details (Tag 5-6)

#### 3.1 Empfänger-Management
- [ ] `RecipientManager.tsx` implementieren
- [ ] Verteilerlisten-Auswahl (bestehend)
- [ ] Manuelle Empfänger-Eingabe (neu)
- [ ] Validierung von Email-Adressen
- [ ] Duplikat-Prüfung

#### 3.2 Absender-Management
- [ ] Kontakt-Auswahl aus Company-Kontakten
- [ ] Fallback: Manuelle Absender-Eingabe
- [ ] Absender-Vorschau
- [ ] Signatur-Integration

#### 3.3 Email-Metadaten
- [ ] Betreff-Eingabe mit Variablen-Support
- [ ] Vorschautext (Pre-Header) Eingabe
- [ ] Character-Count für Betreff/Pre-Header
- [ ] Preview in verschiedenen Email-Clients

### Phase 4: Stufe 3 - Vorschau & Versand (Tag 7-8)

#### 4.1 Email-Vorschau
- [ ] Responsive Email-Preview
- [ ] Desktop/Mobile Toggle
- [ ] Variable-Replacement in Echtzeit
- [ ] Verschiedene Empfänger-Perspektiven

#### 4.2 Test-Versand
- [ ] Test-Email-Service implementieren
- [ ] Validierung der Test-Email-Adresse
- [ ] Feedback nach erfolgreichem Test-Versand
- [ ] Error-Handling für fehlgeschlagene Tests

#### 4.3 Finaler Versand
- [ ] "Jetzt senden" Funktionalität
- [ ] "Versand planen" Dialog
- [ ] Kalender-Integration für geplante Versände
- [ ] Bestätigungs-Dialog vor finalem Versand

### Phase 5: Backend-Integration (Tag 9-10)

#### 5.1 Email-Service Erweiterungen
```typescript
// email-service.ts Erweiterungen
- sendTestEmail(draft: EmailDraft, testRecipient: string): Promise<boolean>
- validateEmailContent(content: EmailContent): ValidationResult
- scheduleEmail(campaign: PRCampaign, scheduledDate: Date): Promise<string>
```

#### 5.2 Email-Composer-Service (NEU)
```typescript
// email-composer-service.ts
- saveDraft(campaignId: string, draft: EmailDraft): Promise<void>
- loadDraft(campaignId: string): Promise<EmailDraft | null>
- mergeEmailFields(draft: EmailDraft): string
- replaceVariables(content: string, variables: Record<string, string>): string
```

#### 5.3 Email-Scheduler-Service (NEU)
```typescript
// email-scheduler-service.ts
- scheduleEmailCampaign(campaign: PRCampaign, date: Date): Promise<ScheduledJob>
- cancelScheduledEmail(jobId: string): Promise<void>
- getScheduledEmails(userId: string): Promise<ScheduledJob[]>
- createCalendarEntry(campaign: PRCampaign, date: Date): Promise<void>
```

### Phase 6: Testing & Optimierung (Tag 11-12)

#### 6.1 Unit Tests
- [ ] Component Tests für alle neuen Komponenten
- [ ] Service Tests für Email-Funktionalitäten
- [ ] Integration Tests für den Gesamt-Flow

#### 6.2 E2E Tests
- [ ] Kompletter 3-Stufen-Prozess
- [ ] Test-Email-Versand
- [ ] Geplanter Versand
- [ ] Error-Szenarien

#### 6.3 Performance-Optimierung
- [ ] Lazy Loading für TipTap-Editor
- [ ] Debouncing für Auto-Save
- [ ] Optimierte Variable-Replacement
- [ ] Email-Preview-Caching

## Technische Details

### State Management

```typescript
interface EmailComposerState {
  currentStep: 1 | 2 | 3;
  draft: EmailDraft;
  validation: StepValidation;
  isLoading: boolean;
  errors: Record<string, string>;
}

interface EmailDraft {
  campaignId: string;
  content: {
    body: string; // Rich-Text Content
    subject: string;
    preheader: string;
  };
  recipients: {
    lists: string[];
    manual: Array<{ name: string; email: string }>;
  };
  sender: {
    type: 'contact' | 'manual';
    contactId?: string;
    manual?: { name: string; email: string; title?: string };
  };
  scheduledAt?: Date;
}
```

### API Endpoints

```typescript
// Neue API Routes
POST   /api/email/test           # Test-Email versenden
POST   /api/email/schedule       # Email-Versand planen
DELETE /api/email/schedule/:id   # Geplanten Versand stornieren
GET    /api/email/drafts/:id     # Draft laden
PUT    /api/email/drafts/:id     # Draft speichern
```

### Datenbank-Schema Erweiterungen

```typescript
// Firestore Collections
email_drafts: {
  campaignId: string;
  userId: string;
  content: EmailDraft;
  lastSaved: Timestamp;
  version: number;
}

scheduled_emails: {
  campaignId: string;
  userId: string;
  scheduledAt: Timestamp;
  status: 'pending' | 'sent' | 'cancelled';
  jobId: string;
  calendarEventId?: string;
}
```

## Migration bestehender Funktionalität

### Zu migrierende Komponenten
1. `EmailSendModal.tsx` → Funktionalität in neue Struktur integrieren
2. Bestehende Email-Templates → Kompatibilität sicherstellen
3. Variable-System → In TipTap-Editor integrieren

### Backwards Compatibility
- Alte Email-Kampagnen bleiben lesbar
- Bestehende Templates funktionieren weiterhin
- Graduelle Migration möglich

## Best Practices

### Code-Qualität
- TypeScript strict mode
- Comprehensive error handling
- Loading states für alle async operations
- Accessibility (ARIA labels, keyboard navigation)

### UX-Prinzipien
- Clear visual hierarchy
- Immediate feedback
- Progressive disclosure
- Mobile-responsive design

### Performance
- Debounced auto-save (500ms)
- Lazy load heavy components
- Optimistic UI updates
- Client-side validation

## Abhängigkeiten

### Neue Dependencies
```json
{
  "@tiptap/react": "^2.1.0",
  "@tiptap/starter-kit": "^2.1.0",
  "@tiptap/extension-variable": "^2.1.0",
  "react-hook-form": "^7.48.0",
  "date-fns": "^2.30.0"
}
```

### Bestehende Dependencies
- Firebase Firestore
- SendGrid API
- Catalyst UI Components
- Next.js App Router

## Zeitplan

| Phase | Dauer | Abhängigkeiten |
|-------|-------|----------------|
| Phase 1: Grundstruktur | 2 Tage | - |
| Phase 2: Stufe 1 | 2 Tage | Phase 1 |
| Phase 3: Stufe 2 | 2 Tage | Phase 1 |
| Phase 4: Stufe 3 | 2 Tage | Phase 1, Email-Service |
| Phase 5: Backend | 2 Tage | Phase 1-4 |
| Phase 6: Testing | 2 Tage | Phase 1-5 |
| **Gesamt** | **12 Tage** | |

## Risiken & Mitigations

### Technische Risiken
1. **TipTap-Integration**: Komplexität der Variable-Integration
   - *Mitigation*: Frühzeitiger Proof-of-Concept

2. **Email-Scheduling**: Zuverlässigkeit des Scheduling-Systems
   - *Mitigation*: Redundante Systeme, Monitoring

3. **Performance**: Große Empfängerlisten
   - *Mitigation*: Pagination, Batch-Processing

### Business Risiken
1. **User Adoption**: Änderung des bekannten Workflows
   - *Mitigation*: Schrittweise Einführung, User-Training

2. **Data Loss**: Verlust von Email-Entwürfen
   - *Mitigation*: Auto-Save, Versioning

## Monitoring & Logging

### Zu trackende Metriken
- Completion rate per step
- Time spent per step
- Test email send rate
- Schedule vs immediate send ratio
- Error rates per step

### Logging
```typescript
// Structured logging für jeden Schritt
logger.info('EmailComposer:StepCompleted', {
  campaignId,
  step,
  duration,
  userId
});
```

## Nächste Schritte

1. Review und Genehmigung dieses Plans
2. Setup der Entwicklungsumgebung
3. Erstellung der Type-Definitionen
4. Implementierung der Basis-Komponente
5. Iterative Entwicklung gemäß Phasenplan

---

*Letztes Update: 08.07.2025*
*Version: 1.0*