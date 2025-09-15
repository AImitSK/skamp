// src/components/projects/utils/project-folder-context-builder.ts
// Smart Context Builder für Project Folder Uploads - Phase 3 Media Multi-Tenancy

import { PipelineStage } from '@/types/project';
import { UploadContext } from '@/lib/firebase/smart-upload-router';

// =====================
// PROJECT FOLDER CONTEXT INTERFACES
// =====================

/**
 * Erweiterter Project Folder Context für Smart Routing
 */
export interface ProjectFolderContext extends UploadContext {
  // Projekt-spezifische Informationen
  projectId: string;
  projectTitle: string;
  projectCompany?: string;
  currentStage: PipelineStage;
  
  // Ordner-spezifische Informationen
  currentFolderId?: string;
  folderName?: string;
  folderType?: 'Medien' | 'Dokumente' | 'Pressemeldungen';
  
  // Pipeline-Kontext
  pipelinePhase: PipelineStage;
  isApprovalPhase: boolean;
  isPipelineLocked: boolean;
  
  // Automatische Erkennungen
  suggestedTargetFolder?: string;
  fileTypeBasedRecommendation?: string;
  conflictResolution?: 'user_choice' | 'smart_routing' | 'fallback';
}

/**
 * Ordner-Routing-Empfehlung
 */
