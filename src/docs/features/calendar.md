# Calendar - Kalender-Integration

## 📋 Übersicht

Das Kalender-Modul bietet eine zentrale Übersicht über alle PR-Aktivitäten, geplante Kampagnen, wichtige Termine und Deadlines. Es integriert sich nahtlos mit anderen SKAMP-Modulen und externen Kalendersystemen.

**Hauptzweck:** Zeitliche Koordination aller PR-Aktivitäten mit visueller Planung und Erinnerungsfunktionen.

## ✅ Implementierte Funktionen

### Kalender-Ansichten
- [x] **FullCalendar Integration** (v6.1)
- [x] **Multiple Ansichten**:
  - Monatsansicht
  - Wochenansicht
  - Tagesansicht
  - Listen-Ansicht
- [x] **Responsive Design** für Mobile
- [x] **Drag & Drop** für Termin-Verschiebung

### Event-Typen
- [x] **Kampagnen-Events**:
  - Geplante Versendungen
  - Freigabe-Deadlines
  - Launch-Termine
- [x] **Redaktionsschlüsse** (manuell)
- [x] **Team-Meetings** (manuell)
- [x] **Reminder** & Notizen

### Basis-Features
- [x] **Event-Erstellung** mit Formular
- [x] **Farbcodierung** nach Event-Typ
- [x] **Quick-View** Popup bei Klick
- [x] **Heute-Button** für schnelle Navigation
- [x] **Navigation** zwischen Monaten/Wochen

## 🚧 In Entwicklung

- [ ] **Externe Kalender-Sync** (Branch: feature/calendar-sync)
  - Google Calendar API
  - Outlook Integration
  - CalDAV Support

## ❗ Dringend benötigt

### 1. **Automatische Event-Generierung** 🔴
**Beschreibung:** Events aus anderen Modulen automatisch erstellen
- Kampagnen-Versand → Kalender-Event
- Freigabe-Requests → Deadline im Kalender
- Follow-ups → Automatische Reminder
- Redaktionsschlüsse aus Mediendaten
- Recurring Events für regelmäßige Aussendungen

**Technische Anforderungen:**
- Event-Listener für Module
- Background Jobs für Updates
- Konflikt-Erkennung

**Geschätzter Aufwand:** 2 Wochen

### 2. **Google Calendar Integration** 🔴
**Beschreibung:** Bidirektionale Synchronisation mit Google Calendar
- OAuth2 Authentication
- Kalender auswählen
- Zwei-Wege-Sync
- Konflikt-Resolution
- Selective Sync (nur bestimmte Events)

**Technische Anforderungen:**
- Google Calendar API
- OAuth2 Flow
- Webhook für Updates
- Sync-Queue

**Geschätzter Aufwand:** 2-3 Wochen

### 3. **Team-Kalender & Berechtigungen** 🟡
**Beschreibung:** Gemeinsame Kalender für Teams
- Mehrere Kalender pro User
- Shared Team-Kalender
- Sichtbarkeits-Einstellungen
- Berechtigungs-Management
- Farbcodierung pro Kalender

**Geschätzter Aufwand:** 2 Wochen

### 4. **Erweiterte Termin-Features** 🟡
**Beschreibung:** Professionelle Kalenderfunktionen
- Serientermine
- Ganztägige Events
- Verschiedene Zeitzonen
- Teilnehmer-Management
- Location/Meeting-URLs
- Anhänge zu Events

**Geschätzter Aufwand:** 1-2 Wochen

## 💡 Nice to Have

### Integrationen
- **Outlook Calendar** Sync (Microsoft Graph API)
- **Apple Calendar** Integration (CalDAV)
- **Calendly-Style** Booking Links
- **Zoom/Teams** Meeting Creation
- **Redaktionsschluss-APIs** (Mediadaten)

### Erweiterte Planung
- **Editorial Calendar** View (Content-Planung)
- **Kampagnen-Timeline** (Gantt-Style)
- **Ressourcen-Planung** (Wer macht was)
- **Deadline-Tracking** mit Alerts
- **Feiertags-Kalender** (automatisch)
- **Branchen-Events** Integration

### Automatisierung
- **Smart Scheduling** (beste Versandzeiten)
- **Konflikt-Vermeidung** (keine Überschneidungen)
- **Auto-Reminder** vor wichtigen Terminen
- **Follow-up Automation** nach Events
- **Buffer-Zeit** automatisch einplanen

