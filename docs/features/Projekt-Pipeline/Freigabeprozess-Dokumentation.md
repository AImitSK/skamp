# Freigabeprozess-Dokumentation für Projekt-Pipeline

## Übersicht
Der bestehende Freigabeprozess in CeleroPress ermöglicht es, PR-Kampagnen zur Freigabe an Kunden zu senden und deren Feedback strukturiert zu verwalten. Dieses System bildet die Grundlage für die **Kunden-Freigabe Phase** in der neuen Projekt-Pipeline.

## Kernkomponenten des Freigabeprozesses

### 1. Approval-Entity (ApprovalEnhanced)
Das zentrale Datenobjekt, das alle Informationen zu einer Freigabe enthält:

#### Basis-Informationen
- **title**: Titel der Freigabe
- **description**: Optionale Beschreibung
- **campaignId**: Verknüpfung zur PR-Kampagne
- **campaignTitle**: Denormalisierter Kampagnentitel (Performance)

#### Kunden-Informationen
- **clientId**: Company ID des Kunden
- **clientName**: Kundenname (denormalisiert)
- **clientEmail**: Primäre E-Mail für Benachrichtigungen

#### Empfänger-Management (Multiple Recipients)
- **recipients[]**: Array von Freigabe-Empfängern
  - **id**: Eindeutige Empfänger-ID
  - **email**: E-Mail-Adresse
  - **name**: Name des Empfängers
  - **role**: approver | reviewer | observer
  - **status**: pending | viewed | approved | rejected | commented
  - **viewedAt**: Zeitpunkt der ersten Ansicht
  - **decidedAt**: Zeitpunkt der Entscheidung
  - **decision**: approved | rejected
  - **comment**: Kommentar des Empfängers
  - **isRequired**: Muss dieser Empfänger freigeben?
  - **order**: Reihenfolge bei sequenzieller Freigabe
  - **notificationsSent**: Anzahl gesendeter Benachrichtigungen
  - **lastNotificationAt**: Letzte Benachrichtigung

### 2. Content-Management
- **content.html**: HTML-Inhalt zur Freigabe
- **content.plainText**: Plain-Text Version
- **content.subject**: Betreff (für E-Mail)
- **attachedAssets[]**: Angehängte Medien
  - assetId, type, name, url, metadata

### 3. Status-System

#### Hauptstatus (ApprovalStatus)
- **draft**: Entwurf
- **pending**: Warte auf Freigabe
- **in_review**: Wird geprüft/Erstmal angesehen
- **partially_approved**: Teilweise freigegeben
- **approved**: Vollständig freigegeben
- **rejected**: Abgelehnt
- **changes_requested**: Änderungen angefordert
- **expired**: Abgelaufen
- **cancelled**: Abgebrochen
- **completed**: Abgeschlossen (nach Versand)

#### Workflow-Typen (ApprovalWorkflow)
- **simple**: Einfache Freigabe
- **unanimous**: Alle müssen zustimmen
- **majority**: Mehrheit reicht
- **sequential**: Der Reihe nach
- **hierarchical**: Hierarchisch (Manager zuerst)

### 4. Freigabe-Optionen
- **requireAllApprovals**: Alle müssen freigeben
- **allowPartialApproval**: Teilfreigaben erlaubt
- **autoSendAfterApproval**: Automatisch senden nach Freigabe
- **expiresAt**: Ablaufdatum
- **reminderSchedule**: Erinnerungsplan
- **allowComments**: Kommentare erlauben
- **allowInlineComments**: Inline-Kommentare erlauben

### 5. Öffentlicher Zugriff
- **shareId**: Eindeutige ID für öffentlichen Link (/freigabe/{shareId})
- **shareSettings**:
  - requirePassword: Passwortschutz
  - requireEmailVerification: E-Mail-Verifizierung
  - allowedDomains: Erlaubte E-Mail-Domains
  - accessLog: Zugriffe protokollieren

