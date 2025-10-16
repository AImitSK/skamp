/**
 * React Query Hooks Tests für Boilerplates
 * Testet die Custom Hooks für Boilerplates-Datenmanagement
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useBoilerplates,
  useBoilerplate,
  useCreateBoilerplate,
  useUpdateBoilerplate,
  useDeleteBoilerplate,
  useToggleFavoriteBoilerplate,
} from '../useBoilerplatesData';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate, BoilerplateCreateData } from '@/types/crm-enhanced';

// Mock boilerplatesService
jest.mock('@/lib/firebase/boilerplate-service', () => ({
  boilerplatesService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn(),
  },
}));

// Helper: QueryClient Wrapper für Tests
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

describe('useBoilerplatesData Hooks', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  const mockBoilerplate: Boilerplate = {
    id: 'bp-1',
    name: 'Test Boilerplate',
    content: '<p>Test content</p>',
    category: 'company',
    description: 'Test description',
    isGlobal: true,
    isFavorite: false,
    userId: mockUserId,
    organizationId: mockOrganizationId,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useBoilerplates', () => {
    test('sollte Boilerplates laden', async () => {
      const mockBoilerplates = [mockBoilerplate];
      (boilerplatesService.getAll as jest.Mock).mockResolvedValue(mockBoilerplates);

      const { result } = renderHook(() => useBoilerplates(mockOrganizationId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBoilerplates);
      expect(boilerplatesService.getAll).toHaveBeenCalledWith(mockOrganizationId);
    });

    test('sollte Error bei fehlendem organizationId werfen', async () => {
      (boilerplatesService.getAll as jest.Mock).mockRejectedValue(
        new Error('No organization ID')
      );

      const { result } = renderHook(() => useBoilerplates(undefined), {
        wrapper: createWrapper(),
      });

      // Hook sollte disabled sein wenn organizationId undefined ist
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    test('sollte nur ausgeführt werden wenn organizationId vorhanden', () => {
      const { result } = renderHook(() => useBoilerplates(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(boilerplatesService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useBoilerplate', () => {
    test('sollte einzelnen Boilerplate laden', async () => {
      (boilerplatesService.getById as jest.Mock).mockResolvedValue(mockBoilerplate);

      const { result } = renderHook(() => useBoilerplate('bp-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBoilerplate);
      expect(boilerplatesService.getById).toHaveBeenCalledWith('bp-1');
    });

    test('sollte nur ausgeführt werden wenn id vorhanden', () => {
      const { result } = renderHook(() => useBoilerplate(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(boilerplatesService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateBoilerplate', () => {
    test('sollte Boilerplate erstellen und Cache invalidieren', async () => {
      const newBoilerplateId = 'bp-new';
      (boilerplatesService.create as jest.Mock).mockResolvedValue(newBoilerplateId);

      const { result } = renderHook(() => useCreateBoilerplate(), {
        wrapper: createWrapper(),
      });

      const createData: BoilerplateCreateData = {
        name: 'Neuer Baustein',
        content: '<p>Neuer Inhalt</p>',
        category: 'product',
        description: 'Test',
        isGlobal: true,
      };

      await result.current.mutateAsync({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        boilerplateData: createData,
      });

      expect(boilerplatesService.create).toHaveBeenCalledWith(createData, {
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    test('sollte Error bei fehlgeschlagenem Create werfen', async () => {
      const error = new Error('Create failed');
      (boilerplatesService.create as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateBoilerplate(), {
        wrapper: createWrapper(),
      });

      const createData: BoilerplateCreateData = {
        name: 'Test',
        content: 'Test',
        category: 'custom',
        description: '',
        isGlobal: true,
      };

      await expect(
        result.current.mutateAsync({
          organizationId: mockOrganizationId,
          userId: mockUserId,
          boilerplateData: createData,
        })
      ).rejects.toThrow('Create failed');
    });
  });

  describe('useUpdateBoilerplate', () => {
    test('sollte Boilerplate updaten und Cache invalidieren', async () => {
      (boilerplatesService.update as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateBoilerplate(), {
        wrapper: createWrapper(),
      });

      const updateData = { name: 'Updated Name', content: 'Updated Content' };

      await result.current.mutateAsync({
        id: 'bp-1',
        organizationId: mockOrganizationId,
        userId: mockUserId,
        boilerplateData: updateData,
      });

      expect(boilerplatesService.update).toHaveBeenCalledWith('bp-1', updateData, {
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    test('sollte Error bei fehlgeschlagenem Update werfen', async () => {
      const error = new Error('Update failed');
      (boilerplatesService.update as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateBoilerplate(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          id: 'bp-1',
          organizationId: mockOrganizationId,
          userId: mockUserId,
          boilerplateData: { name: 'Test' },
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useDeleteBoilerplate', () => {
    test('sollte Boilerplate löschen und Cache invalidieren', async () => {
      (boilerplatesService.delete as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteBoilerplate(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'bp-1',
        organizationId: mockOrganizationId,
      });

      expect(boilerplatesService.delete).toHaveBeenCalledWith('bp-1');
    });

    test('sollte Error bei fehlgeschlagenem Delete werfen', async () => {
      const error = new Error('Delete failed');
      (boilerplatesService.delete as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteBoilerplate(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          id: 'bp-1',
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('useToggleFavoriteBoilerplate', () => {
    test('sollte Favorit toggeln und Cache invalidieren', async () => {
      (boilerplatesService.toggleFavorite as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useToggleFavoriteBoilerplate(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'bp-1',
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(boilerplatesService.toggleFavorite).toHaveBeenCalledWith('bp-1', {
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    test('sollte Error bei fehlgeschlagenem Toggle werfen', async () => {
      const error = new Error('Toggle failed');
      (boilerplatesService.toggleFavorite as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useToggleFavoriteBoilerplate(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          id: 'bp-1',
          organizationId: mockOrganizationId,
          userId: mockUserId,
        })
      ).rejects.toThrow('Toggle failed');
    });
  });
});
