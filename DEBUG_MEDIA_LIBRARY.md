# Media Library Debug-Analyse - KOMPLETT

## Problem
Campaign-Uploads landen in strukturierten Pfaden, aber Media Library zeigt sie nicht an.

## Debug-Log Analyse

### Media Library Ladeprozess
```
📁 Media Library loadData: Start {organizationId: 'XXHOADV6LoVQHRuebjq43u4D0ci2', currentFolderId: undefined}
📂 getFolders Raw Query Result: {anzahl: 0, docs: Array(0)}
📄 getMediaAssets Raw Query Result: {anzahl: 0, docs: Array(0)}
```

**Erkenntnis 1:** Media Library findet KEINE Ordner und Assets in der Root-Ebene für organizationId `XXHOADV6LoVQHRuebjq43u4D0ci2`.

### Campaign Upload Funktioniert
```
Kampagne hat Projekt-ID: aORzNMMiKA6vlScxIKDx
Kunde-ID: 8er5Z0Fu4IXh2E7djT8z
```

**Erkenntnis 2:** Campaign-Upload hat korrekte Projekt- und Kunden-IDs und funktioniert.

### Andere Organization Hat Daten
```
📂 getFolders Raw Query Result: {anzahl: 13, docs: Array(13)}
📁 getFolders Processed Result: {anzahl: 1, ordner: Array(1)}
```

**Erkenntnis 3:** Für organizationId `wVa3cJ7YhYUCQcbwZLLVB6w5Xs23` werden 13 Ordner gefunden, aber nur 1 wird nach Filterung angezeigt.

## Kernproblem Identifiziert

### Multi-Tenancy Problem
Die Media Library lädt Daten für organizationId `XXHOADV6LoVQHRuebjq43u4D0ci2`, aber:
- Campaign-Uploads gehen möglicherweise unter einer anderen organizationId
- Oder Assets werden in Unterordnern gespeichert, die nicht in der Root-Query erfasst werden

### Lösungsansätze

1. **OrganizationId-Konsistenz prüfen:**
   - Verifizieren, dass Campaign-Upload und Media Library dieselbe organizationId verwenden

2. **Smart Router Pfad-Problem:**
   - Assets werden in `Mediathek/Projekte/P-{date}-{company}/Medien/` gespeichert
   - Media Library sucht nur in Root-Ebene (`parentFolderId: undefined`)
   - Braucht rekursive Suche oder Ordner-Struktur-Aufbau

3. **Firestore Query erweitern:**
   - Statt nur Root-Assets zu suchen, alle Assets der Organization finden
   - Dann nach Ordner-Hierarchie sortieren

## Nächste Schritte
1. OrganizationId-Konsistenz zwischen Upload und Anzeige überprüfen
2. Smart Upload Router Pfade mit Media Library Query abgleichen
3. Rekursive Asset-Suche implementieren oder Ordner-Struktur automatisch aufbauen