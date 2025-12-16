import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { mediaService } from '@/lib/firebase/media-service';
import { toastService } from '@/lib/utils/toast';

/**
 * Hook: usePDFDeleteMutation
 * Mutation zum Löschen eines PDF-Reports
 *
 * @param campaignId - Die ID der Kampagne (für Query-Invalidierung)
 * @param organizationId - Die ID der Organisation (für Query-Invalidierung)
 * @param projectId - Die ID des Projekts (für Query-Invalidierung)
 * @returns Mutation zum Löschen eines PDFs
 */
export function usePDFDeleteMutation(
  campaignId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined
) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (pdf: any) => {
      // Lösche PDF über mediaService
      await mediaService.deleteMediaAsset(pdf);
    },
    onSuccess: () => {
      // Invalidiere PDF-Liste
      queryClient.invalidateQueries({
        queryKey: ['analysisPDFs', campaignId, organizationId, projectId],
      });
      toastService.success(tToast('pdfDeleted'));
    },
    onError: (error) => {
      console.error('Fehler beim Löschen des PDFs:', error);
      toastService.error(tToast('pdfDeleteError'));
    },
  });
}
