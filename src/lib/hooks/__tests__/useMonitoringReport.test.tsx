import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePDFReportGenerator } from '../useMonitoringReport';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { toastService } from '@/lib/utils/toast';
import React from 'react';

jest.mock('@/lib/firebase/monitoring-report-service');
jest.mock('@/lib/utils/toast');

describe('usePDFReportGenerator', () => {
  let queryClient: QueryClient;
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    jest.clearAllMocks();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Success Flow', () => {
    it('sollte PDF erfolgreich generieren und Success-Toast anzeigen', async () => {
      const mockResult = {
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(monitoringReportService.generatePDFReport).toHaveBeenCalledWith(
        'campaign-123',
        'org-456',
        'user-789'
      );

      expect(toastService.success).toHaveBeenCalledWith('PDF-Report erfolgreich generiert');
    });

    it('sollte PDF in neuem Tab öffnen', async () => {
      const mockResult = {
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://example.com/report.pdf',
        '_blank'
      );
    });

    it('sollte analysisPDFs Query invalidieren', async () => {
      const mockResult = {
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(mockResult);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['analysisPDFs', 'campaign-123']
      });
    });

    it('sollte isPending während Generierung true sein', async () => {
      const mockResult = {
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      (monitoringReportService.generatePDFReport as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockResult), 100);
          })
      );

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isPending).toBe(true));
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

  describe('Error Flow', () => {
    beforeEach(() => {
      windowOpenSpy.mockClear();
    });

    it('sollte Error-Toast anzeigen bei Fehler', async () => {
      const mockError = new Error('PDF-Generation failed');

      (monitoringReportService.generatePDFReport as jest.Mock).mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(toastService.error).toHaveBeenCalledWith('PDF-Export fehlgeschlagen');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'PDF-Generation fehlgeschlagen:',
        mockError
      );

      consoleErrorSpy.mockRestore();
    });

    it('sollte kein window.open bei Fehler aufrufen', async () => {
      const mockError = new Error('PDF-Generation failed');

      (monitoringReportService.generatePDFReport as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it('sollte keine Query-Invalidierung bei Fehler durchführen', async () => {
      const mockError = new Error('PDF-Generation failed');

      (monitoringReportService.generatePDFReport as jest.Mock).mockRejectedValue(mockError);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Calls', () => {
    it('sollte mehrere PDF-Generierungen hintereinander durchführen', async () => {
      const mockResult1 = {
        pdfUrl: 'https://example.com/report1.pdf',
        fileSize: 1024
      };

      const mockResult2 = {
        pdfUrl: 'https://example.com/report2.pdf',
        fileSize: 2048
      };

      (monitoringReportService.generatePDFReport as jest.Mock)
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-1',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://example.com/report1.pdf',
        '_blank'
      );

      result.current.mutate({
        campaignId: 'campaign-2',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://example.com/report2.pdf',
        '_blank'
      );

      expect(monitoringReportService.generatePDFReport).toHaveBeenCalledTimes(2);
    });

    it('sollte Query für jede Campaign-ID separat invalidieren', async () => {
      const mockResult = {
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 1024
      };

      (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(mockResult);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => usePDFReportGenerator(), { wrapper });

      result.current.mutate({
        campaignId: 'campaign-1',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['analysisPDFs', 'campaign-1']
      });

      result.current.mutate({
        campaignId: 'campaign-2',
        organizationId: 'org-456',
        userId: 'user-789'
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['analysisPDFs', 'campaign-2']
      });
    });
  });
});
