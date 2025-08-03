# Distribution Lists - Verteilerlisten

## 📋 Übersicht

Das Verteilerlisten-Modul ermöglicht die intelligente Gruppierung von Kontakten für zielgerichtete Pressemeldungen. Es unterstützt sowohl statische als auch dynamische Listen mit automatischer Aktualisierung.

**Hauptzweck:** Effiziente Verwaltung von Empfängergruppen für verschiedene Themen, Branchen und Regionen.

## ✅ Implementierte Funktionen

### Listen-Verwaltung
- [x] **CRUD-Operationen** für Verteilerlisten
- [x] **Zwei Listen-Typen**:
  - **Statische Listen**: Manuell gepflegte Kontaktauswahl
  - **Dynamische Listen**: Automatisch basierend auf Filtern
- [x] **Metadaten**:
  - Name & Beschreibung
  - Erstellungsdatum
  - Kontaktanzahl (live)
- [x] **Farbcodierung** für visuelle Organisation

### Dynamische Listen-Features
- [x] **Multi-Filter-System**:
  - Nach Firmentyp (Verlag, Medienhaus, etc.)
  - Nach Tags
  - Nach Branchen
  - Nach Ländern/Regionen
  - Nach Positionen
  - Nach Publikationen
- [x] **Live-Aktualisierung** bei Kontaktänderungen
- [x] **Filter-Vorschau** zeigt betroffene Kontakte
- [x] **Kombinierbare Filter** (AND-Verknüpfung)

### Statische Listen-Features
- [x] **Manuelle Kontaktauswahl** mit Suche
- [x] **Bulk-Hinzufügen** aus Suchergebnissen
- [x] **Einzelne Kontakte** entfernen
- [x] **Import aus CSV** (Kontakt-IDs oder E-Mails)
- [x] **Sortierung** nach Name, Firma, Hinzufügedatum

### Integration
- [x] **Kampagnen-Integration**: Listen als Empfänger auswählen
- [x] **Kontakt-Anzeige**: Zeigt Listenzugehörigkeit
- [x] **Quick Actions**: Direkt aus Listen E-Mails versenden

## 🚧 In Entwicklung

- [ ] **Listen-Kombinationen** (Branch: feature/list-operations)
  - Union (Vereinigung)
  - Intersection (Schnittmenge)
  - Difference (Differenz)

## ❗ Dringend benötigt

### 1. **Erweiterte Filter-Optionen** 🔴
**Beschreibung:** Mehr Filtermöglichkeiten für präzisere Zielgruppen
- Aktivitäts-basierte Filter (letzte Interaktion)
- Kampagnen-Historie (hat X erhalten/geöffnet)
- Benutzerdefinierte Felder
- Negativ-Filter (Ausschluss)
- OR-Verknüpfung von Bedingungen

**Technische Anforderungen:**
- Erweitertes Query-Building
- Performance-Optimierung für komplexe Filter
- Filter-Syntax für Power-User

**Geschätzter Aufwand:** 2 Wochen

### 2. **Listen-Analyse & Insights** 🔴
**Beschreibung:** Statistiken und Qualitätsmetriken für Listen
- Überschneidungsanalyse zwischen Listen
- Bounce-Rate Historie
- Engagement-Metriken
- Wachstumstrends
- Inaktive Kontakte identifizieren

**Geschätzter Aufwand:** 1 Woche

### 3. **Hierarchische Listen** 🟡
**Beschreibung:** Verschachtelte Listenstrukturen
- Haupt- und Unterlisten
- Vererbung von Eigenschaften
- Ordner-Struktur
- Globale vs. Team-Listen

**Geschätzter Aufwand:** 1-2 Wochen

### 4. **Listen-Sharing & Permissions** 🟡
**Beschreibung:** Zusammenarbeit bei Listenverwaltung
- Listen mit Team teilen
- Lese/Schreib-Rechte
- Änderungshistorie
- Kommentare pro Liste

**Geschätzter Aufwand:** 1 Woche

## 💡 Nice to Have

### Automatisierung & KI
- **KI-basierte Listen-Vorschläge** basierend auf Kampagneninhalt
- **Auto-Segmentierung** nach Verhalten
- **Predictive Analytics** (wer wird wahrscheinlich öffnen)
- **Automatische Bereinigung** (Bounces, Inaktive)
- **Smart Lists** die sich selbst optimieren

### Import & Export
- **Outlook-Verteiler Import**
- **Excel-basierte Listen** mit Mapping
- **API für externe Systeme**
- **Sync mit CRM-Systemen**
- **Listen-Templates** zum Teilen

