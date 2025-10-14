// src/app/dashboard/contacts/lists/__tests__/integration/lists-crud-flow.test.tsx
/**
 * Integration tests for Lists CRUD operations
 *
 * Note: These tests verify the component structure and React Query integration.
 * Full Firebase integration tests should be run in E2E tests.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useLists, useCreateList } from '@/lib/hooks/useListsData';

// Mock Firebase service
jest.mock('@/lib/firebase/lists-service', () => ({
  listsService: {
    getAll: jest.fn().mockResolvedValue([]),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getListMetrics: jest.fn(),
    refreshDynamicList: jest.fn(),
    refreshAllDynamicLists: jest.fn(),
    getContactsByFilters: jest.fn(),
    getContactsByIds: jest.fn(),
    exportContacts: jest.fn(),
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

describe('Lists Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('integrates useLists hook with React Query', async () => {
    const { result } = renderHook(() => useLists('test-org-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('integrates useCreateList hook with React Query', async () => {
    const { listsService } = require('@/lib/firebase/lists-service');
    listsService.create.mockResolvedValue({ id: 'new-list', name: 'Test' });

    const { result } = renderHook(() => useCreateList(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
  });
});
