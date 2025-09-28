# SuperAdmin System - Global Content Management
## Elegante Integration in bestehende CRM-Struktur

---

## 🎯 **Core Concept: Auto-Global für SuperAdmin**

### **Basis-Regel**
```typescript
if (user.email === 'info@sk-online-marketing.de') {
  // ALLES was SuperAdmin erstellt/bearbeitet = automatisch global
  autoGlobalMode = true;
}
```

### **Integration Points**
1. **CRM-Personen** → `/dashboard/library/editors/` (Journalisten-DB)
2. **CRM-Firmen** → Media-Datenbank (zukünftig)
3. **Bibliothek-Publikationen** → Global Publications (zukünftig)

---

## 🏗️ **Technische Umsetzung**

### **1. Auto-Global Hook**
```typescript
// src/lib/hooks/useAutoGlobal.ts
export function useAutoGlobal() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const isSuperAdmin = user?.email === 'info@sk-online-marketing.de';

  return {
    isSuperAdmin,
    isGlobalOrganization: currentOrganization?.id === user?.uid, // SuperAdmin's eigene Org
    defaultGlobalState: isSuperAdmin,
    showGlobalBanner: isSuperAdmin
  };
}
```

### **2. Save-Interceptor für alle CRM-Bereiche**
```typescript
// src/lib/utils/global-interceptor.ts
export const interceptSave = async (data: any, context: 'contact' | 'company' | 'publication') => {
  const { isSuperAdmin } = useAutoGlobal();

  if (isSuperAdmin) {
    return {
      ...data,
      isGlobal: true,
      globalMetadata: {
        addedBy: user.email,
        addedAt: new Date(),
        autoPromoted: true,
        context: context,
        version: 1
      }
    };
  }

  return data;
};
```

### **3. Draft-Modus für Sicherheit**
```typescript
// src/components/super-admin/GlobalModeToggle.tsx
export function GlobalModeToggle() {
  const [liveMode, setLiveMode] = useState(false);

  return (
    <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-orange-800">🚨 GLOBAL-MODUS AKTIV</h3>
          <p className="text-sm text-orange-600">
            Alle Änderungen werden zur Premium-Datenbank hinzugefügt
          </p>
        </div>

        <Toggle
          checked={liveMode}
          onChange={setLiveMode}
          label={liveMode ? "LIVE" : "ENTWURF"}
          color={liveMode ? "red" : "yellow"}
        />
      </div>
    </div>
  );
}
```

---

## 👥 **Team-Management: SuperAdmin Organisation**

### **Konzept: Global Team**
Der SuperAdmin kann Team-Mitglieder in seine Organisation einladen, die dann auch global arbeiten können.

#### **Organisationsstruktur**
```
SuperAdmin Organisation (info@sk-online-marketing.de)
├── Owner: info@sk-online-marketing.de (SuperAdmin)
├── Admin: team-member-1@sk-online-marketing.de
├── Admin: team-member-2@sk-online-marketing.de
└── Member: praktikant@sk-online-marketing.de
```

#### **Berechtigungen in Global-Organisation**
```typescript
// src/lib/permissions/global-permissions.ts
export function getGlobalPermissions(user: User, org: Organization) {
  const isSuperAdmin = user.email === 'info@sk-online-marketing.de';
  const isGlobalOrg = org.id === getSuperAdminUserId();
  const isGlobalTeamMember = isGlobalOrg && ['owner', 'admin'].includes(org.role);

  return {
    canCreateGlobal: isSuperAdmin || isGlobalTeamMember,
    canEditGlobal: isSuperAdmin || isGlobalTeamMember,
    canDeleteGlobal: isSuperAdmin, // Nur SuperAdmin kann löschen
    canInviteToGlobal: isSuperAdmin,
    canAccessMatching: isSuperAdmin || isGlobalTeamMember,
    canBulkImport: isSuperAdmin || isGlobalTeamMember
  };
}
```

### **Team-Workflow**
1. **SuperAdmin** lädt Team-Mitglieder in seine Organisation ein
2. **Team-Mitglieder** arbeiten in der SuperAdmin-Organisation
3. **Alles was sie erstellen** = automatisch `isGlobal: true`
4. **Rollenbasierte Einschränkungen** schützen kritische Funktionen

