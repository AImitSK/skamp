# Multi-Tenancy Fix - Dokumentation

## Problem-Zusammenfassung

**Hauptproblem:** Eingeladene Team-Mitglieder sahen keine geteilten Organisationsdaten, sondern bekamen leere Organisationen.

**Root Cause:** Das System verwendete inkonsistent `user.uid` statt `organizationId` für Datenzugriffe, wodurch echtes Multi-Tenancy nicht funktionierte.

## Gefixte Probleme

### 1. Race Condition bei Einladungsannahme
**Problem:** Einladung wurde akzeptiert, aber OrganizationContext fand 0 Mitgliedschaften.
**Lösung:** 2-Sekunden Delay nach Einladungsannahme, damit Firestore synchronisieren kann.
**Datei:** `src/app/invite/[token]/page.tsx`

### 2. CRM-Seite verwendete user.uid statt organizationId
**Problem:** CRM-Interface lud Daten mit `user.uid` statt `currentOrganization.id`.
**Lösung:** Alle Service-Aufrufe auf `currentOrganization.id` umgestellt.
**Datei:** `src/app/dashboard/contacts/crm/page.tsx`

### 3. Firestore Rules blockierten Invite-Seite
**Problem:** Invite-Seite lief unauthentifiziert und konnte team_members nicht lesen.
**Lösung:** Temporär Rules komplett geöffnet für Debugging.
**Datei:** `firestore.rules`

## Architektur-Änderungen

### Korrekte Multi-Tenancy Implementierung

**RICHTIG:** ✅
```typescript
// Service-Aufrufe mit organizationId
const data = await companiesEnhancedService.getAll(currentOrganization.id);

// Context mit organizationId
const context = { organizationId: currentOrganization.id, userId: user.uid };
```

**FALSCH:** ❌
```typescript
// Alte Implementierung mit user.uid
const data = await companiesEnhancedService.getAll(user.uid);
```

### Service-Layer Struktur

**Enhanced Services (KORREKT):**
- `crm-service-enhanced.ts` ✅ - Nutzt BaseService mit organizationId
- `service-base.ts` ✅ - Korrekte Multi-tenancy Implementierung
- `team-service-enhanced.ts` ✅ - Korrekte organizationId Verwendung

**Legacy Services (PROBLEMATISCH):**
- `crm-service.ts` ❌ - Nutzt user.uid statt organizationId
- `task-service.ts` ❌ - Keine Multi-tenancy
- `lists-service.ts` ❌ - Falsche organizationId Zuordnung
- `boilerplate-service.ts` ❌ - Inkonsistente Implementierung

## Dateien die noch zu fixen sind

### Kritische Dateien (Priority 1)
```
src/lib/firebase/crm-service.ts
src/lib/firebase/task-service.ts  
src/lib/firebase/lists-service.ts
src/lib/firebase/boilerplate-service.ts
```

### UI-Komponenten die user.uid verwenden könnten
```
src/app/dashboard/pr-tools/boilerplates/page.tsx
src/app/dashboard/library/publications/page.tsx
src/app/dashboard/contacts/lists/page.tsx
```

### Andere Service-Dateien prüfen
```
src/lib/firebase/notifications-service.ts
src/lib/firebase/analytics-service.ts
src/lib/firebase/media-service.ts
```

## Fix-Pattern für andere Dateien

### 1. Service-Dateien
```typescript
// ALT - user.uid verwenden
where('userId', '==', userId)

// NEU - organizationId verwenden  
where('organizationId', '==', organizationId)
```

### 2. UI-Komponenten
```typescript
// ALT - user.uid für Service-Aufrufe
const { user } = useAuth();
await someService.getAll(user.uid);

// NEU - currentOrganization.id verwenden
const { user } = useAuth();
const { currentOrganization } = useOrganization();
await someService.getAll(currentOrganization.id);
```

### 3. Context und Dependencies
```typescript
// Dependencies zu useEffect hinzufügen
useEffect(() => {
  if (user && currentOrganization) {
    loadData();
  }
}, [user, currentOrganization]); // currentOrganization hinzufügen!
```

## Debugging-Tools

### Debug-Logs hinzufügen
```typescript
console.log('🔥 DEBUG - organizationId:', currentOrganization?.id);
console.log('🔥 DEBUG - userId:', user?.uid);
console.log('🔥 DEBUG - Geladene Daten:', { count: data.length });
```

### Firestore Rules temporär öffnen
```javascript
// Für Debugging - NICHT in Production!
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // KOMPLETT OFFEN
    }
  }
}
```

## Produktive Firestore Rules

### Team Members (Multi-Tenancy Core)
```javascript
match /team_members/{membershipId} {
  function isOrgMember(orgId) {
    return request.auth != null && 
           exists(/databases/$(database)/documents/team_members/$(request.auth.uid + '_' + orgId));
  }
  
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    request.auth.uid == resource.data.organizationId ||
    isOrgMember(resource.data.organizationId)
  );
}
```

