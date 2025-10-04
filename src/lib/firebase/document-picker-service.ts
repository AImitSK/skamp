import { documentContentService } from './document-content-service';
import { mediaService } from './media-service';
import type { DocumentContext } from '@/types/ai';

class DocumentPickerService {
  /**
   * Lädt alle .celero-doc Dokumente aus dem Dokumente-Ordner
   */
  async getProjectDocuments(
    organizationId: string,
    dokumenteFolderId: string
  ): Promise<DocumentContext[]> {
    try {
      // 1. Lade alle Assets aus Dokumente-Ordner
      const assets = await mediaService.getMediaAssets(
        organizationId,
        dokumenteFolderId
      );

      // 2. Filtere nur .celero-doc Dateien
      const celeroDocAssets = assets.filter(
        asset => asset.fileType === 'celero-doc' ||
                 asset.fileName?.endsWith('.celero-doc')
      );

      // 3. Lade Content für jedes Dokument
      const documentsPromises = celeroDocAssets.map(async (asset) => {
        if (!asset.contentRef) {
          console.warn(`Asset ${asset.id} hat keine contentRef`);
          return null;
        }

        const content = await documentContentService.loadDocument(asset.contentRef);
        if (!content) return null;

        const plainText = this.stripHTML(content.content);
        const excerpt = plainText.substring(0, 500);
        const wordCount = plainText.split(/\s+/).length;

        return {
          id: asset.contentRef,
          fileName: asset.fileName,
          plainText,
          excerpt,
          wordCount,
          createdAt: asset.createdAt?.toDate() || new Date()
        } as DocumentContext;
      });

      const documents = await Promise.all(documentsPromises);
      return documents.filter(doc => doc !== null) as DocumentContext[];

    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Dokumente:', error);
      throw error;
    }
  }

  /**
   * Lädt spezifische Dokumente nach IDs
   */
  async loadDocuments(documentIds: string[]): Promise<DocumentContext[]> {
    const documentsPromises = documentIds.map(async (id) => {
      const content = await documentContentService.loadDocument(id);
      if (!content) return null;

      const plainText = this.stripHTML(content.content);
      const excerpt = plainText.substring(0, 500);
      const wordCount = plainText.split(/\s+/).length;

      return {
        id,
        fileName: `Dokument ${id.substring(0, 8)}`, // Fallback
        plainText,
        excerpt,
        wordCount,
        createdAt: content.createdAt?.toDate() || new Date()
      } as DocumentContext;
    });

    const documents = await Promise.all(documentsPromises);
    return documents.filter(doc => doc !== null) as DocumentContext[];
  }

  /**
   * Entfernt HTML-Tags und gibt Plain Text zurück
   */
  private stripHTML(html: string): string {
    // Client-Side: Browser DOM verwenden
    if (typeof window !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    }

    // Server-Side: Simple Regex (nicht perfekt, aber ausreichend)
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validiert Kontext-Größe
   */
  validateContextSize(documents: DocumentContext[]): {
    valid: boolean;
    totalSize: number;
    message?: string;
  } {
    const MAX_DOCUMENTS = 3;
    const MAX_SIZE_PER_DOC = 5000;
    const MAX_TOTAL_SIZE = 15000;

    if (documents.length > MAX_DOCUMENTS) {
      return {
        valid: false,
        totalSize: 0,
        message: `Maximal ${MAX_DOCUMENTS} Dokumente erlaubt`
      };
    }

    const totalSize = documents.reduce(
      (sum, doc) => sum + doc.plainText.length,
      0
    );

    if (totalSize > MAX_TOTAL_SIZE) {
      return {
        valid: false,
        totalSize,
        message: `Gesamtgröße überschreitet ${MAX_TOTAL_SIZE} Zeichen`
      };
    }

    const oversizedDocs = documents.filter(
      doc => doc.plainText.length > MAX_SIZE_PER_DOC
    );

    if (oversizedDocs.length > 0) {
      return {
        valid: false,
        totalSize,
        message: `Dokument "${oversizedDocs[0].fileName}" ist zu groß (>${MAX_SIZE_PER_DOC} Zeichen)`
      };
    }

    return { valid: true, totalSize };
  }
}

export const documentPickerService = new DocumentPickerService();
