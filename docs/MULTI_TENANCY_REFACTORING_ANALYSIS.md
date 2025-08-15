# 📊 Multi-Tenancy Refactoring Analyse

**Status:** Analyse Phase  
**Datum:** 15.08.2025  
**Scope:** Legacy User ID vs. Organization ID Struktur

## 🔍 **Problem-Übersicht**

Das aktuelle System nutzt zwei verschiedene ID-Strukturen parallel:

### **Legacy System (User ID basiert):**
- **Storage Path:** `organizations/{userId}/media/`
- **Firestore Path:** `companies/{userId}/`
- **Verwendung:** Media Library, Key Visuals, Assets
- **ID Format:** `XXHOADV6LoVQHRuebjq43u4D0ci2` (User UID)

### **Neues System (Organization ID basiert):**
- **Firestore Path:** `organizations/{organizationId}/companies/`
- **Team-Struktur:** Echte Multi-Tenancy mit Team-Mitgliedschaften
- **ID Format:** `wVa3cJ7YhYUCQcbwZLLVB6w5Xs23` (Organization UID)

## 📈 **Scope-Analyse**

**Betroffene Dateien:** 458+ Referenzen  
**Kritische Services:** 23+ Core-Services

### **Hauptbetroffene Bereiche:**

1. **Media Library System** 🎨
   - AssetSelectorModal, MediaService, UploadService
   - Key Visual Integration
   - Storage Rules und Paths

2. **CRM System** 👥
   - Companies, Contacts, Lists
   - Campaign-Zuordnungen

3. **Campaign System** 📧
   - PR-Campaigns, E-Mail-Campaigns
   - Asset-Attachments, Key Visuals

4. **Authentication & Authorization** 🔐
   - User-Organization-Mappings
   - Permission-Systeme

## 🚨 **Risiko-Bewertung**

### **Hoch-Risiko Änderungen:**
- **Datenmigration:** Millionen von Assets und Dokumenten umziehen
- **Storage Rules:** Firebase Security Rules komplett überarbeiten  
- **API Breaking Changes:** Externe Integrationen betroffen

### **Mittel-Risiko Änderungen:**
- Service-Layer Refactoring
- Frontend-Komponenten Anpassungen
- Test-Suite Updates

### **Niedrig-Risiko Änderungen:**
- Neue Features bereits auf Organization ID
- Dokumentation Updates
- Legacy-Wrapper erstellen

## 📋 **Refactoring-Strategie**

### **Phase 1: Legacy-Wrapper (Sicher)**
```typescript
// Wrapper-Service für Organisation-ID Auflösung
class OrganizationResolver {
  static async resolveMediaOrganization(user: User): Promise<string> {
    // Für bestehende Systeme: Legacy User ID
    // Für neue Systeme: Organisation ID
    return user.uid; // Bis Migration abgeschlossen
  }
}
```

### **Phase 2: Dual-Path Support**
- Services unterstützen beide ID-Strukturen
- Graduelle Migration ohne Breaking Changes
- Feature-Flags für neue vs. alte Struktur

### **Phase 3: Migration & Cleanup**
- Daten-Migration mit Rollback-Plan
- Legacy-Code entfernen
- Performance-Optimierungen

## 🎯 **Empfohlenes Vorgehen**

### **Kurzfristig (2025):**
1. ✅ **Legacy-System beibehalten** für Stabilität
2. ✅ **Wrapper-Services** für neue Features
3. ✅ **Dokumentation** des aktuellen Zustands

### **Mittelfristig (2026):**
1. **Dual-Path Implementation** in kritischen Services
2. **Graduelle Migration** weniger kritischer Bereiche
3. **Extensive Testing** von Migration-Workflows

### **Langfristig (2027):**
1. **Vollständige Migration** zu Organization ID
2. **Legacy-Code Cleanup**
3. **Performance-Optimierungen**

## 🔧 **Technische Umsetzung**

### **Sofort verfügbar:**
```typescript
// Konfigurierbare Service-Abstraktion
interface OrganizationConfig {
  useNewStructure: boolean;
  migrationMode: 'legacy' | 'dual' | 'new';
}

class MediaLibraryService {
  async getAssets(orgConfig: OrganizationConfig) {
    if (orgConfig.useNewStructure) {
      return this.getAssetsFromNewStructure();
    }
    return this.getAssetsFromLegacyStructure();
  }
}
```

## 📊 **Impact Assessment**

### **Key Visual Feature:**
- ✅ **Funktioniert perfekt** mit Legacy-System
- ✅ **Keine Änderungen nötig** für Production
- ⚠️ **Zukünftige Migration** eingeplant

### **Benutzer-Impact:**
- ✅ **Keine Ausfallzeiten** bei Wrapper-Ansatz
- ✅ **Transparente Migration** möglich
- ✅ **Rollback-Fähigkeit** gegeben

## 🏁 **Fazit**

**Aktueller Zustand:** ✅ **Produktionstauglich**
- Legacy-System funktioniert zuverlässig
- Key Visual Feature vollständig kompatibel
- Keine dringenden Änderungen erforderlich

**Zukünftige Evolution:** 📈 **Strategisch geplant**
- Migration-Pfad definiert
- Risiken identifiziert und minimiert
- Graduelle Umsetzung ohne Breaking Changes

---

**Recommendation:** Legacy-System beibehalten für Stabilität. Migration als strategisches Projekt für 2026+ planen.