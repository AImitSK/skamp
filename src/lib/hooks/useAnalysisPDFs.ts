import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';

/**
 * Hook: useAnalysisPDFs
 * Lädt die Liste der Analyse-PDFs für eine Kampagne
 *
 * @param campaignId - Die ID der Kampagne
 * @param organizationId - Die ID der Organisation
 * @param projectId - Die ID des Projekts (optional, wird aus campaign geladen)
 * @param enabled - Ob die Query aktiv sein soll (default: true)
 * @returns Query mit PDFs und Folder-Link
 */
export function useAnalysisPDFs(
  campaignId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analysisPDFs', campaignId, organizationId, projectId],
    queryFn: async () => {
      if (!campaignId || !organizationId || !projectId) {
        return {
          pdfs: [],
          folderLink: null,
        };
      }

      try {
        // Lade Folder-Struktur
        const folderStructure = await projectService.getProjectFolderStructure(projectId, {
          organizationId,
        });

        if (!folderStructure?.subfolders) {
          return {
            pdfs: [],
            folderLink: null,
          };
        }

        // Finde Analysen-Ordner
        const analysenFolder = folderStructure.subfolders.find((f: any) => f.name === 'Analysen');

        if (!analysenFolder) {
          return {
            pdfs: [],
            folderLink: null,
          };
        }

        // Lade Media Assets
        const assets = await mediaService.getMediaAssets(organizationId, analysenFolder.id);

        // Filter: Nur PDFs für diese Kampagne
        const campaignPDFs = assets.filter(
          (asset) => asset.fileType === 'application/pdf'
        );

        // Folder-Link generieren
        const folderLink = `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolder.id}`;

        return {
          pdfs: campaignPDFs,
          folderLink,
        };
      } catch (error) {
        console.error('Fehler beim Laden der Analyse-PDFs:', error);
        return {
          pdfs: [],
          folderLink: null,
        };
      }
    },
    enabled: enabled && !!campaignId && !!organizationId && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
    gcTime: 5 * 60 * 1000,    // 5 Minuten
  });
}