---

## 🔄 **Workflow-Integration**

### **1. Journalist erstellen (CRM-Personen)**
```
SuperAdmin/Team geht zu: /dashboard/contacts/crm/contacts/
1. Klickt "Neuer Kontakt"
2. Wählt Typ: "Journalist"
3. Füllt Formular aus (normales CRM-Interface)
4. Save-Interceptor setzt automatisch:
   - isGlobal: true
   - globalMetadata: {...}
5. Kontakt erscheint sofort in /dashboard/library/editors/
6. Alle Premium-Kunden können ihn importieren
```

### **2. Bulk-Import von Journalisten**
```
SuperAdmin/Team geht zu: /dashboard/contacts/crm/contacts/
1. Klickt "Import" (bestehende Funktion)
2. Lädt CSV/Excel hoch
3. System processed Import normal
4. Save-Interceptor macht alle Kontakte global
5. Batch-Confirmation: "47 Kontakte als Premium veröffentlichen?"
6. Nach Bestätigung: Live in Premium-DB
```

### **3. API-Integration**
```
SuperAdmin/Team nutzt bestehende API:
POST /api/contacts/create
{
  "name": "Max Mustermann",
  "type": "journalist",
  "medium": "Süddeutsche Zeitung"
}

→ Save-Interceptor erkennt SuperAdmin
→ Setzt automatisch isGlobal: true
→ Journalist ist sofort global verfügbar
```

---

## 🔍 **Separater Bereich: Duplicate Matching**

### **Einziger neuer Admin-Bereich**
```
/super-admin/
├── matching/
│   ├── duplicates/page.tsx      # Duplikat-Kandidaten
│   ├── merge/[id]/page.tsx      # Side-by-Side Vergleich
│   ├── candidates/page.tsx      # Neue Premium-Kandidaten
│   └── analytics/page.tsx       # Matching-Statistiken
│
├── staging/ (Optional)
│   ├── drafts/page.tsx          # Entwürfe vor Go-Live
│   └── batch-publish/page.tsx   # Batch-Veröffentlichung
│
└── settings/
    └── matching-rules/page.tsx  # KI-Parameter konfigurieren
```

### **Duplicate Review Workflow**
```
1. System findet "Max Mustermann" in 3 verschiedenen Kunden-CRMs
2. KI erstellt Duplikat-Kandidat mit 92% Match-Score
3. SuperAdmin/Team geht zu /super-admin/matching/duplicates/
4. Sieht Side-by-Side Vergleich aller Varianten
5. Merged beste Daten zusammen
6. Klickt "Als Premium hinzufügen"
7. Merged Contact wird in SuperAdmin-CRM erstellt mit isGlobal=true
8. Erscheint sofort in Premium-DB
```

---

## 🔒 **Sicherheits-Features**

### **1. Live-Modus Toggle**
```typescript
// Verhindert versehentliche Live-Publikation
const [liveMode, setLiveMode] = useState(false);

// UI zeigt deutlich den Status
{liveMode ? (
  <Badge color="red">🔴 LIVE - Sofort global</Badge>
) : (
  <Badge color="yellow">📝 ENTWURF - Review erforderlich</Badge>
)}
```

### **2. Batch-Confirmation**
```typescript
// Nach Bulk-Aktionen
<ConfirmDialog>
  <AlertTriangleIcon className="h-6 w-6 text-orange-500" />

  <h3>47 neue Kontakte erstellt</h3>
  <p>Diese werden sofort für alle Premium-Kunden sichtbar.</p>

  <div className="flex gap-2">
    <Button variant="outline">Als Entwurf speichern</Button>
    <Button variant="danger">Sofort veröffentlichen</Button>
  </div>
</ConfirmDialog>
```

### **3. Audit-Log**
```typescript
// Tracking aller Global-Änderungen
/globalAuditLog/{actionId}
├── action: 'create' | 'update' | 'delete' | 'publish'
├── entityType: 'contact' | 'company' | 'publication'
├── entityId: string
├── performedBy: string (email)
├── timestamp: Date
├── changes: object
├── isLive: boolean
└── approvedBy?: string
```

---

## 📊 **Datenbank-Struktur**

