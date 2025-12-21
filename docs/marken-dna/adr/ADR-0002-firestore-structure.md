# ADR-0002: Firestore-Struktur für Marken-DNA

**Status:** Accepted
**Datum:** 2025-12-21
**Autor:** CeleroPress Development Team

---

## Kontext

Die Marken-DNA besteht aus 6 Strategie-Dokumenten pro Kunde. Für die Speicherung in Firestore standen mehrere Strukturoptionen zur Auswahl:

### Anforderungen

1. **Multi-Tenancy:** Jede Organization sieht nur ihre eigenen Daten
2. **Skalierbarkeit:** Effiziente Queries auch bei vielen Kunden
3. **Nähe zu Kundendaten:** Strategische Dokumente gehören zum Kunden
4. **Firestore Rules:** Einfache, wartbare Security Rules
5. **Performance:** Schnelle Ladezeiten für Übersichts-Tabelle

---

## Entscheidung

**Wir speichern Marken-DNA als Subcollection unter `companies`:**

```
companies/{companyId}/
└── markenDNA/
    ├── briefing/          # Briefing-Check Dokument
    ├── swot/              # SWOT-Analyse
    ├── audience/          # Zielgruppen-Radar
    ├── positioning/       # Positionierungs-Designer
    ├── goals/             # Ziele-Setzer
    ├── messages/          # Botschaften-Baukasten
    └── synthesis/         # 🧪 DNA Synthese
```

### Begründung

#### 1. Nähe zu Kundendaten

Die Marken-DNA ist **Teil des Kunden**, nicht eine separate Entität:
- Strategische Dokumente beschreiben den Kunden
- Lifecycle ist an den Kunden gebunden
- Wird gelöscht wenn Kunde gelöscht wird

#### 2. Multi-Tenancy durch bestehende Struktur

`companies` Collection hat bereits `organizationId`:
```typescript
interface Company {
  id: string;
  organizationId: string;  // ✅ Multi-Tenancy bereits gelöst
  type: 'customer' | 'partner' | 'competitor';
  name: string;
  // ...
}
```

Alle Marken-DNA Dokumente erben automatisch die Organization.

#### 3. Einfache Firestore Rules

```javascript
match /companies/{companyId}/markenDNA/{docType} {
  allow read, write: if isAuthenticated() &&
    belongsToOrganization(
      get(/databases/$(database)/documents/companies/$(companyId)).data.organizationId
    );
}
```

**Vorteile:**
- Wiederverwendung der `belongsToOrganization()` Helper-Funktion
- Keine Duplikation von `organizationId` in jedem Dokument
- Konsistent mit anderen Subcollections (projects, contacts, etc.)

#### 4. Effiziente Queries

**Übersichtstabelle (alle Kunden mit Status):**
```typescript
// 1. Lade alle Kunden der Organization (bereits optimiert)
const companies = await companiesQuery
  .where('organizationId', '==', orgId)
  .where('type', '==', 'customer')
  .get();

// 2. Parallel: Lade Marken-DNA Status für jeden Kunden
const statuses = await Promise.all(
  companies.map(c => getMarkenDNAStatus(c.id))
);
```

**Keine Collection Group Query notwendig!**

---

## Konsequenzen

### Positiv ✅

1. **Konsistenz mit bestehender Architektur**
   - Folgt dem Pattern von `projects/{id}/documents/`
   - Gleiches Pattern wie `companies/{id}/contacts/`

2. **Einfache Daten-Isolation**
   - Firestore Rules greifen auf Parent-Document zu
   - Multi-Tenancy durch bestehende Mechanismen

3. **Automatische Cleanup**
   ```typescript
   // Wenn Company gelöscht wird → Subcollections werden gelöscht
   await deleteCompany(companyId);
   // ✅ Alle markenDNA Dokumente ebenfalls weg
   ```

4. **Performante Queries**
   - Kein Collection Group Query notwendig
   - Index bereits vorhanden (`companies` - `organizationId`)

### Negativ ⚠️

1. **Subcollection Limits**
   - Firestore Limit: 1 Million Dokumente pro Subcollection
   - **Bewertung:** ✅ Kein Problem (nur 7 Dokumente pro Kunde)

2. **Batch-Queries komplexer**
   - Für "Alle Marken-DNA Dokumente aller Kunden" sind mehrere Queries notwendig
   - **Bewertung:** ✅ Akzeptabel, da Use-Case selten

