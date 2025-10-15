// src/app/dashboard/library/publications/__tests__/integration/publications-crud-flow.test.tsx
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
} from '@/lib/hooks/usePublicationsData';
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

  return { Wrapper, queryClient };
}

describe('Publications Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete CRUD Flow', () => {
    it('sollte kompletten CRUD-Flow durchlaufen (Create → Read → Update → Delete)', async () => {
      const organizationId = 'test-org-id';
      const userId = 'test-user-id';

      const newPublication = {
        title: 'Test Publication',
        type: 'magazine',
        format: 'print',
      };

      const createdPublication = {
        id: 'pub-1',
        ...newPublication,
      };

      const updatedPublication = {
        ...createdPublication,
        title: 'Updated Test Publication',
      };

      // Setup mocks
      (publicationService.create as jest.Mock).mockResolvedValue(createdPublication);
      (publicationService.getById as jest.Mock).mockResolvedValue(createdPublication);
      (publicationService.update as jest.Mock).mockResolvedValue(undefined);
      (publicationService.softDelete as jest.Mock).mockResolvedValue(undefined);

      const { Wrapper } = createWrapper();

      // STEP 1: CREATE
      const { result: createResult } = renderHook(() => useCreatePublication(), {
        wrapper: Wrapper,
      });

      createResult.current.mutate({
        organizationId,
        userId,
        publicationData: newPublication,
      });

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
      expect(publicationService.create).toHaveBeenCalledWith(
        newPublication,
        { organizationId, userId }
      );

      // STEP 2: READ (getById)
      const { result: readResult } = renderHook(
        () => usePublication('pub-1', organizationId),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(readResult.current.isSuccess).toBe(true));
      expect(readResult.current.data).toEqual(createdPublication);
      expect(publicationService.getById).toHaveBeenCalledWith('pub-1', organizationId);

      // STEP 3: UPDATE
      (publicationService.getById as jest.Mock).mockResolvedValue(updatedPublication);

      const { result: updateResult } = renderHook(() => useUpdatePublication(), {
        wrapper: Wrapper,
      });

      updateResult.current.mutate({
        id: 'pub-1',
        organizationId,
        userId,
        publicationData: { title: 'Updated Test Publication' },
      });

      await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
      expect(publicationService.update).toHaveBeenCalledWith(
        'pub-1',
        { title: 'Updated Test Publication' },
        { organizationId, userId }
      );

      // STEP 4: DELETE
      const { result: deleteResult } = renderHook(() => useDeletePublication(), {
        wrapper: Wrapper,
      });

      deleteResult.current.mutate({
        id: 'pub-1',
        organizationId,
        userId,
      });

      await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));
      expect(publicationService.softDelete).toHaveBeenCalledWith('pub-1', {
        organizationId,
        userId,
      });
    });
  });

  describe('Verify Flow', () => {
    it('sollte Verify-Flow durchlaufen (Create → Verify)', async () => {
      const organizationId = 'test-org-id';
      const userId = 'test-user-id';

      const newPublication = {
        title: 'Publication to Verify',
        type: 'newspaper',
        format: 'online',
        verified: false,
      };

      const createdPublication = {
        id: 'pub-2',
        ...newPublication,
      };

      const verifiedPublication = {
        ...createdPublication,
        verified: true,
      };

      // Setup mocks
      (publicationService.create as jest.Mock).mockResolvedValue(createdPublication);
      (publicationService.getById as jest.Mock).mockResolvedValue(createdPublication);
      (publicationService.verify as jest.Mock).mockResolvedValue(undefined);

      const { Wrapper } = createWrapper();

      // STEP 1: CREATE
      const { result: createResult } = renderHook(() => useCreatePublication(), {
        wrapper: Wrapper,
      });

      createResult.current.mutate({
        organizationId,
        userId,
        publicationData: newPublication,
      });

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
      expect(publicationService.create).toHaveBeenCalledWith(
        newPublication,
        { organizationId, userId }
      );

      // STEP 2: READ (vor Verifikation)
      const { result: readBeforeResult } = renderHook(
        () => usePublication('pub-2', organizationId),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(readBeforeResult.current.isSuccess).toBe(true));
      expect(readBeforeResult.current.data).toEqual(createdPublication);
      expect(readBeforeResult.current.data?.verified).toBe(false);

      // STEP 3: VERIFY
      (publicationService.getById as jest.Mock).mockResolvedValue(verifiedPublication);

      const { result: verifyResult } = renderHook(() => useVerifyPublication(), {
        wrapper: Wrapper,
      });

      verifyResult.current.mutate({
        id: 'pub-2',
        organizationId,
        userId,
      });

      await waitFor(() => expect(verifyResult.current.isSuccess).toBe(true));
      expect(publicationService.verify).toHaveBeenCalledWith('pub-2', {
        organizationId,
        userId,
      });

      // STEP 4: READ (nach Verifikation)
      const { result: readAfterResult } = renderHook(
        () => usePublication('pub-2', organizationId),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(readAfterResult.current.isSuccess).toBe(true));
      expect(readAfterResult.current.data?.verified).toBe(true);
    });
  });
});
