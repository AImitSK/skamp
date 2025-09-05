# Distributionsprozess-Dokumentation für Projekt-Pipeline

## Übersicht
Der Distributionsprozess in CeleroPress ermöglicht den Versand von PR-Kampagnen an ausgewählte Kontaktlisten und einzelne Journalisten. Das System bietet einen dreistufigen E-Mail-Composer mit umfangreichen Personalisierungs- und Verwaltungsfunktionen.

## Kernkomponenten des Distributionsprozesses

### 1. Kampagnen-Verwaltung (Campaigns Page)
**Datei**: `src/app/dashboard/pr-tools/campaigns/page.tsx`

#### Hauptfunktionen
- **Kampagnen-Übersicht**: Listenansicht aller PR-Kampagnen
- **Status-Tracking**: Visualisierung des Kampagnenstatus
- **Versand-Modal**: Trigger für den E-Mail-Composer
- **Bulk-Operationen**: Mehrfachauswahl und -aktionen

#### Kampagnen-Entity (PRCampaign)
```typescript
interface PRCampaign {
  id: string;
  title: string;
  status: PRCampaignStatus;
  clientId?: string;
  clientName?: string;
  distributionListId?: string;
  distributionListName: string;
  content: {
    html: string;
    plainText?: string;
  };
  attachedAssets?: AssetInfo[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;
}
```

### 2. E-Mail Versand-System

#### EmailSendModal
**Datei**: `src/components/pr/EmailSendModal.tsx`
- Wrapper für den EmailComposer
- Dialog mit 90vh Höhe
- Callback-Funktionen für onClose und onSent

#### EmailComposer (3-Stufen-Prozess)
**Datei**: `src/components/pr/email/EmailComposer.tsx`

##### Stufe 1: Anschreiben verfassen
- **Rich-Text Editor** (TipTap)
- **Variablen-System**: {{firstName}}, {{lastName}}, {{companyName}}
- **Vorlagen-Unterstützung**
- **HTML & Plain-Text Generierung**

##### Stufe 2: Versand-Details
- **Empfänger-Auswahl**:
  - Verteilerlisten (Multi-Select)
  - Manuelle Empfänger hinzufügen
  - Duplikats-Prüfung
  - Validierung von E-Mail-Adressen
- **Absender-Konfiguration**:
  - Aus Kontakten wählen
  - Manuell eingeben
- **Metadaten**:
  - Betreff
  - Preheader (Vorschautext)

##### Stufe 3: Vorschau & Versand
- **Live-Vorschau** mit echten Kontaktdaten
- **Test-Versand** an ausgewählte Adressen
- **Zeitplanung** (optional)
- **Versand-Bestätigung**

#### EmailComposerState
```typescript
interface EmailComposerState {
  currentStep: 1 | 2 | 3;
  completedSteps: Set<ComposerStep>;
  draft: EmailDraft;
  validation: StepValidation;
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  lastSaved?: Date;
  previewContact?: Contact;
  isPreviewMode: boolean;
}
```

### 3. Verteilerlisten-System

#### Listen-Verwaltung
**Datei**: `src/app/dashboard/contacts/lists/page.tsx`

##### DistributionList Entity
```typescript
interface DistributionList {
  id?: string;
  name: string;
  description?: string;
  type: 'static' | 'dynamic' | 'smart';
  
  // Statische Listen
  contactIds?: string[];
  
  // Dynamische Listen
  filters?: ListFilter[];
  
  // Smart Listen
  smartCriteria?: {
    publications?: string[];
    tags?: string[];
    location?: string;
    language?: string[];
    activityLevel?: 'high' | 'medium' | 'low';
  };
  
  // Metadaten
  contactCount: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  organizationId: string;
  
  // Kategorisierung
  tags?: string[];
  category?: string;
  isActive: boolean;
}
```

##### Listen-Features
- **Grid & Listen-Ansicht** umschaltbar
- **Such- und Filteroptionen**
- **Bulk-Operationen** (Löschen, Exportieren, Duplizieren)
- **Metriken** pro Liste (Kontaktanzahl, letzte Nutzung)
- **CSV-Export** Funktionalität
- **Verschachtelte Kategorien**

### 4. Kontakte-System (CRM)

#### Kontakte-Verwaltung
**Datei**: `src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx`

