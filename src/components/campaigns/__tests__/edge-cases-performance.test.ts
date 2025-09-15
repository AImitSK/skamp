// src/components/campaigns/__tests__/edge-cases-performance.test.ts
import { campaignMediaService } from '@/lib/firebase/campaign-media-service';
import { campaignContextBuilder } from '../utils/campaign-context-builder';
import { campaignFeatureFlags } from '../config/campaign-feature-flags';

// Mock dependencies
jest.mock('@/lib/firebase/smart-upload-router');
jest.mock('@/lib/firebase/media-service');

describe('Edge Cases und Performance Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(30000); // 30s timeout für Performance Tests
  });

  describe('Edge Cases - Datenvalidierung', () => {
    it('sollte leere Strings als ungültig behandeln', () => {
      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: '',
        userId: '',
        campaignId: '',
        uploadType: 'hero-image'
      });

      const validation = campaignContextBuilder.validateCampaignContext(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('organizationId ist erforderlich');
      expect(validation.errors).toContain('userId ist erforderlich');
      expect(validation.errors).toContain('campaignId ist erforderlich');
    });

    it('sollte null/undefined Werte graceful handhaben', () => {
      expect(() => {
        campaignContextBuilder.buildCampaignContext({
          organizationId: null as any,
          userId: undefined as any,
          campaignId: 'campaign123',
          uploadType: 'hero-image'
        });
      }).not.toThrow();

      const context = campaignContextBuilder.buildCampaignContext({
        organizationId: 'org123',
        userId: 'user123',
        campaignId: 'campaign123',
        campaignName: null as any,
        selectedProjectName: undefined as any,
        uploadType: 'hero-image'
      });

      expect(context.organizationId).toBe('org123');
      expect(context.campaignName).toBe('');
      expect(context.selectedProjectName).toBe('');
    });

    it('sollte extreme Dateinamen korrekt sanitizen', () => {
      const extremeCases = [
        'ä'.repeat(300) + '.jpg', // Überlange Unicode
        '../../etc/passwd', // Path traversal
        'file with spaces and "quotes".jpg',
        'файл_на_русском.jpg', // Kyrillisch
        '🎉📸🚀.jpg', // Emojis
        'file\0with\tnull\rbytes.jpg', // Control characters
        '.hidden-file.jpg',
        'CON.jpg', // Windows reserved
        'file..jpg', // Multiple dots
        ''
      ];

      // Mock sanitize function
      const mockSanitizeFileName = jest.fn().mockImplementation((fileName: string) => {
        if (!fileName || fileName.length === 0) return 'default-file.jpg';
        return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').substring(0, 255) || 'sanitized-file.jpg';
      });

      extremeCases.forEach(fileName => {
        const sanitized = mockSanitizeFileName(fileName);
        
        expect(sanitized).not.toContain('..'); // Keine path traversal
        expect(sanitized).not.toContain('\0'); // Keine null bytes
        expect(sanitized.length).toBeLessThanOrEqual(255); // Max filename length
        expect(sanitized.length).toBeGreaterThan(0); // Nicht leer
      });
    });

    it('sollte ungültige Upload-Types abweisen', () => {
      const invalidTypes = [
        'invalid-type' as any,
        '' as any,
        null as any,
        undefined as any,
        123 as any,
        [] as any,
        {} as any
      ];

      invalidTypes.forEach(uploadType => {
        expect(() => {
          campaignContextBuilder.buildCampaignContext({
            organizationId: 'org123',
            userId: 'user123',
            campaignId: 'campaign123',
            uploadType: uploadType
          });
        }).toThrow('Invalid upload type');
      });
    });

    it('sollte zirkuläre Referenzen in Context Objects vermeiden', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        campaignContextBuilder.buildCampaignContext({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: 'campaign123',
          uploadType: 'hero-image',
          metadata: circularObj
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('sollte Race Conditions bei simultanen Context-Builds vermeiden', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        campaignContextBuilder.buildCampaignContext({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: `campaign${i}`,
          uploadType: i % 2 === 0 ? 'hero-image' : 'attachment'
        })
      );

      const results = await Promise.all(promises);

      // Alle Contexts sollten korrekt erstellt sein
      expect(results).toHaveLength(100);
      results.forEach((context, i) => {
        expect(context.campaignId).toBe(`campaign${i}`);
        expect(context.organizationId).toBe('org123');
      });

      // Keine doppelten oder überschriebenen Werte
      const campaignIds = results.map(r => r.campaignId);
      const uniqueIds = [...new Set(campaignIds)];
      expect(uniqueIds).toHaveLength(100);
    });

    it('sollte concurrent Uploads ohne Datenverlust handhaben', async () => {
      const mockSmartUploadRouter = require('@/lib/firebase/smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockImplementation(async (context: any) => ({
        path: `organizations/${context.organizationId}/media/${context.campaignId}`,
        service: 'smartUploadRouter',
        asset: { id: `asset-${Date.now()}-${Math.random()}`, downloadUrl: 'https://test.com/asset.jpg' }
      }));

      const uploadPromises = Array.from({ length: 50 }, (_, i) => 
        campaignMediaService.uploadCampaignMedia({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: `campaign${i % 10}`, // 10 verschiedene Campaigns
          file: new File([`content${i}`], `file${i}.jpg`, { type: 'image/jpeg' }),
          uploadType: 'hero-image'
        })
      );

      const results = await Promise.all(uploadPromises);

      // Alle Uploads sollten erfolgreich sein
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.asset?.id).toBeDefined();
        expect(result.asset?.id).toMatch(/^asset-\d+-\d+\.\d+$/);
      });

      // Unique Asset IDs
      const assetIds = results.map(r => r.asset?.id).filter(Boolean);
      const uniqueAssetIds = [...new Set(assetIds)];
      expect(uniqueAssetIds).toHaveLength(assetIds.length);
    });

    it('sollte Memory Leaks bei vielen simultanen Feature Flag Evaluations vermeiden', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 10000 Feature Flag Evaluations
      for (let i = 0; i < 10000; i++) {
        const context = campaignFeatureFlags.createFeatureFlagContext({
          organizationId: `org${i % 100}`,
          userId: `user${i % 500}`,
          campaignId: `campaign${i}`,
          projectId: i % 3 === 0 ? `project${i}` : undefined
        });

        const flags = campaignFeatureFlags.getFeatureFlags(context);
        const isEnabled = campaignFeatureFlags.isFeatureEnabled('USE_CAMPAIGN_SMART_ROUTER', context);
        
        // Verifiziere dass Evaluations funktionieren
        expect(flags).toBeDefined();
        expect(isEnabled.isEnabled).toBeDefined();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Weniger als 10MB Speicher-Anstieg
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Performance Tests - Large Scale Operations', () => {
    it('sollte große Campaign Asset Collections effizient handhaben', async () => {
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;
      
      // Simuliere 50000 Assets
      const largeAssetCollection = Array.from({ length: 50000 }, (_, i) => ({
        id: `asset${i}`,
        organizationId: 'org123',
        tags: [
          `campaign:campaign${i % 1000}`, // 1000 verschiedene Campaigns
          `upload-type:${i % 3 === 0 ? 'hero-image' : 'attachment'}`,
          `storage:${i % 2 === 0 ? 'organized' : 'unorganized'}`
        ],
        metadata: {
          size: Math.floor(Math.random() * 10000000), // 0-10MB
          uploadDate: new Date(Date.now() - Math.random() * 31536000000), // Letztes Jahr
          path: `organizations/org123/media/path${i}`
        }
      }));

      mockMediaService.getMediaAssets.mockResolvedValue(largeAssetCollection);

      const startTime = Date.now();
      
      const result = await campaignMediaService.getCampaignAssets({
        organizationId: 'org123',
        campaignId: 'campaign123'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sollte unter 2 Sekunden dauern auch bei 50k Assets
      expect(duration).toBeLessThan(2000);
      
      // Korrekte Filterung
      expect(result.assets.every(asset => 
        asset.tags.some(tag => tag === 'campaign:campaign123')
      )).toBe(true);
    });

    it('sollte Storage-Pfad-Generation bei hoher Load performant bleiben', () => {
      const contexts = Array.from({ length: 10000 }, (_, i) => ({
        organizationId: `org${i % 100}`,
        userId: `user${i % 1000}`,
        campaignId: `campaign${i}`,
        campaignName: `Campaign ${i}`,
        selectedProjectId: i % 2 === 0 ? `project${i}` : undefined,
        selectedProjectName: i % 2 === 0 ? `Project ${i}` : undefined,
        uploadType: i % 3 === 0 ? 'hero-image' : 'attachment' as const
      }));

      const startTime = Date.now();

      const paths = contexts.map(contextData => {
        const context = campaignContextBuilder.buildCampaignContext(contextData);
        const storageConfig = campaignContextBuilder.buildStorageConfig(context);
        return campaignContextBuilder.resolveStoragePath(context, `file${contextData.campaignId}.jpg`);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 10000 Pfad-Generierungen unter 1 Sekunde
      expect(duration).toBeLessThan(1000);
      
      // Alle Pfade sollten unique sein
      const uniquePaths = [...new Set(paths)];
      expect(uniquePaths).toHaveLength(paths.length);
      
      // Pfade sollten korrekt formatiert sein
      paths.forEach(path => {
        expect(path).toMatch(/^organizations\/org\d+\/media\//);
        expect(path).toMatch(/file\w+\.jpg$/);
      });
    });

    it('sollte Feature Flag Evaluation Performance bei komplexen Regeln testen', () => {
      const complexContexts = Array.from({ length: 5000 }, (_, i) => 
        campaignFeatureFlags.createFeatureFlagContext({
          organizationId: `org${i % 50}`,
          userId: `user${i % 200}`,
          campaignId: `campaign${i}`,
          projectId: i % 3 === 0 ? `project${i}` : undefined,
          userRole: i % 10 === 0 ? 'admin' : i % 5 === 0 ? 'editor' : 'viewer',
          betaUser: i % 7 === 0,
          environment: i % 100 < 10 ? 'development' : 'production'
        })
      );

      const startTime = Date.now();

      const results = complexContexts.map(context => {
        const flags = campaignFeatureFlags.getFeatureFlags(context);
        const smartRouter = campaignFeatureFlags.isFeatureEnabled('USE_CAMPAIGN_SMART_ROUTER', context);
        const hybridStorage = campaignFeatureFlags.isFeatureEnabled('HYBRID_STORAGE_ENABLED', context);
        const migration = campaignFeatureFlags.isMigrationMode(context);
        
        return {
          flags: Object.keys(flags).length,
          smartRouterEnabled: smartRouter.isEnabled,
          hybridEnabled: hybridStorage.isEnabled,
          migrationActive: migration.isActive
        };
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 5000 komplexe Feature Flag Evaluationen unter 500ms
      expect(duration).toBeLessThan(500);
      
      // Ergebnisse sollten konsistent sein
      expect(results).toHaveLength(5000);
      results.forEach(result => {
        expect(result.flags).toBeGreaterThan(0);
        expect(typeof result.smartRouterEnabled).toBe('boolean');
        expect(typeof result.hybridEnabled).toBe('boolean');
        expect(typeof result.migrationActive).toBe('boolean');
      });
    });

    it('sollte Garbage Collection bei wiederholten Asset-Operationen testen', async () => {
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;
      mockMediaService.getMediaAssets.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({ id: `asset${i}`, tags: [] }))
      );

      const initialMemory = process.memoryUsage().heapUsed;

      // 1000 Iterationen von Asset-Operationen
      for (let iteration = 0; iteration < 1000; iteration++) {
        const assets = await campaignMediaService.getCampaignAssets({
          organizationId: 'org123',
          campaignId: `campaign${iteration}`
        });

        // Verschiedene Operationen auf Assets
        assets.assets.forEach(asset => {
          campaignContextBuilder.sanitizeFileName(asset.id);
          campaignContextBuilder.buildCampaignContext({
            organizationId: 'org123',
            userId: 'user123',
            campaignId: `campaign${iteration}`,
            uploadType: 'hero-image'
          });
        });

        // Gelegentlich GC forcen
        if (iteration % 100 === 0) {
          global.gc && global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Speicher-Anstieg sollte begrenzt bleiben
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Unter 50MB
    });
  });

  describe('Edge Cases - Error Recovery', () => {
    it('sollte nach Storage-Fehlern graceful recovern', async () => {
      const mockSmartUploadRouter = require('@/lib/firebase/smart-upload-router').smartUploadRouter;
      const mockMediaService = require('@/lib/firebase/media-service').mediaService;

      // Ersten 3 Uploads fehlschlagen lassen
      let failureCount = 0;
      mockSmartUploadRouter.smartUpload.mockImplementation(async () => {
        if (failureCount < 3) {
          failureCount++;
          throw new Error('Storage temporarily unavailable');
        }
        return {
          path: 'organizations/org123/media/success',
          asset: { id: 'success-asset', downloadUrl: 'https://test.com/success.jpg' }
        };
      });

      // Fallback Mock
      mockMediaService.uploadMedia.mockResolvedValue({
        id: 'fallback-asset',
        downloadUrl: 'https://test.com/fallback.jpg'
      });

      const results = [];
      
      // 5 Upload-Versuche
      for (let i = 0; i < 5; i++) {
        try {
          const result = await campaignMediaService.uploadCampaignMedia({
            organizationId: 'org123',
            userId: 'user123',
            campaignId: 'campaign123',
            file: new File([`content${i}`], `file${i}.jpg`, { type: 'image/jpeg' }),
            uploadType: 'hero-image'
          });
          results.push(result);
        } catch (error) {
          // Fehler sollten caught werden, aber Service sollte recovern
          results.push({ error: error.message });
        }
      }

      // Die letzten 2 Uploads sollten erfolgreich sein
      expect(results.slice(-2).every(r => r.success || r.asset)).toBe(true);
    });

    it('sollte Timeout-Situationen korrekt handhaben', async () => {
      const mockSmartUploadRouter = require('@/lib/firebase/smart-upload-router').smartUploadRouter;
      
      // Timeout-Simulation
      mockSmartUploadRouter.smartUpload.mockImplementation(async () => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), 100);
        });
      });

      const startTime = Date.now();
      
      try {
        await campaignMediaService.uploadCampaignMedia({
          organizationId: 'org123',
          userId: 'user123',
          campaignId: 'campaign123',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          uploadType: 'hero-image'
        });
      } catch (error) {
        expect(error.message).toContain('timeout');
      }

      const duration = Date.now() - startTime;
      
      // Timeout sollte rechtzeitig ausgelöst werden
      expect(duration).toBeLessThan(200);
    });

    it('sollte korrupte Feature Flag Daten handhaben', () => {
      const corruptContexts = [
        { organizationId: 'org123', userId: null },
        { organizationId: '', userId: 'user123', campaignId: undefined },
        { organizationId: 'org123', userId: 'user123', userRole: 'invalid-role' },
        { organizationId: 'org123', userId: 'user123', environment: 999 },
        null,
        undefined,
        'invalid-context'
      ];

      corruptContexts.forEach(context => {
        expect(() => {
          const safeContext = campaignFeatureFlags.createFeatureFlagContext(context as any);
          const flags = campaignFeatureFlags.getFeatureFlags(safeContext);
          expect(flags).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('sollte Minimal- und Maximalwerte korrekt verarbeiten', () => {
      const boundaryTests = [
        {
          name: 'Minimale gültige Werte',
          data: {
            organizationId: 'a',
            userId: 'b',
            campaignId: 'c',
            uploadType: 'hero-image' as const
          }
        },
        {
          name: 'Maximale Stringlängen',
          data: {
            organizationId: 'org' + 'x'.repeat(1000),
            userId: 'user' + 'y'.repeat(1000),
            campaignId: 'campaign' + 'z'.repeat(1000),
            campaignName: 'name' + 'n'.repeat(2000),
            uploadType: 'hero-image' as const
          }
        },
        {
          name: 'Unicode Edge Cases',
          data: {
            organizationId: '🏢org123',
            userId: 'user_🧑‍💻_123',
            campaignId: 'campaign_📊_测试',
            campaignName: 'Кампания тест العربية',
            uploadType: 'hero-image' as const
          }
        }
      ];

      boundaryTests.forEach(({ name, data }) => {
        expect(() => {
          const context = campaignContextBuilder.buildCampaignContext(data);
          const validation = campaignContextBuilder.validateCampaignContext(context);
          
          // Context sollte erstellt werden
          expect(context.organizationId).toBeDefined();
          
          // Bei zu langen Strings sollte Truncation erfolgen
          if (data.organizationId.length > 500) {
            expect(context.organizationId.length).toBeLessThanOrEqual(500);
          }
        }).not.toThrow(`Failed for ${name}`);
      });
    });

    it('sollte numerische Boundary Values bei Performance Metrics handhaben', () => {
      const extremeMetrics = [
        { uploadTime: 0 },
        { uploadTime: Number.MAX_SAFE_INTEGER },
        { uploadTime: -1 },
        { uploadTime: Infinity },
        { uploadTime: NaN },
        { fileSize: 0 },
        { fileSize: Number.MAX_SAFE_INTEGER },
        { processingTime: 0.0001 },
        { processingTime: 999999.9999 }
      ];

      extremeMetrics.forEach(metrics => {
        expect(() => {
          const normalized = campaignContextBuilder.normalizePerformanceMetrics(metrics);
          
          // NaN und Infinity sollten bereinigt werden
          Object.values(normalized).forEach(value => {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          });
        }).not.toThrow();
      });
    });
  });

  describe('Integration Stress Tests', () => {
    it('sollte vollständige Campaign Workflow unter Last testen', async () => {
      const mockSmartUploadRouter = require('@/lib/firebase/smart-upload-router').smartUploadRouter;
      mockSmartUploadRouter.smartUpload.mockResolvedValue({
        path: 'organizations/org123/media/test',
        asset: { id: 'stress-test-asset', downloadUrl: 'https://test.com/stress.jpg' }
      });

      const startTime = Date.now();
      const results = [];

      // 100 parallele Campaign Workflows
      const workflows = Array.from({ length: 100 }, async (_, i) => {
        // 1. Context erstellen
        const context = campaignContextBuilder.buildCampaignContext({
          organizationId: `org${i % 10}`,
          userId: `user${i % 20}`,
          campaignId: `stress-campaign-${i}`,
          selectedProjectId: i % 2 === 0 ? `project-${i}` : undefined,
          uploadType: 'hero-image'
        });

        // 2. Feature Flags prüfen
        const featureContext = campaignFeatureFlags.createFeatureFlagContext({
          organizationId: context.organizationId,
          userId: context.userId,
          campaignId: context.campaignId
        });
        const flags = campaignFeatureFlags.getFeatureFlags(featureContext);

        // 3. Upload ausführen
        const uploadResult = await campaignMediaService.uploadCampaignMedia({
          organizationId: context.organizationId,
          userId: context.userId,
          campaignId: context.campaignId,
          file: new File([`stress-${i}`], `stress-${i}.jpg`, { type: 'image/jpeg' }),
          uploadType: 'hero-image'
        });

        return {
          workflowId: i,
          context,
          flags: Object.keys(flags).length,
          uploadSuccess: uploadResult.success
        };
      });

      const workflowResults = await Promise.all(workflows);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Alle Workflows sollten unter 5 Sekunden abgeschlossen sein
      expect(duration).toBeLessThan(5000);
      
      // Alle Workflows sollten erfolgreich sein
      expect(workflowResults).toHaveLength(100);
      expect(workflowResults.every(r => r.uploadSuccess)).toBe(true);
      
      // Contexts sollten korrekt erstellt worden sein
      workflowResults.forEach((result, i) => {
        expect(result.context.campaignId).toBe(`stress-campaign-${i}`);
        expect(result.flags).toBeGreaterThan(0);
      });
    });
  });
});