### **Erweiterte Kontakt-Struktur**
```typescript
/organizations/{orgId}/contacts/{contactId}
├── [standard CRM fields...]
├── isGlobal: boolean                    # Auto-gesetzt für SuperAdmin
├── globalMetadata?: {
│   ├── addedBy: string                 # SuperAdmin email
│   ├── addedAt: timestamp
│   ├── autoPromoted: boolean           # true für Auto-Global
│   ├── context: 'contact' | 'company' | 'publication'
│   ├── version: number
│   ├── isDraft: boolean                # false = live
│   ├── reviewedBy?: string
│   ├── publishedAt?: timestamp
│   └── qualityScore?: number
│}
├── sourceType?: 'manual' | 'import' | 'api' | 'merged'
└── mergedFrom?: string[]               # IDs der zusammengeführten Kontakte
```

### **Query-Optimierung**
```typescript
// Premium-DB View (Library/Editors)
const globalJournalists = query(
  collectionGroup(db, 'contacts'),
  where('isGlobal', '==', true),
  where('globalMetadata.isDraft', '==', false),
  where('type', '==', 'journalist')
);

// SuperAdmin kann auch Entwürfe sehen
const allGlobalContent = query(
  collectionGroup(db, 'contacts'),
  where('isGlobal', '==', true)
  // kein isDraft Filter
);
```

---

## ✅ **Vorteile der Lösung**

### **1. Maximale Code-Wiederverwendung**
- ✅ Nutzt bestehende CRM-Formulare
- ✅ Nutzt bestehende Import-Funktionen
- ✅ Nutzt bestehende API-Endpoints
- ✅ Nutzt bestehende Validierung
- ✅ Nutzt bestehende Berechtigungsstrukturen

### **2. Team-Skalierung**
- ✅ SuperAdmin kann Team einladen
- ✅ Team arbeitet in gewohnter Umgebung
- ✅ Rollenbasierte Berechtigungen
- ✅ Gemeinsame Organisation für Collaboration

### **3. Intuitive UX**
- ✅ SuperAdmin arbeitet in bekannten Interfaces
- ✅ Normale User merken nichts von Global-Logik
- ✅ Klare Trennung durch Banner/Hinweise
- ✅ Draft-Modus verhindert Fehler

### **4. Technische Eleganz**
- ✅ Ein Save-Interceptor für alle Bereiche
- ✅ Minimale Code-Änderungen
- ✅ Keine Duplikation von Funktionalität
- ✅ Zukunftssicher für weitere Global-Inhalte

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Auto-Global Foundation** (2 Tage)
- [ ] `useAutoGlobal` Hook implementieren
- [ ] Save-Interceptor für Kontakte
- [ ] Global-Banner in CRM-Bereichen
- [ ] Team-Berechtigungen erweitern

### **Phase 2: Safety Features** (1 Tag)
- [ ] Live-Modus Toggle
- [ ] Batch-Confirmation Dialogs
- [ ] Audit-Logging System

### **Phase 3: Duplicate Matching** (3 Tage)
- [ ] `/super-admin/matching/` Bereich
- [ ] KI-Duplikat-Detection
- [ ] Merge-Interface
- [ ] Analytics Dashboard

### **Phase 4: Team Collaboration** (1 Tag)
- [ ] Team-Einladungen testen
- [ ] Berechtigungen validieren
- [ ] Workflow-Dokumentation

**Total: ~1 Woche für komplettes System** 🎯

---

## 💡 **Bonus: Zukünftige Erweiterungen**

Das System ist designed für weitere Global-Inhalte:

### **Media-Datenbank** (CRM-Firmen → Global)
- SuperAdmin erstellt Medien-Unternehmen
- Werden automatisch global verfügbar
- Kunden können aus Media-DB wählen

### **Template-Library** (Publikationen → Global)
- SuperAdmin erstellt PR-Templates
- Werden automatisch global verfügbar
- Premium-Feature für Template-Access

### **Content-Hub** (Projekte → Global)
- SuperAdmin teilt Best-Practice Projekte
- Case-Studies werden global verfügbar
- Learning-Platform für Kunden

**Das Auto-Global System skaliert für alle zukünftigen Premium-Inhalte!** 🚀