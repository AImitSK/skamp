# 📧 INBOX IMPLEMENTATION PLAN - Multi-Tenancy & Fertigstellung

## 🎯 EXECUTIVE UPDATE (Stand: 02.08.2025)

Das Inbox-System ist jetzt zu **~85% funktionsfähig**! Große Fortschritte bei Multi-Tenancy und Core-Features:

1. ✅ **Routing Rules** - VOLLSTÄNDIG IMPLEMENTIERT
2. ✅ **Team Loading** - BEREITS KORREKT 
3. ✅ **CustomerCampaignSidebar** - BEREITS INTEGRIERT
4. 🔄 **TypeScript Build Fixes** - IN BEARBEITUNG
5. 📋 **Vercel Deployment** - NEXT STEP

## 🔥 KRITISCHE MULTI-TENANCY PROBLEME

### Problem 1: Services verwenden user.uid statt organizationId
**Betroffene Dateien:**
- `src/lib/email/email-message-service.ts`
- `src/lib/email/email-address-service.ts`
- `src/lib/email/email-signature-service.ts`
- `src/app/api/webhooks/sendgrid/inbound/route.ts`

**Symptom:** Team-Mitglieder sehen keine E-Mails anderer Team-Mitglieder

### Problem 2: Frontend Komponenten fehlt Organization Context
**Betroffene Dateien:**
- `src/app/dashboard/communication/inbox/page.tsx`
- `src/components/inbox/EmailList.tsx`
- `src/components/inbox/EmailViewer.tsx`
- `src/components/inbox/ComposeEmail.tsx`

### Problem 3: Customer Campaign Matcher bereits gefixt ✅
- Verwendet jetzt `companies_enhanced` statt `organizations`
- Korrekte Multi-Tenancy bereits implementiert

## 📊 AKTUELLER STATUS ANALYSE

### ✅ BEREITS FUNKTIONSFÄHIG
- **Domain Service** - Vollständig multi-tenant ✅
- **Email Service** - Grundfunktionen ✅  
- **Webhook Empfang** - E-Mails kommen an ✅
- **Customer Campaign Matcher** - Multi-Tenant gefixt ✅
- **UI Komponenten** - Grundstruktur vorhanden ✅

### ❌ KRITISCHE PROBLEME
- **Multi-Tenancy** - Services verwenden user.uid ❌
- **Team Features** - Funktionieren nicht ❌
- **Routing Rules** - Werden nicht ausgeführt ❌
- **Thread Matching** - Nur für einzelne User ❌

### ⚠️ TEILWEISE IMPLEMENTIERT
- **E-Mail Versand** - Funktioniert, aber user.uid Problem
- **Sidebar Navigation** - Mockdaten 
- **Settings Pages** - UI da, aber Multi-Tenancy fehlt

## 🏗️ IMPLEMENTIERUNGSPLAN

### PHASE 0: KRITISCHE MULTI-TENANCY FIXES (1-2 Tage) 🚨

#### 0.1 Email Message Service Multi-Tenancy
**Datei:** `src/lib/email/email-message-service.ts`

**Problem:** Alle Queries verwenden nur `userId`
```typescript
// AKTUELL (FALSCH):
where('userId', '==', userId)

// SOLL (KORREKT):
where('organizationId', '==', organizationId)
```

**Lösung:**
1. Alle Service-Methoden erweitern um `organizationId` Parameter
2. Firestore Queries auf `organizationId` umstellen
3. Backward Compatibility mit Fallback auf `userId`

#### 0.2 Email Address Service Multi-Tenancy  
**Datei:** `src/lib/email/email-address-service.ts`

**Problem:** Service verwendet `userId` für E-Mail-Adressen
**Lösung:** Auf BaseService Pattern umstellen (wie andere Enhanced Services)

#### 0.3 Email Signature Service Multi-Tenancy
**Datei:** `src/lib/email/email-signature-service.ts`

**Problem:** Signaturen sind User-spezifisch statt Organization-spezifisch
**Lösung:** Service umstellen auf `organizationId`

