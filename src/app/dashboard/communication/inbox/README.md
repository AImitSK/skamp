# 📋 CeleroPress E-Mail System - Implementierungsplan 2025 (Aktualisiert)

## 🎯 Vision: Von der funktionierenden Inbox zum kollaborativen PR-Management-System

### Kernkonzept (aus paste.txt)
- **Kunden-basierte Organisation** statt klassischer E-Mail-Ordner
- **Kampagnen-Unterordner** für bessere Strukturierung
- **Team-Kollaboration** mit Zuweisungen und Delegation
- **Status-Tracking** für jeden Thread
- **Interne Notizen** für Team-Kommunikation

## 📊 Aktueller Status (Stand: Juli 2025)

### ✅ Bereits funktionsfähig
- **E-Mail-Empfang funktioniert** - Webhook läuft, E-Mails kommen an
- **E-Mail-Versand aus Inbox** - Grundsätzlich funktionsfähig (kleine Bugs)
- **Reply-To System** - Antworten auf PR-Kampagnen landen korrekt in der Inbox
- **Domain-Registrierung** - Vollständig implementiert
- **E-Mail-Adressen anlegen** - Multi-Adressen pro Domain möglich
- **Signaturen-System** - Vollständig funktionsfähig
- **Routing-Regeln UI** - Regeln können angelegt werden (Ausführung fehlt)
- **Thread-Matching** - Basis-Funktionalität vorhanden

### ⚠️ Kleine Bugs / Verbesserungen nötig
- **E-Mail-Versand** - Kleinere Fehler zu beheben (erledigt)
- **Routing-Regeln** - UI überarbeiten, Ausführung implementieren
- **Überflüssige Ordner** - Spam/Entwürfe noch sichtbar

### ❌ Noch nicht implementiert
- **Kunden/Kampagnen-basierte Ordnerstruktur**
- **Team-Features** (nur Mock-Daten)
- **Status-System für E-Mails**
- **Interne Notizen & Kommentare**
- **MediaCenter Integration**
- **E-Mail Templates**
- **KI-Integration (Gemini)**
- **Bulk-Aktionen**

## 🏗️ Angepasster Implementierungsplan

### Phase 0: Quick Fixes & Stabilisierung (1-2 Tage) 🚀 SOFORT STARTEN

#### 0.1 Bug-Fixes
**Datei:** `src/components/inbox/ComposeEmail.tsx`
- [✅] E-Mail-Versand Fehler debuggen und beheben
- [✅] Error-Handling verbessern
- [✅] Erfolgs-Feedback nach Versand

#### 0.2 UI-Bereinigung
**Datei:** `src/components/inbox/InboxSidebar.tsx`
- [ ] Ordner "Spam" und "Entwürfe" entfernen
- [ ] Nur relevante Ordner anzeigen (Posteingang, Gesendet, Papierkorb)

#### 0.3 Routing-Regeln aktivieren
**Datei:** `src/lib/email/email-processor-flexible.ts`
- [ ] `applyRoutingRules()` Methode vervollständigen
- [ ] Team-Zuweisung tatsächlich durchführen
- [ ] Tags und Prioritäten setzen
- [ ] Test mit echten eingehenden E-Mails

### Phase 1: Kunden/Kampagnen-Organisation (4 Tage) 🎯 HÖCHSTE PRIORITÄT

#### 1.1 Datenmodell-Erweiterung
**Updates in:** `src/types/email-enhanced.ts`
```typescript
interface EmailThread {
  // Neu hinzufügen:
  customerId?: string;
  customerName?: string;
  campaignId?: string;
  campaignName?: string;
  folderType: 'customer' | 'campaign' | 'general';
}

interface EmailMessage {
  // Erweitern um:
  customerId?: string;
  campaignId?: string;
}
```

#### 1.2 Automatische Kunden/Kampagnen-Zuordnung
**Neue Datei:** `src/lib/email/customer-campaign-matcher.ts`
```typescript
class CustomerCampaignMatcher {
  // Zuordnung basierend auf:
  // 1. E-Mail-Adresse → Kunde (aus CRM)
  // 2. Reply-To → Kampagne (aus PR-Kampagnen)
  // 3. Subject-Keywords → Kampagne
  // 4. Domain → Kunde
}
```

#### 1.3 Neue Sidebar mit Kunden-Struktur
**Neue Datei:** `src/components/inbox/CustomerCampaignSidebar.tsx`
- Ersetze aktuelle Ordner-Struktur durch:
  ```
  📁 Kunde ABC GmbH (3 neu)
     └── 📄 Produktlaunch 2025 (2 neu)
     └── 📄 Pressemitteilung Juli
  📁 Kunde XYZ AG (1 neu)
     └── 📄 Messe-Kampagne
  📁 Allgemeine Anfragen (5 neu)
  ```

