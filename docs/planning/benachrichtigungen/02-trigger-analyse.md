# Benachrichtigungs-Trigger - Detailanalyse

## Übersicht: Welche Notifications werden TATSÄCHLICH ausgelöst?

| Type | Trigger-Ort | Funktioniert? | Einstellung vorhanden? |
|------|------------|---------------|------------------------|
| `APPROVAL_GRANTED` | freigabe/[shareId]/page.tsx | ✅ JA | ✅ approvalGranted |
| `CHANGES_REQUESTED` | freigabe/[shareId]/page.tsx | ✅ JA | ✅ changesRequested |
| `FIRST_VIEW` | approval-service.ts | ✅ JA | ✅ firstView |
| `OVERDUE_APPROVAL` | use-notifications.ts | ✅ JA | ✅ overdueApprovals |
| `EMAIL_SENT_SUCCESS` | email-service.ts | ✅ JA | ✅ emailSentSuccess |
| `EMAIL_BOUNCED` | email-service.ts | ✅ JA | ✅ emailBounced |
| `TASK_OVERDUE` | use-notifications.ts | ✅ JA | ✅ taskOverdue |
| `MEDIA_FIRST_ACCESS` | media-shares-service.ts | ✅ JA | ✅ mediaFirstAccess |
| `MEDIA_DOWNLOADED` | media-shares-service.ts | ✅ JA | ✅ mediaDownloaded |
| `MEDIA_LINK_EXPIRED` | ❌ NIRGENDS | ❌ NEIN | ✅ mediaLinkExpired |
| `TEAM_CHAT_MENTION` | team-chat-notifications.ts | ✅ JA | ❌ NEIN |
| `project_assignment` | ❌ NIRGENDS | ❌ NEIN | ❌ NEIN |

---

## Detail-Analyse pro Trigger

### 1. APPROVAL_GRANTED ✅
**Datei:** `src/app/freigabe/[shareId]/page.tsx`
**Zeile:** 552
**Trigger:** Klick auf "Genehmigen" Button auf der Kunden-Freigabe-Seite
**Code:**
```typescript
await notificationsService.notifyApprovalGranted({
  userId: approval.requestedBy!,
  campaignId: approval.campaignId,
  campaignTitle: approval.campaignTitle!,
  senderName: approval.recipients?.[0]?.name || 'Kunde',
  organizationId: approval.organizationId
});
```

---

### 2. CHANGES_REQUESTED ✅
**Datei:** `src/app/freigabe/[shareId]/page.tsx`
**Zeile:** 624
**Trigger:** Klick auf "Änderungen erbeten" Button auf der Kunden-Freigabe-Seite
**Code:**
```typescript
await notificationsService.notifyChangesRequested({
  userId: approval.requestedBy!,
  campaignId: approval.campaignId,
  campaignTitle: approval.campaignTitle!,
  senderName: approval.recipients?.[0]?.name || 'Kunde',
  organizationId: approval.organizationId
});
```

---

### 3. FIRST_VIEW ✅
**Datei:** `src/lib/firebase/approval-service.ts`
**Zeile:** 715-719
**Trigger:** Wenn Freigabe zum ersten Mal angesehen wird (wasFirstView === true)
**Code:**
```typescript
await notificationsService.notifyFirstView({
  userId: approval.requestedBy,
  campaignId: approval.campaignId,
  campaignTitle: approval.campaignTitle || 'Unbekannt',
  senderName: approval.recipients?.[0]?.name || 'Unbekannt',
  organizationId: approval.organizationId
});
```

---

### 4. OVERDUE_APPROVAL ✅
**Datei:** `src/hooks/use-notifications.ts`
**Zeile:** 387-446
**Trigger:** Automatischer Check bei Route-Wechsel/Tab-Focus (max. alle 5 Min)
**Code:**
```typescript
const checkForOverdueItems = async () => {
  // ... Query alle Approvals mit status 'pending' oder 'in_review'
  // Für jede überfällige Freigabe:
  await notificationsService.create({
    type: 'OVERDUE_APPROVAL',
    userId: user.uid,
    title: `Überfällige Freigabe für ${approval.campaignTitle}`,
    message: `Die Freigabe-Anfrage ist seit ${Math.abs(diffDays)} Tagen überfällig.`,
    // ...
  });
};
```

---

