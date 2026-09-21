import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { AiBudgetSnapshot } from './ai-budget.service';

export const AI_BUDGET_UNAVAILABLE_RESPONSE = Object.freeze({
  statusCode: 503,
  code: 'AI_BUDGET_UNAVAILABLE' as const,
  message: 'AI budget is temporarily unavailable. No AI work was started.',
});

export class AiBudgetUnavailableException extends ServiceUnavailableException {
  readonly code = AI_BUDGET_UNAVAILABLE_RESPONSE.code;

  constructor(cause?: unknown) {
    super(AI_BUDGET_UNAVAILABLE_RESPONSE);
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class AiBudgetExhaustedException extends HttpException {
  readonly code = 'AI_BUDGET_EXHAUSTED';

  constructor(snapshot: AiBudgetSnapshot) {
    super(
      {
        statusCode: 402,
        code: 'AI_BUDGET_EXHAUSTED',
        message: 'Your monthly AI budget is exhausted. No AI work was started.',
        budget: snapshot,
      },
      402,
    );
  }
}

export class AiBudgetOperationInProgressException extends HttpException {
  readonly code = 'AI_BUDGET_OPERATION_IN_PROGRESS';

  constructor() {
    super(
      {
        statusCode: 409,
        code: 'AI_BUDGET_OPERATION_IN_PROGRESS',
        message:
          'Another AI operation is already running for this account. No AI work was started.',
      },
      409,
    );
  }
}
