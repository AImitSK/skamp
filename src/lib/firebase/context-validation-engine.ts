// src/lib/firebase/context-validation-engine.ts
// Context Validation Engine für Unified Upload API
// Unified Context-Validation, Multi-Tenancy-Security und Permission-Validation

import {
  UnifiedUploadContext,
  UnifiedUploadOptions,
  ContextValidationResult,
  ValidationError,
  ValidationErrorCode,
  UnifiedUploadTarget,
  UnifiedUploadType,
  PipelinePhase
} from '@/types/unified-upload';
import { mediaService } from './media-service';
import { brandingService } from './branding-service';

// =====================
// VALIDATION RULE INTERFACES
// =====================

interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'security' | 'business_logic' | 'data_integrity' | 'performance';
  
  // Validation Logic
  validate: (context: UnifiedUploadContext, options: UnifiedUploadOptions) => Promise<ValidationError[]>;
  
  // Auto-Fix Logic (optional)
  autoFix?: (context: UnifiedUploadContext, options: UnifiedUploadOptions) => Promise<Partial<UnifiedUploadContext>>;
}

interface SecurityValidationContext {
  organizationId: string;
  userId: string;
  requestedPermissions: string[];
  resourceAccess: string[];
  crossTenantAttempt?: boolean;
}

interface ContextInheritanceRule {
  field: keyof UnifiedUploadContext;
  inheritanceChain: ('folder' | 'project' | 'campaign' | 'organization')[];
  fallbackValue?: any;
  required: boolean;
}

// =====================
// CONTEXT VALIDATION ENGINE
// =====================

class ContextValidationEngineService {
  private validationRules: ValidationRule[] = [];
  private inheritanceRules: ContextInheritanceRule[] = [];
  private permissionCache = new Map<string, { permissions: string[]; timestamp: number }>();

  constructor() {
    this.initializeValidationRules();
    this.initializeInheritanceRules();
  }

  // =====================
  // CORE VALIDATION METHODS
  // =====================

  /**
   * Hauptvalidierung für Upload-Context
   */
  async validateContext(
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions = {}
  ): Promise<ContextValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let canProceed = true;
    const recommendedActions: string[] = [];
    let autoFixAvailable = false;

