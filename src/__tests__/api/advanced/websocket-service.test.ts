// src/__tests__/api/advanced/websocket-service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketService } from '@/lib/api/websocket-service';

// Mock Firebase config
jest.mock('@/lib/firebase/config', () => ({
  db: {},
  storage: {}
}));

// Mock Firestore functions mit vollständigen Implementierungen
const mockAddDoc = jest.fn() as any;
const mockGetDoc = jest.fn() as any;
const mockGetDocs = jest.fn() as any;
const mockUpdateDoc = jest.fn() as any;
const mockDeleteDoc = jest.fn() as any;
const mockQuery = jest.fn() as any;
const mockWhere = jest.fn() as any;
const mockOrderBy = jest.fn() as any;
const mockLimit = jest.fn() as any;
const mockCollection = jest.fn() as any;
const mockDoc = jest.fn() as any;
const mockServerTimestamp = jest.fn() as any;

jest.mock('firebase/firestore', () => {
  const mockCollectionRef = { id: 'mock-collection' };
  const mockDocRef = { id: 'mock-doc' };
  const mockQueryRef = { id: 'mock-query' };

  return {
    addDoc: (...args: any[]) => mockAddDoc(...args),
    getDoc: (...args: any[]) => mockGetDoc(...args),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    updateDoc: (...args: any[]) => mockUpdateDoc(...args),
    deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
    query: (...args: any[]) => {
      mockQuery(...args);
      return mockQueryRef;
    },
    where: (...args: any[]) => {
      mockWhere(...args);
      return mockQueryRef;
    },
    orderBy: (...args: any[]) => {
      mockOrderBy(...args);
      return mockQueryRef;
    },
    limit: (...args: any[]) => {
      mockLimit(...args);
      return mockQueryRef;
    },
    collection: (...args: any[]) => {
      mockCollection(...args);
      return mockCollectionRef;
    },
    doc: (...args: any[]) => {
      mockDoc(...args);
      return mockDocRef;
    },
    serverTimestamp: () => mockServerTimestamp(),
    Timestamp: {
      now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
      fromDate: (date: Date) => ({ toDate: () => date, seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })
    }
  };
});

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = 1; // OPEN
  send = jest.fn();
  close = jest.fn();
}

// Mocke WebSocket global
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-456';
  const testConnectionId = 'conn-123';

  beforeEach(() => {
    // Mock timers für setInterval in startPingMonitoring
    jest.useFakeTimers();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    const mockTimestamp = {
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    };
    mockServerTimestamp.mockReturnValue(mockTimestamp);

    // Standard-Mock für getDocs (leere Liste)
    mockGetDocs.mockResolvedValue({ docs: [] });

    // Standard-Mock für addDoc
    mockAddDoc.mockResolvedValue({ id: 'mock-doc-id' });

    // Standard-Mock für updateDoc
    mockUpdateDoc.mockResolvedValue(undefined);

    // Standard-Mock für deleteDoc
    mockDeleteDoc.mockResolvedValue(undefined);

    // Erstelle Service NACH Mock-Setup
    webSocketService = new WebSocketService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('getActiveConnections', () => {
    it('sollte ohne Fehler ausgeführt werden', async () => {
      // Test dass Methode ohne Fehler läuft
      const result = await webSocketService.getActiveConnections(testOrganizationId);

      // Sollte Array zurückgeben (kann leer sein)
      expect(Array.isArray(result)).toBe(true);
    });

    it('sollte leere Liste zurückgeben wenn keine aktiven Verbindungen', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await webSocketService.getActiveConnections(testOrganizationId);

      expect(result).toHaveLength(0);
    });
  });

  describe('unregisterConnection', () => {
    it('sollte nichts tun wenn Verbindung nicht existiert', async () => {
      await webSocketService.unregisterConnection('nonexistent-connection');

      // Sollte keine Firestore-Updates geben
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup Methods', () => {
    it('sollte cleanupInactiveConnections ohne Fehler ausführen', async () => {
      // Cleanup-Methode testet nur, dass keine Fehler geworfen werden
      // da die In-Memory-Map zu diesem Zeitpunkt leer ist
      await expect(webSocketService.cleanupInactiveConnections()).resolves.not.toThrow();
    });

    it('sollte cleanupOldMessages ohne Fehler ausführen', async () => {
      // Cleanup-Methode testet nur, dass keine Fehler geworfen werden
      await expect(webSocketService.cleanupOldMessages()).resolves.not.toThrow();
    });
  });

  describe('Service Instantiation', () => {
    it('sollte erfolgreich instantiiert werden', () => {
      expect(webSocketService).toBeDefined();
      expect(webSocketService).toBeInstanceOf(WebSocketService);
    });

    it('sollte korrekte Konstanten haben', () => {
      // Teste dass Service-Konstanten definiert sind (via Reflection)
      const service = webSocketService as any;
      expect(service.CONNECTIONS_COLLECTION).toBe('websocket_connections');
      expect(service.MESSAGES_COLLECTION).toBe('websocket_messages');
      expect(service.MAX_CONNECTIONS_PER_ORG).toBe(50);
    });
  });

  describe('Basic Method Existence', () => {
    it('sollte alle öffentlichen Methoden haben', () => {
      expect(typeof webSocketService.registerConnection).toBe('function');
      expect(typeof webSocketService.unregisterConnection).toBe('function');
      expect(typeof webSocketService.addSubscription).toBe('function');
      expect(typeof webSocketService.removeSubscription).toBe('function');
      expect(typeof webSocketService.sendMessage).toBe('function');
      expect(typeof webSocketService.broadcastEvent).toBe('function');
      expect(typeof webSocketService.sendNotification).toBe('function');
      expect(typeof webSocketService.sendPing).toBe('function');
      expect(typeof webSocketService.handlePong).toBe('function');
      expect(typeof webSocketService.getActiveConnections).toBe('function');
      expect(typeof webSocketService.cleanupInactiveConnections).toBe('function');
      expect(typeof webSocketService.cleanupOldMessages).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('sollte getActiveConnections-Fehler abfangen und leere Liste zurückgeben', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await webSocketService.getActiveConnections(testOrganizationId);

      expect(result).toEqual([]);
    });

    it('sollte cleanupInactiveConnections-Fehler abfangen', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      // Sollte nicht werfen
      await expect(webSocketService.cleanupInactiveConnections()).resolves.not.toThrow();
    });

    it('sollte cleanupOldMessages-Fehler abfangen', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      // Sollte nicht werfen
      await expect(webSocketService.cleanupOldMessages()).resolves.not.toThrow();
    });
  });
});
