// src/lib/hooks/__tests__/useMarkenDNA.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useMarkenDNADocument,
  useMarkenDNADocuments,
  useMarkenDNAStatus,
  useAllCustomersMarkenDNAStatus,
  useMarkenDNAHash,
  useCreateMarkenDNADocument,
  useUpdateMarkenDNADocument,
  useDeleteMarkenDNADocument,
  useDeleteAllMarkenDNADocuments,
} from '../useMarkenDNA';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Service
jest.mock('@/lib/firebase/marken-dna-service', () => ({
  markenDNAService: {
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    getCompanyStatus: jest.fn(),
    getAllCustomersStatus: jest.fn(),
    computeMarkenDNAHash: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    deleteAllDocuments: jest.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return Wrapper;
}

describe('useMarkenDNA Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMarkenDNADocument', () => {
    it('laedt ein einzelnes Marken-DNA Dokument', async () => {
      const mockDocument = {
        id: 'briefing',
        companyId: 'comp-123',
        companyName: 'Test Company',
        organizationId: 'org-123',
        type: 'briefing' as const,
        title: 'Briefing-Check',
        content: '<p>Test content</p>',
        plainText: 'Test content',
        status: 'completed' as const,
        completeness: 100,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'user-123',
        updatedBy: 'user-123',
      };

      (markenDNAService.getDocument as jest.Mock).mockResolvedValue(mockDocument);

      const { result } = renderHook(() => useMarkenDNADocument('comp-123', 'briefing'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDocument);
      expect(markenDNAService.getDocument).toHaveBeenCalledWith('comp-123', 'briefing');
    });

    it('laedt nicht wenn companyId undefined ist', () => {
      const { result } = renderHook(() => useMarkenDNADocument(undefined, 'briefing'), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(markenDNAService.getDocument).not.toHaveBeenCalled();
    });
  });

  describe('useMarkenDNADocuments', () => {
    it('laedt alle Marken-DNA Dokumente eines Kunden', async () => {
      const mockDocuments = [
        {
          id: 'briefing',
          companyId: 'comp-123',
          type: 'briefing' as const,
          title: 'Briefing-Check',
        },
        {
          id: 'swot',
          companyId: 'comp-123',
          type: 'swot' as const,
          title: 'SWOT-Analyse',
        },
      ];

      (markenDNAService.getDocuments as jest.Mock).mockResolvedValue(mockDocuments);

      const { result } = renderHook(() => useMarkenDNADocuments('comp-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDocuments);
      expect(markenDNAService.getDocuments).toHaveBeenCalledWith('comp-123');
    });

    it('laedt nicht wenn companyId undefined ist', () => {
      const { result } = renderHook(() => useMarkenDNADocuments(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(markenDNAService.getDocuments).not.toHaveBeenCalled();
    });
  });

  describe('useMarkenDNAStatus', () => {
    it('laedt den Status eines Kunden', async () => {
      const mockStatus = {
        companyId: 'comp-123',
        companyName: 'Test Company',
        documents: {
          briefing: true,
          swot: true,
          audience: false,
          positioning: false,
          goals: false,
          messages: false,
        },
        completeness: 50,
        isComplete: false,
      };

      (markenDNAService.getCompanyStatus as jest.Mock).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useMarkenDNAStatus('comp-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStatus);
      expect(markenDNAService.getCompanyStatus).toHaveBeenCalledWith('comp-123');
    });
  });

  describe('useAllCustomersMarkenDNAStatus', () => {
    it('laedt den Status aller Kunden einer Organisation', async () => {
      const mockStatuses = [
        {
          companyId: 'comp-123',
          companyName: 'Company 1',
          documents: {
            briefing: true,
            swot: true,
            audience: true,
            positioning: true,
            goals: true,
            messages: true,
          },
          completeness: 100,
          isComplete: true,
        },
        {
          companyId: 'comp-456',
          companyName: 'Company 2',
          documents: {
            briefing: true,
            swot: false,
            audience: false,
            positioning: false,
            goals: false,
            messages: false,
          },
          completeness: 20,
          isComplete: false,
        },
      ];

      (markenDNAService.getAllCustomersStatus as jest.Mock).mockResolvedValue(mockStatuses);

      const { result } = renderHook(() => useAllCustomersMarkenDNAStatus('org-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStatuses);
      expect(markenDNAService.getAllCustomersStatus).toHaveBeenCalledWith('org-123');
    });
  });

  describe('useMarkenDNAHash', () => {
    it('berechnet den Hash aller Marken-DNA Dokumente', async () => {
      const mockHash = 'abc123def456';

      (markenDNAService.computeMarkenDNAHash as jest.Mock).mockResolvedValue(mockHash);

      const { result } = renderHook(() => useMarkenDNAHash('comp-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHash);
      expect(markenDNAService.computeMarkenDNAHash).toHaveBeenCalledWith('comp-123');
    });
  });

  describe('useCreateMarkenDNADocument', () => {
    it('erstellt ein neues Marken-DNA Dokument', async () => {
      (markenDNAService.createDocument as jest.Mock).mockResolvedValue('briefing');

      const { result } = renderHook(() => useCreateMarkenDNADocument(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        data: {
          companyId: 'comp-123',
          companyName: 'Test Company',
          type: 'briefing',
          content: '<p>Test content</p>',
          plainText: 'Test content',
          status: 'draft',
          completeness: 50,
        },
        organizationId: 'org-123',
        userId: 'user-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(markenDNAService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp-123',
          type: 'briefing',
        }),
        {
          organizationId: 'org-123',
          userId: 'user-123',
        }
      );
    });
  });

  describe('useUpdateMarkenDNADocument', () => {
    it('aktualisiert ein Marken-DNA Dokument', async () => {
      (markenDNAService.updateDocument as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateMarkenDNADocument(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        companyId: 'comp-123',
        type: 'briefing',
        data: {
          content: '<p>Updated content</p>',
          status: 'completed',
          completeness: 100,
        },
        organizationId: 'org-123',
        userId: 'user-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(markenDNAService.updateDocument).toHaveBeenCalledWith(
        'comp-123',
        'briefing',
        expect.objectContaining({
          content: '<p>Updated content</p>',
          status: 'completed',
        }),
        {
          organizationId: 'org-123',
          userId: 'user-123',
        }
      );
    });
  });

  describe('useDeleteMarkenDNADocument', () => {
    it('loescht ein Marken-DNA Dokument', async () => {
      (markenDNAService.deleteDocument as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteMarkenDNADocument(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        companyId: 'comp-123',
        type: 'briefing',
        organizationId: 'org-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(markenDNAService.deleteDocument).toHaveBeenCalledWith('comp-123', 'briefing');
    });
  });

  describe('useDeleteAllMarkenDNADocuments', () => {
    it('loescht alle Marken-DNA Dokumente eines Kunden', async () => {
      (markenDNAService.deleteAllDocuments as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAllMarkenDNADocuments(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        companyId: 'comp-123',
        organizationId: 'org-123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(markenDNAService.deleteAllDocuments).toHaveBeenCalledWith('comp-123');
    });
  });
});
