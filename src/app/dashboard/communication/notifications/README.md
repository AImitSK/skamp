# 📢 Benachrichtigungssystem - Implementierungsplan

## 🎯 Projektziel
Implementierung eines robusten und benutzerfreundlichen Benachrichtigungssystems für die SKAMP PR-Suite, das Nutzer proaktiv über relevante Ereignisse informiert.

## 📋 Übersicht

### Technologie-Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, React
- **UI-Bibliothek:** Catalyst UI (bestehende Custom-Komponenten)
- **Backend:** Firebase Firestore, Firebase Functions
- **Styling:** Tailwind CSS

### Neue Dateien & Verzeichnisse
```
src/
├── app/
│   └── dashboard/
│       ├── settings/
│       │   └── notifications/
│       │       └── page.tsx              # Einstellungsseite
│       └── communication/
│           └── notifications/
│               └── page.tsx              # Anzeigeseite
├── components/
│   └── notifications/
│       ├── NotificationBadge.tsx         # Badge für Sidebar
│       ├── NotificationItem.tsx          # Einzelne Benachrichtigung
│       ├── NotificationList.tsx          # Liste der Benachrichtigungen
│       └── NotificationSettings.tsx      # Settings-Komponenten
├── lib/
│   └── firebase/
│       └── notifications-service.ts      # Firebase Service
├── types/
│   └── notifications.ts                  # TypeScript Definitionen
└── hooks/
    └── use-notifications.ts              # React Hook
```

## 🚀 Implementierungsphasen

### Phase 1: Backend & Datenmodell (3-4 Tage)

#### 1.1 Firestore Schema
```typescript
// collections/notifications
{
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkType?: 'campaign' | 'approval' | 'media' | 'task';
  linkId?: string;
  isRead: boolean;
  metadata?: {
    campaignId?: string;
    campaignTitle?: string;
    clientName?: string;
    mediaAssetName?: string;
    taskName?: string;
    senderName?: string;
    recipientCount?: number;
    daysOverdue?: number;
  };
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// collections/notification_settings
{
  id: string;
  userId: string;
  // Freigaben
  approvalGranted: boolean;
  changesRequested: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  // Schedule Mails
  emailSentSuccess: boolean;
  emailBounced: boolean;
  // Tasks
  taskOverdue: boolean;
  // Mediencenter
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  mediaLinkExpired: boolean;
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 1.2 Service Implementation
```typescript
// src/lib/firebase/notifications-service.ts
export const notificationsService = {
  // CRUD Operations
  async create(notification: Omit<Notification, 'id'>): Promise<string>,
  async getAll(userId: string, limit?: number): Promise<Notification[]>,
  async getUnreadCount(userId: string): Promise<number>,
  async markAsRead(notificationId: string): Promise<void>,
  async markAllAsRead(userId: string): Promise<void>,
  
  // Settings
  async getSettings(userId: string): Promise<NotificationSettings>,
  async updateSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void>,
  
  // Trigger Methods (von anderen Services aufgerufen)
  async notifyApprovalGranted(campaign: PRCampaign, approverName: string): Promise<void>,
  async notifyChangesRequested(campaign: PRCampaign, reviewerName: string): Promise<void>,
  async notifyEmailSent(campaign: PRCampaign, recipientCount: number): Promise<void>,
  async notifyEmailBounced(campaign: PRCampaign, bouncedEmail: string): Promise<void>,
  async notifyMediaAccessed(shareLink: ShareLink): Promise<void>,
  async notifyMediaDownloaded(shareLink: ShareLink, assetName: string): Promise<void>,
}
```

#### 1.3 Integration in bestehende Services
- **pr-service.ts:** Integration bei Statusänderungen (approved, changes_requested)
- **email-service.ts:** Integration nach Versand und bei Bounces
- **media-service.ts:** Integration bei Share-Link-Zugriff und Downloads
- **task-service.ts:** Check für überfällige Tasks

#### 1.4 Firebase Functions (Cron Jobs)
```typescript
// functions/src/notifications/check-overdue.ts
export const checkOverdueItems = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    // 1. Check überfällige Freigabe-Anfragen
    // 2. Check überfällige Tasks
    // 3. Check abgelaufene Media-Links
  });
