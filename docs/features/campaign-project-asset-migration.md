# Campaign-Projekt Asset-Migration Feature

## Übersicht
Automatische Duplizierung aller Campaign-Assets in Projekt-basierte Ordnerstrukturen bei nachträglicher Projektzuordnung.

## Problem
- Campaigns werden oft ohne Projekt erstellt → Assets landen im Root/Organization-Verzeichnis
- Bei späterer Projektzuordnung bleiben Assets im chaotischen Root-Verzeichnis
- Keine einheitliche Projekt-basierte Asset-Organisation

## Lösung: Asset-Duplizierung bei Projektzuordnung

### Workflow
1. User ordnet Campaign einem Projekt zu (Edit-Seite)
2. **Confirmation Dialog** erscheint mit Asset-Anzahl
3. System dupliziert alle Campaign-Assets in Projekt-Ordner
4. Campaign-Referenzen werden auf neue URLs aktualisiert
5. **Success-Message** mit Anzahl duplizierter Dateien

## Technische Implementierung

### 1. Asset-Sammlung
```typescript
// Sammle alle verknüpften Assets einer Campaign
const collectCampaignAssets = (campaign) => {
  const assets = [];

  // Key Visuals
  if (campaign.keyVisualId) {
    assets.push({
      type: 'keyVisual',
      assetId: campaign.keyVisualId,
      targetFolder: 'Medien'
    });
  }

  // Media Attachments
  campaign.attachments?.forEach(attachment => {
    assets.push({
      type: 'attachment',
      assetId: attachment.mediaId,
      targetFolder: 'Medien'
    });
  });

  // PDF Versions (aus pdf_versions Collection)
  // Query: where('campaignId', '==', campaignId)
  pdfVersions.forEach(pdf => {
    assets.push({
      type: 'pdf',
      assetId: pdf.id,
      downloadUrl: pdf.downloadUrl,
      targetFolder: 'Pressemeldungen'
    });
  });

  return assets;
};
```

### 2. Confirmation Dialog
```typescript
// Modal Component
const ProjectAssignmentConfirmation = ({
  assetCount,
  onConfirm,
  onCancel
}) => (
  <Dialog>
    <DialogTitle>Projektzuweisung bestätigen</DialogTitle>
    <DialogBody>
      <div className="p-4 bg-blue-50 rounded">
        <InformationCircleIcon className="h-5 w-5 text-blue-500 mb-2" />
        <p className="text-sm">
          Die Projektzuweisung dupliziert alle verknüpften Medien
          ({assetCount} Dateien) in die Projekt-Ordner.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Original-Dateien bleiben im Root-Verzeichnis erhalten.
        </p>
      </div>
    </DialogBody>
    <DialogActions>
      <Button onClick={onCancel}>Abbrechen</Button>
      <Button onClick={onConfirm} color="blue">
        {assetCount} Dateien duplizieren
      </Button>
    </DialogActions>
  </Dialog>
);
```

### 3. Asset-Duplizierung
```typescript
const migrateAssets = async (campaignId, projectId, assets) => {
  let successCount = 0;
  const errors = [];

  for (const asset of assets) {
    try {
      // 1. Original Asset laden
      const originalAsset = await mediaService.getAssetById(asset.assetId);

      // 2. Download Original-Datei
      const response = await fetch(originalAsset.downloadUrl);
      const blob = await response.blob();
      const file = new File([blob], originalAsset.fileName);

      // 3. Ziel-Ordner finden
      const projectFolder = await findProjectFolder(projectId);
      const targetFolder = await findOrCreateSubfolder(
        projectFolder.id,
        asset.targetFolder // 'Medien' oder 'Pressemeldungen'
      );

      // 4. Upload in Projekt-Ordner
      const newAsset = await mediaService.uploadClientMedia(
        file,
        organizationId,
        campaignData.clientId,
        targetFolder.id,
        undefined,
        {
          userId,
          description: `Migriert von Campaign ${campaignId}`,
          originalAssetId: asset.assetId
        }
      );

      // 5. Firestore-Referenzen aktualisieren
      await updateFirestoreReferences(
        campaignId,
        asset.type,
        asset.assetId,
        newAsset
      );

      successCount++;

    } catch (error) {
      errors.push({ assetId: asset.assetId, error });
    }
  }

  return { successCount, errors };
};
```

