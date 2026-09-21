import { ServiceUnavailableException } from '@nestjs/common';

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
