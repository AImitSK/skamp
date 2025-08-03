# ADR-0003: Firestore Datenstruktur ohne Subcollections

**Status:** Accepted  
**Datum:** 2024-12-21  
**Entscheider:** Development Team  

## Kontext

Bei der Strukturierung der Firestore-Datenbank für SKAMP musste entschieden werden, wie die Beziehungen zwischen Entitäten (Firmen, Kontakte, Kampagnen, etc.) abgebildet werden. Besonders wichtig war die Frage, ob Subcollections verwendet werden sollen oder nicht.

Firestore bietet zwei Hauptansätze:
1. Subcollections für hierarchische Daten
2. Top-Level Collections mit Referenzen

Diese Entscheidung hat weitreichende Auswirkungen auf Queries, Skalierbarkeit und Entwicklungsaufwand.

## Entscheidung

Wir verwenden ausschließlich Top-Level Collections mit Referenzen zwischen Dokumenten, keine Subcollections.

## Alternativen

### Option 1: Top-Level Collections mit Referenzen ✅
```
/companies/{companyId}
/contacts/{contactId} -> companyId: "abc123"
/campaigns/{campaignId}
/media/{mediaId} -> clientIds: ["abc123", "def456"]
```
- **Vorteile:**
  - Flexible Queries über alle Dokumente einer Collection
  - Kontakte können ohne Firma existieren
  - Einfache Migration von Kontakten zwischen Firmen
  - Globale Suche möglich
  - Mehrfach-Zuordnungen möglich (z.B. Media zu mehreren Clients)
- **Nachteile:**
  - Zusätzliche Reads für verknüpfte Daten
  - Referenzielle Integrität muss manuell verwaltet werden
  - Mehr Komplexität bei Löschungen

### Option 2: Subcollections
```
/companies/{companyId}/contacts/{contactId}
/companies/{companyId}/campaigns/{campaignId}
```
- **Vorteile:**
  - Klare Hierarchie
  - Automatische Löschung bei Parent-Löschung
  - Weniger Reads für zusammenhängende Daten
  - Natürliche Gruppierung
- **Nachteile:**
  - Keine globalen Queries über alle Kontakte
  - Kontakte ohne Firma sind problematisch
  - Migration zwischen Firmen kompliziert
  - Collection Group Queries sind limitiert

### Option 3: Hybride Lösung
```
/companies/{companyId}
/companies/{companyId}/media/{mediaId}  // Subcollection
/contacts/{contactId} -> companyId       // Top-Level
```
- **Vorteile:**
  - Best of both worlds für spezifische Use Cases
  - Flexibilität wo nötig
- **Nachteile:**
  - Inkonsistente Patterns
  - Verwirrend für Entwickler
  - Komplexere Logik

### Option 4: Vollständige Denormalisierung
```
/contacts/{contactId} -> company: { id, name, type, ... }
```
- **Vorteile:**
  - Nur ein Read pro Dokument
  - Beste Read-Performance
- **Nachteile:**
  - Update-Anomalien bei Änderungen
  - Viel Speicherplatz
  - Komplexe Update-Logik

## Begründung

Top-Level Collections wurden gewählt, weil:

1. **Flexibilität**: Kontakte können unabhängig von Firmen existieren (Freelancer, lose Kontakte)
2. **Globale Suche**: "Zeige alle Kontakte" ist ein häufiger Use Case
3. **Medienverwaltung**: Medien können mehreren Clients zugeordnet werden
4. **Skalierbarkeit**: Keine Limitierungen durch Hierarchien
5. **Einfachheit**: Konsistentes Pattern für alle Entitäten

## Konsequenzen

### Positive
- Maximale Query-Flexibilität
- Einfache globale Suchen und Filter
- Kontakte können zu mehreren Kontexten gehören
- Saubere API-Struktur
- Einfache Datenmigration

### Negative
- Zusätzliche Reads für Beziehungsdaten (z.B. Company-Name bei Contact)
- Manuelle Verwaltung von Referenzen
- Orphaned Documents möglich
- Batch-Löschungen müssen implementiert werden

### Neutral
- Denormalisierung für Performance (z.B. companyName bei Contact)
- Firestore Security Rules müssen Beziehungen prüfen
- Konsistenz-Checks müssen implementiert werden

## Notizen

### Implementierte Optimierungen
1. **Denormalisierte Felder** für häufige Zugriffe:
   ```typescript
   interface Contact {
     companyId?: string;      // Referenz
     companyName?: string;    // Denormalisiert für Performance
   }
   ```

2. **Batch-Operationen** für Konsistenz:
   ```typescript
   // Bei Company-Update auch alle Contacts updaten
   await updateCompanyAndContacts(companyId, updates);
   ```

3. **Composite Indexes** für komplexe Queries:
   ```
   contacts: userId, companyId, lastName
   media: userId, clientIds, createdAt
   ```

### Zukünftige Überlegungen
- Cloud Functions für automatische Konsistenz-Updates
- Scheduled Functions für Orphan-Cleanup
- Caching-Layer für häufige Beziehungs-Queries

## Referenzen

- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [NoSQL Data Modeling Techniques](https://highlyscalable.wordpress.com/2012/03/01/nosql-data-modeling-techniques/)