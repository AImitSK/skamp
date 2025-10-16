/**
 * Boilerplates Integration Tests
 * Testet den kompletten CRUD-Flow und Favorite-Toggle-Flow
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useBoilerplates,
  useCreateBoilerplate,
  useUpdateBoilerplate,
  useDeleteBoilerplate,
  useToggleFavoriteBoilerplate,
} from '@/lib/hooks/useBoilerplatesData';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate, BoilerplateCreateData } from '@/types/crm-enhanced';

// Mock boilerplatesService
jest.mock('@/lib/firebase/boilerplate-service', () => ({
  boilerplatesService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('Boilerplates CRUD Flow Integration', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sollte kompletten CRUD-Flow durchlaufen (Create → Read → Update → Delete)', async () => {
    // Initial: Leere Liste
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([]);

    const wrapper = createWrapper();

    // Step 1: READ - Liste laden (initial leer)
    const { result: listResult } = renderHook(() => useBoilerplates(mockOrganizationId), {
      wrapper,
    });

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listResult.current.data).toEqual([]);

    // Step 2: CREATE - Neuen Boilerplate erstellen
    const newBoilerplateId = 'bp-new-123';
    const newBoilerplate: Boilerplate = {
      id: newBoilerplateId,
      name: 'Integration Test Boilerplate',
      content: '<p>Test content</p>',
      category: 'product',
      description: 'Created in integration test',
      isGlobal: true,
      isFavorite: false,
      userId: mockUserId,
      organizationId: mockOrganizationId,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    };

    (boilerplatesService.create as jest.Mock).mockResolvedValue(newBoilerplateId);
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([newBoilerplate]);

    const { result: createResult } = renderHook(() => useCreateBoilerplate(), {
      wrapper,
    });

    const createData: BoilerplateCreateData = {
      name: 'Integration Test Boilerplate',
      content: '<p>Test content</p>',
      category: 'product',
      description: 'Created in integration test',
      isGlobal: true,
    };

    await createResult.current.mutateAsync({
      organizationId: mockOrganizationId,
      userId: mockUserId,
      boilerplateData: createData,
    });

    expect(boilerplatesService.create).toHaveBeenCalledWith(createData, {
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    // Step 3: UPDATE - Boilerplate aktualisieren
    const updatedBoilerplate: Boilerplate = {
      ...newBoilerplate,
      name: 'Updated Integration Test',
      content: '<p>Updated content</p>',
    };

    (boilerplatesService.update as jest.Mock).mockResolvedValue(undefined);
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([updatedBoilerplate]);

    const { result: updateResult } = renderHook(() => useUpdateBoilerplate(), {
      wrapper,
    });

    const updateData = {
      name: 'Updated Integration Test',
      content: '<p>Updated content</p>',
    };

    await updateResult.current.mutateAsync({
      id: newBoilerplateId,
      organizationId: mockOrganizationId,
      userId: mockUserId,
      boilerplateData: updateData,
    });

    expect(boilerplatesService.update).toHaveBeenCalledWith(
      newBoilerplateId,
      updateData,
      {
        organizationId: mockOrganizationId,
        userId: mockUserId,
      }
    );

    // Step 4: DELETE - Boilerplate löschen
    (boilerplatesService.delete as jest.Mock).mockResolvedValue(undefined);
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([]);

    const { result: deleteResult } = renderHook(() => useDeleteBoilerplate(), {
      wrapper,
    });

    await deleteResult.current.mutateAsync({
      id: newBoilerplateId,
      organizationId: mockOrganizationId,
    });

    expect(boilerplatesService.delete).toHaveBeenCalledWith(newBoilerplateId);

    // Final: Liste sollte wieder leer sein
    await waitFor(() => {
      // Cache wurde invalidiert, neue Daten sollten geladen werden
      expect(listResult.current.data).toBeDefined();
    });
  });

  test('sollte Favorite-Toggle-Flow durchlaufen', async () => {
    // Initial: Boilerplate ohne Favorit
    const boilerplate: Boilerplate = {
      id: 'bp-fav-123',
      name: 'Favorite Test',
      content: '<p>Content</p>',
      category: 'company',
      description: '',
      isGlobal: true,
      isFavorite: false, // Initial nicht favorisiert
      userId: mockUserId,
      organizationId: mockOrganizationId,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    };

    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([boilerplate]);

    const wrapper = createWrapper();

    // Step 1: Liste laden
    const { result: listResult } = renderHook(() => useBoilerplates(mockOrganizationId), {
      wrapper,
    });

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listResult.current.data?.[0].isFavorite).toBe(false);

    // Step 2: Toggle Favorite ON
    (boilerplatesService.toggleFavorite as jest.Mock).mockResolvedValue(undefined);
    const favoritedBoilerplate = { ...boilerplate, isFavorite: true };
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([favoritedBoilerplate]);

    const { result: toggleResult } = renderHook(() => useToggleFavoriteBoilerplate(), {
      wrapper,
    });

    await toggleResult.current.mutateAsync({
      id: boilerplate.id!,
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    expect(boilerplatesService.toggleFavorite).toHaveBeenCalledWith(boilerplate.id, {
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    // Step 3: Toggle Favorite OFF
    const unfavoritedBoilerplate = { ...boilerplate, isFavorite: false };
    (boilerplatesService.getAll as jest.Mock).mockResolvedValue([unfavoritedBoilerplate]);

    await toggleResult.current.mutateAsync({
      id: boilerplate.id!,
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    expect(boilerplatesService.toggleFavorite).toHaveBeenCalledTimes(2);
  });

  test('sollte Fehler beim CRUD-Flow korrekt behandeln', async () => {
    const wrapper = createWrapper();

    // Test: Create mit Error
    const createError = new Error('Firestore: Permission denied');
    (boilerplatesService.create as jest.Mock).mockRejectedValue(createError);

    const { result: createResult } = renderHook(() => useCreateBoilerplate(), {
      wrapper,
    });

    await expect(
      createResult.current.mutateAsync({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        boilerplateData: {
          name: 'Test',
          content: 'Test',
          category: 'custom',
          description: '',
          isGlobal: true,
        },
      })
    ).rejects.toThrow('Firestore: Permission denied');

    // Test: Update mit Error
    const updateError = new Error('Document not found');
    (boilerplatesService.update as jest.Mock).mockRejectedValue(updateError);

    const { result: updateResult } = renderHook(() => useUpdateBoilerplate(), {
      wrapper,
    });

    await expect(
      updateResult.current.mutateAsync({
        id: 'nonexistent-id',
        organizationId: mockOrganizationId,
        userId: mockUserId,
        boilerplateData: { name: 'Updated' },
      })
    ).rejects.toThrow('Document not found');

    // Test: Delete mit Error
    const deleteError = new Error('Cannot delete archived item');
    (boilerplatesService.delete as jest.Mock).mockRejectedValue(deleteError);

    const { result: deleteResult } = renderHook(() => useDeleteBoilerplate(), {
      wrapper,
    });

    await expect(
      deleteResult.current.mutateAsync({
        id: 'archived-id',
        organizationId: mockOrganizationId,
      })
    ).rejects.toThrow('Cannot delete archived item');
  });
});