### 6. Historie & Tracking
- **history[]**: Vollständige Aktions-Historie
  - **id**: Historie-Eintrag ID
  - **timestamp**: Zeitpunkt
  - **action**: created | sent | viewed | approved | rejected | commented | reminder_sent | etc.
  - **userId/recipientId**: Akteur
  - **actorName/actorEmail**: Akteur-Informationen
  - **details**: Zusätzliche Details (previousStatus, newStatus, comment, changes, ipAddress, userAgent)
  - **inlineComments**: Inline-Kommentare mit Position

### 7. Analytics & Metriken
- **firstViewedAt**: Erste Ansicht
- **lastViewedAt**: Letzte Ansicht
- **totalViews**: Gesamtanzahl Ansichten
- **uniqueViews**: Eindeutige Ansichten
- **deviceTypes**: Gerätetypen (desktop, mobile)
- **locations**: Standorte (DE, AT, etc.)

### 8. Zeitstempel
- **requestedAt**: Freigabe angefordert
- **approvedAt**: Freigegeben am
- **rejectedAt**: Abgelehnt am
- **completedAt**: Abgeschlossen am
- **createdAt/updatedAt**: Standard-Zeitstempel

### 9. Benachrichtigungen
- **notifications.requested**: Initiale Anfrage
- **notifications.reminded[]**: Erinnerungen
- **notifications.statusChanged[]**: Status-Änderungen
- **notifications.completed**: Abschluss-Benachrichtigung

Jede Benachrichtigung hat:
- **sent**: boolean
- **sentAt**: Zeitpunkt
- **method**: email | sms | push
- **recipientId**: Empfänger
- **templateUsed**: Template-ID
- **error**: Fehlermeldung (falls vorhanden)

### 10. Metadaten & Versionierung
- **version**: Versionsnummer
- **previousVersionId**: Vorherige Version
- **tags[]**: Tags zur Kategorisierung
- **category**: Kategorie
- **priority**: low | medium | high | urgent
- **metadata**:
  - templateId: Template-ID
  - language: Sprache
  - timezone: Zeitzone
  - customFields: Benutzerdefinierte Felder

### 11. PDF-Integration
- **pdfVersions[]**: Versionsverlauf der PDFs
- **currentPdfVersion**: Aktuelle PDF-Version
- **hasPDF**: Hat ein PDF
- **pdfStatus**: none | draft | pending_customer | approved | rejected

## Service-Funktionalitäten

### ApprovalService Hauptfunktionen
1. **create()**: Neue Freigabe erstellen
2. **createCustomerApproval()**: Vereinfachte Kunden-Freigabe
3. **sendForApproval()**: Zur Freigabe senden
4. **updateStatus()**: Status aktualisieren
5. **addComment()**: Kommentar hinzufügen
6. **sendReminder()**: Erinnerung senden
7. **searchEnhanced()**: Erweiterte Suche mit Filtern
8. **getStatistics()**: Statistiken abrufen
9. **trackView()**: Ansicht tracken
10. **handleApprovalDecision()**: Entscheidung verarbeiten

### Filter & Suchoptionen
- **search**: Volltextsuche
- **status[]**: Nach Status filtern
- **clientIds[]**: Nach Kunden filtern
- **priority[]**: Nach Priorität filtern
- **isOverdue**: Nur überfällige
- **dateRange**: Zeitraum
- **tags[]**: Nach Tags filtern

## UI-Komponenten

### Hauptansicht (ApprovalsPage)
- **Listenansicht**: Tabellarische Übersicht aller Freigaben
- **Statusanzeige**: Visueller Fortschritt und Badges
- **Filter-Popover**: Umfangreiche Filteroptionen
- **Aktions-Dropdown**: Kontextmenü pro Freigabe
- **Pagination**: Seitenweise Navigation

### Wichtige UI-Elemente
1. **Status-Badge**: Farbcodierte Status-Anzeige
2. **Prioritäts-Badge**: Dringlichkeitsanzeige
3. **Progress-Bar**: Visueller Fortschritt (0-100%)
4. **Überfällig-Badge**: Warnung bei Überschreitung
5. **PDF-Status**: Separater PDF-Freigabestatus

