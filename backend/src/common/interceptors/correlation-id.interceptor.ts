import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get correlation ID from header or generate new one
    const correlationId =
      request.headers[CORRELATION_ID_HEADER] || uuidv4();

    // Set on request for downstream use
    request.correlationId = correlationId;

    // Add to response headers
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}