### 5. EMAIL_SENT_SUCCESS ✅
**Datei:** `src/lib/email/email-service.ts`
**Zeile:** 129-133
**Trigger:** Nach erfolgreichem E-Mail-Versand einer Kampagne
**Code:**
```typescript
await notificationsService.notifyEmailSent({
  userId,
  campaignId,
  campaignTitle: campaign.title,
  recipientCount: results.sent,
  organizationId
});
```

---

### 6. EMAIL_BOUNCED ✅
**Datei:** `src/lib/email/email-service.ts`
**Zeile:** 148-160
**Trigger:** E-Mail-Bounce erkannt (einzeln oder aggregiert bei >5)
**Code:**
```typescript
// Einzeln:
await notificationsService.notifyEmailBounced({
  userId,
  campaignId,
  campaignTitle: campaign.title,
  bouncedEmail: bounce.email,
  organizationId
});

// Aggregiert (>5 Bounces):
await notificationsService.notifyEmailBounced({
  userId,
  campaignId,
  campaignTitle: campaign.title,
  bouncedEmail: `${results.bounced} Empfänger`,
  organizationId
});
```

---

### 7. TASK_OVERDUE ✅
**Datei:** `src/hooks/use-notifications.ts`
**Zeile:** 448-498
**Trigger:** Automatischer Check bei Route-Wechsel/Tab-Focus (max. alle 5 Min)
**Code:**
```typescript
const checkOverdueTasks = async () => {
  // ... Query alle Tasks mit assignedUserId === user.uid
  // Für jeden überfälligen Task:
  await notificationsService.create({
    type: 'TASK_OVERDUE',
    userId: user.uid,
    title: `Überfälliger Task: ${task.title}`,
    message: `Der Task ist seit ${Math.abs(diffDays)} Tag${Math.abs(diffDays) === 1 ? '' : 'en'} überfällig.`,
    // ...
  });
};
```

---

### 8. MEDIA_FIRST_ACCESS ✅
**Datei:** `src/lib/firebase/media-shares-service.ts`
**Zeile:** 202-205
**Trigger:** Geteilter Link wird zum ersten Mal aufgerufen
**Code:**
```typescript
await notificationsService.notifyMediaAccessed({
  userId: share.createdBy,
  assetId: share.assetId,
  assetName: share.metadata?.fileName || 'Unbekannte Datei',
  organizationId: share.organizationId
});
```

---

### 9. MEDIA_DOWNLOADED ✅
**Datei:** `src/lib/firebase/media-shares-service.ts`
**Zeile:** 277-282
**Trigger:** Datei wird über geteilten Link heruntergeladen
**Code:**
```typescript
await notificationsService.notifyMediaDownloaded({
  userId: share.createdBy,
  assetId: share.assetId,
  assetName: share.metadata?.fileName || 'Unbekannte Datei',
  organizationId: share.organizationId
});
```

---

### 10. MEDIA_LINK_EXPIRED ❌ NICHT IMPLEMENTIERT
**Problem:** Es gibt eine Einstellung `mediaLinkExpired` aber keinen Trigger dafür!
**Lösung erforderlich:**
- Cronjob/Cloud Function die täglich abgelaufene Links prüft
- Oder: Check beim Aufruf eines abgelaufenen Links

---

### 11. TEAM_CHAT_MENTION ✅
**Datei:** `src/lib/firebase/team-chat-notifications.ts`
**Zeile:** 87-103
**Trigger:** @-Mention im Team-Chat
**Code:**
```typescript
await notificationsService.create({
  type: 'TEAM_CHAT_MENTION',
  userId: mentionedUserId,
  title: `${mentionedByName} hat dich erwähnt`,
  message: `In "${projectTitle}": ${messagePreview}`,
  // ...
});
```
**Problem:** Keine Einstellung in Settings-Seite!

---

### 12. project_assignment ❌ NICHT IMPLEMENTIERT
**Problem:** Type existiert aber wird nirgends ausgelöst!
**Lösung erforderlich:**
- Bei Projekt-Zuweisung Notification erstellen

---

## Zusammenfassung der Probleme

| Problem | Typ | Lösung |
|---------|-----|--------|
| `MEDIA_LINK_EXPIRED` hat keinen Trigger | Fehlende Implementierung | Cloud Function oder Client-Check |
| `TEAM_CHAT_MENTION` hat keine Einstellung | Fehlende UI | Einstellung zur Settings-Seite hinzufügen |
| `project_assignment` wird nie ausgelöst | Fehlende Implementierung | Bei Projekt-Zuweisung triggern |
| `firstView` Einstellung ohne Label | UI-Bug | - |