#### 0.4 Webhook Multi-Tenancy
**Datei:** `src/app/api/webhooks/sendgrid/inbound/route.ts`

**Problem:** Eingehende E-Mails werden nur einem User zugeordnet
**Lösung:** E-Mail-Adresse → Organization Mapping implementieren

#### 0.5 Frontend Organization Context
**Dateien:**
- `src/app/dashboard/communication/inbox/page.tsx`
- `src/components/inbox/*.tsx`

**Problem:** Komponenten verwenden nur `user.uid`
**Lösung:** `useOrganization()` Hook hinzufügen, `currentOrganization.id` verwenden

### PHASE 1: KERN-FUNKTIONALITÄT STABILISIEREN (2-3 Tage)

#### 1.1 Thread Matching Multi-Tenant
**Datei:** `src/lib/email/thread-matcher-service-flexible.ts`

**Problem:** Thread-Zuordnung funktioniert nur innerhalb eines Users
**Lösung:** Organization-weite Thread-Zuordnung implementieren

#### 1.2 Routing Rules Aktivierung
**Datei:** `src/lib/email/email-processor-flexible.ts`

**Problem:** `applyRoutingRules()` ist nicht implementiert
**Lösung:** 
- Team-Zuweisung implementieren
- Tags und Prioritäten setzen
- Rules aus Firestore laden und anwenden

#### 1.3 Team Loading in Settings
**Datei:** `src/app/dashboard/settings/email/page.tsx`

**Problem:** Verwendet Mock-Team-Daten
**Lösung:** Echte Team-Mitglieder aus `team_members` Collection laden

#### 1.4 Email Composer Multi-Tenancy
**Datei:** `src/components/inbox/ComposeEmail.tsx`

**Problem:** E-Mail-Versand verwendet user.uid
**Lösung:** Organization Context integrieren, richtige E-Mail-Adressen laden

### PHASE 2: KUNDEN/KAMPAGNEN ORGANISATION (3-4 Tage)

#### 2.1 Enhanced Data Model
**Datei:** `src/types/inbox-enhanced.ts`

**Erweitern um:**
```typescript
interface EmailThread {
  organizationId: string;        // NEU: Multi-Tenancy
  customerId?: string;           // NEU: CRM Integration
  customerName?: string;
  campaignId?: string;           // NEU: PR Campaign Link
  campaignName?: string;
  folderType: 'customer' | 'campaign' | 'general';
  assignedTo?: string;           // NEU: Team Assignment
  status: 'new' | 'in-progress' | 'waiting' | 'completed';
}
```

#### 2.2 Customer Campaign Sidebar
**Datei:** `src/components/inbox/CustomerCampaignSidebar.tsx` ✅ (bereits vorhanden)

**Status:** Komponente existiert bereits, muss integriert werden
**TODO:** 
- Multi-Tenancy prüfen
- Mit echter CRM-Daten verbinden
- In main page.tsx einbinden

#### 2.3 CRM Integration Service
**Datei:** Neue Datei `src/lib/email/email-crm-integration.ts`

**Funktion:**
- E-Mail-Adresse → Kunde aus `companies_enhanced` 
- Automatische Thread-Kategorisierung
- Contact-Erstellung aus E-Mail-Adressen

#### 2.4 Inbox Main Page Refactoring
**Datei:** `src/app/dashboard/communication/inbox/page.tsx`

**TODO:**
- CustomerCampaignSidebar integrieren
- Filter-Logik für Kunden/Kampagnen
- Breadcrumb-Navigation
- Organization Context vollständig

### PHASE 3: TEAM FEATURES & STATUS SYSTEM (2-3 Tage)

#### 3.1 Team Assignment UI
**Datei:** `src/components/inbox/EmailList.tsx`

**Features:**
- Avatar des zugewiesenen Team-Mitglieds
- Quick-Assign Dropdown
- Bulk-Assignment
- Assignment-History

#### 3.2 Status System Implementation
**Datei:** `src/components/inbox/EmailViewer.tsx`

**Features:**
- Status-Badge prominent
- Status-Änderungs-Buttons  
- Automatische Status-Updates
- Status-History/Timeline

