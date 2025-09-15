/**
 * Error Handling Tests
 * Test-Suite für 5 Fehler-Kategorien und automatische Error Recovery
 */

import { jest } from '@jest/globals';
import { waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/lib/firebase/services/media', () => ({
  uploadClientMedia: jest.fn(),
  retryUpload: jest.fn(),
  checkStorageQuota: jest.fn(),
}));

jest.mock('@/lib/firebase/services/projects', () => ({
  getProject: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('@/lib/logging/error-logger', () => ({
  ErrorLogger: jest.fn(() => ({
    logError: jest.fn(),
    logRecovery: jest.fn(),
    getErrorStats: jest.fn(),
  })),
}));

import { ProjectUploadErrorHandler } from '../project-upload-error-handler';
import * as mediaService from '@/lib/firebase/services/media';
import * as projectService from '@/lib/firebase/services/projects';
import { ErrorLogger } from '@/lib/logging/error-logger';
import type { 
  UploadError, 
  ErrorRecoveryStrategy, 
  ErrorCategory,
  RetryConfig,
  BatchUploadResult 
} from '@/types';

describe('ProjectUploadErrorHandler', () => {
  let errorHandler: ProjectUploadErrorHandler;
  let mockErrorLogger: any;

  beforeEach(() => {
    errorHandler = new ProjectUploadErrorHandler();
    
    mockErrorLogger = {
      logError: jest.fn(),
      logRecovery: jest.fn(),
      getErrorStats: jest.fn(),
    };

    (ErrorLogger as jest.Mock).mockReturnValue(mockErrorLogger);

    jest.clearAllMocks();
  });

  describe('Validation Error Category', () => {
    it('sollte Dateigröße-Validierungsfehler erkennen und handhaben', async () => {
      const oversizedFile = {
        name: 'huge_video.mp4',
        type: 'video/mp4',
        size: 500 * 1024 * 1024 // 500MB
      };

      const error = new Error('File too large');
      const uploadError: UploadError = {
        category: 'validation',
        code: 'FILE_TOO_LARGE',
        message: 'Datei überschreitet maximale Größe von 100MB',
        file: oversizedFile,
        maxSize: 100 * 1024 * 1024,
        actualSize: oversizedFile.size,
        severity: 'error',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(uploadError);

      expect(result.canRecover).toBe(false);
      expect(result.errorCategory).toBe('validation');
      expect(result.userMessage).toContain('Datei zu groß');
      expect(result.suggestedActions).toEqual([
        'Datei komprimieren',
        'Video-Qualität reduzieren',
        'Plan erweitern für größere Uploads'
      ]);

      expect(mockErrorLogger.logError).toHaveBeenCalledWith({
        category: 'validation',
        code: 'FILE_TOO_LARGE',
        file: 'huge_video.mp4',
        size: oversizedFile.size,
        timestamp: expect.any(Date)
      });
    });

    it('sollte ungültige Dateitypen mit Alternatives-Vorschlägen handhaben', async () => {
      const invalidFile = {
        name: 'script.js',
        type: 'application/javascript',
        size: 1024
      };

      const uploadError: UploadError = {
        category: 'validation',
        code: 'INVALID_FILE_TYPE',
        message: 'Dateityp nicht erlaubt',
        file: invalidFile,
        allowedTypes: ['image/*', 'application/pdf', 'application/msword'],
        actualType: 'application/javascript',
        severity: 'error',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(uploadError);

      expect(result.canRecover).toBe(false);
      expect(result.suggestedActions).toEqual([
        'Datei als ZIP-Archiv verpacken',
        'Datei in erlaubtes Format konvertieren',
        'Administrator um Dateityp-Erweiterung bitten'
      ]);
      expect(result.alternativeFormats).toEqual(['pdf', 'docx', 'txt']);
    });

    it('sollte Virus-Scanner-Warnungen mit Quarantäne-Hinweisen behandeln', async () => {
      const suspiciousFile = {
        name: 'suspicious.exe',
        type: 'application/x-executable',
        size: 2048
      };

      const uploadError: UploadError = {
        category: 'validation',
        code: 'SECURITY_SCAN_FAILED',
        message: 'Datei durch Sicherheits-Scan blockiert',
        file: suspiciousFile,
        scanResult: 'threat_detected',
        threatType: 'potentially_unwanted_program',
        severity: 'critical',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(uploadError);

      expect(result.canRecover).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.userMessage).toContain('Sicherheitsbedrohung erkannt');
      expect(result.requiredAction).toBe('contact_admin');
    });

    it('sollte Dateinamen-Validierung mit Auto-Correction handhaben', async () => {
      const invalidNameFile = {
        name: 'file<>with|invalid:chars.pdf',
        type: 'application/pdf',
        size: 1024
      };

      const uploadError: UploadError = {
        category: 'validation',
        code: 'INVALID_FILENAME',
        message: 'Dateiname enthält ungültige Zeichen',
        file: invalidNameFile,
        invalidChars: ['<', '>', '|', ':'],
        suggestedName: 'file_with_invalid_chars.pdf',
        severity: 'warning',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(uploadError);

      expect(result.canRecover).toBe(true);
      expect(result.autoCorrection).toBeDefined();
      expect(result.autoCorrection.newFileName).toBe('file_with_invalid_chars.pdf');
      expect(result.recovery.strategy).toBe('auto_rename');
    });
  });

  describe('Network Error Category', () => {
    it('sollte Connection Timeout mit exponential backoff handhaben', async () => {
      const networkError: UploadError = {
        category: 'network',
        code: 'CONNECTION_TIMEOUT',
        message: 'Verbindung zum Server unterbrochen',
        severity: 'warning',
        timestamp: new Date(),
        networkInfo: {
          connectionType: 'wifi',
          effectiveType: '3g',
          downlink: 0.5
        }
      };

      const result = await errorHandler.handleError(networkError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('exponential_backoff');
      expect(result.recovery.maxRetries).toBe(5);
      expect(result.recovery.initialDelay).toBe(1000);
      expect(result.recovery.backoffMultiplier).toBe(2);

      expect(result.userMessage).toContain('Netzwerkproblem');
      expect(result.suggestedActions).toContain('Internetverbindung prüfen');
    });

    it('sollte Bandwidth-limitierte Uploads mit Quality-Reduction behandeln', async () => {
      const slowNetworkError: UploadError = {
        category: 'network',
        code: 'SLOW_CONNECTION',
        message: 'Upload zu langsam für Dateigröße',
        severity: 'info',
        timestamp: new Date(),
        networkInfo: {
          connectionType: 'cellular',
          effectiveType: '2g',
          downlink: 0.1
        },
        file: {
          name: 'high_res_image.jpg',
          type: 'image/jpeg',
          size: 25 * 1024 * 1024 // 25MB
        }
      };

      const result = await errorHandler.handleError(slowNetworkError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('quality_reduction');
      expect(result.recovery.compression).toBeDefined();
      expect(result.recovery.compression.quality).toBe(0.7);
      expect(result.recovery.compression.maxSize).toBe(5 * 1024 * 1024); // 5MB

      expect(result.userMessage).toContain('Langsame Verbindung');
      expect(result.suggestedActions).toContain('Bildqualität reduzieren');
    });

    it('sollte DNS-Resolution-Fehler mit alternative Endpoints handhaben', async () => {
      const dnsError: UploadError = {
        category: 'network',
        code: 'DNS_RESOLUTION_FAILED',
        message: 'Server nicht erreichbar',
        severity: 'error',
        timestamp: new Date(),
        endpoint: 'storage.europe-west1.googleapis.com',
      };

      const result = await errorHandler.handleError(dnsError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('endpoint_fallback');
      expect(result.recovery.alternativeEndpoints).toEqual([
        'storage.us-central1.googleapis.com',
        'storage.asia-east1.googleapis.com'
      ]);
    });

    it('sollte Network-Interruption mit Resume-Capability behandeln', async () => {
      const interruption: UploadError = {
        category: 'network',
        code: 'CONNECTION_INTERRUPTED',
        message: 'Upload unterbrochen',
        severity: 'warning',
        timestamp: new Date(),
        uploadProgress: {
          uploadedBytes: 5 * 1024 * 1024, // 5MB uploaded
          totalBytes: 20 * 1024 * 1024,   // 20MB total
          percentage: 25
        },
        resumable: true,
        resumeToken: 'upload_token_abc123'
      };

      const result = await errorHandler.handleError(interruption);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('resume_upload');
      expect(result.recovery.resumeFrom).toBe(5 * 1024 * 1024);
      expect(result.recovery.resumeToken).toBe('upload_token_abc123');
    });
  });

  describe('Permission Error Category', () => {
    it('sollte Insufficient Permissions mit Role-Info handhaben', async () => {
      const permissionError: UploadError = {
        category: 'permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Keine Berechtigung zum Upload in diesen Ordner',
        severity: 'error',
        timestamp: new Date(),
        requiredPermission: 'upload_media',
        userRole: 'viewer',
        requiredRole: 'contributor',
        folderId: 'folder-restricted'
      };

      const result = await errorHandler.handleError(permissionError);

      expect(result.canRecover).toBe(false);
      expect(result.userMessage).toContain('Keine Berechtigung');
      expect(result.suggestedActions).toEqual([
        'Administrator um Zugriff bitten',
        'Anderen Ordner wählen',
        'Team-Manager kontaktieren'
      ]);
      expect(result.escalationRequired).toBe(true);
      expect(result.escalationTarget).toBe('team_admin');
    });

    it('sollte Organization-Quota-Exceeded mit Upgrade-Optionen behandeln', async () => {
      const quotaError: UploadError = {
        category: 'permissions',
        code: 'QUOTA_EXCEEDED',
        message: 'Organisations-Speicherlimit erreicht',
        severity: 'error',
        timestamp: new Date(),
        currentUsage: 950 * 1024 * 1024, // 950MB
        quotaLimit: 1024 * 1024 * 1024,  // 1GB
        organizationId: 'org-123'
      };

      const result = await errorHandler.handleError(quotaError);

      expect(result.canRecover).toBe(false);
      expect(result.userMessage).toContain('Speicherlimit erreicht');
      expect(result.suggestedActions).toContain('Plan erweitern');
      expect(result.upgradeRequired).toBe(true);
      expect(result.upgradeUrl).toContain('/billing/upgrade');
    });

    it('sollte Pipeline-Lock-Conflicts mit Lock-Info behandeln', async () => {
      const lockError: UploadError = {
        category: 'permissions',
        code: 'PIPELINE_LOCKED',
        message: 'Projekt-Pipeline ist gesperrt',
        severity: 'warning',
        timestamp: new Date(),
        lockInfo: {
          lockedBy: 'user-456',
          lockedByName: 'Max Mustermann',
          lockReason: 'Kunde-Review',
          lockedAt: new Date(Date.now() - 1800000), // 30 min ago
          estimatedUnlock: new Date(Date.now() + 3600000) // 1 hour
        }
      };

      const result = await errorHandler.handleError(lockError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('wait_for_unlock');
      expect(result.recovery.waitTime).toBe(3600000); // 1 hour
      expect(result.userMessage).toContain('Pipeline gesperrt von Max Mustermann');
      expect(result.suggestedActions).toContain('Nach Review wieder versuchen');
    });

    it('sollte Cross-Tenant-Access mit Security-Alert behandeln', async () => {
      const crossTenantError: UploadError = {
        category: 'permissions',
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Zugriff auf fremde Organisation verweigert',
        severity: 'critical',
        timestamp: new Date(),
        attemptedOrg: 'org-foreign',
        userOrg: 'org-123',
        securityLevel: 'high'
      };

      const result = await errorHandler.handleError(crossTenantError);

      expect(result.canRecover).toBe(false);
      expect(result.securityAlert).toBe(true);
      expect(result.userMessage).toContain('Sicherheitsrichtlinie verletzt');
      expect(result.logSecurityEvent).toBe(true);
      expect(result.requiredAction).toBe('security_review');
    });
  });

  describe('Storage Error Category', () => {
    it('sollte Storage-Service-Outage mit Status-Page-Link behandeln', async () => {
      const outageError: UploadError = {
        category: 'storage',
        code: 'SERVICE_UNAVAILABLE',
        message: 'Speicher-Service temporär nicht verfügbar',
        severity: 'error',
        timestamp: new Date(),
        serviceStatus: 'degraded',
        estimatedRecovery: new Date(Date.now() + 1800000) // 30 min
      };

      const result = await errorHandler.handleError(outageError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('wait_and_retry');
      expect(result.recovery.waitTime).toBe(1800000); // 30 min
      expect(result.userMessage).toContain('Service temporär nicht verfügbar');
      expect(result.statusPageUrl).toBe('https://status.firebase.google.com');
    });

    it('sollte Corrupted-Upload mit Integrity-Check behandeln', async () => {
      const corruptionError: UploadError = {
        category: 'storage',
        code: 'UPLOAD_CORRUPTED',
        message: 'Datei während Upload beschädigt',
        severity: 'error',
        timestamp: new Date(),
        expectedChecksum: 'abc123def456',
        actualChecksum: 'xyz789uvw012',
        file: {
          name: 'important_doc.pdf',
          type: 'application/pdf',
          size: 2048000
        }
      };

      const result = await errorHandler.handleError(corruptionError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('retry_with_verification');
      expect(result.recovery.enableIntegrityCheck).toBe(true);
      expect(result.userMessage).toContain('Upload-Integrität verletzt');
      expect(result.suggestedActions).toContain('Upload wiederholen');
    });

    it('sollte Storage-Region-Unavailable mit Region-Fallback behandeln', async () => {
      const regionError: UploadError = {
        category: 'storage',
        code: 'REGION_UNAVAILABLE',
        message: 'Primäre Speicher-Region nicht erreichbar',
        severity: 'warning',
        timestamp: new Date(),
        primaryRegion: 'europe-west1',
        availableRegions: ['us-central1', 'asia-east1']
      };

      const result = await errorHandler.handleError(regionError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('region_failover');
      expect(result.recovery.fallbackRegion).toBe('us-central1');
      expect(result.userMessage).toContain('Alternative Region verwendet');
    });

    it('sollte Write-Lock-Conflicts bei concurrent uploads behandeln', async () => {
      const writeLockError: UploadError = {
        category: 'storage',
        code: 'WRITE_LOCK_CONFLICT',
        message: 'Datei wird bereits von anderem Prozess bearbeitet',
        severity: 'warning',
        timestamp: new Date(),
        conflictingProcess: 'batch_upload_process_456',
        lockHolder: 'user-789',
        estimatedRelease: new Date(Date.now() + 300000) // 5 min
      };

      const result = await errorHandler.handleError(writeLockError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('queue_and_wait');
      expect(result.recovery.queuePosition).toBeGreaterThan(0);
      expect(result.userMessage).toContain('Upload in Warteschlange');
    });
  });

  describe('Smart Router Error Category', () => {
    it('sollte Smart-Router-Service-Down mit Fallback behandeln', async () => {
      const routerError: UploadError = {
        category: 'smart_router',
        code: 'ROUTER_SERVICE_UNAVAILABLE',
        message: 'Smart Router Service nicht erreichbar',
        severity: 'warning',
        timestamp: new Date(),
        fallbackAvailable: true
      };

      const result = await errorHandler.handleError(routerError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('fallback_to_manual');
      expect(result.recovery.disableSmartRouting).toBe(true);
      expect(result.userMessage).toContain('Smart Router nicht verfügbar');
      expect(result.suggestedActions).toContain('Manuelle Ordner-Auswahl verwenden');
    });

    it('sollte AI-Model-Timeout mit Simplified-Routing behandeln', async () => {
      const aiTimeoutError: UploadError = {
        category: 'smart_router',
        code: 'AI_MODEL_TIMEOUT',
        message: 'KI-Empfehlungs-Service antwortet nicht',
        severity: 'info',
        timestamp: new Date(),
        modelVersion: 'v2.1.0',
        requestTimeout: 10000 // 10s
      };

      const result = await errorHandler.handleError(aiTimeoutError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('rule_based_routing');
      expect(result.recovery.useSimplifiedLogic).toBe(true);
      expect(result.userMessage).toContain('KI-Empfehlungen nicht verfügbar');
    });

    it('sollte Context-Building-Failed mit Basic-Recommendations behandeln', async () => {
      const contextError: UploadError = {
        category: 'smart_router',
        code: 'CONTEXT_BUILDING_FAILED',
        message: 'Upload-Kontext kann nicht erstellt werden',
        severity: 'warning',
        timestamp: new Date(),
        missingData: ['project_phase', 'folder_structure'],
        partialContext: true
      };

      const result = await errorHandler.handleError(contextError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('basic_file_type_routing');
      expect(result.recovery.usePartialContext).toBe(true);
      expect(result.userMessage).toContain('Eingeschränkte Empfehlungen verfügbar');
    });

    it('sollte Confidence-Threshold-Not-Met mit Manual-Override behandeln', async () => {
      const lowConfidenceError: UploadError = {
        category: 'smart_router',
        code: 'LOW_CONFIDENCE_ROUTING',
        message: 'Routing-Konfidenz zu niedrig für automatische Entscheidung',
        severity: 'info',
        timestamp: new Date(),
        confidence: 0.45,
        threshold: 0.7,
        alternatives: [
          { folder: 'Dokumente', confidence: 0.45 },
          { folder: 'Medien', confidence: 0.35 },
          { folder: 'Pressemeldungen', confidence: 0.2 }
        ]
      };

      const result = await errorHandler.handleError(lowConfidenceError);

      expect(result.canRecover).toBe(true);
      expect(result.recovery.strategy).toBe('request_user_selection');
      expect(result.recovery.showAlternatives).toBe(true);
      expect(result.userMessage).toContain('Manuelle Ordner-Auswahl erforderlich');
      expect(result.alternatives).toHaveLength(3);
    });
  });

  describe('Automatische Error Recovery Strategies', () => {
    it('sollte Exponential Backoff für Netzwerk-Retry implementieren', async () => {
      const retryConfig: RetryConfig = {
        maxAttempts: 5,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 16000
      };

      const mockUploadFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true, id: 'file-success' });

      const result = await errorHandler.retryWithBackoff(
        mockUploadFunction,
        retryConfig
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.totalDelay).toBeGreaterThanOrEqual(3000); // 1s + 2s
      expect(mockUploadFunction).toHaveBeenCalledTimes(3);
    });

    it('sollte Circuit Breaker Pattern für wiederholte Fehler implementieren', async () => {
      const circuitBreaker = errorHandler.getCircuitBreaker('storage_uploads');

      // Simuliere wiederholte Fehler
      for (let i = 0; i < 10; i++) {
        circuitBreaker.recordFailure();
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Weitere Requests sollten sofort fehlschlagen
      await expect(
        errorHandler.executeWithCircuitBreaker('storage_uploads', jest.fn())
      ).rejects.toThrow('Circuit breaker is open');

      // Nach Timeout sollte Half-Open State erreicht werden
      jest.advanceTimersByTime(60000); // 1 minute
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('sollte Batch-Upload Error Recovery mit Partial Success behandeln', async () => {
      const batchFiles = [
        { name: 'file1.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'file2.pdf', type: 'application/pdf', size: 2048 },
        { name: 'file3.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1536 },
      ];

      // Mock: Erste Datei erfolgreich, zweite fehlgeschlagen, dritte erfolgreich
      (mediaService.uploadClientMedia as jest.Mock)
        .mockResolvedValueOnce({ id: 'file1-success' })
        .mockRejectedValueOnce(new Error('Storage quota exceeded'))
        .mockResolvedValueOnce({ id: 'file3-success' });

      const batchResult = await errorHandler.handleBatchUploadErrors({
        files: batchFiles,
        projectId: 'proj-123',
        organizationId: 'org-789'
      });

      expect(batchResult.partialSuccess).toBe(true);
      expect(batchResult.successfulUploads).toHaveLength(2);
      expect(batchResult.failedUploads).toHaveLength(1);
      expect(batchResult.failedUploads[0].file.name).toBe('file2.pdf');
      expect(batchResult.recovery.retryableFiles).toHaveLength(1);
    });

    it('sollte File-Type-basierte Recovery-Strategies anwenden', async () => {
      const imageCompressionError: UploadError = {
        category: 'storage',
        code: 'FILE_TOO_LARGE',
        file: { name: 'large.jpg', type: 'image/jpeg', size: 50 * 1024 * 1024 },
        severity: 'error',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(imageCompressionError);

      expect(result.recovery.strategy).toBe('compress_and_retry');
      expect(result.recovery.compressionOptions).toMatchObject({
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'jpeg'
      });

      // Video-Datei sollte andere Strategie erhalten
      const videoError = {
        ...imageCompressionError,
        file: { name: 'large.mp4', type: 'video/mp4', size: 200 * 1024 * 1024 }
      };

      const videoResult = await errorHandler.handleError(videoError);
      expect(videoResult.recovery.strategy).toBe('transcode_and_retry');
    });

    it('sollte Graceful Degradation bei kritischen Fehlern implementieren', async () => {
      const criticalError: UploadError = {
        category: 'storage',
        code: 'STORAGE_SERVICE_CATASTROPHIC_FAILURE',
        message: 'Kompletter Storage-Service-Ausfall',
        severity: 'critical',
        timestamp: new Date(),
        affectedRegions: ['europe-west1', 'us-central1'],
        estimatedRecovery: null // Unbekannt
      };

      const result = await errorHandler.handleError(criticalError);

      expect(result.canRecover).toBe(false);
      expect(result.gracefulDegradation).toBeDefined();
      expect(result.gracefulDegradation.offlineMode).toBe(true);
      expect(result.gracefulDegradation.localCache).toBe(true);
      expect(result.gracefulDegradation.syncWhenAvailable).toBe(true);

      expect(result.userMessage).toContain('Offline-Modus aktiviert');
      expect(result.suggestedActions).toContain('Später automatisch synchronisiert');
    });
  });

  describe('Error Analytics und Monitoring', () => {
    it('sollte Error-Patterns für Trend-Analyse sammeln', async () => {
      const errors = [
        { category: 'network', code: 'CONNECTION_TIMEOUT', timestamp: new Date() },
        { category: 'network', code: 'CONNECTION_TIMEOUT', timestamp: new Date() },
        { category: 'storage', code: 'QUOTA_EXCEEDED', timestamp: new Date() },
      ];

      errors.forEach(error => errorHandler.recordError(error));

      const analytics = errorHandler.getErrorAnalytics();

      expect(analytics.totalErrors).toBe(3);
      expect(analytics.errorsByCategory.network).toBe(2);
      expect(analytics.errorsByCategory.storage).toBe(1);
      expect(analytics.topErrorCodes[0]).toEqual({
        code: 'CONNECTION_TIMEOUT',
        count: 2,
        percentage: 66.67
      });
    });

    it('sollte Error-Recovery-Success-Rate verfolgen', async () => {
      // Simuliere mehrere Error-Recovery-Zyklen
      await errorHandler.handleError({
        category: 'network',
        code: 'CONNECTION_TIMEOUT',
        severity: 'warning',
        timestamp: new Date(),
      });

      await errorHandler.recordRecoveryOutcome('CONNECTION_TIMEOUT', true);

      await errorHandler.handleError({
        category: 'network', 
        code: 'CONNECTION_TIMEOUT',
        severity: 'warning',
        timestamp: new Date(),
      });

      await errorHandler.recordRecoveryOutcome('CONNECTION_TIMEOUT', false);

      const recoveryStats = errorHandler.getRecoveryStats();
      
      expect(recoveryStats.CONNECTION_TIMEOUT).toMatchObject({
        attempts: 2,
        successes: 1,
        failures: 1,
        successRate: 0.5
      });
    });

    it('sollte Error-Hotspots und -Trends identifizieren', async () => {
      // Simuliere Zeitreihen-Daten
      const timestamps = [
        new Date(Date.now() - 7200000), // 2h ago
        new Date(Date.now() - 5400000), // 1.5h ago  
        new Date(Date.now() - 3600000), // 1h ago
        new Date(Date.now() - 1800000), // 30min ago
        new Date(Date.now() - 900000),  // 15min ago
      ];

      timestamps.forEach((timestamp, index) => {
        errorHandler.recordError({
          category: 'network',
          code: 'CONNECTION_TIMEOUT',
          timestamp,
          file: { name: `file${index}.jpg` }
        });
      });

      const trends = errorHandler.getErrorTrends({ timeWindow: '2h' });

      expect(trends.totalErrors).toBe(5);
      expect(trends.trend).toBe('increasing');
      expect(trends.hotspots).toContain('network.CONNECTION_TIMEOUT');
      expect(trends.recommendation).toBe('investigate_network_issues');
    });
  });

  describe('User Experience und Feedback', () => {
    it('sollte benutzerfreundliche Fehlermeldungen generieren', async () => {
      const technicalError: UploadError = {
        category: 'storage',
        code: 'INTERNAL_SERVER_ERROR_500',
        message: 'Internal server error: Firebase Storage bucket gs://project-123.appspot.com returned HTTP 500',
        severity: 'error',
        timestamp: new Date(),
        technicalDetails: 'Stack trace: Error at uploadFile...'
      };

      const result = await errorHandler.handleError(technicalError);

      // Technische Details sollten versteckt werden
      expect(result.userMessage).not.toContain('Firebase Storage bucket');
      expect(result.userMessage).not.toContain('HTTP 500');
      expect(result.userMessage).not.toContain('Stack trace');

      // Stattdessen benutzerfreundliche Nachricht
      expect(result.userMessage).toBe('Ein temporärer Server-Fehler ist aufgetreten. Bitte versuchen Sie es in wenigen Minuten erneut.');
      expect(result.suggestedActions[0]).toBe('In 2-3 Minuten erneut versuchen');
    });

    it('sollte Kontext-spezifische Hilfe-Links bereitstellen', async () => {
      const quotaError: UploadError = {
        category: 'permissions',
        code: 'QUOTA_EXCEEDED',
        severity: 'error',
        timestamp: new Date(),
        organizationId: 'org-123'
      };

      const result = await errorHandler.handleError(quotaError);

      expect(result.helpLinks).toContain({
        title: 'Speicher-Kontingent verwalten',
        url: '/help/storage-management',
        priority: 'high'
      });

      expect(result.contactOptions).toContain({
        type: 'billing_support',
        available: true,
        urgency: 'high'
      });
    });

    it('sollte Progress-Feedback für Recovery-Prozesse bieten', async () => {
      const progressCallback = jest.fn();

      await errorHandler.handleError({
        category: 'network',
        code: 'CONNECTION_TIMEOUT',
        severity: 'warning',
        timestamp: new Date(),
      }, { onRecoveryProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledWith({
        phase: 'analyzing_error',
        percentage: 25,
        message: 'Fehler wird analysiert...'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        phase: 'preparing_retry',
        percentage: 50,
        message: 'Wiederholung wird vorbereitet...'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        phase: 'executing_retry',
        percentage: 75,
        message: 'Upload wird wiederholt...'
      });
    });
  });

  describe('Integration und Performance', () => {
    it('sollte Error Handling Performance unter 50ms halten', async () => {
      const simpleError: UploadError = {
        category: 'validation',
        code: 'FILE_TOO_LARGE',
        severity: 'error',
        timestamp: new Date(),
      };

      const startTime = performance.now();
      await errorHandler.handleError(simpleError);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('sollte Memory-Leaks bei vielen Error-Events vermeiden', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simuliere 1000 Error-Events
      for (let i = 0; i < 1000; i++) {
        await errorHandler.handleError({
          category: 'network',
          code: 'CONNECTION_TIMEOUT',
          severity: 'warning',
          timestamp: new Date(),
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory-Anstieg sollte unter 10MB bleiben
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('sollte Concurrent Error Handling ohne Race Conditions verarbeiten', async () => {
      const concurrentErrors = Array.from({ length: 10 }, (_, i) => ({
        category: 'network' as ErrorCategory,
        code: 'CONNECTION_TIMEOUT',
        severity: 'warning' as const,
        timestamp: new Date(),
        id: `error-${i}`
      }));

      const results = await Promise.all(
        concurrentErrors.map(error => errorHandler.handleError(error))
      );

      // Alle Errors sollten verarbeitet worden sein
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.canRecover).toBe(true);
        expect(result.recovery.strategy).toBe('exponential_backoff');
      });

      // Keine duplizierten Error-IDs
      const errorIds = errorHandler.getProcessedErrorIds();
      expect(new Set(errorIds).size).toBe(errorIds.length);
    });
  });
});

// Test Helper Functions und Utilities
const createMockError = (category: ErrorCategory, code: string, overrides: Partial<UploadError> = {}): UploadError => ({
  category,
  code,
  message: `Mock error: ${code}`,
  severity: 'error',
  timestamp: new Date(),
  ...overrides,
});

const simulateNetworkConditions = (type: 'slow' | 'unstable' | 'offline') => {
  const conditions = {
    slow: { downlink: 0.5, effectiveType: '2g' },
    unstable: { downlink: 2.0, effectiveType: '3g', rtt: 500 },
    offline: { downlink: 0, effectiveType: 'offline' }
  };

  Object.defineProperty(navigator, 'connection', {
    writable: true,
    value: conditions[type]
  });
};