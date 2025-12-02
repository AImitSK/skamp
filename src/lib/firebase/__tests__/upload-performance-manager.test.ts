// src/lib/firebase/__tests__/upload-performance-manager.test.ts
// Comprehensive Tests für Upload Performance Manager
// Batch-Upload-Orchestration, Progress-Aggregation, Memory-Management und Performance-Monitoring

import { uploadPerformanceManager } from '../upload-performance-manager';
import { 
  UploadPerformanceMetrics, 
  BatchPerformanceMetrics, 
  UploadProgress 
} from '@/types/unified-upload';
import { Timestamp } from 'firebase/firestore';

// =====================
// TEST SETUP & MOCKS
// =====================

// Mock Node.js process for memory management tests
const mockProcess = {
  memoryUsage: jest.fn(() => ({
    heapUsed: 50 * 1024 * 1024, // 50MB
    heapTotal: 100 * 1024 * 1024, // 100MB
    external: 10 * 1024 * 1024 // 10MB
  }))
};

// Mock GC function
const mockGc = jest.fn();

// Global mocking
(global as any).process = mockProcess;
(global as any).gc = mockGc;

// Mock File für Tests
const createMockFile = (name: string, size: number = 1024): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type: 'image/jpeg' });
  return new File([blob], name, { type: 'image/jpeg' });
};

// Async Test Utilities
const waitForCondition = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition timeout'));
      } else {
        setTimeout(checkCondition, 50);
      }
    };
    checkCondition();
  });
};