### Aktionen pro Freigabe
- Freigabe-Link öffnen
- Link kopieren
- PDF öffnen/kopieren (wenn vorhanden)
- Kampagne anzeigen
- Feedback-Historie anzeigen
- Erinnerung senden
- Erneut senden

## Integration in Projekt-Pipeline

### Benötigte Werte für Kunden-Freigabe Phase

#### Pflichtfelder
1. **approvalId**: Eindeutige Freigabe-ID
2. **status**: Aktueller Freigabestatus
3. **clientName**: Kundenname
4. **clientEmail**: Kunden-E-Mail
5. **recipients**: Liste der Empfänger
6. **shareId**: Öffentlicher Link-ID
7. **requestedAt**: Anfragezeitpunkt

#### Erweiterte Informationen
8. **workflow**: Freigabe-Workflow-Typ
9. **priority**: Priorität der Freigabe
10. **expiresAt**: Ablaufdatum (optional)
11. **reminderSchedule**: Erinnerungsplan
12. **history**: Vollständige Historie
13. **analytics**: View-Statistiken
14. **attachedAssets**: Angehängte Medien
15. **pdfStatus**: PDF-Freigabestatus
16. **comments**: Empfänger-Kommentare

#### Status-Tracking
17. **progress**: Fortschritt in Prozent (0-100)
18. **isOverdue**: Überfällig-Flag
19. **pendingRecipients**: Anzahl ausstehender Empfänger
20. **approvedRecipients**: Anzahl Zustimmungen
21. **rejectedRecipients**: Anzahl Ablehnungen

#### Aktions-Möglichkeiten
22. **canSendReminder**: Erinnerung möglich?
23. **canResubmit**: Erneut senden möglich?
24. **canEdit**: Bearbeitung möglich?
25. **canCancel**: Abbruch möglich?
26. **shareUrl**: Vollständige Freigabe-URL

#### Benachrichtigungs-Status
27. **lastReminderSent**: Letzte Erinnerung
28. **totalRemindersSent**: Anzahl Erinnerungen
29. **nextReminderDue**: Nächste geplante Erinnerung
30. **notificationErrors**: Fehler bei Benachrichtigungen

## Datenbankstruktur
```
/approvals
  /{approvalId}
    - Alle ApprovalEnhanced Felder
    - organizationId (Multi-Tenancy)
    - createdBy/updatedBy (User-Tracking)
```

## API-Endpunkte (implizit über Service)
- GET: searchEnhanced() - Suche mit Filtern
- POST: create() - Neue Freigabe
- PUT: updateStatus() - Status ändern
- POST: sendReminder() - Erinnerung senden
- GET: getById() - Einzelne Freigabe
- POST: trackView() - Ansicht tracken

## Sicherheit & Berechtigungen
- Multi-Tenancy über organizationId
- Öffentlicher Zugriff nur über shareId
- Optional: Passwortschutz
- Optional: Domain-Beschränkung
- IP-Tracking und User-Agent Logging

## Performance-Optimierungen
- Query-Cache (3 Minuten TTL)
- Denormalisierte Felder (clientName, campaignTitle)
- Index auf häufig gefilterte Felder
- Pagination (25 Einträge pro Seite)

## Fehlende Features für Projekt-Pipeline
Für die vollständige Integration in die Projekt-Pipeline könnten folgende zusätzliche Felder/Features hilfreich sein:

1. **projectId**: Verknüpfung zum übergeordneten Projekt
2. **stageId**: Aktuelle Pipeline-Phase
3. **dependencies**: Abhängigkeiten zu anderen Freigaben
4. **automationRules**: Automatisierungsregeln
5. **escalationPath**: Eskalationspfad bei Verzögerung
6. **customWorkflowSteps**: Benutzerdefinierte Workflow-Schritte
7. **integrations**: Verknüpfungen zu externen Systemen
8. **costTracking**: Kosten-Tracking
9. **timeTracking**: Zeit-Tracking
10. **qualityScore**: Qualitätsbewertung