#### 1.4 Thread-Liste Anpassung
**Update:** `src/app/dashboard/communication/inbox/page.tsx`
- [ ] Filter-Logik für Kunden/Kampagnen
- [ ] Breadcrumb-Navigation
- [ ] Kunde/Kampagne in Thread-Preview anzeigen

### Phase 2: Team-Features aktivieren (3 Tage)

#### 2.1 Echte Team-Daten laden
**Update:** `src/app/dashboard/settings/email/page.tsx`
- [ ] Mock-Team-Members durch Organization-Service ersetzen
- [ ] Team-Mitglieder aus Firebase laden
- [ ] Permissions prüfen

#### 2.2 E-Mail-Zuweisung funktionsfähig machen
**Update:** `src/components/inbox/EmailList.tsx`
- [ ] Zugewiesene Person anzeigen (Avatar + Name)
- [ ] Quick-Assign Dropdown
- [ ] Zuweisung in Firestore speichern

#### 2.3 Status-System implementieren
**Neues Feature in:** `src/components/inbox/EmailViewer.tsx`
```typescript
type ThreadStatus = 'new' | 'in-progress' | 'waiting-for-reply' | 'completed';
- Status-Badge prominent anzeigen
- Status-Änderungs-Buttons
- Automatischer Status "waiting-for-reply" nach Antwort
```

#### 2.4 Interne Notizen
**Neue Komponente:** `src/components/inbox/InternalNotes.tsx`
- [ ] Notiz-Feld unter jeder E-Mail
- [ ] @Mentions für Team-Mitglieder
- [ ] Timestamp & Autor anzeigen
- [ ] Nur für Team sichtbar

### Phase 3: E-Mail Templates (2 Tage)

#### 3.1 Template Service
**Neue Datei:** `src/lib/email/email-template-service.ts`
- [ ] CRUD-Operationen für Templates
- [ ] Kategorien: Antwort, Follow-Up, Absage
- [ ] Variable-System: {{contact.name}}, {{campaign.title}}

#### 3.2 Template UI im Settings-Bereich
**Update:** `src/app/dashboard/settings/email/page.tsx`
- [ ] Templates Tab funktionsfähig machen
- [ ] Template-Editor mit RichTextEditor
- [ ] Variable-Picker

#### 3.3 Template-Integration in ComposeEmail
**Update:** `src/components/inbox/ComposeEmail.tsx`
- [ ] Template-Auswahl Dropdown
- [ ] Variablen automatisch ersetzen
- [ ] Vorschau-Modus

### Phase 4: MediaCenter & Anhänge (2 Tage)

#### 4.1 Anhang-Upload aus Webhook
**Update:** `src/app/api/webhooks/sendgrid/inbound/route.ts`
- [ ] Attachments aus FormData extrahieren
- [ ] Upload zu Firebase Storage
- [ ] Speichern der URLs in EmailMessage

#### 4.2 Anhang-Anzeige
**Update:** `src/components/inbox/EmailViewer.tsx`
- [ ] Anhänge-Liste anzeigen
- [ ] Download-Buttons
- [ ] Vorschau für Bilder/PDFs

#### 4.3 MediaCenter Integration
**Update:** `src/components/inbox/ComposeEmail.tsx`
- [ ] MediaCenter-Modal einbinden
- [ ] Assets als Anhänge hinzufügen
- [ ] Drag & Drop Support

### Phase 5: Erweiterte Features (2 Tage)

#### 5.1 Bulk-Operationen
**Update:** `src/components/inbox/EmailList.tsx`
- [ ] Multi-Select Checkboxes
- [ ] Bulk-Actions Toolbar
- [ ] Bulk Archive/Delete/Assign

#### 5.2 E-Mail-Weiterleitung
**Update:** `src/components/inbox/EmailViewer.tsx`
- [ ] Forward-Button funktionsfähig
- [ ] Empfänger-Auswahl
- [ ] Original-Nachricht zitieren

#### 5.3 Delegation & Abwesenheit
**Neue Komponente:** `src/components/inbox/DelegationSettings.tsx`
- [ ] Temporäre Weiterleitungen
- [ ] Vertretungs-Regeln
- [ ] Auto-Reply bei Abwesenheit

### Phase 6: KI-Integration (3 Tage)

