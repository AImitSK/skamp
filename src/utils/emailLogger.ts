// src/utils/emailLogger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  campaignId?: string;
  emailAddress?: string;
  threadId?: string;
  organizationId?: string;
  [key: string]: any;
}

class EmailLogger {
  private isProduction = process.env.NODE_ENV === 'production';
  private enabledLevels: LogLevel[] = this.isProduction 
    ? ['error', 'warn'] 
    : ['info', 'warn', 'error', 'debug'];

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.enabledLevels.includes(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);
    
    if (context) {
      console[level === 'error' ? 'error' : 'log'](`${prefix} [${timestamp}] ${message}`, context);
    } else {
      console[level === 'error' ? 'error' : 'log'](`${prefix} [${timestamp}] ${message}`);
    }
  }

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'info': return '📧';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'debug': return '🔍';
      default: return '📧';
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  // Spezifische E-Mail-Events
  emailSent(campaignId: string, recipientCount: number) {
    this.info(`Email campaign sent successfully`, { campaignId, recipientCount });
  }

  emailFailed(campaignId: string, error: string) {
    this.error(`Email campaign failed`, { campaignId, error });
  }

  draftSaved(campaignId: string) {
    this.debug(`Email draft saved`, { campaignId });
  }

  threadMatched(threadId: string, strategy: string) {
    this.debug(`Thread matched using strategy: ${strategy}`, { threadId, strategy });
  }
}

export const emailLogger = new EmailLogger();