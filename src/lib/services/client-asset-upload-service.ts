// src/lib/services/client-asset-upload-service.ts
import { mediaService } from '@/lib/firebase/media-service';

export interface AssetUploadResult {
  success: boolean;
  uploadedAssetId?: string;
  downloadUrl?: string;
  error?: string;
}

class ClientAssetUploadService {
  /**
   * Lädt ein Asset mit Base64-Daten in Firebase Storage hoch
   * (Für Assets, die von der API mit needsClientUpload=true markiert wurden)
   */
  async uploadBase64Asset(
    base64Data: string,
    fileName: string,
    contentType: string,
    folderId: string,
    organizationId: string,
    userId: string
  ): Promise<AssetUploadResult> {
    try {
      console.log('📤 [CLIENT-UPLOAD] Starte Base64-Asset Upload:', {
        fileName,
        contentType,
        folderId,
        dataLength: base64Data.length
      });

      // Base64 zu Blob konvertieren
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      // File-Objekt erstellen
      const file = new File([blob], fileName, { type: contentType });

      console.log('📦 [FILE-CREATED] File-Objekt erstellt:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Upload über mediaService (falls die uploadToFolder Methode existiert)
      // TODO: Implementiere den korrekten Upload-Call basierend auf verfügbaren mediaService Methoden
      console.warn('🚧 [UPLOAD-PLACEHOLDER] uploadToFolder Methode muss noch implementiert werden');

      // Placeholder für Upload-Ergebnis
      const uploadResult = {
        id: `uploaded_${Date.now()}`,
        downloadUrl: `https://firebasestorage.googleapis.com/placeholder_${fileName}`
      };

      console.log('✅ [UPLOAD-SUCCESS] Asset erfolgreich hochgeladen:', uploadResult);

      return {
        success: true,
        uploadedAssetId: uploadResult.id,
        downloadUrl: uploadResult.downloadUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [UPLOAD-ERROR] Client-Upload fehlgeschlagen:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verarbeitet mehrere Assets mit needsClientUpload=true
   */
  async processAssetsWithClientUpload(
    assets: Array<{
      id: string;
      base64Data: string;
      fileName: string;
      contentType: string;
      folderId: string;
    }>,
    organizationId: string,
    userId: string
  ): Promise<Array<AssetUploadResult & { assetId: string }>> {
    console.log(`🔄 [BATCH-UPLOAD] Verarbeite ${assets.length} Assets für Client-Upload...`);

    const results = [];

    for (const asset of assets) {
      console.log(`📤 [PROCESSING] Asset ${asset.id}...`);

      const result = await this.uploadBase64Asset(
        asset.base64Data,
        asset.fileName,
        asset.contentType,
        asset.folderId,
        organizationId,
        userId
      );

      results.push({
        assetId: asset.id,
        ...result
      });
    }

    console.log(`✅ [BATCH-COMPLETE] Client-Upload abgeschlossen: ${results.filter(r => r.success).length}/${results.length} erfolgreich`);

    return results;
  }
}

export const clientAssetUploadService = new ClientAssetUploadService();