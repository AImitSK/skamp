import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAVECalculation } from './useAVECalculation';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { MediaClipping } from '@/types/monitoring';
import { AVESettings } from '@/types/monitoring';
import React from 'react';

// Mock AVE Settings Service
jest.mock('@/lib/firebase/ave-settings-service', () => ({
  aveSettingsService: {
    getOrCreate: jest.fn(),
    calculateAVE: jest.fn(),
  },
}));

const mockAveSettingsService = aveSettingsService as jest.Mocked<typeof aveSettingsService>;

// Test Helper: Wrapper mit QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Mock AVE Settings
const mockAVESettings: AVESettings = {
  id: 'test-ave-settings',
  organizationId: 'org-123',
  userId: 'user-456',
  rates: {
    print: 5.0,
    online: 3.0,
    radio: 4.0,
    tv: 7.0,
  },
  createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
  updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
};

// Mock Clipping
const mockClipping: MediaClipping = {
  id: 'clip-123',
  publicationId: 'pub-123',
  organizationId: 'org-123',
  title: 'Test Article',
  content: 'Test content',
  url: 'https://example.com',
  outletName: 'Test Outlet',
  outletType: 'online',
  reach: 10000,
  sentiment: 'positive',
  publishedAt: { seconds: 1234567890, nanoseconds: 0, toDate: () => new Date(1234567890 * 1000) } as any,
  createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
};

describe('useAVECalculation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('React Query Integration', () => {
    it('should load AVE settings via React Query', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.aveSettings).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toEqual(mockAVESettings);
      expect(mockAveSettingsService.getOrCreate).toHaveBeenCalledWith('org-123', 'user-456');
      expect(mockAveSettingsService.getOrCreate).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when organizationId is missing', async () => {
      const { result } = renderHook(
        () => useAVECalculation(undefined, 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toBeNull();
      expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
    });

    it('should not fetch when userId is missing', async () => {
      const { result } = renderHook(
        () => useAVECalculation('org-123', undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toBeNull();
      expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
    });

    it('should not fetch when both params are missing', async () => {
      const { result } = renderHook(
        () => useAVECalculation(undefined, undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toBeNull();
      expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockAveSettingsService.getOrCreate.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toBeNull();
    });
  });

  describe('calculateAVE Function', () => {
    it('should return existing AVE value when clipping.ave is present', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const clippingWithAVE = { ...mockClipping, ave: 999 };
      const ave = result.current.calculateAVE(clippingWithAVE);

      expect(ave).toBe(999);
      expect(mockAveSettingsService.calculateAVE).not.toHaveBeenCalled();
    });

    it('should return 0 when aveSettings are not loaded yet', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      // Sofort aufrufen (während isLoading === true)
      const ave = result.current.calculateAVE(mockClipping);

      expect(ave).toBe(0);
      expect(mockAveSettingsService.calculateAVE).not.toHaveBeenCalled();
    });

    it('should calculate AVE using aveSettingsService when no ave value exists', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);
      mockAveSettingsService.calculateAVE.mockReturnValue(500);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const clippingWithoutAVE = { ...mockClipping, ave: undefined };
      const ave = result.current.calculateAVE(clippingWithoutAVE);

      expect(ave).toBe(500);
      expect(mockAveSettingsService.calculateAVE).toHaveBeenCalledWith(
        clippingWithoutAVE,
        mockAVESettings
      );
    });

    it('should handle zero AVE from service', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);
      mockAveSettingsService.calculateAVE.mockReturnValue(0);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const ave = result.current.calculateAVE(mockClipping);

      expect(ave).toBe(0);
    });

    it('should handle clipping.ave = 0 (calls calculateAVE because 0 is falsy)', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);
      mockAveSettingsService.calculateAVE.mockReturnValue(100);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const clippingWithZeroAVE = { ...mockClipping, ave: 0 };
      const ave = result.current.calculateAVE(clippingWithZeroAVE);

      expect(ave).toBe(100);
      expect(mockAveSettingsService.calculateAVE).toHaveBeenCalledWith(
        clippingWithZeroAVE,
        mockAVESettings
      );
    });
  });

  describe('Stability and Memoization', () => {
    it('should recalculate function when aveSettings change', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result, rerender } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstCalculateAVE = result.current.calculateAVE;

      rerender();

      expect(typeof result.current.calculateAVE).toBe('function');
    });
  });
});
