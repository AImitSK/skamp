# FREIGABEZYKLUS ANALYSE - Stefan Kühne Beispiel

## AUSGANGSSITUATION:
- **Kunde:** Stefan Kühne (info@sk-online-marketing.de)
- **Team-User:** Stefan Kühne (info@sk-online-marketing.de) 
- **Problem:** Beide haben identische Namen und E-Mails

---

## SCHRITT 1: NEW Kampagne - Step 3 Freigabe einrichten

### Datei: `/src/app/dashboard/pr-tools/campaigns/new/page.tsx`
### Was passiert:
```javascript
const approvalData = {
  customerApprovalRequired: true,
  customerContact: {
    name: 'Stefan Kühne',
    email: 'info@sk-online-marketing.de'
  },
  customerApprovalMessage: 'Bitte prüfen Sie die Pressemeldung.'
}
```

### Gespeichert in: Campaign-Dokument
- `approvalData.customerContact.name`: "Stefan Kühne"
- `approvalData.customerContact.email`: "info@sk-online-marketing.de"
- `approvalData.customerApprovalMessage`: "Bitte prüfen Sie die Pressemeldung."

### Aufruf:
```javascript
// In prService.create()
await approvalService.createCustomerApproval(campaign.id, approvalData.customerApprovalMessage, teamMemberData)
```

---

## SCHRITT 2: approvalService.createCustomerApproval()

### Datei: `/src/lib/firebase/approval-service.ts` Zeile 271-276
### Was passiert:
```javascript
history: customerMessage ? [{
  id: nanoid(),
  timestamp: Timestamp.now(),
  action: 'commented',  // TEAM-KENNZEICHEN!
  actorName: teamMemberData?.name || 'Teammitglied',     // "Stefan Kühne" (Team-User)
  actorEmail: teamMemberData?.email || 'team@celeropress.com', // "info@sk-online-marketing.de"
  details: {
    comment: customerMessage  // "Bitte prüfen Sie die Pressemeldung."
  }
}] : []
```

### Gespeichert in: Approval-Dokument
- `history[0].action`: "commented" (= TEAM)
- `history[0].actorName`: "Stefan Kühne" (Team-User Name)
- `history[0].actorEmail`: "info@sk-online-marketing.de" (Team-User Email)
- `history[0].details.comment`: "Bitte prüfen Sie die Pressemeldung."
- `history[0].timestamp`: Zeitstempel

---

## SCHRITT 3: Freigabeseite - Kunde will Änderungen

### Datei: `/src/app/freigabe/[shareId]/page.tsx` Zeile 661-666
### Was passiert:
```javascript
await approvalService.requestChangesPublic(
  shareId,
  customerContact?.email || 'customer@freigabe.system', // "info@sk-online-marketing.de"
  textToSubmit.trim(), // "Bitte Überschrift ändern"
  customerContact?.name || 'Kunde' // "Stefan Kühne"
);
```

---

## SCHRITT 4: approvalService.requestChangesPublic()

### Datei: `/src/lib/firebase/approval-service.ts` Zeile 930-939
### Was passiert:
```javascript
const historyEntry: ApprovalHistoryEntry = {
  id: nanoid(),
  timestamp: Timestamp.now(),
  action: 'changes_requested',  // KUNDE-KENNZEICHEN!
  actorName: authorName || 'Kunde',  // "Stefan Kühne" (Kunde)
  actorEmail: recipientEmail || 'public-access@freigabe.system',  // "info@sk-online-marketing.de"
  details: {
    comment: comment,  // "Bitte Überschrift ändern"
    previousStatus: approval.status,
    newStatus: 'changes_requested'
  }
}
```

### Gespeichert in: Approval-Dokument (arrayUnion)
- `history[1].action`: "changes_requested" (= KUNDE)
- `history[1].actorName`: "Stefan Kühne" (Kunde Name)
- `history[1].actorEmail`: "info@sk-online-marketing.de" (Kunde Email)
- `history[1].details.comment`: "Bitte Überschrift ändern"
- `history[1].timestamp`: Zeitstempel

---

## SCHRITT 5: Edit Seite - Team antwortet in Step 3

