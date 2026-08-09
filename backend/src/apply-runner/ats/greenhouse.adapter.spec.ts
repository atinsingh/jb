import { GreenhouseAdapter } from './greenhouse.adapter';
import type { SubmissionMaterials } from './submission-materials.type';

const APPLY_URL = 'https://boards.greenhouse.io/acme/jobs/123';

/**
 * Build a mock Puppeteer `page`. `evaluate` dispatches by the injected function's
 * name so each ported page-payload gets a sensible canned return.
 */
function makePage(opts: {
  captcha?: boolean;
  hasSubmit?: boolean;
  hasFile?: boolean;
  confirmed?: boolean;
} = {}) {
  const { captcha = false, hasSubmit = true, hasFile = true, confirmed = true } = opts;

  const fileHandle = { uploadFile: jest.fn().mockResolvedValue(undefined) };
  const submitHandle = { id: 'submit' };

  const page: any = {
    goto: jest.fn().mockResolvedValue(undefined),
    $: jest.fn(async (sel: string) => {
      const isFile = /file|#resume|s3_upload/i.test(sel);
      const isSubmit = /submit/i.test(sel);
      if (isFile) return hasFile ? fileHandle : null;
      if (isSubmit) return hasSubmit ? submitHandle : null;
      return null;
    }),
    $$: jest.fn().mockResolvedValue([]),
    evaluate: jest.fn(async (fn: any) => {
      switch (fn?.name) {
        case 'fillFieldsInPage':
          return 4;
        case 'fillTextareaInPage':
          return true;
        case 'detectCaptchaInPage':
          return captcha;
        case 'readConfirmationInPage':
          return 'Thank you for applying!';
        default:
          return undefined;
      }
    }),
    screenshot: jest.fn(async () => Buffer.from('png-bytes')),
    waitForSelector: confirmed
      ? jest.fn().mockResolvedValue(true)
      : jest.fn().mockRejectedValue(new Error('timeout')),
    click: jest.fn().mockResolvedValue(undefined),
  };

  return { page, fileHandle, submitHandle };
}

const materials: SubmissionMaterials = {
  fullName: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@x.com',
  phone: '+1 555 0100',
  location: 'London',
  resumeBuffer: Buffer.from('%PDF-1.4 fake'),
  resumeFilename: 'Ada_Resume.pdf',
  coverLetter: 'Dear hiring manager...',
};

describe('GreenhouseAdapter', () => {
  const adapter = new GreenhouseAdapter();

  it('matches greenhouse URLs only', () => {
    expect(adapter.matches(APPLY_URL)).toBe(true);
    expect(adapter.matches('https://jobs.lever.co/acme/1')).toBe(false);
  });

  it('happy path: fills fields, uploads résumé, screenshots before+after, submits, returns ok', async () => {
    const { page, fileHandle } = makePage();

    const result = await adapter.submit({ page, applyUrl: APPLY_URL, materials });

    expect(page.goto).toHaveBeenCalledWith(
      APPLY_URL,
      expect.objectContaining({ waitUntil: 'networkidle0' }),
    );
    // fields filled via evaluate(fillFieldsInPage, ...)
    expect(page.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'fillFieldsInPage' }),
      expect.anything(),
      expect.anything(),
    );
    // résumé uploaded through a tmp file
    expect(fileHandle.uploadFile).toHaveBeenCalledTimes(1);
    // submit clicked + confirmation awaited
    expect(page.click).toHaveBeenCalledTimes(1);
    expect(page.waitForSelector).toHaveBeenCalledTimes(1);

    expect(result.ok).toBe(true);
    expect(result.needsHuman).toBeFalsy();
    expect(result.confirmationText).toMatch(/Thank you/);
    // two proof screenshots: before + after
    expect(result.screenshots.map((s) => s.step)).toEqual(['before-submit', 'after-submit']);
    expect(result.screenshots.every((s) => Buffer.isBuffer(s.buffer))).toBe(true);
  });

  it('CAPTCHA present → needsHuman, never clicks submit', async () => {
    const { page } = makePage({ captcha: true });

    const result = await adapter.submit({ page, applyUrl: APPLY_URL, materials });

    expect(result.ok).toBe(false);
    expect(result.needsHuman).toBe(true);
    expect(result.failReason).toMatch(/CAPTCHA/i);
    expect(page.click).not.toHaveBeenCalled();
    // still captured the before-submit proof
    expect(result.screenshots.map((s) => s.step)).toEqual(['before-submit']);
  });

  it('missing submit button → failReason, no click', async () => {
    const { page } = makePage({ hasSubmit: false });

    const result = await adapter.submit({ page, applyUrl: APPLY_URL, materials });

    expect(result.ok).toBe(false);
    expect(result.needsHuman).toBeFalsy();
    expect(result.failReason).toMatch(/Submit button not found/i);
    expect(page.click).not.toHaveBeenCalled();
  });

  it('submit clicked but no confirmation → needsHuman (idempotent, verify manually)', async () => {
    const { page } = makePage({ confirmed: false });

    const result = await adapter.submit({ page, applyUrl: APPLY_URL, materials });

    expect(page.click).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.needsHuman).toBe(true);
    expect(result.failReason).toMatch(/confirmation/i);
    // before + after proof still captured
    expect(result.screenshots.map((s) => s.step)).toEqual(['before-submit', 'after-submit']);
  });
});
