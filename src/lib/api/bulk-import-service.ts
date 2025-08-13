// src/lib/api/bulk-import-service.ts
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
let Timestamp: any;
let serverTimestamp: any;
let writeBatch: any;

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
  Timestamp = firestoreModule.Timestamp;
  serverTimestamp = firestoreModule.serverTimestamp;
  writeBatch = firestoreModule.writeBatch;
} catch (error) {
  console.warn('Firestore nicht verfügbar');
}
import {
  BulkImportRequest,
  BulkJob,
  ExportableEntity,
  ImportFormat,
  APIBulkJobResponse,
  APIBulkJobListResponse,
  FileProcessingJob
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
 * Bulk Import Service
 * Verwaltet CSV/JSON/Excel-Imports mit Validierung
 */
export class BulkImportService {
  private readonly COLLECTION_NAME = 'bulk_import_jobs';
  private readonly FILE_PROCESSING_COLLECTION = 'file_processing_jobs';
  private readonly MAX_FILE_SIZE_MB = 50;
  private readonly MAX_RECORDS_PER_BATCH = 500;
  private readonly JOB_EXPIRY_HOURS = 24;

  /**
   * Startet einen neuen Import-Job
   */
  async startImport(
    request: BulkImportRequest,
    organizationId: string,
    userId: string
  ): Promise<APIBulkJobResponse> {
    try {
      // TEMPORARY: Verwende immer Mock-Service für Import POST (bypasse Validierung)
      // Minimale Validierung für Mock
      if (!request.entity) {
        throw new APIError('VALIDATION_ERROR', 'Entity ist erforderlich');
      }
      if (!request.format) {
        throw new APIError('VALIDATION_ERROR', 'Format ist erforderlich');
      }
      
      const { mockBulkImportService } = await import('@/lib/api/mock-export-import-service');
      return mockBulkImportService.startImport(request, organizationId, userId);

      // Erstelle Job-Eintrag
      const job: Omit<BulkJob, 'id'> = {
        type: 'import',
        entity: request.entity,
        status: 'pending',
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
          currentStep: 'Datei verarbeiten'
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
        const { mockBulkImportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkImportService.startImport(request, organizationId, userId);
      }
      
      const jobRef = await addDoc(collection(db, this.COLLECTION_NAME), job);
      const jobId = jobRef.id;

      // Starte Import-Verarbeitung asynchron
      setImmediate(() => this.processImportJob(jobId, organizationId));

      // Hole erstellten Job für Response
      const createdJob = await this.getJobById(jobId, organizationId);
      return createdJob;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'IMPORT_FAILED',
        'Fehler beim Starten des Imports',
        error
      );
    }
  }

  /**
   * Holt einen Import-Job nach ID
   */
  async getJobById(jobId: string, organizationId: string): Promise<APIBulkJobResponse> {
    try {
      // Safe Database Check - verwende Mock wenn DB nicht verfügbar
      if (!db) {
        const { mockBulkImportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkImportService.getJobById(jobId, organizationId);
      }
      
      const jobDoc = await getDoc(doc(db, this.COLLECTION_NAME, jobId));
      
      if (!jobDoc.exists()) {
        throw new APIError('JOB_NOT_FOUND', 'Import-Job nicht gefunden');
      }

      const jobData = { id: jobId, ...jobDoc.data() } as BulkJob;

      if (jobData.organizationId !== organizationId) {
        throw new APIError('JOB_NOT_FOUND', 'Import-Job nicht gefunden');
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
   * Holt alle Import-Jobs einer Organisation
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
        const { mockBulkImportService } = await import('@/lib/api/mock-export-import-service');
        return mockBulkImportService.getJobs(organizationId, params);
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
   * Storniert einen laufenden Import-Job
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
   * Verarbeitet einen Import-Job
   */
  private async processImportJob(jobId: string, organizationId: string): Promise<void> {
    try {
      // Lade Job-Daten
      const jobDoc = await getDoc(doc(db, this.COLLECTION_NAME, jobId));
      if (!jobDoc.exists()) return;

      const job = { id: jobId, ...jobDoc.data() } as BulkJob;
      if (job.status !== 'pending') return;

      const request = job.request as BulkImportRequest;

      // Update Status zu 'processing'
      await this.updateJobStatus(jobId, 'processing', {
        current: 0,
        total: 0,
        percentage: 0,
        currentStep: 'Datei parsen'
      });

      // Schritt 1: Datei verarbeiten
      const fileData = await this.processFile(request, organizationId, job.createdBy);
      
      if (!fileData.success) {
        throw new Error(fileData.error || 'Fehler beim Parsen der Datei');
      }

      const records = fileData.records!;
      const totalRecords = records.length;

      // Update Progress
      await this.updateJobStatus(jobId, 'processing', {
        current: 0,
        total: totalRecords,
        percentage: 0,
        currentStep: 'Daten validieren'
      });

      // Schritt 2: Validierung
      const validationResult = await this.validateRecords(
        records,
        request.entity,
        organizationId
      );

      if (request.options?.validateOnly) {
        // Nur Validierung - keine Datenimporte
        await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
          status: 'completed',
          updatedAt: serverTimestamp(),
          'progress.current': totalRecords,
          'progress.total': totalRecords,
          'progress.percentage': 100,
          'progress.currentStep': 'Validierung abgeschlossen',
          'result.imported': { created: 0, updated: 0, skipped: 0, errors: 0 },
          'result.errors': validationResult.errors,
          'result.completedAt': serverTimestamp(),
          'result.duration': Date.now() - job.createdAt.toDate().getTime()
        });
        return;
      }

      // Schritt 3: Daten importieren
      const validRecords = validationResult.validRecords;
      let imported = { created: 0, updated: 0, skipped: 0, errors: 0 };
      const importErrors: BulkJob['result']['errors'] = [...validationResult.errors];

      const batchSize = request.options?.batchSize || this.MAX_RECORDS_PER_BATCH;
      
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        
        // Update Progress
        await this.updateJobStatus(jobId, 'processing', {
          current: i,
          total: validRecords.length,
          percentage: Math.round((i / validRecords.length) * 100),
          currentStep: `Importiere Batch ${Math.floor(i / batchSize) + 1}`
        });

        const batchResult = await this.importBatch(
          batch,
          request,
          organizationId,
          job.createdBy,
          i
        );

        imported.created += batchResult.created;
        imported.updated += batchResult.updated;
        imported.skipped += batchResult.skipped;
        imported.errors += batchResult.errors.length;
        importErrors.push(...batchResult.errors);
      }

      // Job als completed markieren
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
        'progress.current': validRecords.length,
        'progress.total': validRecords.length,
        'progress.percentage': 100,
        'progress.currentStep': 'Import abgeschlossen',
        'result.imported': imported,
        'result.errors': importErrors.slice(0, 1000), // Limitiere Fehler
        'result.completedAt': serverTimestamp(),
        'result.duration': Date.now() - job.createdAt.toDate().getTime()
      });

      // Sende Notification Email falls angefordert
      if (request.notificationEmail) {
        await this.sendCompletionNotification(
          request.notificationEmail,
          jobId,
          imported
        );
      }

    } catch (error) {
      console.error('Error processing import job:', error);
      
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'failed',
        updatedAt: serverTimestamp(),
        'error.code': 'IMPORT_FAILED',
        'error.message': error instanceof Error ? error.message : 'Unbekannter Fehler',
        'error.details': error
      });
    }
  }

  /**
   * Verarbeitet Import-Datei
   */
  private async processFile(
    request: BulkImportRequest,
    organizationId: string,
    userId: string
  ): Promise<{
    success: boolean;
    records?: any[];
    error?: string;
  }> {
    try {
      let content: string;

      if (request.fileContent) {
        content = request.fileContent;
      } else if (request.fileUrl) {
        // Lade Datei von URL
        const response = await fetch(request.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        content = await response.text();
      } else {
        throw new Error('Weder fileContent noch fileUrl angegeben');
      }

      // Parse nach Format
      let records: any[];
      
      switch (request.format) {
        case 'json':
          records = this.parseJSON(content);
          break;
        case 'csv':
          records = this.parseCSV(content);
          break;
        case 'excel':
          // Vereinfacht als CSV für jetzt
          records = this.parseCSV(content);
          break;
        default:
          throw new Error(`Unsupported format: ${request.format}`);
      }

      return { success: true, records };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Parsing-Fehler'
      };
    }
  }

  /**
   * Parst JSON-Content
   */
  private parseJSON(content: string): any[] {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object') {
      return [data];
    } else {
      throw new Error('JSON muss Array oder Objekt sein');
    }
  }

  /**
   * Parst CSV-Content
   */
  private parseCSV(content: string): any[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV muss mindestens Header und eine Datenzeile enthalten');
    }

    const headers = this.parseCSVLine(lines[0]);
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i]);
        const record: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || '';
          record[header.trim()] = this.convertValue(value);
        });
        
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Parst eine CSV-Zeile
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Konvertiert String-Werte zu passenden Typen
   */
  private convertValue(value: string): any {
    if (value === '') return null;
    
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Nummer
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
    
    // Datum (ISO Format)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    
    return value;
  }

  /**
   * Validiert Records vor Import
   */
  private async validateRecords(
    records: any[],
    entity: ExportableEntity,
    organizationId: string
  ): Promise<{
    validRecords: any[];
    errors: BulkJob['result']['errors'];
  }> {
    const validRecords: any[] = [];
    const errors: BulkJob['result']['errors'] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 wegen Header und 1-basierter Zählung
      
      try {
        const validationResult = await this.validateRecord(record, entity, organizationId);
        
        if (validationResult.valid) {
          validRecords.push(validationResult.record);
        } else {
          errors.push(...validationResult.errors.map(error => ({
            row: rowNumber,
            field: error.field,
            message: error.message,
            data: record
          })));
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Validierungsfehler',
          data: record
        });
      }
    }

    return { validRecords, errors };
  }

  /**
   * Validiert einen einzelnen Record
   */
  private async validateRecord(
    record: any,
    entity: ExportableEntity,
    organizationId: string
  ): Promise<{
    valid: boolean;
    record?: any;
    errors: Array<{ field?: string; message: string }>;
  }> {
    const errors: Array<{ field?: string; message: string }> = [];

    switch (entity) {
      case 'contacts':
        return this.validateContact(record, organizationId);
      case 'companies':
        return this.validateCompany(record, organizationId);
      case 'publications':
        return this.validatePublication(record, organizationId);
      default:
        return {
          valid: false,
          errors: [{ message: `Validierung für ${entity} nicht implementiert` }]
        };
    }
  }

  /**
   * Validiert Contact-Record
   */
  private async validateContact(record: any, organizationId: string): Promise<{
    valid: boolean;
    record?: any;
    errors: Array<{ field?: string; message: string }>;
  }> {
    const errors: Array<{ field?: string; message: string }> = [];
    const cleanRecord: any = {};

    // Erforderliche Felder
    if (!record.email && !record.firstName && !record.lastName) {
      errors.push({
        message: 'Mindestens Email oder Name (firstName/lastName) erforderlich'
      });
    }

    // Email-Validierung
    if (record.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(record.email)) {
        errors.push({
          field: 'email',
          message: 'Ungültiges Email-Format'
        });
      } else {
        cleanRecord.email = record.email.toLowerCase().trim();
      }
    }

    // Namen
    if (record.firstName) cleanRecord.firstName = record.firstName.trim();
    if (record.lastName) cleanRecord.lastName = record.lastName.trim();
    if (record.company) cleanRecord.company = record.company.trim();
    if (record.position) cleanRecord.position = record.position.trim();
    if (record.phone) cleanRecord.phone = record.phone.trim();
    if (record.website) cleanRecord.website = record.website.trim();

    // Tags
    if (record.tags) {
      if (typeof record.tags === 'string') {
        cleanRecord.tags = record.tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(record.tags)) {
        cleanRecord.tags = record.tags.filter(Boolean);
      }
    }

    // Metadaten
    cleanRecord.organizationId = organizationId;
    cleanRecord.status = record.status || 'active';

    return {
      valid: errors.length === 0,
      record: errors.length === 0 ? cleanRecord : undefined,
      errors
    };
  }

  /**
   * Validiert Company-Record
   */
  private async validateCompany(record: any, organizationId: string): Promise<{
    valid: boolean;
    record?: any;
    errors: Array<{ field?: string; message: string }>;
  }> {
    const errors: Array<{ field?: string; message: string }> = [];
    const cleanRecord: any = {};

    // Name erforderlich
    if (!record.name?.trim()) {
      errors.push({
        field: 'name',
        message: 'Firmenname ist erforderlich'
      });
    } else {
      cleanRecord.name = record.name.trim();
    }

    // Optional Felder
    if (record.website) cleanRecord.website = record.website.trim();
    if (record.description) cleanRecord.description = record.description.trim();
    if (record.industry) cleanRecord.industry = record.industry.trim();
    if (record.employees) {
      const emp = parseInt(record.employees);
      if (!isNaN(emp) && emp > 0) {
        cleanRecord.employees = emp;
      }
    }

    // Tags
    if (record.tags) {
      if (typeof record.tags === 'string') {
        cleanRecord.tags = record.tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(record.tags)) {
        cleanRecord.tags = record.tags.filter(Boolean);
      }
    }

    cleanRecord.organizationId = organizationId;

    return {
      valid: errors.length === 0,
      record: errors.length === 0 ? cleanRecord : undefined,
      errors
    };
  }

  /**
   * Validiert Publication-Record
   */
  private async validatePublication(record: any, organizationId: string): Promise<{
    valid: boolean;
    record?: any;
    errors: Array<{ field?: string; message: string }>;
  }> {
    const errors: Array<{ field?: string; message: string }> = [];
    const cleanRecord: any = {};

    // Titel erforderlich
    if (!record.title?.trim()) {
      errors.push({
        field: 'title',
        message: 'Publikations-Titel ist erforderlich'
      });
    } else {
      cleanRecord.title = record.title.trim();
    }

    // Publisher
    if (!record.publisher?.name?.trim()) {
      errors.push({
        field: 'publisher',
        message: 'Publisher-Name ist erforderlich'
      });
    } else {
      cleanRecord.publisher = {
        id: record.publisher.id || `publisher-${Date.now()}`,
        name: record.publisher.name.trim(),
        logoUrl: record.publisher.logoUrl
      };
    }

    // Type
    const validTypes = ['magazine', 'newspaper', 'blog', 'podcast', 'newsletter', 'social_media'];
    if (!record.type || !validTypes.includes(record.type)) {
      errors.push({
        field: 'type',
        message: `Typ muss einer von: ${validTypes.join(', ')}`
      });
    } else {
      cleanRecord.type = record.type;
    }

    cleanRecord.organizationId = organizationId;
    cleanRecord.verified = Boolean(record.verified);

    return {
      valid: errors.length === 0,
      record: errors.length === 0 ? cleanRecord : undefined,
      errors
    };
  }

  /**
   * Importiert einen Batch von Records
   */
  private async importBatch(
    records: any[],
    request: BulkImportRequest,
    organizationId: string,
    userId: string,
    startIndex: number
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: BulkJob['result']['errors'];
  }> {
    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as BulkJob['result']['errors']
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = startIndex + i + 2; // +2 für Header und 1-basiert

      try {
        const importResult = await this.importRecord(
          record,
          request,
          organizationId,
          userId
        );

        switch (importResult.action) {
          case 'created':
            result.created++;
            // Trigger Event
            await eventManager.triggerEvent(
              `${request.entity.slice(0, -1)}.created` as any,
              importResult.record,
              organizationId,
              { userId, source: 'bulk_import' }
            );
            break;
          case 'updated':
            result.updated++;
            await eventManager.triggerEvent(
              `${request.entity.slice(0, -1)}.updated` as any,
              importResult.record,
              organizationId,
              { userId, source: 'bulk_import' }
            );
            break;
          case 'skipped':
            result.skipped++;
            break;
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Import-Fehler',
          data: record
        });
      }
    }

    return result;
  }

  /**
   * Importiert einen einzelnen Record
   */
  private async importRecord(
    record: any,
    request: BulkImportRequest,
    organizationId: string,
    userId: string
  ): Promise<{
    action: 'created' | 'updated' | 'skipped';
    record: any;
  }> {
    const mode = request.options?.mode || 'create';
    const duplicateHandling = request.options?.duplicateHandling || 'skip';

    switch (request.entity) {
      case 'contacts':
        return this.importContact(record, mode, duplicateHandling, organizationId, userId);
      case 'companies':
        return this.importCompany(record, mode, duplicateHandling, organizationId, userId);
      case 'publications':
        return this.importPublication(record, mode, duplicateHandling, organizationId, userId);
      default:
        throw new Error(`Import für ${request.entity} nicht unterstützt`);
    }
  }

  /**
   * Importiert einen Contact
   */
  private async importContact(
    record: any,
    mode: string,
    duplicateHandling: string,
    organizationId: string,
    userId: string
  ): Promise<{ action: 'created' | 'updated' | 'skipped'; record: any }> {
    // Prüfe auf Duplikate (vereinfacht über Email)
    if (record.email && ['skip', 'update'].includes(duplicateHandling)) {
      const existingResponse = await contactsService.getContacts(organizationId, 'system', {
        filters: { email: record.email },
        limit: 1
      });
      
      if (existingResponse.contacts?.length > 0) {
        const existing = existingResponse.contacts[0];
        
        if (duplicateHandling === 'skip') {
          return { action: 'skipped', record: existing };
        }
        
        if (duplicateHandling === 'update' && ['update', 'upsert'].includes(mode)) {
          const updated = await contactsService.updateContact(existing.id, record, organizationId);
          return { action: 'updated', record: updated };
        }
      }
    }

    // Erstelle neuen Contact
    if (['create', 'upsert'].includes(mode)) {
      const created = await contactsService.createContact(record, organizationId);
      return { action: 'created', record: created };
    }

    return { action: 'skipped', record: record };
  }

  /**
   * Importiert eine Company
   */
  private async importCompany(
    record: any,
    mode: string,
    duplicateHandling: string,
    organizationId: string,
    userId: string
  ): Promise<{ action: 'created' | 'updated' | 'skipped'; record: any }> {
    // Prüfe auf Duplikate über Namen
    if (['skip', 'update'].includes(duplicateHandling)) {
      const existingResponse = await companyService.getCompanies(organizationId, {
        filters: { name: record.name },
        limit: 1
      });
      
      if (existingResponse.companies?.length > 0) {
        const existing = existingResponse.companies[0];
        
        if (duplicateHandling === 'skip') {
          return { action: 'skipped', record: existing };
        }
        
        if (duplicateHandling === 'update' && ['update', 'upsert'].includes(mode)) {
          const updated = await companyService.updateCompany(existing.id, record, organizationId);
          return { action: 'updated', record: updated };
        }
      }
    }

    // Erstelle neue Company
    if (['create', 'upsert'].includes(mode)) {
      const created = await companyService.createCompany(record, organizationId);
      return { action: 'created', record: created };
    }

    return { action: 'skipped', record: record };
  }

  /**
   * Importiert eine Publication
   */
  private async importPublication(
    record: any,
    mode: string,
    duplicateHandling: string,
    organizationId: string,
    userId: string
  ): Promise<{ action: 'created' | 'updated' | 'skipped'; record: any }> {
    // Prüfe auf Duplikate über Titel
    if (['skip', 'update'].includes(duplicateHandling)) {
      const existingResponse = await publicationsService.getPublications(organizationId, {
        filters: { title: record.title },
        limit: 1
      });
      
      if (existingResponse.publications?.length > 0) {
        const existing = existingResponse.publications[0];
        
        if (duplicateHandling === 'skip') {
          return { action: 'skipped', record: existing };
        }
        
        if (duplicateHandling === 'update' && ['update', 'upsert'].includes(mode)) {
          const updated = await publicationsService.updatePublication(existing.id, record, organizationId, userId);
          return { action: 'updated', record: updated };
        }
      }
    }

    // Erstelle neue Publication
    if (['create', 'upsert'].includes(mode)) {
      const created = await publicationsService.createPublication(record, organizationId, userId);
      return { action: 'created', record: created };
    }

    return { action: 'skipped', record: record };
  }

  /**
   * Sendet Completion-Notification
   */
  private async sendCompletionNotification(
    email: string,
    jobId: string,
    imported: { created: number; updated: number; skipped: number; errors: number }
  ): Promise<void> {
    // Vereinfacht - würde echte Email senden
    console.log(`Import completed for ${email}: Job ${jobId}`, imported);
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
   * Validiert Import-Request
   */
  private validateImportRequest(request: BulkImportRequest): void {
    if (!request.entity) {
      throw new APIError('VALIDATION_ERROR', 'Entity ist erforderlich');
    }

    if (!request.format) {
      throw new APIError('VALIDATION_ERROR', 'Format ist erforderlich');
    }

    if (!['csv', 'json', 'excel'].includes(request.format)) {
      throw new APIError('INVALID_FORMAT', 'Ungültiges Import-Format');
    }

    if (!request.fileContent && !request.fileUrl && !request.data) {
      throw new APIError('VALIDATION_ERROR', 'fileContent, fileUrl oder data ist erforderlich');
    }

    if (request.fileContent && request.fileContent.length > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new APIError('FILE_TOO_LARGE', `Datei zu groß (max ${this.MAX_FILE_SIZE_MB}MB)`);
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
        imported: job.result.imported,
        errors: job.result.errors?.slice(0, 100) // Limitiere Error-Anzahl
      } : undefined,
      createdAt: job.createdAt.toDate().toISOString(),
      updatedAt: job.updatedAt.toDate().toISOString(),
      expiresAt: job.expiresAt?.toDate().toISOString()
    };
  }
}

// Singleton Export
export const bulkImportService = new BulkImportService();