### Datei: `/src/app/dashboard/pr-tools/campaigns/edit/[campaignId]/page.tsx`
### Was passiert:
```javascript
const updatedApprovalData = {
  ...existingApprovalData,
  customerApprovalMessage: 'Überschrift wurde angepasst, bitte nochmals prüfen.'
}

// Beim Speichern:
await approvalService.createCustomerApproval(campaignId, updatedApprovalData.customerApprovalMessage, teamMemberData)
```

---

## SCHRITT 6: Erneuter Aufruf approvalService.createCustomerApproval()

### Was passiert: ÜBERSCHREIBT die komplette history!
```javascript
// GEFAHR: Überschreibt vorherige Einträge!
history: customerMessage ? [{
  id: nanoid(),
  timestamp: Timestamp.now(),
  action: 'commented',  // TEAM-KENNZEICHEN!
  actorName: teamMemberData?.name || 'Teammitglied',     // "Stefan Kühne" (Team-User)
  actorEmail: teamMemberData?.email || 'team@celeropress.com', // "info@sk-online-marketing.de"
  details: {
    comment: customerMessage  // "Überschrift wurde angepasst, bitte nochmals prüfen."
  }
}] : []
```

### Gespeichert in: Approval-Dokument (ÜBERSCHRIEBEN!)
- `history[0].action`: "commented" (= TEAM)
- `history[0].actorName`: "Stefan Kühne" (Team-User Name)  
- `history[0].actorEmail`: "info@sk-online-marketing.de" (Team-User Email)
- `history[0].details.comment`: "Überschrift wurde angepasst, bitte nochmals prüfen."
- `history[0].timestamp`: Neuer Zeitstempel

**PROBLEM:** Die Kundenachricht "Bitte Überschrift ändern" ist WEG!

---

## SCHRITT 7: Freigabeseite - Was kommt im Kommunikations-Toggle an?

### Datei: `/src/app/freigabe/[shareId]/page.tsx` Zeile 981-1018
### Was passiert:
```javascript
// Lade approval-Daten
const approvalData = await approvalService.getByShareId(shareId);

// feedbackHistory wird aus approval.history aufgebaut
feedbackHistory: approvalData.history?.filter(h => h.details?.comment).map(h => {
  let authorName = h.actorName || 'Teammitglied';
  
  // NUR für Kundennachrichten: Ersetze "Kunde" durch den echten Namen
  if (h.actorName === 'Kunde' || h.actorEmail?.includes('customer') || h.actorEmail?.includes('freigabe.system')) {
    if (approvalData.recipients?.[0]?.name) {
      authorName = approvalData.recipients[0].name;
    } else if (customerContact?.name) {
      authorName = customerContact.name;
    }
  }
  
  return {
    comment: h.details?.comment,
    requestedAt: h.timestamp,
    author: authorName,  // "Stefan Kühne"
    action: h.action     // "commented" oder "changes_requested"
  };
})
```

### Im CommunicationToggleBox:
```javascript
const isCustomer = feedback.action === 'changes_requested';

if (isCustomer) {
  senderName = customerContact?.name || 'Kunde';        // "Stefan Kühne"
  senderAvatar = grüner Avatar;
} else {
  senderName = teamMember?.displayName || feedback.author; // "Stefan Kühne" 
  senderAvatar = blauer Avatar;
}
```

---

## ERGEBNIS IM TOGGLE:

Nur 1 Nachricht sichtbar:
- **Sender:** Stefan Kühne (blauer Avatar)
- **Typ:** Feedback (Team)
- **Nachricht:** "Überschrift wurde angepasst, bitte nochmals prüfen."
- **Zeit:** Neuester Zeitstempel

**PROBLEM:** Kundennachricht wurde überschrieben!

---

## HAUPTPROBLEME IDENTIFIZIERT:

1. **createCustomerApproval() ÜBERSCHREIBT** die komplette history statt zu erweitern
2. **Gleiche Namen/Emails** führen zu falscher Darstellung
3. **Kunde-Nachricht geht verloren** bei Team-Antwort

## LÖSUNG:
- createCustomerApproval() muss history ERWEITERN statt überschreiben
- Verwendung von arrayUnion() wie bei requestChangesPublic()

---

## DETAILIERTE DATENHERKUNFT FÜR JEDE NACHRICHT

### SCHRITT 1: Team-Nachricht (Step 3 - Kampagne erstellen)

**Datenquelle:** `approvalService.createCustomerApproval()` Zeile 271-276

