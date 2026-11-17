import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const logger = { setContext: () => undefined, error: () => undefined, warn: () => undefined };

  function capture(exception: unknown) {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/employer/billing/connect/onboard' }),
      }),
    };
    new HttpExceptionFilter(logger as any).catch(exception, host as any);
    return { status, json };
  }

  it('returns a live Stripe refusal with Stripe’s status and message', () => {
    const message = 'You must complete your platform profile to use Connect and create live connected accounts.';
    const { status, json } = capture(Object.assign(new Error(message), {
      statusCode: 400,
      type: 'StripeInvalidRequestError',
    }));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message,
    }));
  });
});
