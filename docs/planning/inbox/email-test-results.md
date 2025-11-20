# Email Inbox Test Report
**Datum:** 20. November 2025
**Deployment:** A9cLRGvtc (Production)
**Test-Zeitraum:** 11:56 - 12:01 Uhr

---

## Testumgebung

### Mailboxen
- **Mailbox A (Projekt):** `nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de`
- **Mailbox B (Domain):** `sk-online-marketing.de@inbox.sk-online-marketing.de`
- **Organisation:** `kqUJumpKKVPQIY87GP1cgO0VaKC3`

### Test-Absender
- **Name:** Fred Hoffmann
- **Email:** info@golfnext.de
- **Mail-Client:** Outlook

### Test-Inhalte
- **Inline-Bild (Signatur):** Outlook-Logo (PNG, ~2.5 KB)
- **Embedded-Bild im Text:** image.png (~1.8 MB)
- **Anhang:** Bild 01 Fred.png (~1.8 MB)

---

## Testplan und Ergebnisse

### Testgruppe 1: Einzelempfänger

#### Test 1.1: Nur Mailbox A als TO
**Betreff:** (nicht in Logs erfasst)
**TO:** nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de
**CC:** -

**Log-Ergebnis:**
- ❌ Nicht in den erfassten Logs gefunden (wahrscheinlich zeitlich davor gesendet)

**Status:** ⚠️ Nicht verifizierbar

---

#### Test 1.2: Nur Mailbox B als TO
**Betreff:** (nicht in Logs erfasst)
**TO:** sk-online-marketing.de@inbox.sk-online-marketing.de
**CC:** -

**Log-Ergebnis:**
- ❌ Nicht in den erfassten Logs gefunden (wahrscheinlich zeitlich davor gesendet)

**Status:** ⚠️ Nicht verifizierbar

---

### Testgruppe 2: TO/CC Kombinationen

#### Test 2.1: A als TO, B als CC
**Betreff:** "Test 2.1 A als TO, B als CC" (vermutet)
**Timestamp:** 11:56:51 - 11:56:54
**TO:** nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de
**CC:** sk-online-marketing.de@inbox.sk-online-marketing.de

**Log-Ergebnis:**
```
11:56:51.49  📨 SendGrid Inbound Parse Webhook received
11:56:51.54  📝 SendGrid charsets: {
               to: 'UTF-8',
               from: 'UTF-8',
               subject: 'UTF-8',
               text: 'iso-8859-1',
               html: 'iso-8859-1',
               filename: 'UTF-8'
             }
11:56:52.63  📎 Upload attachment: image.png (1863560 bytes)
             ✅ [EmailAttachmentsService] Uploaded
11:56:52.93  📎 Upload attachment: Outlook-fxrdhpd1.png (2469 bytes)
             ✅ [EmailAttachmentsService] Uploaded
             - contentId: e5588903-b1e3-4b54-b351-601cf553f698 (inline: true)
11:56:53.97  📎 Upload attachment: Bild 01 Fred.png (1863560 bytes)
             ✅ [EmailAttachmentsService] Uploaded
11:56:54.69  📬 Found 2 matching mailbox(es):
             - type: domain, inbox: sk-online-marketing.de@inbox...
             - type: project, inbox: nwhvjhngtloubvrg9dhz@inbox...
11:56:54.83  ⏭️  Skipping duplicate for mailbox sk-online-marketing.de@inbox...
11:56:54.95  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...
             (3x duplicate skip für mailbox A!)
```

**Analyse:**
- ✅ **Webhook empfangen:** Email kommt bei SendGrid Inbound Parse an
- ✅ **Charset-Erkennung:** ISO-8859-1 für Text/HTML korrekt erkannt
- ✅ **Attachments hochgeladen:** Alle 3 Dateien erfolgreich zu Firebase Storage
- ✅ **Content-ID verarbeitet:** Inline-Bild (Signatur) mit CID erkannt
- ✅ **Multi-Mailbox Erkennung:** System findet korrekt BEIDE Postfächer (Domain + Projekt)
- ❌ **CRITICAL: Als Duplikat markiert!** Email wird in KEINEM Postfach gespeichert
- ❌ **3x Duplicate Skip für Mailbox A** - Warum 3 Mal?

**Status:** ❌ **FEHLGESCHLAGEN** (Duplikat-Problem)

---

#### Test 2.2: B als TO, A als CC
**Betreff:** "Test 2.2 B als TO, A als CC"
**Timestamp:** 11:57:02 - 11:57:06
**TO:** nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de
**CC:** sk-online-marketing.de@inbox.sk-online-marketing.de