### 4. Firestore-Updates
```typescript
const updateFirestoreReferences = async (
  campaignId,
  assetType,
  originalAssetId,
  newAsset
) => {
  const batch = writeBatch(db);

  switch (assetType) {
    case 'keyVisual':
      // Campaign Document Update
      const campaignRef = doc(db, 'pr_campaigns', campaignId);
      batch.update(campaignRef, {
        keyVisualId: newAsset.id
      });

      // Media Asset Document Update
      const mediaRef = doc(db, 'media_assets', newAsset.id);
      batch.update(mediaRef, {
        folderId: newAsset.folderId,
        downloadUrl: newAsset.downloadUrl,
        storageRef: newAsset.storageRef,
        migratedAt: serverTimestamp(),
        originalAssetId: originalAssetId
      });
      break;

    case 'attachment':
      // Campaign Attachments Array Update
      const campaign = await getDoc(doc(db, 'pr_campaigns', campaignId));
      const attachments = campaign.data().attachments || [];

      const updatedAttachments = attachments.map(att =>
        att.mediaId === originalAssetId
          ? { ...att, mediaId: newAsset.id }
          : att
      );

      batch.update(doc(db, 'pr_campaigns', campaignId), {
        attachments: updatedAttachments
      });

      // Media Asset Document Update
      batch.update(doc(db, 'media_assets', newAsset.id), {
        folderId: newAsset.folderId,
        downloadUrl: newAsset.downloadUrl,
        storageRef: newAsset.storageRef,
        migratedAt: serverTimestamp(),
        originalAssetId: originalAssetId
      });
      break;

    case 'pdf':
      // PDF Versions Document Update
      batch.update(doc(db, 'pdf_versions', originalAssetId), {
        downloadUrl: newAsset.downloadUrl,
        storageRef: newAsset.storageRef,
        folderId: newAsset.folderId,
        migratedAt: serverTimestamp(),
        originalDownloadUrl: newAsset.originalDownloadUrl, // Backup
        originalStorageRef: newAsset.originalStorageRef
      });
      break;
  }

  await batch.commit();
};
```

### 5. Integration in Campaign-Edit
```typescript
// In CampaignEditPage - bei Projekt-Auswahl-Änderung
const handleProjectChange = async (newProjectId) => {
  if (campaign.projectId && newProjectId !== campaign.projectId) {
    // Asset-Migration anbieten
    const assets = await collectCampaignAssets(campaign);

    if (assets.length > 0) {
      setShowMigrationDialog(true);
      setMigrationAssets(assets);
      setPendingProjectId(newProjectId);
    } else {
      // Direkt updaten wenn keine Assets
      await updateCampaign({ projectId: newProjectId });
    }
  }
};

const confirmMigration = async () => {
  setMigrationInProgress(true);

  try {
    const result = await migrateAssets(
      campaign.id,
      pendingProjectId,
      migrationAssets
    );

    // Campaign mit neuem Projekt updaten
    await updateCampaign({ projectId: pendingProjectId });

    // Success-Message
    toast.success(
      `✅ ${result.successCount} Dateien erfolgreich reorganisiert`
    );

    if (result.errors.length > 0) {
      toast.warning(
        `⚠️ ${result.errors.length} Dateien konnten nicht migriert werden`
      );
    }

  } catch (error) {
    toast.error('Fehler bei der Asset-Migration');
  } finally {
    setMigrationInProgress(false);
    setShowMigrationDialog(false);
  }
};
```

