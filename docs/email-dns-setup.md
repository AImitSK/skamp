# Email DNS Setup Guide

**Version:** 1.0
**Erstellt:** November 2025
**Zweck:** DNS-Konfiguration für SPAM-freien Email-Versand mit SendGrid + Outlook

---

## 🎯 Übersicht

Für **jeden Email-Versand** (normal oder Kampagnen) benötigt eine Domain:
1. ✅ **SPF** - Welche Server dürfen Emails senden
2. ✅ **DKIM** - Digitale Signatur zur Authentifizierung
3. ✅ **DMARC** - Policy für fehlgeschlagene Authentifizierung

**Ohne korrekte Konfiguration → 🚫 SPAM!**

---

## 📋 Checkliste für neue Domain

### **Schritt 1: Domain in CeleroPress registrieren**

1. Dashboard → **Domain Settings**
2. **Domain hinzufügen**: z.B. `golfnext.de`
3. System erstellt automatisch SendGrid Domain
4. Du bekommst **3 CNAME Records**

### **Schritt 2: DNS Records beim Domain-Provider hinzufügen**

#### **A) CNAME Records (für DKIM)**

```
Host: s1._domainkey
Type: CNAME
Value: s1.golfnext.de.dkim.sendgrid.net

Host: s2._domainkey
Type: CNAME
Value: s2.golfnext.de.dkim.sendgrid.net

Host: em1._domainkey (falls SendGrid 3 CNAMEs gibt)
Type: CNAME
Value: em1.golfnext.de.dkim.sendgrid.net
```

#### **B) TXT Record für SPF**

**Falls nur SendGrid:**
```
Host: @ (oder golfnext.de)
Type: TXT
Value: v=spf1 include:sendgrid.net -all
```

**Falls Outlook + SendGrid (EMPFOHLEN):**
```
Host: @ (oder golfnext.de)
Type: TXT
Value: v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all
```

**Falls Google Workspace + SendGrid:**
```
Host: @ (oder golfnext.de)
Type: TXT
Value: v=spf1 include:_spf.google.com include:sendgrid.net -all
```

#### **C) TXT Record für DMARC**

```
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@golfnext.de; pct=100;
```

**Erklärung:**
- `p=quarantine` - Verdächtige Emails im Spam (nicht ablehnen!)
- `rua=mailto:...` - DMARC Reports an diese Adresse
- `pct=100` - Gilt für 100% der Emails

### **Schritt 3: Warten & Verifizieren**

1. ⏱️ **Warte 5-30 Minuten** (DNS-Propagierung)
2. ✅ In CeleroPress auf **"Verify Domain"** klicken
3. ✅ **Test ausführen:**
   ```bash
   npx tsx scripts/check-email-dns.ts golfnext.de
   ```

### **Schritt 4: Email-Adresse erstellen**

Erst **NACH** erfolgreicher Verifizierung:

1. Dashboard → **Email Addresses**
2. **Email-Adresse hinzufügen**:
   - Email: `presse@golfnext.de`
   - Domain: `golfnext.de`
   - Status: `verified`
   - Active: `true`

---

## 🔍 DNS Testing Tools

### **1. Email DNS Checker (komplett)**

```bash
npx tsx scripts/check-email-dns.ts golfnext.de
```

**Prüft:**
- ✅ SPF (inkl. SendGrid Check)
- ✅ DKIM (4 Standard-Selektoren)
- ✅ DMARC (Policy Check)
- ✅ MX Records

**Output:**
```
📧 EMAIL DNS REPORT: golfnext.de
═══════════════════════════════════════

🟢 GESAMTSCORE: 100/100

SPF:   ✅ Vorhanden (SendGrid ✅)
DKIM:  ✅ s1, s2 gefunden
DMARC: ✅ Policy: quarantine
MX:    ✅ outlook.com

💡 EMPFEHLUNGEN
   ✅ Alle Email-Authentication Checks bestanden!
```

### **2. SendGrid Readiness Checker**

```bash
npx tsx scripts/check-domain-sendgrid-ready.ts golfnext.de
```

**Prüft speziell:**
- ✅ Ist Domain bereit für SendGrid?
- ⚠️ Was fehlt noch?
- 📋 Setup-Anleitung

### **3. SPF Validator**

```bash
npx tsx scripts/validate-spf.ts
```

**Testet verschiedene SPF Varianten:**
- ✅ Syntax-Check
- ✅ DNS Lookup Count (max 10)
- ✅ Längen-Check (max 255 Zeichen)

---

## 📊 Score-System

| Score | Status | Bedeutung |
|-------|--------|-----------|
| 100/100 | 🟢 Perfekt | Alle Checks bestanden |
| 80-99 | 🟢 Gut | Kleine Optimierungen möglich |
| 50-79 | 🟡 Okay | Wichtige Configs fehlen |
| 0-49 | 🔴 Kritisch | SPAM-Risiko sehr hoch |