3. **Keine Collection Group Query**
   - Kann nicht direkt "Alle Briefings der Organization" abfragen
   - **Bewertung:** ✅ Kein Use-Case identifiziert

---

## Alternativen

### Alternative 1: Separate `markenDNA` Top-Level Collection

```
markenDNA/{documentId}/
├── companyId: string
├── organizationId: string
├── type: 'briefing' | 'swot' | ...
└── content: string
```

**Vorteile:**
- Collection Group Queries möglich
- Einfacher für "Alle Dokumente eines Typs"

**Nachteile:**
- ❌ Duplikation von `organizationId` in jedem Dokument
- ❌ Keine automatische Cleanup bei Kunden-Löschung
- ❌ Weniger semantische Nähe zum Kunden
- ❌ Mehr komplexe Firestore Rules

**Bewertung:** ❌ Abgelehnt

### Alternative 2: Array in `companies` Document

```typescript
interface Company {
  id: string;
  markenDNA: {
    briefing?: MarkenDNADocument;
    swot?: MarkenDNADocument;
    // ...
  };
}
```

**Vorteile:**
- Einfache Queries (alle Daten in einem Document)
- Keine Subcollection

**Nachteile:**
- ❌ Firestore Document Size Limit (1 MB)
- ❌ Chat-History würde Dokument sehr groß machen
- ❌ Keine granulare Updates (ganzes Document wird überschrieben)

**Bewertung:** ❌ Abgelehnt

### Alternative 3: Hybrid (Meta in Company, Content in Subcollection)

```typescript
// companies/{id}
interface Company {
  markenDNAStatus: {
    briefing: boolean;
    swot: boolean;
    // ...
  };
}

// companies/{id}/markenDNA/{type}
interface MarkenDNADocument {
  content: string;
  chatHistory: ChatMessage[];
}
```

**Vorteile:**
- Schnelle Übersicht (Status im Company Document)
- Content in Subcollection

**Nachteile:**
- ❌ Duplikation (Status in beiden Orten)
- ❌ Synchronisation notwendig
- ❌ Mehr Komplexität

**Bewertung:** ❌ Abgelehnt (Overengineering)

---

## Migration Path (falls notwendig)

Falls in Zukunft eine andere Struktur notwendig wird:

### Szenario: Wechsel zu Top-Level Collection

**Grund:** Collection Group Queries werden kritisch

**Schritte:**
1. Neue Collection `markenDNA` erstellen
2. Migration Script: Alle Subcollections kopieren
3. Code auf neue Struktur umstellen
4. Alte Subcollections löschen

**Aufwand:** ~1 Tag (nur 1 Service betroffen)

---

## Implementierung

### Service

```typescript
// src/lib/firebase/marken-dna-service.ts

export const markenDNAService = {
  async get(companyId: string, type: MarkenDNADocumentType) {
    const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async getAll(companyId: string) {
    const collectionRef = collection(db, 'companies', companyId, 'markenDNA');
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => doc.data());
  },

  async save(companyId: string, type: MarkenDNADocumentType, data: MarkenDNAUpdateData) {
    const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  },

  async delete(companyId: string, type: MarkenDNADocumentType) {
    const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
    await deleteDoc(docRef);
  },

  async deleteAll(companyId: string) {
    const collectionRef = collection(db, 'companies', companyId, 'markenDNA');
    const snapshot = await getDocs(collectionRef);
    await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
  },
};
```

### Firestore Rules

```javascript
// firestore.rules

match /companies/{companyId}/markenDNA/{docType} {
  allow read: if isAuthenticated() &&
    belongsToOrganization(
      get(/databases/$(database)/documents/companies/$(companyId)).data.organizationId
    );

  allow create: if isAuthenticated() &&
    belongsToOrganization(
      get(/databases/$(database)/documents/companies/$(companyId)).data.organizationId
    );

  allow update, delete: if isAuthenticated() &&
    belongsToOrganization(
      get(/databases/$(database)/documents/companies/$(companyId)).data.organizationId
    );
}
```

---

## Referenzen

- Firestore Best Practices: https://firebase.google.com/docs/firestore/best-practices
- Bestehende Struktur: `src/lib/firebase/companies-service.ts`
- Implementierung: `src/lib/firebase/marken-dna-service.ts`
- Datenmodell: `docs/planning/marken-dna/02-PHASE-1-DATENMODELL.md`

---

**Entscheidung getroffen:** 2025-12-21
**Review:** Stefan Kühne
**Status:** ✅ Accepted