### Analytics & Reporting
- **Aktivitäts-Heatmap** (busy/quiet Zeiten)
- **Team-Auslastung** Visualisierung
- **Deadline-Performance** (pünktlich vs. verspätet)
- **Meeting-Statistiken**
- **Kalender-Export** (PDF, ICS)

### Mobile & Collaboration
- **Mobile App** mit Push-Notifications
- **Kalender-Sharing** via Link
- **Kommentare** auf Events
- **RSVP-Funktionen**
- **Check-in** für Meetings

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
calendarEvents/
  {eventId}/
    - title: string
    - description?: string
    - type: 'campaign' | 'deadline' | 'meeting' | 'reminder' | 'other'
    - startDate: Timestamp
    - endDate: Timestamp
    - allDay: boolean
    - color?: string
    - location?: string
    - meetingUrl?: string
    
    // Verknüpfungen
    - campaignId?: string
    - contactIds?: string[]
    - userId: string
    - sharedWith?: string[] // für Team-Kalender
    
    // Recurring Events
    - recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
        interval: number
        endDate?: Timestamp
        exceptions?: Timestamp[]
      }
    
    // Sync Info
    - externalId?: string // Google/Outlook ID
    - syncSource?: 'google' | 'outlook' | 'manual'
    - lastSynced?: Timestamp

// Für Performance
calendarSettings/
  {userId}/
    - defaultView: 'month' | 'week' | 'day'
    - weekStartsOn: number // 0 = Sunday
    - workingHours: { start: string, end: string }
    - timezone: string
    - connectedCalendars: CalendarConnection[]
```

### FullCalendar Konfiguration

```typescript
// Calendar Component Setup
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
  },
  events: fetchEventsFromFirestore,
  eventClick: handleEventClick,
  eventDrop: handleEventDrop,
  dateClick: handleDateClick,
  // Localization
  locale: 'de',
  firstDay: 1, // Monday
  // Styling
  height: 'auto',
  eventColor: '#005fab'
}
```

### Google Calendar Integration

```typescript
// OAuth2 Flow
1. User initiiert Verbindung
2. Redirect zu Google OAuth
3. Callback mit Auth Code
4. Exchange für Access/Refresh Token
5. Token sicher speichern (encrypted)

// Sync Process
async function syncGoogleCalendar(userId: string) {
  const token = await getStoredToken(userId);
  const calendar = google.calendar({ version: 'v3', auth: token });
  
  // Fetch Events
  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 100,
    singleEvents: true
  });
  
  // Sync to Firestore
  await syncEventsToFirestore(events);
  
  // Setup Webhook for Updates
  await setupGoogleWebhook(calendarId);
}
```

## 📊 Metriken & KPIs

- **Event-Anzahl**: Nach Typ und Zeitraum
- **Termin-Dichte**: Events pro Woche/Monat
- **Pünktlichkeit**: Eingehaltene Deadlines
- **Sync-Status**: Erfolgreiche vs. fehlgeschlagene Syncs
- **Nutzung**: Aktive Kalender-User

## 🐛 Bekannte Probleme

1. **Zeitzonen-Handling**
   - Events verschieben sich bei verschiedenen Zeitzonen
   - Lösung: Explizite Timezone-Speicherung

2. **Performance bei vielen Events**
   - Langsames Laden bei >500 Events
   - Lösung: Event-Pagination, Lazy Loading

3. **Sync-Konflikte**
   - Doppelte Events bei Sync
   - Lösung: Bessere Duplicate Detection

## 🔒 Sicherheit & Datenschutz

- Kalender-Events nur für Ersteller sichtbar
- Team-Kalender mit expliziten Berechtigungen
- OAuth-Tokens verschlüsselt speichern
- Keine sensiblen Daten in Event-Titeln
- Audit-Log für Kalender-Zugriffe
- DSGVO-konforme Datenverarbeitung

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Google Calendar Sync
- Automatische Events
- Team-Kalender

### Phase 2 (Q2 2025)
- Outlook Integration
- Editorial Calendar
- Mobile Optimization

### Phase 3 (Q3 2025)
- KI-basierte Terminvorschläge
- Erweiterte Analytics
- Enterprise Features

## 📚 Weiterführende Dokumentation

- [FullCalendar Docs](https://fullcalendar.io/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [Kampagnen-Integration](./campaigns.md#kalender)
- [Team-Features](./team-collaboration.md)