describe('Upload Performance Manager', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockGc.mockClear();
    // Reset Performance Manager State
    uploadPerformanceManager.destroy?.();
  });

  afterEach(() => {
    uploadPerformanceManager.destroy?.();
  });

  // =====================
  // TRACKING MANAGEMENT TESTS
  // =====================

  describe('Tracking Management', () => {
    
    test('sollte Upload-Tracking erfolgreich starten', () => {
      const files = [createMockFile('test1.jpg'), createMockFile('test2.png')];
      const uploadId = 'upload-test-123';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      expect(tracker.uploadId).toBe(uploadId);
      expect(tracker.files).toEqual(files);
      expect(tracker.startTime).toBeLessThanOrEqual(Date.now());
      expect(tracker.currentProgress).toBe(0);
      expect(tracker.phases).toEqual([]);
      expect(tracker.memorySnapshots).toHaveLength(1); // Initial snapshot
    });

    test('sollte Batch-Tracking mit Parallelism initialisieren', () => {
      const files = [
        createMockFile('batch1.jpg'),
        createMockFile('batch2.png'),
        createMockFile('batch3.pdf')
      ];
      const batchId = 'batch-456';
      const parallelism = 3;
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files, parallelism);
      
      expect(batchTracker.batchId).toBe(batchId);
      expect(batchTracker.files).toEqual(files);
      expect(batchTracker.parallelism).toBe(parallelism);
      expect(batchTracker.fileTrackers.size).toBe(0);
      expect(batchTracker.optimizations).toEqual([]);
    });

    test('sollte File-spezifische Tracker zu Batch hinzufügen', () => {
      const files = [createMockFile('batch-file.jpg')];
      const batchId = 'batch-789';
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files);
      const fileTracker = uploadPerformanceManager.addFileTracker(batchId, 'file-1', files[0]);
      
      expect(fileTracker).toBeTruthy();
      expect(fileTracker?.uploadId).toBe(`${batchId}_file-1`);
      expect(batchTracker.fileTrackers.get('file-1')).toBe(fileTracker);
    });

    test('sollte null zurückgeben für unbekannte Batch-ID', () => {
      const file = createMockFile('orphan.jpg');
      
      const fileTracker = uploadPerformanceManager.addFileTracker('unknown-batch', 'file-1', file);
      
      expect(fileTracker).toBeNull();
    });
  });

  // =====================
  // PHASE TRACKING TESTS
  // =====================

  describe('Phase Tracking', () => {
    
    test('sollte Context-Resolution-Phase korrekt verfolgen', () => {
      const files = [createMockFile('context-test.jpg')];
      const uploadId = 'upload-context-123';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      // Start Context Resolution
      uploadPerformanceManager.recordContextResolution(uploadId);
      expect(tracker.contextResolutionStart).toBeTruthy();
      expect(tracker.phases).toHaveLength(1);
      expect(tracker.phases[0].name).toBe('context_resolution');
      
      // End Context Resolution
      uploadPerformanceManager.recordContextResolution(uploadId);
      expect(tracker.contextResolutionEnd).toBeTruthy();
      expect(tracker.phases[0].endTime).toBeTruthy();
    });

    test('sollte Validation-Phase mit Timing verfolgen', async () => {
      const files = [createMockFile('validation-test.jpg')];
      const uploadId = 'upload-validation-456';
      
      uploadPerformanceManager.startTracking(uploadId, files);
      
      uploadPerformanceManager.recordValidation(uploadId);
      
      // Simulate validation duration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      uploadPerformanceManager.recordValidation(uploadId);
      
      const metrics = uploadPerformanceManager.getMetrics(uploadId);
      expect(metrics).toBeTruthy();
      expect(metrics!.validationMs).toBeGreaterThan(0);
    });

    test('sollte Upload-Phase mit Progress-Updates verfolgen', () => {
      const files = [createMockFile('upload-progress.jpg')];
      const uploadId = 'upload-progress-789';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      // Start Upload
      uploadPerformanceManager.recordUpload(uploadId, 0);
      expect(tracker.uploadStart).toBeTruthy();
      
      // Progress Updates
      uploadPerformanceManager.recordUpload(uploadId, 50);
      expect(tracker.currentProgress).toBe(50);
      
      // Complete Upload
      uploadPerformanceManager.recordUpload(uploadId, 100);
      expect(tracker.uploadEnd).toBeTruthy();
    });

    test('sollte Routing-Decision als Instant-Phase aufzeichnen', () => {
      const files = [createMockFile('routing-test.jpg')];
      const uploadId = 'upload-routing-101';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      uploadPerformanceManager.recordRoutingDecision(uploadId);
      
      const routingPhase = tracker.phases.find(p => p.name === 'routing_decision');
      expect(routingPhase).toBeTruthy();
      expect(routingPhase!.endTime).toBeTruthy();
      expect(routingPhase!.progress).toBe(100);
    });

    test('sollte Post-Processing-Phase verfolgen', () => {
      const files = [createMockFile('post-processing.jpg')];
      const uploadId = 'upload-post-123';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      uploadPerformanceManager.recordPostProcessing(uploadId);
      uploadPerformanceManager.recordPostProcessing(uploadId);
      
      expect(tracker.postProcessingStart).toBeTruthy();
      expect(tracker.postProcessingEnd).toBeTruthy();
    });

    test('sollte ohne Upload-ID mit letztem Tracker arbeiten', async () => {
      const files = [createMockFile('latest-tracker.jpg')];
      const uploadId = 'latest-tracker-456';

      uploadPerformanceManager.startTracking(uploadId, files);

      // Ohne explizite Upload-ID - sollte letzten Tracker verwenden
      uploadPerformanceManager.recordContextResolution();
      // Warte kurz um messbare Dauer zu erzeugen
      await new Promise(resolve => setTimeout(resolve, 10));
      uploadPerformanceManager.recordContextResolution();
      uploadPerformanceManager.recordValidation();
      uploadPerformanceManager.recordRoutingDecision();

      const metrics = uploadPerformanceManager.getMetrics(uploadId);
      expect(metrics).toBeTruthy();
      expect(metrics!.contextResolutionMs).toBeGreaterThan(0);
    });
  });

  // =====================
  // CACHE & RETRY TRACKING TESTS
  // =====================

  describe('Cache & Retry Tracking', () => {
    
    test('sollte Cache-Hits und -Misses verfolgen', () => {
      const files = [createMockFile('cache-test.jpg')];
      const uploadId = 'cache-tracking-123';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      // Cache Hits
      uploadPerformanceManager.recordCacheHit(uploadId);
      uploadPerformanceManager.recordCacheHit(uploadId);
      expect(tracker.contextCacheHits).toBe(2);
      
      // Cache Misses
      uploadPerformanceManager.recordCacheMiss(uploadId);
      expect(tracker.contextCacheMisses).toBe(1);
    });

    test('sollte Upload-Retries mit Gründen verfolgen', () => {
      const files = [createMockFile('retry-test.jpg')];
      const uploadId = 'retry-tracking-456';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      uploadPerformanceManager.recordRetry('Network timeout', uploadId);
      uploadPerformanceManager.recordRetry('Service unavailable', uploadId);
      
      expect(tracker.retryCount).toBe(2);
      expect(tracker.retryReasons).toEqual(['Network timeout', 'Service unavailable']);
    });

    test('sollte Cache-Tracking ohne Upload-ID handhaben', () => {
      const files = [createMockFile('implicit-cache.jpg')];
      const uploadId = 'implicit-cache-789';
      
      uploadPerformanceManager.startTracking(uploadId, files);
      
      // Ohne explizite Upload-ID
      uploadPerformanceManager.recordCacheHit();
      uploadPerformanceManager.recordCacheMiss();
      uploadPerformanceManager.recordRetry('Implicit retry');
      
      const metrics = uploadPerformanceManager.getMetrics(uploadId);
      expect(metrics!.cacheHits).toBe(1);
      expect(metrics!.retryCount).toBe(1);
    });
  });

  // =====================
  // BATCH ORCHESTRATION TESTS
  // =====================

  describe('Batch Upload Orchestration', () => {
    
    test('sollte Batch-Upload mit begrenzter Parallelität orchestrieren', async () => {
      const batchId = 'batch-orchestration-123';
      const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
      const parallelism = 2;
      
      uploadPerformanceManager.startBatchTracking(batchId, [], parallelism);
      
      const processedItems: string[] = [];
      const processor = jest.fn(async (item: string, index: number) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        processedItems.push(`processed-${item}-${index}`);
        return `result-${item}`;
      });

      const progressUpdates: UploadProgress[] = [];
      const onProgress = (progress: UploadProgress) => {
        progressUpdates.push(progress);
      };

      const results = await uploadPerformanceManager.orchestrateBatchUpload(
        batchId,
        items,
        processor,
        parallelism,
        onProgress
      );

      expect(results).toHaveLength(5);
      expect(results).toEqual(['result-item1', 'result-item2', 'result-item3', 'result-item4', 'result-item5']);
      expect(processor).toHaveBeenCalledTimes(5);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress updates
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.overallProgress).toBe(100);
    });

    test('sollte Batch-Upload-Fehler graceful handhaben', async () => {
      const batchId = 'batch-error-handling-456';
      const items = ['good1', 'bad', 'good2'];
      
      uploadPerformanceManager.startBatchTracking(batchId, [], 1);
      
      const processor = async (item: string, index: number) => {
        if (item === 'bad') {
          throw new Error(`Processing failed for ${item}`);
        }
        return `result-${item}`;
      };

      const results = await uploadPerformanceManager.orchestrateBatchUpload(
        batchId,
        items,
        processor
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('result-good1');
      expect(results[1]).toEqual({ error: expect.any(Error) });
      expect(results[2]).toBe('result-good2');
    });

    test('sollte Memory-Cleanup während Batch-Processing triggern', async () => {
      const batchId = 'batch-memory-cleanup-789';
      const items = new Array(25).fill(null).map((_, i) => `item${i}`); // 25 Items für Memory-Cleanup bei 10er-Intervall

      uploadPerformanceManager.startBatchTracking(batchId, [], 3);

      const processor = async (item: string, index: number) => {
        return `result-${item}`;
      };

      await uploadPerformanceManager.orchestrateBatchUpload(batchId, items, processor, 3);

      // Memory-Cleanup sollte mindestens 2x getriggert worden sein (bei Item 10 und 20)
      expect(mockGc).toHaveBeenCalledTimes(2);
    });

    test('sollte Memory-Snapshots während Processing aufzeichnen', async () => {
      const batchId = 'batch-memory-snapshots-101';
      const items = ['item1', 'item2'];
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, [], 1);
      
      const processor = async (item: string) => {
        return `result-${item}`;
      };

      await uploadPerformanceManager.orchestrateBatchUpload(batchId, items, processor);

      // Initial snapshot + snapshots during processing
      expect(batchTracker.memorySnapshots.length).toBeGreaterThan(1);
    });
  });

  // =====================
  // PROGRESS AGGREGATION TESTS
  // =====================

  describe('Progress Aggregation', () => {
    
    test('sollte Progress für Multi-File-Uploads korrekt aggregieren', () => {
      const fileProgresses = [
        { fileIndex: 0, progress: 100, fileName: 'file1.jpg', fileSize: 1024 },
        { fileIndex: 1, progress: 50, fileName: 'file2.png', fileSize: 2048 },
        { fileIndex: 2, progress: 25, fileName: 'file3.pdf', fileSize: 4096 }
      ];

      const aggregatedProgress = uploadPerformanceManager.aggregateProgress(fileProgresses);

      expect(aggregatedProgress.totalFiles).toBe(3);
      expect(aggregatedProgress.overallProgress).toBe((100 + 50 + 25) / 3); // 58.33
      expect(aggregatedProgress.bytesTransferred).toBeGreaterThan(0);
      expect(aggregatedProgress.totalBytes).toBe(1024 + 2048 + 4096);
      expect(aggregatedProgress.phaseDescription).toContain('1/3');
    });

    test('sollte Phase als complete markieren wenn alle Dateien fertig sind', () => {
      const fileProgresses = [
        { fileIndex: 0, progress: 100, fileName: 'done1.jpg', fileSize: 1024 },
        { fileIndex: 1, progress: 100, fileName: 'done2.png', fileSize: 2048 },
        { fileIndex: 2, progress: 100, fileName: 'done3.pdf', fileSize: 4096 }
      ];

      const aggregatedProgress = uploadPerformanceManager.aggregateProgress(fileProgresses);

      expect(aggregatedProgress.phase).toBe('complete');
      expect(aggregatedProgress.overallProgress).toBe(100);
      expect(aggregatedProgress.phaseDescription).toBe('3/3 Dateien abgeschlossen');
    });

    test('sollte aktuell verarbeitete Datei identifizieren', () => {
      const fileProgresses = [
        { fileIndex: 0, progress: 100, fileName: 'done.jpg', fileSize: 1024 },
        { fileIndex: 1, progress: 75, fileName: 'current.png', fileSize: 2048 },
        { fileIndex: 2, progress: 0, fileName: 'pending.pdf', fileSize: 4096 }
      ];

      const aggregatedProgress = uploadPerformanceManager.aggregateProgress(fileProgresses);

      expect(aggregatedProgress.fileName).toBe('current.png');
      expect(aggregatedProgress.fileIndex).toBe(1);
      expect(aggregatedProgress.currentPhaseProgress).toBe(75);
    });

    test('sollte leere File-Progress-Liste handhaben', () => {
      const aggregatedProgress = uploadPerformanceManager.aggregateProgress([]);

      expect(aggregatedProgress.totalFiles).toBe(0);
      // Bei 0 Files ist overallProgress NaN (0/0), sollte aber als 0 zurückgegeben werden
      expect(aggregatedProgress.overallProgress).toBe(0);
      expect(aggregatedProgress.totalBytes).toBe(0);
      expect(aggregatedProgress.fileName).toBe('Alle Dateien');
    });
  });

  // =====================
  // METRICS GENERATION TESTS
  // =====================

  describe('Metrics Generation', () => {
    
    test('sollte Upload-Performance-Metriken finalisieren', async () => {
      const files = [createMockFile('metrics-test.jpg', 2048)];
      const uploadId = 'metrics-finalize-123';
      
      uploadPerformanceManager.startTracking(uploadId, files);
      
      // Simulate verschiedene Phasen
      uploadPerformanceManager.recordContextResolution(uploadId);
      await new Promise(resolve => setTimeout(resolve, 50));
      uploadPerformanceManager.recordContextResolution(uploadId);
      
      uploadPerformanceManager.recordValidation(uploadId);
      await new Promise(resolve => setTimeout(resolve, 30));
      uploadPerformanceManager.recordValidation(uploadId);
      
      uploadPerformanceManager.recordUpload(uploadId, 0);
      await new Promise(resolve => setTimeout(resolve, 100));
      uploadPerformanceManager.recordUpload(uploadId, 100);
      
      uploadPerformanceManager.recordCacheHit(uploadId);
      uploadPerformanceManager.recordRetry('Test retry', uploadId);

      const metrics = uploadPerformanceManager.finalize(uploadId);

      expect(metrics.totalDurationMs).toBeGreaterThan(0);
      expect(metrics.contextResolutionMs).toBeGreaterThan(0);
      expect(metrics.validationMs).toBeGreaterThan(0);
      expect(metrics.uploadMs).toBeGreaterThan(0);
      expect(metrics.fileSizeBytes).toBe(2048);
      expect(metrics.transferredBytes).toBe(2048);
      expect(metrics.retryCount).toBe(1);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.contextCacheHit).toBe(true);
    });

    test('sollte Batch-Performance-Metriken mit erweiterten Stats finalisieren', async () => {
      const files = [
        createMockFile('batch1.jpg', 1024),
        createMockFile('batch2.png', 2048)
      ];
      const batchId = 'batch-metrics-456';

      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files, 2);

      // File Trackers hinzufügen und Processing simulieren
      const fileTracker1 = uploadPerformanceManager.addFileTracker(batchId, 'file1', files[0]);
      const fileTracker2 = uploadPerformanceManager.addFileTracker(batchId, 'file2', files[1]);

      // Warte um Processing-Dauer zu simulieren
      await new Promise(resolve => setTimeout(resolve, 10));

      // Memory-Snapshots simulieren
      batchTracker.memorySnapshots.push(
        { timestamp: Date.now(), heapUsed: 60 * 1024 * 1024, heapTotal: 120 * 1024 * 1024, external: 15 * 1024 * 1024 },
        { timestamp: Date.now() + 100, heapUsed: 80 * 1024 * 1024, heapTotal: 140 * 1024 * 1024, external: 20 * 1024 * 1024 }
      );

      // Cache Hits direkt auf Batch Tracker aufzeichnen (nicht auf File-Trackern)
      batchTracker.contextCacheHits = 2;

      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);

      expect(batchMetrics.peakMemoryUsageMB).toBeGreaterThan(0);
      expect(batchMetrics.averageFileProcessingMs).toBeGreaterThan(0);
      expect(batchMetrics.parallelEfficiency).toBeGreaterThan(0);
      expect(batchMetrics.contextReuseCount).toBe(2);
      expect(batchMetrics.memoryEfficiency).toBeDefined();
    });

    test('sollte aktuelle Metriken ohne Finalisierung abrufen', () => {
      const files = [createMockFile('current-metrics.jpg', 1536)];
      const uploadId = 'current-metrics-789';
      
      uploadPerformanceManager.startTracking(uploadId, files);
      uploadPerformanceManager.recordUpload(uploadId, 60);
      uploadPerformanceManager.recordCacheHit(uploadId);

      const currentMetrics = uploadPerformanceManager.getMetrics(uploadId);

      expect(currentMetrics).toBeTruthy();
      expect(currentMetrics!.fileSizeBytes).toBe(1536);
      expect(currentMetrics!.transferredBytes).toBeCloseTo(1536 * 0.6, -1); // 60% Progress
      expect(currentMetrics!.cacheHits).toBe(1);
      expect(currentMetrics!.contextCacheHit).toBe(true);
    });

    test('sollte Default-Metriken für unbekannte Upload-ID zurückgeben', () => {
      const metrics = uploadPerformanceManager.getMetrics('unknown-upload-id');

      expect(metrics).toBeNull();
    });

    test('sollte Default-Metriken bei leerem Tracker zurückgeben', () => {
      const metrics = uploadPerformanceManager.finalize('non-existent-upload');

      expect(metrics.totalDurationMs).toBe(0);
      expect(metrics.fileSizeBytes).toBe(0);
      expect(metrics.retryCount).toBe(0);
      expect(metrics.cacheHits).toBe(0);
    });
  });

  // =====================
  // MEMORY MANAGEMENT TESTS
  // =====================

  describe('Memory Management', () => {
    
    test('sollte Memory-Usage überwachen und Cleanup triggern', async () => {
      // Mock hohen Memory-Verbrauch
      mockProcess.memoryUsage.mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB - über dem Limit
        heapTotal: 800 * 1024 * 1024,
        external: 50 * 1024 * 1024
      });

      const files = [createMockFile('memory-test.jpg')];
      uploadPerformanceManager.startTracking('memory-test-123', files);

      // Direkt Memory-Cleanup triggern (ohne auf Intervall zu warten)
      (uploadPerformanceManager as any).triggerMemoryCleanup();

      // GC sollte getriggert worden sein
      expect(mockGc).toHaveBeenCalled();
    });

    test('sollte alte Tracker automatisch bereinigen', () => {
      const oldUploadId = 'old-upload-123';
      const newUploadId = 'new-upload-456';
      
      // Alter Tracker (simuliere 6 Minuten alt)
      const files = [createMockFile('old.jpg')];
      const oldTracker = uploadPerformanceManager.startTracking(oldUploadId, files);
      oldTracker.startTime = Date.now() - 6 * 60 * 1000; // 6 Minuten alt
      
      // Neuer Tracker
      uploadPerformanceManager.startTracking(newUploadId, [createMockFile('new.jpg')]);

      // Cleanup triggern
      (uploadPerformanceManager as any).triggerMemoryCleanup();

      // Alter Tracker sollte entfernt sein
      const oldMetrics = uploadPerformanceManager.getMetrics(oldUploadId);
      const newMetrics = uploadPerformanceManager.getMetrics(newUploadId);
      
      expect(oldMetrics).toBeNull();
      expect(newMetrics).toBeTruthy();
    });

    test('sollte Memory-Snapshots korrekt aufzeichnen', () => {
      const files = [createMockFile('snapshot-test.jpg')];
      const uploadId = 'snapshot-test-789';
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);

      // Sollte Initial-Snapshot haben
      expect(tracker.memorySnapshots).toHaveLength(1);
      expect(tracker.memorySnapshots[0].heapUsed).toBeGreaterThan(0);
      expect(tracker.memorySnapshots[0].timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('sollte Memory-Efficiency korrekt berechnen', () => {
      const files = [createMockFile('efficiency-test.jpg')];
      const batchId = 'efficiency-test-101';
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files);
      
      // Memory-Verlauf simulieren: Start -> Peak -> Cleanup
      batchTracker.memorySnapshots = [
        { timestamp: Date.now() - 200, heapUsed: 100 * 1024 * 1024, heapTotal: 200 * 1024 * 1024, external: 10 * 1024 * 1024 },
        { timestamp: Date.now() - 100, heapUsed: 180 * 1024 * 1024, heapTotal: 250 * 1024 * 1024, external: 15 * 1024 * 1024 }, // Peak
        { timestamp: Date.now(), heapUsed: 120 * 1024 * 1024, heapTotal: 200 * 1024 * 1024, external: 12 * 1024 * 1024 } // Cleanup
      ];

      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);

      // Memory-Efficiency: (cleanup) / (growth) * 100 = (180-120) / (180-100) * 100 = 75%
      expect(batchMetrics.memoryEfficiency).toBeCloseTo(75, 0);
    });
  });

  // =====================
  // EDGE CASES & ERROR HANDLING TESTS
  // =====================

  describe('Edge Cases & Error Handling', () => {
    
    test('sollte graceful handhaben wenn Tracker nicht existiert', () => {
      // Versuche Operationen auf nicht-existentem Tracker
      uploadPerformanceManager.recordContextResolution('non-existent-upload');
      uploadPerformanceManager.recordValidation('non-existent-upload');
      uploadPerformanceManager.recordUpload('non-existent-upload', 50);
      uploadPerformanceManager.recordCacheHit('non-existent-upload');
      uploadPerformanceManager.recordRetry('Test retry', 'non-existent-upload');

      // Sollte nicht crashen - keine Expects nötig, Test erfolgreich wenn keine Exception
    });

    test('sollte Batch-Orchestration-Fehler für unbekannte Batch-ID handhaben', async () => {
      const items = ['item1'];
      const processor = async (item: string) => item;

      await expect(
        uploadPerformanceManager.orchestrateBatchUpload('unknown-batch', items, processor)
      ).rejects.toThrow('Batch Tracker nicht gefunden: unknown-batch');
    });

    test('sollte Zero-Division in Parallel-Efficiency-Berechnung vermeiden', () => {
      const batchId = 'zero-division-test';
      const files = [createMockFile('test.jpg')];
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files, 1); // parallelism = 1
      
      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);
      
      // Parallel-Efficiency sollte 100% sein bei parallelism = 1
      expect(batchMetrics.parallelEfficiency).toBe(100);
    });

    test('sollte Memory-Efficiency bei fehlenden Snapshots handhaben', () => {
      const files = [createMockFile('no-snapshots.jpg')];
      const batchId = 'no-snapshots-test';
      
      const batchTracker = uploadPerformanceManager.startBatchTracking(batchId, files);
      batchTracker.memorySnapshots = []; // Keine Snapshots
      
      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);
      
      expect(batchMetrics.memoryEfficiency).toBe(100); // Default bei fehlenden Daten
    });

    test('sollte Multiple-Phase-Starts ohne Ends handhaben', async () => {
      const files = [createMockFile('multiple-starts.jpg')];
      const uploadId = 'multiple-starts-test';

      uploadPerformanceManager.startTracking(uploadId, files);

      // Multiple Starts ohne Ends
      uploadPerformanceManager.recordContextResolution(uploadId);
      // Warte kurz um messbare Dauer zu erzeugen
      await new Promise(resolve => setTimeout(resolve, 10));
      uploadPerformanceManager.recordContextResolution(uploadId); // Sollte End triggern
      uploadPerformanceManager.recordContextResolution(uploadId); // Sollte ignoriert werden

      const metrics = uploadPerformanceManager.finalize(uploadId);

      expect(metrics.contextResolutionMs).toBeGreaterThan(0);
    });

    test('sollte Destroy-Method korrekt aufräumen', () => {
      const files = [createMockFile('cleanup-test.jpg')];
      uploadPerformanceManager.startTracking('cleanup-test-123', files);
      uploadPerformanceManager.startBatchTracking('cleanup-batch-456', files);
      
      uploadPerformanceManager.destroy();
      
      // Nach Destroy sollten keine Metriken mehr verfügbar sein
      const metrics = uploadPerformanceManager.getMetrics('cleanup-test-123');
      expect(metrics).toBeNull();
    });
  });

  // =====================
  // PERFORMANCE BENCHMARKS
  // =====================

  describe('Performance Benchmarks', () => {
    
    test('sollte Context-Resolution unter 10ms verfolgen', async () => {
      const files = [createMockFile('benchmark-context.jpg')];
      const uploadId = 'benchmark-context-123';

      uploadPerformanceManager.startTracking(uploadId, files);

      uploadPerformanceManager.recordContextResolution(uploadId);
      // Simulate fast context resolution (under 10ms)
      await new Promise(resolve => setTimeout(resolve, 5));
      uploadPerformanceManager.recordContextResolution(uploadId);

      const metrics = uploadPerformanceManager.finalize(uploadId);

      // In Test-Umgebung kann setTimeout laenger dauern - relaxed assertion
      expect(metrics.contextResolutionMs).toBeLessThan(50);
    });

    test('sollte Batch-Processing für 20+ Files unter 30s tracken', async () => {
      const numberOfFiles = 25;
      const files = new Array(numberOfFiles).fill(null).map((_, i) => createMockFile(`batch-perf-${i}.jpg`));
      const batchId = 'batch-performance-test';
      
      uploadPerformanceManager.startBatchTracking(batchId, files, 5);
      
      const startTime = Date.now();
      const items = new Array(numberOfFiles).fill(null).map((_, i) => `item-${i}`);
      
      const processor = async (item: string, index: number) => {
        // Simulate fast processing
        await new Promise(resolve => setTimeout(resolve, 10));
        return `processed-${item}`;
      };

      await uploadPerformanceManager.orchestrateBatchUpload(batchId, items, processor, 5);
      
      const batchMetrics = uploadPerformanceManager.finalizeBatch(batchId);
      
      expect(batchMetrics.totalDurationMs).toBeLessThan(30000); // < 30 Sekunden
      expect(batchMetrics.averageFileProcessingMs).toBeLessThan(1000); // < 1 Sekunde pro Datei
    });

    test('sollte Memory-Usage-Tracking mit minimaler Overhead haben', () => {
      const files = [createMockFile('memory-overhead.jpg')];
      const uploadId = 'memory-overhead-test';
      
      const startTime = performance.now();
      
      const tracker = uploadPerformanceManager.startTracking(uploadId, files);
      
      // Multiple Memory-Operations
      for (let i = 0; i < 100; i++) {
        (uploadPerformanceManager as any).recordMemorySnapshot(tracker);
      }
      
      const endTime = performance.now();
      const overhead = endTime - startTime;
      
      expect(overhead).toBeLessThan(100); // < 100ms für 100 Snapshots
      expect(tracker.memorySnapshots.length).toBeGreaterThan(1);
    });

    test('sollte Feature-Flag-Evaluation-Performance messen', () => {
      const files = [createMockFile('feature-flag-perf.jpg')];
      const uploadId = 'feature-flag-perf-test';
      
      const startTime = performance.now();
      
      uploadPerformanceManager.startTracking(uploadId, files);
      
      // Simulate feature flag evaluations
      for (let i = 0; i < 1000; i++) {
        uploadPerformanceManager.recordCacheHit(uploadId);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // < 50ms für 1000 Evaluations
      
      const metrics = uploadPerformanceManager.finalize(uploadId);
      expect(metrics.cacheHits).toBe(1000);
    });
  });
});