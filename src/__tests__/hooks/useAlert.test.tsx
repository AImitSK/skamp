// src/__tests__/hooks/useAlert.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAlert } from '@/hooks/useAlert';

// Mock setTimeout
jest.useFakeTimers();

describe('useAlert Hook', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should start with no alert', () => {
    const { result } = renderHook(() => useAlert());
    
    expect(result.current.alert).toBeNull();
  });

  it('should show alert with correct data', () => {
    const { result } = renderHook(() => useAlert());
    
    act(() => {
      result.current.showAlert('success', 'Test Title', 'Test Message');
    });
    
    expect(result.current.alert).toEqual({
      type: 'success',
      title: 'Test Title',
      message: 'Test Message'
    });
  });

  it('should hide alert manually', () => {
    const { result } = renderHook(() => useAlert());
    
    act(() => {
      result.current.showAlert('error', 'Error Title');
    });
    
    expect(result.current.alert).not.toBeNull();
    
    act(() => {
      result.current.hideAlert();
    });
    
    expect(result.current.alert).toBeNull();
  });

  it('should auto-dismiss alert after timeout', () => {
    const { result } = renderHook(() => useAlert());
    
    act(() => {
      result.current.showAlert('info', 'Info Title');
    });
    
    expect(result.current.alert).not.toBeNull();
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(result.current.alert).toBeNull();
  });

  it('should handle multiple alerts correctly', () => {
    const { result } = renderHook(() => useAlert());
    
    act(() => {
      result.current.showAlert('success', 'First Alert');
    });
    
    act(() => {
      result.current.showAlert('error', 'Second Alert');
    });
    
    // Should show the second alert (overrides first)
    expect(result.current.alert?.title).toBe('Second Alert');
    expect(result.current.alert?.type).toBe('error');
  });
});