import { db } from '@/lib/firebase/client-init';
import { doc, getDoc } from 'firebase/firestore';
import { mediaService } from '@/lib/firebase/media-service';

/**
 * Download Handler für PDF-Reports
 *
 * Verantwortlich für:
 * - Upload zu Firebase Storage
 * - Folder-Management (Analysen/Pressemeldungen)
 * - Client-Media vs. Organization-Media
 */
export class DownloadHandler {
  /**
   * Uploaded PDF zu Firebase Storage
   *
   * @param pdfFile - PDF File
   * @param campaignId - Campaign ID
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Download URL & File Size
   */
  async upload(
    pdfFile: File,
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    // Campaign-Daten laden
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
    const campaignData = campaignDoc?.exists() ? campaignDoc.data() : null;

    // Falls Campaign mit Project + Client verknüpft ist
    if (campaignData?.projectId && campaignData?.clientId) {
      return this.uploadToClientMedia(
        pdfFile,
        campaignData.projectId,
        campaignData.clientId,
        organizationId,
        userId
      );
    }

    // Fallback: Organization-Media
    return this.uploadToOrganizationMedia(pdfFile, organizationId, userId);
  }

  /**
   * Upload zu Client-Media (Project-Ordner)
   *
   * Sucht nach: Project-Ordner → Analysen → Pressemeldungen (Fallback)
   */
  private async uploadToClientMedia(
    pdfFile: File,
    projectId: string,
    clientId: string,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

    // Projekt-Namen laden
    const projectName = await this.getProjectName(projectId);

    // Projekt-Ordner finden
    const projectFolder = allFolders.find(folder =>
      folder.name.includes('P-') && folder.name.includes(projectName)
    );

    if (!projectFolder) {
      throw new Error('Projekt-Ordner nicht gefunden');
    }

    // Ziel-Ordner finden (Analysen oder Pressemeldungen)
    const targetFolderId = this.findTargetFolder(allFolders, projectFolder.id || '');

    if (!targetFolderId) {
      throw new Error('Zielordner nicht gefunden');
    }

    // Upload zu Client-Media (skipLimitCheck = true für PDF-Reports)
    const asset = await mediaService.uploadClientMedia(
      pdfFile,
      organizationId,
      clientId,
      targetFolderId,
      undefined,
      { userId },
      true // skipLimitCheck - keine Storage-Limits für PDF-Reporting
    );

    return {
      pdfUrl: asset.downloadUrl,
      fileSize: pdfFile.size
    };
  }

  /**
   * Upload zu Organization-Media (kein Project)
   */
  private async uploadToOrganizationMedia(
    pdfFile: File,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    // Upload zu Organization-Media (skipLimitCheck = true für PDF-Reports)
    const asset = await mediaService.uploadMedia(
      pdfFile,
      organizationId,
      undefined,
      undefined,
      3,
      { userId },
      true // skipLimitCheck - keine Storage-Limits für PDF-Reporting
    );

    return {
      pdfUrl: asset.downloadUrl,
      fileSize: pdfFile.size
    };
  }

  /**
   * Lädt Projekt-Namen aus Firestore
   */
  private async getProjectName(projectId: string): Promise<string> {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const project = projectDoc.data();
        return project?.title || 'Monitoring';
      }
    } catch (error) {
      console.warn('Projekt-Daten konnten nicht geladen werden:', error);
    }
    return 'Monitoring';
  }

  /**
   * Findet Ziel-Ordner (Analysen oder Pressemeldungen)
   */
  private findTargetFolder(
    allFolders: any[],
    projectFolderId: string
  ): string | null {
    // Zuerst Analysen-Ordner suchen
    let targetFolder = allFolders.find(folder =>
      folder.parentFolderId === projectFolderId && folder.name === 'Analysen'
    );

    // Fallback: Pressemeldungen-Ordner
    if (!targetFolder) {
      targetFolder = allFolders.find(folder =>
        folder.parentFolderId === projectFolderId && folder.name === 'Pressemeldungen'
      );
    }

    return targetFolder?.id || projectFolderId;
  }
}

// Singleton Export
export const downloadHandler = new DownloadHandler();
