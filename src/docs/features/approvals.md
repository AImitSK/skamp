# Approvals - Freigabe-Workflow

## 📋 Übersicht

Das Freigabe-Modul ermöglicht einen strukturierten Approval-Prozess für Pressemeldungen, bei dem Kunden oder interne Stakeholder Kampagnen vor dem Versand prüfen und freigeben können.

**Hauptzweck:** Qualitätssicherung und rechtliche Absicherung durch dokumentierte Freigabeprozesse.

## ✅ Implementierte Funktionen

### Freigabe-Prozess
- [x] **Eindeutige Share-Links** pro Kampagne
- [x] **Öffentliche Vorschau** ohne Login-Zwang
- [x] **Responsive Vorschau-Seite** mit Branding
- [x] **Freigabe-Aktionen**:
  - Freigeben mit einem Klick
  - Ablehnen mit Begründung
  - Kommentare hinterlassen
- [x] **Status-Tracking**: Pending, Approved, Rejected

### Freigabe-Interface
- [x] **Professionelle Vorschau** der Pressemeldung
- [x] **Metadaten-Anzeige**: Betreff, Datum, Empfänger
- [x] **Anhänge-Vorschau** (falls vorhanden)
- [x] **Mobile-optimiert** für Freigabe unterwegs
- [x] **Kommentar-Feld** für Feedback

### Benachrichtigungen
- [x] **E-Mail bei Freigabe-Anfrage** mit Direct Link
- [x] **Status-Updates** an Kampagnen-Ersteller
- [x] **Reminder-Funktion** (manuell)
- [x] **In-App Notifications** für Status-Änderungen

### Tracking & Dokumentation
- [x] **Freigabe-Historie** mit Zeitstempel
- [x] **Freigeber-Informationen**: Name, E-Mail
- [x] **Kommentar-Historie** nachvollziehbar
- [x] **Status-Änderungen** im Audit-Log
- [x] **Export** der Freigabe-Dokumentation

## 🚧 In Entwicklung

- [ ] **Multi-Stakeholder Approval** (Branch: feature/multi-approval)
  - Mehrere Freigeber definieren
  - Sequentielle Freigaben
  - Parallele Freigaben

## ❗ Dringend benötigt

### 1. **Erweiterte Freigabe-Workflows** 🔴
**Beschreibung:** Komplexere Approval-Szenarien abbilden
- Mehrstufige Freigaben (Legal → Marketing → CEO)
- Conditional Approvals (wenn X, dann Y)
- Stellvertreter-Regelungen
- Eskalations-Mechanismen
- Rollen-basierte Freigaben

**Technische Anforderungen:**
- Workflow-Engine
- State Machine Pattern
- Erweiterte Berechtigungen

**Geschätzter Aufwand:** 3 Wochen

### 2. **Freigabe-Templates** 🔴
**Beschreibung:** Wiederverwendbare Freigabe-Prozesse
- Standard-Workflows definieren
- Freigeber-Gruppen speichern
- Automatische Zuweisung nach Kampagnentyp
- Deadline-Management
- SLA-Tracking

**Geschätzter Aufwand:** 1-2 Wochen

### 3. **Annotations & Mark-up** 🟡
**Beschreibung:** Direktes Feedback auf dem Dokument
- Text-Markierungen
- Kommentare an spezifischen Stellen
- Änderungsvorschläge inline
- Versionvergleich
- PDF-Export mit Anmerkungen

**Geschätzter Aufwand:** 2 Wochen

### 4. **Mobile App Integration** 🟡
**Beschreibung:** Native App-Features für Freigaben
- Push Notifications
- Offline-Viewing
- Quick Approve Actions
- Face/Touch ID für Freigabe
- Apple/Google Wallet Integration

**Geschätzter Aufwand:** 4 Wochen (separate App)

## 💡 Nice to Have

### Erweiterte Workflows
- **Bedingte Freigaben** (z.B. nur bei bestimmtem Inhalt)
- **Automatische Freigaben** bei Standardtexten
- **Freigabe-Delegation** an Kollegen
- **Bulk-Freigaben** für mehrere Kampagnen
- **Freigabe-Kalender** mit Übersicht

