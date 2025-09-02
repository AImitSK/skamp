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
- `actorName: authorName || 'Kunde'` (Zeile 933)
- `actorEmail: recipientEmail || 'public-access@freigabe.system'` (Zeile 934)
- `timestamp: Timestamp.now()` (Zeile 931)

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
- `actorName: 'Ihre Nachricht'` (Zeile 273) - FEST CODIERT!
- `actorEmail: 'agentur@celeropress.com'` (Zeile 274) - FEST CODIERT!
- `timestamp: Timestamp.now()` (Zeile 271)

## PROBLEM IDENTIFIZIERT:

### Kunde:
- ✅ Name: Kommt aus `customerContact?.name` 
- ✅ Email: Kommt aus `customerContact?.email`
- ✅ Zeit: Wird korrekt gesetzt

### Team: 
- ❌ Name: Fest kodiert als "Ihre Nachricht" statt dem echten Teammitglied-Namen
- ❌ Email: Fest kodiert als "agentur@celeropress.com" 
- ✅ Zeit: Wird korrekt gesetzt

## LÖSUNG:
Bei Step 3 müssen wir beim Erstellen der Approval den echten Teammitglied-Namen und dessen Email übergeben, statt die fest kodierten Werte zu verwenden.

Die Stelle ist in `/src/lib/firebase/approval-service.ts` Zeile 271-276 in der `createFromCampaignWithMessage` Funktion.