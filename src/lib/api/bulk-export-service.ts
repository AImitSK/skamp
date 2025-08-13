// src/lib/api/bulk-export-service.ts
// Safe Firestore imports
let collection: any;
let doc: any;
let getDocs: any;
let getDoc: any;
let addDoc: any;
let updateDoc: any;
let query: any;
let where: any;
let orderBy: any;
let firestoreLimit: any;
let Timestamp: any;
let serverTimestamp: any;
let startAfter: any;

try {
  const firestoreModule = require('firebase/firestore');
  collection = firestoreModule.collection;
  doc = firestoreModule.doc;
  getDocs = firestoreModule.getDocs;
  getDoc = firestoreModule.getDoc;
  addDoc = firestoreModule.addDoc;
  updateDoc = firestoreModule.updateDoc;
  query = firestoreModule.query;
  where = firestoreModule.where;
  orderBy = firestoreModule.orderBy;
  firestoreLimit = firestoreModule.limit;
  Timestamp = firestoreModule.Timestamp;
  serverTimestamp = firestoreModule.serverTimestamp;
  startAfter = firestoreModule.startAfter;
} catch (error) {
  console.warn('Firestore nicht verfügbar');
}
import {
  BulkExportRequest,
  BulkJob,
  ExportableEntity,
  ExportFormat,
  APIBulkJobResponse,
  APIBulkJobListResponse,
  APIAdvancedError
} from '@/types/api-advanced';
import { APIError } from '@/lib/api/api-errors';

// Build-safe Firebase import
let db: any;
try {
  const firebaseModule = require('@/lib/firebase/build-safe-init');
  db = firebaseModule.db;
} catch (error) {
  console.warn('Firebase nicht verfügbar, verwende Mock-Service');
  db = null;
}

/**
 * Bulk Export Service
 * Verwaltet CSV/JSON/Excel-Exports aller Entitäten
 */
export class BulkExportService {
  private readonly COLLECTION_NAME = 'bulk_export_jobs';
  private readonly MAX_BATCH_SIZE = 1000;
  private readonly MAX_FILE_SIZE_MB = 100;
  private readonly JOB_EXPIRY_HOURS = 24;

  /**
   * Startet einen neuen Export-Job
   */
  async startExport(
    request: BulkExportRequest,
    organizationId: string,
    userId: string
  ): Promise<APIBulkJobResponse> {
    try {
      // Safe Database Check - verwende Mock wenn DB nicht verfügbar
      if (!db) {
        const { mockBulkExportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkExportService.startExport(request, organizationId, userId);
      }

      this.validateExportRequest(request);

      // Erstelle Job-Eintrag
      const job: Omit<BulkJob, 'id'> = {
        type: 'export',
        entities: request.entities,
        status: 'pending',
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
          currentStep: 'Initialisierung'
        },
        request,
        organizationId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + this.JOB_EXPIRY_HOURS * 60 * 60 * 1000)
        )
      };

