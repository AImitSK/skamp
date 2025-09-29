# Reference-System Architektur
## Intelligente Verweise statt Datenduplikation

---

## 🎯 **KERN-PRINZIP**

**Statt Kopien → Intelligente Verweise (References)**

- ✅ **Single Source of Truth** - Globale Daten bleiben original
- ✅ **Immer aktuell** - Keine Sync-Probleme
- ✅ **Speicher-effizient** - Keine Duplikation
- ✅ **Kontrolliert** - Nur lokale Meta-Daten editierbar

---

## 🏗️ **DATENBANK-STRUKTUR**

### **Globale Journalisten (Unverändert):**
```
/contacts_enhanced/ (SuperAdmin Org)
├── globalJournalist_123
│   ├── organizationId: "superadmin-org"
│   ├── isGlobal: true
│   ├── displayName: "Max Mustermann"
│   ├── companyId: "global-company-456"
│   └── mediaProfile: { publicationIds: [...] }
```

### **Neue Reference Collection:**
```
/organizations/{customerId}/journalist_references/
├── reference_999
│   ├── organizationId: "customer-org-abc"
│   ├── globalJournalistId: "globalJournalist_123"  ← Verweis!
│   ├── type: "journalist-reference"
│   ├── addedAt: timestamp
│   ├── addedBy: userId
│   ├── localNotes: "Wichtig für Tech-PR"          ← Einzige lokale Daten
│   ├── localTags: ["tech", "wichtig"]
│   └── isActive: true
```

### **UI kombiniert beide dynamisch:**
```typescript
const displayJournalist = {
  // Globale Daten (Live vom SuperAdmin):
  id: "globalJournalist_123",
  displayName: "Max Mustermann",
  companyId: "global-company-456",

  // Reference-Meta:
  _isReference: true,
  _referenceId: "reference_999",
  _localMeta: {
    notes: "Wichtig für Tech-PR",
    tags: ["tech", "wichtig"],
    addedAt: "2024-09-29"
  }
}
```

---

## 🔄 **SERVICE-LAYER IMPLEMENTIERUNG**

### **Reference Service:**
```typescript
interface JournalistReferenceService {
  // Reference erstellen (Import)
  createReference(globalJournalistId: string, orgId: string): Promise<Reference>;

  // References laden
  getReferences(orgId: string): Promise<Reference[]>;

  // Reference entfernen
  removeReference(referenceId: string): Promise<void>;

  // Lokale Meta-Daten editieren
  updateLocalMeta(referenceId: string, meta: LocalMeta): Promise<void>;
}
```

### **Combined Contact Service:**
```typescript
interface CombinedContactService {
  // Lädt lokale + referenzierte Kontakte
  getAllContacts(orgId: string): Promise<(LocalContact | ReferencedJournalist)[]>;

  // Resolve einzelne Reference
  resolveReference(referenceId: string): Promise<ReferencedJournalist | null>;

  // Batch-Resolve für Performance
  resolveReferences(referenceIds: string[]): Promise<ReferencedJournalist[]>;
}

// Implementation:
const getAllContacts = async (orgId: string) => {
  // 1. Lokale Kontakte
  const localContacts = await getLocalContacts(orgId);

  // 2. References
  const references = await getReferencesByOrgId(orgId);

  // 3. Batch-resolve globale Daten
  const globalIds = references.map(ref => ref.globalJournalistId);
  const globalJournalists = await getGlobalJournalists(globalIds);

  // 4. Kombiniere zu ReferencedJournalists
  const referencedJournalists = references.map(ref => {
    const global = globalJournalists.find(g => g.id === ref.globalJournalistId);
    return global ? {
      ...global,
      _isReference: true,
      _referenceId: ref.id,
      _localMeta: ref
    } : null;
  }).filter(Boolean);

  return [...localContacts, ...referencedJournalists];
};
```

---

## 🎨 **UI-KOMPONENTEN**

### **ContactCard mit Reference-Support:**
```typescript
interface ContactCardProps {
  contact: LocalContact | ReferencedJournalist;
}

const ContactCard = ({ contact }) => {
  const isReference = contact._isReference;

  return (
    <div className="contact-card">
      {/* Header mit Badge */}
      <div className="flex items-center justify-between">
        <h3>{contact.displayName}</h3>
        {isReference && (
          <Badge color="blue">🌐 Global</Badge>
        )}
      </div>

      {/* Read-only Daten */}
      <div className="contact-details">
        <p>{contact.position}</p>
        <p>{contact.companyName}</p>
        {/* Alle globalen Daten sind read-only */}
      </div>

      {/* Lokale Notizen (editierbar) */}
      {isReference && (
        <div className="local-meta">
          <LocalNotesEditor
            notes={contact._localMeta.localNotes}
            onUpdate={(notes) => updateLocalMeta(contact._referenceId, { notes })}
          />
        </div>
      )}

      {/* Actions */}
      <div className="actions">
        {isReference ? (
          <>
            <Button onClick={() => removeReference(contact._referenceId)}>
              Aus CRM entfernen
            </Button>
            <Button variant="ghost" disabled>
              Bearbeiten nicht möglich (Global)
            </Button>
          </>
        ) : (
          <Button onClick={() => editContact(contact.id)}>
            Bearbeiten
          </Button>
        )}
      </div>
    </div>
  );
};
```