#### ERSTELLER (Team):
- **Name:** 
  - Herkunft: `teamMemberData?.name` aus `userService.getCurrentTeamMember()`
  - Wert: "Stefan Kühne" (eingeloggter Team-User)
  - Gespeichert als: `history[0].actorName`

- **Avatar Bild:**
  - Herkunft: `teamMember?.photoUrl` aus Team-Daten
  - Wenn vorhanden: Echtes Foto-URL
  - Platzhalter: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=005fab&color=fff&size=32` (BLAU)

#### WANN:
- **Herkunft:** `Timestamp.now()` bei Erstellung
- **Gespeichert als:** `history[0].timestamp`
- **Angezeigt als:** Formatiert mit `formatDate()` → "02.09.2025, 12:50"

#### NACHRICHT:
- **Herkunft:** `customerApprovalMessage` aus Step 3 Formular
- **Wert:** "Bitte prüfen Sie die Pressemeldung."
- **Gespeichert als:** `history[0].details.comment`

#### ERKENNUNGSFELD:
- **action:** "commented" (= TEAM-KENNZEICHEN)

---

### SCHRITT 2: Kunden-Nachricht (Freigabeseite Formular)

**Datenquelle:** `approvalService.requestChangesPublic()` Zeile 930-939

#### ERSTELLER (Kunde):
- **Name:** 
  - Herkunft: `customerContact?.name` aus Campaign → approvalData → customerContact
  - Ursprung: Step 3 Auswahl bei Kampagne-Erstellung
  - Wert: "Stefan Kühne" (ausgewählter Kunde)
  - Gespeichert als: `history[1].actorName`

- **Avatar Bild:**
  - Herkunft: Kein echtes Foto für Kunden
  - Platzhalter: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff&size=32` (GRÜN)

#### WANN:
- **Herkunft:** `Timestamp.now()` beim Absenden des Formulars
- **Gespeichert als:** `history[1].timestamp`
- **Angezeigt als:** Formatiert mit `formatDate()` → "02.09.2025, 12:52"

#### NACHRICHT:
- **Herkunft:** Textarea im Feedback-Formular auf Freigabeseite
- **Wert:** "Bitte Überschrift ändern"
- **Gespeichert als:** `history[1].details.comment`

#### ERKENNUNGSFELD:
- **action:** "changes_requested" (= KUNDE-KENNZEICHEN)

---

### SCHRITT 3: Team-Antwort (Step 3 - Edit Seite)

**Datenquelle:** Erneuter `approvalService.createCustomerApproval()` Aufruf

#### ERSTELLER (Team):
- **Name:** 
  - Herkunft: `teamMemberData?.name` aus `userService.getCurrentTeamMember()`
  - Wert: "Stefan Kühne" (eingeloggter Team-User)
  - Gespeichert als: `history[0].actorName` (ÜBERSCHREIBT!)

- **Avatar Bild:**
  - Herkunft: `teamMember?.photoUrl` aus Team-Daten
  - Wenn vorhanden: Echtes Foto-URL
  - Platzhalter: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=005fab&color=fff&size=32` (BLAU)

#### WANN:
- **Herkunft:** `Timestamp.now()` bei Edit-Seite Speichern
- **Gespeichert als:** `history[0].timestamp` (ÜBERSCHREIBT!)
- **Angezeigt als:** Formatiert mit `formatDate()` → "02.09.2025, 12:55"

#### NACHRICHT:
- **Herkunft:** `customerApprovalMessage` aus Step 3 Edit-Formular
- **Wert:** "Überschrift wurde angepasst, bitte nochmals prüfen."
- **Gespeichert als:** `history[0].details.comment` (ÜBERSCHREIBT!)

#### ERKENNUNGSFELD:
- **action:** "commented" (= TEAM-KENNZEICHEN)

---

## WIE DIE DATEN IN DER FREIGABESEITE ANKOMMEN

### Datei: `/src/app/freigabe/[shareId]/page.tsx` Zeile 460-480

```javascript
feedbackHistory: approvalData.history?.filter(h => h.details?.comment).map(h => {
  // Verwende den Namen aus recipients für Kunden, sonst actorName
  let authorName = h.actorName || 'Teammitglied';
  
  // NUR für Kundennachrichten: Ersetze "Kunde" durch den echten Namen
  if (h.actorName === 'Kunde' || h.actorEmail?.includes('customer') || h.actorEmail?.includes('freigabe.system')) {
    if (approvalData.recipients?.[0]?.name) {
      authorName = approvalData.recipients[0].name;
    } else if (customerContact?.name) {
      authorName = customerContact.name;
    }
  }
  
  return {
    comment: h.details?.comment,        // NACHRICHT
    requestedAt: h.timestamp,           // WANN
    author: authorName,                 // ERSTELLER NAME
    action: h.action                    // ERKENNUNGSFELD
  };
})
```

### Im CommunicationToggleBox (Zeile 987-995):

```javascript
const isCustomer = feedback.action === 'changes_requested';

