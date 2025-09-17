import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { mediaService } from '@/lib/firebase/media-service';
import { MediaAsset } from '@/types/media';
import { PRCampaign } from '@/types/pr';

export interface AssetToMigrate {
  type: 'keyVisual' | 'attachment' | 'pdf';
  assetId: string;
  targetFolder: 'Medien' | 'Pressemeldungen';
  downloadUrl?: string;
  fileName?: string;
}

export interface MigrationResult {
  successCount: number;
  errors: Array<{
    assetId: string;
    error: Error;
  }>;
  migratedAssets: Array<{
    originalId: string;
    newId: string;
    type: string;
  }>;
}

class AssetMigrationService {
  /**
   * Sammelt alle Assets einer Campaign, die migriert werden müssen
   */
  async collectCampaignAssets(campaign: PRCampaign): Promise<AssetToMigrate[]> {
    const assets: AssetToMigrate[] = [];

    try {
      // 1. Key Visual sammeln
      if (campaign.keyVisual?.assetId) {
        try {
          const keyVisualDoc = await getDoc(doc(db, 'media_assets', campaign.keyVisual.assetId));
          if (keyVisualDoc.exists()) {
            assets.push({
              type: 'keyVisual',
              assetId: campaign.keyVisual.assetId,
              targetFolder: 'Medien',
              downloadUrl: keyVisualDoc.data().downloadUrl,
              fileName: keyVisualDoc.data().fileName
            });
          }
        } catch (error) {
          console.error('Fehler beim Laden des Key Visuals:', error);
        }
      }

      // 2. Media Attachments sammeln
      if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
        for (const attachment of campaign.attachedAssets) {
          if (attachment.assetId) {
            try {
              const attachmentDoc = await getDoc(doc(db, 'media_assets', attachment.assetId));
              if (attachmentDoc.exists()) {
                assets.push({
                  type: 'attachment',
                  assetId: attachment.assetId,
                  targetFolder: 'Medien',
                  downloadUrl: attachmentDoc.data().downloadUrl,
                  fileName: attachmentDoc.data().fileName
                });
              }
            } catch (error) {
              console.error(`Fehler beim Laden des Attachments ${attachment.assetId}:`, error);
            }
          }
        }
      }

      // 3. PDF Versionen sammeln
      if (campaign.id) {
        try {
          const pdfQuery = query(
            collection(db, 'pdf_versions'),
            where('campaignId', '==', campaign.id)
          );
          const pdfSnapshot = await getDocs(pdfQuery);

          pdfSnapshot.forEach((pdfDoc) => {
            const pdfData = pdfDoc.data();
            assets.push({
              type: 'pdf',
              assetId: pdfDoc.id,
              targetFolder: 'Pressemeldungen',
              downloadUrl: pdfData.downloadUrl,
              fileName: pdfData.fileName || `${campaign.title}.pdf`
            });
          });
        } catch (error) {
          console.error('Fehler beim Laden der PDF-Versionen:', error);
        }
      }

      console.log(`Gesammelte Assets für Campaign ${campaign.id}:`, assets.length);
      return assets;
    } catch (error) {
      console.error('Fehler beim Sammeln der Campaign-Assets:', error);
      throw error;
    }
  }

  /**
   * Migriert alle Assets einer Campaign in die Projekt-Ordnerstruktur
   */
  async migrateAssets(
    campaignId: string,
    campaign: PRCampaign,
    projectId: string,
    assets: AssetToMigrate[],
    organizationId: string,
    userId: string
  ): Promise<MigrationResult> {
    let successCount = 0;
    const errors: MigrationResult['errors'] = [];
    const migratedAssets: MigrationResult['migratedAssets'] = [];

    // Projekt-Ordner finden oder erstellen
    let projectFolder: any;
    try {
      // Suche nach dem Projekt-Ordner
      const foldersQuery = query(
        collection(db, 'folders'),
        where('organizationId', '==', organizationId),
        where('name', '==', projectId),
        where('isDeleted', '==', false)
      );
      const foldersSnapshot = await getDocs(foldersQuery);

      if (!foldersSnapshot.empty) {
        projectFolder = {
          id: foldersSnapshot.docs[0].id,
          ...foldersSnapshot.docs[0].data()
        };
      } else {
        // Projekt-Ordner erstellen, falls nicht vorhanden
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          const projectName = projectDoc.data().title || projectId;
          // Erstelle Ordner direkt in Firestore
          const folderRef = doc(collection(db, 'folders'));
          const folderData = {
            organizationId,
            name: projectName,
            parentId: null,
            isDeleted: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(folderRef, folderData);
          projectFolder = { id: folderRef.id, ...folderData };
        } else {
          throw new Error(`Projekt ${projectId} nicht gefunden`);
        }
      }
    } catch (error) {
      console.error('Fehler beim Finden/Erstellen des Projekt-Ordners:', error);
      throw error;
    }

    // Assets migrieren
    for (const asset of assets) {
      try {
        console.log(`Migriere Asset ${asset.assetId} (${asset.type})...`);

        // 1. Hole Original-Asset aus Firestore (unterschiedliche Collections je nach Typ)
        let originalAssetData: any;
        let fileName: string;

        if (asset.type === 'pdf') {
          // PDFs sind in pdf_versions collection
          const pdfDoc = await getDoc(doc(db, 'pdf_versions', asset.assetId));
          if (!pdfDoc.exists()) {
            throw new Error(`PDF ${asset.assetId} nicht in Firestore gefunden`);
          }
          originalAssetData = pdfDoc.data();
          fileName = asset.fileName || originalAssetData.fileName || `document_${asset.assetId}.pdf`;
        } else {
          // Key Visuals und Attachments sind in media_assets collection
          const originalAssetDoc = await getDoc(doc(db, 'media_assets', asset.assetId));
          if (!originalAssetDoc.exists()) {
            throw new Error(`Asset ${asset.assetId} nicht in Firestore gefunden`);
          }
          originalAssetData = originalAssetDoc.data();
          fileName = asset.fileName || originalAssetData.fileName || `asset_${asset.assetId}`;
        }

        // 1.5. Download und re-upload der Datei für echte Migration
        if (!asset.downloadUrl) {
          throw new Error(`Keine Download-URL für Asset ${asset.assetId}`);
        }

        console.log(`Lade Datei herunter: ${asset.downloadUrl}`);

        // Fetch mit CORS-freundlichen Optionen
        const response = await fetch(asset.downloadUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Download der Datei: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        console.log(`Datei geladen: ${fileName}, Größe: ${blob.size} bytes`);

        // 2. Ziel-Ordner finden oder erstellen
        let targetFolder: any;
        const targetFoldersQuery = query(
          collection(db, 'folders'),
          where('organizationId', '==', organizationId),
          where('parentId', '==', projectFolder.id),
          where('name', '==', asset.targetFolder),
          where('isDeleted', '==', false)
        );
        const targetFoldersSnapshot = await getDocs(targetFoldersQuery);

        if (!targetFoldersSnapshot.empty) {
          targetFolder = {
            id: targetFoldersSnapshot.docs[0].id,
            ...targetFoldersSnapshot.docs[0].data()
          };
        } else {
          // Erstelle Ziel-Ordner direkt in Firestore
          const targetFolderRef = doc(collection(db, 'folders'));
          const targetFolderData = {
            organizationId,
            name: asset.targetFolder,
            parentId: projectFolder.id,
            isDeleted: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(targetFolderRef, targetFolderData);
          targetFolder = { id: targetFolderRef.id, ...targetFolderData };
        }

        // 3. Migration basierend auf Asset-Typ
        let newAssetId: string;

        if (asset.type === 'pdf') {
          // PDFs bleiben wo sie sind, wir updaten nur die Referenz
          newAssetId = asset.assetId;

          const newAsset = {
            id: asset.assetId,
            downloadUrl: originalAssetData.downloadUrl,
            fileName
          };

          // Update PDF Version mit neuer Ordner-Info
          await updateDoc(doc(db, 'pdf_versions', asset.assetId), {
            folderId: targetFolder.id,
            migratedAt: serverTimestamp(),
            isMigrated: true
          });

          // Firestore-Referenzen aktualisieren (bleibt gleich)
          await this.updateFirestoreReferences(
            campaignId,
            campaign,
            asset.type,
            asset.assetId,
            newAsset,
            targetFolder.id
          );
        } else {
          // Für Media Assets: Erstelle neue Referenz
          const newAssetRef = doc(collection(db, 'media_assets'));
          newAssetId = newAssetRef.id;

          // Bereite Daten vor und filtere undefined Werte
          const newAssetData: any = {
            id: newAssetRef.id,
            fileName,
            fileType: originalAssetData.fileType || '',
            folderId: targetFolder.id,
            organizationId,
            clientId: campaign.clientId || '',
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            migratedFrom: asset.assetId,
            isMigrated: true,
            downloadUrl: originalAssetData.downloadUrl
          };

          // Füge nur existierende Felder hinzu
          if (originalAssetData.storageRef) {
            newAssetData.storageRef = originalAssetData.storageRef;
          }
          if (originalAssetData.storagePath) {
            newAssetData.storagePath = originalAssetData.storagePath;
          }
          if (originalAssetData.description) {
            newAssetData.description = originalAssetData.description;
          }
          if (originalAssetData.tags) {
            newAssetData.tags = originalAssetData.tags;
          }
          if (originalAssetData.metadata) {
            newAssetData.metadata = originalAssetData.metadata;
          }

          await setDoc(newAssetRef, newAssetData);

          const newAsset = {
            id: newAssetRef.id,
            downloadUrl: originalAssetData.downloadUrl,
            fileName,
            ...newAssetData
          };

          // 4. Firestore-Referenzen aktualisieren
          await this.updateFirestoreReferences(
            campaignId,
            campaign,
            asset.type,
            asset.assetId,
            newAsset,
            targetFolder.id
          );
        }

        successCount++;
        migratedAssets.push({
          originalId: asset.assetId,
          newId: newAssetId,
          type: asset.type
        });

        console.log(`Asset ${asset.assetId} erfolgreich migriert zu ${newAssetId}`);
      } catch (error) {
        console.error(`Fehler bei Migration von Asset ${asset.assetId}:`, error);
        errors.push({
          assetId: asset.assetId,
          error: error as Error
        });
      }
    }

    return { successCount, errors, migratedAssets };
  }

  /**
   * Aktualisiert alle Firestore-Referenzen nach der Asset-Migration
   */
  private async updateFirestoreReferences(
    campaignId: string,
    campaign: PRCampaign,
    assetType: AssetToMigrate['type'],
    originalAssetId: string,
    newAsset: MediaAsset,
    targetFolderId: string
  ): Promise<void> {
    const batch = writeBatch(db);

    try {
      switch (assetType) {
        case 'keyVisual':
          // Campaign Document Update
          if (!campaignId) {
            throw new Error('Campaign ID fehlt');
          }
          const campaignRef = doc(db, 'pr_campaigns', campaignId);
          batch.update(campaignRef, {
            keyVisual: {
              assetId: newAsset.id || '',
              url: newAsset.downloadUrl
            },
            updatedAt: serverTimestamp()
          });

          // Neues Media Asset Document markieren
          if (newAsset.id) {
            const newKeyVisualRef = doc(db, 'media_assets', newAsset.id);
            batch.update(newKeyVisualRef, {
              migratedAt: serverTimestamp(),
              originalAssetId: originalAssetId,
              isMigrated: true
            });
          }

          // Original Asset als migriert markieren (nicht löschen)
          const oldKeyVisualRef = doc(db, 'media_assets', originalAssetId);
          batch.update(oldKeyVisualRef, {
            migratedToId: newAsset.id || '',
            migratedAt: serverTimestamp()
          });
          break;

        case 'attachment':
          // Campaign Attachments Array Update
          const updatedAttachments = campaign.attachedAssets?.map((att: any) =>
            att.assetId === originalAssetId
              ? { ...att, assetId: newAsset.id || '' }
              : att
          ) || [];

          if (!campaignId) {
            throw new Error('Campaign ID fehlt');
          }
          batch.update(doc(db, 'pr_campaigns', campaignId), {
            attachedAssets: updatedAttachments,
            updatedAt: serverTimestamp()
          });

          // Neues Media Asset Document markieren
          if (newAsset.id) {
            const newAttachmentRef = doc(db, 'media_assets', newAsset.id);
            batch.update(newAttachmentRef, {
              migratedAt: serverTimestamp(),
              originalAssetId: originalAssetId,
              isMigrated: true
            });
          }

          // Original Asset als migriert markieren
          const oldAttachmentRef = doc(db, 'media_assets', originalAssetId);
          batch.update(oldAttachmentRef, {
            migratedToId: newAsset.id || '',
            migratedAt: serverTimestamp()
          });
          break;

        case 'pdf':
          // PDF Versions Document Update
          const pdfRef = doc(db, 'pdf_versions', originalAssetId);
          batch.update(pdfRef, {
            downloadUrl: newAsset.downloadUrl,
            folderId: targetFolderId,
            migratedAt: serverTimestamp(),
            originalDownloadUrl: newAsset.downloadUrl, // Backup für Rollback
            isMigrated: true
          });
          break;
      }

      await batch.commit();
      console.log(`Firestore-Referenzen für ${assetType} ${originalAssetId} aktualisiert`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Firestore-Referenzen:', error);
      throw error;
    }
  }

  /**
   * Prüft, ob eine Campaign bereits migrierte Assets hat
   */
  async hasMigratedAssets(campaignId: string): Promise<boolean> {
    try {
      // Prüfe ob es PDF-Versionen mit isMigrated flag gibt
      const pdfQuery = query(
        collection(db, 'pdf_versions'),
        where('campaignId', '==', campaignId),
        where('isMigrated', '==', true)
      );
      const pdfSnapshot = await getDocs(pdfQuery);

      if (!pdfSnapshot.empty) {
        return true;
      }

      // Prüfe Campaign-Dokument für migrierte Key Visuals
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      if (campaignDoc.exists()) {
        const keyVisualId = campaignDoc.data().keyVisualId;
        if (keyVisualId) {
          const keyVisualDoc = await getDoc(doc(db, 'media_assets', keyVisualId));
          if (keyVisualDoc.exists() && keyVisualDoc.data().isMigrated) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Fehler beim Prüfen auf migrierte Assets:', error);
      return false;
    }
  }
}

export const assetMigrationService = new AssetMigrationService();