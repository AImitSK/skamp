# Journalisten-Datenbank Masterplan
## Premium-Modul für CeleroPress

---

## 🎯 Vision & Zielsetzung

### Produktvision
Eine zentrale, verifizierte Journalisten-Datenbank, die als Premium-Feature den Wert von CeleroPress signifikant steigert und wiederkehrende Einnahmen generiert.

### Geschäftsziele
- **Monetarisierung**: Premium-Feature mit monatlicher Gebühr (29-99€/Monat je nach Umfang)
- **Kundenbindung**: Erhöhung der Retention durch exklusive Daten
- **Netzwerkeffekt**: Je mehr Kunden, desto besser die Datenqualität
- **USP**: Alleinstellungsmerkmal gegenüber Wettbewerbern

### Kernfunktionen
1. **Zentrale Datenbank** mit verifizierten Journalisten-Kontakten
2. **Intelligentes Matching** zur Datenkonsolidierung
3. **DSGVO-konformer Verifizierungsprozess**
4. **API-Integrationen** zu externen Datenquellen
5. **Synchronisation** mit lokalem CRM

---

## 🏗️ Technische Architektur

### Datenbank-Struktur

```
Firestore Collections:

/journalistDatabase (Master-Datenbank)
├── /journalists/{journalistId}
│   ├── personalData
│   │   ├── firstName: string
│   │   ├── lastName: string
│   │   ├── email: string
│   │   ├── phone?: string
│   │   └── profileImage?: string
│   ├── professionalData
│   │   ├── medium: string
│   │   ├── position: string
│   │   ├── department?: string
│   │   ├── topics: string[]
│   │   └── language: string[]
│   ├── socialMedia
│   │   ├── linkedin?: string
│   │   ├── twitter?: string
│   │   └── website?: string
│   ├── metadata
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   ├── verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
│   │   ├── verifiedAt?: timestamp
│   │   ├── dataSource: 'manual' | 'api' | 'crowdsourced' | 'import'
│   │   ├── qualityScore: number (0-100)
│   │   ├── sourceCount: number
│   │   └── lastActivityAt: timestamp
│   └── gdpr
│       ├── consentGiven: boolean
│       ├── consentDate?: timestamp
│       ├── nextReminderDate?: timestamp
│       └── optOutDate?: timestamp

/journalistCandidates (Matching-Kandidaten)
├── /candidates/{candidateId}
│   ├── matchedContacts: Array<{
│   │   ├── organizationId: string
│   │   ├── contactId: string
│   │   ├── contactData: object
│   │   └── addedAt: timestamp
│   │}>
│   ├── mergedData: object (AI-generiert)
│   ├── matchScore: number
│   ├── status: 'pending' | 'approved' | 'rejected' | 'merged'
│   └── reviewedBy?: string

/journalistVerifications (Verifizierungsprozess)
├── /verifications/{verificationId}
│   ├── journalistId: string
│   ├── token: string (unique)
│   ├── type: 'initial' | 'update' | 'reminder'
│   ├── createdAt: timestamp
│   ├── expiresAt: timestamp
│   ├── completedAt?: timestamp
│   └── emailsSent: number

/journalistSubscriptions (Premium-Feature Zugang)
├── /subscriptions/{organizationId}
│   ├── plan: 'basic' | 'professional' | 'enterprise'
│   ├── status: 'active' | 'inactive' | 'trial'
│   ├── startDate: timestamp
│   ├── endDate?: timestamp
│   ├── searchQuota: number
│   ├── importQuota: number
│   └── apiAccess: boolean

/journalistSyncLog (Synchronisations-Historie)
├── /logs/{logId}
│   ├── organizationId: string
│   ├── journalistId: string
│   ├── action: 'import' | 'update' | 'delete'
│   ├── timestamp: timestamp
│   └── changes?: object
```

### API-Struktur

```typescript
// API Routes
/api/journalists/
├── GET    /search          // Suche in Datenbank (Premium)
├── GET    /[id]           // Einzelner Journalist
├── POST   /import         // Import ins CRM
├── POST   /verify         // Verifizierungsprozess
├── PUT    /[id]/update    // Daten aktualisieren
├── POST   /match          // Matching-Vorschläge
└── GET    /statistics     // Nutzungsstatistiken

/api/admin/journalists/
├── POST   /add            // Manuell hinzufügen
├── POST   /bulk-import    // Massenimport
├── GET    /candidates     // Matching-Kandidaten
├── POST   /approve        // Kandidat bestätigen
├── POST   /merge          // Duplikate zusammenführen
└── GET    /quality        // Datenqualität-Dashboard
```

---

## 💰 Monetarisierungs-Strategie

### Preismodelle

#### Free Tier (Basis-CRM)
- ✅ Eigene Kontakte verwalten
- ✅ Beitrag zum Matching (anonymisiert)
- ❌ Kein Zugriff auf Datenbank
- ❌ Keine Suchfunktion
- ❌ Kein Import aus Datenbank