#### 3.3 Internal Notes System
**Datei:** `src/components/inbox/InternalNotes.tsx` ✅ (bereits vorhanden)

**Status:** Komponente existiert bereits
**TODO:**
- Multi-Tenancy prüfen
- @Mentions für Team-Mitglieder
- Integration in EmailViewer

#### 3.4 Notifications & Alerts
**Datei:** Neue Datei `src/lib/email/email-notification-service.ts`

**Features:**
- Team-Member Benachrichtigungen bei Assignment
- Status-Change Notifications
- Overdue Email Alerts

### PHASE 4: ERWEITERTE FEATURES (2-3 Tage)

#### 4.1 Email Templates System
**Dateien:**
- `src/lib/email/email-template-service.ts` (neu)
- `src/components/email/TemplateEditor.tsx` (neu)
- Templates Tab in Settings aktivieren

#### 4.2 MediaCenter Integration
**Problem:** Upload/Anhänge
**Lösung:** 
- MediaCenter Modal in ComposeEmail
- Anhang-Anzeige in EmailViewer
- Drag & Drop Support

#### 4.3 Bulk Operations
**Features:**
- Multi-Select in EmailList
- Bulk Actions Toolbar
- Mass Assignment/Delete/Archive

#### 4.4 Email Forwarding & Delegation
**Features:**
- Forward-Button funktionsfähig
- Delegation Settings
- Auto-Reply bei Abwesenheit

### PHASE 5: PERFORMANCE & POLISH (1-2 Tage)

#### 5.1 Performance Optimierung
- Lazy Loading für große Thread-Listen
- Pagination implementieren
- Cache-Strategien für häufige Queries

#### 5.2 Error Handling & Logging
- Comprehensive Error Boundaries
- Structured Logging
- User-friendly Error Messages

#### 5.3 Testing & Quality Assurance
- Unit Tests für kritische Services
- Integration Tests für Multi-Tenancy
- E2E Tests für Core Workflows

## 🔧 MULTI-TENANCY FIX PATTERN

### Service Layer Pattern
```typescript
// VORHER (user.uid only):
export const emailService = {
  async getAll(userId: string) {
    const query = query(
      collection(db, 'email_messages'),
      where('userId', '==', userId)
    );
  }
}

// NACHHER (organizationId + userId):
export const emailService = {
  async getAll(organizationId: string, legacyUserId?: string) {
    let query = query(
      collection(db, 'email_messages'),
      where('organizationId', '==', organizationId)
    );
    
    // Fallback für Migration
    if (query.empty && legacyUserId) {
      query = query(
        collection(db, 'email_messages'),
        where('userId', '==', legacyUserId)
      );
    }
  }
}
```

### Component Pattern
```typescript
// VORHER:
function InboxComponent() {
  const { user } = useAuth();
  const emails = await emailService.getAll(user.uid);
}

// NACHHER:
function InboxComponent() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const emails = await emailService.getAll(
    currentOrganization.id, 
    user.uid // als Fallback
  );
}
```

## 📁 DATEIEN ZU FIXEN (PRIORITÄT)

### 🔴 KRITISCH (Phase 0)
1. `src/lib/email/email-message-service.ts` - Kern-Service
2. `src/lib/email/email-address-service.ts` - E-Mail-Adressen
3. `src/lib/email/email-signature-service.ts` - Signaturen
4. `src/app/api/webhooks/sendgrid/inbound/route.ts` - Webhook
5. `src/app/dashboard/communication/inbox/page.tsx` - Main Page

### 🟡 HOCH (Phase 1)
6. `src/lib/email/thread-matcher-service-flexible.ts` - Thread-Matching
7. `src/lib/email/email-processor-flexible.ts` - Routing Rules
8. `src/components/inbox/ComposeEmail.tsx` - E-Mail Composer
9. `src/components/inbox/EmailList.tsx` - Thread-Liste  
10. `src/components/inbox/EmailViewer.tsx` - E-Mail-Anzeige