### **Import-Dialog vereinfacht:**
```typescript
const ImportDialog = ({ globalJournalist, onImport }) => {
  return (
    <Dialog>
      <DialogTitle>Journalist zu CRM hinzufügen</DialogTitle>
      <DialogBody>
        <div className="import-preview">
          <p>🌐 <strong>{globalJournalist.displayName}</strong></p>
          <p>wird als Verweis zu Ihrem CRM hinzugefügt.</p>

          <div className="info-box">
            <h4>Was passiert:</h4>
            <ul>
              <li>✅ Journalist erscheint in Ihrer Kontakte-Liste</li>
              <li>✅ Daten bleiben immer aktuell</li>
              <li>✅ Sie können lokale Notizen hinzufügen</li>
              <li>❌ Globale Daten können nicht bearbeitet werden</li>
            </ul>
          </div>

          <LocalNotesInput
            placeholder="Lokale Notizen (optional)..."
            onChange={setLocalNotes}
          />
        </div>
      </DialogBody>
      <DialogActions>
        <Button onClick={() => onImport(globalJournalist.id, localNotes)}>
          Als Verweis hinzufügen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## ⚡ **PERFORMANCE-OPTIMIERUNGEN**

### **1. Batch-Loading:**
```typescript
// Nicht: Einzelne Requests pro Reference
// ❌ Schlecht:
references.forEach(async ref => {
  const global = await getGlobalJournalist(ref.globalJournalistId);
});

// ✅ Besser: Batch-Request
const globalIds = references.map(ref => ref.globalJournalistId);
const globalJournalists = await getGlobalJournalists(globalIds);
```

### **2. Caching:**
```typescript
// Cache globale Daten für Performance
const globalJournalistCache = new Map();

const getGlobalJournalistCached = async (id: string) => {
  if (globalJournalistCache.has(id)) {
    return globalJournalistCache.get(id);
  }

  const journalist = await getGlobalJournalist(id);
  globalJournalistCache.set(id, journalist);
  return journalist;
};
```

### **3. Lazy Loading:**
```typescript
// Lade References sofort, resolve global Daten on-demand
const ContactsList = () => {
  const [references] = useState([]); // Sofort geladen
  const [resolvedJournalists, setResolved] = useState(new Map());

  const resolveOnDemand = async (referenceId) => {
    if (!resolvedJournalists.has(referenceId)) {
      const resolved = await resolveReference(referenceId);
      setResolved(prev => prev.set(referenceId, resolved));
    }
  };

  return references.map(ref =>
    <ContactCardLazy
      reference={ref}
      onExpand={() => resolveOnDemand(ref.id)}
    />
  );
};
```

---

## 🔐 **SECURITY & PERMISSIONS**

### **Firestore Security Rules:**
```javascript
// Reference Collection Rules
match /organizations/{orgId}/journalist_references/{refId} {
  // Nur eigene References
  allow read, write: if request.auth.token.organizationId == orgId;
}

// Global Journalists (SuperAdmin Collection)
match /contacts_enhanced/{globalId} {
  // Globale Daten: read-only für alle, write nur für SuperAdmin
  allow read: if resource.data.isGlobal == true;
  allow write: if request.auth.token.organizationId == "superadmin-org";
}
```

### **API-Level Security:**
```typescript
// Nur References der eigenen Organisation
const getReferences = async (userId: string) => {
  const userOrg = await getUserOrganization(userId);
  return query(journalist_references,
    where('organizationId', '==', userOrg.id)
  );
};

// Globale Daten nur lesen, nie schreiben
const resolveReference = async (referenceId: string, userId: string) => {
  const reference = await getReference(referenceId);

  // Security: Gehört Reference zum User?
  const userOrg = await getUserOrganization(userId);
  if (reference.organizationId !== userOrg.id) {
    throw new Error('Unauthorized');
  }

  // Globale Daten lesen (read-only)
  return await getGlobalJournalist(reference.globalJournalistId);
};
```

---

## 📊 **BUSINESS LOGIC**

### **Subscription & Limits:**
```typescript
interface SubscriptionLimits {
  maxReferences: number;        // Maximale Anzahl References
  canAddReferences: boolean;    // Kann neue References hinzufügen
}

const checkReferenceLimit = async (orgId: string) => {
  const subscription = await getSubscription(orgId);
  const currentRefs = await countReferences(orgId);

  return {
    canAdd: currentRefs < subscription.maxReferences,
    remaining: subscription.maxReferences - currentRefs
  };
};
```

### **Usage Tracking:**
```typescript
// Track Reference-Usage für Analytics
const trackReferenceUsage = async (referenceId: string, action: string) => {
  await usageService.track({
    type: 'journalist-reference',
    action: action, // 'created', 'viewed', 'email-sent', etc.
    referenceId: referenceId,
    timestamp: new Date()
  });
};
```

---

## ✅ **VORTEILE ZUSAMMENFASSUNG**

### **Für Entwickler:**
- 🎯 Einfachere Architektur (keine Sync-Logik)
- 🚀 Bessere Performance (keine Duplikate)
- 🔒 Klarere Security (read-only global)
- 🐛 Weniger Bugs (Single Source of Truth)

### **Für Kunden:**
- ✨ Immer aktuelle Daten
- 💾 Kein Speicher verschwendet
- ⚡ Schnellere Ladezeiten
- 🎛️ Lokale Kontrolle über Notizen/Tags

### **Für SuperAdmin:**
- 📈 Änderungen sind sofort bei allen Kunden sichtbar
- 🎨 Datenqualität bleibt hoch
- 📊 Bessere Analytics über Nutzung

---

**Das Reference-System ist die perfekte Balance zwischen globaler Datenqualität und lokaler Kontrolle!**

---

*Erstellt: 29.09.2024*
*Architektur: Reference-Based Global System*