# Campaigns - Kampagnen-Management

## 📋 Übersicht

Das Kampagnen-Modul ist das zentrale Werkzeug für die Erstellung, Verwaltung und den Versand von Pressemeldungen. Es integriert KI-Unterstützung, Freigabe-Workflows und E-Mail-Versand in einem nahtlosen Prozess.

**Hauptzweck:** Professionelle Pressemeldungen erstellen, freigeben lassen und an ausgewählte Medienkontakte versenden.

## ✅ Implementierte Funktionen

### Kampagnen-Verwaltung
- [x] **CRUD-Operationen** für Kampagnen
- [x] **Status-Management**: Entwurf, In Freigabe, Freigegeben, Versendet
- [x] **Rich-Text Editor** (TipTap) für Inhalte
- [x] **Metadaten-Verwaltung**:
  - Betreff/Headline
  - Unterüberschrift
  - Zielgruppen-Auswahl
  - Branche & Tonalität
- [x] **Anhänge-Verwaltung** (Integration mit Mediathek)

### KI-Integration
- [x] **Pressemeldung generieren** mit Google Gemini
- [x] **Strukturierte Ausgabe**:
  - Headline
  - Lead-Paragraph
  - Body-Paragraphs
  - Zitat mit Sprecher
  - Boilerplate
- [x] **Kontext-basierte Generierung** (Branche, Ton, Zielgruppe)
- [x] **Template-Auswahl** für verschiedene Anlässe

### Freigabe-Workflow
- [x] **Eindeutige Freigabe-Links** generieren
- [x] **Öffentliche Vorschau** ohne Login
- [x] **Kommentar-Funktion** für Feedback
- [x] **Freigabe-Tracking**:
  - Wer hat freigegeben
  - Zeitstempel
  - Status-Historie
- [x] **E-Mail-Benachrichtigungen** bei Statusänderungen

### Versand-Funktionen
- [x] **Empfänger-Auswahl** aus Kontakten
- [x] **Verteilerlisten-Integration**
- [x] **SendGrid-Integration** für Versand
- [x] **Personalisierung** (Name, Firma)
- [x] **Versand-Zeitplanung** (Datum & Uhrzeit)

### Analytics & Tracking
- [x] **Versand-Statistiken**:
  - Anzahl Empfänger
  - Versandzeitpunkt
  - Fehlerquote
- [x] **Basis-Tracking** (via SendGrid):
  - Zugestellt
  - Geöffnet
  - Geklickt
  - Bounces

## 🚧 In Entwicklung

- [ ] **Erweiterte Editor-Features** (Branch: feature/editor-enhanced)
  - Textfarben und Formatierungen
  - Links mit Target-Optionen
  - Größeres Editor-Fenster
  - Tabellen-Support

## ❗ Dringend benötigt

### 1. **Vorlagen-System (Templates)** 🔴
**Beschreibung:** Wiederverwendbare Vorlagen für verschiedene Meldungstypen
- Vordefinierte Strukturen (Produktlaunch, Event, Personal)
- Firmen-spezifische Templates
- Platzhalter-System
- Template-Bibliothek

**Technische Anforderungen:**
- Neue Collection: `templates`
- Template-Editor
- Variablen-System
- Kategorisierung

**Geschätzter Aufwand:** 2 Wochen

### 2. **Erweitertes E-Mail-Tracking** 🔴
**Beschreibung:** Detailliertes Tracking der Empfänger-Interaktionen
- Individuelle Öffnungsraten
- Link-Tracking pro Empfänger
- Weiterleitungen erkennen
- Device/Client-Informationen

**Integration mit:** SendGrid Event Webhooks
**Geschätzter Aufwand:** 1 Woche

### 3. **A/B Testing** 🟡
**Beschreibung:** Verschiedene Versionen testen
- Betreffzeilen-Tests
- Verschiedene Ansprachen
- Versandzeitpunkt-Optimierung
- Automatische Gewinner-Ermittlung

**Geschätzter Aufwand:** 2 Wochen

### 4. **Mehrstufige Freigabe** 🟡
**Beschreibung:** Komplexere Freigabe-Workflows
- Mehrere Freigeber definieren
- Reihenfolge festlegen
- Rollen-basierte Freigaben
- Eskalations-Mechanismen

**Geschätzter Aufwand:** 1-2 Wochen

## 💡 Nice to Have

### Erweiterte Editor-Features
- **KI-basierte Verbesserungsvorschläge** während des Schreibens
- **SEO-Optimierung** für Online-Veröffentlichungen
- **Multimedia-Einbettung** (Videos, Infografiken)
- **Versionsverlauf** mit Diff-Ansicht
- **Kollaboratives Editing** (wie Google Docs)
- **Markdown-Import/Export**