**Komponenten:**
- SPF: 30 Punkte (10 + 10 + 10)
  - Existiert: 10
  - Valid: 10
  - SendGrid inkludiert: 10
- DMARC: 30 Punkte (15 + 10 + 5)
  - Existiert: 15
  - Valid: 10
  - Policy nicht "none": 5
- DKIM: 30 Punkte (15 + 15)
  - Mind. 1 Record: 15
  - Mind. 2 Records: 15
- MX: 10 Punkte

---

## ⚠️ Häufige Probleme

### **Problem: "Domain nicht gefunden"**

**Ursache:** Domain existiert nicht oder Tippfehler

**Lösung:**
```bash
# Prüfe ob Domain existiert
nslookup golfnext.de

# Wenn "Non-existent domain":
# → Domain ist nicht registriert
# → Kaufe Domain bei Provider
```

### **Problem: "SPF ungültig"**

**Ursache:** Anführungszeichen im DNS-Panel

**Lösung:**
```
❌ FALSCH: "v=spf1 include:sendgrid.net -all"
✅ RICHTIG: v=spf1 include:sendgrid.net -all

→ KEINE Anführungszeichen eingeben!
```

### **Problem: "SendGrid fehlt in SPF"**

**Aktueller SPF:**
```
v=spf1 include:spf.protection.outlook.com -all
```

**Fix:**
```
v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all
                                          ^^^^^^^^^^^^^^^^^^^^
                                          HINZUFÜGEN
```

### **Problem: "DKIM nicht gefunden"**

**Ursache:** CNAMEs nicht im DNS eingetragen

**Lösung:**
1. Gehe zu SendGrid Dashboard
2. Settings → Sender Authentication
3. Kopiere die CNAME Records
4. Trage sie beim DNS-Provider ein
5. Warte 5-10 Minuten
6. Klicke "Verify" in SendGrid

### **Problem: "Zu viele DNS Lookups"**

**SPF hat max. 10 Lookups!**

**Beispiel Problem:**
```
v=spf1 include:provider1.com include:provider2.com include:provider3.com
       include:provider4.com include:provider5.com include:provider6.com
       include:provider7.com include:provider8.com include:provider9.com
       include:provider10.com include:provider11.com -all
                              ^^^^^^^^^^^^^^^^^^^^
                              11 Lookups = FEHLER!
```

**Lösung:** Nur notwendige Provider inkludieren

---

## 🚀 Multi-Domain Setup

**Für Kunden mit mehreren Domains:**

### **Beispiel: 3 Domains**

```
sk-online-marketing.de     → Score: 100/100 ✅
golfnext.de                → Score: 75/100  🟡 (DMARC fehlt)
celeropress.com            → Score: 55/100  🟡 (SPF fehlt SendGrid)
```

**Batch-Check:**
```bash
npx tsx scripts/check-email-dns.ts sk-online-marketing.de
npx tsx scripts/check-email-dns.ts golfnext.de
npx tsx scripts/check-email-dns.ts celeropress.com
```

---

## 📚 Referenzen

### **SPF (Sender Policy Framework)**
- RFC: [RFC 7208](https://www.rfc-editor.org/rfc/rfc7208.html)
- Max. 10 DNS Lookups
- Max. 255 Zeichen pro String

### **DKIM (DomainKeys Identified Mail)**
- RFC: [RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html)
- RSA 2048-bit Keys empfohlen
- Mehrere Selektoren möglich (s1, s2, em1, em2)

### **DMARC (Domain-based Message Authentication)**
- RFC: [RFC 7489](https://www.rfc-editor.org/rfc/rfc7489.html)
- Policies: `none`, `quarantine`, `reject`
- Empfohlen: `p=quarantine`

### **SendGrid Documentation**
- [Domain Authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [SPF Records](https://docs.sendgrid.com/ui/account-and-settings/spf-records)

---

## ✅ Best Practices

1. **Neue Domain?**
   - ✅ Zuerst DNS konfigurieren
   - ✅ Dann testen mit Scripts
   - ✅ Erst danach Email-Adresse erstellen
   - ❌ NIEMALS von nicht-verifizierten Domains senden!

2. **SPF Updates:**
   - ✅ Immer alle Provider inkludieren (Outlook + SendGrid)
   - ✅ `-all` statt `~all` für maximale Sicherheit
   - ❌ Niemals mehr als 10 includes!

3. **DMARC Policy:**
   - ✅ Starte mit `p=none` (Monitoring)
   - ✅ Nach 1-2 Wochen: `p=quarantine`
   - ✅ Nach 1-2 Monaten: `p=reject` (optional)

4. **Testing:**
   - ✅ Teste nach jeder Änderung
   - ✅ Warte 5-30 Min (DNS Propagierung)
   - ✅ Prüfe DMARC Reports regelmäßig

---

**Version:** 1.0
**Letzte Aktualisierung:** November 2025
**Autor:** CeleroPress Team
