# Campaign Upload Context Fix - Implementierung

## Datum: 16.09.2025

## Problem
Die Media Upload-Funktionalität in Campaigns nutzte den Campaign/Project-Context nicht korrekt, wodurch:
1. Key Visuals und Anhänge immer im Root-Verzeichnis landeten statt im Projekt-Ordner
2. PDFs nicht in den korrekten Pressemeldungen-Ordnern gespeichert wurden
3. Der Upload Modal keine Pfad-Initialisierung basierend auf Campaign/Project hatte

## Lösung

### 1. AssetSelectorModal Context-Weiterleitung
**Datei:** `src/components/campaigns/AssetSelectorModal.tsx`
- Campaign/Project-Context wird nun an UploadModal weitergegeben
- Props hinzugefügt: `campaignId`, `campaignName`, `projectId`, `projectName`, `uploadType`, `enableSmartRouter`

### 2. UploadModal Context-Verarbeitung
**Datei:** `src/app/dashboard/pr-tools/media-library/UploadModal.tsx`
- Interface erweitert um Campaign/Project-Props
- Upload-Logik unterscheidet zwischen Campaign-Context und Standard-Upload
- Bei Campaign-Context wird `uploadWithContext` mit korrekten Parametern verwendet

### 3. Smart Upload Router Pfad-Logik
**Datei:** `src/lib/firebase/smart-upload-router.ts`
- Erweiterte Pfad-Resolution für organisierte Projekt-Uploads:
  - PDFs: `Projekte/{project}/Pressemeldungen/Campaign-{id}/Freigaben/`
  - Key Visuals: `Projekte/{project}/Medien/Campaign-{id}/Key-Visuals/`
  - Anhänge: `Projekte/{project}/Medien/Campaign-{id}/Anhänge/`
- Unzugeordnete Campaign-Struktur für Campaigns ohne Projekt:
  - `Unzugeordnet/Campaigns/Campaign-{id}/...`

### 4. PDF-Versioning Service Anpassung
**Datei:** `src/lib/firebase/pdf-versions-service.ts`
- Lädt Campaign-Daten für Projekt-Zuordnung
- Setzt korrekte Upload-Context-Parameter mit `projectId` wenn vorhanden
- Nutzt `category: 'pdf'` statt `'pressemeldung_pdf'`

## Resultierende Struktur

### Mit Projekt-Zuordnung:
```
📁 organizations/{organizationId}/media/
└── 📁 Projekte/
    └── 📁 {projectName}/
        ├── 📁 Medien/
        │   └── 📁 Campaign-{campaignId}/
        │       ├── 📁 Key-Visuals/
        │       └── 📁 Anhänge/
        └── 📁 Pressemeldungen/
            └── 📁 Campaign-{campaignId}/
                ├── 📁 Entwürfe/
                └── 📁 Freigaben/
```

### Ohne Projekt-Zuordnung:
```
📁 organizations/{organizationId}/media/
└── 📁 Unzugeordnet/
    └── 📁 Campaigns/
        └── 📁 Campaign-{campaignId}/
            ├── 📁 Medien/
            │   ├── 📁 Key-Visuals/
            │   └── 📁 Anhänge/
            └── 📁 PDFs/
                ├── 📁 Entwürfe/
                └── 📁 Freigaben/
```

## Testing
- Linter läuft ohne Fehler
- TypeScript-Fehler sind nicht von diesen Änderungen
- Smart Upload Router Tests müssen angepasst werden (erwarten alte Pfad-Struktur)

## Nächste Schritte
1. Tests für neue Pfad-Struktur anpassen
2. UI-Feedback für Upload-Pfad verbessern (zeige Ziel-Ordner an)
3. Migration-Tool für bestehende falsch platzierte Dateien