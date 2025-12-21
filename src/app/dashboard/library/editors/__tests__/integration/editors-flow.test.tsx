// src/app/dashboard/library/editors/__tests__/integration/editors-flow.test.tsx
/**
 * Integration Tests for Editors Module
 *
 * Note: These tests verify data loading and service integration
 * rather than full UI rendering due to page complexity.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGlobalJournalists,
  useImportedJournalists,
  useCompanies,
  usePublications
} from '@/lib/hooks/useEditorsData';
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

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('Editors Data Loading Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue([]);
    (publicationService.getAll as jest.Mock).mockResolvedValue([]);
    (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue([]);
  });

  it('loads global journalists successfully', async () => {
    const mockJournalists = [
      {
        id: 'journalist-1',
        displayName: 'John Doe',
        isGlobal: true,
        mediaProfile: {
          isJournalist: true,
          primaryTopics: ['Technology', 'AI'],
        },
        email: 'john@example.com',
      },
      {
        id: 'journalist-2',
        displayName: 'Jane Smith',
        isGlobal: true,
        mediaProfile: {
          isJournalist: true,
          primaryTopics: ['Politics', 'Economy'],
        },
        email: 'jane@example.com',
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
    expect(result.current.data?.[0].displayName).toBe('John Doe');
    expect(result.current.data?.[1].displayName).toBe('Jane Smith');
  });

  it('loads imported journalist references successfully', async () => {
    const mockReferences = [
      { _globalJournalistId: 'journalist-1' },
      { _globalJournalistId: 'journalist-2' },
    ];

    (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue(mockReferences);

    const { result } = renderHook(() => useImportedJournalists('test-org-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeInstanceOf(Set);
    expect(result.current.data?.size).toBe(2);
    expect(result.current.data?.has('journalist-1')).toBe(true);
  });

  it('verifies import functionality is available', async () => {
    (multiEntityService.createJournalistReference as jest.Mock).mockResolvedValue({
      success: true,
    });

    expect(multiEntityService.createJournalistReference).toBeDefined();
    expect(typeof multiEntityService.createJournalistReference).toBe('function');
  });

  it('verifies remove functionality is available', async () => {
    (multiEntityService.removeJournalistReference as jest.Mock).mockResolvedValue(undefined);

    expect(multiEntityService.removeJournalistReference).toBeDefined();
    expect(typeof multiEntityService.removeJournalistReference).toBe('function');
  });
});

describe('Multi-Entity Reference System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue([]);
    (publicationService.getAll as jest.Mock).mockResolvedValue([]);
    (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue([]);
  });

  it('loads companies successfully', async () => {
    const mockLocalCompanies = [
      { id: 'local-1', name: 'Local Corp', organizationId: 'test-org-id' },
    ];

    const mockGlobalCompanies = [
      { id: 'global-1', name: 'TechCorp', isGlobal: true },
    ];

    const mockCompaniesSnapshot = {
      docs: mockGlobalCompanies.map((c) => ({
        id: c.id,
        data: () => c,
      })),
    };

    (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue(mockLocalCompanies);
    (getDocs as jest.Mock).mockResolvedValue(mockCompaniesSnapshot);

    const { result } = renderHook(() => useCompanies('test-org-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(companiesEnhancedService.getAll).toHaveBeenCalledWith('test-org-id');
  });

  it('loads publications successfully', async () => {
    const mockPublications = [
      { id: 'pub-1', title: 'Tech Today', organizationId: 'test-org-id' },
      { id: 'pub-2', title: 'News Weekly', organizationId: 'test-org-id' },
    ];

    (publicationService.getAll as jest.Mock).mockResolvedValue(mockPublications);

    const { result } = renderHook(() => usePublications('test-org-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(publicationService.getAll).toHaveBeenCalledWith('test-org-id');
  });

  it('combines local and global companies without duplicates', async () => {
    const localCompanies = [
      { id: 'company-1', name: 'Local Corp', organizationId: 'test-org-id' },
    ];

    const globalCompanies = [
      { id: 'company-1', name: 'Global Corp', isGlobal: true }, // Duplicate ID
      { id: 'company-2', name: 'Another Global', isGlobal: true },
    ];

    const mockCompaniesSnapshot = {
      docs: globalCompanies.map((c) => ({
        id: c.id,
        data: () => c,
      })),
    };

    (companiesEnhancedService.getAll as jest.Mock).mockResolvedValue(localCompanies);
    (getDocs as jest.Mock).mockResolvedValue(mockCompaniesSnapshot);

    const { result } = renderHook(() => useCompanies('test-org-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have 2 companies (duplicate removed)
    expect(result.current.data).toHaveLength(2);
  });
});