    try {
      // 1. Basis-Feld-Validierung
      const fieldValidationErrors = await this.validateRequiredFields(context);
      errors.push(...fieldValidationErrors.filter(e => e.severity === 'error'));
      warnings.push(...fieldValidationErrors.filter(e => e.severity === 'warning'));

      // 2. Security-Validierung
      if (!options.skipValidation) {
        const securityErrors = await this.validateSecurity(context, options);
        errors.push(...securityErrors.filter(e => e.severity === 'error'));
        warnings.push(...securityErrors.filter(e => e.severity === 'warning'));
      }

      // 3. Business-Logic-Validierung
      const businessLogicErrors = await this.validateBusinessLogic(context, options);
      errors.push(...businessLogicErrors.filter(e => e.severity === 'error'));
      warnings.push(...businessLogicErrors.filter(e => e.severity === 'warning'));

      // 4. Context-Inheritance-Validierung
      const inheritanceErrors = await this.validateInheritance(context);
      errors.push(...inheritanceErrors.filter(e => e.severity === 'error'));
      warnings.push(...inheritanceErrors.filter(e => e.severity === 'warning'));

      // 5. Performance-Validierung
      if (options.strictContextValidation) {
        const performanceErrors = await this.validatePerformanceConstraints(context);
        warnings.push(...performanceErrors);
      }

      // 6. Bestimme ob Upload fortgesetzt werden kann
      canProceed = errors.length === 0 || options.skipValidation === true;

      // 7. Generiere Empfehlungen
      recommendedActions.push(...this.generateRecommendations(errors, warnings, context));

      // 8. Prüfe Auto-Fix-Verfügbarkeit
      autoFixAvailable = await this.checkAutoFixAvailability(errors, warnings);

    } catch (validationError) {
      errors.push({
        code: 'VALIDATION_FAILED',
        message: `Context-Validation fehlgeschlagen: ${validationError}`,
        severity: 'error',
        canProceed: false
      });
      canProceed = false;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed,
      recommendedActions,
      autoFixAvailable
    };
  }

  /**
   * Multi-Tenancy-Security-Checks
   */
  async validateMultiTenantSecurity(
    context: UnifiedUploadContext,
    targetResource?: { type: string; id: string }
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // 1. Organization-Isolation prüfen
      if (!context.organizationId) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'organizationId ist für Multi-Tenancy erforderlich',
          field: 'organizationId',
          severity: 'error',
          canProceed: false
        });
        return errors;
      }

      // 2. Cross-Tenant-Zugriff prüfen
      const crossTenantAttempts = await this.detectCrossTenantAccess(context);
      if (crossTenantAttempts.length > 0) {
        errors.push({
          code: 'PERMISSION_DENIED',
          message: `Cross-Tenant-Zugriff erkannt: ${crossTenantAttempts.join(', ')}`,
          severity: 'error',
          canProceed: false
        });
      }

      // 3. Resource-Ownership validieren
      if (targetResource) {
        const ownershipValid = await this.validateResourceOwnership(context, targetResource);
        if (!ownershipValid) {
          errors.push({
            code: 'PERMISSION_DENIED',
            message: `Keine Berechtigung für ${targetResource.type}:${targetResource.id}`,
            severity: 'error',
            canProceed: false
          });
        }
      }

      // 4. Context-konsistenz validieren
      const contextConsistency = await this.validateContextConsistency(context);
      if (!contextConsistency.isValid) {
        errors.push(...contextConsistency.errors);
      }

    } catch (error) {
      errors.push({
        code: 'PERMISSION_DENIED',
        message: `Security-Validation fehlgeschlagen: ${error}`,
        severity: 'error',
        canProceed: false
      });
    }

    return errors;
  }

  /**
   * Permission-Validation mit Role-based Access
   */
  async validatePermissions(
    context: UnifiedUploadContext,
    requiredPermissions: string[]
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // 1. User-Permissions abrufen (mit Caching)
      const userPermissions = await this.getUserPermissions(context.organizationId, context.userId);

      // 2. Required Permissions prüfen
      const missingPermissions = requiredPermissions.filter(
        permission => !userPermissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        errors.push({
          code: 'PERMISSION_DENIED',
          message: `Fehlende Berechtigungen: ${missingPermissions.join(', ')}`,
          severity: 'error',
          canProceed: false
        });
      }

      // 3. Upload-Target-spezifische Permissions
      const targetPermissions = this.getTargetSpecificPermissions(context.uploadTarget);
      const missingTargetPermissions = targetPermissions.filter(
        permission => !userPermissions.includes(permission)
      );

      if (missingTargetPermissions.length > 0) {
        errors.push({
          code: 'PERMISSION_DENIED',
          message: `Fehlende ${context.uploadTarget}-Berechtigungen: ${missingTargetPermissions.join(', ')}`,
          severity: 'error',
          canProceed: false
        });
      }

    } catch (error) {
      errors.push({
        code: 'PERMISSION_DENIED',
        message: `Permission-Validation fehlgeschlagen: ${error}`,
        severity: 'error',
        canProceed: false
      });
    }

    return errors;
  }

  /**
   * Context-Inheritance-Rules anwenden
   */
  async applyContextInheritance(
    context: UnifiedUploadContext
  ): Promise<{ 
    enhancedContext: UnifiedUploadContext; 
    inheritanceLog: string[];
    errors: ValidationError[];
  }> {
    const enhancedContext = { ...context };
    const inheritanceLog: string[] = [];
    const errors: ValidationError[] = [];

    for (const rule of this.inheritanceRules) {
      try {
        const currentValue = enhancedContext[rule.field];
        
        // Skip wenn bereits Wert vorhanden und nicht überschreibbar
        if (currentValue && rule.field !== 'autoTags') continue;

        // Durch Inheritance-Chain gehen
        for (const source of rule.inheritanceChain) {
          const inheritedValue = await this.resolveInheritanceValue(enhancedContext, rule.field, source);

          if (inheritedValue !== undefined) {
            if (rule.field === 'autoTags' && currentValue) {
              // Tags zusammenführen
              (enhancedContext as any)[rule.field] = [...(currentValue as string[]), ...inheritedValue];
            } else {
              (enhancedContext as any)[rule.field] = inheritedValue;
            }

            inheritanceLog.push(`${rule.field} inherited from ${source}: ${inheritedValue}`);
            break;
          }
        }

        // Fallback-Value verwenden wenn kein Inherited Value gefunden
        if (!enhancedContext[rule.field] && rule.fallbackValue !== undefined) {
          (enhancedContext as any)[rule.field] = rule.fallbackValue;
          inheritanceLog.push(`${rule.field} set to fallback: ${rule.fallbackValue}`);
        }

        // Required Field Validation
        if (rule.required && !enhancedContext[rule.field]) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Pflichtfeld ${rule.field} nicht gefunden und keine Inheritance möglich`,
            field: rule.field as string,
            severity: 'error',
            canProceed: false
          });
        }

      } catch (error) {
        errors.push({
          code: 'CONTEXT_MISMATCH',
          message: `Context-Inheritance für ${rule.field} fehlgeschlagen: ${error}`,
          field: rule.field as string,
          severity: 'warning',
          canProceed: true
        });
      }
    }

    return {
      enhancedContext,
      inheritanceLog,
      errors
    };
  }

  /**
   * Smart Default-Value-Resolution
   */
  async resolveSmartDefaults(
    context: UnifiedUploadContext
  ): Promise<{
    resolvedContext: UnifiedUploadContext;
    resolutionLog: string[];
  }> {
    const resolvedContext = { ...context };
    const resolutionLog: string[] = [];

    // Upload Type Smart Resolution
    if (!resolvedContext.uploadType) {
      const smartType = this.inferUploadType(resolvedContext);
      if (smartType) {
        resolvedContext.uploadType = smartType;
        resolutionLog.push(`uploadType inferred as: ${smartType}`);
      }
    }

    // Phase Smart Resolution
    if (resolvedContext.projectId && !resolvedContext.phase) {
      try {
        const projectPhase = await this.inferProjectPhase(resolvedContext.projectId);
        if (projectPhase) {
          resolvedContext.phase = projectPhase;
          resolutionLog.push(`phase inferred as: ${projectPhase}`);
        }
      } catch (error) {
        resolutionLog.push(`phase inference failed: ${error}`);
      }
    }

    // Category Smart Resolution
    if (!resolvedContext.category && resolvedContext.uploadTarget) {
      const smartCategory = this.inferCategory(resolvedContext);
      if (smartCategory) {
        resolvedContext.category = smartCategory;
        resolutionLog.push(`category inferred as: ${smartCategory}`);
      }
    }

    return {
      resolvedContext,
      resolutionLog
    };
  }

  // =====================
  // PRIVATE VALIDATION METHODS
  // =====================

  /**
   * Required Fields Validation
   */
  private async validateRequiredFields(context: UnifiedUploadContext): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const requiredFields: Array<{
      field: keyof UnifiedUploadContext;
      message: string;
    }> = [
      { field: 'organizationId', message: 'organizationId ist erforderlich für Multi-Tenancy' },
      { field: 'userId', message: 'userId ist erforderlich für Audit-Logging' },
      { field: 'uploadTarget', message: 'uploadTarget ist erforderlich für Routing-Entscheidung' },
      { field: 'uploadType', message: 'uploadType ist erforderlich für Service-Selection' }
    ];

    for (const { field, message } of requiredFields) {
      if (!context[field]) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message,
          field: field as string,
          severity: 'error',
          canProceed: false
        });
      }
    }

    // Conditional Required Fields
    if (context.uploadTarget === 'project' && !context.projectId) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'projectId ist erforderlich für Project-Uploads',
        field: 'projectId',
        severity: 'error',
        canProceed: false
      });
    }

    if (context.uploadTarget === 'campaign' && !context.campaignId) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'campaignId ist erforderlich für Campaign-Uploads',
        field: 'campaignId',
        severity: 'error',
        canProceed: false
      });
    }

    return errors;
  }

  /**
   * Security Validation
   */
  private async validateSecurity(
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Multi-Tenancy Security
    const multiTenancyErrors = await this.validateMultiTenantSecurity(context);
    errors.push(...multiTenancyErrors);

    // Permission Validation
    const requiredPermissions = this.getRequiredPermissions(context);
    const permissionErrors = await this.validatePermissions(context, requiredPermissions);
    errors.push(...permissionErrors);

    return errors;
  }

  /**
   * Business Logic Validation
   */
  private async validateBusinessLogic(
    context: UnifiedUploadContext,
    options: UnifiedUploadOptions
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Upload Target + Type Combination Validation
    const validCombinations = this.getValidTargetTypeCombinations();
    const currentCombination = `${context.uploadTarget}:${context.uploadType}`;
    
    if (!validCombinations.includes(currentCombination)) {
      errors.push({
        code: 'INVALID_CONTEXT',
        message: `Ungültige Kombination von uploadTarget (${context.uploadTarget}) und uploadType (${context.uploadType})`,
        severity: 'error',
        canProceed: false
      });
    }

    // Phase Validation für Project Context
    if (context.projectId && context.phase) {
      const phaseValidation = await this.validatePhaseContext(context.projectId, context.phase);
      if (!phaseValidation.isValid) {
        errors.push({
          code: 'CONTEXT_MISMATCH',
          message: phaseValidation.message,
          severity: 'warning',
          canProceed: true
        });
      }
    }

    return errors;
  }

  /**
   * Inheritance Validation
   */
  private async validateInheritance(context: UnifiedUploadContext): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Folder Inheritance Validation
    if (context.folderId && !context.clientId) {
      errors.push({
        code: 'CONTEXT_MISMATCH',
        message: 'clientId Inheritance von Folder empfohlen',
        severity: 'info',
        canProceed: true
      });
    }

    // Project-Campaign Consistency
    if (context.projectId && context.campaignId) {
      try {
        const campaignBelongsToProject = await this.validateCampaignProjectRelation(
          context.campaignId,
          context.projectId
        );
        
        if (!campaignBelongsToProject) {
          errors.push({
            code: 'CONTEXT_MISMATCH',
            message: 'Campaign gehört nicht zum angegebenen Projekt',
            severity: 'warning',
            canProceed: true
          });
        }
      } catch (error) {
        errors.push({
          code: 'CONTEXT_MISMATCH',
          message: `Campaign-Project-Validation fehlgeschlagen: ${error}`,
          severity: 'info',
          canProceed: true
        });
      }
    }

    return errors;
  }

  /**
   * Performance Constraints Validation
   */
  private async validatePerformanceConstraints(context: UnifiedUploadContext): Promise<ValidationError[]> {
    const warnings: ValidationError[] = [];

    // Complex Context Warning
    const contextComplexity = this.calculateContextComplexity(context);
    if (contextComplexity > 6) { // Threshold gesenkt von 8 auf 6
      warnings.push({
        code: 'CONTEXT_MISMATCH',
        message: 'Context-Komplexität kann Performance beeinträchtigen',
        severity: 'warning',
        canProceed: true
      });
    }

    // Auto-Tags Limit
    if (context.autoTags && context.autoTags.length > 20) {
      warnings.push({
        code: 'CONTEXT_MISMATCH',
        message: 'Viele Auto-Tags können Indexierung verlangsamen',
        severity: 'warning',
        canProceed: true
      });
    }

    return warnings;
  }

  // =====================
  // HELPER METHODS
  // =====================

  private async detectCrossTenantAccess(context: UnifiedUploadContext): Promise<string[]> {
    const violations: string[] = [];

    // Folder Cross-Tenant Check
    if (context.folderId) {
      try {
        const folder = await mediaService.getFolder(context.folderId);
        if (folder && folder.userId !== context.organizationId) {
          violations.push(`folder:${context.folderId}`);
        }
      } catch (error) {
        // Folder nicht gefunden - möglicherweise Cross-Tenant
        violations.push(`folder:${context.folderId} (not accessible)`);
      }
    }

    // Weitere Cross-Tenant Checks könnten hier hinzugefügt werden
    return violations;
  }

  private async validateResourceOwnership(
    context: UnifiedUploadContext,
    resource: { type: string; id: string }
  ): Promise<boolean> {
    try {
      switch (resource.type) {
        case 'folder':
          const folder = await mediaService.getFolder(resource.id);
          return folder?.userId === context.organizationId;
        case 'branding':
          const branding = await brandingService.getBrandingSettings(context.organizationId);
          return branding?.organizationId === context.organizationId;
        default:
          return true; // Unknown resources pass durch
      }
    } catch (error) {
      return false; // Bei Fehlern: Konservativ verweigern
    }
  }

  private async validateContextConsistency(context: UnifiedUploadContext): Promise<{
    isValid: boolean;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];

    // organizationId Consistency Check
    if (context.organizationId && context.userId) {
      // TODO: Prüfung ob userId zur Organization gehört
      // Würde User-Service erfordern
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getUserPermissions(organizationId: string, userId: string): Promise<string[]> {
    const cacheKey = `${organizationId}:${userId}`;
    const cached = this.permissionCache.get(cacheKey);
    
    // Cache für 5 Minuten
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return cached.permissions;
    }

    // TODO: Echte Permission-Resolution
    // Für jetzt: Basic Permissions basierend auf Context
    const permissions = [
      'upload:basic',
      'upload:media',
      'upload:project',
      'upload:campaign',
      'upload:branding',
      'write:branding',
      'read:media',
      'write:media',
      'read:project',
      'read:campaign'
    ];

    this.permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });

    return permissions;
  }

  private getTargetSpecificPermissions(target: UnifiedUploadTarget): string[] {
    const permissionMap: Record<UnifiedUploadTarget, string[]> = {
      'media_library': ['upload:media'],
      'project': ['upload:project', 'read:project'],
      'campaign': ['upload:campaign', 'read:campaign'],
      'branding': ['upload:branding', 'write:branding'],
      'folder': ['upload:media', 'write:folder'],
      'client_media': ['upload:client_media'],
      'document_generation': ['upload:generated_content'],
      'temporary': ['upload:temp'],
      'legacy': ['upload:legacy']
    };

    return permissionMap[target] || [];
  }

  private getRequiredPermissions(context: UnifiedUploadContext): string[] {
    const permissions: string[] = ['upload:basic'];
    
    // Target-specific permissions
    permissions.push(...this.getTargetSpecificPermissions(context.uploadTarget));
    
    return permissions;
  }

  private async resolveInheritanceValue(
    context: UnifiedUploadContext,
    field: keyof UnifiedUploadContext,
    source: 'folder' | 'project' | 'campaign' | 'organization'
  ): Promise<any> {
    try {
      switch (source) {
        case 'folder':
          if (context.folderId) {
            const folder = await mediaService.getFolder(context.folderId);
            return (folder as any)?.[field];
          }
          break;
        case 'project':
          // TODO: Project Service Integration
          break;
        case 'campaign':
          // TODO: Campaign Service Integration
          break;
        case 'organization':
          // TODO: Organization Service Integration
          break;
      }
    } catch (error) {
      // Inheritance failed - return undefined
    }
    
    return undefined;
  }

  private inferUploadType(context: UnifiedUploadContext): UnifiedUploadType | null {
    // Upload Type basierend auf Target inferieren
    const typeMap: Partial<Record<UnifiedUploadTarget, UnifiedUploadType>> = {
      'media_library': 'media_asset',
      'project': 'media_asset',
      'campaign': 'media_asset',
      'branding': 'branding_asset',
      'document_generation': 'generated_content'
    };

    return typeMap[context.uploadTarget] || null;
  }

  private async inferProjectPhase(projectId: string): Promise<PipelinePhase | null> {
    // TODO: Project Service Integration für Phase-Detection
    // Für jetzt: Return null (kein Smart Default)
    return null;
  }

  private inferCategory(context: UnifiedUploadContext): string | null {
    // Category basierend auf Upload Type
    const categoryMap: Partial<Record<UnifiedUploadType, string>> = {
      'media_asset': 'Medien',
      'hero_image': 'Kampagnen-Bilder',
      'attachment': 'Dokumente',
      'branding_logo': 'Branding',
      'generated_content': 'Generierte Inhalte'
    };

    return categoryMap[context.uploadType] || null;
  }

  private getValidTargetTypeCombinations(): string[] {
    return [
      'media_library:media_asset',
      'project:media_asset',
      'project:attachment',
      'campaign:hero_image',
      'campaign:attachment',
      'campaign:generated_content',
      'branding:branding_logo',
      'branding:branding_asset',
      'folder:media_asset',
      'client_media:media_asset',
      'document_generation:generated_content',
      'temporary:media_asset',
      'legacy:media_asset'
    ];
  }

  private async validatePhaseContext(projectId: string, phase: PipelinePhase): Promise<{
    isValid: boolean;
    message: string;
  }> {
    // TODO: Echte Phase-Validation mit Project Service
    return {
      isValid: true,
      message: 'Phase validation passed'
    };
  }

  private async validateCampaignProjectRelation(campaignId: string, projectId: string): Promise<boolean> {
    // TODO: Echte Campaign-Project Relation Check
    return true;
  }

  private calculateContextComplexity(context: UnifiedUploadContext): number {
    let complexity = 0;
    
    // Base complexity
    complexity += 1;
    
    // Field complexity
    if (context.projectId) complexity += 1;
    if (context.campaignId) complexity += 1;
    if (context.folderId) complexity += 1;
    if (context.clientId) complexity += 1;
    if (context.phase) complexity += 1;
    if (context.autoTags && context.autoTags.length > 5) complexity += 1;
    if (context.category) complexity += 1;
    
    return complexity;
  }

  private generateRecommendations(
    errors: ValidationError[],
    warnings: ValidationError[],
    context: UnifiedUploadContext
  ): string[] {
    const recommendations: string[] = [];

    // Error-based Recommendations
    if (errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')) {
      recommendations.push('Vervollständigen Sie die erforderlichen Context-Felder');
    }

    if (errors.some(e => e.code === 'PERMISSION_DENIED')) {
      recommendations.push('Überprüfen Sie Ihre Benutzerberechtigungen');
    }

    // Warning-based Recommendations
    if (warnings.some(w => w.code === 'CONTEXT_MISMATCH')) {
      recommendations.push('Prüfen Sie die Context-Konsistenz für optimale Performance');
    }

    return recommendations;
  }

  private async checkAutoFixAvailability(
    errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<boolean> {
    // Auto-Fix verfügbar für bestimmte Error-Types
    const autoFixableErrors = ['MISSING_REQUIRED_FIELD', 'CONTEXT_MISMATCH'];
    
    return errors.some(error => autoFixableErrors.includes(error.code));
  }

  // =====================
  // INITIALIZATION
  // =====================

  private initializeValidationRules(): void {
    // Validation Rules werden hier definiert
    // Für Brevity nur wenige Beispiele
    
    this.validationRules = [
      {
        name: 'required_fields',
        description: 'Validiert erforderliche Context-Felder',
        severity: 'error',
        category: 'data_integrity',
        validate: this.validateRequiredFields.bind(this)
      },
      {
        name: 'multi_tenancy_security',
        description: 'Validiert Multi-Tenancy-Sicherheit',
        severity: 'error',
        category: 'security',
        validate: async (context: UnifiedUploadContext, options: UnifiedUploadOptions) => {
          return await this.validateMultiTenantSecurity(context);
        }
      }
    ];
  }

  private initializeInheritanceRules(): void {
    this.inheritanceRules = [
      {
        field: 'clientId',
        inheritanceChain: ['folder', 'project', 'organization'],
        required: false
      },
      {
        field: 'autoTags',
        inheritanceChain: ['folder', 'project', 'campaign'],
        fallbackValue: [],
        required: false
      },
      {
        field: 'category',
        inheritanceChain: ['folder', 'project'],
        required: false
      }
    ];
  }
}

// =====================
// SINGLETON EXPORT
// =====================

export const contextValidationEngine = new ContextValidationEngineService();