// ERSTELLER NAME
let senderName;
if (isCustomer) {
  senderName = customerContact?.name || 'Kunde';           // "Stefan Kühne" (Kunde)
} else {
  senderName = teamMember?.displayName || feedback.author; // "Stefan Kühne" (Team)
}

// AVATAR
let senderAvatar;
if (isCustomer) {
  // KUNDE: Grüner Platzhalter
  senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
} else {
  // TEAM: Echtes Foto oder blauer Platzhalter
  senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
}
```

---

## FINALE ANZEIGE IM TOGGLE

Nach dem kompletten Zyklus wird nur 1 Nachricht angezeigt:

**ERSTELLER:** Stefan Kühne (Team)
- **Name:** Aus `teamMember?.displayName`
- **Avatar:** `teamMember?.photoUrl` oder blauer Platzhalter

**WANN:** 02.09.2025, 12:55 
- **Herkunft:** `h.timestamp` aus der letzten Team-Nachricht

**NACHRICHT:** "Überschrift wurde angepasst, bitte nochmals prüfen."
- **Herkunft:** `h.details?.comment` aus der letzten Team-Nachricht

**ERKENNUNGSFELD:** `action: 'commented'` → isCustomer = false → Team-Styling

---

## WARUM KUNDEN-NACHRICHT VERSCHWINDET:

1. **Schritt 1:** Team erstellt history[0] mit "commented"
2. **Schritt 2:** Kunde fügt history[1] hinzu mit "changes_requested" (arrayUnion)  
3. **Schritt 3:** Team ÜBERSCHREIBT komplette history mit nur 1 Entry "commented"

→ **Kunden-Nachricht history[1] wird gelöscht!**

---

## ZUSÄTZLICHER BUG: FALSCHE ANZEIGE NACH KUNDE-ABSENDEN

### Situation: Kunde schreibt Änderungswunsch und drückt "Absenden"

**Was passiert OHNE Reload:**

### Datei: `/src/app/freigabe/[shareId]/page.tsx` Zeile 716-720

```javascript
// Lokaler State Update nach Absenden:
const newFeedback = {
  comment: feedbackText.trim(),              // ✅ "Bitte Überschrift ändern"
  requestedAt: new Date() as any,            // ✅ Aktuelle Zeit
  author: customerContact?.name || 'Kunde'   // ✅ "Stefan Kühne"
  // ❌ FEHLT: action: 'changes_requested'
};

// Wird zu feedbackHistory hinzugefügt
feedbackHistory: [...(campaign.approvalData?.feedbackHistory || []), newFeedback]
```

### Im CommunicationToggleBox wird diese Nachricht verarbeitet:

```javascript
const isCustomer = feedback.action === 'changes_requested';
// → feedback.action ist undefined (fehlt im lokalen State)
// → isCustomer = false
// → Wird als TEAM-Nachricht behandelt!