#### Professional (29€/Monat)
- ✅ 50 Suchen/Monat
- ✅ 20 Imports/Monat
- ✅ Basis-Filter (Medium, Thema)
- ✅ E-Mail-Verifizierung
- ❌ Keine API
- ❌ Keine Bulk-Operationen

#### Business (59€/Monat)
- ✅ 200 Suchen/Monat
- ✅ 100 Imports/Monat
- ✅ Erweiterte Filter
- ✅ Export-Funktion
- ✅ Team-Zugriff (bis 5 User)
- ❌ Keine API

#### Enterprise (99€/Monat)
- ✅ Unbegrenzte Suchen
- ✅ Unbegrenzte Imports
- ✅ API-Zugriff
- ✅ Bulk-Operationen
- ✅ Priority-Support
- ✅ Custom Integrationen

### Zusatz-Services
- **Daten-Anreicherung**: 0,50€ pro Kontakt
- **Verifizierung Premium**: 1€ pro verifizierter Kontakt
- **API-Calls**: 0,01€ pro Call nach Kontingent

---

## 🔄 Datenquellen & Integration

### 1. Crowdsourcing (Kostenlos)
- Automatisches Matching aus Kunden-CRMs
- Schwellwert: 3+ übereinstimmende Einträge
- Anonymisierte Aggregation

### 2. Manuelle Eingabe
- Super Admin Dashboard
- Redaktionelle Qualitätskontrolle
- Batch-Import via CSV/Excel

### 3. API-Integrationen (Geplant)

#### Phase 1: Basis-Quellen
- **Impressum-Crawler**: Automatisches Scannen von Medienseiten
- **LinkedIn API**: Profil-Matching und Anreicherung
- **Twitter/X API**: Handle-Verifizierung

#### Phase 2: Premium-Quellen
- **Kress.de API**: Deutsche Mediendatenbank
- **Zimpel**: Journalisten-Verzeichnis
- **PR-Journal**: Branchendaten
- **Meedia**: Personalwechsel-Tracking

#### Phase 3: Internationale Quellen
- **Cision**: Global Media Database
- **Muck Rack**: US-Journalisten
- **Roxhill**: UK-Media Contacts

### 4. Partner-Netzwerk
- Kooperationen mit PR-Agenturen
- Datenaustausch mit verwandten Tools
- Verifizierte Listen von Verbänden

---

## 🛡️ DSGVO & Datenschutz

### Rechtliche Grundlagen

#### Datenerhebung
1. **Berechtigtes Interesse** (Art. 6 Abs. 1 lit. f DSGVO)
   - Öffentlich zugängliche Berufsdaten
   - Journalisten als Personen öffentlichen Interesses

2. **Einwilligung** (Art. 6 Abs. 1 lit. a DSGVO)
   - Double-Opt-In für erweiterte Daten
   - Granulare Zustimmungsoptionen

#### Verifizierungsprozess

```
Stufe 1: Unverified (Öffentliche Daten)
├── Name, Medium, Position
├── Öffentliche E-Mail
└── Keine Weitergabe

Stufe 2: Pending (E-Mail versendet)
├── Verifizierungs-Token
├── 30 Tage Gültigkeit
└── Automatische Löschung bei Ablehnung

Stufe 3: Verified (Einwilligung erteilt)
├── Vollständige Daten
├── Regelmäßige Updates
└── Jährliche Re-Verifizierung
```

### Datenschutz-Features
- **Auskunftsrecht**: Self-Service Portal
- **Löschrecht**: Sofortige Entfernung
- **Datenportabilität**: Export aller Daten
- **Widerspruchsrecht**: Opt-Out jederzeit
- **Audit-Log**: Alle Zugriffe protokolliert

---

## 📧 E-Mail-Workflows

### 1. Initiale Verifizierung
```
Betreff: Ihre Kontaktdaten in der CeleroPress Mediendatenbank

Trigger: Neuer Eintrag (unverifiziert)
Inhalt: Erklärung + Verifizierungslink
CTA: "Daten bestätigen"
Follow-Up: Nach 7 und 21 Tagen
```

### 2. Daten-Update
```
Betreff: Bitte aktualisieren Sie Ihre Medienkontakte

Trigger: Alle 12 Monate
Inhalt: Aktuelle Daten + Update-Link
CTA: "Daten aktualisieren"
```

### 3. Qualitäts-Feedback
```
Betreff: Stimmen diese Informationen noch?

Trigger: Bounce-Back oder Änderung erkannt
Inhalt: Problemhinweis + Korrektur
CTA: "Korrigieren"
```

---

## 🚀 Implementierungs-Phasen

