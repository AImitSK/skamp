# Benachrichtigungssystem - Analyse

## Übersicht

Das Benachrichtigungssystem besteht aus folgenden Hauptkomponenten:

### Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────┐
│ Trigger-Punkte (Services/Pages)                        │
├─────────────────────────────────────────────────────────┤
│ • email-service.ts          → EMAIL_SENT_SUCCESS       │
│ • email-service.ts          → EMAIL_BOUNCED            │
│ • approval-service.ts       → FIRST_VIEW               │
│ • freigabe/[shareId]/page   → APPROVAL_GRANTED         │
│ • freigabe/[shareId]/page   → CHANGES_REQUESTED        │
│ • media-shares-service.ts   → MEDIA_FIRST_ACCESS       │
│ • media-shares-service.ts   → MEDIA_DOWNLOADED         │
│ • team-chat-notifications   → TEAM_CHAT_MENTION        │
│ • use-notifications.ts      → OVERDUE_APPROVAL         │
│ • use-notifications.ts      → TASK_OVERDUE             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ notificationsService (Haupt-Service)                   │
├─────────────────────────────────────────────────────────┤
│ • Validation (validateNotificationContext)             │
│ • Settings Check (isNotificationEnabled)               │
│ • Message Formatting (formatMessage)                   │
│ • Firestore Persistence                                │
│ • Real-time Subscriptions                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Firestore Collections                                   │
├─────────────────────────────────────────────────────────┤
│ • notifications (Daten)                                 │
│ • notification_settings (Benutzer-Einstellungen)        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ React Hooks (Client)                                    │
├─────────────────────────────────────────────────────────┤
│ • useNotifications() → Notifications + Actions          │
│ • useNotificationSettings() → Settings + Updates        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ UI-Komponenten                                          │
├─────────────────────────────────────────────────────────┤
│ • NotificationsDropdown (Header Badge)                  │
│ • NotificationList (Volle Liste)                        │
│ • NotificationItem (Single Item)                        │
│ • NotificationBadge (Icon + Zähler)                     │
│ • NotificationSettings (Settings Page)                  │
└─────────────────────────────────────────────────────────┘
```

---

## Notification-Types

| Type | Beschreibung | UI-Farbe |
|------|-------------|----------|
| `APPROVAL_GRANTED` | Freigabe erteilt | Grün |
| `CHANGES_REQUESTED` | Änderungen erbeten | Gelb |
| `FIRST_VIEW` | Kampagne zum ersten Mal angesehen | Blau |
| `OVERDUE_APPROVAL` | Freigabe-Anfrage überfällig | Rot |
| `EMAIL_SENT_SUCCESS` | Kampagne erfolgreich versendet | Blau |
| `EMAIL_BOUNCED` | E-Mail Bounce | Orange |
| `TASK_OVERDUE` | Task überfällig | Rot |
| `MEDIA_FIRST_ACCESS` | Geteilter Link aufgerufen | Lila |
| `MEDIA_DOWNLOADED` | Datei heruntergeladen | Indigo |
| `MEDIA_LINK_EXPIRED` | Link abgelaufen | Grau |
| `TEAM_CHAT_MENTION` | @-Erwähnung im Team-Chat | - |
| `project_assignment` | Projekt-Zuweisung | - |

---

## Beteiligte Dateien

### Services
- `src/lib/firebase/notifications-service.ts` - Haupt-Service
- `src/lib/firebase/media-shares-service.ts` - Media-Notifications
- `src/lib/firebase/approval-service.ts` - Freigabe-Notifications
- `src/lib/firebase/team-chat-notifications.ts` - Chat-Mentions
- `src/lib/email/email-service.ts` - Email-Notifications

### Hooks
- `src/hooks/use-notifications.ts` - React Hook für Notifications

### UI-Komponenten
- `src/components/notifications/NotificationsDropdown.tsx`
- `src/components/notifications/NotificationList.tsx`
- `src/components/notifications/NotificationItem.tsx`
- `src/components/notifications/NotificationSettings.tsx`
- `src/components/notifications/NotificationBadge.tsx`

### Typen
- `src/types/notifications.ts`

### Seiten
- `src/app/dashboard/settings/notifications/page.tsx`
- `src/app/dashboard/communication/notifications/page.tsx`
- `src/app/freigabe/[shareId]/page.tsx`

---

## Datenbank-Struktur

### Collection: `notifications`
```typescript
{
  id: string
  userId: string
  organizationId?: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  linkType?: 'campaign' | 'approval' | 'media' | 'task' | 'project'
  linkId?: string
  isRead: boolean
  metadata?: Record<string, any>
  createdAt: Timestamp
  readAt?: Timestamp
}
```

### Collection: `notification_settings`
```typescript
{
  id: string
  userId: string
  organizationId?: string

  // Freigaben
  approvalGranted: boolean
  changesRequested: boolean
  firstView: boolean
  overdueApprovals: boolean
  overdueApprovalDays: number

  // Schedule Mails
  emailSentSuccess: boolean
  emailBounced: boolean

  // Tasks
  taskOverdue: boolean

  // Mediencenter
  mediaFirstAccess: boolean
  mediaDownloaded: boolean
  mediaLinkExpired: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}
```