```

### Phase 2: Einstellungsseite (2 Tage)

#### 2.1 UI-Komponenten
```typescript
// src/app/dashboard/settings/notifications/page.tsx
export default function NotificationSettingsPage() {
  // Gruppierte Toggle-Switches für jeden Benachrichtigungstyp
  // Number-Input für Überfälligkeitstage
  // Speichern-Button mit Loading-State
}
```

#### 2.2 Features
- Toggle-Switches für alle Benachrichtigungstypen
- Eingabefeld für Überfälligkeitstage (Freigaben)
- Auto-Save oder expliziter Speichern-Button
- Erfolgs-/Fehler-Feedback

### Phase 3: Anzeigeseite & Badge (3 Tage)

#### 3.1 Badge-Integration
```typescript
// src/components/layout/Sidebar.tsx oder Navigation
<NotificationBadge />
```

#### 3.2 Anzeigeseite Features
- Chronologische Liste (neueste zuerst)
- Visuelle Unterscheidung gelesen/ungelesen
- Klick → Navigation zum Objekt
- "Alle als gelesen markieren"-Button
- Pagination oder Infinite Scroll
- Echtzeit-Updates (später mit Firestore Listeners)

#### 3.3 Benachrichtigungstexte
```typescript
const notificationTemplates = {
  APPROVAL_GRANTED: '{senderName} hat die Freigabe für "{campaignTitle}" erteilt.',
  CHANGES_REQUESTED: '{senderName} bittet um Änderungen für "{campaignTitle}".',
  OVERDUE_APPROVAL: 'Die Freigabe-Anfrage für "{campaignTitle}" ist seit {days} Tagen überfällig.',
  EMAIL_SENT_SUCCESS: 'Deine Kampagne "{campaignTitle}" wurde erfolgreich an {count} Kontakte versendet.',
  EMAIL_BOUNCED: 'Bei der Kampagne "{campaignTitle}" gab es einen Bounce von {email}.',
  TASK_OVERDUE: 'Dein Task "{taskName}" ist überfällig.',
  MEDIA_FIRST_ACCESS: 'Ihr geteilter Link für "{assetName}" wurde zum ersten Mal aufgerufen.',
  MEDIA_DOWNLOADED: 'Ihre Datei "{assetName}" wurde von einem Besucher heruntergeladen.',
  MEDIA_LINK_EXPIRED: 'Der geteilte Link für "{assetName}" ist heute abgelaufen.'
};
```

### Phase 4: Testing & Finalisierung (2 Tage)

#### 4.1 Test-Szenarien
- [ ] Alle Benachrichtigungstypen werden korrekt erstellt
- [ ] Settings werden korrekt gespeichert und angewendet
- [ ] Badge zeigt korrekte Anzahl
- [ ] Navigation von Benachrichtigungen funktioniert
- [ ] "Als gelesen markieren" funktioniert
- [ ] Cron Jobs laufen korrekt
- [ ] Performance bei vielen Benachrichtigungen

#### 4.2 Edge Cases
- Gelöschte verlinkte Objekte
- Gleichzeitige Updates
- Offline-Verhalten
- Sehr viele ungelesene Benachrichtigungen

## 📝 Implementierungsdetails

### Typ-Definitionen
```typescript
// src/types/notifications.ts
export type NotificationType = 
  | 'APPROVAL_GRANTED'
  | 'CHANGES_REQUESTED'
  | 'OVERDUE_APPROVAL'
  | 'EMAIL_SENT_SUCCESS'
  | 'EMAIL_BOUNCED'
  | 'TASK_OVERDUE'
  | 'MEDIA_FIRST_ACCESS'
  | 'MEDIA_DOWNLOADED'
  | 'MEDIA_LINK_EXPIRED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkType?: 'campaign' | 'approval' | 'media' | 'task';
  linkId?: string;
  isRead: boolean;
  metadata?: NotificationMetadata;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

export interface NotificationSettings {
  // ... (wie oben definiert)
}
```

### Custom Hook
```typescript
// src/hooks/use-notifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Real-time listener für Benachrichtigungen
  // Methoden: markAsRead, markAllAsRead, refresh
  
  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}
```

### Integration in bestehende Services

#### PR-Service Integration
```typescript
// In pr-service.ts
async approveCampaign(shareId: string): Promise<void> {
  // ... existing code ...
  
  // Benachrichtigung erstellen
  if (campaign.userId) {
    await notificationsService.notifyApprovalGranted(
      campaign,
      'Kunde' // oder spezifischer Name
    );
  }
}
```

## 🎨 UI/UX Richtlinien

### Farben & Styling
- Orientierung an: `src/app/dashboard/contacts/crm/page.tsx`
- Ungelesene Benachrichtigungen: Blauer Punkt oder hellblauer Hintergrund
- Badge: Roter Hintergrund (#ef4444) mit weißer Schrift
- Hover-States für Interaktivität

### Komponenten-Referenz
- Buttons: Custom-Implementierung beachten (whitespace-nowrap)
- Badge: Custom-Implementierung für Mehrzeiligkeit
- Listen-Layout: Ähnlich ContactTable

## 🔄 Zukünftige Erweiterungen (Post-MVP)

1. **E-Mail-Benachrichtigungen**
   - SendGrid-Integration
   - E-Mail-Templates
   - Digest-Mails (täglich/wöchentlich)

2. **Erweiterte Features**
   - Gruppierung ähnlicher Benachrichtigungen
   - Filter & Suche
   - Archiv-Funktion
   - Sound-Benachrichtigungen

3. **Echtzeit-Updates**
   - Firestore Real-time Listeners
   - Optimistic UI Updates
   - WebSocket für instant Updates

## 📊 Geschätzter Zeitaufwand

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Backend & Datenmodell | 3-4 Tage | Hoch |
| Phase 2: Einstellungsseite | 2 Tage | Hoch |
| Phase 3: Anzeigeseite & Badge | 3 Tage | Hoch |
| Phase 4: Testing & Finalisierung | 2 Tage | Hoch |
| **Gesamt MVP** | **10-11 Tage** | - |
| Post-MVP Erweiterungen | 5-7 Tage | Niedrig |

## ✅ Definition of Done

- [ ] Alle Benachrichtigungstypen werden korrekt generiert
- [ ] Einstellungen funktionieren und werden respektiert
- [ ] Badge zeigt korrekte Anzahl ungelesener Benachrichtigungen
- [ ] Benachrichtigungen führen zu den richtigen Objekten
- [ ] Performance ist auch bei vielen Benachrichtigungen gut
- [ ] Code ist dokumentiert und getestet
- [ ] UI fügt sich nahtlos in bestehende Anwendung ein

## 🚦 Nächste Schritte

1. **Review** dieses Plans mit dem Team
2. **Firestore Security Rules** für notifications collection definieren
3. **Firebase Functions** Projekt aufsetzen (falls noch nicht vorhanden)
4. **Branch erstellen:** `feature/notification-system`
5. **Phase 1** beginnen mit Datenmodell und Service

---

*Letzte Aktualisierung: [Datum einfügen]*
*Verantwortlich: [Name einfügen]*