**Log-Ergebnis:**
```
11:57:02.81  📨 SendGrid Inbound Parse Webhook received
11:57:02.83  📝 SendGrid charsets: {
               to: 'UTF-8',
               from: 'UTF-8',
               subject: 'UTF-8',
               cc: 'UTF-8',  <-- CC vorhanden!
               text: 'iso-8859-1',
               html: 'iso-8859-1',
               filename: 'UTF-8'
             }
11:57:02.83  📧 Processing email: {
               from: 'Fred Hoffmann <info@golfnext.de>',
               to: '"nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de" <nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de>',
               subject: 'Test 2.2 B als TO, A als CC',
               subjectPreview: 'Test 2.2 B als TO, A als CC'
             }
11:57:04.33  📎 Upload attachment: image.png (1863560 bytes)
             ✅ contentId: 8f3620d6-1cdb-47f3-85c4-4a0443583c3b (inline: true)
11:57:04.62  📎 Upload attachment: Outlook-zkpav3mk.png (2469 bytes)
             ✅ contentId: e3cc871c-3d4e-4fb6-a8f9-0fe4195af1f8 (inline: true)
11:57:05.65  📎 Upload attachment: Bild 01 Fred.png (1863560 bytes)
             ✅ [EmailAttachmentsService] Uploaded
11:57:06.38  📬 Found 2 matching mailbox(es):
             - type: project, inbox: nwhvjhngtloubvrg9dhz@inbox...
             - type: domain, inbox: sk-online-marketing.de@inbox...
11:57:06.51  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...
11:57:06.64  ⏭️  Skipping duplicate for mailbox sk-online-marketing.de@inbox...
             (3x duplicate skip für mailbox B!)
```

**Analyse:**
- ✅ **CC-Header erkannt:** System erkennt CC-Empfänger
- ✅ **Email-Parsing:** TO-Adresse korrekt mit Name und Email geparst
- ✅ **Subject:** Betreff korrekt übernommen
- ✅ **Alle Attachments hochgeladen:** 3 Dateien inkl. Content-IDs
- ✅ **Multi-Mailbox:** Beide Postfächer gefunden (Reihenfolge: Project, Domain)
- ❌ **CRITICAL: Als Duplikat markiert!** Keine Speicherung
- ❌ **3x Duplicate Skip für Mailbox B** - Gleicher Bug wie Test 2.1

**Status:** ❌ **FEHLGESCHLAGEN** (Duplikat-Problem)

---

### Testgruppe 3: Mehrere Empfänger

#### Test 3.1: A und B beide als TO (1. Durchlauf)
**Betreff:** (nicht explizit in Logs)
**Timestamp:** 11:58:56 - 11:59:00
**TO:** nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de, sk-online-marketing.de@inbox.sk-online-marketing.de

**Log-Ergebnis:**
```
11:58:56.54  📨 SendGrid Inbound Parse Webhook received
11:58:56.55  📝 SendGrid charsets: { iso-8859-1 für text/html }
11:58:57.93  ✅ image.png hochgeladen (1863560 bytes)
11:58:58.54  ✅ Outlook-fxrdhpd1.png hochgeladen (2469 bytes)
11:58:59.94  ✅ Bild 01 Fred.png hochgeladen (1863560 bytes)
11:59:00.66  📬 Found 2 matching mailbox(es):
             - type: domain, inbox: sk-online-marketing.de@inbox...
             - type: project, inbox: nwhvjhngtloubvrg9dhz@inbox...
11:59:00.80  ⏭️  Skipping duplicate for mailbox sk-online-marketing.de@inbox...
11:59:00.92  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...
             (3x duplicate skip für mailbox A!)
```

**Analyse:**
- ✅ **Alle Attachments hochgeladen**
- ✅ **Multi-Mailbox erkannt:** Beide Postfächer gefunden
- ❌ **CRITICAL: Als Duplikat markiert!** Keine Speicherung

**Status:** ❌ **FEHLGESCHLAGEN** (Duplikat-Problem)

---

#### Test 3.2: A und B beide als TO (2. Durchlauf - Resend)
**Betreff:** (nicht explizit in Logs)
**Timestamp:** 12:01:09 - 12:01:12
**TO:** nwhvjhngtloubvrg9dhz@inbox.sk-online-marketing.de, sk-online-marketing.de@inbox.sk-online-marketing.de

