# SuperAdmin Components - Integration Guide

## 🎯 GlobalModeBanner Integration

### **Usage in CRM Pages**

Das `GlobalModeBanner` sollte in alle CRM-Bereiche integriert werden, wo SuperAdmin/Team Inhalte erstellen können.

```typescript
// Import am Anfang der Seite
import { GlobalModeBanner } from '@/components/super-admin/GlobalModeBanner';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';

export default function ContactsPage() {
  const { autoGlobalMode } = useAutoGlobal();
  const [liveMode, setLiveMode] = useState(false);

  return (
    <div>
      {/* Global Banner */}
      {autoGlobalMode && (
        <GlobalModeBanner
          context="contact"
          className="mb-6"
          onLiveModeChange={setLiveMode}
        />
      )}

      {/* Rest der Seite */}
      <div className="space-y-6">
        {/* Normale CRM-Inhalte */}
      </div>
    </div>
  );
}
```

### **Integration Points**

#### **1. Kontakte-CRM**
```
/dashboard/contacts/crm/contacts/
├── page.tsx                 # Kontakte-Liste
├── add/page.tsx             # Neuer Kontakt
└── [contactId]/page.tsx     # Kontakt bearbeiten
```

#### **2. Firmen-CRM**
```
/dashboard/contacts/crm/companies/
├── page.tsx                 # Firmen-Liste
├── add/page.tsx             # Neue Firma
└── [companyId]/page.tsx     # Firma bearbeiten
```

#### **3. Bibliothek**
```
/dashboard/library/
├── publications/            # Publikationen (zukünftig global)
└── editors/                 # Journalisten (bereits implementiert)
```

### **Save-Interceptor Integration**

In jedem Save-Handler den Interceptor verwenden:

```typescript
import { interceptSave } from '@/lib/utils/global-interceptor';

const handleSave = async (contactData) => {
  // Auto-Global Interceptor
  const finalData = interceptSave(contactData, 'contact', user, {
    liveMode: liveMode,
    sourceType: 'manual'
  });

  // Normal speichern
  await contactsService.save(finalData);
};
```

### **Context Types**

- `'contact'` - Für Journalisten/Personen
- `'company'` - Für Medien-Unternehmen
- `'publication'` - Für Templates/Inhalte

### **Team-Berechtigungen**

Das Banner passt sich automatisch an die Berechtigungen an:

- **SuperAdmin**: Vollzugriff + Team-Management
- **Global Team Admin**: Kann global erstellen, nicht löschen
- **Global Team Member**: Nur lesen (falls implementiert)