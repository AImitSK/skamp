// src/utils/emailErrorHandler.ts
import { emailLogger } from './emailLogger';

export interface EmailError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: {
    campaignId?: string;
    emailAddress?: string;
    threadId?: string;
    organizationId?: string;
    [key: string]: any;
  };
}

export class EmailServiceError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly context?: EmailError['context'];

  constructor(code: string, message: string, details?: any, context?: EmailError['context']) {
    super(message);
    this.name = 'EmailServiceError';
    this.code = code;
    this.details = details;
    this.context = context;
  }
}

// Standard Error Codes
export const EMAIL_ERROR_CODES = {
  // Validation Errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_RECIPIENTS: 'INVALID_RECIPIENTS', 
  INVALID_SUBJECT: 'INVALID_SUBJECT',
  INVALID_CONTENT: 'INVALID_CONTENT',
  
  // Service Errors  
  SENDGRID_ERROR: 'SENDGRID_ERROR',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // Campaign Errors
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_NOT_APPROVED: 'CAMPAIGN_NOT_APPROVED',
  CAMPAIGN_ALREADY_SENT: 'CAMPAIGN_ALREADY_SENT',
  
  // Scheduling Errors
  INVALID_SCHEDULE_TIME: 'INVALID_SCHEDULE_TIME',
  SCHEDULE_TOO_SOON: 'SCHEDULE_TOO_SOON',
  
  // Draft Errors
  DRAFT_SAVE_ERROR: 'DRAFT_SAVE_ERROR',
  DRAFT_LOAD_ERROR: 'DRAFT_LOAD_ERROR',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type EmailErrorCode = typeof EMAIL_ERROR_CODES[keyof typeof EMAIL_ERROR_CODES];

// Error Handler mit standardisierter Behandlung
export class EmailErrorHandler {
  static handle(
    error: unknown, 
    context?: EmailError['context'],
    defaultCode: EmailErrorCode = EMAIL_ERROR_CODES.UNKNOWN_ERROR
  ): EmailServiceError {
    let emailError: EmailServiceError;

    if (error instanceof EmailServiceError) {
      // Bereits ein EmailServiceError
      emailError = error;
    } else if (error instanceof Error) {
      // Standard JavaScript Error
      const code = this.determineErrorCode(error.message, defaultCode);
      emailError = new EmailServiceError(code, error.message, error, context);
    } else if (typeof error === 'string') {
      // String Error
      const code = this.determineErrorCode(error, defaultCode);
      emailError = new EmailServiceError(code, error, undefined, context);
    } else {
      // Unbekannter Error-Typ
      emailError = new EmailServiceError(
        EMAIL_ERROR_CODES.UNKNOWN_ERROR,
        'Ein unbekannter Fehler ist aufgetreten',
        error,
        context
      );
    }

    // Error loggen
    emailLogger.error(emailError.message, {
      code: emailError.code,
      details: emailError.details,
      ...emailError.context
    });

    return emailError;
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: EmailError['context'],
    defaultCode?: EmailErrorCode
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context, defaultCode);
    }
  }

  static handleSync<T>(
    operation: () => T,
    context?: EmailError['context'], 
    defaultCode?: EmailErrorCode
  ): T {
    try {
      return operation();
    } catch (error) {
      throw this.handle(error, context, defaultCode);
    }
  }

  private static determineErrorCode(message: string, defaultCode: EmailErrorCode): EmailErrorCode {
    const lowerMessage = message.toLowerCase();
    
    // SendGrid Errors
    if (lowerMessage.includes('sendgrid') || lowerMessage.includes('api key')) {
      return EMAIL_ERROR_CODES.SENDGRID_ERROR;
    }
    
    // Firebase Errors
    if (lowerMessage.includes('firebase') || lowerMessage.includes('firestore')) {
      return EMAIL_ERROR_CODES.FIREBASE_ERROR;
    }
    
    // Rate Limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return EMAIL_ERROR_CODES.RATE_LIMIT_ERROR;
    }
    
    // Validation Errors
    if (lowerMessage.includes('invalid email')) {
      return EMAIL_ERROR_CODES.INVALID_EMAIL;
    }
    
    if (lowerMessage.includes('subject') && lowerMessage.includes('required')) {
      return EMAIL_ERROR_CODES.INVALID_SUBJECT;
    }
    
    // Campaign Errors  
    if (lowerMessage.includes('not found')) {
      return EMAIL_ERROR_CODES.CAMPAIGN_NOT_FOUND;
    }
    
    if (lowerMessage.includes('not approved')) {
      return EMAIL_ERROR_CODES.CAMPAIGN_NOT_APPROVED;
    }
    
    return defaultCode;
  }
}

// Hilfsfunktionen für häufige Error-Szenarien
export const emailErrorHelpers = {
  // Validation Error
  validation(message: string, field?: string, context?: EmailError['context']): EmailServiceError {
    return new EmailServiceError(
      EMAIL_ERROR_CODES.INVALID_EMAIL, 
      message,
      { field },
      context
    );
  },

  // Campaign Error
  campaignNotFound(campaignId: string): EmailServiceError {
    return new EmailServiceError(
      EMAIL_ERROR_CODES.CAMPAIGN_NOT_FOUND,
      `Kampagne mit ID ${campaignId} nicht gefunden`,
      { campaignId },
      { campaignId }
    );
  },

  // SendGrid Error  
  sendgridError(message: string, details?: any, context?: EmailError['context']): EmailServiceError {
    return new EmailServiceError(
      EMAIL_ERROR_CODES.SENDGRID_ERROR,
      `SendGrid Fehler: ${message}`,
      details,
      context
    );
  },

  // Draft Error
  draftError(operation: 'save' | 'load', campaignId: string, details?: any): EmailServiceError {
    const code = operation === 'save' 
      ? EMAIL_ERROR_CODES.DRAFT_SAVE_ERROR 
      : EMAIL_ERROR_CODES.DRAFT_LOAD_ERROR;
    
    return new EmailServiceError(
      code,
      `Fehler beim ${operation === 'save' ? 'Speichern' : 'Laden'} des E-Mail-Entwurfs`,
      details,
      { campaignId }
    );
  },

  // Schedule Error
  scheduleError(message: string, scheduledDate?: Date, context?: EmailError['context']): EmailServiceError {
    return new EmailServiceError(
      EMAIL_ERROR_CODES.INVALID_SCHEDULE_TIME,
      message,
      { scheduledDate },
      context
    );
  }
};

// Result-Pattern für Service-Responses
export interface ServiceResult<T> {
  success: true;
  data: T;
}

export interface ServiceError {
  success: false;
  error: EmailServiceError;
}

export type ServiceResponse<T> = ServiceResult<T> | ServiceError;

// Helper für Service-Responses
export const serviceResponse = {
  success<T>(data: T): ServiceResult<T> {
    return { success: true, data };
  },

  error(error: EmailServiceError): ServiceError {
    return { success: false, error };
  },

  fromTryCatch<T>(
    operation: () => T | Promise<T>,
    context?: EmailError['context'],
    defaultCode?: EmailErrorCode
  ): ServiceResponse<T> | Promise<ServiceResponse<T>> {
    try {
      const result = operation();
      if (result instanceof Promise) {
        return result
          .then(data => serviceResponse.success(data))
          .catch(error => serviceResponse.error(EmailErrorHandler.handle(error, context, defaultCode)));
      }
      return serviceResponse.success(result);
    } catch (error) {
      return serviceResponse.error(EmailErrorHandler.handle(error, context, defaultCode));
    }
  }
};