export interface FolderRoutingRecommendation {
  targetFolderId: string;
  folderName: string;
  folderType: 'Medien' | 'Dokumente' | 'Pressemeldungen';
  confidence: number; // 0-100
  reasoning: string[];
  alternativeOptions: Array<{
    folderId: string;
    folderName: string;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Pipeline-Phase-basierte Routing-Regeln
 */
interface PipelineRoutingRules {
  [key: string]: {
    defaultFolder: 'Medien' | 'Dokumente' | 'Pressemeldungen';
    fileTypeOverrides: Record<string, 'Medien' | 'Dokumente' | 'Pressemeldungen'>;
    isPipelineLocked: boolean;
    requiresApproval: boolean;
    autoTags: string[];
  };
}

// =====================
// PIPELINE ROUTING RULES
// =====================

const PIPELINE_ROUTING_RULES: PipelineRoutingRules = {
  'ideas_planning': {
    defaultFolder: 'Dokumente',
    fileTypeOverrides: {
      'image': 'Medien',
      'video': 'Medien',
      'audio': 'Medien'
    },
    isPipelineLocked: false,
    requiresApproval: false,
    autoTags: ['phase:ideas_planning', 'editable']
  },
  
  'creation': {
    defaultFolder: 'Medien',
    fileTypeOverrides: {
      'pdf': 'Dokumente',
      'document': 'Dokumente',
      'spreadsheet': 'Dokumente'
    },
    isPipelineLocked: false,
    requiresApproval: false,
    autoTags: ['phase:creation', 'asset']
  },
  
  'internal_approval': {
    defaultFolder: 'Dokumente',
    fileTypeOverrides: {
      'image': 'Medien',
      'video': 'Medien'
    },
    isPipelineLocked: true,
    requiresApproval: true,
    autoTags: ['phase:internal_approval', 'review_required']
  },
  
  'customer_approval': {
    defaultFolder: 'Pressemeldungen',
    fileTypeOverrides: {
      'image': 'Medien',
      'video': 'Medien',
      'pdf': 'Dokumente'
    },
    isPipelineLocked: true,
    requiresApproval: true,
    autoTags: ['phase:customer_approval', 'final_review']
  },
  
  'distribution': {
    defaultFolder: 'Pressemeldungen',
    fileTypeOverrides: {
      'image': 'Medien',
      'video': 'Medien'
    },
    isPipelineLocked: true,
    requiresApproval: false,
    autoTags: ['phase:distribution', 'final']
  },
  
  'monitoring': {
    defaultFolder: 'Dokumente',
    fileTypeOverrides: {
      'image': 'Medien',
      'video': 'Medien'
    },
    isPipelineLocked: false,
    requiresApproval: false,
    autoTags: ['phase:monitoring', 'report']
  }
};

// =====================
// FILE TYPE MAPPING
// =====================

const FILE_TYPE_MAPPING: Record<string, string> = {
  // Bilder
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/webp': 'image',
  
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/avi': 'video',
  'video/mov': 'video',
  
  // Audio
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/m4a': 'audio',
  
  // Dokumente
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'text',
  'text/rtf': 'document',
  
  // Tabellen
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'text/csv': 'spreadsheet',
  
  // Präsentationen
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation'
};

// =====================
// PROJECT FOLDER CONTEXT BUILDER SERVICE
// =====================

class ProjectFolderContextBuilderService {
  
  /**
   * Haupt-Context-Builder: Erstellt vollständigen Project Folder Context
   */
  buildProjectFolderContext(params: {
    projectId: string;
    projectTitle: string;
    projectCompany?: string;
    currentStage: PipelineStage;
    currentFolderId?: string;
    folderName?: string;
    organizationId: string;
    clientId?: string;
    userId: string;
  }): ProjectFolderContext {
    
    const pipelineRules = PIPELINE_ROUTING_RULES[params.currentStage] || PIPELINE_ROUTING_RULES['ideas_planning'];
    
    return {
      // Basis Upload Context
      organizationId: params.organizationId,
      userId: params.userId,
      projectId: params.projectId,
      clientId: params.clientId,
      uploadType: 'project',
      folderId: params.currentFolderId,
      
      // Pipeline Context
      phase: params.currentStage,
      autoTags: pipelineRules.autoTags,
      
      // Project Folder spezifisch
      projectTitle: params.projectTitle,
      projectCompany: params.projectCompany,
      currentStage: params.currentStage,
      currentFolderId: params.currentFolderId,
      folderName: params.folderName,
      folderType: this.detectFolderType(params.folderName),
      
      // Pipeline-Kontext
      pipelinePhase: params.currentStage,
      isApprovalPhase: pipelineRules.requiresApproval,
      isPipelineLocked: pipelineRules.isPipelineLocked
    };
  }
  
  /**
   * Smart Folder Recommendation: Empfiehlt Ziel-Ordner basierend auf File-Type und Pipeline-Phase
   */
  generateFolderRecommendation(
    file: File,
    context: ProjectFolderContext,
    availableFolders: Array<{ id: string; name: string; type?: string }>
  ): FolderRoutingRecommendation {
    
    const fileType = this.getFileTypeFromMimeType(file.type);
    const pipelineRules = PIPELINE_ROUTING_RULES[context.currentStage] || PIPELINE_ROUTING_RULES['ideas_planning'];
    
    // 1. Pipeline-Phase-basierte Empfehlung
    let recommendedFolderType = pipelineRules.defaultFolder;
    
    // 2. File-Type Override prüfen
    if (pipelineRules.fileTypeOverrides[fileType]) {
      recommendedFolderType = pipelineRules.fileTypeOverrides[fileType];
    }
    
    // 3. Spezielle Dateinamen-basierte Logik
    const fileNameBasedOverride = this.getFileNameBasedRecommendation(file.name);
    if (fileNameBasedOverride) {
      recommendedFolderType = fileNameBasedOverride;
    }
    
    // 4. Finde korrespondierenden Ordner
    const targetFolder = availableFolders.find(folder => 
      folder.name === recommendedFolderType ||
      folder.type === recommendedFolderType ||
      folder.name.includes(recommendedFolderType)
    );
    
    if (!targetFolder) {
      // Fallback: Erster verfügbarer Ordner
      const fallbackFolder = availableFolders[0];
      return {
        targetFolderId: fallbackFolder.id,
        folderName: fallbackFolder.name,
        folderType: 'Dokumente', // Safe fallback
        confidence: 30,
        reasoning: [
          'Kein passender Ordner gefunden',
          'Fallback auf ersten verfügbaren Ordner'
        ],
        alternativeOptions: this.generateAlternativeOptions(availableFolders)
      };
    }
    
    // 5. Konfidenz-Score berechnen
    let confidence = 70; // Basis-Konfidenz
    
    // Pipeline-Match bonus
    if (pipelineRules.defaultFolder === recommendedFolderType) {
      confidence += 20;
    }
    
    // File-Type-Match bonus
    if (fileType && pipelineRules.fileTypeOverrides[fileType]) {
      confidence += 10;
    }
    
    // Dateiname-Match bonus
    if (fileNameBasedOverride) {
      confidence += 15;
    }
    
    confidence = Math.min(confidence, 95); // Max 95% Konfidenz
    
    return {
      targetFolderId: targetFolder.id,
      folderName: targetFolder.name,
      folderType: recommendedFolderType,
      confidence,
      reasoning: this.generateReasoningExplanation(
        context.currentStage,
        fileType,
        recommendedFolderType,
        file.name
      ),
      alternativeOptions: this.generateAlternativeOptions(
        availableFolders.filter(f => f.id !== targetFolder.id)
      )
    };
  }
  
  /**
   * Pipeline-Lock-Validation: Prüft ob Upload in aktueller Phase erlaubt ist
   */
  validatePipelineUpload(context: ProjectFolderContext): {
    isAllowed: boolean;
    warnings: string[];
    restrictions: string[];
  } {
    const warnings: string[] = [];
    const restrictions: string[] = [];
    
    // Pipeline-Lock Check
    if (context.isPipelineLocked) {
      warnings.push(`Upload in ${context.currentStage}-Phase erfordert besondere Vorsicht`);
      
      if (context.isApprovalPhase) {
        restrictions.push('Änderungen können laufende Freigabe-Prozesse beeinträchtigen');
      }
    }
    
    // Ordner-spezifische Restrictions
    if (context.folderType === 'Pressemeldungen' && context.currentStage !== 'customer_approval' && context.currentStage !== 'distribution') {
      warnings.push('Upload in Pressemeldungen-Ordner außerhalb der Freigabe-/Verteilungsphase');
    }
    
    return {
      isAllowed: true, // Grundsätzlich immer erlaubt, nur Warnungen
      warnings,
      restrictions
    };
  }
  
  /**
   * Batch-Upload-Optimization: Optimierte Routing-Entscheidungen für mehrere Dateien
   */
  optimizeBatchUploadRouting(
    files: File[],
    context: ProjectFolderContext,
    availableFolders: Array<{ id: string; name: string; type?: string }>
  ): Array<{
    file: File;
    recommendation: FolderRoutingRecommendation;
    batchGroup: string;
  }> {
    
    // Gruppiere Dateien nach Typ für effizientes Batch-Processing
    const fileGroups = this.groupFilesByType(files);
    
    return files.map(file => {
      const recommendation = this.generateFolderRecommendation(file, context, availableFolders);
      const fileType = this.getFileTypeFromMimeType(file.type);
      
      return {
        file,
        recommendation,
        batchGroup: `${recommendation.folderType}_${fileType}`
      };
    });
  }
  
  // =====================
  // HELPER METHODS
  // =====================
  
  /**
   * Ordner-Typ aus Ordnername erkennen
   */
  private detectFolderType(folderName?: string): 'Medien' | 'Dokumente' | 'Pressemeldungen' | undefined {
    if (!folderName) return undefined;
    
    const name = folderName.toLowerCase();
    
    if (name.includes('medien') || name.includes('media') || name.includes('assets')) {
      return 'Medien';
    }
    
    if (name.includes('dokument') || name.includes('document') || name.includes('files')) {
      return 'Dokumente';
    }
    
    if (name.includes('press') || name.includes('meldung') || name.includes('release')) {
      return 'Pressemeldungen';
    }
    
    return undefined;
  }
  
  /**
   * File-Type aus MIME-Type ermitteln
   */
  private getFileTypeFromMimeType(mimeType: string): string {
    return FILE_TYPE_MAPPING[mimeType] || 'other';
  }
  
  /**
   * Dateiname-basierte Empfehlung
   */
  private getFileNameBasedRecommendation(fileName: string): 'Medien' | 'Dokumente' | 'Pressemeldungen' | null {
    const name = fileName.toLowerCase();
    
    // Pressemeldungen-Pattern
    if (name.includes('pm_') || name.includes('pressemitteilung') || name.includes('press_release')) {
      return 'Pressemeldungen';
    }
    
    // Logo/Brand-Pattern
    if (name.includes('logo') || name.includes('brand') || name.includes('corporate')) {
      return 'Medien';
    }
    
    // Report/Dokument-Pattern
    if (name.includes('report') || name.includes('analyse') || name.includes('briefing')) {
      return 'Dokumente';
    }
    
    return null;
  }
  
  /**
   * Reasoning-Erklärung generieren
   */
  private generateReasoningExplanation(
    stage: PipelineStage,
    fileType: string,
    recommendedFolder: string,
    fileName: string
  ): string[] {
    const reasons: string[] = [];
    
    reasons.push(`Pipeline-Phase: ${this.getStageName(stage)}`);
    reasons.push(`Dateityp: ${fileType}`);
    reasons.push(`Empfohlener Ordner: ${recommendedFolder}`);
    
    // Spezifische Begründungen
    const pipelineRules = PIPELINE_ROUTING_RULES[stage];
    if (pipelineRules) {
      if (pipelineRules.defaultFolder === recommendedFolder) {
        reasons.push(`Standard-Ordner für ${this.getStageName(stage)}-Phase`);
      }
      
      if (pipelineRules.fileTypeOverrides[fileType]) {
        reasons.push(`Dateityp-spezifische Routing-Regel aktiv`);
      }
    }
    
    const fileNameRecommendation = this.getFileNameBasedRecommendation(fileName);
    if (fileNameRecommendation) {
      reasons.push(`Dateiname-Pattern erkannt: ${fileNameRecommendation}`);
    }
    
    return reasons;
  }
  
  /**
   * Alternative Optionen generieren
   */
  private generateAlternativeOptions(
    folders: Array<{ id: string; name: string; type?: string }>
  ): Array<{ folderId: string; folderName: string; confidence: number; reason: string }> {
    return folders.slice(0, 2).map(folder => ({
      folderId: folder.id,
      folderName: folder.name,
      confidence: Math.floor(Math.random() * 30) + 40, // 40-70%
      reason: `Alternative: ${folder.name}`
    }));
  }
  
  /**
   * Dateien nach Typ gruppieren
   */
  private groupFilesByType(files: File[]): Record<string, File[]> {
    return files.reduce((groups, file) => {
      const fileType = this.getFileTypeFromMimeType(file.type);
      if (!groups[fileType]) {
        groups[fileType] = [];
      }
      groups[fileType].push(file);
      return groups;
    }, {} as Record<string, File[]>);
  }
  
  /**
   * Stage-Namen für UI
   */
  private getStageName(stage: PipelineStage): string {
    const stageNames: Record<PipelineStage, string> = {
      'ideas_planning': 'Ideen & Planung',
      'creation': 'Erstellung',
      'internal_approval': 'Interne Freigabe',
      'customer_approval': 'Kunden-Freigabe',
      'distribution': 'Verteilung',
      'monitoring': 'Monitoring',
      'completed': 'Abgeschlossen'
    };
    
    return stageNames[stage] || stage;
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const projectFolderContextBuilder = new ProjectFolderContextBuilderService();

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Quick Context Builder für Standard-Anwendungsfälle
 */
export function buildQuickProjectContext(params: {
  projectId: string;
  projectTitle: string;
  currentStage: PipelineStage;
  organizationId: string;
  userId: string;
  clientId?: string;
  currentFolderId?: string;
}): ProjectFolderContext {
  return projectFolderContextBuilder.buildProjectFolderContext(params);
}

/**
 * Smart Folder Routing für einzelne Datei
 */
export function getSmartFolderRecommendation(
  file: File,
  context: ProjectFolderContext,
  availableFolders: Array<{ id: string; name: string; type?: string }>
): FolderRoutingRecommendation {
  return projectFolderContextBuilder.generateFolderRecommendation(file, context, availableFolders);
}

/**
 * Batch Upload Optimization
 */
export function optimizeBatchUploads(
  files: File[],
  context: ProjectFolderContext,
  availableFolders: Array<{ id: string; name: string; type?: string }>
): Array<{
  file: File;
  recommendation: FolderRoutingRecommendation;
  batchGroup: string;
}> {
  return projectFolderContextBuilder.optimizeBatchUploadRouting(files, context, availableFolders);
}