### Erweiterte Features
- **A/B Test Gruppen** automatisch erstellen
- **Geografische Listen** (Umkreissuche)
- **Zeitbasierte Listen** (Timezone-aware)
- **Sprachbasierte Segmentierung**
- **Listen-Scoring** (Qualitätsbewertung)

### Visualisierung
- **Listen-Overlap Diagramme**
- **Kontakt-Heatmap** (geografisch)
- **Wachstums-Charts**
- **Interaktive Filter-Builder**
- **Drag & Drop Listen-Editor**

## 🔧 Technische Details

### Datenbank-Struktur

```typescript
// Firestore Collections
distributionLists/
  {listId}/
    - name: string
    - description?: string
    - type: 'static' | 'dynamic'
    - color?: string
    - userId: string
    - createdAt: Timestamp
    - updatedAt: Timestamp
    
    // Für statische Listen
    - contactIds?: string[]
    
    // Für dynamische Listen
    - filters?: {
        companyTypes?: CompanyType[]
        tagIds?: string[]
        industries?: string[]
        countries?: string[]
        positions?: string[]
        publicationNames?: string[]
        // Zukünftig mehr...
      }

// Für Performance: Denormalisierte Zähler
listStats/
  {listId}/
    - contactCount: number
    - lastUpdated: Timestamp
```

### Service-Architektur

```typescript
// src/lib/firebase/lists-service.ts
export const listsService = {
  // CRUD
  getAll(userId: string): Promise<DistributionList[]>
  getById(id: string): Promise<DistributionList>
  create(data: ListData): Promise<string>
  update(id: string, data: Partial<List>): Promise<void>
  delete(id: string): Promise<void>
  
  // Spezielle Operationen
  getContacts(listId: string): Promise<Contact[]>
  evaluateDynamicList(filters: Filters): Promise<Contact[]>
  addContacts(listId: string, contactIds: string[]): Promise<void>
  removeContacts(listId: string, contactIds: string[]): Promise<void>
  
  // Analyse
  getListStats(listId: string): Promise<ListStats>
  findDuplicates(listIds: string[]): Promise<Contact[]>
}
```

### Performance-Optimierungen

```typescript
// Firestore Compound Indexes
contacts: [userId, companyType, industry]
contacts: [userId, tagIds, country]

// Caching-Strategie
- Statische Listen: Cache contactIds
- Dynamische Listen: Cache Filter-Ergebnisse (5min TTL)
- Verwendung von Firebase Offline Persistence
```

### Komponenten-Struktur

```
src/app/dashboard/contacts/lists/
├── page.tsx                    # Listen-Übersicht
├── [listId]/
│   ├── page.tsx               # Listen-Detail
│   └── edit/
│       └── page.tsx           # Listen-Editor
└── components/
    ├── ListCard.tsx           # Listen-Kachel
    ├── FilterBuilder.tsx      # Dynamische Filter UI
    ├── ContactSelector.tsx    # Kontakt-Auswahl
    └── ListStats.tsx          # Statistik-Anzeige
```

## 📊 Metriken & KPIs

- **Listen-Anzahl:** Gesamt, nach Typ
- **Durchschnittliche Listengröße**
- **Nutzungsfrequenz:** Welche Listen werden oft verwendet
- **Filter-Komplexität:** Anzahl Bedingungen
- **Update-Frequenz:** Wie oft ändern sich Listen

## 🐛 Bekannte Probleme

1. **Performance bei großen dynamischen Listen**
   - >1000 Kontakte verlangsamen Filter
   - Lösung: Pagination, virtuelles Scrolling

2. **Filter-Kombinationen nicht intuitiv**
   - Nur AND-Verknüpfung möglich
   - Lösung: Visual Query Builder

3. **Keine Undo-Funktion**
   - Gelöschte Kontakte aus Listen nicht wiederherstellbar
   - Lösung: Soft Delete mit Historie

## 🔒 Sicherheit & Datenschutz

- Listen nur für Ersteller sichtbar
- Keine öffentlichen Listen-URLs
- Kontaktdaten bleiben geschützt
- Export nur mit Berechtigung
- Audit-Log für Änderungen (geplant)

## 📈 Zukünftige Entwicklung

### Phase 1 (Q1 2025)
- Erweiterte Filter
- Listen-Analyse
- Performance-Optimierung

### Phase 2 (Q2 2025)
- KI-Integration
- Hierarchische Listen
- Team-Funktionen

### Phase 3 (Q3 2025)
- Externe Integrationen
- Erweiterte Automatisierung
- Enterprise-Features

## 📚 Weiterführende Dokumentation

- [CRM-Integration](./crm.md)
- [Kampagnen-Nutzung](./campaigns.md)
- [Filter-Syntax](./filter-syntax.md)
- [Performance-Guide](./performance-optimization.md)