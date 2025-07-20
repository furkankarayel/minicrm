import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { StructuredLogger } from '../logging/structured-logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger('HTTP');

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Generate correlation ID if not present
    const correlationId = request.headers['x-correlation-id'] || this.generateCorrelationId();
    request.correlationId = correlationId;
    
    // Set correlation ID in logger
    this.logger.setCorrelationId(correlationId);
    
    const { method, url, user } = request;
    const startTime = Date.now();
    
    // Log request
    this.logger.logRequest(method, url, correlationId, user?.id);
    
    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logger.logResponse(method, url, response.statusCode, duration, correlationId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Request failed: ${method} ${url}`,
          error.stack,
          {
            correlationId,
            method,
            path: url,
            statusCode: error.status || 500,
            duration,
            error: error.message,
          }
        );
        throw error;
      }),
    );
  }
} 