##### ContactEnhanced Entity
```typescript
interface ContactEnhanced {
  id?: string;
  
  // Persönliche Daten
  firstName: string;
  lastName: string;
  title?: string;
  jobTitle?: string;
  department?: string;
  
  // Kontaktdaten
  emails: Array<{
    email: string;
    type?: 'work' | 'personal' | 'other';
    isPrimary?: boolean;
  }>;
  
  phones: Array<{
    number: string;
    type?: 'mobile' | 'work' | 'home' | 'fax';
    isPrimary?: boolean;
  }>;
  
  // Firma
  companyId?: string;
  companyName?: string;
  
  // Medien & Publikationen
  publications?: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  
  // Social Media
  socialMedia?: Record<string, string>;
  
  // Kommunikation
  preferredChannel?: 'email' | 'phone' | 'social' | 'post';
  language?: string;
  timezone?: string;
  
  // Status & Kategorisierung
  status: 'active' | 'inactive' | 'bounced' | 'unsubscribed';
  tags?: string[];
  notes?: string;
  
  // Aktivität
  lastContactedAt?: Timestamp;
  totalEmailsSent?: number;
  totalEmailsOpened?: number;
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;
}
```

##### Kontakt-Features
- **Detailansicht** mit allen Informationen
- **Beziehungen** zu Firmen und Publikationen
- **Kommunikations-Historie**
- **Social Media Integration**
- **Tags & Kategorisierung**
- **Aktivitäts-Tracking**

### 5. Firmen-Verwaltung
**Datei**: `src/app/dashboard/contacts/crm/companies/[companyId]/page.tsx`

##### CompanyEnhanced Entity
```typescript
interface CompanyEnhanced {
  id?: string;
  
  // Basis-Informationen
  name: string;
  legalName?: string;
  type: 'agency' | 'brand' | 'media' | 'other';
  
  // Kontaktdaten
  emails: Array<{
    email: string;
    type?: string;
    isPrimary?: boolean;
  }>;
  
  phones: Array<{
    number: string;
    type?: string;
    isPrimary?: boolean;
  }>;
  
  website?: string;
  
  // Adresse
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Business-Informationen
  industry?: string;
  employeeCount?: string;
  annualRevenue?: number;
  taxId?: string;
  registrationNumber?: string;
  
  // Beziehungen
  contacts?: string[]; // Contact IDs
  parentCompanyId?: string;
  subsidiaries?: string[];
  
  // Status & Lifecycle
  status: 'active' | 'inactive' | 'prospect' | 'archived';
  lifecycleStage?: 'lead' | 'opportunity' | 'customer' | 'partner';
  
  // Medien-spezifisch
  publications?: string[]; // Publication IDs
  mediaReach?: number;
  mediaType?: string[];
  
  // Metadaten
  tags?: string[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;
}
```

### 6. E-Mail-Service Integration

#### EmailCampaignService
- **Kampagnen-Erstellung** und -Verwaltung
- **Empfänger-Verwaltung** und Deduplizierung
- **Template-System** mit Variablen-Replacement
- **Tracking** (Öffnungen, Klicks)
- **Bounce-Management**

#### EmailService
- **SMTP-Integration** (SendGrid/AWS SES)
- **Batch-Versand** mit Rate-Limiting
- **Personalisierung** pro Empfänger
- **Anhänge-Verwaltung**
- **HTML & Plain-Text** Versionen

## Datenfluss im Distributionsprozess

### 1. Kampagnen-Auswahl
1. User öffnet Kampagnen-Übersicht
2. Wählt Kampagne für Versand aus
3. Klickt auf "Versenden" Button

### 2. E-Mail-Composer öffnet sich
1. **Stufe 1**: Anschreiben wird geladen/bearbeitet
2. **Stufe 2**: Empfängerlisten werden ausgewählt
3. **Stufe 3**: Vorschau und Test-Versand

### 3. Empfänger-Aggregation
1. Listen werden geladen
2. Kontakte werden aggregiert
3. Duplikate werden entfernt
4. Validierung der E-Mail-Adressen

### 4. Personalisierung
1. Template-Variablen werden ersetzt
2. Individuelle Anreden generiert
3. Tracking-Pixel eingefügt

### 5. Versand
1. Batch-Verarbeitung (100er Pakete)
2. Rate-Limiting beachtet
3. Status-Updates in Echtzeit
4. Fehlerbehandlung und Retry-Logic

## Benötigte Werte für Distribution-Phase in Projekt-Pipeline

### Pflichtfelder
1. **campaignId**: PR-Kampagne ID
2. **campaignTitle**: Kampagnentitel
3. **campaignContent**: HTML/Plain-Text Inhalt
4. **distributionStatus**: pending | sending | sent | failed
5. **recipientLists**: Array von Listen-IDs
6. **totalRecipients**: Gesamtzahl Empfänger
7. **sentCount**: Anzahl versendeter E-Mails

### Empfänger-Informationen
8. **recipientDetails**: Array von Empfängern
   - contactId
   - email
   - name
   - company
   - status (pending | sent | bounced | opened)
