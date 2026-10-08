import { validate } from 'class-validator';
import { CreateBillingPortalDto } from './index';

describe('billing portal return URL', () => {
  it.each(['http://localhost:3000/app/billing', 'http://127.0.0.1:3000/app/billing', 'https://jobocate.com/app/billing'])('accepts an absolute HTTP URL: %s', async returnUrl => {
    expect(await validate(Object.assign(new CreateBillingPortalDto(), { returnUrl }))).toHaveLength(0);
  });

  it.each(['/app/billing', 'javascript:alert(1)', 'ftp://jobocate.com/app/billing'])('rejects an unsafe or relative URL: %s', async returnUrl => {
    expect(await validate(Object.assign(new CreateBillingPortalDto(), { returnUrl }))).not.toHaveLength(0);
  });
});
