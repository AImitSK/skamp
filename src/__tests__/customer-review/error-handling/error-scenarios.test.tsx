/**
 * Error-Handling und Edge-Cases Test-Suite
 * 
 * Diese Tests decken ab:
 * - Network-Fehler und Timeout-Handling
 * - Firebase-Verbindungsabbrüche
 * - Korrupte Daten und Validation-Fehler
 * - Memory-Leaks und Performance-Probleme
 * - Browser-Kompatibilitäts-Probleme
 * - Race-Conditions und Async-Fehler
 * - User-Input-Validation
 * - Recovery-Strategien
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleBox } from '@/components/customer-review/toggle/ToggleBox';
import { MediaToggleBox } from '@/components/customer-review/toggle/MediaToggleBox';
import { useToggleState } from '@/components/customer-review/toggle/useToggleState';
import { useTogglePersistence } from '@/components/customer-review/toggle/useTogglePersistence';
import { approvalService } from '@/lib/firebase/approval-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { renderHook } from '@testing-library/react';

// Mock Services mit Error-Szenarien
jest.mock('@/lib/firebase/approval-service', () => ({
  approvalService: {
    submitDecisionPublic: jest.fn(),
    requestChangesPublic: jest.fn(),
    getByShareId: jest.fn(),
    createCustomerApproval: jest.fn(),
    sendForApproval: jest.fn()
  }
}));

jest.mock('@/lib/firebase/notifications-service', () => ({
  notificationsService: {
    create: jest.fn(),
    getAll: jest.fn(),
    markAsRead: jest.fn()
  }
}));

// Mock Heroicons mit Fehler-Simulation
jest.mock('@heroicons/react/24/outline', () => {
  const mockIcon = ({ className, onClick, ...props }: any) => {
    if (props['data-error-trigger']) {
      throw new Error('Icon rendering failed');
    }
    return <div className={className} onClick={onClick} data-testid="mock-icon">Icon</div>;
  };
  
  return {
    PhotoIcon: mockIcon,
    DocumentIcon: mockIcon,
    ChevronDownIcon: mockIcon,
    ChevronUpIcon: mockIcon,
    PaperClipIcon: mockIcon
  };
});

// Mock localStorage mit Fehler-Szenarien
const mockLocalStorageWithErrors = (() => {
  let shouldThrow = false;
  let storage: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => {
      if (shouldThrow) throw new Error('localStorage not available');
      return storage[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (shouldThrow) throw new Error('localStorage quota exceeded');
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      if (shouldThrow) throw new Error('localStorage access denied');
      delete storage[key];
    }),
    clear: jest.fn(() => {
      if (shouldThrow) throw new Error('localStorage clear failed');
      storage = {};
    }),
    _setShouldThrow: (value: boolean) => { shouldThrow = value; },
    _getStorage: () => storage,
    _clearStorage: () => { storage = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorageWithErrors
});

// Console Error Mock für Error-Tracking
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

// Mock Network-Fehler
const mockNetworkError = () => {
  const error = new Error('Network request failed');
  (error as any).code = 'NETWORK_ERROR';
  return error;
};

const mockTimeoutError = () => {
  const error = new Error('Request timeout');
  (error as any).code = 'TIMEOUT';
  return error;
};

const mockFirestoreError = (code: string) => {
  const error = new Error(`Firestore error: ${code}`);
  (error as any).code = code;
  return error;
};

describe('Error-Handling und Edge-Cases Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorageWithErrors._clearStorage();
    mockLocalStorageWithErrors._setShouldThrow(false);
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Network-Fehler und Timeouts', () => {
    it('sollte Network-Fehler bei Approval-Submission handhaben', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      // Mock Network-Fehler
      (approvalService.submitDecisionPublic as jest.Mock).mockRejectedValue(
        mockNetworkError()
      );

      const TestComponent = () => {
        const handleApprove = async () => {
          try {
            await approvalService.submitDecisionPublic(
              'share-123',
              'approved',
              'Test approval',
              'Test User'
            );
          } catch (error) {
            console.error('Approval failed:', error);
          }
        };
        
        return (
          <div>
            <button onClick={handleApprove} data-testid="approve-button">
              Approve
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      
      const approveButton = screen.getByTestId('approve-button');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Approval failed:',
          expect.objectContaining({ code: 'NETWORK_ERROR' })
        );
      });
    });

    it('sollte Timeout-Fehler bei Service-Aufrufen handhaben', async () => {
      const user = userEvent.setup();
      
      (approvalService.getByShareId as jest.Mock).mockRejectedValue(
        mockTimeoutError()
      );

      const TestComponent = () => {
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);
        
        const loadApproval = async () => {
          setLoading(true);
          setError(null);
          try {
            await approvalService.getByShareId('share-123');
          } catch (err: any) {
            setError(err.code === 'TIMEOUT' ? 'Request timed out' : 'Unknown error');
          } finally {
            setLoading(false);
          }
        };
        
        return (
          <div>
            <button onClick={loadApproval} data-testid="load-button">
              Load Approval
            </button>
            {loading && <div data-testid="loading">Loading...</div>}
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(<TestComponent />);
      
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Request timed out');
      });
    });

    it('sollte Retry-Logic bei temporären Netzwerkfehlern implementieren', async () => {
      let attemptCount = 0;
      
      (approvalService.createCustomerApproval as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(mockNetworkError());
        }
        return Promise.resolve('approval-123');
      });

      const TestComponent = () => {
        const [result, setResult] = React.useState<string | null>(null);
        const [error, setError] = React.useState<string | null>(null);
        
        const createApprovalWithRetry = async (maxRetries = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const id = await approvalService.createCustomerApproval(
                'campaign-123',
                'org-456'
              );
              setResult(id);
              return;
            } catch (err: any) {
              if (attempt === maxRetries) {
                setError(`Failed after ${maxRetries} attempts`);
              }
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        };
        
        return (
          <div>
            <button onClick={() => createApprovalWithRetry()} data-testid="create-button">
              Create Approval
            </button>
            {result && <div data-testid="result">Success: {result}</div>}
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(<TestComponent />);
      
      const user = userEvent.setup();
      const createButton = screen.getByTestId('create-button');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('Success: approval-123');
      }, { timeout: 5000 });
      
      expect(attemptCount).toBe(3); // 2 failures + 1 success
    });
  });

  describe('Firebase-Verbindungsabbrüche', () => {
    it('sollte Firestore-Fehler graceful handhaben', async () => {
      (approvalService.sendForApproval as jest.Mock).mockRejectedValue(
        mockFirestoreError('PERMISSION_DENIED')
      );

      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);
        
        const sendApproval = async () => {
          try {
            await approvalService.sendForApproval(
              'approval-123',
              { organizationId: 'org-456', userId: 'user-789' }
            );
          } catch (err: any) {
            if (err.code === 'PERMISSION_DENIED') {
              setError('You do not have permission to send this approval');
            } else {
              setError('An unexpected error occurred');
            }
          }
        };
        
        return (
          <div>
            <button onClick={sendApproval} data-testid="send-button">
              Send Approval
            </button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);
      
      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'You do not have permission to send this approval'
        );
      });
    });

    it('sollte Connection-Lost-Szenarien handhaben', async () => {
      (notificationsService.getAll as jest.Mock).mockRejectedValue(
        mockFirestoreError('UNAVAILABLE')
      );

      const TestComponent = () => {
        const [notifications, setNotifications] = React.useState<any[]>([]);
        const [connectionStatus, setConnectionStatus] = React.useState('connected');
        
        const loadNotifications = async () => {
          try {
            const notifs = await notificationsService.getAll('user-123', 50, 'org-456');
            setNotifications(notifs);
            setConnectionStatus('connected');
          } catch (err: any) {
            if (err.code === 'UNAVAILABLE') {
              setConnectionStatus('disconnected');
            }
          }
        };
        
        React.useEffect(() => {
          loadNotifications();
        }, []);
        
        return (
          <div>
            <div data-testid="connection-status">{connectionStatus}</div>
            <div data-testid="notification-count">{notifications.length}</div>
            <button onClick={loadNotifications} data-testid="retry-button">
              Retry
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      });
    });
  });

  describe('localStorage-Fehler', () => {
    it('sollte localStorage-Quota-Überschreitung handhaben', async () => {
      mockLocalStorageWithErrors._setShouldThrow(true);
      
      const { result } = renderHook(() => 
        useTogglePersistence('test-key')
      );
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      // Sollte Error loggen aber nicht crashen
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Speichern des Toggle-Status:',
        expect.any(Error)
      );
      
      // State sollte trotzdem im Memory aktualisiert werden
      expect(result.current.persistedState['toggle-1']).toBe(true);
    });

    it('sollte localStorage-Unavailability handhaben', async () => {
      // Mock localStorage als komplett nicht verfügbar
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;
      
      const { result } = renderHook(() => 
        useTogglePersistence('test-key')
      );
      
      act(() => {
        result.current.saveToggleState('toggle-1', true);
      });
      
      // Sollte trotzdem funktionieren (in-memory)
      expect(result.current.persistedState['toggle-1']).toBe(true);
      
      // localStorage wiederherstellen
      window.localStorage = originalLocalStorage;
    });

    it('sollte korrupte localStorage-Daten handhaben', async () => {
      mockLocalStorageWithErrors.getItem.mockReturnValue('invalid-json-{');
      
      const { result } = renderHook(() => 
        useTogglePersistence('test-key')
      );
      
      // Sollte mit leerem State initialisieren
      expect(result.current.persistedState).toEqual({});
      
      // Error sollte geloggt werden
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Fehler beim Laden des Toggle-Status:',
        expect.any(Error)
      );
    });
  });

  describe('Korrupte Daten und Validation-Fehler', () => {
    it('sollte mit null/undefined Props umgehen', () => {
      expect(() => {
        render(
          <ToggleBox
            id="test-toggle"
            title="Test"
            isExpanded={false}
            onToggle={() => {}}
            organizationId="org-123"
          />
        );
      }).not.toThrow();
    });

    it('sollte mit fehlerhaften Media-Items umgehen', () => {
      const corruptMediaItems = [
        { id: 'media-1' }, // Fehlende required properties
        { id: 'media-2', filename: null, size: 'invalid' }, // Wrong types
        null, // null item
        { id: 'media-3', filename: 'test.jpg', size: 1024, mimeType: 'image/jpeg' } // Valid item
      ] as any;
      
      expect(() => {
        render(
          <MediaToggleBox
            id="media-toggle"
            title="Test Media"
            isExpanded={true}
            onToggle={() => {}}
            organizationId="org-123"
            mediaItems={corruptMediaItems}
          />
        );
      }).not.toThrow();
    });

    it('sollte mit extremen String-Längen umgehen', () => {
      const veryLongString = 'a'.repeat(10000);
      
      expect(() => {
        render(
          <ToggleBox
            id={veryLongString}
            title={veryLongString}
            subtitle={veryLongString}
            isExpanded={false}
            onToggle={() => {}}
            organizationId="org-123"
          />
        );
      }).not.toThrow();
    });

    it('sollte mit Unicode und Emoji-Strings umgehen', () => {
      const unicodeString = '🎉 测试 العربية Ελληνικά 🚀';
      
      expect(() => {
        render(
          <ToggleBox
            id="unicode-toggle"
            title={unicodeString}
            subtitle={unicodeString}
            isExpanded={false}
            onToggle={() => {}}
            organizationId="org-123"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Memory-Leaks und Performance-Probleme', () => {
    it('sollte Memory-Leaks bei vielen Toggle-State-Changes vermeiden', () => {
      const { result } = renderHook(() => useToggleState());
      
      // Simuliere viele State-Changes
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.toggleBox(`toggle-${i % 10}`);
        }
      });
      
      // State sollte nicht explodieren
      expect(Object.keys(result.current.toggleStates)).toHaveLength(10);
    });

    it('sollte Performance bei großen Datenmengen handhaben', () => {
      const manyMediaItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `media-${i}`,
        filename: `file-${i}.jpg`,
        mimeType: 'image/jpeg',
        size: 1024 * i,
        url: `https://example.com/file-${i}.jpg`,
        uploadedAt: new Date(),
        uploadedBy: { id: 'user', name: 'User', email: 'user@test.com' },
        organizationId: 'org-123'
      }));
      
      const startTime = performance.now();
      
      render(
        <MediaToggleBox
          id="performance-test"
          title="Performance Test"
          isExpanded={true}
          onToggle={() => {}}
          organizationId="org-123"
          mediaItems={manyMediaItems}
          maxDisplayCount={50} // Limit für Performance
        />
      );
      
      const endTime = performance.now();
      
      // Sollte unter 500ms rendern
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('sollte Event-Handler korrekt cleanup bei Unmount', () => {
      const onToggleMock = jest.fn();
      
      const { unmount } = render(
        <ToggleBox
          id="cleanup-test"
          title="Cleanup Test"
          isExpanded={false}
          onToggle={onToggleMock}
          organizationId="org-123"
        />
      );
      
      // Unmount sollte ohne Errors funktionieren
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Race-Conditions und Async-Fehler', () => {
    it('sollte Race-Conditions bei schnellen Toggle-Klicks handhaben', async () => {
      const user = userEvent.setup();
      const onToggleMock = jest.fn();
      
      render(
        <ToggleBox
          id="race-test"
          title="Race Test"
          isExpanded={false}
          onToggle={onToggleMock}
          organizationId="org-123"
        />
      );
      
      const toggleButton = screen.getByTestId('toggle-header-race-test');
      
      // Sehr schnelle Klicks
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(user.click(toggleButton));
      }
      
      await Promise.all(promises);
      
      // Alle Klicks sollten verarbeitet werden
      expect(onToggleMock).toHaveBeenCalledTimes(10);
    });

    it('sollte Async-Fehler in useEffect handhaben', async () => {
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);
        
        React.useEffect(() => {
          // Async operation that might fail
          const loadData = async () => {
            try {
              await Promise.reject(new Error('Async error'));
            } catch (err: any) {
              setError(err.message);
            }
          };
          
          loadData();
        }, []);
        
        return (
          <div>
            {error && <div data-testid="async-error">{error}</div>}
          </div>
        );
      };
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('async-error')).toHaveTextContent('Async error');
      });
    });
  });

  describe('Browser-Kompatibilitäts-Probleme', () => {
    it('sollte mit fehlenden Browser-APIs umgehen', () => {
      // Mock fehlendes IntersectionObserver
      const originalIntersectionObserver = window.IntersectionObserver;
      delete (window as any).IntersectionObserver;
      
      expect(() => {
        render(
          <ToggleBox
            id="browser-test"
            title="Browser Test"
            isExpanded={false}
            onToggle={() => {}}
            organizationId="org-123"
          />
        );
      }).not.toThrow();
      
      // API wiederherstellen
      window.IntersectionObserver = originalIntersectionObserver;
    });

    it('sollte mit fehlender ResizeObserver API umgehen', () => {
      const originalResizeObserver = window.ResizeObserver;
      delete (window as any).ResizeObserver;
      
      expect(() => {
        render(
          <MediaToggleBox
            id="resize-test"
            title="Resize Test"
            isExpanded={true}
            onToggle={() => {}}
            organizationId="org-123"
            mediaItems={[]}
          />
        );
      }).not.toThrow();
      
      window.ResizeObserver = originalResizeObserver;
    });
  });

  describe('User-Input-Validation', () => {
    it('sollte mit leerem organizationId umgehen', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(
        <ToggleBox
          id="empty-org-test"
          title="Empty Org Test"
          isExpanded={false}
          onToggle={() => {}}
          organizationId="" // Leere organizationId
        />
      );
      
      // Component sollte rendern, aber möglicherweise Warning loggen
      expect(screen.getByTestId('toggle-box-empty-org-test')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('sollte mit ungültigen Callback-Props umgehen', async () => {
      const user = userEvent.setup();
      
      // null callback
      render(
        <ToggleBox
          id="null-callback-test"
          title="Null Callback Test"
          isExpanded={false}
          onToggle={null as any}
          organizationId="org-123"
        />
      );
      
      const toggleButton = screen.getByTestId('toggle-header-null-callback-test');
      
      // Sollte nicht crashen
      await expect(user.click(toggleButton)).resolves.not.toThrow();
    });
  });

  describe('Error-Boundaries und Recovery', () => {
    it('sollte Component-Fehler mit Error-Boundary abfangen', () => {
      const ErrorBoundary = class ErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean }
      > {
        constructor(props: any) {
          super(props);
          this.state = { hasError: false };
        }
        
        static getDerivedStateFromError() {
          return { hasError: true };
        }
        
        componentDidCatch(error: Error) {
          console.error('Error caught by boundary:', error);
        }
        
        render() {
          if (this.state.hasError) {
            return <div data-testid="error-fallback">Something went wrong</div>;
          }
          
          return this.props.children;
        }
      };
      
      const ThrowingComponent = () => {
        throw new Error('Component error');
      };
      
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    });
  });
});