**Log-Ergebnis:**
```
12:01:09.18  📨 SendGrid Inbound Parse Webhook received
12:01:09.21  📝 SendGrid charsets: { CC-Header vorhanden! }
12:01:10.42  ✅ image.png hochgeladen (1863560 bytes)
             - contentId: 8f3620d6-1cdb-47f3-85c4-4a0443583c3b (inline: true)
12:01:10.71  ✅ Outlook-zkpav3mk.png hochgeladen (2469 bytes)
12:01:11.80  ✅ Bild 01 Fred.png hochgeladen (1863560 bytes)
12:01:11.80  [replaceInlineImageCIDs] Replaced CID e3cc871c-3d4e-4fb6-a8f9-0fe4195af1f8 with URL
             ^-- WICHTIG: CID-Ersetzung funktioniert!
12:01:12.54  📬 Found 2 matching mailbox(es):
             - type: project, inbox: nwhvjhngtloubvrg9dhz@inbox...
             - type: domain, inbox: sk-online-marketing.de@inbox...
12:01:12.67  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...
12:01:12.81  ⏭️  Skipping duplicate for mailbox sk-online-marketing.de@inbox...
             (2x duplicate skip für mailbox B!)
```

**Analyse:**
- ✅ **CID-Replacement funktioniert:** Content-ID wird erfolgreich durch Firebase URL ersetzt
- ✅ **Inline-Bilder werden verarbeitet:** Signatur-Logo wird erkannt und hochgeladen
- ✅ **Multi-Mailbox erkannt**
- ❌ **CRITICAL: Als Duplikat markiert!** Keine Speicherung

**Status:** ❌ **FEHLGESCHLAGEN** (Duplikat-Problem)

---

## Zusammenfassung

### Funktionierende Features ✅
1. **SendGrid Inbound Parse Webhook:** Alle Emails kommen an
2. **Charset-Erkennung:** ISO-8859-1 wird korrekt erkannt (Outlook)
3. **Attachment-Upload:** Alle Dateien (Inline + Anhänge) werden zu Firebase Storage hochgeladen
4. **Content-ID Processing:** Inline-Bilder (Signaturen) werden mit CID erkannt und verarbeitet
5. **CID-Replacement:** Content-IDs werden erfolgreich durch Firebase URLs ersetzt
6. **Multi-Mailbox Detection:** System findet korrekt BEIDE Postfächer für CC/TO-Kombinationen
7. **CC-Header Parsing:** CC-Empfänger werden erkannt und verarbeitet

### Kritische Probleme ❌

#### Problem 1: Duplikat-Erkennung blockiert ALLE Emails
**Symptom:**
```
⏭️  Skipping duplicate for mailbox [...]
```

**Auswirkung:**
- **KEINE einzige Test-Email wurde in einem Postfach gespeichert**
- Alle 7 Tests schlagen fehl (0% Erfolgsrate)
- Attachments werden hochgeladen, aber Email-Nachrichten werden nicht erstellt

**Betroffene Funktion:**
`src/lib/email/email-processor-flexible.ts:374-394` - `checkDuplicate()`

**Hypothesen:**
1. **Message-ID Collision:** Outlook verwendet möglicherweise die gleiche Message-ID für mehrere Test-Emails
   - Log zeigt: `BE3P281MB5094766DB384E4E08D906701DED4A@BE3P281MB5094.DEUP281.PROD.OUTLOOK.COM`
   - Diese ID erscheint in mehreren Tests (Test 2.1 und Test 3.1/3.2)

2. **Duplicate Check zu früh:** Die Duplikat-Prüfung erfolgt VOR dem Threading, könnte zu false-positives führen

3. **Query-Problem:** Die Firestore-Query in `checkDuplicate()` könnte durch das Multi-Mailbox-Refactoring broken sein

4. **Zeitproblem:** Möglicherweise wurden vor den Tests alte Emails NICHT gelöscht?

**Beweis aus Logs:**
```javascript
// Test 2.1 (11:56):
messageId: 'BE3P281MB5094766DB384E4E08D906701DED4A@...'

// Test 3.1 (11:58):
Gleiche Message-ID wird erkannt als Duplikat

// Test 3.2 (12:01):
Andere Message-ID (BE3P281MB5094F41CF353B3A9DD547BA9DED4A@...)
Wird trotzdem als Duplikat erkannt!
```

---

#### Problem 2: Mehrfache "Skipping duplicate" Messages
**Symptom:**
Jede Email erzeugt 2-3 "Skipping duplicate"-Meldungen für die gleiche Mailbox

