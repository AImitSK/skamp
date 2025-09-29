# Reference-System: Intelligente Verweise statt Kopien
## Wie Kunden Premium-Journalisten über Verweise nutzen

---

## 🔄 **COMPLETE WORKFLOW**

### **Schritt 1: Discovery in /library/editors/**
```typescript
// Kunde browst Premium-Journalisten
const globalJournalists = query(contacts_enhanced,
  where('isGlobal', '==', true),
  where('mediaProfile.isJournalist', '==', true)
);
// ✅ Sieht SuperAdmin-erstellte Journalisten
// ❌ Diese sind NICHT in seinem CRM sichtbar
```

### **Schritt 2: Import-Dialog**
```typescript
// Kunde wählt Journalisten aus und klickt "Importieren"
const selectedJournalist = globalJournalists[0];

// Import-Dialog mit 3 Schritten:
// - Preview: Zeigt Journalist-Daten
// - Relations: Company + Publications werden automatisch mit importiert
// - Confirm: Import bestätigen
```

### **Schritt 3: Reference-Import (Nur Verweis!)**
```typescript
// Import-Service erstellt NUR VERWEISE, keine Kopien!

const importReference = async (globalJournalistId, customerOrgId) => {
  // Erstelle nur einen schlanken Verweis
  const reference = await referencesService.create({
    id: generateId(),
    organizationId: customerOrgId,           // ← Gehört zum Kunden
    globalJournalistId: globalJournalistId, // ← Verweis auf Original
    type: 'journalist-reference',
    addedAt: new Date(),
    addedBy: currentUser.id,
    localNotes: '',                         // ← Lokale Anmerkungen möglich
    localTags: [],                          // ← Lokale Tags möglich
    isActive: true
  });

  // KEINE Company/Publication-Kopien nötig!
  // Relations bleiben bei den originalen globalen Daten

  return reference;
};
```

### **Schritt 4: Dynamic Loading im Kunden-CRM**
```typescript
// CRM lädt eigene Kontakte + referenzierte Journalisten:
const loadCustomerContacts = async (orgId) => {
  // 1. Eigene lokale Kontakte
  const localContacts = await query(contacts_enhanced,
    where('organizationId', '==', orgId)
  );

  // 2. References auf globale Journalisten
  const references = await query(journalist_references,
    where('organizationId', '==', orgId),
    where('isActive', '==', true)
  );

  // 3. Resolve References zu Live-Daten
  const referencedJournalists = await Promise.all(
    references.map(async ref => {
      const globalJournalist = await getGlobalJournalist(ref.globalJournalistId);
      return {
        ...globalJournalist,
        _isReference: true,              // ← Markierung
        _referenceId: ref.id,
        _localMeta: {
          notes: ref.localNotes,
          tags: ref.localTags,
          addedAt: ref.addedAt
        }
      };
    })
  );

  return [...localContacts, ...referencedJournalists];
};
// ✅ Referenzierte Journalisten erscheinen in CRM
// ✅ Immer aktuelle Daten (Live vom SuperAdmin)
// ❌ Read-only (nur lokale Notizen editierbar)
```

---

## 🎯 **REFERENCE-SYSTEM: Single Source of Truth**

### **GLOBALE DATEN (Bleiben unverändert):**
```typescript
const globalJournalist = {
  id: "global-123",
  organizationId: "superadmin-org",        // ← SuperAdmin Daten
  isGlobal: true,                          // ← Global verfügbar
  displayName: "Max Mustermann",
  companyId: "global-company-456",         // ← SuperAdmin Company
  mediaProfile: {
    publicationIds: ["global-pub-789"]     // ← SuperAdmin Publications
  }
  // ← BLEIBT ORIGINAL! Keine Kopie!
}
```

### **KUNDEN-REFERENCE (Nur schlanker Verweis):**
```typescript
const journalistReference = {
  id: "ref-local-999",                     // ← Reference ID
  organizationId: "customer-org-abc",     // ← Gehört zum Kunden
  globalJournalistId: "global-123",       // ← Verweis auf Original
  type: "journalist-reference",
  addedAt: "2024-09-29T10:00:00Z",
  localNotes: "Für PR-Kampagne XYZ",      // ← Einzige lokale Daten
  localTags: ["wichtig", "tech"],
  isActive: true
}

// UI kombiniert beide:
const displayJournalist = {
  ...globalJournalist,                     // ← Live-Daten vom SuperAdmin
  _isReference: true,
  _localMeta: journalistReference          // ← Lokale Meta-Infos
}
```

