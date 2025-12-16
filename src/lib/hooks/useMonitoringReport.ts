import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { toastService } from '@/lib/utils/toast';

export interface PDFReportParams {
  campaignId: string;
  organizationId: string;
  userId: string;
}

export interface PDFReportResult {
  pdfUrl: string;
}

/**
 * React Query Hook für PDF-Report Generierung
 *
 * Features:
 * - Automatische Toast-Benachrichtigungen (Success/Error)
 * - Auto-Download im Browser (neues Tab)
 * - Query Invalidierung für analysisPDFs Liste
 * - Loading State via isPending
 *
 * @example
 * const pdfGenerator = usePDFReportGenerator();
 *
 * pdfGenerator.mutate({
 *   campaignId: 'abc123',
 *   organizationId: 'org456',
 *   userId: 'user789'
 * });
 *
 * <Button disabled={pdfGenerator.isPending}>
 *   {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report'}
 * </Button>
 */
export function usePDFReportGenerator() {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  // Success Handler mit useCallback für Performance-Optimierung
  const handleSuccess = useCallback(
    (result: PDFReportResult, params: PDFReportParams) => {
      // Success Toast
      toastService.success(tToast('pdfReportGenerated'));

      // Auto-Download in neuem Tab
      window.open(result.pdfUrl, '_blank');

      // Invalidate analysisPDFs Query (reload PDF list)
      queryClient.invalidateQueries({
        queryKey: ['analysisPDFs', params.campaignId]
      });
    },
    [queryClient, tToast]
  );

  // Error Handler mit useCallback für Performance-Optimierung
  const handleError = useCallback((error: Error) => {
    console.error('PDF-Generation fehlgeschlagen:', error);
    toastService.error(tToast('pdfError'));
  }, [tToast]);

  return useMutation<PDFReportResult, Error, PDFReportParams>({
    mutationFn: async (params: PDFReportParams) => {
      return monitoringReportService.generatePDFReport(
        params.campaignId,
        params.organizationId,
        params.userId
      );
    },
    onSuccess: handleSuccess,
    onError: handleError
  });
}