## Dateien zu erstellen/ändern

### Neue Dateien
- `src/components/campaigns/ProjectAssignmentMigrationDialog.tsx`
- `src/lib/services/asset-migration-service.ts`

### Zu ändernde Dateien
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
  - Integration der Migration-Logic
- `src/lib/firebase/campaigns-service.ts`
  - Asset-Sammlung-Functions

## Aufwand-Schätzung
- **Dialog Component**: 30 Min
- **Asset-Sammlung-Logic**: 45 Min
- **Duplizierung-Service**: 90 Min
- **Firestore-Updates-Logic**: 90 Min ⚠️
- **Key Visual Pipeline Updates**: 60 Min 🔥
- **Integration in Edit-Page**: 60 Min
- **Testing & Debugging**: 90 Min

**Gesamt: ~7 Stunden** (erhöht wegen Key Visual Pipeline-Komplexität)

## Vorteile
✅ Nachträgliche Projekt-Organisation möglich
✅ Keine kaputten Asset-Referenzen
✅ Original-Dateien bleiben sicher
✅ User behält Kontrolle über Root-Cleanup
✅ Saubere Projekt-basierte Asset-Struktur

## Kritische Firestore-Collections betroffen
- ✅ `pr_campaigns` - keyVisualId, attachments Array
- ✅ `media_assets` - downloadUrl, folderId, storageRef
- ✅ `pdf_versions` - downloadUrl, storageRef, folderId
- ⚠️ Batch-Writes verwenden für Atomarität

## Key Visual Pipeline Updates ⚠️
**Besonders komplex:** Key Visual hat eigene Processing-Logic die geupdatet werden muss:

```typescript
// KeyVisualSection.tsx - Nach Migration
const updateKeyVisualReferences = async (newKeyVisualId) => {
  // 1. Campaign keyVisualId Update (bereits implementiert)
  // 2. Canvas/Preview Components müssen neue Asset-ID verwenden
  // 3. Crop-Funktionalität auf neue Asset zeigen lassen
  // 4. Thumbnail-Generation für migrierte Datei
  // 5. Image-Optimization Pipeline triggern

  // Crop-Logic Update
  const handleCropSave = async () => {
    // ⚠️ Verwendet campaign.keyVisualId für alle Crop-Operations
    // Muss auf neue migrierte Asset-ID zeigen!
    const asset = await mediaService.getAssetById(campaign.keyVisualId); // neue ID
    // ... Canvas/Crop Logic
  };

  // Preview-Component Update
  const loadKeyVisualPreview = async () => {
    // ⚠️ Preview muss neue downloadUrl verwenden
    setPreviewUrl(newAsset.downloadUrl);
  };
};
```

**Betroffene Key Visual Komponenten:**
- `KeyVisualSection.tsx` - Haupt-Component
- `KeyVisualCropModal.tsx` - Crop-Funktionalität
- `KeyVisualPreview.tsx` - Preview-Display
- Canvas-based Crop-Logic
- Thumbnail-Generation Pipeline

## Nächste Schritte für morgen
1. ProjectAssignmentMigrationDialog Component erstellen
2. Asset-Migration-Service implementieren
3. **Firestore-Batch-Update-Logic implementieren** ⚠️
4. **Key Visual Pipeline Integration** 🔥
   - KeyVisualSection.tsx Updates
   - Crop-Modal Asset-Referenz-Updates
   - Preview-Component URL-Updates
5. Integration in Campaign-Edit-Page
6. Testing mit verschiedenen Asset-Typen
7. Error-Handling und Rollback-Mechanismus
8. User-Feedback und Success/Error-Messages

## Risiko-Assessment
🔥 **Höchstes Risiko:** Key Visual Pipeline - viele verkettete Komponenten
⚠️ **Mittleres Risiko:** PDF-Versionen Firestore-Updates
✅ **Niedriges Risiko:** Media Attachments - einfache Array-Updates