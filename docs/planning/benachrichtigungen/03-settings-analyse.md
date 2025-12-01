# Settings-Seite Analyse

## Aktuelle Einstellungen in der UI

Die Settings-Seite zeigt folgende Einstellungen:

### Freigaben
| Setting | Label | Funktioniert? |
|---------|-------|---------------|
| `approvalGranted` | Korrekturstatus: Freigabe erteilt | ✅ JA |
| `changesRequested` | Korrekturstatus: Änderungen erbeten | ✅ JA |
| `overdueApprovals` | Überfällige Freigabe-Anfragen | ✅ JA |
| `overdueApprovalDays` | Tage bis zur Überfälligkeit | ✅ JA |

### Schedule Mails
| Setting | Label | Funktioniert? |
|---------|-------|---------------|
| `emailSentSuccess` | Erfolgsmeldung nach Versand | ✅ JA |
| `emailBounced` | Bounce-Benachrichtigung | ✅ JA |

### Tasks
| Setting | Label | Funktioniert? |
|---------|-------|---------------|
| `taskOverdue` | Überfällige Kalender-Tasks | ✅ JA |

### Mediencenter
| Setting | Label | Funktioniert? |
|---------|-------|---------------|
| `mediaFirstAccess` | Erstmaliger Zugriff auf einen geteilten Link | ✅ JA |
| `mediaDownloaded` | Download eines geteilten Mediums | ✅ JA |
| `mediaLinkExpired` | Ablaufdatum eines Links überschritten | ❌ NEIN - Kein Trigger! |

---

## Fehlende Einstellungen

Diese Notification-Types haben KEINEN Eintrag in der Settings-Seite:

| Type | Beschreibung | Empfehlung |
|------|-------------|------------|
| `firstView` | Kampagne zum ersten Mal angesehen | ⚠️ HINZUFÜGEN zur Freigaben-Gruppe |
| `TEAM_CHAT_MENTION` | @-Erwähnung im Team-Chat | ⚠️ Neue Gruppe "Team-Chat" hinzufügen |
| `project_assignment` | Projekt-Zuweisung | ⚠️ Nicht implementiert, kann ignoriert werden |

---

## Probleme zusammengefasst

### 1. `mediaLinkExpired` - Einstellung existiert aber Trigger fehlt
**Status:** ❌ FALSCHE EINSTELLUNG
**Problem:** Die Einstellung kann aktiviert/deaktiviert werden, aber es gibt keinen Code der diese Notification auslöst.
**Empfehlung:**
- Option A: Trigger implementieren (Cloud Function die täglich prüft)
- Option B: Einstellung aus UI entfernen bis implementiert

### 2. `firstView` - Trigger existiert aber Einstellung fehlt
**Status:** ⚠️ FEHLENDE EINSTELLUNG
**Problem:** Die Notification wird ausgelöst, aber der User kann sie nicht deaktivieren.
**Empfehlung:** Einstellung zur Freigaben-Gruppe hinzufügen

### 3. `TEAM_CHAT_MENTION` - Trigger existiert aber Einstellung fehlt
**Status:** ⚠️ FEHLENDE EINSTELLUNG
**Problem:** Die Notification wird ausgelöst, aber der User kann sie nicht deaktivieren.
**Empfehlung:** Neue Gruppe "Team" hinzufügen mit dieser Einstellung

---

## Empfohlene Änderungen

### Zur Settings-Seite hinzufügen:

```typescript
// Zu Freigaben-Gruppe hinzufügen:
{
  key: 'firstView',
  label: 'Erstmaliges Ansehen einer Freigabe',
  description: 'Benachrichtigung wenn der Kunde die Freigabe zum ersten Mal öffnet'
}

// Neue Gruppe "Team" hinzufügen:
{
  title: 'Team',
  icon: UserGroupIcon,
  settings: [
    {
      key: 'teamChatMention',
      label: '@-Erwähnungen im Team-Chat',
      description: 'Benachrichtigung wenn Sie in einem Team-Chat erwähnt werden'
    }
  ]
}
```

### Aus Settings-Seite entfernen (bis implementiert):
```typescript
// Aus Mediencenter entfernen:
{
  key: 'mediaLinkExpired',
  label: 'Ablaufdatum eines Links überschritten',
  // ... (ENTFERNEN oder als "Coming Soon" markieren)
}
```

---

## Settings-State Interface Update

Aktuell:
```typescript
interface NotificationSettingsState {
  approvalGranted: boolean;
  changesRequested: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  emailSentSuccess: boolean;
  emailBounced: boolean;
  taskOverdue: boolean;
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  mediaLinkExpired: boolean;  // ❌ Trigger fehlt
  // ⚠️ firstView fehlt
  // ⚠️ teamChatMention fehlt
}
```

Empfohlen:
```typescript
interface NotificationSettingsState {
  // Freigaben
  approvalGranted: boolean;
  changesRequested: boolean;
  firstView: boolean;           // ✅ HINZUFÜGEN
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
  // mediaLinkExpired: boolean;  // ❌ ENTFERNEN bis implementiert

  // Team (NEU)
  teamChatMention: boolean;     // ✅ HINZUFÜGEN
}
```
