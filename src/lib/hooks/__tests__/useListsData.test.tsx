// src/lib/hooks/__tests__/useListsData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useLists,
  useList,
  useCreateList,
  useUpdateList,
  useDeleteList,
  useBulkDeleteLists,
} from '../useListsData';
import { listsService } from '@/lib/firebase/lists-service';

// Mock Firebase service
jest.mock('@/lib/firebase/lists-service', () => ({
  listsService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe('useListsData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLists', () => {
    it('fetches all lists for an organization', async () => {
      const mockLists = [
        { id: '1', name: 'List 1', type: 'dynamic' },
        { id: '2', name: 'List 2', type: 'static' },
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      const { result } = renderHook(() => useLists('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLists);
      expect(listsService.getAll).toHaveBeenCalledWith('test-org-id');
    });

    it('does not fetch when organizationId is undefined', () => {
      const { result } = renderHook(() => useLists(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(listsService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useList', () => {
    it('fetches a single list by ID', async () => {
      const mockList = { id: '1', name: 'Test List', type: 'dynamic' };

      (listsService.getById as jest.Mock).mockResolvedValue(mockList);

      const { result } = renderHook(() => useList('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockList);
      expect(listsService.getById).toHaveBeenCalledWith('1');
    });

    it('does not fetch when listId is undefined', () => {
      const { result } = renderHook(() => useList(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(listsService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateList', () => {
    it('creates a new list and invalidates cache', async () => {
      const mockList = { id: '3', name: 'New List', type: 'dynamic' };

      (listsService.create as jest.Mock).mockResolvedValue(mockList);

      const { result } = renderHook(() => useCreateList(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        listData: {
          name: 'New List',
          description: '',
          type: 'dynamic',
          category: 'custom',
          userId: 'user-1',
          organizationId: 'org-1',
          filters: {},
          contactIds: [],
        },
        organizationId: 'org-1',
        userId: 'user-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(listsService.create).toHaveBeenCalled();
    });
  });

  describe('useUpdateList', () => {
    it('updates a list and invalidates cache', async () => {
      (listsService.update as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateList(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        listId: '1',
        updates: { name: 'Updated Name' },
        organizationId: 'org-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(listsService.update).toHaveBeenCalledWith('1', { name: 'Updated Name' });
    });
  });

  describe('useDeleteList', () => {
    it('deletes a list and invalidates cache', async () => {
      (listsService.delete as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteList(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        listId: '1',
        organizationId: 'org-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(listsService.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('useBulkDeleteLists', () => {
    it('deletes multiple lists and invalidates cache', async () => {
      (listsService.delete as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBulkDeleteLists(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        listIds: ['1', '2', '3'],
        organizationId: 'org-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(listsService.delete).toHaveBeenCalledTimes(3);
      expect(listsService.delete).toHaveBeenCalledWith('1');
      expect(listsService.delete).toHaveBeenCalledWith('2');
      expect(listsService.delete).toHaveBeenCalledWith('3');
    });
  });
});