      // Speichere Job (mit Safe Check)
      if (!collection || !addDoc) {
        // Fallback wenn Firestore nicht verfügbar
        const { mockBulkExportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkExportService.startExport(request, organizationId, userId);
      }
      
      const jobRef = await addDoc(collection(db, this.COLLECTION_NAME), job);
      const jobId = jobRef.id;

      // Starte Export-Verarbeitung asynchron
      setImmediate(() => this.processExportJob(jobId, organizationId));

      // Hole erstellten Job für Response
      const createdJob = await this.getJobById(jobId, organizationId);
      return createdJob;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'EXPORT_FAILED',
        'Fehler beim Starten des Exports',
        error
      );
    }
  }

  /**
   * Holt einen Export-Job nach ID
   */
  async getJobById(jobId: string, organizationId: string): Promise<APIBulkJobResponse> {
    try {
      // Safe Database Check - verwende Mock wenn DB nicht verfügbar
      if (!db) {
        const { mockBulkExportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkExportService.getJobById(jobId, organizationId);
      }

      const jobDoc = await getDoc(doc(db, this.COLLECTION_NAME, jobId));
      
      if (!jobDoc.exists()) {
        throw new APIError('JOB_NOT_FOUND', 'Export-Job nicht gefunden');
      }

      const jobData = { id: jobId, ...jobDoc.data() } as BulkJob;

      if (jobData.organizationId !== organizationId) {
        throw new APIError('JOB_NOT_FOUND', 'Export-Job nicht gefunden');
      }

      return this.transformToAPIResponse(jobData);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen des Jobs',
        error
      );
    }
  }

  /**
   * Holt alle Export-Jobs einer Organisation
   */
  async getJobs(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      status?: BulkJob['status'];
      type?: 'export' | 'import';
    } = {}
  ): Promise<APIBulkJobListResponse> {
    try {
      // Safe Database Check - verwende Mock wenn DB nicht verfügbar
      if (!db) {
        const { mockBulkExportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkExportService.getJobs(organizationId, params);
      }

      // Nur organizationId Filter, kein orderBy um Index-Fehler zu vermeiden
      const constraints = [
        where('organizationId', '==', organizationId)
      ];

      if (params.status) {
        constraints.push(where('status', '==', params.status));
      }

      if (params.type) {
        constraints.push(where('type', '==', params.type));
      }

      const q = query(collection(db, this.COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);

      let jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BulkJob));

      // Client-seitige Sortierung nach createdAt (neueste zuerst)
      jobs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      // Client-side Pagination da Firestore-Composite-Index fehlt
      const page = params.page || 1;
      const pageLimit = Math.min(params.limit || 20, 100);
      const startIndex = (page - 1) * pageLimit;
      const endIndex = startIndex + pageLimit;
      const paginatedJobs = jobs.slice(startIndex, endIndex);

      const apiJobs = paginatedJobs.map(job => this.transformToAPIResponse(job));

      return {
        jobs: apiJobs,
        total: jobs.length,
        page,
        limit: pageLimit,
        hasNext: endIndex < jobs.length
      };
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Jobs',
        error
      );
    }
  }

  /**
   * Storniert einen laufenden Export-Job
   */
  async cancelJob(jobId: string, organizationId: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId, organizationId);
      
      if (!['pending', 'processing'].includes(job.status)) {
        throw new APIError('INVALID_JOB_STATUS', 'Job kann nicht storniert werden');
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Stornieren des Jobs',
        error
      );
    }
  }

  /**
   * Verarbeitet einen Export-Job
   */
  private async processExportJob(jobId: string, organizationId: string): Promise<void> {
    try {
      // Lade Job-Daten
      const jobDoc = await getDoc(doc(db, this.COLLECTION_NAME, jobId));
      if (!jobDoc.exists()) return;

      const job = { id: jobId, ...jobDoc.data() } as BulkJob;
      if (job.status !== 'pending') return;

      // Update Status zu 'processing'
      await this.updateJobStatus(jobId, 'processing', {
        current: 0,
        total: 0,
        percentage: 0,
        currentStep: 'Daten laden'
      });

      const request = job.request as BulkExportRequest;
      const exportFiles: BulkJob['result']['files'] = [];
      let totalRecords = 0;

      // Verarbeite jede Entity
      for (let i = 0; i < request.entities.length; i++) {
        const entity = request.entities[i];
        
        await this.updateJobStatus(jobId, 'processing', {
          current: i,
          total: request.entities.length,
          percentage: Math.round((i / request.entities.length) * 100),
          currentStep: `Verarbeite ${entity}`
        });

        try {
          const entityResult = await this.exportEntity(
            entity,
            request,
            organizationId
          );

          if (entityResult) {
            exportFiles.push(entityResult);
            totalRecords += entityResult.recordCount;
          }
        } catch (entityError) {
          console.error(`Error exporting ${entity}:`, entityError);
          // Kontinuiere mit anderen Entitäten bei Fehlern
        }
      }

      // Generiere finale Download-URL (vereinfacht für jetzt)
      const downloadUrl = this.generateDownloadUrl(exportFiles, request.format);

      // Job als completed markieren
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
        'progress.current': request.entities.length,
        'progress.total': request.entities.length,
        'progress.percentage': 100,
        'progress.currentStep': 'Abgeschlossen',
        'result.files': exportFiles,
        'result.downloadUrl': downloadUrl,
        'result.recordCount': totalRecords,
        'result.completedAt': serverTimestamp(),
        'result.duration': Date.now() - job.createdAt.toDate().getTime()
      });

      // Sende Notification Email falls angefordert
      if (request.notificationEmail) {
        await this.sendCompletionNotification(
          request.notificationEmail,
          jobId,
          totalRecords
        );
      }

    } catch (error) {
      console.error('Error processing export job:', error);
      
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'failed',
        updatedAt: serverTimestamp(),
        'error.code': 'EXPORT_FAILED',
        'error.message': error instanceof Error ? error.message : 'Unbekannter Fehler',
        'error.details': error
      });
    }
  }

  /**
   * Exportiert eine einzelne Entity
   */
  private async exportEntity(
    entity: ExportableEntity,
    request: BulkExportRequest,
    organizationId: string
  ): Promise<BulkJob['result']['files'][0] | null> {
    let records: any[] = [];
    
    // Lade Daten basierend auf Entity-Typ
    switch (entity) {
      case 'contacts':
        records = await this.loadContacts(organizationId, request.filters);
        break;
      case 'companies':
        records = await this.loadCompanies(organizationId, request.filters);
        break;
      case 'publications':
        records = await this.loadPublications(organizationId, request.filters);
        break;
      case 'media_assets':
        records = await this.loadMediaAssets(organizationId, request.filters);
        break;
      case 'campaigns':
        records = await this.loadCampaigns(organizationId, request.filters);
        break;
      case 'webhooks':
        records = await this.loadWebhooks(organizationId, request.filters);
        break;
      default:
        console.warn(`Unsupported entity type: ${entity}`);
        return null;
    }

    if (records.length === 0) {
      return null;
    }

    // Konvertiere zu Export-Format
    const exportData = await this.convertToFormat(records, request.format);
    const fileSize = Buffer.byteLength(exportData, 'utf8');

    // Speichere temporär (vereinfacht)
    const fileName = `${entity}_export_${Date.now()}.${this.getFileExtension(request.format)}`;
    const fileUrl = await this.saveExportFile(fileName, exportData);

    return {
      entity,
      url: fileUrl,
      recordCount: records.length,
      fileSize
    };
  }

  /**
   * Lädt Contacts für Export
   */
  private async loadContacts(organizationId: string, filters?: any): Promise<any[]> {
    try {
      const response = await contactsService.getContacts(organizationId, 'system', {
        limit: 10000, // Max für Export
        includeDeleted: filters?.includeDeleted
      });
      return response.contacts || [];
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  }

  /**
   * Lädt Companies für Export
   */
  private async loadCompanies(organizationId: string, filters?: any): Promise<any[]> {
    try {
      const response = await companyService.getCompanies(organizationId, {
        limit: 10000,
        includeDeleted: filters?.includeDeleted
      });
      return response.companies || [];
    } catch (error) {
      console.error('Error loading companies:', error);
      return [];
    }
  }

  /**
   * Lädt Publications für Export
   */
  private async loadPublications(organizationId: string, filters?: any): Promise<any[]> {
    try {
      const response = await publicationsService.getPublications(organizationId, {
        limit: 10000,
        includeDeleted: filters?.includeDeleted
      });
      return response.publications || [];
    } catch (error) {
      console.error('Error loading publications:', error);
      return [];
    }
  }

  /**
   * Lädt Media Assets für Export
   */
  private async loadMediaAssets(organizationId: string, filters?: any): Promise<any[]> {
    try {
      const response = await publicationsService.getMediaAssets(organizationId, {
        limit: 10000
      });
      return response.assets || [];
    } catch (error) {
      console.error('Error loading media assets:', error);
      return [];
    }
  }

  /**
   * Lädt Campaigns für Export (vereinfacht)
   */
  private async loadCampaigns(organizationId: string, filters?: any): Promise<any[]> {
    // Placeholder - würde echte Campaign-Daten laden
    return [];
  }

  /**
   * Lädt Webhooks für Export
   */
  private async loadWebhooks(organizationId: string, filters?: any): Promise<any[]> {
    try {
      const response = await webhookService.getWebhooks(organizationId, {
        limit: 1000
      });
      return response.webhooks || [];
    } catch (error) {
      console.error('Error loading webhooks:', error);
      return [];
    }
  }

  /**
   * Konvertiert Daten zu gewünschtem Format
   */
  private async convertToFormat(records: any[], format: ExportFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(records, null, 2);
      
      case 'csv':
        return this.convertToCSV(records);
      
      case 'excel':
        // Vereinfacht als CSV für jetzt
        return this.convertToCSV(records);
      
      case 'xml':
        return this.convertToXML(records);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Konvertiert zu CSV
   */
  private convertToCSV(records: any[]): string {
    if (records.length === 0) return '';

    // Ermittle alle möglichen Spalten
    const allKeys = new Set<string>();
    records.forEach(record => {
      this.flattenObject(record, '', allKeys);
    });

    const headers = Array.from(allKeys).sort();
    const csvRows = [headers.join(',')];

    // Konvertiere jede Zeile
    records.forEach(record => {
      const flatRecord = this.flattenObject(record);
      const row = headers.map(header => {
        const value = flatRecord[header];
        if (value === null || value === undefined) return '';
        
        // Escape CSV-Zeichen
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Flatten-Objekt für CSV
   */
  private flattenObject(obj: any, prefix = '', keys?: Set<string>): any {
    const flattened: any = {};
    
    Object.keys(obj || {}).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (keys) {
        keys.add(newKey);
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey, keys));
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join('; ');
        if (keys) keys.add(newKey);
      } else {
        flattened[newKey] = value;
        if (keys) keys.add(newKey);
      }
    });
    
    return flattened;
  }

  /**
   * Konvertiert zu XML
   */
  private convertToXML(records: any[]): string {
    const xmlRows = records.map(record => {
      const xmlFields = Object.entries(record).map(([key, value]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        const safeValue = String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `    <${safeKey}>${safeValue}</${safeKey}>`;
      }).join('\n');
      
      return `  <record>\n${xmlFields}\n  </record>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<export>\n${xmlRows}\n</export>`;
  }

  /**
   * Speichert Export-Datei (vereinfacht)
   */
  private async saveExportFile(fileName: string, content: string): Promise<string> {
    // In echter Implementierung würde hier Firebase Storage oder S3 verwendet
    // Für jetzt simulieren wir nur eine URL
    return `https://storage.example.com/exports/${fileName}`;
  }

  /**
   * Generiert Download-URL für kombinierte Dateien
   */
  private generateDownloadUrl(files: BulkJob['result']['files'], format: ExportFormat): string {
    if (files.length === 1) {
      return files[0].url;
    }
    
    // Für mehrere Dateien würde hier ein ZIP erstellt
    return `https://storage.example.com/exports/bulk_export_${Date.now()}.zip`;
  }

  /**
   * Holt Datei-Extension für Format
   */
  private getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'excel': return 'xlsx';
      case 'xml': return 'xml';
      default: return 'txt';
    }
  }

  /**
   * Sendet Completion-Notification
   */
  private async sendCompletionNotification(
    email: string,
    jobId: string,
    recordCount: number
  ): Promise<void> {
    // Vereinfacht - würde echte Email senden
    console.log(`Export completed for ${email}: Job ${jobId}, ${recordCount} records`);
  }

  /**
   * Aktualisiert Job-Status
   */
  private async updateJobStatus(
    jobId: string,
    status: BulkJob['status'],
    progress?: BulkJob['progress']
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (progress) {
      Object.keys(progress).forEach(key => {
        updateData[`progress.${key}`] = progress[key as keyof typeof progress];
      });
    }

    await updateDoc(doc(db, this.COLLECTION_NAME, jobId), updateData);
  }

  /**
   * Validiert Export-Request
   */
  private validateExportRequest(request: BulkExportRequest): void {
    if (!request.entities || request.entities.length === 0) {
      throw new APIError('VALIDATION_ERROR', 'Mindestens eine Entity muss ausgewählt werden');
    }

    if (!request.format) {
      throw new APIError('VALIDATION_ERROR', 'Export-Format ist erforderlich');
    }

    if (!['csv', 'json', 'excel', 'xml'].includes(request.format)) {
      throw new APIError('INVALID_FORMAT', 'Ungültiges Export-Format');
    }

    if (request.entities.length > 10) {
      throw new APIError('VALIDATION_ERROR', 'Maximal 10 Entitäten pro Export');
    }

    // Validiere Email-Format falls angegeben
    if (request.notificationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.notificationEmail)) {
        throw new APIError('VALIDATION_ERROR', 'Ungültiges Email-Format');
      }
    }
  }

  /**
   * Transformiert Job zu API-Response
   */
  private transformToAPIResponse(job: BulkJob): APIBulkJobResponse {
    return {
      id: job.id!,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result ? {
        downloadUrl: job.result.downloadUrl,
        fileSize: job.result.fileSize,
        recordCount: job.result.recordCount,
        imported: job.result.imported,
        errors: job.result.errors?.slice(0, 100) // Limitiere Error-Anzahl
      } : undefined,
      createdAt: job.createdAt.toDate().toISOString(),
      updatedAt: job.updatedAt.toDate().toISOString(),
      expiresAt: job.expiresAt?.toDate().toISOString()
    };
  }

  /**
   * Bereinigt abgelaufene Jobs
   */
  async cleanupExpiredJobs(): Promise<void> {
    try {
      const now = Timestamp.now();
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<=', now),
        firestoreLimit(50)
      );

      const snapshot = await getDocs(expiredQuery);
      
      for (const jobDoc of snapshot.docs) {
        await jobDoc.ref.delete();
      }

      console.log(`Cleaned up ${snapshot.docs.length} expired export jobs`);
    } catch (error) {
      console.error('Error cleaning up expired jobs:', error);
    }
  }
}

// Singleton Export
export const bulkExportService = new BulkExportService();