if (isCustomer) {
  senderName = customerContact?.name || 'Kunde';           // Wird NICHT ausgeführt
  senderAvatar = grüner Avatar;                            // Wird NICHT ausgeführt  
} else {
  senderName = teamMember?.displayName || feedback.author; // ✅ "Stefan Kühne"
  senderAvatar = blauer Avatar;                            // ❌ FALSCH: blauer Avatar
}
```

### WAS DER KUNDE SIEHT (sofort nach Absenden):

**ANZEIGE:**
- ❌ **Avatar:** BLAU (Team-Styling) statt GRÜN (Kunde-Styling)
- ❌ **Typ:** Als "Team-Nachricht" erkannt
- ✅ **Name:** "Stefan Kühne" (korrekt)
- ✅ **Nachricht:** "Bitte Überschrift ändern" (korrekt)
- ✅ **Zeit:** "gerade eben" (korrekt)

**NACH RELOAD:**
- ✅ **Avatar:** GRÜN (Kunde-Styling) - korrekt
- ✅ **Typ:** Als "Kunde-Nachricht" erkannt
- ✅ Alle anderen Daten bleiben gleich

### GRUND FÜR DEN BUG:

1. **Firebase speichert:** `action: 'changes_requested'` (korrekt)
2. **Lokaler State fehlt:** `action`-Feld wird nicht hinzugefügt
3. **Toggle verwendet:** `feedback.action` zur Erkennung
4. **Ergebnis:** Falsche Styling-Zuordnung bis zum Reload

### LÖSUNG:

Lokalen State um `action`-Feld erweitern:

```javascript
const newFeedback = {
  comment: feedbackText.trim(),
  requestedAt: new Date() as any,
  author: customerContact?.name || 'Kunde',
  action: 'changes_requested'  // ← HINZUFÜGEN
};
```

---

---

## GRÜNE BOX (CustomerMessageBanner) ÜBER DER PRESSEMELDUNG

### Zweck: Zeigt letzte Team-Nachricht prominent über der Pressemeldung

### Datei: `/src/app/freigabe/[shareId]/page.tsx` Zeile 140-145

```javascript
// Filtert nur AGENTUR-Nachrichten (Team)
const agencyMessages = feedbackHistory.filter(msg => 
  msg.author !== 'Kunde' && 
  msg.author !== 'Customer' && 
  msg.author !== customerContact?.name &&
  !(teamMember && msg.author === customerContact?.name) // Sicherheitscheck
);

if (agencyMessages.length === 0) return null; // Keine grüne Box
const latestAgencyMessage = agencyMessages[agencyMessages.length - 1];
```

### WAS SIEHT DER KUNDE ÜBER DER PRESSEMELDUNG:

#### **Szenario 1: Bei Freigabe ohne Änderungswunsch**
- ✅ **Grüne Box mit Team-Nachricht:** "Bitte prüfen Sie die Pressemeldung."
- ✅ **Sender:** "Stefan Kühne" (Team)
- ✅ **Zeit:** Formatiert angezeigt

#### **Szenario 2: Kunde gibt Änderungswunsch ab**
- ❌ **Problem:** Grüne Box verschwindet möglicherweise
- **Grund:** Filter erkennt beide "Stefan Kühne" als gleich

#### **Szenario 3: Team antwortet auf Änderungswunsch**
- ✅ **Grüne Box mit neuer Team-Nachricht:** "Überschrift wurde angepasst, bitte nochmals prüfen."
- **Aber:** Alte Kunden-Nachricht im Toggle verschwunden (Hauptproblem)

### PROBLEM MIT GRÜNER BOX:

**Filterlogik verwendet Namen-Vergleich statt action-Feld:**

```javascript
// AKTUELL (fehlerhaft bei gleichen Namen):
msg.author !== customerContact?.name