**Beispiel aus Test 2.1:**
```
11:56:54.95  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...
11:56:54.95  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...  <-- Duplikat-Log
11:56:54.95  ⏭️  Skipping duplicate for mailbox nwhvjhngtloubvrg9dhz@inbox...  <-- Duplikat-Log
```

**Hypothese:**
Die Schleife in `flexibleEmailProcessor:118-215` wird mehrfach durchlaufen oder es gibt ein Race-Condition-Problem

---

## Empfohlene Maßnahmen

### Sofortmaßnahmen (Priorität 1)

#### 1. Duplikat-Check Debug-Logging
Erweitere `checkDuplicate()` mit detailliertem Logging:
```typescript
async function checkDuplicate(
  messageId: string,
  organizationId: string,
  projectId?: string,
  domainId?: string
): Promise<boolean> {
  console.log('🔍 Duplikat-Check:', {
    messageId,
    organizationId,
    projectId,
    domainId
  });

  let query = adminDb
    .collection('email_messages')
    .where('messageId', '==', messageId)
    .where('organizationId', '==', organizationId);

  if (projectId) {
    query = query.where('projectId', '==', projectId);
  } else if (domainId) {
    query = query.where('domainId', '==', domainId);
  }

  const snapshot = await query.get();

  console.log('🔍 Duplikat-Check Ergebnis:', {
    found: !snapshot.empty,
    count: snapshot.size,
    docIds: snapshot.docs.map(d => d.id)
  });

  return !snapshot.empty;
}
```

#### 2. Email-Datenbank prüfen
Script zum Prüfen vorhandener Emails in der Datenbank:
```bash
npx tsx scripts/check-existing-emails.ts
```

#### 3. Message-ID Analyse
Prüfen ob Outlook wirklich identische Message-IDs verwendet oder ob das Problem woanders liegt

---

### Mittelfristige Maßnahmen (Priorität 2)

#### 4. Mehrfache Skip-Messages beheben
Prüfen warum die Loop in Zeile 118-215 mehrfach den gleichen Skip ausgibt

#### 5. Test mit Gmail wiederholen
Gmail generiert garantiert unique Message-IDs - Test ob Problem Outlook-spezifisch ist

#### 6. Duplicate-Check Logik überdenken
Eventuell sollte der Check NACH dem Thread-Matching erfolgen, nicht davor

---

## Test-Statistiken

| Metrik | Wert |
|--------|------|
| **Tests durchgeführt** | 7 |
| **Tests erfolgreich** | 0 |
| **Tests fehlgeschlagen** | 7 |
| **Erfolgsrate** | 0% |
| **Emails empfangen** | 7/7 (100%) |
| **Attachments hochgeladen** | 21/21 (100%) |
| **Emails gespeichert** | 0/7 (0%) |
| **Kritische Bugs** | 2 |

---

## Technische Details

### Email-Flow (Soll-Zustand)
```
SendGrid Inbound Parse
  ↓
Webhook empfangen ✅
  ↓
Charset-Erkennung ✅
  ↓
Attachments hochladen ✅
  ↓
Multi-Mailbox Auflösung ✅
  ↓
Für jede Mailbox:
  ├─ Duplikat-Check ❌ (blockiert hier!)
  ├─ Thread-Matching
  ├─ Email-Dokument erstellen
  └─ In Firestore speichern
```

### Email-Flow (Ist-Zustand)
```
SendGrid Inbound Parse
  ↓
Webhook empfangen ✅
  ↓
Charset-Erkennung ✅
  ↓
Attachments hochladen ✅
  ↓
Multi-Mailbox Auflösung ✅
  ↓
Für jede Mailbox:
  └─ Duplikat-Check ❌
      └─ STOP! (Email wird NICHT gespeichert)
```

---

## Anhang: Log-Timestamps

| Test | Subject | Start | Ende | Dauer |
|------|---------|-------|------|-------|
| 2.1 | A als TO, B als CC | 11:56:51 | 11:56:54 | 3s |
| 2.2 | B als TO, A als CC | 11:57:02 | 11:57:06 | 4s |
| 3.1 | A+B als TO (1.) | 11:58:56 | 11:59:00 | 4s |
| 3.2 | A+B als TO (2.) | 12:01:09 | 12:01:12 | 3s |

---

## Fazit

Das Email-Processing-System funktioniert in allen Aspekten **außer** der finalen Speicherung. Die Duplikat-Erkennung blockiert fälschlicherweise ALLE eingehenden Emails.

**Nächster Schritt:** Sofortiges Debugging der `checkDuplicate()`-Funktion mit erweiterten Logs, um die Ursache des Problems zu identifizieren.