### Phase 1: Foundation (4 Wochen)
- [ ] Datenbank-Schema aufsetzen
- [ ] Admin-Dashboard Grundstruktur
- [ ] Basis CRUD-Operationen
- [ ] Manuelle Eingabe-Maske
- [ ] Einfache Suchfunktion

### Phase 2: Matching & Crowdsourcing (6 Wochen)
- [ ] Matching-Algorithmus
- [ ] Kandidaten-Review-Interface
- [ ] Duplikat-Erkennung
- [ ] Merge-Funktionalität
- [ ] Qualitäts-Scoring

### Phase 3: Verifizierung & DSGVO (4 Wochen)
- [ ] E-Mail-Templates
- [ ] Verifizierungs-Workflow
- [ ] Token-Management
- [ ] DSGVO-Dokumentation
- [ ] Opt-Out-Mechanismus

### Phase 4: Premium-Features (6 Wochen)
- [ ] Subscription-Management
- [ ] Payment-Integration (Stripe)
- [ ] Kontingent-Verwaltung
- [ ] Premium-Suchfilter
- [ ] Export-Funktionen

### Phase 5: API-Integrationen (8 Wochen)
- [ ] REST API aufbauen
- [ ] Impressum-Crawler
- [ ] LinkedIn-Integration
- [ ] Erste externe APIs
- [ ] Webhook-System

### Phase 6: Optimierung (4 Wochen)
- [ ] Performance-Tuning
- [ ] Caching-Layer
- [ ] Batch-Operationen
- [ ] Analytics-Dashboard
- [ ] A/B-Testing Setup

---

## 📊 Erfolgs-Metriken

### Business KPIs
- **MRR aus Premium-Subscriptions**
- **Conversion Rate Free → Premium**
- **Churn Rate Premium-Kunden**
- **ARPU (Average Revenue Per User)**

### Datenqualität KPIs
- **Verifizierungsrate**: Ziel >60%
- **Datenaktualität**: <6 Monate alt
- **Match-Genauigkeit**: >90% Präzision
- **Duplikate-Rate**: <5%

### Nutzungs-KPIs
- **Suchen pro User/Monat**
- **Import-Rate**
- **API-Calls**
- **Sync-Frequency**

---

## 🎯 Wettbewerbsvorteile

### USPs
1. **Crowdsourced Data**: Einzigartige Datenquelle
2. **DSGVO-Konformität**: Vollständig compliant
3. **Faire Preise**: Günstiger als Cision & Co.
4. **Deutsche Fokussierung**: DACH-Region Spezialist
5. **Nahtlose Integration**: Native CRM-Einbindung

### Differenzierung
- **vs. Cision**: 10x günstiger, bessere UX
- **vs. Zimpel**: Modernere Tech, API-First
- **vs. Manual**: Automatisiert & verifiziert

---

## 🚨 Risiken & Mitigationen

### Rechtliche Risiken
- **Risiko**: DSGVO-Verstöße
- **Mitigation**: Anwalt-Review, Opt-In-First

### Technische Risiken
- **Risiko**: Daten-Leaks
- **Mitigation**: Encryption, Access-Control

### Business-Risiken
- **Risiko**: Geringe Adoption
- **Mitigation**: Freemium-Model, Mehrwert-Kommunikation

### Qualitäts-Risiken
- **Risiko**: Veraltete Daten
- **Mitigation**: Auto-Verifizierung, Crowd-Updates

---

## 📅 Zeitplan & Meilensteine

### Q1 2024: MVP
- Foundation + Basic Matching
- 100 verifizierte Kontakte
- Admin-Tools fertig

### Q2 2024: Beta Launch
- Premium-Features live
- 1.000 verifizierte Kontakte
- Erste zahlende Kunden

### Q3 2024: Market Entry
- Volle Funktionalität
- 5.000 verifizierte Kontakte
- Marketing-Kampagne

### Q4 2024: Scale
- 10.000+ Kontakte
- 100+ Premium-Kunden
- Break-Even erreicht

---

## 💡 Zukunftsvision

### Kurzfristig (6 Monate)
- KI-gestützte Themen-Zuordnung
- Sentiment-Analyse von Artikeln
- Automatische Medienlisten-Generierung

### Mittelfristig (12 Monate)
- Internationale Expansion (AT, CH)
- Mobile App
- Chrome Extension für LinkedIn

### Langfristig (24 Monate)
- EU-weite Abdeckung
- Influencer-Datenbank
- Predictive PR-Analytics

---

## 📝 Nächste Schritte

1. **Review & Feedback** zu diesem Masterplan
2. **Detaillierte Implementierungspläne** für Phase 1
3. **Technische Spezifikationen** erstellen
4. **UI/UX Mockups** entwerfen
5. **Rechtliche Prüfung** initiieren

---

*Dokumentversion: 1.0*
*Erstellt: ${new Date().toLocaleDateString('de-DE')}*
*Status: Entwurf zur Diskussion*