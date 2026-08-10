import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ResumeBuilderService } from './resume-builder.service';
import { Resume } from '../schemas/resume.schema';
import { User } from '../schemas/user.schema';
import { ResumeVersion } from '../schemas/resume-version.schema';
import { ShareLink } from '../schemas/share-link.schema';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { StorageService } from '../storage';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';
import { HtmlSanitizerService } from '../ingestion/pipeline/html-sanitizer.service';

// uuid ships as ESM which the repo's jest transform does not process; the
// value is irrelevant to these tests.
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const USER_ID = '507f1f77bcf86cd799439011';

// Mock puppeteer so generatePDF never launches a real browser.
const mockPage = {
  setViewport: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue({ ok: () => true, status: () => 200 }),
  waitForFunction: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
};
const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

describe('ResumeBuilderService (storage migration)', () => {
  let service: ResumeBuilderService;

  const storage = {
    put: jest.fn().mockResolvedValue({ key: 'k', url: '/uploads/k' }),
    getBuffer: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn(),
    getDriverName: jest.fn(() => 'local'),
  };

  const resumeModel = {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  };
  const userModel = { findById: jest.fn() };

  const mockProvider = { chat: jest.fn(), getName: () => 'mock', isAvailable: () => true };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeBuilderService,
        { provide: getModelToken(Resume.name), useValue: resumeModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(ResumeVersion.name), useValue: {} },
        { provide: getModelToken(ShareLink.name), useValue: {} },
        // Added to the service while this suite could not load. Real
        // implementations: both are pure computation with no dependencies.
        { provide: LLMQuotaService, useValue: { enforceQuota: jest.fn(), recordUsage: jest.fn() } },
        AtsParseabilityService,
        AtsMatchService,
        // The REAL sanitizer. It is the stored-XSS boundary, and now that the
        // jest transform can load sanitize-html there is no reason to stub it.
        HtmlSanitizerService,
        {
          provide: LLMRoutingService,
          useValue: {
            getProviderForFeature: jest.fn(() => mockProvider),
            getFeatureConfig: jest.fn(() => ({
              model: 'gpt-4o-mini',
              provider: 'mock',
              temperature: 0.7,
              maxTokens: 500,
            })),
          },
        },
        { provide: ResumeParserService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get<ResumeBuilderService>(ResumeBuilderService);
  });

  describe('generatePDF', () => {
    it('puts the rendered PDF under resumes/<id>/<ts>.pdf and returns the key', async () => {
      // Fire the internal setTimeout immediately so the test does not stall.
      jest
        .spyOn(global, 'setTimeout')
        .mockImplementation(((fn: any) => {
          fn();
          return 0 as any;
        }) as any);

      const resume: any = { _id: 'r1' };
      const key = await service.generatePDF(resume);

      expect(storage.put).toHaveBeenCalledTimes(1);
      const [putKey, buf, opts] = storage.put.mock.calls[0];
      expect(putKey).toMatch(/^resumes\/r1\/\d+\.pdf$/);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(opts).toEqual({ contentType: 'application/pdf' });
      expect(key).toBe(putKey);
    });
  });

  describe('getPDFPath (lazy generate)', () => {
    it('generates + persists the storage key and pdfUrl when absent', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const resume: any = { _id: 'r2', pdfPath: undefined, save };
      resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
      jest
        .spyOn(service, 'generatePDF')
        .mockResolvedValue('resumes/r2/999.pdf');

      const result = await service.getPDFPath('r2', USER_ID);

      expect(service.generatePDF).toHaveBeenCalledWith(resume);
      expect(resume.pdfPath).toBe('resumes/r2/999.pdf');
      expect(resume.pdfUrl).toBe('/api/resume-builder/r2/pdf');
      expect(save).toHaveBeenCalled();
      expect(result).toBe('resumes/r2/999.pdf');
    });

    it('returns the existing key without regenerating', async () => {
      const save = jest.fn();
      const resume: any = { _id: 'r3', pdfPath: 'resumes/r3/1.pdf', save };
      resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
      const genSpy = jest.spyOn(service, 'generatePDF');

      const result = await service.getPDFPath('r3', USER_ID);

      expect(genSpy).not.toHaveBeenCalled();
      expect(result).toBe('resumes/r3/1.pdf');
    });
  });

  describe('delete', () => {
    it('deletes the stored PDF object by key and removes the doc', async () => {
      const resume: any = { _id: 'r4', pdfPath: 'resumes/r4/1.pdf' };
      resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
      resumeModel.deleteOne.mockReturnValue({ exec: () => Promise.resolve({}) });

      await service.delete('r4', USER_ID);

      expect(storage.delete).toHaveBeenCalledWith('resumes/r4/1.pdf');
      expect(resumeModel.deleteOne).toHaveBeenCalledWith({ _id: 'r4' });
    });

    it('does not call storage.delete when there is no pdfPath', async () => {
      const resume: any = { _id: 'r5', pdfPath: undefined };
      resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
      resumeModel.deleteOne.mockReturnValue({ exec: () => Promise.resolve({}) });

      await service.delete('r5', USER_ID);

      expect(storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('regenerateSection (llm migration)', () => {
    const setupResume = () => {
      const resume: any = { _id: 'r9', fullName: 'Jane', skills: ['ts'], experience: [] };
      resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
      userModel.findById.mockReturnValue({ exec: () => Promise.resolve({ name: 'Jane' }) });
    };

    it('routes through the LLM provider and returns trimmed content', async () => {
      setupResume();
      mockProvider.chat.mockResolvedValue({ content: '  A sharp summary.  ' });

      const result = await service.regenerateSection('r9', USER_ID, {
        section: 'summary',
      } as any);

      expect(mockProvider.chat).toHaveBeenCalledTimes(1);
      expect(result).toBe('A sharp summary.');
    });

    it('throws when the provider fails (no soft fallback for this flow)', async () => {
      setupResume();
      mockProvider.chat.mockRejectedValue(new Error('provider down'));

      await expect(
        service.regenerateSection('r9', USER_ID, { section: 'summary' } as any),
      ).rejects.toThrow('Failed to regenerate summary');
    });
  });
});
