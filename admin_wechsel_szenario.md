# ADMIN-WECHSEL SZENARIO ANALYSE

## AUSGANGSSITUATION:
- **Admin A:** Stefan Müller (stefan.mueller@agency.de, photoUrl: admin-a.jpg)
- **Admin B:** Julia Schmidt (julia.schmidt@agency.de, photoUrl: admin-b.jpg)
- **Kunde:** Stefan Kühne (info@sk-online-marketing.de)

---

## SZENARIO SCHRITT-FÜR-SCHRITT:

### 1. Admin A erstellt Kampagne und bittet um Freigabe

#### NEW Seite - Step 3:
```javascript
customerApprovalMessage: "Bitte prüfen Sie unsere Pressemeldung."
```

#### teamMemberData wird geladen:
- **Zeile 1393-1401:** `teamMemberService.getByUserAndOrg(context.userId, context.organizationId)`
- **context.userId:** Admin A's userId
- **Ergebnis:**
```javascript
teamMemberData = {
  name: 'Stefan Müller',        // Admin A Name
  email: 'stefan.mueller@agency.de',  // Admin A Email  
  photoUrl: 'admin-a.jpg'       // Admin A Avatar
}
```

#### In Firebase gespeichert (history[0]):
```javascript
{
  action: 'commented',
  actorName: 'Stefan Müller',           // Admin A
  actorEmail: 'stefan.mueller@agency.de', // Admin A
  details: { comment: 'Bitte prüfen Sie unsere Pressemeldung.' },
  timestamp: Timestamp.now()
}
```

### 2. Kunde gibt Änderungswunsch

#### Freigabeseite Formular:
```javascript
await approvalService.requestChangesPublic(
  shareId,
  'info@sk-online-marketing.de',  // Kunde Email
  'Bitte Überschrift ändern',    // Kunde Nachricht
  'Stefan Kühne'                 // Kunde Name
);
```

#### In Firebase gespeichert (history[1]):
```javascript
{
  action: 'changes_requested',
  actorName: 'Stefan Kühne',              // Kunde
  actorEmail: 'info@sk-online-marketing.de', // Kunde
  details: { comment: 'Bitte Überschrift ändern' },
  timestamp: Timestamp.now()
}
```

### 3. Admin A wechselt zu Admin B

#### Kampagnen-Detailseite:
```javascript
await prService.update(campaignId, { userId: newAdminId } as any);
```

**Was passiert:**
- **campaign.userId:** Admin A userId → Admin B userId
- **Nur Campaign-Dokument wird geändert**
- **Approval-Dokument bleibt unverändert!**

### 4. Admin B schreibt Antwort über EDIT Seite

#### EDIT Seite - Step 3:
```javascript
customerApprovalMessage: "Überschrift wurde angepasst, bitte nochmals prüfen."
```

#### ❌ PROBLEM: teamMemberData wird basierend auf context.userId geladen

**Zeile 1393-1401 in pr-service.ts:**
```javascript
// Lade Teammitglied-Daten für korrekte Speicherung
let teamMemberData = undefined;
const teamMember = await teamMemberService.getByUserAndOrg(
  context.userId,    // ❌ Wer ist eingeloggt? Admin B!
  context.organizationId
);

if (teamMember) {
  teamMemberData = {
    name: teamMember.displayName,    // 'Julia Schmidt' (Admin B)
    email: teamMember.email,         // 'julia.schmidt@agency.de' (Admin B)  
    photoUrl: teamMember.photoUrl    // 'admin-b.jpg' (Admin B)
  };
}
```

#### In Firebase gespeichert (history[2]) über arrayUnion:
```javascript
{
  action: 'commented',
  actorName: 'Julia Schmidt',             // ✅ Admin B (korrekt!)
  actorEmail: 'julia.schmidt@agency.de',  // ✅ Admin B (korrekt!)
  details: { comment: 'Überschrift wurde angepasst, bitte nochmals prüfen.' },
  timestamp: Timestamp.now()
}
```

---

## ERGEBNIS AUF DER FREIGABESEITE:

### History in Firebase:
```javascript
history: [
  {
    action: 'commented',
    actorName: 'Stefan Müller',    // Admin A
    actorEmail: 'stefan.mueller@agency.de'
  },
  {
    action: 'changes_requested', 
    actorName: 'Stefan Kühne',     // Kunde
    actorEmail: 'info@sk-online-marketing.de'
  },
  {
    action: 'commented',
    actorName: 'Julia Schmidt',    // Admin B
    actorEmail: 'julia.schmidt@agency.de'
  }
]
```

### Im CommunicationToggleBox:

#### Team-Nachrichten (action === 'commented'):
1. **Stefan Müller** (Admin A) - Blauer Avatar: admin-a.jpg - "Bitte prüfen Sie unsere Pressemeldung."
2. **Julia Schmidt** (Admin B) - Blauer Avatar: admin-b.jpg - "Überschrift wurde angepasst, bitte nochmals prüfen."

#### Kunden-Nachricht (action === 'changes_requested'):
1. **Stefan Kühne** (Kunde) - Grüner Avatar: Platzhalter - "Bitte Überschrift ändern"

### In der grünen Box (CustomerMessageBanner):

```javascript
// Filtert nur Team-Nachrichten (action === 'commented')
const agencyMessages = feedbackHistory.filter(msg => 
  msg.action === 'commented'  // Beide Team-Nachrichten
);

const latestAgencyMessage = agencyMessages[agencyMessages.length - 1];
// → Julia Schmidt's Nachricht
```

**Angezeigt wird:**
- **Name:** Julia Schmidt (Admin B)
- **Avatar:** admin-b.jpg (Admin B Foto)
- **Nachricht:** "Überschrift wurde angepasst, bitte nochmals prüfen."
- **Zeit:** Neuester Zeitstempel

---

## ANTWORT AUF DIE FRAGE:

### ✅ JA - Neue Nachrichten kommen mit neuem Avatar und Namen an!

**Warum funktioniert es:**
1. **EDIT Seite** verwendet `arrayUnion()` → History bleibt erhalten
2. **teamMemberData** wird basierend auf `context.userId` geladen (eingeloggter User = Admin B)
3. **Admin B's Daten** werden korrekt in Firebase gespeichert
4. **Toggle + Grüne Box** zeigen Admin B's Avatar und Namen korrekt an

### ❌ ABER - Problem bei NEW Seite:

Wenn Admin B über die **NEW Seite** statt EDIT antwortet:
- `createCustomerApproval()` **überschreibt** komplette history
- **Kunden-Nachricht verschwindet**
- Nur Admin B's Nachricht bleibt übrig

---

## FAZIT:

**Admin-Wechsel funktioniert korrekt**, solange das Team über die **EDIT Seite** antwortet!

Das **Hauptproblem** ist nicht der Admin-Wechsel, sondern dass die **NEW Seite** die History überschreibt.