// SOLLTE SEIN:
msg.action !== 'changes_requested'
```

### BUG: Namen-Konflikt führt zu falscher Filterung

**Wenn customerContact?.name === "Stefan Kühne" UND teamMember.name === "Stefan Kühne":**

1. **Team-Nachricht:** `author: "Stefan Kühne"`, `action: "commented"`
2. **Filter-Check:** `msg.author !== customerContact?.name` 
   - → `"Stefan Kühne" !== "Stefan Kühne"` = **false**
   - → Team-Nachricht wird **fälschlicherweise als Kunden-Nachricht** erkannt
   - → Grüne Box verschwindet!

### LÖSUNG FÜR GRÜNE BOX:

```javascript
// Korrekte Filterung nach action-Feld:
const agencyMessages = feedbackHistory.filter(msg => 
  msg.action === 'commented' // Team-Nachrichten
);
```

---

## UNTERSCHIED: TOGGLE vs GRÜNE BOX

### **TOGGLE (CommunicationToggleBox):**
- **Zweck:** Zeigt ALLE Nachrichten (Team + Kunde)
- **Problem:** Falsche Avatar-Farben durch fehlende action im lokalen State
- **Betrifft:** Sofortige Anzeige nach Kunde-Absenden

### **GRÜNE BOX (CustomerMessageBanner):**  
- **Zweck:** Zeigt NUR letzte Team-Nachricht prominent
- **Problem:** Namen-basierte Filterung bei gleichen Namen fehlerhaft
- **Betrifft:** Ob grüne Box überhaupt angezeigt wird

### BEIDE BETROFFEN VON:
- Namen-Konflikten bei gleichen customerContact + teamMember Namen
- Fehlende Verwendung des `action`-Felds zur korrekten Unterscheidung

---

---

## EDIT SEITE - ZWEITER ORT FÜR TEAM-NACHRICHTEN

### Datei: `/src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`

**Beim Speichern der Edit-Seite:**

```javascript
const result = await prService.updateCampaignWithNewApproval(
  campaignId,
  campaignData, 
  {
    customerApprovalRequired: approvalData.customerApprovalRequired,
    customerContact: approvalData.customerContact,
    customerApprovalMessage: approvalData.customerApprovalMessage  // Team-Nachricht!
  },
  context
);
```

### Datei: `/src/lib/firebase/pr-service.ts` Zeile 1310-1328

**Was passiert in updateCampaignWithNewApproval():**

```javascript
if (existingApproval) {
  // UPDATE bestehende Freigabe - fügt zur History hinzu!
  
  const historyEntry = customerApprovalData.customerApprovalMessage ? {
    id: nanoid(),
    timestamp: Timestamp.now(),
    action: 'commented' as const,                    // TEAM-KENNZEICHEN
    actorName: 'Ihre Nachricht',                     // ❌ HARDCODED!
    actorEmail: 'agentur@celeropress.com',           // ❌ HARDCODED!
    details: {
      comment: customerApprovalData.customerApprovalMessage
    }
  } : {
    // Fallback für leere Nachricht
    action: 'resubmitted',
    actorName: 'System',
    // ...
  };
  
  // ✅ VERWENDET arrayUnion - überschreibt NICHT die History!
  await approvalService.updateApproval(existingApproval.id, {
    history: arrayUnion(historyEntry)
  });
}
```

---

## VERGLEICH: NEW vs EDIT SEITE

### **NEW SEITE (Kampagne erstellen):**
- **Methode:** `approvalService.createCustomerApproval()`
- **Problem:** ❌ **ÜBERSCHREIBT komplette history**
- **Effekt:** Alle vorherigen Nachrichten verschwinden

### **EDIT SEITE (Kampagne bearbeiten):**
- **Methode:** `prService.updateCampaignWithNewApproval()` → `arrayUnion(historyEntry)`
- **Problem:** ❌ **Hardcoded Namen/Email** aber ✅ **erweitert history korrekt**
- **Effekt:** Nachrichten bleiben erhalten, aber falsche Absender-Daten

---

## KRITISCHER UNTERSCHIED ENTDECKT:

### **Team-Antwort über NEW Seite:**
1. Kunde schreibt Änderungswunsch → `history[1].action: 'changes_requested'`
2. Team antwortet über NEW → **ÜBERSCHREIBT komplette history**
3. **Ergebnis:** Kunden-Nachricht **verschwindet**

### **Team-Antwort über EDIT Seite:**
1. Kunde schreibt Änderungswunsch → `history[1].action: 'changes_requested'`
2. Team antwortet über EDIT → **Fügt history[2] hinzu**
3. **Ergebnis:** Alle Nachrichten **bleiben erhalten**

---

## ROOT CAUSE GEFUNDEN:

**NEW Seite:** Ruft `createCustomerApproval()` auf → **array = [newEntry]** (überschreibt)
**EDIT Seite:** Ruft `arrayUnion(historyEntry)` auf → **array.push(newEntry)** (erweitert)

**Beide verwenden aber hardcoded:**
- `actorName: 'Ihre Nachricht'` 
- `actorEmail: 'agentur@celeropress.com'`

---

## KORRIGIERTE ZUSAMMENFASSUNG ALLER BUGS:

1. **NEW Seite Bug:** `createCustomerApproval()` überschreibt history → Nachrichten verschwinden
2. **EDIT Seite Bug:** Hardcoded Namen/Email statt echte Team-Member-Daten
3. **Toggle UI-Bug:** Kunde-Nachrichten werden sofort nach Absenden falsch dargestellt (blaues Team-Styling)
4. **Toggle Daten-Bug:** Lokaler State fehlt `action`-Feld für korrekte Typenerkennung
5. **Grüne Box Bug:** Namen-basierte Filterung versagt bei gleichen Namen → Box verschwindet fälschlicherweise
6. **Beide Seiten:** Verwenden hardcoded Werte statt echte teamMemberData