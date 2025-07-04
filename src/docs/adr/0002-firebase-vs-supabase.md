# ADR-0002: Firebase als Backend-as-a-Service

**Status:** Accepted  
**Datum:** 2024-12-20  
**Entscheider:** Development Team  

## Kontext

SKAMP benötigt eine Backend-Lösung für:
- Datenspeicherung (Kontakte, Firmen, Kampagnen)
- Benutzer-Authentifizierung
- Datei-Uploads (Bilder, Dokumente)
- Echtzeitfähigkeiten (optional)

Als Solo-Entwickler war eine vollständig verwaltete Lösung wichtig, um sich auf die Business-Logik konzentrieren zu können.

## Entscheidung

Wir verwenden Firebase (Google Cloud) als komplette Backend-as-a-Service Lösung.

## Alternativen

### Option 1: Firebase (Google Cloud) ✅
- **Vorteile:**
  - Vollständig verwaltet (Serverless)
  - Integriert im Google-Ökosystem (passt zu Gemini AI)
  - Großzügige kostenlose Stufe
  - Eingebaute Authentifizierung
  - Echtzeit-Updates out-of-the-box
  - Automatische Skalierung
  - Integrierte File Storage mit CDN
- **Nachteile:**
  - Vendor Lock-in bei Google
  - NoSQL erfordert andere Denkweise
  - Komplexe Queries sind limitiert
  - Kosten können bei hoher Nutzung steigen

### Option 2: Supabase
- **Vorteile:**
  - PostgreSQL (relationale Datenbank)
  - Open Source
  - Bessere Query-Möglichkeiten
  - Row Level Security
- **Nachteile:**
  - Weniger ausgereift als Firebase
  - Kleinere Community
  - Nicht im Google-Ökosystem

### Option 3: Custom Backend (Node.js + PostgreSQL)
- **Vorteile:**
  - Volle Kontrolle
  - Keine Vendor Lock-in
  - Beliebige Datenbank-Queries
- **Nachteile:**
  - Enormer Entwicklungsaufwand
  - Server-Management nötig
  - Skalierung muss selbst implementiert werden
  - Sicherheit liegt in eigener Verantwortung

### Option 4: AWS Amplify
- **Vorteile:**
  - Sehr mächtig
  - Viele Services
  - GraphQL Support
- **Nachteile:**
  - Komplexe Konfiguration
  - Steile Lernkurve
  - Teurer als Firebase
  - Nicht im Google-Ökosystem

## Begründung

Firebase wurde gewählt, weil:
1. **Google-Ökosystem**: Perfekte Integration mit Gemini AI und zukünftig Gmail
2. **Entwicklungsgeschwindigkeit**: Als Solo-Entwickler kann ich mich auf Features konzentrieren
3. **Kosteneffizienz**: Die Free Tier reicht für den Start vollkommen aus
4. **Skalierbarkeit**: Automatische Skalierung ohne Konfiguration
5. **Time-to-Market**: Schnellste Lösung für MVP

## Konsequenzen

### Positive
- Keine Server-Wartung nötig
- Eingebaute Sicherheit und Authentifizierung
- Automatische Backups
- Echtzeit-Synchronisation für zukünftige Features
- Schnelle Entwicklung möglich

### Negative
- Vendor Lock-in bei Google
- NoSQL-Struktur erfordert Denormalisierung
- Komplexe Queries müssen client-seitig gelöst werden
- Migration zu anderem System wäre aufwändig

### Neutral
- Firestore Security Rules müssen gelernt werden
- Kosten-Monitoring ist wichtig
- Datenstruktur muss sorgfältig geplant werden

## Notizen

- Die Entscheidung passt zur Vision, im Google-Ökosystem zu bleiben
- Firestore's Limitierungen können durch geschickte Datenmodellierung umgangen werden
- Die Kostenstruktur ist für SaaS-Modelle gut geeignet (pay-per-use)

## Referenzen

- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase vs Supabase Comparison](https://supabase.com/alternatives/supabase-vs-firebase)