// src/lib/firebase/upload-performance-manager.ts
// Upload Performance Manager für Unified Upload API
// Batch-Upload-Orchestration, Progress-Aggregation und Memory-Management

import {
  UploadPerformanceMetrics,
  BatchPerformanceMetrics,
  UploadProgress
} from '@/types/unified-upload';
import { Timestamp } from 'firebase/firestore';

// =====================
// PERFORMANCE TRACKING INTERFACES
// =====================

interface PerformanceTracker {
  uploadId: string;
  startTime: number;
  files: File[];
  
  // Timing Checkpoints
  contextResolutionStart?: number;
  contextResolutionEnd?: number;
  validationStart?: number;
  validationEnd?: number;
  uploadStart?: number;
  uploadEnd?: number;
  postProcessingStart?: number;
  postProcessingEnd?: number;
  
  // Progress Tracking
  currentProgress: number;
  phases: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    progress: number;
  }>;
  
  // Memory Tracking
  memorySnapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  }>;
  
  // Cache Performance
  contextCacheHits: number;
  contextCacheMisses: number;
  
  // Retry Tracking
  retryCount: number;
  retryReasons: string[];
  
  // Methods für Tracking
  recordContextResolution(): void;
  recordRoutingDecision(): void;
  finalize(): UploadPerformanceMetrics;
}

interface BatchTracker extends PerformanceTracker {
  batchId: string;
  fileTrackers: Map<string, PerformanceTracker>;
  parallelism: number;
  optimizations: string[];
}

// =====================
// UPLOAD PERFORMANCE MANAGER SERVICE
// =====================

class UploadPerformanceManagerService {
  private trackers = new Map<string, PerformanceTracker>();
  private batchTrackers = new Map<string, BatchTracker>();
  private memoryMonitorInterval?: NodeJS.Timeout;
  private gcEventCount = 0;

  constructor() {
    this.initializeMemoryMonitoring();
  }

  // =====================
  // TRACKING MANAGEMENT
  // =====================

  /**
   * Starte Performance-Tracking für Upload
   */
  startTracking(uploadId: string, files: File[]): PerformanceTracker {
    const self = this;
    const tracker: PerformanceTracker = {
      uploadId,
      startTime: Date.now(),
      files,
      currentProgress: 0,
      phases: [],
      memorySnapshots: [],
      contextCacheHits: 0,
      contextCacheMisses: 0,
      retryCount: 0,
      retryReasons: [],
      
      recordContextResolution() {
        this.contextResolutionEnd = Date.now();
        if (!this.contextResolutionStart) {
          this.contextResolutionStart = this.contextResolutionEnd - 50; // Fallback
        }
      },
      
      recordRoutingDecision() {
        // Mark routing decision time
        self.recordPhase(this.uploadId, 'routing', Date.now());
      },
      
      finalize(): UploadPerformanceMetrics {
        return self.finalizeMetrics(this.uploadId);
      }
    };

    this.trackers.set(uploadId, tracker);
    this.recordMemorySnapshot(tracker);
    
    return tracker;
  }

  /**
   * Starte Batch-Tracking
   */
  startBatchTracking(batchId: string, files: File[], parallelism: number = 1): BatchTracker {
    const self = this;
    const batchTracker: BatchTracker = {
      uploadId: batchId,
      batchId,
      startTime: Date.now(),
      files,
      currentProgress: 0,
      phases: [],
      memorySnapshots: [],
      contextCacheHits: 0,
      contextCacheMisses: 0,
      retryCount: 0,
      retryReasons: [],
      fileTrackers: new Map(),
      parallelism,
      optimizations: [],
      
      recordContextResolution() {
        this.contextResolutionEnd = Date.now();
        if (!this.contextResolutionStart) {
          this.contextResolutionStart = this.contextResolutionEnd - 50; // Fallback
        }
      },
      
      recordRoutingDecision() {
        // Mark routing decision time
        self.recordPhase(this.uploadId, 'routing', Date.now());
      },
      
      finalize(): UploadPerformanceMetrics {
        return self.finalizeMetrics(this.uploadId);
      }
    };

    this.batchTrackers.set(batchId, batchTracker);
    this.recordMemorySnapshot(batchTracker);
    
    return batchTracker;
  }

