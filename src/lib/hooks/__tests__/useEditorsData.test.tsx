// src/lib/hooks/__tests__/useEditorsData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useGlobalJournalists,
  useImportedJournalists,
  useCreateJournalistReference,
  useRemoveJournalistReference,
  useCompanies,
  usePublications,
} from '../useEditorsData';
import { multiEntityService } from '@/lib/firebase/multi-entity-reference-service';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { publicationService } from '@/lib/firebase/library-service';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Mock Firebase services
jest.mock('@/lib/firebase/multi-entity-reference-service', () => ({
  multiEntityService: {
    getAllContactReferences: jest.fn(),
    createJournalistReference: jest.fn(),
    removeJournalistReference: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  companiesEnhancedService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/library-service', () => ({
  publicationService: {
    getAll: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {},
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

describe('useEditorsData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGlobalJournalists', () => {
    it('fetches all global journalists', async () => {
      const mockJournalists = [
        {
          id: '1',
          displayName: 'John Doe',
          isGlobal: true,
          mediaProfile: { isJournalist: true },
        },
        {
          id: '2',
          displayName: 'Jane Smith',
          isGlobal: true,
          mediaProfile: { isJournalist: true },
        },
      ];

      const mockSnapshot = {
        docs: mockJournalists.map((j) => ({
          id: j.id,
          data: () => j,
        })),
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGlobalJournalists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(collection).toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('isGlobal', '==', true);
    });

    it('filters out non-journalists', async () => {
      const mockContacts = [
        {
          id: '1',
          displayName: 'John Doe',
          isGlobal: true,
          mediaProfile: { isJournalist: true },
        },
        {
          id: '2',
          displayName: 'Jane Smith',
          isGlobal: true,
          mediaProfile: { isJournalist: false },
        },
      ];

      const mockSnapshot = {
        docs: mockContacts.map((c) => ({
          id: c.id,
          data: () => c,
        })),
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGlobalJournalists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].id).toBe('1');
    });
  });

  describe('useImportedJournalists', () => {
    it('fetches imported journalist references', async () => {
      const mockReferences = [
        { _globalJournalistId: 'journalist-1' },
        { _globalJournalistId: 'journalist-2' },
        { _globalJournalistId: 'journalist-3' },
      ];

      (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue(
        mockReferences
      );

      const { result } = renderHook(() => useImportedJournalists('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeInstanceOf(Set);
      expect(result.current.data?.size).toBe(3);
      expect(result.current.data?.has('journalist-1')).toBe(true);
      expect(multiEntityService.getAllContactReferences).toHaveBeenCalledWith('test-org-id');
    });

    it('does not fetch when organizationId is undefined', () => {
      const { result } = renderHook(() => useImportedJournalists(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(multiEntityService.getAllContactReferences).not.toHaveBeenCalled();
    });
  });

  describe('useCreateJournalistReference', () => {
    it('creates a journalist reference and invalidates cache', async () => {
      const mockReference = { id: 'ref-1', _globalJournalistId: 'journalist-1' };

      (multiEntityService.createJournalistReference as jest.Mock).mockResolvedValue(
        mockReference
      );

      const { result } = renderHook(() => useCreateJournalistReference(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        journalistId: 'journalist-1',
        organizationId: 'org-1',
        userId: 'user-1',
        notes: 'Test import',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(multiEntityService.createJournalistReference).toHaveBeenCalledWith(
        'journalist-1',
        'org-1',
        'user-1',
        'Test import'
      );
    });
  });

  describe('useRemoveJournalistReference', () => {
    it('removes a journalist reference and invalidates cache', async () => {
      (multiEntityService.removeJournalistReference as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useRemoveJournalistReference(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        journalistId: 'journalist-1',
        organizationId: 'org-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(multiEntityService.removeJournalistReference).toHaveBeenCalledWith(
        'journalist-1',
        'org-1'
      );
    });
  });

  describe('useCompanies', () => {
    it('fetches local and global companies', async () => {
      const mockLocalCompanies = [
        { id: 'local-1', name: 'Local Company 1', isGlobal: false },
      ];

      const mockGlobalCompanies = [
        { id: 'global-1', name: 'Global Company 1', isGlobal: true },
        { id: 'global-2', name: 'Global Company 2', isGlobal: true },
      ];

      (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue(
        mockLocalCompanies
      );

      const mockSnapshot = {
        docs: mockGlobalCompanies.map((c) => ({
          id: c.id,
          data: () => c,
        })),
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useCompanies('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(companiesEnhancedService.getAll).toHaveBeenCalledWith('test-org-id');
    });

    it('removes duplicate companies', async () => {
      const mockLocalCompanies = [
        { id: 'company-1', name: 'Company 1', isGlobal: false },
      ];

      const mockGlobalCompanies = [
        { id: 'company-1', name: 'Company 1', isGlobal: true },
        { id: 'company-2', name: 'Company 2', isGlobal: true },
      ];

      (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue(
        mockLocalCompanies
      );

      const mockSnapshot = {
        docs: mockGlobalCompanies.map((c) => ({
          id: c.id,
          data: () => c,
        })),
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useCompanies('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
    });

    it('does not fetch when organizationId is undefined', () => {
      const { result } = renderHook(() => useCompanies(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(companiesEnhancedService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('usePublications', () => {
    it('fetches publications for an organization', async () => {
      const mockPublications = [
        { id: '1', title: 'Publication 1' },
        { id: '2', title: 'Publication 2' },
      ];

      (publicationService.getAll as jest.Mock).mockResolvedValue(mockPublications);

      const { result } = renderHook(() => usePublications('test-org-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPublications);
      expect(publicationService.getAll).toHaveBeenCalledWith('test-org-id');
    });

    it('does not fetch when organizationId is undefined', () => {
      const { result } = renderHook(() => usePublications(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(publicationService.getAll).not.toHaveBeenCalled();
    });
  });
});
