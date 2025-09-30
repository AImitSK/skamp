# 🎯 KONZEPT-KLARSTELLUNG: Journalisten-Datenbank

## **DAS ZIEL IN EINFACHEN WORTEN**

### **Phase 1: Reference-System (JETZT UMSETZEN)**

#### **Was ist das Reference-System?**
- **SuperAdmin pflegt Journalisten** → werden automatisch global
- **Kunden sehen diese in der Bibliothek** → können sie NICHT bearbeiten
- **Stern-Icon = Als Verweis importieren** → für Verteilerlisten nutzbar
- **Verweis = Immer aktuell** → SuperAdmin ändert, alle sehen es sofort

#### **Warum Verweise statt Kopien?**
- ✅ **Keine Duplikate** - Ein Journalist, eine Wahrheit
- ✅ **Immer aktuell** - Änderungen sofort bei allen
- ✅ **Spart Speicher** - Keine Datenverdopplung
- ✅ **Qualität gesichert** - Nur SuperAdmin kann ändern

---

## **WER MACHT WAS?**

### **SuperAdmin & Team:**
1. Pflegen Journalisten im normalen CRM ein
2. Pflegen Publikationen in der Bibliothek
3. Alles wird automatisch global (isGlobal: true)
4. Können alles bearbeiten und verbessern

### **Normale Organisationen:**
1. Sehen globale Journalisten unter `/library/editors/`
2. Können diese NICHT bearbeiten (read-only)
3. Können mit Stern-Icon einen "Verweis" importieren
4. Können dann:
   - Für Verteilerlisten nutzen
   - Lokale Notizen hinzufügen
   - Mit Tags versehen
   - In Kampagnen verwenden

---

## **TECHNISCHE UMSETZUNG**

### **Datenstruktur:**

```
SuperAdmin-Org:
/contacts_enhanced/
  └── journalist_123 (isGlobal: true)
      ├── Name, Email, Telefon
      ├── Medienhaus, Position
      └── Publikationen, Themen

Kunde-Org:
/organizations/{kundeId}/journalist_references/
  └── reference_456
      ├── globalJournalistId: "journalist_123"  ← VERWEIS!
      ├── localNotes: "Wichtig für Tech-PR"
      └── localTags: ["technik", "wichtig"]
```

### **So funktioniert's:**
1. **Kunde klickt Stern-Icon** bei globalem Journalist
2. **System erstellt Reference** (nur Verweis-ID + lokale Notizen)
3. **UI lädt beide Daten** und kombiniert sie
4. **Anzeige:** Globale Daten (read-only) + Lokale Notizen (editierbar)

---

## **AKTUELLER STATUS**

### **✅ Was schon funktioniert:**
- Globale Journalisten werden angezeigt (`/library/editors/`)
- UI ist fertig (Tabelle, Cards, Filter)
- Daten kommen aus Firestore (echte Daten!)

### **❌ Was fehlt noch:**
- **Reference-Import Funktion** (Stern-Icon Logik)
- **Reference-Service** (Verweis erstellen/verwalten)
- **Reference-UI Updates** (Read-only Badges, lokale Notizen)

---

## **NÄCHSTE SCHRITTE (PRIORITÄT)**

### **1. Reference-Import implementieren (2-3 Stunden)**
```typescript
// Wenn Stern geklickt:
async function importAsReference(globalJournalistId: string) {
  // Erstelle Reference (Verweis)
  await createReference({
    globalJournalistId: globalJournalistId,
    organizationId: currentOrg.id,
    localNotes: "",
    localTags: []
  });
}
```

### **2. Reference-Service erstellen (2 Stunden)**
- Service für Reference CRUD
- Lädt globale Daten + kombiniert mit lokalen
- Keine Kopien, nur Verweise!

### **3. UI anpassen (1 Stunde)**
- Read-only Badge bei referenzierten Journalisten
- Lokale Notizen Editor
- "Aus CRM entfernen" statt "Löschen"

---

## **PHASE 2: CROWDSOURCING (SPÄTER)**

### **Das kommt NACH Phase 1:**
1. Organisationen pflegen eigene Kontakte
2. System erkennt Ähnlichkeiten (anonymisiert)
3. SuperAdmin bekommt Merge-Vorschläge
4. Kann diese global machen

### **Aber JETZT erstmal Phase 1 fertig machen!**

---

## **HÄUFIGE MISSVERSTÄNDNISSE**

❌ **FALSCH:** "Wir brauchen API Routes"
✅ **RICHTIG:** Direkter Firestore-Zugriff ist OK für Phase 1

❌ **FALSCH:** "Import kopiert Daten"
✅ **RICHTIG:** Import erstellt nur einen Verweis

❌ **FALSCH:** "Sync zwischen Kopien"
✅ **RICHTIG:** Keine Kopien, daher kein Sync nötig

❌ **FALSCH:** "Kunden können Journalisten bearbeiten"
✅ **RICHTIG:** Nur lokale Notizen, globale Daten bleiben read-only

---

## **ZUSAMMENFASSUNG**

**Das Reference-System in 3 Sätzen:**
1. SuperAdmin pflegt globale Journalisten
2. Kunden importieren Verweise (keine Kopien!)
3. Immer aktuelle Daten, lokale Notizen möglich

**Das ist alles!** Nicht komplizierter machen als nötig.

---

*Letzte Aktualisierung: Dezember 2024*
*Status: Phase 1 in Entwicklung*