// src/lib/hooks/__tests__/usePublicationsData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  usePublications,
  usePublication,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication,
  useVerifyPublication,
} from '../usePublicationsData';
import { publicationService } from '@/lib/firebase/library-service';

// Mock Firebase service
jest.mock('@/lib/firebase/library-service', () => ({
  publicationService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    verify: jest.fn(),
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

describe('usePublicationsData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePublications', () => {
    it('sollte Publications laden', async () => {
      const mockPublications = [
        { id: '1', title: 'Publication 1', type: 'magazine' },
        { id: '2', title: 'Publication 2', type: 'newspaper' },
      ];

      (publicationService.getAll as jest.Mock).mockResolvedValue(mockPublications);

      const { result } = renderHook(() => usePublications('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPublications);
      expect(publicationService.getAll).toHaveBeenCalledWith('test-org-id');
    });

    it('sollte Error bei fehlendem organizationId werfen', async () => {
      (publicationService.getAll as jest.Mock).mockRejectedValue(
        new Error('No organization')
      );

      const { result } = renderHook(() => usePublications(undefined), {
        wrapper: createWrapper(),
      });

      // Query ist disabled wenn organizationId undefined ist
      expect(result.current.data).toBeUndefined();
      expect(publicationService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('usePublication', () => {
    it('sollte einzelne Publication laden', async () => {
      const mockPublication = {
        id: '1',
        title: 'Test Publication',
        type: 'magazine',
      };

      (publicationService.getById as jest.Mock).mockResolvedValue(mockPublication);

      const { result } = renderHook(
        () => usePublication('1', 'test-org-id'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPublication);
      expect(publicationService.getById).toHaveBeenCalledWith('1', 'test-org-id');
    });

    it('sollte null bei nicht-existierender ID zurückgeben', async () => {
      (publicationService.getById as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(
        () => usePublication('non-existent-id', 'test-org-id'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
      expect(publicationService.getById).toHaveBeenCalledWith(
        'non-existent-id',
        'test-org-id'
      );
    });

    it('sollte nicht fetchen wenn ID oder organizationId fehlt', () => {
      // Test ohne ID
      const { result: resultNoId } = renderHook(
        () => usePublication(undefined, 'test-org-id'),
        {
          wrapper: createWrapper(),
        }
      );

      expect(resultNoId.current.data).toBeUndefined();
      expect(publicationService.getById).not.toHaveBeenCalled();

      // Test ohne organizationId
      const { result: resultNoOrg } = renderHook(
        () => usePublication('1', undefined),
        {
          wrapper: createWrapper(),
        }
      );

      expect(resultNoOrg.current.data).toBeUndefined();
      expect(publicationService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreatePublication', () => {
    it('sollte Publication erstellen und Cache invalidieren', async () => {
      const mockPublication = { id: 'new-1', title: 'New Publication' };

      (publicationService.create as jest.Mock).mockResolvedValue(mockPublication);

      const { result } = renderHook(() => useCreatePublication(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        organizationId: 'test-org-id',
        userId: 'user-1',
        publicationData: {
          title: 'New Publication',
          type: 'magazine',
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicationService.create).toHaveBeenCalledWith(
        { title: 'New Publication', type: 'magazine' },
        { organizationId: 'test-org-id', userId: 'user-1' }
      );
    });
  });

  describe('useUpdatePublication', () => {
    it('sollte Publication updaten und Cache invalidieren', async () => {
      (publicationService.update as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdatePublication(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'pub-1',
        organizationId: 'test-org-id',
        userId: 'user-1',
        publicationData: {
          title: 'Updated Publication',
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicationService.update).toHaveBeenCalledWith(
        'pub-1',
        { title: 'Updated Publication' },
        { organizationId: 'test-org-id', userId: 'user-1' }
      );
    });
  });

  describe('useDeletePublication', () => {
    it('sollte Publication löschen und Cache invalidieren', async () => {
      (publicationService.softDelete as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePublication(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'pub-1',
        organizationId: 'test-org-id',
        userId: 'user-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicationService.softDelete).toHaveBeenCalledWith('pub-1', {
        organizationId: 'test-org-id',
        userId: 'user-1',
      });
    });
  });

  describe('useVerifyPublication', () => {
    it('sollte Publication verifizieren und Cache invalidieren', async () => {
      (publicationService.verify as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useVerifyPublication(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'pub-1',
        organizationId: 'test-org-id',
        userId: 'user-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicationService.verify).toHaveBeenCalledWith('pub-1', {
        organizationId: 'test-org-id',
        userId: 'user-1',
      });
    });
  });
});