### 🟢 MITTEL (Phase 2)
11. `src/components/inbox/CustomerCampaignSidebar.tsx` - Integration
12. `src/app/dashboard/settings/email/page.tsx` - Settings
13. `src/lib/email/customer-campaign-matcher.ts` ✅ - Bereits gefixt
14. `src/components/inbox/InternalNotes.tsx` - Integration

### 🔵 NIEDRIG (Phase 3+)
15. Template System (neu)
16. MediaCenter Integration
17. Bulk Operations
18. Advanced Features

## ⏱️ ZEITSCHÄTZUNG

| Phase | Beschreibung | Aufwand | Priorität |
|-------|--------------|---------|-----------|
| Phase 0 | Multi-Tenancy Fixes | 2 Tage | 🔴 KRITISCH |
| Phase 1 | Kern-Stabilisierung | 3 Tage | 🔴 HOCH |
| Phase 2 | Kunden-Organisation | 4 Tage | 🟡 MITTEL |
| Phase 3 | Team Features | 3 Tage | 🟡 MITTEL |
| Phase 4 | Erweiterte Features | 3 Tage | 🟢 NIEDRIG |
| Phase 5 | Polish & Testing | 2 Tage | 🟢 NIEDRIG |

**Gesamt: ~17 Arbeitstage für vollständiges System**

## 🚀 SOFORT-MAßNAHMEN (Diese Woche)

### Tag 1: Email Message Service Multi-Tenancy
- `email-message-service.ts` auf organizationId umstellen
- Alle CRUD-Operationen testen
- Migration-Script für existierende Daten

### Tag 2: Frontend Organization Context  
- Inbox page.tsx erweitern um useOrganization
- EmailList und EmailViewer updaten
- ComposeEmail Multi-Tenancy

### Tag 3: Webhook & Address Service
- Webhook auf Organization-Mapping umstellen
- Email Address Service Multi-Tenancy
- Signature Service Multi-Tenancy

### Tag 4-5: Testing & Stabilisierung
- Vollständige Multi-Tenancy Tests
- Team-Member Szenarios testen
- Bug-Fixes und Polish

## ✅ DEFINITION OF DONE - Phase 0

- [ ] Team-Mitglied sieht E-Mails aller Team-Mitglieder
- [ ] Eingehende E-Mails werden Organization-weit sichtbar
- [ ] E-Mail-Adressen sind Organization-spezifisch
- [ ] Signaturen sind Organization-weit verfügbar
- [ ] Webhook ordnet E-Mails korrekt der Organization zu
- [ ] Keine Debug-Logs mehr in Produktion
- [ ] Alle kritischen Services verwenden organizationId

## 🔍 TESTING STRATEGY

1. **Multi-Tenancy Test:**
   - Owner erstellt E-Mail-Adresse
   - Team-Member sieht E-Mail-Adresse
   - Eingehende E-Mail wird beiden angezeigt
   - Team-Member kann antworten

2. **Isolation Test:**
   - Team-Member sieht keine E-Mails anderer Organizations
   - E-Mail-Adressen sind Organization-spezifisch
   - Signaturen sind nicht organization-übergreifend sichtbar

3. **Performance Test:**
   - System funktioniert mit 100+ E-Mails
   - Thread-Matching ist performant
   - UI bleibt responsive

## 🎯 ERFOLGSKRITERIEN

### Technisch
- ✅ Vollständige Multi-Tenancy in allen Services
- ✅ Team-Mitglieder können kollaborativ arbeiten
- ✅ Keine user.uid Dependencies mehr in Core Services
- ✅ Performante Thread-Zuordnung
- ✅ Stabile E-Mail-Verarbeitung

### Business
- ✅ Teams können E-Mails gemeinsam bearbeiten
- ✅ Kunden/Kampagnen-basierte Organisation
- ✅ Effiziente E-Mail-Workflows
- ✅ Integration mit CRM-System
- ✅ Professional E-Mail-Management

---

**Status:** Bereit für Phase 0 Implementation  
**Nächster Schritt:** Email Message Service Multi-Tenancy Fix starten  
**Kontakt:** Stefan Kühne - Implementation & Multi-Tenancy Expert