#### 6.1 Gemini Integration
**Neue Datei:** `src/lib/email/email-ai-service.ts`
- [ ] Intent-Analyse (Anfrage, Beschwerde, etc.)
- [ ] Antwort-Vorschläge generieren
- [ ] Sentiment-Analyse

#### 6.2 KI-Assistant UI
**Neue Komponente:** `src/components/inbox/AIAssistant.tsx`
- [ ] Vorschläge in EmailViewer anzeigen
- [ ] "Mit KI antworten" Button
- [ ] Ton-Anpassung (formal/locker)

## 📅 Realistischer Zeitplan

| Phase | Aufwand | Priorität | Status |
|-------|---------|-----------|--------|
| Phase 0: Quick Fixes | 1-2 Tage | 🔴 KRITISCH | ⏳ Sofort starten |
| Phase 1: Kunden-Organisation | 4 Tage | 🔴 HOCH | ⏳ Diese Woche |
| Phase 2: Team-Features | 3 Tage | 🟡 MITTEL | ⏳ Nächste Woche |
| Phase 3: Templates | 2 Tage | 🟡 MITTEL | ⏳ KW 32 |
| Phase 4: MediaCenter | 2 Tage | 🟢 NIEDRIG | ⏳ KW 33 |
| Phase 5: Erweiterte Features | 2 Tage | 🟢 NIEDRIG | ⏳ KW 33 |
| Phase 6: KI-Integration | 3 Tage | 🔵 OPTIONAL | ⏳ September |

**Gesamt: 14-17 Arbeitstage** (ohne KI-Integration)

## 🚀 Sofort-Maßnahmen (Heute noch!)

### 1. Routing-Regeln testen (30 Min)
```typescript
// In email-processor-flexible.ts, Zeile ~500
private async applyRoutingRules() {
  // TODO: Implementierung vervollständigen
  console.log('🔧 Routing-Regeln werden angewendet');
  // Team-Zuweisung
  // Tags hinzufügen
  // Priorität setzen
}
```

### 2. Überflüssige Ordner entfernen (15 Min)
```typescript
// In InboxSidebar.tsx
const folders = [
  { id: 'inbox', name: 'Posteingang', icon: InboxIcon },
  { id: 'sent', name: 'Gesendet', icon: PaperAirplaneIcon },
  // { id: 'drafts', name: 'Entwürfe', icon: DocumentDuplicateIcon }, // ENTFERNEN
  // { id: 'spam', name: 'Spam', icon: ExclamationTriangleIcon }, // ENTFERNEN
  { id: 'trash', name: 'Papierkorb', icon: TrashIcon }
];
```

### 3. Test-Szenario durchspielen (45 Min)
1. PR-Kampagne versenden
2. Auf Test-E-Mail antworten
3. Prüfen ob Antwort korrekt zugeordnet wird
4. Routing-Regel testen

## 🎯 Definition of Done - Phase 0

- [✅] E-Mails können ohne Fehler versendet werden
- [ ] Nur relevante Ordner sind sichtbar
- [ ] Routing-Regeln werden bei eingehenden E-Mails ausgeführt
- [ ] Team kann E-Mails zugewiesen bekommen
- [ ] Basis-Funktionalität ist stabil

## 🔑 Kritische Erfolgsfaktoren

1. **Stabilität vor Features** - Erst Bugs fixen, dann erweitern
2. **Schrittweise Migration** - Klassische Ansicht als Fallback behalten
3. **Team-Feedback** - Nach jeder Phase mit Nutzern testen
4. **Performance** - Bei vielen Kunden/Kampagnen muss es flüssig bleiben

## 📁 Dateistruktur-Übersicht

### 🎯 Frontend - Inbox UI
```
src/app/dashboard/communication/inbox/
├── page.tsx                    # Haupt-Inbox-Seite mit Thread-Liste
├── layout.tsx                  # Layout ohne Sidebar
├── INSTRUCTIONS.md             # Entwicklungs-Guidelines
└── README.md                   # Projekt-Übersicht & Status

src/components/inbox/
├── InboxSidebar.tsx           # Ordner-Navigation (zu ersetzen)
├── EmailList.tsx              # Thread-Liste Komponente
├── EmailViewer.tsx            # E-Mail-Anzeige & Aktionen
└── ComposeEmail.tsx           # E-Mail verfassen/antworten
```

### ⚙️ Backend - API Routes
```
src/app/api/
├── webhooks/sendgrid/inbound/route.ts    # Empfängt eingehende E-Mails
├── email/
│   ├── send/route.ts                      # E-Mail-Versand API
│   └── test/route.ts                      # Test-E-Mail-Versand
└── sendgrid/
    ├── send-pr-campaign/route.ts          # PR-Kampagnen-Versand
    └── webhook/route.ts                   # SendGrid Event-Webhook
```