### Automatisierung
- **Kampagnen-Serien** (mehrteilige Kampagnen)
- **Follow-Up Automation** (nach X Tagen ohne Reaktion)
- **RSS-Feed Integration** für automatische Veröffentlichung
- **Social Media Posting** (LinkedIn, Twitter)
- **Presseverteiler-APIs** (OpenPR, PresseBox)

### Analytics & Reporting
- **Medienresonanz-Analyse** (Clippings)
- **Sentiment-Analyse** mit KI
- **Konkurrenz-Beobachtung**
- **ROI-Berechnung**
- **Custom Reports** (PDF-Export)

### Workflow-Verbesserungen
- **Kampagnen-Kalender** (Editorial Calendar)
- **Aufgaben-Management** pro Kampagne
- **Budget-Tracking**
- **Multi-Language Support**
- **Kampagnen-Archiv** mit Suchfunktion

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
campaigns/
  {campaignId}/
    - title: string
    - subject: string
    - content: string (HTML)
    - status: 'draft' | 'pending_approval' | 'approved' | 'sent'
    - metadata: {
        industry?: string
        tone?: string
        audience?: string
      }
    - recipients: ContactRef[]
    - scheduledAt?: Timestamp
    - sentAt?: Timestamp
    - stats?: {
        sent: number
        delivered: number
        opened: number
        clicked: number
      }
    - userId: string
    - createdAt: Timestamp
    
    approvals/ (subcollection)
      {approvalId}/
        - shareId: string
        - status: 'pending' | 'approved' | 'rejected'
        - comments: string
        - approvedBy?: string
        - approvedAt?: Timestamp
```

### API Endpoints

```typescript
// Campaign Management
POST   /api/campaigns                 // Create campaign
GET    /api/campaigns                 // List campaigns
GET    /api/campaigns/[id]           // Get campaign
PUT    /api/campaigns/[id]           // Update campaign
DELETE /api/campaigns/[id]           // Delete campaign

// AI Integration
POST   /api/ai/generate              // Generate content
POST   /api/ai/improve               // Improve content
GET    /api/ai/templates             // Get templates

// Sending
POST   /api/campaigns/[id]/send      // Send campaign
POST   /api/campaigns/[id]/schedule  // Schedule campaign

// Webhooks
POST   /api/webhooks/sendgrid        // SendGrid events
```

### Komponenten-Struktur

```
src/app/dashboard/pr-tools/campaigns/
├── page.tsx                    # Kampagnen-Übersicht
├── edit/
│   └── [campaignId]/
│       └── page.tsx           # Kampagnen-Editor
├── components/
│   ├── CampaignEditor.tsx     # Haupt-Editor
│   ├── RecipientSelector.tsx  # Empfänger-Auswahl
│   ├── AIAssistant.tsx        # KI-Integration
│   └── SendDialog.tsx         # Versand-Dialog

src/app/share/campaign/[shareId]/
└── page.tsx                    # Öffentliche Freigabe-Seite
```

### Service-Integration

```typescript
// Services
- campaignService      // Campaign CRUD
- firebaseAIService    // AI content generation  
- sendgridService      // Email sending
- approvalService      // Approval workflow
```

## 📊 Metriken & KPIs

- **Kampagnen-Anzahl:** Gesamt, nach Status
- **Öffnungsrate:** Durchschnitt und Trend
- **Klickrate:** Links in Pressemeldungen
- **Freigabe-Zeit:** Durchschnittliche Dauer
- **KI-Nutzung:** Generierte vs. manuelle Texte

## 🐛 Bekannte Probleme

1. **Editor-Limitierungen**
   - Keine Farben, erweiterte Formatierungen
   - Lösung: TipTap Extensions hinzufügen

2. **Große Empfängerlisten**
   - Performance bei >500 Empfängern
   - Lösung: Pagination, Batch-Processing

3. **Zeitzonenhandling**
   - Geplante Versendungen in verschiedenen Zeitzonen
   - Lösung: Timezone-Auswahl implementieren

## 🔒 Sicherheit & Datenschutz

- Kampagnen nur für Ersteller sichtbar
- Freigabe-Links mit zufälligen IDs
- Keine Empfänger-Daten in öffentlichen Links
- DSGVO-konforme Datenverarbeitung
- Verschlüsselte API-Keys

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Template-System
- Erweitertes Tracking
- Editor-Verbesserungen

### Phase 2 (Q2 2025)
- A/B Testing
- Social Media Integration
- Automatisierungen

### Phase 3 (Q3 2025)
- Medienresonanz-Analyse
- Multi-Language
- Enterprise-Features

## 📚 Weiterführende Dokumentation

- [KI-Integration Details](./ai-assistant.md)
- [SendGrid Integration](../adr/0004-sendgrid-email.md)
- [Freigabe-Workflow](./approvals.md)
- [Editor-Konfiguration](../adr/0007-tiptap-editor.md)