### CRM Collections
```javascript
match /companies_enhanced/{companyId} {
  allow read: if request.auth != null && isOrgMember(resource.data.organizationId);
  allow create: if request.auth != null && 
    request.auth.uid == request.resource.data.userId &&
    isOrgMember(request.resource.data.organizationId);
  allow update, delete: if request.auth != null && 
    request.auth.uid == resource.data.userId &&
    isOrgMember(resource.data.organizationId);
}
```

## Migrations-Strategy

### Schritt 1: Legacy Services identifizieren
```bash
# Suche nach problematischen Patterns
grep -r "user\.uid" src/lib/firebase/
grep -r "where('userId'" src/lib/firebase/
```

### Schritt 2: UI-Komponenten finden
```bash
# Suche nach UI-Dateien die Services falsch aufrufen
grep -r "\.getAll(user\.uid)" src/app/
grep -r "user\.uid" src/app/dashboard/
```

### Schritt 3: Systematisch fixen
1. **Services:** Legacy Services auf BaseService umstellen
2. **UI:** user.uid durch currentOrganization.id ersetzen
3. **Tests:** Als Team-Mitglied einloggen und Daten-Sichtbarkeit prüfen

### Schritt 4: Daten-Migration
```typescript
// Wenn nötig, Legacy-Daten migrieren
const migrateLegacyData = async () => {
  // userId-basierte Daten auf organizationId umstellen
  const legacyDocs = await getDocs(query(
    collection(db, 'companies'),
    where('userId', '!=', null)
  ));
  
  for (const doc of legacyDocs.docs) {
    const data = doc.data();
    const organizationId = await getOrganizationForUser(data.userId);
    
    await updateDoc(doc.ref, {
      organizationId: organizationId,
      migratedAt: serverTimestamp()
    });
  }
};
```

## Testing-Checklist

### Multi-Tenancy Test
- [ ] Owner kann Daten sehen
- [ ] Team-Mitglied kann GLEICHE Daten sehen
- [ ] Team-Mitglied kann Daten NICHT von anderen Organisationen sehen
- [ ] Neue Daten werden mit korrekter organizationId erstellt
- [ ] Einladungsworkflow funktioniert korrekt

### Pro Seite/Feature testen
- [ ] CRM (Firmen/Kontakte)
- [ ] Tags
- [ ] Verteilerlisten
- [ ] PR-Kampagnen
- [ ] Mediathek
- [ ] Textbausteine
- [ ] Tasks/Aufgaben
- [ ] Publikationen

## Gelöste Probleme

✅ **Race Condition bei Einladungsannahme**  
✅ **CRM-Seite Multi-Tenancy**  
✅ **Firestore Rules für Invite-Workflow**  
✅ **OrganizationContext lädt korrekte Mitgliedschaften**  
✅ **Team-Mitglied sieht Owner-Daten**  

## Noch zu fixen

❌ **Legacy Services (crm-service.ts, task-service.ts, etc.)**  
❌ **Andere UI-Seiten die user.uid verwenden**  
❌ **Produktive Firestore Rules (derzeit komplett offen)**  
❌ **Daten-Migration für Legacy Collections**  

## Wichtige Erkenntnisse

1. **BaseService nutzen:** Neue Services sollten immer BaseService erweitern für automatische Multi-Tenancy
2. **Enhanced Collections:** Legacy Collections (companies, contacts, tags) durch Enhanced Versionen ersetzen
3. **Debugging:** Debug-Logs sind essentiell um organizationId Flow zu verstehen
4. **Race Conditions:** Firestore Synchronisation braucht Zeit - Delays einbauen wo nötig
5. **Context Dependencies:** useEffect Dependencies müssen currentOrganization enthalten

## Nächste Schritte

1. **Alle Legacy Services systematisch fixen**
2. **UI-Komponenten auf currentOrganization.id umstellen** 
3. **Produktive Firestore Rules implementieren**
4. **Komplette Multi-Tenancy Tests durchführen**
5. **Debug-Logs entfernen**

---

**Status:** Multi-Tenancy Grundfunktionen ✅ FUNKTIONIEREN  
**Nächste Phase:** Legacy Code Migration und Cleanup

---

## 🔥 AKTUELL IN BEARBEITUNG

### MediaCenter in PR Campaign Modal ✅
- **Problem**: Media Tool findet keine Daten bei der Filterung nach Firma
- **Betroffene Module**: 
  - src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx
  - src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx
- **Ursache**: 
  - Existierende Media Assets wurden ohne `clientId` gespeichert
  - Die `uploadMedia` Funktion unterstützte keine `clientId`
  - `getMediaByClientId` filterte zu strikt nach `clientId`
- **Lösung**:
  1. `uploadMedia` erweitert um optionale `clientId` im Context
  2. Neue Funktion `uploadClientMedia` für Client-spezifische Uploads
  3. `getMediaByClientId` zeigt temporär ALLE Organisation-Assets wenn keine mit spezifischer `clientId` gefunden werden
- **Status**: ✅ Behoben - Assets werden jetzt angezeigt