### Integration & Automatisierung
- **Slack/Teams Integration** für Notifications
- **DocuSign Integration** für rechtsverbindliche Unterschriften
- **Workflow-Automation** mit Zapier/Make
- **API für externe Freigabe-Systeme**
- **SSO für Unternehmenskunden**

### Compliance & Rechtssicherheit
- **Digitale Signaturen** (eIDAS-konform)
- **Blockchain-Verifikation** für Unveränderlichkeit
- **IP-Logging** und Geolocation
- **Video-Identifikation** für kritische Freigaben
- **Audit-Trail Export** für Compliance

### Analytics & Reporting
- **Freigabe-Zeiten** Analyse
- **Bottleneck-Identifikation**
- **Freigeber-Performance** Metrics
- **Ablehnungsgründe** Statistiken
- **Compliance-Reports**

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// In campaigns/{campaignId}/approvals/
approvals/
  {approvalId}/
    - shareId: string (unique, für URL)
    - requestedAt: Timestamp
    - requestedBy: string (userId)
    - status: 'pending' | 'approved' | 'rejected'
    - approverName?: string
    - approverEmail?: string
    - approvedAt?: Timestamp
    - comments?: string
    - metadata?: {
        ip?: string
        userAgent?: string
        location?: string
      }

// Separate Collection für Share-Links
shareLinks/
  {shareId}/
    - campaignId: string
    - type: 'approval' | 'preview'
    - createdAt: Timestamp
    - expiresAt?: Timestamp
    - accessCount: number
    - isActive: boolean
```

### URL-Struktur

```
# Öffentliche Freigabe-URL
https://app.skamp.de/share/campaign/{shareId}

# Komponenten
- Keine User-IDs in URL
- Zufällige, nicht-erratbare IDs
- Optional: Ablaufdatum
- Optional: Passwortschutz
```

### Security

```typescript
// Share Link Generation
function generateShareLink(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validierung
- Rate Limiting (10 Requests/Minute)
- IP-basiertes Blocking bei Missbrauch
- Optional: reCAPTCHA für öffentliche Links
- Keine sensiblen Daten in öffentlichen Views
```

### E-Mail Templates

```html
<!-- Freigabe-Anfrage -->
Betreff: Freigabe erbeten: {Kampagnen-Titel}

Guten Tag {Name},

bitte prüfen und genehmigen Sie die folgende Pressemeldung:

[Kampagnen-Titel]
[Vorschau-Text...]

[Freigabe-Button] → {Share-URL}

Mit freundlichen Grüßen
{Absender}
```

## 📊 Metriken & KPIs

- **Durchschnittliche Freigabezeit**: Von Anfrage bis Approval
- **Freigabequote**: Approved vs. Rejected
- **Response-Rate**: Wie viele reagieren
- **Bottlenecks**: Wo hängen Freigaben
- **Device-Statistiken**: Mobile vs. Desktop

## 🐛 Bekannte Probleme

1. **E-Mail Zustellung**
   - Freigabe-Mails landen im Spam
   - Lösung: SPF/DKIM optimieren

2. **Link-Ablauf**
   - Keine automatische Deaktivierung
   - Lösung: Expiry-Date implementieren

3. **Mehrfach-Freigaben**
   - Gleiche Person kann mehrfach freigeben
   - Lösung: Session-Tracking

## 🔒 Sicherheit & Datenschutz

- Kampagneninhalte nur über sichere Links
- Keine Indexierung durch Suchmaschinen
- IP-Logging nur mit Consent
- Automatische Link-Deaktivierung nach Versand
- DSGVO-konforme Datenverarbeitung
- Verschlüsselte Übertragung

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Multi-Stakeholder Workflows
- Freigabe-Templates
- Erweiterte Notifications

### Phase 2 (Q2 2025)
- Annotations & Mark-up
- Mobile App
- Workflow Automation

### Phase 3 (Q3 2025)
- Digital Signatures
- Enterprise SSO
- Advanced Analytics

## 📚 Weiterführende Dokumentation

- [Kampagnen-Workflow](./campaigns.md#freigabe-workflow)
- [E-Mail Templates](./email-templates.md)
- [Security Best Practices](./security.md)
- [Compliance Guide](./compliance.md)