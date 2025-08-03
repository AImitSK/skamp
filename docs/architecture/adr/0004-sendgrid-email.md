# ADR-0004: SendGrid für E-Mail-Versand

**Status:** Accepted  
**Datum:** 2024-12-21  
**Entscheider:** Development Team  

## Kontext

SKAMP benötigt eine zuverlässige Lösung für den Versand von E-Mails:
- Transaktionale E-Mails (Registrierung, Passwort-Reset)
- Massen-Versand von Pressemeldungen an Journalisten
- E-Mail-Tracking (Öffnungen, Klicks)
- Bounce-Handling und Webhook-Events

Die Lösung muss zuverlässig, skalierbar und DSGVO-konform sein.

## Entscheidung

Wir verwenden SendGrid (Twilio) als E-Mail-Service-Provider.

## Alternativen

### Option 1: SendGrid ✅
- **Vorteile:**
  - Vorhandene Erfahrung im Team
  - Exzellente Zustellraten
  - Umfangreiche API
  - Detaillierte Analytics
  - Webhook-Events für Tracking
  - DSGVO-konform
  - Gute Dokumentation
  - Template-Engine
- **Nachteile:**
  - Kosten bei hohem Volumen
  - Nicht im Google-Ökosystem
  - Separater Account nötig

### Option 2: Firebase Extensions (Trigger Email)
- **Vorteile:**
  - Nahtlose Firebase-Integration
  - Kein separater Service
  - Automatische Trigger aus Firestore
- **Nachteile:**
  - Limitierte Features
  - Kein natives E-Mail-Tracking
  - Weniger Kontrolle über Versand
  - Schlechtere Zustellraten

### Option 3: Amazon SES
- **Vorteile:**
  - Sehr günstig
  - Hohe Skalierbarkeit
  - AWS-Integration
- **Nachteile:**
  - Komplexe Einrichtung
  - Weniger Features out-of-the-box
  - Reputation-Management nötig
  - Steile Lernkurve

### Option 4: Mailgun
- **Vorteile:**
  - Gute API
  - Fair Pricing
  - EU-Server verfügbar
- **Nachteile:**
  - Weniger Features als SendGrid
  - Kleinere Community
  - Keine Erfahrung vorhanden

### Option 5: Google Workspace (Gmail API)
- **Vorteile:**
  - Im Google-Ökosystem
  - Vertraut für Nutzer
- **Nachteile:**
  - Nicht für Massen-E-Mails geeignet
  - Strict Rate Limits
  - Keine Marketing-Features

## Begründung

SendGrid wurde gewählt, weil:
1. **Erfahrung**: Vorhandenes Know-how reduziert Entwicklungszeit
2. **Zuverlässigkeit**: Bewährte Zustellraten für B2B-Kommunikation
3. **Features**: Alle benötigten Features sind vorhanden
4. **Compliance**: DSGVO-konforme Datenverarbeitung
5. **Skalierbarkeit**: Wächst mit SKAMP mit

## Konsequenzen

### Positive
- Schnelle Implementation durch Erfahrung
- Professionelle E-Mail-Infrastruktur
- Detailliertes Tracking und Analytics
- Webhook-Integration für Echtzeit-Events
- Template-Management möglich

### Negative
- Zusätzliche Kosten (100 E-Mails/Tag kostenlos, dann kostenpflichtig)
- Separater Service außerhalb des Google-Ökosystems
- API-Keys müssen sicher verwaltet werden

### Neutral
- Webhook-Endpoint muss implementiert werden
- E-Mail-Templates können in SendGrid oder Code verwaltet werden
- Bounce-Management muss eingerichtet werden

## Notizen

### Implementierung
```typescript
// API Route für SendGrid Webhooks
app.post('/api/webhooks/sendgrid', (req, res) => {
  const events = req.body;
  // Process events: delivered, opened, clicked, bounced
});
```

### Kostenstruktur
- Free Tier: 100 E-Mails/Tag
- Essentials: $19.95/Monat für 50.000 E-Mails
- Pro: Volumenbasiert, ab $89.95/Monat

### Zukünftige Optimierungen
- Template-Management in SendGrid
- A/B Testing für Betreffzeilen
- Automatisches Bounce-Handling
- Reputation-Monitoring

### Migration-Pfad
Falls später ein Wechsel nötig wird:
1. E-Mail-Service abstrahieren (Adapter Pattern)
2. Templates im Code halten, nicht in SendGrid
3. Event-Tracking generisch implementieren

## Referenzen

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Pricing](https://sendgrid.com/pricing/)
- [DSGVO Compliance](https://sendgrid.com/resource/general-data-protection-regulation/)