9. **manualRecipients**: Manuell hinzugefügte Empfänger
10. **excludedRecipients**: Ausgeschlossene Kontakte
11. **duplicatesRemoved**: Anzahl entfernter Duplikate

### Versand-Konfiguration
12. **senderInfo**: Absender-Informationen
13. **subject**: E-Mail-Betreff
14. **preheader**: Vorschautext
15. **scheduledAt**: Geplanter Versandzeitpunkt
16. **timezone**: Zeitzone für Versand

### Content & Personalisierung
17. **emailTemplate**: Verwendetes Template
18. **variablesUsed**: Liste verwendeter Variablen
19. **attachments**: Angehängte Dateien
20. **trackingEnabled**: Tracking aktiviert?

### Performance-Metriken
21. **sendStartedAt**: Versand gestartet
22. **sendCompletedAt**: Versand abgeschlossen
23. **avgSendTime**: Durchschnittliche Versandzeit
24. **batchSize**: Batch-Größe
25. **failedCount**: Anzahl Fehler

### Analytics & Tracking
26. **openRate**: Öffnungsrate
27. **clickRate**: Klickrate
28. **bounceRate**: Bounce-Rate
29. **unsubscribeCount**: Abmeldungen
30. **uniqueOpens**: Eindeutige Öffnungen
31. **totalOpens**: Gesamte Öffnungen
32. **linkClicks**: Link-Klicks Detail

### Fehlerbehandlung
33. **errors**: Array von Fehlern
34. **retryAttempts**: Anzahl Wiederholungsversuche
35. **bounceDetails**: Bounce-Informationen
36. **blockedEmails**: Blockierte E-Mails

### Integration-Punkte
37. **emailServiceProvider**: Verwendeter E-Mail-Service
38. **apiCallsUsed**: Anzahl API-Calls
39. **creditUsed**: Verbrauchte Credits
40. **webhookEvents**: Empfangene Webhook-Events

## Service-Architektur

### Services
1. **prService**: Kampagnen-Verwaltung
2. **listsService**: Verteilerlisten-Verwaltung
3. **contactsEnhancedService**: Kontakte-Verwaltung
4. **companiesEnhancedService**: Firmen-Verwaltung
5. **emailCampaignService**: E-Mail-Kampagnen
6. **emailService**: E-Mail-Versand
7. **emailComposerService**: Composer-Logik

### Datenbankstruktur
```
/campaigns
  /{campaignId}
    - PRCampaign Daten
    - organizationId

/lists
  /{listId}
    - DistributionList Daten
    - contactIds[]
    - organizationId

/contacts
  /{contactId}
    - ContactEnhanced Daten
    - companyId
    - organizationId

/companies
  /{companyId}
    - CompanyEnhanced Daten
    - contacts[]
    - organizationId

/emailCampaigns
  /{emailCampaignId}
    - Versand-Details
    - recipientStatus
    - analytics
```

## UI-Komponenten

### Hauptkomponenten
1. **PRCampaignsPage**: Kampagnen-Übersicht
2. **EmailSendModal**: Versand-Dialog
3. **EmailComposer**: 3-Stufen-Composer
4. **StepIndicator**: Fortschrittsanzeige
5. **Step1Content**: Anschreiben-Editor
6. **Step2Details**: Empfänger-Auswahl
7. **Step3Preview**: Vorschau & Versand

### Features
- **Echtzeit-Validierung**
- **Auto-Save** alle 30 Sekunden
- **Undo/Redo** im Editor
- **Drag & Drop** für Anhänge
- **Responsive Design**
- **Dark Mode Support**

## Sicherheit & Berechtigungen
- Multi-Tenancy über organizationId
- Berechtigungsprüfung pro Operation
- Rate-Limiting für Versand
- Spam-Schutz Mechanismen
- DSGVO-konforme Datenverarbeitung

## Performance-Optimierungen
- Batch-Verarbeitung für große Listen
- Lazy-Loading von Kontakten
- Caching von häufig verwendeten Listen
- Optimierte Datenbank-Queries
- CDN für Anhänge

## Fehlende Features für Projekt-Pipeline

1. **projectId**: Verknüpfung zum übergeordneten Projekt
2. **pipelineStage**: Aktuelle Pipeline-Phase
3. **distributionApproval**: Freigabe für Versand
4. **distributionBudget**: Budget für Distribution
5. **targetMetrics**: Ziel-KPIs für Distribution
6. **competitorTracking**: Wettbewerber-Beobachtung
7. **mediaMonitoring**: Medien-Monitoring nach Versand
8. **followUpSchedule**: Follow-Up Planung
9. **distributionReport**: Automatisierte Reports
10. **integrationWebhooks**: Externe System-Integration