  /**
   * File-spezifisches Tracking zu Batch hinzufügen
   */
  addFileTracker(batchId: string, fileId: string, file: File): PerformanceTracker | null {
    const batchTracker = this.batchTrackers.get(batchId);
    if (!batchTracker) return null;

    const fileTracker = this.startTracking(`${batchId}_${fileId}`, [file]);
    batchTracker.fileTrackers.set(fileId, fileTracker);
    
    return fileTracker;
  }

  // =====================
  // PHASE TRACKING
  // =====================

  /**
   * Context Resolution Phase
   */
  recordContextResolution(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) return;

    if (!tracker.contextResolutionStart) {
      tracker.contextResolutionStart = Date.now();
      this.startPhase(tracker, 'context_resolution');
    } else if (!tracker.contextResolutionEnd) {
      tracker.contextResolutionEnd = Date.now();
      this.endPhase(tracker, 'context_resolution');
    }
  }

  /**
   * Validation Phase
   */
  recordValidation(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) return;

    if (!tracker.validationStart) {
      tracker.validationStart = Date.now();
      this.startPhase(tracker, 'validation');
    } else if (!tracker.validationEnd) {
      tracker.validationEnd = Date.now();
      this.endPhase(tracker, 'validation');
    }
  }

  /**
   * Routing Decision Phase
   */
  recordRoutingDecision(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) return;

    this.recordInstantPhase(tracker, 'routing_decision', 10); // 10ms estimated
  }

  /**
   * Upload Phase
   */
  recordUpload(uploadId?: string, progress?: number): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) return;

    if (!tracker.uploadStart) {
      tracker.uploadStart = Date.now();
      this.startPhase(tracker, 'upload');
    }

    if (progress !== undefined) {
      this.updateProgress(tracker, 'upload', progress);
    }

    if (progress === 100 && !tracker.uploadEnd) {
      tracker.uploadEnd = Date.now();
      this.endPhase(tracker, 'upload');
    }
  }

  /**
   * Post-Processing Phase
   */
  recordPostProcessing(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) return;

    if (!tracker.postProcessingStart) {
      tracker.postProcessingStart = Date.now();
      this.startPhase(tracker, 'post_processing');
    } else if (!tracker.postProcessingEnd) {
      tracker.postProcessingEnd = Date.now();
      this.endPhase(tracker, 'post_processing');
    }
  }

  // =====================
  // CACHE & RETRY TRACKING
  // =====================

  /**
   * Context Cache Hit
   */
  recordCacheHit(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (tracker) {
      tracker.contextCacheHits++;
    }
  }

  /**
   * Context Cache Miss
   */
  recordCacheMiss(uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (tracker) {
      tracker.contextCacheMisses++;
    }
  }

  /**
   * Upload Retry
   */
  recordRetry(reason: string, uploadId?: string): void {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (tracker) {
      tracker.retryCount++;
      tracker.retryReasons.push(reason);
    }
  }

  // =====================
  // BATCH OPTIMIZATIONS
  // =====================

  /**
   * Batch-Upload mit Parallel-Processing orchestrieren
   */
  async orchestrateBatchUpload<T>(
    batchId: string,
    items: T[],
    processor: (item: T, index: number) => Promise<any>,
    parallelism: number = 3,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any[]> {
    const batchTracker = this.batchTrackers.get(batchId);
    if (!batchTracker) {
      throw new Error(`Batch Tracker nicht gefunden: ${batchId}`);
    }

    const results: any[] = [];
    const startTime = Date.now();
    
    // Parallel Processing mit begrenzter Concurrency
    const semaphore = new Array(parallelism).fill(null);
    let processedCount = 0;
    
    const processItem = async (item: T, index: number): Promise<void> => {
      try {
        // Memory Snapshot vor Verarbeitung
        this.recordMemorySnapshot(batchTracker);
        
        const result = await processor(item, index);
        results[index] = result;
        
        processedCount++;
        const progress = (processedCount / items.length) * 100;
        
        // Progress Update
        batchTracker.currentProgress = progress;
        onProgress?.({
          phase: 'uploading',
          overallProgress: progress,
          currentPhaseProgress: progress,
          phaseDescription: `Verarbeitet ${processedCount}/${items.length} Dateien`,
          fileName: `Item ${index}`,
          fileIndex: index,
          totalFiles: items.length,
          bytesTransferred: 0,
          totalBytes: 0,
          transferRate: 0,
          estimatedRemainingMs: ((Date.now() - startTime) / processedCount) * (items.length - processedCount),
          startedAt: Timestamp.fromMillis(startTime)
        });

        // Memory Cleanup nach Verarbeitung
        if (processedCount % 10 === 0) {
          this.triggerMemoryCleanup();
        }

      } catch (error) {
        results[index] = { error };
        processedCount++;
      }
    };

    // Batch-Processing mit Concurrency-Limit
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += parallelism) {
      batches.push(items.slice(i, i + parallelism));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map((item, batchIndex) => {
          const globalIndex = batches.indexOf(batch) * parallelism + batchIndex;
          return processItem(item, globalIndex);
        })
      );
    }

    // Final Memory Snapshot
    this.recordMemorySnapshot(batchTracker);
    batchTracker.optimizations.push(`parallel_processing_${parallelism}`);
    
    return results;
  }

  /**
   * Progress-Aggregation für Multi-File-Uploads
   */
  aggregateProgress(
    fileProgresses: Array<{
      fileIndex: number;
      progress: number;
      fileName: string;
      fileSize: number;
    }>
  ): UploadProgress {
    const totalFiles = fileProgresses.length;
    const completedFiles = fileProgresses.filter(fp => fp.progress === 100).length;
    const overallProgress = fileProgresses.reduce((sum, fp) => sum + fp.progress, 0) / totalFiles;
    
    const totalSize = fileProgresses.reduce((sum, fp) => sum + fp.fileSize, 0);
    const transferredBytes = fileProgresses.reduce((sum, fp) => sum + (fp.fileSize * fp.progress / 100), 0);
    
    const currentFile = fileProgresses.find(fp => fp.progress > 0 && fp.progress < 100);
    
    return {
      phase: completedFiles === totalFiles ? 'complete' : 'uploading',
      overallProgress,
      currentPhaseProgress: currentFile?.progress || 100,
      phaseDescription: `${completedFiles}/${totalFiles} Dateien abgeschlossen`,
      fileName: currentFile?.fileName || 'Alle Dateien',
      fileIndex: currentFile?.fileIndex,
      totalFiles,
      bytesTransferred: Math.floor(transferredBytes),
      totalBytes: totalSize,
      transferRate: 0, // Würde echte Berechnung erfordern
      estimatedRemainingMs: 0,
      startedAt: Timestamp.now()
    };
  }

  // =====================
  // METRICS GENERATION
  // =====================

  /**
   * Performance-Metriken finalisieren
   */
  finalize(uploadId?: string): UploadPerformanceMetrics {
    const tracker = uploadId ? this.trackers.get(uploadId) : this.getLatestTracker();
    if (!tracker) {
      return this.getDefaultMetrics();
    }

    const totalDuration = Date.now() - tracker.startTime;
    const totalFileSize = tracker.files.reduce((sum, file) => sum + file.size, 0);

    const metrics: UploadPerformanceMetrics = {
      totalDurationMs: totalDuration,
      contextResolutionMs: this.getPhasesDuration(tracker, 'context_resolution'),
      validationMs: this.getPhasesDuration(tracker, 'validation'),
      uploadMs: this.getPhasesDuration(tracker, 'upload'),
      postProcessingMs: this.getPhasesDuration(tracker, 'post_processing'),
      fileSizeBytes: totalFileSize,
      transferredBytes: totalFileSize, // Vereinfacht
      serviceLatencyMs: this.calculateServiceLatency(tracker),
      retryCount: tracker.retryCount,
      cacheHits: tracker.contextCacheHits,
      routingDecisionMs: this.getPhasesDuration(tracker, 'routing_decision'),
      contextCacheHit: tracker.contextCacheHits > 0,
      recommendationGenerated: false // Würde von Recommendation Engine kommen
    };

    // Cleanup
    this.trackers.delete(tracker.uploadId);
    
    return metrics;
  }

  /**
   * Batch-Performance-Metriken finalisieren
   */
  finalizeBatch(batchId: string): BatchPerformanceMetrics {
    const batchTracker = this.batchTrackers.get(batchId);
    if (!batchTracker) {
      return this.getDefaultBatchMetrics();
    }

    const baseMetrics = this.finalize(batchId);
    const fileTrackers = Array.from(batchTracker.fileTrackers.values());
    
    const peakMemory = Math.max(...batchTracker.memorySnapshots.map(s => s.heapUsed));
    const averageFileProcessingTime = fileTrackers.length > 0 
      ? fileTrackers.reduce((sum, ft) => sum + (Date.now() - ft.startTime), 0) / fileTrackers.length
      : 0;

    const batchMetrics: BatchPerformanceMetrics = {
      ...baseMetrics,
      batchOptimizationMs: this.getPhasesDuration(batchTracker, 'batch_optimization') || 0,
      parallelEfficiency: this.calculateParallelEfficiency(batchTracker),
      contextReuseCount: batchTracker.contextCacheHits,
      averageFileProcessingMs: averageFileProcessingTime,
      peakMemoryUsageMB: peakMemory / (1024 * 1024),
      memoryEfficiency: this.calculateMemoryEfficiency(batchTracker),
      garbageCollectionEvents: this.gcEventCount
    };

    // Cleanup
    this.batchTrackers.delete(batchId);
    fileTrackers.forEach(ft => this.trackers.delete(ft.uploadId));
    
    return batchMetrics;
  }

  /**
   * Aktuelle Metriken abrufen (ohne Finalisierung)
   */
  getMetrics(uploadId: string): UploadPerformanceMetrics | null {
    const tracker = this.trackers.get(uploadId);
    if (!tracker) return null;

    const currentTime = Date.now();
    const totalFileSize = tracker.files.reduce((sum, file) => sum + file.size, 0);

    return {
      totalDurationMs: currentTime - tracker.startTime,
      contextResolutionMs: this.getPhasesDuration(tracker, 'context_resolution'),
      validationMs: this.getPhasesDuration(tracker, 'validation'),
      uploadMs: this.getPhasesDuration(tracker, 'upload'),
      postProcessingMs: this.getPhasesDuration(tracker, 'post_processing'),
      fileSizeBytes: totalFileSize,
      transferredBytes: Math.floor(totalFileSize * (tracker.currentProgress / 100)),
      serviceLatencyMs: this.calculateServiceLatency(tracker),
      retryCount: tracker.retryCount,
      cacheHits: tracker.contextCacheHits,
      routingDecisionMs: this.getPhasesDuration(tracker, 'routing_decision'),
      contextCacheHit: tracker.contextCacheHits > 0,
      recommendationGenerated: false
    };
  }

  // =====================
  // MEMORY MANAGEMENT
  // =====================

  /**
   * Memory-Management mit File-Cleanup
   */
  private initializeMemoryMonitoring(): void {
    // Nur in Node.js-Umgebung verfügbar
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memoryMonitorInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        
        // Warnung bei hohem Memory-Verbrauch
        if (memUsage.heapUsed > 512 * 1024 * 1024) { // > 512MB
          console.warn('Hoher Memory-Verbrauch erkannt:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
          this.triggerMemoryCleanup();
        }
      }, 10000); // Alle 10 Sekunden
    }
  }

  /**
   * Memory-Cleanup triggern
   */
  private triggerMemoryCleanup(): void {
    // Force Garbage Collection falls verfügbar
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      this.gcEventCount++;
    }

    // Alte Tracker cleanup (> 5 Minuten)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    for (const [id, tracker] of this.trackers) {
      if (tracker.startTime < fiveMinutesAgo) {
        this.trackers.delete(id);
      }
    }

    for (const [id, tracker] of this.batchTrackers) {
      if (tracker.startTime < fiveMinutesAgo) {
        this.batchTrackers.delete(id);
      }
    }
  }

  /**
   * Memory Snapshot aufzeichnen
   */
  private recordMemorySnapshot(tracker: PerformanceTracker): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      tracker.memorySnapshots.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
    }
  }

  /**
   * Phase-spezifisches Tracking
   */
  recordPhase(uploadId: string, phaseName: string, timestamp: number): void {
    const tracker = this.trackers.get(uploadId);
    if (!tracker) return;
    
    tracker.phases.push({
      name: phaseName,
      startTime: timestamp,
      progress: tracker.currentProgress
    });
  }

  /**
   * Metrics finalisieren
   */
  finalizeMetrics(uploadId: string): UploadPerformanceMetrics {
    const tracker = this.trackers.get(uploadId);
    if (!tracker) return this.getDefaultMetrics();
    
    const metrics = this.getMetrics(uploadId);
    
    // Tracker nach Finalisierung entfernen
    this.trackers.delete(uploadId);
    
    return metrics || this.getDefaultMetrics();
  }

  // =====================
  // HELPER METHODS
  // =====================

  private getLatestTracker(): PerformanceTracker | null {
    if (this.trackers.size === 0) return null;
    
    let latestTracker: PerformanceTracker | null = null;
    let latestTime = 0;
    
    for (const tracker of this.trackers.values()) {
      if (tracker.startTime > latestTime) {
        latestTime = tracker.startTime;
        latestTracker = tracker;
      }
    }
    
    return latestTracker;
  }

  private startPhase(tracker: PerformanceTracker, phaseName: string): void {
    tracker.phases.push({
      name: phaseName,
      startTime: Date.now(),
      progress: 0
    });
  }

  private endPhase(tracker: PerformanceTracker, phaseName: string): void {
    const phase = tracker.phases.find(p => p.name === phaseName && !p.endTime);
    if (phase) {
      phase.endTime = Date.now();
      phase.progress = 100;
    }
  }

  private recordInstantPhase(tracker: PerformanceTracker, phaseName: string, durationMs: number): void {
    const now = Date.now();
    tracker.phases.push({
      name: phaseName,
      startTime: now - durationMs,
      endTime: now,
      progress: 100
    });
  }

  private updateProgress(tracker: PerformanceTracker, phaseName: string, progress: number): void {
    const phase = tracker.phases.find(p => p.name === phaseName && !p.endTime);
    if (phase) {
      phase.progress = progress;
    }
    tracker.currentProgress = progress;
  }

  private getPhasesDuration(tracker: PerformanceTracker, phaseName: string): number {
    const phases = tracker.phases.filter(p => p.name === phaseName);
    return phases.reduce((sum, phase) => {
      return sum + ((phase.endTime || Date.now()) - phase.startTime);
    }, 0);
  }

  private calculateServiceLatency(tracker: PerformanceTracker): number {
    // Vereinfachte Berechnung basierend auf Upload-Phase
    const uploadPhases = tracker.phases.filter(p => p.name === 'upload');
    return uploadPhases.length > 0 ? (uploadPhases[0].endTime || Date.now()) - uploadPhases[0].startTime : 0;
  }

  private calculateParallelEfficiency(batchTracker: BatchTracker): number {
    if (batchTracker.parallelism <= 1) return 100;
    
    const totalTime = Date.now() - batchTracker.startTime;
    const idealParallelTime = (batchTracker.files.length / batchTracker.parallelism) * 1000; // Geschätzt
    
    return Math.min(100, (idealParallelTime / totalTime) * 100);
  }

  private calculateMemoryEfficiency(tracker: PerformanceTracker): number {
    if (tracker.memorySnapshots.length < 2) return 100;
    
    const startMemory = tracker.memorySnapshots[0].heapUsed;
    const peakMemory = Math.max(...tracker.memorySnapshots.map(s => s.heapUsed));
    const endMemory = tracker.memorySnapshots[tracker.memorySnapshots.length - 1].heapUsed;
    
    const memoryGrowth = peakMemory - startMemory;
    const memoryCleanup = peakMemory - endMemory;
    
    return memoryGrowth > 0 ? (memoryCleanup / memoryGrowth) * 100 : 100;
  }

  private getDefaultMetrics(): UploadPerformanceMetrics {
    return {
      totalDurationMs: 0,
      contextResolutionMs: 0,
      validationMs: 0,
      uploadMs: 0,
      postProcessingMs: 0,
      fileSizeBytes: 0,
      transferredBytes: 0,
      serviceLatencyMs: 0,
      retryCount: 0,
      cacheHits: 0,
      routingDecisionMs: 0,
      contextCacheHit: false,
      recommendationGenerated: false
    };
  }

  private getDefaultBatchMetrics(): BatchPerformanceMetrics {
    return {
      ...this.getDefaultMetrics(),
      batchOptimizationMs: 0,
      parallelEfficiency: 0,
      contextReuseCount: 0,
      averageFileProcessingMs: 0,
      peakMemoryUsageMB: 0,
      memoryEfficiency: 0,
      garbageCollectionEvents: 0
    };
  }

  /**
   * Cleanup beim Shutdown
   */
  destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    this.trackers.clear();
    this.batchTrackers.clear();
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const uploadPerformanceManager = new UploadPerformanceManagerService();