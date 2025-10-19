import { useState } from 'react';
import { getMediaAssets, deleteMediaAsset } from '@/lib/firebase/media-assets-service';
import { documentContentService } from '@/lib/firebase/document-content-service';

interface UseFileActionsProps {
  organizationId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * useFileActions Hook
 *
 * Verwaltet alle File-Operationen (Delete, Download, Move)
 */
export function useFileActions({
  organizationId,
  onSuccess,
  onError
}: UseFileActionsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleDeleteAsset = (assetId: string, fileName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Datei löschen',
      message: `Möchten Sie die Datei "${fileName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      onConfirm: () => confirmDeleteAsset(assetId, fileName)
    });
  };

  const confirmDeleteAsset = async (assetId: string, fileName: string, selectedFolderId?: string) => {
    setConfirmDialog(null);

    try {
      const assets = await getMediaAssets(organizationId, selectedFolderId);
      const assetToDelete = assets.find(asset => asset.id === assetId);

      if (!assetToDelete) {
        onError?.('Datei konnte nicht gefunden werden.');
        return;
      }

      await deleteMediaAsset(assetToDelete);
      onSuccess?.(`Datei "${fileName}" wurde erfolgreich gelöscht.`);
    } catch (error) {
      console.error('Fehler beim Löschen der Datei:', error);
      onError?.('Fehler beim Löschen der Datei. Bitte versuchen Sie es erneut.');
    }
  };

  // Convert HTML to RTF
  const convertHtmlToRtf = (html: string, title: string): string => {
    let text = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\\par\\fs28\\b $1\\b0\\fs24\\par\\par')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\\par\\fs26\\b $1\\b0\\fs24\\par\\par')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\\par\\fs24\\b $1\\b0\\fs24\\par\\par')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\b $1\\b0')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\b $1\\b0')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\i $1\\i0')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\i $1\\i0')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '\\ul $1\\ul0')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\\par\\par')
      .replace(/<br[^>]*>/gi, '\\par')
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\\par')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\bullet $1\\par')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 ${text}
}`;
  };

  const handleDownloadDocument = async (asset: any) => {
    try {
      if (asset.contentRef) {
        const content = await documentContentService.loadDocument(asset.contentRef);
        if (content) {
          const rtfContent = convertHtmlToRtf(content.content, asset.fileName.replace('.celero-doc', ''));

          const blob = new Blob([rtfContent], { type: 'application/rtf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${asset.fileName.replace('.celero-doc', '')}.rtf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          alert('Dokument-Inhalt konnte nicht geladen werden.');
        }
      } else if (asset.downloadUrl) {
        const a = document.createElement('a');
        a.href = asset.downloadUrl;
        a.download = asset.fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('Diese Datei kann nicht heruntergeladen werden - keine downloadUrl verfügbar.');
      }
    } catch (error) {
      console.error('Fehler beim Download:', error);
      alert('Fehler beim Download des Dokuments.');
    }
  };

  const handleAssetClick = (asset: any, onEdit: (asset: any) => void) => {
    const isEditableDocument = asset.fileType === 'celero-doc' ||
                              asset.fileName?.endsWith('.celero-doc');

    if (isEditableDocument) {
      onEdit(asset);
    } else {
      window.open(asset.downloadUrl, '_blank');
    }
  };

  return {
    confirmDialog,
    setConfirmDialog,
    handleDeleteAsset,
    handleDownloadDocument,
    handleAssetClick
  };
}