---

## 🔄 **AUTOMATIC SYNC (Kein manueller Sync nötig!)**

### **Immer aktuelle Daten:**
```typescript
// Jeder CRM-Aufruf lädt live Daten:
const getReferencedJournalist = async (referenceId) => {
  const reference = await getReference(referenceId);
  const globalJournalist = await getGlobalJournalist(reference.globalJournalistId);

  return {
    ...globalJournalist,        // ← IMMER aktuell!
    _isReference: true,
    _localMeta: reference
  };
};

// Kein Sync-Problem mehr - Daten sind automatisch aktuell!
```

### **Handling von gelöschten globalen Daten:**
```typescript
const getReferencedJournalist = async (referenceId) => {
  const reference = await getReference(referenceId);

  try {
    const globalJournalist = await getGlobalJournalist(reference.globalJournalistId);
    return { ...globalJournalist, _isReference: true, _localMeta: reference };
  } catch (error) {
    // Globaler Journalist wurde gelöscht/deaktiviert
    return {
      _isReference: true,
      _isInvalid: true,
      _localMeta: reference,
      displayName: "Journalist nicht mehr verfügbar",
      // User kann Reference entfernen
    };
  }
};
```

---

## 🎨 **UI-FLOW FÜR KUNDEN**

### **1. Discovery Phase:**
```
/library/editors/
→ Browse Premium-Journalisten
→ Filter & Search
→ Detail-Modal ansehen
```

### **2. Import Phase:**
```
"Importieren" Button klicken
→ Import-Dialog (3 Schritte)
→ Relations automatisch mit übernehmen
→ Import bestätigen
```

### **3. CRM Integration:**
```
→ Journalist erscheint in /contacts/crm/contacts/ (mit 🌐 Badge)
→ Read-only (außer lokale Notizen/Tags)
→ Immer aktuelle Daten
→ Company & Publications bleiben global (keine Duplikation)
```

### **4. Reference Management:**
```
→ "Aus CRM entfernen" (entfernt nur Reference, nicht globale Daten)
→ Lokale Notizen und Tags editierbar
→ Automatic Updates (keine manuellen Syncs)
```

---

## 🔐 **PRIVACY & SECURITY**

### **Daten-Isolation:**
- ✅ Globale Daten nur in Premium-Library sichtbar
- ✅ Nach Import: Vollständig lokale Kopien
- ✅ Keine Live-Verbindung zu SuperAdmin-Daten
- ❌ Kein Datenaustausch zwischen Kunden

### **DSGVO-Compliance:**
- ✅ Import ist explizite Nutzer-Aktion
- ✅ Lokale Kopien gehören vollständig dem Kunden
- ✅ Löschung/Änderung jederzeit möglich
- ✅ Transparenz über Datenherkunft

### **Firestore Security:**
```javascript
// Import-Operation nur für eigene Organisation
allow create: if
  request.auth.token.organizationId == resource.data.organizationId &&
  resource.data.sourceType == "global-import";
```

---

## 📊 **BUSINESS LOGIC**

### **Premium-Features:**
- ✅ Subscription erforderlich für Import
- ✅ Usage-Tracking pro Import
- ✅ Quota-Limits je nach Plan
- ✅ Premium-Only Zugang zu /library/editors/

### **Value Proposition:**
- 🎯 Hochwertige, kuratierte Journalisten-Daten
- 🎯 Komplett mit Relations (Company + Publications)
- 🎯 Sofort CRM-ready nach Import
- 🎯 Optional: Sync für Updates

---

## ✅ **FAZIT**

**Perfect Balance:**
- **Privacy**: Strikte Datentrennung zwischen global und lokal
- **Usability**: Einfacher 3-Schritt Import-Prozess
- **Value**: Komplette Relations werden automatisch mit übernommen
- **Control**: Volle lokale Kontrolle nach Import

**Globale Daten bleiben in der Premium-Library, bis der Kunde sie bewusst in sein CRM importiert!**

---

*Erstellt: 29.09.2024*
*Workflow: Global Discovery → Local Import → CRM Integration*