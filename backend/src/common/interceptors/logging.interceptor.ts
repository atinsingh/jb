import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AppLoggerService } from '../logger/logger.service';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Sanitize sensitive data from body
    const sanitizedBody = this.sanitizeBody(body);

    // Log incoming request
    this.logger.debug(
      `Incoming Request: ${method} ${url}`,
      'LoggingInterceptor',
    );
    this.logger.debug(
      `Request Details: ${JSON.stringify({
        method,
        url,
        params: Object.keys(params).length > 0 ? params : undefined,
        query: Object.keys(query).length > 0 ? query : undefined,
        body: sanitizedBody,
        ip,
        userAgent: userAgent.substring(0, 100), // Limit length
      })}`,
      'LoggingInterceptor',
    );

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.debug(
          `Request Completed: ${method} ${url} - ${responseTime}ms`,
          'LoggingInterceptor',
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const errorMessage = error?.message || 'Unknown error';
        const statusCode = error?.status || error?.statusCode || 500;

        // Log error with context
        this.logger.error(
          `Request Failed: ${method} ${url} - ${statusCode} - ${errorMessage} - ${responseTime}ms`,
          error?.stack,
          'LoggingInterceptor',
        );

        // Log specific error types
        if (errorMessage.includes('password') || errorMessage.includes('Password')) {
          this.logger.warn(
            `Authentication Error: Invalid password attempt - ${method} ${url} - IP: ${ip}`,
            'LoggingInterceptor',
          );
        }

        if (errorMessage.includes('token') || errorMessage.includes('Token') || errorMessage.includes('JWT')) {
          this.logger.warn(
            `Authentication Error: Invalid token - ${method} ${url} - IP: ${ip}`,
            'LoggingInterceptor',
          );
        }

        if (errorMessage.includes('Unauthorized') || statusCode === 401) {
          this.logger.warn(
            `Unauthorized Access: ${method} ${url} - IP: ${ip}`,
            'LoggingInterceptor',
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
    ];

    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}

