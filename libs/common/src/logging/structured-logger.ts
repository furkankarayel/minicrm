import { LoggerService } from '@nestjs/common';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  service?: string;
  method?: string;
  path?: string;
  duration?: number;
  [key: string]: any;
}

export class StructuredLogger implements LoggerService {
  private correlationId?: string;

  constructor(private context?: string) {}

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context,
      correlationId: context?.correlationId || this.correlationId,
      message,
      ...context,
    };

    return JSON.stringify(logData);
  }

  log(message: any, context?: string | LogContext): void {
    const logContext = typeof context === 'string' ? { context } : context;
    console.log(this.formatMessage('INFO', String(message), logContext));
  }

  error(message: any, stack?: string, context?: string | LogContext): void {
    const logContext = typeof context === 'string' ? { context, trace: stack } : { ...context, trace: stack };
    console.error(this.formatMessage('ERROR', String(message), logContext));
  }

  warn(message: any, context?: string | LogContext): void {
    const logContext = typeof context === 'string' ? { context } : context;
    console.warn(this.formatMessage('WARN', String(message), logContext));
  }

  debug(message: any, context?: string | LogContext): void {
    const logContext = typeof context === 'string' ? { context } : context;
    console.debug(this.formatMessage('DEBUG', String(message), logContext));
  }

  verbose(message: any, context?: string | LogContext): void {
    const logContext = typeof context === 'string' ? { context } : context;
    console.log(this.formatMessage('VERBOSE', String(message), logContext));
  }

  // Convenience methods for common logging patterns
  logRequest(method: string, path: string, correlationId?: string, userId?: string): void {
    this.log('Request received', {
      correlationId,
      userId,
      method,
      path,
    });
  }

  logResponse(method: string, path: string, statusCode: number, duration: number, correlationId?: string): void {
    this.log('Response sent', {
      correlationId,
      method,
      path,
      statusCode,
      duration,
    });
  }

  logEvent(eventType: string, eventData: any, correlationId?: string): void {
    this.log(`Event ${eventType}`, {
      correlationId,
      eventType,
      eventData,
    });
  }

  logServiceCall(serviceName: string, method: string, duration: number, correlationId?: string): void {
    this.log(`Service call to ${serviceName}`, {
      correlationId,
      serviceName,
      method,
      duration,
    });
  }
} 