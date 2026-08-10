import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  correlationId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, any>;
        message = responseObj.message || exception.message;
        error = responseObj.error || 'Error';
      } else {
        message = exception.message;
        error = 'Error';
      }
    } else if (
      exception instanceof Error &&
      exception.name === 'CastError' &&
      (exception as any).kind === 'ObjectId'
    ) {
      // A malformed id in a route/query param reaches Mongoose and throws a
      // CastError. That's bad input, not a server fault — report 400, not 500.
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid identifier: ${(exception as any).value}`;
      error = 'Bad Request';
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Log the actual error for debugging
      this.logger.error(
        {
          error: exception.message,
          stack: exception.stack,
          path: request.url,
          method: request.method,
        },
        'Unhandled exception',
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: (request as any).correlationId,
    };

    // Log error response
    if (status >= 500) {
      this.logger.error({ ...errorResponse }, 'Server error');
    } else if (status >= 400) {
      this.logger.warn({ ...errorResponse }, 'Client error');
    }

    response.status(status).json(errorResponse);
  }
}

