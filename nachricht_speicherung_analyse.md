# Analyse: Nachrichtenspeicherung in beiden Bereichen

## 1. KUNDE (Kommentar-Toggle-Box auf Freigabe-Seite)

### Wo gespeichert:
- `approvalService.requestChangesPublic()` in `/src/app/freigabe/[shareId]/page.tsx` Zeile 661-666
- `approvalService.submitDecisionPublic()` in `/src/app/freigabe/[shareId]/page.tsx` Zeile 590-595

### Was wird gespeichert:
```javascript
// Bei Änderungen anfordern:
await approvalService.requestChangesPublic(
  shareId,
  customerContact?.email || 'customer@freigabe.system', // Customer E-Mail
  textToSubmit.trim(), // Der Kommentar
  customerContact?.name || 'Kunde' // Der Name
);

// Bei Freigabe:
await approvalService.submitDecisionPublic(
  shareId,
  'approved',
  undefined, // Kein Kommentar
  customerContact?.name || 'Kunde' // Der Name
);
```

### Im approval-service.ts wird daraus:
- `action: 'changes_requested'` (Zeile 933) - **KUNDE-KENNZEICHEN**
- `actorName: authorName || 'Kunde'` (Zeile 934)
- `actorEmail: recipientEmail || 'public-access@freigabe.system'` (Zeile 935)
- `timestamp: Timestamp.now()` (Zeile 932)

## 2. TEAM (Step 3 Edit-Seite)

### Wo gespeichert:
- In `customerApprovalMessage` im `approvalData` Objekt
- Wird beim Speichern der Kampagne übertragen

### Was wird gespeichert:
```javascript
// Step 3 speichert:
const approvalData = {
  customerApprovalRequired: boolean,
  customerContact: object, // Name, Email, etc.
  customerApprovalMessage: string // Die Nachricht vom Team
}
```

### Im approval-service.ts wird daraus:
- `action: 'commented'` (Zeile 273) - **TEAM-KENNZEICHEN**
- `actorName: teamMemberData?.name || 'Teammitglied'` (Zeile 274) - BEHOBEN ✅
- `actorEmail: teamMemberData?.email || 'team@celeropress.com'` (Zeile 275) - BEHOBEN ✅
- `timestamp: Timestamp.now()` (Zeile 272)

## ERKENNTNISSE:

### Unterscheidung KUNDE vs TEAM:
- **KUNDE**: `action: 'changes_requested'`
- **TEAM**: `action: 'commented'`
- ❌ NICHT über Namen oder Email unterscheiden (beide können gleich sein!)
- ✅ Über `action`-Feld in der feedbackHistory unterscheiden

### Zeit-Problem:
- feedbackHistory wird nicht chronologisch sortiert angezeigt
- Neueste Nachrichten sollten zuletzt/oben stehen
- Aktuell: 12:52 → 12:50 → 12:52 (falsche Reihenfolge)

## LÖSUNG:
1. In CommunicationToggleBox: `feedback.action === 'changes_requested'` für Kunde-Erkennung
2. feedbackHistory nach timestamp sortieren
3. Team-Namen/Email bereits behoben

### Stellen zu ändern:
- `/src/app/freigabe/[shareId]/page.tsx` Zeilen 986-990 und 1025-1027 (isCustomer-Logik)
- Sort-Logic für feedbackHistory hinzufügen