### 📚 Services & Business Logic
```
src/lib/email/
├── email-message-service.ts              # E-Mail CRUD-Operationen
├── email-processor-flexible.ts           # E-Mail-Verarbeitung & Routing
├── thread-matcher-service-flexible.ts    # Thread-Zuordnung
├── email-address-service.ts              # E-Mail-Adressen Verwaltung
├── email-signature-service.ts            # Signaturen-Verwaltung
├── email-composer-service.ts             # E-Mail-Erstellung
├── email-service.ts                      # Allgemeine E-Mail-Funktionen
└── inbox-test-service.ts                 # Domain-Test-E-Mails
```

### 🔧 Neue Services (zu erstellen)
```
src/lib/email/
├── customer-campaign-matcher.ts          # Phase 1.2
├── email-template-service.ts             # Phase 3.1
├── email-ai-service.ts                   # Phase 6.1
├── attachment-service.ts                 # Phase 4.1
└── email-notification-service.ts         # Benachrichtigungen
```

### 📝 TypeScript Types
```
src/types/
├── email-enhanced.ts                     # Haupt-E-Mail-Typen
├── inbox-enhanced.ts                     # Inbox-spezifische Typen
├── email-domains.ts                      # Domain-Typen
└── email-domains-enhanced.ts             # Erweiterte Domain-Typen
```

### ⚛️ Neue Komponenten (zu erstellen)
```
src/components/inbox/
├── CustomerCampaignSidebar.tsx           # Phase 1.3
├── InternalNotes.tsx                     # Phase 2.4
├── AIAssistant.tsx                       # Phase 6.2
├── AttachmentViewer.tsx                  # Phase 4.3
├── DelegationSettings.tsx                # Phase 5.3
└── SLATracker.tsx                        # Optional

src/components/email/
├── RoutingRuleEditor.tsx                 # ✅ Vorhanden (überarbeiten)
├── RoutingRuleBuilder.tsx                # ✅ Vorhanden
├── RoutingRuleTest.tsx                   # ✅ Vorhanden
├── SignatureEditor.tsx                   # ✅ Vorhanden
├── SignatureList.tsx                     # ✅ Vorhanden
├── TemplateList.tsx                      # Phase 3.2 (neu)
├── TemplateEditor.tsx                    # Phase 3.2 (neu)
├── TemplatePreview.tsx                   # Phase 3.2 (neu)
└── VariablePicker.tsx                    # Phase 3.2 (neu)
```

### ⚙️ Settings & Konfiguration
```
src/app/dashboard/settings/email/
└── page.tsx                              # E-Mail-Einstellungen (3 Tabs)

src/app/dashboard/settings/domain/
└── page.tsx                              # Domain-Verwaltung
```

### 🔒 Security & Middleware
```
src/lib/api/
├── auth-middleware.ts                    # API Authentication
└── api-client.ts                         # Authenticated Fetch Wrapper

src/lib/security/
└── rate-limit-service-api.ts             # Rate Limiting
```

### 🔥 Firebase Integration
```
src/lib/firebase/
├── client-init.ts                        # Client-Side Firebase
├── server-init.ts                        # Server-Side Firebase
├── config.ts                             # Firebase Konfiguration
├── domain-service.ts                     # Domain-Verwaltung
└── notifications-service.ts              # Benachrichtigungen
```

### 📊 Firestore Collections
```
Firestore Database:
├── email_messages/                       # Einzelne E-Mails
├── email_threads/                        # E-Mail-Threads
├── email_addresses/                      # Konfigurierte E-Mail-Adressen
├── email_signatures/                     # E-Mail-Signaturen
├── email_templates/                      # E-Mail-Vorlagen (Phase 3)
├── email_drafts/                         # Entwürfe
├── domains/                              # Verifizierte Domains
├── organizations/                        # Organisationen/Kunden
└── pr_campaigns/                         # PR-Kampagnen
```

### 🛠️ Utility & Helper
```
src/lib/
├── utils/                                # Allgemeine Utilities
├── hooks/                                # React Hooks
└── context/
    └── AuthContext.tsx                   # Authentication Context
```

---

**Status**: Phase 0 - Quick Fixes  
**Version**: 2.1.0  
**Letzte Aktualisierung**: 29. Juli 2025  
**Nächster Meilenstein**: Kunden-basierte Organisation (KW 31)